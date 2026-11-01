"""Import larger structured classical corpora from the chinese-poetry dataset.

Source: chinese-poetry npm package
License: MIT
Package URL: https://www.npmjs.com/package/chinese-poetry

This importer intentionally keeps imported source text as-is. Some files are in
traditional Chinese. The importer marks every row with source metadata and a
`full_corpus` batch label so reviewed/curated passages can coexist with the
complete searchable layer.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import SessionLocal, init_db
from .models import Annotation, Book, Chapter, Concept, GraphEdge, Passage, Translation


BASE_URL = "https://unpkg.com/chinese-poetry@2.0.1"
FALLBACK_BASE_URL = "https://cdn.jsdelivr.net/npm/chinese-poetry@2.0.1"
SOURCE_NAME = "chinese-poetry"
SOURCE_LICENSE = "MIT"
IMPORT_BATCH = "full_classics_chinese_poetry_v1"


@dataclass(frozen=True)
class CorpusSpec:
    book_id: str
    title_zh: str
    title_en: str
    author: str
    era: str
    sort_order: int
    path: str
    shape: str  # chapters | single | shijing


SPECS = [
    CorpusSpec("lunyu", "论语", "The Analects", "孔子及弟子", "春秋", 1, "/dist/lunyu/lunyu.json", "chapters"),
    CorpusSpec("mengzi", "孟子", "Mencius", "孟子及其后学", "战国", 2, "/dist/sishuwujing/mengzi.json", "chapters"),
    CorpusSpec("daxue", "大学", "The Great Learning", "《礼记》篇章，传统归入四书", "先秦", 3, "/dist/sishuwujing/daxue.json", "single"),
    CorpusSpec("zhongyong", "中庸", "Doctrine of the Mean", "《礼记》篇章，传统归入四书", "先秦", 4, "/dist/sishuwujing/zhongyong.json", "single"),
    CorpusSpec("shijing", "诗经", "Book of Songs", "佚名", "西周至春秋", 8, "/dist/shijing/shijing.json", "shijing"),
]


PUNCT_RE = re.compile(r"[\s，。！？、；：：“”‘’「」『』《》（）(),.!?;:\\-—·]")


def _slug(s: str) -> str:
    out = re.sub(r"[^0-9A-Za-z_\u4e00-\u9fff]+", "_", s).strip("_")
    return out or "chapter"


def _norm(s: str) -> str:
    return PUNCT_RE.sub("", s or "")


def _fetch_json(path: str):
    last: Exception | None = None
    for base in (BASE_URL, FALLBACK_BASE_URL):
        url = base + path
        for _ in range(3):
            try:
                with httpx.Client(timeout=60, follow_redirects=True, trust_env=False) as client:
                    r = client.get(url)
                r.raise_for_status()
                return r.json(), url
            except Exception as exc:
                last = exc
    raise RuntimeError(f"failed to fetch {path}: {last}")


def _ensure_book(db: Session, spec: CorpusSpec) -> None:
    b = db.get(Book, spec.book_id)
    if b:
        if not b.title_i18n:
            b.title_i18n = {"en": spec.title_en}
        return
    db.add(Book(
        id=spec.book_id,
        title_zh=spec.title_zh,
        title_i18n={"en": spec.title_en},
        author=spec.author,
        era=spec.era,
        sort_order=spec.sort_order,
    ))


def _ensure_chapter(db: Session, spec: CorpusSpec, chapter_title: str, order: int) -> str:
    cid = f"{spec.book_id}.full.{_slug(chapter_title)}"
    if not db.get(Chapter, cid):
        db.add(Chapter(id=cid, book_id=spec.book_id, title_zh=chapter_title, sort_order=10_000 + order))
    return cid


def _concept_map(db: Session) -> list[tuple[str, str]]:
    rows = db.execute(select(Concept)).scalars().all()
    pairs = []
    for c in rows:
        zh = (c.zh or "").replace("(lè)", "").strip()
        if zh and len(zh) <= 6:
            pairs.append((c.id, zh))
    pairs.sort(key=lambda x: len(x[1]), reverse=True)
    return pairs


def _tag_concepts(text: str, pairs: list[tuple[str, str]], limit: int = 8) -> list[str]:
    found: list[str] = []
    for cid, zh in pairs:
        if zh in text and cid not in found:
            found.append(cid)
        if len(found) >= limit:
            break
    return found


def _existing_norms(db: Session) -> set[str]:
    return {_norm(t) for (t,) in db.execute(select(Passage.original_text)).all() if _norm(t)}


def _source_meta(spec: CorpusSpec, source_url: str, unit: dict) -> dict:
    return {
        "source_name": SOURCE_NAME,
        "source_url": source_url,
        "source_license": SOURCE_LICENSE,
        "source_package": "chinese-poetry@2.0.1",
        "import_batch": IMPORT_BATCH,
        "review_status": "source_imported_unreviewed",
        **unit,
    }


def _add_passage(
    db: Session,
    *,
    ref_id: str,
    chapter_id: str,
    ref_label: str,
    text: str,
    sort_order: int,
    concepts: list[str],
    meta: dict,
    existing_norms: set[str],
) -> bool:
    if db.get(Passage, ref_id):
        return False
    norm = _norm(text)
    if norm in existing_norms:
        return False
    db.add(Passage(
        id=ref_id,
        chapter_id=chapter_id,
        ref_label=ref_label,
        original_text=text,
        pinyin="",
        sort_order=sort_order,
        concepts=concepts,
        meta=meta,
    ))
    db.add(Translation(passage_id=ref_id, lang="zh", text=text, translator="原文"))
    db.add(Annotation(
        passage_id=ref_id,
        type="source",
        lang="zh",
        source=f"{SOURCE_NAME} ({SOURCE_LICENSE})",
        content="全量语料层导入文本，保留来源原貌；用于检索、图谱和后续审校。",
        content_i18n={"en": "Imported source text for the full corpus layer; pending review."},
    ))
    existing_norms.add(norm)
    return True


def _iter_units(spec: CorpusSpec, data) -> Iterable[tuple[str, str, int, str]]:
    """Yield (chapter_title, ref_label, paragraph_index, text)."""
    if spec.shape == "chapters":
        for chap_i, chapter in enumerate(data, start=1):
            title = chapter["chapter"]
            for para_i, text in enumerate(chapter.get("paragraphs", []), start=1):
                yield title, f"{spec.title_zh}·{title}·{para_i}", para_i, text
    elif spec.shape == "single":
        title = data["chapter"]
        for para_i, text in enumerate(data.get("paragraphs", []), start=1):
            yield title, f"{spec.title_zh}·{para_i}", para_i, text
    elif spec.shape == "shijing":
        for poem_i, poem in enumerate(data, start=1):
            chapter = poem.get("chapter", "")
            section = poem.get("section", "")
            title = poem.get("title", f"诗{poem_i}")
            chapter_title = "·".join(x for x in [chapter, section, title] if x)
            for para_i, text in enumerate(poem.get("content", []), start=1):
                yield chapter_title, f"诗经·{chapter_title}·{para_i}", para_i, text
    else:
        raise ValueError(f"unknown shape: {spec.shape}")


def import_spec(db: Session, spec: CorpusSpec, concept_pairs: list[tuple[str, str]], existing_norms: set[str]) -> dict:
    data, source_url = _fetch_json(spec.path)
    _ensure_book(db, spec)
    chapters_seen: dict[str, str] = {}
    added = 0
    seen = 0
    for global_i, (chapter_title, ref_label, para_i, text) in enumerate(_iter_units(spec, data), start=1):
        seen += 1
        if chapter_title not in chapters_seen:
            chapters_seen[chapter_title] = _ensure_chapter(db, spec, chapter_title, len(chapters_seen) + 1)
        chapter_id = chapters_seen[chapter_title]
        ref_id = f"{spec.book_id}.full.{global_i:04d}"
        concepts = _tag_concepts(text, concept_pairs)
        if _add_passage(
            db,
            ref_id=ref_id,
            chapter_id=chapter_id,
            ref_label=ref_label,
            text=text,
            sort_order=20_000 + global_i,
            concepts=concepts,
            meta=_source_meta(spec, source_url, {"source_chapter": chapter_title, "source_paragraph_index": para_i}),
            existing_norms=existing_norms,
        ):
            added += 1
    return {"seen": seen, "added": added, "chapters": len(chapters_seen)}


def import_full_classics(db: Session) -> dict:
    concept_pairs = _concept_map(db)
    existing_norms = _existing_norms(db)
    results = {}
    for spec in SPECS:
        results[spec.book_id] = import_spec(db, spec, concept_pairs, existing_norms)
        db.commit()
    results["_graph_edges"] = {"added": _add_graph_edges(db)}
    db.commit()
    return results


def _edge_exists(db: Session, source_id: str, label: str, target_id: str) -> bool:
    return db.execute(
        select(GraphEdge).where(
            GraphEdge.source_id == source_id,
            GraphEdge.label == label,
            GraphEdge.target_id == target_id,
        )
    ).scalar_one_or_none() is not None


def _add_graph_edges(db: Session) -> int:
    added = 0
    rows = db.execute(
        select(Passage).where(Passage.meta["import_batch"].as_string() == IMPORT_BATCH)
    ).scalars().all()
    concept_ids = {cid for (cid,) in db.execute(select(Concept.id)).all()}
    for p in rows:
        for cid in p.concepts or []:
            if cid not in concept_ids or _edge_exists(db, p.id, "MENTIONS", cid):
                continue
            db.add(GraphEdge(
                source_id=p.id,
                source_type="passage",
                label="MENTIONS",
                target_id=cid,
                target_type="concept",
            ))
            added += 1
    return added


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print("[import_classics_full]", import_full_classics(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()

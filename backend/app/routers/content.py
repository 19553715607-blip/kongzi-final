from __future__ import annotations

import datetime as _dt
import random as _random
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Book, Chapter, Passage
from ..schemas import AnnotationOut, PassageOut, TranslationOut

router = APIRouter(prefix="/api/v1", tags=["content"])

# 支持的语言（与前端 i18n 的 LANGS 对齐）；未知语言一律回落中文
SUPPORTED_LANGS = ("zh", "en", "fr", "es", "ar")


def _pick(zh: Optional[str], i18n: Optional[dict], lang: str) -> Optional[str]:
    """按语言取多语字段。

    缺失该语种时回落中文原文 —— 保证 zh/en/fr/es/ar 各语种返回的内容量一致，
    不会因为某个语种缺译而整层消失。
    """
    if lang and lang not in ("zh", "all"):
        value = (i18n or {}).get(lang)
        if value:
            return value
    return zh


def _to_passage_out(p: Passage, lang: str) -> PassageOut:
    """把 Passage 序列化为 PassageOut（与 get_passage 同构，供多接口复用）。"""
    return PassageOut(
        id=p.id,
        ref_label=p.ref_label,
        original_text=p.original_text,
        pinyin=p.pinyin,
        concepts=list(p.concepts or []),
        translations=[
            TranslationOut(lang=t.lang, text=t.text, translator=t.translator)
            for t in p.translations
            if lang == "all" or t.lang == lang or t.lang == "zh"
        ],
        annotations=[
            AnnotationOut(
                type=a.type,
                lang=a.lang if lang == "all" else lang,
                source=_pick(a.source, a.source_i18n, lang),
                content=_pick(a.content, a.content_i18n, lang) or "",
            )
            for a in p.annotations
        ],
        ai_reading=None,
    )


def _load_passage(db: Session, ref_id: str) -> Passage:
    p = db.execute(
        select(Passage)
        .where(Passage.id == ref_id)
        .options(
            selectinload(Passage.translations),
            selectinload(Passage.annotations),
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, f"passage {ref_id} not found")
    return p


@router.get("/passages/random", response_model=PassageOut)
def random_passage(
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
) -> PassageOut:
    """随机取一条经典（首页「换一句」）。"""
    ids = db.execute(select(Passage.id)).scalars().all()
    if not ids:
        raise HTTPException(404, "no passages")
    return _to_passage_out(_load_passage(db, _random.choice(list(ids))), lang)


@router.get("/passages/today", response_model=PassageOut)
def today_passage(
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
) -> PassageOut:
    """每日一典：按日期确定性取句，同一天所有用户看到同一句。"""
    ids = db.execute(select(Passage.id).order_by(Passage.sort_order)).scalars().all()
    if not ids:
        raise HTTPException(404, "no passages")
    # 用日期做种子，保证当天固定、次日轮换
    rng = _random.Random(_dt.date.today().isoformat())
    return _to_passage_out(_load_passage(db, rng.choice(list(ids))), lang)


@router.get("/passages/{ref_id}/neighbors")
def passage_neighbors(
    ref_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """同一部经典内上一条 / 下一条（按章序 + 句序），读经页键盘导航用。"""
    current = db.execute(select(Passage).where(Passage.id == ref_id)).scalar_one_or_none()
    if not current:
        raise HTTPException(404, f"passage {ref_id} not found")
    chapter = db.execute(
        select(Chapter).where(Chapter.id == current.chapter_id)
    ).scalar_one()
    rows = db.execute(
        select(Passage, Chapter.sort_order)
        .join(Chapter, Chapter.id == Passage.chapter_id)
        .where(Chapter.book_id == chapter.book_id)
        .order_by(Chapter.sort_order, Passage.sort_order)
    ).all()
    items = [{"id": r[0].id, "ref_label": r[0].ref_label, "original_text": r[0].original_text} for r in rows]
    idx = next((i for i, it in enumerate(items) if it["id"] == ref_id), -1)
    return {
        "current": items[idx] if idx >= 0 else None,
        "prev": items[idx - 1] if idx > 0 else None,
        "next": items[idx + 1] if 0 <= idx < len(items) - 1 else None,
    }


@router.get("/passages/{ref_id}/related")
def related_passages(
    ref_id: str,
    lang: str = Query("zh"),
    k: int = Query(3, ge=1, le=8),
    db: Session = Depends(get_db),
) -> List[PassageOut]:
    """相关经典：优先同概念，其次同章相邻。"""
    current = _load_passage(db, ref_id)
    mine = set(current.concepts or [])
    all_rows = db.execute(
        select(Passage)
        .options(
            selectinload(Passage.translations),
            selectinload(Passage.annotations),
        )
    ).scalars().all()

    scored: list[tuple[int, int, Passage]] = []
    for p in all_rows:
        if p.id == ref_id:
            continue
        overlap = len(mine & set(p.concepts or []))
        if overlap > 0:
            scored.append((overlap, p.sort_order, p))
    scored.sort(key=lambda x: (-x[0], x[1]))
    picked = [s[2] for s in scored[:k]]

    # 概念相关不足时，用同章相邻补足
    if len(picked) < k:
        same_chapter = [
            p for p in all_rows
            if p.chapter_id == current.chapter_id and p.id != ref_id and p not in picked
        ]
        same_chapter.sort(key=lambda p: abs(p.sort_order - (current.sort_order or 0)))
        picked.extend(same_chapter[: k - len(picked)])

    return [_to_passage_out(p, lang) for p in picked]


@router.get("/books")
def list_books(db: Session = Depends(get_db)) -> List[dict]:
    books = db.execute(select(Book).order_by(Book.sort_order)).scalars().all()
    return [
        {"id": b.id, "title_zh": b.title_zh, "title_i18n": b.title_i18n}
        for b in books
    ]


@router.get("/books/{book_id}/chapters")
def list_chapters(book_id: str, db: Session = Depends(get_db)) -> List[dict]:
    chapters = (
        db.execute(
            select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.sort_order)
        )
        .scalars()
        .all()
    )
    return [{"id": c.id, "title_zh": c.title_zh} for c in chapters]


@router.get("/chapters/{chapter_id}/passages")
def list_passages(chapter_id: str, db: Session = Depends(get_db)) -> List[dict]:
    rows = (
        db.execute(
            select(Passage)
            .where(Passage.chapter_id == chapter_id)
            .order_by(Passage.sort_order)
        )
        .scalars()
        .all()
    )
    return [{"id": p.id, "ref_label": p.ref_label, "original_text": p.original_text} for p in rows]


@router.get("/passages/{ref_id}", response_model=PassageOut)
def get_passage(
    ref_id: str,
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
) -> PassageOut:
    """读经页五层信息：原文 / 拼音 / 译文 / 注释 / (AI 解读占位)。"""
    return _to_passage_out(_load_passage(db, ref_id), lang)


@router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    lang: str = Query("zh"),
    k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
) -> List[dict]:
    from ..services.retrieval import retrieve

    results = retrieve(db, q, lang=lang, k=k)
    return [
        {
            "ref_id": r.ref_id,
            "ref_label": r.ref_label,
            "original_text": r.original_text,
            "translation": r.translation,
            "score": r.score,
        }
        for r in results
    ]

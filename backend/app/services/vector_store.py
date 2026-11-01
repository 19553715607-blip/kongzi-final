"""Chroma 向量库封装。

文档构造策略：把「原文 + 各语言译文 + 概念」拼成一段可被跨语言召回的文本，
metadata 携带 ref_id 等，便于回链到 Passage 行取结构化字段。
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..models import Passage
from .embeddings import get_embedder

settings = get_settings()

COLLECTION = "confucian_corpus"

_client = None
_collection = None


class _ChromaEmbeddingFunction:
    """把平台的 Embedder 适配成 Chroma 的 embedding_function 接口。"""

    def __init__(self) -> None:
        self._embedder = get_embedder()

    # Chroma 要求实现 name() 与 __call__(input)
    def name(self) -> str:  # noqa: D401
        return f"kongzi-{self._embedder.name}"

    def __call__(self, input: List[str]) -> List[List[float]]:  # noqa: A002
        return self._embedder.embed(list(input))


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    import chromadb

    _client = chromadb.PersistentClient(path=settings.chroma_path)
    _collection = _client.get_or_create_collection(
        name=COLLECTION,
        embedding_function=_ChromaEmbeddingFunction(),
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def _doc_text(p: Passage) -> str:
    parts = [p.original_text]
    for t in p.translations:
        parts.append(t.text)
    if p.concepts:
        parts.append(" ".join(p.concepts))
    return " \n ".join(parts)


def count() -> int:
    try:
        return _get_collection().count()
    except Exception:
        return 0


def index_corpus(db: Session, rebuild: bool = False) -> int:
    """把全部 passage 向量化入库。idempotent（按 id upsert）。"""
    col = _get_collection()
    if rebuild and col.count() > 0:
        # 简单做法：删除集合重建
        global _collection
        import chromadb

        client = chromadb.PersistentClient(path=settings.chroma_path)
        client.delete_collection(COLLECTION)
        _collection = None
        col = _get_collection()

    passages = (
        db.execute(
            select(Passage).options(
                selectinload(Passage.translations), selectinload(Passage.chapter)
            )
        )
        .scalars()
        .all()
    )
    if not passages:
        return 0

    ids = [p.id for p in passages]
    docs = [_doc_text(p) for p in passages]
    metas = [
        {
            "ref_id": p.id,
            "ref_label": p.ref_label or p.id,
            "book": p.chapter.book_id if p.chapter else "",
            "chapter": p.chapter.title_zh if p.chapter else "",
            "concepts": ",".join(p.concepts or []),
        }
        for p in passages
    ]
    col.upsert(ids=ids, documents=docs, metadatas=metas)
    return len(ids)


def query(text: str, k: int = 5) -> List[dict]:
    col = _get_collection()
    n = max(1, min(k, col.count()))  # 不超过集合大小，避免 Chroma 噪声警告
    res = col.query(query_texts=[text], n_results=n)
    out: List[dict] = []
    ids = res.get("ids", [[]])[0]
    dists = res.get("distances", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    for i, ref_id in enumerate(ids):
        dist = dists[i] if i < len(dists) else 1.0
        out.append(
            {
                "ref_id": ref_id,
                "similarity": 1.0 - float(dist),  # cosine 距离 → 相似度
                "meta": metas[i] if i < len(metas) else {},
            }
        )
    return out

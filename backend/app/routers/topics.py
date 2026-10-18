from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Passage, Topic
from ..services import topics as topics_svc

router = APIRouter(prefix="/api/v1", tags=["topics"])


@router.get("/topics")
def list_topics(lang: str = Query("zh"), db: Session = Depends(get_db)) -> list:
    """5 大全球议题列表。"""
    return topics_svc.list_topics(db, lang)


@router.get("/topics/{topic_id}")
def get_topic(
    topic_id: str,
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
) -> dict:
    """议题详情：含 5 文明对照立场。"""
    card = topics_svc.topic_card(db, topic_id, lang)
    if not card:
        raise HTTPException(404, f"topic {topic_id} not found")
    return {**card, "cross_civ_views": topics_svc.views_for(db, topic_id, lang)}


@router.get("/topics/{topic_id}/passages")
def topic_passages(
    topic_id: str,
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """议题关联经典：按 Topic.related_passages 返回句卡（含该语种译文）。"""
    topic = db.execute(select(Topic).where(Topic.id == topic_id)).scalar_one_or_none()
    if not topic:
        raise HTTPException(404, f"topic {topic_id} not found")
    refs = [r for r in (topic.related_passages or []) if r]
    if not refs:
        return []
    rows = db.execute(
        select(Passage)
        .where(Passage.id.in_(refs))
        .options(selectinload(Passage.translations))
    ).scalars().all()
    by_id = {p.id: p for p in rows}
    items = []
    for r in refs:
        p = by_id.get(r)
        if not p:
            continue
        tr = next(
            (t for t in p.translations if t.lang == lang),
            next((t for t in p.translations if t.lang == "zh"), None),
        )
        items.append(
            {
                "id": p.id,
                "ref_label": p.ref_label,
                "original_text": p.original_text,
                "translation": tr.text if tr else None,
            }
        )
    return items


@router.post("/topics/classify")
def classify(
    body: dict,
    db: Session = Depends(get_db),
) -> dict:
    """议题分类：输入问题，返回 topic_id 或 null。"""
    return {"topic_id": topics_svc.classify(db, body.get("question", ""))}

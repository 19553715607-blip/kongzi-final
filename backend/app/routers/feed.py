from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Passage

router = APIRouter(prefix="/api/v1", tags=["feed"])

# AI 人格（轮播署名）
PERSONAS = ["子曰君", "小颜回", "庄生", "现代小张", "诗哥"]

# 年轻化黑话标签池
VIBE_TAGS = [
    "#i人友好", "#emo自救", "#内耗退散", "#这就是顶级浪漫",
    "#古人早说过了", "#嘴替文学", "#今日份清醒", "#精神状态领先两千年",
]

# 概念 → 主题标签
CONCEPT_TAGS = {
    "ren": "#做个温暖的人",
    "li": "#分寸感拉满",
    "junzi": "#人格天花板",
    "yi": "#该出手时就出手",
    "shu": "#换位思考",
}


@router.get("/feed")
def feed(
    lang: str = Query("en"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> List[dict]:
    """短视频流：把经典原文包装成可滑动的沉浸卡片。"""
    passages = (
        db.execute(
            select(Passage)
            .options(selectinload(Passage.translations), selectinload(Passage.chapter))
            .order_by(Passage.sort_order)
        )
        .scalars()
        .all()
    )

    items: List[dict] = []
    for i, p in enumerate(passages):
        trans = next((t.text for t in p.translations if t.lang == lang), "")
        if not trans:
            trans = next((t.text for t in p.translations if t.lang == "en"), "")
        tags = [CONCEPT_TAGS[c] for c in (p.concepts or []) if c in CONCEPT_TAGS]
        tags.append(VIBE_TAGS[i % len(VIBE_TAGS)])
        items.append(
            {
                "ref_id": p.id,
                "ref_label": p.ref_label,
                "book": p.chapter.book_id if p.chapter else "",
                "original_text": p.original_text,
                "translation": trans,
                "persona": PERSONAS[i % len(PERSONAS)],
                "tags": tags[:3],
            }
        )

    # 语料有限，循环填充到 limit，营造连续刷的体验
    if items:
        out: List[dict] = []
        while len(out) < limit:
            out.extend(items)
        return out[:limit]
    return []

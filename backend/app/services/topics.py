"""议题路由 + 跨文明立场服务。

S1 实现：
- classify(question, hint=None) → topic_id 或 None
  关键词加权 + 显式 hint 覆盖。后续可替换为 LLM 分类，签名不变。
- views_for(topic_id, lang) → 跨文明立场卡片（5 文明并陈）
- topic_card(topic_id, lang) → 议题摘要（名称/描述/关联概念与经典）
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import CrossCivView, Topic

# 与议题中文名称的弱匹配也算关键词
def _all_keywords(t: Topic) -> List[str]:
    kws = [t.name_zh] + list(t.keywords or [])
    en = (t.name_i18n or {}).get("en")
    if en:
        kws.append(en)
    return [k.lower() for k in kws if k]


def classify(db: Session, question: str, hint: Optional[str] = None) -> Optional[str]:
    if hint:
        if db.get(Topic, hint):
            return hint
    if not question.strip():
        return None
    q = question.lower()
    scored: List[tuple[float, str]] = []
    for t in db.execute(select(Topic)).scalars():
        hits = sum(1 for kw in _all_keywords(t) if kw in q)
        if hits:
            scored.append((hits, t.id))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1]


def _civ_label(v: CrossCivView, lang: str) -> str:
    return (v.civ_label_i18n or {}).get(lang) or v.civ_label_zh


def _localize(field: dict, lang: str) -> str:
    return field.get(lang) or field.get("zh") or field.get("en") or ""


def views_for(db: Session, topic_id: str, lang: str = "zh") -> List[dict]:
    rows = db.execute(
        select(CrossCivView).where(CrossCivView.topic_id == topic_id)
    ).scalars().all()
    return [
        {
            "civilization": v.civilization,
            "civ_label": _civ_label(v, lang),
            "headline": _localize(v.headline or {}, lang),
            "detail": _localize(v.detail or {}, lang),
            "sources": list(v.sources or []),
            "ai_generated": bool(v.ai_generated),
            "reviewed": bool(v.reviewed_by),
        }
        for v in rows
    ]


def topic_card(db: Session, topic_id: str, lang: str = "zh") -> Optional[dict]:
    t = db.get(Topic, topic_id)
    if not t:
        return None
    return {
        "id": t.id,
        "name": (t.name_i18n or {}).get(lang) or t.name_zh,
        "description": _localize(t.description or {}, lang),
        "color": t.color,
        "related_concepts": list(t.related_concepts or []),
        "related_passages": list(t.related_passages or []),
    }


def list_topics(db: Session, lang: str = "zh") -> List[dict]:
    rows = db.execute(select(Topic).order_by(Topic.sort_order)).scalars().all()
    return [
        {
            "id": t.id,
            "name": (t.name_i18n or {}).get(lang) or t.name_zh,
            "description": _localize(t.description or {}, lang),
            "color": t.color,
        }
        for t in rows
    ]

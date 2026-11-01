from __future__ import annotations

import re

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import DialogCase, Topic, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["cases"])


# ── 公共：浏览 ────────────────────────────────────────────────────────────────
def _slugify(text: str) -> str:
    """英文短语 → URL slug;无英文素材时回落议题 id(本身为 ascii)。"""
    sl = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return sl or "case"


def _brief(c: DialogCase, lang: str = "zh", topic_en: str = "") -> dict:
    # 非中文时用预置四语问题译文展示(无译文回落中文原文)
    q = c.question
    if lang not in ("zh", "all"):
        q = (c.question_i18n or {}).get(lang) or c.question
    return {
        "id": c.id,
        # 分享友好 URL:/cases/{id}-{topic-en-slug};旧纯数字链接仍兼容(前端按前导数字解析)
        "slug": f"{c.id}-{_slugify(topic_en or c.topic_id)}",
        "topic_id": c.topic_id,
        "lang": c.lang,
        "title": c.title,
        "question": q,
        "status": c.status,
        "quality": c.quality,
        "ai_generated": c.ai_generated,
        "reviewer": c.reviewer,
        "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        "review_note": c.review_note,
        "tags": list(c.tags or []),
        "civ_count": len(c.cross_civ_views or []),
    }


def _localize_view(v: dict, lang: str) -> dict:
    """视图按 lang 取 i18n 字段(标签/摘要),缺译回落中文。"""
    if lang in ("zh", "all"):
        return v
    return {
        **v,
        "civ_label": (v.get("civ_label_i18n") or {}).get(lang) or v.get("civ_label"),
        "headline": (v.get("headline_i18n") or {}).get(lang) or v.get("headline"),
    }


def _full(c: DialogCase, lang: str = "zh", topic_en: str = "") -> dict:
    return {
        **_brief(c, lang, topic_en),
        # 长答案:优先该语版本,缺译回落中文
        "confucian_answer": (c.answer_i18n or {}).get(lang) or c.confucian_answer,
        "cross_civ_views": [_localize_view(v, lang) for v in (c.cross_civ_views or [])],
        "citations": list(c.citations or []),
        "reviewer": c.reviewer,
        "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        "review_note": c.review_note,
    }


@router.get("/cases")
def list_cases(
    topic_id: Optional[str] = Query(None),
    lang: str = Query("zh"),
    status: str = Query("published"),  # 默认仅显示已发布
    q: Optional[str] = Query(None, description="问题/标题关键词"),
    review: Optional[str] = Query(None, description="审核质量过滤：unreviewed|stamped|rated|all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    topic_en_map = {
        t.id: (t.name_i18n or {}).get("en", "") for t in db.execute(select(Topic)).scalars()
    }
    stmt = select(DialogCase).where(DialogCase.lang == lang)
    # 语种行缺失时回落中文行(标题按 question_i18n 本地化),保证任何语言都有内容
    if lang not in ("zh", "all"):
        has_rows = db.execute(
            select(func.count()).select_from(DialogCase).where(DialogCase.lang == lang)
        ).scalar_one()
        if not has_rows:
            stmt = select(DialogCase).where(DialogCase.lang == "zh")
    if topic_id:
        stmt = stmt.where(DialogCase.topic_id == topic_id)
    if status != "all":
        stmt = stmt.where(DialogCase.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (DialogCase.question.like(like)) | (DialogCase.title.like(like))
        )
    # 审核质量过滤
    if review == "unreviewed":
        stmt = stmt.where(DialogCase.reviewer.is_(None))
    elif review == "stamped":
        # AI 批量盖章：有 reviewer 但未评星且无备注
        stmt = stmt.where(
            DialogCase.reviewer.isnot(None),
            DialogCase.quality == 0,
            (DialogCase.review_note.is_(None)) | (DialogCase.review_note == ""),
        )
    elif review == "rated":
        # 真正人审过：评了星或写了备注
        stmt = stmt.where(
            (DialogCase.quality > 0)
            | ((DialogCase.review_note.isnot(None)) & (DialogCase.review_note != "")),
        )

    total = db.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar_one()

    rows = (
        db.execute(stmt.order_by(DialogCase.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_brief(c, lang, topic_en_map.get(c.topic_id, "")) for c in rows],
    }


@router.get("/cases/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    """库存按议题 + 状态的统计（首页用）。"""
    rows = db.execute(
        select(DialogCase.topic_id, DialogCase.status, func.count())
        .group_by(DialogCase.topic_id, DialogCase.status)
    ).all()
    topics = {
        t.id: {"name": t.name_zh, "total": 0, "by_status": {}}
        for t in db.execute(select(Topic)).scalars()
    }
    grand_total = 0
    for topic_id, status, n in rows:
        if topic_id in topics:
            topics[topic_id]["total"] += n
            topics[topic_id]["by_status"][status] = n
        grand_total += n

    # 审核质量分布（横切已发布的）
    n_unreviewed = db.execute(
        select(func.count()).select_from(DialogCase).where(DialogCase.reviewer.is_(None))
    ).scalar_one() or 0
    n_stamped = db.execute(
        select(func.count()).select_from(DialogCase).where(
            DialogCase.reviewer.isnot(None),
            DialogCase.quality == 0,
            (DialogCase.review_note.is_(None)) | (DialogCase.review_note == ""),
        )
    ).scalar_one() or 0
    n_rated = db.execute(
        select(func.count()).select_from(DialogCase).where(
            (DialogCase.quality > 0)
            | ((DialogCase.review_note.isnot(None)) & (DialogCase.review_note != "")),
        )
    ).scalar_one() or 0

    return {
        "total": grand_total,
        "by_topic": topics,
        "review_quality": {
            "unreviewed": n_unreviewed,   # 完全未审
            "stamped": n_stamped,         # AI 一键盖章（有 reviewer 但未评星）
            "rated": n_rated,             # 真正人审过（评了星或写了备注）
        },
    }


@router.get("/cases/{case_id}")
def get_case(case_id: int, lang: str = Query("zh"), db: Session = Depends(get_db)) -> dict:
    c = db.get(DialogCase, case_id)
    if not c:
        raise HTTPException(404, "case not found")
    topic = db.get(Topic, c.topic_id)
    topic_en = (topic.name_i18n or {}).get("en", "") if topic else ""
    return _full(c, lang, topic_en)


# ── 管理：审核 / 发布 ──────────────────────────────────────────────────────────
def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "admin only")
    return user


class ReviewIn(BaseModel):
    quality: Optional[int] = None
    review_note: Optional[str] = None
    status: Optional[str] = None  # draft|reviewed|published|rejected
    confucian_answer: Optional[str] = None
    title: Optional[str] = None


@router.put("/admin/cases/{case_id}")
def review_case(
    case_id: int,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict:
    c = db.get(DialogCase, case_id)
    if not c:
        raise HTTPException(404, "case not found")
    payload = body.model_dump(exclude_none=True)
    for k, v in payload.items():
        setattr(c, k, v)
    if "status" in payload or "quality" in payload:
        c.reviewer = user.display_name or user.id
        c.reviewed_at = datetime.utcnow()
    db.commit()
    return _full(c)


@router.post("/admin/cases/{case_id}/publish")
def publish_case(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict:
    c = db.get(DialogCase, case_id)
    if not c:
        raise HTTPException(404, "case not found")
    c.status = "published"
    c.reviewer = user.display_name or user.id
    c.reviewed_at = datetime.utcnow()
    db.commit()
    return _full(c)


# promote-self 端点已移除：admin 通过 .env 的 ADMIN_EMAILS 邮箱白名单授予。
# 见 routers/auth.py 的 _is_admin_email 与 login/register/upgrade 自动判定。

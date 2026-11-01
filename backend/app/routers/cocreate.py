from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Contribution, ContributionVote, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/contributions", tags=["co-create"])


def _brief(c: Contribution) -> dict:
    return {
        "id": c.id,
        "user_id": c.user_id,
        "kind": c.kind,
        "topic_id": c.topic_id,
        "civilization": c.civilization,
        "headline": c.headline,
        "detail": c.detail,
        "sources": list(c.sources or []),
        "lang": c.lang,
        "status": c.status,
        "score": (c.upvotes or 0) - (c.downvotes or 0),
        "upvotes": c.upvotes or 0,
        "downvotes": c.downvotes or 0,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


class ContribIn(BaseModel):
    kind: str = "cross_civ"
    topic_id: Optional[str] = None
    target_ref: Optional[str] = None
    civilization: Optional[str] = None
    headline: str
    detail: str = ""
    sources: list[dict] = []
    lang: str = "zh"


@router.post("")
def submit(
    body: ContribIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = Contribution(
        user_id=user.id,
        kind=body.kind,
        topic_id=body.topic_id,
        target_ref=body.target_ref,
        civilization=body.civilization,
        headline=body.headline.strip(),
        detail=body.detail.strip(),
        sources=body.sources,
        lang=body.lang,
        status="pending",
    )
    db.add(c)
    db.commit()
    return _brief(c)


@router.get("")
def list_contribs(
    topic_id: Optional[str] = Query(None),
    kind: Optional[str] = Query(None),
    status: str = Query("published"),
    sort: str = Query("score"),  # score | new
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Contribution)
    if status != "all":
        stmt = stmt.where(Contribution.status == status)
    if topic_id:
        stmt = stmt.where(Contribution.topic_id == topic_id)
    if kind:
        stmt = stmt.where(Contribution.kind == kind)
    if sort == "new":
        stmt = stmt.order_by(desc(Contribution.id))
    else:
        stmt = stmt.order_by(
            desc(Contribution.upvotes - Contribution.downvotes), desc(Contribution.id)
        )
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_brief(c) for c in rows],
    }


@router.get("/mine")
def my_contribs(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list:
    rows = db.execute(
        select(Contribution).where(Contribution.user_id == user.id).order_by(desc(Contribution.id))
    ).scalars().all()
    return [_brief(c) for c in rows]


@router.post("/{cid}/vote")
def vote(
    cid: int,
    value: int = Query(1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = db.get(Contribution, cid)
    if not c:
        raise HTTPException(404, "not found")
    if value not in (-1, 1):
        raise HTTPException(400, "value must be -1 or 1")
    existing = db.execute(
        select(ContributionVote).where(
            ContributionVote.contribution_id == cid,
            ContributionVote.user_id == user.id,
        )
    ).scalar_one_or_none()
    if existing:
        # 反向：撤销旧票，应用新票
        if existing.value == value:
            return _brief(c)  # 重复投同票：忽略
        if existing.value == 1:
            c.upvotes = max(0, (c.upvotes or 0) - 1)
        else:
            c.downvotes = max(0, (c.downvotes or 0) - 1)
        existing.value = value
    else:
        db.add(ContributionVote(contribution_id=cid, user_id=user.id, value=value))
    if value == 1:
        c.upvotes = (c.upvotes or 0) + 1
    else:
        c.downvotes = (c.downvotes or 0) + 1
    db.commit()
    return _brief(c)


# 管理：发布/拒绝
class ReviewIn(BaseModel):
    status: str
    review_note: Optional[str] = None


@router.put("/admin/{cid}")
def review(
    cid: int,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not user.is_admin:
        raise HTTPException(403, "admin only")
    c = db.get(Contribution, cid)
    if not c:
        raise HTTPException(404, "not found")
    c.status = body.status
    c.reviewer = user.display_name or user.id
    c.reviewed_at = datetime.utcnow()
    db.commit()
    return _brief(c)

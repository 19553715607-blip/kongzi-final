"""内容点赞（公开，游客凭 X-Visitor-Id 或登录态）。

- POST /api/v1/likes/toggle   body {target_type?, target_id}  切换赞/取消，返回 {liked, count}
- GET  /api/v1/likes/count?target_type=&target_id=            返回 {count, liked}

无需 admin；但必须有身份（X-Visitor-Id 头或有效 Bearer），否则 400。
去重键 = (target_type, target_id, visitor_id)。登录用户若无 X-Visitor-Id，
则用 registered:<user_id> 作为稳定 visitor_id。
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ContentLike, User
from ..services.auth import verify_token

router = APIRouter(prefix="/api/v1/likes", tags=["likes"])


class LikeToggleIn(BaseModel):
    target_type: str = Field("passage", min_length=1, max_length=32)
    target_id: str = Field(..., min_length=1, max_length=192)


def _resolve_identity(
    authorization: Optional[str],
    x_visitor_id: Optional[str],
    db: Session,
) -> tuple[Optional[User], str]:
    """解析当前身份：登录用户（可选）+ 用于去重的 visitor_id。

    无任何身份（既无 X-Visitor-Id，也无有效 Bearer）→ 400。
    """
    user: Optional[User] = None
    if authorization and authorization.lower().startswith("bearer "):
        uid = verify_token(authorization[7:])
        if uid:
            user = db.get(User, uid)

    visitor_id = (x_visitor_id or "").strip()
    if not visitor_id:
        if user:
            visitor_id = f"registered:{user.id}"
        else:
            raise HTTPException(400, "missing identity: provide X-Visitor-Id header or a valid Bearer token")
    return user, visitor_id


def _get_like(
    db: Session, target_type: str, target_id: str, visitor_id: str
) -> Optional[ContentLike]:
    return db.execute(
        select(ContentLike).where(
            ContentLike.target_type == target_type,
            ContentLike.target_id == target_id,
            ContentLike.visitor_id == visitor_id,
        )
    ).scalars().first()


def _count_likes(db: Session, target_type: str, target_id: str) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(ContentLike)
            .where(
                ContentLike.target_type == target_type,
                ContentLike.target_id == target_id,
            )
        )
        or 0
    )


@router.post("/toggle")
def toggle_like(
    body: LikeToggleIn,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_visitor_id: Optional[str] = Header(None, alias="X-Visitor-Id"),
) -> dict:
    target_type = body.target_type.strip()
    target_id = body.target_id.strip()
    if not target_type or not target_id:
        raise HTTPException(400, "target_type and target_id must be non-empty")

    user, visitor_id = _resolve_identity(authorization, x_visitor_id, db)

    existing = _get_like(db, target_type, target_id, visitor_id)
    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = ContentLike(
            id=str(uuid.uuid4()),
            target_type=target_type,
            target_id=target_id,
            visitor_id=visitor_id,
            user_id=user.id if user else None,
        )
        db.add(like)
        try:
            db.commit()
        except IntegrityError:
            # 并发竞态：另一请求已插入同一去重键，按"已赞"处理即可
            db.rollback()
        liked = True

    count = _count_likes(db, target_type, target_id)
    return {"liked": liked, "count": count}


@router.get("/count")
def count_likes(
    target_type: str = Query("passage", min_length=1, max_length=32),
    target_id: str = Query(..., min_length=1, max_length=192),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_visitor_id: Optional[str] = Header(None, alias="X-Visitor-Id"),
) -> dict:
    target_type = target_type.strip()
    target_id = target_id.strip()
    if not target_type or not target_id:
        raise HTTPException(400, "target_type and target_id must be non-empty")

    user, visitor_id = _resolve_identity(authorization, x_visitor_id, db)
    liked = _get_like(db, target_type, target_id, visitor_id) is not None
    count = _count_likes(db, target_type, target_id)
    return {"count": count, "liked": liked}

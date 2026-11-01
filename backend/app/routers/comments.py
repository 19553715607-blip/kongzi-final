"""楼中楼评论系统。

公开接口 /api/v1/comments（无需 admin，游客凭 X-Visitor-Id 或自动生成）：
- GET    /comments            嵌套树（仅 visible）+ total
- POST   /comments            发帖（含楼中楼回复）
- POST   /comments/{id}/like  点赞 +1
- DELETE /comments/{id}      本人软删（status=hidden）
- POST   /comments/{id}/report 举报计数 +1

管理接口 /api/v1/admin/comments（require_admin）：
- GET    /admin/comments/stats   统计（须在 /{id} 之前注册）
- GET    /admin/comments          全部分页
- PATCH  /admin/comments/{id}     改 status / content
- DELETE /admin/comments/{id}     硬删
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditLog, Comment, User
from ..services.auth import require_admin, verify_token

public_router = APIRouter(prefix="/api/v1/comments", tags=["comments"])
admin_router = APIRouter(prefix="/api/v1/admin/comments", tags=["admin-comments"])

# 频率限制：同一 visitor 10 秒内最多 1 条
_RATE_WINDOW_SEC = 10
_MAX_LEN = 500


# ── 工具 ──────────────────────────────────────────────────────────────────────
def _optional_user(authorization: Optional[str], db: Session) -> Optional[User]:
    """有 Bearer 且有效则返回登录用户，否则 None（不抛错，兼容游客）。"""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    uid = verify_token(authorization[7:])
    if not uid:
        return None
    return db.get(User, uid)


def _author_name(user: Optional[User], visitor_id: str, body_name: Optional[str]) -> str:
    if user:
        return (user.display_name or user.email or "君子")[:40]
    return (body_name or f"访客{visitor_id[-6:]}")[:40]


def _comment_dict(c: Comment) -> dict:
    return {
        "id": c.id,
        "target_type": c.target_type,
        "target_id": c.target_id,
        "visitor_id": c.visitor_id,
        "user_id": c.user_id,
        "author_name": c.author_name,
        "content": c.content,
        "parent_id": c.parent_id,
        "root_id": c.root_id,
        "status": c.status,
        "likes": c.likes,
        "report_count": c.report_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _build_tree(rows: list[Comment]) -> list[dict]:
    """在内存组树：parent_id 关联，深度不限；replies 按 created_at 升序。"""
    nodes: dict[str, dict] = {}
    for c in rows:
        d = _comment_dict(c)
        d["replies"] = []
        nodes[c.id] = d
    roots: list[dict] = []
    for c in rows:
        node = nodes[c.id]
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id]["replies"].append(node)
        else:
            roots.append(node)
    return roots


# ── 公开接口 ──────────────────────────────────────────────────────────────────
class CommentIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=_MAX_LEN)
    target_type: str = Field(..., min_length=1, max_length=32)
    target_id: str = Field(..., min_length=1, max_length=192)
    parent_id: Optional[str] = None
    author_name: Optional[str] = Field(None, max_length=40)


@public_router.get("")
def list_comments(
    target_type: str = Query(..., min_length=1),
    target_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> dict:
    """返回嵌套树（仅 visible）+ total（含整串所有 visible 条）。"""
    rows = db.execute(
        select(Comment)
        .where(
            Comment.target_type == target_type,
            Comment.target_id == target_id,
            Comment.status == "visible",
        )
        .order_by(Comment.created_at.asc())
    ).scalars().all()

    # 根评论集合：parent_id 为空的 visible 评论。
    # 若某根被隐藏，则其整串（root_id=该根）一并不展示。
    visible_root_ids = {c.id for c in rows if not c.parent_id}
    visible_rows = [
        c for c in rows
        if not c.root_id or c.root_id in visible_root_ids
    ]
    tree = _build_tree(visible_rows)
    total = db.scalar(
        select(func.count()).select_from(Comment).where(
            Comment.target_type == target_type,
            Comment.target_id == target_id,
            Comment.status == "visible",
        )
    ) or 0
    return {"total": int(total), "items": tree}


@public_router.post("", status_code=201)
def create_comment(
    body: CommentIn,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_visitor_id: Optional[str] = Header(None, alias="X-Visitor-Id"),
) -> dict:
    content = body.content.strip()
    if not content:
        raise HTTPException(400, "content empty")
    if len(content) > _MAX_LEN:
        raise HTTPException(400, f"content too long (>{_MAX_LEN})")

    user = _optional_user(authorization, db)

    # visitor_id：优先请求头，否则生成
    visitor_id = (x_visitor_id or "").strip() or str(uuid.uuid4())

    # 频率限制：同 visitor 10 秒内最多 1 条
    latest = db.execute(
        select(Comment).where(Comment.visitor_id == visitor_id)
        .order_by(Comment.created_at.desc()).limit(1)
    ).scalars().first()
    if latest and latest.created_at:
        if (datetime.utcnow() - latest.created_at) < timedelta(seconds=_RATE_WINDOW_SEC):
            raise HTTPException(429, f"too frequent: wait {_RATE_WINDOW_SEC}s")

    # 楼中楼：校验 parent 存在且 visible；继承 root_id
    root_id: Optional[str] = None
    if body.parent_id:
        parent = db.get(Comment, body.parent_id)
        if not parent:
            raise HTTPException(400, "parent comment not found")
        if parent.status != "visible":
            raise HTTPException(400, "parent comment is hidden")
        if parent.target_type != body.target_type or parent.target_id != body.target_id:
            raise HTTPException(400, "parent comment belongs to a different target")
        root_id = parent.root_id or parent.id

    cid = str(uuid.uuid4())
    comment = Comment(
        id=cid,
        target_type=body.target_type,
        target_id=body.target_id,
        visitor_id=visitor_id,
        user_id=user.id if user else None,
        author_name=_author_name(user, visitor_id, body.author_name),
        content=content,
        parent_id=body.parent_id,
        root_id=root_id or cid,
        status="visible",
    )
    db.add(comment)
    db.commit()
    out = _comment_dict(comment)
    out["visitor_id"] = visitor_id  # 回传给客户端持久化
    return out


@public_router.post("/{comment_id}/like")
def like_comment(
    comment_id: str,
    db: Session = Depends(get_db),
) -> dict:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "comment not found")
    c.likes = (c.likes or 0) + 1
    db.commit()
    return {"ok": True, "id": c.id, "likes": c.likes}


@public_router.delete("/{comment_id}")
def delete_my_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_visitor_id: Optional[str] = Header(None, alias="X-Visitor-Id"),
) -> dict:
    """本人（visitor_id 或 user_id 匹配）可软删（status=hidden，不硬删）。"""
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "comment not found")
    user = _optional_user(authorization, db)
    visitor_id = (x_visitor_id or "").strip()
    owner = (user and c.user_id == user.id) or (visitor_id and c.visitor_id == visitor_id)
    if not owner:
        raise HTTPException(403, "not your comment")
    c.status = "hidden"
    db.commit()
    return {"ok": True, "id": c.id, "status": "hidden"}


@public_router.post("/{comment_id}/report")
def report_comment(
    comment_id: str,
    db: Session = Depends(get_db),
) -> dict:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "comment not found")
    c.report_count = (c.report_count or 0) + 1
    db.commit()
    return {"ok": True, "id": c.id, "report_count": c.report_count}


# ── 管理接口 ──────────────────────────────────────────────────────────────────
class CommentPatch(BaseModel):
    status: Optional[str] = Field(None, pattern="^(visible|hidden)$")
    content: Optional[str] = Field(None, max_length=_MAX_LEN)


@admin_router.get("/stats")
def admin_comment_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    total = db.scalar(select(func.count()).select_from(Comment)) or 0
    visible = db.scalar(select(func.count()).select_from(Comment).where(Comment.status == "visible")) or 0
    hidden = db.scalar(select(func.count()).select_from(Comment).where(Comment.status == "hidden")) or 0
    today = db.scalar(
        select(func.count()).select_from(Comment).where(func.date(Comment.created_at) == func.date(func.now()))
    ) or 0
    by_type = [
        {"target_type": t, "count": int(n)}
        for t, n in db.execute(
            select(Comment.target_type, func.count()).group_by(Comment.target_type)
        ).all()
        if t
    ]
    return {
        "total": int(total),
        "visible": int(visible),
        "hidden": int(hidden),
        "today": int(today),
        "by_target_type": by_type,
    }


@admin_router.get("")
def admin_list_comments(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    status: Optional[str] = None,
    target_type: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
) -> dict:
    stmt = select(Comment)
    if status:
        stmt = stmt.where(Comment.status == status)
    if target_type:
        stmt = stmt.where(Comment.target_type == target_type)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Comment.content.like(like), Comment.author_name.like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(Comment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()
    return {
        "total": int(total), "page": page, "page_size": page_size,
        "items": [_comment_dict(c) for c in rows],
    }


@admin_router.patch("/{comment_id}")
def admin_patch_comment(
    comment_id: str,
    body: CommentPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "comment not found")
    changed: dict = {}
    if body.status is not None:
        c.status = body.status
        changed["status"] = body.status
    if body.content is not None and body.content.strip():
        c.content = body.content.strip()
        changed["content"] = c.content
    db.add(AuditLog(
        actor_id=admin.id, actor_email=admin.email,
        action="moderate_comment", target_type="comment", target_id=comment_id,
        detail=changed,
    ))
    db.commit()
    return _comment_dict(c)


@admin_router.delete("/{comment_id}")
def admin_delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "comment not found")
    db.add(AuditLog(
        actor_id=admin.id, actor_email=admin.email,
        action="delete_comment", target_type="comment", target_id=comment_id,
        detail={"content": c.content[:80], "status": c.status},
    ))
    db.delete(c)
    db.commit()
    return {"ok": True, "id": comment_id}

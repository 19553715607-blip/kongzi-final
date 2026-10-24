from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Favorite, User, UserBadge
from ..services import gamify
from ..services.auth import (
    get_current_user,
    hash_password,
    make_token,
    verify_password,
    verify_token,
)
from ..services.geo import ip_to_country


def _merge_guest(db: Session, guest_token: Optional[str], target: User) -> dict:
    """登录 / 注册时，把浏览器里游客身份积累的进度并入目标账号。

    游客态下读经、玩六艺、签到都会真实累计 xp 与六艺进境，登录已有账号时
    这些进度不该丢失。前端通过 X-Guest-Token 头带上当前 token，这里校验
    它确实属于一个游客且不是目标账号本身，再执行合并。
    """
    if not guest_token:
        return {"merged": False}
    guest_id = verify_token(guest_token)
    if not guest_id or guest_id == target.id:
        return {"merged": False}
    guest = db.get(User, guest_id)
    if not guest or not guest.is_guest:
        return {"merged": False}
    return gamify.merge_guest_into(db, guest, target)


def _client_ip(request: Request, x_forwarded_for: Optional[str]) -> Optional[str]:
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    client = request.client
    return client.host if client else None


def _is_admin_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.strip().lower() in get_settings().admin_email_set

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


def _user_public(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "is_guest": u.is_guest,
        "is_admin": u.is_admin,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "lang": u.lang,
        "theme": u.theme,
        "ai_persona": u.ai_persona,
        "signup_country": u.signup_country,
    }


@router.post("/guest")
def guest(
    request: Request,
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    db: Session = Depends(get_db),
) -> dict:
    """无摩擦入口：自动签发游客账号 + token。"""
    ip = _client_ip(request, x_forwarded_for)
    country_code, _ = ip_to_country(ip)
    u = User(
        id=str(uuid.uuid4()),
        is_guest=True,
        display_name="小君子",
        signup_ip=ip,
        signup_country=country_code,
    )
    db.add(u)
    db.commit()
    return {"token": make_token(u.id), "user": _user_public(u)}


@router.post("/register")
def register(
    body: Credentials,
    request: Request,
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    x_guest_token: Optional[str] = Header(None, alias="X-Guest-Token"),
    db: Session = Depends(get_db),
) -> dict:
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(409, "email already registered")
    ip = _client_ip(request, x_forwarded_for)
    country_code, _ = ip_to_country(ip)
    u = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        is_guest=False,
        is_admin=_is_admin_email(body.email),  # 邮箱命中白名单自动升 admin
        display_name=body.display_name or body.email.split("@")[0],
        signup_ip=ip,
        signup_country=country_code,
    )
    db.add(u)
    db.commit()
    merged = _merge_guest(db, x_guest_token, u)
    return {"token": make_token(u.id), "user": _user_public(u), "merged": merged}


@router.post("/login")
def login(
    body: Credentials,
    x_guest_token: Optional[str] = Header(None, alias="X-Guest-Token"),
    db: Session = Depends(get_db),
) -> dict:
    u = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if not u or not u.password_hash or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "invalid email or password")
    # 每次登录都按白名单同步 is_admin（白名单变了能即时生效）
    new_admin = _is_admin_email(u.email)
    if u.is_admin != new_admin:
        u.is_admin = new_admin
        db.commit()
    merged = _merge_guest(db, x_guest_token, u)
    return {"token": make_token(u.id), "user": _user_public(u), "merged": merged}


@router.post("/upgrade")
def upgrade(
    body: Credentials,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """游客绑定邮箱升级为正式账号（保留全部进度）。"""
    if not user.is_guest:
        raise HTTPException(400, "already a registered account")
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(409, "email already registered")
    user.email = body.email
    user.password_hash = hash_password(body.password)
    user.is_guest = False
    user.is_admin = _is_admin_email(body.email)  # 升级时同样按白名单判定
    if body.display_name:
        user.display_name = body.display_name
    db.commit()
    return {"token": make_token(user.id), "user": _user_public(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return _user_public(user)


class Prefs(BaseModel):
    display_name: Optional[str] = None
    lang: Optional[str] = None
    theme: Optional[str] = None
    ai_persona: Optional[str] = None


@router.put("/me")
def update_me(
    body: Prefs,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    return _user_public(user)


@router.get("/me/export")
def export_me(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    """GDPR/CCPA 数据导出。"""
    favs = db.execute(select(Favorite).where(Favorite.user_id == user.id)).scalars()
    badges = db.execute(select(UserBadge).where(UserBadge.user_id == user.id)).scalars()
    return {
        "user": _user_public(user),
        "gamify": {"xp": user.xp, "streak_days": user.streak_days, "liuyi": user.liuyi},
        "favorites": [
            {"type": f.target_type, "ref": f.target_ref, "label": f.label} for f in favs
        ],
        "badges": [b.badge_id for b in badges],
    }


@router.delete("/me")
def delete_me(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    """账户与数据删除权。"""
    db.query(Favorite).filter(Favorite.user_id == user.id).delete()
    db.query(UserBadge).filter(UserBadge.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"deleted": True}

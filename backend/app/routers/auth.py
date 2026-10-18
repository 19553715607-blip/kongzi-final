from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Favorite, User, UserBadge
from ..services.auth import (
    get_current_user,
    hash_password,
    make_token,
    verify_password,
)
from ..services.geo import ip_to_country


def _client_ip(request: Request) -> Optional[str]:
    # Never trust arbitrary X-Forwarded-For values; configure proxy middleware
    # explicitly before using forwarded headers in a deployment.
    client = request.client
    return client.host if client else None


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class EmailCredentials(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or any(ch.isspace() for ch in value):
            raise ValueError("valid email required")
        local, domain = value.split("@")
        if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("valid email required")
        return value


class Credentials(EmailCredentials):
    """New account passwords retain the 10-character minimum policy."""

    password: str = Field(..., min_length=10, max_length=128)
    display_name: Optional[str] = Field(None, max_length=80)


class LoginCredentials(EmailCredentials):
    """Permit existing accounts to authenticate with their original password."""

    password: str = Field(..., min_length=1, max_length=128)


def _user_public(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "is_guest": u.is_guest,
        "is_admin": u.is_admin,
        "display_name": u.display_name,
        "lang": u.lang,
        "theme": u.theme,
        "ai_persona": u.ai_persona,
        "signup_country": u.signup_country,
    }


@router.post("/guest")
def guest(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """无摩擦入口：自动签发游客账号 + token。"""
    ip = _client_ip(request)
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
    db: Session = Depends(get_db),
) -> dict:
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(409, "email already registered")
    ip = _client_ip(request)
    country_code, _ = ip_to_country(ip)
    u = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        is_guest=False,
        is_admin=False,
        display_name=body.display_name or body.email.split("@")[0],
        signup_ip=ip,
        signup_country=country_code,
    )
    db.add(u)
    db.commit()
    return {"token": make_token(u.id), "user": _user_public(u)}


@router.post("/login")
def login(body: LoginCredentials, db: Session = Depends(get_db)) -> dict:
    u = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if not u or not u.password_hash or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "invalid email or password")
    return {"token": make_token(u.id), "user": _user_public(u)}


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
    user.is_admin = False
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

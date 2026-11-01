"""轻量鉴权：自包含 HS256 JWT + PBKDF2 口令哈希（仅用标准库，无新依赖）。

足够支撑原型：游客自动签发、邮箱注册/登录、Bearer 鉴权。
生产应换成成熟库（pyjwt + passlib/argon2）与更强密钥管理。
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User

settings = get_settings()


# ── base64url ────────────────────────────────────────────────────────────────
def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


# ── JWT (HS256) ──────────────────────────────────────────────────────────────
def make_token(user_id: str) -> str:
    header = _b64e(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64e(
        json.dumps(
            {"sub": user_id, "exp": int(time.time()) + settings.jwt_ttl_days * 86400}
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode()
    sig = hmac.new(settings.jwt_secret.encode(), signing_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64e(sig)}"


def verify_token(token: str) -> Optional[str]:
    try:
        header, payload, sig = token.split(".")
        signing_input = f"{header}.{payload}".encode()
        expected = hmac.new(
            settings.jwt_secret.encode(), signing_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_b64d(sig), expected):
            return None
        data = json.loads(_b64d(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data.get("sub")
    except Exception:
        return None


# ── 口令哈希（PBKDF2-HMAC-SHA256）────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2${_b64e(salt)}${_b64e(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_b64, dk_b64 = stored.split("$")
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), _b64d(salt_b64), 200_000
        )
        return hmac.compare_digest(dk, _b64d(dk_b64))
    except Exception:
        return False


# ── 依赖：从 Bearer 取当前用户 ────────────────────────────────────────────────
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "missing bearer token")
    uid = verify_token(authorization[7:])
    if not uid:
        raise HTTPException(401, "invalid or expired token")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, "user not found")
    if getattr(user, "is_banned", False):
        raise HTTPException(403, "account banned")
    return user


# ── 依赖：仅管理员可用 ────────────────────────────────────────────────────────
def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "admin only")
    return user

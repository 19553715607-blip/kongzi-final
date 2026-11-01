"""开放接口的 API Key 鉴权 + 配额 + 简易速率限制。

X-API-Key 头部传 key。每次调用：
- 验证 key 存在 + 未撤销 + 机构 approved
- 配额：按月统计调用数（institutions.monthly_quota）
- 速率：1 分钟 60 次（in-memory token bucket，原型够用；生产换 Redis）
- 记录 ApiCall 日志（异步可选）
"""
from __future__ import annotations

import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ApiCall, ApiKey, Institution

# in-memory rate limiter（按 key 分桶）
_RL_LIMIT = 60       # 60 req
_RL_WINDOW = 60      # per 60s
_rl: dict[str, list[float]] = defaultdict(list)


def generate_key() -> str:
    """KZ_ 前缀 + 32 字符 url-safe。"""
    return "kz_" + secrets.token_urlsafe(24)


def _ratelimit_check(key: str) -> bool:
    now = time.time()
    bucket = _rl[key]
    cutoff = now - _RL_WINDOW
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= _RL_LIMIT:
        return False
    bucket.append(now)
    return True


def _quota_used_this_month(db: Session, inst_id: int) -> int:
    start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return db.execute(
        select(func.count())
        .select_from(ApiCall)
        .where(ApiCall.institution_id == inst_id, ApiCall.ts >= start)
    ).scalar_one() or 0


def authenticate(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> tuple[ApiKey, Institution]:
    if not x_api_key:
        raise HTTPException(401, "missing X-API-Key")
    ak = db.execute(select(ApiKey).where(ApiKey.key == x_api_key)).scalar_one_or_none()
    if not ak or ak.revoked:
        raise HTTPException(401, "invalid or revoked api key")
    inst = db.get(Institution, ak.institution_id)
    if not inst or inst.status != "approved":
        raise HTTPException(403, "institution not approved")
    # 速率
    if not _ratelimit_check(x_api_key):
        raise HTTPException(429, f"rate limit: {_RL_LIMIT}/min")
    # 配额
    used = _quota_used_this_month(db, inst.id)
    if used >= inst.monthly_quota:
        raise HTTPException(
            429,
            f"monthly quota exceeded ({used}/{inst.monthly_quota})",
        )
    # 触达即更新 last_used + 写日志（best-effort）
    try:
        ak.last_used_at = datetime.utcnow()
        db.add(
            ApiCall(
                api_key_id=ak.id,
                institution_id=inst.id,
                path=request.url.path,
                status=200,  # 这里只先记 200；4xx/5xx 由全局中间件覆盖
                latency_ms=0,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
    return ak, inst


def stats_for(db: Session, inst_id: int) -> dict:
    """机构自查看板用。"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    last7 = today - timedelta(days=7)
    month_start = today.replace(day=1)

    used_today = db.execute(
        select(func.count()).select_from(ApiCall).where(
            ApiCall.institution_id == inst_id, ApiCall.ts >= today
        )
    ).scalar_one() or 0
    used_7d = db.execute(
        select(func.count()).select_from(ApiCall).where(
            ApiCall.institution_id == inst_id, ApiCall.ts >= last7
        )
    ).scalar_one() or 0
    used_month = db.execute(
        select(func.count()).select_from(ApiCall).where(
            ApiCall.institution_id == inst_id, ApiCall.ts >= month_start
        )
    ).scalar_one() or 0

    # 按路径 top 5
    rows = db.execute(
        select(ApiCall.path, func.count()).where(
            ApiCall.institution_id == inst_id, ApiCall.ts >= last7
        ).group_by(ApiCall.path).order_by(func.count().desc()).limit(5)
    ).all()
    return {
        "used_today": used_today,
        "used_7d": used_7d,
        "used_month": used_month,
        "top_paths": [{"path": p, "count": n} for p, n in rows],
    }

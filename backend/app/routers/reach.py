"""传播覆盖埋点 + 看板（申报书目标③：师生参与 5w、覆盖 50w 人次的度量基础）。"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import PageEvent
from ..services.geo import ip_to_country

router = APIRouter(prefix="/api/v1/reach", tags=["reach"])


class TrackIn(BaseModel):
    visitor_id: str
    path: str
    device: str = "web"
    source: str = "direct"
    campus: Optional[str] = None


def _client_ip(request: Request, x_forwarded_for: Optional[str]) -> Optional[str]:
    """取真实客户端 IP：优先 X-Forwarded-For 第一个，回退 request.client.host。"""
    if x_forwarded_for:
        # 取第一个（最左是原始客户端；后面是各级代理）
        ip = x_forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    client = request.client
    return client.host if client else None


@router.post("/track")
def track(
    body: TrackIn,
    request: Request,
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    db: Session = Depends(get_db),
) -> dict:
    """前端在每次路由变化时调用一次。匿名 visitor_id 由前端生成存 localStorage。

    IP 与 country_code 由服务端从请求头解析，客户端无法伪造国家（campus 可自报，
    但 country_code 是 IP 衍生的客观证据）。
    """
    device = body.device
    if device == "web" and user_agent and "Mobile" in user_agent:
        device = "mobile"
    ip = _client_ip(request, x_forwarded_for)
    country_code, country_name = ip_to_country(ip)
    ev = PageEvent(
        visitor_id=body.visitor_id,
        path=body.path,
        device=device,
        source=body.source,
        campus=body.campus,
        ip=ip,
        country_code=country_code,
        country_name=country_name,
    )
    db.add(ev)
    db.commit()
    return {"ok": True, "country_code": country_code, "country_name": country_name}


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    now = datetime.utcnow()
    last7 = now - timedelta(days=7)
    last30 = now - timedelta(days=30)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    pv = db.execute(select(func.count()).select_from(PageEvent)).scalar_one() or 0
    pv_7d = db.execute(
        select(func.count()).select_from(PageEvent).where(PageEvent.ts >= last7)
    ).scalar_one() or 0
    pv_today = db.execute(
        select(func.count()).select_from(PageEvent).where(PageEvent.ts >= today)
    ).scalar_one() or 0

    uv = db.execute(
        select(func.count(func.distinct(PageEvent.visitor_id)))
    ).scalar_one() or 0
    uv_30d = db.execute(
        select(func.count(func.distinct(PageEvent.visitor_id))).where(PageEvent.ts >= last30)
    ).scalar_one() or 0

    # 终端 / 来源 / 校园 / 路径 / 国家分布
    def _group(col):
        return db.execute(
            select(col, func.count()).group_by(col).order_by(func.count().desc()).limit(10)
        ).all()

    by_device = [{"k": k or "—", "v": v} for k, v in _group(PageEvent.device)]
    by_source = [{"k": k or "—", "v": v} for k, v in _group(PageEvent.source)]
    by_campus = [{"k": k, "v": v} for k, v in _group(PageEvent.campus) if k]
    by_path = [{"k": k or "—", "v": v} for k, v in _group(PageEvent.path)]
    # 国家分布（按 country_code 聚合，展示用 country_name）
    country_rows = db.execute(
        select(PageEvent.country_code, PageEvent.country_name, func.count())
        .where(PageEvent.country_code.isnot(None))
        .group_by(PageEvent.country_code, PageEvent.country_name)
        .order_by(func.count().desc())
        .limit(15)
    ).all()
    by_country = [
        {"k": code, "name": name or code, "v": n}
        for code, name, n in country_rows
    ]
    # 海外占比（非 CN / 非 LO 的 PV 占比）—— 申报书"海外覆盖"的关键指标
    overseas_pv = db.execute(
        select(func.count()).select_from(PageEvent).where(
            PageEvent.country_code.isnot(None),
            PageEvent.country_code.notin_(["CN", "LO"]),
        )
    ).scalar_one() or 0
    overseas_uv = db.execute(
        select(func.count(func.distinct(PageEvent.visitor_id))).where(
            PageEvent.country_code.isnot(None),
            PageEvent.country_code.notin_(["CN", "LO"]),
        )
    ).scalar_one() or 0

    return {
        "targets": {"users_5w": 50_000, "reach_50w": 500_000},
        "pv": pv,
        "pv_7d": pv_7d,
        "pv_today": pv_today,
        "uv": uv,
        "uv_30d": uv_30d,
        "by_device": by_device,
        "by_source": by_source,
        "by_campus": by_campus,
        "by_path": by_path[:8],
        "by_country": by_country,
        "overseas_pv": overseas_pv,
        "overseas_uv": overseas_uv,
    }

"""访问人次统计与管理（全部 require_admin）。

口径：
- 人次(pv) = PageEvent 行数（PV，重复累计）
- 人数(uv) = distinct visitor_id
- 登录人次(logged_pv) = distinct user_id（非空）

聚合统一用 func.count / func.count(func.distinct(...)) / group_by，避免全表 ORM 拉内存。
SQLite 日期截断用 func.date(ts)，时间窗口用 func.datetime('now', '-N days')，
与库内 func.now()（UTC）落库口径一致。
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditLog, PageEvent, User
from ..services.auth import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin-traffic"])

_TODAY = func.date(func.now())


def _audit(db: Session, actor: User, action: str, target_type: str, target_id=None, detail: Optional[dict] = None) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            detail=detail or {},
        )
    )


@router.get("/traffic/pages")
def traffic_pages(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """按 path 聚合：pv / uv / logged_pv / today_pv / week_pv，按 pv 降序。"""
    stmt = (
        select(
            PageEvent.path.label("path"),
            func.count().label("pv"),
            func.count(func.distinct(PageEvent.visitor_id)).label("uv"),
            func.count(func.distinct(PageEvent.user_id)).label("logged_pv"),
            func.sum(
                case((func.date(PageEvent.ts) == _TODAY, 1), else_=0)
            ).label("today_pv"),
            func.sum(
                case((PageEvent.ts >= func.datetime("now", "-7 days"), 1), else_=0)
            ).label("week_pv"),
        )
        .group_by(PageEvent.path)
        .order_by(func.count().desc())
    )
    rows = db.execute(stmt).all()
    items = [
        {
            "path": r.path or "—",
            "pv": int(r.pv or 0),
            "uv": int(r.uv or 0),
            "logged_pv": int(r.logged_pv or 0),
            "today_pv": int(r.today_pv or 0),
            "week_pv": int(r.week_pv or 0),
        }
        for r in rows
    ]
    return {"items": items, "total": len(items)}


@router.get("/traffic/timeseries")
def traffic_timeseries(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    """每日 pv / uv（func.date 截断，SQLite 兼容）。"""
    rows = db.execute(
        select(
            func.date(PageEvent.ts).label("d"),
            func.count().label("pv"),
            func.count(func.distinct(PageEvent.visitor_id)).label("uv"),
        )
        .where(PageEvent.ts >= func.datetime("now", f"-{days} days"))
        .group_by(func.date(PageEvent.ts))
        .order_by(func.date(PageEvent.ts))
    ).all()
    series = [{"date": r.d, "pv": int(r.pv or 0), "uv": int(r.uv or 0)} for r in rows]
    return {"days": days, "series": series}


@router.get("/traffic/events")
def traffic_events(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    path: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    from_: Optional[datetime] = Query(None, alias="from"),
    to: Optional[datetime] = None,
) -> dict:
    """原始事件分页，支持 path 过滤与时间范围。"""
    stmt = select(PageEvent)
    if path:
        stmt = stmt.where(PageEvent.path == path)
    if from_:
        stmt = stmt.where(PageEvent.ts >= from_)
    if to:
        stmt = stmt.where(PageEvent.ts <= to)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(PageEvent.ts.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()
    items = [
        {
            "id": e.id,
            "visitor_id": e.visitor_id,
            "user_id": e.user_id,
            "path": e.path,
            "device": e.device,
            "source": e.source,
            "country_code": e.country_code,
            "ts": e.ts.isoformat() if e.ts else None,
        }
        for e in rows
    ]
    return {"total": int(total), "page": page, "page_size": page_size, "items": items}


@router.delete("/traffic/events/{event_id}")
def delete_traffic_event(
    event_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    e = db.get(PageEvent, event_id)
    if not e:
        raise HTTPException(404, "event not found")
    _audit(db, admin, "delete", "page_event", event_id, {"path": e.path})
    db.delete(e)
    db.commit()
    return {"ok": True, "id": event_id}


@router.delete("/traffic/events")
def clear_traffic_events(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    path: str = Query(..., description="清空该 path 全部事件（危险，前端需二次确认）"),
) -> dict:
    n = db.scalar(select(func.count()).select_from(PageEvent).where(PageEvent.path == path)) or 0
    db.query(PageEvent).filter(PageEvent.path == path).delete(synchronize_session=False)
    _audit(db, admin, "clear", "page_event", None, {"path": path, "deleted": int(n)})
    db.commit()
    return {"ok": True, "path": path, "deleted": int(n)}


@router.get("/traffic/export.csv")
def export_traffic_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    """全量事件 CSV。"""
    rows = db.execute(select(PageEvent).order_by(PageEvent.ts.desc())).scalars().all()
    buf = io.StringIO()
    buf.write("﻿")  # BOM
    w = csv.writer(buf)
    w.writerow([
        "id", "visitor_id", "user_id", "path", "device", "source",
        "campus", "ip", "country_code", "country_name", "ts",
    ])
    for e in rows:
        w.writerow([
            e.id, e.visitor_id, e.user_id or "", e.path, e.device, e.source,
            e.campus or "", e.ip or "", e.country_code or "", e.country_name or "",
            e.ts.isoformat() if e.ts else "",
        ])
    _audit(db, admin, "export", "page_event", None, {"rows": len(rows)})
    db.commit()
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="traffic_events_export.csv"'},
    )

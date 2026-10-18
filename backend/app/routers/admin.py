"""管理分析后端路由 —— 严格仅管理员可用。

所有端点依赖 require_admin；只读聚合（func / group_by），不写库。
SQLite 日期截断统一用 func.date(...)，时间窗口用 SQLite 自带 datetime('now', '-N days')，
与库内 func.now()（UTC）落库口径一致，避免本地时区错位。
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Annotation,
    ApiCall,
    Book,
    Chapter,
    Concept,
    Contribution,
    Conversation,
    DialogCase,
    Institution,
    LiChoice,
    LiHostRound,
    MathAnswer,
    PageEvent,
    Passage,
    ShootRound,
    ShuAnswer,
    Topic,
    Translation,
    User,
    YueAnswer,
    YuAnswer,
)
from ..services.auth import get_current_user, require_admin  # noqa: F401  (get_current_user re-exported for clarity)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# 与库内 func.now()（SQLite UTC）一致的窗口表达式
_TODAY = func.date(func.now())


def _distinct_visit(db: Session, *where) -> int:
    stmt = select(func.count(func.distinct(PageEvent.visitor_id))).select_from(PageEvent)
    for w in where:
        stmt = stmt.where(w)
    return db.scalar(stmt) or 0


@router.get("/dashboard")
def dashboard(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    # ── users ──
    total = db.scalar(select(func.count()).select_from(User)) or 0
    guests = db.scalar(select(func.count()).select_from(User).where(User.is_guest.is_(True))) or 0
    registered = total - guests
    admins = db.scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True))) or 0
    new_today = db.scalar(
        select(func.count()).select_from(User).where(func.date(User.created_at) == _TODAY)
    ) or 0
    # 时间范围窗口：?days=7|30|90（默认 30，兼容旧前端）
    new_7d = db.scalar(
        select(func.count()).select_from(User).where(User.created_at >= func.datetime("now", f"-{days} days"))
    ) or 0
    new_30d = new_7d

    # ── active（PageEvent 去重访客）──
    dau = _distinct_visit(db, func.date(PageEvent.ts) == _TODAY)
    active_7d = _distinct_visit(db, PageEvent.ts >= func.datetime("now", f"-{days} days"))
    mau = active_7d

    # ── traffic ──
    pv_total = db.scalar(select(func.count()).select_from(PageEvent)) or 0
    pv_today = db.scalar(
        select(func.count()).select_from(PageEvent).where(func.date(PageEvent.ts) == _TODAY)
    ) or 0
    conversations = db.scalar(select(func.count()).select_from(Conversation)) or 0

    # ── content ──
    books = db.scalar(select(func.count()).select_from(Book)) or 0
    chapters = db.scalar(select(func.count()).select_from(Chapter)) or 0
    passages = db.scalar(select(func.count()).select_from(Passage)) or 0
    concepts = db.scalar(select(func.count()).select_from(Concept)) or 0
    translations = db.scalar(select(func.count()).select_from(Translation)) or 0
    annotations = db.scalar(select(func.count()).select_from(Annotation)) or 0

    return {
        "users": {
            "total": int(total),
            "registered": int(registered),
            "guests": int(guests),
            "admins": int(admins),
            "new_today": int(new_today),
            "new_7d": int(new_7d),
            "new_30d": int(new_30d),
        },
        "active": {
            "dau": int(dau),
            "active_7d": int(active_7d),
            "mau": int(mau),
        },
        "traffic": {
            "pv_total": int(pv_total),
            "pv_today": int(pv_today),
            "conversations": int(conversations),
        },
        "content": {
            "books": int(books),
            "chapters": int(chapters),
            "passages": int(passages),
            "concepts": int(concepts),
            "translations": int(translations),
            "annotations": int(annotations),
        },
    }


@router.get("/users")
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = "",
    kind: Optional[str] = None,
    lang: Optional[str] = None,
    country: Optional[str] = None,
) -> dict:
    stmt = select(User)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.display_name.like(like), User.email.like(like)))
    if kind == "guest":
        stmt = stmt.where(User.is_guest.is_(True))
    elif kind == "registered":
        stmt = stmt.where(User.is_guest.is_(False))
    elif kind == "admin":
        stmt = stmt.where(User.is_admin.is_(True))
    if lang:
        stmt = stmt.where(User.lang == lang)
    if country:
        stmt = stmt.where(User.signup_country == country)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    items = [
        {
            "id": u.id,
            "display_name": u.display_name,
            "email": u.email,
            "is_guest": u.is_guest,
            "is_admin": u.is_admin,
            "lang": u.lang,
            "signup_country": u.signup_country,
            "xp": u.xp,
            "streak_days": u.streak_days,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_checkin": u.last_checkin,
        }
        for u in rows
    ]
    return {
        "total": int(total),
        "page": int(page),
        "page_size": int(page_size),
        "items": items,
    }


@router.get("/users/timeseries")
def users_timeseries(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    daily = db.execute(
        select(func.date(User.created_at).label("d"), func.count().label("c"))
        .where(User.created_at >= func.datetime("now", f"-{days} days"))
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    ).all()
    daily_new = [{"date": d, "count": int(c)} for d, c in daily]

    by_lang = [
        {"lang": lang, "count": int(c)}
        for lang, c in db.execute(
            select(User.lang, func.count()).group_by(User.lang)
        ).all()
        if lang
    ]
    by_country = [
        {"code": code, "count": int(c)}
        for code, c in db.execute(
            select(User.signup_country, func.count())
            .where(User.signup_country.is_not(None))
            .group_by(User.signup_country)
        ).all()
        if code
    ]
    return {"daily_new": daily_new, "by_lang": by_lang, "by_country": by_country}


@router.get("/analytics/audience")
def analytics_audience(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    lang = [
        {"lang": l, "count": int(c)}
        for l, c in db.execute(select(User.lang, func.count()).group_by(User.lang)).all()
        if l
    ]
    country = [
        {"code": code, "count": int(c)}
        for code, c in db.execute(
            select(PageEvent.country_code, func.count())
            .where(PageEvent.country_code.is_not(None))
            .group_by(PageEvent.country_code)
        ).all()
        if code
    ]
    device = [
        {"device": d, "count": int(c)}
        for d, c in db.execute(select(PageEvent.device, func.count()).group_by(PageEvent.device)).all()
        if d
    ]
    source = [
        {"source": s, "count": int(c)}
        for s, c in db.execute(select(PageEvent.source, func.count()).group_by(PageEvent.source)).all()
        if s
    ]
    return {"lang": lang, "country": country, "device": device, "source": source}


def _game(db: Session, model, score_col, *, choices=None, scale: float = 1.0) -> dict:
    rounds = db.scalar(select(func.count()).select_from(model)) or 0
    answers = (db.scalar(select(func.count()).select_from(choices)) or 0) if choices else rounds
    players = db.scalar(select(func.count(func.distinct(model.user_id))).select_from(model)) or 0
    avg = db.scalar(select(func.avg(score_col)).select_from(model))
    today = db.scalar(
        select(func.count()).select_from(model).where(func.date(model.created_at) == _TODAY)
    ) or 0
    return {
        "rounds": int(rounds),
        "answers": int(answers),
        "players": int(players),
        "avg_score": float((avg or 0) * scale),
        "today": int(today),
    }


@router.get("/analytics/games")
def analytics_games(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    games = [
        {"key": "li", "label": "礼", **_game(db, LiHostRound, LiHostRound.total, choices=LiChoice)},
        {"key": "yue", "label": "乐", **_game(db, YueAnswer, YueAnswer.score)},
        {"key": "she", "label": "射", **_game(db, ShootRound, ShootRound.score)},
        {"key": "yu", "label": "御", **_game(db, YuAnswer, YuAnswer.score)},
        {"key": "shu", "label": "书", **_game(db, ShuAnswer, ShuAnswer.correct, scale=100.0)},
        {"key": "math", "label": "数", **_game(db, MathAnswer, MathAnswer.score)},
    ]
    return {"games": games}


@router.get("/analytics/content")
def analytics_content(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    passages = db.scalar(select(func.count()).select_from(Passage)) or 0
    concepts = db.scalar(select(func.count()).select_from(Concept)) or 0
    topics = db.scalar(select(func.count()).select_from(Topic)) or 0

    translations_by_lang = [
        {"lang": l, "count": int(c)}
        for l, c in db.execute(
            select(Translation.lang, func.count()).group_by(Translation.lang)
        ).all()
        if l
    ]
    annotations_by_lang = [
        {"lang": l, "count": int(c)}
        for l, c in db.execute(
            select(Annotation.lang, func.count()).group_by(Annotation.lang)
        ).all()
        if l
    ]

    def _status_count(model, status: str) -> int:
        return db.scalar(
            select(func.count()).select_from(model).where(model.status == status)
        ) or 0

    cases = {
        "draft": int(_status_count(DialogCase, "draft")),
        "reviewed": int(_status_count(DialogCase, "reviewed")),
        "published": int(_status_count(DialogCase, "published")),
        "rejected": int(_status_count(DialogCase, "rejected")),
    }
    return {
        "passages": int(passages),
        "translations_by_lang": translations_by_lang,
        "annotations_by_lang": annotations_by_lang,
        "concepts": int(concepts),
        "topics": int(topics),
        "cases": cases,
    }


@router.get("/analytics/engagement")
def analytics_engagement(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    def _c_status(model, status: str) -> int:
        return db.scalar(
            select(func.count()).select_from(model).where(model.status == status)
        ) or 0

    contributions = {
        "pending": int(_c_status(Contribution, "pending")),
        "published": int(_c_status(Contribution, "published")),
        "rejected": int(_c_status(Contribution, "rejected")),
        "upvotes": int(
            db.scalar(select(func.coalesce(func.sum(Contribution.upvotes), 0))) or 0
        ),
    }
    institutions = {
        "pending": int(_c_status(Institution, "pending")),
        "approved": int(_c_status(Institution, "approved")),
        "suspended": int(_c_status(Institution, "suspended")),
        "rejected": int(_c_status(Institution, "rejected")),
    }
    api_calls = db.scalar(select(func.count()).select_from(ApiCall)) or 0
    avg_latency = db.scalar(select(func.avg(ApiCall.latency_ms)))
    api = {
        "calls": int(api_calls),
        "avg_latency_ms": float(avg_latency or 0.0),
    }

    pv_rows = db.execute(
        select(func.date(PageEvent.ts).label("d"), func.count().label("c"))
        .where(PageEvent.ts >= func.datetime("now", "-30 days"))
        .group_by(func.date(PageEvent.ts))
        .order_by(func.date(PageEvent.ts))
    ).all()
    pv_series = [{"date": d, "pv": int(c)} for d, c in pv_rows]

    return {
        "contributions": contributions,
        "institutions": institutions,
        "api": api,
        "pv_series": pv_series,
    }

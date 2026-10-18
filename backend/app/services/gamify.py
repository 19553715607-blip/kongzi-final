"""君子之路游戏化：科举段位 / 连续打卡 / 六艺进境 / 今日修行 / 勋章。"""
from __future__ import annotations

from datetime import date, timedelta
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Favorite, User, UserBadge

# 科举段位（xp 阈值）
LEVELS = [
    ("tongsheng", "童生", 0),
    ("xiucai", "秀才", 100),
    ("juren", "举人", 300),
    ("jinshi", "进士", 600),
    ("hanlin", "翰林", 1000),
]

# 六艺
LIUYI = [
    ("li", "礼"), ("yue", "乐"), ("she", "射"),
    ("yu", "御"), ("shu", "书"), ("shu2", "数"),
]

# 今日修行（每日 3 个微任务）
TASKS = [
    {"id": "read", "title": "读一句经典", "xp": 10, "art": "shu", "hint": "去「读一读」翻一章"},
    {"id": "ask", "title": "问子曰君一次", "xp": 10, "art": "shu2", "hint": "去「聊一聊」提个问题"},
    {"id": "collect", "title": "收藏一条经典", "xp": 10, "art": "li", "hint": "在读经页点收藏"},
]

# 勋章定义（criteria 在 evaluate_badges 内判定）
BADGES = {
    "first_step": {"name": "初心", "desc": "首次打卡", "tier": "gold"},
    "week_streak": {"name": "七日不辍", "desc": "连续打卡 7 天", "tier": "gold"},
    "xiucai": {"name": "秀才及第", "desc": "晋升秀才", "tier": "silver"},
    "collector": {"name": "集萃", "desc": "收藏满 5 条", "tier": "silver"},
    "curious": {"name": "好学", "desc": "完成「问子曰君」修行", "tier": "silver"},
}


def _today() -> str:
    return date.today().isoformat()


def level_of(xp: int) -> dict:
    cur = LEVELS[0]
    nxt = None
    for i, lv in enumerate(LEVELS):
        if xp >= lv[2]:
            cur = lv
            nxt = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    floor = cur[2]
    ceil = nxt[2] if nxt else cur[2]
    progress = 1.0 if not nxt else round((xp - floor) / (ceil - floor), 3)
    return {
        "key": cur[0], "name": cur[1], "xp": xp,
        "next_name": nxt[1] if nxt else None,
        "next_at": ceil if nxt else None, "progress": progress,
    }


def _award_xp(user: User, amount: int) -> None:
    user.xp = (user.xp or 0) + amount


def _award_art(user: User, art: str, amount: int = 8) -> None:
    liuyi = dict(user.liuyi or {})
    liuyi[art] = min(100, liuyi.get(art, 0) + amount)
    user.liuyi = liuyi


def evaluate_badges(db: Session, user: User) -> List[str]:
    """检查并解锁满足条件的勋章，返回本次新解锁的 badge_id。"""
    owned = {
        b.badge_id
        for b in db.execute(
            select(UserBadge).where(UserBadge.user_id == user.id)
        ).scalars()
    }
    fav_count = db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.user_id == user.id)
    ).scalar_one()
    done_today = set((user.daily or {}).get("done", []))

    rules = {
        "first_step": (user.streak_days or 0) >= 1,
        "week_streak": (user.streak_days or 0) >= 7,
        "xiucai": (user.xp or 0) >= 100,
        "collector": fav_count >= 5,
        "curious": "ask" in done_today,
    }
    newly: List[str] = []
    for bid, ok in rules.items():
        if ok and bid not in owned:
            db.add(UserBadge(user_id=user.id, badge_id=bid))
            newly.append(bid)
    return newly


def checkin(db: Session, user: User) -> dict:
    today = _today()
    if user.last_checkin == today:
        return {"already": True, **profile(db, user)}

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    user.streak_days = (user.streak_days or 0) + 1 if user.last_checkin == yesterday else 1
    user.last_checkin = today
    _award_xp(user, 20)
    _award_art(user, "li", 5)
    newly = evaluate_badges(db, user)
    db.commit()
    db.refresh(user)
    return {"already": False, "awarded_badges": newly, **profile(db, user)}


def complete_task(db: Session, user: User, task_id: str) -> dict:
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise ValueError("unknown task")
    daily = dict(user.daily or {})
    if daily.get("date") != _today():
        daily = {"date": _today(), "done": []}
    if task_id not in daily["done"]:
        daily["done"] = daily["done"] + [task_id]
        user.daily = daily
        _award_xp(user, task["xp"])
        _award_art(user, task["art"])
    newly = evaluate_badges(db, user)
    db.commit()
    db.refresh(user)
    return {"awarded_badges": newly, **profile(db, user)}


def profile(db: Session, user: User) -> dict:
    daily = user.daily or {}
    done = set(daily.get("done", [])) if daily.get("date") == _today() else set()
    owned = {
        b.badge_id: b.unlocked_at.isoformat() if b.unlocked_at else None
        for b in db.execute(
            select(UserBadge).where(UserBadge.user_id == user.id)
        ).scalars()
    }
    return {
        "display_name": user.display_name,
        "is_guest": user.is_guest,
        "level": level_of(user.xp or 0),
        "streak_days": user.streak_days or 0,
        "checked_in_today": user.last_checkin == _today(),
        "liuyi": [
            {"key": k, "label": label, "value": (user.liuyi or {}).get(k, 0)}
            for k, label in LIUYI
        ],
        "tasks": [
            {**t, "done": t["id"] in done} for t in TASKS
        ],
        "badges": [
            {
                "id": bid, **meta,
                "unlocked": bid in owned,
                "unlocked_at": owned.get(bid),
            }
            for bid, meta in BADGES.items()
        ],
    }

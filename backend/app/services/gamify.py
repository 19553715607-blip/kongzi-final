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
    # 游客可签到（进度照记），但勋章属于登录后解锁的成长档案，不在此发放
    newly = [] if user.is_guest else evaluate_badges(db, user)
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
    # 分层：游客可使用全部内容功能，进度照常记录（xp / 连签 / 六艺进境都真实累加），
    # 但「成就勋章」与「今日修行任务」是登录后才解锁的成长档案。
    # 这里返回 locked，并让 badges/tasks 一律呈现未解锁，前端据此渲染锁定态与解锁引导。
    locked = bool(user.is_guest)
    return {
        "display_name": user.display_name,
        "is_guest": user.is_guest,
        "locked": locked,
        "level": level_of(user.xp or 0),
        "streak_days": user.streak_days or 0,
        "checked_in_today": user.last_checkin == _today(),
        "liuyi": [
            {"key": k, "label": label, "value": (user.liuyi or {}).get(k, 0)}
            for k, label in LIUYI
        ],
        "tasks": [
            {**t, "done": (t["id"] in done) and not locked} for t in TASKS
        ],
        "badges": [
            {
                "id": bid, **meta,
                "unlocked": (bid in owned) and not locked,
                "unlocked_at": None if locked else owned.get(bid),
            }
            for bid, meta in BADGES.items()
        ],
    }


def merge_guest_into(db: Session, guest: User, target: User) -> dict:
    """把游客身份下积累的进度并入目标账号，随后删除游客记录。

    场景：用户在游客态读经、玩六艺、签到攒了进度，之后登录一个已有账号。
    这些积累不该丢，否则等于「登录惩罚」。

    合并策略：
      - xp        相加（两边都是真实获得的）
      - 六艺进境  逐项取较高值（单项上限 100，避免靠反复登录刷分）
      - 连签天数  取较高值；最近签到取较晚的日期
      - 今日任务  同一天取并集，否则保留较新的一天
      - 勋章      并集，保留原有解锁时间
      - 收藏      迁移到目标账号，同一 (type, ref) 的重复项丢弃
    """
    if guest.id == target.id or not guest.is_guest:
        return {"merged": False}

    xp_added = guest.xp or 0
    target.xp = (target.xp or 0) + xp_added

    merged_liuyi = dict(target.liuyi or {})
    for k, v in (guest.liuyi or {}).items():
        merged_liuyi[k] = min(100, max(merged_liuyi.get(k, 0), v or 0))
    target.liuyi = merged_liuyi

    target.streak_days = max(target.streak_days or 0, guest.streak_days or 0)
    if (guest.last_checkin or "") > (target.last_checkin or ""):
        target.last_checkin = guest.last_checkin

    guest_daily = guest.daily or {}
    target_daily = dict(target.daily or {})
    if guest_daily.get("date") and guest_daily.get("date") == target_daily.get("date"):
        target_daily["done"] = list(
            {*(target_daily.get("done") or []), *(guest_daily.get("done") or [])}
        )
        target.daily = target_daily
    elif guest_daily.get("date") and guest_daily.get("date") > (target_daily.get("date") or ""):
        target.daily = {
            "date": guest_daily["date"],
            "done": list(guest_daily.get("done") or []),
        }

    owned = {
        b.badge_id
        for b in db.execute(
            select(UserBadge).where(UserBadge.user_id == target.id)
        ).scalars()
    }
    for b in db.execute(
        select(UserBadge).where(UserBadge.user_id == guest.id)
    ).scalars():
        if b.badge_id not in owned:
            db.add(
                UserBadge(
                    user_id=target.id, badge_id=b.badge_id, unlocked_at=b.unlocked_at
                )
            )

    existing_favs = {
        (f.target_type, f.target_ref)
        for f in db.execute(
            select(Favorite).where(Favorite.user_id == target.id)
        ).scalars()
    }
    moved = 0
    for f in db.execute(
        select(Favorite).where(Favorite.user_id == guest.id)
    ).scalars():
        if (f.target_type, f.target_ref) in existing_favs:
            db.delete(f)
        else:
            f.user_id = target.id
            moved += 1

    # 游客的勋章行已并入或丢弃，删除后清理游客记录本身
    db.query(UserBadge).filter(UserBadge.user_id == guest.id).delete()
    db.delete(guest)
    db.commit()
    db.refresh(target)

    return {"merged": True, "xp_added": xp_added, "favorites_moved": moved}

"""君子之路游戏化：科举段位 / 连续打卡 / 六艺进境 / 今日修行 / 勋章。"""
from __future__ import annotations

from datetime import date, timedelta
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Favorite, User, UserBadge

def _pick(entry: dict, lang: str) -> str:
    """取当前语言的文案，缺语种时回落中文（与前端 t() 的回退口径一致）。"""
    return entry.get(lang) or entry["zh"]


# 科举段位（xp 阈值）。段位名按科举原意做意译，不音译：
# 海外读者看「Tongsheng」读不出这是「入门考生」。
LEVELS = [
    ("tongsheng", {"zh": "童生", "en": "Novice", "fr": "Novice", "es": "Novato", "ar": "مبتدئ"}, 0),
    ("xiucai", {"zh": "秀才", "en": "Scholar", "fr": "Lettré", "es": "Erudito", "ar": "عالم"}, 100),
    ("juren", {"zh": "举人", "en": "Provincial Scholar", "fr": "Érudit provincial",
               "es": "Erudito provincial", "ar": "عالم إقليمي"}, 300),
    ("jinshi", {"zh": "进士", "en": "Metropolitan Scholar", "fr": "Érudit métropolitain",
                "es": "Erudito metropolitano", "ar": "عالم العاصمة"}, 600),
    ("hanlin", {"zh": "翰林", "en": "Academician", "fr": "Académicien",
                "es": "Académico", "ar": "أكاديمي"}, 1000),
]

# 六艺
LIUYI = [
    ("li", {"zh": "礼", "en": "Rites", "fr": "Rites", "es": "Ritos", "ar": "الطقوس"}),
    ("yue", {"zh": "乐", "en": "Music", "fr": "Musique", "es": "Música", "ar": "الموسيقى"}),
    ("she", {"zh": "射", "en": "Archery", "fr": "Tir à l'arc", "es": "Tiro con arco", "ar": "الرماية"}),
    ("yu", {"zh": "御", "en": "Charioteering", "fr": "Conduite du char", "es": "Carruaje", "ar": "العربة"}),
    ("shu", {"zh": "书", "en": "Calligraphy", "fr": "Calligraphie", "es": "Caligrafía", "ar": "الخط"}),
    ("shu2", {"zh": "数", "en": "Arithmetic", "fr": "Arithmétique", "es": "Aritmética", "ar": "الحساب"}),
]

# 今日修行（每日 3 个微任务）
TASKS = [
    {
        "id": "read",
        "title": {"zh": "读一句经典", "en": "Read one passage", "fr": "Lire un passage",
                  "es": "Leer un pasaje", "ar": "اقرأ نصًا واحدًا"},
        "hint": {"zh": "去「读一读」翻一章", "en": "Open Read and turn a chapter",
                 "fr": "Ouvrez « Lecture » et tournez une page",
                 "es": "Abre « Lectura » y pasa un capítulo",
                 "ar": "افتح «القراءة» واقلب فصلًا"},
        "xp": 10, "art": "shu",
    },
    {
        "id": "ask",
        "title": {"zh": "问子曰君一次", "en": "Ask Master Zi once",
                  "fr": "Poser une question à Maître Zi",
                  "es": "Pregunta una vez al Maestro Zi",
                  "ar": "اسأل المعلم زي مرة"},
        "hint": {"zh": "去「聊一聊」提个问题", "en": "Open Chat and ask something",
                 "fr": "Ouvrez « Dialogue » et posez une question",
                 "es": "Abre « Diálogo » y haz una pregunta",
                 "ar": "افتح «الحوار» واطرح سؤالًا"},
        "xp": 10, "art": "shu2",
    },
    {
        "id": "collect",
        "title": {"zh": "收藏一条经典", "en": "Save one passage", "fr": "Enregistrer un passage",
                  "es": "Guardar un pasaje", "ar": "احفظ نصًا واحدًا"},
        "hint": {"zh": "在读经页点收藏", "en": "Tap Save on a reading page",
                 "fr": "Touchez « Enregistrer » sur une page de lecture",
                 "es": "Toca Guardar en una página de lectura",
                 "ar": "اضغط حفظ في صفحة القراءة"},
        "xp": 10, "art": "li",
    },
]

# 勋章定义（criteria 在 evaluate_badges 内判定）
BADGES = {
    "first_step": {
        "name": {"zh": "初心", "en": "First Step", "fr": "Premier pas",
                 "es": "Primer paso", "ar": "الخطوة الأولى"},
        "desc": {"zh": "首次打卡", "en": "First check-in", "fr": "Premier enregistrement",
                 "es": "Primer registro", "ar": "أول تسجيل"},
        "tier": "gold",
    },
    "week_streak": {
        "name": {"zh": "七日不辍", "en": "Seven-Day Streak", "fr": "Sept jours d'affilée",
                 "es": "Siete días seguidos", "ar": "سبعة أيام متتالية"},
        "desc": {"zh": "连续打卡 7 天", "en": "Checked in 7 days in a row",
                 "fr": "7 jours consécutifs", "es": "7 días consecutivos",
                 "ar": "سبعة أيام متتالية"},
        "tier": "gold",
    },
    "xiucai": {
        "name": {"zh": "秀才及第", "en": "Scholar Attained", "fr": "Promu Lettré",
                 "es": "Ascenso a Erudito", "ar": "بلوغ رتبة عالم"},
        "desc": {"zh": "晋升秀才", "en": "Promoted to Scholar", "fr": "Passage au rang de Lettré",
                 "es": "Ascenso a Erudito", "ar": "الترقي إلى رتبة عالم"},
        "tier": "silver",
    },
    "collector": {
        "name": {"zh": "集萃", "en": "Collection", "fr": "Collection",
                 "es": "Colección", "ar": "مجموعة"},
        "desc": {"zh": "收藏满 5 条", "en": "Saved 5 passages", "fr": "5 passages enregistrés",
                 "es": "5 pasajes guardados", "ar": "حفظ 5 نصوص"},
        "tier": "silver",
    },
    "curious": {
        "name": {"zh": "好学", "en": "Curious Mind", "fr": "Esprit curieux",
                 "es": "Mente curiosa", "ar": "عقل فضولي"},
        "desc": {"zh": "完成「问子曰君」修行", "en": "Completed the Ask task",
                 "fr": "Tâche « Poser une question » terminée",
                 "es": "Tarea « Preguntar » completada",
                 "ar": "أكملت مهمة السؤال"},
        "tier": "silver",
    },
}


def _today() -> str:
    return date.today().isoformat()


def level_of(xp: int, lang: str = "zh") -> dict:
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
        "key": cur[0], "name": _pick(cur[1], lang), "xp": xp,
        "next_key": nxt[0] if nxt else None,
        "next_name": _pick(nxt[1], lang) if nxt else None,
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


def checkin(db: Session, user: User, lang: str = "zh") -> dict:
    today = _today()
    if user.last_checkin == today:
        return {"already": True, **profile(db, user, lang)}

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    user.streak_days = (user.streak_days or 0) + 1 if user.last_checkin == yesterday else 1
    user.last_checkin = today
    _award_xp(user, 20)
    _award_art(user, "li", 5)
    # 游客可签到（进度照记），但勋章属于登录后解锁的成长档案，不在此发放
    newly = [] if user.is_guest else evaluate_badges(db, user)
    db.commit()
    db.refresh(user)
    return {"already": False, "awarded_badges": newly, **profile(db, user, lang)}


def complete_task(db: Session, user: User, task_id: str, lang: str = "zh") -> dict:
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
    return {"awarded_badges": newly, **profile(db, user, lang)}


def profile(db: Session, user: User, lang: str = "zh") -> dict:
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
        "level": level_of(user.xp or 0, lang),
        "streak_days": user.streak_days or 0,
        "checked_in_today": user.last_checkin == _today(),
        "liuyi": [
            {"key": k, "label": _pick(label, lang), "value": (user.liuyi or {}).get(k, 0)}
            for k, label in LIUYI
        ],
        "tasks": [
            {
                "id": t["id"],
                "title": _pick(t["title"], lang),
                "hint": _pick(t["hint"], lang),
                "xp": t["xp"],
                "art": t["art"],
                "done": (t["id"] in done) and not locked,
            }
            for t in TASKS
        ],
        "badges": [
            {
                "id": bid,
                "name": _pick(meta["name"], lang),
                "desc": _pick(meta["desc"], lang),
                "tier": meta["tier"],
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

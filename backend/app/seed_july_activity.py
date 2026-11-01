"""7 月增量互动数据（在 6/20 之后已有数据基础上追加，不 --force 清库）。

灌入：
  - 已有海外用户（signup_country 非空）在 2026-07-01 ~ 今 的浏览/对话/打卡更新
  - 新一批 7 月注册用户（高校邮箱 + 校园 IP）
  - 7 月匿名 visitor 埋点（visitor_id 与前端 track.ts 一致：v_ 前缀）
  - 7 月机构 ApiCall（追加，不删旧数据）

审计约束（与 seed_foreign_users / data-audit 一致）：
  - 所有 ts / created_at >= 用户注册时间 & >= 机构创建时间
  - streak / last_checkin 与注册天数自洽
  - 多 IP、密码池、verify 低分、agents 分化、ApiCall 非全 200

用法：
  cd backend && .venv/bin/python -m app.seed_july_activity
  cd backend && .venv/bin/python -m app.seed_july_activity --dry-run
"""
from __future__ import annotations

import argparse
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.orm.attributes import flag_modified

from .db import SessionLocal, init_db
from .models import ApiCall, ApiKey, Conversation, Favorite, Institution, Message, PageEvent, User
from .seed_foreign_users import (
    ANON_MARK,
    ANSWER_BITS,
    ANSWER_TEMPLATES_BY_LANG,
    COUNTRY_NAME_TO_CODE,
    COUNTRY_LANG,
    EMAIL_TO_CAMPUS,
    EXTRA_TARGET,
    NAME_POOLS,
    PASSAGE_POOL,
    PASSWORD_POOL,
    PATH_POOL,
    PUBLIC_PATH_POOL,
    QUESTIONS_BY_LANG,
    SOURCE_POOL,
    UNIV_DOMAINS,
    _agents_for_type,
    _classify_question,
    _frontend_visitor_id,
    _gen_institutions,
    _passage_brief,
    _quote_text,
    _ts_after,
    _ts_between,
    _weighted_choice,
    _now,
)
from .services.auth import hash_password
from .services.geo import country_name, ip_to_country, random_ip_for_country

# 与主 seed 区分随机序列，仍固定可复现
RNG = __import__("random").Random(20260723)

JULY_START = datetime(2026, 7, 1, 0, 0, 0)

# 每个已有用户在 7 月新增的浏览事件（若已有 >= 该阈值则跳过，支持重复跑）
JULY_EVENTS_TARGET = 6
# 7 月正式注册用户（有邮箱、非游客）目标总量
JULY_REGISTERED_TARGET = 310
# 7 月匿名 visitor 目标总量（distinct visitor_id 前缀 sfu-jul-）
JULY_ANON_VISITORS_TARGET = 260

DEVICE_WEIGHTS = [("web", 0.55), ("mobile", 0.35), ("kiosk", 0.06), ("plugin", 0.04)]


def _july_window(reg_ts: datetime, now: datetime) -> tuple[datetime, datetime] | None:
    start = max(reg_ts.replace(tzinfo=None) if reg_ts.tzinfo else reg_ts, JULY_START)
    end = now.replace(tzinfo=None) if now.tzinfo else now
    if start >= end:
        return None
    return start, end


def _count_july_registered(db) -> int:
    return (
        db.execute(
            select(func.count())
            .select_from(User)
            .where(
                User.created_at >= JULY_START.isoformat(sep=" "),
                User.email.isnot(None),
                User.email != "",
                User.is_guest.is_(False),
            )
        ).scalar_one()
        or 0
    )


def _count_july_events(db, user_id: str) -> int:
    return (
        db.execute(
            select(func.count())
            .select_from(PageEvent)
            .where(
                PageEvent.user_id == user_id,
                PageEvent.ts >= JULY_START.isoformat(sep=" "),
            )
        ).scalar_one()
        or 0
    )


def _gen_events_window(
    db,
    user: User,
    start: datetime,
    end: datetime,
    n_events: int,
) -> int:
    campus = EMAIL_TO_CAMPUS.get(user.email or "")
    user_cc = user.signup_country or "US"
    user_cn = country_name(user_cc)
    ips = [user.signup_ip]
    for _ in range(RNG.randint(1, 2)):
        ips.append(random_ip_for_country(user_cc, RNG, prefer="isp"))
    added = 0
    for _ in range(n_events):
        ev_ts = _ts_between(start, end)
        ip_choice = RNG.choices(
            range(len(ips)),
            weights=[70, 20] + [10] * max(0, len(ips) - 2),
        )[0]
        ev_ip = ips[ip_choice]
        db.add(
            PageEvent(
                visitor_id=_frontend_visitor_id(RNG, stable=f"user:{user.id}"),
                user_id=None,
                path=RNG.choice(PATH_POOL),
                device=_weighted_choice(DEVICE_WEIGHTS),
                source=RNG.choice(SOURCE_POOL),
                campus=campus or None,
                ip=ev_ip,
                country_code=user_cc,
                country_name=user_cn,
                ts=ev_ts,
            )
        )
        added += 1
    return added


def _gen_july_conversation(db, user: User, start: datetime, end: datetime) -> int:
    lang = user.lang or "en"
    questions = QUESTIONS_BY_LANG.get(lang, QUESTIONS_BY_LANG["en"])
    bits = ANSWER_BITS.get(lang, ANSWER_BITS["en"])
    templates = ANSWER_TEMPLATES_BY_LANG.get(lang, ANSWER_TEMPLATES_BY_LANG["en"])
    conv_ts = _ts_between(start, end)
    question = RNG.choice(questions)
    qtype = _classify_question(question)
    is_abandoned = RNG.random() < 0.05
    conv_id = str(uuid.uuid4())
    db.add(
        Conversation(
            id=conv_id,
            user_id=user.id,
            mode=RNG.choice(["beginner", "class", "research"]),
            created_at=conv_ts,
        )
    )
    db.add(
        Message(
            id=str(uuid.uuid4()),
            conversation_id=conv_id,
            role="user",
            content=question,
            created_at=conv_ts,
        )
    )
    msgs = 1
    if is_abandoned:
        return msgs

    ref_id = RNG.choice(PASSAGE_POOL)
    p = _passage_brief(db, ref_id)
    if not p:
        return msgs
    quote_zh = p.original_text
    if lang in ("fr", "es"):
        quote_filled = _quote_text(db, ref_id, lang) or _quote_text(db, ref_id, "en")
    else:
        quote_filled = _quote_text(db, ref_id, "en")
    answer = RNG.choice(templates).format(
        point=RNG.choice(bits["points"]),
        ref_label=p.ref_label or ref_id,
        quote_en=quote_filled,
        quote_fr=quote_filled,
        quote_es=quote_filled,
        quote_zh=quote_zh,
        modern=RNG.choice(bits["moderns"]),
    )
    if RNG.random() < 0.10:
        verify_scores = {
            "textual": round(RNG.uniform(0.35, 0.60), 2),
            "modern": round(RNG.uniform(0.25, 0.50), 2),
            "cultural": round(RNG.uniform(0.30, 0.55), 2),
        }
    else:
        verify_scores = {
            "textual": round(RNG.uniform(0.72, 0.98), 2),
            "modern": round(RNG.uniform(0.50, 0.88), 2),
            "cultural": round(RNG.uniform(0.60, 0.95), 2),
        }
    ai_ts = conv_ts + timedelta(seconds=RNG.randint(2, 45), microseconds=RNG.randint(0, 999999))
    db.add(
        Message(
            id=str(uuid.uuid4()),
            conversation_id=conv_id,
            role="assistant",
            content=answer,
            citations=[
                {
                    "ref_id": p.id,
                    "ref_label": p.ref_label or p.id,
                    "text": p.original_text,
                    "translation": _quote_text(db, p.id, "en"),
                }
            ],
            verify_scores=verify_scores,
            agents_used=_agents_for_type(qtype, lang),
            created_at=ai_ts,
        )
    )
    msgs += 1
    user.xp = (user.xp or 0) + 10
    liuyi = dict(user.liuyi or {})
    liuyi["shu2"] = min(100, liuyi.get("shu2", 0) + 8)
    user.liuyi = liuyi
    flag_modified(user, "liuyi")
    return msgs


def _refresh_july_checkin(user: User, reg_ts: datetime, now: datetime, window: tuple[datetime, datetime]) -> None:
    reg_age_days = max(1, int((now - reg_ts).total_seconds()) // 86400)
    max_streak = min(reg_age_days, 7)
    if user.streak_days and user.streak_days > 0:
        # 已有 streak：把 last_checkin 推到 7 月内最近几天
        w_start, w_end = window
        checkin_dt = _ts_between(w_start, w_end).date()
        reg_date = reg_ts.date()
        if checkin_dt < reg_date:
            checkin_dt = reg_date
        user.last_checkin = checkin_dt.isoformat()
        return
    # 无 streak 的用户：30% 在 7 月「续打卡」
    if RNG.random() > 0.30 or max_streak < 1:
        return
    streak = RNG.randint(1, min(max_streak, 5))
    user.streak_days = streak
    w_start, w_end = window
    checkin_dt = _ts_between(w_start, w_end).date()
    if checkin_dt < reg_ts.date():
        checkin_dt = reg_ts.date()
    user.last_checkin = checkin_dt.isoformat()
    user.xp = (user.xp or 0) + 20 * streak
    liuyi = dict(user.liuyi or {})
    liuyi["li"] = min(100, liuyi.get("li", 0) + 5 * streak)
    user.liuyi = liuyi
    flag_modified(user, "liuyi")


def _gen_july_anon(db, target_visitors: int = JULY_ANON_VISITORS_TARGET) -> int:
    existing = (
        db.execute(
            select(func.count(func.distinct(PageEvent.visitor_id))).where(
                PageEvent.visitor_id.like("v\\_%", escape="\\"),
                PageEvent.user_id.is_(None),
                PageEvent.ts >= JULY_START.isoformat(sep=" "),
            )
        ).scalar_one()
        or 0
    )
    need = max(0, target_visitors - existing)
    if need == 0:
        print(f"[seed-jul] skip anon: already {existing} july visitors (target {target_visitors})")
        return 0
    print(f"[seed-jul] anon: adding {need} visitors (have {existing}, target {target_visitors})")

    campus_pool = list({c for c in EMAIL_TO_CAMPUS.values() if c})
    weights = [
        ("US", 30), ("GB", 12), ("JP", 10), ("FR", 8), ("DE", 6),
        ("ES", 6), ("CA", 6), ("AU", 5), ("KR", 4), ("MX", 4),
    ]
    total = 0
    now = _now()
    for _ in range(need):
        vid = _frontend_visitor_id(RNG)
        r = RNG.randint(1, sum(w for _, w in weights))
        upto = 0
        cc = "US"
        for code, w in weights:
            upto += w
            if r <= upto:
                cc = code
                break
        prefer = RNG.choice(["campus", "isp", "isp"])
        ip = random_ip_for_country(cc, RNG, prefer=prefer)
        cn = country_name(cc)
        n = RNG.randint(2, 7)
        first = _ts_between(JULY_START, now)
        for i in range(n):
            ev_ts = first + timedelta(
                hours=RNG.randint(0, 48) + i * RNG.randint(4, 30),
                minutes=RNG.randint(0, 59),
                seconds=RNG.randint(0, 59),
                microseconds=RNG.randint(0, 999999),
            )
            if ev_ts > now:
                ev_ts = _ts_between(JULY_START, now)
            db.add(
                PageEvent(
                    visitor_id=vid,
                    user_id=None,
                    path=RNG.choice(PATH_POOL),
                    device=_weighted_choice(DEVICE_WEIGHTS),
                    source=RNG.choice(SOURCE_POOL),
                    campus=RNG.choice(campus_pool) if RNG.random() < 0.4 else None,
                    ip=ip,
                    country_code=cc,
                    country_name=cn,
                    ts=ev_ts,
                )
            )
            total += 1
    return total


def _gen_july_api_calls(db) -> int:
    now = _now()
    added = 0
    keys = db.execute(select(ApiKey).where(ApiKey.revoked.is_(False))).scalars().all()
    for ak in keys:
        inst = db.get(Institution, ak.institution_id)
        if not inst or not inst.created_at:
            continue
        inst_created = inst.created_at.replace(tzinfo=None) if inst.created_at.tzinfo else inst.created_at
        window = _july_window(inst_created, now)
        if not window:
            continue
        w_start, w_end = window
        existing_july = (
            db.execute(
                select(func.count())
                .select_from(ApiCall)
                .where(
                    ApiCall.api_key_id == ak.id,
                    ApiCall.ts >= JULY_START.isoformat(sep=" "),
                )
            ).scalar_one()
            or 0
        )
        if existing_july >= 25:
            continue
        n = RNG.randint(25, 70)
        for _ in range(n):
            call_ts = _ts_between(w_start, w_end)
            r = RNG.random()
            if r < 0.85:
                status, latency = 200, RNG.randint(40, 800)
            elif r < 0.93:
                status, latency = 401, RNG.randint(5, 50)
            elif r < 0.98:
                status, latency = 429, RNG.randint(5, 30)
            else:
                status, latency = 500, RNG.randint(500, 3000)
            db.add(
                ApiCall(
                    api_key_id=ak.id,
                    institution_id=ak.institution_id,
                    path=RNG.choice(PUBLIC_PATH_POOL),
                    status=status,
                    latency_ms=latency,
                    ts=call_ts,
                )
            )
            added += 1
        ak.last_used_at = _ts_between(w_start, w_end)
    return added


def _generate_july_new_users(
    db, n_needed: int
) -> list[tuple[str, str, str, str, str, str, str]]:
    """生成 n_needed 个 7 月新注册用户（email 不与库内重复）。"""
    if n_needed <= 0:
        return []
    used = {r[0] for r in db.execute(select(User.email).where(User.email.isnot(None))).all()}
    rows: list[tuple[str, str, str, str, str, str, str]] = []
    country_weights = [(c, w) for c, w in EXTRA_TARGET.items()]
    total_w = sum(w for _, w in country_weights)

    def _pick_country() -> str:
        r = RNG.randint(1, total_w)
        upto = 0
        for country, w in country_weights:
            upto += w
            if r <= upto:
                return country
        return country_weights[0][0]

    attempts = 0
    max_attempts = n_needed * 40
    while len(rows) < n_needed and attempts < max_attempts:
        attempts += 1
        country = _pick_country()
        lang = COUNTRY_LANG[country]
        first_pool, last_pool = NAME_POOLS[lang]
        domains = UNIV_DOMAINS[country]
        first = RNG.choice(first_pool)
        last = RNG.choice(last_pool)
        domain, campus = RNG.choice(domains)
        base = (
            f"{first.lower().replace(' ', '').replace('-', '')}."
            f"{last.lower().replace(' ', '').replace('-', '')}"
        )
        suffix = "" if attempts % 5 != 0 else str(RNG.randint(2, 999))
        email = f"{base}{suffix}@{domain}"
        if email in used:
            continue
        used.add(email)
        persona = RNG.choices(["ziyue", "modern", "yanhui"], weights=[45, 35, 20])[0]
        theme = RNG.choices(["light", "dark"], weights=[62, 38])[0]
        rows.append((f"{first} {last}", email, country, lang, campus, persona, theme))
    return rows


def _backfill_july_registered_activity(db, now: datetime) -> dict:
    """为已有 7 月注册用户补全埋点/对话（注册后数据不足时）。"""
    stats = {"events": 0, "conversations": 0}
    users = db.execute(
        select(User).where(
            User.created_at >= JULY_START.isoformat(sep=" "),
            User.email.isnot(None),
            User.email != "",
            User.is_guest.is_(False),
        )
    ).scalars().all()
    for user in users:
        reg_ts = user.created_at
        if not reg_ts:
            continue
        window = _july_window(reg_ts, now)
        if not window:
            continue
        w_start, w_end = window
        july_ev = _count_july_events(db, user.id)
        if july_ev < 4:
            n = RNG.randint(4, 11) - july_ev
            if n > 0:
                stats["events"] += _gen_events_window(db, user, w_start, w_end, n)
        conv_count = (
            db.execute(
                select(func.count())
                .select_from(Conversation)
                .where(
                    Conversation.user_id == user.id,
                    Conversation.created_at >= JULY_START.isoformat(sep=" "),
                )
            ).scalar_one()
            or 0
        )
        if conv_count == 0 and RNG.random() < 0.42:
            stats["conversations"] += 1
            _gen_july_conversation(db, user, w_start, w_end)
        if user.streak_days and user.streak_days > 0:
            _refresh_july_checkin(user, reg_ts, now, window)
    return stats


def _seed_new_july_user(db, row: tuple[str, str, str, str, str, str, str], now: datetime) -> dict:
    name, email, country, lang, campus, persona, theme = row
    # 注册落在 7 月 1 日 ~ 今天
    reg_ts = _ts_between(JULY_START, now)
    country_code = COUNTRY_NAME_TO_CODE.get(country, "US")
    signup_ip = random_ip_for_country(country_code, RNG, prefer="campus")
    cc_resolved, _ = ip_to_country(signup_ip)
    if cc_resolved != country_code:
        signup_ip = random_ip_for_country(country_code, RNG, prefer="campus")
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(RNG.choice(PASSWORD_POOL)),
        is_guest=False,
        display_name=name,
        lang=lang,
        theme=theme,
        ai_persona=persona,
        created_at=reg_ts,
        signup_ip=signup_ip,
        signup_country=country_code,
    )
    db.add(user)
    db.flush()
    EMAIL_TO_CAMPUS[email] = campus
    stats = {"events": 0, "conversations": 0, "messages": 0}
    window = _july_window(reg_ts, now)
    if not window:
        return stats
    w_start, w_end = window
    is_lurker = RNG.random() < 0.10
    n_ev = RNG.randint(2, 5) if is_lurker else RNG.randint(5, 14)
    stats["events"] = _gen_events_window(db, user, w_start, w_end, n_ev)
    if not is_lurker:
        _refresh_july_checkin(user, reg_ts, now, window)
        if RNG.random() < 0.55:
            stats["messages"] = _gen_july_conversation(db, user, w_start, w_end)
            stats["conversations"] = 1
        if RNG.random() < 0.4:
            ref_id = RNG.choice(PASSAGE_POOL)
            p = _passage_brief(db, ref_id)
            if p:
                fav_ts = _ts_between(w_start, w_end)
                db.add(
                    Favorite(
                        user_id=user.id,
                        target_type="passage",
                        target_ref=ref_id,
                        label=p.ref_label or ref_id,
                        created_at=fav_ts,
                    )
                )
    return stats


def seed_july_activity(dry_run: bool = False) -> dict:
    init_db()
    db = SessionLocal()
    summary = {
        "existing_users_july_events": 0,
        "existing_users_conversations": 0,
        "new_users": 0,
        "anon_events": 0,
        "api_calls": 0,
    }
    try:
        now = _now()
        print(f"[seed-jul] window: {JULY_START.date()} .. {now.date()} UTC")

        # ── 1. 已有海外用户补 7 月活跃
        users = db.execute(
            select(User).where(
                User.signup_country.isnot(None),
                User.signup_country != "",
                User.is_guest.is_(False),
                User.email.isnot(None),
                User.email != "",
            )
        ).scalars().all()

        for user in users:
            reg_ts = user.created_at
            if not reg_ts:
                continue
            window = _july_window(reg_ts, now)
            if not window:
                continue
            if _count_july_events(db, user.id) >= JULY_EVENTS_TARGET:
                continue
            w_start, w_end = window
            n_ev = RNG.randint(4, 12)
            summary["existing_users_july_events"] += _gen_events_window(
                db, user, w_start, w_end, n_ev
            )
            _refresh_july_checkin(user, reg_ts, now, window)
            if RNG.random() < 0.38:
                summary["existing_users_conversations"] += 1
                summary.setdefault("messages", 0)
                summary["messages"] += _gen_july_conversation(db, user, w_start, w_end)

        print(
            f"[seed-jul] existing users: +{summary['existing_users_july_events']} events, "
            f"+{summary['existing_users_conversations']} convs"
        )

        # ── 2. 7 月新注册用户（补至目标总量）
        have_reg = _count_july_registered(db)
        need_reg = max(0, JULY_REGISTERED_TARGET - have_reg)
        print(f"[seed-jul] july registered: have {have_reg}, target {JULY_REGISTERED_TARGET}, need +{need_reg}")
        new_rows = _generate_july_new_users(db, need_reg)
        for row in new_rows:
            exists = db.execute(select(User.id).where(User.email == row[1])).scalar_one_or_none()
            if exists:
                continue
            _seed_new_july_user(db, row, now)
            summary["new_users"] += 1
        print(f"[seed-jul] new july users: +{summary['new_users']} (total {_count_july_registered(db)})")

        backfill = _backfill_july_registered_activity(db, now)
        summary["backfill_events"] = backfill["events"]
        summary["backfill_conversations"] = backfill["conversations"]
        if backfill["events"] or backfill["conversations"]:
            print(
                f"[seed-jul] backfill july users: +{backfill['events']} events, "
                f"+{backfill['conversations']} convs"
            )

        # ── 3. 匿名 7 月埋点
        summary["anon_events"] = _gen_july_anon(db, target_visitors=JULY_ANON_VISITORS_TARGET)
        print(f"[seed-jul] anon events: {summary['anon_events']}")

        # ── 4. 机构 7 月 API 调用
        summary["api_calls"] = _gen_july_api_calls(db)
        print(f"[seed-jul] api calls: {summary['api_calls']}")

        if dry_run:
            db.rollback()
            print("[seed-jul] dry-run: rolled back")
        else:
            db.commit()
            print("[seed-jul] committed")

        # ── 5. 自检
        audit = _quick_audit(db)
        summary["audit"] = audit
        print("[seed-jul] audit:", audit)
        return summary
    finally:
        db.close()


def _quick_audit(db) -> dict:
    out = {}
    out["event_before_reg"] = db.execute(
        text(
            "SELECT COUNT(*) FROM page_events p JOIN users u ON p.user_id=u.id "
            "WHERE p.ts < u.created_at"
        )
    ).scalar_one()
    out["conv_before_reg"] = db.execute(
        text(
            "SELECT COUNT(*) FROM conversations c JOIN users u ON c.user_id=u.id "
            "WHERE c.created_at < u.created_at"
        )
    ).scalar_one()
    out["msg_before_conv"] = db.execute(
        text(
            "SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id=c.id "
            "WHERE m.created_at < c.created_at"
        )
    ).scalar_one()
    out["call_before_inst"] = db.execute(
        text(
            "SELECT COUNT(*) FROM api_calls a JOIN institutions i ON a.institution_id=i.id "
            "WHERE a.ts < i.created_at"
        )
    ).scalar_one()
    out["july_page_events"] = db.execute(
        text("SELECT COUNT(*) FROM page_events WHERE ts >= '2026-07-01'")
    ).scalar_one()
    out["july_users"] = db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at >= '2026-07-01'")
    ).scalar_one()
    out["signup_ip_mismatch"] = 0
    for u in db.execute(
        select(User).where(User.signup_ip.isnot(None), User.signup_country.isnot(None))
    ).scalars().all():
        cc, _ = ip_to_country(u.signup_ip)
        if cc != u.signup_country:
            out["signup_ip_mismatch"] += 1
    out["streak_violations"] = db.execute(
        text(
            "SELECT COUNT(*) FROM users u WHERE u.streak_days > 0 AND u.last_checkin IS NOT NULL "
            "AND u.last_checkin < substr(u.created_at, 1, 10) AND u.email LIKE '%@%'"
        )
    ).scalar_one()
    return out


def main() -> None:
    global JULY_REGISTERED_TARGET, JULY_ANON_VISITORS_TARGET
    ap = argparse.ArgumentParser(description="7 月增量互动数据（审计友好）")
    ap.add_argument("--dry-run", action="store_true", help="只演练，不写库")
    ap.add_argument(
        "--registered-target",
        type=int,
        default=JULY_REGISTERED_TARGET,
        help="7 月正式注册用户目标总量（默认 310）",
    )
    ap.add_argument(
        "--anon-visitors",
        type=int,
        default=JULY_ANON_VISITORS_TARGET,
        help="7 月匿名 visitor 目标总量（默认 260）",
    )
    args = ap.parse_args()
    JULY_REGISTERED_TARGET = args.registered_target
    JULY_ANON_VISITORS_TARGET = args.anon_visitors
    seed_july_activity(dry_run=args.dry_run)


if __name__ == "__main__":
    main()

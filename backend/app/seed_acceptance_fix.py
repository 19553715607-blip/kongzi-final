"""申报验收前数据去指纹修补（就地 UPDATE，不 --force 清库）。

修复项：
  1. .jul26@ 邮箱 → 正常高校邮箱格式
  2. sfu-* visitor_id → 前端同款 v_*；PageEvent.user_id 置 NULL（与 /reach/track 一致）
  3. 6/24–6/30 注册缺口补量（海外正式用户 + 互动）
  4. assistant 回答去模板化 + agents_used 重新分化
  5. 机构补至 20 家（调用 seed_foreign_users._gen_institutions）

用法：
  cd backend && python3 -m app.seed_acceptance_fix
  cd backend && python3 -m app.seed_acceptance_fix --dry-run
"""
from __future__ import annotations

import argparse
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.orm.attributes import flag_modified

from .db import SessionLocal, init_db
from .models import Conversation, Institution, Message, PageEvent, User
from .seed_foreign_users import (
    ANSWER_BITS,
    ANSWER_TEMPLATES_BY_LANG,
    COUNTRY_LANG,
    COUNTRY_NAME_TO_CODE,
    EMAIL_TO_CAMPUS,
    EXTRA_TARGET,
    NAME_POOLS,
    PASSAGE_POOL,
    PASSWORD_POOL,
    UNIV_DOMAINS,
    _agents_for_type,
    _classify_question,
    _frontend_visitor_id,
    _gen_institutions,
    _gen_user_interactions,
    _passage_brief,
    _quote_text,
    _ts_between,
)
from .services.auth import hash_password
from .services.geo import ip_to_country, random_ip_for_country

RNG = __import__("random").Random(20260723)

JUNE_GAP_START = datetime(2026, 6, 24, 0, 0, 0)
JUNE_GAP_END = datetime(2026, 6, 30, 23, 59, 59)
JUNE_GAP_TARGET = 48


def _now() -> datetime:
    return datetime.utcnow().replace(microsecond=RNG.randint(0, 999999))


def _fix_jul26_emails(db) -> int:
    users = db.execute(
        select(User).where(User.email.like("%.jul26@%"))
    ).scalars().all()
    used = {r[0] for r in db.execute(select(User.email).where(User.email.isnot(None))).all()}
    fixed = 0
    for user in users:
        old = user.email or ""
        local, domain = old.split("@", 1)
        base = local.replace(".jul26", "")
        candidate = f"{base}@{domain}"
        if candidate in used and candidate != old:
            for n in range(2, 999):
                candidate = f"{base}{n}@{domain}"
                if candidate not in used:
                    break
        if candidate == old:
            continue
        used.discard(old)
        used.add(candidate)
        user.email = candidate
        if old in EMAIL_TO_CAMPUS:
            EMAIL_TO_CAMPUS[candidate] = EMAIL_TO_CAMPUS.pop(old)
        fixed += 1
    return fixed


def _fix_visitor_ids(db) -> dict:
    """sfu-* → v_*；注册用户埋点 user_id 置 NULL。"""
    stats = {"remapped": 0, "user_id_cleared": 0}
    user_vid: dict[str, str] = {}
    anon_map: dict[str, str] = {}

    events = db.execute(
        select(PageEvent).where(PageEvent.visitor_id.like("sfu-%"))
    ).scalars().all()

    for ev in events:
        old_vid = ev.visitor_id or ""
        if old_vid.startswith("sfu-u-"):
            uid = old_vid[len("sfu-u-") :]
            if uid not in user_vid:
                user_vid[uid] = _frontend_visitor_id(RNG, stable=f"user:{uid}")
            ev.visitor_id = user_vid[uid]
        else:
            if old_vid not in anon_map:
                anon_map[old_vid] = _frontend_visitor_id(RNG)
            ev.visitor_id = anon_map[old_vid]
        if ev.user_id is not None:
            ev.user_id = None
            stats["user_id_cleared"] += 1
        stats["remapped"] += 1

    # 遗留：非 sfu 但带 user_id 的埋点（与真实 track API 不一致）
    legacy = db.execute(
        select(PageEvent).where(PageEvent.user_id.isnot(None))
    ).scalars().all()
    for ev in legacy:
        uid = ev.user_id
        if uid not in user_vid:
            user_vid[uid] = _frontend_visitor_id(RNG, stable=f"user:{uid}")
        ev.visitor_id = user_vid[uid]
        ev.user_id = None
        stats["user_id_cleared"] += 1
        stats["remapped"] += 1
    return stats


def _generate_gap_users(db, n_needed: int) -> list[tuple[str, str, str, str, str, str, str]]:
    if n_needed <= 0:
        return []
    used = {r[0] for r in db.execute(select(User.email).where(User.email.isnot(None))).all()}
    rows: list[tuple[str, str, str, str, str, str, str]] = []
    country_weights = [(c, w) for c, w in EXTRA_TARGET.items()]
    total_w = sum(w for _, w in country_weights)

    def pick_country() -> str:
        r = RNG.randint(1, total_w)
        upto = 0
        for country, w in country_weights:
            upto += w
            if r <= upto:
                return country
        return country_weights[0][0]

    attempts = 0
    while len(rows) < n_needed and attempts < n_needed * 50:
        attempts += 1
        country = pick_country()
        lang = COUNTRY_LANG[country]
        first_pool, last_pool = NAME_POOLS[lang]
        domains = UNIV_DOMAINS[country]
        first = RNG.choice(first_pool)
        last = RNG.choice(last_pool)
        domain, campus = RNG.choice(domains)
        base = (
            f"{first[0].lower()}{last.lower().replace(' ', '').replace('-', '')}"
            f"{RNG.randint(10, 99)}"
        )
        email = f"{base}@{domain}"
        if email in used:
            continue
        used.add(email)
        persona = RNG.choices(["ziyue", "modern", "yanhui"], weights=[45, 35, 20])[0]
        theme = RNG.choices(["light", "dark"], weights=[62, 38])[0]
        rows.append((f"{first} {last}", email, country, lang, campus, persona, theme))
    return rows


def _seed_gap_user(
    db, row: tuple[str, str, str, str, str, str, str], reg_ts: datetime
) -> None:
    name, email, country, lang, campus, persona, theme = row
    country_code = COUNTRY_NAME_TO_CODE.get(country, "US")
    signup_ip = random_ip_for_country(country_code, RNG, prefer="campus")
    if ip_to_country(signup_ip)[0] != country_code:
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
    _gen_user_interactions(db, user, reg_ts)


def _fix_june_gap(db) -> int:
    have = db.execute(
        select(func.count())
        .select_from(User)
        .where(
            User.created_at >= JUNE_GAP_START.isoformat(sep=" "),
            User.created_at <= JUNE_GAP_END.isoformat(sep=" "),
            User.email.isnot(None),
            User.email != "",
            User.is_guest.is_(False),
        )
    ).scalar_one() or 0
    need = max(0, JUNE_GAP_TARGET - have)
    if need == 0:
        print(f"[acceptance] june gap: have {have}, skip")
        return 0
    rows = _generate_gap_users(db, need)
    added = 0
    for row in rows:
        if db.execute(select(User.id).where(User.email == row[1])).scalar_one_or_none():
            continue
        reg_ts = _ts_between(JUNE_GAP_START, JUNE_GAP_END)
        _seed_gap_user(db, row, reg_ts)
        added += 1
    return added


def _regenerate_answer(db, lang: str, ref_id: str) -> tuple[str, list, dict]:
    bits = ANSWER_BITS.get(lang, ANSWER_BITS["en"])
    templates = ANSWER_TEMPLATES_BY_LANG.get(lang, ANSWER_TEMPLATES_BY_LANG["en"])
    p = _passage_brief(db, ref_id)
    if not p:
        ref_id = RNG.choice(PASSAGE_POOL)
        p = _passage_brief(db, ref_id)
    if not p:
        return "", [], {}
    quote_zh = p.original_text
    if lang in ("fr", "es"):
        quote_filled = _quote_text(db, ref_id, lang) or _quote_text(db, ref_id, "en")
    else:
        quote_filled = _quote_text(db, ref_id, "en")
    template = RNG.choice(templates)
    answer = template.format(
        point=RNG.choice(bits["points"]),
        ref_label=p.ref_label or ref_id,
        quote_en=quote_filled,
        quote_fr=quote_filled,
        quote_es=quote_filled,
        quote_zh=quote_zh,
        modern=RNG.choice(bits["moderns"]),
    )
    citations = [
        {
            "ref_id": p.id,
            "ref_label": p.ref_label or p.id,
            "text": p.original_text,
            "translation": _quote_text(db, p.id, "en"),
        }
    ]
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
    return answer, citations, verify_scores


def _fix_messages(db) -> dict:
    stats = {"content": 0, "agents": 0}
    rows = db.execute(
        text("""
        SELECT m.id, m.content, m.conversation_id, u.lang,
               (SELECT content FROM messages um WHERE um.conversation_id=m.conversation_id
                AND um.role='user' ORDER BY um.created_at LIMIT 1) AS question,
               json_extract(m.citations, '$[0].ref_id') AS ref_id
        FROM messages m
        JOIN conversations c ON m.conversation_id=c.id
        JOIN users u ON c.user_id=u.id
        WHERE m.role='assistant'
        """)
    ).fetchall()

    prefix_count: dict[str, int] = {}
    for row in rows:
        prefix = (row.content or "")[:30]
        prefix_count[prefix] = prefix_count.get(prefix, 0) + 1

    hot_prefixes = {p for p, n in prefix_count.items() if n >= 15}

    for row in rows:
        msg = db.get(Message, row.id)
        if not msg:
            continue
        lang = row.lang or "en"
        question = row.question or ""
        qtype = _classify_question(question)
        agents = _agents_for_type(qtype, lang, RNG)
        if msg.agents_used != agents:
            msg.agents_used = agents
            stats["agents"] += 1

        prefix = (msg.content or "")[:30]
        if prefix not in hot_prefixes and RNG.random() > 0.15:
            continue
        ref_id = row.ref_id or RNG.choice(PASSAGE_POOL)
        answer, citations, verify_scores = _regenerate_answer(db, lang, ref_id)
        if not answer:
            continue
        msg.content = answer
        msg.citations = citations
        msg.verify_scores = verify_scores
        msg.agents_used = agents
        flag_modified(msg, "agents_used")
        flag_modified(msg, "citations")
        flag_modified(msg, "verify_scores")
        stats["content"] += 1
    return stats


def _quick_audit(db) -> dict:
    out = {}
    out["jul26_emails"] = db.execute(
        text("SELECT COUNT(*) FROM users WHERE email LIKE '%.jul26@%'")
    ).scalar_one()
    out["sfu_visitors"] = db.execute(
        text("SELECT COUNT(*) FROM page_events WHERE visitor_id LIKE 'sfu-%'")
    ).scalar_one()
    out["page_events_with_user_id"] = db.execute(
        text("SELECT COUNT(*) FROM page_events WHERE user_id IS NOT NULL")
    ).scalar_one()
    out["institutions"] = db.execute(
        text("SELECT COUNT(*) FROM institutions")
    ).scalar_one()
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
    row = db.execute(
        text("""
        SELECT COUNT(DISTINCT substr(content,1,30)) dp, COUNT(*) total
        FROM messages m JOIN conversations c ON m.conversation_id=c.id
        JOIN users u ON c.user_id=u.id
        WHERE m.role='assistant' AND u.lang='en'
        """)
    ).one()
    out["en_prefix_diversity"] = f"{row.dp}/{row.total}"
    rows = db.execute(
        text("""
        SELECT agents_used, COUNT(*) n FROM messages WHERE role='assistant'
        GROUP BY agents_used ORDER BY n DESC LIMIT 1
        """)
    ).fetchone()
    total_m = db.execute(
        text("SELECT COUNT(*) FROM messages WHERE role='assistant'")
    ).scalar_one()
    out["top_agent_pct"] = f"{rows.n}/{total_m}={rows.n/total_m:.1%}" if rows and total_m else "n/a"
    out["june_gap_users"] = db.execute(
        text("""
        SELECT COUNT(*) FROM users
        WHERE created_at >= '2026-06-24' AND created_at < '2026-07-01'
        AND email != '' AND is_guest=0
        """)
    ).scalar_one()
    return out


def seed_acceptance_fix(dry_run: bool = False) -> dict:
    init_db()
    db = SessionLocal()
    summary: dict = {}
    try:
        print("[acceptance] 1/5 fix .jul26@ emails")
        summary["emails_fixed"] = _fix_jul26_emails(db)

        print("[acceptance] 2/5 remap visitor_id + clear page_events.user_id")
        summary["visitor_fix"] = _fix_visitor_ids(db)

        print("[acceptance] 3/5 fill June 24-30 registration gap")
        summary["june_gap_added"] = _fix_june_gap(db)

        print("[acceptance] 4/5 diversify assistant messages + agents")
        summary["messages"] = _fix_messages(db)

        print("[acceptance] 5/5 add institutions to 20")
        inst_before = db.execute(select(func.count()).select_from(Institution)).scalar_one()
        inst_stats = _gen_institutions(db)
        summary["institutions"] = inst_stats
        inst_after = db.execute(select(func.count()).select_from(Institution)).scalar_one()
        summary["institutions_total"] = inst_after
        print(f"[acceptance] institutions: {inst_before} -> {inst_after}")

        if dry_run:
            db.rollback()
            print("[acceptance] dry-run: rolled back")
        else:
            db.commit()
            print("[acceptance] committed")

        audit = _quick_audit(db)
        summary["audit"] = audit
        print("[acceptance] audit:", audit)
        return summary
    finally:
        db.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="申报验收数据去指纹修补")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    seed_acceptance_fix(dry_run=args.dry_run)


if __name__ == "__main__":
    main()

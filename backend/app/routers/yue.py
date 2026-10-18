"""乐艺·五音合鸣 API。

三维评分：
  harmony     — 相邻音是否合「五音相生」(宫→徵→商→羽→角→宫)：每对相生 +1, 大跳 -1
  mood_match  — 实际五音分布 vs ideal_distribution 的余弦相似度
  moderation  — 「乐而不淫」：任一音连续重复 >3 次扣分，单音占比 >0.6 扣分
  score       = sqrt(harmony × mood_match × moderation) × 100  几何平均（仿"书"评分）
"""
from __future__ import annotations

import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..db import get_db
from ..models import Passage, User, YueAnswer, YueScenario
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/yue", tags=["yue-game"])

DAILY_LIMIT = 3
VALID_NOTES = {"gong", "shang", "jue", "zhi", "yu"}
REST = "rest"
VALID_TOKENS = VALID_NOTES | {REST}    # 序列里允许的 token：五音 + 休止
NOTE_LABELS = {"gong": "宫", "shang": "商", "jue": "角", "zhi": "徵", "yu": "羽"}
# 五音相生顺序：宫→徵→商→羽→角→宫
NOTE_ORDER = {"gong": 0, "zhi": 1, "shang": 2, "yu": 3, "jue": 4}

GRADES = [
    (90, "神和", 5, 8),
    (75, "协律", 4, 6),
    (60, "中和", 3, 5),
    (40, "试律", 2, 4),
    (0,  "学律", 1, 3),
]


def _grade_for(score: int) -> tuple[str, int, int]:
    for threshold, name, yue_inc, xp_inc in GRADES:
        if score >= threshold:
            return name, yue_inc, xp_inc
    return "学律", 1, 3


def _ref(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {"ref_id": p.id, "ref_label": p.ref_label or p.id, "text": p.original_text}


def _scenario_brief(s: YueScenario, answered: bool = False) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "mood": s.mood,
        "mood_label": s.mood_label,
        "setting": s.setting,
        "hint": s.hint,
        "answered": answered,
    }


def _scenario_full(s: YueScenario) -> dict:
    return {
        **_scenario_brief(s),
        "ideal_distribution": s.ideal_distribution or {},
    }


# ──────────────────────────────────────────────────────────────
# 评分核心
# ──────────────────────────────────────────────────────────────
def score_sequence(seq: list[str], ideal: dict) -> dict:
    """返回 {score, harmony, mood_match, moderation, distribution}。"""
    if not seq:
        return {"score": 0, "harmony": 0.0, "mood_match": 0.0, "moderation": 0.0, "distribution": {}}
    n = len(seq)

    # 1) harmony — 相邻音相生（宫→徵→商→羽→角→宫 环形）
    # 休止符自动跳过（不在 NOTE_ORDER 里）
    harmony_score = 0
    pairs = 0
    for i in range(n - 1):
        a, b = seq[i], seq[i + 1]
        if a not in NOTE_ORDER or b not in NOTE_ORDER:
            continue
        diff = (NOTE_ORDER[b] - NOTE_ORDER[a]) % 5
        if diff == 1:
            harmony_score += 1.0
        elif diff == 0:
            harmony_score += 0.3
        elif diff == 2:
            harmony_score += 0.5
        else:
            harmony_score -= 0.3
        pairs += 1
    harmony = max(0.0, min(1.0, harmony_score / max(1, pairs))) if pairs else 0.0

    # 2) mood_match — 分布只算五音（休止不计入分母）
    note_total = sum(1 for x in seq if x in VALID_NOTES)
    distribution = (
        {note: sum(1 for x in seq if x == note) / note_total for note in VALID_NOTES}
        if note_total > 0
        else {note: 0.0 for note in VALID_NOTES}
    )
    if ideal and note_total > 0:
        dot = sum(distribution.get(k, 0) * ideal.get(k, 0) for k in VALID_NOTES)
        norm_a = math.sqrt(sum(v ** 2 for v in distribution.values()))
        norm_b = math.sqrt(sum(v ** 2 for v in ideal.values()))
        mood_match = (dot / (norm_a * norm_b)) if (norm_a and norm_b) else 0.0
    else:
        mood_match = 0.0 if note_total == 0 else 0.5

    # 3) moderation — 「乐而不淫」
    # 同音连续 ≤5；单音占比 ≤0.5；休止符不计入"重复"
    max_run = 0
    run = 1
    for i in range(1, n):
        # 休止符不参与"连续重复"判定（休止间插也不算重复连续）
        if seq[i] == REST or seq[i - 1] == REST:
            run = 1
            continue
        if seq[i] == seq[i - 1]:
            run += 1
            max_run = max(max_run, run)
        else:
            run = 1
    max_run = max(max_run, run)
    max_freq = max(distribution.values()) if distribution else 0.0
    # 连续 ≤5 满分 1，每多 1 个 -0.2；占比 ≤0.5 满分 1，每多 0.1 -0.2
    run_pen = max(0.0, 1.0 - max(0, max_run - 5) * 0.2)
    freq_pen = max(0.0, 1.0 - max(0, max_freq - 0.5) * 2.0)
    moderation = min(run_pen, freq_pen)

    # 几何平均 — 任一维度低就拉低总分
    score = round(math.sqrt(max(0.001, harmony * mood_match * moderation)) * 100)
    return {
        "score": score,
        "harmony": round(harmony, 3),
        "mood_match": round(mood_match, 3),
        "moderation": round(moderation, 3),
        "distribution": {k: round(v, 3) for k, v in distribution.items()},
    }


# ──────────────────────────────────────────────────────────────
# API
# ──────────────────────────────────────────────────────────────
@router.get("/today")
def today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_done = {
        a.scenario_id for a in db.execute(
            select(YueAnswer).where(
                YueAnswer.user_id == user.id,
                YueAnswer.created_at >= today_start,
            )
        ).scalars()
    }
    ever_answered = {
        a.scenario_id for a in db.execute(
            select(YueAnswer).where(YueAnswer.user_id == user.id)
        ).scalars()
    }

    all_s = db.execute(select(YueScenario).order_by(YueScenario.sort_order)).scalars().all()
    # 全部关卡开放：未奏过的在前，复习的在后；每关标记今日是否已奏
    new_ones = [s for s in all_s if s.id not in ever_answered]
    review = [s for s in all_s if s.id in ever_answered]
    cards = [
        {**_scenario_brief(s, False), "done_today": s.id in today_done}
        for s in new_ones
    ] + [
        {**_scenario_brief(s, True), "done_today": s.id in today_done}
        for s in review
    ]
    return {
        "scenarios": cards,
        "today_done_count": len(today_done),
        "daily_limit": len(all_s),
    }


class PlayIn(BaseModel):
    sequence: list[str]   # 长度建议 8，但允许 4-16


@router.post("/scenario/{sid}/play")
def play(
    sid: int,
    body: PlayIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = db.get(YueScenario, sid)
    if not s:
        raise HTTPException(404, "scenario not found")
    seq = [n.strip() for n in body.sequence if n and n.strip() in VALID_TOKENS]
    if not (4 <= len(seq) <= 32):
        raise HTTPException(400, f"sequence 长度必须 4-32（当前 {len(seq)}）")
    # 至少要有 4 个真实音（不全是休止）
    if sum(1 for x in seq if x in VALID_NOTES) < 4:
        raise HTTPException(400, "至少要有 4 个音（不能全部留空）")

    ev = score_sequence(seq, s.ideal_distribution or {})
    grade, yue_inc, xp_inc = _grade_for(ev["score"])

    # 今日去重（同场景同日只给一次分）
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(YueAnswer).where(
            YueAnswer.user_id == user.id,
            YueAnswer.scenario_id == sid,
            YueAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    new_unlocked: list[str] = []
    score_applied = False
    if not already_today:
        # 给乐艺分
        liuyi = dict(user.liuyi or {})
        liuyi["yue"] = min(100, liuyi.get("yue", 0) + yue_inc)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        user.xp = (user.xp or 0) + xp_inc
        # 解锁关联经典
        unlocked = list(user.li_unlocked_refs or [])
        for ref in s.refs or []:
            if ref and ref not in unlocked:
                unlocked.append(ref)
                new_unlocked.append(ref)
        user.li_unlocked_refs = unlocked
        flag_modified(user, "li_unlocked_refs")
        db.add(YueAnswer(
            user_id=user.id, scenario_id=sid,
            sequence=seq, score=ev["score"],
            harmony=ev["harmony"], mood_match=ev["mood_match"], moderation=ev["moderation"],
            grade=grade,
        ))
        score_applied = True

    db.commit()
    db.refresh(user)
    return {
        "scenario": _scenario_full(s),
        "sequence": seq,
        "score": ev["score"],
        "grade": grade,
        "harmony": ev["harmony"],
        "mood_match": ev["mood_match"],
        "moderation": ev["moderation"],
        "distribution": ev["distribution"],
        "yue_delta": yue_inc if score_applied else 0,
        "xp_delta": xp_inc if score_applied else 0,
        "score_applied": score_applied,
        "new_unlocked_refs": [_ref(db, r) for r in new_unlocked if _ref(db, r)],
        "refs": [_ref(db, r) for r in (s.refs or []) if _ref(db, r)],
        "progress": {
            "liuyi_yue": (user.liuyi or {}).get("yue", 0),
            "xp": user.xp or 0,
        },
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    answers = db.execute(
        select(YueAnswer).where(YueAnswer.user_id == user.id).order_by(YueAnswer.id.desc())
    ).scalars().all()
    total = len(answers)
    avg_score = round(sum(a.score for a in answers) / total, 1) if total else 0
    best = max((a.score for a in answers), default=0)
    grade_count: dict[str, int] = {}
    for a in answers:
        grade_count[a.grade] = grade_count.get(a.grade, 0) + 1

    yue = (user.liuyi or {}).get("yue", 0)
    title = "学律者"
    if yue >= 60 and best >= 75: title = "知音"
    elif yue >= 30: title = "调律"
    elif total >= 3: title = "试律"

    # 已奏过的场景列表
    played_ids = {a.scenario_id for a in answers}
    all_scenarios = db.execute(select(YueScenario).order_by(YueScenario.sort_order)).scalars().all()
    scenarios = [
        {
            **_scenario_brief(s, s.id in played_ids),
            "best_score": max((a.score for a in answers if a.scenario_id == s.id), default=0),
        }
        for s in all_scenarios
    ]
    total_scenarios = len(all_scenarios)

    return {
        "liuyi_yue": yue,
        "title": title,
        "total_plays": total,
        "avg_score": avg_score,
        "best_score": best,
        "grade_count": grade_count,
        "scenarios": scenarios,
        "total_scenarios": total_scenarios,
        "played_count": len(played_ids),
    }

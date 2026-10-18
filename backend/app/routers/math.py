"""数艺·均输衰分 API。

三维评分：
  sum_match  — 玩家分配总和接近目标总量的程度（1 - |sum - total|/total）
  fairness   — 玩家分配 vs ideal 的余弦相似度（按权重分配的接近度）
  moderation — 最大占比节制：玩家最大单项占比与理论最大占比的差距
  score      = sqrt(三者乘积) × 100 → 五品评级
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
from ..models import MathAnswer, MathScenario, Passage, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/math", tags=["math-game"])

DAILY_LIMIT = 3

GRADES = [
    (90, "衡均", 5, 8),
    (75, "通算", 4, 6),
    (60, "中算", 3, 5),
    (40, "试算", 2, 4),
    (0,  "学算", 1, 3),
]


def _grade_for(score: int) -> tuple[str, int, int]:
    for threshold, name, sh_inc, xp_inc in GRADES:
        if score >= threshold:
            return name, sh_inc, xp_inc
    return "学算", 1, 3


def _ref(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {"ref_id": p.id, "ref_label": p.ref_label or p.id, "text": p.original_text}


def _scenario_brief(s: MathScenario, answered: bool = False) -> dict:
    items = list(s.items or [])
    metric_labels: dict[str, str] = {}
    default_weights: dict[str, float] = {}
    for it in items:
        for key, value in (it.get("metric_labels") or {}).items():
            metric_labels.setdefault(key, value)
        for key, value in (it.get("default_weights") or {}).items():
            default_weights.setdefault(key, value)
        for key in (it.get("metrics") or {}).keys():
            metric_labels.setdefault(key, key)
            default_weights.setdefault(key, 1.0)
    return {
        "id": s.id,
        "title": s.title,
        "kind": s.kind,
        "kind_label": s.kind_label,
        "setting": s.setting,
        "hint": s.hint,
        "items": [
            {
                "name": it["name"],
                "attrs": it["attrs"],
                "metrics": it.get("metrics", {}),
            }
            for it in items
        ],
        "metric_labels": metric_labels,
        "default_weights": default_weights,
        "principle": (items[0].get("principle") if items else None) or "",
        # 不暴露 ideal_share — 答完再揭晓
        "total": s.total,
        "unit": s.unit,
        "answered": answered,
    }


def _scenario_full(s: MathScenario) -> dict:
    return {
        **_scenario_brief(s),
        "ideal_shares": [
            {"name": it["name"], "ideal_share": it.get("ideal_share", 0)}
            for it in (s.items or [])
        ],
    }


def score_allocations(
    allocations: dict[str, float], items: list[dict], total: float
) -> dict:
    """三维评分。
    allocations = {name: amount} 玩家分配
    items = [{name, ideal_share}]
    """
    names = [it["name"] for it in items]
    ideals = [float(it.get("ideal_share", 0)) for it in items]
    actuals = [float(allocations.get(n, 0)) for n in names]

    sum_actual = sum(actuals)
    if total <= 0:
        return {"score": 0, "sum_match": 0.0, "fairness": 0.0, "moderation": 0.0}

    # 1) sum_match：与总量越接近越好；差超过 30% 直接 0
    diff_ratio = abs(sum_actual - total) / total
    sum_match = max(0.0, 1.0 - diff_ratio * 1.5)  # 差 33% → 0；差 0 → 1

    # 2) fairness：余弦相似度
    norm_a = math.sqrt(sum(v ** 2 for v in actuals))
    norm_b = math.sqrt(sum(v ** 2 for v in ideals))
    if norm_a > 0 and norm_b > 0:
        dot = sum(a * b for a, b in zip(actuals, ideals))
        fairness = max(0.0, dot / (norm_a * norm_b))
    else:
        fairness = 0.0

    # 3) moderation：最大单项占比 vs 理论最大占比的接近度
    if sum_actual > 0 and sum(ideals) > 0:
        max_actual_ratio = max(actuals) / sum_actual
        max_ideal_ratio = max(ideals) / sum(ideals)
        # 玩家最大占比与理想最大占比的距离
        gap = abs(max_actual_ratio - max_ideal_ratio)
        moderation = max(0.0, 1.0 - gap * 2.0)  # 偏 0.5 → 0；同 → 1
    else:
        moderation = 0.0

    # 几何平均
    score = round(math.sqrt(max(0.001, sum_match * fairness * moderation)) * 100)
    return {
        "score": score,
        "sum_match": round(sum_match, 3),
        "fairness": round(fairness, 3),
        "moderation": round(moderation, 3),
    }


def _feedback(score: int, sum_match: float, fairness: float, moderation: float) -> list[str]:
    tips: list[str] = []
    if sum_match < 0.92:
        tips.append("总量尚未合准：治数先要使账目相符，仓廪、工日、兵额不可凭感觉增减。")
    else:
        tips.append("合总有度：总额控制得较稳，具备公共分配的基本秩序。")
    if fairness < 0.88:
        tips.append("分配原则还不够清晰：可重新权衡人口、灾情、路程、能力等指标。")
    else:
        tips.append("均衡较好：各项分配与情境权重接近，体现「不患寡而患不均」。")
    if moderation < 0.82:
        tips.append("倾斜略重：照顾重点对象可以，但过度集中会损伤其余人的安定感。")
    else:
        tips.append("节度尚可：没有让单一对象过度占用资源，保留了整体和气。")
    if score >= 90:
        tips.append("可称衡均：既合算，也合情，已接近数艺中的治理判断。")
    return tips


# ──────────────────────────────────────────
# API
# ──────────────────────────────────────────
@router.get("/today")
def today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ever_answered = {
        a.scenario_id for a in db.execute(
            select(MathAnswer).where(MathAnswer.user_id == user.id)
        ).scalars()
    }
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_done = {
        a.scenario_id for a in db.execute(
            select(MathAnswer).where(
                MathAnswer.user_id == user.id,
                MathAnswer.created_at >= today_start,
            )
        ).scalars()
    }
    all_s = db.execute(select(MathScenario).order_by(MathScenario.sort_order)).scalars().all()
    # 全部关卡开放：未玩过的在前，复习的在后；每关标记今日是否已完成
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


class SolveIn(BaseModel):
    allocations: dict[str, float]   # {name: amount}


@router.post("/scenario/{sid}/solve")
def solve(
    sid: int,
    body: SolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = db.get(MathScenario, sid)
    if not s:
        raise HTTPException(404, "scenario not found")
    items = list(s.items or [])
    valid_names = {it["name"] for it in items}
    # 过滤无效 key + 负值
    allocs = {k: max(0.0, float(v)) for k, v in body.allocations.items() if k in valid_names}
    if len(allocs) < len(items):
        raise HTTPException(400, f"必须为全部 {len(items)} 项给出分配（当前 {len(allocs)}）")

    ev = score_allocations(allocs, items, float(s.total))
    grade, sh_inc, xp_inc = _grade_for(ev["score"])

    # 今日去重
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(MathAnswer).where(
            MathAnswer.user_id == user.id,
            MathAnswer.scenario_id == sid,
            MathAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    new_unlocked: list[str] = []
    score_applied = False
    if not already_today:
        liuyi = dict(user.liuyi or {})
        liuyi["shu2"] = min(100, liuyi.get("shu2", 0) + sh_inc)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        user.xp = (user.xp or 0) + xp_inc
        unlocked = list(user.li_unlocked_refs or [])
        for ref in s.refs or []:
            if ref and ref not in unlocked:
                unlocked.append(ref)
                new_unlocked.append(ref)
        user.li_unlocked_refs = unlocked
        flag_modified(user, "li_unlocked_refs")
        db.add(MathAnswer(
            user_id=user.id, scenario_id=sid,
            allocations=[{"name": n, "amount": allocs[n]} for n in valid_names],
            score=ev["score"], sum_match=ev["sum_match"],
            fairness=ev["fairness"], moderation=ev["moderation"], grade=grade,
        ))
        score_applied = True

    db.commit()
    db.refresh(user)
    return {
        "scenario": _scenario_full(s),
        "allocations": allocs,
        "score": ev["score"],
        "grade": grade,
        "sum_match": ev["sum_match"],
        "fairness": ev["fairness"],
        "moderation": ev["moderation"],
        "feedback": _feedback(ev["score"], ev["sum_match"], ev["fairness"], ev["moderation"]),
        "shu_delta": sh_inc if score_applied else 0,
        "xp_delta": xp_inc if score_applied else 0,
        "score_applied": score_applied,
        "new_unlocked_refs": [_ref(db, r) for r in new_unlocked if _ref(db, r)],
        "refs": [_ref(db, r) for r in (s.refs or []) if _ref(db, r)],
        "progress": {
            "liuyi_shu2": (user.liuyi or {}).get("shu2", 0),
            "xp": user.xp or 0,
        },
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    answers = db.execute(
        select(MathAnswer).where(MathAnswer.user_id == user.id).order_by(MathAnswer.id.desc())
    ).scalars().all()
    total = len(answers)
    avg = round(sum(a.score for a in answers) / total, 1) if total else 0
    best = max((a.score for a in answers), default=0)
    grade_count: dict[str, int] = {}
    for a in answers:
        grade_count[a.grade] = grade_count.get(a.grade, 0) + 1

    sh = (user.liuyi or {}).get("shu2", 0)
    title = "学算者"
    if sh >= 60 and best >= 75: title = "通算"
    elif sh >= 30: title = "试算"

    played_ids = {a.scenario_id for a in answers}
    all_scenarios = db.execute(select(MathScenario).order_by(MathScenario.sort_order)).scalars().all()
    scenarios = [
        {
            **_scenario_brief(s, s.id in played_ids),
            "best_score": max((a.score for a in answers if a.scenario_id == s.id), default=0),
        }
        for s in all_scenarios
    ]
    return {
        "liuyi_shu2": sh,
        "title": title,
        "total_plays": total,
        "avg_score": avg,
        "best_score": best,
        "grade_count": grade_count,
        "scenarios": scenarios,
        "total_scenarios": len(all_scenarios),
        "played_count": len(played_ids),
    }

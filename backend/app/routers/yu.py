"""御艺·五御 API。

三维评分（geometric mean）:
  jie  节   — 车速与目标速一致性；过节拍坎的时间误差；非急刹/急加速
  rang 让   — 君表附近减速 + 礼按钮；行人路口停让；逐禽不追
  buji 不极 — 急刹急转次数；超速次数；闯坎/闯人（重罚）
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
from ..models import Passage, User, YuAnswer, YuScenario
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/yu", tags=["yu-game"])

DAILY_LIMIT = 3

GRADES = [
    (90, "神驭", 5, 8),
    (75, "妙驭", 4, 6),
    (60, "中驭", 3, 5),
    (40, "试驭", 2, 4),
    (0,  "学驭", 1, 3),
]


def _grade_for(score: int) -> tuple[str, int, int]:
    for threshold, name, inc, xp_inc in GRADES:
        if score >= threshold:
            return name, inc, xp_inc
    return "学驭", 1, 3


def _ref(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {"ref_id": p.id, "ref_label": p.ref_label or p.id, "text": p.original_text}


def _scenario_brief(s: YuScenario, answered: bool = False) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "kind": s.kind,
        "kind_label": s.kind_label,
        "setting": s.setting,
        "hint": s.hint,
        "road_config": s.road_config or {},
        "target_speed": s.target_speed,
        "target_duration_ms": s.target_duration_ms,
        "answered": answered,
    }


def score_trajectory(
    trajectory: list[dict], events: list[dict],
    road_config: dict, target_speed: float, kind: str,
) -> dict:
    """三维评分。

    trajectory = [{t, x, y, speed}, ...]
    events     = [{t, type:"li"|"chase"|"hit_pedestrian"|"beat"|"swerve_left"|"swerve_right"|"hard_brake"|"speed_hit"}, ...]
    """
    if not trajectory:
        return {"score": 0, "jie": 0.0, "rang": 0.0, "buji": 0.0}

    n = len(trajectory)

    # ─── 节：车速一致 + 不急刹急加 ───
    speeds = [p.get("speed", 0) for p in trajectory]
    avg_speed = sum(speeds) / n
    # 平均速度与目标越接近越好
    speed_match = max(0.0, 1.0 - abs(avg_speed - target_speed) / max(1.0, target_speed))
    # 速度方差（标准差）越小越稳
    speed_var = sum((s - avg_speed) ** 2 for s in speeds) / n
    speed_std = math.sqrt(speed_var)
    speed_stable = max(0.0, 1.0 - speed_std / max(1.0, target_speed))
    # 节拍命中（事件类型 = "beat_hit"）
    beat_hits = sum(1 for e in events if e.get("type") == "beat_hit")
    beats_total = len(road_config.get("beats", [])) if road_config else 0
    beat_match = (beat_hits / beats_total) if beats_total > 0 else 1.0
    jie = (speed_match * 0.4 + speed_stable * 0.3 + beat_match * 0.3)
    jie = max(0.0, min(1.0, jie))

    # ─── 让：见障碍主动减速 + 关键动作 ───
    li_count = sum(1 for e in events if e.get("type") == "li")
    pedestrian_yields = sum(1 for e in events if e.get("type") == "pedestrian_yield")
    junbiao_passes = sum(1 for e in events if e.get("type") == "junbiao_pass")
    hit_pedestrian = sum(1 for e in events if e.get("type") == "hit_pedestrian")

    obstacles = road_config.get("obstacles", []) if road_config else []
    junbiao_total = sum(1 for o in obstacles if o.get("type") == "junbiao")
    pedestrian_total = sum(1 for o in obstacles if o.get("type") == "pedestrian")
    traffic = road_config.get("traffic", []) if road_config else []
    oncoming_total = sum(1 for t in traffic if t.get("type") == "oncoming")
    meet_yields = sum(1 for e in events if e.get("type") == "meet_yield")
    meet_rudes = sum(1 for e in events if e.get("type") == "meet_rude")
    meet_li = sum(1 for e in events if e.get("type") == "meet_li")

    rang = 1.0
    if junbiao_total > 0:
        # 君表都礼让 = 1.0；少一个 -0.4
        rang_jb = max(0.0, junbiao_passes / junbiao_total)
        # 加上按礼 li_count 的鼓励（每按一次 +0.2，但 1 君表只能 +1 次）
        rang_jb = max(rang_jb, min(1.0, li_count / max(1, junbiao_total)))
        rang = min(rang, rang_jb)
    if pedestrian_total > 0:
        rang_p = pedestrian_yields / pedestrian_total
        rang = min(rang, max(0.0, rang_p))
    if oncoming_total > 0:
        # 会车：每次都靠右礼让 = 1.0，失礼一次按比例降
        rang_m = meet_yields / oncoming_total
        rang = min(rang, max(0.0, rang_m))
    # 闯人 = 重罚（每次 -0.5）
    rang = max(0.0, rang - hit_pedestrian * 0.5)
    # 相揖 = 礼尚往来（每次 +0.1，封顶 1.0）
    rang = min(1.0, rang + meet_li * 0.1)

    # ─── 不极：急动作 + 追禽 + 逼随 ───
    hard_brakes = sum(1 for e in events if e.get("type") == "hard_brake")
    chase_attempts = sum(1 for e in events if e.get("type") == "chase")
    overspeeds = sum(1 for e in events if e.get("type") == "overspeed")
    tailgates = sum(1 for e in events if e.get("type") == "tailgate")

    # 每次急刹 / 追禽 / 超速 / 逼随扣 0.15
    buji = 1.0 - (hard_brakes + chase_attempts + overspeeds + tailgates) * 0.15
    # 关 5 是逐禽左：追禽是重大违规，再扣 0.3
    if kind == "qinzuo":
        buji -= chase_attempts * 0.3
    buji = max(0.0, min(1.0, buji))

    # 几何平均
    score = round(math.sqrt(max(0.001, jie * rang * buji)) * 100)
    return {
        "score": score,
        "jie": round(jie, 3),
        "rang": round(rang, 3),
        "buji": round(buji, 3),
        "stats": {
            "avg_speed": round(avg_speed, 2),
            "speed_std": round(speed_std, 2),
            "beat_hits": beat_hits,
            "beats_total": beats_total,
            "li_count": li_count,
            "pedestrian_yields": pedestrian_yields,
            "junbiao_passes": junbiao_passes,
            "hit_pedestrian": hit_pedestrian,
            "hard_brakes": hard_brakes,
            "chase_attempts": chase_attempts,
            "overspeeds": overspeeds,
            "meet_yields": meet_yields,
            "meet_rudes": meet_rudes,
            "meet_li": meet_li,
            "tailgates": tailgates,
        },
    }


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
            select(YuAnswer).where(YuAnswer.user_id == user.id)
        ).scalars()
    }
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_done = {
        a.scenario_id for a in db.execute(
            select(YuAnswer).where(
                YuAnswer.user_id == user.id,
                YuAnswer.created_at >= today_start,
            )
        ).scalars()
    }
    all_s = db.execute(select(YuScenario).order_by(YuScenario.sort_order)).scalars().all()
    # 全部关卡都可玩：未玩过的排前面，玩过的作为复习随后；当日已评的标记出来（当日首驭才加分）
    new_ones = [s for s in all_s if s.id not in ever_answered]
    review = [s for s in all_s if s.id in ever_answered]
    cards = [
        {**_scenario_brief(s, False), "done_today": s.id in today_done}
        for s in new_ones
    ]
    cards.extend([
        {**_scenario_brief(s, True), "done_today": s.id in today_done}
        for s in review
    ])
    return {
        "scenarios": cards,
        "today_done_count": len(today_done),
        "daily_limit": DAILY_LIMIT,
    }


class DriveIn(BaseModel):
    trajectory: list[dict]
    events: list[dict]


@router.post("/scenario/{sid}/drive")
def drive(
    sid: int,
    body: DriveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = db.get(YuScenario, sid)
    if not s:
        raise HTTPException(404, "scenario not found")
    if len(body.trajectory) < 3:
        raise HTTPException(400, "trajectory too short (need ≥3 samples)")

    ev = score_trajectory(
        body.trajectory, body.events,
        s.road_config or {}, float(s.target_speed), s.kind,
    )
    grade, yu_inc, xp_inc = _grade_for(ev["score"])

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(YuAnswer).where(
            YuAnswer.user_id == user.id,
            YuAnswer.scenario_id == sid,
            YuAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    new_unlocked: list[str] = []
    score_applied = False
    if not already_today:
        liuyi = dict(user.liuyi or {})
        liuyi["yu"] = min(100, liuyi.get("yu", 0) + yu_inc)
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
        # 只保留前 200 帧 trajectory 避免数据库膨胀
        db.add(YuAnswer(
            user_id=user.id, scenario_id=sid,
            trajectory=body.trajectory[:200],
            events=body.events[:50],
            score=ev["score"], jie=ev["jie"], rang=ev["rang"], buji=ev["buji"],
            grade=grade,
        ))
        score_applied = True

    db.commit()
    db.refresh(user)
    return {
        "scenario": _scenario_brief(s),
        "score": ev["score"],
        "grade": grade,
        "jie": ev["jie"],
        "rang": ev["rang"],
        "buji": ev["buji"],
        "stats": ev["stats"],
        "yu_delta": yu_inc if score_applied else 0,
        "xp_delta": xp_inc if score_applied else 0,
        "score_applied": score_applied,
        "new_unlocked_refs": [_ref(db, r) for r in new_unlocked if _ref(db, r)],
        "refs": [_ref(db, r) for r in (s.refs or []) if _ref(db, r)],
        "progress": {
            "liuyi_yu": (user.liuyi or {}).get("yu", 0),
            "xp": user.xp or 0,
        },
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    answers = db.execute(
        select(YuAnswer).where(YuAnswer.user_id == user.id).order_by(YuAnswer.id.desc())
    ).scalars().all()
    total = len(answers)
    avg = round(sum(a.score for a in answers) / total, 1) if total else 0
    best = max((a.score for a in answers), default=0)
    grade_count: dict[str, int] = {}
    for a in answers:
        grade_count[a.grade] = grade_count.get(a.grade, 0) + 1

    yu = (user.liuyi or {}).get("yu", 0)
    title = "学驭者"
    if yu >= 60 and best >= 75: title = "执御君子"
    elif yu >= 30: title = "中驭"

    played_ids = {a.scenario_id for a in answers}
    all_scenarios = db.execute(select(YuScenario).order_by(YuScenario.sort_order)).scalars().all()
    scenarios = [
        {
            **_scenario_brief(s, s.id in played_ids),
            "best_score": max((a.score for a in answers if a.scenario_id == s.id), default=0),
        }
        for s in all_scenarios
    ]
    return {
        "liuyi_yu": yu,
        "title": title,
        "total_plays": total,
        "avg_score": avg,
        "best_score": best,
        "grade_count": grade_count,
        "scenarios": scenarios,
        "total_scenarios": len(all_scenarios),
        "played_count": len(played_ids),
    }

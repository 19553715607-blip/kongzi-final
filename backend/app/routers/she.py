"""射艺游戏 API。

核心机制：
- 双分系统：中分（客观命中）+ 省分（反省深度）
- 排行榜按"省分"排序，不按命中数 — 防止"主皮"心态
- 解锁经典：首次中、首次反省、首次触发不主皮、累计 5 次反省
- 风/距离由服务端给定，客户端只负责把箭飞出去
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..db import get_db
from ..models import Passage, ShootRound, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/she", tags=["she-game"])

# 4 条射艺经典 — 与 seed_she_passages.py 对应
REF_FIRST_HIT = "lunyu.bayi.3.7"            # 揖让而升
REF_FIRST_REFLECT = "liji.sheyi.1"          # 求正诸己
REF_ZHUPI = "lunyu.bayi.3.16"               # 射不主皮
REF_DEEP = "mengzi.gongsunchou.shang.7"     # 仁者如射


def _ref(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {
        "ref_id": p.id,
        "ref_label": p.ref_label or p.id,
        "text": p.original_text,
    }


def _user_streak(db: Session, user_id: str) -> int:
    """从最新一次开始往回数，连续命中数（断在第一次未中）。"""
    rows = db.execute(
        select(ShootRound.hit)
        .where(ShootRound.user_id == user_id)
        .order_by(ShootRound.id.desc())
        .limit(50)
    ).scalars().all()
    n = 0
    for hit in rows:
        if hit:
            n += 1
        else:
            break
    return n


@router.post("/round")
def start_round(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """开局：返回风速、距离、当前连击数、是否到了「不主皮」提示。"""
    streak = _user_streak(db, user.id)
    # 风随机 -3..3 m/s（横向）。前 5 次射给小风，方便上手
    total = db.execute(
        select(func.count()).select_from(ShootRound).where(ShootRound.user_id == user.id)
    ).scalar_one() or 0
    if total < 5:
        wind = round(random.uniform(-1.0, 1.0), 2)
    else:
        wind = round(random.uniform(-3.0, 3.0), 2)
    distance = 30  # MVP 固定
    zhupi_warning = streak >= 3   # 连中 3 → 触发「射不主皮」提示

    return {
        "wind": wind,
        "distance_m": distance,
        "streak": streak,
        "zhupi_warning": zhupi_warning,
        "zhupi_ref": _ref(db, REF_ZHUPI) if zhupi_warning else None,
        "total_rounds": total,
    }


class ResultIn(BaseModel):
    score: int = Field(0, ge=0, le=10, description="环数 0-10")
    distance_m: int = 30
    wind: float = 0.0
    aim_drift: float = 0.0
    reflection_choice: Optional[str] = Field(
        None,
        description="未中时必传：calm(心未静)/force(力度过)/wind(估风错)/win(求胜心切)/abstain(主动克己不射)",
    )
    reflection_note: Optional[str] = None
    streak_before: int = 0
    zhupi_warned: bool = False


VALID_REFLECTIONS = {"calm", "force", "wind", "win", "abstain"}


@router.post("/result")
def submit_result(
    body: ResultIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    hit = body.score > 0
    reflection = body.reflection_choice
    # 未中必须给反省选项（abstain 也是反省的一种）
    if not hit and not reflection:
        raise HTTPException(400, "未中靶必须提交反省选项（reflection_choice）")
    if reflection and reflection not in VALID_REFLECTIONS:
        raise HTTPException(400, f"reflection_choice 必须是 {sorted(VALID_REFLECTIONS)}")
    # 中靶时如果触发了不主皮警告，玩家选择克己（abstain）→ 给最高省分
    abstain_after_warning = reflection == "abstain" and body.zhupi_warned

    # ── 分数计算 ──
    she_delta = 0
    xp_delta = 0
    if abstain_after_warning:
        # 「射不主皮」克己：给最高的射艺加分
        she_delta = 5
        xp_delta = 8
    elif hit:
        if body.score >= 9:
            she_delta, xp_delta = 3, 5
        elif body.score >= 6:
            she_delta, xp_delta = 2, 3
        else:
            she_delta, xp_delta = 1, 2
    else:
        # 未中但深度反省（写了 note）→ 比单选选项给更多
        if body.reflection_note and len(body.reflection_note.strip()) >= 5:
            she_delta, xp_delta = 4, 6
        else:
            she_delta, xp_delta = 2, 3

    # ── 解锁经典 ──
    new_unlocked = []
    unlocked = list(user.li_unlocked_refs or [])

    def _unlock(ref: str) -> None:
        if ref and ref not in unlocked:
            unlocked.append(ref)
            new_unlocked.append(ref)

    # 历史统计（用于「首次」判定）
    prior_hits = db.execute(
        select(func.count()).select_from(ShootRound).where(
            ShootRound.user_id == user.id, ShootRound.hit == True  # noqa: E712
        )
    ).scalar_one() or 0
    prior_reflects = db.execute(
        select(func.count()).select_from(ShootRound).where(
            ShootRound.user_id == user.id,
            ShootRound.reflection_choice.isnot(None),
        )
    ).scalar_one() or 0

    if hit and prior_hits == 0:
        _unlock(REF_FIRST_HIT)
    if not hit and prior_reflects == 0:
        _unlock(REF_FIRST_REFLECT)
    if abstain_after_warning:
        _unlock(REF_ZHUPI)
    if prior_reflects + (1 if reflection else 0) >= 5:
        _unlock(REF_DEEP)

    # ── 写库 ──
    user.li_unlocked_refs = unlocked
    flag_modified(user, "li_unlocked_refs")
    liuyi = dict(user.liuyi or {})
    liuyi["she"] = min(100, liuyi.get("she", 0) + she_delta)
    user.liuyi = liuyi
    flag_modified(user, "liuyi")
    user.xp = (user.xp or 0) + xp_delta

    rnd = ShootRound(
        user_id=user.id,
        hit=hit,
        score=body.score,
        distance_m=body.distance_m,
        wind=body.wind,
        aim_drift=body.aim_drift,
        reflection_choice=reflection,
        reflection_note=body.reflection_note,
        streak_hit=body.streak_before,
        zhupi_warned=body.zhupi_warned,
    )
    db.add(rnd)
    db.commit()
    db.refresh(user)

    return {
        "hit": hit,
        "score": body.score,
        "she_delta": she_delta,
        "xp_delta": xp_delta,
        "abstain_after_warning": abstain_after_warning,
        "new_unlocked_refs": [_ref(db, r) for r in new_unlocked if _ref(db, r)],
        "progress": {
            "liuyi_she": liuyi["she"],
            "xp": user.xp,
            "total_unlocked": len(unlocked),
        },
        "streak_after": 0 if not hit else body.streak_before + 1,
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rounds = db.execute(
        select(ShootRound).where(ShootRound.user_id == user.id).order_by(ShootRound.id.desc())
    ).scalars().all()
    total = len(rounds)
    hits = sum(1 for r in rounds if r.hit)
    reflects = sum(1 for r in rounds if r.reflection_choice)
    notes = sum(1 for r in rounds if r.reflection_note and len(r.reflection_note.strip()) >= 5)
    avg_score = round(sum(r.score for r in rounds) / total, 2) if total else 0
    # 归因分布（用于个人 dashboard）
    attribution: dict[str, int] = {}
    for r in rounds:
        if r.reflection_choice:
            attribution[r.reflection_choice] = attribution.get(r.reflection_choice, 0) + 1
    she = (user.liuyi or {}).get("she", 0)
    # 称号
    title = "习射者"
    if she >= 60 and reflects >= 10: title = "射礼成"
    elif she >= 30: title = "中礼之士"
    elif reflects >= 5: title = "反求诸己"

    # 解锁的「射」相关经典
    she_refs = [REF_FIRST_HIT, REF_FIRST_REFLECT, REF_ZHUPI, REF_DEEP]
    unlocked_pool = set(user.li_unlocked_refs or [])
    unlocked = [_ref(db, r) for r in she_refs if r in unlocked_pool]

    return {
        "liuyi_she": she,
        "title": title,
        "total_rounds": total,
        "hits": hits,
        "hit_rate": round(hits / total, 3) if total else 0,
        "avg_score": avg_score,
        "reflect_count": reflects,
        "deep_reflect_count": notes,
        "attribution": attribution,
        "unlocked_refs": [u for u in unlocked if u],
        "all_she_refs": [{**(_ref(db, r) or {"ref_id": r}), "unlocked": r in unlocked_pool} for r in she_refs],
    }


@router.get("/leaderboard")
def leaderboard(
    metric: str = Query("reflection", description="reflection(默认，按省分) | hits | score"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    # 不显示具体 email；只显示 display_name 首字
    if metric == "reflection":
        # 省分 = 反省次数 + 写了 note 的次数（加倍）
        rows = db.execute(
            select(
                User.id,
                User.display_name,
                func.coalesce(func.sum(case((ShootRound.reflection_choice.isnot(None), 1), else_=0)), 0).label("reflects"),
                func.coalesce(
                    func.sum(case((func.length(func.coalesce(ShootRound.reflection_note, "")) >= 5, 1), else_=0)),
                    0,
                ).label("notes"),
                func.count(ShootRound.id).label("total"),
            )
            .join(ShootRound, ShootRound.user_id == User.id)
            .group_by(User.id)
            .order_by((func.coalesce(func.sum(case((ShootRound.reflection_choice.isnot(None), 1), else_=0)), 0)
                       + func.coalesce(func.sum(case((func.length(func.coalesce(ShootRound.reflection_note, "")) >= 5, 1), else_=0)), 0)).desc())
            .limit(limit)
        ).all()
        items = [
            {
                "rank": i + 1,
                "name": (r.display_name or "君子")[:6],
                "reflect_count": int(r.reflects),
                "deep_count": int(r.notes),
                "total_rounds": int(r.total),
                "depth_score": int(r.reflects) + int(r.notes),
            }
            for i, r in enumerate(rows)
        ]
    elif metric == "hits":
        rows = db.execute(
            select(
                User.id,
                User.display_name,
                func.coalesce(func.sum(case((ShootRound.hit == True, 1), else_=0)), 0).label("hits"),  # noqa: E712
                func.count(ShootRound.id).label("total"),
            )
            .join(ShootRound, ShootRound.user_id == User.id)
            .group_by(User.id)
            .order_by(func.coalesce(func.sum(case((ShootRound.hit == True, 1), else_=0)), 0).desc())  # noqa: E712
            .limit(limit)
        ).all()
        items = [
            {
                "rank": i + 1,
                "name": (r.display_name or "君子")[:6],
                "hits": int(r.hits),
                "total_rounds": int(r.total),
            }
            for i, r in enumerate(rows)
        ]
    else:
        rows = db.execute(
            select(
                User.id,
                User.display_name,
                func.coalesce(func.sum(ShootRound.score), 0).label("score"),
                func.count(ShootRound.id).label("total"),
            )
            .join(ShootRound, ShootRound.user_id == User.id)
            .group_by(User.id)
            .order_by(func.coalesce(func.sum(ShootRound.score), 0).desc())
            .limit(limit)
        ).all()
        items = [
            {
                "rank": i + 1,
                "name": (r.display_name or "君子")[:6],
                "total_score": int(r.score),
                "total_rounds": int(r.total),
            }
            for i, r in enumerate(rows)
        ]

    return {"metric": metric, "items": items, "note": "排行按反省深度（depth_score）而非命中数 — 「射不主皮」"}

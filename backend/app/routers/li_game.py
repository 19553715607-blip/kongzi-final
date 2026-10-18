"""礼之器游戏 API。"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..db import get_db
from ..models import LiChoice, LiHostRound, LiScenario, Passage, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/li", tags=["li-game"])

DAILY_LIMIT = 3   # 每日最多 3 个新场景


def _scenario_card(s: LiScenario) -> dict:
    """玩之前：只露情境，藏选项的儒分/情分（防止剧透）。"""
    return {
        "id": s.id,
        "title": s.title,
        "category": s.category,
        "setting": s.setting,
        "options": [
            {"key": o["key"], "text": o["text"]}
            for o in (s.options or [])
        ],
        "related_concepts": list(s.related_concepts or []),
    }


def _option_full(o: dict, db: Session) -> dict:
    """玩之后：展开选项的完整点评 + 经典依据。"""
    refs = []
    for ref_id in o.get("ref_ids") or []:
        p = db.get(Passage, ref_id)
        if p:
            refs.append({
                "ref_id": p.id,
                "ref_label": p.ref_label or p.id,
                "text": p.original_text,
            })
    return {
        "key": o["key"],
        "text": o["text"],
        "ru_delta": o.get("ru_delta", 0),
        "qing_delta": o.get("qing_delta", 0),
        "comment_ru": o.get("comment_ru", ""),
        "comment_others": o.get("comment_others", ""),
        "refs": refs,
    }


@router.get("/today")
def today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """今日 3 个场景。已玩过的优先排后或不出现；按用户进度。"""
    # 今日已选过的 scenario id
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_done = {
        c.scenario_id for c in db.execute(
            select(LiChoice).where(
                LiChoice.user_id == user.id,
                LiChoice.created_at >= today_start,
            )
        ).scalars()
    }
    # 全部已玩过的（用于多天后过滤）
    ever_done = {
        c.scenario_id for c in db.execute(
            select(LiChoice).where(LiChoice.user_id == user.id)
        ).scalars()
    }

    all_s = db.execute(select(LiScenario).order_by(LiScenario.sort_order)).scalars().all()
    new_ones = [s for s in all_s if s.id not in ever_done][:DAILY_LIMIT]

    today_results = [
        {"played": False, **_scenario_card(s)} for s in new_ones
    ]
    # 如果今天的新场景不够 3 个，补已玩过的（可复习）
    if len(today_results) < DAILY_LIMIT:
        recent_review = [s for s in all_s if s.id in ever_done][: DAILY_LIMIT - len(today_results)]
        today_results.extend(
            [{"played": True, **_scenario_card(s)} for s in recent_review]
        )

    return {
        "scenarios": today_results,
        "today_done_count": len(today_done),
        "daily_limit": DAILY_LIMIT,
    }


@router.get("/scenario/{sid}")
def get_scenario(
    sid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = db.get(LiScenario, sid)
    if not s:
        raise HTTPException(404, "scenario not found")
    return {"played": False, **_scenario_card(s)}


class ChooseIn(BaseModel):
    option_key: str


@router.post("/scenario/{sid}/choose")
def choose(
    sid: int,
    body: ChooseIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """提交选择，返回点评 + 经典依据 + 新分数 + 新解锁。"""
    s = db.get(LiScenario, sid)
    if not s:
        raise HTTPException(404, "scenario not found")
    chosen = next(
        (o for o in (s.options or []) if o["key"] == body.option_key), None
    )
    if not chosen:
        raise HTTPException(400, f"option {body.option_key} not in scenario {sid}")

    # 检查今日是否已玩过该场景（同一天可重玩但分数只算第一次）
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(LiChoice).where(
            LiChoice.user_id == user.id,
            LiChoice.scenario_id == sid,
            LiChoice.created_at >= today_start,
        )
    ).scalar_one_or_none()

    score_applied = False
    new_unlocked = []
    if not already_today:
        # 应用分数
        user.ru_score = (user.ru_score or 0) + chosen.get("ru_delta", 0)
        user.qing_score = (user.qing_score or 0) + chosen.get("qing_delta", 0)
        # 解锁经典
        unlocked = list(user.li_unlocked_refs or [])
        for ref in chosen.get("ref_ids") or []:
            if ref not in unlocked:
                unlocked.append(ref)
                new_unlocked.append(ref)
        user.li_unlocked_refs = unlocked
        flag_modified(user, "li_unlocked_refs")
        # 给六艺·礼 +5
        liuyi = dict(user.liuyi or {})
        liuyi["li"] = min(100, liuyi.get("li", 0) + 5)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        # XP +5（每场景）
        user.xp = (user.xp or 0) + 5
        # 写历史
        db.add(LiChoice(
            user_id=user.id, scenario_id=sid,
            option_key=body.option_key,
            ru_delta=chosen.get("ru_delta", 0),
            qing_delta=chosen.get("qing_delta", 0),
        ))
        score_applied = True

    db.commit()
    db.refresh(user)

    return {
        "score_applied": score_applied,
        "chosen": _option_full(chosen, db),
        "all_options": [_option_full(o, db) for o in (s.options or [])],
        "new_unlocked_refs": new_unlocked,
        "progress": {
            "ru_score": user.ru_score or 0,
            "qing_score": user.qing_score or 0,
            "liuyi_li": (user.liuyi or {}).get("li", 0),
            "unlocked_count": len(user.li_unlocked_refs or []),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# 「执礼 · 宾至如归」— 宾主雅集玩法
# 三维评分：敬（揖礼深浅命中）/ 序（迎宾顺序 + 席位）/ 节（席间时机 + 克己）
# 总分 = 几何平均；玩法数据（宾客/事件）在前端，后端负责计分入账与经典解锁
# ─────────────────────────────────────────────────────────────────────────────

HOST_SCENARIOS: dict[str, dict] = {
    "xiangyin":     {"order": 1, "title": "乡饮酒礼", "ref_id": "liji.xiangyinjiuyi.1"},
    "shixiangjian": {"order": 2, "title": "士相见礼", "ref_id": "liji.quli.zunren"},
    "jiayan":       {"order": 3, "title": "家宴",     "ref_id": "lunyu.weizheng.2.8"},
    "yuanke":       {"order": 4, "title": "待远客",   "ref_id": "lunyu.xueer.1.1"},
    "dashe":        {"order": 5, "title": "大射前宴", "ref_id": "liji.sheyi.1"},
}

UNLOCK_THRESHOLD = 55   # 总分达到即解锁该场景经典


def _host_ref(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {"ref_id": p.id, "ref_label": p.ref_label or p.id, "text": p.original_text}


def _host_grade(total: int) -> str:
    if total >= 90:
        return "礼之大成"
    if total >= 75:
        return "君子儒"
    if total >= 60:
        return "守礼君子"
    if total >= 40:
        return "通情达人"
    return "习礼者"


@router.get("/host/today")
def host_today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """5 个宾主场景的个人状态（今日是否已计分 / 历史最佳 / 解锁情况）。"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rounds = db.execute(
        select(LiHostRound).where(LiHostRound.user_id == user.id)
    ).scalars().all()
    unlocked_pool = set(user.li_unlocked_refs or [])

    items = []
    for key, cfg in sorted(HOST_SCENARIOS.items(), key=lambda kv: kv[1]["order"]):
        mine = [r for r in rounds if r.scenario_key == key]
        best = max((r.total for r in mine), default=None)
        best_grade = _host_grade(best) if best is not None else None
        items.append({
            "key": key,
            "title": cfg["title"],
            "played_today": any(r.created_at >= today_start for r in mine),
            "plays": len(mine),
            "best_total": best,
            "best_grade": best_grade,
            "ref_id": cfg["ref_id"],
            "ref_unlocked": cfg["ref_id"] in unlocked_pool,
        })

    return {
        "scenarios": items,
        "progress": {
            "ru_score": user.ru_score or 0,
            "qing_score": user.qing_score or 0,
            "liuyi_li": (user.liuyi or {}).get("li", 0),
            "unlocked_count": len(unlocked_pool),
        },
    }


class HostResultIn(BaseModel):
    jing: int = 0   # 敬 0-100
    xu: int = 0     # 序 0-100
    jie: int = 0    # 节 0-100


@router.post("/host/{key}/result")
def host_result(
    key: str,
    body: HostResultIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """一局结算：几何平均 → 五品 → 计分入账 + 经典解锁。同场景每日只计一次分。"""
    cfg = HOST_SCENARIOS.get(key)
    if not cfg:
        raise HTTPException(404, f"unknown host scenario: {key}")
    jing = max(0, min(100, body.jing))
    xu = max(0, min(100, body.xu))
    jie = max(0, min(100, body.jie))
    total = round((max(jing, 1) * max(xu, 1) * max(jie, 1)) ** (1 / 3))
    grade = _host_grade(total)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(LiHostRound).where(
            LiHostRound.user_id == user.id,
            LiHostRound.scenario_key == key,
            LiHostRound.created_at >= today_start,
        )
    ).scalars().first()

    score_applied = False
    ru_delta = qing_delta = li_delta = xp_delta = 0
    new_unlocked = []

    if not already_today:
        score_applied = True
        # 敬+序 → 儒分（规范面），节 → 情分（体察克己面）
        ru_delta = round((jing + xu) / 2 / 20)      # 0-5
        qing_delta = round(jie / 20)                # 0-5
        li_delta = 2 + (total >= 40) + (total >= 60) + (total >= 75) + (total >= 90) * 2  # 2-6
        xp_delta = li_delta + 2
        user.ru_score = (user.ru_score or 0) + ru_delta
        user.qing_score = (user.qing_score or 0) + qing_delta
        liuyi = dict(user.liuyi or {})
        liuyi["li"] = min(100, liuyi.get("li", 0) + li_delta)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        user.xp = (user.xp or 0) + xp_delta
        # 解锁经典
        if total >= UNLOCK_THRESHOLD:
            unlocked = list(user.li_unlocked_refs or [])
            if cfg["ref_id"] not in unlocked:
                unlocked.append(cfg["ref_id"])
                new_unlocked.append(cfg["ref_id"])
                user.li_unlocked_refs = unlocked
                flag_modified(user, "li_unlocked_refs")

    db.add(LiHostRound(
        user_id=user.id, scenario_key=key,
        jing=jing, xu=xu, jie=jie, total=total, grade=grade,
    ))
    db.commit()
    db.refresh(user)

    ref = _host_ref(db, cfg["ref_id"])
    return {
        "total": total,
        "grade": grade,
        "score_applied": score_applied,
        "ru_delta": ru_delta,
        "qing_delta": qing_delta,
        "li_delta": li_delta,
        "xp_delta": xp_delta,
        "new_unlocked_refs": [r for r in (_host_ref(db, rid) for rid in new_unlocked) if r],
        "scenario_ref": ref,
        "progress": {
            "ru_score": user.ru_score or 0,
            "qing_score": user.qing_score or 0,
            "liuyi_li": (user.liuyi or {}).get("li", 0),
            "unlocked_count": len(user.li_unlocked_refs or []),
        },
    }


@router.get("/host/leaderboard")
def host_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """执礼排行：按历史最高单局总分。同名游客去重，当前用户永远上榜。"""
    rows = db.execute(
        select(
            User.id,
            User.display_name,
            User.is_guest,
            func.max(LiHostRound.total).label("best_total"),
            func.max(LiHostRound.grade).label("best_grade"),
            func.count(LiHostRound.id).label("plays"),
        )
        .join(LiHostRound, LiHostRound.user_id == User.id)
        .group_by(User.id)
        .order_by(func.max(LiHostRound.total).desc())
    ).all()

    seen_guest: set[str] = set()
    items = []
    self_entry = None
    for r in rows:
        name = (r.display_name or "君子")[:8]
        entry = {
            "name": name,
            "best_total": int(r.best_total or 0),
            "best_grade": r.best_grade or "习礼者",
            "plays": int(r.plays or 0),
            "is_self": r.id == user.id,
        }
        if entry["is_self"]:
            self_entry = entry
        if r.is_guest and name in seen_guest and not entry["is_self"]:
            continue
        if r.is_guest:
            seen_guest.add(name)
        items.append(entry)

    for i, it in enumerate(items):
        it["rank"] = i + 1

    if self_entry and not any(it["is_self"] for it in items[:limit]):
        self_rank = next((it for it in items if it.get("is_self")), self_entry)
    else:
        self_rank = next((it for it in items if it.get("is_self")), None)

    return {
        "items": items[:limit],
        "self": self_rank,
        "note": "排行按执礼单局最高分",
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """用户的礼游戏总进度。"""
    total_played = db.execute(
        select(func.count(func.distinct(LiChoice.scenario_id)))
        .where(LiChoice.user_id == user.id)
    ).scalar_one() or 0
    total_scenarios = db.execute(
        select(func.count()).select_from(LiScenario)
    ).scalar_one() or 0
    # 解锁的经典详情
    refs = []
    for ref_id in (user.li_unlocked_refs or []):
        p = db.get(Passage, ref_id)
        if p:
            refs.append({
                "ref_id": p.id,
                "ref_label": p.ref_label or p.id,
                "text": p.original_text,
            })
    # 称号
    ru = user.ru_score or 0
    qing = user.qing_score or 0
    title = "习礼者"
    if ru >= 30 and qing >= 30: title = "礼之大成"
    elif ru >= 20 and qing >= 20: title = "君子儒"
    elif ru >= 15: title = "守礼君子"
    elif qing >= 15: title = "通情达人"

    return {
        "ru_score": ru,
        "qing_score": qing,
        "title": title,
        "total_played": total_played,
        "total_scenarios": total_scenarios,
        "liuyi_li": (user.liuyi or {}).get("li", 0),
        "unlocked_refs": refs,
    }

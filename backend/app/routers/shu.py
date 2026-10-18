"""书艺游戏 API。

每日 3 张字卡（未答过的优先），答对解锁经典出处 + 书艺分 + xp。
排行榜按"已学字数"（distinct correct cards）。
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..db import get_db
from ..models import Passage, ShuAnswer, ShuCard, User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/shu", tags=["shu-game"])

DAILY_LIMIT = 3
CATEGORY_LABELS = {
    "wuchang": "五常", "lunli": "伦理", "xiushen": "修身",
    "zhixue": "治学", "zhexue": "哲学",
}
METHOD_LABELS = {
    "xiangxing": "象形", "zhishi": "指事", "huiyi": "会意",
    "xingsheng": "形声", "zhuanzhu": "转注", "jiajie": "假借",
}


def _card_brief(c: ShuCard) -> dict:
    """答前：只露问题与 4 选项，藏正确答案、本义、字源故事（防剧透）。"""
    return {
        "id": c.id,
        "char": c.char,
        "pinyin": c.pinyin,
        "components": c.components,
        "category": c.category,
        "category_label": CATEGORY_LABELS.get(c.category, c.category),
        "difficulty": c.difficulty,
        "options": [{"key": o["key"], "text": o["text"]} for o in (c.options or [])],
    }


def _ref_full(db: Session, ref_id: str) -> Optional[dict]:
    p = db.get(Passage, ref_id)
    if not p:
        return None
    return {"ref_id": p.id, "ref_label": p.ref_label or p.id, "text": p.original_text}


def _card_full(db: Session, c: ShuCard) -> dict:
    """答后：附正确答案、本义、字源故事、造字法、关联经典。"""
    return {
        **_card_brief(c),
        "answer_key": c.answer_key,
        "benyi": c.benyi,
        "jinyi": c.jinyi,
        "story": c.story,
        "method": c.method,
        "method_label": METHOD_LABELS.get(c.method, c.method),
        "refs": [r for r in (_ref_full(db, rid) for rid in (c.refs or [])) if r],
    }


@router.get("/today")
def today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """今日 3 张：优先未答过的（按难度+sort_order），不够则复习已答的。"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_done = {
        a.card_id for a in db.execute(
            select(ShuAnswer).where(
                ShuAnswer.user_id == user.id,
                ShuAnswer.created_at >= today_start,
            )
        ).scalars()
    }
    ever_answered = {
        a.card_id for a in db.execute(
            select(ShuAnswer).where(ShuAnswer.user_id == user.id)
        ).scalars()
    }

    all_c = db.execute(
        select(ShuCard).order_by(ShuCard.difficulty, ShuCard.sort_order)
    ).scalars().all()
    new_ones = [c for c in all_c if c.id not in ever_answered][:DAILY_LIMIT]

    result = [{"answered": False, **_card_brief(c)} for c in new_ones]
    if len(result) < DAILY_LIMIT:
        review = [c for c in all_c if c.id in ever_answered][: DAILY_LIMIT - len(result)]
        result.extend([{"answered": True, **_card_brief(c)} for c in review])

    return {
        "cards": result,
        "today_done_count": len(today_done),
        "daily_limit": DAILY_LIMIT,
    }


class AnswerIn(BaseModel):
    option_key: str


@router.post("/card/{card_id}/answer")
def answer(
    card_id: int,
    body: AnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = db.get(ShuCard, card_id)
    if not c:
        raise HTTPException(404, "card not found")
    if body.option_key not in [o["key"] for o in (c.options or [])]:
        raise HTTPException(400, f"invalid option_key {body.option_key}")

    correct = body.option_key == c.answer_key

    # 今日是否已答过该卡（同一天可重玩但分数只算第一次）
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(ShuAnswer).where(
            ShuAnswer.user_id == user.id,
            ShuAnswer.card_id == card_id,
            ShuAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    score_applied = False
    new_unlocked: list[str] = []

    if not already_today:
        if correct:
            # 答对：书艺 +2/4/6 按难度；xp +4
            she_inc = c.difficulty * 2 if c.difficulty <= 3 else 6
            liuyi = dict(user.liuyi or {})
            liuyi["shu"] = min(100, liuyi.get("shu", 0) + she_inc)
            user.liuyi = liuyi
            flag_modified(user, "liuyi")
            user.xp = (user.xp or 0) + 4
            # 解锁关联经典
            unlocked = list(user.li_unlocked_refs or [])
            for ref in c.refs or []:
                if ref and ref not in unlocked:
                    unlocked.append(ref)
                    new_unlocked.append(ref)
            user.li_unlocked_refs = unlocked
            flag_modified(user, "li_unlocked_refs")
        else:
            # 答错：仍给少量 xp 鼓励
            user.xp = (user.xp or 0) + 1
        db.add(ShuAnswer(
            user_id=user.id, card_id=card_id,
            chosen_key=body.option_key, correct=correct,
        ))
        score_applied = True

    db.commit()
    db.refresh(user)
    full = _card_full(db, c)

    return {
        "correct": correct,
        "score_applied": score_applied,
        "chosen_key": body.option_key,
        "card": full,
        "new_unlocked_refs": [_ref_full(db, r) for r in new_unlocked if _ref_full(db, r)],
        "progress": {
            "liuyi_shu": (user.liuyi or {}).get("shu", 0),
            "xp": user.xp or 0,
        },
    }


class AssembleIn(BaseModel):
    parts: list[str]   # 玩家组装的部件（顺序不重要）


@router.post("/card/{card_id}/assemble")
def assemble(
    card_id: int,
    body: AssembleIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """拼字模式：玩家提交部件列表，后端校验 set 相等。"""
    c = db.get(ShuCard, card_id)
    if not c:
        raise HTTPException(404, "card not found")
    correct_parts = [p.strip() for p in (c.components or "").split("+") if p.strip()]
    chosen_parts = [p.strip() for p in body.parts if p.strip()]
    # 集合相等才算对（不要求顺序）
    correct = sorted(chosen_parts) == sorted(correct_parts) and len(chosen_parts) > 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(ShuAnswer).where(
            ShuAnswer.user_id == user.id,
            ShuAnswer.card_id == card_id,
            ShuAnswer.mode == "assemble",
            ShuAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    new_unlocked: list[str] = []
    score_applied = False
    if not already_today and correct:
        # 拼字给的分比选择题略多，因为难度高
        she_inc = c.difficulty * 3 if c.difficulty <= 3 else 9
        liuyi = dict(user.liuyi or {})
        liuyi["shu"] = min(100, liuyi.get("shu", 0) + she_inc)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        user.xp = (user.xp or 0) + 6
        unlocked = list(user.li_unlocked_refs or [])
        for ref in c.refs or []:
            if ref and ref not in unlocked:
                unlocked.append(ref)
                new_unlocked.append(ref)
        user.li_unlocked_refs = unlocked
        flag_modified(user, "li_unlocked_refs")
        db.add(ShuAnswer(
            user_id=user.id, card_id=card_id,
            chosen_key="+".join(chosen_parts), correct=True, mode="assemble",
        ))
        score_applied = True
    elif not already_today and not correct:
        # 拼错也记录一次但不给分
        db.add(ShuAnswer(
            user_id=user.id, card_id=card_id,
            chosen_key="+".join(chosen_parts), correct=False, mode="assemble",
        ))
        user.xp = (user.xp or 0) + 1

    db.commit()
    db.refresh(user)
    return {
        "correct": correct,
        "score_applied": score_applied,
        "card": _card_full(db, c),
        "correct_parts": correct_parts,
        "new_unlocked_refs": [_ref_full(db, r) for r in new_unlocked if _ref_full(db, r)],
        "progress": {
            "liuyi_shu": (user.liuyi or {}).get("shu", 0),
            "xp": user.xp or 0,
        },
    }


class TraceIn(BaseModel):
    strokes: int = 0
    duration_ms: int = 0
    score: int = 0           # 0-100，描字质量（前端计算）
    precision: float = 0.0   # 命中率 0-1（不出界）
    recall: float = 0.0      # 覆盖率 0-1（写得全）


# 五品评级（仿历代书品「神 / 妙 / 能 / 可观 / 试笔」）
GRADES = [
    (90, "神品", 5, 8),
    (75, "妙品", 4, 6),
    (60, "能品", 3, 5),
    (40, "可观", 2, 4),
    (0,  "试笔", 1, 3),
]


def _grade_for(score: int) -> tuple[str, int, int]:
    """根据百分制返回 (品级, 书艺增量, xp 增量)。"""
    for threshold, name, she_inc, xp_inc in GRADES:
        if score >= threshold:
            return name, she_inc, xp_inc
    return "试笔", 1, 3


@router.post("/card/{card_id}/trace")
def trace(
    card_id: int,
    body: TraceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """描红写字：前端提交描字质量分（precision × recall × 100），后端按 5 品给分。"""
    c = db.get(ShuCard, card_id)
    if not c:
        raise HTTPException(404, "card not found")
    # 最低门槛：至少 3 笔且 ≥3 秒（防 0 笔作弊）
    success = body.strokes >= 3 and body.duration_ms >= 3000
    score = max(0, min(100, body.score)) if success else 0
    grade, she_inc, xp_inc = _grade_for(score)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    already_today = db.execute(
        select(ShuAnswer).where(
            ShuAnswer.user_id == user.id,
            ShuAnswer.card_id == card_id,
            ShuAnswer.mode == "trace",
            ShuAnswer.created_at >= today_start,
        )
    ).scalar_one_or_none()

    new_unlocked: list[str] = []
    score_applied = False
    if not already_today and success:
        liuyi = dict(user.liuyi or {})
        liuyi["shu"] = min(100, liuyi.get("shu", 0) + she_inc)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        user.xp = (user.xp or 0) + xp_inc
        unlocked = list(user.li_unlocked_refs or [])
        for ref in c.refs or []:
            if ref and ref not in unlocked:
                unlocked.append(ref)
                new_unlocked.append(ref)
        user.li_unlocked_refs = unlocked
        flag_modified(user, "li_unlocked_refs")
        db.add(ShuAnswer(
            user_id=user.id, card_id=card_id,
            chosen_key=f"{body.strokes}笔/{body.duration_ms}ms/{score}分/{grade}",
            correct=True, mode="trace",
        ))
        score_applied = True

    db.commit()
    db.refresh(user)
    return {
        "success": success,
        "score_applied": score_applied,
        "score": score,
        "grade": grade,
        "she_delta": she_inc if score_applied else 0,
        "xp_delta": xp_inc if score_applied else 0,
        "precision": round(body.precision, 3),
        "recall": round(body.recall, 3),
        "card": _card_full(db, c),
        "new_unlocked_refs": [_ref_full(db, r) for r in new_unlocked if _ref_full(db, r)],
        "progress": {
            "liuyi_shu": (user.liuyi or {}).get("shu", 0),
            "xp": user.xp or 0,
        },
    }


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    answers = db.execute(
        select(ShuAnswer).where(ShuAnswer.user_id == user.id)
    ).scalars().all()
    total_answered = len({a.card_id for a in answers})
    correct_card_ids = {a.card_id for a in answers if a.correct}
    correct_count = len(correct_card_ids)
    total_cards = db.execute(
        select(func.count()).select_from(ShuCard)
    ).scalar_one() or 0
    # 学到的字（去重、按答对的）
    learned_chars = []
    for c in db.execute(select(ShuCard).order_by(ShuCard.sort_order)).scalars():
        if c.id in correct_card_ids:
            learned_chars.append({
                "id": c.id, "char": c.char, "pinyin": c.pinyin,
                "benyi": c.benyi, "category": c.category,
                "category_label": CATEGORY_LABELS.get(c.category, c.category),
            })
    shu_score = (user.liuyi or {}).get("shu", 0)
    title = "习书者"
    if shu_score >= 60 and correct_count >= 20: title = "通文达诂"
    elif shu_score >= 30: title = "识字明义"
    elif correct_count >= 10: title = "积学之士"

    # 类别覆盖率
    by_category: dict[str, dict] = {}
    for cat, label in CATEGORY_LABELS.items():
        total_cat = db.execute(
            select(func.count()).select_from(ShuCard).where(ShuCard.category == cat)
        ).scalar_one() or 0
        learned_cat = sum(1 for c in learned_chars if c["category"] == cat)
        by_category[cat] = {
            "label": label,
            "total": total_cat,
            "learned": learned_cat,
        }

    return {
        "liuyi_shu": shu_score,
        "title": title,
        "total_cards": total_cards,
        "answered_cards": total_answered,
        "correct_cards": correct_count,
        "correct_rate": round(correct_count / total_answered, 3) if total_answered else 0,
        "learned_chars": learned_chars,
        "by_category": by_category,
    }


@router.get("/leaderboard")
def leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    # 按 distinct correct card 数排序
    rows = db.execute(
        select(
            User.id,
            User.display_name,
            func.count(func.distinct(case((ShuAnswer.correct == True, ShuAnswer.card_id)))).label("learned"),  # noqa: E712
            func.count(ShuAnswer.id).label("attempts"),
        )
        .join(ShuAnswer, ShuAnswer.user_id == User.id)
        .group_by(User.id)
        .order_by(func.count(func.distinct(case((ShuAnswer.correct == True, ShuAnswer.card_id)))).desc())  # noqa: E712
        .limit(limit)
    ).all()
    items = [
        {
            "rank": i + 1,
            "name": (r.display_name or "君子")[:6],
            "learned": int(r.learned),
            "attempts": int(r.attempts),
        }
        for i, r in enumerate(rows)
    ]
    return {"items": items, "metric": "learned"}

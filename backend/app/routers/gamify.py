from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Favorite, User
from ..services import gamify
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/gamify", tags=["gamify"])


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return gamify.profile(db, user)


@router.post("/checkin")
def checkin(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return gamify.checkin(db, user)


@router.post("/task/{task_id}/complete")
def complete_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return gamify.complete_task(db, user, task_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── 收藏（顺带：收藏满 5 条解锁勋章，也是修行任务之一）──────────────────────
class FavIn(BaseModel):
    target_type: str  # passage | concept
    target_ref: str
    label: str = ""


@router.get("/favorites")
def list_favorites(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list:
    rows = db.execute(
        select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.id.desc())
    ).scalars()
    return [
        {"id": f.id, "type": f.target_type, "ref": f.target_ref, "label": f.label}
        for f in rows
    ]


@router.post("/favorites")
def add_favorite(
    body: FavIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    exists = db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.target_ref == body.target_ref,
            Favorite.target_type == body.target_type,
        )
    ).scalar_one_or_none()
    if not exists:
        db.add(
            Favorite(
                user_id=user.id,
                target_type=body.target_type,
                target_ref=body.target_ref,
                label=body.label,
            )
        )
        db.flush()
        gamify.evaluate_badges(db, user)  # 收藏满 5 条解锁「集萃」
        db.commit()
    return {"ok": True, "profile": gamify.profile(db, user)}


@router.delete("/favorites/{fav_id}")
def remove_favorite(
    fav_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    db.query(Favorite).filter(
        Favorite.id == fav_id, Favorite.user_id == user.id
    ).delete()
    db.commit()
    return {"ok": True}

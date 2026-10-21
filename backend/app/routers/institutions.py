"""机构申请 / 管理员审批 / 机构自助看板。

公开端点：POST /developers/apply   提交申请（demo: 自动审批并发 key）
管理员：    GET/PUT /admin/institutions  审批/挂起/调配额
机构自查：  GET /developers/me   按 X-API-Key 查自己用量
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ApiKey, Institution, User
from ..services.apikey import authenticate, generate_key, stats_for
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["institutions"])


# ── 公开申请（demo: 自动审批以便外接联调）────────────────────────────────────
class ApplyIn(BaseModel):
    name: str
    country: str = ""
    contact_email: str
    purpose: str = ""
    auto_approve: bool = True   # 原型 demo 一键发 key；生产改为 False
    monthly_quota: int = 10_000


@router.post("/developers/apply")
def apply(body: ApplyIn, db: Session = Depends(get_db)) -> dict:
    inst = Institution(
        name=body.name,
        country=body.country,
        contact_email=body.contact_email,
        purpose=body.purpose,
        monthly_quota=body.monthly_quota,
        status="approved" if body.auto_approve else "pending",
        approved_at=datetime.utcnow() if body.auto_approve else None,
        approved_by="auto" if body.auto_approve else None,
    )
    db.add(inst)
    db.flush()

    api_key_value = None
    if body.auto_approve:
        ak = ApiKey(institution_id=inst.id, key=generate_key(), label="default")
        db.add(ak)
        db.flush()
        api_key_value = ak.key

    db.commit()
    return {
        "institution": {
            "id": inst.id,
            "name": inst.name,
            "status": inst.status,
            "monthly_quota": inst.monthly_quota,
        },
        "api_key": api_key_value,
        "message": (
            "已自动审批并生成 API Key（请妥善保管，只显示一次）"
            if body.auto_approve
            else "申请已提交，等待审批。"
        ),
    }


@router.get("/developers/me")
def developer_me(
    db: Session = Depends(get_db), auth=Depends(authenticate)
) -> dict:
    ak, inst = auth
    return {
        "institution": {
            "id": inst.id,
            "name": inst.name,
            "country": inst.country,
            "status": inst.status,
            "monthly_quota": inst.monthly_quota,
        },
        "stats": stats_for(db, inst.id),
        "rate_limit": "60/min",
    }


# ── 管理员 ──────────────────────────────────────────────────────────────────
def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "admin only")
    return user


@router.get("/admin/institutions")
def list_institutions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    stmt = select(Institution).order_by(Institution.id.desc())
    if status:
        stmt = stmt.where(Institution.status == status)
    rows = db.execute(stmt).scalars().all()
    out = []
    for i in rows:
        keys = db.execute(
            select(ApiKey).where(ApiKey.institution_id == i.id)
        ).scalars().all()
        out.append({
            "id": i.id, "name": i.name, "country": i.country,
            "contact_email": i.contact_email, "purpose": i.purpose,
            "status": i.status, "monthly_quota": i.monthly_quota,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "approved_at": i.approved_at.isoformat() if i.approved_at else None,
            "approved_by": i.approved_by,
            "key_count": len(keys),
            "last_used_at": max((k.last_used_at for k in keys if k.last_used_at), default=None),
        })
    return out


class UpdateIn(BaseModel):
    status: Optional[str] = None
    monthly_quota: Optional[int] = None


@router.put("/admin/institutions/{inst_id}")
def update_institution(
    inst_id: int,
    body: UpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict:
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    payload = body.model_dump(exclude_none=True)
    for k, v in payload.items():
        setattr(inst, k, v)
    if "status" in payload and payload["status"] == "approved" and not inst.approved_at:
        inst.approved_at = datetime.utcnow()
        inst.approved_by = user.display_name or user.id
    db.commit()
    return {"id": inst.id, "status": inst.status, "monthly_quota": inst.monthly_quota}


@router.post("/admin/institutions/{inst_id}/keys")
def issue_key(
    inst_id: int,
    label: str = "default",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    ak = ApiKey(institution_id=inst.id, key=generate_key(), label=label)
    db.add(ak)
    db.commit()
    return {"id": ak.id, "key": ak.key, "label": ak.label, "institution_id": inst.id}


@router.delete("/admin/keys/{key_id}")
def revoke_key(
    key_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    ak = db.get(ApiKey, key_id)
    if not ak:
        raise HTTPException(404, "key not found")
    ak.revoked = True
    db.commit()
    return {"ok": True, "id": key_id}

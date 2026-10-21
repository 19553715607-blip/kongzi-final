"""管理端写端点 —— 所有端点 require_admin（无 token→401，非 admin→403）。

设计原则：
- 不改动 app/routers/admin.py 的只读聚合；本文件只追加写能力。
- 所有入参走 Pydantic 校验；危险操作（删用户/删内容/吊销 key）写 AuditLog。
- 管理员不能删除/降级/封禁自己。
- SQLite 兼容：新表由 create_all 建，新列由 db._lightweight_migrations 补。
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Annotation,
    Announcement,
    ApiCall,
    ApiKey,
    AuditLog,
    Book,
    Chapter,
    Concept,
    Contribution,
    Institution,
    LiHostRound,
    MathAnswer,
    PageEvent,
    Passage,
    SiteSetting,
    ShootRound,
    ShuAnswer,
    Translation,
    User,
    YueAnswer,
    YuAnswer,
)
from ..services.apikey import generate_key
from ..services.auth import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin-write"])


# ── 工具 ──────────────────────────────────────────────────────────────────────
def _audit(
    db: Session,
    actor: User,
    action: str,
    target_type: str,
    target_id: Any = None,
    detail: Optional[dict] = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            detail=detail or {},
        )
    )


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _row_dict(obj) -> dict:
    return {
        c.name: (
            getattr(obj, c.name).isoformat() if isinstance(getattr(obj, c.name), datetime) else getattr(obj, c.name)
        )
        for c in obj.__table__.columns
    }


def _user_out(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "display_name": u.display_name,
        "is_guest": u.is_guest,
        "is_admin": u.is_admin,
        "is_banned": bool(getattr(u, "is_banned", False)),
        "lang": u.lang,
        "signup_country": u.signup_country,
        "xp": u.xp,
        "streak_days": u.streak_days,
        "created_at": _iso(u.created_at),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 1. 用户管理
# ══════════════════════════════════════════════════════════════════════════════
class UserPatch(BaseModel):
    display_name: Optional[str] = Field(None, max_length=80)
    is_admin: Optional[bool] = None
    is_banned: Optional[bool] = None


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    body: UserPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "user not found")

    # 禁止管理员降级/封禁自己
    if user_id == admin.id and (body.is_admin is False or body.is_banned is True):
        raise HTTPException(400, "cannot modify your own admin or ban status")

    changed: dict = {}
    action = "update_user"
    if body.display_name is not None:
        name = body.display_name.strip()
        if name:
            u.display_name = name
            changed["display_name"] = name
    if body.is_admin is not None:
        u.is_admin = body.is_admin
        changed["is_admin"] = body.is_admin
        action = "grant_admin" if body.is_admin else "revoke_admin"
    if body.is_banned is not None:
        u.is_banned = body.is_banned
        changed["is_banned"] = body.is_banned
        action = "ban_user" if body.is_banned else "unban_user"

    if not changed:
        return _user_out(u)

    _audit(db, admin, action, "user", user_id, changed)
    db.commit()
    return _user_out(u)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    if user_id == admin.id:
        raise HTTPException(400, "cannot delete yourself")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "user not found")
    _audit(db, admin, "delete_user", "user", user_id, {"email": u.email, "display_name": u.display_name})
    db.delete(u)
    db.commit()
    return {"ok": True, "id": user_id}


# 注意：静态路径必须在 /users/{user_id} 之前注册，避免被动态段捕获。
@router.get("/users/export.csv")
def export_users_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    rows = db.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    buf = io.StringIO()
    buf.write("﻿")  # BOM，便于 Excel 识别 UTF-8
    w = csv.writer(buf)
    w.writerow([
        "id", "email", "display_name", "is_guest", "is_admin",
        "lang", "signup_country", "xp", "streak", "created_at",
    ])
    for u in rows:
        w.writerow([
            u.id, u.email or "", u.display_name,
            int(u.is_guest), int(u.is_admin),
            u.lang, u.signup_country or "", u.xp, u.streak_days,
            (u.created_at.isoformat() if u.created_at else ""),
        ])
    _audit(db, admin, "export_users_csv", "user", None, {"rows": len(rows)})
    db.commit()
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="users_export.csv"'},
    )


@router.get("/users/{user_id}/activity")
def user_activity(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "user not found")

    # PageEvent 埋点分页
    pe_stmt = select(PageEvent).where(PageEvent.user_id == user_id).order_by(PageEvent.ts.desc())
    total = db.scalar(select(func.count()).select_from(pe_stmt.subquery())) or 0
    events = db.execute(
        pe_stmt.offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()

    # 游戏局（六艺）最近记录
    game_tables = {
        "li": LiHostRound, "yue": YueAnswer, "she": ShootRound,
        "yu": YuAnswer, "shu": ShuAnswer, "math": MathAnswer,
    }
    rounds: dict[str, Any] = {}
    for key, model in game_tables.items():
        recents = db.execute(
            select(model).where(model.user_id == user_id).order_by(model.id.desc()).limit(10)
        ).scalars().all()
        cnt = db.scalar(select(func.count()).select_from(model).where(model.user_id == user_id)) or 0
        rounds[key] = {"count": int(cnt), "recent": [_row_dict(r) for r in recents]}

    contribs = db.execute(
        select(Contribution).where(Contribution.user_id == user_id).order_by(Contribution.id.desc()).limit(10)
    ).scalars().all()

    return {
        "user_id": user_id,
        "page": page,
        "page_size": page_size,
        "total_events": int(total),
        "events": [_row_dict(e) for e in events],
        "rounds": rounds,
        "contributions": [_row_dict(c) for c in contribs],
    }


# ══════════════════════════════════════════════════════════════════════════════
# 2. 内容 CRUD
# ══════════════════════════════════════════════════════════════════════════════
def _book_out(b: Book) -> dict:
    return {
        "id": b.id, "title_zh": b.title_zh, "title_i18n": dict(b.title_i18n or {}),
        "author": b.author, "era": b.era, "sort_order": b.sort_order,
        "is_published": bool(b.is_published), "meta": dict(b.meta or {}),
    }


def _chapter_out(c: Chapter) -> dict:
    return {
        "id": c.id, "book_id": c.book_id, "title_zh": c.title_zh,
        "title_i18n": dict(c.title_i18n or {}), "sort_order": c.sort_order,
        "is_published": bool(c.is_published), "meta": dict(c.meta or {}),
    }


def _passage_out(p: Passage) -> dict:
    return {
        "id": p.id, "chapter_id": p.chapter_id, "ref_label": p.ref_label,
        "original_text": p.original_text, "pinyin": p.pinyin,
        "sort_order": p.sort_order, "concepts": list(p.concepts or []),
        "meta": dict(p.meta or {}), "is_published": bool(p.is_published),
    }


def _concept_out(c: Concept) -> dict:
    return {
        "id": c.id, "zh": c.zh, "pinyin": c.pinyin, "i18n": dict(c.i18n or {}),
        "school": c.school, "rarity": c.rarity, "definition": dict(c.definition or {}),
        "related": list(c.related or []), "is_published": bool(c.is_published),
        "meta": dict(c.meta or {}),
    }


def _translation_out(t: Translation) -> dict:
    return {"id": t.id, "passage_id": t.passage_id, "lang": t.lang,
            "text": t.text, "translator": t.translator}


def _annotation_out(a: Annotation) -> dict:
    return {
        "id": a.id, "passage_id": a.passage_id, "type": a.type, "lang": a.lang,
        "source": a.source, "source_i18n": dict(a.source_i18n or {}),
        "content": a.content, "content_i18n": dict(a.content_i18n or {}),
    }


class BookIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    title_zh: str = Field(..., min_length=1)
    title_i18n: dict = {}
    author: Optional[str] = None
    era: Optional[str] = None
    sort_order: int = 0
    is_published: bool = True
    meta: dict = {}


class BookPatch(BaseModel):
    title_zh: Optional[str] = None
    title_i18n: Optional[dict] = None
    author: Optional[str] = None
    era: Optional[str] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None
    meta: Optional[dict] = None


@router.get("/books")
def list_books(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list:
    rows = db.execute(select(Book).order_by(Book.sort_order, Book.id)).scalars().all()
    return [_book_out(b) for b in rows]


@router.post("/books", status_code=201)
def create_book(body: BookIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if db.get(Book, body.id):
        raise HTTPException(400, f"book id already exists: {body.id}")
    b = Book(**body.model_dump())
    db.add(b)
    _audit(db, admin, "create", "book", b.id, {"title_zh": b.title_zh})
    db.commit()
    return _book_out(b)


@router.patch("/books/{book_id}")
def update_book(book_id: str, body: BookPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(404, "book not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(b, k, v)
    _audit(db, admin, "update", "book", book_id, payload)
    db.commit()
    return _book_out(b)


@router.delete("/books/{book_id}")
def delete_book(book_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(404, "book not found")
    n_chapters = db.scalar(select(func.count()).select_from(Chapter).where(Chapter.book_id == book_id)) or 0
    if n_chapters:
        raise HTTPException(400, f"book has {n_chapters} chapters; delete them first")
    _audit(db, admin, "delete", "book", book_id)
    db.delete(b)
    db.commit()
    return {"ok": True, "id": book_id}


class ChapterIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    book_id: str = Field(..., min_length=1)
    title_zh: Optional[str] = None
    title_i18n: dict = {}
    sort_order: int = 0
    is_published: bool = True
    meta: dict = {}


class ChapterPatch(BaseModel):
    title_zh: Optional[str] = None
    title_i18n: Optional[dict] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None
    meta: Optional[dict] = None


@router.get("/chapters")
def list_chapters(
    book_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    stmt = select(Chapter)
    if book_id:
        stmt = stmt.where(Chapter.book_id == book_id)
    rows = db.execute(stmt.order_by(Chapter.sort_order, Chapter.id)).scalars().all()
    return [_chapter_out(c) for c in rows]


@router.post("/chapters", status_code=201)
def create_chapter(body: ChapterIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if db.get(Chapter, body.id):
        raise HTTPException(400, f"chapter id already exists: {body.id}")
    if not db.get(Book, body.book_id):
        raise HTTPException(400, f"book not found: {body.book_id}")
    c = Chapter(**body.model_dump())
    db.add(c)
    _audit(db, admin, "create", "chapter", c.id, {"book_id": c.book_id})
    db.commit()
    return _chapter_out(c)


@router.patch("/chapters/{chapter_id}")
def update_chapter(chapter_id: str, body: ChapterPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    c = db.get(Chapter, chapter_id)
    if not c:
        raise HTTPException(404, "chapter not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(c, k, v)
    _audit(db, admin, "update", "chapter", chapter_id, payload)
    db.commit()
    return _chapter_out(c)


@router.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    c = db.get(Chapter, chapter_id)
    if not c:
        raise HTTPException(404, "chapter not found")
    n_passages = db.scalar(select(func.count()).select_from(Passage).where(Passage.chapter_id == chapter_id)) or 0
    if n_passages:
        raise HTTPException(400, f"chapter has {n_passages} passages; delete them first")
    _audit(db, admin, "delete", "chapter", chapter_id)
    db.delete(c)
    db.commit()
    return {"ok": True, "id": chapter_id}


class PassageIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=192)
    chapter_id: str = Field(..., min_length=1)
    ref_label: Optional[str] = None
    original_text: str = Field(..., min_length=1)
    pinyin: Optional[str] = None
    sort_order: int = 0
    concepts: list = []
    meta: dict = {}
    is_published: bool = True


class PassagePatch(BaseModel):
    ref_label: Optional[str] = None
    original_text: Optional[str] = None
    pinyin: Optional[str] = None
    sort_order: Optional[int] = None
    concepts: Optional[list] = None
    meta: Optional[dict] = None
    is_published: Optional[bool] = None


@router.get("/passages")
def list_passages(
    chapter_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    stmt = select(Passage)
    if chapter_id:
        stmt = stmt.where(Passage.chapter_id == chapter_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(Passage.sort_order, Passage.id).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return {"total": int(total), "page": page, "page_size": page_size, "items": [_passage_out(p) for p in rows]}


@router.post("/passages", status_code=201)
def create_passage(body: PassageIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if db.get(Passage, body.id):
        raise HTTPException(400, f"passage id already exists: {body.id}")
    if not db.get(Chapter, body.chapter_id):
        raise HTTPException(400, f"chapter not found: {body.chapter_id}")
    p = Passage(**body.model_dump())
    db.add(p)
    _audit(db, admin, "create", "passage", p.id, {"chapter_id": p.chapter_id})
    db.commit()
    return _passage_out(p)


@router.patch("/passages/{passage_id}")
def update_passage(passage_id: str, body: PassagePatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    p = db.get(Passage, passage_id)
    if not p:
        raise HTTPException(404, "passage not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(p, k, v)
    _audit(db, admin, "update", "passage", passage_id, list(payload.keys()))
    db.commit()
    return _passage_out(p)


@router.delete("/passages/{passage_id}")
def delete_passage(passage_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    p = db.get(Passage, passage_id)
    if not p:
        raise HTTPException(404, "passage not found")
    n_tr = db.scalar(select(func.count()).select_from(Translation).where(Translation.passage_id == passage_id)) or 0
    n_an = db.scalar(select(func.count()).select_from(Annotation).where(Annotation.passage_id == passage_id)) or 0
    if n_tr or n_an:
        raise HTTPException(400, f"passage has {n_tr} translations / {n_an} annotations; remove them first")
    _audit(db, admin, "delete", "passage", passage_id)
    db.delete(p)
    db.commit()
    return {"ok": True, "id": passage_id}


class ConceptIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    zh: str = Field(..., min_length=1)
    pinyin: Optional[str] = None
    i18n: dict = {}
    school: Optional[str] = None
    rarity: str = "normal"
    definition: dict = {}
    related: list = []
    is_published: bool = True
    meta: dict = {}


class ConceptPatch(BaseModel):
    zh: Optional[str] = None
    pinyin: Optional[str] = None
    i18n: Optional[dict] = None
    school: Optional[str] = None
    rarity: Optional[str] = None
    definition: Optional[dict] = None
    related: Optional[list] = None
    is_published: Optional[bool] = None
    meta: Optional[dict] = None


@router.get("/concepts")
def list_concepts(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    stmt = select(Concept)
    if q:
        stmt = stmt.where(Concept.zh.like(f"%{q}%"))
    rows = db.execute(stmt.order_by(Concept.id)).scalars().all()
    return [_concept_out(c) for c in rows]


@router.post("/concepts", status_code=201)
def create_concept(body: ConceptIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if db.get(Concept, body.id):
        raise HTTPException(400, f"concept id already exists: {body.id}")
    c = Concept(**body.model_dump())
    db.add(c)
    _audit(db, admin, "create", "concept", c.id, {"zh": c.zh})
    db.commit()
    return _concept_out(c)


@router.patch("/concepts/{concept_id}")
def update_concept(concept_id: str, body: ConceptPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    c = db.get(Concept, concept_id)
    if not c:
        raise HTTPException(404, "concept not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(c, k, v)
    _audit(db, admin, "update", "concept", concept_id, list(payload.keys()))
    db.commit()
    return _concept_out(c)


@router.delete("/concepts/{concept_id}")
def delete_concept(concept_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    c = db.get(Concept, concept_id)
    if not c:
        raise HTTPException(404, "concept not found")
    _audit(db, admin, "delete", "concept", concept_id)
    db.delete(c)
    db.commit()
    return {"ok": True, "id": concept_id}


# ── 译文 / 注译（按 passage）──────────────────────────────────────────────────
class TranslationIn(BaseModel):
    lang: str = Field(..., min_length=1, max_length=16)
    text: str = Field(..., min_length=1)
    translator: Optional[str] = None


class TranslationPatch(BaseModel):
    lang: Optional[str] = None
    text: Optional[str] = None
    translator: Optional[str] = None


@router.get("/passages/{passage_id}/translations")
def list_translations(passage_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list:
    rows = db.execute(
        select(Translation).where(Translation.passage_id == passage_id)
    ).scalars().all()
    return [_translation_out(t) for t in rows]


@router.post("/passages/{passage_id}/translations", status_code=201)
def create_translation(passage_id: str, body: TranslationIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if not db.get(Passage, passage_id):
        raise HTTPException(404, "passage not found")
    t = Translation(passage_id=passage_id, **body.model_dump())
    db.add(t)
    _audit(db, admin, "create", "translation", t.id, {"passage_id": passage_id, "lang": t.lang})
    db.commit()
    return _translation_out(t)


@router.patch("/translations/{tr_id}")
def update_translation(tr_id: int, body: TranslationPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    t = db.get(Translation, tr_id)
    if not t:
        raise HTTPException(404, "translation not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(t, k, v)
    _audit(db, admin, "update", "translation", tr_id)
    db.commit()
    return _translation_out(t)


@router.delete("/translations/{tr_id}")
def delete_translation(tr_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    t = db.get(Translation, tr_id)
    if not t:
        raise HTTPException(404, "translation not found")
    _audit(db, admin, "delete", "translation", tr_id)
    db.delete(t)
    db.commit()
    return {"ok": True, "id": tr_id}


class AnnotationIn(BaseModel):
    type: str = Field(..., min_length=1)  # classical|modern|word
    lang: str = "zh"
    source: Optional[str] = None
    source_i18n: dict = {}
    content: str = Field(..., min_length=1)
    content_i18n: dict = {}


class AnnotationPatch(BaseModel):
    type: Optional[str] = None
    lang: Optional[str] = None
    source: Optional[str] = None
    source_i18n: Optional[dict] = None
    content: Optional[str] = None
    content_i18n: Optional[dict] = None


@router.get("/passages/{passage_id}/annotations")
def list_annotations(passage_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list:
    rows = db.execute(
        select(Annotation).where(Annotation.passage_id == passage_id)
    ).scalars().all()
    return [_annotation_out(a) for a in rows]


@router.post("/passages/{passage_id}/annotations", status_code=201)
def create_annotation(passage_id: str, body: AnnotationIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    if not db.get(Passage, passage_id):
        raise HTTPException(404, "passage not found")
    a = Annotation(passage_id=passage_id, **body.model_dump())
    db.add(a)
    _audit(db, admin, "create", "annotation", a.id, {"passage_id": passage_id, "type": a.type})
    db.commit()
    return _annotation_out(a)


@router.patch("/annotations/{an_id}")
def update_annotation(an_id: int, body: AnnotationPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    a = db.get(Annotation, an_id)
    if not a:
        raise HTTPException(404, "annotation not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(a, k, v)
    _audit(db, admin, "update", "annotation", an_id)
    db.commit()
    return _annotation_out(a)


@router.delete("/annotations/{an_id}")
def delete_annotation(an_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    a = db.get(Annotation, an_id)
    if not a:
        raise HTTPException(404, "annotation not found")
    _audit(db, admin, "delete", "annotation", an_id)
    db.delete(a)
    db.commit()
    return {"ok": True, "id": an_id}


# ══════════════════════════════════════════════════════════════════════════════
# 3. 游戏局
# ══════════════════════════════════════════════════════════════════════════════
_GAME_MODELS: dict[str, Any] = {
    "li": LiHostRound,
    "yue": YueAnswer,
    "she": ShootRound,
    "yu": YuAnswer,
    "shu": ShuAnswer,
    "math": MathAnswer,
}


@router.get("/games/rounds")
def list_game_rounds(
    game: str = Query(..., pattern="^(li|yue|she|yu|shu|math)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    model = _GAME_MODELS[game]
    stmt = select(model).order_by(model.id.desc())
    total = db.scalar(select(func.count()).select_from(model)) or 0
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {"game": game, "total": int(total), "page": page, "page_size": page_size,
            "items": [_row_dict(r) for r in rows]}


@router.delete("/games/rounds/{game}/{round_id}")
def delete_game_round(
    game: str,
    round_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    if game not in _GAME_MODELS:
        raise HTTPException(400, f"unknown game: {game}")
    model = _GAME_MODELS[game]
    row = db.get(model, round_id)
    if not row:
        raise HTTPException(404, "round not found")
    _audit(db, admin, "delete", f"game_round_{game}", round_id)
    db.delete(row)
    db.commit()
    return {"ok": True, "game": game, "id": round_id}


# ══════════════════════════════════════════════════════════════════════════════
# 4. 案例 / 共创 审核
# ══════════════════════════════════════════════════════════════════════════════
# 对外词汇 approved/rejected/needs_revision/draft → 库内既有 status 词汇
_CASE_STATUS_MAP = {
    "approved": "published",
    "rejected": "rejected",
    "needs_revision": "reviewed",
    "draft": "draft",
}


class CaseReviewIn(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected|needs_revision|draft)$")
    reviewer_note: Optional[str] = None


@router.patch("/cases/{case_id}/review")
def review_case(
    case_id: int,
    body: CaseReviewIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    from ..models import DialogCase  # 局部导入避免顶部膨胀

    c = db.get(DialogCase, case_id)
    if not c:
        raise HTTPException(404, "case not found")
    c.status = _CASE_STATUS_MAP[body.status]
    if body.reviewer_note is not None:
        c.review_note = body.reviewer_note
    c.reviewer = admin.display_name or admin.id
    c.reviewed_at = datetime.utcnow()
    _audit(db, admin, "review_case", "case", case_id, {"status": c.status})
    db.commit()
    return {
        "id": c.id, "status": c.status, "reviewer": c.reviewer,
        "reviewed_at": _iso(c.reviewed_at), "review_note": c.review_note,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 5. 机构与密钥
# ══════════════════════════════════════════════════════════════════════════════
class InstitutionIn(BaseModel):
    name: str = Field(..., min_length=1)
    country: str = ""
    contact_email: str = Field(..., min_length=1)
    purpose: str = ""
    monthly_quota: int = 10_000
    status: str = "pending"  # pending|approved|suspended|rejected


class InstitutionPatch(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    contact_email: Optional[str] = None
    purpose: Optional[str] = None
    monthly_quota: Optional[int] = None
    status: Optional[str] = None


@router.post("/institutions", status_code=201)
def create_institution(body: InstitutionIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    inst = Institution(**body.model_dump())
    if inst.status == "approved":
        inst.approved_at = datetime.utcnow()
        inst.approved_by = admin.display_name or admin.id
    db.add(inst)
    db.flush()
    _audit(db, admin, "create", "institution", inst.id, {"name": inst.name})
    db.commit()
    return {"id": inst.id, "name": inst.name, "status": inst.status}


@router.patch("/institutions/{inst_id}")
def update_institution(inst_id: int, body: InstitutionPatch, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(inst, k, v)
    if payload.get("status") == "approved" and not inst.approved_at:
        inst.approved_at = datetime.utcnow()
        inst.approved_by = admin.display_name or admin.id
    _audit(db, admin, "update", "institution", inst_id, payload)
    db.commit()
    return {"id": inst.id, "status": inst.status}


@router.delete("/institutions/{inst_id}")
def delete_institution(inst_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    keys = db.execute(select(ApiKey).where(ApiKey.institution_id == inst_id)).scalars().all()
    active = [k for k in keys if not k.revoked]
    if active:
        raise HTTPException(400, f"institution has {len(active)} active api keys; revoke them first")
    _audit(db, admin, "delete", "institution", inst_id, {"name": inst.name})
    db.delete(inst)
    db.commit()
    return {"ok": True, "id": inst_id}


class IssueKeyIn(BaseModel):
    label: str = "default"


@router.post("/institutions/{inst_id}/keys", status_code=201)
def issue_key(inst_id: int, body: IssueKeyIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    """发新 Key，明文仅返回这一次。（与 institutions.py 既有同名端点互补，走管理写审计。）"""
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    ak = ApiKey(institution_id=inst.id, key=generate_key(), label=body.label)
    db.add(ak)
    db.flush()
    _audit(db, admin, "issue_key", "api_key", ak.id, {"institution_id": inst_id, "label": body.label})
    db.commit()
    return {"id": ak.id, "key": ak.key, "label": ak.label, "institution_id": inst.id}


@router.delete("/institutions/keys/{key_id}")
def revoke_key(key_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    ak = db.get(ApiKey, key_id)
    if not ak:
        raise HTTPException(404, "key not found")
    ak.revoked = True
    _audit(db, admin, "revoke_key", "api_key", key_id, {"institution_id": ak.institution_id})
    db.commit()
    return {"ok": True, "id": key_id, "revoked": True}


@router.get("/institutions/{inst_id}/usage")
def institution_usage(
    inst_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    inst = db.get(Institution, inst_id)
    if not inst:
        raise HTTPException(404, "institution not found")
    total = db.scalar(select(func.count()).select_from(ApiCall).where(ApiCall.institution_id == inst_id)) or 0
    avg_lat = db.scalar(select(func.avg(ApiCall.latency_ms)).where(ApiCall.institution_id == inst_id))
    last7 = db.scalar(
        select(func.count()).select_from(ApiCall).where(
            ApiCall.institution_id == inst_id,
            ApiCall.ts >= func.datetime("now", "-7 days"),
        )
    ) or 0
    return {
        "institution_id": inst_id,
        "total_calls": int(total),
        "calls_last_7d": int(last7),
        "avg_latency_ms": float(avg_lat or 0.0),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. 互动：投稿审核 + 站点公告
# ══════════════════════════════════════════════════════════════════════════════
class ModerateIn(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")


@router.patch("/contributions/{cid}/moderate")
def moderate_contribution(
    cid: int,
    body: ModerateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    c = db.get(Contribution, cid)
    if not c:
        raise HTTPException(404, "contribution not found")
    c.status = "published" if body.status == "approved" else "rejected"
    c.reviewer = admin.display_name or admin.id
    c.reviewed_at = datetime.utcnow()
    _audit(db, admin, "moderate_contribution", "contribution", cid, {"status": c.status})
    db.commit()
    return {"id": c.id, "status": c.status, "reviewer": c.reviewer, "reviewed_at": _iso(c.reviewed_at)}


class AnnouncementIn(BaseModel):
    title: str = ""
    body: str = Field(..., min_length=1)
    lang: str = "zh"
    active: bool = True


@router.post("/announcements", status_code=201)
def create_announcement(
    body: AnnouncementIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    a = Announcement(**body.model_dump())
    db.add(a)
    db.flush()
    _audit(db, admin, "create", "announcement", a.id, {"title": a.title})
    db.commit()
    return {"id": a.id, "title": a.title, "body": a.body, "lang": a.lang, "active": a.active}


# ══════════════════════════════════════════════════════════════════════════════
# 7. 站点设置 + 审计日志
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    rows = db.execute(select(SiteSetting)).scalars().all()
    return {row.key: row.value for row in rows}


class SettingsPutIn(BaseModel):
    # 前端按扁平 KV 提交（与 GET /admin/settings 的信封一致）；
    # 兼容旧的 { "values": {...} } 包裹写法。
    values: Optional[dict] = None

    model_config = {"extra": "allow"}


@router.put("/settings")
def put_settings(
    body: SettingsPutIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    # 扁平 KV：直接把 body 的每个键合并进 SiteSetting；
    # 若客户端仍用 { "values": {...} } 包裹，则解包 values。
    if isinstance(body.values, dict):
        incoming = dict(body.values)
    else:
        incoming = body.model_dump(exclude_unset=True)
    incoming.pop("values", None)
    for k, v in incoming.items():
        row = db.get(SiteSetting, k)
        if row:
            row.value = v
        else:
            db.add(SiteSetting(key=k, value=v))
    _audit(db, admin, "update_settings", "settings", None, {"keys": list(incoming.keys())})
    db.commit()
    rows = db.execute(select(SiteSetting)).scalars().all()
    return {row.key: row.value for row in rows}


@router.get("/audit-log")
def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    stmt = select(AuditLog).order_by(AuditLog.id.desc())
    total = db.scalar(select(func.count()).select_from(AuditLog)) or 0
    rows = db.execute(
        stmt.offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return {
        "total": int(total), "page": page, "page_size": page_size,
        "items": [_row_dict(r) for r in rows],
    }

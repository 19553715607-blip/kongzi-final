from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Concept
from ..schemas import ConceptOut

router = APIRouter(prefix="/api/v1", tags=["concepts"])


def _to_out(c: Concept) -> ConceptOut:
    return ConceptOut(
        id=c.id,
        zh=c.zh,
        pinyin=c.pinyin,
        i18n=c.i18n or {},
        school=c.school,
        rarity=c.rarity,
        definition=c.definition or {},
        related=list(c.related or []),
    )


@router.get("/concepts", response_model=List[ConceptOut])
def list_concepts(
    school: Optional[str] = Query(None),
    rarity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> List[ConceptOut]:
    stmt = select(Concept)
    if school:
        stmt = stmt.where(Concept.school == school)
    if rarity:
        stmt = stmt.where(Concept.rarity == rarity)
    return [_to_out(c) for c in db.execute(stmt).scalars().all()]


@router.get("/concepts/{concept_id}", response_model=ConceptOut)
def get_concept(concept_id: str, db: Session = Depends(get_db)) -> ConceptOut:
    c = db.get(Concept, concept_id)
    if not c:
        raise HTTPException(404, f"concept {concept_id} not found")
    return _to_out(c)

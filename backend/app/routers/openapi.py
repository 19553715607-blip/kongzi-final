"""开放接口 (公开给海外机构使用)。

所有 /api/v1/public/* 路径需 X-API-Key 鉴权。
对外暴露的能力是平台核心功能的精选子集：
- search   语义检索
- passages 经典原文五层信息
- topics   全球议题 + 跨文明立场
- concepts 概念释义
- cases    跨文明对话案例
- corpus   语料统计（机构内部参考）
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..services import topics as topics_svc
from ..services.apikey import authenticate
from . import cases as cases_router
from . import content as content_router
from . import corpus as corpus_router

router = APIRouter(prefix="/api/v1/public", tags=["public-api"])


@router.get("/whoami")
def whoami(auth=Depends(authenticate)) -> dict:
    ak, inst = auth
    return {
        "institution": {"id": inst.id, "name": inst.name, "country": inst.country},
        "api_key": {"id": ak.id, "label": ak.label},
        "quota_month": inst.monthly_quota,
    }


@router.get("/search")
def public_search(
    q: str = Query(..., min_length=1),
    lang: str = Query("zh"),
    k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return content_router.search(q=q, lang=lang, k=k, db=db)


@router.get("/passages/{ref_id}")
def public_passage(
    ref_id: str,
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return content_router.get_passage(ref_id=ref_id, lang=lang, db=db)


@router.get("/topics")
def public_topics(
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return topics_svc.list_topics(db, lang)


@router.get("/topics/{topic_id}")
def public_topic(
    topic_id: str,
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    card = topics_svc.topic_card(db, topic_id, lang)
    if not card:
        raise HTTPException(404, f"topic {topic_id} not found")
    return {**card, "cross_civ_views": topics_svc.views_for(db, topic_id, lang)}


@router.get("/cases")
def public_cases(
    topic_id: Optional[str] = Query(None),
    lang: str = Query("zh"),
    status: str = Query("published"),  # 公开 API 默认只返 published
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return cases_router.list_cases(
        topic_id=topic_id, lang=lang, status=status, q=None,
        page=page, page_size=page_size, db=db,
    )


@router.get("/cases/{case_id}")
def public_case(
    case_id: int,
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return cases_router.get_case(case_id=case_id, db=db)


@router.get("/corpus/stats")
def public_corpus(
    db: Session = Depends(get_db),
    auth=Depends(authenticate),
):
    return corpus_router.stats(db=db)

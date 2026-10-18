"""语料统计接口 — 量化展示申报书目标①「标注训练高质量语料 ≥10 万条」的进度。

口径定义（项目内部）：
1 条语料 = 1 条独立可追溯、可索引、可学习的高质量标注单元。包括但不限于：
- 经典原文（passages）
- 拼音 / 注释
- 多语译文（每语 1 条）
- 概念定义（每语 1 条）
- 跨文明立场 headline / detail（每语 1 条）
- 议题描述（每语 1 条）
- 跨文明对话案例（含 5 语对照）

目标 100 000；原型先证明管线可扩展。
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Annotation,
    Concept,
    CrossCivView,
    DialogCase,
    Passage,
    Topic,
    Translation,
)

router = APIRouter(prefix="/api/v1/corpus", tags=["corpus"])

TARGET = 100_000


def _count(db: Session, stmt) -> int:
    return db.execute(stmt).scalar_one() or 0


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    # 各类基础语料
    n_passages = _count(db, select(func.count()).select_from(Passage))
    n_passages_pinyin = _count(
        db, select(func.count()).select_from(Passage).where(Passage.pinyin.isnot(None))
    )
    n_translations = _count(db, select(func.count()).select_from(Translation))
    n_annotations = _count(db, select(func.count()).select_from(Annotation))
    n_concepts = _count(db, select(func.count()).select_from(Concept))
    n_civ_views = _count(db, select(func.count()).select_from(CrossCivView))
    n_topics = _count(db, select(func.count()).select_from(Topic))
    n_cases = _count(db, select(func.count()).select_from(DialogCase))

    # 概念多语定义：用 JSON 字段语言数累加（粗估，跨方言不去重）
    concept_def_units = 0
    concept_i18n_units = 0
    for c in db.execute(select(Concept)).scalars():
        concept_def_units += len(c.definition or {})
        concept_i18n_units += len(c.i18n or {})

    # 跨文明立场 headline / detail 多语
    civ_headline_units = 0
    civ_detail_units = 0
    for v in db.execute(select(CrossCivView)).scalars():
        civ_headline_units += len(v.headline or {})
        civ_detail_units += sum(1 for x in (v.detail or {}).values() if x)

    # 议题多语
    topic_i18n_units = 0
    topic_desc_units = 0
    for t in db.execute(select(Topic)).scalars():
        topic_i18n_units += len(t.name_i18n or {})
        topic_desc_units += len(t.description or {})

    # 案例：每条计 1，每个跨文明 headline_i18n 多语条目 1 单元；每经典引用 1 单元；每标签 1 单元
    case_units = n_cases
    case_civ_units = 0
    case_civ_i18n_units = 0
    case_citation_units = 0
    case_citation_i18n_units = 0
    case_tag_units = 0
    case_question_i18n_units = 0
    for c in db.execute(select(DialogCase)).scalars():
        for v in (c.cross_civ_views or []):
            case_civ_units += 1
            case_civ_i18n_units += len(
                {k: v for k, v in (v.get("headline_i18n") or {}).items() if v}
            )
        for cit in (c.citations or []):
            case_citation_units += 1
            if isinstance(cit, dict):
                case_citation_i18n_units += len(cit.get("ref_label_i18n") or {})
        case_tag_units += len(c.tags or [])
        case_question_i18n_units += len(c.question_i18n or {})

    # 注释多语 i18n
    anno_i18n_units = 0
    for a in db.execute(select(Annotation)).scalars():
        anno_i18n_units += len(a.content_i18n or {})

    # 语言覆盖
    langs = sorted(
        {
            row[0]
            for row in db.execute(select(Translation.lang).distinct())
        }
    )

    # 汇总
    breakdown = {
        "经典原文": n_passages,
        "拼音标注": n_passages_pinyin,
        "多语译文": n_translations,
        "注释（传统+现代）": n_annotations,
        "注释多语扩展": anno_i18n_units,
        "概念条目": n_concepts,
        "概念多语术语": concept_i18n_units,
        "概念多语定义": concept_def_units,
        "全球议题": n_topics,
        "议题多语名称": topic_i18n_units,
        "议题多语描述": topic_desc_units,
        "跨文明立场（headline）": civ_headline_units,
        "跨文明立场（论证）": civ_detail_units,
        "跨文明对话案例（条）": case_units,
        "案例文明对照单元": case_civ_units,
        "案例文明多语单元": case_civ_i18n_units,
        "案例经典引用单元": case_citation_units,
        "案例引用多语标签": case_citation_i18n_units,
        "案例多语标签": case_tag_units,
        "案例问题多语真译": case_question_i18n_units,
    }
    total = sum(breakdown.values())

    return {
        "target": TARGET,
        "total": total,
        "progress": round(total / TARGET, 4),
        "languages": langs,
        "language_count": len(langs),
        "breakdown": breakdown,
    }

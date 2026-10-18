"""对话编排（智能体核心的 Stage 1 落地）。

实现「路由 → 检索 → 合成 → 校验 → 终端适配/追问」的流水线，
并以 (event, data) 形式产出，对应前端的 SSE 事件：
  agents / token / citation / verify / followups / done

进入 Stage 3 时，可把本文件替换为 LangGraph StateGraph，
节点逻辑（route/retrieve/synthesize/verify/followups）一一对应。
"""
from __future__ import annotations

from typing import AsyncIterator, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models import Concept
from .llm import get_llm
from .retrieval import Evidence, retrieve
from . import topics as topics_svc

Event = Tuple[str, object]

SYSTEM_PROMPT = (
    "你是儒家经典智能助手。只能依据提供的 EVIDENCE 作答，"
    "每个论断都要紧扣原文，不得编造出处。"
    "区分『原文本义』与『现代发挥』。语气克制、不说教。"
)


def _route(message: str, lang: str, device: str, topic_id: Optional[str]) -> Dict:
    """轻量路由：决定本次激活哪些智能体。Stage 1 用规则，Stage 3 换小模型。"""
    agents = ["router", "retrieval", "synthesizer", "verifier"]
    if topic_id:
        agents.insert(3, "topic_engine")
        agents.insert(4, "cross_civilization")
    if lang != "zh":
        agents.insert(-1, "translator")
        agents.insert(-1, "cross_culture")
    return {"agents": agents, "need_translation": lang != "zh"}


def _build_prompt(
    message: str,
    evidence: List[Evidence],
    lang: str,
    topic: Optional[dict] = None,
) -> str:
    lines = [f"QUESTION: {message}"]
    if topic:
        lines.append(f"TOPIC: {topic['name']} — {topic['description']}")
        lines.append(
            "TASK: 先用「儒家价值推理」分析，再点出与之相关的儒家概念与经典依据。"
        )
    lines.append("")
    lines.append("EVIDENCE:")
    for i, ev in enumerate(evidence, 1):
        trans = f" / 译: {ev.translation}" if ev.translation else ""
        lines.append(f"[{i}] 《{ev.ref_label}》{ev.original_text}{trans}")
    lines.append("")
    lines.append(f"请用 {lang} 作答，引用证据时标注 [编号]。")
    return "\n".join(lines)


def _verify(answer: str, evidence: List[Evidence]) -> Dict[str, float]:
    """校验：估算三项评分（文本依据 / 现代发挥 / 文化适配）。

    Stage 1 用启发式；Stage 3 换成约束式 LLM 核对每条主张的出处真实性。
    """
    textual = min(1.0, 0.5 + 0.12 * len(evidence)) if evidence else 0.2
    modern = 0.7
    cultural = 0.8
    return {
        "textual": round(textual, 2),
        "modern": round(modern, 2),
        "cultural": round(cultural, 2),
    }


_FOLLOWUP_TEMPLATES = {
    "zh": (
        "「{a}」在不同篇章里有什么差别？",
        "「{a}」和「{b}」是什么关系？",
        "这句话放到现代生活里该怎么理解？",
    ),
    "en": (
        "How does \u201c{a}\u201d differ across chapters?",
        "What is the relationship between \u201c{a}\u201d and \u201c{b}\u201d?",
        "How should this be understood in modern life?",
    ),
    "fr": (
        "Comment \u00ab {a} \u00bb varie-t-il d'un chapitre \u00e0 l'autre ?",
        "Quel est le rapport entre \u00ab {a} \u00bb et \u00ab {b} \u00bb ?",
        "Comment comprendre cette phrase dans la vie moderne ?",
    ),
    "es": (
        "\u00bfEn qu\u00e9 difiere \u00ab{a}\u00bb entre cap\u00edtulos?",
        "\u00bfQu\u00e9 relaci\u00f3n hay entre \u00ab{a}\u00bb y \u00ab{b}\u00bb?",
        "\u00bfC\u00f3mo deber\u00eda entenderse esto en la vida moderna?",
    ),
    "ar": (
        "\u0643\u064a\u0641 \u064a\u062e\u062a\u0644\u0641 \u00ab{a}\u00bb \u0628\u064a\u0646 \u0627\u0644\u0641\u0635\u0648\u0644\u061f",
        "\u0645\u0627 \u0627\u0644\u0639\u0644\u0627\u0642\u0629 \u0628\u064a\u0646 \u00ab{a}\u00bb \u0648\u00ab{b}\u00bb\u061f",
        "\u0643\u064a\u0641 \u064a\u064f\u0641\u0647\u0645 \u0647\u0630\u0627 \u0627\u0644\u0642\u0648\u0644 \u0641\u064a \u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0645\u0639\u0627\u0635\u0631\u0629\u061f",
    ),
}


def _concept_term(db: Session, cid: str, lang: str) -> str:
    c = db.get(Concept, cid)
    if not c:
        return cid
    if lang == "zh":
        return c.zh
    return (c.i18n or {}).get(lang) or c.zh


def _followups(db: Session, evidence: List[Evidence], lang: str) -> List[str]:
    concepts: List[str] = []
    for ev in evidence:
        for c in ev.concepts:
            if c not in concepts:
                concepts.append(c)
    t1, t2, t3 = _FOLLOWUP_TEMPLATES.get(lang, _FOLLOWUP_TEMPLATES["zh"])
    suggestions: List[str] = []
    if concepts:
        a = _concept_term(db, concepts[0], lang)
        suggestions.append(t1.format(a=a))
    if len(concepts) >= 2:
        b = _concept_term(db, concepts[1], lang)
        suggestions.append(t2.format(a=_concept_term(db, concepts[0], lang), b=b))
    suggestions.append(t3)
    return suggestions[:3]


async def run_chat(
    db: Session,
    message: str,
    lang: str = "zh",
    device: str = "web",
    topic_hint: Optional[str] = None,
) -> AsyncIterator[Event]:
    # 0) 议题分类（路由前判断）
    topic_id = topics_svc.classify(db, message, hint=topic_hint)
    topic_card = topics_svc.topic_card(db, topic_id, lang) if topic_id else None

    # 1) 路由：点亮智能体（前端状态条/色点）
    plan = _route(message, lang, device, topic_id)
    yield ("agents", {"active": plan["agents"]})

    if topic_card:
        yield ("topic", topic_card)

    # 2) 检索：召回证据并推送经典卡片
    evidence = retrieve(db, message, lang=lang, k=5)
    for ev in evidence:
        yield (
            "citation",
            {
                "ref_id": ev.ref_id,
                "book": ev.book,
                "chapter": ev.chapter,
                "ref_label": ev.ref_label,
                "text": ev.original_text,
            },
        )

    # 3) 合成：流式生成正文（识别到议题时附议题语境）
    prompt = _build_prompt(message, evidence, lang, topic_card)
    llm = get_llm()
    answer_chunks: List[str] = []
    async for chunk in llm.stream(SYSTEM_PROMPT, prompt):
        answer_chunks.append(chunk)
        yield ("token", {"text": chunk})
    answer = "".join(answer_chunks)

    # 4) 校验：三项评分（前端校验徽章）
    scores = _verify(answer, evidence)
    yield ("verify", scores)

    # 5) 跨文明对照（识别到议题时）
    cross_civ_views: List[dict] = []
    if topic_id:
        cross_civ_views = topics_svc.views_for(db, topic_id, lang)
        yield ("cross_civ", {"topic_id": topic_id, "views": cross_civ_views})

    # 6) 追问推荐（前端 chips）
    yield ("followups", _followups(db, evidence, lang))

    # 7) 收尾
    yield (
        "done",
        {
            "answer": answer,
            "citations": [ev.ref_id for ev in evidence],
            "agents_used": plan["agents"],
            "verify_scores": scores,
            "topic_id": topic_id,
            "cross_civ_count": len(cross_civ_views),
        },
    )

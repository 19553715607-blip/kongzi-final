"""经典检索（RAG 的 R）。

两种后端：
- vector：Chroma 向量召回（跨语言语义检索），由 `services/vector_store` 提供。
- keyword：关键词重叠打分（零依赖兜底，也用于评测对照）。

对外入口 `retrieve()` 签名稳定，orchestrator 不感知后端切换。
`settings.retrieval_backend = auto|vector|keyword`：
  auto → 向量库已建好则用向量，否则降级关键词。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..models import Concept, Passage

settings = get_settings()


@dataclass
class Evidence:
    ref_id: str
    book: str
    chapter: str
    ref_label: str
    original_text: str
    translation: str
    concepts: List[str]
    score: float


# ── 关键词后端 ────────────────────────────────────────────────────────────────
_NOISE = set("，。！？、；：「」『』《》（）()和的是了吗呢啊什么怎么如何 \t\n")

# 概念的额外别名（转写 / 常见异译），补充 Concept.i18n 已列的标准术语。
# 键=概念 id，值={语言:[别名小写…]}；命中别名即按该概念扩展到标准术语。
_CONCEPT_ALIASES: Dict[str, Dict[str, List[str]]] = {
    "ren": {
        "en": ["jen", "benevolence", "humanity", "humaneness", "kindness"],
        "fr": ["jen", "bienveillance", "humanité", "charité", "altruisme"],
        "es": ["jen", "benevolencia", "humanidad", "bondad", "caridad"],
        "ar": ["الرين", "رين", "الإحسان", "إحسان", "جين", "محبة", "المحبة"],
    },
    "li": {
        "en": ["rites", "ritual", "etiquette", "propriety"],
        "fr": ["rites", "rituel", "étiquette", "bienséance"],
        "es": ["ritos", "ritual", "etiqueta", "decoro"],
        "ar": ["الطقوس", "طقوس", "اللياقة", "الآداب", "أدب"],
    },
    "yi": {
        "en": ["rightness", "justice", "morality"],
        "fr": ["justice", "droiture", "moralité"],
        "es": ["justicia", "rectitud", "moralidad"],
        "ar": ["عدل", "العدل", "استقامة", "حق", "بر"],
    },
    "xiao": {
        "en": ["filiality", "filial duty"],
        "fr": ["piété", "dévouement filial"],
        "es": ["filialidad", "piedad"],
        "ar": ["بر الوالدين", "برّ", "البر", "عقوق"],
    },
    "xin": {
        "en": ["trust", "good faith", "sincerity", "faithfulness"],
        "fr": ["confiance", "foi", "fidélité"],
        "es": ["confianza", "fe", "fidelidad", "sinceridad"],
        "ar": ["ثقة", "الثقة", "أمانة", "الأمانة", "إيمان", "صدق"],
    },
    "zhi": {
        "en": ["wisdom", "intelligence"],
        "fr": ["sagesse", "intelligence"],
        "es": ["sabiduría", "inteligencia"],
        "ar": ["حكمة", "الحكمة", "عقل", "العقل"],
    },
    "dao": {
        "en": ["way", "path", "tao"],
        "fr": ["voie", "chemin", "tao"],
        "es": ["camino", "sendero", "tao"],
        "ar": ["طريق", "الطريق", "سبيل", "السبيل"],
    },
    "de": {
        "en": ["virtue", "moral character", "power"],
        "fr": ["vertu", "caractère moral"],
        "es": ["virtud", "carácter moral"],
        "ar": ["فضيلة", "الفضيلة", "أخلاق", "الأخلاق"],
    },
    "junzi": {
        "en": ["noble person", "superior person"],
        "fr": ["homme noble", "sage"],
        "es": ["noble", "caballero", "hombre noble"],
        "ar": ["الإنسان الفاضل", "رجل فاضل", "حكيم"],
    },
    "zhong": {
        "en": ["loyalty", "devotion"],
        "fr": ["loyauté", "dévouement"],
        "es": ["lealtad", "dedicación"],
        "ar": ["إخلاص", "الإخلاص", "ولاء"],
    },
    "shu": {
        "en": ["empathy", "reciprocity", "consideration"],
        "fr": ["empathie", "réciprocité", "considération"],
        "es": ["empatia", "reciprocidad", "consideración"],
        "ar": ["تعاطف", "التعاطف", "تبادلية", "المعاملة بالمثل"],
    },
    "he": {
        "en": ["harmony", "concord"],
        "fr": ["harmonie", "concorde"],
        "es": ["armonía", "concordia"],
        "ar": ["وئام", "الوئام", "انسجام", "تناغم"],
    },
    "jing": {
        "en": ["reverence", "respect"],
        "fr": ["révérence", "respect"],
        "es": ["reverencia", "respeto"],
        "ar": ["احترام", "الاحترام", "توقير", "تبجيل"],
    },
    "zhongyong": {
        "en": ["doctrine of the mean", "middle way"],
        "fr": ["juste milieu", "milieu"],
        "es": ["justo medio", "camino medio"],
        "ar": ["الاعتدال", "التوسط", "الوسطية"],
    },
}


def _concept_index(db: Session, lang: str, q_words: set, qtext: str):
    """返回 (命中概念 id 集合, 扩展匹配词集合)：把用户的别名/转写映射到标准术语。"""
    hit_ids: set = set()
    extra_words: set = set()
    try:
        concepts = db.query(Concept).all()
    except Exception:
        return hit_ids, extra_words
    for c in concepts:
        i18n = c.i18n or {}
        canon = [w.strip().lower() for w in (i18n.get(lang, "") or "").split("/") if w.strip()]
        aliases = [w.lower() for w in _CONCEPT_ALIASES.get(c.id, {}).get(lang, [])]
        syns = canon + aliases
        if not syns:
            continue
        matched = False
        for s in syns:
            if len(s) < 3:
                continue
            if s in q_words or s in qtext:
                matched = True
                break
        if matched:
            hit_ids.add(c.id)
            for cw in canon:
                if len(cw) >= 3:
                    extra_words.add(cw)
    return hit_ids, extra_words



def _terms(text: str) -> List[str]:
    return [c for c in text if c not in _NOISE]


def _passage_map(db: Session) -> Dict[str, Passage]:
    rows = (
        db.execute(
            select(Passage).options(
                selectinload(Passage.translations), selectinload(Passage.chapter)
            )
        )
        .scalars()
        .all()
    )
    return {p.id: p for p in rows}


def _to_evidence(p: Passage, lang: str, score: float) -> Evidence:
    trans_text = ""
    for t in p.translations:
        if t.lang == lang:
            trans_text = t.text
            break
    return Evidence(
        ref_id=p.id,
        book=p.chapter.book_id if p.chapter else "",
        chapter=p.chapter.title_zh if p.chapter else "",
        ref_label=p.ref_label or p.id,
        original_text=p.original_text,
        translation=trans_text,
        concepts=list(p.concepts or []),
        score=round(score, 4),
    )


def retrieve_keyword(db: Session, query: str, lang: str = "zh", k: int = 5) -> List[Evidence]:
    q_terms = set(_terms(query))
    q_lower = query.lower()
    # 去掉词两端常见标点（含阿拉伯语问号/逗号），再按空白切词
    strip_punct = '，。！？、；：「」『』《》（）()“”‘’.,!?;:\'"()؟،'
    q_words = [w.strip(strip_punct) for w in q_lower.split()]
    q_word_set = {w for w in q_words if len(w) > 2}
    # 概念别名/转写 → 标准术语扩展（跨语言自然说法都能命中）
    hit_concepts, extra_words = _concept_index(db, lang, q_word_set, q_lower)
    match_words = q_word_set | extra_words
    scored: List[Evidence] = []
    for p in _passage_map(db).values():
        haystack = p.original_text + " " + (p.pinyin or "")
        for t in p.translations:
            haystack += " " + t.text
        haystack_lower = haystack.lower()
        overlap = sum(1 for term in q_terms if term in p.original_text)
        pconcepts = set(p.concepts or [])
        concept_hit = sum(1 for c in pconcepts if c.lower() in q_lower)
        concept_hit += 3 * len(pconcepts & hit_concepts)
        # 任意语言的查询词/扩展标准词（>2 字符）在原文/拼音/全部译文中做子串匹配
        word_hit = sum(
            1 for w in match_words if w in haystack_lower
        )
        score = overlap * 2.0 + concept_hit * 3.0 + word_hit * 1.5
        if score <= 0:
            continue
        scored.append(_to_evidence(p, lang, score))
    scored.sort(key=lambda e: e.score, reverse=True)
    return scored[:k]


# ── 向量后端 ──────────────────────────────────────────────────────────────────
def retrieve_vector(db: Session, query: str, lang: str = "zh", k: int = 5) -> List[Evidence]:
    from . import vector_store

    hits = vector_store.query(query, k=k)
    pmap = _passage_map(db)
    out: List[Evidence] = []
    for h in hits:
        p = pmap.get(h["ref_id"])
        if p is None:
            continue
        out.append(_to_evidence(p, lang, h["similarity"]))
    return out


# ── 混合后端（Reciprocal Rank Fusion）────────────────────────────────────────
def retrieve_hybrid(
    db: Session, query: str, lang: str = "zh", k: int = 5, rrf_k: int = 60
) -> List[Evidence]:
    """融合向量与关键词两路排名（RRF）。

    RRF 分数 = Σ 1/(rrf_k + rank)，对每个候选累加两路名次贡献。
    不依赖两路分数量纲，鲁棒且实现简单——对应设计方案的「混合检索」。
    """
    vec = retrieve_vector(db, query, lang, k=k * 2)
    kw = retrieve_keyword(db, query, lang, k=k * 2)

    fused: Dict[str, float] = {}
    holder: Dict[str, Evidence] = {}
    for ranked in (vec, kw):
        for rank, ev in enumerate(ranked, 1):
            fused[ev.ref_id] = fused.get(ev.ref_id, 0.0) + 1.0 / (rrf_k + rank)
            holder.setdefault(ev.ref_id, ev)

    order = sorted(fused.items(), key=lambda kv: kv[1], reverse=True)
    out: List[Evidence] = []
    for ref_id, score in order[:k]:
        ev = holder[ref_id]
        ev.score = round(score, 5)
        out.append(ev)
    return out


# ── 统一入口 ──────────────────────────────────────────────────────────────────
def _vector_ready() -> bool:
    try:
        from . import vector_store

        return vector_store.count() > 0
    except Exception:
        return False


def retrieve(db: Session, query: str, lang: str = "zh", k: int = 5) -> List[Evidence]:
    backend = settings.retrieval_backend.lower()
    if backend == "keyword":
        return retrieve_keyword(db, query, lang, k)
    if backend == "vector":
        return retrieve_vector(db, query, lang, k)
    if backend == "hybrid":
        return retrieve_hybrid(db, query, lang, k)
    # auto：向量就绪则用向量，否则降级关键词。
    # （混合 hybrid 在大语料 + 真实 BM25 下更优；小语料上单路向量已最佳，故默认走向量）
    if _vector_ready():
        return retrieve_vector(db, query, lang, k)
    return retrieve_keyword(db, query, lang, k)

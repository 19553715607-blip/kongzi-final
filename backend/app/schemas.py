from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


# ── 经典内容 ──────────────────────────────────────────────────────────────────
class TranslationOut(BaseModel):
    lang: str
    text: str
    translator: Optional[str] = None


class AnnotationOut(BaseModel):
    type: str
    lang: str
    source: Optional[str] = None
    content: str


class PassageOut(BaseModel):
    id: str
    ref_label: Optional[str]
    original_text: str
    pinyin: Optional[str]
    concepts: List[str] = []
    translations: List[TranslationOut] = []
    annotations: List[AnnotationOut] = []
    ai_reading: Optional[str] = None


class ConceptOut(BaseModel):
    id: str
    zh: str
    pinyin: Optional[str]
    i18n: dict = {}
    school: Optional[str]
    rarity: str = "normal"
    definition: dict = {}
    related: List[str] = []


# ── 对话 ──────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    mode: str = "beginner"  # beginner | class | research
    persona: str = "ziyue"
    lang: str = "zh"
    device: str = "web"  # web | mobile | tablet
    topic_hint: Optional[str] = None  # 显式议题选择（覆盖自动分类）


class Citation(BaseModel):
    ref_id: str
    book: str
    chapter: str
    ref_label: str
    text: str

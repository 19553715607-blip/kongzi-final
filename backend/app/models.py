from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# ─────────────────────────────────────────────────────────────────────────────
# 经典内容：书 → 篇 → 句（可寻址树，ref_id 是全平台溯源主键）
# ─────────────────────────────────────────────────────────────────────────────


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'lunyu'
    title_zh: Mapped[str] = mapped_column(String, nullable=False)
    title_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    author: Mapped[Optional[str]] = mapped_column(String)
    era: Mapped[Optional[str]] = mapped_column(String)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)  # 溯源：source/version/accession

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="book")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'lunyu.yanyuan'
    book_id: Mapped[str] = mapped_column(ForeignKey("books.id"))
    title_zh: Mapped[Optional[str]] = mapped_column(String)
    title_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)

    book: Mapped[Book] = relationship(back_populates="chapters")
    passages: Mapped[list["Passage"]] = relationship(back_populates="chapter")


class Passage(Base):
    __tablename__ = "passages"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'lunyu.yanyuan.12.1'
    chapter_id: Mapped[str] = mapped_column(ForeignKey("chapters.id"))
    ref_label: Mapped[Optional[str]] = mapped_column(String)  # '论语·颜渊·12.1'
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    pinyin: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    concepts: Mapped[list] = mapped_column(JSON, default=list)  # ['ren','li']
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")

    chapter: Mapped[Chapter] = relationship(back_populates="passages")
    translations: Mapped[list["Translation"]] = relationship(back_populates="passage")
    annotations: Mapped[list["Annotation"]] = relationship(back_populates="passage")


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    passage_id: Mapped[str] = mapped_column(ForeignKey("passages.id"))
    lang: Mapped[str] = mapped_column(String)  # 'zh','en','ja'...
    text: Mapped[str] = mapped_column(Text)
    translator: Mapped[Optional[str]] = mapped_column(String)

    passage: Mapped[Passage] = relationship(back_populates="translations")


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    passage_id: Mapped[str] = mapped_column(ForeignKey("passages.id"))
    type: Mapped[str] = mapped_column(String)  # 'classical' | 'modern' | 'word'
    lang: Mapped[str] = mapped_column(String, default="zh")
    source: Mapped[Optional[str]] = mapped_column(String)
    source_i18n: Mapped[dict] = mapped_column(JSON, default=dict)  # 注疏出处标签多语
    content: Mapped[str] = mapped_column(Text)
    content_i18n: Mapped[dict] = mapped_column(JSON, default=dict)  # 多语扩展

    passage: Mapped[Passage] = relationship(back_populates="annotations")


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'ren'
    zh: Mapped[str] = mapped_column(String)
    pinyin: Mapped[Optional[str]] = mapped_column(String)
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    school: Mapped[Optional[str]] = mapped_column(String)
    rarity: Mapped[str] = mapped_column(String, default="normal")  # normal|SR|SSR
    definition: Mapped[dict] = mapped_column(JSON, default=dict)
    related: Mapped[list] = mapped_column(JSON, default=list)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)  # 溯源：source/version/accession


# ─────────────────────────────────────────────────────────────────────────────
# 对话（Stage 1 仅落最小表，便于持久化会话与回放）
# ─────────────────────────────────────────────────────────────────────────────


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String)
    mode: Mapped[str] = mapped_column(String, default="beginner")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String)  # 'user' | 'assistant'
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    verify_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    agents_used: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# 知识图谱：人物 / 学派 / 命题（概念、篇章已在上方），加一张通用边表
# ─────────────────────────────────────────────────────────────────────────────


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'kongzi'
    name_zh: Mapped[str] = mapped_column(String)
    name_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    school: Mapped[Optional[str]] = mapped_column(String)
    era: Mapped[Optional[str]] = mapped_column(String)
    bio: Mapped[dict] = mapped_column(JSON, default=dict)  # 多语言一句话简介


class School(Base):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'rujia'
    name_zh: Mapped[str] = mapped_column(String)
    name_i18n: Mapped[dict] = mapped_column(JSON, default=dict)


class Proposition(Base):
    __tablename__ = "propositions"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'prop_keji'
    text_zh: Mapped[str] = mapped_column(Text)
    text_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    passage_ref: Mapped[Optional[str]] = mapped_column(String)  # 出处 passage id


class GraphEdge(Base):
    """通用有向边。label ∈ DISCIPLE_OF/RELATED_TO/MENTIONS/PROPOSED/ABOUT/BELONGS_TO/FROM。"""

    __tablename__ = "graph_edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String, index=True)
    source_type: Mapped[str] = mapped_column(String)  # person|concept|passage|proposition|school
    target_id: Mapped[str] = mapped_column(String, index=True)
    target_type: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String)


# ─────────────────────────────────────────────────────────────────────────────
# 用户 / 游戏化（君子之路）/ 收藏 / 勋章
# ─────────────────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String, unique=True)  # 游客为空
    password_hash: Mapped[Optional[str]] = mapped_column(String)
    is_guest: Mapped[bool] = mapped_column(default=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    display_name: Mapped[str] = mapped_column(String, default="小君子")
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # 偏好
    lang: Mapped[str] = mapped_column(String, default="zh")
    theme: Mapped[str] = mapped_column(String, default="light")
    ai_persona: Mapped[str] = mapped_column(String, default="ziyue")
    consent: Mapped[dict] = mapped_column(JSON, default=dict)

    # 注册地理位置（IP 衍生，用于"海外用户"客观证据；游客为空）
    signup_ip: Mapped[Optional[str]] = mapped_column(String)
    signup_country: Mapped[Optional[str]] = mapped_column(String)  # ISO 3166-1 alpha-2

    # 游戏化状态
    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_checkin: Mapped[Optional[str]] = mapped_column(String)  # YYYY-MM-DD

    # 礼游戏分数（儒分/情分），及已解锁的经典依据
    ru_score: Mapped[int] = mapped_column(Integer, default=0)
    qing_score: Mapped[int] = mapped_column(Integer, default=0)
    li_unlocked_refs: Mapped[list] = mapped_column(JSON, default=list)
    liuyi: Mapped[dict] = mapped_column(JSON, default=dict)       # 六艺 {li,yue,she,yu,shu,shu2}
    daily: Mapped[dict] = mapped_column(JSON, default=dict)       # {date, done:[task_id]}


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    badge_id: Mapped[str] = mapped_column(String)
    unlocked_at: Mapped[datetime] = mapped_column(default=func.now())


class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String)  # passage | concept
    target_ref: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# 跨文明议题对话引擎（申报书核心）
# ─────────────────────────────────────────────────────────────────────────────


class Topic(Base):
    """5 大全球议题：气候治理 / 科技伦理 / 社会责任 / 个人发展 / 公共治理。"""

    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # 'climate'
    name_zh: Mapped[str] = mapped_column(String)
    name_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    description: Mapped[dict] = mapped_column(JSON, default=dict)  # 多语言一句话
    color: Mapped[str] = mapped_column(String, default="#993C1D")
    keywords: Mapped[list] = mapped_column(JSON, default=list)  # 路由用关键词
    related_concepts: Mapped[list] = mapped_column(JSON, default=list)  # 关联儒家概念
    related_passages: Mapped[list] = mapped_column(JSON, default=list)  # 关联经典 ref_id
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class CrossCivView(Base):
    """跨文明立场库：每个议题下，多个文明传统的核心立场。"""

    __tablename__ = "cross_civ_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    civilization: Mapped[str] = mapped_column(String)  # confucian | christian | enlightenment | kantian | buddhist
    civ_label_zh: Mapped[str] = mapped_column(String)
    civ_label_i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    headline: Mapped[dict] = mapped_column(JSON, default=dict)  # 一句话核心立场（多语）
    detail: Mapped[dict] = mapped_column(JSON, default=dict)  # 详细论证（多语）
    sources: Mapped[list] = mapped_column(JSON, default=list)  # [{label,citation}] 经典/思想家依据
    reviewed_by: Mapped[Optional[str]] = mapped_column(String)  # 审核人；NULL=未审/AI生成
    ai_generated: Mapped[bool] = mapped_column(default=True)


# ─────────────────────────────────────────────────────────────────────────────
# 共创广场（申报书：可提问 / 可互动 / 可共创）+ 传播覆盖埋点
# ─────────────────────────────────────────────────────────────────────────────


class Contribution(Base):
    """用户共创内容：跨文明立场补充 / 注解 / 议题提案。"""

    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String, default="cross_civ", index=True)
    # kind ∈ cross_civ | annotation | topic_idea
    topic_id: Mapped[Optional[str]] = mapped_column(ForeignKey("topics.id"))
    target_ref: Mapped[Optional[str]] = mapped_column(String)  # passage ref or concept id
    civilization: Mapped[Optional[str]] = mapped_column(String)
    headline: Mapped[str] = mapped_column(Text)
    detail: Mapped[str] = mapped_column(Text, default="")
    sources: Mapped[list] = mapped_column(JSON, default=list)
    lang: Mapped[str] = mapped_column(String, default="zh")

    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    # pending → published | rejected
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    reviewer: Mapped[Optional[str]] = mapped_column(String)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class ContributionVote(Base):
    """对共创内容的投票（每用户每条 +1/-1）。"""

    __tablename__ = "contribution_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contribution_id: Mapped[int] = mapped_column(ForeignKey("contributions.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    value: Mapped[int] = mapped_column(Integer)  # +1 / -1
    created_at: Mapped[datetime] = mapped_column(default=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# 「礼」情境游戏（六艺之一）
# ─────────────────────────────────────────────────────────────────────────────


class LiScenario(Base):
    """礼之器游戏 — 情境抉择卡。每场景 4 选项，每选项对应儒分/情分变化与经典依据。"""

    __tablename__ = "li_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String)              # 情境短标题，如「地铁让座」
    category: Mapped[str] = mapped_column(String, default="daily")  # daily/work/friend/family/public
    setting: Mapped[str] = mapped_column(Text)              # 情境描述（你扮演谁、发生什么）
    options: Mapped[list] = mapped_column(JSON, default=list)
    # options = [{
    #   "key": "A", "text": "主动给老人让座",
    #   "ru_delta": +2, "qing_delta": +2,
    #   "comment_ru": "选 1 体现「敬」", "comment_others": "老人感激",
    #   "ref_ids": ["lunyu.yanyuan.12.2"],  # 解锁的经典依据
    # }, ...]
    related_concepts: Mapped[list] = mapped_column(JSON, default=list)  # ["ren","jing","shu"]
    ai_generated: Mapped[bool] = mapped_column(default=True)
    reviewer: Mapped[Optional[str]] = mapped_column(String)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class LiChoice(Base):
    """用户在某场景的选择记录。用于今日去重、统计、回放反思。"""

    __tablename__ = "li_choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("li_scenarios.id"), index=True)
    option_key: Mapped[str] = mapped_column(String)
    ru_delta: Mapped[int] = mapped_column(Integer, default=0)
    qing_delta: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class LiHostRound(Base):
    """礼 ·「执礼 · 宾至如归」一局记录。
    三维评分：敬（揖礼深浅）/ 序（迎宾顺序 + 席位）/ 节（席间时机与克己）。
    总分 = 三维几何平均（任一维低即拉低总分，与其他五艺一致）。
    """

    __tablename__ = "li_host_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_key: Mapped[str] = mapped_column(String, index=True)   # 'xiangyin' 等
    jing: Mapped[int] = mapped_column(Integer, default=0)   # 敬 0-100
    xu: Mapped[int] = mapped_column(Integer, default=0)     # 序 0-100
    jie: Mapped[int] = mapped_column(Integer, default=0)    # 节 0-100
    total: Mapped[int] = mapped_column(Integer, default=0)  # 几何平均
    grade: Mapped[str] = mapped_column(String, default="习礼者")
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)


class ShuCard(Base):
    """书艺卡 — 每张卡 1 个汉字，问本义（4 选 1），答完展开字源故事 + 解锁经典出处。"""

    __tablename__ = "shu_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    char: Mapped[str] = mapped_column(String, unique=True, index=True)   # 「仁」
    pinyin: Mapped[str] = mapped_column(String)                          # "rén"
    components: Mapped[str] = mapped_column(String)                      # 「亻 + 二」
    method: Mapped[str] = mapped_column(String)                          # xiangxing/zhishi/huiyi/xingsheng/zhuanzhu/jiajie
    benyi: Mapped[str] = mapped_column(Text)                             # 本义
    jinyi: Mapped[str] = mapped_column(Text)                             # 今义
    story: Mapped[str] = mapped_column(Text)                             # 字源故事，200 字内
    options: Mapped[list] = mapped_column(JSON, default=list)            # [{key:"A", text:"..."}, ...]
    answer_key: Mapped[str] = mapped_column(String)                      # "A"/"B"/"C"/"D"
    refs: Mapped[list] = mapped_column(JSON, default=list)               # 关联经典 ref_ids
    related_concepts: Mapped[list] = mapped_column(JSON, default=list)   # ["ren","li"]
    category: Mapped[str] = mapped_column(String, default="wuchang")     # wuchang/lunli/xiushen/zhixue/zhexue
    difficulty: Mapped[int] = mapped_column(Integer, default=1)          # 1-5
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ShuAnswer(Base):
    """用户书艺答题记录。三种 mode：choice 选择题 / assemble 拼字 / trace 描红写字。"""

    __tablename__ = "shu_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("shu_cards.id"), index=True)
    chosen_key: Mapped[str] = mapped_column(String, default="")    # 选择题用
    correct: Mapped[bool] = mapped_column(default=False)
    mode: Mapped[str] = mapped_column(String, default="choice")    # choice|assemble|trace
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class YuScenario(Base):
    """御艺·五御 — 2D 俯视驾车情境。"""

    __tablename__ = "yu_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)
    # mingheluan 鸣和鸾 / zhushui 逐水曲 / junbiao 过君表 / jiaoqu 舞交衢 / qinzuo 逐禽左
    kind_label: Mapped[str] = mapped_column(String)
    setting: Mapped[str] = mapped_column(Text)
    hint: Mapped[str] = mapped_column(Text)
    road_config: Mapped[dict] = mapped_column(JSON, default=dict)
    # {"type":"straight"|"curve","length":600,"beats":[2.0,4.0,...],
    #  "obstacles":[{"type":"junbiao"|"pedestrian"|"crossing"|"deer","y":...,"x":...}]}
    target_speed: Mapped[float] = mapped_column(Float, default=8.0)   # 目标车速 m/s
    target_duration_ms: Mapped[int] = mapped_column(Integer, default=30000)
    refs: Mapped[list] = mapped_column(JSON, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class YuAnswer(Base):
    """用户驾车记录：轨迹 + 事件 + 评分。"""

    __tablename__ = "yu_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("yu_scenarios.id"), index=True)
    trajectory: Mapped[list] = mapped_column(JSON, default=list)
    # [{t:0, x:0, y:0, speed:0}, ...] 每 ~100ms 一个采样
    events: Mapped[list] = mapped_column(JSON, default=list)
    # [{t, type:"li"|"chase"|"hit_pedestrian"|"beat"}, ...]
    score: Mapped[int] = mapped_column(Integer, default=0)
    jie: Mapped[float] = mapped_column(Float, default=0.0)
    rang: Mapped[float] = mapped_column(Float, default=0.0)
    buji: Mapped[float] = mapped_column(Float, default=0.0)
    grade: Mapped[str] = mapped_column(String, default="学驭")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class MathScenario(Base):
    """数艺·均输衰分 — 公平分配情境。"""

    __tablename__ = "math_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String, default="junshu")   # junshu均输 / cuifen衰分
    kind_label: Mapped[str] = mapped_column(String, default="均输")
    setting: Mapped[str] = mapped_column(Text)
    hint: Mapped[str] = mapped_column(Text)
    items: Mapped[list] = mapped_column(JSON, default=list)
    # items = [{"name":"甲乡","attrs":"5 户 × 户均田 4 亩 = 20 亩","ideal_share":50}, ...]
    total: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String, default="担")
    refs: Mapped[list] = mapped_column(JSON, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class MathAnswer(Base):
    """用户数艺答题记录。"""

    __tablename__ = "math_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("math_scenarios.id"), index=True)
    allocations: Mapped[list] = mapped_column(JSON, default=list)  # [{"name":"甲","amount":48.5}, ...]
    score: Mapped[int] = mapped_column(Integer, default=0)
    sum_match: Mapped[float] = mapped_column(Float, default=0.0)
    fairness: Mapped[float] = mapped_column(Float, default=0.0)
    moderation: Mapped[float] = mapped_column(Float, default=0.0)
    grade: Mapped[str] = mapped_column(String, default="学算")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class YueScenario(Base):
    """乐艺·五音合鸣 — 情境奏乐。每场景指定目标情志 + 理想五音分布。"""

    __tablename__ = "yue_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String)              # 情境短标题
    mood: Mapped[str] = mapped_column(String)               # solemn/joyful/sad/calm/heroic
    mood_label: Mapped[str] = mapped_column(String)         # 「庄重肃穆」中文
    setting: Mapped[str] = mapped_column(Text)              # 情境描述
    hint: Mapped[str] = mapped_column(Text)                 # 提示语
    ideal_distribution: Mapped[dict] = mapped_column(JSON, default=dict)
    # ideal_distribution = {"gong":0.3,"shang":0.3,"jue":0.1,"zhi":0.15,"yu":0.15}
    refs: Mapped[list] = mapped_column(JSON, default=list)  # 关联经典 ref_ids（答完解锁）
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class YueAnswer(Base):
    """用户乐艺答题记录。"""

    __tablename__ = "yue_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("yue_scenarios.id"), index=True)
    sequence: Mapped[list] = mapped_column(JSON, default=list)  # ["gong","shang",...] 8 音序列
    score: Mapped[int] = mapped_column(Integer, default=0)      # 0-100 总分
    harmony: Mapped[float] = mapped_column(Float, default=0.0)  # 相邻音相生程度
    mood_match: Mapped[float] = mapped_column(Float, default=0.0)  # 与目标情志匹配
    moderation: Mapped[float] = mapped_column(Float, default=0.0)  # 「乐而不淫」节度
    grade: Mapped[str] = mapped_column(String, default="学律")
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class ShootRound(Base):
    """射艺 · 一次完整射的记录。
    儒分（中分）= 客观命中；省分（反省深度）= 选了归因 / 写了反思。
    """

    __tablename__ = "shoot_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    hit: Mapped[bool] = mapped_column(default=False)
    score: Mapped[int] = mapped_column(Integer, default=0)        # 中靶环数 0-10
    distance_m: Mapped[int] = mapped_column(Integer, default=30)
    wind: Mapped[float] = mapped_column(Float, default=0.0)        # m/s, 横向风
    aim_drift: Mapped[float] = mapped_column(Float, default=0.0)   # 偏靶心距离
    reflection_choice: Mapped[Optional[str]] = mapped_column(String)
    # "calm"心未静 / "force"力度过不及 / "wind"估风错 / "win"求胜心切
    reflection_note: Mapped[Optional[str]] = mapped_column(Text)
    streak_hit: Mapped[int] = mapped_column(Integer, default=0)    # 当时连击数（用于「射不主皮」触发）
    zhupi_warned: Mapped[bool] = mapped_column(default=False)      # 是否触发了不主皮提示
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)


class PageEvent(Base):
    """轻量埋点：覆盖人次 / PV / 终端分布 / 国家分布。"""

    __tablename__ = "page_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    visitor_id: Mapped[str] = mapped_column(String, index=True)  # 客户端生成的匿名 id
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    path: Mapped[str] = mapped_column(String, index=True)
    device: Mapped[str] = mapped_column(String, default="web")  # web|mobile|kiosk|plugin
    source: Mapped[str] = mapped_column(String, default="direct")
    # source ∈ direct | qr | embed | wechat | slack | ...
    campus: Mapped[Optional[str]] = mapped_column(String)
    # 地理位置（IP 衍生，用于"海外覆盖"客观证据）
    ip: Mapped[Optional[str]] = mapped_column(String)
    country_code: Mapped[Optional[str]] = mapped_column(String, index=True)  # US/GB/JP/...
    country_name: Mapped[Optional[str]] = mapped_column(String)  # United States/...
    ts: Mapped[datetime] = mapped_column(default=func.now(), index=True)


class Institution(Base):
    """海外教育/文化机构接入方（申报书：20+ 家机构开放接口）。"""

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String, default="")
    contact_email: Mapped[str] = mapped_column(String)
    purpose: Mapped[str] = mapped_column(Text, default="")  # 用途说明
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    # pending → approved → suspended | rejected
    monthly_quota: Mapped[int] = mapped_column(Integer, default=10_000)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    approved_at: Mapped[Optional[datetime]] = mapped_column()
    approved_by: Mapped[Optional[str]] = mapped_column(String)


class ApiKey(Base):
    """机构持有的 API Key。一机构可发多 key（dev/prod/sandbox）。"""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), index=True)
    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    label: Mapped[str] = mapped_column(String, default="default")
    revoked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column()


class ApiCall(Base):
    """调用日志（用量看板 + 限流统计基础）。"""

    __tablename__ = "api_calls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(ForeignKey("api_keys.id"), index=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("institutions.id"), index=True)
    path: Mapped[str] = mapped_column(String)
    status: Mapped[int] = mapped_column(Integer)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    ts: Mapped[datetime] = mapped_column(default=func.now(), index=True)


class DialogCase(Base):
    """跨文明对话案例库（申报书要求 ≥500 条）。"""

    __tablename__ = "dialog_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    lang: Mapped[str] = mapped_column(String, default="zh", index=True)
    title: Mapped[str] = mapped_column(String, default="")
    question: Mapped[str] = mapped_column(Text)
    question_i18n: Mapped[dict] = mapped_column(JSON, default=dict)  # {lang: 译文}
    confucian_answer: Mapped[str] = mapped_column(Text)
    cross_civ_views: Mapped[list] = mapped_column(JSON, default=list)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    # 审核流：draft → reviewed → published；rejected 为废弃
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    quality: Mapped[int] = mapped_column(Integer, default=0)  # 0-5 星
    ai_generated: Mapped[bool] = mapped_column(default=True)
    reviewer: Mapped[Optional[str]] = mapped_column(String)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column()
    review_note: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# 管理端写能力支撑：站点公告 / 站点设置(KV) / 操作审计
# ─────────────────────────────────────────────────────────────────────────────


class Announcement(Base):
    """站点公告（顶部横幅 / 活动通知）。"""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    lang: Mapped[str] = mapped_column(String, default="zh", index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())


class SiteSetting(Base):
    """站点设置：key-value JSON。顶部公告条、功能开关、模式名称等。"""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())


class AuditLog(Base):
    """管理端写操作审计：actor / action / target / timestamp。"""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    actor_email: Mapped[Optional[str]] = mapped_column(String)
    action: Mapped[str] = mapped_column(String, index=True)  # create|update|delete|ban|grant|revoke|...
    target_type: Mapped[str] = mapped_column(String, index=True)  # user|book|case|key|...
    target_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)


# ─────────────────────────────────────────────────────────────────────────────
# 楼中楼评论系统（public 可读 / 发帖 + admin 审核）
# ─────────────────────────────────────────────────────────────────────────────


class Comment(Base):
    """可嵌套评论（楼中楼）。root_id 指向整串根评论，便于按串取树。

    软删除：本人/管理员删除走 status=hidden（不硬删）；管理员可硬删。
    """

    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid4
    target_type: Mapped[str] = mapped_column(String, index=True)  # passage | page
    target_id: Mapped[str] = mapped_column(String, index=True)    # passage_id 或 path
    visitor_id: Mapped[str] = mapped_column(String, index=True)    # 客户端匿名 id
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True)  # 登录用户
    author_name: Mapped[str] = mapped_column(String, default="")
    content: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[Optional[str]] = mapped_column(String, index=True)  # 自引用
    root_id: Mapped[Optional[str]] = mapped_column(String, index=True)    # 整串根
    status: Mapped[str] = mapped_column(String, default="visible", index=True)
    # visible | hidden
    likes: Mapped[int] = mapped_column(Integer, default=0)
    report_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_comments_target", "target_type", "target_id", "status"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# 内容点赞（passage / page 等公开内容，游客凭 X-Visitor-Id 或登录态去重）
# ─────────────────────────────────────────────────────────────────────────────


class ContentLike(Base):
    """对内容的点赞记录。同一 (target_type, target_id, visitor_id) 仅一条，toggle 切换。"""

    __tablename__ = "content_likes"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # uuid4
    target_type: Mapped[str] = mapped_column(String, default="passage", index=True)
    target_id: Mapped[str] = mapped_column(String, index=True)
    visitor_id: Mapped[str] = mapped_column(String, index=True)  # 客户端匿名 id；登录用户缺失时用 registered:<uid>
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True)  # 登录用户，游客为空
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("target_type", "target_id", "visitor_id", name="uq_content_likes_target_visitor"),
    )

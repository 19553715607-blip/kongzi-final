"""最小种子数据：论语若干句 + 核心概念。仅在库为空时灌入。

生产环境应由独立的语料导入管线（清洗→校对→标注→向量化→人工审核）产出，
此处只为让 Stage 1 骨架开箱即用。
"""
from __future__ import annotations

from sqlalchemy import select

from .db import SessionLocal
from .models import (
    Annotation,
    Book,
    Chapter,
    Concept,
    GraphEdge,
    Passage,
    Person,
    Proposition,
    School,
    Translation,
)

PASSAGES = [
    {
        "id": "lunyu.xueer.1.1",
        "chapter": "学而",
        "ref": "论语·学而·1.1",
        "text": "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
        "pinyin": "xué ér shí xí zhī, bù yì yuè hū?",
        "concepts": ["junzi", "xue"],
        "en": "Is it not a pleasure to learn and to practice what one has learned in due time? "
        "Is it not a joy to have friends come from afar? "
        "Is one not a junzi if one is not resentful though unrecognized by others?",
        "anno": ("modern", "现代释义", "强调学习要持续实践、与同道交流，并不因不被理解而怨怒。"),
    },
    {
        "id": "lunyu.weizheng.2.4",
        "chapter": "为政",
        "ref": "论语·为政·2.4",
        "text": "吾十有五而志于学，三十而立，四十而不惑，五十而知天命，六十而耳顺，七十而从心所欲，不逾矩。",
        "pinyin": "wú shí yòu wǔ ér zhì yú xué...",
        "concepts": ["xue", "tianming"],
        "en": "At fifteen I set my heart on learning; at thirty I stood firm; "
        "at forty I had no doubts; at fifty I knew the decree of Heaven; "
        "at sixty my ear was attuned; at seventy I could follow my heart's desire "
        "without overstepping the bounds.",
        "anno": ("classical", "朱熹《论语集注》", "言其进德修业，循序而进，至于成德。"),
    },
    {
        "id": "lunyu.yanyuan.12.1",
        "chapter": "颜渊",
        "ref": "论语·颜渊·12.1",
        "text": "克己复礼为仁。一日克己复礼，天下归仁焉。",
        "pinyin": "kè jǐ fù lǐ wéi rén.",
        "concepts": ["ren", "li", "keji"],
        "en": "To overcome oneself and return to ritual propriety (li) is benevolence (ren). "
        "If for a single day one can overcome oneself and return to ritual propriety, "
        "the whole world will return to benevolence.",
        "anno": ("modern", "现代释义", "约束自身私欲、使言行合于礼，便是仁；仁的实现始于自我修养。"),
    },
    {
        "id": "lunyu.yanyuan.12.2",
        "chapter": "颜渊",
        "ref": "论语·颜渊·12.2",
        "text": "己所不欲，勿施于人。",
        "pinyin": "jǐ suǒ bù yù, wù shī yú rén.",
        "concepts": ["ren", "shu"],
        "en": "Do not impose on others what you yourself do not desire.",
        "anno": ("modern", "现代释义", "推己及人的恕道，是仁在人际中的具体实践。"),
    },
    {
        "id": "lunyu.liren.4.16",
        "chapter": "里仁",
        "ref": "论语·里仁·4.16",
        "text": "君子喻于义，小人喻于利。",
        "pinyin": "jūn zǐ yù yú yì, xiǎo rén yù yú lì.",
        "concepts": ["junzi", "yi", "li_benefit"],
        "en": "The junzi understands what is right (yi); the petty person understands what is profitable.",
        "anno": ("modern", "现代释义", "君子以义为行事准则，小人以利为先；区别在价值取向。"),
    },
]

CONCEPTS = [
    {
        "id": "ren",
        "zh": "仁",
        "pinyin": "rén",
        "i18n": {"en": "benevolence / humaneness", "ja": "仁"},
        "school": "儒家",
        "rarity": "SSR",
        "definition": {
            "zh": "儒家最高德目，爱人、推己及人，内在于心而外显于行。",
            "en": "The cardinal Confucian virtue: humaneness, caring for others, extending oneself to others.",
        },
        "related": ["li", "shu", "yi"],
    },
    {
        "id": "li",
        "zh": "礼",
        "pinyin": "lǐ",
        "i18n": {"en": "ritual propriety", "ja": "礼"},
        "school": "儒家",
        "rarity": "SR",
        "definition": {
            "zh": "规范行为与社会秩序的礼仪制度，亦是自我修养的外在形式。",
            "en": "Ritual propriety: the norms that order conduct and society, and a form of self-cultivation.",
        },
        "related": ["ren", "yi"],
    },
    {
        "id": "junzi",
        "zh": "君子",
        "pinyin": "jūn zǐ",
        "i18n": {"en": "exemplary person / gentleman", "ja": "君子"},
        "school": "儒家",
        "rarity": "SR",
        "definition": {
            "zh": "德行高尚、以义为先的理想人格。",
            "en": "The morally exemplary person who prioritizes righteousness over profit.",
        },
        "related": ["yi", "ren"],
    },
    {
        "id": "yi",
        "zh": "义",
        "pinyin": "yì",
        "i18n": {"en": "righteousness", "ja": "義"},
        "school": "儒家",
        "rarity": "normal",
        "definition": {
            "zh": "行为应当合宜、合于道义的判断标准。",
            "en": "Righteousness: the standard of what is morally fitting and appropriate.",
        },
        "related": ["junzi", "ren"],
    },
    {
        "id": "shu",
        "zh": "恕",
        "pinyin": "shù",
        "i18n": {"en": "reciprocity / empathy", "ja": "恕"},
        "school": "儒家",
        "rarity": "normal",
        "definition": {
            "zh": "推己及人，己所不欲勿施于人。",
            "en": "Reciprocity: not imposing on others what one does not want for oneself.",
        },
        "related": ["ren"],
    },
]


# ── 知识图谱种子 ──────────────────────────────────────────────────────────────
SCHOOLS = [
    {"id": "rujia", "name_zh": "儒家", "name_i18n": {"en": "Confucianism"}},
]

PERSONS = [
    {"id": "kongzi", "name_zh": "孔子", "name_i18n": {"en": "Confucius"},
     "school": "rujia", "era": "春秋",
     "bio": {"zh": "儒家创始人，名丘字仲尼。", "en": "Founder of Confucianism."}},
    {"id": "yanhui", "name_zh": "颜回", "name_i18n": {"en": "Yan Hui"},
     "school": "rujia", "era": "春秋",
     "bio": {"zh": "孔子最得意的弟子，以德行著称。", "en": "Confucius's favored disciple."}},
    {"id": "zengzi", "name_zh": "曾子", "name_i18n": {"en": "Zengzi"},
     "school": "rujia", "era": "春秋",
     "bio": {"zh": "孔子弟子，传《大学》。", "en": "Disciple, transmitter of the Great Learning."}},
    {"id": "zigong", "name_zh": "子贡", "name_i18n": {"en": "Zigong"},
     "school": "rujia", "era": "春秋",
     "bio": {"zh": "孔子弟子，善言语、通货殖。", "en": "Disciple known for eloquence."}},
    {"id": "mengzi", "name_zh": "孟子", "name_i18n": {"en": "Mencius"},
     "school": "rujia", "era": "战国",
     "bio": {"zh": "继孔子之后的儒家代表，主性善。", "en": "Major Confucian, taught innate goodness."}},
]

PROPOSITIONS = [
    {"id": "prop_keji", "text_zh": "克己复礼为仁", "text_i18n": {"en": "Self-mastery and returning to ritual is ren"},
     "passage_ref": "lunyu.yanyuan.12.1", "about": ["ren", "li"], "by": "kongzi"},
    {"id": "prop_shu", "text_zh": "己所不欲，勿施于人", "text_i18n": {"en": "Do not impose on others what you do not want"},
     "passage_ref": "lunyu.yanyuan.12.2", "about": ["ren", "shu"], "by": "kongzi"},
    {"id": "prop_yili", "text_zh": "君子喻于义，小人喻于利", "text_i18n": {"en": "The junzi understands righteousness"},
     "passage_ref": "lunyu.liren.4.16", "about": ["junzi", "yi"], "by": "kongzi"},
]

# 人物关系（弟子关系）
DISCIPLES = ["yanhui", "zengzi", "zigong"]  # DISCIPLE_OF kongzi


def _seed_graph(db) -> int:
    edges: list[GraphEdge] = []

    def edge(s, st, t, tt, label):
        edges.append(GraphEdge(source_id=s, source_type=st, target_id=t,
                               target_type=tt, label=label))

    for s in SCHOOLS:
        db.add(School(**s))
    for p in PERSONS:
        db.add(Person(**p))
        edge(p["id"], "person", p["school"], "school", "BELONGS_TO")
    for d in DISCIPLES:
        edge(d, "person", "kongzi", "person", "DISCIPLE_OF")

    for pr in PROPOSITIONS:
        db.add(Proposition(id=pr["id"], text_zh=pr["text_zh"],
                           text_i18n=pr["text_i18n"], passage_ref=pr["passage_ref"]))
        edge(pr["by"], "person", pr["id"], "proposition", "PROPOSED")
        for c in pr["about"]:
            edge(pr["id"], "proposition", c, "concept", "ABOUT")
        if pr["passage_ref"]:
            edge(pr["id"], "proposition", pr["passage_ref"], "passage", "FROM")

    # 概念间关系（来自 concepts.related，去重无向）
    seen = set()
    for c in CONCEPTS:
        for r in c.get("related", []):
            key = tuple(sorted([c["id"], r]))
            if key in seen:
                continue
            seen.add(key)
            edge(c["id"], "concept", r, "concept", "RELATED_TO")

    # 篇章提及概念（来自 passages.concepts，仅保留已建概念节点的）
    concept_ids = {c["id"] for c in CONCEPTS}
    for p in PASSAGES:
        for c in p["concepts"]:
            if c in concept_ids:
                edge(p["id"], "passage", c, "concept", "MENTIONS")

    for e in edges:
        db.add(e)
    return len(edges)


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.execute(select(Book).limit(1)).first():
            return

        db.add(
            Book(
                id="lunyu",
                title_zh="论语",
                title_i18n={"en": "The Analects", "ja": "論語"},
                author="孔子及弟子",
                era="春秋",
                sort_order=1,
            )
        )

        chapter_ids = {}
        for i, p in enumerate(PASSAGES):
            cname = p["chapter"]
            cid = f"lunyu.{cname}"
            if cid not in chapter_ids:
                db.add(Chapter(id=cid, book_id="lunyu", title_zh=cname, sort_order=i))
                chapter_ids[cid] = True

            db.add(
                Passage(
                    id=p["id"],
                    chapter_id=cid,
                    ref_label=p["ref"],
                    original_text=p["text"],
                    pinyin=p["pinyin"],
                    sort_order=i,
                    concepts=p["concepts"],
                )
            )
            db.add(Translation(passage_id=p["id"], lang="zh", text=p["text"], translator="原文"))
            db.add(
                Translation(
                    passage_id=p["id"], lang="en", text=p["en"], translator="platform"
                )
            )
            atype, asource, acontent = p["anno"]
            db.add(
                Annotation(
                    passage_id=p["id"],
                    type=atype,
                    lang="zh",
                    source=asource,
                    content=acontent,
                )
            )

        for c in CONCEPTS:
            db.add(Concept(**c))

        n_edges = _seed_graph(db)

        from .seed_topics import seed_topics_if_empty
        seed_topics_if_empty(db)

        from .seed_li_scenarios import seed_li_scenarios_if_empty
        n_li = seed_li_scenarios_if_empty(db)
        if n_li:
            print(f"[seed_li] {n_li} scenarios.")

        from .seed_corpus import seed_corpus_if_needed
        added = seed_corpus_if_needed(db)
        print(f"[seed_corpus] {added}")

        # 五语适配补丁：补齐 seed.py 这 5 篇的 fr/es/ar 译文 + 全部注释的 content_i18n
        from .seed_i18n_patch import apply_i18n_patch
        patched = apply_i18n_patch(db)
        print(f"[seed_i18n] {patched}")

        db.commit()
        print(
            f"[seed] inserted {len(PASSAGES)} passages, {len(CONCEPTS)} concepts, "
            f"{len(PERSONS)} persons, {len(PROPOSITIONS)} propositions, {n_edges} edges."
        )
    finally:
        db.close()

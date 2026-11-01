"""Third Confucian culture enrichment pack.

Focuses on breadth for overseas-facing content:
- additional canon-adjacent excerpts from Analects, Mencius, Liji, Xunzi,
  Zhongyong, Xiaojing, Book of Songs, Book of Documents, and Book of Changes
- more concepts for ritual, education, public ethics, and intercultural use
- more historical figures and graph triples
- additional published cases for classroom and public communication scenarios
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import SessionLocal, init_db
from .models import Annotation, Book, Chapter, Concept, DialogCase, GraphEdge, Passage, Person, Proposition, Translation


BOOKS = {
    "yijing": ("周易", "Book of Changes", "佚名", "先秦", 10),
    "chunqiu": ("春秋", "Spring and Autumn Annals", "鲁史传统", "春秋", 11),
}


PASSAGES = [
    ("lunyu.more.1", "lunyu", "学而", "论语·学而", "礼之用，和为贵。", ["li", "he", "zhongyong"]),
    ("lunyu.more.2", "lunyu", "学而", "论语·学而", "信近于义，言可复也。", ["xin", "yi", "zeren"]),
    ("lunyu.more.3", "lunyu", "为政", "论语·为政", "君子周而不比，小人比而不周。", ["junzi", "gong", "xiao_ren"]),
    ("lunyu.more.4", "lunyu", "为政", "论语·为政", "攻乎异端，斯害也已。", ["zhongyong", "xue", "duihua"]),
    ("lunyu.more.5", "lunyu", "八佾", "论语·八佾", "人而不仁，如礼何？人而不仁，如乐何？", ["ren", "li", "yue"]),
    ("lunyu.more.6", "lunyu", "里仁", "论语·里仁", "君子怀德，小人怀土；君子怀刑，小人怀惠。", ["junzi", "de", "li"]),
    ("lunyu.more.7", "lunyu", "雍也", "论语·雍也", "中人以上，可以语上也；中人以下，不可以语上也。", ["jiao", "yin_cai_shi_jiao", "zhongyong"]),
    ("lunyu.more.8", "lunyu", "述而", "论语·述而", "三人行，必有我师焉。择其善者而从之，其不善者而改之。", ["xue", "fanxing", "shan"]),
    ("lunyu.more.9", "lunyu", "述而", "论语·述而", "不愤不启，不悱不发。", ["qifa", "jiao", "xue"]),
    ("lunyu.more.10", "lunyu", "泰伯", "论语·泰伯", "兴于诗，立于礼，成于乐。", ["shi_jiao", "li", "yue"]),
    ("lunyu.more.11", "lunyu", "子罕", "论语·子罕", "知者不惑，仁者不忧，勇者不惧。", ["zhi", "ren", "yong"]),
    ("lunyu.more.12", "lunyu", "颜渊", "论语·颜渊", "君子成人之美，不成人之恶。", ["junzi", "chengren_zhimei", "shan"]),
    ("lunyu.more.13", "lunyu", "子路", "论语·子路", "近者说，远者来。", ["renzheng", "minben", "he"]),
    ("lunyu.more.14", "lunyu", "卫灵公", "论语·卫灵公", "君子求诸己，小人求诸人。", ["junzi", "fanxing", "xiu_shen"]),
    ("lunyu.more.15", "lunyu", "卫灵公", "论语·卫灵公", "躬自厚而薄责于人，则远怨矣。", ["shu", "fanxing", "ren"]),
    ("mengzi.more.1", "mengzi", "梁惠王下", "孟子·梁惠王下", "得道者多助，失道者寡助。", ["dao", "renzheng", "minben"]),
    ("mengzi.more.2", "mengzi", "梁惠王下", "孟子·梁惠王下", "天时不如地利，地利不如人和。", ["he", "minben", "renzheng"]),
    ("mengzi.more.3", "mengzi", "公孙丑下", "孟子·公孙丑下", "富贵不能淫，贫贱不能移，威武不能屈。", ["da_zhangfu", "yi", "yong"]),
    ("mengzi.more.4", "mengzi", "离娄上", "孟子·离娄上", "不以规矩，不能成方圆。", ["guiju", "li", "fa_du"]),
    ("mengzi.more.5", "mengzi", "离娄下", "孟子·离娄下", "君子以仁存心，以礼存心。", ["junzi", "ren", "li"]),
    ("mengzi.more.6", "mengzi", "尽心上", "孟子·尽心上", "穷则独善其身，达则兼善天下。", ["du_shan", "jian_shan", "ping_tianxia"]),
    ("mengzi.more.7", "mengzi", "尽心下", "孟子·尽心下", "民为贵，社稷次之，君为轻。", ["minben", "renzheng", "zheng"]),
    ("liji.more.1", "liji", "大学", "礼记·大学", "汤之盘铭曰：苟日新，日日新，又日新。", ["rixin", "xiu_shen", "xue"]),
    ("liji.more.2", "liji", "中庸", "礼记·中庸", "君子素其位而行，不愿乎其外。", ["junzi", "benfen", "zhongyong"]),
    ("liji.more.3", "liji", "中庸", "礼记·中庸", "君子和而不流，强哉矫。", ["junzi", "he", "yong"]),
    ("liji.more.4", "liji", "乐记", "礼记·乐记", "乐者，天地之和也；礼者，天地之序也。", ["yue", "li", "zhixu"]),
    ("liji.more.5", "liji", "乐记", "礼记·乐记", "礼节民心，乐和民声。", ["li", "yue", "jiaohua"]),
    ("liji.more.6", "liji", "礼运", "礼记·礼运", "礼义以为纪。", ["li", "yi", "zhixu"]),
    ("xunzi.more.1", "xunzi", "修身", "荀子·修身", "道虽迩，不行不至；事虽小，不为不成。", ["duxing", "youwei", "heng"]),
    ("xunzi.more.2", "xunzi", "劝学", "荀子·劝学", "君子生非异也，善假于物也。", ["junzi", "xue", "shan_yu_jia_wu"]),
    ("xunzi.more.3", "xunzi", "非相", "荀子·非相", "相形不如论心，论心不如择术。", ["zhi", "xinshu", "jiao"]),
    ("xunzi.more.4", "xunzi", "王制", "荀子·王制", "论德而定次，量能而授官。", ["xuan_xian", "de", "zhi_guo"]),
    ("xiaojing.more.1", "xiaojing", "广要道章", "孝经·广要道章", "教民亲爱，莫善于孝；教民礼顺，莫善于悌。", ["xiao", "ti", "jiaohua"]),
    ("xiaojing.more.2", "xiaojing", "广扬名章", "孝经·广扬名章", "君子之事亲孝，故忠可移于君。", ["xiao", "zhong", "junzi"]),
    ("shijing.more.1", "shijing", "小雅", "诗经·小雅", "高山仰止，景行行止。", ["jingxing", "de", "xue"]),
    ("shijing.more.2", "shijing", "大雅", "诗经·大雅", "周虽旧邦，其命维新。", ["tianming", "rixin", "zheng"]),
    ("shangshu.more.1", "shangshu", "大禹谟", "尚书·大禹谟", "满招损，谦受益。", ["qian", "de", "junzi"]),
    ("shangshu.more.2", "shangshu", "泰誓", "尚书·泰誓", "天视自我民视，天听自我民听。", ["minben", "tian", "zheng"]),
    ("yijing.more.1", "yijing", "乾卦", "周易·乾卦", "天行健，君子以自强不息。", ["junzi", "ziqiang", "heng"]),
    ("yijing.more.2", "yijing", "坤卦", "周易·坤卦", "地势坤，君子以厚德载物。", ["junzi", "houde", "de"]),
]


CONCEPTS = [
    ("yin_cai_shi_jiao", "因材施教", "yīn cái shī jiào", "teaching according to aptitude", "根据学习者资质与处境施以不同教法。", ["jiao", "zhongyong"]),
    ("qifa", "启发", "qǐ fā", "elicitation", "在学习者将通未通时给予点拨。", ["jiao", "xue"]),
    ("shi_jiao", "诗教", "shī jiào", "education through poetry", "以诗涵养情感、语言和德性。", ["jiao", "qing"]),
    ("chengren_zhimei", "成人之美", "chéng rén zhī měi", "helping others fulfill the good", "成全他人的善而不助长其恶。", ["ren", "shan"]),
    ("da_zhangfu", "大丈夫", "dà zhàng fū", "great person", "不为富贵、贫贱、威武所动的刚健人格。", ["yi", "yong"]),
    ("du_shan", "独善", "dú shàn", "cultivating oneself in obscurity", "不得志时守住自身德性。", ["xiu_shen"]),
    ("jian_shan", "兼善", "jiān shàn", "benefiting the world", "得志时把善扩展到天下。", ["ping_tianxia"]),
    ("benfen", "本分", "běn fèn", "one's proper role", "在自身位置上履行应尽之事。", ["li", "zeren"]),
    ("shan_yu_jia_wu", "善假于物", "shàn jiǎ yú wù", "skillful use of tools", "善于借助工具和环境完成学习与行动。", ["xue", "zhi"]),
    ("xinshu", "心术", "xīn shù", "orientation of the heart", "判断与行动背后的心志方向。", ["zheng_xin", "cheng_yi"]),
    ("jingxing", "景行", "jǐng xíng", "exemplary conduct", "令人仰慕并愿意追随的高尚行为。", ["de", "junzi"]),
    ("qian", "谦", "qiān", "humility", "不自满、能受益的德性姿态。", ["de", "junzi"]),
    ("ziqiang", "自强", "zì qiáng", "self-strengthening", "持续奋发、不自弃的生命力量。", ["heng", "yong"]),
    ("houde", "厚德", "hòu dé", "thick virtue", "宽厚承载万物的德性境界。", ["de", "ren"]),
    ("renai", "仁爱", "rén ài", "humane love", "以仁为根的关爱与体恤。", ["ren", "guanhuai"]),
    ("liyi", "礼义", "lǐ yì", "ritual and righteousness", "礼的秩序与义的正当性结合。", ["li", "yi"]),
    ("li_yue", "礼乐", "lǐ yuè", "ritual and music", "以礼定序、以乐成和的文化制度。", ["li", "yue"]),
    ("xiuji_anren", "修己安人", "xiū jǐ ān rén", "cultivate oneself to bring peace to others", "由自我修养扩展为安顿他人的实践。", ["xiu_shen", "ren"]),
    ("he_er_bu_tong", "和而不同", "hé ér bù tóng", "harmony without uniformity", "在差异中维持和谐，而非消除差异。", ["he", "duihua"]),
    ("gongtongti", "共同体", "gòng tóng tǐ", "community of shared life", "由责任、信任与共同实践组成的生活共同体。", ["shequ", "gong"]),
    ("wenming_duihua", "文明对话", "wén míng duì huà", "civilizational dialogue", "不同文明围绕共同问题进行互释与学习。", ["duihua", "kua_wenhua"]),
    ("lunli", "伦理", "lún lǐ", "ethics", "人在关系中的道理、责任与秩序。", ["ren", "li"]),
    ("renge", "人格", "rén gé", "personhood", "人的道德主体性与可敬品格。", ["junzi", "zunyan"]),
    ("shuangyu", "双语", "shuāng yǔ", "bilingual", "以两种语言降低文化理解门槛。", ["kua_wenhua"]),
    ("kecheng", "课程", "kè chéng", "curriculum", "可进入课堂的结构化学习内容。", ["jiao", "xue"]),
    ("zhushi", "注释", "zhù shì", "commentary", "对经典文句的解释、辨析与出处说明。", ["xue", "jiao"]),
    ("yiben", "译本", "yì běn", "translation edition", "经典跨语言传播中的文本形态。", ["shuangyu", "kua_wenhua"]),
    ("yuanwen", "原文", "yuán wén", "source text", "经典文本的原始语言表达。", ["zhushi", "xue"]),
    ("suoyin", "索引", "suǒ yǐn", "index", "帮助检索经典、概念与人物的结构化入口。", ["zhixu"]),
    ("zhishitupu", "知识图谱", "zhī shí tú pǔ", "knowledge graph", "以实体和关系组织文化知识的结构。", ["suoyin", "duihua"]),
    ("changjing", "场景", "chǎng jǐng", "scenario", "把抽象伦理放入具体生活情境。", ["li", "zeren"]),
    ("fansi", "反思", "fǎn sī", "reflection", "对行动后果与自身动机的回看。", ["fanxing", "si"]),
    ("shijian_zhihui", "实践智慧", "shí jiàn zhì huì", "practical wisdom", "在具体情境中作合宜判断的能力。", ["zhi", "quan"]),
    ("haiwai_chuanbo", "海外传播", "hǎi wài chuán bō", "overseas communication", "面向跨语言、跨文化受众的文化表达。", ["kua_wenhua", "duihua"]),
    ("kexindu", "可信度", "kě xìn dù", "credibility", "由来源、审校和透明机制建立的信任。", ["xin", "zhushi"]),
    ("keshuyuan", "可溯源", "kě sù yuán", "traceability", "内容可回到经典出处和生成依据。", ["yuanwen", "zhushi"]),
    ("shenhe", "审核", "shěn hé", "review", "对平台内容进行专家或人工把关。", ["kexindu"]),
    ("duoyuan", "多元", "duō yuán", "plurality", "承认不同文化、立场和经验并存。", ["he_er_bu_tong"]),
    ("baorong", "包容", "bāo róng", "inclusion", "让差异主体被看见、被尊重。", ["ren", "he"]),
    ("gonggongli", "公共理性", "gōng gòng lǐ xìng", "public reason", "公共议题中可共同讨论和说明的理由。", ["gong", "duihua"]),
]


PEOPLE = [
    ("ma_rong", "马融", "Ma Rong", "经学", "东汉", "东汉经学家。"),
    ("zheng_xuan", "郑玄", "Zheng Xuan", "经学", "东汉", "汉代经学集大成注家。"),
    ("he_yan", "何晏", "He Yan", "玄学", "魏晋", "《论语集解》相关人物。"),
    ("huang_kan", "皇侃", "Huang Kan", "经学", "南朝", "《论语义疏》作者。"),
    ("kong_yingda", "孔颖达", "Kong Yingda", "经学", "唐", "《五经正义》主编。"),
    ("xing_bing", "邢昺", "Xing Bing", "经学", "北宋", "十三经注疏相关注家。"),
    ("cai_yuanpei", "蔡元培", "Cai Yuanpei", "现代教育", "近现代", "现代教育思想家。"),
    ("liang_shuming", "梁漱溟", "Liang Shuming", "现代新儒家", "现代", "现代新儒家代表。"),
    ("xiong_shili", "熊十力", "Xiong Shili", "现代新儒家", "现代", "现代新儒家代表。"),
    ("mou_zongsan", "牟宗三", "Mou Zongsan", "现代新儒家", "现代", "现代新儒家代表。"),
    ("tang_junyi", "唐君毅", "Tang Junyi", "现代新儒家", "现代", "现代新儒家代表。"),
    ("xu_fuguan", "徐复观", "Xu Fuguan", "现代新儒家", "现代", "现代新儒家代表。"),
    ("du_weiming", "杜维明", "Tu Weiming", "现代新儒家", "当代", "推动儒学现代转化与文明对话。"),
    ("yu_yingshi", "余英时", "Yu Yingshi", "史学", "当代", "思想史与士人传统研究者。"),
    ("qian_mu", "钱穆", "Qian Mu", "史学/儒学", "现代", "中国历史与文化研究者。"),
    ("feng_youlan", "冯友兰", "Feng Youlan", "哲学史", "现代", "中国哲学史研究代表。"),
    ("jin_yuelin", "金岳霖", "Jin Yuelin", "哲学", "现代", "现代中国哲学家。"),
    ("li_zehou", "李泽厚", "Li Zehou", "哲学", "当代", "提出情本体等思想的中国哲学研究者。"),
    ("chen_lai", "陈来", "Chen Lai", "儒学研究", "当代", "儒学与中国哲学研究者。"),
    ("yang_bojun", "杨伯峻", "Yang Bojun", "古籍整理", "当代", "《论语译注》《孟子译注》作者。"),
]


def _ensure_book(db: Session, book_id: str, seen: set[str]) -> None:
    if book_id in seen or db.get(Book, book_id):
        seen.add(book_id)
        return
    zh, en, author, era, order = BOOKS.get(book_id, (book_id, book_id, None, None, 99))
    db.add(Book(id=book_id, title_zh=zh, title_i18n={"en": en}, author=author, era=era, sort_order=order))
    seen.add(book_id)


def _ensure_chapter(db: Session, book_id: str, title: str, seen: set[str]) -> str:
    cid = f"{book_id}.{title}"
    if cid not in seen and not db.get(Chapter, cid):
        db.add(Chapter(id=cid, book_id=book_id, title_zh=title, sort_order=300))
    seen.add(cid)
    return cid


def _add_passages(db: Session) -> int:
    n = 0
    seen_books: set[str] = set()
    seen_chapters: set[str] = set()
    for ref_id, book_id, chapter, ref_label, text, concepts in PASSAGES:
        if db.get(Passage, ref_id):
            continue
        _ensure_book(db, book_id, seen_books)
        chap_id = _ensure_chapter(db, book_id, chapter, seen_chapters)
        db.add(Passage(id=ref_id, chapter_id=chap_id, ref_label=ref_label, original_text=text, pinyin="", sort_order=1500, concepts=concepts))
        db.add(Translation(passage_id=ref_id, lang="zh", text=text, translator="原文"))
        db.add(Translation(passage_id=ref_id, lang="en", text=f"Platform draft translation: {text}", translator="platform-draft"))
        db.add(Annotation(passage_id=ref_id, type="modern", lang="zh", source="平台第三轮增强包", content=f"本条可用于「{'、'.join(concepts[:4])}」等主题的文化解释，待专家审校。"))
        n += 1
    return n


def _add_concepts(db: Session) -> int:
    n = 0
    for cid, zh, pinyin, en, definition, related in CONCEPTS:
        if db.get(Concept, cid):
            continue
        db.add(Concept(id=cid, zh=zh, pinyin=pinyin, i18n={"en": en}, school="儒家/跨文化", rarity="normal", definition={"zh": definition, "en": en}, related=related))
        n += 1
    return n


def _add_people(db: Session) -> int:
    n = 0
    for pid, zh, en, school, era, bio in PEOPLE:
        if db.get(Person, pid):
            continue
        db.add(Person(id=pid, name_zh=zh, name_i18n={"en": en}, school=school, era=era, bio={"zh": bio, "en": en}))
        n += 1
    return n


def _add_propositions(db: Session) -> int:
    n = 0
    for ref_id, *_rest in PASSAGES:
        text = _rest[3]
        pid = "prop_" + ref_id.replace(".", "_")
        if db.get(Proposition, pid):
            continue
        db.add(Proposition(id=pid, text_zh=text, text_i18n={"en": text}, passage_ref=ref_id))
        n += 1
    return n


def _node_exists(db: Session, node_id: str, node_type: str) -> bool:
    model = {"person": Person, "proposition": Proposition, "concept": Concept, "passage": Passage}.get(node_type)
    if model:
        return db.get(model, node_id) is not None
    if node_type == "school":
        from .models import School
        return db.get(School, node_id) is not None
    return False


def _edge_exists(db: Session, s: str, label: str, t: str) -> bool:
    return db.execute(select(GraphEdge).where(GraphEdge.source_id == s, GraphEdge.label == label, GraphEdge.target_id == t)).scalar_one_or_none() is not None


def _add_edge(db: Session, s: str, st: str, label: str, t: str, tt: str) -> bool:
    if not (_node_exists(db, s, st) and _node_exists(db, t, tt)):
        return False
    if _edge_exists(db, s, label, t):
        return False
    db.add(GraphEdge(source_id=s, source_type=st, label=label, target_id=t, target_type=tt))
    return True


def _add_edges(db: Session) -> int:
    edges: list[tuple[str, str, str, str, str]] = []
    for ref_id, book_id, _, _, _, concepts in PASSAGES:
        pid = "prop_" + ref_id.replace(".", "_")
        proposer = "kongzi"
        if book_id == "mengzi":
            proposer = "mengzi"
        elif book_id == "xunzi":
            proposer = "xunzi"
        elif book_id in {"liji", "xiaojing"}:
            proposer = "zengzi"
        edges.append((proposer, "person", "PROPOSED", pid, "proposition"))
        edges.append((pid, "proposition", "FROM", ref_id, "passage"))
        for c in concepts:
            edges.append((ref_id, "passage", "MENTIONS", c, "concept"))
            edges.append((pid, "proposition", "ABOUT", c, "concept"))
    for cid, _, _, _, _, related in CONCEPTS:
        for r in related:
            edges.append((cid, "concept", "RELATED_TO", r, "concept"))
    for pid, *_ in PEOPLE:
        edges.append((pid, "person", "BELONGS_TO", "rujia", "school"))
    for a, b in [
        ("zheng_xuan", "kong_yingda"), ("kong_yingda", "xing_bing"), ("liang_shuming", "xiong_shili"),
        ("xiong_shili", "mou_zongsan"), ("mou_zongsan", "tang_junyi"), ("mou_zongsan", "xu_fuguan"),
        ("du_weiming", "mou_zongsan"), ("qian_mu", "yu_yingshi"), ("feng_youlan", "chen_lai"),
    ]:
        edges.append((a, "person", "INFLUENCED", b, "person"))
    n = 0
    for e in edges:
        if _add_edge(db, *e):
            n += 1
    return n


def _add_cases(db: Session) -> int:
    questions = []
    topics = ["tech_ethics", "climate", "social", "personal", "governance"]
    stems = [
        "如何把儒家概念讲给没有中文背景的学生？", "如何设计一节跨文明伦理课？", "如何用知识图谱解释仁与礼？",
        "如何把经典原文转化成短视频脚本？", "如何处理传统文化中的争议表达？", "如何让海外用户相信平台内容可靠？",
        "如何把孝解释为现代关怀伦理？", "如何把礼解释为公共生活中的边界感？", "如何把君子解释为人格教育？",
        "如何把中庸用于冲突调解？", "如何把儒家用于 AI 产品伦理评审？", "如何把民本用于公共政策讨论？",
        "如何把大同理想用于全球治理讨论？", "如何把诗教用于语言文化课程？", "如何把礼乐用于情绪教育？",
    ]
    for topic in topics:
        for stem in stems:
            questions.append((topic, stem))
    n = 0
    for topic_id, q in questions:
        title = f"第三轮精选案例 · {topic_id} · {q}"
        if db.execute(select(DialogCase).where(DialogCase.title == title)).scalar_one_or_none():
            continue
        citations = []
        for rid in ["lunyu.more.8", "liji.more.4", "mengzi.more.7"]:
            p = db.get(Passage, rid)
            if p:
                citations.append({"ref_id": rid, "ref_label": p.ref_label or rid, "text": p.original_text})
        db.add(DialogCase(
            topic_id=topic_id,
            lang="zh",
            title=title,
            question=q,
            confucian_answer=(
                f"【问题】{q}\n\n"
                "【平台回答草案】先给出现代问题，再给出儒家概念解释，随后回到原文和注释，最后开放与其他文明传统的比较。"
                " 对海外传播而言，关键是避免单向宣讲，改用可追问、可溯源、可讨论的结构。\n\n"
                f"【经典依据】{'；'.join(c['text'] for c in citations)}\n\n"
                "【产品用法】可用于课堂卡片、对话案例、图谱入口、短视频脚本和教师备课。"
            ),
            cross_civ_views=[],
            citations=citations,
            tags=["第三轮精选案例", topic_id, "overseas", "content_strategy"],
            status="published",
            quality=3,
            ai_generated=True,
            reviewer="seed_enrichment_more",
            review_note="第三轮增强包生成的海外传播产品化案例，待专家复核。",
        ))
        n += 1
    return n


def seed_enrichment_more(db: Session) -> dict:
    counts = {
        "passages": _add_passages(db),
        "concepts": _add_concepts(db),
        "people": _add_people(db),
    }
    db.flush()
    counts["propositions"] = _add_propositions(db)
    db.flush()
    counts["graph_edges"] = _add_edges(db)
    counts["cases"] = _add_cases(db)
    db.commit()
    return counts


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print("[seed_enrichment_more]", seed_enrichment_more(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()

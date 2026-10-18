"""数艺 5 场景 + 关联经典 seed。
玩法：均输（按权重正比例分配）+ 衰分（按等级递减分配）。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .models import Annotation, Book, Chapter, MathScenario, Passage, Translation

# ────────────────────────────────────────────────
# 关联经典
# ────────────────────────────────────────────────
MATH_PASSAGES = [
    {
        "id": "lunyu.jishi.16.1",
        "book_id": "lunyu",
        "chapter_id": "jishi",
        "chapter_title": "季氏",
        "ref_label": "论语·季氏·16.1",
        "original_text": "丘也闻有国有家者，不患寡而患不均，不患贫而患不安。盖均无贫，和无寡，安无倾。",
        "pinyin": "qiū yě wén yǒu guó yǒu jiā zhě, bù huàn guǎ ér huàn bù jūn, bù huàn pín ér huàn bù ān. gài jūn wú pín, hé wú guǎ, ān wú qīng.",
        "concepts": ["jun", "an", "li"],
        "i18n": {
            "en": "I have heard that the heads of states and clans worry not about scarcity but about uneven distribution; not about poverty but about insecurity. For where there is equity, there is no poverty; where there is harmony, no scarcity; where there is security, no overthrow.",
            "fr": "J'ai entendu dire que ceux qui gouvernent un État ou une maison ne craignent pas la rareté mais l'inégalité ; non la pauvreté mais l'insécurité. Car où il y a équité, point de pauvreté ; harmonie, point de manque ; sécurité, point de chute.",
            "es": "He oído que quienes gobiernan un Estado o una familia no temen la escasez sino la desigualdad; no la pobreza sino la inseguridad. Donde hay equidad no hay pobreza; donde hay armonía no hay escasez; donde hay seguridad no hay caída.",
            "ar": "سمعت أن أصحاب الدول والبيوت لا يخشون القلة بل عدم العدل، ولا الفقر بل عدم الأمن. فإذا كان العدل فلا فقر، والوفاق فلا قلة، والأمن فلا سقوط.",
        },
        "anno_classical": ("朱熹《论语集注》", "均无贫者，公平之分使各得其所，故无贫；和无寡者，上下相和，故无外离之者。"),
        "anno_modern": "孔子治国名言：不怕东西少，怕分得不公；不怕穷，怕不安定。分配公平了，自然无贫；和睦了，人就不离；安定了，国就不倒。",
    },
    {
        "id": "zhouli.junshu.1",
        "book_id": "zhouli",
        "chapter_id": "tianguan-junshu",
        "chapter_title": "天官·均人",
        "ref_label": "周礼·均人",
        "original_text": "均人掌均地政，均地守，均地职，均人民牛马车辇之力政。",
        "pinyin": "jūn rén zhǎng jūn dì zhèng, jūn dì shǒu, jūn dì zhí, jūn rén mín niú mǎ chē niǎn zhī lì zhèng.",
        "concepts": ["jun", "li"],
        "i18n": {
            "en": "The Junren (Equalizer) is in charge of balancing land taxes, land duties, land posts, and the labor levies of people, oxen, horses, carts, and carriages.",
            "fr": "Le Junren est chargé de l'égalisation des impôts fonciers, des charges foncières, des fonctions foncières et des corvées humaines, bovines, équines et de charroi.",
            "es": "El Junren se encarga de igualar los tributos de tierra, las obligaciones territoriales y las cargas humanas, bovinas, equinas y de transporte.",
            "ar": "يتولى «الجن رن» العدلَ في ضرائب الأرض، وواجباتها، ووظائفها، وفي الكلفات على الناس والثيران والخيل والعربات.",
        },
        "anno_classical": ("郑玄注", "均犹平也。地政、地守、地职皆平之，以便民。"),
        "anno_modern": "周代专设「均人」官职，主管赋税、徭役、劳力的公平分摊——这是儒家「数」治理国家的实例：数学不只是算，更是分配的工具。",
    },
    {
        "id": "jiuzhang.junshu.1",
        "book_id": "jiuzhang",
        "chapter_id": "junshu",
        "chapter_title": "均输",
        "ref_label": "九章算术·均输",
        "original_text": "今有均输粟，甲县一万户，行道八日；乙县九千五百户，行道十日；丙县一万二千三百五十户，行道十三日；丁县一万二千二百户，行道二十日，各到输所。凡四县赋当输二十五万斛。",
        "pinyin": "jīn yǒu jūn shū sù, jiǎ xiàn yī wàn hù...",
        "concepts": ["jun"],
        "i18n": {
            "en": "Suppose grain is to be transported equitably: County A has 10,000 households, 8 days journey; County B has 9,500 households, 10 days; County C has 12,350 households, 13 days; County D has 12,200 households, 20 days. Four counties together must transport 250,000 hu.",
            "fr": "Soit le transport équitable de grain : comté A, 10 000 foyers, 8 jours de route ; B, 9 500 foyers, 10 jours ; C, 12 350 foyers, 13 jours ; D, 12 200 foyers, 20 jours. Les quatre comtés ensemble transportent 250 000 hu.",
            "es": "Supongamos transporte equitativo de grano: condado A, 10 000 hogares, 8 días de viaje; B, 9 500 hogares, 10 días; C, 12 350 hogares, 13 días; D, 12 200 hogares, 20 días. Los cuatro condados transportan 250 000 hu en total.",
            "ar": "ولنفرض نقلاً عادلاً للحبوب: مقاطعة (أ) عشرة آلاف بيت ومسافة ثمانية أيام؛ (ب) تسعة آلاف وخمسمائة بيت وعشرة أيام؛ (ج) اثنا عشر ألفاً وثلاثمائة وخمسون بيتاً وثلاثة عشر يوماً؛ (د) اثنا عشر ألفاً ومئتا بيت وعشرون يوماً. والمقاطعات الأربع تنقل مجتمعةً خمساً وعشرين ألفِ مائة هو.",
        },
        "anno_classical": ("刘徽注", "均输者，齐其劳费之差也。"),
        "anno_modern": "中国最早的运筹学问题：四县按户数与路程公平分摊运粮负担。算法核心是按「户数 ÷ 路程」反比配权——路远的少分摊。",
    },
    {
        "id": "jiuzhang.cuifen.1",
        "book_id": "jiuzhang",
        "chapter_id": "cuifen",
        "chapter_title": "衰分",
        "ref_label": "九章算术·衰分",
        "original_text": "今有大夫、不更、簪袅、上造、公士凡五人，共猎得五鹿。欲以爵次分之，问各得几何？",
        "pinyin": "jīn yǒu dà fū bù gēng zān niǎo shàng zào gōng shì fán wǔ rén...",
        "concepts": ["cuifen"],
        "i18n": {
            "en": "Five men of ranks Dafu, Bugeng, Zanniao, Shangzao, Gongshi together hunted five deer. Divide them by rank order. How much each?",
            "fr": "Cinq hommes des rangs Dafu, Bugeng, Zanniao, Shangzao, Gongshi chassèrent ensemble cinq cerfs. À diviser selon les rangs. Combien chacun ?",
            "es": "Cinco hombres de rangos Dafu, Bugeng, Zanniao, Shangzao, Gongshi cazaron juntos cinco ciervos. Dividir según rango. ¿Cuánto cada uno?",
            "ar": "خمسة رجال من رتب «داي فو» و«بو قنق» و«زان نياو» و«شانق زاو» و«قونق شي» اصطادوا معاً خمسة غزلان. يقسم حسب الرتب. كم لكل منهم؟",
        },
        "anno_classical": ("李淳风注", "衰者，差也。按爵位高下而递减，谓之衰分。"),
        "anno_modern": "衰分 = 按等级递减分配。古爵分五等，按 5:4:3:2:1 比例分鹿——5 鹿分得 5/3, 4/3, 1, 2/3, 1/3。",
    },
    {
        "id": "guanzi.chengma.1",
        "book_id": "guanzi",
        "chapter_id": "chengma",
        "chapter_title": "乘马",
        "ref_label": "管子·乘马",
        "original_text": "地者，政之本也。是故地可以正政也。地不平均和调，则政不可正也。",
        "pinyin": "dì zhě, zhèng zhī běn yě. shì gù dì kě yǐ zhèng zhèng yě. dì bù píng jūn hé tiáo, zé zhèng bù kě zhèng yě.",
        "concepts": ["jun", "zhi"],
        "i18n": {
            "en": "Land is the foundation of governance. Therefore land can rectify governance. If land is not equitably distributed and harmonized, governance cannot be rectified.",
            "fr": "La terre est le fondement du gouvernement. Aussi la terre peut-elle rectifier le gouvernement. Si la terre n'est ni équitablement répartie ni harmonisée, le gouvernement ne peut être rectifié.",
            "es": "La tierra es la base del gobierno. Por eso la tierra puede rectificar el gobierno. Si la tierra no se distribuye con equidad y armonía, el gobierno no puede rectificarse.",
            "ar": "الأرض أساس الحكم، فإذا كانت الأرض موزعة بعدل وانسجام صحّ الحكم، وإلا لم يصح.",
        },
        "anno_classical": ("尹知章注", "地者税赋所出，分配不均则民不安、政不行。"),
        "anno_modern": "管仲论治国：土地分配是政治的根本——分得公平，则政可正；不均，则政不行。",
    },
]

# ────────────────────────────────────────────────
# 5 个场景（ideal_share 是按权重算出的标准答案）
# ────────────────────────────────────────────────
SCENARIOS = [
    {
        "title": "均输三乡赋税",
        "kind": "junshu",
        "kind_label": "均输",
        "setting": "某县须共纳 90 担税米，按田亩比例公平分摊给三乡。",
        "hint": "「均输」按权重正比例分配。田亩越多承担越多。总田亩 33 亩 → 每亩约 2.73 担。",
        "items": [
            # 5 户 × 4 亩 = 20 亩 → 20/33 × 90 ≈ 54.55
            {
                "name": "甲乡", "attrs": "5 户 · 户均田 4 亩 = 20 亩", "ideal_share": 54.5,
                "metrics": {"田亩": 20, "路近": 1, "民困": 1},
                "metric_labels": {"田亩": "田亩/承受力", "路近": "运输便利", "民困": "民困照顾"},
                "default_weights": {"田亩": 1, "路近": 0, "民困": 0},
                "principle": "先按田亩承受力分摊，再观察是否需要照顾民困。",
            },
            # 3 × 3 = 9 → 24.55
            {"name": "乙乡", "attrs": "3 户 · 户均田 3 亩 = 9 亩", "ideal_share": 24.5, "metrics": {"田亩": 9, "路近": 1, "民困": 1.2}},
            # 2 × 2 = 4 → 10.91
            {"name": "丙乡", "attrs": "2 户 · 户均田 2 亩 = 4 亩", "ideal_share": 11.0, "metrics": {"田亩": 4, "路近": 1, "民困": 1.6}},
        ],
        "total": 90,
        "unit": "担",
        "refs": ["lunyu.jishi.16.1"],
        "sort_order": 1,
    },
    {
        "title": "五子衰分父遗",
        "kind": "cuifen",
        "kind_label": "衰分",
        "setting": "父留 100 金，五子按长幼递减分（5:4:3:2:1）。问各得几何？",
        "hint": "「衰分」按爵次/长幼递减。五子比例 5:4:3:2:1，总份 15 → 100 ÷ 15 ≈ 6.67 金/份。",
        "items": [
            {
                "name": "长子", "attrs": "权 5", "ideal_share": 33.3,
                "metrics": {"名分": 5, "需要": 1, "照护": 1},
                "metric_labels": {"名分": "名分次第", "需要": "生活需要", "照护": "弱者照护"},
                "default_weights": {"名分": 1, "需要": 0, "照护": 0},
                "principle": "衰分重名分次第，但现代讨论中也可观察需要与照护。",
            },
            {"name": "次子", "attrs": "权 4", "ideal_share": 26.7, "metrics": {"名分": 4, "需要": 1, "照护": 1}},
            {"name": "三子", "attrs": "权 3", "ideal_share": 20.0, "metrics": {"名分": 3, "需要": 1, "照护": 1}},
            {"name": "四子", "attrs": "权 2", "ideal_share": 13.3, "metrics": {"名分": 2, "需要": 1, "照护": 1.2}},
            {"name": "幼子", "attrs": "权 1", "ideal_share": 6.7, "metrics": {"名分": 1, "需要": 1, "照护": 1.5}},
        ],
        "total": 100,
        "unit": "金",
        "refs": ["jiuzhang.cuifen.1"],
        "sort_order": 2,
    },
    {
        "title": "四州分赈灾粮",
        "kind": "junshu",
        "kind_label": "均输",
        "setting": "州府发 200 石赈灾粮，按「人口 × 灾损率」分给四州。多灾多人之州得多。",
        "hint": "权重 = 人口 × 灾损率。总权重 = 10×0.8 + 6×0.5 + 4×0.3 + 5×0.4 = 13.2。",
        "items": [
            # 10 × 0.8 = 8.0 → 8/13.2 × 200 ≈ 121.2
            {
                "name": "东州", "attrs": "10 万人 · 灾损 80%", "ideal_share": 121.2,
                "metrics": {"人口": 10, "灾情": 8, "路近": 2},
                "metric_labels": {"人口": "受灾人口", "灾情": "灾损程度", "路近": "送达便利"},
                "default_weights": {"人口": 1, "灾情": 1, "路近": 0},
                "principle": "赈灾粮优先看人口与灾情，路程只影响调度，不应压过生民之急。",
            },
            # 6 × 0.5 = 3.0 → 45.5
            {"name": "南州", "attrs": "6 万人 · 灾损 50%", "ideal_share": 45.5, "metrics": {"人口": 6, "灾情": 5, "路近": 4}},
            # 4 × 0.3 = 1.2 → 18.2
            {"name": "西州", "attrs": "4 万人 · 灾损 30%", "ideal_share": 18.2, "metrics": {"人口": 4, "灾情": 3, "路近": 5}},
            # 5 × 0.4 = 2.0 → 30.3
            {"name": "北州", "attrs": "5 万人 · 灾损 40%", "ideal_share": 30.3, "metrics": {"人口": 5, "灾情": 4, "路近": 3}},
        ],
        "total": 200,
        "unit": "石",
        "refs": ["lunyu.jishi.16.1", "zhouli.junshu.1"],
        "sort_order": 3,
    },
    {
        "title": "三班分劳役",
        "kind": "cuifen",
        "kind_label": "衰分",
        "setting": "30 工日劳役，三班按「壮丁数 ÷ 体力差」分担——壮丁多体力好的班多担。",
        "hint": "权重 = 壮丁 ÷ 体力差。甲班 20÷1=20，乙 15÷2=7.5，丙 10÷3=3.33。总 30.83。",
        "items": [
            # 20 / 30.83 × 30 ≈ 19.46
            {
                "name": "甲班", "attrs": "20 壮丁 · 体力差 1（最壮）", "ideal_share": 19.5,
                "metrics": {"壮丁": 20, "体力": 3, "照护": 1},
                "metric_labels": {"壮丁": "可出人数", "体力": "承役能力", "照护": "弱者照护"},
                "default_weights": {"壮丁": 1, "体力": 1, "照护": 0},
                "principle": "劳役分配既看人数，也看承受能力；弱者照护可作为修正项。",
            },
            # 7.5 → 7.29
            {"name": "乙班", "attrs": "15 壮丁 · 体力差 2", "ideal_share": 7.3, "metrics": {"壮丁": 15, "体力": 1.5, "照护": 1.2}},
            # 3.33 → 3.24
            {"name": "丙班", "attrs": "10 壮丁 · 体力差 3（较弱）", "ideal_share": 3.2, "metrics": {"壮丁": 10, "体力": 1, "照护": 1.6}},
        ],
        "total": 30,
        "unit": "工日",
        "refs": ["zhouli.junshu.1"],
        "sort_order": 4,
    },
    {
        "title": "五县分驻军",
        "kind": "junshu",
        "kind_label": "均输",
        "setting": "兵部派 500 兵驻五县，按「兵源 + 战略权 × 2」分配。",
        "hint": "权重 = 兵源 + 战略权×2。例如 A 县：8+3×2=14。总权重 = 14+10+8+12+6 = 50。每权重 10 兵。",
        "items": [
            # 8 + 3*2 = 14 → 140
            {
                "name": "A 县", "attrs": "兵源 8 · 战略权 3", "ideal_share": 140,
                "metrics": {"兵源": 8, "战略": 6, "民困": 1},
                "metric_labels": {"兵源": "兵源基础", "战略": "战略要冲", "民困": "民困修正"},
                "default_weights": {"兵源": 1, "战略": 1, "民困": 0},
                "principle": "驻军分配须兼顾兵源和战略位置，也要避免扰民过重。",
            },
            # 6 + 2*2 = 10 → 100
            {"name": "B 县", "attrs": "兵源 6 · 战略权 2", "ideal_share": 100, "metrics": {"兵源": 6, "战略": 4, "民困": 1.2}},
            # 4 + 2*2 = 8 → 80
            {"name": "C 县", "attrs": "兵源 4 · 战略权 2", "ideal_share": 80, "metrics": {"兵源": 4, "战略": 4, "民困": 1.4}},
            # 6 + 3*2 = 12 → 120
            {"name": "D 县", "attrs": "兵源 6 · 战略权 3", "ideal_share": 120, "metrics": {"兵源": 6, "战略": 6, "民困": 1.1}},
            # 4 + 1*2 = 6 → 60
            {"name": "E 县", "attrs": "兵源 4 · 战略权 1", "ideal_share": 60, "metrics": {"兵源": 4, "战略": 2, "民困": 1.5}},
        ],
        "total": 500,
        "unit": "兵",
        "refs": ["guanzi.chengma.1"],
        "sort_order": 5,
    },
    {
        "title": "水渠工料筹算",
        "kind": "junshu",
        "kind_label": "治水筹算",
        "setting": "雨季前要把 120 车石料分给四段水渠。玩家需权衡险情、人口与施工难度。",
        "hint": "建议先重视险情和人口；施工难度越高，投入越多，但不能让其他渠段失守。",
        "items": [
            {
                "name": "上游险段", "attrs": "险情 9 · 护民 6 · 难度 5", "ideal_share": 43.6,
                "metrics": {"险情": 9, "人口": 6, "难度": 5},
                "metric_labels": {"险情": "溃决风险", "人口": "影响民户", "难度": "施工难度"},
                "default_weights": {"险情": 1.2, "人口": 1, "难度": 0.6},
                "principle": "治水筹算不只看工程量，还要先保民命，再求长久安定。",
            },
            {"name": "东村渠口", "attrs": "险情 6 · 护民 8 · 难度 3", "ideal_share": 34.1, "metrics": {"险情": 6, "人口": 8, "难度": 3}},
            {"name": "西田支渠", "attrs": "险情 4 · 护民 5 · 难度 4", "ideal_share": 22.8, "metrics": {"险情": 4, "人口": 5, "难度": 4}},
            {"name": "南堤尾闸", "attrs": "险情 3 · 护民 4 · 难度 2", "ideal_share": 19.5, "metrics": {"险情": 3, "人口": 4, "难度": 2}},
        ],
        "total": 120,
        "unit": "车",
        "refs": ["guanzi.chengma.1", "lunyu.jishi.16.1"],
        "sort_order": 6,
    },
    {
        "title": "市井平价断案",
        "kind": "junshu",
        "kind_label": "九章断案",
        "setting": "集市粮价波动，县里拿出 300 贯平准金，按缺粮、人口与商旅阻滞分给三市。",
        "hint": "这是一个数学断案：分得太平均会误伤重灾市，太偏又会引发怨气。",
        "items": [
            {
                "name": "北市", "attrs": "缺粮 9 · 人口 7 · 阻滞 6", "ideal_share": 136.4,
                "metrics": {"缺粮": 9, "人口": 7, "阻滞": 6},
                "metric_labels": {"缺粮": "缺粮程度", "人口": "市民规模", "阻滞": "商路阻滞"},
                "default_weights": {"缺粮": 1.1, "人口": 1, "阻滞": 0.7},
                "principle": "平价不是压低一切价格，而是让急困处先得稳定。",
            },
            {"name": "东市", "attrs": "缺粮 5 · 人口 9 · 阻滞 3", "ideal_share": 103.4, "metrics": {"缺粮": 5, "人口": 9, "阻滞": 3}},
            {"name": "西市", "attrs": "缺粮 4 · 人口 4 · 阻滞 8", "ideal_share": 60.2, "metrics": {"缺粮": 4, "人口": 4, "阻滞": 8}},
        ],
        "total": 300,
        "unit": "贯",
        "refs": ["lunyu.jishi.16.1"],
        "sort_order": 7,
    },
]


def ensure_book_and_chapter(db: Session, item: dict) -> None:
    if not db.get(Book, item["book_id"]):
        title_zh = {"lunyu": "论语", "liji": "礼记", "mengzi": "孟子",
                    "zhouli": "周礼", "jiuzhang": "九章算术", "guanzi": "管子"}.get(item["book_id"], item["book_id"])
        db.add(Book(id=item["book_id"], title_zh=title_zh, title_i18n={"en": title_zh}))
    if not db.get(Chapter, item["chapter_id"]):
        db.add(Chapter(
            id=item["chapter_id"],
            book_id=item["book_id"],
            title_zh=item["chapter_title"],
            sort_order=999,
        ))


def upsert_passage(db: Session, item: dict) -> Passage:
    p = db.get(Passage, item["id"])
    if not p:
        p = Passage(id=item["id"])
        db.add(p)
    p.chapter_id = item["chapter_id"]
    p.ref_label = item["ref_label"]
    p.original_text = item["original_text"]
    p.pinyin = item["pinyin"]
    p.concepts = list(item["concepts"])
    return p


def upsert_translations(db: Session, passage_id: str, i18n: dict) -> None:
    existing = {t.lang for t in db.query(Translation).filter(Translation.passage_id == passage_id).all()}
    for lang, text in i18n.items():
        if lang in existing:
            continue
        db.add(Translation(passage_id=passage_id, lang=lang, text=text, translator="seed-math"))


def upsert_annotations(db: Session, passage_id: str, classical: tuple, modern: str) -> None:
    existing = {(a.type, a.lang) for a in db.query(Annotation).filter(Annotation.passage_id == passage_id).all()}
    src, content = classical
    if ("classical", "zh") not in existing:
        db.add(Annotation(passage_id=passage_id, type="classical", lang="zh", source=src, content=content))
    if ("modern", "zh") not in existing:
        db.add(Annotation(passage_id=passage_id, type="modern", lang="zh", source="编者", content=modern))


def main() -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for item in MATH_PASSAGES:
            ensure_book_and_chapter(db, item)
            upsert_passage(db, item)
            db.flush()
            upsert_translations(db, item["id"], item["i18n"])
            upsert_annotations(db, item["id"], item["anno_classical"], item["anno_modern"])
        print(f"[seed-math] upserted {len(MATH_PASSAGES)} passages")

        added = 0
        for item in SCENARIOS:
            existing = db.query(MathScenario).filter(MathScenario.title == item["title"]).first()
            if existing:
                for k, v in item.items():
                    setattr(existing, k, v)
            else:
                db.add(MathScenario(**item))
                added += 1
        db.commit()
        total = db.query(MathScenario).count()
        print(f"[seed-math] scenarios added={added}, total={total}")
        return total
    finally:
        db.close()


if __name__ == "__main__":
    main()

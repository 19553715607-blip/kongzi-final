"""御艺 5 场景 + 关联经典 seed。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .models import Annotation, Book, Chapter, Passage, Translation, YuScenario

# ────────────────────────────────────────────────
# 关联经典
# ────────────────────────────────────────────────
YU_PASSAGES = [
    {
        "id": "zhouli.baoshi.1",
        "book_id": "zhouli",
        "chapter_id": "diguan-baoshi",
        "chapter_title": "地官·保氏",
        "ref_label": "周礼·地官·保氏",
        "original_text": "乃教之六艺：一曰五礼，二曰六乐，三曰五射，四曰五驭，五曰六书，六曰九数。五驭：鸣和鸾，逐水曲，过君表，舞交衢，逐禽左。",
        "pinyin": "nǎi jiào zhī liù yì... wǔ yù: míng hé luán, zhú shuǐ qū, guò jūn biǎo, wǔ jiāo qú, zhú qín zuǒ.",
        "concepts": ["yu", "li"],
        "i18n": {
            "en": "Then teach them the Six Arts: rites, music, archery, charioteering, calligraphy, mathematics. The Five Charioteering techniques: harmonizing the bells, following the winding river, passing the lord's pillar, dancing through crossroads, hunting with game to the left.",
            "fr": "Puis enseigne-leur les Six Arts. Les Cinq techniques du char : faire sonner les clochettes en cadence, suivre la courbe de l'eau, passer la stèle du seigneur, danser au carrefour, chasser le gibier à gauche.",
            "es": "Enséñales luego las Seis Artes. Las Cinco técnicas de carro: hacer sonar las campanillas en ritmo, seguir la curva del río, pasar la estela del señor, danzar en la encrucijada, cazar con la presa a la izquierda.",
            "ar": "ثم تُعلَّم الفنون الستة. خمس تقنيات للقيادة: ضبط جرس العربة بإيقاع، اتباع منعطف النهر، المرور بنُصب الأمير، الرقص في مفترق الطرق، الصيد بالطريدة إلى اليسار.",
        },
        "anno_classical": ("郑玄注", "鸣和鸾，谓登车则马动而鸾鸣；逐水曲，谓御车随逐水势之屈曲；过君表，谓君表已设而过；舞交衢，谓御车于交道交衢之上；逐禽左，谓田猎之时禽兽奔逸于左则不复射。"),
        "anno_modern": "五御 = 御车的五种礼仪化技法。核心是「礼以行之，不极不躁」——驾车不只是技术，更是礼乐节制的修身工夫。",
    },
    {
        "id": "lunyu.zihan.9.2",
        "book_id": "lunyu",
        "chapter_id": "zihan",
        "chapter_title": "子罕",
        "ref_label": "论语·子罕·9.2",
        "original_text": "达巷党人曰：「大哉孔子！博学而无所成名。」子闻之，谓门弟子曰：「吾何执？执御乎？执射乎？吾执御矣。」",
        "pinyin": "dá xiàng dǎng rén yuē... wú zhí yù yǐ.",
        "concepts": ["yu", "junzi"],
        "i18n": {
            "en": "A villager of Daxiang said: 'Great is Confucius! He has wide learning but is not famed for any one thing.' The Master hearing this said to his disciples: 'What should I master? Charioteering? Archery? I shall master charioteering.'",
            "fr": "Un villageois de Daxiang dit : « Grand est Confucius ! Vaste savoir, mais sans renommée en aucun art. » Le Maître l'entendant dit à ses disciples : « Que devrais-je maîtriser ? Le char ? Le tir ? Je maîtriserai le char. »",
            "es": "Un aldeano de Daxiang dijo: «¡Grande es Confucio! De vasta erudición pero sin fama en ningún arte.» El Maestro al oírlo dijo a sus discípulos: «¿Qué debo dominar? ¿El carro? ¿El tiro? Dominaré el carro.»",
            "ar": "قال أحد أهل دا شيانغ: «عظيم كنفوشيوس، علمه واسع لكن لا يُعرف بفنّ واحد.» فقال المعلم لأصحابه: «بأي شيء أُتقن؟ بالقيادة أم بالرماية؟ سأُتقن القيادة.»",
        },
        "anno_classical": ("朱熹《论语集注》", "孔子自谦无所专长，戏言择其卑者御以应之。然御为六艺之一，亦圣人所兼习。"),
        "anno_modern": "村人嘲孔子博学而无一专长，孔子自嘲：「让我择一艺吗？我选驾车。」御本被视为六艺中较卑微的，孔子偏选——展现的是「君子不器」的态度。",
    },
    {
        "id": "lunyu.xianwen.14.5",
        "book_id": "lunyu",
        "chapter_id": "xianwen",
        "chapter_title": "宪问",
        "ref_label": "论语·宪问·14.5",
        "original_text": "南宫适问于孔子曰：「羿善射，奡荡舟，俱不得其死然。禹稷躬稼而有天下。」夫子不答。南宫适出，子曰：「君子哉若人！尚德哉若人！」",
        "pinyin": "nán gōng kuò wèn yú kǒng zǐ yuē... shàng dé zāi ruò rén!",
        "concepts": ["de", "yu", "she"],
        "i18n": {
            "en": "Nangong Kuo asked Confucius: 'Yi was skilled in archery, Ao at moving boats, yet neither died well. Yu and Ji ploughed the fields and gained the empire.' The Master did not answer. When Nangong Kuo left, the Master said: 'A junzi indeed is this man! He values virtue indeed.'",
            "fr": "Nangong Kuo demanda à Confucius : « Yi excellait au tir, Ao à manier les bateaux, mais aucun n'est mort en paix. Yu et Ji labourèrent et obtinrent l'empire. » Le Maître ne répondit pas. Quand il partit, le Maître dit : « Voilà un sage ! Il honore la vertu. »",
            "es": "Nangong Kuo preguntó a Confucio: «Yi sobresalía en arquería, Ao en mover barcos; ninguno tuvo buena muerte. Yu y Ji araron y ganaron el imperio.» El Maestro no respondió. Cuando salió, el Maestro dijo: «¡Qué junzi! ¡Qué virtud!»",
            "ar": "سأل نان قونغ كُوا كنفوشيوس: «كان يي بارعاً في الرماية، وآو في تسيير السفن، ولم يَمُت أيٌّ منهما بسلام. أما يو وجي فحرثا الأرض ونالا المُلك.» لم يجبه المعلم. لمّا خرج قال: «هذا فاضل، يُجلّ الفضيلة.»",
        },
        "anno_classical": ("朱熹", "夸技艺不如尚德。御与射皆技，唯德可以保身保国。"),
        "anno_modern": "技艺再精（羿善射、奡善御）若无德，终不得善终；禹稷躬耕（朴素），有德而得天下。御的最高境界在德，不在技。",
    },
    {
        "id": "mengzi.tengwengong.xia.6",
        "book_id": "mengzi",
        "chapter_id": "tengwengong-xia",
        "chapter_title": "滕文公下",
        "ref_label": "孟子·滕文公下",
        "original_text": "御者且羞与射者比，比而得禽兽，虽若丘陵，弗为也。",
        "pinyin": "yù zhě qiě xiū yǔ shè zhě bǐ, bǐ ér dé qín shòu, suī ruò qiū líng, fú wéi yě.",
        "concepts": ["yu", "li"],
        "i18n": {
            "en": "Even a charioteer feels ashamed to ally with an unworthy archer; allying with him to bag game, even mountains of it, he would not.",
            "fr": "Même un cocher rougit de s'associer à un mauvais archer ; même pour gibier en montagnes, il refuse.",
            "es": "Incluso el cochero se avergüenza de aliarse con un arquero indigno; aunque cazaran montañas de presas, no lo haría.",
            "ar": "حتى السائق يأنف أن يحالف رامياً وضيعاً، ولو أصاب صيداً كالجبل لما رضي.",
        },
        "anno_classical": ("朱熹《孟子集注》", "御者守职以礼，不为利合于无义。"),
        "anno_modern": "驾车人守自己的职分礼度，宁可不合作，也不为多得猎物而违礼——御之节制。",
    },
    {
        "id": "xunzi.jundao.1",
        "book_id": "xunzi",
        "chapter_id": "jundao",
        "chapter_title": "君道",
        "ref_label": "荀子·君道",
        "original_text": "君者，舟也；庶人者，水也。水则载舟，水则覆舟。",
        "pinyin": "jūn zhě, zhōu yě; shù rén zhě, shuǐ yě. shuǐ zé zài zhōu, shuǐ zé fù zhōu.",
        "concepts": ["yu", "min"],
        "i18n": {
            "en": "The ruler is the boat; the people are the water. The water can carry the boat, and the water can capsize the boat.",
            "fr": "Le souverain est la barque ; le peuple est l'eau. L'eau peut porter la barque, l'eau peut la renverser.",
            "es": "El soberano es la barca; el pueblo es el agua. El agua puede llevar la barca, el agua puede volcarla.",
            "ar": "الحاكم سفينة، والناس ماء. الماء يحمل السفينة، والماء يقلبها.",
        },
        "anno_classical": ("杨倞注", "舟与水非两物，而水可载可覆。御舟御民同理，皆贵在不极。"),
        "anno_modern": "荀子以「舟水」喻君民。驾舟（与驾车同理）要顺水之势，强行硬来则倾覆。御之道，在「不极」。",
    },
]

# ────────────────────────────────────────────────
# 5 场景：道路配置、节拍、障碍物
# ────────────────────────────────────────────────
SCENARIOS = [
    {
        "title": "鸣和鸾",
        "kind": "mingheluan",
        "kind_label": "鸣和鸾",
        "setting": "登车出门，和鸾之声须合乎车行节奏。此关用路面节拍门来表示节奏点。",
        "hint": "不用听声音，看路面黄色 ♩ 节拍门。保持车速稳定在 8 m/s 左右，马车到门时若时间与位置接近目标，就算合拍。",
        "road_config": {
            "type": "straight",
            "length": 600,
            "beats": [4.0, 7.5, 11.0, 14.5, 18.0, 21.5],
            "obstacles": [],
            "traffic": [
                {"type": "oncoming", "y": 500, "speed": 6.0},
            ],
        },
        "target_speed": 8.0,
        "target_duration_ms": 25000,
        "refs": ["zhouli.baoshi.1"],
        "sort_order": 1,
    },
    {
        "title": "逐水曲",
        "kind": "zhushui",
        "kind_label": "逐水曲",
        "setting": "驾车沿水道而行，水弯则车弯。",
        "hint": "道路 3 个弯——保持车在车道内（中心线 ±1m）。",
        "road_config": {
            "type": "curve",
            "length": 600,
            "curves": [
                {"start": 100, "end": 220, "offset": 80},
                {"start": 280, "end": 400, "offset": -80},
                {"start": 460, "end": 580, "offset": 60},
            ],
            "obstacles": [],
            "traffic": [
                {"type": "oncoming", "y": 420, "speed": 6.0},
            ],
        },
        "target_speed": 7.0,
        "target_duration_ms": 28000,
        "refs": ["zhouli.baoshi.1", "xunzi.jundao.1"],
        "sort_order": 2,
    },
    {
        "title": "过君表",
        "kind": "junbiao",
        "kind_label": "过君表",
        "setting": "前方设君表（国君之标），过时须减速并按「礼」鞠躬。",
        "hint": "在君表前 30m 处车速降至 4 m/s 以下，过表瞬间按「礼」键。",
        "road_config": {
            "type": "straight",
            "length": 600,
            "beats": [],
            "obstacles": [
                {"type": "junbiao", "y": 200, "label": "君表"},
                {"type": "junbiao", "y": 450, "label": "君表"},
            ],
            "traffic": [
                {"type": "oncoming", "y": 300, "speed": 7.0},
            ],
        },
        "target_speed": 8.0,
        "target_duration_ms": 30000,
        "refs": ["lunyu.xianwen.14.5"],
        "sort_order": 3,
    },
    {
        "title": "舞交衢",
        "kind": "jiaoqu",
        "kind_label": "舞交衢",
        "setting": "经过十字路口，有行人横穿。须主动停让。",
        "hint": "见行人 (🚶) 在路口前要停车（速度 < 1 m/s），等行人过完再启动。",
        "road_config": {
            "type": "straight",
            "length": 600,
            "beats": [],
            "obstacles": [
                {"type": "pedestrian", "y": 200, "x": 0, "cross_dir": 1, "trigger_y": 150},
                {"type": "pedestrian", "y": 400, "x": 0, "cross_dir": -1, "trigger_y": 350},
            ],
            "traffic": [
                {"type": "slow", "y": 100, "speed": 4.5},
            ],
        },
        "target_speed": 7.0,
        "target_duration_ms": 32000,
        "refs": ["mengzi.tengwengong.xia.6"],
        "sort_order": 4,
    },
    {
        "title": "逐禽左",
        "kind": "qinzuo",
        "kind_label": "逐禽左",
        "setting": "猎场之上，禽兽奔逸于左。古礼：禽逃则止，不复追。",
        "hint": "见 🦌 逃跑，**不要追**（不要左转去追）。坚持原路前行才高分。",
        "road_config": {
            "type": "straight",
            "length": 600,
            "beats": [],
            "obstacles": [
                {"type": "deer", "y": 180, "x": -100, "flee_dir": -1},
                {"type": "deer", "y": 350, "x": -120, "flee_dir": -1},
            ],
            "traffic": [
                {"type": "oncoming", "y": 350, "speed": 6.5},
            ],
        },
        "target_speed": 7.5,
        "target_duration_ms": 28000,
        "refs": ["mengzi.tengwengong.xia.6", "lunyu.xianwen.14.5"],
        "sort_order": 5,
    },
]


def ensure_book_and_chapter(db: Session, item: dict) -> None:
    if not db.get(Book, item["book_id"]):
        title_zh = {"lunyu": "论语", "liji": "礼记", "mengzi": "孟子",
                    "zhouli": "周礼", "xunzi": "荀子",
                    "jiuzhang": "九章算术", "guanzi": "管子"}.get(item["book_id"], item["book_id"])
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
        db.add(Translation(passage_id=passage_id, lang=lang, text=text, translator="seed-yu"))


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
        for item in YU_PASSAGES:
            ensure_book_and_chapter(db, item)
            upsert_passage(db, item)
            db.flush()
            upsert_translations(db, item["id"], item["i18n"])
            upsert_annotations(db, item["id"], item["anno_classical"], item["anno_modern"])
        print(f"[seed-yu] upserted {len(YU_PASSAGES)} passages")

        added = 0
        for item in SCENARIOS:
            existing = db.query(YuScenario).filter(YuScenario.title == item["title"]).first()
            if existing:
                for k, v in item.items():
                    setattr(existing, k, v)
            else:
                db.add(YuScenario(**item))
                added += 1
        db.commit()
        total = db.query(YuScenario).count()
        print(f"[seed-yu] scenarios added={added}, total={total}")
        return total
    finally:
        db.close()


if __name__ == "__main__":
    main()

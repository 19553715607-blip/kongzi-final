"""乐艺 5 场景 + 关联经典 seed。
五音：宫 gong / 商 shang / 角 jue / 徵 zhi / 羽 yu
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .models import Annotation, Book, Chapter, Passage, Translation, YueScenario

# ─────────────────────────────────────────────────────────────
# 关联经典原文 — 完成对应场景后解锁
# ─────────────────────────────────────────────────────────────
YUE_PASSAGES = [
    {
        "id": "liji.yueji.1",
        "book_id": "liji",
        "chapter_id": "yueji",
        "chapter_title": "乐记",
        "ref_label": "礼记·乐记",
        "original_text": "凡音之起，由人心生也。人心之动，物使之然也。",
        "pinyin": "fán yīn zhī qǐ, yóu rén xīn shēng yě. rén xīn zhī dòng, wù shǐ zhī rán yě.",
        "concepts": ["yue", "xin"],
        "i18n": {
            "en": "All sounds arise from the human heart. The heart is moved by things and so responds.",
            "fr": "Tout son naît du cœur humain. Le cœur, mû par les choses, y répond.",
            "es": "Todo sonido nace del corazón humano. El corazón, movido por las cosas, responde.",
            "ar": "كل صوت ينشأ من قلب الإنسان، وقلبه يتحرّك بفعل الأشياء فيستجيب.",
        },
        "anno_classical": ("孔颖达疏", "乐之根本在人心，外物触心而音生。"),
        "anno_modern": "音乐源自人心对外物的回应——这是儒家「乐由心生」论的开篇。",
    },
    {
        "id": "lunyu.bayi.3.20",
        "book_id": "lunyu",
        "chapter_id": "bayi",
        "chapter_title": "八佾",
        "ref_label": "论语·八佾·3.20",
        "original_text": "关雎，乐而不淫，哀而不伤。",
        "pinyin": "guān jū, lè ér bù yín, āi ér bù shāng.",
        "concepts": ["yue", "zhongyong"],
        "i18n": {
            "en": "The Guan Ju ode is joyful without being licentious, sorrowful without being grievous.",
            "fr": "L'ode Guan Ju est joyeuse sans débauche, triste sans accablement.",
            "es": "La oda Guan Ju es alegre sin ser libertina, triste sin ser abrumadora.",
            "ar": "قصيدة قوان جو فرحة دون فسق، حزينة دون انكسار.",
        },
        "anno_classical": ("朱熹《论语集注》", "情之发而中节者也，故曰乐而不淫，哀而不伤。"),
        "anno_modern": "情绪表达要有节度——乐到极致而不放纵，哀到深处而不毁伤。这是儒家「中和」之乐的标准。",
    },
    {
        "id": "lunyu.bayi.3.25",
        "book_id": "lunyu",
        "chapter_id": "bayi",
        "chapter_title": "八佾",
        "ref_label": "论语·八佾·3.25",
        "original_text": "子谓韶，尽美矣，又尽善也。谓武，尽美矣，未尽善也。",
        "pinyin": "zǐ wèi sháo, jìn měi yǐ, yòu jìn shàn yě. wèi wǔ, jìn měi yǐ, wèi jìn shàn yě.",
        "concepts": ["yue", "shan", "mei"],
        "i18n": {
            "en": "The Master spoke of the Shao music: perfect in beauty, also perfect in goodness. Of the Wu music: perfect in beauty, but not in goodness.",
            "fr": "Le Maître dit du Shao : parfait en beauté, parfait aussi en bonté. Du Wu : parfait en beauté, mais non en bonté.",
            "es": "El Maestro dijo del Shao: perfecto en belleza y en bondad. Del Wu: perfecto en belleza, pero no en bondad.",
            "ar": "قال المعلم عن موسيقى الشاو: كاملة في الجمال وكاملة في الخير. وعن موسيقى الووا: كاملة في الجمال، لا في الخير.",
        },
        "anno_classical": ("朱熹", "韶舜乐，武武王乐。舜以揖让得天下，武王以征伐——故曰未尽善。"),
        "anno_modern": "孔子论乐分美与善——形式之美与内涵之善要兼具。武乐虽好听但有征伐之气，不及舜乐尽善。",
    },
    {
        "id": "lunyu.shuer.7.14",
        "book_id": "lunyu",
        "chapter_id": "shuer",
        "chapter_title": "述而",
        "ref_label": "论语·述而·7.14",
        "original_text": "子在齐闻韶，三月不知肉味。曰：不图为乐之至于斯也。",
        "pinyin": "zǐ zài qí wén sháo, sān yuè bù zhī ròu wèi. yuē: bù tú wéi yuè zhī zhì yú sī yě.",
        "concepts": ["yue"],
        "i18n": {
            "en": "When the Master heard the Shao music in Qi, for three months he did not notice the taste of meat. He said: I had not expected that music could reach such heights.",
            "fr": "Quand le Maître entendit le Shao en Qi, pendant trois mois il ne perçut plus le goût de la viande. Il dit : je n'imaginais pas que la musique pût atteindre une telle hauteur.",
            "es": "Cuando el Maestro oyó el Shao en Qi, durante tres meses no notó el sabor de la carne. Dijo: no pensaba que la música pudiese llegar a tal altura.",
            "ar": "حين سمع المعلم موسيقى الشاو في تشي، ثلاثة أشهر لم يدر طعم اللحم. قال: ما توقعت أن تبلغ الموسيقى هذا المبلغ.",
        },
        "anno_classical": ("朱熹", "圣人感物之深，故至于忘味。"),
        "anno_modern": "孔子在齐国听了《韶》乐，三个月吃肉都尝不出味——音乐的至境，可以深深触动人心。",
    },
    {
        "id": "lunyu.taibo.8.8",
        "book_id": "lunyu",
        "chapter_id": "taibo",
        "chapter_title": "泰伯",
        "ref_label": "论语·泰伯·8.8",
        "original_text": "兴于诗，立于礼，成于乐。",
        "pinyin": "xīng yú shī, lì yú lǐ, chéng yú yuè.",
        "concepts": ["yue", "li", "shi"],
        "i18n": {
            "en": "Be aroused by the Odes, established by Ritual, completed by Music.",
            "fr": "S'éveiller par les Odes, s'établir par le Rite, s'accomplir par la Musique.",
            "es": "Despertar por las Odas, establecerse por el Rito, completarse por la Música.",
            "ar": "تستيقظ بالأشعار، وتثبت بالطقس، وتكتمل بالموسيقى.",
        },
        "anno_classical": ("朱熹", "诗以兴起其志，礼以坚定其行，乐以涵养其性。"),
        "anno_modern": "儒家「成人」三阶段：诗启发情感，礼立定行为，乐完成人格——「乐」是教育的最高阶段。",
    },
]

# ─────────────────────────────────────────────────────────────
# 5 个场景
# ─────────────────────────────────────────────────────────────
SCENARIOS = [
    {
        "title": "祭祖大典",
        "mood": "solemn",
        "mood_label": "庄重肃穆",
        "setting": "宗庙之中，列祖列宗在上。须奏一段乐，以礼祖先。",
        "hint": "庄重之乐多用宫商（沉稳之音），少用角徵羽（轻快之音）。避免单音连续重复。",
        # 宫商为主，角徵羽次
        "ideal_distribution": {"gong": 0.35, "shang": 0.30, "jue": 0.10, "zhi": 0.15, "yu": 0.10},
        "refs": ["liji.yueji.1"],
        "sort_order": 1,
    },
    {
        "title": "宾客宴饮",
        "mood": "joyful",
        "mood_label": "雍容和乐",
        "setting": "贵宾临席，举酒言欢。奏一段乐，宾主皆悦而不失礼。",
        "hint": "宴乐应雍容，五音相对均衡；徵音（明亮）稍多一些为佳。",
        "ideal_distribution": {"gong": 0.20, "shang": 0.20, "jue": 0.15, "zhi": 0.30, "yu": 0.15},
        "refs": ["lunyu.taibo.8.8"],
        "sort_order": 2,
    },
    {
        "title": "送别故人",
        "mood": "sad",
        "mood_label": "哀而不伤",
        "setting": "故人远行，相送至灞桥。奏一段乐，托别情，但不可过悲。",
        "hint": "送别之乐重在「哀而不伤」——商角稍多以寄思，但仍要有宫的稳定为底。",
        "ideal_distribution": {"gong": 0.20, "shang": 0.30, "jue": 0.25, "zhi": 0.10, "yu": 0.15},
        "refs": ["lunyu.bayi.3.20"],
        "sort_order": 3,
    },
    {
        "title": "闲居抚琴",
        "mood": "calm",
        "mood_label": "闲适中和",
        "setting": "退朝归来，独坐林下。无目的、无所求，纯然抚琴。",
        "hint": "中和之乐五音均衡——这正是「兴于诗，立于礼，成于乐」的境界。",
        "ideal_distribution": {"gong": 0.20, "shang": 0.20, "jue": 0.20, "zhi": 0.20, "yu": 0.20},
        "refs": ["lunyu.shuer.7.14"],
        "sort_order": 4,
    },
    {
        "title": "出征誓师",
        "mood": "heroic",
        "mood_label": "慷慨激昂",
        "setting": "三军列阵，将出征讨贼。奏一段乐，振士气，但不可流于杀伐。",
        "hint": "誓师之乐羽徵（高亢明亮）多，但仍要有宫的厚重——孔子谓武乐「尽美未尽善」可为戒。",
        "ideal_distribution": {"gong": 0.20, "shang": 0.10, "jue": 0.10, "zhi": 0.30, "yu": 0.30},
        "refs": ["lunyu.bayi.3.25"],
        "sort_order": 5,
    },
]


def ensure_book_and_chapter(db: Session, item: dict) -> None:
    if not db.get(Book, item["book_id"]):
        title_zh = {"lunyu": "论语", "liji": "礼记", "mengzi": "孟子"}.get(item["book_id"], item["book_id"])
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
        db.add(Translation(passage_id=passage_id, lang=lang, text=text, translator="seed-yue"))


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
        # 1) 灌经典 passages
        for item in YUE_PASSAGES:
            ensure_book_and_chapter(db, item)
            upsert_passage(db, item)
            db.flush()
            upsert_translations(db, item["id"], item["i18n"])
            upsert_annotations(db, item["id"], item["anno_classical"], item["anno_modern"])
        print(f"[seed-yue] upserted {len(YUE_PASSAGES)} passages")

        # 2) 灌场景（upsert by title）
        added = 0
        for item in SCENARIOS:
            existing = db.query(YueScenario).filter(YueScenario.title == item["title"]).first()
            if existing:
                for k, v in item.items():
                    setattr(existing, k, v)
            else:
                db.add(YueScenario(**item))
                added += 1
        db.commit()
        total = db.query(YueScenario).count()
        print(f"[seed-yue] scenarios added={added}, total={total}")
        return total
    finally:
        db.close()


if __name__ == "__main__":
    main()

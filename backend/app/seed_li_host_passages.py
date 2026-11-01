"""「执礼 · 宾至如归」相关经典原文 seed。

《礼记·乡饮酒义》/《礼记·曲礼》/《论语·为政》2.8 三条新经文，
外加复用射艺种子里的《礼记·射义》（大射前宴与射艺共用解锁池）。
《论语·学而》1.1（有朋自远方来）已在主 seed 中。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .models import Annotation, Book, Chapter, Passage, Translation
from .seed_she_passages import PASSAGES as SHE_PASSAGES

PASSAGES = [
    {
        "id": "liji.xiangyinjiuyi.1",
        "book_id": "liji",
        "chapter_id": "xiangyinjiuyi",
        "chapter_title": "乡饮酒义",
        "ref_label": "礼记·乡饮酒义",
        "original_text": "乡饮酒之礼：六十者坐，五十者立侍，以听政役，所以明尊长也。",
        "pinyin": "xiāng yǐn jiǔ zhī lǐ: liù shí zhě zuò, wǔ shí zhě lì shì, yǐ tīng zhèng yì, suǒ yǐ míng zūn zhǎng yě.",
        "concepts": ["li", "jing"],
        "i18n": {
            "en": "In the village wine-drinking rite: those of sixty sit, those of fifty stand in attendance and wait to serve—thus making clear the honoring of elders.",
            "fr": "Dans le rite du vin du village : les sexagénaires s'assoient, les quinquagénaires restent debout pour servir—ainsi se manifeste le respect des aînés.",
            "es": "En el rito del vino de la aldea: los de sesenta se sientan, los de cincuenta permanecen de pie sirviendo—así se manifiesta el respeto a los mayores.",
            "ar": "في طقس شراب القرية: يجلس أبناء الستين، ويقف أبناء الخمسين للخدمة، وبذلك يتجلى توقير الكبار.",
        },
        "anno_classical": ("孔颖达疏", "乡饮酒礼以齿序为纲，坐立有位，皆所以明长幼之节。"),
        "anno_modern": "乡饮酒礼的核心是「序」：谁坐谁立、谁先谁后都有讲究——排序本身就是对人的尊重。",
    },
    {
        "id": "liji.quli.zunren",
        "book_id": "liji",
        "chapter_id": "quli",
        "chapter_title": "曲礼",
        "ref_label": "礼记·曲礼上",
        "original_text": "夫礼者，自卑而尊人。虽负贩者，必有尊也，而况富贵乎？",
        "pinyin": "fú lǐ zhě, zì bēi ér zūn rén. suī fù fàn zhě, bì yǒu zūn yě, ér kuàng fù guì hū?",
        "concepts": ["li", "jing"],
        "i18n": {
            "en": "Li means humbling oneself and honoring others. Even a burden-carrying peddler must be shown respect—how much more the rich and noble?",
            "fr": "Le li consiste à s'abaisser soi-même et à honorer autrui. Même un colporteur mérite le respect—à plus forte raison les riches et les nobles.",
            "es": "El li consiste en rebajarse a uno mismo y honrar a los demás. Incluso un vendedor ambulante merece respeto—cuánto más los ricos y nobles.",
            "ar": "الـ«لي» هو أن تتواضع وتُكرم الآخرين. حتى الحمّال البائع له حرمة، فكيف بالغني والشريف؟",
        },
        "anno_classical": ("郑玄注", "礼主于敬，自卑非自贱，尊人乃所以自尊。"),
        "anno_modern": "礼的本质是把自己放低、把对方抬高——对任何人都如此，不看身份贵贱。",
    },
    {
        "id": "lunyu.weizheng.2.8",
        "book_id": "lunyu",
        "chapter_id": "weizheng",
        "chapter_title": "为政",
        "ref_label": "论语·为政·2.8",
        "original_text": "子夏问孝。子曰：色难。有事，弟子服其劳；有酒食，先生馔，曾是以为孝乎？",
        "pinyin": "zǐ xià wèn xiào. zǐ yuē: sè nán. yǒu shì, dì zǐ fú qí láo; yǒu jiǔ shí, xiān shēng zhuàn, zēng shì yǐ wéi xiào hū?",
        "concepts": ["xiao", "li"],
        "i18n": {
            "en": "Zixia asked about filial piety. The Master said: The difficulty lies in one's countenance. Merely taking on burdens when there is work, or letting elders eat first when there is food—can that alone count as filial?",
            "fr": "Zixia interrogea sur la piété filiale. Le Maître dit : le difficile, c'est l'expression du visage. Prendre la peine quand il y a à faire, servir d'abord les aînés quand il y a à manger—cela suffit-il à faire la piété filiale ?",
            "es": "Zixia preguntó por la piedad filial. El Maestro dijo: lo difícil es el semblante. Cargar con el trabajo cuando lo hay, servir primero a los mayores cuando hay comida—¿basta eso para la piedad filial?",
            "ar": "سأل زيشيا عن البر. قال المعلم: العسير هو طلاقة الوجه. أن تخدم عند العمل وتقدّم الطعام للكبار أولاً—أوَيكفي ذلك برًّا؟",
        },
        "anno_classical": ("朱熹《论语集注》", "色难，谓事亲之际，惟色为难。服劳奉养未足为孝。"),
        "anno_modern": "对长辈尽礼，难的不是端茶送饭，而是脸色和心意——形式做足而神情不耐，仍不是孝。",
    },
]

# 大射前宴复用射艺经典《礼记·射义》，一并 upsert 保证独立可跑
PASSAGES = PASSAGES + [p for p in SHE_PASSAGES if p["id"] == "liji.sheyi.1"]


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


def upsert_translations(db: Session, passage_id: str, i18n: dict) -> None:
    existing = {t.lang for t in db.query(Translation).filter(Translation.passage_id == passage_id).all()}
    for lang, text in i18n.items():
        if lang in existing:
            continue
        db.add(Translation(passage_id=passage_id, lang=lang, text=text, translator="seed-li-host"))


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
        added = 0
        for item in PASSAGES:
            ensure_book_and_chapter(db, item)
            upsert_passage(db, item)
            db.flush()
            upsert_translations(db, item["id"], item["i18n"])
            upsert_annotations(db, item["id"], item["anno_classical"], item["anno_modern"])
            added += 1
        db.commit()
        print(f"[seed-li-host] upserted {added} passages: {[i['id'] for i in PASSAGES]}")
        return added
    finally:
        db.close()


if __name__ == "__main__":
    main()

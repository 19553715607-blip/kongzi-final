"""射艺相关经典原文 seed。
《论语·八佾》3.7 / 3.16 + 《礼记·射义》节录 + 《孟子·公孙丑上》「仁者如射」。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .db import SessionLocal, engine, Base
from .models import Annotation, Book, Chapter, Passage, Translation

PASSAGES = [
    {
        "id": "lunyu.bayi.3.7",
        "book_id": "lunyu",
        "chapter_id": "bayi",
        "chapter_title": "八佾",
        "ref_label": "论语·八佾·3.7",
        "original_text": "君子无所争。必也射乎！揖让而升，下而饮。其争也君子。",
        "pinyin": "jūn zǐ wú suǒ zhēng. bì yě shè hū! yī ràng ér shēng, xià ér yǐn. qí zhēng yě jūn zǐ.",
        "concepts": ["li", "junzi"],
        "i18n": {
            "en": "The junzi has nothing to contend for. If anything, surely it is archery! They bow to each other ascending, descend and drink—even contention here is in the manner of a junzi.",
            "fr": "Le sage n'a rien pour quoi disputer. Sauf au tir à l'arc ! On s'incline en montant, on descend et on boit—la rivalité même y reste celle du sage.",
            "es": "El junzi no tiene en qué contender. ¡Si algo, en el tiro con arco! Se saludan al subir, descienden y beben—incluso esa contienda es la de un junzi.",
            "ar": "الفاضل لا يتنازع في شيء، إلا في الرمي! يتحيّون عند الصعود، وينزلون فيشربون، وحتى نزاعهم نزاع فاضل.",
        },
        "anno_classical": ("朱熹《论语集注》", "射有揖让饮酒之礼，所争而不失其君子之风。"),
        "anno_modern": "君子之间几乎不需争胜负，若有，也只在射礼中——而这种「争」本身就守礼让节度。",
    },
    {
        "id": "lunyu.bayi.3.16",
        "book_id": "lunyu",
        "chapter_id": "bayi",
        "chapter_title": "八佾",
        "ref_label": "论语·八佾·3.16",
        "original_text": "射不主皮，为力不同科，古之道也。",
        "pinyin": "shè bù zhǔ pí, wèi lì bù tóng kē, gǔ zhī dào yě.",
        "concepts": ["li", "zhongyong"],
        "i18n": {
            "en": "In archery one does not insist on piercing the hide—because strength is not of a single grade. This was the way of the ancients.",
            "fr": "Au tir, on ne vise pas à percer la peau—car la force des hommes diffère. Telle était la voie des anciens.",
            "es": "En el tiro no se busca atravesar el cuero—las fuerzas no son iguales. Tal era la vía de los antiguos.",
            "ar": "في الرمي لا يُطلب اختراق الجلد، فقوى الناس متفاوتة. تلك سنّة القدماء.",
        },
        "anno_classical": ("朱熹《论语集注》", "古者射礼重在中节合度，不专以贯革为能。"),
        "anno_modern": "射不是比谁能射穿靶皮——人的力气本就不一样。中节有度才是古道。",
    },
    {
        "id": "liji.sheyi.1",
        "book_id": "liji",
        "chapter_id": "sheyi",
        "chapter_title": "射义",
        "ref_label": "礼记·射义",
        "original_text": "射者，仁之道也。求正诸己，己正而后发；发而不中，则不怨胜己者，反求诸己而已矣。",
        "pinyin": "shè zhě, rén zhī dào yě. qiú zhèng zhū jǐ, jǐ zhèng ér hòu fā; fā ér bù zhòng, zé bù yuàn shèng jǐ zhě, fǎn qiú zhū jǐ ér yǐ yǐ.",
        "concepts": ["ren", "li"],
        "i18n": {
            "en": "Archery is the way of benevolence. One seeks rectitude in oneself; only when upright does one release. If the arrow misses, one does not resent the one who surpassed—one turns back and seeks the cause in oneself.",
            "fr": "Le tir à l'arc est la voie de la bienveillance. On cherche d'abord la justesse en soi-même ; seulement alors on décoche. Si la flèche manque, on ne s'irrite point contre le vainqueur—on revient à soi.",
            "es": "El tiro con arco es la vía de la benevolencia. Uno busca la rectitud en sí mismo; solo entonces dispara. Si yerra, no culpa al vencedor—vuelve a sí mismo.",
            "ar": "الرمي طريق الرحمة. يطلب الإنسان الاستقامة في نفسه أولاً، ثم يرسل السهم؛ فإذا أخطأ لم يلم من فاقه، بل رجع إلى نفسه.",
        },
        "anno_classical": ("孔颖达疏", "射礼之精要在「正己」与「反求」，故曰仁之道。"),
        "anno_modern": "射是仁的修炼：先调正自己再放箭；没中靶不怪赢家，回头反省自己——这是儒家工夫论的范本。",
    },
    {
        "id": "mengzi.gongsunchou.shang.7",
        "book_id": "mengzi",
        "chapter_id": "gongsunchou-shang",
        "chapter_title": "公孙丑上",
        "ref_label": "孟子·公孙丑上·7",
        "original_text": "仁者如射：射者正己而后发；发而不中，不怨胜己者，反求诸己而已矣。",
        "pinyin": "rén zhě rú shè: shè zhě zhèng jǐ ér hòu fā; fā ér bù zhòng, bù yuàn shèng jǐ zhě, fǎn qiú zhū jǐ ér yǐ yǐ.",
        "concepts": ["ren"],
        "i18n": {
            "en": "The benevolent is like an archer: he straightens himself and only then releases. If the shot misses, he does not blame the winner—he turns back and seeks the cause in himself.",
            "fr": "Le bienveillant est comme l'archer : il se redresse, puis tire. S'il manque, il ne blâme pas le vainqueur ; il revient à lui-même.",
            "es": "El benevolente es como el arquero: primero se endereza y luego dispara. Si yerra, no culpa al vencedor; vuelve a sí mismo.",
            "ar": "الرحيم كالرامي: يقوّم نفسه ثم يرسل سهمه؛ فإن أخطأ لم يلم من فاقه، بل رجع إلى نفسه.",
        },
        "anno_classical": ("朱熹《孟子集注》", "孟子以射喻仁，明仁之工夫在自反。"),
        "anno_modern": "孟子把射当作仁的比喻——失败的原因永远先问自己，不归罪外部。",
    },
]


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
        db.add(Translation(passage_id=passage_id, lang=lang, text=text, translator="seed-she"))


def upsert_annotations(db: Session, passage_id: str, classical: tuple, modern: str) -> None:
    # 简单按 (type, lang) 唯一性追加
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
        print(f"[seed-she] upserted {added} passages: {[i['id'] for i in PASSAGES]}")
        return added
    finally:
        db.close()


if __name__ == "__main__":
    main()

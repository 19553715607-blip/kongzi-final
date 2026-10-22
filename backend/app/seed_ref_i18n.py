"""经典层书目 / 篇章 / 人物 / 学派 / 命题的多语补丁。

## 背景

`seed_i18n_patch.py` 只处理 Passage 译文与 Annotation 注文；`seed_lang_pack.py` 处理
议题与跨文明立场。**书目名、篇名、人物名、学派名、命题**这五类短字段此前只有 en
（甚至只有中文），fr/es/ar 全部回落中文，导致：
- 阅读页篇名在四语下都是「学而」；
- 6 部书在 en 下仍是「礼记 / 周礼 / 九章算术」；
- 人物、学派、命题在 fr/es/ar 下显示中文。

本模块按 **实体 id** 为键补齐这五类字段（不用中文名作键，避免「述而」这类
同名篇目（`lunu.述而` 与 `shuer`）互相覆盖）。

## 幂等性

只写缺失语种；已有译文不覆盖，便于人工修订。启动时由 `main.py` 调用。
"""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import Book, Chapter, Person, Proposition, School

LANGS = ("en", "fr", "es", "ar")
_CJK = re.compile(r"[\u4e00-\u9fff]")

# ── 书目（id → {lang: 书名}）────────────────────────────────────────────────
BOOK_I18N: dict[str, dict[str, str]] = {
    "lunyu": {
        "en": "The Analects",
        "fr": "Entretiens de Confucius",
        "es": "Analectas",
        "ar": "الحوارات",
    },
    "liji": {
        "en": "Records of Ritual",
        "fr": "Mémoires sur les rites",
        "es": "Memorias sobre los ritos",
        "ar": "سجل الطقوس",
    },
    "zhouli": {
        "en": "Rites of Zhou",
        "fr": "Rites des Zhou",
        "es": "Ritos de Zhou",
        "ar": "طقوس تشو",
    },
    "jiuzhang": {
        "en": "Nine Chapters on the Mathematical Art",
        "fr": "Neuf Chapitres sur l'art mathématique",
        "es": "Nueve Capítulos sobre el Arte Matemático",
        "ar": "الفصول التسعة في فن الحساب",
    },
    "guanzi": {
        "en": "Guanzi",
        "fr": "Guanzi",
        "es": "Guanzi",
        "ar": "غوانزي",
    },
    "mengzi": {
        "en": "Mencius",
        "fr": "Mencius",
        "es": "Mencius",
        "ar": "منسيوس",
    },
    "xunzi": {
        "en": "Xunzi",
        "fr": "Xunzi",
        "es": "Xunzi",
        "ar": "شيونزي",
    },
}

# ── 篇名（chapter.id → {lang: 篇名}）─────────────────────────────────────────
# 篇名保留通行拼音，括注译文 —— 与 ref_label 的学术引用惯例一致。
CHAPTER_I18N: dict[str, dict[str, str]] = {
    "lunyu.学而": {
        "en": "Xue Er (Learning)",
        "fr": "Xue Er (Apprendre)",
        "es": "Xue Er (Aprender)",
        "ar": "شيويه إر (التعلّم)",
    },
    "lunyu.为政": {
        "en": "Wei Zheng (Governance)",
        "fr": "Wei Zheng (Gouverner)",
        "es": "Wei Zheng (Gobernar)",
        "ar": "ويي جينغ (الحكم)",
    },
    "lunyu.八佾": {
        "en": "Ba Yi (Eight Rows of Dancers)",
        "fr": "Ba Yi (Huit rangées de danseurs)",
        "es": "Ba Yi (Ocho filas de danzantes)",
        "ar": "با يي (ثمانية صفوف من الراقصين)",
    },
    "lunyu.里仁": {
        "en": "Li Ren (Dwelling in Humaneness)",
        "fr": "Li Ren (Demeurer dans l'humanité)",
        "es": "Li Ren (Morar en la humanidad)",
        "ar": "لي رن (الإقامة في الإنسانية)",
    },
    "lunyu.雍也": {
        "en": "Yong Ye",
        "fr": "Yong Ye",
        "es": "Yong Ye",
        "ar": "يونغ يه",
    },
    "lunyu.述而": {
        "en": "Shu Er (Transmitting)",
        "fr": "Shu Er (Transmettre)",
        "es": "Shu Er (Transmitir)",
        "ar": "شو إر (النقل)",
    },
    "lunyu.颜渊": {
        "en": "Yan Yuan",
        "fr": "Yan Yuan",
        "es": "Yan Yuan",
        "ar": "يان يوان",
    },
    "bayi": {
        "en": "Ba Yi (Eight Rows of Dancers)",
        "fr": "Ba Yi (Huit rangées de danseurs)",
        "es": "Ba Yi (Ocho filas de danzantes)",
        "ar": "با يي (ثمانية صفوف من الراقصين)",
    },
    "shuer": {
        "en": "Shu Er (Transmitting)",
        "fr": "Shu Er (Transmettre)",
        "es": "Shu Er (Transmitir)",
        "ar": "شو إر (النقل)",
    },
    "taibo": {
        "en": "Tai Bo",
        "fr": "Tai Bo",
        "es": "Tai Bo",
        "ar": "تاي بو",
    },
    "zihan": {
        "en": "Zi Han",
        "fr": "Zi Han",
        "es": "Zi Han",
        "ar": "تسي هان",
    },
    "xianwen": {
        "en": "Xian Wen",
        "fr": "Xian Wen",
        "es": "Xian Wen",
        "ar": "شيان ون",
    },
    "jishi": {
        "en": "Ji Shi (The Ji Clan)",
        "fr": "Ji Shi (Le clan Ji)",
        "es": "Ji Shi (El clan Ji)",
        "ar": "جي شي (عشيرة جي)",
    },
    "yueji": {
        "en": "Yue Ji (Record of Music)",
        "fr": "Yue Ji (Mémoire de la musique)",
        "es": "Yue Ji (Registro de la música)",
        "ar": "يويه جي (سجل الموسيقى)",
    },
    "chengma": {
        "en": "Cheng Ma (Statecraft and Economy)",
        "fr": "Cheng Ma (Gouvernance et économie)",
        "es": "Cheng Ma (Gobierno y economía)",
        "ar": "تشينغ ما (الحكم والاقتصاد)",
    },
    "junshu": {
        "en": "Jun Shu (Equitable Transport)",
        "fr": "Jun Shu (Transport équitable)",
        "es": "Jun Shu (Transporte equitativo)",
        "ar": "جون شو (النقل العادل)",
    },
    "cuifen": {
        "en": "Cui Fen (Proportional Division)",
        "fr": "Cui Fen (Partage proportionnel)",
        "es": "Cui Fen (Reparto proporcional)",
        "ar": "تسوي فن (التوزيع النسبي)",
    },
    "diguan-baoshi": {
        "en": "Diguan · Baoshi (Earth Office: the Protector)",
        "fr": "Diguan · Baoshi (Office de la terre : le Protecteur)",
        "es": "Diguan · Baoshi (Oficio de la tierra: el Protector)",
        "ar": "ديغوان · باوشي (مكتب الأرض: الحامي)",
    },
    "tianguan-junshu": {
        "en": "Tianguan · Junren (Heaven Office: the Equalizer)",
        "fr": "Tianguan · Junren (Office du ciel : l'Égalisateur)",
        "es": "Tianguan · Junren (Oficio del cielo: el Igualador)",
        "ar": "تيانغوان · جونرن (مكتب السماء: المعدّل)",
    },
    "jundao": {
        "en": "Jun Dao (The Way of the Ruler)",
        "fr": "Jun Dao (La voie du souverain)",
        "es": "Jun Dao (El camino del gobernante)",
        "ar": "جون داو (طريق الحاكم)",
    },
    "tengwengong-xia": {
        "en": "Teng Wen Gong, Part II",
        "fr": "Teng Wen Gong, partie II",
        "es": "Teng Wen Gong, parte II",
        "ar": "تنغ ون غونغ، الجزء الثاني",
    },
}

# ── 人物 / 学派 / 命题 ──────────────────────────────────────────────────────
PERSON_I18N: dict[str, dict[str, str]] = {
    "孔子": {
        "en": "Confucius",
        "fr": "Confucius",
        "es": "Confucio",
        "ar": "كونفوشيوس",
    },
    "颜回": {
        "en": "Yan Hui",
        "fr": "Yan Hui",
        "es": "Yan Hui",
        "ar": "يان هوي",
    },
    "曾子": {
        "en": "Zengzi",
        "fr": "Zengzi",
        "es": "Zengzi",
        "ar": "تسنغ تسي",
    },
    "子贡": {
        "en": "Zigong",
        "fr": "Zigong",
        "es": "Zigong",
        "ar": "تسي غونغ",
    },
    "孟子": {
        "en": "Mencius",
        "fr": "Mencius",
        "es": "Mencius",
        "ar": "منسيوس",
    },
}

SCHOOL_I18N: dict[str, dict[str, str]] = {
    "儒家": {
        "en": "Confucianism",
        "fr": "Confucianisme",
        "es": "Confucianismo",
        "ar": "الكونفوشيوسية",
    },
}

PROPOSITION_I18N: dict[str, dict[str, str]] = {
    "克己复礼为仁": {
        "en": "Self-mastery and returning to ritual is ren",
        "fr": "Se maîtriser et revenir aux rites, c'est le ren",
        "es": "Vencerse a sí mismo y volver a los ritos es el ren",
        "ar": "قهر النفس والعودة إلى الطقوس هو الرِن",
    },
    "己所不欲，勿施于人": {
        "en": "Do not impose on others what you do not want",
        "fr": "N'impose pas aux autres ce que tu ne veux pas",
        "es": "No impongas a los demás lo que no quieres",
        "ar": "لا تفرض على غيرك ما لا تريده لنفسك",
    },
    "君子喻于义，小人喻于利": {
        "en": "The junzi understands righteousness; the petty person understands profit",
        "fr": "Le junzi comprend la justice ; l'homme de peu comprend le profit",
        "es": "El junzi entiende la justicia; el hombre mezquino, el provecho",
        "ar": "النبيل يفهم الحق، والخسيس يفهم المنفعة",
    },
}


def _fill(obj, attr: str, want: dict[str, str] | None, counts: dict) -> bool:
    """把缺失语种写进 JSON 列，已有译文不动。"""
    if not want:
        return False
    cur = dict(getattr(obj, attr) or {})
    changed = False
    for lang, text in want.items():
        if lang not in LANGS or not text:
            continue
        old = cur.get(lang)
        # 「占位未译」也算缺失：原值含汉字、而目标译文不含汉字（如 Book.title_i18n.en = "礼记"）
        placeholder = bool(old) and bool(_CJK.search(str(old))) and not _CJK.search(text)
        if not old or placeholder:
            cur[lang] = text
            changed = True
            counts["langs"] += 1
    if changed:
        setattr(obj, attr, cur)
        flag_modified(obj, attr)
        counts["fields"] += 1
    return changed


def apply_ref_i18n(db: Session) -> dict:
    """幂等补齐书目 / 篇名 / 人物 / 学派 / 命题的多语字段。"""
    counts = {"entities": 0, "fields": 0, "langs": 0}

    for b in db.execute(select(Book)).scalars():
        if _fill(b, "title_i18n", BOOK_I18N.get(b.id), counts):
            counts["entities"] += 1

    for c in db.execute(select(Chapter)).scalars():
        if _fill(c, "title_i18n", CHAPTER_I18N.get(c.id), counts):
            counts["entities"] += 1

    for p in db.execute(select(Person)).scalars():
        if _fill(p, "name_i18n", PERSON_I18N.get(p.name_zh), counts):
            counts["entities"] += 1

    for s in db.execute(select(School)).scalars():
        if _fill(s, "name_i18n", SCHOOL_I18N.get(s.name_zh), counts):
            counts["entities"] += 1

    for p in db.execute(select(Proposition)).scalars():
        if _fill(p, "text_i18n", PROPOSITION_I18N.get(p.text_zh), counts):
            counts["entities"] += 1

    db.commit()
    return counts

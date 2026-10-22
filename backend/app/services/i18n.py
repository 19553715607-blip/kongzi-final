"""多语字段取值辅助（跨 router 共用）。

项目里有两套多语承载方式，各有适用场景：

1. **JSON `*_i18n` 列**（`{lang: 译文}`）—— 用于**实体的短字段**：
   `Book.title_i18n` / `Topic.name_i18n` / `Annotation.content_i18n` /
   `Case.question_i18n` / `YueScenario.setting_i18n` 等。
   由本模块的 `pick_i18n()` 按 lang 取值。
2. **`Translation` 表** —— 用于**经典原文的长篇译文**（`passage_id` + `lang` + `text`）。
   由 `routers/content.py` 直接查表，不走 `pick_i18n()`。

两套的共同约定：**缺失该语种时回落中文原文**，保证 zh/en/fr/es/ar 各语种
返回的内容量一致，不会因为某个语种缺译而整层消失。
"""
from __future__ import annotations

from typing import Optional

# 支持的语言（与前端 i18n 的 LANGS 对齐）；未知语言一律回落中文
SUPPORTED_LANGS = ("zh", "en", "fr", "es", "ar")


def pick_i18n(zh: Optional[str], i18n: Optional[dict], lang: str) -> Optional[str]:
    """按语言取多语字段。

    缺失该语种时回落中文原文 —— 保证 zh/en/fr/es/ar 各语种返回的内容量一致，
    不会因为某个语种缺译而整层消失。
    """
    if lang and lang not in ("zh", "all"):
        value = (i18n or {}).get(lang)
        if value:
            return value
    return zh


# ── 引用标签本地化 ───────────────────────────────────────────────────────────
# 引用标签形如「论语·颜渊·12.1」：书名 + 篇名 + 序号。
# 篇名用通行拼音（学术引用惯例，各语种一致），书名按语言给出对应译名。
_BOOK_TITLES: dict[str, dict[str, str]] = {
    "论语": {"en": "Analects", "fr": "Entretiens", "es": "Analectas", "ar": "الحوارات"},
    "礼记": {"en": "Records of Ritual", "fr": "Mémoires sur les rites", "es": "Memorias sobre los ritos", "ar": "سجل الطقوس"},
    "周礼": {"en": "Rites of Zhou", "fr": "Rites des Zhou", "es": "Ritos de Zhou", "ar": "طقوس تشو"},
    "九章算术": {"en": "Nine Chapters", "fr": "Neuf Chapitres", "es": "Nueve Capítulos", "ar": "الفصول التسعة"},
    "管子": {"en": "Guanzi", "fr": "Guanzi", "es": "Guanzi", "ar": "غوانزي"},
    "孟子": {"en": "Mencius", "fr": "Mencius", "es": "Mencius", "ar": "منسيوس"},
    "荀子": {"en": "Xunzi", "fr": "Xunzi", "es": "Xunzi", "ar": "شيونزي"},
}

_CHAPTER_PINYIN: dict[str, str] = {
    "学而": "Xue Er", "为政": "Wei Zheng", "八佾": "Ba Yi", "里仁": "Li Ren",
    "公冶长": "Gongye Chang", "雍也": "Yong Ye", "述而": "Shu Er", "泰伯": "Tai Bo",
    "子罕": "Zi Han", "颜渊": "Yan Yuan", "宪问": "Xian Wen", "季氏": "Ji Shi",
    "乐记": "Yue Ji", "乘马": "Cheng Ma", "均输": "Jun Shu", "衰分": "Cui Fen",
    "地官·保氏": "Diguan · Baoshi", "君道": "Jun Dao", "滕文公下": "Teng Wen Gong II",
    "天官·均人": "Tianguan · Junren",
}

_CHAPTER_AR: dict[str, str] = {
    "Xue Er": "شيويه إر", "Wei Zheng": "ويي جينغ", "Ba Yi": "با يي", "Li Ren": "لي رن",
    "Yong Ye": "يونغ يه", "Shu Er": "شو إر", "Yan Yuan": "يان يوان", "Tai Bo": "تاي بو",
    "Zi Han": "تسي هان", "Xian Wen": "شيان ون", "Ji Shi": "جي شي", "Yue Ji": "يويه جي",
    "Cheng Ma": "تشينغ ما", "Jun Shu": "جون شو", "Cui Fen": "تسوي فن",
    "Gongye Chang": "غونغيه تشانغ", "Jun Dao": "جون داو",
    "Teng Wen Gong II": "تنغ ون غونغ ٢", "Diguan · Baoshi": "ديغوان · باوشي",
    "Tianguan · Junren": "تيانغوان · جونرن",
}


def localize_ref_label(label: Optional[str], lang: str) -> Optional[str]:
    """把「论语·颜渊·12.1」这类引用标签转成当前语言。

    - 中文原样返回；
    - 篇名走通行拼音（学术惯例），书名按语言译；
    - 无法解析的标签原样返回，绝不丢信息。
    """
    if not label or lang in ("zh", "all"):
        return label
    parts = label.split("·")
    if len(parts) < 2:
        return label
    book = parts[0]
    book_t = _BOOK_TITLES.get(book, {}).get(lang, book)

    # 篇名可能是「地官·保氏」这种带二级前缀的两段式，优先按两段匹配
    chapter = parts[1]
    rest = parts[2:]
    if len(parts) >= 3 and "·".join(parts[1:3]) in _CHAPTER_PINYIN:
        chapter = "·".join(parts[1:3])
        rest = parts[3:]

    chapter_py = _CHAPTER_PINYIN.get(chapter, chapter)
    if lang == "ar":
        chapter_py = _CHAPTER_AR.get(chapter_py, chapter_py)
    tail = " ".join(rest).strip()
    return f"{book_t} · {chapter_py} {tail}".rstrip()

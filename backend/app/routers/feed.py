from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..services.i18n import localize_ref_label
from ..models import Passage

router = APIRouter(prefix="/api/v1", tags=["feed"])

# AI 人格（轮播署名）。中文是角色名，其余语言取意译而非音译，
# 否则「诗哥」「现代小张」这类带戏谑的名字在海外语境里完全读不出语气。
PERSONAS: List[dict] = [
    {"zh": "子曰君", "en": "Master Zi", "fr": "Maître Zi", "es": "Maestro Zi", "ar": "المعلم زي"},
    {"zh": "小颜回", "en": "Young Yan Hui", "fr": "Jeune Yan Hui", "es": "Joven Yan Hui", "ar": "يان هوي الصغير"},
    {"zh": "庄生", "en": "Zhuang Sheng", "fr": "Zhuang Sheng", "es": "Zhuang Sheng", "ar": "تشوانغ شنغ"},
    {"zh": "现代小张", "en": "Modern Xiao Zhang", "fr": "Xiao Zhang moderne", "es": "Xiao Zhang moderno", "ar": "شياو جانغ العصري"},
    {"zh": "诗哥", "en": "Brother Verse", "fr": "Frère Poème", "es": "Hermano Verso", "ar": "أخو الشعر"},
]

# 年轻化黑话标签池。非中文一律用 ASCII 连字符、不带重音符号——
# 话题标签里的重音在多数平台会被截断或转义，这是通行做法。
VIBE_TAGS: List[dict] = [
    {"zh": "#i人友好", "en": "#introvert-friendly", "fr": "#amis-des-introvertis",
     "es": "#amigable-con-introvertidos", "ar": "#صديق-الانطوائيين"},
    {"zh": "#emo自救", "en": "#emo-self-rescue", "fr": "#sauvetage-emo",
     "es": "#rescate-emo", "ar": "#إنقاذ-من-الاكتئاب"},
    {"zh": "#内耗退散", "en": "#overthinking-be-gone", "fr": "#halte-au-ruminement",
     "es": "#basta-de-rayarse", "ar": "#لا-للتفكير-الزائد"},
    {"zh": "#这就是顶级浪漫", "en": "#peak-romance", "fr": "#romantisme-supreme",
     "es": "#romance-de-altura", "ar": "#قمة-الرومانسية"},
    {"zh": "#古人早说过了", "en": "#ancients-said-it-first", "fr": "#les-anciens-lavaient-dit",
     "es": "#los-antiguos-ya-lo-dijeron", "ar": "#قالها-الأقدمون"},
    {"zh": "#嘴替文学", "en": "#speaks-for-me", "fr": "#litterature-porte-parole",
     "es": "#literatura-portavoz", "ar": "#أدب-النيابة"},
    {"zh": "#今日份清醒", "en": "#daily-clarity", "fr": "#lucidite-du-jour",
     "es": "#claridad-del-dia", "ar": "#صفاء-اليوم"},
    {"zh": "#精神状态领先两千年", "en": "#mindset-2000-years-ahead", "fr": "#etat-desprit-2000-ans-davance",
     "es": "#mentalidad-2000-anos-adelantada", "ar": "#حالة-ذهنية-متقدمة-الف-عام"},
]

# 概念 → 主题标签
CONCEPT_TAGS: dict = {
    "ren": {"zh": "#做个温暖的人", "en": "#be-a-warm-person", "fr": "#une-personne-chaleureuse",
            "es": "#se-una-persona-calida", "ar": "#كن-إنسانا-دافئا"},
    "li": {"zh": "#分寸感拉满", "en": "#peak-propriety", "fr": "#sens-de-la-mesure",
           "es": "#puro-tacto", "ar": "#ذوق-رفيع"},
    "junzi": {"zh": "#人格天花板", "en": "#character-ceiling", "fr": "#sommet-du-caractere",
              "es": "#techo-de-caracter", "ar": "#قمة-الشخصية"},
    "yi": {"zh": "#该出手时就出手", "en": "#act-when-it-counts", "fr": "#agir-au-bon-moment",
           "es": "#actua-cuando-toca", "ar": "#تحرك-في-وقتها"},
    "shu": {"zh": "#换位思考", "en": "#walk-in-their-shoes", "fr": "#se-mettre-a-sa-place",
            "es": "#ponerse-en-su-lugar", "ar": "#ضع-نفسك-مكانه"},
}


def _pick(entry: dict, lang: str) -> str:
    """取当前语言的文案，缺语种时回落中文（与 t() 的回退口径一致）。"""
    return entry.get(lang) or entry["zh"]



@router.get("/feed")
def feed(
    lang: str = Query("en"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> List[dict]:
    """短视频流：把经典原文包装成可滑动的沉浸卡片。"""
    passages = (
        db.execute(
            select(Passage)
            .options(selectinload(Passage.translations), selectinload(Passage.chapter))
            .order_by(Passage.sort_order)
        )
        .scalars()
        .all()
    )

    items: List[dict] = []
    for i, p in enumerate(passages):
        trans = next((t.text for t in p.translations if t.lang == lang), "")
        if not trans:
            trans = next((t.text for t in p.translations if t.lang == "en"), "")
        tags = [_pick(CONCEPT_TAGS[c], lang) for c in (p.concepts or []) if c in CONCEPT_TAGS]
        tags.append(_pick(VIBE_TAGS[i % len(VIBE_TAGS)], lang))
        items.append(
            {
                "ref_id": p.id,
                "ref_label": localize_ref_label(p.ref_label, lang),
                "book": p.chapter.book_id if p.chapter else "",
                "original_text": p.original_text,
                "translation": trans,
                "persona": _pick(PERSONAS[i % len(PERSONAS)], lang),
                "tags": tags[:3],
            }
        )

    # 语料有限，循环填充到 limit，营造连续刷的体验
    if items:
        out: List[dict] = []
        while len(out) < limit:
            out.extend(items)
        return out[:limit]
    return []

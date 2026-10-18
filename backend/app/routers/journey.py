"""君子之路总览 — 六艺聚合 + 勋章 + 排行榜。

不建新表，全部基于现有 User.liuyi（JSON: {li, yue, she, yu, shu, shu2}）计算。
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1/journey", tags=["journey"])

# 六艺顺序固定：礼乐射御书数
ARTS = [
    {"key": "li",   "label": "礼", "field": "li",   "subtitle": "3D 宾主厅 · 执礼",         "color": "#993C1D"},
    {"key": "yue",  "label": "乐", "field": "yue",  "subtitle": "五音合鸣 · 和而不同",     "color": "#854F0B"},
    {"key": "she",  "label": "射", "field": "she",  "subtitle": "3D 射场 · 反求诸己",      "color": "#0F6E56"},
    {"key": "yu",   "label": "御", "field": "yu",   "subtitle": "五御之礼 · 礼以行之",     "color": "#534AB7"},
    {"key": "shu",  "label": "书", "field": "shu",  "subtitle": "字源图鉴 · 识字明义",     "color": "#1E5F8E"},
    {"key": "shu2", "label": "数", "field": "shu2", "subtitle": "均输衰分 · 不患寡而患不均", "color": "#7A3A2E"},
]

# 8 枚勋章（6 单艺 + 2 综合）
BADGE_DEFS = [
    {"key": "li_30",     "name": "习礼者",   "desc": "礼分达到 30",       "tier": "normal", "art": "li",   "threshold": 30},
    {"key": "yue_30",    "name": "知音",     "desc": "乐分达到 30",       "tier": "normal", "art": "yue",  "threshold": 30},
    {"key": "she_30",    "name": "反求诸己", "desc": "射分达到 30",       "tier": "normal", "art": "she",  "threshold": 30},
    {"key": "yu_30",     "name": "执御君子", "desc": "御分达到 30",       "tier": "normal", "art": "yu",   "threshold": 30},
    {"key": "shu_30",    "name": "通文达诂", "desc": "书分达到 30",       "tier": "normal", "art": "shu",  "threshold": 30},
    {"key": "shu2_30",   "name": "衡均",     "desc": "数分达到 30",       "tier": "normal", "art": "shu2", "threshold": 30},
    {"key": "all_40",    "name": "六艺通才", "desc": "六艺每艺 ≥ 40",     "tier": "gold",   "art": None,   "threshold": 40},
    {"key": "all_60_80", "name": "君子大成", "desc": "每艺 ≥ 60 且任一艺 ≥ 80", "tier": "treasure", "art": None, "threshold": 60},
]


# ── 五语映射 ─────────────────────────────────────────────────────────────────
_LANGS = ("zh", "en", "fr", "es", "ar")


def _loc(table: dict, key: str, lang: str) -> str:
    row = table.get(key, {})
    return row.get(lang) or row.get("zh") or key


ART_LABEL = {
    "li":   {"zh": "礼", "en": "Rites", "fr": "Rites", "es": "Ritos", "ar": "الشعائر"},
    "yue":  {"zh": "乐", "en": "Music", "fr": "Musique", "es": "Música", "ar": "الموسيقى"},
    "she":  {"zh": "射", "en": "Archery", "fr": "Tir à l'arc", "es": "Tiro con arco", "ar": "الرماية"},
    "yu":   {"zh": "御", "en": "Charioteering", "fr": "Conduite", "es": "Conducción", "ar": "القيادة"},
    "shu":  {"zh": "书", "en": "Calligraphy", "fr": "Calligraphie", "es": "Caligrafía", "ar": "الخط"},
    "shu2": {"zh": "数", "en": "Mathematics", "fr": "Mathématiques", "es": "Matemáticas", "ar": "الرياضيات"},
}
ART_SUB = {
    "li":   {"zh": "3D 宾主厅 · 执礼", "en": "3D guest hall · Conduct rites", "fr": "Salle d'hôtes 3D · Présider les rites", "es": "Salón de huéspedes 3D · Oficiar ritos", "ar": "قاعة الضيوف ثلاثية الأبعاد · إقامة الشعائر"},
    "yue":  {"zh": "五音合鸣 · 和而不同", "en": "Five notes in harmony", "fr": "Cinq notes en harmonie", "es": "Cinco notas en armonía", "ar": "النغمات الخمس في انسجام"},
    "she":  {"zh": "3D 射场 · 反求诸己", "en": "3D range · Seek within", "fr": "Champ de tir 3D · Se retourner vers soi", "es": "Campo 3D · Examinarse a sí mismo", "ar": "ميدان الرماية ثلاثية الأبعاد · مراجعة الذات"},
    "yu":   {"zh": "五御之礼 · 礼以行之", "en": "Five drives · Rites in motion", "fr": "Cinq attelages · Les rites en marche", "es": "Cinco conducciones · Ritos en marcha", "ar": "فنون القيادة الخمس · الشعائر في الحركة"},
    "shu":  {"zh": "字源图鉴 · 识字明义", "en": "Etymology gallery", "fr": "Galerie d'étymologies", "es": "Galería de etimologías", "ar": "معرض أصول الكلمات"},
    "shu2": {"zh": "均输衰分 · 不患寡而患不均", "en": "Fair distribution", "fr": "Partage équitable", "es": "Distribución equitativa", "ar": "التوزيع العادل"},
}
TITLES = {
    "君子大成": {"en": "Great Sage", "fr": "Grand Sage", "es": "Gran Sabio", "ar": "الحكيم الأكبر"},
    "六艺通才": {"en": "Six-Arts Master", "fr": "Maître des six arts", "es": "Maestro de las seis artes", "ar": "مُتقن الفنون الستة"},
    "博学君子": {"en": "Learned Junzi", "fr": "Junzi érudit", "es": "Junzi erudito", "ar": "جونزي المُتعلم"},
    "习艺之人": {"en": "Apprentice", "fr": "Apprenti", "es": "Aprendiz", "ar": "متدرب"},
    "始入门":   {"en": "Beginner", "fr": "Débutant", "es": "Principiante", "ar": "مبتدئ"},
    "未起步":   {"en": "Not started", "fr": "Pas encore commencé", "es": "Sin comenzar", "ar": "لم يبدأ"},
}
BADGE_NAME = {
    "li_30": {"en": "Rite Practitioner", "fr": "Pratiquant des rites", "es": "Practicante de ritos", "ar": "ممارس الشعائر"},
    "yue_30": {"en": "Music Connoisseur", "fr": "Connaisseur de musique", "es": "Conocedor de música", "ar": "عارف الموسيقى"},
    "she_30": {"en": "Self-Reflector", "fr": "Retour sur soi", "es": "Autoexaminador", "ar": "مراجع الذات"},
    "yu_30": {"en": "Master Charioteer", "fr": "Maître cocher", "es": "Auriga experto", "ar": "سائق مُتقن"},
    "shu_30": {"en": "Lettered Scholar", "fr": "Lettré", "es": "Erudito", "ar": "عالِم بالخط"},
    "shu2_30": {"en": "Balancer", "fr": "Équilibreur", "es": "Equilibrador", "ar": "المُوازن"},
    "all_40": {"en": "Six-Arts Adept", "fr": "Adepte des six arts", "es": "Adepto de seis artes", "ar": "مُجيد الفنون الستة"},
    "all_60_80": {"en": "Junzi's Culmination", "fr": "Apogée du junzi", "es": "Culminación del junzi", "ar": "اكتمال الجونزي"},
}
BADGE_DESC = {
    "li_30": {"en": "Rites score reaches 30", "fr": "Score des rites ≥ 30", "es": "Puntuación de ritos ≥ 30", "ar": "بلوغ درجة الشعائر ٣٠"},
    "yue_30": {"en": "Music score reaches 30", "fr": "Score de musique ≥ 30", "es": "Puntuación de música ≥ 30", "ar": "بلوغ درجة الموسيقى ٣٠"},
    "she_30": {"en": "Archery score reaches 30", "fr": "Score de tir ≥ 30", "es": "Puntuación de tiro ≥ 30", "ar": "بلوغ درجة الرماية ٣٠"},
    "yu_30": {"en": "Charioteering score reaches 30", "fr": "Score de conduite ≥ 30", "es": "Puntuación de conducción ≥ 30", "ar": "بلوغ درجة القيادة ٣٠"},
    "shu_30": {"en": "Calligraphy score reaches 30", "fr": "Score de calligraphie ≥ 30", "es": "Puntuación de caligrafía ≥ 30", "ar": "بلوغ درجة الخط ٣٠"},
    "shu2_30": {"en": "Mathematics score reaches 30", "fr": "Score de maths ≥ 30", "es": "Puntuación de matemáticas ≥ 30", "ar": "بلوغ درجة الرياضيات ٣٠"},
    "all_40": {"en": "Every art ≥ 40", "fr": "Chaque art ≥ 40", "es": "Cada arte ≥ 40", "ar": "كل فن ≥ ٤٠"},
    "all_60_80": {"en": "Every art ≥ 60 and one art ≥ 80", "fr": "Chaque art ≥ 60 et un art ≥ 80", "es": "Cada arte ≥ 60 y uno ≥ 80", "ar": "كل فن ≥ ٦٠ وأحدها ≥ ٨٠"},
}


def _art_score(liuyi: dict, field: str) -> int:
    return int((liuyi or {}).get(field, 0) or 0)


def _title_for(total: int, min_art: int) -> str:
    if total >= 480 and min_art >= 80: return "君子大成"
    if total >= 360 and min_art >= 40: return "六艺通才"
    if total >= 240: return "博学君子"
    if total >= 120: return "习艺之人"
    if total > 0: return "始入门"
    return "未起步"


def _user_overview(user: User, lang: str = "zh") -> dict:
    liuyi = user.liuyi or {}
    scores = [_art_score(liuyi, a["field"]) for a in ARTS]
    total = sum(scores)
    min_art = min(scores) if scores else 0
    max_art = max(scores) if scores else 0
    title = _loc(TITLES, _title_for(total, min_art), lang)

    arts_detail = [
        {
            "key": a["key"],
            "label": _loc(ART_LABEL, a["key"], lang),
            "subtitle": _loc(ART_SUB, a["key"], lang),
            "color": a["color"],
            "score": s,
            "path": f"/journey/{a['key'] if a['key'] != 'shu2' else 'math'}",
        }
        for a, s in zip(ARTS, scores)
    ]

    # 勋章解锁判定
    badges = []
    for b in BADGE_DEFS:
        unlocked = False
        if b["art"]:
            unlocked = _art_score(liuyi, b["art"]) >= b["threshold"]
        elif b["key"] == "all_40":
            unlocked = min_art >= 40
        elif b["key"] == "all_60_80":
            unlocked = min_art >= 60 and max_art >= 80
        badges.append({
            "key": b["key"],
            "name": _loc(BADGE_NAME, b["key"], lang),
            "desc": _loc(BADGE_DESC, b["key"], lang),
            "tier": b["tier"],
            "unlocked": unlocked,
        })

    return {
        "total_score": total,
        "title": title,
        "min_art": min_art,
        "max_art": max_art,
        "arts": arts_detail,
        "badges": badges,
        "badges_unlocked": sum(1 for b in badges if b["unlocked"]),
        "badges_total": len(badges),
    }


@router.get("/overview")
def overview(
    lang: str = Query("zh"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """当前用户的六艺总览 + 勋章状态。"""
    if lang not in _LANGS:
        lang = "zh"
    return _user_overview(user, lang)


@router.get("/leaderboard")
def leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
) -> dict:
    """按六艺总分排前 N。每人只占一个排名。

    去重规则（游客匿名都叫"小君子"，会产生很多冗余）：
      - 注册用户（has email）：按 user_id 唯一，永远不去重
      - 游客：按 display_name 去重，同名只保留**最高分**的那条
      - 当前用户（self）：永远保留自己的真实数据
    """
    rows = db.execute(select(User)).scalars().all()
    enriched = []
    for u in rows:
        liuyi = u.liuyi or {}
        scores = [_art_score(liuyi, a["field"]) for a in ARTS]
        total = sum(scores)
        if total <= 0:
            continue
        enriched.append({
            "user_id": u.id,
            "name": (u.display_name or "君子")[:8],
            "total": total,
            "by_art": {a["key"]: s for a, s in zip(ARTS, scores)},
            "is_self": user is not None and u.id == user.id,
            "is_guest": bool(u.is_guest),
        })
    # 先按总分排序
    enriched.sort(key=lambda x: -x["total"])

    # 去重：游客按 name，注册按 user_id（其实 user_id 天然唯一，所以注册不会重）
    seen_guest_names: set[str] = set()
    dedupe: list[dict] = []
    self_entry: Optional[dict] = None
    for it in enriched:
        if it["is_self"]:
            self_entry = it
        if it["is_guest"]:
            if it["name"] in seen_guest_names:
                # 已有更高分的同名游客，跳过 — 但如果是 self 必须保留
                if not it["is_self"]:
                    continue
            seen_guest_names.add(it["name"])
        dedupe.append(it)

    # 加 rank
    for i, item in enumerate(dedupe):
        item["rank"] = i + 1

    # 当前用户排名
    self_rank = next((it for it in dedupe if it["is_self"]), None) or self_entry
    return {
        "items": dedupe[:limit],
        "total_players": len(dedupe),
        "self": self_rank,
    }

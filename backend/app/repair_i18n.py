"""多语译文的定点修复（幂等）。

## 为什么需要单独一个模块

`seed_i18n_patch.apply_i18n_patch()` 只补**缺失**语种，不会覆盖已有译文 —— 这是对的
（保护人工修订）。但已入库的**错误译文**因此永远修不掉：种子文件改了，旧库仍是旧的。

本模块只做「把已知的错译替换成正确译文」这一件事，且**仅当库里仍是那段错译时**才改，
避免覆盖后续的人工修订。

## 收录的修复（2026-10-22 多语核查发现）

| 条目 | 语种 | 问题 |
| --- | --- | --- |
| 九章算术·均输 | ar | 「250,000 斛」写成 `خمساً وعشرين ألفِ مائة`（≈25,100，且语法不成立） |
| 周礼·地官·保氏 | fr / es / ar | 丢失「五礼·六乐·五射·五驭·六书·九数」枚举 |
| 孟子·滕文公下 | fr | 断句不成立（`même pour gibier en montagnes, il refuse`），且把「射者」增译为「差劲的射手」 |
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Translation

# (passage_id, lang) -> (错译片段, 正确全文)
# 注意：这里存**完整译文**，避免再次出现「只替换一句、把整段覆盖成一句」的事故。
FIXES: dict[tuple[str, str], tuple[str, str]] = {
    ("jiuzhang.junshu.1", "ar"): (
        "والمقاطعات الأربع تنقل مجتمعةً خمساً وعشرين ألفِ مائة هو.",
        "ولنفرض نقلاً عادلاً للحبوب: مقاطعة (أ) عشرة آلاف بيت ومسافة ثمانية أيام؛ "
        "(ب) تسعة آلاف وخمسمائة بيت وعشرة أيام؛ (ج) اثنا عشر ألفاً وثلاثمائة وخمسون بيتاً "
        "وثلاثة عشر يوماً؛ (د) اثنا عشر ألفاً ومئتا بيت وعشرون يوماً. والمقاطعات الأربع "
        "تنقل مجتمعةً مئتين وخمسين ألفًا من الهو.",
    ),
    ("zhouli.baoshi.1", "fr"): (
        "Puis enseigne-leur les Six Arts. Les Cinq techniques du char",
        "Puis on leur enseigne les Six Arts : les cinq sortes de rites, les six sortes de "
        "musique, les cinq sortes de tir à l'arc, les cinq manières de conduire un char, les "
        "six sortes de calligraphie, les neuf procédés de calcul. Les Cinq techniques du char : "
        "faire sonner les clochettes en cadence, suivre la courbe de l'eau, passer la stèle du "
        "seigneur, danser au carrefour, chasser le gibier à gauche.",
    ),
    ("zhouli.baoshi.1", "es"): (
        "Enséñales luego las Seis Artes. Las Cinco técnicas de carro",
        "Enséñales luego las Seis Artes: primero los cinco tipos de ritos, segundo los seis "
        "tipos de música, tercero los cinco tipos de tiro con arco, cuarto las cinco técnicas de "
        "carro, quinto los seis tipos de escritura, sexto los nueve procedimientos de cálculo. "
        "Las Cinco técnicas de carro: hacer sonar las campanillas en ritmo, seguir la curva del "
        "río, pasar la estela del señor, danzar en la encrucijada, cazar con la presa a la izquierda.",
    ),
    ("zhouli.baoshi.1", "ar"): (
        "ثم تُعلَّم الفنون الستة. خمس تقنيات للقيادة",
        "ثم تُعلَّم الفنون الستة: أولًا أنواع الطقوس الخمسة، وثانيًا أنواع الموسيقى الستة، "
        "وثالثًا أنواع الرماية الخمسة، ورابعًا فنون قيادة العربة الخمسة، وخامسًا أنواع الكتابة "
        "الستة، وسادسًا طرق الحساب التسعة. أما فنون القيادة الخمسة فهي: ضبط جرس العربة "
        "بالإيقاع، واتباع منعطف النهر، والمرور بنُصب الأمير، والرقص في مفترق الطرق، "
        "والصيد بالطريدة إلى اليسار.",
    ),
    ("guanzi.chengma.1", "ar"): (
        "الأرض أساس الحكم، فإذا كانت الأرض موزعة بعدل وانسجام صحّ الحكم، وإلا لم يصح.",
        "الأرض أساس الحكم، وبها يُقوَّم الحكم؛ فإن لم تكن الأرض موزعة بعدل ووفاق لم يستقم الحكم.",
    ),
    ("mengzi.tengwengong.xia.6", "fr"): (
        "même pour gibier en montagnes",
        "Même un cocher rougit de s'associer à un archer indigne ; dût-il, en s'y associant, "
        "prendre du gibier par montagnes entières, il ne le ferait pas.",
    ),
}


def repair_translations(db: Session) -> dict:
    """把仍处于「已知错译」状态的条目替换为正确译文。返回计数。"""
    counts = {"checked": 0, "repaired": 0}
    for (pid, lang), (bad, good) in FIXES.items():
        row = db.execute(
            select(Translation).where(
                Translation.passage_id == pid, Translation.lang == lang
            )
        ).scalar_one_or_none()
        counts["checked"] += 1
        if row is None:
            continue
        # 只在错译特征串仍存在时替换 —— 保护后续人工修订
        if bad in (row.text or "") and row.text != good:
            row.text = good
            counts["repaired"] += 1
    db.commit()
    return counts

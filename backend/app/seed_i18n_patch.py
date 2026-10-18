"""五语适配补丁：补齐译文层与注释层的中英法西阿覆盖。

## 背景（缺口成因）

1. **译文层**：`seed.py` 的 `PASSAGES`（5 篇）只写了 `zh` + `en` 两条译文，
   而其余 19 篇来自 `seed_corpus.py` 的 `EXTRA_PASSAGES`，带完整 `tr = {en, fr, es, ar}`。
   结果：`lunyu.xueer.1.1` / `weizheng.2.4` / `yanyuan.12.1` / `yanyuan.12.2` / `liren.4.16`
   这 5 篇在 fr / es / ar 下只剩中文原文，译文层整层消失。

2. **注释层**：`seed.py` 与 `seed_corpus.py` 建 `Annotation` 时都只写
   `lang="zh"` + `content`，从不写 `content_i18n`。结果 24 条注释的
   `content_i18n` 全为空 —— 任何语言都只显示中文注文。
   注疏出处标签（`source`）同理，无多语版本。

## 本模块

以**幂等补丁**方式修复，不改动既有数据、不重写 seed 主流程，
并保证**空库重建后依然生效**（在 `seed_if_empty()` 末尾调用）。

- `PASSAGE_TR_PATCH` —— 5 篇 × fr/es/ar = 15 条译文
- `ANNOTATION_I18N_PATCH` —— 24 条 × en/fr/es/ar = 96 条注文
- `SOURCE_I18N_PATCH` —— 2 个出处标签 × 4 语

译文口径与 `seed_corpus.py` 一致：`translator="platform"`。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import Annotation, Passage, Translation

LANGS = ("en", "fr", "es", "ar")

# ── 1. 译文补丁：seed.py 的 5 篇补 fr / es / ar ────────────────────────────────
PASSAGE_TR_PATCH: dict[str, dict[str, str]] = {
    "lunyu.xueer.1.1": {
        "fr": "N'est-il pas agréable d'apprendre et de mettre en pratique, en temps voulu, "
              "ce que l'on a appris ? N'est-il pas joyeux de voir des amis venir de loin ? "
              "N'est-on pas un junzi lorsqu'on ne s'irrite pas d'être méconnu des autres ?",
        "es": "¿No es un placer aprender y practicar a su debido tiempo lo aprendido? "
              "¿No es una alegría recibir a amigos que vienen de lejos? "
              "¿No es uno un junzi si no se irrita aunque los demás no lo reconozcan?",
        "ar": "أليس من اللذة أن يتعلّم المرء ويطبّق ما تعلّمه في حينه؟ "
              "أليس من الفرح أن يأتيه أصدقاء من بعيد؟ "
              "أوَليس المرء جنزًا إذا لم يغضب حين لا يعرفه الآخرون؟",
    },
    "lunyu.weizheng.2.4": {
        "fr": "À quinze ans, je vouai mon cœur à l'étude ; à trente ans, je me tins ferme ; "
              "à quarante ans, je n'avais plus de doutes ; à cinquante ans, je connaissais le "
              "décret du Ciel ; à soixante ans, mon oreille était accordée ; à soixante-dix ans, "
              "je pouvais suivre les désirs de mon cœur sans franchir les limites.",
        "es": "A los quince años puse mi corazón en el estudio; a los treinta me mantuve firme; "
              "a los cuarenta no tenía dudas; a los cincuenta conocía el decreto del Cielo; "
              "a los sesenta mi oído estaba atento; a los setenta podía seguir los deseos de mi "
              "corazón sin transgredir los límites.",
        "ar": "في الخامسة عشرة عقدتُ العزم على التعلّم، وفي الثلاثين ثبتُّ، وفي الأربعين لم يبقَ لديّ شك، "
              "وفي الخمسين عرفتُ أمر السماء، وفي الستين كان سمعي مستجيبًا، "
              "وفي السبعين أمكنني أن أتبع ما يشتهيه قلبي دون أن أتجاوز الحدود.",
    },
    "lunyu.yanyuan.12.1": {
        "fr": "Vaincre en soi-même les désirs égoïstes et revenir à la convenance rituelle (li), "
              "c'est la bienveillance (ren). Si, un seul jour, l'on parvient à se vaincre et à "
              "revenir aux rites, le monde entier reviendra à la bienveillance.",
        "es": "Vencerse a sí mismo y volver a la propiedad ritual (li) es la benevolencia (ren). "
              "Si por un solo día uno logra vencerse y volver a los ritos, "
              "el mundo entero volverá a la benevolencia.",
        "ar": "أن يقهر المرء نفسه ويعود إلى اللياقة الطقسية (لي) هو الرحمة (جين). "
              "وإن استطاع يومًا واحدًا أن يقهر نفسه ويعود إلى الطقوس، عاد العالم كله إلى الرحمة.",
    },
    "lunyu.yanyuan.12.2": {
        "fr": "Ce que tu ne désires pas pour toi-même, ne l'impose pas aux autres.",
        "es": "No impongas a los demás lo que tú mismo no deseas.",
        "ar": "لا تفرض على الآخرين ما لا ترضاه لنفسك.",
    },
    "lunyu.liren.4.16": {
        "fr": "Le junzi comprend ce qui est juste (yi) ; l'homme de peu comprend ce qui est profitable.",
        "es": "El junzi comprende lo que es justo (yi); el hombre mezquino comprende lo que es provechoso.",
        "ar": "الجنز يفهم ما هو صواب (يي)، أما الحقير فيفهم ما هو مربح.",
    },
}

# ── 2. 注释补丁：24 条注文补 en / fr / es / ar ────────────────────────────────
ANNOTATION_I18N_PATCH: dict[str, dict[str, str]] = {
    "lunyu.bayi.3.3": {
        "en": "The core of ritual and music is benevolence; without benevolence they degenerate into mere form.",
        "fr": "Le cœur du rituel et de la musique est la bienveillance ; sans elle, ils se réduisent à une forme vide.",
        "es": "El núcleo del rito y de la música es la benevolencia; sin ella se reducen a mera forma.",
        "ar": "جوهر الطقوس والموسيقى هو الرحمة؛ وبدونها تصيران مجرد شكل فارغ.",
    },
    "lunyu.liren.4.1": {
        "en": "Environment shapes one's moral cultivation — choose to dwell among the good.",
        "fr": "L'environnement façonne la formation morale : choisir de vivre auprès des bons.",
        "es": "El entorno moldea la formación moral: elegir habitar entre los buenos.",
        "ar": "البيئة تشكّل التربية الأخلاقية — فاختر مجاورة الصالحين.",
    },
    "lunyu.liren.4.15": {
        "en": "Zengzi summed up Confucius's Way: zhong (doing one's utmost) plus shu (extending oneself to others).",
        "fr": "Zengzi résuma la Voie de Confucius : zhong (faire de son mieux) et shu (s'étendre à autrui).",
        "es": "Zengzi resumió el Camino de Confucio: zhong (dar lo mejor de sí) y shu (extenderse a los demás).",
        "ar": "لخّص تسنغ تسي طريق كونفوشيوس: تشونغ (بذل الجهد) وشو (القياس بالنفس على الآخرين).",
    },
    "lunyu.liren.4.16": {
        "en": "The junzi takes righteousness as his standard; the petty person puts profit first — the difference lies in values.",
        "fr": "Le junzi prend la justice pour règle ; l'homme de peu privilégie le profit — la différence est dans les valeurs.",
        "es": "El junzi toma la justicia como norma; el hombre mezquino antepone el provecho: la diferencia está en los valores.",
        "ar": "يتخذ الجنز الصواب معيارًا، ويقدّم الحقير المصلحة — والفرق في التوجّه القيمي.",
    },
    "lunyu.liren.4.17": {
        "en": "Others are the mirror in which we see ourselves.",
        "fr": "Autrui est le miroir où nous nous voyons nous-mêmes.",
        "es": "Los demás son el espejo donde nos vemos a nosotros mismos.",
        "ar": "الآخرون مرآة يرى المرء فيها نفسه.",
    },
    "lunyu.liren.4.2": {
        "en": "Benevolence is a stable foundation for living, not an instrument.",
        "fr": "La bienveillance est un fondement stable de l'existence, non un instrument.",
        "es": "La benevolencia es un fundamento estable de la vida, no un instrumento.",
        "ar": "الرحمة أساس ثابت للحياة، لا أداة.",
    },
    "lunyu.liren.4.8": {
        "en": "It speaks of how precious it is to hear the Way — more weighty than life and death.",
        "fr": "Il dit combien il est précieux d'entendre la Voie — plus lourd que la vie et la mort.",
        "es": "Habla de cuán precioso es oír el Camino: más pesado que la vida y la muerte.",
        "ar": "يبيّن كم هو نفيس سماع الطريق — أثقل من الحياة والموت.",
    },
    "lunyu.shuer.7.21": {
        "en": "Anyone can be one's teacher; the key is to look inward.",
        "fr": "Chacun peut être un maître ; l'essentiel est de rentrer en soi.",
        "es": "Cualquiera puede ser maestro; la clave es mirar hacia dentro.",
        "ar": "كل إنسان يمكن أن يكون معلّمًا؛ والمفتاح هو مراجعة النفس.",
    },
    "lunyu.shuer.7.8": {
        "en": "Teach according to the student's capacity; elicit before you instil.",
        "fr": "Enseigner selon la nature de l'élève ; éveiller avant d'inculquer.",
        "es": "Enseñar según la capacidad del alumno; suscitar antes que inculcar.",
        "ar": "التعليم بحسب استعداد المتعلّم؛ والاستنهاض قبل التلقين.",
    },
    "lunyu.weizheng.2.1": {
        "en": "It says that by transforming the people through virtue, the people come of themselves.",
        "fr": "Il dit qu'en transformant le peuple par la vertu, le peuple vient de lui-même.",
        "es": "Dice que transformando al pueblo por la virtud, el pueblo acude por sí mismo.",
        "ar": "يقول إن الحكم بالفضيلة يحوّل الناس فيقبلون من تلقاء أنفسهم.",
    },
    "lunyu.weizheng.2.11": {
        "en": "Learning is not mere accumulation but the generation of new understanding.",
        "fr": "Apprendre n'est pas accumuler, mais engendrer une compréhension nouvelle.",
        "es": "Aprender no es solo acumular, sino generar nueva comprensión.",
        "ar": "التعلّم ليس مجرد تراكم، بل توليد فهم جديد.",
    },
    "lunyu.weizheng.2.15": {
        "en": "Learning and reflection are mutually dependent; neither suffices alone.",
        "fr": "Étude et réflexion sont complémentaires ; ni l'une ni l'autre ne suffit seule.",
        "es": "Estudio y reflexión son complementarios; ninguno basta por sí solo.",
        "ar": "التعلّم والتفكّر متلازمان؛ ولا يكفي أحدهما وحده.",
    },
    "lunyu.weizheng.2.17": {
        "en": "Wisdom begins with honestly admitting one's ignorance.",
        "fr": "La sagesse commence par l'aveu honnête de son ignorance.",
        "es": "La sabiduría comienza por admitir honestamente la propia ignorancia.",
        "ar": "الحكمة تبدأ بالاعتراف الصادق بالجهل.",
    },
    "lunyu.weizheng.2.3": {
        "en": "The fundamental difference between virtue-ritual and law-punishment: inner shame excels outer compulsion.",
        "fr": "La différence radicale entre vertu-rites et lois-châtiments : la honte intérieure l'emporte sur la contrainte extérieure.",
        "es": "La diferencia radical entre virtud-ritos y leyes-castigos: la vergüenza interna supera la coacción externa.",
        "ar": "الفرق الجوهري بين الفضيلة والطقوس من جهة والقانون والعقاب من جهة أخرى: الحياء الباطن خير من الإكراه الظاهر.",
    },
    "lunyu.weizheng.2.4": {
        "en": "It describes advancing in virtue and cultivating one's work, progressing in order until virtue is perfected.",
        "fr": "Il décrit le progrès dans la vertu et le travail sur soi, avançant par étapes jusqu'à la vertu accomplie.",
        "es": "Describe el avance en la virtud y el cultivo de la obra, progresando por etapas hasta la virtud consumada.",
        "ar": "يصف التقدّم في الفضيلة وإتقان العمل، سيرًا على مراحل حتى تمام الفضيلة.",
    },
    "lunyu.weizheng.2.7": {
        "en": "The true meaning of filial piety lies not in material support but in inner respect.",
        "fr": "Le vrai sens de la piété filiale n'est pas dans l'entretien matériel, mais dans le respect intérieur.",
        "es": "El verdadero sentido de la piedad filial no está en el sustento material, sino en el respeto interno.",
        "ar": "حقيقة البرّ ليست في الإعالة المادية، بل في التوقير القلبي.",
    },
    "lunyu.xueer.1.1": {
        "en": "It stresses continuous practice, exchange with kindred spirits, and not resenting being misunderstood.",
        "fr": "Il souligne la pratique continue, l'échange entre pairs, et le refus de s'irriter d'être incompris.",
        "es": "Subraya la práctica continua, el trato con los afines y no irritarse por no ser comprendido.",
        "ar": "يشدّد على الممارسة المتواصلة، والتواصل مع الأقران، وعدم الغضب من سوء الفهم.",
    },
    "lunyu.xueer.1.2": {
        "en": "Filial and fraternal love is the root of benevolence, extending from near to far into respect for public order.",
        "fr": "Piété filiale et amour fraternel sont la racine de la bienveillance, s'étendant du proche au lointain jusqu'au respect de l'ordre public.",
        "es": "La piedad filial y el amor fraterno son la raíz de la benevolencia, que se extiende de lo próximo a lo lejano hasta el respeto del orden público.",
        "ar": "برّ الوالدين ومحبة الإخوة أصل الرحمة، ويمتدّ من القريب إلى البعيد احترامًا للنظام العام.",
    },
    "lunyu.xueer.1.4": {
        "en": "Zengzi recounts his three daily self-examinations: loyalty, trustworthiness, and transmitting what he has learned.",
        "fr": "Zengzi énumère ses trois examens quotidiens : loyauté, sincérité, et transmission de ce qu'il a appris.",
        "es": "Zengzi enumera sus tres exámenes diarios: lealtad, sinceridad y transmisión de lo aprendido.",
        "ar": "يذكر تسنغ تسي فحوصه الثلاثة اليومية: الإخلاص، والصدق، ونقل ما تعلّمه.",
    },
    "lunyu.xueer.1.6": {
        "en": "Virtue takes precedence over knowledge: first be a person, then a scholar.",
        "fr": "La vertu prime le savoir : d'abord être homme, ensuite savant.",
        "es": "La virtud precede al saber: primero ser persona, luego erudito.",
        "ar": "الفضيلة قبل المعرفة: كن إنسانًا أولًا، ثم عالمًا.",
    },
    "lunyu.yanyuan.12.1": {
        "en": "To restrain selfish desire and bring words and deeds into accord with ritual is benevolence; its realization begins with self-cultivation.",
        "fr": "Maîtriser ses désirs égoïstes et accorder paroles et actes aux rites, c'est la bienveillance ; sa réalisation commence par le travail sur soi.",
        "es": "Contener el deseo egoísta y ajustar palabras y actos al rito es la benevolencia; su realización empieza en la propia cultivación.",
        "ar": "كفّ الرغبة الأنانية وموافقة القول والعمل للطقوس هو الرحمة؛ وتحقيقها يبدأ بتهذيب النفس.",
    },
    "lunyu.yanyuan.12.2": {
        "en": "The way of shu — measuring others by oneself — is benevolence made concrete in human relations.",
        "fr": "La voie du shu — se mesurer aux autres — est la bienveillance rendue concrète dans les relations humaines.",
        "es": "La vía del shu — medir a los demás por uno mismo — es la benevolencia hecha concreta en las relaciones humanas.",
        "ar": "طريق الشو — القياس بالنفس على الآخرين — هو الرحمة مجسَّدة في العلاقات الإنسانية.",
    },
    "lunyu.yanyuan.12.7": {
        "en": "The legitimacy of government rests on the trust of the people.",
        "fr": "La légitimité du gouvernement repose sur la confiance du peuple.",
        "es": "La legitimidad del gobierno se funda en la confianza del pueblo.",
        "ar": "شرعية الحكم تقوم على ثقة الناس.",
    },
    "lunyu.yongye.6.20": {
        "en": "The highest stage of learning is to “take joy in it” — inner delight.",
        "fr": "Le plus haut degré de l'étude est d'y « prendre joie » — la joie intérieure.",
        "es": "El grado más alto del aprendizaje es «regocijarse en ello»: el gozo interior.",
        "ar": "أعلى مراتب التعلّم أن «تُسرّ به» — أي الفرح الباطن.",
    },
}

# ── 3. 注疏出处标签多语 ──────────────────────────────────────────────────────
SOURCE_I18N_PATCH: dict[str, dict[str, str]] = {
    "现代释义": {
        "en": "Modern gloss",
        "fr": "Glose moderne",
        "es": "Glosa moderna",
        "ar": "شرح حديث",
    },
    "朱熹《论语集注》": {
        "en": "Zhu Xi, Collected Commentaries on the Analects",
        "fr": "Zhu Xi, Commentaires réunis sur les Entretiens",
        "es": "Zhu Xi, Comentarios reunidos sobre las Analectas",
        "ar": "تشو شي، الشروح المجموعة على المحاورات",
    },
}


def apply_i18n_patch(db: Session) -> dict:
    """幂等补齐译文与注释的多语字段。返回新增计数。"""
    counts = {"translations": 0, "annotations": 0, "sources": 0}

    # 1) 译文：只补缺失语种，已存在的不动
    for pid, by_lang in PASSAGE_TR_PATCH.items():
        if not db.get(Passage, pid):
            continue
        have = {
            t.lang
            for t in db.execute(
                select(Translation).where(Translation.passage_id == pid)
            ).scalars()
        }
        for lang, text in by_lang.items():
            if lang in have:
                continue
            db.add(
                Translation(
                    passage_id=pid, lang=lang, text=text, translator="platform"
                )
            )
            counts["translations"] += 1

    # 2) 注释：补 content_i18n 与 source_i18n
    for a in db.execute(select(Annotation)).scalars():
        want = ANNOTATION_I18N_PATCH.get(a.passage_id)
        if want:
            i18n = dict(a.content_i18n or {})
            changed = False
            for lang, text in want.items():
                if not i18n.get(lang):
                    i18n[lang] = text
                    changed = True
            if changed:
                a.content_i18n = i18n
                flag_modified(a, "content_i18n")
                counts["annotations"] += 1

        src_want = SOURCE_I18N_PATCH.get(a.source or "")
        if src_want:
            src = dict(a.source_i18n or {})
            changed = False
            for lang, text in src_want.items():
                if not src.get(lang):
                    src[lang] = text
                    changed = True
            if changed:
                a.source_i18n = src
                flag_modified(a, "source_i18n")
                counts["sources"] += 1

    db.commit()
    return counts

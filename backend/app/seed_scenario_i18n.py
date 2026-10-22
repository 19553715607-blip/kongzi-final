"""六艺场景文案的多语补丁（内容层）。

## 背景（为什么单列一个模块）

`seed_i18n_patch.py` 处理的是**经典层**（`Passage` 译文 + `Annotation` 注文），
本模块处理的是**六艺场景层** —— 关卡标题、情志标签、情境描述、提示语。
两者是不同层的数据，混在一起会让各自的意图变模糊；且场景层要覆盖六个艺，
体量会持续增长，故单列。

## 内容层的既有缺口

六艺的场景文案原先只有中文，存在 `*Scenario.title` / `setting` / `hint` 等字段里。
前端直接显示这些字段，于是英文模式下关卡卡片的标题与描述仍是中文。
本模块以 **JSON `*_i18n` 列**（`{lang: 译文}`）承载译文 —— 与
`Book.title_i18n` / `Annotation.content_i18n` / `Topic.name_i18n` 同构，
由 `services/i18n.pick_i18n()` 按 lang 取值，缺译回落中文。

## 为什么不用 `Translation` 表

`Translation` 表服务于**经典原文的长篇译文**（`passage_id` FK + `lang` + `text`），
一份原文对应一份完整译文。场景文案是**实体上的短字段**，用 JSON 列更贴合，
也免去为每个字段建关联表的开销。

## 覆盖范围

按艺逐个推进，每个艺 5 个场景 × 4 个字段 × 4 语（en/fr/es/ar）= 80 条：

| 艺 | 模型 | 字段 | 状态 |
| --- | --- | --- | --- |
| 乐 yue | `YueScenario` | title / mood_label / setting / hint | ✅ 试点 |
| 御 yu | `YuScenario` | title / kind_label / setting / hint | ✅ |
| 数 math | `MathScenario` | 同上 + `unit` + `items_i18n`（明细行） | ✅ |
| 礼 li | `LiScenario` | title / setting + 选项 JSON | ✅ |
| 书 shu | `ShuCard` | benyi / jinyi / story + `options`（选项） | ✅ |

**射艺无内容层缺口** —— 它的场景是前端常量，不经数据库。

## 幂等性

- 按**中文 `title`** 定位场景（与 `seed_yue_scenarios.py` 的 upsert 键一致）；
- 只补**缺失的语种**，已有译文不覆盖（便于后续人工修订）；
- 在 `main.py` 启动流程与 `seed.py` 的 `seed_if_empty()` 末尾调用。

## 已知约束：乐艺场景不由 `seed_if_empty()` 播种

`seed_if_empty()` 只接线了 `seed_li_scenarios`，**未调用 `seed_yue_scenarios`**
（`seed_math_scenarios` / `seed_yu_scenarios` 同样如此）。乐艺的 5 个场景来自
独立脚本 `python -m app.seed_yue_scenarios`。

因此**真正的兜底是 `main.py` 的启动钩子** —— 它在**每次**应用启动时执行，
无论场景是何时灌入的，译文都会在下次启动时补齐。`seed.py` 里的调用只是
"若场景已存在则顺带补上"。在全新库上验证过：0 场景 → 播种 5 → 补丁补齐 80 条。

## 维护提示

若日后修改了场景的中文 `title`，需同步更新本模块的键，否则该场景的译文不再被补上。
`verify_coverage()` 可用于检出这种失配。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import LiScenario, MathScenario, ShuCard, YueScenario, YuScenario
from .scenario_i18n_li import LI_SCENARIO_I18N
from .scenario_i18n_math import MATH_SCENARIO_I18N
from .scenario_i18n_shu import SHU_CARD_I18N

LANGS = ("en", "fr", "es", "ar")

# ── 乐艺 5 个场景 × 4 字段 × 4 语 ────────────────────────────────────────────
# 键为中文 title（与 seed_yue_scenarios.py 的 SCENARIOS 一致）。
# 五音名（宫商角徵羽）按项目约定保留拼音，不意译 —— 它们是概念本身。
YUE_SCENARIO_I18N: dict[str, dict[str, dict[str, str]]] = {
    "祭祖大典": {
        "title": {
            "en": "The Ancestral Rite",
            "fr": "Le grand sacrifice aux ancêtres",
            "es": "El gran rito a los antepasados",
            "ar": "مراسم تكريم الأجداد",
        },
        "mood_label": {
            "en": "Solemn and reverent",
            "fr": "Solennel et recueilli",
            "es": "Solemne y reverente",
            "ar": "جليل وخاشع",
        },
        "setting": {
            "en": "In the ancestral temple, with all forebears present above. You must play a passage of music to honour them.",
            "fr": "Dans le temple ancestral, sous le regard des ancêtres. Il faut jouer un passage musical pour leur rendre hommage.",
            "es": "En el templo ancestral, con todos los antepasados presentes. Has de tocar un pasaje musical para honrarlos.",
            "ar": "في معبد الأجداد، والأسلاف جميعًا حاضرون فوقك. عليك أن تعزف مقطعًا موسيقيًا لتكريمهم.",
        },
        "hint": {
            "en": "Solemn music favours gong and shang (the steady tones) and uses little of jue, zhi and yu (the light ones). Avoid repeating a single note over and over.",
            "fr": "La musique solennelle privilégie gong et shang (les sons posés) et fait peu appel à jue, zhi et yu (les sons légers). Évitez de répéter une même note sans interruption.",
            "es": "La música solemne prefiere gong y shang (los sonidos serenos) y usa poco jue, zhi y yu (los ligeros). Evita repetir una misma nota sin interrupción.",
            "ar": "الموسيقى الجليلة تُكثر من غونغ وشانغ (النغمتين الراسيتين) وتقلّل من جويه وجي ويوي (النغمات الخفيفة). وتجنّب تكرار النغمة الواحدة على التوالي.",
        },
    },
    "宾客宴饮": {
        "title": {
            "en": "The Banquet",
            "fr": "Le banquet des hôtes",
            "es": "El banquete de los invitados",
            "ar": "مأدبة الضيوف",
        },
        "mood_label": {
            "en": "Gracious and harmonious",
            "fr": "Gracieux et harmonieux",
            "es": "Cortés y armonioso",
            "ar": "رصين ومتناغم",
        },
        "setting": {
            "en": "Distinguished guests are seated; cups are raised in good cheer. Play a passage so that host and guest alike rejoice without breach of propriety.",
            "fr": "Des hôtes de marque sont attablés ; on lève la coupe dans la joie. Jouez un passage pour que l'hôte et les invités se réjouissent sans manquer aux convenances.",
            "es": "Hay invitados distinguidos en la mesa; se alzan las copas con alegría. Toca un pasaje para que anfitrión y convidados se regocijen sin faltar a la cortesía.",
            "ar": "الضيوف الكرام على المائدة، والكؤوس تُرفع في سرور. اعزف مقطعًا يفرح به المضيف والضيف دون إخلال بالأدب.",
        },
        "hint": {
            "en": "Banquet music should be gracious, with the five notes fairly balanced; a slightly greater share of zhi (the bright tone) is fitting.",
            "fr": "La musique de banquet doit être gracieuse, les cinq notes assez équilibrées ; une part un peu plus grande de zhi (le son clair) est de mise.",
            "es": "La música del banquete ha de ser cortés, con las cinco notas bastante equilibradas; conviene algo más de zhi (el sonido claro).",
            "ar": "ينبغي أن تكون موسيقى المأدبة رصينة، والنغمات الخمس متوازنة نسبيًا؛ ويُستحسن أن تكون حصة جي (النغمة المشرقة) أوفر قليلًا.",
        },
    },
    "送别故人": {
        "title": {
            "en": "Parting from an Old Friend",
            "fr": "Adieu à un vieil ami",
            "es": "Despedida de un viejo amigo",
            "ar": "توديع صديق قديم",
        },
        "mood_label": {
            "en": "Grief that does not wound",
            "fr": "Chagrin sans blessure",
            "es": "Aflicción sin herida",
            "ar": "حزن لا يجرح",
        },
        "setting": {
            "en": "An old friend sets out on a long journey; you see him off at the Ba Bridge. Play a passage to voice your parting feelings — but let it not turn to excess of sorrow.",
            "fr": "Un vieil ami part pour un long voyage ; vous le reconduisez au pont de Ba. Jouez un passage pour dire vos adieux, sans que le chagrin ne devienne excessif.",
            "es": "Un viejo amigo emprende un largo viaje; lo despides en el puente de Ba. Toca un pasaje para expresar la despedida, pero sin que la tristeza llegue al exceso.",
            "ar": "صديق قديم يمضي في سفر بعيد، وتشيعه عند جسر با. اعزف مقطعًا تُعبّر به عن فراقك، دون أن يبلغ الحزن حدّ الإفراط.",
        },
        "hint": {
            "en": "Farewell music turns on \"grief that does not wound\": a little more shang and jue to carry the longing, yet still grounded in the steadiness of gong.",
            "fr": "La musique d'adieu repose sur « le chagrin qui ne blesse pas » : un peu plus de shang et de jue pour porter le regret, mais toujours ancrée dans la stabilité du gong.",
            "es": "La música de despedida se cifra en «aflicción que no hiere»: algo más de shang y jue para llevar la nostalgia, pero siempre asentada en la firmeza de gong.",
            "ar": "موسيقى التوديع مدارها على «حزن لا يجرح»: شيء من شانغ وجويه يحمل الشوق، مع بقاء الأساس راسخًا في غونغ.",
        },
    },
    "闲居抚琴": {
        "title": {
            "en": "Playing the Qin at Leisure",
            "fr": "Jouer du qin dans la retraite",
            "es": "Tañer el qin en el retiro",
            "ar": "العزف على التشين في الخلوة",
        },
        "mood_label": {
            "en": "At ease, in perfect balance",
            "fr": "À l'aise, en parfait équilibre",
            "es": "Sosegado y en equilibrio",
            "ar": "سكون واعتدال",
        },
        "setting": {
            "en": "Returned from court, you sit alone beneath the trees. No aim, no want — nothing but the qin under your hands.",
            "fr": "De retour de la cour, vous vous asseyez seul sous les arbres. Nul but, nul désir — rien que le qin sous vos doigts.",
            "es": "De vuelta de la corte, te sientas solo bajo los árboles. Sin propósito ni deseo: solo el qin bajo tus manos.",
            "ar": "عدتَ من البلاط فجلستَ وحيدًا تحت الأشجار. لا غاية ولا مطلب، ليس إلا التشين بين يديك.",
        },
        "hint": {
            "en": "Music of central harmony keeps the five notes even — this is precisely the state of \"aroused by the Odes, established by ritual, perfected by music\".",
            "fr": "La musique d'harmonie centrale tient les cinq notes égales — c'est là précisément l'état décrit par « éveillé par les Odes, affermi par les rites, accompli par la musique ».",
            "es": "La música de armonía central mantiene las cinco notas iguales: es justamente el estado de «despertado por las Odas, afirmado por el rito, consumado por la música».",
            "ar": "موسيقى الاعتدال تُبقي النغمات الخمس متساوية — وهذه بعينها منزلة «يُنبَّه بالشعر، ويُثبَّت بالطقوس، ويُكمَّل بالموسيقى».",
        },
    },
    "出征誓师": {
        "title": {
            "en": "The Oath Before Battle",
            "fr": "Le serment avant la campagne",
            "es": "El juramento antes de la campaña",
            "ar": "قسم الخروج للحرب",
        },
        "mood_label": {
            "en": "Stirring and ardent",
            "fr": "Fougueux et exalté",
            "es": "Ardoroso y exaltado",
            "ar": "مُلتهب وحماسي",
        },
        "setting": {
            "en": "The three armies stand in ranks; the campaign against the rebels is about to begin. Play a passage to rouse their spirit — but let it not descend into bloodlust.",
            "fr": "Les trois armées sont rangées en ordre ; la campagne contre les rebelles va commencer. Jouez un passage pour exalter leur ardeur, sans qu'elle ne dégénère en soif de sang.",
            "es": "Los tres ejércitos forman en filas; la campaña contra los rebeldes está por comenzar. Toca un pasaje para alentar su ánimo, pero sin que degenere en sed de sangre.",
            "ar": "الجيوش الثلاثة مصطفّة، والحملة على المارقين على وشك أن تبدأ. اعزف مقطعًا يبعث الحمية في نفوسهم، دون أن ينحدر إلى شهوة القتل.",
        },
        "hint": {
            "en": "Oath music leans on yu and zhi (high and bright), yet must keep the weight of gong — Confucius's remark that the music of Wu was \"perfect in beauty but not in goodness\" serves as a caution.",
            "fr": "La musique du serment s'appuie sur yu et zhi (hauts et clairs), mais doit garder la pesanteur du gong — le mot de Confucius sur la musique de Wu, « parfaite en beauté mais non en bonté », sert d'avertissement.",
            "es": "La música del juramento se apoya en yu y zhi (agudos y claros), pero ha de conservar el peso de gong: la observación de Confucio de que la música de Wu era «perfecta en belleza, mas no en bondad» sirve de advertencia.",
            "ar": "موسيقى القسم تعتمد على يوي وجي (العاليتين المشرقتين)، لكن يجب أن تحتفظ بثقل غونغ — وقول كونفوشيوس إن موسيقى وو «كاملة في الجمال دون الخير» يصلح تحذيرًا.",
        },
    },
}


# ── 御艺 5 个场景 × 4 字段 × 4 语 ────────────────────────────────────────────
# 「五御」名目（鸣和鸾/逐水曲/过君表/舞交衢/逐禽左）出自《周礼·保氏》，
# 是御艺的关卡名，属**概念名称**，译文按「可理解的意译」处理而非音译，
# 因为它们是驾驶动作的描述性名称（与五音名不同）。
YU_SCENARIO_I18N: dict[str, dict[str, dict[str, str]]] = {
    "鸣和鸾": {
        "title": {
            "en": "Sounding the Bells",
            "fr": "Faire résonner les clochettes",
            "es": "El tintín de las campanillas",
            "ar": "رنين الأجراس",
        },
        "kind_label": {
            "en": "Sounding the Bells",
            "fr": "Faire résonner les clochettes",
            "es": "El tintín de las campanillas",
            "ar": "رنين الأجراس",
        },
        "setting": {
            "en": "You mount the chariot and set out; the bells of harmony must keep time with the pace of the wheels. Here the rhythm is marked by beat-gates on the road.",
            "fr": "Vous montez sur le char et partez ; les clochettes d'harmonie doivent suivre le rythme des roues. Ici, le rythme est marqué par des portes-battements sur la route.",
            "es": "Subes al carro y partes; las campanillas de la armonía han de seguir el compás de las ruedas. Aquí el ritmo se marca con portales de compás en el camino.",
            "ar": "تركب العربة وتنطلق، وأجراس الانسجام يجب أن توافق إيقاع سير العجلات. وفي هذا المستوى تُعلَّم النبضات ببوابات إيقاعية على الطريق.",
        },
        "hint": {
            "en": "No need to listen — watch the yellow ♩ beat-gates on the road. Hold a steady speed of about 8 m/s; if the chariot reaches each gate close to the target time and place, you are in time.",
            "fr": "Pas besoin d'écouter : observez les portes-battements jaunes ♩ sur la route. Gardez une vitesse régulière d'environ 8 m/s ; si le char atteint chaque porte près du temps et de la position visés, vous êtes dans le rythme.",
            "es": "No hace falta escuchar: observa los portales de compás amarillos ♩ en el camino. Mantén una velocidad estable de unos 8 m/s; si el carro llega a cada portal cerca del tiempo y el lugar previstos, vas a compás.",
            "ar": "لا حاجة للاستماع — راقب بوابات الإيقاع الصفراء ♩ على الطريق. حافظ على سرعة ثابتة نحو ٨ م/ث؛ وإذا بلغت العربة كل بوابة قريبة من الزمن والموضع المستهدفين فقد وافقت الإيقاع.",
        },
    },
    "逐水曲": {
        "title": {
            "en": "Following the Water's Bends",
            "fr": "Suivre les méandres de l'eau",
            "es": "Siguiendo los meandros del agua",
            "ar": "متابعة منعطفات الماء",
        },
        "kind_label": {
            "en": "Following the Water's Bends",
            "fr": "Suivre les méandres de l'eau",
            "es": "Siguiendo los meandros del agua",
            "ar": "متابعة منعطفات الماء",
        },
        "setting": {
            "en": "Drive along the waterway: where the water bends, the chariot bends.",
            "fr": "Conduisez le long du cours d'eau : là où l'eau tourne, le char tourne.",
            "es": "Conduce a lo largo del cauce: donde el agua tuerce, el carro tuerce.",
            "ar": "قُد بمحاذاة مجرى الماء: حيث ينحني الماء تنحني العربة.",
        },
        "hint": {
            "en": "Three bends in the road — keep the chariot within its lane (within ±1 m of the centre line).",
            "fr": "Trois virages sur la route : gardez le char dans sa voie (±1 m de la ligne médiane).",
            "es": "Tres curvas en el camino: mantén el carro dentro de su carril (±1 m de la línea central).",
            "ar": "ثلاثة منعطفات في الطريق — أبقِ العربة داخل مسارها (±١ م عن الخط الأوسط).",
        },
    },
    "过君表": {
        "title": {
            "en": "Passing the Lord's Standard",
            "fr": "Passer l'étendard du seigneur",
            "es": "Pasar el estandarte del señor",
            "ar": "مجاوزة راية السيد",
        },
        "kind_label": {
            "en": "Passing the Lord's Standard",
            "fr": "Passer l'étendard du seigneur",
            "es": "Pasar el estandarte del señor",
            "ar": "مجاوزة راية السيد",
        },
        "setting": {
            "en": "Ahead stands the lord's standard. In passing you must slow down and bow by pressing \"Rite\".",
            "fr": "Devant se dresse l'étendard du seigneur. En le dépassant, il faut ralentir et s'incliner en pressant « Rite ».",
            "es": "Ante ti se alza el estandarte del señor. Al pasarlo has de reducir la marcha e inclinarte pulsando «Rito».",
            "ar": "أمامك راية السيد منصوبة. عند مجاوزتها عليك أن تخفّف السرعة وتنحني بالضغط على «الطقس».",
        },
        "hint": {
            "en": "Reduce speed below 4 m/s by 30 m before the standard, and press \"Rite\" the moment you pass it.",
            "fr": "Réduisez la vitesse sous 4 m/s 30 m avant l'étendard, et pressez « Rite » à l'instant où vous le dépassez.",
            "es": "Reduce la velocidad por debajo de 4 m/s a 30 m del estandarte y pulsa «Rito» en el instante de pasarlo.",
            "ar": "اخفض السرعة دون ٤ م/ث قبل الراية بثلاثين مترًا، واضغط «الطقس» لحظة مجاوزتها.",
        },
    },
    "舞交衢": {
        "title": {
            "en": "Dancing at the Crossroads",
            "fr": "Danser au carrefour",
            "es": "Danzar en el cruce",
            "ar": "الرقص عند ملتقى الطرق",
        },
        "kind_label": {
            "en": "Dancing at the Crossroads",
            "fr": "Danser au carrefour",
            "es": "Danzar en el cruce",
            "ar": "الرقص عند ملتقى الطرق",
        },
        "setting": {
            "en": "You come to a crossroads where a pedestrian is crossing. You must stop and yield of your own accord.",
            "fr": "Vous arrivez à un carrefour où un piéton traverse. Il faut s'arrêter et lui céder le passage de vous-même.",
            "es": "Llegas a un cruce donde un peatón está cruzando. Has de detenerte y cederle el paso por tu propia voluntad.",
            "ar": "تبلغ ملتقى طرق يعبر فيه أحد المارة. عليك أن تتوقف وتفسح له من تلقاء نفسك.",
        },
        "hint": {
            "en": "On seeing a pedestrian (🚶) before the crossing, come to a stop (speed < 1 m/s) and wait until they have finished crossing before moving off.",
            "fr": "En voyant un piéton (🚶) avant le carrefour, arrêtez-vous (vitesse < 1 m/s) et attendez qu'il ait fini de traverser avant de repartir.",
            "es": "Al ver un peatón (🚶) antes del cruce, detente (velocidad < 1 m/s) y espera a que termine de cruzar antes de reanudar la marcha.",
            "ar": "عند رؤية أحد المارة (🚶) قبل الملتقى توقّف (السرعة < ١ م/ث)، وانتظر حتى يُتمّ العبور ثم انطلق.",
        },
    },
    "逐禽左": {
        "title": {
            "en": "Chasing Game to the Left",
            "fr": "Poursuivre le gibier à gauche",
            "es": "Perseguir la caza a la izquierda",
            "ar": "ملاحقة الصيد إلى اليسار",
        },
        "kind_label": {
            "en": "Chasing Game to the Left",
            "fr": "Poursuivre le gibier à gauche",
            "es": "Perseguir la caza a la izquierda",
            "ar": "ملاحقة الصيد إلى اليسار",
        },
        "setting": {
            "en": "Out on the hunting ground, the game breaks away to the left. By ancient rite: when the quarry flees, you halt and give chase no more.",
            "fr": "Sur le terrain de chasse, le gibier s'enfuit vers la gauche. Selon le rite ancien : quand la proie fuit, on s'arrête et l'on ne poursuit plus.",
            "es": "En el coto de caza, la pieza escapa hacia la izquierda. Según el rito antiguo: cuando la presa huye, uno se detiene y no la persigue más.",
            "ar": "في أرض الصيد ينطلق الطريد نحو اليسار. وفي الأدب القديم: إذا فرّ الصيد توقّفتَ ولم تتبعه.",
        },
        "hint": {
            "en": "When the 🦌 flees, **do not chase it** (do not turn left in pursuit). Hold your original course to score well.",
            "fr": "Quand le 🦌 s'enfuit, **ne le poursuivez pas** (ne tournez pas à gauche pour le rattraper). Tenez votre cap pour marquer des points.",
            "es": "Cuando el 🦌 huya, **no lo persigas** (no gires a la izquierda para alcanzarlo). Mantén tu rumbo para puntuar alto.",
            "ar": "إذا فرّ 🦌 فلا **تتبعه** (لا تنعطف يسارًا للحاق به). وواصل مسارك الأصلي لتنال نتيجة عالية.",
        },
    },
}


# 各艺的补丁注册表：(模型, 中文名键字段, 需补译的字段, 译文表[, 明细行配置])
# 明细行配置 = (存列名, 列表属性名, 表内子键名, 元素的键字段, 需补译的子字段)
ARTS: list[tuple] = [
    (YueScenario, "title", ("title", "mood_label", "setting", "hint"), YUE_SCENARIO_I18N),
    (YuScenario, "title", ("title", "kind_label", "setting", "hint"), YU_SCENARIO_I18N),
    (
        MathScenario,
        "title",
        ("title", "kind_label", "setting", "hint", "unit"),
        MATH_SCENARIO_I18N,
        # 明细行：以明细自己的中文 name 为键（name 是前后端协议键，不译；译名进 name_display）
        ("items_i18n", "items", "items", "name", ("name", "attrs", "principle")),
    ),
    (
        ShuCard,
        "char",   # 以汉字本身为键（唯一）
        ("benyi", "jinyi", "story"),
        SHU_CARD_I18N,
        # 选项：以 ASCII 选项 key（"A".."D"）为键 —— 它本就是身份，无需 name_display 那类分离
        ("options_i18n", "options", "options", "key", ("text",)),
    ),
    (
        LiScenario,
        "title",  # 以中文情境标题为键（与 seed_li_scenarios.py 的 upsert 键一致）
        ("title", "setting"),
        LI_SCENARIO_I18N,
        # 选项：文本 + 选后点评（儒家视角 / 他人反应）三个子字段
        ("options_i18n", "options", "options", "key", ("text", "comment_ru", "comment_others")),
    ),
]


def apply_scenario_i18n(db: Session) -> dict:
    """幂等补齐各艺场景的多语字段。返回各类计数。

    只写**缺失的语种**；已有译文不覆盖，便于后续人工修订。
    """
    counts = {"arts": 0, "entities": 0, "fields": 0, "items": 0, "langs": 0}
    for entry in ARTS:
        model, key_field, fields, table = entry[0], entry[1], entry[2], entry[3]
        item_cfg = entry[4] if len(entry) > 4 else None
        art_touched = False

        for obj in db.execute(select(model)).scalars():
            want = table.get(getattr(obj, key_field))
            if not want:
                continue
            touched = False

            # ① 场景级普通字段 → {field}_i18n
            for field in fields:
                attr = f"{field}_i18n"
                cur = dict(getattr(obj, attr) or {})
                changed = False
                for lang, text in (want.get(field) or {}).items():
                    if not cur.get(lang):
                        cur[lang] = text
                        changed = True
                        counts["langs"] += 1
                if changed:
                    setattr(obj, attr, cur)
                    flag_modified(obj, attr)
                    counts["fields"] += 1
                    touched = True

            # ② 明细行 → items_i18n（以明细自己的中文键为键）
            if item_cfg:
                col, list_attr, sub_key, item_key, subfields = item_cfg
                cur_items = {
                    k: {sk: dict(sv) for sk, sv in (v or {}).items()}
                    for k, v in (getattr(obj, col) or {}).items()
                }
                items_changed = False
                for it in (getattr(obj, list_attr) or []):
                    key = it.get(item_key)
                    per_item = (want.get(sub_key) or {}).get(key)
                    if not per_item:
                        continue
                    slot = cur_items.setdefault(key, {})
                    for sub in subfields:
                        sub_slot = dict(slot.get(sub) or {})
                        sub_changed = False
                        for lang, text in (per_item.get(sub) or {}).items():
                            if not sub_slot.get(lang):
                                sub_slot[lang] = text
                                sub_changed = True
                                counts["langs"] += 1
                        if sub_changed:
                            slot[sub] = sub_slot
                            items_changed = True
                            counts["items"] += 1
                if items_changed:
                    setattr(obj, col, cur_items)
                    flag_modified(obj, col)
                    touched = True

            if touched:
                counts["entities"] += 1
                art_touched = True

        if art_touched:
            counts["arts"] += 1

    db.commit()
    return counts


def verify_coverage(db: Session) -> list[str]:
    """检出问题：中文名对不上（失配）、译文不齐（缺语种/缺字段）、未落库、多余条目。

    返回问题描述列表；空列表表示完全覆盖。
    """
    problems: list[str] = []
    for entry in ARTS:
        model, key_field, fields, table = entry[0], entry[1], entry[2], entry[3]
        item_cfg = entry[4] if len(entry) > 4 else None
        objs = list(db.execute(select(model)).scalars())
        names = {getattr(o, key_field) for o in objs}

        for o in objs:
            name = getattr(o, key_field)
            want = table.get(name)
            if not want:
                problems.append(
                    f"[失配] {model.__name__} id={o.id} {key_field}={name!r} 在本模块中无对应条目"
                )
                continue

            # 场景级字段
            for field in fields:
                per_lang = want.get(field)
                if not per_lang:
                    problems.append(f"[缺字段] {model.__name__} {name!r} 的 {field} 无译文")
                    continue
                stored = getattr(o, f"{field}_i18n") or {}
                for lang in LANGS:
                    if not per_lang.get(lang):
                        problems.append(f"[缺语种] {model.__name__} {name!r} {field} 缺 {lang}")
                    elif not stored.get(lang):
                        problems.append(f"[未落库] {model.__name__} {name!r} {field}_i18n 缺 {lang}")

            # 明细行
            if item_cfg:
                col, list_attr, sub_key, item_key, subfields = item_cfg
                stored_items = getattr(o, col) or {}
                want_items = want.get(sub_key) or {}
                rows = getattr(o, list_attr) or []
                db_item_keys = {it.get(item_key) for it in rows}
                for it in rows:
                    ikey = it.get(item_key)
                    per_item = want_items.get(ikey)
                    if not per_item:
                        problems.append(
                            f"[失配] {model.__name__} {name!r} 明细 {ikey!r} 无对应条目"
                        )
                        continue
                    for sub in subfields:
                        per_lang = per_item.get(sub)
                        if not per_lang:
                            # principle 等可选子字段：中文原文为空则允许缺译
                            if not it.get(sub):
                                continue
                            problems.append(
                                f"[缺字段] {model.__name__} {name!r} 明细 {ikey!r} 的 {sub} 无译文"
                            )
                            continue
                        stored = (stored_items.get(ikey) or {}).get(sub) or {}
                        for lang in LANGS:
                            if not per_lang.get(lang):
                                problems.append(
                                    f"[缺语种] {model.__name__} {name!r} 明细 {ikey!r} {sub} 缺 {lang}"
                                )
                            elif not stored.get(lang):
                                problems.append(
                                    f"[未落库] {model.__name__} {name!r} 明细 {ikey!r} {sub}_i18n 缺 {lang}"
                                )
                for ikey in want_items:
                    if ikey not in db_item_keys:
                        problems.append(
                            f"[多余] {model.__name__} {name!r} 明细表中有 {ikey!r}，但库中无此明细"
                        )

        for name in table:
            if name not in names:
                problems.append(f"[多余] {model.__name__} 表中有 {name!r}，但库中无此条目")
    return problems


if __name__ == "__main__":
    from .db import SessionLocal, init_db

    init_db()
    _db = SessionLocal()
    try:
        print(f"[seed-scenario-i18n] applied: {apply_scenario_i18n(_db)}")
        _probs = verify_coverage(_db)
        if _probs:
            print("[seed-scenario-i18n] 覆盖问题:")
            for _p in _probs:
                print("  - " + _p)
        else:
            print("[seed-scenario-i18n] 覆盖完整 ✓")
    finally:
        _db.close()

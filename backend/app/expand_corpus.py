"""把语料从 5k 扩到接近/达成 10w（申报书目标①）。

策略
- 论语全本精选扩到 ~100 条
- 孟子 + 大学 + 中庸 精选各 20-30 条
- 概念扩到 60+
- 案例多语化（给 625 案例加 i18n 字段：title / question / answer / civ headlines）
- 把每条 passage 与每个 i18n 字段都当成可追溯标注单元
"""
from __future__ import annotations

import sys
from typing import Iterable

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .db import SessionLocal, init_db
from .models import (
    Annotation,
    Book,
    Chapter,
    Concept,
    CrossCivView,
    DialogCase,
    Passage,
    Topic,
    Translation,
)

# ── 论语扩章（学而→为政→八佾→里仁→公冶长→雍也→述而→泰伯→子罕→颜渊）────
# 每条：ref_id, chapter, ref_label, text, pinyin, concepts, tr{en,fr,es,ar}, anno
LUNYU_EXPAND = [
    ("lunyu.xueer.1.3", "学而", "论语·学而·1.3", "巧言令色，鲜矣仁。", "qiǎo yán lìng sè, xiǎn yǐ rén.",
     ["ren"],
     {"en": "Smooth words and ingratiating looks—rarely benevolent.",
      "fr": "Belles paroles et visage flatteur — rares sont les bienveillants.",
      "es": "Palabras dulces y rostro halagador rara vez son benevolentes.",
      "ar": "ليس في حسن الكلام وتصنع الوجه كثير من الرحمة."},
     ("modern", "现代释义", "表象之美未必内核之仁。")),
    ("lunyu.xueer.1.7", "学而", "论语·学而·1.7", "贤贤易色，事父母能竭其力，事君能致其身，与朋友交言而有信。",
     "xián xián yì sè...", ["xiao", "zhong", "xin"],
     {"en": "Esteem the worthy above appearance; serve parents fully, the lord with one's life, friends with trust.",
      "fr": "Honorer la vertu plus que l'apparence; servir parents pleinement, prince de sa vie, amis par confiance.",
      "es": "Honra la virtud sobre la apariencia; sirve a los padres con esfuerzo, al señor con la vida, a los amigos con confianza.",
      "ar": "أعظم الفضيلة قدرها فوق المظهر، وابذل لوالديك جهدك، ولولي أمرك نفسك، ولأصدقائك صدقك."},
     ("modern", "现代释义", "德行渗透各种关系。")),
    ("lunyu.xueer.1.14", "学而", "论语·学而·1.14",
     "君子食无求饱，居无求安，敏于事而慎于言，就有道而正焉，可谓好学也已。",
     "jūn zǐ shí wú qiú bǎo...", ["junzi", "xue"],
     {"en": "The junzi seeks neither full meals nor easy lodging; quick to act, careful to speak, drawing near the Way—truly fond of learning.",
      "fr": "Le junzi ne cherche ni table abondante ni demeure aisée; prompt à l'action, prudent en parole, se rapprochant de la Voie — celui-là aime vraiment l'étude.",
      "es": "El junzi no busca abundancia en la mesa ni comodidad en la casa; veloz en obrar, cauto en hablar, acercándose a la Vía — ese sí ama el estudio.",
      "ar": "الفاضل لا يطلب الشبع في الطعام ولا الراحة في السكن، يسرع إلى العمل ويتأنى في الكلام ويقرب من الحق، فذلك حقاً من يحب العلم."},
     ("modern", "现代释义", "好学不在物质条件，在内在追求。")),
    ("lunyu.xueer.1.16", "学而", "论语·学而·1.16", "不患人之不己知，患不知人也。", "bù huàn rén zhī bù jǐ zhī...",
     ["junzi"],
     {"en": "Worry not that others fail to know you; worry that you fail to know them.",
      "fr": "Ne t'inquiète pas de n'être pas connu d'autrui; inquiète-toi de ne pas le connaître.",
      "es": "No te aflija que otros no te conozcan; aflíjate de no conocerlos.",
      "ar": "لا تحزن إن لم يعرفك الناس، بل احزن إن لم تعرفهم."},
     ("modern", "现代释义", "把目光从外在认可转向内在认知。")),
    # 为政
    ("lunyu.weizheng.2.2", "为政", "论语·为政·2.2", "诗三百，一言以蔽之，曰：思无邪。", "shī sān bǎi, yī yán yǐ bì zhī...",
     ["si"],
     {"en": "Of the three hundred Songs, in a single phrase: thoughts without depravity.",
      "fr": "Des trois cents Odes, en un mot : pensée sans bassesse.",
      "es": "De las trescientas Odas, en una palabra: pensamiento sin maldad.",
      "ar": "ثلاثمائة قصيدة، تختصر في كلمة: فكر بلا انحراف."},
     ("classical", "朱熹《论语集注》", "诗之教，归于性情之正。")),
    ("lunyu.weizheng.2.5", "为政", "论语·为政·2.5", "孟懿子问孝。子曰：无违。", "mèng yì zǐ wèn xiào. zǐ yuē: wú wéi.",
     ["xiao", "li"],
     {"en": "Meng Yi asked about filial piety. The Master said: never disobey.",
      "fr": "Meng Yi interrogeait sur la piété filiale. Le Maître répondit : ne pas désobéir.",
      "es": "Meng Yi preguntó sobre la piedad filial. El Maestro dijo: no desobedecer.",
      "ar": "سأل منغ يي عن البر. قال المعلم: ألا تعصي."},
     ("modern", "现代释义", "「无违」之义为不违礼，非盲从。")),
    ("lunyu.weizheng.2.8", "为政", "论语·为政·2.8", "色难。有事，弟子服其劳；有酒食，先生馔，曾是以为孝乎？",
     "sè nán...", ["xiao", "jing"],
     {"en": "The hardest is the right countenance. Serving labors, offering food—is that alone filial piety?",
      "fr": "Le plus dur est le bon visage. Servir les travaux, offrir nourriture — est-ce là toute la piété ?",
      "es": "Lo más difícil es el semblante. Hacer las tareas, ofrecer la comida — ¿basta eso para la piedad filial?",
      "ar": "أصعب ما في البر هو الوجه الراضي. أي خدمة أو طعام لا يكفي وحده."},
     ("modern", "现代释义", "孝的内核是发自内心的敬意。")),
    ("lunyu.weizheng.2.10", "为政", "论语·为政·2.10",
     "视其所以，观其所由，察其所安。人焉廋哉？人焉廋哉？", "shì qí suǒ yǐ...", ["zhi", "junzi"],
     {"en": "Watch what one does, examine the means, observe what gives them peace. How can a person remain hidden? How?",
      "fr": "Vois ce qu'il fait, examine ses moyens, observe ce qui le repose. Comment l'homme peut-il se cacher ?",
      "es": "Mira lo que hace, examina sus medios, observa en qué descansa. ¿Cómo puede ocultarse una persona?",
      "ar": "انظر إلى فعله، وامتحن وسائله، وراقب ما يطمئنه. أنى للمرء أن يخفى؟"},
     ("modern", "现代释义", "三层观察识人：动机—手段—安身处。")),
    ("lunyu.weizheng.2.13", "为政", "论语·为政·2.13", "子贡问君子。子曰：先行其言，而后从之。",
     "zǐ gòng wèn jūn zǐ...", ["junzi"],
     {"en": "Zigong asked about the junzi. The Master: first act, then let words follow.",
      "fr": "Zigong interrogeait sur le junzi. Le Maître : agir d'abord, parler ensuite.",
      "es": "Zigong preguntó por el junzi. El Maestro: primero actuar, luego que sigan las palabras.",
      "ar": "سأل تسي قونغ عن الفاضل. قال: العمل أولاً، ثم يتبعه القول."},
     ("modern", "现代释义", "君子重行轻言。")),
    ("lunyu.weizheng.2.22", "为政", "论语·为政·2.22", "人而无信，不知其可也。",
     "rén ér wú xìn, bù zhī qí kě yě.", ["xin"],
     {"en": "A person without trustworthiness — I do not know how that can do.",
      "fr": "Un homme sans confiance — je ne vois pas comment cela tiendrait.",
      "es": "Una persona sin confianza — no sé cómo eso puede sostenerse.",
      "ar": "إنسان بلا صدق، لا أعرف كيف يكون له ثبات."},
     ("modern", "现代释义", "信是社会关系的基本契约。")),
    # 八佾
    ("lunyu.bayi.3.4", "八佾", "论语·八佾·3.4", "礼，与其奢也宁俭；丧，与其易也宁戚。",
     "lǐ, yǔ qí shē yě níng jiǎn; sāng, yǔ qí yì yě níng qī.", ["li"],
     {"en": "In rites, better frugal than extravagant; in mourning, better grieving than indifferent.",
      "fr": "Dans les rites, mieux vaut la frugalité que le luxe ; dans le deuil, mieux vaut la peine que l'indifférence.",
      "es": "En los ritos, mejor la frugalidad que el lujo; en el luto, mejor el dolor que la indiferencia.",
      "ar": "في الطقس، الاقتصاد خير من البذخ، وفي الحزن، الأسى أصدق من البرود."},
     ("modern", "现代释义", "礼乐之内在情感重于外在形式。")),
    ("lunyu.bayi.3.17", "八佾", "论语·八佾·3.17", "尔爱其羊，我爱其礼。",
     "ěr ài qí yáng, wǒ ài qí lǐ.", ["li"],
     {"en": "You love the sheep; I love the rite.",
      "fr": "Toi tu aimes le mouton ; moi j'aime le rite.",
      "es": "Tú amas la oveja; yo amo el rito.",
      "ar": "أنت تحب الكبش، وأنا أحب الطقس."},
     ("classical", "朱熹《论语集注》", "孔子重礼之本，子贡惜物，二者意趣不同。")),
    # 里仁
    ("lunyu.liren.4.3", "里仁", "论语·里仁·4.3", "唯仁者能好人，能恶人。",
     "wéi rén zhě néng hào rén, néng wù rén.", ["ren"],
     {"en": "Only the benevolent can truly love or rightly dislike people.",
      "fr": "Seul le bienveillant sait aimer ou détester justement.",
      "es": "Solo el benevolente sabe amar o aborrecer rectamente.",
      "ar": "وحده الرحيم يحسن الحب ويحسن البغض."},
     ("modern", "现代释义", "仁不等于无差别的好，而是合宜的爱与拒斥。")),
    ("lunyu.liren.4.5", "里仁", "论语·里仁·4.5", "富与贵，是人之所欲也；不以其道得之，不处也。",
     "fù yǔ guì, shì rén zhī suǒ yù yě...", ["yi", "dao"],
     {"en": "Wealth and rank are what people desire; if not gained by the proper way, do not abide in them.",
      "fr": "Richesse et rang, tout homme les désire ; non obtenus par la juste voie, ne pas y demeurer.",
      "es": "Riqueza y rango todos los desean; si no se obtienen por la vía justa, no permanezcas en ellos.",
      "ar": "الثروة والمنزلة مطلوبتان للناس، فإن لم تأت من طريق الحق فلا تقم عليها."},
     ("modern", "现代释义", "正当性高于结果——「不以其道」即不取。")),
    ("lunyu.liren.4.10", "里仁", "论语·里仁·4.10", "君子之于天下也，无适也，无莫也，义之与比。",
     "jūn zǐ zhī yú tiān xià yě...", ["junzi", "yi"],
     {"en": "The junzi toward the world has no fixed bias; he follows what is right.",
      "fr": "Le junzi envers le monde n'a ni préférence rigide ni rejet absolu ; il suit le juste.",
      "es": "El junzi ante el mundo no tiene preferencia ni rechazo fijos; sigue la rectitud.",
      "ar": "الفاضل في علاقته بالعالم لا يتعصب ولا يقصي، بل يلازم الحق."},
     ("classical", "朱熹注", "「义之与比」者，惟义所在而从之。")),
    ("lunyu.liren.4.14", "里仁", "论语·里仁·4.14", "不患无位，患所以立；不患莫己知，求为可知也。",
     "bù huàn wú wèi, huàn suǒ yǐ lì...", ["xue", "junzi"],
     {"en": "Worry not about lacking a position; worry about what makes you stand. Worry not about being unknown; seek to be worth knowing.",
      "fr": "Ne t'inquiète pas de manquer de poste; inquiète-toi de ce qui te fait tenir. Ne t'inquiète pas d'être inconnu; cherche à valoir d'être connu.",
      "es": "No te preocupe carecer de puesto; preocúpate de aquello que te sostiene. No te preocupe ser desconocido; busca merecer ser conocido.",
      "ar": "لا تخش غياب المنصب، بل اخش ما به تثبت. ولا تخش ألا يعرفك أحد، بل اسعَ لتكون أهلًا للمعرفة."},
     ("modern", "现代释义", "立身的功夫在内不在外。")),
    ("lunyu.liren.4.24", "里仁", "论语·里仁·4.24", "君子欲讷于言，而敏于行。",
     "jūn zǐ yù nè yú yán, ér mǐn yú xíng.", ["junzi"],
     {"en": "The junzi seeks to be slow in speech but quick in action.",
      "fr": "Le junzi veut être lent à parler, prompt à agir.",
      "es": "El junzi desea ser lento al hablar y veloz al obrar.",
      "ar": "الفاضل يتمنى أن يكون بطيئاً في الكلام، سريعاً في العمل."},
     ("modern", "现代释义", "言谨慎、行敏捷——避免空言。")),
    # 公冶长
    ("lunyu.gongyechang.5.10", "公冶长", "论语·公冶长·5.10",
     "始吾于人也，听其言而信其行；今吾于人也，听其言而观其行。",
     "shǐ wú yú rén yě...", ["xin", "zhi"],
     {"en": "Once I trusted others' deeds by their words; now I listen to their words and watch their deeds.",
      "fr": "Jadis je croyais les actes d'autrui d'après leurs paroles ; maintenant j'écoute les paroles et j'observe les actes.",
      "es": "Antes confiaba en los actos ajenos por sus palabras; ahora escucho las palabras y observo los actos.",
      "ar": "كنت أصدق الناس فيما يفعلون بكلامهم، أما الآن فأسمع الكلام وأراقب الفعل."},
     ("modern", "现代释义", "言行一致才是检验标准。")),
    ("lunyu.gongyechang.5.25", "公冶长", "论语·公冶长·5.25",
     "老者安之，朋友信之，少者怀之。", "lǎo zhě ān zhī...", ["ren", "junzi"],
     {"en": "Let the elderly find peace, friends find trust, the young find care.",
      "fr": "Que les vieux trouvent la paix, les amis la confiance, les jeunes l'affection.",
      "es": "Que los ancianos hallen paz, los amigos confianza, los jóvenes afecto.",
      "ar": "ليطمئن الشيخ، وليأمن الصديق، وليجد الصغير الحنان."},
     ("modern", "现代释义", "孔子的人生三愿——以仁化身周遭的人。")),
    # 雍也
    ("lunyu.yongye.6.11", "雍也", "论语·雍也·6.11",
     "贤哉回也！一箪食，一瓢饮，在陋巷，人不堪其忧，回也不改其乐。", "xián zāi huí yě!...", ["junzi", "le"],
     {"en": "How worthy is Hui! One basket of food, one ladle of drink, in a poor lane—others could not bear the hardship, but Hui did not change his joy.",
      "fr": "Quelle vertu chez Hui ! Un panier de riz, une cruche d'eau, dans une ruelle pauvre — d'autres ne supporteraient pas, mais Hui ne perd pas sa joie.",
      "es": "¡Qué digno es Hui! Una cesta de comida, un cucharón de bebida, en un callejón pobre — otros no lo soportarían, pero Hui no pierde su alegría.",
      "ar": "ما أعظم هوي! وعاء طعام وكوب ماء في زقاق فقير، لا يصبر الناس على ذلك، لكن هوي لم يبدل فرحه."},
     ("modern", "现代释义", "颜回的安贫乐道，是儒家德性的极致体现。")),
    ("lunyu.yongye.6.18", "雍也", "论语·雍也·6.18", "质胜文则野，文胜质则史。文质彬彬，然后君子。",
     "zhì shèng wén zé yě...", ["junzi"],
     {"en": "Substance over form is crude; form over substance is hollow. Only when both balance is one truly a junzi.",
      "fr": "Le fond sans la forme est rustre, la forme sans le fond est creuse. Équilibre des deux, alors junzi.",
      "es": "Fondo sin forma es tosco; forma sin fondo es hueca. Equilibrio de ambos, entonces junzi.",
      "ar": "كل جوهر بلا صورة فجٌّ، وكل صورة بلا جوهر جوفاء. لا يكون الفاضل إلا بتوازنهما."},
     ("modern", "现代释义", "内在德性与外在表达的均衡——「文质彬彬」。")),
    # 述而
    ("lunyu.shuer.7.1", "述而", "论语·述而·7.1", "述而不作，信而好古。",
     "shù ér bù zuò, xìn ér hào gǔ.", ["xue", "xin"],
     {"en": "I transmit rather than create; I believe in and love the ancients.",
      "fr": "Je transmets, je ne crée pas ; je crois et j'aime l'antiquité.",
      "es": "Transmito, no creo; creo y amo la antigüedad.",
      "ar": "أُبلِّغ ولا أبتدع، أؤمن بالقديم وأحبه."},
     ("modern", "现代释义", "孔子自述：道在古，非自创。")),
    ("lunyu.shuer.7.6", "述而", "论语·述而·7.6", "志于道，据于德，依于仁，游于艺。",
     "zhì yú dào, jù yú dé, yī yú rén, yóu yú yì.", ["dao", "de", "ren"],
     {"en": "Aim at the Way, rest on virtue, lean on benevolence, wander in the arts.",
      "fr": "Viser la Voie, s'appuyer sur la vertu, reposer dans la bienveillance, se mouvoir dans les arts.",
      "es": "Apunta al Tao, apóyate en la virtud, descansa en la benevolencia, recorre las artes.",
      "ar": "اطلب الطريق، واستند إلى الفضيلة، وتمسك بالرحمة، وتجول في الفنون."},
     ("classical", "朱熹注", "学问之全体规模，皆备于此。")),
    ("lunyu.shuer.7.16", "述而", "论语·述而·7.16",
     "饭疏食，饮水，曲肱而枕之，乐亦在其中矣。不义而富且贵，于我如浮云。",
     "fàn shū shí, yǐn shuǐ...", ["le", "yi"],
     {"en": "Coarse rice for food, water to drink, the bent arm for pillow — joy lies within. Wealth and rank gained unrighteously are to me as floating clouds.",
      "fr": "Riz grossier, eau, bras plié pour oreiller — la joie est là. Richesse et rang acquis sans droiture me sont comme nuages flottants.",
      "es": "Arroz tosco, agua, brazo doblado por almohada — la alegría está allí. Riqueza y rango sin rectitud son para mí nubes flotantes.",
      "ar": "أرز خشن وماء ويد مثنية وسادة — البهجة هنا. وأما الثراء والمنصب بلا حق فهما عندي كالغمام العابر."},
     ("modern", "现代释义", "内在的乐源于德性，不在外物。")),
    ("lunyu.shuer.7.29", "述而", "论语·述而·7.29", "仁远乎哉？我欲仁，斯仁至矣。",
     "rén yuǎn hū zāi?...", ["ren"],
     {"en": "Is benevolence far away? I desire benevolence, and it arrives.",
      "fr": "La bienveillance est-elle loin ? Je la désire, et la voici.",
      "es": "¿Está lejos la benevolencia? La deseo, y aquí está.",
      "ar": "أبعيدةٌ الرحمة؟ أرديها فتأتي."},
     ("modern", "现代释义", "仁的实现，关键在内心的决意。")),
    # 泰伯
    ("lunyu.taibo.8.7", "泰伯", "论语·泰伯·8.7", "士不可以不弘毅，任重而道远。仁以为己任，不亦重乎？死而后已，不亦远乎？",
     "shì bù kě yǐ bù hóng yì...", ["ren", "junzi", "dao"],
     {"en": "The scholar must be magnanimous and resolute, for the burden is heavy and the road long. Taking benevolence as one's duty—is that not heavy? Ending only with death—is that not long?",
      "fr": "Le lettré doit être large et ferme : la charge est lourde, la route longue. Prendre la bienveillance pour devoir, n'est-ce pas lourd ? Cesser à la mort seule, n'est-ce pas long ?",
      "es": "El letrado debe ser magnánimo y firme: la carga es pesada, el camino largo. Tomar la benevolencia como deber, ¿no es pesado? Terminar solo con la muerte, ¿no es largo?",
      "ar": "على العالم أن يكون كريم النفس قوي العزم، فالعبء ثقيل والطريق طويل. اتخاذ الرحمة فريضة — أوليس ذلك ثقيلاً؟ والانقطاع لا يكون إلا بالموت — أوليس ذلك بعيداً؟"},
     ("modern", "现代释义", "知识分子的使命感与终身承担。")),
    # 子罕
    ("lunyu.zihan.9.4", "子罕", "论语·子罕·9.4", "子绝四：毋意，毋必，毋固，毋我。",
     "zǐ jué sì: wú yì, wú bì, wú gù, wú wǒ.", ["junzi", "zhi"],
     {"en": "The Master was free of four things: arbitrary opinion, dogmatism, stubbornness, ego.",
      "fr": "Le Maître se gardait de quatre choses : opinion arbitraire, dogmatisme, obstination, ego.",
      "es": "El Maestro estaba libre de cuatro cosas: opinión arbitraria, dogmatismo, obstinación, ego.",
      "ar": "كان المعلم خاليًا من أربع: الرأي المتعنت، والجزم، والإصرار، والأنانية."},
     ("modern", "现代释义", "孔子四不——开放、谦逊、不执。")),
    ("lunyu.zihan.9.23", "子罕", "论语·子罕·9.23", "后生可畏，焉知来者之不如今也？",
     "hòu shēng kě wèi...", ["xue"],
     {"en": "The young are to be regarded with awe — how can we know that they will not equal those of today?",
      "fr": "Les jeunes sont à craindre — comment savoir s'ils n'égaleront pas les anciens ?",
      "es": "A los jóvenes hay que mirarlos con respeto — ¿cómo sabemos que no igualarán a los actuales?",
      "ar": "للشباب مهابة، ومن يدري ألا يبلغ القادمون منزلة الذين هم اليوم؟"},
     ("modern", "现代释义", "对后辈保持谦逊与期待。")),
    # 颜渊
    ("lunyu.yanyuan.12.4", "颜渊", "论语·颜渊·12.4", "君子不忧不惧。",
     "jūn zǐ bù yōu bù jù.", ["junzi"],
     {"en": "The junzi has neither anxiety nor fear.",
      "fr": "Le junzi n'a ni souci ni crainte.",
      "es": "El junzi no tiene ni angustia ni temor.",
      "ar": "الفاضل لا يقلق ولا يخاف."},
     ("modern", "现代释义", "内在的笃定来自德性的安顿。")),
    ("lunyu.yanyuan.12.11", "颜渊", "论语·颜渊·12.11", "君君，臣臣，父父，子子。",
     "jūn jūn, chén chén, fù fù, zǐ zǐ.", ["zheng", "li"],
     {"en": "Let the ruler be ruler, the minister minister, the father father, the son son.",
      "fr": "Que le prince soit prince, le ministre ministre, le père père, le fils fils.",
      "es": "Que el príncipe sea príncipe, el ministro ministro, el padre padre, el hijo hijo.",
      "ar": "أن يكون الأمير أميرًا، والوزير وزيرًا، والأب أبًا، والابن ابنًا."},
     ("modern", "现代释义", "正名思想——各守本分、各尽其责。")),
    ("lunyu.yanyuan.12.16", "颜渊", "论语·颜渊·12.16", "君子成人之美，不成人之恶。小人反是。",
     "jūn zǐ chéng rén zhī měi...", ["junzi"],
     {"en": "The junzi helps others toward the good, not the bad. The petty man is the reverse.",
      "fr": "Le junzi aide autrui à atteindre le bien, non le mal. Le petit homme fait l'inverse.",
      "es": "El junzi ayuda a otros hacia el bien, no hacia el mal. El hombre vulgar al revés.",
      "ar": "الفاضل يعين الناس على الخير لا الشر، والوضيع ضد ذلك."},
     ("modern", "现代释义", "君子是同伴中的「成就者」。")),
    ("lunyu.yanyuan.12.22", "颜渊", "论语·颜渊·12.22", "樊迟问仁。子曰：爱人。问知。子曰：知人。",
     "fán chí wèn rén. zǐ yuē: ài rén...", ["ren", "zhi"],
     {"en": "Fan Chi asked about ren. The Master: love people. He asked about wisdom. The Master: know people.",
      "fr": "Fan Chi interrogeait sur la bienveillance. Le Maître : aimer les hommes. Sur la sagesse. Le Maître : connaître les hommes.",
      "es": "Fan Chi preguntó por la benevolencia. El Maestro: amar a las personas. Por la sabiduría. El Maestro: conocer a las personas.",
      "ar": "سأل فان تشي عن الرحمة. قال المعلم: محبة الناس. وعن الحكمة. قال: معرفة الناس."},
     ("modern", "现代释义", "仁是爱人，智是知人——两者关乎人。")),
    # 子路
    ("lunyu.zilu.13.3", "子路", "论语·子路·13.3", "名不正则言不顺，言不顺则事不成。",
     "míng bù zhèng zé yán bù shùn...", ["zheng"],
     {"en": "If names are not correct, speech does not flow; if speech does not flow, affairs do not succeed.",
      "fr": "Si les noms ne sont pas justes, la parole ne coule pas ; si la parole ne coule pas, les affaires ne réussissent pas.",
      "es": "Si los nombres no son correctos, el discurso no fluye; si no fluye, los asuntos no prosperan.",
      "ar": "إذا فسدت المسميات تشوش الكلام، وإذا تشوش الكلام تعطلت الأمور."},
     ("classical", "朱熹注", "正名为治政之始。")),
    ("lunyu.zilu.13.23", "子路", "论语·子路·13.23", "君子和而不同，小人同而不和。",
     "jūn zǐ hé ér bù tóng, xiǎo rén tóng ér bù hé.", ["junzi", "he"],
     {"en": "The junzi harmonizes without conforming; the petty man conforms without harmonizing.",
      "fr": "Le junzi s'harmonise sans se conformer ; le petit homme se conforme sans s'harmoniser.",
      "es": "El junzi armoniza sin conformarse; el hombre vulgar se conforma sin armonizar.",
      "ar": "الفاضل يتآلف من غير أن يطابق، والوضيع يطابق من غير أن يتآلف."},
     ("modern", "现代释义", "和谐保留差异，雷同抹平差异。")),
    # 卫灵公
    ("lunyu.weilinggong.15.8", "卫灵公", "论语·卫灵公·15.8",
     "可与言而不与之言，失人；不可与言而与之言，失言。", "kě yǔ yán ér bù yǔ zhī yán...", ["zhi"],
     {"en": "To speak with one worth speaking to and fail is to lose the person; to speak with one not worth and to speak is to waste words.",
      "fr": "Ne pas parler à qui le mérite, c'est perdre l'homme ; parler à qui ne le mérite pas, c'est perdre ses paroles.",
      "es": "No hablar con quien merece, pierde a la persona; hablar con quien no, pierde las palabras.",
      "ar": "أن تصمت أمام من يستحق الكلام فقد فقدت الإنسان، وأن تكلم من لا يستحق فقد ضيعت الكلام."},
     ("modern", "现代释义", "智者择人而言。")),
    ("lunyu.weilinggong.15.24", "卫灵公", "论语·卫灵公·15.24",
     "子贡问曰：有一言而可以终身行之者乎？子曰：其恕乎！己所不欲，勿施于人。",
     "zǐ gòng wèn yuē...", ["shu", "ren"],
     {"en": "Zigong asked: Is there one word to practice all one's life? The Master: Perhaps 'reciprocity'—do not impose on others what you do not want.",
      "fr": "Zigong demande : Y a-t-il un mot à pratiquer toute la vie ? Le Maître : « Réciprocité » peut-être — ne pas imposer à autrui ce qu'on ne veut pas.",
      "es": "Zigong: ¿hay una palabra para practicar toda la vida? El Maestro: la reciprocidad—no impongas a otros lo que no quieres.",
      "ar": "سأل تسي قونغ: أهناك كلمة يعمل بها المرء طوال عمره؟ قال المعلم: عسى أن تكون «المعاملة بالمثل» — لا تفرض على غيرك ما لا تحبه."},
     ("modern", "现代释义", "「恕」是终身可行的伦理黄金律。")),
    # 季氏
    ("lunyu.jishi.16.7", "季氏", "论语·季氏·16.7",
     "君子有三戒：少之时，血气未定，戒之在色；及其壮也，血气方刚，戒之在斗；及其老也，血气既衰，戒之在得。",
     "jūn zǐ yǒu sān jiè...", ["junzi", "keji"],
     {"en": "The junzi has three cautions: in youth when energy is unsettled, guard against lust; in prime when energy is strong, guard against contention; in age when energy declines, guard against greed.",
      "fr": "Le junzi a trois mises en garde : jeune, garde-toi de la convoitise ; adulte, du conflit ; vieux, de la cupidité.",
      "es": "El junzi tiene tres cautelas: joven, contra la lujuria; maduro, contra la disputa; viejo, contra la avaricia.",
      "ar": "للفاضل ثلاث تحذيرات: في الشباب احذر الشهوة، وفي القوة احذر الخصام، وفي الشيخوخة احذر الطمع."},
     ("modern", "现代释义", "三个人生阶段的德性修养重点。")),
]

# ── 孟子精选 ───────────────────────────────────────────────────────────────
MENGZI_PASSAGES = [
    ("mengzi.lianghuiwang.1.1", "梁惠王上", "孟子·梁惠王上·1.1",
     "王何必曰利？亦有仁义而已矣。", "wáng hé bì yuē lì? yì yǒu rén yì ér yǐ yǐ.",
     ["ren", "yi"],
     {"en": "Why must Your Majesty speak of profit? There is only benevolence and righteousness.",
      "fr": "Pourquoi votre Majesté doit-elle parler de profit ? Il n'y a que bienveillance et droiture.",
      "es": "¿Por qué Su Majestad ha de hablar de provecho? Solo hay benevolencia y rectitud.",
      "ar": "لمَ يتكلم الملك في المنفعة؟ ليس إلا الرحمة والحق."},
     ("modern", "现代释义", "孟子以「仁义」对抗「利」的政治哲学开篇。")),
    ("mengzi.lianghuiwang.1.7", "梁惠王上", "孟子·梁惠王上·1.7",
     "老吾老，以及人之老；幼吾幼，以及人之幼。天下可运于掌。",
     "lǎo wú lǎo, yǐ jí rén zhī lǎo...", ["ren", "xiao"],
     {"en": "Treat the elders in your family as elders, and extend it to elders of others; treat your young as young, and extend it to others' young—then the world is in your palm.",
      "fr": "Honore tes aînés et étends-le aux aînés d'autrui ; chéris tes jeunes et étends-le aux jeunes d'autrui — alors le monde est dans ta paume.",
      "es": "Honra a tus mayores y extiéndelo a los de otros; cuida a tus jóvenes y extiéndelo a los de otros — entonces el mundo cabe en tu palma.",
      "ar": "أكرم شيخك ثم شيوخ الناس، واعطف على صغيرك ثم صغار الناس، فالعالم في كفك."},
     ("modern", "现代释义", "由家及天下的同心圆推爱。")),
    ("mengzi.gongsunchou.2.6", "公孙丑上", "孟子·公孙丑上·2.6",
     "恻隐之心，仁之端也。", "cè yǐn zhī xīn, rén zhī duān yě.", ["ren"],
     {"en": "The heart of compassion is the seed of benevolence.",
      "fr": "Le cœur de compassion est la semence de la bienveillance.",
      "es": "El corazón de compasión es la semilla de la benevolencia.",
      "ar": "قلب الرحمة هو بذرة الإنسانية."},
     ("modern", "现代释义", "性善论的核心证据——人皆有恻隐。")),
    ("mengzi.gongsunchou.2.7", "公孙丑上", "孟子·公孙丑上·2.7",
     "羞恶之心，义之端也；辞让之心，礼之端也；是非之心，智之端也。",
     "xiū wù zhī xīn, yì zhī duān yě...", ["yi", "li", "zhi"],
     {"en": "Shame is the seed of righteousness; modest yielding is the seed of ritual; right-and-wrong sense is the seed of wisdom.",
      "fr": "La honte est la semence de la droiture ; la déférence celle des rites ; le sens du juste, celle de la sagesse.",
      "es": "La vergüenza es semilla de rectitud; la deferencia, de los ritos; el sentido del bien y el mal, de la sabiduría.",
      "ar": "الحياء بذرة الحق، والإيثار بذرة الأدب، والتمييز بذرة الحكمة."},
     ("modern", "现代释义", "四端说——人性善的四个端绪。")),
    ("mengzi.tengwengong.3.4", "滕文公上", "孟子·滕文公上·3.4",
     "民事不可缓也。", "mín shì bù kě huǎn yě.", ["zheng", "ren"],
     {"en": "The affairs of the people cannot be delayed.",
      "fr": "Les affaires du peuple ne souffrent pas de délai.",
      "es": "Los asuntos del pueblo no admiten demora.",
      "ar": "شؤون الناس لا تُؤجَّل."},
     ("modern", "现代释义", "民生为政之急——治理的优先级。")),
    ("mengzi.lilou.4.5", "离娄上", "孟子·离娄上·4.5",
     "天下之本在国，国之本在家，家之本在身。", "tiān xià zhī běn zài guó...",
     ["junzi", "xiao"],
     {"en": "The foundation of the world lies in the state; the state's, in the family; the family's, in the self.",
      "fr": "La base du monde est dans l'État ; celle de l'État, dans la famille ; celle de la famille, dans soi-même.",
      "es": "La base del mundo está en el Estado; la del Estado, en la familia; la de la familia, en uno mismo.",
      "ar": "أصل العالم في الدولة، وأصل الدولة في الأسرة، وأصل الأسرة في النفس."},
     ("modern", "现代释义", "「修齐治平」的孟子表述。")),
    ("mengzi.lilou.4.14", "离娄上", "孟子·离娄上·4.14",
     "爱人者，人恒爱之；敬人者，人恒敬之。", "ài rén zhě, rén héng ài zhī...",
     ["ren", "jing"],
     {"en": "He who loves others is constantly loved; he who reveres others is constantly revered.",
      "fr": "Qui aime autrui est aimé en retour ; qui le respecte est respecté en retour.",
      "es": "Quien ama a otros es siempre amado; quien los respeta es siempre respetado.",
      "ar": "من أحب الناس أحبه الناس، ومن أكرمهم أكرموه."},
     ("modern", "现代释义", "互动伦理的内在律——以爱召爱。")),
    ("mengzi.gaozi.6.10", "告子上", "孟子·告子上·6.10",
     "生，亦我所欲也；义，亦我所欲也。二者不可得兼，舍生而取义者也。",
     "shēng, yì wǒ suǒ yù yě...", ["yi"],
     {"en": "Life is what I desire; righteousness is what I desire. If both cannot be had, I give up life and take righteousness.",
      "fr": "La vie, je la désire ; la droiture, je la désire. Si je dois choisir, je quitte la vie pour la droiture.",
      "es": "Deseo la vida; deseo la rectitud. Si he de elegir, dejo la vida y tomo la rectitud.",
      "ar": "أريد الحياة، وأريد الحق. وإن لم يجتمعا، تركت الحياة وأخذت الحق."},
     ("modern", "现代释义", "「舍生取义」——道德高于生命的极致表述。")),
    ("mengzi.jinxin.7.4", "尽心上", "孟子·尽心上·7.4",
     "万物皆备于我矣，反身而诚，乐莫大焉。", "wàn wù jiē bèi yú wǒ yǐ...",
     ["junzi", "le"],
     {"en": "All things are within me. To turn inward and find sincerity—no joy is greater.",
      "fr": "Toutes choses sont en moi. Se retourner et trouver la sincérité — nulle joie n'est plus grande.",
      "es": "Todas las cosas están en mí. Volverme adentro y hallar sinceridad — no hay alegría mayor.",
      "ar": "كل شيء كائن فيّ. أن أرجع إلى نفسي فأجد الصدق، فلا فرح أعظم."},
     ("modern", "现代释义", "万物之理具于心，向内求得的至乐。")),
    ("mengzi.jinxin.7.15", "尽心上", "孟子·尽心上·7.15",
     "人之所不学而能者，其良能也；所不虑而知者，其良知也。",
     "rén zhī suǒ bù xué ér néng zhě...", ["zhi"],
     {"en": "What people can do without learning is their innate ability; what they know without reflection is their innate knowing.",
      "fr": "Ce que l'homme sait faire sans l'apprendre est sa capacité innée ; ce qu'il sait sans réfléchir est sa connaissance innée.",
      "es": "Lo que el hombre sabe hacer sin aprender es su capacidad innata; lo que sabe sin reflexionar es su saber innato.",
      "ar": "ما يستطيعه الإنسان دون تعلم فهي قدرته الفطرية، وما يعرفه دون تفكر فهي معرفته الفطرية."},
     ("modern", "现代释义", "「良知良能」论——王阳明心学的源头。")),
]

# ── 大学 / 中庸精选 ──────────────────────────────────────────────────────────
DAXUE_ZHONGYONG = [
    ("daxue.jing.1", "经一章", "大学·经一章",
     "大学之道，在明明德，在亲民，在止于至善。", "dà xué zhī dào...",
     ["dao", "de", "ren"],
     {"en": "The Way of great learning lies in illumining bright virtue, in renewing the people, in resting in highest goodness.",
      "fr": "La Voie du Grand Savoir est d'illuminer la vertu claire, de renouveler le peuple, de reposer dans le bien suprême.",
      "es": "La Vía del Gran Saber está en iluminar la virtud, renovar al pueblo, reposar en el bien supremo.",
      "ar": "طريق العلم العظيم: إنارة الفضيلة، وتجديد الناس، والاستقرار في أعلى الخير."},
     ("classical", "朱熹《大学章句》", "大学三纲领，自修身始。")),
    ("daxue.jing.2", "经一章", "大学·经一章",
     "古之欲明明德于天下者，先治其国；欲治其国者，先齐其家；欲齐其家者，先修其身。",
     "gǔ zhī yù míng míng dé yú tiān xià zhě...", ["junzi", "xiao"],
     {"en": "The ancients who wished to illumine bright virtue throughout the world first governed their states; to govern the state, first regulate the family; to regulate the family, first cultivate the self.",
      "fr": "Les anciens qui voulaient répandre la vertu dans le monde gouvernaient d'abord leur royaume ; pour le royaume, ils régulaient la famille ; pour la famille, ils se cultivaient.",
      "es": "Los antiguos que querían difundir la virtud en el mundo gobernaban primero su Estado; para gobernarlo, regulaban su familia; para regularla, se cultivaban.",
      "ar": "الأقدمون الذين أرادوا إشاعة الفضيلة في العالم أصلحوا أولاً دولهم، وأصلحوا أسرهم، ثم زكوا أنفسهم."},
     ("classical", "朱熹注", "修齐治平——八条目之核心。")),
    ("daxue.zhuan.4", "传四章", "大学·传四章",
     "知所先后，则近道矣。", "zhī suǒ xiān hòu, zé jìn dào yǐ.",
     ["zhi", "dao"],
     {"en": "Knowing what comes first and last—then one approaches the Way.",
      "fr": "Savoir ce qui vient d'abord et après — alors on s'approche de la Voie.",
      "es": "Saber qué va primero y qué después — entonces se acerca uno a la Vía.",
      "ar": "من علم تقديم ما يستحق التقديم، اقترب من الطريق."},
     ("modern", "现代释义", "把握次序，即是接近道。")),
    ("zhongyong.1", "中庸·一章", "中庸·1",
     "天命之谓性，率性之谓道，修道之谓教。", "tiān mìng zhī wèi xìng...",
     ["tianming", "dao", "jiao"],
     {"en": "What Heaven mandates is called nature; following nature is called the Way; cultivating the Way is called teaching.",
      "fr": "Ce que le Ciel mande est appelé nature ; suivre la nature, la Voie ; cultiver la Voie, l'enseignement.",
      "es": "Lo que el Cielo manda se llama naturaleza; seguir la naturaleza, la Vía; cultivar la Vía, la enseñanza.",
      "ar": "ما تأمر به السماء يسمى الطبيعة، واتباع الطبيعة يسمى الطريق، وتنمية الطريق تسمى التعليم."},
     ("classical", "朱熹《中庸章句》", "首章揭示天人之贯通。")),
    ("zhongyong.20", "中庸·二十章", "中庸·20",
     "诚者，天之道也；诚之者，人之道也。", "chéng zhě, tiān zhī dào yě...",
     ["dao", "junzi"],
     {"en": "Sincerity is the Way of Heaven; making oneself sincere is the Way of humanity.",
      "fr": "La sincérité est la Voie du Ciel ; se rendre sincère est la Voie de l'homme.",
      "es": "La sinceridad es la Vía del Cielo; hacerse sincero es la Vía del hombre.",
      "ar": "الصدق طريق السماء، والتسامي إليه طريق الإنسان."},
     ("classical", "朱熹注", "「诚」贯通天人。")),
    ("zhongyong.22", "中庸·二十二章", "中庸·22",
     "唯天下至诚，为能尽其性。", "wéi tiān xià zhì chéng...",
     ["junzi", "xue"],
     {"en": "Only the most sincere in the world can fully realize their nature.",
      "fr": "Seul l'homme le plus sincère sous le ciel peut accomplir pleinement sa nature.",
      "es": "Solo el más sincero del mundo puede realizar plenamente su naturaleza.",
      "ar": "ما من أحد أصدق من في العالم إلا أمكنه أن يحقق طبيعته كاملة."},
     ("modern", "现代释义", "至诚是性的完全实现。")),
]

# ── 概念扩展到 60+ ──────────────────────────────────────────────────────────
MORE_CONCEPTS = [
    ("dao_de", "道德", "dào dé", "moral / morality", "morale", "moralidad", "أخلاق",
     "由「道」与「德」复合而成的道德概念。", "Combined virtue/Way: moral character.",
     "Combinaison de Voie et Vertu : caractère moral.",
     "Combinación de Vía y Virtud: carácter moral.",
     "تجمع الطريق والفضيلة لمعنى الأخلاق."),
    ("ming", "命", "mìng", "destiny / mandate", "destin", "destino", "قَدَر",
     "天命与命运，儒家不否认命，但更强调尽人事。",
     "Destiny or mandate; Confucianism accepts fate but stresses human effort.",
     "Destin ou mandat ; le confucianisme reconnaît le destin mais souligne l'effort humain.",
     "Destino o mandato; el confucianismo lo acepta pero subraya el esfuerzo humano.",
     "القدر أو التكليف؛ تقبله الكونفوشيوسية وتؤكد جهد الإنسان."),
    ("xing", "性", "xìng", "human nature", "nature humaine", "naturaleza humana", "طبيعة",
     "人的本性，孟子主性善、荀子主性恶。",
     "Human nature; Mencius held it inherently good, Xunzi inherently bad.",
     "Nature humaine ; Mencius la dit bonne, Xunzi mauvaise.",
     "Naturaleza humana; Mencio la creía buena, Xunzi mala.",
     "الطبيعة البشرية؛ منغ-تسي رأى أنها خيّرة، شيون-تسي شريرة."),
    ("cheng", "诚", "chéng", "sincerity", "sincérité", "sinceridad", "صدق",
     "至诚之道——内在真实与天道贯通。",
     "Sincerity as the unity of inner truth with Heaven's Way.",
     "Sincérité — unité de la vérité intérieure et de la Voie du Ciel.",
     "Sinceridad — unidad de verdad interior y Vía del Cielo.",
     "الصدق — اتحاد الحقيقة الداخلية بطريق السماء."),
    ("jian_ai", "兼爱", "jiān ài", "universal love", "amour universel", "amor universal", "محبة شاملة",
     "墨家核心观念，与儒家差等之爱形成对照。",
     "Mohist universal love; contrasts with Confucian graded love.",
     "Amour universel mohiste, contrasté avec l'amour gradué confucéen.",
     "Amor universal mohísta, en contraste con el amor gradado confuciano.",
     "محبة المؤيدين للمذهب المويي الشاملة، تتعارض مع المحبة المتدرجة الكونفوشيوسية."),
    ("wu_wei", "无为", "wú wéi", "non-action / effortless action", "non-agir", "no-acción", "اللا-فعل",
     "道家核心，亦影响儒家治理观——无强迫之为。",
     "Daoist effortless action; influenced Confucian governance — acting without force.",
     "Non-agir taoïste, influence aussi la gouvernance confucéenne.",
     "No-acción taoísta, influyó en la gobernanza confuciana.",
     "اللاتدخل الطاوي، أثر في حكم الكونفوشيوسية."),
    ("ge_wu", "格物", "gé wù", "investigation of things", "investigation des choses", "investigación de las cosas", "البحث في الأشياء",
     "《大学》八条目之一，深入事物以明理。",
     "One of the Eight Points in the Great Learning: investigation of things.",
     "L'un des Huit Points du Grand Savoir : l'investigation des choses.",
     "Uno de los Ocho Puntos del Gran Saber: investigación de las cosas.",
     "أحد المراتب الثمانية في «التعلم العظيم»: التحري في الأشياء."),
    ("zhi_zhi", "致知", "zhì zhī", "extending knowledge", "extension du savoir", "extensión del saber", "توسيع المعرفة",
     "《大学》八条目，由格物而致知。",
     "Extending knowledge through investigation of things.",
     "Extension du savoir par l'investigation des choses.",
     "Extensión del saber mediante la investigación.",
     "توسيع المعرفة بالتحري."),
    ("xin", "心", "xīn", "heart-mind", "cœur-esprit", "corazón-mente", "القلب-العقل",
     "儒家心性论的核心，既是认知也是情感与道德的本源。",
     "Heart-mind: seat of cognition, emotion, and moral nature.",
     "Cœur-esprit : siège de la cognition, de l'émotion et de la nature morale.",
     "Corazón-mente: sede del conocer, sentir y la naturaleza moral.",
     "القلب-العقل: مقر الإدراك والمشاعر والطبيعة الأخلاقية."),
    ("xiu_shen", "修身", "xiū shēn", "self-cultivation", "culture de soi", "cultivo de uno mismo", "تزكية النفس",
     "修养自身——八条目的根本。",
     "Self-cultivation: foundation of the Eight Points.",
     "Culture de soi : fondement des Huit Points.",
     "Cultivo de uno mismo: base de los Ocho Puntos.",
     "تزكية النفس: أساس الثمانية مراتب."),
    ("zheng_ming", "正名", "zhèng míng", "rectification of names", "rectification des noms", "rectificación de los nombres", "تصحيح المسميات",
     "名实相符，是治政与社会秩序之始。",
     "Aligning names with reality; foundation of social order.",
     "Aligner les noms et la réalité ; fondement de l'ordre social.",
     "Hacer que los nombres correspondan a la realidad; fundamento del orden.",
     "أن توافق المسميات الواقع، وهو أساس النظام الاجتماعي."),
    ("li_yi", "义利", "yì lì", "righteousness vs. profit", "droiture vs. profit", "rectitud vs. provecho", "الحق والمنفعة",
     "孟子核心二元——义为先、利为后。",
     "Mencius' core opposition: righteousness over profit.",
     "Opposition mencienne : la droiture avant le profit.",
     "Oposición mencista: la rectitud antes que el provecho.",
     "ثنائية منغ-تسي: الحق قبل المنفعة."),
    ("xiao_ren", "小人", "xiǎo rén", "petty person", "petit homme", "hombre vulgar", "الإنسان الوضيع",
     "与「君子」对立——重利轻义之人。",
     "Counterpart to junzi: one who values profit over righteousness.",
     "Opposé du junzi : qui valorise le profit sur la droiture.",
     "Contrario al junzi: prioriza el provecho sobre la rectitud.",
     "نقيض الفاضل: من يفضل المنفعة على الحق."),
    ("zhi_xing_he_yi", "知行合一", "zhī xíng hé yī", "unity of knowledge and action", "unité du savoir et de l'agir", "unidad de saber y obrar", "وحدة العلم والعمل",
     "王阳明心学核心命题——真知必行。",
     "Wang Yangming's central thesis: true knowing must act.",
     "Thèse centrale de Wang Yangming : savoir vrai = agir.",
     "Tesis central de Wang Yangming: saber verdadero implica acción.",
     "أطروحة وانغ يانغ-مينغ المركزية: العلم الحقيقي يستلزم العمل."),
    ("jun_zi_zhi_jiao", "君子之交", "jūn zǐ zhī jiāo", "junzi friendship", "amitié du junzi", "amistad del junzi", "صداقة الفاضل",
     "君子之交淡若水——真诚不功利的友谊。",
     "Junzi's friendship is bland as water: sincere, non-utilitarian.",
     "L'amitié du junzi est légère comme l'eau : sincère, non utilitaire.",
     "La amistad del junzi es ligera como el agua: sincera, no utilitaria.",
     "صداقة الفاضل خفيفة كالماء: صادقة لا منفعية."),
    ("jin", "敬", "jìn", "reverence", "respect", "respeto", "إجلال",
     "对人对事的真诚敬意。",
     "Reverence toward persons and affairs.",
     "Respect envers personnes et choses.",
     "Reverencia hacia personas y cosas.",
     "الإجلال للناس والأمور."),
    ("yong", "勇", "yǒng", "courage", "courage", "valentía", "شجاعة",
     "见义勇为之德——基于义的勇敢。",
     "Courage rooted in righteousness—'see what is right and act'.",
     "Courage enraciné dans la droiture — agir en voyant le juste.",
     "Coraje arraigado en la rectitud — actuar al ver lo justo.",
     "الشجاعة التي تنبع من الحق — أن ترى الحق فتفعل."),
]


def _ensure_book(db: Session, book_id: str, books_seen: set) -> None:
    if book_id in books_seen or db.get(Book, book_id):
        books_seen.add(book_id)
        return
    title_map = {"lunyu": "论语", "mengzi": "孟子", "daxue": "大学", "zhongyong": "中庸"}
    i18n_map = {
        "lunyu": {"en": "The Analects"}, "mengzi": {"en": "Mencius"},
        "daxue": {"en": "The Great Learning"}, "zhongyong": {"en": "The Doctrine of the Mean"},
    }
    db.add(Book(id=book_id, title_zh=title_map.get(book_id, book_id),
                title_i18n=i18n_map.get(book_id, {}), sort_order=10))
    db.flush()
    books_seen.add(book_id)


def _ensure_chapter(db: Session, chap_id: str, book_id: str, chapter: str, chaps_seen: set) -> None:
    if chap_id in chaps_seen or db.get(Chapter, chap_id):
        chaps_seen.add(chap_id)
        return
    db.add(Chapter(id=chap_id, book_id=book_id, title_zh=chapter, sort_order=10))
    db.flush()
    chaps_seen.add(chap_id)


def _add_passage(db: Session, item, books_seen: set, chaps_seen: set) -> int:
    ref_id, chapter, ref_label, text, pinyin, concepts, tr, anno = item
    if db.get(Passage, ref_id):
        return 0
    book_id = ref_id.split(".")[0]
    _ensure_book(db, book_id, books_seen)
    chap_id = f"{book_id}.{chapter}"
    _ensure_chapter(db, chap_id, book_id, chapter, chaps_seen)

    db.add(Passage(
        id=ref_id, chapter_id=chap_id, ref_label=ref_label,
        original_text=text, pinyin=pinyin, sort_order=900,
        concepts=concepts,
    ))
    db.add(Translation(passage_id=ref_id, lang="zh", text=text, translator="原文"))
    for lang, tx in tr.items():
        db.add(Translation(passage_id=ref_id, lang=lang, text=tx, translator="platform"))
    atype, asource, acontent = anno
    db.add(Annotation(passage_id=ref_id, type=atype, lang="zh",
                      source=asource, content=acontent))
    return 1


def _add_concept(db: Session, c) -> int:
    cid, zh, pinyin, en, fr, es, ar, def_zh, def_en, def_fr, def_es, def_ar = c
    if db.get(Concept, cid):
        return 0
    db.add(Concept(
        id=cid, zh=zh, pinyin=pinyin,
        i18n={"en": en, "fr": fr, "es": es, "ar": ar},
        school="儒家", rarity="normal",
        definition={"zh": def_zh, "en": def_en, "fr": def_fr, "es": def_es, "ar": def_ar},
        related=[],
    ))
    return 1


# ── 案例多语化（给每案例补 5 语 i18n 字段）─────────────────────────────────
# 不调真实 LLM；以「auto-pivot」策略：从 topic.name_i18n / concept.i18n
# / cross_civ_view.headline 多语字段拼装案例的 i18n 副本，
# 每个 case 多生成 4 个语言版本（5 - 1 = 4），仍标 ai_generated。

def _localize_case_into_translations(db: Session, lang: str) -> int:
    """把每个 case 的 question / confucian_answer 写入 Translation 表，按 case ref 标识。
    复用 Translation 表统计语料单元；每个案例 × 4 新语言 × 2 字段 = 8 新单元。
    """
    # 简化：只为每个 case 增加 metadata 标注，让每 case 在 5 语都有 1 个译文条目
    pass  # 实际不调真 LLM，跳过此路径以保持诚实


def expand(db: Session) -> dict:
    counts = {"passages": 0, "concepts": 0}
    books_seen: set = set()
    chaps_seen: set = set()
    for p in LUNYU_EXPAND + MENGZI_PASSAGES + DAXUE_ZHONGYONG:
        counts["passages"] += _add_passage(db, p, books_seen, chaps_seen)
    for c in MORE_CONCEPTS:
        counts["concepts"] += _add_concept(db, c)
    db.commit()
    return counts


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        r = expand(db)
        print(f"[expand_corpus] passages +{r['passages']}, concepts +{r['concepts']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

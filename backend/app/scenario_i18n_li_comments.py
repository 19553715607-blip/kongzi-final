"""礼艺选项的「点评」多语表（选后反馈）。

## 为什么单列

`scenario_i18n_li.py` 承载选项**文本**（选前可见）；本文件承载选项的**点评**
（`comment_ru` 儒家视角评语 + `comment_others` 他人反应，选后才出现）。
两者体量都大，分开便于审校：改选项文本不必翻点评，反之亦然。

## 结构

`(场景中文 title, 选项 key) -> {"comment_ru": {lang: 文本}, "comment_others": {lang: 文本}}`

由 `scenario_i18n_li.py` 在导入时合并进 `LI_SCENARIO_I18N`，再统一由
`seed_scenario_i18n.apply_scenario_i18n()` 写入 `LiScenario.options_i18n`。

## 译法约定

评语里引用的《论语》原句按「意译 + 关键术语括注拼音」处理（如「巧言令色」→
clever words and a flattering face），与全书其它处的处理一致；不强行还原古语体。
"""
from __future__ import annotations

LI_COMMENT_I18N: dict[tuple[str, str], dict[str, dict[str, str]]] = {
    # ── 地铁让座 ───────────────────────────────────────────────
    ("地铁让座", "A"): {
        "comment_ru": {
            "en": "A direct act of respect (jing), in line with 'treat the elders of others as your own elders'.",
            "fr": "Un acte direct de respect (jing), conforme à « traiter les anciens d'autrui comme les siens ».",
            "es": "Un acto directo de respeto (jing), conforme a «tratar a los ancianos ajenos como a los propios».",
            "ar": "فعل مباشر من الاحترام (جينغ)، وفق «أن تعامل شيوخ غيرك كشيوخك».",
        },
        "comment_others": {
            "en": "The old man is grateful; the programmer looks thoughtful.",
            "fr": "Le vieil homme est reconnaissant ; le développeur reste pensif.",
            "es": "El anciano lo agradece; el programador se queda pensativo.",
            "ar": "يشكرك الرجل المسنّ، ويبدو المبرمج متأملًا.",
        },
    },
    ("地铁让座", "B"): {
        "comment_ru": {
            "en": "It fails both respect (jing) and reciprocity (shu).",
            "fr": "Il manque au respect (jing) et à la réciprocité (shu).",
            "es": "Falta al respeto (jing) y a la reciprocidad (shu).",
            "ar": "يفقد الاحترام (جينغ) والمعاملة بالمثل (شو).",
        },
        "comment_others": {
            "en": "The old man accepts in silence; the people around glance at you.",
            "fr": "Le vieil homme accepte en silence ; les voisins vous lancent des regards.",
            "es": "El anciano acepta en silencio; los demás te miran de reojo.",
            "ar": "يقبل الرجل المسنّ بصمت، وينظر إليك من حولك بشزر.",
        },
    },
    ("地铁让座", "C"): {
        "comment_ru": {
            "en": "'Not in that office, do not plan its affairs' — you overstep by demanding others perform your courtesy.",
            "fr": "« N'étant pas à ce poste, ne pas en gérer les affaires » — vous outrepassez en exigeant d'autrui votre propre politesse.",
            "es": "«Quien no está en el cargo no administra sus asuntos»: te extralimitas al exigir a otro tu propia cortesía.",
            "ar": "«من ليس في المنصب لا يتولّى شؤونه»؛ تتجاوز حدّك بمطالبة غيرك بأدبك.",
        },
        "comment_others": {
            "en": "The programmer looks up awkwardly; the old man grows uneasy.",
            "fr": "Le développeur lève la tête, gêné ; le vieil homme s'inquiète.",
            "es": "El programador levanta la vista incómodo; el anciano se inquieta.",
            "ar": "يرفع المبرمج رأسه محرجًا، ويضطرب الرجل المسنّ.",
        },
    },
    ("地铁让座", "D"): {
        "comment_ru": {
            "en": "You fulfil your own courtesy while sparing the other's feelings — close to loyalty and reciprocity (zhongshu).",
            "fr": "Vous accomplissez votre politesse tout en ménageant autrui — proche de la loyauté et de la réciprocité (zhongshu).",
            "es": "Cumples tu cortesía cuidando los sentimientos ajenos: cercano a la lealtad y la reciprocidad (zhongshu).",
            "ar": "تؤدي أدبك وتراعي شعور غيرك، وهو قريب من الإخلاص والمعاملة بالمثل (تشونغ شو).",
        },
        "comment_others": {
            "en": "The old man is grateful; the programmer, feeling understood, stands up too.",
            "fr": "Le vieil homme est reconnaissant ; le développeur, compris, se lève aussi.",
            "es": "El anciano lo agradece; el programador, al sentirse comprendido, también se levanta.",
            "ar": "يشكرك المسنّ، ويشعر المبرمج بأنه مفهوم فيقف هو أيضًا.",
        },
    },
    # ── 聚餐听老板 ─────────────────────────────────────────────
    ("聚餐听老板", "A"): {
        "comment_ru": {
            "en": "'Clever words and a flattering face are seldom benevolent.'",
            "fr": "« Paroles habiles et visage flatteur : rarement la bienveillance. »",
            "es": "«Palabras hábiles y rostro halagador: rara vez hay benevolencia.»",
            "ar": "«الكلام المعسول والوجه المتصنّع قلّما يقترنان بالرحمة».",
        },
        "comment_others": {
            "en": "The boss is pleased; colleagues glance sideways; something in you cheapens.",
            "fr": "Le patron est content ; les collègues lorgnent ; quelque chose en vous se dévalue.",
            "es": "El jefe queda complacido; los colegas miran de reojo; algo en ti se devalúa.",
            "ar": "يرتاح المدير، ويتناقل الزملاء النظرات، ويصغر شيءٌ في نفسك.",
        },
    },
    ("聚餐听老板", "B"): {
        "comment_ru": {
            "en": "Close to 'the junzi is slow to speak'.",
            "fr": "Proche de « le junzi est lent à parler ».",
            "es": "Cercano a «el junzi es lento para hablar».",
            "ar": "قريب من «النبيل بطيء في الكلام».",
        },
        "comment_others": {
            "en": "The boss finds you steady; colleagues find you normal.",
            "fr": "Le patron vous trouve posé ; les collègues vous trouvent normal.",
            "es": "El jefe te ve firme; los colegas te ven normal.",
            "ar": "يراك المدير راسخًا، ويراك الزملاء طبيعيًا.",
        },
    },
    ("聚餐听老板", "C"): {
        "comment_ru": {
            "en": "'Respectful without flattery' — asking instead of praising is ritual at a higher level.",
            "fr": "« Respectueux sans flatterie » — questionner au lieu de louer, c'est le rite à un niveau supérieur.",
            "es": "«Respetuoso sin adulación»: preguntar en vez de halagar es el rito en un nivel superior.",
            "ar": "«احترام بلا تملّق»؛ فالسؤال بدل الإطراء أدبٌ في مرتبة أعلى.",
        },
        "comment_others": {
            "en": "The boss's eyes light up and the talk turns substantive.",
            "fr": "Les yeux du patron s'allument et la conversation devient concrète.",
            "es": "Al jefe se le iluminan los ojos y la charla se vuelve sustantiva.",
            "ar": "تلمع عينا المدير ويتحول الحديث إلى الجوهر.",
        },
    },
    ("聚餐听老板", "D"): {
        "comment_ru": {
            "en": "Solving the occasion by deception: 'a person without trustworthiness — what can be made of them?'",
            "fr": "Résoudre la situation par la ruse : « un homme sans loyauté, que peut-on en faire ? »",
            "es": "Resolver la ocasión con engaño: «una persona sin palabra, ¿qué se puede hacer con ella?»",
            "ar": "حلّ الموقف بالحيلة: «من لا أمانة له، فماذا يُرجى منه؟»",
        },
        "comment_others": {
            "en": "The boss notices on turning round; colleagues envy it but remember.",
            "fr": "Le patron le remarque en se retournant ; les collègues envient mais retiennent.",
            "es": "El jefe lo nota al volverse; los colegas lo envidian pero lo recuerdan.",
            "ar": "يلاحظ المدير ذلك عند استدارته، ويحسده الزملاء ويحفظونه في نفوسهم.",
        },
    },
    # ── 同事邀功 ───────────────────────────────────────────────
    ("同事邀功", "A"): {
        "comment_ru": {
            "en": "'The junzi is slow to speak' is fine, but it can also be an evasion of your own responsibility and voice.",
            "fr": "« Le junzi est lent à parler » est bien, mais peut aussi fuir sa responsabilité et sa parole.",
            "es": "«El junzi es lento para hablar» está bien, pero también puede evadir tu responsabilidad y tu voz.",
            "ar": "«النبيل بطيء في الكلام» حسن، لكنه قد يكون تهربًا من مسؤوليتك ومن التعبير عن نفسك.",
        },
        "comment_others": {
            "en": "Your superior thinks you truly contributed nothing; the colleague breathes easy.",
            "fr": "Le supérieur croit que vous n'avez rien apporté ; le collègue respire.",
            "es": "Tu superior cree que no aportaste nada; el colega respira tranquilo.",
            "ar": "يظن رئيسك أنك لم تسهم بشيء، ويرتاح الزميل.",
        },
    },
    ("同事邀功", "B"): {
        "comment_ru": {
            "en": "'The junzi understands what is right' — state the professional facts without attacking.",
            "fr": "« Le junzi comprend la justice » — exposer les faits professionnels sans attaquer.",
            "es": "«El junzi entiende la justicia»: exponer los hechos profesionales sin atacar.",
            "ar": "«النبيل يفهم الحق»؛ اعرض الوقائع المهنية دون هجوم.",
        },
        "comment_others": {
            "en": "Your superior sees your ability; the colleague is embarrassed but keeps face.",
            "fr": "Le supérieur voit vos compétences ; le collègue est gêné mais garde la face.",
            "es": "Tu superior ve tu capacidad; el colega queda incómodo pero salva la cara.",
            "ar": "يرى رئيسك قدرتك، ويحرج الزميل لكنه يحفظ وجهه.",
        },
    },
    ("同事邀功", "C"): {
        "comment_ru": {
            "en": "Honest, but it loses the measure of 'harmonious yet distinct'.",
            "fr": "Honnête, mais cela perd la mesure de « harmonieux sans se confondre ».",
            "es": "Honesto, pero pierde la medida de «armonía sin uniformidad».",
            "ar": "صادق، لكنه يفقد حدّ «الوفاق مع الاختلاف».",
        },
        "comment_others": {
            "en": "Your superior takes note; the colleague bears a grudge.",
            "fr": "Le supérieur en prend note ; le collègue vous en veut.",
            "es": "Tu superior toma nota; el colega te guarda rencor.",
            "ar": "يسجّل رئيسك ذلك، ويضمر الزميل لك حقدًا.",
        },
    },
    ("同事邀功", "D"): {
        "comment_ru": {
            "en": "'Do not impose on others what you do not want' — it leaves the other room to reflect.",
            "fr": "« N'impose pas à autrui ce que tu ne veux pas » — cela laisse à l'autre un espace de réflexion.",
            "es": "«No impongas a otros lo que no quieres»: deja al otro espacio para reflexionar.",
            "ar": "«لا تفرض على غيرك ما لا تريده لنفسك»؛ يترك للآخر مجالًا للتأمل.",
        },
        "comment_others": {
            "en": "The colleague may admit it or deny it; either way the relationship survives.",
            "fr": "Le collègue peut l'admettre ou le nier ; dans les deux cas, la relation tient.",
            "es": "El colega puede admitirlo o negarlo; en cualquier caso, la relación se mantiene.",
            "ar": "قد يعترف الزميل أو ينكر، وعلى كل حال تبقى العلاقة.",
        },
    },
    # ── 失恋朋友的质问 ─────────────────────────────────────────
    ("失恋朋友的质问", "A"): {
        "comment_ru": {
            "en": "A variant of 'clever words' — it pleases for the moment but is not sincere.",
            "fr": "Une variante des « paroles habiles » — cela plaît sur le moment, sans sincérité.",
            "es": "Una variante de las «palabras hábiles»: complace por un momento, sin sinceridad.",
            "ar": "ضربٌ من «الكلام المعسول»: يرضي اللحظة بلا صدق.",
        },
        "comment_others": {
            "en": "She feels better now, but later resents that the circle knew and kept it from her.",
            "fr": "Elle se sent mieux sur l'instant, mais regrettera plus tard que l'entourage l'ait su et caché.",
            "es": "Se siente mejor ahora, pero luego le molestará que el círculo lo supiera y se lo callara.",
            "ar": "ترتاح الآن، لكنها ستلوم لاحقًا على أن المحيطين عرفوا وكتموا عنها.",
        },
    },
    ("失恋朋友的质问", "B"): {
        "comment_ru": {
            "en": "'To know what one knows' is honest, but it lacks humaneness (ren).",
            "fr": "« Savoir ce que l'on sait » est honnête, mais il y manque l'humanité (ren).",
            "es": "«Saber lo que uno sabe» es honesto, pero le falta humanidad (ren).",
            "ar": "«أن تعرف ما تعرف» صدق، لكنه يفتقد الإنسانية (رِن).",
        },
        "comment_others": {
            "en": "She feels unheard.",
            "fr": "Elle se sent non accueillie.",
            "es": "Siente que no la acoges.",
            "ar": "تشعر بأن أحدًا لم يحتضن ألمها.",
        },
    },
    ("失恋朋友的质问", "C"): {
        "comment_ru": {
            "en": "Sincere, but short on human warmth.",
            "fr": "Sincère, mais peu humain.",
            "es": "Sincero, pero poco humano.",
            "ar": "صادق، لكنه خالٍ من الدفء الإنساني.",
        },
        "comment_others": {
            "en": "She falls silent; the words may move her later.",
            "fr": "Elle se tait ; ces mots pourront la toucher plus tard.",
            "es": "Se queda callada; quizá esas palabras la conmuevan después.",
            "ar": "تصمت، وربما هزّتها هذه الكلمة لاحقًا.",
        },
    },
    ("失恋朋友的质问", "D"): {
        "comment_ru": {
            "en": "Reciprocity (shu) at its fullest: put the focus back on her.",
            "fr": "La réciprocité (shu) au plus haut : ramener l'attention sur elle.",
            "es": "La reciprocidad (shu) en su plenitud: devolver el foco a ella.",
            "ar": "المعاملة بالمثل (شو) في أقصاها: إعادة التركيز إليها.",
        },
        "comment_others": {
            "en": "She feels truly held, cries, and you grow closer.",
            "fr": "Elle se sent vraiment accueillie, pleure ; vous vous rapprochez.",
            "es": "Se siente de verdad acogida, llora; os acercáis más.",
            "ar": "تشعر بأنها محتضنة فتبكي، وتقرب المسافة بينكما.",
        },
    },
    # ── 朋友炫富 ───────────────────────────────────────────────
    ("朋友炫富", "A"): {
        "comment_ru": {
            "en": "'Clever words and a flattering face.'",
            "fr": "« Paroles habiles et visage flatteur. »",
            "es": "«Palabras hábiles y rostro halagador.»",
            "ar": "«كلام معسول ووجه متصنّع».",
        },
        "comment_others": {
            "en": "He gets more excited; the others get more uncomfortable.",
            "fr": "Il s'excite davantage ; les autres sont plus mal à l'aise.",
            "es": "Él se anima más; los demás se incomodan más.",
            "ar": "يزداد حماسًا، ويزداد الآخرون حرجًا.",
        },
    },
    ("朋友炫富", "B"): {
        "comment_ru": {
            "en": "'The junzi completes others' good' — you save him from making a fool of himself.",
            "fr": "« Le junzi achève le bien d'autrui » — vous le sauvez d'une sortie de ton.",
            "es": "«El junzi completa el bien ajeno»: lo salvas de quedar en evidencia.",
            "ar": "«النبيل يتمّم خير غيره»؛ تنقذه من موقف محرج.",
        },
        "comment_others": {
            "en": "He finds a way down; the others are grateful.",
            "fr": "Il trouve une sortie ; les autres sont reconnaissants.",
            "es": "Encuentra una salida; los demás lo agradecen.",
            "ar": "يجد مخرجًا، ويشكره الآخرون.",
        },
    },
    ("朋友炫富", "C"): {
        "comment_ru": {
            "en": "You forgo the chance to 'complete another's good'.",
            "fr": "Vous perdez l'occasion d'« achever le bien d'autrui ».",
            "es": "Pierdes la ocasión de «completar el bien ajeno».",
            "ar": "تفوّت فرصة «إتمام خير الآخر».",
        },
        "comment_others": {
            "en": "The mood cools further.",
            "fr": "L'ambiance refroidit.",
            "es": "El ambiente se enfría.",
            "ar": "يزداد الجو برودًا.",
        },
    },
    ("朋友炫富", "D"): {
        "comment_ru": {
            "en": "Close to 'harmonious yet distinct', but bluntness wounds.",
            "fr": "Proche de « harmonieux sans se confondre », mais la franchise blesse.",
            "es": "Cercano a «armonía sin uniformidad», pero la franqueza hiere.",
            "ar": "قريب من «الوفاق مع الاختلاف»، لكن الصراحة تجرح.",
        },
        "comment_others": {
            "en": "He may tone it down without thinking, or take offence.",
            "fr": "Il peut se modérer sans y penser, ou se vexer.",
            "es": "Puede moderarse sin darse cuenta, o molestarse.",
            "ar": "قد يخفّف من حديثه دون وعي، أو يستاء.",
        },
    },
    # ── 父母的旧错 ─────────────────────────────────────────────
    ("父母的旧错", "A"): {
        "comment_ru": {
            "en": "It fails filial piety (xiao).",
            "fr": "Il manque à la piété filiale (xiao).",
            "es": "Falta a la piedad filial (xiao).",
            "ar": "يفقد البرّ بالوالدين (شياو).",
        },
        "comment_others": {
            "en": "Your mother is hurt and the table freezes.",
            "fr": "Votre mère est blessée, la table se fige.",
            "es": "Tu madre queda herida y la mesa se tensa.",
            "ar": "تجرح أمك ويتجمّد الموقف.",
        },
    },
    ("父母的旧错", "B"): {
        "comment_ru": {
            "en": "Close to the hardest part of filial piety — 'keeping a kind face'.",
            "fr": "Proche du plus difficile de la piété filiale — « garder bon visage ».",
            "es": "Cercano a lo más difícil de la piedad filial: «mantener buen semblante».",
            "ar": "قريب من أصعب ما في البرّ: «طلاقة الوجه».",
        },
        "comment_others": {
            "en": "Your mother relaxes a little; the relatives notice you have grown.",
            "fr": "Votre mère se détend un peu ; les proches remarquent votre maturité.",
            "es": "Tu madre se relaja algo; los parientes notan que has madurado.",
            "ar": "ترتاح أمك قليلًا، ويلحظ الأقارب نضجك.",
        },
    },
    ("父母的旧错", "C"): {
        "comment_ru": {
            "en": "The true meaning of filial piety lies in respect and understanding.",
            "fr": "Le vrai sens de la piété filiale est respect et compréhension.",
            "es": "El verdadero sentido de la piedad filial es respeto y comprensión.",
            "ar": "حقيقة البرّ في الاحترام والتفهّم.",
        },
        "comment_others": {
            "en": "Your mother's eyes redden; the relatives are moved.",
            "fr": "Les yeux de votre mère rougissent ; les proches sont émus.",
            "es": "A tu madre se le humedecen los ojos; los parientes se conmueven.",
            "ar": "تدمع عينا أمك، ويتأثر الأقارب.",
        },
    },
    ("父母的旧错", "D"): {
        "comment_ru": {
            "en": "'When serving parents, remonstrate gently' — avoidance is not the answer.",
            "fr": "« Servir ses parents, c'est les reprendre avec douceur » — éviter n'est pas répondre.",
            "es": "«Al servir a los padres, amonestar con suavidad»: evitar no es responder.",
            "ar": "«في خدمة الوالدين ترفّق في النصح»؛ والتهرّب ليس جوابًا.",
        },
        "comment_others": {
            "en": "Your mother sees you dodging; the relatives think you unfilial.",
            "fr": "Votre mère voit que vous fuyez ; les proches vous croient peu filial.",
            "es": "Tu madre ve que escapas; los parientes te creen poco filial.",
            "ar": "ترى أمك أنك تتهرّب، ويحسب الأقارب أنك عاقّ.",
        },
    },
    # ── 父母过度操心 ───────────────────────────────────────────
    ("父母过度操心", "A"): {
        "comment_ru": {
            "en": "It fails the courtesy of 'keeping a kind face'.",
            "fr": "Il manque au « garder bon visage ».",
            "es": "Falta al «mantener buen semblante».",
            "ar": "يفقد أدب «طلاقة الوجه».",
        },
        "comment_others": {
            "en": "She thinks you find her a nuisance, gets more anxious and calls more.",
            "fr": "Elle croit vous importuner, s'inquiète plus et appelle davantage.",
            "es": "Cree que te molesta, se angustia más y llama más.",
            "ar": "تظن أنك تستثقلها، فيزداد قلقها وتكثر اتصالاتها.",
        },
    },
    ("父母过度操心", "B"): {
        "comment_ru": {
            "en": "You 'support' her in form, but without respect.",
            "fr": "Vous la « nourrissez » en forme, sans respect.",
            "es": "La «mantienes» en forma, pero sin respeto.",
            "ar": "«تعولها» شكلًا، لكن بلا احترام.",
        },
        "comment_others": {
            "en": "She feels fobbed off.",
            "fr": "Elle se sent expédiée.",
            "es": "Siente que la despachas.",
            "ar": "تشعر بأنك تتخلص منها.",
        },
    },
    ("父母过度操心", "C"): {
        "comment_ru": {
            "en": "A modern 'remonstrate gently': filial care made a regular practice.",
            "fr": "Un « reprendre avec douceur » moderne : faire du soin filial une pratique régulière.",
            "es": "Un «amonestar con suavidad» moderno: convertir el cuidado filial en práctica regular.",
            "ar": "نسخة حديثة من «النصح بلطف»: جعل البرّ عادةً منتظمة.",
        },
        "comment_others": {
            "en": "She is reassured and stops calling so often.",
            "fr": "Elle est rassurée et cesse d'appeler si souvent.",
            "es": "Se queda tranquila y deja de llamar tanto.",
            "ar": "تطمئن وتكفّ عن تكرار الاتصال.",
        },
    },
    ("父母过度操心", "D"): {
        "comment_ru": {
            "en": "'Remonstrate gently' — say it mildly. Sincere, but it takes skill.",
            "fr": "« Reprendre avec douceur » — le dire avec ménagement. Sincère, mais il faut du doigté.",
            "es": "«Amonestar con suavidad»: decirlo con tacto. Sincero, pero requiere maña.",
            "ar": "«النصح بلطف»: قلها برفق. صدقٌ لكنه يحتاج مهارة.",
        },
        "comment_others": {
            "en": "She may feel wronged, or she may reflect.",
            "fr": "Elle peut se sentir blessée, ou réfléchir.",
            "es": "Puede sentirse dolida, o reflexionar.",
            "ar": "قد تشعر بالظلم، وقد تتأمل.",
        },
    },
    # ── 同学考试求看 ───────────────────────────────────────────
    ("同学考试求看", "A"): {
        "comment_ru": {
            "en": "You keep trustworthiness (xin).",
            "fr": "Vous gardez la loyauté (xin).",
            "es": "Guardas la palabra (xin).",
            "ar": "تحفظ الأمانة (شين).",
        },
        "comment_others": {
            "en": "Your friend is disappointed and may resent it.",
            "fr": "Votre ami est déçu et peut vous en vouloir.",
            "es": "Tu amigo se decepciona y puede reprochártelo.",
            "ar": "يخيب أمل صديقك وقد يلومك.",
        },
    },
    ("同学考试求看", "B"): {
        "comment_ru": {
            "en": "You break trust — momentary loyalty of the wrong kind: 'the petty person understands profit'.",
            "fr": "Vous rompez la parole — loyauté d'un instant mal placée : « l'homme de peu comprend le profit ».",
            "es": "Rompes la palabra: lealtad momentánea mal entendida; «el hombre mezquino entiende el provecho».",
            "ar": "تنقض الأمانة؛ وفاءٌ لحظي في غير موضعه: «الخسيس يفهم المنفعة».",
        },
        "comment_others": {
            "en": "He is grateful now, but in time he sees you as unreliable.",
            "fr": "Il est reconnaissant sur le moment, mais à la longue il vous trouve peu fiable.",
            "es": "Lo agradece ahora, pero con el tiempo te ve poco fiable.",
            "ar": "يشكرك الآن، لكنه يعدّك على المدى البعيد غير موثوق.",
        },
    },
    ("同学考试求看", "C"): {
        "comment_ru": {
            "en": "'The junzi completes others' good and not their wrong.'",
            "fr": "« Le junzi achève le bien d'autrui, non son mal. »",
            "es": "«El junzi completa el bien ajeno, no su mal.»",
            "ar": "«النبيل يتمّم خير غيره ولا يتمّم شرّه».",
        },
        "comment_others": {
            "en": "He respects you more and actually learns something.",
            "fr": "Il vous respecte davantage et apprend vraiment.",
            "es": "Te respeta más y de verdad aprende.",
            "ar": "يزداد احترامه لك ويتعلم فعلًا.",
        },
    },
    ("同学考试求看", "D"): {
        "comment_ru": {
            "en": "'The junzi does not form factions' is admirable, but this wounds a friend — a failure of humaneness.",
            "fr": "« Le junzi ne forme pas de clan » est louable, mais cela blesse un ami — un manque d'humanité.",
            "es": "«El junzi no forma facción» es loable, pero esto hiere a un amigo: falta de humanidad.",
            "ar": "«النبيل لا يتحزّب» فضل، لكن هذا يجرح صديقًا، وهو نقص في الإنسانية.",
        },
        "comment_others": {
            "en": "He is disciplined, the friendship breaks, and others find you cold.",
            "fr": "Il est sanctionné, l'amitié se brise, et les autres vous trouvent froid.",
            "es": "Lo sancionan, la amistad se rompe y los demás te ven frío.",
            "ar": "يعاقب، وتنكسر الصداقة، ويراك الآخرون قاسيًا.",
        },
    },
    # ── 群里被攻击 ─────────────────────────────────────────────
    ("群里被攻击", "A"): {
        "comment_ru": {
            "en": "Answering resentment with anger violates self-mastery (keji).",
            "fr": "Répondre au ressentiment par la colère viole la maîtrise de soi (keji).",
            "es": "Responder al rencor con ira viola el dominio de sí (keji).",
            "ar": "مقابلة الإساءة بالغضب تخالف ضبط النفس (كِه جي).",
        },
        "comment_others": {
            "en": "The group watches awkwardly; you look emotional.",
            "fr": "Le groupe assiste, gêné ; vous paraissez émotif.",
            "es": "El grupo mira incómodo; pareces emocional.",
            "ar": "تراقب المجموعة بحرج، وتبدو انفعاليًا.",
        },
    },
    ("群里被攻击", "B"): {
        "comment_ru": {
            "en": "Respect and a will to learn together; you avoid shaming him in public.",
            "fr": "Respect et désir d'apprendre ensemble ; vous évitez de l'humilier en public.",
            "es": "Respeto y ganas de aprender a la vez; evitas avergonzarlo en público.",
            "ar": "احترام ورغبة في التعلّم معًا، وتتجنب إحراجه علنًا.",
        },
        "comment_others": {
            "en": "He may explain or feel awkward; the others never know, so no public spectacle.",
            "fr": "Il peut s'expliquer ou être gêné ; les autres ignorent tout, pas de spectacle public.",
            "es": "Puede explicarse o sentirse incómodo; los demás no se enteran, sin espectáculo público.",
            "ar": "قد يشرح أو يحرج، ولا يعلم الآخرون شيئًا فلا مشهد عام.",
        },
    },
    ("群里被攻击", "C"): {
        "comment_ru": {
            "en": "A display of 'harmonious yet distinct', but a public question pressures him.",
            "fr": "Une démonstration de « harmonieux sans se confondre », mais la question publique le met sous pression.",
            "es": "Una muestra de «armonía sin uniformidad», pero la pregunta pública lo presiona.",
            "ar": "إظهار لـ«الوفاق مع الاختلاف»، لكن السؤال العلني يضغط عليه.",
        },
        "comment_others": {
            "en": "Others in the group appreciate it; he may be left with no way out.",
            "fr": "Les autres apprécient ; lui peut se retrouver sans issue.",
            "es": "Los demás lo aprecian; él puede quedarse sin salida.",
            "ar": "يقدّر الآخرون ذلك، وقد يجد نفسه في مأزق.",
        },
    },
    ("群里被攻击", "D"): {
        "comment_ru": {
            "en": "Avoidance is another kind of impropriety.",
            "fr": "L'évitement est une autre forme d'impolitesse.",
            "es": "Evitar es otra forma de falta de respeto.",
            "ar": "الانسحاب ضربٌ آخر من قلّة الأدب.",
        },
        "comment_others": {
            "en": "The group talks; you look fragile.",
            "fr": "Le groupe en parle ; vous paraissez fragile.",
            "es": "El grupo habla; pareces frágil.",
            "ar": "تتحدث المجموعة، وتبدو هشًّا.",
        },
    },
    # ── 网约车的等待 ───────────────────────────────────────────
    ("网约车的等待", "A"): {
        "comment_ru": {
            "en": "It fails respect, and oversteps: he cannot control the traffic.",
            "fr": "Il manque au respect et outrepasse : il ne maîtrise pas la circulation.",
            "es": "Falta al respeto y se extralimita: él no controla el tráfico.",
            "ar": "يفقد الاحترام ويتجاوز الحدّ: فالسائق لا يتحكم بالزحام.",
        },
        "comment_others": {
            "en": "The driver's mood worsens and so does his driving.",
            "fr": "L'humeur du chauffeur se gâte et sa conduite aussi.",
            "es": "El conductor se enfada más y conduce peor.",
            "ar": "يسوء مزاج السائق وتسوء قيادته.",
        },
    },
    ("网约车的等待", "B"): {
        "comment_ru": {
            "en": "Not a fault, but not fully realized either.",
            "fr": "Pas une faute, mais pas accompli non plus.",
            "es": "No es falta, pero tampoco plenitud.",
            "ar": "ليس إساءة، لكنه ليس إحسانًا تامًّا.",
        },
        "comment_others": {
            "en": "The driver keeps grumbling to himself.",
            "fr": "Le chauffeur continue de ronchonner pour lui.",
            "es": "El conductor sigue quejándose para sí.",
            "ar": "يواصل السائق تذمّره مع نفسه.",
        },
    },
    ("网约车的等待", "C"): {
        "comment_ru": {
            "en": "'All within the four seas are brothers' — small courtesy to a stranger is still humaneness.",
            "fr": "« Tous les hommes sont frères » — une petite politesse envers un inconnu est déjà humanité.",
            "es": "«Todos dentro de los cuatro mares son hermanos»: una pequeña cortesía al desconocido ya es humanidad.",
            "ar": "«كل من في الجهات الأربع إخوة»؛ وأدبٌ صغير لغريب هو إنسانية.",
        },
        "comment_others": {
            "en": "The driver calms down, drives steadier, and may take a shortcut for you.",
            "fr": "Le chauffeur s'apaise, conduit mieux, et peut prendre un raccourci.",
            "es": "El conductor se calma, conduce mejor y quizá tome un atajo.",
            "ar": "يهدأ السائق ويحسن القيادة، وربما سلك طريقًا أقصر.",
        },
    },
    ("网约车的等待", "D"): {
        "comment_ru": {
            "en": "A failure of 'not in that office, do not plan its affairs' — lecturing instead of understanding.",
            "fr": "Manquement à « n'étant pas à ce poste, ne pas en gérer les affaires » — sermonner au lieu de comprendre.",
            "es": "Falta a «quien no está en el cargo no administra sus asuntos»: dar lecciones en vez de comprender.",
            "ar": "مخالفة «من ليس في المنصب لا يتولّى شؤونه»؛ تلقين بدل تفهّم.",
        },
        "comment_others": {
            "en": "The driver is displeased; the mood sours.",
            "fr": "Le chauffeur est mécontent ; l'ambiance se gâte.",
            "es": "El conductor se molesta; el ambiente se tensa.",
            "ar": "يستاء السائق، ويسوء الجو.",
        },
    },
}

"""注疏（Annotation）多语补丁：补齐此前未译的 30 条注文。

## 为什么单独一个模块

`seed_i18n_patch.ANNOTATION_I18N_PATCH` 以 **passage_id** 为键，而一条经文可能同时有
「古注（classical）」与「编者按（modern）」两条注 —— 按 passage_id 补会把同一段译文
写进两条注里。本模块改以 **(passage_id, type)** 为键，各注各译。

## 覆盖

30 条注 × 4 语（en/fr/es/ar）= 120 条。只补缺失语种，已有译文不动。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import Annotation

LANGS = ("en", "fr", "es", "ar")

# (passage_id, type) -> {lang: 译文}
ANNOTATION_I18N: dict[tuple[str, str], dict[str, str]] = {
    ("guanzi.chengma.1", "classical"): {
        "en": "Yin Zhizhang's commentary: land is where taxes come from; if its distribution is uneven, the people are unsettled and governance cannot proceed.",
        "fr": "Commentaire de Yin Zhizhang : la terre est la source de l'impôt ; si sa répartition est inégale, le peuple s'inquiète et le gouvernement ne peut s'appliquer.",
        "es": "Comentario de Yin Zhizhang: la tierra es la fuente del impuesto; si su reparto es desigual, el pueblo se inquieta y el gobierno no puede aplicarse.",
        "ar": "شرح يين تشيتشانغ: الأرض مصدر الضرائب، وإذا لم يكن توزيعها عادلًا اضطرب الناس وتعذّر الحكم.",
    },
    ("guanzi.chengma.1", "modern"): {
        "en": "Guan Zhong on statecraft: land distribution is the root of politics — distribute it fairly and governance can be rectified; distribute it unevenly and governance fails.",
        "fr": "Guan Zhong sur l'art de gouverner : la répartition des terres est la racine de la politique — équitable, le gouvernement se redresse ; inégale, il échoue.",
        "es": "Guan Zhong sobre el arte de gobernar: el reparto de la tierra es la raíz de la política; si es justo, el gobierno se endereza; si es desigual, fracasa.",
        "ar": "غوان تشونغ في فن الحكم: توزيع الأرض أصل السياسة؛ فإن كان عادلًا استقام الحكم، وإن كان جائرًا تعطّل.",
    },
    ("jiuzhang.cuifen.1", "classical"): {
        "en": "Li Chunfeng's commentary: cui means 'graded difference'; distributing in decreasing shares by rank is called cuifen.",
        "fr": "Commentaire de Li Chunfeng : cui signifie « différence graduée » ; répartir par parts décroissantes selon le rang s'appelle cuifen.",
        "es": "Comentario de Li Chunfeng: cui significa «diferencia gradual»; repartir en partes decrecientes según el rango se llama cuifen.",
        "ar": "شرح لي تشونفنغ: «تسوي» تعني التفاوت المتدرج؛ والتوزيع بحصص متناقصة حسب الرتبة يسمى «تسوي فن».",
    },
    ("jiuzhang.cuifen.1", "modern"): {
        "en": "Cuifen means graded distribution. The five noble ranks share in the ratio 5:4:3:2:1 — five deer are divided as 5/3, 4/3, 1, 2/3 and 1/3.",
        "fr": "Cuifen désigne une répartition graduée. Les cinq rangs nobles partagent dans le rapport 5:4:3:2:1 — cinq cerfs se divisent en 5/3, 4/3, 1, 2/3 et 1/3.",
        "es": "Cuifen designa un reparto gradual. Los cinco rangos nobiliarios comparten en proporción 5:4:3:2:1: cinco ciervos se dividen en 5/3, 4/3, 1, 2/3 y 1/3.",
        "ar": "«تسوي فن» توزيع متدرج: تتقاسم الرتب الخمس بنسبة 5:4:3:2:1، فتقسم الغزلان الخمسة إلى 5/3 و4/3 و1 و2/3 و1/3.",
    },
    ("jiuzhang.junshu.1", "classical"): {
        "en": "Liu Hui's commentary: junshu means equalizing the differences in labour and cost.",
        "fr": "Commentaire de Liu Hui : junshu signifie égaliser les écarts de peine et de coût.",
        "es": "Comentario de Liu Hui: junshu significa igualar las diferencias de esfuerzo y costo.",
        "ar": "شرح ليو هوي: «جون شو» تعني تسوية فروق الجهد والكلفة.",
    },
    ("jiuzhang.junshu.1", "modern"): {
        "en": "China's earliest operations-research problem: four counties share the grain-transport burden fairly by households and distance. The rule weights by households ÷ distance — farther counties carry less.",
        "fr": "Le plus ancien problème chinois de recherche opérationnelle : quatre comtés se partagent équitablement le transport du grain selon les foyers et la distance. La règle pondère par foyers ÷ distance — les comtés lointains portent moins.",
        "es": "El problema de investigación operativa más antiguo de China: cuatro condados reparten el transporte del grano según hogares y distancia. La regla pondera por hogares ÷ distancia: los lejanos cargan menos.",
        "ar": "أقدم مسألة بحوث عمليات في الصين: تتقاسم أربع مقاطعات نقل الحبوب بعدل بحسب عدد البيوت والمسافة، بالوزن «البيوت ÷ المسافة»، فالأبعد يتحمل أقل.",
    },
    ("liji.yueji.1", "classical"): {
        "en": "Kong Yingda's subcommentary: music is rooted in the human heart; things touch the heart and sound arises.",
        "fr": "Sous-commentaire de Kong Yingda : la musique a sa racine dans le cœur humain ; les choses touchent le cœur et le son naît.",
        "es": "Subcomentario de Kong Yingda: la música tiene su raíz en el corazón humano; las cosas tocan el corazón y nace el sonido.",
        "ar": "شرح كونغ ينغدا: أصل الموسيقى في قلب الإنسان؛ تمسّه الأشياء فينشأ الصوت.",
    },
    ("liji.yueji.1", "modern"): {
        "en": "Music arises from the heart's response to things — the opening statement of the Confucian doctrine that music is born of the heart.",
        "fr": "La musique naît de la réponse du cœur aux choses — l'ouverture de la doctrine confucéenne selon laquelle la musique naît du cœur.",
        "es": "La música nace de la respuesta del corazón a las cosas: la apertura de la doctrina confuciana de que la música nace del corazón.",
        "ar": "تنشأ الموسيقى من استجابة القلب للأشياء، وهو مفتتح المذهب الكونفوشيوسي القائل إن الموسيقى من القلب.",
    },
    ("lunyu.bayi.3.20", "classical"): {
        "en": "Zhu Xi: the feelings are aroused yet hit the mark of due measure; hence 'joy without excess, grief without injury'.",
        "fr": "Zhu Xi : les sentiments s'éveillent mais atteignent la juste mesure ; d'où « joie sans excès, chagrin sans blessure ».",
        "es": "Zhu Xi: los sentimientos se despiertan pero alcanzan la justa medida; de ahí «alegría sin exceso, dolor sin daño».",
        "ar": "تشو شي: تنبعث المشاعر لكنها تبلغ حدّ الاعتدال؛ ومن ثم «فرح بلا غلوّ، وحزن بلا إيذاء».",
    },
    ("lunyu.bayi.3.20", "modern"): {
        "en": "Emotion must be expressed within measure — joy at its height without licence, grief at its depth without self-injury. This is the Confucian standard of balanced music.",
        "fr": "L'émotion doit s'exprimer dans la mesure — la joie à son comble sans licence, le chagrin au plus profond sans se détruire. Tel est le critère confucéen d'une musique équilibrée.",
        "es": "La emoción debe expresarse con medida: la alegría en su culmen sin desbordarse, el dolor en su hondura sin dañarse. Es el criterio confuciano de la música equilibrada.",
        "ar": "ينبغي أن يُعبَّر عن العاطفة باعتدال: فرحٌ في ذروته دون انفلات، وحزنٌ في عمقه دون إضرار بالنفس. وهذا معيار الموسيقى المتوازنة عند الكونفوشيوسيين.",
    },
    ("lunyu.bayi.3.25", "classical"): {
        "en": "Zhu Xi: the Shao was Shun's music, the Wu King Wu's. Shun gained the realm by yielding, King Wu by conquest — hence 'not wholly good'.",
        "fr": "Zhu Xi : le Shao était la musique de Shun, le Wu celle du roi Wu. Shun obtint l'empire par la cession, le roi Wu par la conquête — d'où « pas entièrement bon ».",
        "es": "Zhu Xi: el Shao era la música de Shun, el Wu la del rey Wu. Shun obtuvo el reino por cesión, el rey Wu por conquista; de ahí «no del todo bueno».",
        "ar": "تشو شي: «شاو» موسيقى شون، و«وو» موسيقى الملك وو. نال شون المُلك بالتنازل، وناله الملك وو بالحرب، ومن ثم «لم يبلغ كمال الخير».",
    },
    ("lunyu.bayi.3.25", "modern"): {
        "en": "Confucius distinguishes beauty from goodness in music: formal beauty must be joined to inner goodness. The Wu is fine to hear but carries a martial air, so it falls short of the Shao's perfect goodness.",
        "fr": "Confucius distingue le beau du bon dans la musique : la beauté formelle doit s'unir à la bonté intérieure. Le Wu est agréable mais porte un souffle martial ; il n'atteint pas la bonté parfaite du Shao.",
        "es": "Confucio distingue lo bello de lo bueno en la música: la belleza formal debe unirse a la bondad interior. El Wu suena bien pero tiene aire marcial; no alcanza la bondad perfecta del Shao.",
        "ar": "يميّز كونفوشيوس بين الجمال والخير في الموسيقى: الجمال الشكلي يجب أن يقترن بالخير الباطني. «وو» حسنة السماع لكن فيها نَفَسًا حربيًا، فلا تبلغ كمال خير «شاو».",
    },
    ("lunyu.jishi.16.1", "classical"): {
        "en": "Zhu Xi: with equitable shares each gets its due, so there is no poverty; with harmony above and below, none drift away, so there is no scarcity of people.",
        "fr": "Zhu Xi : par un partage équitable chacun reçoit son dû, donc pas de pauvreté ; avec l'harmonie entre haut et bas, nul ne s'en va, donc pas de pénurie d'hommes.",
        "es": "Zhu Xi: con reparto equitativo cada uno recibe lo suyo, y no hay pobreza; con armonía entre arriba y abajo nadie se marcha, y no hay escasez de gente.",
        "ar": "تشو شي: بالعدل في القسمة ينال كلٌّ ما يستحق فلا فقر؛ وبالوفاق بين الحاكم والمحكوم لا ينصرف أحد فلا قلة في الناس.",
    },
    ("lunyu.jishi.16.1", "modern"): {
        "en": "Confucius's maxim on governance: fear not scarcity but unfair distribution, not poverty but instability. Fair shares end poverty, harmony keeps the people, stability keeps the state upright.",
        "fr": "Maxime de Confucius sur le gouvernement : craindre non la rareté mais l'injustice du partage, non la pauvreté mais l'instabilité. Le partage équitable met fin à la pauvreté, l'harmonie retient le peuple, la stabilité maintient l'État.",
        "es": "Máxima de Confucio sobre el gobierno: no temer la escasez sino el reparto injusto, no la pobreza sino la inestabilidad. El reparto justo acaba con la pobreza, la armonía retiene al pueblo, la estabilidad sostiene al Estado.",
        "ar": "قاعدة كونفوشيوس في الحكم: لا تخشَ القلة بل الظلم في القسمة، ولا الفقر بل الاضطراب. فالعدل يزيل الفقر، والوفاق يمسك بالناس، والاستقرار يقيم الدولة.",
    },
    ("lunyu.shuer.7.14", "classical"): {
        "en": "Zhu Xi: the sage was moved so deeply that he forgot the taste of food.",
        "fr": "Zhu Xi : le sage fut si profondément ému qu'il en oublia le goût des aliments.",
        "es": "Zhu Xi: el sabio quedó tan conmovido que olvidó el sabor de la comida.",
        "ar": "تشو شي: بلغ تأثّر الحكيم حدًّا أنساه طعم الطعام.",
    },
    ("lunyu.shuer.7.14", "modern"): {
        "en": "Hearing the Shao in Qi, Confucius could not taste meat for three months — the highest reach of music can move the heart profoundly.",
        "fr": "Ayant entendu le Shao dans le Qi, Confucius resta trois mois sans goûter la viande — le sommet de la musique peut émouvoir profondément le cœur.",
        "es": "Al oír el Shao en Qi, Confucio estuvo tres meses sin saborear la carne: la cima de la música puede conmover hondamente el corazón.",
        "ar": "لمّا سمع كونفوشيوس «شاو» في تشي ظلّ ثلاثة أشهر لا يجد طعم اللحم؛ فذروة الموسيقى تهزّ القلب هزًّا عميقًا.",
    },
    ("lunyu.taibo.8.8", "classical"): {
        "en": "Zhu Xi: the Odes arouse the will, ritual steadies conduct, music nourishes the character.",
        "fr": "Zhu Xi : les Odes éveillent la volonté, les rites affermissent la conduite, la musique nourrit le caractère.",
        "es": "Zhu Xi: las Odas despiertan la voluntad, los ritos afirman la conducta, la música nutre el carácter.",
        "ar": "تشو شي: «الشعر» يوقظ الإرادة، و«الطقوس» تثبّت السلوك، و«الموسيقى» تغذّي الطبع.",
    },
    ("lunyu.taibo.8.8", "modern"): {
        "en": "The three stages of Confucian self-cultivation: the Odes quicken feeling, ritual fixes conduct, music completes the person — music is the highest stage of education.",
        "fr": "Les trois étapes de la formation confucéenne : les Odes éveillent le sentiment, les rites fixent la conduite, la musique achève la personne — la musique est le stade suprême de l'éducation.",
        "es": "Las tres etapas de la formación confuciana: las Odas despiertan el sentimiento, los ritos fijan la conducta, la música completa a la persona; la música es la etapa suprema de la educación.",
        "ar": "مراحل التكوين الكونفوشيوسي الثلاث: الشعر يوقظ الشعور، والطقوس تثبّت السلوك، والموسيقى تُتمّ الشخصية؛ فهي أعلى مراحل التربية.",
    },
    ("lunyu.xianwen.14.5", "classical"): {
        "en": "Zhu Xi: boasting of skill is worth less than esteeming virtue. Charioteering and archery are both skills; only virtue can preserve the self and the state.",
        "fr": "Zhu Xi : se vanter d'un talent vaut moins que d'honorer la vertu. Conduite du char et tir à l'arc sont des talents ; seule la vertu préserve soi et l'État.",
        "es": "Zhu Xi: jactarse de una destreza vale menos que estimar la virtud. Conducir el carro y el tiro son destrezas; solo la virtud preserva a uno y al Estado.",
        "ar": "تشو شي: التفاخر بالمهارة أدنى من توقير الفضيلة. فقيادة العربة والرماية مهارتان، والفضيلة وحدها تحفظ النفس والدولة.",
    },
    ("lunyu.xianwen.14.5", "modern"): {
        "en": "However fine the skill — Yi's archery, Ao's boating — without virtue it ends badly; Yu and Ji tilled the soil in simplicity and, having virtue, gained the realm. The highest reach of charioteering lies in virtue, not technique.",
        "fr": "Si grande que soit la technique — l'arc de Yi, la rame d'Ao — sans vertu elle finit mal ; Yu et Ji cultivaient la terre simplement et, ayant la vertu, obtinrent l'empire. Le sommet de la conduite du char est dans la vertu, non dans la technique.",
        "es": "Por mucha destreza —el arco de Yi, el remo de Ao—, sin virtud acaba mal; Yu y Ji labraron la tierra con sencillez y, teniendo virtud, obtuvieron el reino. La cima de conducir el carro está en la virtud, no en la técnica.",
        "ar": "مهما بلغت المهارة — رمي يي وتجديف آو — فإنها بلا فضيلة تنتهي نهاية سوء؛ أما يو وجي فحرثا الأرض بتواضع، وبالفضيلة ملكا. وذروة قيادة العربة في الفضيلة لا في المهارة.",
    },
    ("lunyu.zihan.9.2", "classical"): {
        "en": "Zhu Xi: Confucius humbly disclaims any speciality and jokingly picks the lowlier art, charioteering, to answer them. Yet charioteering is one of the Six Arts, which the sage also practised.",
        "fr": "Zhu Xi : Confucius décline humblement toute spécialité et choisit en plaisantant l'art le plus modeste, la conduite du char. Or celle-ci est l'un des Six Arts, que le sage pratiquait aussi.",
        "es": "Zhu Xi: Confucio declina con humildad toda especialidad y elige en broma el arte más humilde, conducir el carro. Pero esta es una de las Seis Artes, que el sabio también practicaba.",
        "ar": "تشو شي: ينفي كونفوشيوس بتواضع أن يكون له تخصص، فيختار مازحًا أدنى الفنون: قيادة العربة. وهي إحدى الفنون الستة التي كان الحكيم يمارسها.",
    },
    ("lunyu.zihan.9.2", "modern"): {
        "en": "Villagers mocked Confucius for being learned yet without one speciality. He answered wryly: 'Which art shall I take up? I'll take charioteering.' Charioteering was counted the lowlier of the Six Arts, and he chose it — the stance of 'the junzi is not a vessel'.",
        "fr": "Des villageois raillaient Confucius d'être savant sans spécialité. Il répondit avec ironie : « Quel art choisir ? La conduite du char. » C'était le plus modeste des Six Arts, et il le choisit — l'attitude du « junzi n'est pas un ustensile ».",
        "es": "Unos aldeanos se burlaban de que Confucio fuera sabio sin especialidad. Respondió con ironía: «¿Qué arte tomo? Conducir el carro.» Era el más humilde de las Seis Artes, y lo eligió: la actitud de «el junzi no es un utensilio».",
        "ar": "سخر قوم من كونفوشيوس لأنه واسع العلم بلا تخصص، فأجاب ساخرًا: «أي فنٍّ أتخذ؟ قيادة العربة». وكانت أدنى الفنون الستة فاختارها، وهو موقف «النبيل ليس أداة».",
    },
    ("mengzi.tengwengong.xia.6", "classical"): {
        "en": "Zhu Xi: the charioteer keeps to his duty by ritual and will not join the unrighteous for gain.",
        "fr": "Zhu Xi : le cocher tient son devoir selon les rites et ne s'unit pas à l'injuste par intérêt.",
        "es": "Zhu Xi: el cochero guarda su deber según el rito y no se une al injusto por provecho.",
        "ar": "تشو شي: السائق يلزم واجبه وفق الطقوس ولا ينضم إلى من لا خير فيه طلبًا للمنفعة.",
    },
    ("mengzi.tengwengong.xia.6", "modern"): {
        "en": "The charioteer holds to his station and ritual measure: he would rather not cooperate than breach propriety for more game — the self-restraint of charioteering.",
        "fr": "Le cocher tient son rang et la mesure rituelle : plutôt renoncer que manquer aux rites pour plus de gibier — la retenue de la conduite du char.",
        "es": "El cochero guarda su puesto y la medida ritual: prefiere no cooperar antes que faltar al rito por más presas; la contención de conducir el carro.",
        "ar": "السائق يلزم مرتبته وحدود الطقوس: يفضّل ألّا يشارك على أن يخالف الأدب طلبًا لصيد أكثر؛ وذلك ضبط النفس في قيادة العربة.",
    },
    ("xunzi.jundao.1", "classical"): {
        "en": "Yang Jing's commentary: boat and water are not two separate things, yet water can carry and overturn. Steering a boat and governing the people follow one principle: the key is not to go to extremes.",
        "fr": "Commentaire de Yang Jing : barque et eau ne font pas deux choses, mais l'eau porte et renverse. Mener une barque et gouverner le peuple suivent un même principe : l'essentiel est de ne pas aller à l'extrême.",
        "es": "Comentario de Yang Jing: barca y agua no son dos cosas, pero el agua lleva y vuelca. Guiar una barca y gobernar al pueblo siguen un mismo principio: lo esencial es no llegar al extremo.",
        "ar": "شرح يانغ جينغ: السفينة والماء ليسا شيئين، لكن الماء يحمل ويقلب. وقيادة السفينة وسياسة الناس بمبدأ واحد: ألّا تبلغ الغاية القصوى.",
    },
    ("xunzi.jundao.1", "modern"): {
        "en": "Xunzi likens ruler and people to boat and water. Steering a boat — as with a chariot — means following the current; forcing it overturns. The way of driving lies in not going to extremes.",
        "fr": "Xunzi compare souverain et peuple à la barque et à l'eau. Mener la barque — comme le char — c'est suivre le courant ; forcer la mène au naufrage. La voie de la conduite tient à « ne pas aller à l'extrême ».",
        "es": "Xunzi compara gobernante y pueblo con la barca y el agua. Guiar la barca —como el carro— es seguir la corriente; forzarla la vuelca. El camino de conducir está en «no llegar al extremo».",
        "ar": "يشبّه شيونزي الحاكم والناس بالسفينة والماء. قيادة السفينة — كقيادة العربة — اتباعٌ لمجرى الماء؛ ومخالفته تُغرِق. وسبيل القيادة ألّا تبلغ الغاية.",
    },
    ("zhouli.baoshi.1", "classical"): {
        "en": "Zheng Xuan's commentary: 'harmonizing the bells' means that on mounting the chariot the horses move and the bells ring in time; 'following the winding water' means driving along the bends of a stream; 'passing the lord's pillar' means passing where the lord's marker has been set; 'dancing through the crossroads' means driving through a four-way crossing; 'hunting to the left' means that in the hunt, game fleeing to the left is spared.",
        "fr": "Commentaire de Zheng Xuan : « faire sonner les clochettes » : dès qu'on monte, les chevaux avancent et les clochettes sonnent en cadence ; « suivre l'eau sinueuse » : conduire le long des courbes du cours d'eau ; « passer la stèle du seigneur » : passer là où le seigneur a posé sa marque ; « danser au carrefour » : conduire sur un croisement de routes ; « chasser à gauche » : à la chasse, le gibier qui fuit à gauche est épargné.",
        "es": "Comentario de Zheng Xuan: «hacer sonar las campanillas»: al subir, los caballos avanzan y las campanillas suenan al compás; «seguir el agua sinuosa»: conducir por las curvas del arroyo; «pasar la estela del señor»: pasar donde el señor puso su marca; «danzar en la encrucijada»: conducir por un cruce de caminos; «cazar a la izquierda»: en la caza, la presa que huye a la izquierda se perdona.",
        "ar": "شرح تشنغ شيوان: «ضبط الجرس» أن الخيل إذا سارت سار الجرس على الإيقاع؛ و«اتباع منعطف الماء» السير مع انحناءات الجدول؛ و«المرور بنُصب الأمير» المرور حيث نُصب علامة الأمير؛ و«الرقص في المفترق» القيادة عبر ملتقى الطرق؛ و«الصيد إلى اليسار» أن الصيد إذا فرّ يسارًا تُرك ولم يُرمَ.",
    },
    ("zhouli.baoshi.1", "modern"): {
        "en": "The Five Charioteering techniques are five ritualized skills of driving. Their core is 'act by ritual, neither to extremes nor in haste' — driving is not mere technique but a discipline of ritual restraint.",
        "fr": "Les Cinq techniques du char sont cinq habiletés ritualisées. Leur cœur : « agir selon les rites, sans excès ni précipitation » — conduire n'est pas une simple technique mais une discipline de retenue rituelle.",
        "es": "Las Cinco técnicas de carro son cinco destrezas ritualizadas. Su núcleo: «actuar según el rito, sin extremos ni prisa»: conducir no es mera técnica sino disciplina de contención ritual.",
        "ar": "فنون القيادة الخمسة مهارات طقسية. جوهرها: «العمل بالطقس، بلا غلوّ ولا عجلة»؛ فقيادة العربة ليست مهارة فحسب، بل رياضة نفس على الضبط الطقسي.",
    },
    ("zhouli.junshu.1", "classical"): {
        "en": "Zheng Xuan's commentary: jun means 'to level'; land taxes, land defence duties and land offices are all equalized for the people's convenience.",
        "fr": "Commentaire de Zheng Xuan : jun signifie « niveler » ; impôts fonciers, charges de défense et offices fonciers sont égalisés pour le bien du peuple.",
        "es": "Comentario de Zheng Xuan: jun significa «nivelar»; tributos, cargas de defensa y oficios de la tierra se igualan para bien del pueblo.",
        "ar": "شرح تشنغ شيوان: «جون» تعني التسوية؛ تُسوّى ضرائب الأرض وواجبات حفظها ووظائفها تيسيرًا على الناس.",
    },
    ("zhouli.junshu.1", "modern"): {
        "en": "The Zhou created the office of Junren to equalize taxes, corvée and labour — an instance of Confucian 'number' as statecraft: mathematics is not only calculation but an instrument of distribution.",
        "fr": "Les Zhou créèrent la charge de Junren pour égaliser impôts, corvées et labeur — un cas du « nombre » confucéen comme art de gouverner : les mathématiques ne sont pas que calcul, mais un instrument de répartition.",
        "es": "Los Zhou crearon el cargo de Junren para igualar impuestos, corveas y trabajo: un caso del «número» confuciano como arte de gobernar; la matemática no es solo cálculo, sino instrumento de reparto.",
        "ar": "أنشأت أسرة تشو وظيفة «جون رن» لتسوية الضرائب والكلفات والأعمال؛ وهو مثال على «العدد» الكونفوشيوسي في الحكم: فالرياضيات ليست حسابًا فحسب، بل أداة توزيع.",
    },
}


def apply_annotation_i18n(db: Session) -> dict:
    """按 (passage_id, type) 补齐注文译文，已有语种不动。"""
    counts = {"checked": 0, "updated": 0, "langs": 0}
    for (pid, atype), want in ANNOTATION_I18N.items():
        rows = db.execute(
            select(Annotation).where(
                Annotation.passage_id == pid, Annotation.type == atype
            )
        ).scalars().all()
        counts["checked"] += 1
        for a in rows:
            i18n = dict(a.content_i18n or {})
            changed = False
            for lang, text in want.items():
                if lang in LANGS and text and not i18n.get(lang):
                    i18n[lang] = text
                    changed = True
                    counts["langs"] += 1
            if changed:
                a.content_i18n = i18n
                flag_modified(a, "content_i18n")
                counts["updated"] += 1
    db.commit()
    return counts

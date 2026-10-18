// 御（yu）游戏专属 UI 外壳文案。以中文字面量为键；zh 即键本身，只列 en/fr/es/ar。
// 学习内容（御礼操作、典故原文/术语、关卡名 setting/hint）不收录。
import type { Lang } from "@/lib/i18n";

type E = Partial<Record<Lang, string>>;

export const YU: Record<string, E> = {
  // 顶部 HUD
  "六艺 · 御": {
    en: "Six Arts · Charioteering",
    fr: "Six Arts · Charroi",
    es: "Seis artes · Carreras de carros",
    ar: "الفنون الستة · فن قيادة المركبة",
  },
  "五御 · 以礼行驱": {
    en: "The Five Chariot Arts · Drive with Ritual",
    fr: "Les cinq arts du char · Conduire avec rites",
    es: "Los cinco artes del carro · Conducir con ritual",
    ar: "فنون القيادة الخمسة · القيادة وفق اللياقة",
  },
  "扬鞭催行 · 收缰缓行 · 调辕转向 · 遇事致礼": {
    en: "Whip to urge · Rein to slow · Steer the shaft · Salute when meeting",
    fr: "Fouet pour avancer · Rênes pour ralentir · Gouvernail · Salut à la rencontre",
    es: "Látigo para avanzar · Riendas para frenar · Timonear · Saludar al cruce",
    ar: "السوط للإسراع · اللجام للإبطاء · توجيه المِحور · التحية عند اللقاء",
  },
  "御艺": {
    en: "Chariot",
    fr: "Charroi",
    es: "Carro",
    ar: "فن القيادة",
  },

  // 场景选择卡
  "今日已评": {
    en: "Rated today",
    fr: "Noté aujourd'hui",
    es: "Calificado hoy",
    ar: "قُيّم اليوم",
  },
  "已驭过": {
    en: "Driven",
    fr: "Déjà conduit",
    es: "Ya conducido",
    ar: "قُدت سابقًا",
  },
  "目标": {
    en: "Target",
    fr: "Cible",
    es: "Meta",
    ar: "الهدف",
  },
  "五关皆可任驭 · 每日每关首驭计分，当日再驭练手不加分": {
    en: "All five courses are open. Your first drive of each course scores today; later runs are practice only.",
    fr: "Les cinq parcours sont ouverts. La première conduite du jour est notée ; les autres sont l'entraînement.",
    es: "Los cinco recorridos están abiertos. La primera conducción del día puntúa; las demás son práctica.",
    ar: "المسارات الخمسة مفتوحة. أول قيادة في كل مسار تُحتسب اليوم، والباقي تدريب بلا درجات.",
  },

  // 每关目标/提示（KIND_GUIDE）
  "过金铃门要踩准节拍": {
    en: "Pass the golden bell gates on the beat",
    fr: "Passez les cloches dorées en rythme",
    es: "Pasa las puertas de campanas doradas al compás",
    ar: "اعبر بوابات الأجراس الذهبية مع الإيقاع",
  },
  "速度稳在目标值附近，铃亮即到门时机": {
    en: "Hold near the target speed; the bells light as the gate arrives",
    fr: "Restez près de la vitesse cible ; les cloches s'illuminent à l'approche",
    es: "Mantén la velocidad cerca de la meta; las campanas se encienden al llegar",
    ar: "اثبت على السرعة المستهدفة؛ تُضاء الأجراس عند البوابة",
  },
  "沿水弯道居中行驶": {
    en: "Stay centered through the riverside curves",
    fr: "Restez au centre des virages au bord de l'eau",
    es: "Manténte en el centro de las curvas junto al agua",
    ar: "ابقَ في منتصف المنعطفات على ضفة الماء",
  },
  "提前看弯道方向，小幅多次调整": {
    en: "Read the curve ahead; steer in small, steady corrections",
    fr: "Anticipez la courbe ; corrigez par petites touches",
    es: "Lee la curva con antelación; corrige en pequeños ajustes",
    ar: "اقرأ المنعطف مسبقًا؛ وعدِّل بلمسات صغيرة متكررة",
  },
  "君表前缓行 + 按「礼」": {
    en: "Slow before the Jun Tablet and press Ritual",
    fr: "Ralentissez devant la stèle princière puis faites le salut",
    es: "Despacio ante la tableta Jun y pulsa Ritual",
    ar: "أبطِأ أمام لوحة الجون ثم اضغط «تحية»",
  },
  "看到地上金环就减速到 4 以下，过牌坊按空格": {
    en: "Slow below 4 m/s at the golden ring; press Space at the archway",
    fr: "Passez sous 4 m/s à l'anneau d'or ; Espace à la porte",
    es: "Baja de 4 m/s junto al anillo dorado; Espacio en el arco",
    ar: "أبطِأ دون 4 م/ث عند الحلقة الذهبية؛ واضغط مساحة عند القوس",
  },
  "行人横穿必须停让": {
    en: "Must yield to crossing pedestrians",
    fr: "Cédez le passage aux piétons",
    es: "Debes ceder a los peatones que cruzan",
    ar: "يجب إفساح الطريق للمارة العابرين",
  },
  "行人上路就停（<1 m/s），等他过完再走": {
    en: "Stop below 1 m/s when a pedestrian steps out; wait until they cross",
    fr: "Arrêtez-vous sous 1 m/s dès qu'un piéton sort ; attendez qu'il passe",
    es: "Detente bajo 1 m/s al salir un peatón; espera a que cruce",
    ar: "توقف دون 1 م/ث عند خروج المارة؛ وانتظر حتى يعبر",
  },
  "禽奔于左 · 勿追": {
    en: "Game bolts left · do not chase",
    fr: "Le gibier fuit à gauche · ne poursuivez pas",
    es: "La caza huye a la izquierda · no la persigas",
    ar: "الطريدة تهرب يسارًا · لا تلاحقها",
  },
  "鹿出现别左转，扶直辕原路前行": {
    en: "When the deer appears, hold straight; do not turn left",
    fr: "Quand le cerf paraît, gardez la droite ; ne tournez pas à gauche",
    es: "Al aparecer el ciervo, mantén recto; no gires a la izquierda",
    ar: "إذا ظهر الأيل فاثبت على الاستقامة؛ لا تنعْ يسارًا",
  },

  // 事件 toast
  "节拍未合": {
    en: "Off-beat",
    fr: "Rythme manqué",
    es: "Fuera de compás",
    ar: "خارج الإيقاع",
  },
  "♩ 合拍": {
    en: "♩ On beat",
    fr: "♩ En rythme",
    es: "♩ A compás",
    ar: "♩ مع الإيقاع",
  },
  "过君表 · 缓行 ✓": {
    en: "Jun Tablet passed · slow ✓",
    fr: "Stèle princière passée · lent ✓",
    es: "Tableta Jun pasada · despacio ✓",
    ar: "عُبرت لوحة الجون · ببطء ✓",
  },
  "致礼": {
    en: "Salute",
    fr: "Salut",
    es: "Saludo",
    ar: "تحية",
  },
  "礼让行人 ✓": {
    en: "Pedestrian yielded ✓",
    fr: "Piéton cédé ✓",
    es: "Peatón cedido ✓",
    ar: "أُفسح للمارة ✓",
  },
  "撞到行人！": {
    en: "Hit pedestrian!",
    fr: "Piéton heurté !",
    es: "¡Atropellaste al peatón!",
    ar: "أصبت المارة!",
  },
  "逐禽违礼！": {
    en: "Chasing game — against ritual!",
    fr: "Poursuite du gibier — contraire aux rites !",
    es: "¡Perseguir la caza es contra el ritual!",
    ar: "اللحاق بالصيد مخالف للوقار!",
  },
  "会车 · 礼让 ✓": {
    en: "Oncoming cart · yielded ✓",
    fr: "Voiture en sens inverse · cédé ✓",
    es: "Carro contrario · cediste ✓",
    ar: "مركبة قادمة · أفسحت ✓",
  },
  "相揖而礼 ✓": {
    en: "Mutual salute ✓",
    fr: "Salut mutuel ✓",
    es: "Saludo mutuo ✓",
    ar: "تحية متبادلة ✓",
  },
  "会车失礼 — 靠右缓行": {
    en: "Rude meeting — keep right and slow",
    fr: "Rencontre impolie — restez à droite au pas",
    es: "Encuesta grosera — mantén la derecha lento",
    ar: "لقاء غير مهذب — الزم اليمين ببطء",
  },
  "逼随前车 — 勿极勿逼": {
    en: "Tailgating — don't crowd the lead cart",
    fr: "Trop près — ne collez pas le char devant",
    es: "Demasiado cerca — no apremies al carro delantero",
    ar: "الالتصاق بالمقدمة — لا تُزاحم المركبة الأمامية",
  },
  "急刹！": {
    en: "Hard brake!",
    fr: "Frein brusque !",
    es: "¡Frenazo!",
    ar: "كبح مفاجئ!",
  },
  "超速 — 收缰": {
    en: "Over speed — rein in",
    fr: "Vitesse excessive — ralentissez",
    es: "Exceso de velocidad — refrena",
    ar: "تجاوز السرعة — اشدُد اللجام",
  },

  // 加载错误
  "无法加载御艺场景 — 请先登录": {
    en: "Could not load chariot scenarios — please log in first",
    fr: "Impossible de charger les scénarios de charroi — connectez-vous",
    es: "No se pudieron cargar los recorridos — inicia sesión",
    ar: "تعذر تحميل مسارات القيادة — سجّل الدخول أولًا",
  },

  // 引导浮层
  "途中有车马往来 —— 对向会车请靠右缓行，相遇时按空格「礼」可相揖；遇慢车勿逼随": {
    en: "Other carts share the road — keep right when meeting oncoming traffic; press Space to exchange salutes; don't tailgate slower carts.",
    fr: "D'autres chars roulent — restez à droite à l'approche ; Espace pour échanger le salut ; ne collez pas les chars lents.",
    es: "Otros carros comparten la vía — mantén la derecha al cruzarte; Espacio para el saludo mutuo; no apremies a los lentos.",
    ar: "هناك مركبات أخرى على الطريق — الزم اليمين عند اللقاء؛ واضغط مساحة للتحية المتبادلة؛ ولا تلاحق البطيئة.",
  },
  "评判中…": {
    en: "Scoring…",
    fr: "Notation…",
    es: "Calificando…",
    ar: "جارٍ التقييم…",
  },

  // 移动端按钮
  "礼": {
    en: "Ritual",
    fr: "Rites",
    es: "Ritual",
    ar: "تحية",
  },
  "收缰": {
    en: "Rein",
    fr: "Rênes",
    es: "Frena",
    ar: "اكبح",
  },
  "扬鞭": {
    en: "Whip",
    fr: "Fouet",
    es: "Látigo",
    ar: "أَجِّل",
  },

  // 桌面键位提示
  "↑ 扬鞭 · ↓ 收缰 · ←→ 调辕 · 空格 礼": {
    en: "↑ Whip · ↓ Rein · ←→ Steer · Space Ritual",
    fr: "↑ Fouet · ↓ Rênes · ←→ Gouvernail · Espace Rites",
    es: "↑ Látigo · ↓ Frena · ←→ Timón · Espacio Ritual",
    ar: "↑ أَجِّل · ↓ اكبح · ←→ وجِّه · مساحة تحية",
  },

  // 进度区
  "御艺进境": {
    en: "Chariot progress",
    fr: "Progrès en charroi",
    es: "Progreso de conducción",
    ar: "تقدّم فن القيادة",
  },
  "关": {
    en: "courses",
    fr: "parcours",
    es: "recorridos",
    ar: "مسارات",
  },
  "均分": {
    en: "avg",
    fr: "moy.",
    es: "prom.",
    ar: "المعدل",
  },
  "未驭": {
    en: "Not driven",
    fr: "Non conduit",
    es: "No conducido",
    ar: "لم يُقَد",
  },

  // 结算卡
  "评判": {
    en: "Judged",
    fr: "Jugé",
    es: "Juzgado",
    ar: "التقييم",
  },
  "（今日已评，不再加分）": {
    en: "(Already rated today; no more points)",
    fr: "(Déjà noté aujourd'hui ; pas de points)",
    es: "(Ya calificado hoy; sin puntos)",
    ar: "(قُيّم اليوم؛ لا مزيد من النقاط)",
  },
  "节 · 节奏稳匀": {
    en: "Beat · steady rhythm",
    fr: "Rythme · mesure régulière",
    es: "Compás · ritmo constante",
    ar: "الإيقاع · انتظام",
  },
  "让 · 遇礼则让": {
    en: "Yield · defer to ritual",
    fr: "Cession · céder au rite",
    es: "Ceder · deferir al ritual",
    ar: "الإفساح · الإذعان للوقار",
  },
  "不极 · 不急不追": {
    en: "Measure · no haste, no chase",
    fr: "Mesure · ni hâte ni poursuite",
    es: "Medida · sin prisa ni persecución",
    ar: "الاعتدال · لا عجلة ولا اقتحام",
  },
  "再驭一次": {
    en: "Drive again",
    fr: "Reconduire",
    es: "Conducir de nuevo",
    ar: "أعِد القيادة",
  },
  "换一关": {
    en: "Another course",
    fr: "Autre parcours",
    es: "Otro recorrido",
    ar: "مسار آخر",
  },

  // 结算反馈提示（分句拼接）
  "节拍：命中": {
    en: "Beat: hits",
    fr: "Rythme : réussites",
    es: "Compás: aciertos",
    ar: "الإيقاع: إصابات",
  },
  "铃变绿即合拍，变红说明到早了或晚了。": {
    en: "Green bell means on beat; red means early or late.",
    fr: "Cloche verte = en rythme ; rouge = en avance ou retard.",
    es: "Campana verde = a compás; roja = pronto o tarde.",
    ar: "الجرس الأخضر يعني الإصابة؛ الأحمر يعني مبكرًا أو متأخرًا.",
  },
  "礼让：君表通过": {
    en: "Yield: Jun Tablet passes",
    fr: "Cession : passages de la stèle",
    es: "Ceder: pasos de la tableta Jun",
    ar: "الإفساح: عبور لوحات الجون",
  },
  " 次，按礼 ": {
    en: " times, salutes",
    fr: " fois, saluts",
    es: " veces, saludos",
    ar: " مرات، تحيات",
  },
  " 次。要慢下来再按礼。": {
    en: " times. Slow down before saluting.",
    fr: " fois. Ralentissez avant de saluer.",
    es: " veces. Despacio antes de saludar.",
    ar: " مرات. أبطِئ قبل التحية.",
  },
  "行人：让行": {
    en: "Pedestrians: yields",
    fr: "Piétons : cessions",
    es: "Peatones: cesiones",
    ar: "المارة: إفساح",
  },
  " 次": {
    en: " times",
    fr: " fois",
    es: " veces",
    ar: " مرات",
  },
  "，撞人": {
    en: ", hits",
    fr: ", heurts",
    es: ", atropellos",
    ar: ", إصابات",
  },
  "见人先停稳。": {
    en: "Stop before you reach them.",
    fr: "Arrêtez-vous avant de les atteindre.",
    es: "Detente antes de llegar.",
    ar: "توقف قبل بلوغهم.",
  },
  "逐禽：追了": {
    en: "Game: chased",
    fr: "Gibier : poursuites",
    es: "Caza: persecuciones",
    ar: "الصيد: ملاحقات",
  },
  " 次。": {
    en: " times.",
    fr: " fois.",
    es: " veces.",
    ar: " مرات.",
  },
  "「禽逃则止，不复追」——直行即是礼。": {
    en: "“When game flees, stop; do not chase” — going straight is ritual.",
    fr: "« Quand le gibier fuit, arrêtez, ne poursuivez pas » — aller droit est le rite.",
    es: "« Si huye la caza, detente; no la persigas » — ir recto es el ritual.",
    ar: "«إذا ولّت الطريدة فاقفِ؛ ولا تعُد» — الاستقامة هي اللياقة.",
  },
  "会车：礼让": {
    en: "Meeting: yielded",
    fr: "Rencontre : cessions",
    es: "Cruce: cesiones",
    ar: "اللقاء: إفساح",
  },
  "，失礼": {
    en: ", rude",
    fr: ", impolis",
    es: ", groseros",
    ar: ", وقاحة",
  },
  "对向来车，靠右缓行。": {
    en: "Keep right and slow for oncoming carts.",
    fr: "Restez à droite au pas face aux chars venant en sens inverse.",
    es: "Mantén la derecha lento con los carros que vienen.",
    ar: "الزم اليمين ببطء أمام القادم.",
  },
  "相揖：会车时致礼": {
    en: "Salute: exchanged",
    fr: "Salut : échanges",
    es: "Saludo: intercambios",
    ar: "التحية: تبادلات",
  },
  " 次，对方车夫也拱手回礼了。「礼尚往来」。": {
    en: " salutes; the other driver bowed back. “Ritual is reciprocal.”",
    fr: " saluts ; l'autre cocher a rendu le salut. « Le rite se rend. »",
    es: " saludos; el otro cochero correspondió. «El ritual es recíproco.»",
    ar: " تحية؛ وقد ردّ سائقُ المركبة الأخرى الإيماءة. «المعروف يُكافأ».",
  },
  "随行：逼随前车": {
    en: "Following: tailgated",
    fr: "Suivez : collages",
    es: "Seguir: acercamientos",
    ar: "التبعّة: التصاق",
  },
  "车距即礼数，勿极勿逼。": {
    en: "Distance is ritual; don't crowd.",
    fr: "La distance est une marque de rite ; ne collez pas.",
    es: "La distancia es ritual; no apremies.",
    ar: "المسافة وقار؛ ولا تُزاحم.",
  },
  "不极：急刹": {
    en: "Measure: hard brakes",
    fr: "Mesure : freins brusques",
    es: "Medida: frenazos",
    ar: "الاعتدال: كبح مفاجئ",
  },
  " 次、超速": {
    en: " times, overspeed",
    fr: " fois, excès de vitesse",
    es: " veces, excesos",
    ar: " مرات، تجاوز السرعة",
  },
  "早收缰，匀速行。": {
    en: "Rein early; hold a steady pace.",
    fr: "Ralentissez tôt ; maintenez une allure régulière.",
    es: "Frena temprano; mantén ritmo constante.",
    ar: "اشدد اللجام مبكرًا؛ واسرِ بسرعة منتظمة.",
  },

  // 御艺加分（结算徽标内）
  "御艺 +": {
    en: "Chariot +",
    fr: "Charroi +",
    es: "Carro +",
    ar: "قيادة +",
  },

  // ── DELTA Round 2: 关卡名/场景说明/提示/称号/段位 ──

  // 五御关卡名（后端 title/kind_label）
  "鸣和鸾": {
    en: "Harmonizing the Bells",
    fr: "Clochettes en cadence",
    es: "Campanillas al ritmo",
    ar: "تناغم الأجراس",
  },
  "逐水曲": {
    en: "Following the River's Bend",
    fr: "Suivre la courbe de l'eau",
    es: "Curvas del río",
    ar: "اتباع منعطف النهر",
  },
  "过君表": {
    en: "Passing the Lord's Pillar",
    fr: "Passer la stèle du seigneur",
    es: "Pasar la estela del señor",
    ar: "المرور بنُصب الأمير",
  },
  "舞交衢": {
    en: "Dancing Through Crossroads",
    fr: "Danser au carrefour",
    es: "Danzar en la encrucijada",
    ar: "الرقص في مفترق الطرق",
  },
  "逐禽左": {
    en: "Game to the Left",
    fr: "Gibier à gauche",
    es: "Presa a la izquierda",
    ar: "الطريدة إلى اليسار",
  },

  // 场景 setting（后端 setting 字段）
  "登车出门，和鸾之声须合乎车行节奏。此关用路面节拍门来表示节奏点。": {
    en: "Mount the chariot and set forth; the bells must chime in time with the horses' stride. Beat gates on the road mark the rhythm.",
    fr: "Montez au char et partez ; les clochettes doivent sonner au pas des chevaux. Des portails rythmiques marquent la cadence.",
    es: "Sube al carro y parte; las campanillas deben sonar al paso de los caballos. Las puertas rítmicas marcan el compás.",
    ar: "اركب العربة وانطلق؛ يجب أن تدوي الأجراس بإيقاع خُطى الخيول. بوّابات الإيقاع على الطريق تحدد النغم.",
  },
  "驾车沿水道而行，水弯则车弯。": {
    en: "Drive along the watercourse; where the river bends, the chariot bends.",
    fr: "Suivez le cours d'eau ; là où l'eau tourne, le char tourne.",
    es: "Sigue el curso del agua; donde curva el río, curva el carro.",
    ar: "قُدْ على مجرى الماء؛ حيث ينعطف الماء ينعطف العَرَبة.",
  },
  "前方设君表（国君之标），过时须减速并按「礼」鞠躬。": {
    en: "The lord's pillar stands ahead; slow down as you pass and press the Rite key to bow.",
    fr: "La stèle du seigneur se dresse devant ; ralentissez en la passant et appuyez sur le rite pour saluer.",
    es: "La estela del señor se alza adelante; reduced la velocidad al pasar y pulse Rito para inclinarse.",
    ar: "نُصب الأمير أمامك؛ أبطِئ عند المرور واضغط مفتاح الطقس لتنحني.",
  },
  "经过十字路口，有行人横穿。须主动停让。": {
    en: "A pedestrian crosses at the intersection. You must stop and yield.",
    fr: "Un piéton traverse au carrefour. Vous devez vous arrêter et céder.",
    es: "Un peatón cruza en la encrucijada. Debes detenerte y ceder.",
    ar: "مارة يعبر في مفترق الطرق. عليك أن تتوقف وتُفسح.",
  },
  "猎场之上，禽兽奔逸于左。古礼：禽逃则止，不复追。": {
    en: "On the hunting ground, game flees to the left. Ancient rite: when the quarry flees, stop — do not pursue.",
    fr: "Au champ de chasse, le gibier s'enfuit à gauche. Rite ancien : si la proie fuit, arrêtez — ne la poursuivez pas.",
    es: "En el coto, la presa huye hacia la izquierda. Rito antiguo: si la presa huye, detente; no la persigas.",
    ar: "في ساحة الصيد، الطريدة تهرب إلى اليسار. السُنة القديمة: إذا فرّت الطريدة فَقِف؛ ولا تتبع.",
  },

  // 场景 hint（后端 hint 字段）
  "不用听声音，看路面黄色 ♩ 节拍门。保持车速稳定在 8 m/s 左右，马车到门时若时间与位置接近目标，就算合拍。": {
    en: "Don't listen to the sound — watch the yellow ♩ beat gates on the road. Keep a steady speed near 8 m/s; when the chariot reaches a gate at the right time and spot, you're on beat.",
    fr: "N'écoutez pas le son — observez les portails ♩ jaunes sur la route. Maintenez une vitesse constante autour de 8 m/s ; si le char atteint un portail au bon moment, c'est juste.",
    es: "No escuches el sonido: mira las puertas ♩ amarillas en el camino. Mantén velocidad estable cerca de 8 m/s; si el carro llega a la puerta a tiempo, acertaste.",
    ar: "لا تَسْمَع الصوت — انظر إلى بوّابات الإيقاع الصفراء ♩ على الطريق. أبقِ سرعة ثابتة حوالي 8 م/ث؛ إذا وصلت العربة إلى البوابة في وقتها ومكانها فأنت على الإيقاع.",
  },
  "道路 3 个弯——保持车在车道内（中心线 ±1m）。": {
    en: "Three curves ahead — keep the chariot in its lane (±1 m of centerline).",
    fr: "Trois virages — maintenez le char dans sa voie (±1 m de la ligne centrale).",
    es: "Tres curvas — mantén el carro en su carril (±1 m de la línea central).",
    ar: "ثلاثة منعطفات — أبقِ العربة في مسارها (±1 متر من الخط الأوسط).",
  },
  "在君表前 30m 处车速降至 4 m/s 以下，过表瞬间按「礼」键。": {
    en: "Slow below 4 m/s about 30 m before the pillar; press the Rite key the moment you pass it.",
    fr: "Ralentissez sous 4 m/s environ 30 m avant la stèle ; appuyez sur la touche rite au passage.",
    es: "Baja de 4 m/s unos 30 m antes de la estela; pulsa Rito al pasar.",
    ar: "أبطِئ تحت 4 م/ث قبل النُصب بحوالي 30 مترًا؛ واضغط مفتاح الطقس عند المرور.",
  },
  "见行人 (🚶) 在路口前要停车（速度 < 1 m/s），等行人过完再启动。": {
    en: "When you see a pedestrian (🚶) at the crossing, stop (speed < 1 m/s) and wait until they've crossed before moving on.",
    fr: "Lorsque vous voyez un piéton (🚶) au passage, arrêtez-vous (vitesse < 1 m/s) et attendez qu'il ait fini de traverser.",
    es: "Al ver a un peatón (🚶) en el cruce, detente (velocidad < 1 m/s) y espera a que termine de cruzar.",
    ar: "إذا رأيت مارة (🚶) عند المعبر، فتوقّف (سرعة < 1 م/ث) وانتظر حتى يكمل عبوره.",
  },
  "见 🦌 逃跑，**不要追**（不要左转去追）。坚持原路前行才高分。": {
    en: "When a deer (🦌) bolts, **do not chase** (don't steer left after it). Stay on your course for a high score.",
    fr: "Quand un cerf (🦌) s'enfuit, **ne le poursuivez pas** (ne tournez pas à gauche). Restez sur votre route pour un bon score.",
    es: "Cuando un ciervo (🦌) huya, **no lo persigas** (no gires a la izquierda). Mantén tu rumbo para puntuar alto.",
    ar: "إذا فرّ غزال (🦌)، **لا تتبعه** (لا تنعطف يسارًا خلفه). ابقَ على طريقك لتَحْصُل على علامة عالية.",
  },

  // 玩家称号/段位
  "学驭者": {
    en: "Chariot Apprentice",
    fr: "Apprenti charron",
    es: "Aprendiz de carro",
    ar: "مبتدئ في القيادة",
  },
  "执御君子": {
    en: "Junzi Charioteer",
    fr: "Gentleman cocher",
    es: "Jinzi del carro",
    ar: "الرَّجل الفاضل سائقًا",
  },

  // 成绩等级（后端 result.grade）
  "神驭": {
    en: "Divine Charioteer",
    fr: "Cocher divin",
    es: "Carro divino",
    ar: "السائق الإلهي",
  },
  "妙驭": {
    en: "Masterful Driver",
    fr: "Cocher magistral",
    es: "Conductor magistral",
    ar: "السائق البارع",
  },
  "中驭": {
    en: "Balanced Driver",
    fr: "Cocher équilibré",
    es: "Conductor equilibrado",
    ar: "السائق المتّزن",
  },
  "试驭": {
    en: "Trial Driver",
    fr: "Cocher d'essai",
    es: "Conductor de prueba",
    ar: "سائق تجريبي",
  },
  "学驭": {
    en: "Apprentice Driver",
    fr: "Cocher apprenti",
    es: "Conductor aprendiz",
    ar: "سائق مبتدئ",
  },
};

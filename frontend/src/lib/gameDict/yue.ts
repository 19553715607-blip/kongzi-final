// 乐（yue）游戏专属 UI 外壳文案。以中文字面量为键；zh 即键本身，只列 en/fr/es/ar。
// 学习内容（旋律音符位置数据、典故原文/术语）不收录。
import type { Lang } from "@/lib/i18n";

type E = Partial<Record<Lang, string>>;

export const YUE: Record<string, E> = {
  // 顶部 HUD
  "六艺 · 乐": {
    en: "Six Arts · Music",
    fr: "Six Arts · Musique",
    es: "Seis artes · Música",
    ar: "الفنون الستة · الموسيقى",
  },
  "编钟合鸣 · 五音相生": {
    en: "Bronze Bells Resound · Five Tones Generate",
    fr: "Cloches de bronze résonnent · Cinq tons engendrés",
    es: "Campanas de bronze resuenan · Cinco tonos se generan",
    ar: "أجراس البرونز تدوي · النغمات الخمسة تتوالد",
  },
  "击钟成乐 · 五音相生 · 合于情境 · 奏乐验收定等第": {
    en: "Strike bells to make music · five tones generate · fit the mood · play to be graded",
    fr: "Frappez les cloches pour jouer · cinq tons s'engendrent · accordez l'humeur · jouez pour être noté",
    es: "Toca las campanas para hacer música · cinco tonos se generan · ajusta al ánimo · toca para calificar",
    ar: "اضرب الأجراس تصنع لحنًا · النغمات الخمسة تتوالد · طابق المشهد · اعزف لتُقيَّم",
  },
  "乐艺": {
    en: "Music",
    fr: "Musique",
    es: "Música",
    ar: "الموسيقى",
  },

  // 加载错误
  "无法加载乐艺题库 — 请先登录": {
    en: "Could not load music scenarios — please log in first",
    fr: "Impossible de charger les scénarios musicaux — connectez-vous",
    es: "No se pudieron cargar los escenarios musicales — inicia sesión",
    ar: "تعذر تحميل سيناريوهات الموسيقى — سجّل الدخول أولًا",
  },

  // 击钟 toast
  "已足十六音 · 可奏乐验收": {
    en: "Sixteen notes reached · ready to submit",
    fr: "Seize notes atteintes · prêt à valider",
    es: "Dieciséis notas · listo para validar",
    ar: "بلغت ست عشرة نغمة · جاهز للتقديم",
  },
  "已过十二音 · 可奏乐验收": {
    en: "Twelve notes played · ready to submit",
    fr: "Douze notes jouées · prêt à valider",
    es: "Doce notas · listo para validar",
    ar: "عزفت اثنتي عشرة نغمة · جاهز للتقديم",
  },
  "乐章太短 — 至少": {
    en: "Too short — at least",
    fr: "Trop court — au moins",
    es: "Demasiado corto — al menos",
    ar: "المقطوعة أقصر من اللازم — على الأقل",
  },
  "枚音（当前": {
    en: " notes (current",
    fr: " notes (actuel",
    es: " notas (actual",
    ar: " نغمة (الحالي",
  },

  // 关卡选择卡
  "今日已奏 ✓": {
    en: "Played today ✓",
    fr: "Joué aujourd'hui ✓",
    es: "Tocado hoy ✓",
    ar: "عُزف اليوم ✓",
  },
  "五关皆可任奏 · 今日已奏": {
    en: "All five courses open. Played today",
    fr: "Les cinq parcours sont ouverts. Joué aujourd'hui",
    es: "Los cinco recorridos abiertos. Tocado hoy",
    ar: "المسارات الخمسة مفتوحة. عُزف اليوم",
  },
  "每日每关首奏计分，当日再奏练手不加分": {
    en: "Your first play of each course scores today; later runs are practice only.",
    fr: "La première exécution du jour est notée ; les autres sont l'entraînement.",
    es: "La primera interpretación del día puntúa; las demás son práctica.",
    ar: "أول عزف في كل مسار يُحتسب اليوم؛ والباقي تدريب بلا درجات.",
  },

  // 进度显示
  "乐章": {
    en: "Piece",
    fr: "Morceau",
    es: "Pieza",
    ar: "المقطوعة",
  },
  "五音相生：": {
    en: "Five tones generate: ",
    fr: "Cinq tons engendrent : ",
    es: "Cinco tonos se generan: ",
    ar: "توالد النغمات: ",
  },
  "，顺生则青弧泛起": {
    en: " — a green arc appears on forward generation",
    fr: " — un arc vert apparaît pour la génération directe",
    es: " — surge un arco verde en generación directa",
    ar: " — يَظهر قوس أخضر عند التوالد المباشر",
  },
  "审乐定声中…": {
    en: "Judging the music…",
    fr: "Examen de la musique…",
    es: "Juzgando la música…",
    ar: "جارٍ تحكيم الموسيقى…",
  },

  // 乐章谱空态 / 提示
  "击钟起乐…": {
    en: "Strike a bell to begin…",
    fr: "Frappez une cloche pour commencer…",
    es: "Toca una campana para empezar…",
    ar: "اضرب جرسًا لتبدأ…",
  },
  "点掉此音及其后": {
    en: "Tap to remove this note and all after",
    fr: "Touchez pour retirer cette note et les suivantes",
    es: "Toca para quitar esta nota y las siguientes",
    ar: "انقر لإزالة هذه النغمة وما بعدها",
  },

  // 操作按钮
  "空格": {
    en: "Space",
    fr: "Espace",
    es: "Espacio",
    ar: "مسافة",
  },
  "奏中": {
    en: "Playing",
    fr: "Jeu",
    es: "Sonando",
    ar: "يعزف",
  },
  "试听": {
    en: "Preview",
    fr: "Écoute",
    es: "Escuchar",
    ar: "استماع",
  },
  "奏乐验收": {
    en: "Submit",
    fr: "Valider",
    es: "Validar",
    ar: "تقديم",
  },
  "1-5/ASDFG 击钟 · 空格 休 · ⌫ 撤销 · Enter 验收": {
    en: "1-5/ASDFG Strike · Space Rest · ⌫ Undo · Enter Submit",
    fr: "1-5/ASDFG Frappe · Espace Pause · ⌫ Annuler · Entrée Valider",
    es: "1-5/ASDFG Tocar · Espacio Silencio · ⌫ Deshacer · Intro Validar",
    ar: "1-5/ASDFG اضرب · مساحة صمت · ⌫ تراجع · Enter تقديم",
  },

  // 进度区
  "乐艺进境": {
    en: "Music progress",
    fr: "Progrès musical",
    es: "Progreso musical",
    ar: "تقدّم الموسيقى",
  },
  "共奏": {
    en: "played",
    fr: "pièces",
    es: "veces",
    ar: "عزف",
  },
  "次": {
    en: "times",
    fr: "fois",
    es: "veces",
    ar: "مرات",
  },
  "未奏": {
    en: "Not played",
    fr: "Non joué",
    es: "No tocado",
    ar: "لم يُعزف",
  },

  // 结算卡
  "审乐": {
    en: "Reviewed",
    fr: "Examiné",
    es: "Revisado",
    ar: "التحكيم",
  },
  "（今日已奏，不再计分）": {
    en: "(Already played today; no more points)",
    fr: "(Déjà joué aujourd'hui ; pas de points)",
    es: "(Ya tocado hoy; sin puntos)",
    ar: "(عُزف اليوم؛ لا مزيد من النقاط)",
  },
  "乐艺 +": {
    en: "Music +",
    fr: "Musique +",
    es: "Música +",
    ar: "موسيقى +",
  },
  "修为 +": {
    en: "Cultivation +",
    fr: "Culture +",
    es: "Cultivo +",
    ar: "التهذيب +",
  },
  "和声 · 五音相生": {
    en: "Harmony · five tones generate",
    fr: "Harmonie · cinq tons engendrés",
    es: "Armonía · cinco tonos generados",
    ar: "الانسجام · تولّد النغمات الخمسة",
  },
  "合意 · 情境相合": {
    en: "Mood · fits the scene",
    fr: "Humeur · adaptée à la scène",
    es: "Ánimo · acorde con la escena",
    ar: "المزاج: يطابق المشهد",
  },
  "节度 · 不极不滥": {
    en: "Measure · neither excess nor scarcity",
    fr: "Mesure · ni excès ni pénurie",
    es: "Medida · ni exceso ni escasez",
    ar: "الاعتدال · لا إفراط ولا تفريط",
  },
  "五音分布 · 你的 vs 圣乐": {
    en: "Tone distribution · yours vs. canonical",
    fr: "Distribution des tons · la vôtre vs. canonique",
    es: "Distribución de tonos: la tuya vs. canónica",
    ar: "توزيع النغمات · لك مقابل المثالية",
  },
  "再奏一曲": {
    en: "Play again",
    fr: "Rejouer",
    es: "Volver a tocar",
    ar: "أعِد العزف",
  },

  // 评级（后端返回 result.grade，作外壳展示翻译）
  "神和": {
    en: "Divine Harmony",
    fr: "Harmonie divine",
    es: "Armonía divina",
    ar: "الانسجام الإلهي",
  },
  "协律": {
    en: "Tuned",
    fr: "Accordé",
    es: "Afinado",
    ar: "مضبوط",
  },
  "中和": {
    en: "Balanced",
    fr: "Juste milieu",
    es: "Equilibrado",
    ar: "متّزن",
  },
  "试律": {
    en: "Trial Tone",
    fr: "Essai tonal",
    es: "Prueba tonal",
    ar: "تجربة نبرة",
  },
  "学律": {
    en: "Apprentice",
    fr: "Apprenti",
    es: "Aprendiz",
    ar: "مبتدئ",
  },

  // ── DELTA Round 2: 音名/关卡名/情境/说明/提示/称号 ──

  // 五音唱名（zh 仍用汉字；非 zh 用 solfege）
  "宫": {
    en: "Do",
    fr: "Do",
    es: "Do",
    ar: "دو",
  },
  "商": {
    en: "Re",
    fr: "Ré",
    es: "Re",
    ar: "ري",
  },
  "角": {
    en: "Mi",
    fr: "Mi",
    es: "Mi",
    ar: "مي",
  },
  "徵": {
    en: "Sol",
    fr: "Sol",
    es: "Sol",
    ar: "سول",
  },
  "羽": {
    en: "La",
    fr: "La",
    es: "La",
    ar: "لا",
  },
  "休": {
    en: "Rest",
    fr: "Silence",
    es: "Silencio",
    ar: "صمت",
  },

  // 乐艺五关标题（后端 title）
  "祭祖大典": {
    en: "Ancestral Rite",
    fr: "Rite ancestral",
    es: "Rito ancestral",
    ar: "طقس الأجداد",
  },
  "宾客宴饮": {
    en: "Feast for Guests",
    fr: "Festin des invités",
    es: "Banquete de invitados",
    ar: "وليمة الضيوف",
  },
  "送别故人": {
    en: "Farewell at the Bridge",
    fr: "Adieu au pont",
    es: "Despedida en el puente",
    ar: "وداع عند الجسر",
  },
  "闲居抚琴": {
    en: "Quiet Solitude",
    fr: "Solitude paisible",
    es: "Soledad serena",
    ar: "العزلة الهادئة",
  },
  "出征誓师": {
    en: "Armies to War",
    fr: "Armées à la guerre",
    es: "Ejércitos en marcha",
    ar: "الجيوش إلى المعركة",
  },

  // 情境/氛围（后端 mood_label）
  "庄重肃穆": {
    en: "Solemn",
    fr: "Solennel",
    es: "Solemne",
    ar: "مهيب",
  },
  "雍容和乐": {
    en: "Gracious and joyful",
    fr: "Gracieux et joyeux",
    es: "Gentil y alegre",
    ar: "رَحيب وفرِح",
  },
  "哀而不伤": {
    en: "Sorrow without grief",
    fr: "Tristesse sans accablement",
    es: "Triste sin angustia",
    ar: "حزن بلا انكسار",
  },
  "闲适中和": {
    en: "Serene balance",
    fr: "Équilibre serein",
    es: "Equilibrio sereno",
    ar: "صفاء واعتدال",
  },
  "慷慨激昂": {
    en: "Ardour and vigor",
    fr: "Ardeur et vigueur",
    es: "Ardor y vigor",
    ar: "حماس وقوة",
  },

  // 场景 setting（后端 setting 字段）
  "宗庙之中，列祖列宗在上。须奏一段乐，以礼祖先。": {
    en: "In the ancestral temple, forebears look down. Play a piece to honor them.",
    fr: "Dans le temple ancestral, les aïeux veillent. Jouez un morceau en leur honneur.",
    es: "En el templo ancestral, los antepasados contemplan. Toca una pieza en su honor.",
    ar: "في المعبد العائلي، الأجداد أعلاه. اعزف مقطوعة لتكريمهم.",
  },
  "贵宾临席，举酒言欢。奏一段乐，宾主皆悦而不失礼。": {
    en: "Distinguished guests gather; cups raised in joy. Play so all delight without impropriety.",
    fr: "Des invités distingués se rassemblent ; coups levés. Jouez pour que tous se réjouissent sans inconvenance.",
    es: "Invitados distinguidos se reúnen; copas en alto. Toca para que todos se alegren sin incorrección.",
    ar: "حضر الضيوف الكرام، والأكواب مرفوعة. اعزف لِيَسعَدَ الجميع بغير خروج عن الأدب.",
  },
  "故人远行，相送至灞桥。奏一段乐，托别情，但不可过悲。": {
    en: "A friend departs far; see them off at Ba Bridge. Play a piece to convey parting without over-sorrow.",
    fr: "Un ami s'en va loin ; accompagnez-le jusqu'au pont Ba. Jouez un morceau pour dire adieu sans excès.",
    es: "Un amigo parte lejos; despídelo en el Puente Ba. Toca una pieza para despedir sin exceso.",
    ar: "صديق يسافر بعيدًا؛ شيّعه عند جسر با. اعزف مقطوعة تُعبّر عن الفراق دون إفراط في الحزن.",
  },
  "退朝归来，独坐林下。无目的、无所求，纯然抚琴。": {
    en: "Returned from court, alone beneath the trees. No aim, no desire — simply play.",
    fr: "Rentré de la cour, seul sous les arbres. Sans but ni désir — simplement jouer.",
    es: "De vuelta de la corte, solo bajo los árboles. Sin fin ni deseo — simplemente tocar.",
    ar: "عُدت من الديوان، وحيدًا تحت الشجر. لا غرض ولا مطلوب — فقط اعزف.",
  },
  "三军列阵，将出征讨贼。奏一段乐，振士气，但不可流于杀伐。": {
    en: "Three armies form ranks, about to march. Play to raise morale, yet not to bloodlust.",
    fr: "Trois armées rangent leurs rangs, sur le point de partir. Jouez pour élever le moral, non pour la soif de sang.",
    es: "Tres ejércitos forman filas, a punto de partir. Toca para alentar la moral, no por sed de sangre.",
    ar: "الجيوش الثلاثة تصطِفّ، وشيكَة الزحف. اعزف لرفع المعنويات، لا لتهييج القتال.",
  },

  // 场景 hint（后端 hint 字段）
  "庄重之乐多用宫商（沉稳之音），少用角徵羽（轻快之音）。避免单音连续重复。": {
    en: "Solemn music favors Do and Re (steady tones); use fewer Mi, Sol, La (light notes). Avoid repeating one note.",
    fr: "La musique solennelle privilégie Do et Ré (tons stables) ; évitez Mi, Sol, La (notes légères). Évitez les répétitions.",
    es: "La música solemne favorece Do y Re (tonos estables); use menos Mi, Sol, La (notas ligeras). Evite repetir una nota.",
    ar: "الموسيقى المهيبة تُفضّل دو وري (نغمات رصينة)؛ وأقلَّ من مي وسول ولا (نغمات خفيفة). وتجنّب تكرار نغمة واحدة.",
  },
  "宴乐应雍容，五音相对均衡；徵音（明亮）稍多一些为佳。": {
    en: "Feast music should be gracious with balanced tones; a little more Sol (bright) suits.",
    fr: "La musique de festin doit être gracieuse, tons équilibrés ; un peu plus de Sol (brillant) convient.",
    es: "La música de banquete debe ser gentil, con tonos equilibrados; algo más de Sol (brillante) sienta bien.",
    ar: "موسيقى الوليمة رَحيبة، والنغمات متوازنة؛ ويُستحسن زيادة سول (المشرقة) قليلًا.",
  },
  "送别之乐重在「哀而不伤」——商角稍多以寄思，但仍要有宫的稳定为底。": {
    en: "Farewell music is 'sorrow without grief' — more Re and Mi for longing, yet Do stays as a steady base.",
    fr: "La musique d'adieu est « tristesse sans accablement » — plus de Ré et Mi pour la nostalgie, mais Do comme base stable.",
    es: "La música de despedida es «triste sin angustia» — más Re y Mi para la nostalgia, pero Do como base estable.",
    ar: "موسيقى الوداع «حزن بلا انكسار» — زِد ري ومي للحنين، مع إبقاء دو أساسًا ثابتًا.",
  },
  "中和之乐五音均衡——这正是「兴于诗，立于礼，成于乐」的境界。": {
    en: "Balanced music evens all five tones — this is the ideal of 'aroused by Odes, established by Rite, completed by Music'.",
    fr: "La musique équilibrée égalise les cinq tons — c'est l'idéal de « s'éveiller par les Odes, s'établir par le Rite, s'accomplir par la Musique ».",
    es: "La música equilibrada iguala los cinco tonos — es el ideal de «despertar por las Odas, establecerse por el Rito, completarse por la Música».",
    ar: "الموسيقى المتّزنة تُساوي بين النغمات الخمس — هذا مَقام «الاستيقاظ بالشعر، والثبات بالطقس، والاكتمال بالموسيقى».",
  },
  "誓师之乐羽徵（高亢明亮）多，但仍要有宫的厚重——孔子谓武乐「尽美未尽善」可为戒。": {
    en: "War-music leans on La and Sol (high, bright), yet Do must weigh it — Confucius warned that martial music is 'perfect in beauty, not in goodness'.",
    fr: "La musique de guerre privilégie La et Sol (hauts et brillants), mais Do doit peser — Confucius disait que la musique martiale est « parfaite en beauté, non en bonté ».",
    es: "La música bélica se inclina a La y Sol (altos y brillantes), pero Do debe contrapesar — Confucio advirtió que la música marcial es «perfecta en belleza, no en bondad».",
    ar: "موسيقى الحشد تُكثِف لا وسول (العاليتين المشرقتين)، لكن لا بدّ من ثِقل دو — فقد حذّر كنفوشيوس أن موسيقى الحرب «كاملة الجمال لا كاملة الخير».",
  },

  // 玩家称号（进度面板）
  "学律者": {
    en: "Music Apprentice",
    fr: "Apprenti musicien",
    es: "Aprendiz de música",
    ar: "مبتدئ الموسيقى",
  },
  "知音": {
    en: "Music Connoisseur",
    fr: "Connaisseur musical",
    es: "Conocedor musical",
    ar: "ذوّاقة الموسيقى",
  },
  "调律": {
    en: "Tuner",
    fr: "Accordeur",
    es: "Afinador",
    ar: "ضابط النغم",
  },
};

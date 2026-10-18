// 数（math）游戏专属 UI 外壳文案。以中文字面量为键；zh 即键本身，只列 en/fr/es/ar。
// 学习内容（题目数字、题意 setting、等级 grade、kind_label、feedback、refs）不收录。
// 跨游戏公共文案（称号/最佳/新解锁/去登录/← 六艺 等）见 common.ts，此处不重复。
import type { Lang } from "@/lib/i18n";

type E = Partial<Record<Lang, string>>;

export const MATH: Record<string, E> = {
  // 加载 / 错误
  "无法加载数艺题库 — 请先登录": {
    en: "Couldn't load the Math bank — please log in first",
    fr: "Impossible de charger la banque de calcul — connectez-vous d'abord",
    es: "No se pudo cargar el banco de cálculo: inicia sesión primero",
    ar: "تعذّر تحميل بنك الحساب — سجّل الدخول أولًا",
  },

  // 顶部 HUD
  "六艺 · 数": {
    en: "Six Arts · Numeracy",
    fr: "Six arts · Calcul",
    es: "Seis artes · Cálculo",
    ar: "الفنون الستة · الحساب",
  },
  "量仓分赈 · 均输衰分": {
    en: "Granary Sharing · Fair Distribution",
    fr: "Partage du grenier · Répartition équitable",
    es: "Reparto del granero · Distribución justa",
    ar: "توزيع المخزن · القسمة العادلة",
  },
  "出粮入斗 · 按权重均分 · 封仓验收定等第": {
    en: "Pour grain into the measures · split by weight · seal the granary to grade",
    fr: "Versez le grain · répartissez selon le poids · scellez pour noter",
    es: "Vierte el grano · reparte por peso · sella el granero para calificar",
    ar: "صبّ الحبوب · وزّعها بالوزن · اختم المخزن للتقييم",
  },
  数艺: { en: "Numeracy", fr: "Calcul", es: "Cálculo", ar: "الحساب" },

  // 关卡卡徽章 / 元信息
  "今日已校 ✓": {
    en: "Checked today ✓",
    fr: "Vérifié aujourd'hui ✓",
    es: "Comprobado hoy ✓",
    ar: "فُحص اليوم ✓",
  },
  共: { en: "Total", fr: "Total", es: "Total", ar: "المجموع" },
  项: { en: "items", fr: "postes", es: "ítems", ar: "عناصر" },
  "七关皆可任算 · 今日已校": {
    en: "All seven levels are open · checked today",
    fr: "Les sept niveaux sont ouverts · vérifié aujourd'hui",
    es: "Los siete niveles están abiertos · comprobado hoy",
    ar: "المستويات السبعة متاحة · فُحص اليوم",
  },
  "· 每日每关首算计分，当日再算练手不加分": {
    en: " · first solve of each level scores daily; re-solves that day are practice only",
    fr: " · première solution du jour par niveau ; les autres sont de l'entraînement",
    es: " · la primera solución del día puntúa; repetir es solo práctica",
    ar: " · تُحسب أول محاولة يوميًا؛ أما التكرار فهو تدريب فقط",
  },

  // 关卡提示 overlay（principle 为学习内容，保留；“法曰”为外壳标签）
  法曰: { en: "The rule: ", fr: "La règle : ", es: "La regla: ", ar: "القاعدة: " },

  // 提交中 / 操作按钮
  "封仓核验中…": {
    en: "Sealing granary…",
    fr: "Scellement du grenier…",
    es: "Sellando el granero…",
    ar: "جارٍ ختم المخزن…",
  },
  封仓验收: {
    en: "Seal & grade",
    fr: "Sceller et noter",
    es: "Sellar y calificar",
    ar: "اختم وقيّم",
  },
  回粮: { en: "Pull back", fr: "Retirer", es: "Retirar", ar: "استرجاع" },
  出粮: { en: "Pour out", fr: "Verser", es: "Verter", ar: "صبّ" },
  "←→ 选村 · ↑ 出粮 · ↓ 回粮 · Enter 验收": {
    en: "←→ choose village · ↑ pour · ↓ pull back · Enter grade",
    fr: "←→ choisir le village · ↑ verser · ↓ retirer · Enter noter",
    es: "←→ elegir aldea · ↑ verter · ↓ retirar · Enter calificar",
    ar: "←→ اختر القرية · ↑ صبّ · ↓ استرجع · Enter للتقييم",
  },

  // 进度区
  "数艺进境 ·": {
    en: "Numeracy progress ·",
    fr: "Progrès en calcul ·",
    es: "Progreso en cálculo ·",
    ar: "تقدّم الحساب ·",
  },
  关: { en: "levels", fr: "niveaux", es: "niveles", ar: "مستويات" },
  均分: { en: "avg", fr: "moy.", es: "media", ar: "المعدل" },
  共算: { en: "solved", fr: "résolutions", es: "intentos", ar: "المحاولات" },
  次: { en: "times", fr: "fois", es: "veces", ar: "مرات" },
  未算: {
    en: "Not solved",
    fr: "Non résolu",
    es: "Sin resolver",
    ar: "لم يُحسب",
  },

  // 剩余量仪表盘
  已分: { en: "Allocated", fr: "Distribué", es: "Distribuido", ar: "وُزّع" },
  仓中剩余: {
    en: "Left in granary",
    fr: "Reste au grenier",
    es: "Queda en el granero",
    ar: "المتبقي في المخزن",
  },

  // 结算卡
  核验: { en: "Review", fr: "Vérification", es: "Revisión", ar: "مراجعة" },
  "（今日已校，不再计分）": {
    en: "(Already checked today — no score)",
    fr: "(Déjà vérifié aujourd'hui — pas de point)",
    es: "(Ya comprobado hoy — sin puntos)",
    ar: "(فُحص اليوم — لا تُحتسب نقاط)",
  },
  修为: { en: "Virtue", fr: "Vertu", es: "Virtud", ar: "فضيلة" },
  "合总 · 总量相合": {
    en: "Sum · totals match",
    fr: "Total · sommes concordes",
    es: "Suma · totales coinciden",
    ar: "المجموع · تطابق الكل",
  },
  "均衡 · 各得其分": {
    en: "Balance · each its due",
    fr: "Équilibre · chacun sa part",
    es: "Equilibrio · cada uno lo suyo",
    ar: "التوازن · لكلِّ نصيبه",
  },
  "节度 · 不过其量": {
    en: "Measure · no excess",
    fr: "Mesure · sans excès",
    es: "Mesura · sin exceso",
    ar: "الاعتدال · لا إفراط",
  },
  对象: { en: "Target", fr: "Cible", es: "Objetivo", ar: "الهدف" },
  你的分配: { en: "Your share", fr: "Votre part", es: "Su parte", ar: "حصتك" },
  圣算揭晓: {
    en: "The ideal",
    fr: "Le calcul idéal",
    es: "El reparto ideal",
    ar: "الحساب الأمثل",
  },
  再算一次: {
    en: "Try again",
    fr: "Recalculer",
    es: "Intentar de nuevo",
    ar: "أعد المحاولة",
  },
  换一关: {
    en: "Another level",
    fr: "Un autre niveau",
    es: "Otro nivel",
    ar: "مستوى آخر",
  },

  // ── 关卡名 / 课目名（后端 scenario.title） ──
  "均输三乡赋税": {
    en: "Equal Transport: Tax of Three Villages",
    fr: "Répartition équitable : l'impôt des trois villages",
    es: "Reparto equitativo: impuesto de tres aldeas",
    ar: "النقل العادل: ضريبة القرى الثلاث",
  },
  "五子衰分父遗": {
    en: "Descending Share: A Father's Legacy to Five Sons",
    fr: "Part dégressive : l'héritage du père pour cinq fils",
    es: "Partición decreciente: herencia a cinco hijos",
    ar: "القسمة التنازلية: ميراث الأب للبنين الخمسة",
  },
  "四州分赈灾粮": {
    en: "Relief Grain to Four Provinces",
    fr: "Grain de secours pour quatre provinces",
    es: "Grano de socorro a cuatro provincias",
    ar: "حبوب الإغاثة لأقاليم أربعة",
  },
  "三班分劳役": {
    en: "Corvée Shared by Three Crews",
    fr: "Corvée partagée par trois équipes",
    es: "Trabajo compartido por tres cuadrillas",
    ar: "السخرة المقسمة على ثلاث فرق",
  },
  "五县分驻军": {
    en: "Garrison Troops for Five Counties",
    fr: "Troupes de garnison pour cinq comtés",
    es: "Tropas de guarnición para cinco condados",
    ar: "جنود الحامية لخمس مقاطعات",
  },
  "水渠工料筹算": {
    en: "Work-Count for Canal Repairs",
    fr: "Calcul des matériaux des canaux",
    es: "Cálculo de materiales para canales",
    ar: "حساب مواد ترميم القنوات",
  },
  "市井平价断案": {
    en: "Setting Fair Prices at Market",
    fr: "Jugement : prix équitables au marché",
    es: "Decidiendo precios justos en el mercado",
    ar: "تقويم الأسعار في السوق",
  },

  // ── 课目类别标签（后端 kind_label） ──
  "均输": {
    en: "Equal Transport",
    fr: "Répartition équitable",
    es: "Reparto equitativo",
    ar: "النقل العادل",
  },
  "衰分": {
    en: "Descending Share",
    fr: "Part dégressive",
    es: "Partición decreciente",
    ar: "القسمة التنازلية",
  },
  "治水筹算": {
    en: "Water Works",
    fr: "Hydraulique",
    es: "Hidráulica",
    ar: "أشغال الري",
  },
  "九章断案": {
    en: "Classic Case",
    fr: "Cas classique",
    es: "Caso clásico",
    ar: "قضية كلاسيكية",
  },

  // ── 题意叙述 setting（数字/单位保留） ──
  "某县须共纳 90 担税米，按田亩比例公平分摊给三乡。": {
    en: "A county must deliver 90 dan of tax rice, shared fairly among three villages according to their farmland.",
    fr: "Un comté doit fournir 90 dan de riz d'impôt, répartis équitablement entre trois villages selon leurs champs.",
    es: "Un condado debe entregar 90 dan de arroz, repartidos equitativamente entre tres aldeas según sus tierras.",
    ar: "يجب على مقاطعة أن تؤدي 90 دان من أرز الضريبة، توزّع بالعدل على ثلاث قرى حسب مساحة الحقول.",
  },
  "父留 100 金，五子按长幼递减分（5:4:3:2:1）。问各得几何？": {
    en: "A father leaves 100 jin of gold; five sons share it in descending order (5:4:3:2:1). How much does each get?",
    fr: "Un père laisse 100 jin d'or ; cinq fils se partagent l'héritage en ordre dégressif (5:4:3:2:1). Combien chacun ?",
    es: "Un padre deja 100 jin de oro; cinco hijos lo reparten en orden decreciente (5:4:3:2:1). ¿Cuánto recibe cada uno?",
    ar: "ترك والد 100 jin من الذهب؛ يقسمها خمسة أبناء تنازليًا (5:4:3:2:1). كم يأخذ كلّ منهم؟",
  },
  "州府发 200 石赈灾粮，按「人口 × 灾损率」分给四州。多灾多人之州得多。": {
    en: "The prefecture issues 200 shi of relief grain, split among four provinces by 'population × disaster loss rate'. Harder-hit and more populous provinces get more.",
    fr: "La préfecture distribue 200 shi de riz de secours, répartis entre quatre provinces selon « population × taux de perte ». Les plus touchées et les plus peuplées reçoivent plus.",
    es: "La prefectura entrega 200 shi de grano de socorro, repartidos entre cuatro provincias según «población × tasa de desastre». Las más pobladas y dañadas reciben más.",
    ar: "تُصدر الولاية 200 shi من حبوب الإغاثة، توزّع على أربعة أقاليم بحسب «عدد السكان × نسبة الضرر». فالأكثر سكانًا وتضرّرًا تأخذ أكثر.",
  },
  "30 工日劳役，三班按「壮丁数 ÷ 体力差」分担——壮丁多体力好的班多担。": {
    en: "30 work-days of corvée are shared by three crews by 'able men ÷ strength gap' — crews with more able-bodied men carry more.",
    fr: "30 jours de corvée sont partagés par trois équipes selon « hommes valides ÷ écart de force » — les équipes plus fortes en font plus.",
    es: "30 días de trabajo se reparten entre tres cuadrillas según «hombres aptos ÷ diferencia de fuerza»: las más fuertes cargan más.",
    ar: "ثلاثون يوم سُخرة تقسمها ثلاث فرق بحسب «الأقوياء ÷ فارق القدرة» — فالفريق الأقوى يتحمّل أكثر.",
  },
  "兵部派 500 兵驻五县，按「兵源 + 战略权 × 2」分配。": {
    en: "The Ministry of War stations 500 troops across five counties, allocated by 'recruits + strategic weight × 2'.",
    fr: "Le Ministère de la Guerre stationne 500 soldats dans cinq comtés, selon « recrues + poids stratégique × 2 ».",
    es: "El Ministerio de Guerra estaciona 500 soldados en cinco condados, según «reclutas + peso estratégico × 2».",
    ar: "تُرقل وزارة الحرب 500 جندي في خمس مقاطعات، توزّع بحسب «المصادر البشرية + الأهمية الاستراتيجية × 2».",
  },
  "雨季前要把 120 车石料分给四段水渠。玩家需权衡险情、人口与施工难度。": {
    en: "Before the rains, 120 cartloads of stone must be split among four canal sections. Weigh flood risk, population served, and construction difficulty.",
    fr: "Avant les pluies, 120 charretées de pierres doivent être réparties entre quatre sections de canal. Pesez le risque d'inondation, la population et la difficulté des travaux.",
    es: "Antes de las lluvias, 120 carretadas de piedra deben repartirse entre cuatro tramos de canal. Pondere el riesgo, la población y la dificultad.",
    ar: "قبل موسم الأمطار، يجب توزيع 120 عربة حجر على أربعة أقسام من القناة. وازن بين خطر الفيضان وعدد السكان وصعوبة البناء.",
  },
  "集市粮价波动，县里拿出 300 贯平准金，按缺粮、人口与商旅阻滞分给三市。": {
    en: "Grain prices swing in the market; the county spends 300 guan of stabilization funds, split among three markets by shortage, population, and trade disruption.",
    fr: "Les prix du grain fluctuvent ; le comté consacre 300 guan de fonds de régulation, répartis entre trois marchés selon la disette, la population et l'interruption du commerce.",
    es: "Los precios del grano oscilan; el condado destina 300 guan de estabilización, repartidos en tres mercados según escasez, población y bloqueo comercial.",
    ar: "تتأرجح أسعار الحبوب في السوق؛ فتخصص المقاطعة 300 guan من صندوق الاستقرار، توزّع على ثلاث أسواق بحسب العجز والسكان وتعطّل التجارة.",
  },

  // ── 提示 hint（数字/公式保留） ──
  "「均输」按权重正比例分配。田亩越多承担越多。总田亩 33 亩 → 每亩约 2.73 担。": {
    en: "'Equal Transport' splits proportionally by weight. More farmland means more share. Total 33 mu → about 2.73 dan per mu.",
    fr: "« Répartition équitable » : partage proportionnel au poids. Plus de champs, plus de part. Total 33 mu → environ 2,73 dan par mu.",
    es: "«Reparto equitativo»: proporcional al peso. Más tierra, más parte. Total 33 mu → unos 2,73 dan por mu.",
    ar: "«النقل العادل» يوزّع تناسبيًا بالوزن. فكلّما كثرت الأرض زاد النصيب. المجموع 33 mu → نحو 2,73 dan للمُو.",
  },
  "「衰分」按爵次/长幼递减。五子比例 5:4:3:2:1，总份 15 → 100 ÷ 15 ≈ 6.67 金/份。": {
    en: "'Descending share' decreases by rank/age. Five sons in ratio 5:4:3:2:1, total 15 parts → 100 ÷ 15 ≈ 6.67 jin per part.",
    fr: "« Part dégressive » selon le rang/l'âge. Cinq fils en 5:4:3:2:1, total 15 parts → 100 ÷ 15 ≈ 6,67 jin par part.",
    es: "«Partición decreciente» por rango/edad. Cinco hijos en 5:4:3:2:1, total 15 partes → 100 ÷ 15 ≈ 6,67 jin por parte.",
    ar: "«القسمة التنازلية» تتناقص حسب الرتبة/السن. الخمسة بنسبة 5:4:3:2:1، المجموع 15 جزءًا → 100 ÷ 15 ≈ 6,67 jin للجزء.",
  },
  "权重 = 人口 × 灾损率。总权重 = 10×0.8 + 6×0.5 + 4×0.3 + 5×0.4 = 13.2。": {
    en: "Weight = population × disaster rate. Total weight = 10×0.8 + 6×0.5 + 4×0.3 + 5×0.4 = 13.2.",
    fr: "Poids = population × taux de perte. Poids total = 10×0,8 + 6×0,5 + 4×0,3 + 5×0,4 = 13,2.",
    es: "Peso = población × tasa de desastre. Peso total = 10×0,8 + 6×0,5 + 4×0,3 + 5×0,4 = 13,2.",
    ar: "الوزن = عدد السكان × نسبة الضرر. الوزن الكلي = 10×0,8 + 6×0,5 + 4×0,3 + 5×0,4 = 13,2.",
  },
  "权重 = 壮丁 ÷ 体力差。甲班 20÷1=20，乙 15÷2=7.5，丙 10÷3=3.33。总 30.83。": {
    en: "Weight = able men ÷ strength gap. Crew A 20÷1=20, B 15÷2=7.5, C 10÷3=3.33. Total 30.83.",
    fr: "Poids = hommes valides ÷ écart de force. Équipe A 20÷1=20, B 15÷2=7,5, C 10÷3=3,33. Total 30,83.",
    es: "Peso = hombres aptos ÷ diferencia de fuerza. Cuadrilla A 20÷1=20, B 15÷2=7,5, C 10÷3=3,33. Total 30,83.",
    ar: "الوزن = الأقوياء ÷ فارق القدرة. الفرقة أ 20÷1=20، ب 15÷2=7,5، ج 10÷3=3,33. المجموع 30,83.",
  },
  "权重 = 兵源 + 战略权×2。例如 A 县：8+3×2=14。总权重 = 14+10+8+12+6 = 50。每权重 10 兵。": {
    en: "Weight = recruits + strategic weight×2. E.g. County A: 8+3×2=14. Total = 14+10+8+12+6 = 50. Ten troops per unit.",
    fr: "Poids = recrues + poids stratégique×2. Ex. comté A : 8+3×2=14. Total = 14+10+8+12+6 = 50. Dix soldats par unité.",
    es: "Peso = reclutas + peso estratégico×2. Ej. condado A: 8+3×2=14. Total = 14+10+8+12+6 = 50. Diez soldados por unidad.",
    ar: "الوزن = المصادر البشرية + الأهمية×2. مثالًا: المقاطعة أ 8+3×2=14. المجموع = 14+10+8+12+6 = 50. عشرة جنود لكل وحدة.",
  },
  "建议先重视险情和人口；施工难度越高，投入越多，但不能让其他渠段失守。": {
    en: "Prioritize flood risk and population first; harder sections need more input, but don't let the other canal segments fail.",
    fr: "Privilégiez d'abord le risque d'inondation et la population ; les sections difficiles exigent plus, sans laisser les autres sections à l'abandon.",
    es: "Prioriza el riesgo y la población; las secciones difíciles requieren más, pero no abandones los demás tramos.",
    ar: "قدّم خطر الفيضان والسكان أولًا؛ فالأقسام الأصعب تحتاج جهدًا أكبر، لكن لا تُهمِل بقية القنوات.",
  },
  "这是一个数学断案：分得太平均会误伤重灾市，太偏又会引发怨气。": {
    en: "This is a judgment in numbers: sharing too evenly shortchanges hard-hit markets; skewing too much breeds resentment.",
    fr: "C'est un jugement chiffré : un partage trop égal lèse les marchés sinistrés ; un partage trop partial engendre du ressentiment.",
    es: "Es un caso numérico: repartir demasiado parejo perjudica a los mercados dañados; sesgar demasiado genera resentimiento.",
    ar: "هذه قضيّة حسابية: التوزيع المتساوي يُجحف بالأسواق المنكوبة، والإفراط في التحيّد يُثير السخط.",
  },

  // ── 义理 principle（法曰之后） ──
  "先按田亩承受力分摊，再观察是否需要照顾民困。": {
    en: "First share by farmland capacity, then see whether hardship needs relief.",
    fr: "Répartissez d'abord selon la capacité des champs, puis voyez si l'indigence exige un secours.",
    es: "Primero reparte según la capacidad de la tierra, luego observa si la indigencia pide alivio.",
    ar: "اقسم أولًا حسب طاقة الأرض، ثم انظر هل تحتاج الشدائد إلى إغاثة.",
  },
  "衰分重名分次第，但现代讨论中也可观察需要与照护。": {
    en: "Descending share honors rank and order, yet in modern discussion one may also weigh need and care for the vulnerable.",
    fr: "La part dégressive honore le rang, mais le débat moderne peut aussi peser le besoin et la protection des faibles.",
    es: "La parte decreciente honra el rango, pero el debate moderno también puede ponderar la necesidad y el cuidado de los débiles.",
    ar: "القسمة التنازلية تراعي الرتبة، لكن في النقاش المعاصر قد يُراعى أيضًا الحاجة ورعاية الضعفاء.",
  },
  "赈灾粮优先看人口与灾情，路程只影响调度，不应压过生民之急。": {
    en: "Relief grain prioritizes population and disaster; distance only affects logistics and must not outweigh the people's urgent need.",
    fr: "Le grain de secours priorise la population et le désastre ; la distance ne touche que la logistique et ne doit pas l'emporter sur l'urgence du peuple.",
    es: "El grano de socorro prioriza población y desastre; la distancia solo afecta la logística y no debe pesar más que la urgencia del pueblo.",
    ar: "حبوب الإغاثة تقدّم السكان والكارثة؛ فالمسافة تؤثر في اللوجستيك فقط، ولا ينبغي أن تتجاوز حاجة الناس الملحّة.",
  },
  "劳役分配既看人数，也看承受能力；弱者照护可作为修正项。": {
    en: "Corvée allocation counts heads and capacity; care for the weak can be a correction term.",
    fr: "La répartition de la corvée compte les personnes et la capacité ; la protection des faibles peut être un terme correctif.",
    es: "La corvée cuenta personas y capacidad; el cuidado de los débiles puede ser un factor correctivo.",
    ar: "تقسيم السخرة يراعي العدد والقدرة؛ ورعاية الضعفاء عامل تصحيحي.",
  },
  "驻军分配须兼顾兵源和战略位置，也要避免扰民过重。": {
    en: "Garrison allocation must balance recruits and strategic position, while avoiding burdening the people too heavily.",
    fr: "La garnison doit concilier recrues et position stratégique, sans accabler outre mesure la population.",
    es: "La guarnición debe equilibrar reclutas y posición estratégica, sin gravar demasiado al pueblo.",
    ar: "توزيع الحامية يوازن بين المصادر البشرية والموقع الاستراتيجي، مع تجنّب إثقال كاهل الناس.",
  },
  "治水筹算不只看工程量，还要先保民命，再求长久安定。": {
    en: "Water works count not only engineering but first saving lives, then seeking lasting stability.",
    fr: "L'hydraulique ne compte pas seulement les travaux, mais d'abord sauver des vies, puis chercher la stabilité durable.",
    es: "La hidráulica no mira solo la obra, sino primero salvar vidas y luego buscar estabilidad duradera.",
    ar: "حساب الريّ لا ينظر إلى حجم العمل فحسب، بل يحفظ الأرواح أولًا، ثم يطلب الأمن الدائم.",
  },
  "平价不是压低一切价格，而是让急困处先得稳定。": {
    en: "Stabilizing prices is not about driving all prices down, but letting the needy places gain stability first.",
    fr: "Résorber les prix ne revient pas à tout baisser, mais à laisser les lieux dans le besoin obtenir la stabilité d'abord.",
    es: "Estabilizar precios no es bajarlo todo, sino dejar que los lugares necesitados logren estabilidad primero.",
    ar: "تقويم الأسعار ليس خفضها كلّها، بل أن تنال الأماكن المحتاجة الاستقرار أوّلًا.",
  },

  // ── 等级/段位（后端 grade 与 progress.title） ──
  "衡均": {
    en: "Balanced",
    fr: "Équilibre parfait",
    es: "Equilibrio perfecto",
    ar: "الميزان",
  },
  "通算": {
    en: "Master Calculator",
    fr: "Calculateur émérite",
    es: "Gran calculador",
    ar: "الحاسب الماهر",
  },
  "中算": {
    en: "Adept",
    fr: "Bon calculateur",
    es: "Buen calculador",
    ar: "الحاسب المتقن",
  },
  "试算": {
    en: "Apprentice",
    fr: "Calculateur débutant",
    es: "Aprendiz",
    ar: "المتدرّب",
  },
  "学算": {
    en: "Novice",
    fr: "Étudiant en calcul",
    es: "Aprendiz de cálculo",
    ar: "طالب الحساب",
  },
  "学算者": {
    en: "Numeracy Learner",
    fr: "Apprenti calculateur",
    es: "Aprendiz de cálculo",
    ar: "طالب الحساب",
  },

  // ── 评判 feedback tips（后端 _feedback） ──
  "总量尚未合准：治数先要使账目相符，仓廪、工日、兵额不可凭感觉增减。": {
    en: "The total isn't quite matched: in governance by numbers, accounts must agree first; granary, work-days, and troop counts must not rise or fall by guesswork.",
    fr: "Le total n'est pas encore accordé : gouverner par les chiffres, c'est d'abord faire concorder les comptes ; grenier, jours de corvée, troupes ne se font pas au hasard.",
    es: "El total no cuadra aún: gobernar con números exige cuentas concordadas; granero, jornadas y tropas no cambian por intuición.",
    ar: "المجموع لم يتطابق بعد؛ فالحكم بالحساب يبدأ بموافقة الدفاتر، فمخزن الحبوب وأيام السخرة وعدد الجنود لا يُزاد ولا يُنقص بالحدس.",
  },
  "合总有度：总额控制得较稳，具备公共分配的基本秩序。": {
    en: "Sum is well-kept: the total is held steadily, showing the basic order of public distribution.",
    fr: "Le total est maîtrisé : la somme est tenue, avec l'ordre fondamental de la répartition publique.",
    es: "La suma está bien llevada: el total se mantiene, con el orden básico de la distribución pública.",
    ar: "المجموع مضبوط: الكلّ مستقرّ، وفيه النظام الأساسي للتوزيع العام.",
  },
  "分配原则还不够清晰：可重新权衡人口、灾情、路程、能力等指标。": {
    en: "The principle of distribution isn't clear enough: re-weigh indicators like population, disaster, distance, and capacity.",
    fr: "Le principe de répartition n'est pas assez net : re-pesez population, désastre, distance, capacité.",
    es: "El principio de reparto no está claro: vuelve a ponderar población, desastre, distancia, capacidad.",
    ar: "مبدأ التوزيع لم يتّضح بعد: أعد وزن السكان والكارثة والمسافة والقدرة.",
  },
  "均衡较好：各项分配与情境权重接近，体现「不患寡而患不均」。": {
    en: "Balance is good: each share is close to the context's weights, embodying 'worry not of scarcity but of unevenness'.",
    fr: "L'équilibre est bon : chaque part approche les poids du contexte, illustrant « ne pas craindre la pénurie mais l'inégalité ».",
    es: "El equilibrio es bueno: cada parte se acerca a los pesos del contexto, encarnando «no temáis la escasez sino la desigualdad».",
    ar: "التوازن جيّد: كل حصّة قريبة من أوزان الموقف، وتجسّد «لا يخشون القلة بل عدم العدل».",
  },
  "倾斜略重：照顾重点对象可以，但过度集中会损伤其余人的安定感。": {
    en: "The tilt is a bit heavy: favoring key targets is fine, but over-concentration erodes others' sense of security.",
    fr: "Le penchant est un peu fort : favoriser les cibles clés, soit, mais la concentration excessive nuit à la sécurité des autres.",
    es: "La inclinación es algo fuerte: favorecer objetivos clave está bien, pero la concentración excesiva daña la seguridad de los demás.",
    ar: "الميل ثقيل قليلًا: رعاية الجهات المهمّة جائزة، لكن التركيز المفرط يُزعزع أمن الآخرين.",
  },
  "节度尚可：没有让单一对象过度占用资源，保留了整体和气。": {
    en: "Measure is acceptable: no single target hoards resources, preserving overall harmony.",
    fr: "La mesure est acceptable : nul poste n'accapare les ressources, préservant l'harmonie d'ensemble.",
    es: "La mesura es aceptable: ningún objetivo acapara recursos, preservando la armonía general.",
    ar: "الاعتدال مقبول: لا يحتكر جهةٌ واحدة الموارد، فيُحفظ الانسجام العام.",
  },
  "可称衡均：既合算，也合情，已接近数艺中的治理判断。": {
    en: "Worthy of 'Balanced': numbers and feeling both align, approaching the judgment of governance within the art of numeracy.",
    fr: "Digne de l'équilibre : chiffres et sens s'accordent, approchant le jugement de gouvernement propre au calcul.",
    es: "Digno de 'Equilibrio': números y sentido concuerdan, acercándose al juicio de gobierno del cálculo.",
    ar: "يُقال له «الميزان»: وافق الحسابُ والوجدان، وقارب حكم السياسة في فنّ الحساب.",
  },
};

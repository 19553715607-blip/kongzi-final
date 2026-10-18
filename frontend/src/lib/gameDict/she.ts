// 射（she）游戏专属 UI 外壳文案。以中文字面量为键；zh 即键本身，只列 en/fr/es/ar。
// 学习内容（射礼操作、箭靶数据、等级/术语、《论语》《孟子》直引）不收录。
// 跨游戏公共文案（称号/命中率/新解锁/未解锁/← 六艺 等）见 common.ts，此处不重复。
import type { Lang } from "@/lib/i18n";

type E = Partial<Record<Lang, string>>;

export const SHE: Record<string, E> = {
  // 反省选项（归因卡片与必答表单共用）
  "心未静，气未沉": {
    en: "Mind not calm, breath not steady",
    fr: "Esprit agité, souffle irrégulier",
    es: "Mente inquieta, respiración inestable",
    ar: "القلب ليس ساكنًا، والنفس غير مستقرة",
  },
  "呼吸太快、抢射、未守静": {
    en: "Breathing too fast, rushed shot, no stillness",
    fr: "Respiration trop rapide, tir précipité, manque de calme",
    es: "Respiración rápida, tiro apresurado, sin calma",
    ar: "تنفّس سريع، عجلة في الرمي، لا سكينة",
  },
  "力度过 / 不及": {
    en: "Too much or too little force",
    fr: "Force excessive ou insuffisante",
    es: "Fuerza excesiva o insuficiente",
    ar: "قوّة زائدة أو ناقصة",
  },
  "蓄力没到位或拉得太满": {
    en: "Draw too weak or too far",
    fr: "Arc pas assez ou trop tendu",
    es: "Carga insuficiente o demasiada",
    ar: "الشدّ ناقص أو مبالغ فيه",
  },
  估风错了: {
    en: "Misjudged the wind",
    fr: "Mauvaise évaluation du vent",
    es: "Cálculo erróneo del viento",
    ar: "أخطأت في تقدير الريح",
  },
  "没看清风向旗就出手": {
    en: "Loosed without reading the wind flag",
    fr: "Tiré sans lire le drapeau du vent",
    es: "Disparaste sin mirar la bandera",
    ar: "رميتَ قبل قراءة راية الريح",
  },
  求胜心切: {
    en: "Too eager to win",
    fr: "Trop désireux de vaincre",
    es: "Ansioso por ganar",
    ar: "الرغبة في الفوز طغت",
  },
  "想赢的念头压倒了平和": {
    en: "The will to win overtook composure",
    fr: "L'envie de gagner l'a emporté",
    es: "Las ganas de ganar rompieron la calma",
    ar: "غلبت شهوة النَّصر السكينةَ",
  },

  // 结算 / 离线消息
  环: { en: "rings", fr: "points", es: "puntos", ar: "حلقات" },
  未中: { en: "Missed", fr: "Raté", es: "Fuera", ar: "إخفاق" },
  "未中 · 反求诸己": {
    en: "Missed — look within",
    fr: "Raté — interrogez-vous",
    es: "Fuera — vuélvete hacia ti",
    ar: "إخفاق — ارجع إلى نفسك",
  },
  "未中 · 反求诸己（离线练习）": {
    en: "Missed — look within (offline practice)",
    fr: "Raté — interrogez-vous (hors ligne)",
    es: "Fuera — vuélvete (práctica sin conexión)",
    ar: "إخفاق — ارجع إلى نفسك (تمرين دون اتصال)",
  },
  离线练习: {
    en: "offline practice",
    fr: "hors ligne",
    es: "sin conexión",
    ar: "تمرين دون اتصال",
  },
  "克己 · 射不主皮": {
    en: "Self-restraint — archery prizes not the hide",
    fr: "Retraite sur soi — le tir ne prize pas la peau",
    es: "Dominio propio — la arquería no premia el cuero",
    ar: "كبح النفس — الرمي لا يُقدَّر بثقب الجلد",
  },
  射艺: { en: "Archery", fr: "Tir à l'arc", es: "Arquería", ar: "الرماية" },
  "连接断开 · 转为离线练习": {
    en: "Connection lost — switching to offline practice",
    fr: "Connexion perdue — passage en hors ligne",
    es: "Conexión perdida — modo sin conexión",
    ar: "انقطع الاتصال — التبديل إلى تمرين دون اتصال",
  },

  // 顶部 HUD
  "六艺 · 射": {
    en: "Six Arts · Archery",
    fr: "Six arts · Tir à l'arc",
    es: "Seis artes · Arquería",
    ar: "الفنون الستة · الرماية",
  },
  "观德 · 反求诸己": {
    en: "Virtue in Shooting — look within",
    fr: "Valeur du tir — interrogez-vous",
    es: "La virtud en el tiro — vuélvete a ti",
    ar: "الرماية مقياس الفضيلة — ارجع إلى نفسك",
  },
  "按住拉弓 · 移动瞄准 · 松开放箭 — 方向 × 力度 × 时机": {
    en: "Hold to draw · move to aim · release to loose — direction × force × timing",
    fr: "Maintenez pour bander · bougez pour viser · relâchez pour tirer — direction × force · moment",
    es: "Mantén para tensar · mueve para apuntar · suelta para disparar — dirección × fuerza × momento",
    ar: "اضغط للشدّ · حرّك للتصويب · أرسِل للرمي — الاتجاه × القوة × التوقيت",
  },
  连击: { en: "Streak", fr: "Séries", es: "Racha", ar: "التتالي" },
  风: { en: "Wind", fr: "Vent", es: "Viento", ar: "الريح" },
  靶距: { en: "Range", fr: "Distance", es: "Distancia", ar: "المسافة" },
  本局: { en: "Set", fr: "Série", es: "Serie", ar: "الجولة" },
  "离线练习 · 不计入成绩": {
    en: "Offline practice — unscored",
    fr: "Hors ligne — non noté",
    es: "Sin conexión — sin puntaje",
    ar: "تمرين دون اتصال — بلا احتساب",
  },
  "⚠ 射不主皮 — 此箭若中，可选「克己」": {
    en: "⚠ Archery prizes not the hide — if this hits, choose restraint",
    fr: "⚠ Le tir ne prize pas la peau — si cette flèche touche, choisissez la retenue",
    es: "⚠ La arquería no premia el cuero — si aciertas, elige la moderación",
    ar: "⚠ الرماية لا تُقدَّر بثقب الجلد — إن أصبحت فاختر كبح النفس",
  },

  // 首次引导
  "按住 · 移动 · 松开": {
    en: "Hold · Move · Release",
    fr: "Maintenir · Bouger · Relâcher",
    es: "Mantén · Mueve · Suelta",
    ar: "اضغط · حرّك · أرسِل",
  },
  "按住屏幕任意处拉弓，": {
    en: "Press anywhere to draw, ",
    fr: "Appuyez n'importe où pour bander, ",
    es: "Mantén en cualquier parte para tensar, ",
    ar: "اضغط في أي مكان للشدّ، ",
  },
  "移动手指/鼠标瞄准": {
    en: "move your finger/mouse to aim",
    fr: "déplacez le doigt/la souris pour viser",
    es: "mueve el dedo/ratón para apuntar",
    ar: "حرّك إصبعك/فأرتك للتصويب",
  },
  "右上角放大靶看准星 · 力度进金区最稳 · 拉满太久会手抖": {
    en: "Use the magnified target top-right · loose in the gold zone · hold too long and your hand shakes",
    fr: "Visez sur la loupe en haut à droite · lâchez dans la zone d'or · trop longtemps, la main tremble",
    es: "Mira el blanco ampliado arriba a la derecha · suelta en la zona dorada · sostén largo y tiembla la mano",
    ar: "انظر إلى العدسة أعلى اليمين · أرسِل في المنطقة الذهبية · الإطالة تُرجف اليد",
  },

  // 底部状态条
  "按住任意处 · 拉弓": {
    en: "Hold anywhere to draw",
    fr: "Maintenez pour bander",
    es: "Mantén para tensar",
    ar: "اضغط في أي مكان للشدّ",
  },
  "连接射场中…": {
    en: "Connecting to the range…",
    fr: "Connexion au champ de tir…",
    es: "Conectando con la diana…",
    ar: "جارٍ الاتصال بميدان الرماية…",
  },
  "过满则抖 — 快放！": {
    en: "Too far — loose now!",
    fr: "Trop tendu — relâchez !",
    es: "Demasiado — suelta ya!",
    ar: "أفرطت — أرسِل الآن!",
  },
  "移动瞄准 · 力度进金区松手": {
    en: "Move to aim · loose in the gold",
    fr: "Bougez pour viser · lâchez dans l'or",
    es: "Mueve para apuntar · suelta en el oro",
    ar: "حرّك للتصويب · أرسِل في الذهبي",
  },
  "箭出 · 看其所至": {
    en: "Loosed — watch where it lands",
    fr: "Flèche partie — voyez où elle va",
    es: "Flecha en vuelo — mira adónde va",
    ar: "انطلقت السهم · انظر أين تقع",
  },
  五矢已毕: {
    en: "Five arrows done",
    fr: "Cinq flèches tirées",
    es: "Cinco flechas listas",
    ar: "تمّت السهام الخمس",
  },

  // 解锁经典 toast
  "🎖 解锁经典": {
    en: "🎖 New classic unlocked",
    fr: "🎖 Nouveau classique débloqué",
    es: "🎖 Nuevo clásico desbloqueado",
    ar: "🎖 فُتح كلاسيكي جديد",
  },

  // 脱靶反省（《孟子》直引保留为中文）
  "脱靶 — 为什么没中？": {
    en: "Missed the target — why? ",
    fr: "Raté la cible — pourquoi ? ",
    es: "Fuera de la diana — ¿por qué? ",
    ar: "أخطأت الهدف — لماذا؟ ",
  },

  // 主皮警告
  你已连中: { en: "You have hit ", fr: "Vous avez enchaîné ", es: "Has acertado ", ar: "أصبتَ " },
  "箭。": { en: " arrows. ", fr: " flèches. ", es: " flechas. ", ar: " أسهم. " },
  "此时收弓不射，是克己复礼。": {
    en: "To hold back now is to master yourself and return to ritual.",
    fr: "Retenir maintenant, c'est se maîtriser et revenir au rite.",
    es: "Contenerte ahora es dominarte y volver al rito.",
    ar: "الكفّ الآن هو كبح النفس والرجوع إلى الشريعة",
  },
  "⊙ 克己 · 收弓（射艺 +5）": {
    en: "⊙ Restrain · hold shot (Archery +5)",
    fr: "⊙ Retenir · ne pas tirer (Tir +5)",
    es: "⊙ Contén · no dispares (Arquería +5)",
    ar: "⊙ كابح نفسك · أمسك السهم (الرماية +5)",
  },
  继续求中: {
    en: "Keep aiming",
    fr: "Continuer à viser",
    es: "Sigue apuntando",
    ar: "واصل التصويب",
  },

  // 五矢小结
  五矢小结: {
    en: "Five-arrow summary",
    fr: "Bilan des cinq flèches",
    es: "Resumen de cinco flechas",
    ar: "خلاصة السهام الخمس",
  },
  命中: { en: "Hits", fr: "Touches", es: "Aciertos", ar: "إصابات" },
  " · 最佳一箭 ": {
    en: " · Best arrow ",
    fr: " · Meilleure flèche ",
    es: " · Mejor flecha ",
    ar: " · أفضل سهم ",
  },
  " · 累计反省 ": {
    en: " · Reflections ",
    fr: " · Réflexions ",
    es: " · Reflexiones ",
    ar: " · تأمّلات ",
  },
  再来一局: {
    en: "Play again",
    fr: "Rejouer",
    es: "Otra vez",
    ar: "العب مجددًا",
  },

  // 经典图鉴 / 归因分布
  "射艺经典图鉴 ·": {
    en: "Archery classics ·",
    fr: "Classiques du tir ·",
    es: "Clásicos de arquería ·",
    ar: "كلاسيكيات الرماية ·",
  },
  "✓ 已解锁": {
    en: "✓ Unlocked",
    fr: "✓ Débloqué",
    es: "✓ Desbloqueado",
    ar: "✓ فُتح",
  },
  "🔒 未解锁": {
    en: "🔒 Locked",
    fr: "🔒 Verrouillé",
    es: "🔒 Bloqueado",
    ar: "🔒 مقفل",
  },
  反省归因分布: {
    en: "Reflection breakdown",
    fr: "Répartition des réflexions",
    es: "Distribución de reflexiones",
    ar: "توزيع التأمّلات",
  },
  "（可选）写一句更具体的反思 · ≥5 字省分更高": {
    en: "(Optional) write a more specific reflection · ≥5 characters score better",
    fr: "(Facultatif) écrivez une réflexion plus précise · ≥5 caractères rapportent plus",
    es: "(Opcional) escribe una reflexión más específica · ≥5 caracteres puntúan más",
    ar: "(اختياري) اكتب تأمّلًا أدق · ≥5 أحرف تمنح نقاطًا أكثر",
  },

  // 放大靶 inset
  "放大靶 · 金区松手最稳": {
    en: "Magnified target · loose in the gold",
    fr: "Cible agrandie · lâchez dans l'or",
    es: "Blanco ampliado · suelta en el oro",
    ar: "الهدف المكبّر · أرسِل في الذهبي",
  },

  // 环数点评（sheEngine.scoreVerdict，非 React 模块经 getLang() 调用）
  正中黄心: {
    en: "Bullseye",
    fr: "En plein centre",
    es: "En el blanco",
    ar: "في القلب",
  },
  "九环 · 几近于道": {
    en: "9 rings · near the Way",
    fr: "9 points · proche de la Voie",
    es: "9 puntos · cerca del Camino",
    ar: "9 حلقات · قريب من الطريق",
  },
  "七环 · 稳中求": {
    en: "7 rings · steady aim",
    fr: "7 points · visée sûre",
    es: "7 puntos · puntería firme",
    ar: "7 حلقات · ثبات",
  },
  "四环 · 差之毫厘": {
    en: "4 rings · a hair off",
    fr: "4 points · à un cheveu",
    es: "4 puntos · por un pelo",
    ar: "4 حلقات · أخطأت قليلًا",
  },
  "上靶 · 继续调整": {
    en: "On target — keep adjusting",
    fr: "Sur la cible — ajustez",
    es: "En la diana — sigue ajustando",
    ar: "أصبت · واصل الضبط",
  },
  "脱靶 · 反求诸己": {
    en: "Missed — look within",
    fr: "Raté — interrogez-vous",
    es: "Fuera — vuélvete a ti",
    ar: "إخفاق · ارجع إلى نفسك",
  },

  // 玩家称号（后端 progress.title）
  "习射者": {
    en: "Archery Learner",
    fr: "Archer apprenti",
    es: "Aprendiz de arquería",
    ar: "مبتدئ الرماية",
  },
  "射礼成": {
    en: "Master of Ritual Archery",
    fr: "Maître du rite du tir",
    es: "Maestro del arco ritual",
    ar: "سيد رامي الطقوس",
  },
  "中礼之士": {
    en: "Ritual Adept",
    fr: "Lettré rituel",
    es: "Adepto del rito",
    ar: "الرجل الملتزم",
  },
  "反求诸己": {
    en: "Seeks Within",
    fr: "Qui s'interroge",
    es: "Vuélvete a ti",
    ar: "يرجع إلى نفسه",
  },
};

// 轻量 i18n：5 语词典 + t() + 语言状态 hook（localStorage 持久化 + html lang/dir 联动）。
// 仅外化核心文案；长释义与正文由后端按 lang 返回。
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "zh" | "en" | "fr" | "es" | "ar";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "zh", label: "中", native: "中文" },
  { code: "en", label: "EN", native: "English" },
  { code: "fr", label: "FR", native: "Français" },
  { code: "es", label: "ES", native: "Español" },
  { code: "ar", label: "AR", native: "العربية" },
];

export const RTL_LANGS: Lang[] = ["ar"];

type Dict = Record<string, Record<Lang, string>>;

const DICT: Dict = {
  "brand.title": {
    zh: "孔子 · 儒家语义平台",
    en: "Kongzi · Confucian Semantic Platform",
    fr: "Kongzi · Plateforme sémantique confucéenne",
    es: "Kongzi · Plataforma semántica confuciana",
    ar: "كونغ تسي · منصة المعنى الكونفوشيوسي",
  },
  "brand.short": {
    zh: "孔子", en: "Kongzi", fr: "Kongzi", es: "Kongzi", ar: "كونغ تسي",
  },
  "nav.home":    { zh: "首页", en: "Home", fr: "Accueil", es: "Inicio", ar: "الرئيسية" },
  "nav.feed":    { zh: "刷刷", en: "Feed", fr: "Fil", es: "Feed", ar: "تصفح" },
  "nav.read":    { zh: "读经", en: "Read", fr: "Lecture", es: "Lectura", ar: "قراءة" },
  "nav.graph":   { zh: "图谱", en: "Graph", fr: "Graphe", es: "Grafo", ar: "الرسم" },
  "nav.chat":    { zh: "问答", en: "Chat", fr: "Dialogue", es: "Diálogo", ar: "حوار" },
  "nav.cases":   { zh: "案例", en: "Cases", fr: "Cas", es: "Casos", ar: "حالات" },
  "nav.journey": { zh: "君子路", en: "Path", fr: "Voie", es: "Camino", ar: "السبيل" },
  "nav.me":      { zh: "我", en: "Me", fr: "Moi", es: "Yo", ar: "أنا" },
  "nav.developers": { zh: "开放接口", en: "Developers", fr: "API", es: "API", ar: "API" },
  "nav.cocreate": { zh: "共创", en: "Co-create", fr: "Co-créer", es: "Co-crear", ar: "إبداع مشترك" },
  "nav.plugins":  { zh: "插件", en: "Plugins", fr: "Modules", es: "Plugins", ar: "إضافات" },
  "nav.reach":    { zh: "覆盖", en: "Reach", fr: "Portée", es: "Alcance", ar: "الانتشار" },

  "home.quote": {
    zh: "今日金句", en: "Quote of the day",
    fr: "Citation du jour", es: "Cita del día", ar: "حكمة اليوم",
  },
  "home.entry.chat": {
    zh: "聊一聊", en: "Talk to Kongzi",
    fr: "Discuter", es: "Conversar", ar: "حاور",
  },
  "home.entry.chat.desc": {
    zh: "向智能体提问，得到可溯源的经典解读。",
    en: "Ask the agents; get traceable classical interpretations.",
    fr: "Interrogez les agents pour une exégèse traçable des classiques.",
    es: "Pregunta a los agentes y obtén interpretaciones clásicas trazables.",
    ar: "اسأل الوكلاء واحصل على تفسيرات كلاسيكية يمكن تتبعها.",
  },
  "home.entry.read": {
    zh: "读一读", en: "Read the classics",
    fr: "Lire les classiques", es: "Leer los clásicos", ar: "اقرأ النصوص",
  },
  "home.entry.read.desc": {
    zh: "原文·拼音·译文·注释 五层并读。",
    en: "Text · pinyin · translation · annotations, five layers.",
    fr: "Texte · pinyin · traduction · annotations, cinq couches.",
    es: "Texto · pinyin · traducción · notas, cinco capas.",
    ar: "النص والبينين والترجمة والشرح في خمس طبقات.",
  },
  "home.entry.graph": {
    zh: "知识图谱", en: "Knowledge graph",
    fr: "Graphe de connaissances", es: "Grafo de conocimiento", ar: "الرسم المعرفي",
  },
  "home.entry.graph.desc": {
    zh: "人物·概念·命题的关系网络。",
    en: "Network of persons, concepts, propositions.",
    fr: "Réseau de personnes, concepts, propositions.",
    es: "Red de personas, conceptos, proposiciones.",
    ar: "شبكة الأشخاص والمفاهيم والقضايا.",
  },
  "home.cta": {
    zh: "进入", en: "Enter →", fr: "Entrer →", es: "Entrar →", ar: "ادخل →",
  },

  "corpus.title": {
    zh: "多语料库 · 跨文明对照",
    en: "Multilingual corpus · cross-civilizational",
    fr: "Corpus multilingue · transcivilisationnel",
    es: "Corpus multilingüe · transcivilizacional",
    ar: "مدونة متعددة اللغات وعبر الحضارات",
  },
  "corpus.units": {
    zh: "条标注语料", en: "annotated units",
    fr: "unités annotées", es: "unidades anotadas", ar: "وحدة موسومة",
  },
  "corpus.target": {
    zh: "目标", en: "target", fr: "objectif", es: "objetivo", ar: "الهدف",
  },
  "corpus.langs": {
    zh: "种语言已覆盖", en: "languages covered",
    fr: "langues couvertes", es: "idiomas cubiertos", ar: "لغة مغطاة",
  },
  "corpus.cases": {
    zh: "跨文明对话案例", en: "cross-civ dialog cases",
    fr: "cas de dialogue inter-civilisations",
    es: "casos de diálogo intercivilizacional",
    ar: "حالات الحوار بين الحضارات",
  },

  // ── 读经页（原文 / 拼音 / 译文 / 释义）────────────────────────────────
  "read.layer.original": {
    zh: "原文", en: "Text", fr: "Texte", es: "Texto", ar: "النص",
  },
  "read.layer.pinyin": {
    zh: "拼音", en: "Pinyin", fr: "Pinyin", es: "Pinyin", ar: "بينين",
  },
  "read.layer.translation": {
    zh: "译文", en: "Translation", fr: "Traduction", es: "Traducción", ar: "الترجمة",
  },
  "read.layer.annotation": {
    zh: "释义", en: "Gloss", fr: "Glose", es: "Glosa", ar: "الشرح",
  },
  "read.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。",
    en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.",
    es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "read.refNotFound": {
    zh: "未找到该条经文，已为你打开默认篇章。",
    en: "That passage could not be found; the default chapter is shown.",
    fr: "Ce passage est introuvable ; le chapitre par défaut est affiché.",
    es: "No se encontró ese pasaje; se muestra el capítulo por defecto.",
    ar: "لم يُعثر على هذا النص؛ عُرض الفصل الافتراضي.",
  },
  "read.saved": {
    zh: "★ 已收藏", en: "★ Saved", fr: "★ Enregistré",
    es: "★ Guardado", ar: "★ محفوظ",
  },
  "read.save": {
    zh: "☆ 收藏", en: "☆ Save", fr: "☆ Enregistrer",
    es: "☆ Guardar", ar: "☆ حفظ",
  },
  "anno.classical": {
    zh: "传统注疏", en: "Classical commentary", fr: "Commentaire classique",
    es: "Comentario clásico", ar: "شرح تقليدي",
  },
  "anno.modern": {
    zh: "释义", en: "Gloss", fr: "Glose", es: "Glosa", ar: "شرح",
  },
  "anno.src.modern": {
    zh: "现代释义", en: "Modern interpretation", fr: "Interprétation moderne",
    es: "Interpretación moderna", ar: "تفسير معاصر",
  },
  "anno.src.editor": {
    zh: "编者", en: "Editor", fr: "Rédacteur", es: "Redactor", ar: "المحرر",
  },
  "read.aiReading": {
    zh: "AI 解读", en: "AI reading", fr: "Lecture par IA",
    es: "Lectura por IA", ar: "قراءة آلية",
  },
  "read.aiReadingNote": {
    zh: "AI 解读由智能体运行时生成（区别于权威注释）。",
    en: "AI readings are generated at runtime by agents (distinct from authoritative annotations).",
    fr: "Les lectures par IA sont générées à l'exécution par des agents (à distinguer des annotations faisant autorité).",
    es: "Las lecturas por IA se generan en tiempo de ejecución por agentes (distintas de las anotaciones autorizadas).",
    ar: "تُولَّد القراءات الآلية أثناء التشغيل بواسطة الوكلاء (وهي مختلفة عن الشروح المعتمدة).",
  },
  "read.askPrefix": {
    zh: "请解读：", en: "Please interpret: ", fr: "Veuillez interpréter : ",
    es: "Interpreta: ", ar: "فسّر: ",
  },
  "read.askAgent": {
    zh: "问问子曰君 →", en: "Ask the agent →", fr: "Demander à l'agent →",
    es: "Preguntar al agente →", ar: "اسأل العميل ←",
  },

  // ── 登录页 ───────────────────────────────────────────────────────────
  "login.kicker": {
    zh: "登录", en: "Sign in", fr: "Connexion", es: "Acceso", ar: "تسجيل الدخول",
  },
  "login.title": {
    zh: "登录或注册", en: "Sign in or sign up",
    fr: "Connexion ou inscription", es: "Inicia sesión o regístrate",
    ar: "تسجيل الدخول أو إنشاء حساب",
  },
  "login.intro1": {
    zh: "游客可直接注册，进度自动并入；已有账号请登录——",
    en: "Guests can sign up directly and keep their progress; returning users log in —",
    fr: "Les invités peuvent s'inscrire et conserver leur progression ; les autres se connectent —",
    es: "Los invitados pueden registrarse y conservar su progreso; los demás inician sesión —",
    ar: "يمكن للزائر إنشاء حساب مع الحفاظ على تقدّمه؛ ولمن لديه حساب أن يسجّل الدخول —",
  },
  "login.intro2": {
    zh: "注册或登录后即可跨设备恢复进度。",
    en: "either way, your progress follows you across devices.",
    fr: "dans les deux cas, votre progression vous suit sur tous vos appareils.",
    es: "en ambos casos, tu progreso te sigue en todos tus dispositivos.",
    ar: "في الحالتين، يتبعك تقدّمك عبر الأجهزة.",
  },
  "login.email": {
    zh: "邮箱", en: "Email", fr: "E-mail", es: "Correo", ar: "البريد الإلكتروني",
  },
  "login.password": {
    zh: "密码", en: "Password", fr: "Mot de passe", es: "Contraseña", ar: "كلمة المرور",
  },
  "login.pwHint": {
    zh: "≥ 6 位", en: "≥ 6 chars", fr: "≥ 6 caractères",
    es: "≥ 6 caracteres", ar: "٦ أحرف على الأقل",
  },
  "login.err": {
    zh: "邮箱或密码错误。", en: "Wrong email or password.",
    fr: "E-mail ou mot de passe incorrect.", es: "Correo o contraseña incorrectos.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  },
  "login.busy": {
    zh: "登录中…", en: "Signing in…", fr: "Connexion…",
    es: "Iniciando sesión…", ar: "جارٍ تسجيل الدخول…",
  },
  "login.submit": {
    zh: "登录", en: "Sign in", fr: "Se connecter",
    es: "Iniciar sesión", ar: "تسجيل الدخول",
  },
  "login.noAccount": {
    zh: "想先试试？", en: "Want to try first?", fr: "Envie d'essayer d'abord ?",
    es: "¿Prefieres probar primero?", ar: "تريد التجربة أولًا؟",
  },
  "login.enter": {
    zh: "进入平台", en: "enter the platform", fr: "entrer sur la plateforme",
    es: "entrar a la plataforma", ar: "ادخل إلى المنصة",
  },
  "login.noAccountBody0": {
    zh: "无需注册，直接 ", en: "No sign-up needed — just ",
    fr: "Aucune inscription requise : ", es: "No hace falta registrarse: ",
    ar: "لا حاجة للتسجيل، ",
  },
  "login.noAccountBody1": {
    zh: "即自动获得游客身份。想解锁成就与任务时，",
    en: " and you get a guest identity instantly. To unlock badges and daily tasks,",
    fr: " et vous obtenez un statut d'invité immédiatement. Pour débloquer badges et tâches,",
    es: " y obtienes una identidad de invitado al instante. Para desbloquear insignias y tareas,",
    ar: " فتحصل على هوية زائر فورًا. لفتح الأوسمة والتمارين،",
  },
  "login.noAccountBody2": {
    zh: "在本页注册，或到「我的中心」绑定邮箱。",
    en: " sign up on this page or bind an email in My center.",
    fr: " inscrivez-vous ici ou associez un e-mail dans Mon espace.",
    es: " regístrate aquí o vincula un correo en Mi centro.",
    ar: " أنشئ حسابًا هنا أو اربط بريدًا في مركز حسابي.",
  },

  // ── 我的中心 ─────────────────────────────────────────────────────────
  "me.favorites": {
    // {n} 由调用方替换
    zh: "收藏夹 · {n}", en: "Favourites · {n}", fr: "Favoris · {n}",
    es: "Favoritos · {n}", ar: "المفضلة · {n}",
  },
  "me.exportData": {
    zh: "导出我的数据 (GDPR/CCPA)", en: "Export my data (GDPR/CCPA)",
    fr: "Exporter mes données (RGPD/CCPA)", es: "Exportar mis datos (RGPD/CCPA)",
    ar: "تصدير بياناتي (GDPR/CCPA)",
  },
  "me.deleteNote": {
    // {x} 由调用方替换为「换一个游客身份」或「退出登录」
    zh: "删除账户不可逆。如果只是想换账号，请选「{x}」。",
    en: "Deleting an account is irreversible. If you only want to switch accounts, choose “{x}”.",
    fr: "La suppression d'un compte est irréversible. Pour changer simplement de compte, choisissez « {x} ».",
    es: "Eliminar una cuenta es irreversible. Si solo quieres cambiar de cuenta, elige «{x}».",
    ar: "حذف الحساب لا رجعة فيه. إن أردت تبديل الحساب فقط فاختر «{x}».",
  },
  "me.streak": {
    // {n} 由调用方替换
    zh: "连续 {n} 天", en: "{n}-day streak", fr: "série de {n} jours",
    es: "racha de {n} días", ar: "سلسلة {n} يومًا",
  },
  "me.badges": {
    // {n} 已解锁 / {m} 总数
    zh: "勋章墙 · {n}/{m}", en: "Badge wall · {n}/{m}",
    fr: "Mur des badges · {n}/{m}", es: "Muro de insignias · {n}/{m}",
    ar: "جدار الشارات · {n}/{m}",
  },
  "me.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。", en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.", es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "me.upgraded": {
    zh: "升级成功，进度已保留。", en: "Upgraded. Your progress is kept.",
    fr: "Mise à niveau réussie. Votre progression est conservée.",
    es: "Actualizado. Tu progreso se conserva.", ar: "تمت الترقية. تقدّمك محفوظ.",
  },
  "me.upgradeFail": {
    zh: "升级失败：邮箱可能已被注册。", en: "Upgrade failed: the email may already be registered.",
    fr: "Échec : l'e-mail est peut-être déjà enregistré.",
    es: "Falló: el correo quizá ya esté registrado.",
    ar: "فشلت الترقية: قد يكون البريد مسجّلًا بالفعل.",
  },
  "me.confirmDelete": {
    zh: "确认删除账户与全部数据？此操作不可撤销。",
    en: "Delete the account and all data? This cannot be undone.",
    fr: "Supprimer le compte et toutes les données ? Cette action est irréversible.",
    es: "¿Eliminar la cuenta y todos los datos? Esta acción es irreversible.",
    ar: "هل تحذف الحساب وكل البيانات؟ لا يمكن التراجع عن هذا الإجراء.",
  },
  "me.guestName": {
    zh: "君", en: "Guest", fr: "Invité", es: "Invitado", ar: "زائر",
  },
  "me.avatar.change": {
    zh: "更换头像", en: "Change avatar", fr: "Changer l'avatar", es: "Cambiar avatar", ar: "تغيير الصورة",
  },
  "me.avatar.changeHint": {
    zh: "更换", en: "Change", fr: "Changer", es: "Cambiar", ar: "تغيير",
  },
  "me.avatar.busy": {
    zh: "上传中…", en: "Uploading…", fr: "Envoi…", es: "Subiendo…", ar: "جارٍ الرفع…",
  },
  "me.avatar.fail": {
    zh: "头像上传失败（需 jpg/png/webp，≤6MB）", en: "Avatar upload failed (jpg/png/webp, ≤6MB)", fr: "Échec de l'envoi (jpg/png/webp, ≤6 Mo)", es: "Error al subir (jpg/png/webp, ≤6 MB)", ar: "فشل الرفع (jpg/png/webp، ≤6 ميغابايت)",
  },
  "me.avatar.reset": {
    zh: "恢复默认头像", en: "Reset avatar", fr: "Réinitialiser", es: "Restaurar", ar: "استعادة الافتراضية",
  },
  "me.guest": {
    zh: "游客", en: "Guest", fr: "Invité", es: "Invitado", ar: "زائر",
  },
  "me.upgradeTitle": {
    zh: "升级为正式账号", en: "Upgrade to a full account",
    fr: "Passer à un compte complet", es: "Pasar a una cuenta completa",
    ar: "الترقية إلى حساب كامل",
  },
  "me.upgradeDesc": {
    zh: "绑定邮箱后进度可跨设备同步，当前进度全部保留。",
    en: "Binding an email syncs your progress across devices; all current progress is kept.",
    fr: "Associer un e-mail synchronise votre progression entre appareils ; toute la progression actuelle est conservée.",
    es: "Vincular un correo sincroniza tu progreso entre dispositivos; se conserva todo el progreso actual.",
    ar: "ربط البريد الإلكتروني يزامن تقدّمك عبر الأجهزة؛ مع الحفاظ على كل التقدّم الحالي.",
  },
  "me.email": {
    zh: "邮箱", en: "Email", fr: "E-mail", es: "Correo", ar: "البريد الإلكتروني",
  },
  "me.passwordHint": {
    zh: "密码（≥6 位）", en: "Password (≥6 chars)", fr: "Mot de passe (≥6 caractères)",
    es: "Contraseña (≥6 caracteres)", ar: "كلمة المرور (٦ أحرف على الأقل)",
  },
  "me.upgrade": {
    zh: "升级", en: "Upgrade", fr: "Mettre à niveau", es: "Actualizar", ar: "ترقية",
  },
  "me.noFavorites": {
    zh: "还没有收藏。在「读一读」点 ☆ 收藏经典。",
    en: "No favourites yet. Tap ☆ in Read to save classics.",
    fr: "Pas encore de favoris. Touchez ☆ dans Lecture pour enregistrer des classiques.",
    es: "Aún no hay favoritos. Pulsa ☆ en Lectura para guardar clásicos.",
    ar: "لا مفضّلات بعد. انقر ☆ في القراءة لحفظ النصوص.",
  },
  "me.remove": {
    zh: "移除", en: "Remove", fr: "Retirer", es: "Quitar", ar: "إزالة",
  },
  "me.loginStatus": {
    zh: "登录状态", en: "Sign-in status", fr: "État de connexion",
    es: "Estado de sesión", ar: "حالة الدخول",
  },
  "me.switchGuestConfirm": {
    zh: "换游客身份后，当前游客名下的进度（打卡/勋章/礼分/收藏）将无法找回。\n\n建议先绑定邮箱再切换。\n\n确认换一个游客身份？",
    en: "After switching, the progress under the current guest (check-ins / badges / points / favourites) cannot be recovered.\n\nWe suggest binding an email first.\n\nSwitch to another guest?",
    fr: "Après le changement, la progression du compte invité actuel (présences / badges / points / favoris) sera irrécupérable.\n\nNous vous conseillons d'associer d'abord un e-mail.\n\nChanger d'invité ?",
    es: "Tras el cambio, el progreso del invitado actual (registros / insignias / puntos / favoritos) no se podrá recuperar.\n\nLe sugerimos vincular un correo primero.\n\n¿Cambiar de invitado?",
    ar: "بعد التبديل، لن يمكن استرجاع تقدّم الزائر الحالي (التسجيلات / الشارات / النقاط / المفضلة).\n\nننصح بربط بريد إلكتروني أولًا.\n\nهل تريد التبديل إلى زائر آخر؟",
  },
  "me.switchGuest": {
    zh: "换一个游客身份", en: "Switch to another guest", fr: "Changer d'invité",
    es: "Cambiar de invitado", ar: "تبديل هوية الزائر",
  },
  "me.logout": {
    zh: "退出登录", en: "Log out", fr: "Déconnexion", es: "Cerrar sesión", ar: "تسجيل الخروج",
  },
  "me.guestNote": {
    zh: "游客身份的进度只保存在当前浏览器，清缓存或换设备会丢失。绑定邮箱可跨设备恢复。",
    en: "Guest progress is stored only in this browser; clearing the cache or switching devices loses it. Bind an email to restore it across devices.",
    fr: "La progression d'invité n'est conservée que dans ce navigateur ; vider le cache ou changer d'appareil la perd. Associez un e-mail pour la retrouver partout.",
    es: "El progreso de invitado solo se guarda en este navegador; borrar la caché o cambiar de dispositivo lo pierde. Vincula un correo para recuperarlo en varios dispositivos.",
    ar: "يُحفظ تقدّم الزائر في هذا المتصفح فقط؛ ومسح الذاكرة المؤقتة أو تغيير الجهاز يفقده. اربط بريدًا إلكترونيًا لاستعادته عبر الأجهزة.",
  },
  "me.logoutNote": {
    zh: "退出后可在登录页用邮箱+密码重新登录恢复进度。",
    en: "After logging out you can sign in again with email and password to restore your progress.",
    fr: "Après déconnexion, reconnectez-vous avec e-mail et mot de passe pour retrouver votre progression.",
    es: "Tras cerrar sesión puedes volver a entrar con correo y contraseña para recuperar tu progreso.",
    ar: "بعد الخروج يمكنك الدخول مجددًا بالبريد وكلمة المرور لاستعادة تقدّمك.",
  },
  "me.dataPrivacy": {
    zh: "数据与隐私", en: "Data & privacy", fr: "Données et confidentialité",
    es: "Datos y privacidad", ar: "البيانات والخصوصية",
  },
  "me.deleteAccount": {
    zh: "删除账户与数据", en: "Delete account and data",
    fr: "Supprimer le compte et les données", es: "Eliminar cuenta y datos",
    ar: "حذف الحساب والبيانات",
  },

  // ── 首页补充 ─────────────────────────────────────────────────────────
  "home.corpus.cases": {
    zh: "跨文明对话案例（条）", en: "Cross-civ dialogue cases",
    fr: "Cas de dialogue inter-civilisations",
    es: "Casos de diálogo intercivilizacional",
    ar: "حالات الحوار بين الحضارات",
  },

  // 站点元信息（标题 / 描述）不放这里 —— 见 `lib/metaText.ts`：
  // layout.tsx 是服务端组件，需要一份不带 "use client" 的数据源。

  // ── 语料明细标签 ─────────────────────────────────────────────────────
  // 后端 /corpus/stats 的 breakdown 用中文做 key（数据契约，不能改），
  // 前端只翻译**显示标签**：见 app/page.tsx 的 BD_KEY 映射。
  "corpus.bd.passages": {
    zh: "经典原文", en: "Classical texts", fr: "Textes classiques",
    es: "Textos clásicos", ar: "النصوص الكلاسيكية",
  },
  "corpus.bd.pinyin": {
    zh: "拼音标注", en: "Pinyin annotations", fr: "Annotations pinyin",
    es: "Anotaciones pinyin", ar: "ترقيم بينين",
  },
  "corpus.bd.translations": {
    zh: "多语译文", en: "Multilingual translations", fr: "Traductions multilingues",
    es: "Traducciones multilingües", ar: "ترجمات متعددة اللغات",
  },
  "corpus.bd.annotations": {
    zh: "注释（传统+现代）", en: "Annotations (classical + modern)",
    fr: "Annotations (classiques + modernes)", es: "Anotaciones (clásicas + modernas)",
    ar: "الشروح (تقليدية وحديثة)",
  },
  "corpus.bd.annoI18n": {
    zh: "注释多语扩展", en: "Annotation i18n units", fr: "Unités i18n d'annotations",
    es: "Unidades i18n de anotaciones", ar: "وحدات الشروح متعددة اللغات",
  },
  "corpus.bd.concepts": {
    zh: "概念条目", en: "Concept entries", fr: "Entrées conceptuelles",
    es: "Entradas conceptuales", ar: "مدخلات المفاهيم",
  },
  "corpus.bd.conceptTerms": {
    zh: "概念多语术语", en: "Concept term i18n", fr: "Termes i18n des concepts",
    es: "Términos i18n de conceptos", ar: "مصطلحات المفاهيم متعددة اللغات",
  },
  "corpus.bd.conceptDefs": {
    zh: "概念多语定义", en: "Concept definition i18n", fr: "Définitions i18n des concepts",
    es: "Definiciones i18n de conceptos", ar: "تعريفات المفاهيم متعددة اللغات",
  },
  "corpus.bd.topics": {
    zh: "全球议题", en: "Global topics", fr: "Thèmes mondiaux",
    es: "Temas globales", ar: "الموضوعات العالمية",
  },
  "corpus.bd.topicNames": {
    zh: "议题多语名称", en: "Topic name i18n", fr: "Noms i18n des thèmes",
    es: "Nombres i18n de temas", ar: "أسماء الموضوعات متعددة اللغات",
  },
  "corpus.bd.topicDescs": {
    zh: "议题多语描述", en: "Topic description i18n", fr: "Descriptions i18n des thèmes",
    es: "Descripciones i18n de temas", ar: "أوصاف الموضوعات متعددة اللغات",
  },
  "corpus.bd.civHeadline": {
    zh: "跨文明立场（headline）", en: "Cross-civ stances (headline)",
    fr: "Positions inter-civilisations (titre)", es: "Posturas intercivilizacionales (titular)",
    ar: "المواقف بين الحضارات (العنوان)",
  },
  "corpus.bd.civArgument": {
    zh: "跨文明立场（论证）", en: "Cross-civ stances (argument)",
    fr: "Positions inter-civilisations (argument)", es: "Posturas intercivilizacionales (argumento)",
    ar: "المواقف بين الحضارات (الحجة)",
  },
  "corpus.bd.cases": {
    zh: "跨文明对话案例（条）", en: "Cross-civ dialogue cases",
    fr: "Cas de dialogue inter-civilisations", es: "Casos de diálogo intercivilizacional",
    ar: "حالات الحوار بين الحضارات",
  },
  "corpus.bd.caseCivUnits": {
    zh: "案例文明对照单元", en: "Case civ-comparison units",
    fr: "Unités de comparaison de civilisations", es: "Unidades de comparación de civilizaciones",
    ar: "وحدات مقارنة الحضارات",
  },
  "corpus.bd.caseCivI18n": {
    zh: "案例文明多语单元", en: "Case civ i18n units", fr: "Unités i18n de civilisations",
    es: "Unidades i18n de civilizaciones", ar: "وحدات الحضارات متعددة اللغات",
  },
  "corpus.bd.caseCitations": {
    zh: "案例经典引用单元", en: "Case citation units", fr: "Unités de citation classique",
    es: "Unidades de cita clásica", ar: "وحدات الاستشهاد النصي",
  },
  "corpus.bd.caseCiteI18n": {
    zh: "案例引用多语标签", en: "Case citation i18n labels",
    fr: "Étiquettes i18n des citations", es: "Etiquetas i18n de citas",
    ar: "وسوم الاستشهاد متعددة اللغات",
  },
  "corpus.bd.caseTagsI18n": {
    zh: "案例多语标签", en: "Case i18n labels", fr: "Étiquettes i18n des cas",
    es: "Etiquetas i18n de casos", ar: "وسوم الحالات متعددة اللغات",
  },
  "corpus.bd.caseQuestionI18n": {
    zh: "案例问题多语真译", en: "Case question i18n (real translations)",
    fr: "Questions des cas en i18n (vraies traductions)",
    es: "Preguntas de casos en i18n (traducciones reales)",
    ar: "أسئلة الحالات مترجمة ترجمة حقيقية",
  },

  // ── 主题切换 ─────────────────────────────────────────────────────────
  "theme.toggle": {
    zh: "切换深浅色", en: "Toggle theme", fr: "Changer de thème",
    es: "Cambiar tema", ar: "تبديل المظهر",
  },
  "theme.toLight": {
    zh: "切到浅色", en: "Switch to light", fr: "Passer en clair",
    es: "Cambiar a claro", ar: "التبديل إلى الفاتح",
  },
  "theme.toDark": {
    zh: "切到深色", en: "Switch to dark", fr: "Passer en sombre",
    es: "Cambiar a oscuro", ar: "التبديل إلى الداكن",
  },

  // ── 账户菜单 ─────────────────────────────────────────────────────────
  "user.login": {
    zh: "登录", en: "Log in", fr: "Connexion", es: "Iniciar sesión", ar: "تسجيل الدخول",
  },
  "user.initial": {
    zh: "君", en: "U", fr: "U", es: "U", ar: "U",
  },
  "user.menu": {
    zh: "账户菜单", en: "Account menu", fr: "Menu du compte",
    es: "Menú de cuenta", ar: "قائمة الحساب",
  },
  "user.guest": {
    zh: "游客身份", en: "Guest", fr: "Invité", es: "Invitado", ar: "زائر",
  },
  "user.account": {
    zh: "正式账号", en: "Registered account", fr: "Compte enregistré",
    es: "Cuenta registrada", ar: "حساب مسجّل",
  },
  "user.center": {
    zh: "我的中心", en: "My center", fr: "Mon espace", es: "Mi centro", ar: "مركز حسابي",
  },
  "user.journey": {
    zh: "君子之路", en: "The junzi path", fr: "La voie du junzi",
    es: "El camino del junzi", ar: "طريق الجنز",
  },
  "user.switchGuest": {
    zh: "换游客身份", en: "Switch guest", fr: "Changer d'invité",
    es: "Cambiar de invitado", ar: "تبديل الزائر",
  },
  "user.switchGuestConfirm": {
    zh: "换游客身份后，当前游客名下的进度（打卡/勋章/礼分/收藏）将无法找回。\n\n建议先在「我的中心」绑定邮箱再切换。\n\n确认换一个游客身份？",
    en: "After switching, the progress under the current guest (check-ins / badges / points / favourites) cannot be recovered.\n\nWe suggest binding an email in My center first.\n\nSwitch to another guest?",
    fr: "Après le changement, la progression du compte invité actuel (présences / badges / points / favoris) sera irrécupérable.\n\nNous vous conseillons d'associer d'abord un e-mail dans Mon espace.\n\nChanger d'invité ?",
    es: "Tras el cambio, el progreso del invitado actual (registros / insignias / puntos / favoritos) no se podrá recuperar.\n\nLe sugerimos vincular un correo en Mi centro primero.\n\n¿Cambiar de invitado?",
    ar: "بعد التبديل، لن يمكن استرجاع تقدّم الزائر الحالي (التسجيلات / الشارات / النقاط / المفضلة).\n\nننصح بربط بريد إلكتروني من مركز حسابي أولًا.\n\nهل تريد التبديل إلى زائر آخر؟",
  },
  "user.logout": {
    zh: "退出登录", en: "Log out", fr: "Déconnexion", es: "Cerrar sesión", ar: "تسجيل الخروج",
  },

  // ── 对话页 ───────────────────────────────────────────────────────────
  "chat.agent.chief": { zh: "总控", en: "Orchestrator", fr: "Orchestrateur", es: "Orquestador", ar: "المنسّق" },
  "chat.agent.retrieval": { zh: "经典检索", en: "Retrieval", fr: "Récupération", es: "Recuperación", ar: "الاسترجاع" },
  "chat.agent.synthesis": { zh: "合成", en: "Synthesis", fr: "Synthèse", es: "Síntesis", ar: "التركيب" },
  "chat.agent.topic": { zh: "议题引擎", en: "Topic engine", fr: "Moteur de thèmes", es: "Motor de temas", ar: "محرّك الموضوعات" },
  "chat.agent.crossciv": { zh: "跨文明对照", en: "Cross-civ contrast", fr: "Comparaison inter-civilisations", es: "Contraste intercivilizacional", ar: "المقارنة بين الحضارات" },
  "chat.agent.translate": { zh: "翻译", en: "Translation", fr: "Traduction", es: "Traducción", ar: "الترجمة" },
  "chat.agent.crossculture": { zh: "跨文化", en: "Cross-cultural", fr: "Interculturel", es: "Intercultural", ar: "بين الثقافات" },
  "chat.agent.verify": { zh: "校验", en: "Verification", fr: "Vérification", es: "Verificación", ar: "التحقق" },
  "chat.track.text": { zh: "文本依据", en: "Textual basis", fr: "Fondement textuel", es: "Base textual", ar: "الأساس النصي" },
  "chat.track.modern": { zh: "现代发挥", en: "Modern extension", fr: "Prolongement moderne", es: "Extensión moderna", ar: "توسيع حديث" },
  "chat.track.cultural": { zh: "文化适配", en: "Cultural adaptation", fr: "Adaptation culturelle", es: "Adaptación cultural", ar: "التكييف الثقافي" },
  "chat.errHint": {
    // {msg} 由调用方替换
    zh: "{msg}（服务暂时不可用，请稍后重试。）",
    en: "{msg} (Service temporarily unavailable, please retry.)",
    fr: "{msg} (Service temporairement indisponible, réessayez.)",
    es: "{msg} (Servicio no disponible, inténtalo de nuevo.)",
    ar: "{msg} (الخدمة غير متاحة مؤقتًا، أعد المحاولة.)",
  },
  "chat.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。",
    en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.",
    es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "chat.personaName": { zh: "子曰君", en: "Master Yue", fr: "Maître Yue", es: "Maestro Yue", ar: "المعلم يويه" },
  "chat.avatar": { zh: "曰", en: "Say", fr: "Dit", es: "Dice", ar: "قال" },
  "chat.tagline": {
    zh: "儒家经典 · 同行者，不是老师",
    en: "Confucian classics · a companion, not a teacher",
    fr: "Classiques confucéens · un compagnon, pas un maître",
    es: "Clásicos confucianos · un compañero, no un maestro",
    ar: "النصوص الكونفوشيوسية · رفيق لا معلّم",
  },
  "chat.topicPrefix": { zh: "对议题：", en: "On topic: ", fr: "Sur le thème : ", es: "Sobre el tema: ", ar: "بشأن الموضوع: " },
  "chat.auto": { zh: "自动", en: "Auto", fr: "Auto", es: "Auto", ar: "تلقائي" },
  "chat.tryTopics": {
    zh: "试试问议题：「如何应对全球气候变化？」「AI 时代的隐私边界？」",
    en: "Try asking: “How should we respond to global climate change?” “Privacy boundaries in the AI era?”",
    fr: "Essayez : « Comment répondre au changement climatique mondial ? » « Les limites de la vie privée à l'ère de l'IA ? »",
    es: "Prueba: «¿Cómo responder al cambio climático global?» «¿Los límites de la privacidad en la era de la IA?»",
    ar: "جرّب: «كيف نواجه تغيّر المناخ العالمي؟» «حدود الخصوصية في عصر الذكاء الاصطناعي؟»",
  },
  "chat.placeholder": { zh: "问点什么…", en: "Ask something…", fr: "Posez une question…", es: "Pregunta algo…", ar: "اسأل شيئًا…" },
  "chat.aiAssist": { zh: "AI 协助", en: "AI-assisted", fr: "Assisté par IA", es: "Asistido por IA", ar: "بمساعدة الذكاء الاصطناعي" },
  "chat.collapse": { zh: "收起 ▴", en: "Collapse ▴", fr: "Réduire ▴", es: "Contraer ▴", ar: "طيّ ▴" },
  "chat.expand": { zh: "展开论证 ▾", en: "Expand reasoning ▾", fr: "Développer le raisonnement ▾", es: "Expandir el razonamiento ▾", ar: "توسيع الاستدلال ▾" },

  // ── 知识图谱 ─────────────────────────────────────────────────────────
  "graph.person": { zh: "人物", en: "Person", fr: "Personne", es: "Persona", ar: "شخص" },
  "graph.concept": { zh: "概念", en: "Concept", fr: "Concept", es: "Concepto", ar: "مفهوم" },
  "graph.passage": { zh: "篇章", en: "Passage", fr: "Passage", es: "Pasaje", ar: "فقرة" },
  "graph.proposition": { zh: "命题", en: "Proposition", fr: "Proposition", es: "Proposición", ar: "قضية" },
  "graph.school": { zh: "学派", en: "School", fr: "École", es: "Escuela", ar: "مدرسة" },
  "rel.mentor": { zh: "师承", en: "Discipleship", fr: "Filiation", es: "Discipulado", ar: "تلمذة" },
  "rel.related": { zh: "相关", en: "Related", fr: "Lié", es: "Relacionado", ar: "مرتبط" },
  "rel.mention": { zh: "提及", en: "Mentions", fr: "Mentionne", es: "Menciona", ar: "يذكر" },
  "rel.propose": { zh: "提出", en: "Proposes", fr: "Propose", es: "Propone", ar: "يطرح" },
  "rel.discuss": { zh: "论及", en: "Discusses", fr: "Traite de", es: "Trata sobre", ar: "يتناول" },
  "rel.belong": { zh: "属于", en: "Belongs to", fr: "Appartient à", es: "Pertenece a", ar: "ينتمي إلى" },
  "rel.from": { zh: "出自", en: "From", fr: "Issu de", es: "Procede de", ar: "مأخوذ من" },
  "graph.node.ren": { zh: "仁", en: "Benevolence", fr: "Bienveillance", es: "Benevolencia", ar: "الرحمة" },
  "graph.node.li": { zh: "礼", en: "Ritual", fr: "Rite", es: "Rito", ar: "الطقوس" },
  "graph.node.junzi": { zh: "君子", en: "Junzi", fr: "Junzi", es: "Junzi", ar: "الجنز" },
  "graph.node.yi": { zh: "义", en: "Rightness", fr: "Justice", es: "Rectitud", ar: "الصواب" },
  "graph.node.kongzi": { zh: "孔子", en: "Confucius", fr: "Confucius", es: "Confucio", ar: "كونفوشيوس" },
  "graph.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。",
    en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.",
    es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "graph.start": { zh: "起点", en: "Start", fr: "Départ", es: "Inicio", ar: "البداية" },
  "graph.depth": { zh: "深度", en: "Depth", fr: "Profondeur", es: "Profundidad", ar: "العمق" },
  "graph.hint": {
    zh: "单击查看关系 · 双击以该点为中心展开",
    en: "Click to view relations · double-click to expand around this node",
    fr: "Cliquez pour voir les relations · double-cliquez pour déployer autour de ce nœud",
    es: "Haz clic para ver relaciones · doble clic para expandir alrededor de este nodo",
    ar: "انقر لعرض العلاقات · وانقر مرتين للتوسّع حول هذه العقدة",
  },

  // ── 传播覆盖 ─────────────────────────────────────────────────────────
  "reach.kicker": { zh: "传播覆盖 · Reach", en: "Reach", fr: "Portée", es: "Alcance", ar: "الانتشار" },
  "reach.target": {
    zh: "申报书目标③ · 5 万师生参与 / 50 万人次覆盖",
    en: "Goal ③ · 50,000 teachers and students engaged / 500,000 reach",
    fr: "Objectif ③ · 50 000 enseignants et étudiants / 500 000 personnes touchées",
    es: "Objetivo ③ · 50 000 docentes y estudiantes / 500 000 alcance",
    ar: "الهدف ③ · ٥٠٬٠٠٠ من المعلمين والطلاب / ٥٠٠٬٠٠٠ وصول",
  },
  "reach.note": {
    zh: "基于平台匿名埋点的实时度量。校园终端 / 插件嵌入 / 二维码扫码 / 直接访问全部计入。",
    en: "Measured in real time from anonymous platform telemetry. Campus terminals, embedded plugins, QR scans and direct visits all count.",
    fr: "Mesuré en temps réel à partir de la télémétrie anonyme. Terminaux de campus, plugins intégrés, scans QR et visites directes sont tous comptés.",
    es: "Medido en tiempo real a partir de la telemetría anónima. Terminales de campus, plugins insertados, escaneos QR y visitas directas cuentan.",
    ar: "قياس فوري من بيانات الاستخدام المجهولة. تُحتسب محطات الحرم والبرامج المضمّنة ومسح الرموز والزيارات المباشرة.",
  },
  "reach.uvTitle": { zh: "累计独立访客 UV", en: "Cumulative unique visitors (UV)", fr: "Visiteurs uniques cumulés (UV)", es: "Visitantes únicos acumulados (UV)", ar: "الزوار الفريدون تراكميًا" },
  "reach.uvGoal": { zh: "5 万师生", en: "50,000 teachers & students", fr: "50 000 enseignants et étudiants", es: "50 000 docentes y estudiantes", ar: "٥٠٬٠٠٠ معلم وطالب" },
  "reach.uv30": { zh: "30 天 {n}", en: "30 days {n}", fr: "30 jours {n}", es: "30 días {n}", ar: "٣٠ يومًا {n}" },
  "reach.pvTitle": { zh: "累计访问 PV", en: "Cumulative page views (PV)", fr: "Pages vues cumulées (PV)", es: "Páginas vistas acumuladas (PV)", ar: "مشاهدات الصفحات تراكميًا" },
  "reach.pvGoal": { zh: "50 万人次", en: "500,000 visits", fr: "500 000 visites", es: "500 000 visitas", ar: "٥٠٠٬٠٠٠ زيارة" },
  "reach.pvToday": { zh: "今日 {a} · 7 天 {b}", en: "Today {a} · 7 days {b}", fr: "Aujourd'hui {a} · 7 jours {b}", es: "Hoy {a} · 7 días {b}", ar: "اليوم {a} · ٧ أيام {b}" },
  "reach.overseasPvTitle": { zh: "海外覆盖 PV", en: "Overseas page views", fr: "Pages vues à l'étranger", es: "Páginas vistas en el extranjero", ar: "المشاهدات الخارجية" },
  "reach.overseasGoal": { zh: "50 万人次", en: "500,000 visits", fr: "500 000 visites", es: "500 000 visitas", ar: "٥٠٠٬٠٠٠ زيارة" },
  "reach.overseasUv": { zh: "海外 UV {a} · 占比 {b}%", en: "Overseas UV {a} · share {b}%", fr: "UV à l'étranger {a} · part {b} %", es: "UV en el extranjero {a} · cuota {b}%", ar: "الزوار الخارجيون {a} · النسبة {b}٪" },
  "reach.terminal": { zh: "终端分布", en: "Device distribution", fr: "Répartition par terminal", es: "Distribución por dispositivo", ar: "توزيع الأجهزة" },
  "reach.source": { zh: "来源分布", en: "Source distribution", fr: "Répartition par source", es: "Distribución por fuente", ar: "توزيع المصادر" },
  "reach.country": { zh: "国家/地区分布", en: "Country/region distribution", fr: "Répartition par pays/région", es: "Distribución por país/región", ar: "توزيع البلدان/المناطق" },
  "reach.campus": { zh: "校园来源", en: "Campus sources", fr: "Sources campus", es: "Fuentes de campus", ar: "مصادر الحرم" },
  "reach.campusEmpty": { zh: "暂无（kiosk?campus= 上线后可见）", en: "None yet (visible once kiosk?campus= goes live)", fr: "Aucun pour l'instant (visible après le déploiement de kiosk?campus=)", es: "Ninguno aún (visible cuando kiosk?campus= esté activo)", ar: "لا شيء بعد (يظهر بعد تفعيل kiosk?campus=)" },
  "reach.hotPaths": { zh: "热门路径", en: "Popular paths", fr: "Chemins populaires", es: "Rutas populares", ar: "المسارات الشائعة" },

  // ── 刷刷 ─────────────────────────────────────────────────────────────
  "feed.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。", en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.", es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "feed.saved": { zh: "已收藏到「我的」", en: "Saved to My center", fr: "Enregistré dans Mon espace", es: "Guardado en Mi centro", ar: "حُفظ في مركز حسابي" },
  "feed.copied": { zh: "已复制金句", en: "Quote copied", fr: "Citation copiée", es: "Cita copiada", ar: "تم نسخ الحكمة" },
  "feed.wallpaperBusy": { zh: "壁纸生成中…（demo）", en: "Generating wallpaper… (demo)", fr: "Génération du fond d'écran… (démo)", es: "Generando fondo de pantalla… (demo)", ar: "جارٍ توليد الخلفية… (تجريبي)" },
  "feed.loading": { zh: "加载中…", en: "Loading…", fr: "Chargement…", es: "Cargando…", ar: "جارٍ التحميل…" },
  "feed.comment": { zh: "评论", en: "Comment", fr: "Commenter", es: "Comentar", ar: "تعليق" },
  "feed.share": { zh: "分享", en: "Share", fr: "Partager", es: "Compartir", ar: "مشاركة" },
  "feed.wallpaper": { zh: "壁纸", en: "Wallpaper", fr: "Fond d'écran", es: "Fondo", ar: "خلفية" },
  "feed.savedShort": { zh: "已藏", en: "Saved", fr: "Enregistré", es: "Guardado", ar: "محفوظ" },
  "feed.save": { zh: "收藏", en: "Save", fr: "Enregistrer", es: "Guardar", ar: "حفظ" },
  "feed.likeAria": { zh: "点赞", en: "Like this passage", fr: "J'aime ce passage", es: "Me gusta este pasaje", ar: "أعجب بهذا المقطع" },
  "feed.commentAria": { zh: "评论", en: "Comments", fr: "Commentaires", es: "Comentarios", ar: "التعليقات" },
  "feed.sheet.title": { zh: "评论区", en: "Comments", fr: "Commentaires", es: "Comentarios", ar: "التعليقات" },
  "feed.sheet.close": { zh: "关闭评论", en: "Close comments", fr: "Fermer les commentaires", es: "Cerrar comentarios", ar: "إغلاق التعليقات" },
  "feed.sheet.sending": { zh: "发送中…", en: "Posting…", fr: "Publication…", es: "Publicando…", ar: "جارٍ النشر…" },
  "feed.unsaved": { zh: "已取消收藏", en: "Removed from saved", fr: "Retiré des favoris", es: "Quitado de guardados", ar: "أُزيل من المحفوظات" },
  "feed.loginToSave": { zh: "请先登录再收藏", en: "Log in to save", fr: "Connectez-vous pour enregistrer", es: "Inicia sesión para guardar", ar: "سجّل الدخول للحفظ" },
  "feed.wallpaperTitle": { zh: "生成壁纸", en: "Wallpaper", fr: "Fond d'écran", es: "Fondo de pantalla", ar: "خلفية" },
  "feed.downloadImage": { zh: "保存图片", en: "Save image", fr: "Enregistrer l’image", es: "Guardar imagen", ar: "حفظ الصورة" },
  "feed.copyImage": { zh: "复制图片", en: "Copy image", fr: "Copier l’image", es: "Copiar imagen", ar: "نسخ الصورة" },
  "feed.imageCopied": { zh: "图片已复制到剪贴板", en: "Image copied to clipboard", fr: "Image copiée dans le presse-papiers", es: "Imagen copiada al portapapeles", ar: "نُسخت الصورة إلى الحافظة" },
  "feed.imageSaved": { zh: "图片已保存", en: "Image saved", fr: "Image enregistrée", es: "Imagen guardada", ar: "حُفظت الصورة" },
  "feed.copyUnsupported": { zh: "当前浏览器不支持复制图片，请改为保存图片", en: "Copying images isn’t supported here; please save the image", fr: "La copie d’images n’est pas prise en charge ; veuillez enregistrer l’image", es: "Este navegador no permite copiar imágenes; guárdala", ar: "لا يدعم هذا المتصفح نسخ الصور، يُرجى حفظها" },

  // ── 插件与轻应用 ─────────────────────────────────────────────────────
  "plugins.kicker": { zh: "插件与轻应用 · Plugins", en: "Plugins & mini-apps", fr: "Plugins et mini-applications", es: "Plugins y mini-aplicaciones", ar: "الإضافات والتطبيقات المصغّرة" },
  "plugins.desc1": {
    zh: "申报书目标③：开发并上线不少于 10 个社交媒体插件与轻应用。",
    en: "Goal ③: develop and launch no fewer than 10 social-media plugins and mini-apps.",
    fr: "Objectif ③ : développer et mettre en ligne au moins 10 plugins et mini-applications pour les réseaux sociaux.",
    es: "Objetivo ③: desarrollar y lanzar no menos de 10 plugins y mini-aplicaciones para redes sociales.",
    ar: "الهدف ③: تطوير ما لا يقل عن ١٠ إضافات وتطبيقات مصغّرة وإطلاقها.",
  },
  "plugins.desc2": {
    zh: "所有插件复用同一平台后端，5 语支持，可追溯出处。",
    en: "All plugins reuse the same platform backend, with 5-language support and traceable sources.",
    fr: "Tous les plugins réutilisent le même backend, avec prise en charge de 5 langues et des sources traçables.",
    es: "Todos los plugins reutilizan el mismo backend, con soporte de 5 idiomas y fuentes trazables.",
    ar: "تعيد كل الإضافات استخدام الخادم نفسه، بدعم خمس لغات ومصادر قابلة للتتبّع.",
  },
  "plugins.count": {
    // {n} 由调用方替换
    zh: "{n} 个嵌入方式 · 一键集成到你的场景",
    en: "{n} embed options · integrate into your scenario in one step",
    fr: "{n} modes d'intégration · intégrez à votre scénario en une étape",
    es: "{n} formas de inserción · intégralas en tu escenario en un paso",
    ar: "{n} طرق تضمين · ادمجها في سياقك بخطوة واحدة",
  },
  "plugins.preview": { zh: "现场预览", en: "Live preview", fr: "Aperçu en direct", es: "Vista previa", ar: "معاينة مباشرة" },
  "plugins.iframe": { zh: "iframe（嵌入金句卡）", en: "iframe (embedded quote card)", fr: "iframe (carte de citation intégrée)", es: "iframe (tarjeta de cita insertada)", ar: "iframe (بطاقة حكمة مضمّنة)" },
  "plugins.svg": { zh: "SVG 海报卡（1200×630）", en: "SVG poster card (1200×630)", fr: "Carte poster SVG (1200×630)", es: "Tarjeta póster SVG (1200×630)", ar: "بطاقة ملصق SVG (1200×630)" },
  "plugins.copied": { zh: "已复制", en: "Copied", fr: "Copié", es: "Copiado", ar: "تم النسخ" },
  "plugins.copy": { zh: "复制", en: "Copy", fr: "Copier", es: "Copiar", ar: "نسخ" },

  // ── 大屏轮播 ─────────────────────────────────────────────────────────
  "kiosk.brand": { zh: "孔子 · 儒家语义平台", en: "Kongzi · Confucian Semantic Platform", fr: "Kongzi · Plateforme sémantique confucéenne", es: "Kongzi · Plataforma semántica confuciana", ar: "كونغ تسي · منصة المعنى الكونفوشيوسي" },
  "kiosk.brandSuffix": { zh: "儒家语义平台", en: "Confucian Semantic Platform", fr: "Plateforme sémantique confucéenne", es: "Plataforma semántica confuciana", ar: "منصة المعنى الكونفوشيوسي" },
  "kiosk.paused": { zh: "已暂停 · 点击继续", en: "Paused · click to resume", fr: "En pause · cliquez pour reprendre", es: "En pausa · haz clic para continuar", ar: "متوقّف · انقر للمتابعة" },
  "kiosk.playing": { zh: "自动轮播 · 点击暂停", en: "Auto-rotating · click to pause", fr: "Rotation auto · cliquez pour mettre en pause", es: "Rotación automática · haz clic para pausar", ar: "عرض تلقائي · انقر للإيقاف" },
  "kiosk.footer": { zh: "kongzi.platform · 扫码继续阅读", en: "kongzi.platform · scan to keep reading", fr: "kongzi.platform · scannez pour continuer", es: "kongzi.platform · escanea para seguir leyendo", ar: "kongzi.platform · امسح الرمز لمتابعة القراءة" },
  "kiosk.prev": { zh: "上一张", en: "Previous", fr: "Précédent", es: "Anterior", ar: "السابق" },
  "kiosk.next": { zh: "下一张", en: "Next", fr: "Suivant", es: "Siguiente", ar: "التالي" },
  "kiosk.play": { zh: "播放", en: "Play", fr: "Lecture", es: "Reproducir", ar: "تشغيل" },
  "kiosk.pause": { zh: "暂停", en: "Pause", fr: "Pause", es: "Pausa", ar: "إيقاف" },

  // ── 案例库 ───────────────────────────────────────────────────────────
  "hud.streak": { zh: "连习 {a} 日", en: "{a}-day streak", fr: "série de {a} jours", es: "racha de {a} días", ar: "سلسلة {a} أيام" },
  "hud.xp": { zh: "修行 {a} XP", en: "practice · {a} XP", fr: "pratique · {a} XP", es: "práctica · {a} XP", ar: "ممارسة · {a} XP" },
  "hud.energy": { zh: "体力 {a}", en: "energy {a}", fr: "énergie {a}", es: "energía {a}", ar: "طاقة {a}" },
  "cases.noBackend": {
    zh: "后端服务暂时不可用，请稍后重试。", en: "Backend service is unavailable. Please try again shortly.",
    fr: "Service backend indisponible. Réessayez dans un instant.", es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.",
    ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل.",
  },
  "cases.kicker": {
    zh: "案例库 · 5 议题 × 5 文明", en: "Case library · 5 topics × 5 civilizations",
    fr: "Bibliothèque de cas · 5 thèmes × 5 civilisations",
    es: "Biblioteca de casos · 5 temas × 5 civilizaciones",
    ar: "مكتبة الحالات · ٥ موضوعات × ٥ حضارات",
  },
  "cases.published": { zh: "条已发布", en: "published", fr: "publiés", es: "publicados", ar: "منشور" },
  "cases.desc1": { zh: "真实世界的问题,先听儒家怎么说,再听斯多葛、启蒙与功利主义怎么说。每条案例都引用经典原文与多文明立场,", en: "Real-world questions, answered twice: what the Analects say, then what Stoicism, the Enlightenment and utilitarianism say. Every case cites the classical text and multi-civilizational stances —", fr: "Des questions du monde réel, répondues deux fois : ce que disent les Entretiens, puis le stoïcisme, les Lumières et l'utilitarisme. Chaque cas cite le texte classique et des positions multi-civilisationnelles —", es: "Preguntas del mundo real, respondidas dos veces: lo que dicen las Analectas y lo que dicen el estoicismo, la Ilustración y el utilitarismo. Cada caso cita el texto clásico y posturas multiculturales —", ar: "أسئلة من العالم الحقيقي تُجاب مرتين: ما تقوله «المنتخبات» ثم ما يقوله الرواقية والتنوير والنفعية. كل حالة تستشهد بالنص الكلاسيكي وبمواقف حضارات متعددة —" },
  "cases.desc2": { zh: "可直接用于课堂讨论、论文写作与跨文化对话。", en: "ready for seminar debates, essays and cross-cultural dialogue.", fr: "prêtes pour les débats, les dissertations et le dialogue interculturel.", es: "listas para debates, ensayos y diálogo intercultural.", ar: "جاهزة للنقاش الصفّي والكتابة الأكاديمية والحوار بين الثقافات." },
  "cases.topic": { zh: "议题：", en: "Topics: ", fr: "Thèmes : ", es: "Temas: ", ar: "الموضوعات: " },
  "cases.all": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "cases.searchPlaceholder": { zh: "搜索关键词…", en: "Search keywords…", fr: "Rechercher des mots-clés…", es: "Buscar palabras clave…", ar: "ابحث بكلمات مفتاحية…" },
  "cases.empty": {
    zh: "暂无案例（默认只显示已审核发布的）",
    en: "No cases yet (only reviewed and published ones are shown by default).",
    fr: "Aucun cas pour l'instant (seuls les cas relus et publiés sont affichés par défaut).",
    es: "Aún no hay casos (por defecto solo se muestran los revisados y publicados).",
    ar: "لا حالات بعد (لا يُعرض افتراضيًا سوى المراجَع والمنشور).",
  },
  "cases.adminGo": { zh: "管理员可前往", en: "Administrators can go to", fr: "Les administrateurs peuvent aller à", es: "Los administradores pueden ir a", ar: "يمكن للمشرفين الانتقال إلى" },
  "cases.reviewPublish": { zh: "评审发布。", en: " to review and publish.", fr: " pour relire et publier.", es: " para revisar y publicar.", ar: " للمراجعة والنشر." },
  "cases.adminGranted": {
    zh: "管理员账号通过邮箱白名单授予 ·", en: "Admin accounts are granted via an email allowlist ·",
    fr: "Les comptes administrateurs sont accordés via une liste d'e-mails ·",
    es: "Las cuentas de administrador se conceden por lista blanca de correos ·",
    ar: "تُمنح حسابات المشرفين عبر قائمة بريد مسموح بها ·",
  },
  "cases.loginAsAdmin": {
    zh: "用管理员邮箱登录 →", en: "Sign in with an admin email →",
    fr: "Se connecter avec un e-mail administrateur →",
    es: "Inicia sesión con un correo de administrador →",
    ar: "سجّل الدخول ببريد مشرف ←",
  },
  "cases.prev": { zh: "上一页", en: "Previous", fr: "Précédent", es: "Anterior", ar: "السابق" },
  "cases.next": { zh: "下一页", en: "Next", fr: "Suivant", es: "Siguiente", ar: "التالي" },
  "cases.civCount": {
    zh: "{n} 文明对照", en: "{n} civilizations compared",
    fr: "{n} civilisations comparées", es: "{n} civilizaciones comparadas",
    ar: "{n} حضارات للمقارنة",
  },
  "cases.pager": {
    zh: "{p} / {tp}（共 {n} 条）", en: "{p} / {tp} ({n} total)",
    fr: "{p} / {tp} ({n} au total)", es: "{p} / {tp} ({n} en total)",
    ar: "{p} / {tp} (الإجمالي {n})",
  },

  // ── 案例详情 ─────────────────────────────────────────────────────────
  "case.shareSign": {
    zh: "——孔子·儒家语义平台", en: "— Kongzi · Confucian Semantic Platform",
    fr: "— Kongzi · Plateforme sémantique confucéenne",
    es: "— Kongzi · Plataforma semántica confuciana",
    ar: "— كونغ تسي · منصة المعنى الكونفوشيوسي",
  },
  "case.copied": { zh: "已复制案例摘要，可粘贴分享", en: "Case summary copied; paste to share", fr: "Résumé du cas copié ; collez pour partager", es: "Resumen del caso copiado; pega para compartir", ar: "تم نسخ ملخّص الحالة؛ الصقه للمشاركة" },
  "case.back": { zh: "← 返回案例库", en: "← Back to cases", fr: "← Retour aux cas", es: "← Volver a los casos", ar: "→ العودة إلى الحالات" },
  "case.pending": { zh: "待审", en: "Pending", fr: "En attente", es: "Pendiente", ar: "قيد المراجعة" },
  "case.reviewed": { zh: "已审", en: "Reviewed", fr: "Relu", es: "Revisado", ar: "تمت المراجعة" },
  "case.aiAssist": { zh: "AI 协助", en: "AI-assisted", fr: "Assisté par IA", es: "Asistido por IA", ar: "بمساعدة الذكاء الاصطناعي" },
  "case.share": { zh: "分享", en: "Share", fr: "Partager", es: "Compartir", ar: "مشاركة" },
  "case.question": { zh: "问题", en: "Question", fr: "Question", es: "Pregunta", ar: "السؤال" },
  "case.reasoning": { zh: "儒家价值推理", en: "Confucian value reasoning", fr: "Raisonnement axiologique confucéen", es: "Razonamiento axiológico confuciano", ar: "استدلال قيمي كونفوشيوسي" },
  "case.basis": { zh: "经典依据", en: "Classical basis", fr: "Fondement classique", es: "Fundamento clásico", ar: "الأساس النصي" },
  "case.reviewer": { zh: "审核：", en: "Reviewed by: ", fr: "Relu par : ", es: "Revisado por: ", ar: "راجعه: " },
  "case.note": { zh: "备注：", en: "Note: ", fr: "Remarque : ", es: "Nota: ", ar: "ملاحظة: " },

  // ── 文明立场名 ───────────────────────────────────────────────────────
  "civ.confucian": { zh: "儒家", en: "Confucian", fr: "Confucéen", es: "Confuciano", ar: "كونفوشيوسي" },
  "civ.christian": { zh: "基督教伦理", en: "Christian ethics", fr: "Éthique chrétienne", es: "Ética cristiana", ar: "أخلاق مسيحية" },
  "civ.enlightenment": { zh: "启蒙理性", en: "Enlightenment reason", fr: "Raison des Lumières", es: "Razón ilustrada", ar: "عقل التنوير" },
  "civ.kantian": { zh: "康德义务论", en: "Kantian deontology", fr: "Déontologie kantienne", es: "Deontología kantiana", ar: "الأخلاق الكانطية" },
  "civ.buddhist": { zh: "佛教/印度思想", en: "Buddhist / Indian thought", fr: "Pensée bouddhique / indienne", es: "Pensamiento budista / indio", ar: "الفكر البوذي / الهندي" },
  "civ.daoist": { zh: "道家", en: "Daoist", fr: "Taoïste", es: "Taoísta", ar: "طاوي" },
  "civ.islamic": { zh: "伊斯兰思想", en: "Islamic thought", fr: "Pensée islamique", es: "Pensamiento islámico", ar: "الفكر الإسلامي" },
  "civ.secular": { zh: "世俗人文主义", en: "Secular humanism", fr: "Humanisme séculier", es: "Humanismo secular", ar: "الإنسانية العلمانية" },
  "civ.other": { zh: "其他", en: "Other", fr: "Autre", es: "Otro", ar: "أخرى" },

  // ── 共创广场 ─────────────────────────────────────────────────────────
  "co.kicker": { zh: "共创广场", en: "Co-creation square", fr: "Place de co-création", es: "Plaza de co-creación", ar: "ساحة الإبداع المشترك" },
  "co.tagline": { zh: "可提问 · 可互动 · 可共创", en: "Ask · interact · co-create", fr: "Questionner · interagir · co-créer", es: "Preguntar · interactuar · co-crear", ar: "اسأل · تفاعل · أبدع" },
  "co.intro1": {
    zh: "研究者、教育者、学习者都可以补充跨文明立场、对话与注解，不限文化背景。",
    en: "Researchers, educators and learners can contribute cross-civilizational stances, dialogues and annotations, whatever their tradition.",
    fr: "Les chercheurs, enseignants et apprenants de toute tradition culturelle sont invités à enrichir les positions, dialogues et annotations inter-civilisations.",
    es: "Investigadores, docentes y estudiantes de cualquier tradición cultural pueden aportar posturas, diálogos y anotaciones intercivilizacionales.",
    ar: "نرحّب بالباحثين والمعلمين والمتعلمين من أي تقليد ثقافي للمساهمة بمواقف وحوارات وشروح بين الحضارات.",
  },
  "co.intro2": {
    zh: "经审核后将进入「跨文明立场库」与 AI 对话引擎。",
    en: "Once reviewed, contributions enter the cross-civilizational stance library and the AI dialogue engine.",
    fr: "Après relecture, les contributions rejoignent la bibliothèque de positions inter-civilisations et le moteur de dialogue IA.",
    es: "Tras la revisión, las aportaciones entran en la biblioteca de posturas intercivilizacionales y en el motor de diálogo de IA.",
    ar: "بعد المراجعة، تدخل المساهمات إلى مكتبة المواقف بين الحضارات ومحرّك الحوار الذكي.",
  },
  "co.collapse": { zh: "收起", en: "Collapse", fr: "Réduire", es: "Contraer", ar: "طيّ" },
  "co.submitStance": { zh: "+ 提交立场", en: "+ Submit a stance", fr: "+ Proposer une position", es: "+ Enviar una postura", ar: "+ أرسل موقفًا" },
  "co.topic": { zh: "所属议题", en: "Topic", fr: "Thème", es: "Tema", ar: "الموضوع" },
  "co.tradition": { zh: "文化传统", en: "Cultural tradition", fr: "Tradition culturelle", es: "Tradición cultural", ar: "التقليد الثقافي" },
  "co.stance": { zh: "立场（一句话）", en: "Stance (one sentence)", fr: "Position (une phrase)", es: "Postura (una frase)", ar: "الموقف (جملة واحدة)" },
  "co.stancePlaceholder": { zh: "例：无为而治，顺自然之道", en: "e.g. Govern by non-action, follow the way of nature", fr: "ex. Gouverner par le non-agir, suivre la voie de la nature", es: "p. ej. Gobernar sin acción, seguir el camino de la naturaleza", ar: "مثال: الحكم باللا-فعل واتباع طريق الطبيعة" },
  "co.argument": { zh: "详细论证（可空）", en: "Detailed argument (optional)", fr: "Argumentation détaillée (facultatif)", es: "Argumentación detallada (opcional)", ar: "الحجة التفصيلية (اختياري)" },
  "co.argumentPlaceholder": { zh: "思想源流、经典出处、当代启示…", en: "Intellectual lineage, classical sources, contemporary implications…", fr: "Filiation intellectuelle, sources classiques, portée contemporaine…", es: "Linaje intelectual, fuentes clásicas, implicaciones contemporáneas…", ar: "الجذور الفكرية والمصادر الكلاسيكية والدلالة المعاصرة…" },
  "co.submit": { zh: "提交（待审核）", en: "Submit (pending review)", fr: "Envoyer (en attente de relecture)", es: "Enviar (pendiente de revisión)", ar: "إرسال (قيد المراجعة)" },
  "co.topicPrefix": { zh: "议题：", en: "Topics: ", fr: "Thèmes : ", es: "Temas: ", ar: "الموضوعات: " },
  "co.all": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "co.hot": { zh: "高热度", en: "Trending", fr: "Tendances", es: "Tendencias", ar: "الأكثر تفاعلًا" },
  "co.latest": { zh: "最新", en: "Latest", fr: "Récents", es: "Recientes", ar: "الأحدث" },
  "co.empty": {
    zh: "还没有已发布的共创内容。提交你的第一条立场？",
    en: "No published contributions yet. Submit the first stance?",
    fr: "Aucune contribution publiée pour l'instant. Proposer la première position ?",
    es: "Aún no hay aportaciones publicadas. ¿Enviar la primera postura?",
    ar: "لا مساهمات منشورة بعد. هل ترسل أول موقف؟",
  },

  // ── 开放接口 ─────────────────────────────────────────────────────────
  "dev.applyFail": {
    zh: "申请失败：服务暂时不可用，请稍后重试。",
    en: "Application failed: service temporarily unavailable, please retry.",
    fr: "Échec de la demande : service temporairement indisponible, réessayez.",
    es: "Falló la solicitud: servicio no disponible, inténtalo de nuevo.",
    ar: "فشل الطلب: الخدمة غير متاحة مؤقتًا، أعد المحاولة.",
  },
  "dev.keyInvalid": { zh: "Key 无效或后端不可达", en: "Invalid key or backend unreachable", fr: "Clé invalide ou backend injoignable", es: "Clave no válida o backend inaccesible", ar: "المفتاح غير صالح أو الخادم غير متاح" },
  "dev.kicker": { zh: "开放接口 · Developers", en: "Open API · Developers", fr: "API ouverte · Développeurs", es: "API abierta · Desarrolladores", ar: "واجهة مفتوحة · للمطوّرين" },
  "dev.tagline": { zh: "为海外教育与文化机构提供的儒家语义 API", en: "A Confucian semantic API for overseas educational and cultural institutions", fr: "Une API sémantique confucéenne pour les institutions éducatives et culturelles à l'étranger", es: "Una API semántica confuciana para instituciones educativas y culturales del extranjero", ar: "واجهة دلالية كونفوشيوسية للمؤسسات التعليمية والثقافية في الخارج" },
  "dev.desc1": {
    zh: "申报书目标①：向不少于 20 家海外教育及文化机构提供首批开放接口测试服务。",
    en: "Goal ①: provide the first round of open-API testing services to no fewer than 20 overseas educational and cultural institutions.",
    fr: "Objectif ① : fournir une première série de services de test d'API ouverte à au moins 20 institutions éducatives et culturelles à l'étranger.",
    es: "Objetivo ①: ofrecer la primera ronda de servicios de prueba de API abierta a no menos de 20 instituciones educativas y culturales del extranjero.",
    ar: "الهدف ①: تقديم الدفعة الأولى من خدمات اختبار الواجهة المفتوحة لما لا يقل عن ٢٠ مؤسسة تعليمية وثقافية في الخارج.",
  },
  "dev.desc2": {
    zh: "在下方申请，系统自动审批并发放 Demo Key，拿到就能联调。",
    en: "Apply below; approval is automatic and a demo key is issued right away.",
    fr: "Demandez ci-dessous en un clic ; l'approbation est automatique et une clé de démo est délivrée immédiatement.",
    es: "Solicita abajo con un clic; la aprobación es automática y se emite una clave demo al instante.",
    ar: "تقدّم أدناه بنقرة واحدة؛ الموافقة تلقائية ويُصدر مفتاح تجريبي فورًا.",
  },
  "dev.quota": { zh: "配额 10,000 / 月", en: "Quota 10,000 / month", fr: "Quota 10 000 / mois", es: "Cuota 10.000 / mes", ar: "الحصة ١٠٬٠٠٠ / شهر" },
  "dev.rate": { zh: "限速 60 / 分钟", en: "Rate limit 60 / min", fr: "Limite 60 / min", es: "Límite 60 / min", ar: "الحد ٦٠ / دقيقة" },
  "dev.langs": { zh: "5 语支持", en: "5-language support", fr: "Prise en charge de 5 langues", es: "Soporte de 5 idiomas", ar: "دعم ٥ لغات" },
  "dev.traceable": { zh: "可追溯出处", en: "Traceable sources", fr: "Sources traçables", es: "Fuentes trazables", ar: "مصادر قابلة للتتبّع" },
  "dev.applyTitle": { zh: "申请 API Key", en: "Apply for an API key", fr: "Demander une clé API", es: "Solicitar una clave API", ar: "اطلب مفتاح API" },
  "dev.orgName": { zh: "机构名称", en: "Institution name", fr: "Nom de l'institution", es: "Nombre de la institución", ar: "اسم المؤسسة" },
  "dev.country": { zh: "国家 / 地区", en: "Country / region", fr: "Pays / région", es: "País / región", ar: "البلد / المنطقة" },
  "dev.email": { zh: "联系邮箱", en: "Contact email", fr: "E-mail de contact", es: "Correo de contacto", ar: "بريد التواصل" },
  "dev.purpose": { zh: "用途说明", en: "Purpose", fr: "Objet", es: "Finalidad", ar: "الغرض" },
  "dev.purposePlaceholder": { zh: "教学 / 研究 / 跨文化对话 / 海外华文教育…", en: "Teaching / research / cross-cultural dialogue / overseas Chinese education…", fr: "Enseignement / recherche / dialogue interculturel / enseignement du chinois à l'étranger…", es: "Enseñanza / investigación / diálogo intercultural / enseñanza del chino en el extranjero…", ar: "التعليم / البحث / الحوار بين الثقافات / تعليم الصينية في الخارج…" },
  "dev.applying": { zh: "申请中…", en: "Applying…", fr: "Demande en cours…", es: "Solicitando…", ar: "جارٍ التقديم…" },
  "dev.applySubmit": { zh: "提交申请并获取 Key", en: "Submit and get a key", fr: "Envoyer et obtenir une clé", es: "Enviar y obtener clave", ar: "أرسل واحصل على المفتاح" },
  "dev.yourKey": { zh: "您的 API Key", en: "Your API key", fr: "Votre clé API", es: "Tu clave API", ar: "مفتاح API الخاص بك" },
  "dev.keyOnce": { zh: "仅显示一次，请立即复制保存", en: "Shown only once — copy and save it now", fr: "Affiché une seule fois — copiez-le et conservez-le", es: "Se muestra una sola vez: cópialo y guárdalo", ar: "يُعرض مرة واحدة فقط — انسخه واحفظه الآن" },
  "dev.copyKey": { zh: "复制 Key", en: "Copy key", fr: "Copier la clé", es: "Copiar clave", ar: "انسخ المفتاح" },
  "dev.usageHint": { zh: "若已有 Key，可在下方粘贴查看用量。否则左侧填写申请。", en: "If you already have a key, paste it below to see usage. Otherwise apply on the left.", fr: "Si vous avez déjà une clé, collez-la ci-dessous pour voir l'usage. Sinon, faites la demande à gauche.", es: "Si ya tienes una clave, pégala abajo para ver el uso. Si no, solicítala a la izquierda.", ar: "إن كان لديك مفتاح، الصقه أدناه لعرض الاستخدام. وإلا فتقدّم على اليسار." },
  "dev.usagePlaceholder": { zh: "粘贴 kz_… 查询用量", en: "Paste kz_… to check usage", fr: "Collez kz_… pour voir l'usage", es: "Pega kz_… para consultar el uso", ar: "الصق kz_… لعرض الاستخدام" },
  "dev.query": { zh: "查询", en: "Query", fr: "Consulter", es: "Consultar", ar: "استعلام" },
  "dev.today": { zh: "今日调用", en: "Calls today", fr: "Appels aujourd'hui", es: "Llamadas hoy", ar: "استدعاءات اليوم" },
  "dev.d7": { zh: "近 7 天", en: "Last 7 days", fr: "7 derniers jours", es: "Últimos 7 días", ar: "آخر ٧ أيام" },
  "dev.month": { zh: "本月", en: "This month", fr: "Ce mois", es: "Este mes", ar: "هذا الشهر" },
  "dev.monthQuota": { zh: "月配额", en: "Monthly quota", fr: "Quota mensuel", es: "Cuota mensual", ar: "الحصة الشهرية" },
  "dev.topEndpoints": { zh: "7 天热门接口", en: "Top endpoints (7 days)", fr: "Points d'accès populaires (7 jours)", es: "Endpoints populares (7 días)", ar: "أكثر الواجهات استخدامًا (٧ أيام)" },
  "dev.dashboard": { zh: "用量看板", en: "Usage dashboard", fr: "Tableau d'usage", es: "Panel de uso", ar: "لوحة الاستخدام" },
  "dev.rateStatus": {
    zh: "限速：{a} · 状态：{b}", en: "Rate limit: {a} · Status: {b}",
    fr: "Limite : {a} · Statut : {b}", es: "Límite: {a} · Estado: {b}",
    ar: "الحد: {a} · الحالة: {b}",
  },
  "dev.quickstart": { zh: "快速入门", en: "Quick start", fr: "Démarrage rapide", es: "Inicio rápido", ar: "بداية سريعة" },
  "dev.copyUrl": { zh: "复制链接", en: "Copy URL", fr: "Copier l'URL", es: "Copiar URL", ar: "نسخ الرابط" },
  "dev.tryIt": { zh: "试一试", en: "Try it", fr: "Essayer", es: "Probar", ar: "جرّب" },
  "dev.swagger": { zh: "在线 Swagger 文档", en: "Swagger docs", fr: "Docs Swagger", es: "Docs Swagger", ar: "وثائق Swagger" },
  "dev.openEndpoints": { zh: "已开放接口", en: "Available endpoints", fr: "Points d'accès disponibles", es: "Endpoints disponibles", ar: "الواجهات المتاحة" },
  "developers.reachEntry.title": { zh: "语言与覆盖范围", en: "Language coverage", fr: "Couverture linguistique", es: "Cobertura lingüística", ar: "التغطية اللغوية" },
  "developers.reachEntry.sub": { zh: "看平台支持哪些语言、哪些文明语料已接入，以及 API 的覆盖边界。", en: "See which languages and civilizational corpora are supported, and the API coverage.", fr: "Voyez les langues et corpus civilisationnels pris en charge, ainsi que la couverture de l'API.", es: "Consulta los idiomas y corpus civilizacionales admitidos y la cobertura de la API.", ar: "اطّلع على اللغات والمدونات الحضارية المدعومة ونطاق تغطية الواجهة." },
  "dev.authQuota": { zh: "鉴权信息与配额", en: "Auth info and quota", fr: "Infos d'authentification et quota", es: "Información de autenticación y cuota", ar: "معلومات المصادقة والحصة" },
  "dev.ep.search": { zh: "语义检索（向量 + 5 语）", en: "Semantic search (vector + 5 languages)", fr: "Recherche sémantique (vecteur + 5 langues)", es: "Búsqueda semántica (vector + 5 idiomas)", ar: "بحث دلالي (متجه + ٥ لغات)" },
  "dev.ep.passage": { zh: "经典原文五层信息", en: "Five-layer passage info", fr: "Informations à cinq couches", es: "Información en cinco capas", ar: "معلومات النص في خمس طبقات" },
  "dev.ep.topics": { zh: "5 大全球议题列表", en: "List of the 5 global topics", fr: "Liste des 5 thèmes mondiaux", es: "Lista de los 5 temas globales", ar: "قائمة الموضوعات العالمية الخمسة" },
  "dev.ep.topicStances": { zh: "议题 + 5 文明对照立场", en: "Topic + 5-civilization stances", fr: "Thème + positions de 5 civilisations", es: "Tema + posturas de 5 civilizaciones", ar: "الموضوع + مواقف ٥ حضارات" },
  "dev.ep.cases": { zh: "跨文明对话案例列表（已审）", en: "Cross-civ dialogue cases (reviewed)", fr: "Cas de dialogue inter-civilisations (relus)", es: "Casos de diálogo intercivilizacional (revisados)", ar: "حالات الحوار بين الحضارات (مراجَعة)" },
  "dev.ep.caseDetail": { zh: "案例详情", en: "Case detail", fr: "Détail du cas", es: "Detalle del caso", ar: "تفاصيل الحالة" },
  "dev.ep.corpus": { zh: "平台语料规模", en: "Corpus scale", fr: "Taille du corpus", es: "Escala del corpus", ar: "حجم المدونة" },

  // ── 通用状态 ─────────────────────────────────────────────────────────
  "st.draft": { zh: "待审", en: "Pending", fr: "En attente", es: "Pendiente", ar: "قيد المراجعة" },
  "st.reviewed": { zh: "已审", en: "Reviewed", fr: "Relu", es: "Revisado", ar: "تمت المراجعة" },
  "st.published": { zh: "已发布", en: "Published", fr: "Publié", es: "Publicado", ar: "منشور" },
  "st.deprecated": { zh: "已废弃", en: "Deprecated", fr: "Abandonné", es: "Obsoleto", ar: "مهمَل" },
  "st.approved": { zh: "已审批", en: "Approved", fr: "Approuvé", es: "Aprobado", ar: "معتمد" },
  "st.paused": { zh: "暂停", en: "Paused", fr: "En pause", es: "En pausa", ar: "متوقّف" },
  "st.rejected": { zh: "拒绝", en: "Rejected", fr: "Refusé", es: "Rechazado", ar: "مرفوض" },

  // ── 管理后台（通用） ─────────────────────────────────────────────────
  "adm.noPerm": { zh: "需要管理员权限", en: "Administrator access required", fr: "Accès administrateur requis", es: "Se requiere acceso de administrador", ar: "مطلوب صلاحية مشرف" },
  "adm.granted": { zh: "管理员通过邮箱白名单授予。", en: "Admin access is granted via an email allowlist.", fr: "L'accès administrateur est accordé via une liste d'e-mails.", es: "El acceso de administrador se concede por lista blanca de correos.", ar: "تُمنح صلاحية المشرف عبر قائمة بريد مسموح بها." },
  "adm.granted2": { zh: "如果你是被授权的管理员，请用对应邮箱登录。", en: "If you are an authorised administrator, sign in with that email.", fr: "Si vous êtes administrateur autorisé, connectez-vous avec cet e-mail.", es: "Si eres administrador autorizado, inicia sesión con ese correo.", ar: "إن كنت مشرفًا معتمدًا فسجّل الدخول بذلك البريد." },
  "adm.loginAsAdmin": { zh: "用管理员邮箱登录 →", en: "Sign in with an admin email →", fr: "Se connecter avec un e-mail administrateur →", es: "Inicia sesión con un correo de administrador →", ar: "سجّل الدخول ببريد مشرف ←" },
  "adm.currentAccount": {
    // {email} 由调用方替换
    zh: "当前登录账号 {email} 不在管理员白名单。",
    en: "The signed-in account {email} is not on the administrator allowlist.",
    fr: "Le compte connecté {email} ne figure pas sur la liste des administrateurs.",
    es: "La cuenta conectada {email} no está en la lista de administradores.",
    ar: "الحساب المسجَّل {email} ليس ضمن قائمة المشرفين المسموح بها.",
  },
  "adm.applyHint": { zh: "如需申请管理员权限，请联系平台运营。", en: "To request administrator access, contact platform operations.", fr: "Pour demander un accès administrateur, contactez l'équipe d'exploitation.", es: "Para solicitar acceso de administrador, contacta con operaciones.", ar: "لطلب صلاحية المشرف، تواصل مع فريق التشغيل." },
  "adm.applyHint2": { zh: "如需申请，请联系平台运营。", en: "To request access, contact platform operations.", fr: "Pour demander l'accès, contactez l'équipe d'exploitation.", es: "Para solicitarlo, contacta con operaciones.", ar: "للطلب، تواصل مع فريق التشغيل." },
  "adm.loadFail": { zh: "载入失败", en: "Failed to load", fr: "Échec du chargement", es: "Error al cargar", ar: "فشل التحميل" },
  "adm.all": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "adm.prev": { zh: "上一页", en: "Previous", fr: "Précédent", es: "Anterior", ar: "السابق" },
  "adm.next": { zh: "下一页", en: "Next", fr: "Suivant", es: "Siguiente", ar: "التالي" },

  // ── 管理后台 · 案例审核 ──────────────────────────────────────────────
  "adm.publishedCount": { zh: "已发 {n}", en: "{n} published", fr: "{n} publiés", es: "{n} publicados", ar: "{n} منشور" },
  "adm.qualityDist": { zh: "审核质量分布 · 共 {n} 条", en: "Review-quality distribution · {n} total", fr: "Répartition de la qualité de relecture · {n} au total", es: "Distribución de calidad de revisión · {n} en total", ar: "توزيع جودة المراجعة · الإجمالي {n}" },
  "adm.audit.title": { zh: "AI 一键盖章 vs 真正人审", en: "AI rubber-stamp vs. real human review", fr: "Validation automatique par IA vs. relecture humaine", es: "Sello automático de IA vs. revisión humana real", ar: "ختم آلي بالذكاء الاصطناعي مقابل مراجعة بشرية حقيقية" },
  "adm.audit.none": { zh: "完全未审", en: "Never reviewed", fr: "Jamais relu", es: "Nunca revisado", ar: "لم تُراجَع إطلاقًا" },
  "adm.audit.noneDesc": { zh: "还没有 reviewer 字段，未走过任何审核流程", en: "No reviewer field yet — has not gone through any review", fr: "Pas encore de champ relecteur — aucun processus de relecture", es: "Aún sin campo de revisor: no ha pasado por ninguna revisión", ar: "لا حقل مراجع بعد — لم تمر بأي مراجعة" },
  "adm.audit.ai": { zh: "AI 一键盖章", en: "AI rubber-stamp", fr: "Validation automatique", es: "Sello automático", ar: "ختم آلي" },
  "adm.audit.aiDesc": { zh: "有 reviewer 但未评星、无备注——多为批量发布产物", en: "Has a reviewer but no rating and no note — usually a bulk-publish artefact", fr: "Un relecteur existe mais sans note ni remarque — souvent un artefact de publication en masse", es: "Tiene revisor pero sin valoración ni nota: suele ser un artefacto de publicación masiva", ar: "له مراجع لكن دون تقييم أو ملاحظة — غالبًا ناتج نشر جماعي" },
  "adm.audit.human": { zh: "已人审", en: "Human-reviewed", fr: "Relu par un humain", es: "Revisado por persona", ar: "مراجَع بشريًا" },
  "adm.audit.humanDesc": { zh: "评了星或写了备注，可视作真正人工质检过", en: "Rated or annotated — can be regarded as genuinely quality-checked", fr: "Noté ou annoté — peut être considéré comme réellement contrôlé", es: "Valorado o anotado: puede considerarse revisado de verdad", ar: "قُيِّم أو أُضيفت ملاحظة — يمكن اعتباره مفحوصًا فعليًا" },
  "adm.audit.warn": {
    zh: "注意：「AI 一键盖章」与「已人审」是两种完全不同的质量级别——前者只是流程过了，内容未必权威。",
    en: "Note: “AI rubber-stamp” and “human-reviewed” are two entirely different quality levels — the former only means the workflow passed, not that the content is authoritative.",
    fr: "Note : « Validation automatique » et « relu par un humain » sont deux niveaux de qualité entièrement différents — le premier signifie seulement que le processus est passé, pas que le contenu fait autorité.",
    es: "Nota: «Sello automático» y «revisado por persona» son dos niveles de calidad totalmente distintos: el primero solo indica que el flujo se completó, no que el contenido sea fiable.",
    ar: "ملاحظة: «الختم الآلي» و«المراجعة البشرية» مستويان مختلفان تمامًا في الجودة — فالأول يعني فقط اجتياز المسار لا موثوقية المحتوى.",
  },
  "adm.topic": { zh: "议题：", en: "Topics: ", fr: "Thèmes : ", es: "Temas: ", ar: "الموضوعات: " },
  "adm.status": { zh: "状态：", en: "Status: ", fr: "Statut : ", es: "Estado: ", ar: "الحالة: " },
  "adm.quality": { zh: "审核质量：", en: "Review quality: ", fr: "Qualité de relecture : ", es: "Calidad de revisión: ", ar: "جودة المراجعة: " },
  "adm.aiHint": { zh: "内容由 AI 协助生成，可能含模板拼装", en: "Content is AI-assisted and may contain templated assembly", fr: "Contenu assisté par IA, pouvant inclure un assemblage type", es: "Contenido asistido por IA, puede incluir ensamblaje de plantilla", ar: "المحتوى بمساعدة الذكاء الاصطناعي وقد يتضمن تجميعًا قوالبياً" },
  "adm.aiAssist": { zh: "AI 协助", en: "AI-assisted", fr: "Assisté par IA", es: "Asistido por IA", ar: "بمساعدة الذكاء الاصطناعي" },
  "adm.note": { zh: "备注", en: "Note", fr: "Remarque", es: "Nota", ar: "ملاحظة" },
  "adm.qualityLabel": { zh: "质量：", en: "Quality: ", fr: "Qualité : ", es: "Calidad: ", ar: "الجودة: " },
  "adm.stars": { zh: "{n} 星", en: "{n} stars", fr: "{n} étoiles", es: "{n} estrellas", ar: "{n} نجوم" },
  "adm.publish": { zh: "发布", en: "Publish", fr: "Publier", es: "Publicar", ar: "نشر" },
  "adm.deprecate": { zh: "废弃", en: "Deprecate", fr: "Abandonner", es: "Obsoletar", ar: "إهمال" },
  "adm.withdraw": { zh: "撤回", en: "Withdraw", fr: "Retirer", es: "Retirar", ar: "سحب" },
  "adm.empty": { zh: "该筛选下无案例", en: "No cases under this filter", fr: "Aucun cas pour ce filtre", es: "Sin casos con este filtro", ar: "لا حالات تحت هذا الفلتر" },
  "adm.noReviewer": { zh: "无 reviewer 字段，从未走过审核流程", en: "No reviewer field — has never gone through review", fr: "Pas de champ relecteur — jamais passé par la relecture", es: "Sin campo de revisor: nunca pasó por revisión", ar: "لا حقل مراجع — لم يمر بأي مراجعة" },
  "adm.badge.none": { zh: "◯ 未审", en: "◯ Unreviewed", fr: "◯ Non relu", es: "◯ Sin revisar", ar: "◯ غير مراجَع" },
  "adm.badge.human": { zh: "✓ 已人审", en: "✓ Human-reviewed", fr: "✓ Relu par un humain", es: "✓ Revisado por persona", ar: "✓ مراجَع بشريًا" },
  "adm.humanDesc": { zh: "评了星或写了备注，可视作人工质检过", en: "Rated or annotated — can be regarded as quality-checked", fr: "Noté ou annoté — peut être considéré comme contrôlé", es: "Valorado o anotado: puede considerarse revisado", ar: "قُيِّم أو أُضيفت ملاحظة — يمكن اعتباره مفحوصًا" },
  "adm.aiDesc2": { zh: "有 reviewer 但未评星、无备注——典型的批量发布产物，质量未必有保障", en: "Has a reviewer but no rating or note — a typical bulk-publish artefact; quality is not guaranteed", fr: "Un relecteur existe mais sans note ni remarque — artefact typique de publication en masse ; qualité non garantie", es: "Tiene revisor pero sin valoración ni nota: artefacto típico de publicación masiva; calidad no garantizada", ar: "له مراجع دون تقييم أو ملاحظة — ناتج نشر جماعي نمطي؛ والجودة غير مضمونة" },
  "adm.badge.ai": { zh: "⚡ AI 一键盖章", en: "⚡ AI rubber-stamp", fr: "⚡ Validation automatique", es: "⚡ Sello automático", ar: "⚡ ختم آلي" },

  // ── 管理后台 · 机构 ──────────────────────────────────────────────────
  "inst.quotaInline": {
    // {q} 月配额 / {k} key 数量
    zh: "配额 {q} · keys {k}", en: "Quota {q} · keys {k}",
    fr: "Quota {q} · clés {k}", es: "Cuota {q} · claves {k}",
    ar: "الحصة {q} · المفاتيح {k}",
  },
  "inst.copyClose": { zh: "复制并关闭", en: "Copy and close", fr: "Copier et fermer", es: "Copiar y cerrar", ar: "انسخ وأغلق" },
  "inst.empty": { zh: "暂无机构", en: "No institutions yet", fr: "Aucune institution", es: "Sin instituciones", ar: "لا مؤسسات بعد" },
  "inst.changeStatus": { zh: "改状态：", en: "Change status: ", fr: "Changer le statut : ", es: "Cambiar estado: ", ar: "تغيير الحالة: " },
  "inst.quota": { zh: "配额/月", en: "Quota/month", fr: "Quota/mois", es: "Cuota/mes", ar: "الحصة/شهر" },
  "inst.newKey": { zh: "发新 Key", en: "Issue new key", fr: "Émettre une nouvelle clé", es: "Emitir nueva clave", ar: "إصدار مفتاح جديد" },

  // ── 六艺（通用） ─────────────────────────────────────────────────────
  "jrn.noBackend": { zh: "后端服务暂时不可用，请稍后重试。", en: "Backend service is unavailable. Please try again shortly.", fr: "Service backend indisponible. Réessayez dans un instant.", es: "Servicio backend no disponible. Inténtalo de nuevo en un momento.", ar: "خدمة الخادم غير متاحة حاليًا. أعد المحاولة بعد قليل." },
  "jrn.noBank": { zh: "无法加载题库", en: "Cannot load the question bank", fr: "Impossible de charger la banque de questions", es: "No se puede cargar el banco de preguntas", ar: "تعذّر تحميل بنك الأسئلة" },
  "jrn.submitFail": { zh: "提交失败", en: "Submission failed", fr: "Échec de l'envoi", es: "Error al enviar", ar: "فشل الإرسال" },
  "jrn.submit": { zh: "提交", en: "Submit", fr: "Envoyer", es: "Enviar", ar: "إرسال" },
  "jrn.enter": { zh: "进入 →", en: "Enter →", fr: "Entrer →", es: "Entrar →", ar: "ادخل ←" },
  "jrn.learned": { zh: "已学", en: "Learned", fr: "Appris", es: "Aprendido", ar: "مُتعلَّم" },
  "jrn.shu": { zh: "书艺", en: "Calligraphy", fr: "Calligraphie", es: "Caligrafía", ar: "الخط" },
  "jrn.newUnlock": { zh: "新解锁经典", en: "New classic unlocked", fr: "Nouveau classique débloqué", es: "Nuevo clásico desbloqueado", ar: "نص كلاسيكي جديد مفتوح" },

  // 书艺 · 拼字
  "jrn.shu.assemble.kicker": { zh: "六艺 · 书 · 拼字", en: "Six Arts · Calligraphy · Assemble", fr: "Six arts · Calligraphie · Assemblage", es: "Seis artes · Caligrafía · Ensamblaje", ar: "الفنون الستة · الخط · التركيب" },
  "jrn.shu.assemble.title": { zh: "从部件拼出汉字", en: "Build a character from components", fr: "Composer un caractère à partir de composants", es: "Forma un carácter con componentes", ar: "ركّب حرفًا من مكوّناته" },
  "jrn.shu.assemble.subtitle": { zh: "「书以广其义」 — 理解汉字的造字结构", en: "“Writing broadens meaning” — understand how characters are built", fr: "« L'écriture élargit le sens » — comprendre la structure des caractères", es: "«La escritura amplía el sentido»: comprende la estructura de los caracteres", ar: "«الكتابة توسّع المعنى» — افهم بنية تكوين الحروف" },
  "jrn.levelN": { zh: "第 {a}/{b} 关", en: "Level {a}/{b}", fr: "Niveau {a}/{b}", es: "Nivel {a}/{b}", ar: "المرحلة {a}/{b}" },
  "jrn.backToShu": { zh: "← 书艺", en: "← Calligraphy", fr: "← Calligraphie", es: "← Caligrafía", ar: "→ الخط" },
  "jrn.hintOrigin": { zh: "本义提示", en: "Original-meaning hint", fr: "Indice du sens originel", es: "Pista del sentido original", ar: "تلميح المعنى الأصلي" },
  "jrn.revealAfter": { zh: "拼对后揭晓", en: "Revealed once correct", fr: "Révélé une fois correct", es: "Se revela al acertar", ar: "يُكشف بعد الإجابة الصحيحة" },
  "jrn.assembleHint": { zh: "点击部件填入空槽（多余的是干扰）", en: "Tap components to fill the slots (extras are distractors)", fr: "Touchez les composants pour remplir les cases (les autres sont des leurres)", es: "Toca los componentes para llenar las casillas (los demás son distractores)", ar: "انقر المكوّنات لملء الفراغات (والزائد مشتّتات)" },
  "jrn.retryChar": { zh: "重试本字", en: "Retry this character", fr: "Réessayer ce caractère", es: "Reintentar este carácter", ar: "أعد محاولة هذا الحرف" },
  "jrn.nextChar": { zh: "下一字 →", en: "Next character →", fr: "Caractère suivant →", es: "Siguiente carácter →", ar: "الحرف التالي ←" },
  "jrn.assembleOk": { zh: "拼对！书艺 +{a} · xp +6", en: "Correct! Calligraphy +{a} · xp +6", fr: "Correct ! Calligraphie +{a} · xp +6", es: "¡Correcto! Caligrafía +{a} · xp +6", ar: "صحيح! الخط +{a} · خبرة +6" },
  "jrn.assembleBad": { zh: "× 拼错。正解是：{a}", en: "× Wrong. The answer is: {a}", fr: "× Faux. La réponse est : {a}", es: "× Incorrecto. La respuesta es: {a}", ar: "× خطأ. الإجابة هي: {a}" },

  "jrn.xpToNext": {
    zh: "距「{name}」还差 {n} XP", en: "{n} XP to “{name}”",
    fr: "{n} XP avant « {name} »", es: "{n} XP para «{name}»",
    ar: "{n} نقطة خبرة للوصول إلى «{name}»",
  },
  "jrn.maxRank": { zh: "已至最高段位 · 翰林", en: "Highest rank reached · Hanlin", fr: "Rang le plus élevé atteint · Hanlin", es: "Rango máximo alcanzado · Hanlin", ar: "أعلى رتبة · هانلين" },
  "jrn.streak": { zh: "连续打卡", en: "Day streak", fr: "Série de jours", es: "Racha de días", ar: "سلسلة الأيام" },
  "jrn.checkedToday": { zh: "今日已打卡", en: "Checked in today", fr: "Pointage fait aujourd'hui", es: "Registrado hoy", ar: "تم تسجيل اليوم" },
  "jrn.checkin": { zh: "今日打卡 +20", en: "Check in today +20", fr: "Pointer aujourd'hui +20", es: "Registrar hoy +20", ar: "سجّل اليوم +20" },
  "jrn.overview": { zh: "君子之路 · 六艺总览", en: "The junzi path · Six Arts overview", fr: "La voie du junzi · Aperçu des six arts", es: "El camino del junzi · Resumen de las seis artes", ar: "طريق الجنز · نظرة على الفنون الستة" },
  "jrn.today": { zh: "今日修行", en: "Today's practice", fr: "Pratique du jour", es: "Práctica de hoy", ar: "تدريب اليوم" },
  "jrn.goal": { zh: "今日目标 {a}/{b}", en: "Daily goal {a}/{b}", fr: "Objectif du jour {a}/{b}", es: "Meta del día {a}/{b}", ar: "هدف اليوم {a}/{b}" },
  "jrn.done": { zh: "已完成", en: "Done", fr: "Terminé", es: "Hecho", ar: "منجز" },
  "jrn.todo": { zh: "完成", en: "Complete", fr: "Terminer", es: "Completar", ar: "أكمل" },
  "jrn.grandHint": {
    zh: "「六艺通才」需六艺每艺 ≥ 40；「君子大成」需每艺 ≥ 60 且任一艺 ≥ 80。",
    en: "“All-rounder of the Six Arts” needs ≥ 40 in each art; “Junzi consummate” needs ≥ 60 in each and ≥ 80 in any one.",
    fr: "« Touche-à-tout des six arts » : ≥ 40 dans chaque art ; « Junzi accompli » : ≥ 60 partout et ≥ 80 dans un art.",
    es: "«Polímata de las seis artes»: ≥ 40 en cada arte; «Junzi consumado»: ≥ 60 en cada una y ≥ 80 en alguna.",
    ar: "«متعدد المواهب في الفنون الستة» يحتاج ٤٠ على الأقل في كل فن؛ و«الجنز المكتمل» يحتاج ٦٠ في كل فن و٨٠ في أحدها.",
  },
  "jrn.leaderboard": { zh: "群体排行 · 君子之路 Top 10", en: "Community ranking · Junzi path Top 10", fr: "Classement collectif · Voie du junzi Top 10", es: "Ranking colectivo · Camino del junzi Top 10", ar: "ترتيب المجتمع · طريق الجنز — أفضل ١٠" },
  "jrn.totalPlayers": { zh: "共 {n} 位君子", en: "{n} junzi in total", fr: "{n} junzi au total", es: "{n} junzi en total", ar: "الإجمالي {n} من الجنز" },
  "jrn.youRank": { zh: "· 你第 {n} 位", en: "· you, #{n}", fr: "· vous, n° {n}", es: "· tú, n.º {n}", ar: "· أنت، رقم {n}" },
  "jrn.you": { zh: "· 你", en: "· you", fr: "· vous", es: "· tú", ar: "· أنت" },
  "jrn.enterArrow": { zh: "进入 →", en: "Enter →", fr: "Entrer →", es: "Entrar →", ar: "ادخل ←" },

  // 六艺名（礼·乐·射·御·书·数）
  "jrn.art.li": { zh: "礼", en: "Rites", fr: "Rites", es: "Ritos", ar: "الطقوس" },
  "jrn.art.yue": { zh: "乐", en: "Music", fr: "Musique", es: "Música", ar: "الموسيقى" },
  "jrn.art.she": { zh: "射", en: "Archery", fr: "Tir à l'arc", es: "Arquería", ar: "الرماية" },
  "jrn.art.yu": { zh: "御", en: "Charioteering", fr: "Conduite", es: "Conducción de carros", ar: "قيادة المركبات" },
  "jrn.art.shu": { zh: "书", en: "Calligraphy", fr: "Calligraphie", es: "Caligrafía", ar: "الخط" },
  "jrn.art.shu2": { zh: "数", en: "Mathematics", fr: "Mathématiques", es: "Matemáticas", ar: "الحساب" },
  // 段位等级（神·妙·中·试·未起）
  "jrn.grade.divine": { zh: "神", en: "Divine", fr: "Divin", es: "Divino", ar: "إلهي" },
  "jrn.grade.excellent": { zh: "妙", en: "Excellent", fr: "Excellent", es: "Excelente", ar: "ممتاز" },
  "jrn.grade.good": { zh: "中", en: "Fair", fr: "Moyen", es: "Aceptable", ar: "مقبول" },
  "jrn.grade.basic": { zh: "试", en: "Novice", fr: "Novice", es: "Novato", ar: "مبتدئ" },
  "jrn.grade.none": { zh: "未起", en: "Not started", fr: "Non commencé", es: "Sin empezar", ar: "لم يبدأ" },

  // ── 新增交互（首页金句卡 / 读经页 / 对话页）─────────────────────
  "home.quote.daily": { zh: "每日一典", en: "Daily", fr: "Quotidien", es: "Diario", ar: "اليومي" },
  "home.quote.random": { zh: "随机一句", en: "Random", fr: "Aléatoire", es: "Aleatorio", ar: "عشوائي" },
  "home.quote.copy": { zh: "复制", en: "Copy", fr: "Copier", es: "Copiar", ar: "نسخ" },
  "home.quote.copied": { zh: "已复制", en: "Copied", fr: "Copié", es: "Copiado", ar: "تم النسخ" },
  "home.quote.copyFail": { zh: "复制失败", en: "Copy failed", fr: "Échec de copie", es: "Error al copiar", ar: "فشل النسخ" },
  "home.quote.listen": { zh: "朗读", en: "Listen", fr: "Écouter", es: "Escuchar", ar: "استمع" },
  "home.quote.share": { zh: "分享卡", en: "Share card", fr: "Carte", es: "Tarjeta", ar: "بطاقة" },
  "home.quote.shared": { zh: "分享卡已生成,请在下载中查看", en: "Share card generated — check your downloads", fr: "Carte générée — voir vos téléchargements", es: "Tarjeta generada — mira tus descargas", ar: "تم إنشاء البطاقة — راجع التنزيلات" },
  "home.quote.shareFail": { zh: "分享卡生成失败", en: "Failed to generate card", fr: "Échec de génération", es: "Error al generar", ar: "فشل إنشاء البطاقة" },
  "home.quote.cite": { zh: "引用", en: "Cite", fr: "Citer", es: "Citar", ar: "استشهاد" },
  "home.quote.cited": { zh: "已复制学术引用", en: "Citation copied", fr: "Citation copiée", es: "Cita copiada", ar: "تم نسخ الاستشهاد" },
  "home.quote.transBy": { zh: "译:", en: "Trans. ", fr: "Trad. ", es: "Trad. ", ar: "ترجمة: " },
  "home.quote.transPlatform": { zh: "平台译本", en: "Platform translation", fr: "Traduction de la plateforme", es: "Traducción de la plataforma", ar: "ترجمة المنصة" },
  "home.quote.stop": { zh: "停止", en: "Stop", fr: "Arrêter", es: "Detener", ar: "إيقاف" },
  "home.quote.loading": { zh: "生成中", en: "Loading", fr: "Chargement", es: "Cargando", ar: "جارٍ التحميل" },
  "home.quote.noTts": { zh: "当前浏览器不支持朗读", en: "Speech not supported in this browser", fr: "Synthèse vocale non prise en charge", es: "Voz no compatible con este navegador", ar: "القراءة الصوتية غير مدعومة" },
  "home.quote.save": { zh: "收藏", en: "Save", fr: "Sauver", es: "Guardar", ar: "حفظ" },
  "home.quote.saved": { zh: "已收藏", en: "Saved", fr: "Sauvé", es: "Guardado", ar: "تم الحفظ" },
  "home.quote.saveFail": { zh: "收藏失败", en: "Save failed", fr: "Échec de sauvegarde", es: "Error al guardar", ar: "فشل الحفظ" },
  "home.quote.shuffle": { zh: "换一句", en: "Shuffle", fr: "Suivante", es: "Otra", ar: "تبديل" },
  "home.quote.prev": { zh: "上一句", en: "Previous", fr: "Précédente", es: "Anterior", ar: "السابق" },
  "home.quote.next": { zh: "下一句", en: "Next", fr: "Suivante", es: "Siguiente", ar: "التالي" },
  "home.topics": { zh: "全球议题 · 每日思考", en: "Global topics · Daily thinking", fr: "Enjeux mondiaux · Pensée du jour", es: "Temas globales · Pensamiento diario", ar: "قضايا عالمية · تأمل يومي" },
  "home.topics.more": { zh: "全部案例", en: "All cases", fr: "Tous les cas", es: "Todos los casos", ar: "كل الحالات" },
  "home.topics.ask": { zh: "去对话", en: "Ask", fr: "Discuter", es: "Preguntar", ar: "حاور" },
  "home.topics.empty": { zh: "该议题暂无关联经典", en: "No related classics yet", fr: "Aucun classique associé", es: "Sin clásicos relacionados", ar: "لا نصوص مرتبطة" },

  "read.copy": { zh: "复制", en: "Copy", fr: "Copier", es: "Copiar", ar: "نسخ" },
  "read.copied": { zh: "已复制", en: "Copied", fr: "Copié", es: "Copiado", ar: "تم النسخ" },
  "read.copyFail": { zh: "复制失败", en: "Copy failed", fr: "Échec de copie", es: "Error al copiar", ar: "فشل النسخ" },
  "read.saveFail": { zh: "收藏失败", en: "Save failed", fr: "Échec de sauvegarde", es: "Error al guardar", ar: "فشل الحفظ" },
  "read.prev": { zh: "上一句", en: "Prev", fr: "Précédente", es: "Anterior", ar: "السابق" },
  "read.next": { zh: "下一句", en: "Next", fr: "Suivante", es: "Siguiente", ar: "التالي" },
  "read.kbdHint": { zh: "键盘 ← / → 切换", en: "Press ← / → to navigate", fr: "← / → pour naviguer", es: "Usa ← / → para navegar", ar: "استخدم ← / → للتنقل" },
  "read.fontUp": { zh: "放大字号", en: "Bigger text", fr: "Texte plus grand", es: "Letra más grande", ar: "تكبير النص" },
  "read.fontDown": { zh: "缩小字号", en: "Smaller text", fr: "Texte plus petit", es: "Letra más pequeña", ar: "تصغير النص" },
  "read.related": { zh: "相关经典", en: "Related classics", fr: "Classiques liés", es: "Clásicos relacionados", ar: "نصوص ذات صلة" },
  "read.relatedEmpty": { zh: "暂无相关经典", en: "No related classics", fr: "Aucun classique lié", es: "Sin clásicos relacionados", ar: "لا نصوص ذات صلة" },

  "chat.stop": { zh: "停止", en: "Stop", fr: "Stop", es: "Detener", ar: "إيقاف" },
  "chat.send": { zh: "发送", en: "Send", fr: "Envoyer", es: "Enviar", ar: "إرسال" },
  "chat.copy": { zh: "复制", en: "Copy", fr: "Copier", es: "Copiar", ar: "نسخ" },
  "chat.copied": { zh: "已复制", en: "Copied", fr: "Copié", es: "Copiado", ar: "تم النسخ" },
  "chat.copyFail": { zh: "复制失败", en: "Copy failed", fr: "Échec de copie", es: "Error al copiar", ar: "فشل النسخ" },
  "chat.clear": { zh: "清空", en: "Clear", fr: "Effacer", es: "Borrar", ar: "مسح" },
  "chat.cleared": { zh: "对话已清空", en: "Conversation cleared", fr: "Conversation effacée", es: "Conversación borrada", ar: "تم مسح الحوار" },

  "lang.label": {
    zh: "语言", en: "Language",
    fr: "Langue", es: "Idioma", ar: "اللغة",
  },

  // ── 本轮新增：主页面散落文案五语化 ──
  "graph.relationsN": {
    zh: "关系 {n} 条", en: "{n} relations",
    fr: "{n} relations", es: "{n} relaciones", ar: "{n} علاقات",
  },
  "co.mineN": {
    zh: "我的贡献 · {n}", en: "My contributions · {n}",
    fr: "Mes contributions · {n}", es: "Mis aportaciones · {n}", ar: "مساهماتي · {n}",
  },
  "inst.newKeyOnce": {
    zh: "机构 #{id} 新 Key（仅此一次显示）",
    en: "Institution #{id} new key (shown only once)",
    fr: "Établissement #{id} nouvelle clé (affichée une seule fois)",
    es: "Institución #{id}: nueva clave (se muestra solo una vez)",
    ar: "مفتاح جديد للمؤسسة #{id} (يُعرض مرة واحدة فقط)",
  },
  "reach.goalPrefix": {
    zh: "目标", en: "Goal", fr: "Objectif", es: "Meta", ar: "الهدف",
  },
  "read.followHint": {
    zh: "译文跟随顶部语言：{lang}",
    en: "Translation follows the top-bar language: {lang}",
    fr: "La traduction suit la langue du haut : {lang}",
    es: "La traducción sigue el idioma superior: {lang}",
    ar: "تتبع الترجمة لغة الشريط العلوي: {lang}",
  },
  "chat.topicBanner": {
    zh: "议题 · {name}", en: "Topic · {name}",
    fr: "Thème · {name}", es: "Tema · {name}", ar: "الموضوع · {name}",
  },
  "chat.crossBanner": {
    zh: "跨文明对照 · 同议题 {n} 文明并陈",
    en: "Cross-civilizational contrast · {n} civilizations on this topic",
    fr: "Comparaison inter-civilisations · {n} civilisations sur ce thème",
    es: "Contraste intercivilizacional · {n} civilizaciones sobre este tema",
    ar: "مقارنة بين الحضارات · {n} حضارات حول هذا الموضوع",
  },
  "cases.crossBanner": {
    zh: "跨文明对照 · {n} 文明并陈",
    en: "Cross-civilizational contrast · {n} civilizations",
    fr: "Comparaison inter-civilisations · {n} civilisations",
    es: "Contraste intercivilizacional · {n} civilizaciones",
    ar: "مقارنة بين الحضارات · {n} حضارات",
  },

  // ── 本轮新增：君子之路（journey hub）文案五语化 ──
  "jrn.medalToast": {
    zh: "解锁勋章：{list}",
    en: "Badges unlocked: {list}",
    fr: "Badges débloqués : {list}",
    es: "Insignas desbloqueadas: {list}",
    ar: "أوسمة تم فتحها: {list}",
  },
  "jrn.liuyiTitle": {
    zh: "六艺称号 · {t}",
    en: "Six-Arts title · {t}",
    fr: "Titre des six arts · {t}",
    es: "Título de las seis artes · {t}",
    ar: "لقب الفنون الستة · {t}",
  },
  "jrn.totalScore": {
    zh: "总分", en: "Total", fr: "Total", es: "Total", ar: "المجموع",
  },
  "jrn.maxMin": {
    zh: "最高 {a} · 最低 {b}",
    en: "Highest {a} · Lowest {b}",
    fr: "Max {a} · Min {b}",
    es: "Máx {a} · Mín {b}",
    ar: "الأعلى {a} · الأدنى {b}",
  },
  "jrn.medals": {
    zh: "勋章 {a} / {b}",
    en: "Badges {a} / {b}",
    fr: "Badges {a} / {b}",
    es: "Insignas {a} / {b}",
    ar: "الأوسمة {a} / {b}",
  },
  "jrn.junziMedals": {
    zh: "君子勋章 · {a} / {b}",
    en: "Junzi badges · {a} / {b}",
    fr: "Badges Junzi · {a} / {b}",
    es: "Insignas Junzi · {a} / {b}",
    ar: "أوسمة الجونزي · {a} / {b}",
  },
  "jrn.systemMedals": {
    zh: "系统勋章 · {a} / {b}",
    en: "System badges · {a} / {b}",
    fr: "Badges système · {a} / {b}",
    es: "Insignas del sistema · {a} / {b}",
    ar: "أوسمة النظام · {a} / {b}",
  },

  // ── 管理后台 ──────────────────────────────────────────────
  "admin.nav.title": { zh: "管理控制台", en: "Admin Console", fr: "Console d'administration", es: "Consola de administración", ar: "لوحة المشرف" },
  "admin.nav.dashboard": { zh: "仪表盘", en: "Dashboard", fr: "Tableau de bord", es: "Panel", ar: "لوحة القيادة" },
  "admin.nav.users": { zh: "用户", en: "Users", fr: "Utilisateurs", es: "Usuarios", ar: "المستخدمون" },
  "admin.nav.audience": { zh: "受众", en: "Audience", fr: "Public", es: "Audiencia", ar: "الجمهور" },
  "admin.nav.games": { zh: "游戏", en: "Games", fr: "Jeux", es: "Juegos", ar: "الألعاب" },
  "admin.nav.content": { zh: "内容", en: "Content", fr: "Contenu", es: "Contenido", ar: "المحتوى" },
  "admin.nav.engagement": { zh: "互动", en: "Engagement", fr: "Engagement", es: "Interacción", ar: "التفاعل" },
  "admin.nav.review": { zh: "案例审核", en: "Case review", fr: "Revue des cas", es: "Revisión de casos", ar: "مراجعة الحالات" },
  "admin.nav.institutions": { zh: "机构密钥", en: "Institutions", fr: "Institutions", es: "Instituciones", ar: "المؤسسات" },
  "admin.nav.back": { zh: "返回站点", en: "Back to site", fr: "Retour au site", es: "Volver al sitio", ar: "العودة إلى الموقع" },

  "admin.guard.loading": { zh: "正在校验权限…", en: "Checking access…", fr: "Vérification de l'accès…", es: "Verificando acceso…", ar: "جارٍ التحقق من الوصول…" },
  "admin.guard.needLogin": { zh: "请先登录", en: "Please sign in first", fr: "Veuillez vous connecter", es: "Inicia sesión primero", ar: "سجّل الدخول أولاً" },
  "admin.guard.loginLink": { zh: "去登录 →", en: "Sign in →", fr: "Se connecter →", es: "Iniciar sesión →", ar: "تسجيل الدخول ←" },
  "admin.guard.needAdmin": { zh: "需要管理员权限", en: "Administrator access required", fr: "Accès administrateur requis", es: "Se requiere acceso de administrador", ar: "مطلوب صلاحية مشرف" },
  "admin.guard.needAdminDesc": { zh: "当前账户不是管理员，无法进入管理控制台。", en: "This account is not an administrator and cannot access the console.", fr: "Ce compte n'est pas administrateur et ne peut accéder à la console.", es: "Esta cuenta no es administradora y no puede acceder a la consola.", ar: "هذا الحساب ليس مشرفًا ولا يمكنه الوصول إلى اللوحة." },

  "admin.kpi.totalUsers": { zh: "用户总量", en: "Total users", fr: "Utilisateurs totaux", es: "Usuarios totales", ar: "إجمالي المستخدمين" },
  "admin.kpi.registered": { zh: "注册用户", en: "Registered", fr: "Inscrits", es: "Registrados", ar: "المسجّلون" },
  "admin.kpi.guests": { zh: "游客", en: "Guests", fr: "Invités", es: "Invitados", ar: "الضيوف" },
  "admin.kpi.admins": { zh: "管理员", en: "Admins", fr: "Admins", es: "Administradores", ar: "المشرفون" },
  "admin.kpi.newToday": { zh: "今日新增", en: "New today", fr: "Nouveaux aujourd'hui", es: "Nuevos hoy", ar: "جدد اليوم" },
  "admin.kpi.new7d": { zh: "近7日新增", en: "New · 7d", fr: "Nouveaux · 7j", es: "Nuevos · 7d", ar: "جدد · 7 أيام" },
  "admin.kpi.new30d": { zh: "近30日新增", en: "New · 30d", fr: "Nouveaux · 30j", es: "Nuevos · 30d", ar: "جدد · 30 يومًا" },
  "admin.kpi.dau": { zh: "日活 DAU", en: "DAU", fr: "DAU", es: "DAU", ar: "المستخدمون اليوميون" },
  "admin.kpi.active7d": { zh: "周活", en: "Active · 7d", fr: "Actifs · 7j", es: "Activos · 7d", ar: "نشطون · 7 أيام" },
  "admin.kpi.mau": { zh: "月活 MAU", en: "MAU", fr: "MAU", es: "MAU", ar: "المستخدمون الشهريون" },
  "admin.kpi.pvTotal": { zh: "总 PV", en: "Total PV", fr: "PV total", es: "PV total", ar: "إجمالي المشاهدات" },
  "admin.kpi.pvToday": { zh: "今日 PV", en: "PV today", fr: "PV aujourd'hui", es: "PV hoy", ar: "مشاهدات اليوم" },
  "admin.kpi.conversations": { zh: "会话数", en: "Conversations", fr: "Conversations", es: "Conversaciones", ar: "المحادثات" },
  "admin.kpi.contentTotal": { zh: "内容总量", en: "Content total", fr: "Contenu total", es: "Contenido total", ar: "إجمالي المحتوى" },
  "admin.kpi.books": { zh: "典籍", en: "Books", fr: "Livres", es: "Libros", ar: "الكتب" },
  "admin.kpi.chapters": { zh: "篇章", en: "Chapters", fr: "Chapitres", es: "Capítulos", ar: "الفصول" },
  "admin.kpi.passages": { zh: "段落", en: "Passages", fr: "Passages", es: "Pasajes", ar: "الفقرات" },
  "admin.kpi.concepts": { zh: "概念", en: "Concepts", fr: "Concepts", es: "Conceptos", ar: "المفاهيم" },
  "admin.kpi.translations": { zh: "译文", en: "Translations", fr: "Traductions", es: "Traducciones", ar: "الترجمات" },
  "admin.kpi.annotations": { zh: "注释", en: "Annotations", fr: "Annotations", es: "Anotaciones", ar: "الشروح" },

  "admin.chart.newUsers30d": { zh: "近30日新增用户", en: "New users · last 30 days", fr: "Nouveaux utilisateurs · 30 jours", es: "Usuarios nuevos · 30 días", ar: "مستخدمون جدد · آخر 30 يومًا" },
  "admin.chart.pvTrend": { zh: "PV 趋势", en: "PV trend", fr: "Tendance PV", es: "Tendencia de PV", ar: "اتجاه المشاهدات" },
  "admin.chart.langDist": { zh: "语言分布", en: "Language distribution", fr: "Répartition par langue", es: "Distribución por idioma", ar: "التوزيع حسب اللغة" },
  "admin.chart.countryDist": { zh: "国家/地区分布", en: "Country distribution", fr: "Répartition par pays", es: "Distribución por país", ar: "التوزيع حسب البلد" },
  "admin.chart.deviceDist": { zh: "设备分布", en: "Device distribution", fr: "Répartition par appareil", es: "Distribución por dispositivo", ar: "التوزيع حسب الجهاز" },
  "admin.chart.sourceDist": { zh: "来源分布", en: "Source distribution", fr: "Répartition par source", es: "Distribución por origen", ar: "التوزيع حسب المصدر" },
  "admin.chart.games": { zh: "六艺概览", en: "Six arts overview", fr: "Vue d'ensemble des six arts", es: "Resumen de las seis artes", ar: "نظرة عامة على الفنون الستة" },
  "admin.chart.transByLang": { zh: "各语译文数", en: "Translations by language", fr: "Traductions par langue", es: "Traducciones por idioma", ar: "الترجمات حسب اللغة" },
  "admin.chart.annotByLang": { zh: "各语注释数", en: "Annotations by language", fr: "Annotations par langue", es: "Anotaciones por idioma", ar: "الشروح حسب اللغة" },
  "admin.chart.casesStatus": { zh: "案例状态", en: "Case status", fr: "Statut des cas", es: "Estado de los casos", ar: "حالة الحالات" },
  "admin.chart.contribStatus": { zh: "共创状态与票数", en: "Contribution status & votes", fr: "Statut des contributions et votes", es: "Estado de contribuciones y votos", ar: "حالة المساهمات والأصوات" },
  "admin.chart.instStatus": { zh: "机构状态", en: "Institution status", fr: "Statut des institutions", es: "Estado de instituciones", ar: "حالة المؤسسات" },
  "admin.chart.apiCalls": { zh: "API 调用与延迟", en: "API calls & latency", fr: "Appels API et latence", es: "Llamadas API y latencia", ar: "استدعاءات الكمون" },
  "admin.chart.pvSeries": { zh: "PV 时序", en: "PV series", fr: "Série PV", es: "Serie de PV", ar: "سلسلة المشاهدات" },

  "admin.col.name": { zh: "显示名", en: "Display name", fr: "Nom affiché", es: "Nombre", ar: "الاسم الظاهر" },
  "admin.col.email": { zh: "邮箱", en: "Email", fr: "E-mail", es: "Correo", ar: "البريد" },
  "admin.col.guest": { zh: "游客", en: "Guest", fr: "Invité", es: "Invitado", ar: "ضيف" },
  "admin.col.admin": { zh: "管理员", en: "Admin", fr: "Admin", es: "Admin", ar: "مشرف" },
  "admin.col.lang": { zh: "语言", en: "Language", fr: "Langue", es: "Idioma", ar: "اللغة" },
  "admin.col.country": { zh: "国家/地区", en: "Country", fr: "Pays", es: "País", ar: "البلد" },
  "admin.col.xp": { zh: "XP", en: "XP", fr: "XP", es: "XP", ar: "نقاط الخبرة" },
  "admin.col.streak": { zh: "连击", en: "Streak", fr: "Série", es: "Racha", ar: "سلسلة" },
  "admin.col.signup": { zh: "注册时间", en: "Signup", fr: "Inscription", es: "Registro", ar: "التسجيل" },
  "admin.col.lastCheckin": { zh: "最近打卡", en: "Last check-in", fr: "Dernière présence", es: "Último check-in", ar: "آخر تسجيل حضور" },

  "admin.table.search": { zh: "搜索名称或邮箱…", en: "Search name or email…", fr: "Rechercher un nom ou un e-mail…", es: "Buscar nombre o correo…", ar: "ابحث عن اسم أو بريد…" },
  "admin.table.kind": { zh: "类型", en: "Kind", fr: "Type", es: "Tipo", ar: "النوع" },
  "admin.table.kindAll": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "admin.table.kindRegistered": { zh: "注册", en: "Registered", fr: "Inscrits", es: "Registrados", ar: "مسجّل" },
  "admin.table.kindGuest": { zh: "游客", en: "Guests", fr: "Invités", es: "Invitados", ar: "ضيوف" },
  "admin.table.lang": { zh: "语言", en: "Lang", fr: "Langue", es: "Idioma", ar: "اللغة" },
  "admin.table.country": { zh: "国家/地区", en: "Country", fr: "Pays", es: "País", ar: "البلد" },
  "admin.table.loading": { zh: "加载中…", en: "Loading…", fr: "Chargement…", es: "Cargando…", ar: "جارٍ التحميل…" },
  "admin.table.empty": { zh: "无数据", en: "No data", fr: "Aucune donnée", es: "Sin datos", ar: "لا توجد بيانات" },
  "admin.table.detail": { zh: "详情", en: "Details", fr: "Détails", es: "Detalles", ar: "التفاصيل" },
  "admin.table.yes": { zh: "是", en: "Yes", fr: "Oui", es: "Sí", ar: "نعم" },
  "admin.table.no": { zh: "否", en: "No", fr: "Non", es: "No", ar: "لا" },
  "admin.table.pager": { zh: "第 {p} / {tp} 页 · 共 {n} 条", en: "Page {p} / {tp} · {n} total", fr: "Page {p} / {tp} · {n} au total", es: "Página {p} / {tp} · {n} total", ar: "صفحة {p} / {tp} · {n} الإجمالي" },

  "admin.games.label": { zh: "游戏", en: "Game", fr: "Jeu", es: "Juego", ar: "لعبة" },
  "admin.games.rounds": { zh: "局数", en: "Rounds", fr: "Manches", es: "Rondas", ar: "الجولات" },
  "admin.games.answers": { zh: "作答", en: "Answers", fr: "Réponses", es: "Respuestas", ar: "الإجابات" },
  "admin.games.players": { zh: "玩家", en: "Players", fr: "Joueurs", es: "Jugadores", ar: "اللاعبون" },
  "admin.games.avgScore": { zh: "平均分", en: "Avg score", fr: "Score moyen", es: "Puntaje promedio", ar: "متوسط النقاط" },
  "admin.games.today": { zh: "今日局数", en: "Today", fr: "Aujourd'hui", es: "Hoy", ar: "اليوم" },

  "admin.content.passages": { zh: "段落数", en: "Passages", fr: "Passages", es: "Pasajes", ar: "الفقرات" },
  "admin.content.concepts": { zh: "概念数", en: "Concepts", fr: "Concepts", es: "Conceptos", ar: "المفاهيم" },
  "admin.content.topics": { zh: "议题数", en: "Topics", fr: "Sujets", es: "Temas", ar: "الموضوعات" },
  "admin.content.translations": { zh: "译文总数", en: "Translations", fr: "Traductions", es: "Traducciones", ar: "الترجمات" },
  "admin.content.annotations": { zh: "注释总数", en: "Annotations", fr: "Annotations", es: "Anotaciones", ar: "الشروح" },
  "admin.content.casesTitle": { zh: "案例库状态", en: "Case library status", fr: "État de la bibliothèque de cas", es: "Estado de la biblioteca de casos", ar: "حالة مكتبة الحالات" },

  "admin.eng.pending": { zh: "待审", en: "Pending", fr: "En attente", es: "Pendiente", ar: "قيد المراجعة" },
  "admin.eng.published": { zh: "已发布", en: "Published", fr: "Publié", es: "Publicado", ar: "منشور" },
  "admin.eng.rejected": { zh: "已拒绝", en: "Rejected", fr: "Rejeté", es: "Rechazado", ar: "مرفوض" },
  "admin.eng.upvotes": { zh: "总赞", en: "Upvotes", fr: "Votes positifs", es: "Votos a favor", ar: "الأصوات المؤيدة" },
  "admin.eng.instPending": { zh: "待审批", en: "Pending", fr: "En attente", es: "Pendiente", ar: "قيد الموافقة" },
  "admin.eng.instApproved": { zh: "已批准", en: "Approved", fr: "Approuvé", es: "Aprobado", ar: "معتمد" },
  "admin.eng.instSuspended": { zh: "已暂停", en: "Suspended", fr: "Suspendu", es: "Suspendido", ar: "موقوف" },
  "admin.eng.instRejected": { zh: "已拒绝", en: "Rejected", fr: "Rejeté", es: "Rechazado", ar: "مرفوض" },
  "admin.eng.apiCalls": { zh: "API 调用", en: "API calls", fr: "Appels API", es: "Llamadas API", ar: "استدعاءات API" },
  "admin.eng.avgLatency": { zh: "平均延迟", en: "Avg latency", fr: "Latence moyenne", es: "Latencia promedio", ar: "متوسط الكمون" },
  "admin.eng.latencyUnit": { zh: "毫秒", en: "ms", fr: "ms", es: "ms", ar: "مللي ثانية" },
  "admin.eng.reviewed": { zh: "已审定", en: "Reviewed", fr: "Relu", es: "Revisado", ar: "تمت مراجعته" },
  // ── 流量 / 人次管理（/admin/traffic）──
  "admin.nav.traffic": { zh: "流量", en: "Traffic", fr: "Trafic", es: "Tráfico", ar: "حركة الزوار" },
  "admin.traffic.kpi.pv": { zh: "总人次", en: "Total PV", fr: "PV total", es: "PV total", ar: "إجمالي المشاهدات" },
  "admin.traffic.kpi.pvToday": { zh: "今日人次", en: "PV today", fr: "PV aujourd'hui", es: "PV hoy", ar: "مشاهدات اليوم" },
  "admin.traffic.kpi.uv": { zh: "总人数 (UV)", en: "Unique visitors", fr: "Visiteurs uniques", es: "Visitantes únicos", ar: "زوار فريدون" },
  "admin.traffic.kpi.logged": { zh: "登录人次", en: "Logged-in PV", fr: "PV connectés", es: "PV con sesión", ar: "مشاهدات مسجلة الدخول" },
  "admin.traffic.chart.trend": { zh: "每日 PV · UV 趋势", en: "Daily PV & UV trend", fr: "Tendance PV et UV par jour", es: "Tendencia de PV y UV diarias", ar: "اتجاه PV و UV اليومي" },
  "admin.traffic.chart.pv": { zh: "人次", en: "PV", fr: "PV", es: "PV", ar: "المشاهدات" },
  "admin.traffic.chart.uv": { zh: "人数", en: "UV", fr: "UV", es: "UV", ar: "الزوار" },
  "admin.traffic.title.pages": { zh: "按页面的人次 / 人数", en: "Per-page hits & visitors", fr: "Hits et visiteurs par page", es: "Visitas y visitantes por página", ar: "المشاهدات والزوار حسب الصفحة" },
  "admin.traffic.title.events": { zh: "原始事件", en: "Raw events", fr: "Événements bruts", es: "Eventos en bruto", ar: "الأحداث الخام" },
  "admin.traffic.col.path": { zh: "路径", en: "Path", fr: "Chemin", es: "Ruta", ar: "المسار" },
  "admin.traffic.col.pv": { zh: "人次", en: "PV", fr: "PV", es: "PV", ar: "المشاهدات" },
  "admin.traffic.col.uv": { zh: "人数", en: "UV", fr: "UV", es: "UV", ar: "الزوار" },
  "admin.traffic.col.logged": { zh: "登录人次", en: "Logged-in", fr: "Connectés", es: "Con sesión", ar: "مسجلة الدخول" },
  "admin.traffic.col.today": { zh: "今日", en: "Today", fr: "Aujourd'hui", es: "Hoy", ar: "اليوم" },
  "admin.traffic.col.week": { zh: "近7日", en: "Last 7d", fr: "7 j.", es: "7 d.", ar: "آخر 7 أيام" },
  "admin.traffic.col.visitor": { zh: "访客", en: "Visitor", fr: "Visiteur", es: "Visitante", ar: "زائر" },
  "admin.traffic.col.user": { zh: "用户", en: "User", fr: "Utilisateur", es: "Usuario", ar: "مستخدم" },
  "admin.traffic.col.device": { zh: "设备", en: "Device", fr: "Appareil", es: "Dispositivo", ar: "جهاز" },
  "admin.traffic.col.source": { zh: "来源", en: "Source", fr: "Source", es: "Origen", ar: "مصدر" },
  "admin.traffic.col.country": { zh: "国家/地区", en: "Country", fr: "Pays", es: "País", ar: "البلد" },
  "admin.traffic.col.time": { zh: "时间", en: "Time", fr: "Heure", es: "Hora", ar: "الوقت" },
  "admin.traffic.filter.path": { zh: "按路径筛选…", en: "Filter by path…", fr: "Filtrer par chemin…", es: "Filtrar por ruta…", ar: "تصفية حسب المسار…" },
  "admin.traffic.events.clear": { zh: "清空该路径", en: "Clear path", fr: "Effacer le chemin", es: "Vaciar ruta", ar: "مسح المسار" },
  "admin.traffic.events.export": { zh: "导出 CSV", en: "Export CSV", fr: "Exporter CSV", es: "Exportar CSV", ar: "تصدير CSV" },
  "admin.traffic.events.confirmDelete": { zh: "确定删除这条事件？此操作不可撤销。", en: "Delete this event? This cannot be undone.", fr: "Supprimer cet événement ? Action irréversible.", es: "¿Eliminar este evento? No se puede deshacer.", ar: "هل تريد حذف هذا الحدث؟ لا يمكن التراجع." },
  "admin.traffic.events.confirmClear": { zh: "确定清空路径 {path} 的全部事件？此操作不可撤销。", en: "Delete all events on {path}? This cannot be undone.", fr: "Effacer tous les événements sur {path} ? Irréversible.", es: "¿Eliminar todos los eventos en {path}? No se puede deshacer.", ar: "هل تريد حذف جميع الأحداث في {path}؟ لا يمكن التراجع." },
  "admin.traffic.row.expand": { zh: "展开事件", en: "Expand events", fr: "Afficher les événements", es: "Ver eventos", ar: "عرض الأحداث" },
  "admin.traffic.row.collapse": { zh: "收起事件", en: "Collapse", fr: "Réduire", es: "Contraer", ar: "طي" },

  // ── 评论管理（/admin/comments）──
  "admin.nav.comments": { zh: "评论", en: "Comments", fr: "Commentaires", es: "Comentarios", ar: "التعليقات" },
  "admin.comments.stat.total": { zh: "总数", en: "Total", fr: "Total", es: "Total", ar: "الإجمالي" },
  "admin.comments.stat.visible": { zh: "可见", en: "Visible", fr: "Visibles", es: "Visibles", ar: "ظاهر" },
  "admin.comments.stat.hidden": { zh: "隐藏", en: "Hidden", fr: "Masqués", es: "Ocultos", ar: "مخفي" },
  "admin.comments.stat.todayNew": { zh: "今日新增", en: "New today", fr: "Nouveaux aujourd'hui", es: "Nuevos hoy", ar: "جدد اليوم" },
  "admin.comments.stat.byTarget": { zh: "按对象分布", en: "By target", fr: "Par cible", es: "Por destino", ar: "حسب الهدف" },
  "admin.comments.col.author": { zh: "作者", en: "Author", fr: "Auteur", es: "Autor", ar: "الكاتب" },
  "admin.comments.col.content": { zh: "内容", en: "Content", fr: "Contenu", es: "Contenido", ar: "المحتوى" },
  "admin.comments.col.target": { zh: "对象", en: "Target", fr: "Cible", es: "Destino", ar: "الهدف" },
  "admin.comments.col.status": { zh: "状态", en: "Status", fr: "Statut", es: "Estado", ar: "الحالة" },
  "admin.comments.col.likes": { zh: "点赞", en: "Likes", fr: "J'aime", es: "Me gusta", ar: "الإعجابات" },
  "admin.comments.col.reports": { zh: "举报", en: "Reports", fr: "Signals", es: "Denuncias", ar: "البلاغات" },
  "admin.comments.col.time": { zh: "时间", en: "Time", fr: "Heure", es: "Hora", ar: "الوقت" },
  "admin.comments.filter.status": { zh: "状态", en: "Status", fr: "Statut", es: "Estado", ar: "الحالة" },
  "admin.comments.filter.all": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "admin.comments.filter.visible": { zh: "可见", en: "Visible", fr: "Visible", es: "Visible", ar: "ظاهر" },
  "admin.comments.filter.hidden": { zh: "隐藏", en: "Hidden", fr: "Masqué", es: "Oculto", ar: "مخفي" },
  "admin.comments.filter.targetType": { zh: "对象类型", en: "Target type", fr: "Type de cible", es: "Tipo de destino", ar: "نوع الهدف" },
  "admin.comments.status.visible": { zh: "可见", en: "Visible", fr: "Visible", es: "Visible", ar: "ظاهر" },
  "admin.comments.status.hidden": { zh: "隐藏", en: "Hidden", fr: "Masqué", es: "Oculto", ar: "مخفي" },
  "admin.comments.action.approve": { zh: "通过", en: "Approve", fr: "Approuver", es: "Aprobar", ar: "الموافقة" },
  "admin.comments.action.hide": { zh: "隐藏", en: "Hide", fr: "Masquer", es: "Ocultar", ar: "إخفاء" },
  "admin.comments.edit.title": { zh: "编辑评论", en: "Edit comment", fr: "Modifier le commentaire", es: "Editar comentario", ar: "تعديل التعليق" },
  "admin.comments.edit.content": { zh: "评论内容", en: "Comment content", fr: "Contenu du commentaire", es: "Contenido del comentario", ar: "محتوى التعليق" },
  "admin.comments.confirmDelete": { zh: "确定删除这条评论？此操作不可撤销。", en: "Delete this comment? This cannot be undone.", fr: "Supprimer ce commentaire ? Irréversible.", es: "¿Eliminar este comentario? No se puede deshacer.", ar: "هل تريد حذف هذا التعليق؟ لا يمكن التراجع." },

  // ── 控制台外壳：侧栏分组 / 折叠 ──
  "admin.sb.group.overview": { zh: "概览", en: "Overview", fr: "Vue d'ensemble", es: "Resumen", ar: "نظرة عامة" },
  "admin.sb.group.manage": { zh: "管理", en: "Manage", fr: "Gestion", es: "Gestión", ar: "الإدارة" },
  "admin.sb.group.content": { zh: "内容", en: "Content", fr: "Contenu", es: "Contenido", ar: "المحتوى" },
  "admin.sb.group.system": { zh: "系统", en: "System", fr: "Système", es: "Sistema", ar: "النظام" },
  "admin.sb.collapse": { zh: "收起侧栏", en: "Collapse", fr: "Réduire", es: "Colapsar", ar: "طي الشريط" },
  "admin.sb.expand": { zh: "展开侧栏", en: "Expand", fr: "Déplier", es: "Expandir", ar: "توسيع الشريط" },

  // ── 命令面板（⌘K）──
  "admin.cmds.placeholder": { zh: "搜索页面或操作…", en: "Search pages and actions…", fr: "Rechercher une page ou une action…", es: "Buscar páginas o acciones…", ar: "ابحث عن صفحة أو إجراء…" },
  "admin.cmds.empty": { zh: "未找到结果", en: "No results", fr: "Aucun résultat", es: "Sin resultados", ar: "لا توجد نتائج" },
  "admin.cmds.group.pages": { zh: "页面", en: "Pages", fr: "Pages", es: "Páginas", ar: "الصفحات" },
  "admin.cmds.group.actions": { zh: "操作", en: "Actions", fr: "Actions", es: "Acciones", ar: "الإجراءات" },
  "admin.cmds.goto": { zh: "前往", en: "Go to", fr: "Aller à", es: "Ir a", ar: "انتقل إلى" },
  "admin.cmds.run": { zh: "执行", en: "Run", fr: "Exécuter", es: "Ejecutar", ar: "تنفيذ" },
  "admin.cmds.backToSite": { zh: "返回站点", en: "Back to site", fr: "Retour au site", es: "Volver al sitio", ar: "العودة إلى الموقع" },

  // ── 仪表盘：活动流 / 趋势 ──
  "admin.dash.activity": { zh: "最近实时活动", en: "Recent activity", fr: "Activité récente", es: "Actividad reciente", ar: "النشاط الأخير" },
  "admin.dash.activityEmpty": { zh: "暂无最近操作", en: "No recent activity", fr: "Aucune activité récente", es: "Sin actividad reciente", ar: "لا يوجد نشاط حديث" },
  "admin.dash.trend": { zh: "趋势", en: "Trend", fr: "Tendance", es: "Tendencia", ar: "الاتجاه" },

  // ── 统一表格：排序 / 批量 ──
  "admin.table.selected": { zh: "已选 {n} 项", en: "{n} selected", fr: "{n} sélectionnées", es: "{n} seleccionadas", ar: "تم تحديد {n}" },
  "admin.table.clear": { zh: "清除", en: "Clear", fr: "Effacer", es: "Limpiar", ar: "مسح" },
  "admin.table.sort": { zh: "排序", en: "Sort", fr: "Trier", es: "Ordenar", ar: "ترتيب" },
  "admin.table.asc": { zh: "升序", en: "Asc", fr: "Croissant", es: "Asc", ar: "تصاعدي" },
  "admin.table.desc": { zh: "降序", en: "Desc", fr: "Décroissant", es: "Desc", ar: "تنازلي" },

  // ── 统一空 / 错状态（印章式占位）──
  "state.empty.title": {
    zh: "尚待落笔",
    en: "A blank scroll",
    fr: "Un parchemin vierge",
    es: "Un pergamino en blanco",
    ar: "صفحة بيضاء",
  },
  "state.empty.sub": {
    zh: "此处还没有内容，先去别处看看，稍后再来。",
    en: "Nothing here yet. Explore elsewhere and come back soon.",
    fr: "Rien ici pour l'instant. Explorez ailleurs et revenez plus tard.",
    es: "Aún no hay nada aquí. Explora otro sitio y vuelve luego.",
    ar: "لا شيء هنا بعد. استكشِف مكانًا آخر وعُد لاحقًا.",
  },
  "state.error.title": {
    zh: "断了联系",
    en: "Lost the thread",
    fr: "Le fil est coupé",
    es: "Se cortó el hilo",
    ar: "انقطع الخيط",
  },
  "state.error.sub": {
    zh: "没能连上服务，请稍后重试。",
    en: "Couldn't reach the service. Please try again.",
    fr: "Le service est injoignable. Veuillez réessayer.",
    es: "No se pudo conectar con el servicio. Inténtalo de nuevo.",
    ar: "تعذّر الوصول إلى الخدمة. يُرجى المحاولة مرة أخرى.",
  },
  "state.retry": {
    zh: "重试",
    en: "Retry",
    fr: "Réessayer",
    es: "Reintentar",
    ar: "إعادة المحاولة",
  },
  "graph.empty.sub": {
    zh: "图谱数据尚未就绪，双击节点可深入其关系网络。",
    en: "The graph is warming up. Double-click a node to dive into its network.",
    fr: "Le graphe se prépare. Double-cliquez sur un nœud pour explorer son réseau.",
    es: "El grafo se está preparando. Haz doble clic en un nodo para explorar su red.",
    ar: "الرسم البياني قيد التجهيز. انقر نقرًا مزدوجًا على عقدة لاستكشاف شبكتها.",
  },
  "feed.empty.sub": {
    zh: "金句还在整理中，下拉刷新一下试试。",
    en: "The quotes are being gathered. Pull to refresh.",
    fr: "Les citations sont en cours de rassemblement. Glissez pour actualiser.",
    es: "Las citas se están reuniendo. Desplázate para actualizar.",
    ar: "الحكم قيد التجميع. اسحب للتحديث.",
  },
  "kiosk.loading": {
    zh: "正在启幕…",
    en: "Rolling up…",
    fr: "Le rideau se lève…",
    es: "Subiendo el telón…",
    ar: "الستارة تُرفع…",
  },

  // -- 管理端博物馆工具台语言：系统公告 + 溯源图注 --
  "admin.announcement.tag": {
    zh: "公告", en: "Notice", fr: "Avis", es: "Aviso", ar: "تنبيه",
  },
  "admin.announcement.bar": {
    zh: "博物馆工具台：审核、密钥与状态变更仅管理员可见，操作即时落库。",
    en: "Museum workbench: review, keys and status changes are admin-only and take effect immediately.",
    fr: "Établi du musée : la revue, les clés et les changements de statut sont réservés aux administrateurs et prennent effet immédiatement.",
    es: "Mesa de trabajo del museo: la revisión, las claves y los cambios de estado son solo para administradores y surten efecto de inmediato.",
    ar: "منصة عمل المتحف: المراجعة والمفاتيح وتغييرات الحالة مخصصة للمشرفين فقط وتصبح نافذة فورًا.",
  },
  "admin.prov.lang": {
    zh: "语言", en: "Language", fr: "Langue", es: "Idioma", ar: "اللغة",
  },
  "admin.prov.version": {
    zh: "版本", en: "Version", fr: "Version", es: "Versión", ar: "الإصدار",
  },
  "admin.prov.catalog": {
    zh: "编号", en: "Inv. No.", fr: "N° d'inv.", es: "N.º inv.", ar: "رقم الجرد",
  },
  "admin.prov.pd": {
    zh: "公有领域", en: "Public domain", fr: "Domaine public", es: "Dominio público", ar: "ملك عام",
  },
  "admin.prov.snapshot": {
    zh: "数据快照", en: "Snapshot", fr: "Instantané", es: "Instantánea", ar: "لقطة",
  },
  // ── 策展式博物馆：首页主视觉 / 滑轨 / 溯源图注 ──────────────────────
  "home.announce.tag": {
    zh: "新展", en: "Now on view", fr: "À l'affiche", es: "En exhibición", ar: "جديد الآن",
  },
  "home.announce.text": {
    zh: "常设专题展：《论语》十卷 · 从西汉竹书到数字化校勘本",
    en: "Permanent exhibition: The Analects in ten books — from Han bamboo slips to the digital critical edition",
    fr: "Exposition permanente : les Analectes en dix livres — des rouleaux de bambou des Han à l'édition critique numérique",
    es: "Exposición permanente: Las Analectas en diez libros — desde las tiras de bambú Han hasta la edición crítica digital",
    ar: "معرض دائم: «المنتخبات» في عشرة كتب — من اللوحات الخشبية في عهد الهان إلى الطبعة الرقمية المحققة",
  },
  "home.curator.kicker": {
    zh: "馆藏 · 专题", en: "Collection · Curated", fr: "Collection · Dossier", es: "Colección · Dossier", ar: "مقتنيات · موضوع",
  },
  "home.curator.title": {
    zh: "《论语》版本流传",
    en: "The Transmission of the Analects",
    fr: "La transmission des Analectes",
    es: "La transmisión de las Analectas",
    ar: "نقل «المنتخبات» عبر العصور",
  },
  "home.curator.desc": {
    zh: "从西汉竹书到宋刻元刊，一部经典如何被抄写、校勘与阐释了两千余年。",
    en: "From Han bamboo slips to Song blockprints: how a classic was copied, collated and read across two millennia.",
    fr: "Des manuscrits sur bambou des Han aux impressions Song : comment un classique fut copié, établi et lu pendant plus de deux mille ans.",
    es: "De las tiras de bambú Han a las impresiones Song: cómo un clásico fue copiado, cotejado y leído durante dos milenios.",
    ar: "من اللوحات الخشبية في عهد الهان إلى المطبوعات المنقوشة في عهد سونغ: كيف نُسخ هذا الكتاب الكلاسيكي وحُقق وقُرئ على مدى ألفين من السنين.",
  },
  "home.curator.cta": {
    zh: "进入读经", en: "Start reading", fr: "Commencer la lecture", es: "Comenzar la lectura", ar: "ابدأ القراءة",
  },
  "home.rail.title": {
    zh: "继续探索 · 馆藏精选",
    en: "Continue exploring · Selected works",
    fr: "Poursuivre · Chefs-d'œuvre",
    es: "Continuar · Obras destacadas",
    ar: "واصل الاستكشاف · مختارات",
  },
  "home.rail.readNote": {
    zh: "按篇浏览全部经文",
    en: "Browse all passages by chapter",
    fr: "Parcourir tous les passages par chapitre",
    es: "Explorar todos los pasajes por capítulo",
    ar: "تصفّح جميع النصوص حسب الفصل",
  },

  // 溯源图注共享文案（出处/版本/编号/年代/译者/权属）
  "prov.label.source": { zh: "出处", en: "Source", fr: "Source", es: "Fuente", ar: "المصدر" },
  "prov.label.version": { zh: "版本", en: "Edition", fr: "Édition", es: "Edición", ar: "الطبعة" },
  "prov.label.no": { zh: "编号", en: "Accession", fr: "Cote", es: "N.º", ar: "الرقم" },
  "prov.label.era": { zh: "年代", en: "Era", fr: "Époque", es: "Época", ar: "الحقبة" },
  "prov.label.translator": { zh: "译者", en: "Translator", fr: "Traducteur", es: "Traductor", ar: "المترجم" },
  "prov.label.rights": { zh: "权属", en: "Rights", fr: "Droits", es: "Derechos", ar: "الحقوق" },
  "prov.value.pd": {
    zh: "公有领域", en: "Public domain", fr: "Domaine public", es: "Dominio público", ar: "ملكية عامة",
  },
  "prov.value.era": {
    zh: "先秦", en: "Pre-Qin", fr: "Pré-Qin", es: "Pre-Qin", ar: "ما قبل تشين",
  },
  "prov.value.version": {
    zh: "传世本", en: "Received text", fr: "Texte reçu", es: "Texto recibido", ar: "النص المتداول",
  },

  // 读经页章节胶片条
  "read.chapterRail.title": {
    zh: "章节 · 胶片浏览",
    en: "Chapters · Filmstrip",
    fr: "Chapitres · Bande-film",
    es: "Capítulos · Película",
    ar: "الفصول · شريط سينمائي",
  },

  // 首页新增功能入口（六艺 / 跨文明案例）
  "home.entry.journey": { zh: "君子路", en: "Path", fr: "Voie", es: "Camino", ar: "السبيل" },
  "home.entry.journey.desc": {
    zh: "六艺沉浸式游戏：礼、乐、射、御、书、数。",
    en: "Six arts as immersive play: rites, music, archery, charioteering, calligraphy, numbers.",
    fr: "Les six arts en jeu : rites, musique, tir, char, calligraphie, chiffres.",
    es: "Los seis oficios como juego: ritos, música, arquería, carro, caligrafía, números.",
    ar: "الفنون الستة في تجربة تفاعلية: الطقوس والموسيقى والرمي وقيادة المركبة والكتابة والحساب.",
  },
  "home.entry.cases": { zh: "跨文明案例", en: "Cases", fr: "Cas", es: "Casos", ar: "حالات" },
  "home.entry.cases.desc": {
    zh: "同一命题，儒家与诸文明如何对话。",
    en: "One question, many civilizations: how Confucian thought speaks across cultures.",
    fr: "Une question, plusieurs civilisations : la pensée confucéenne en dialogue.",
    es: "Una pregunta, muchas civilizaciones: el pensamiento confuciano en diálogo.",
    ar: "سؤال واحد وحضارات متعددة: كيف يحاور الفكر الكونفوشيوسي الثقافات.",
  },
  // ── The China Room 重构：主导航 / 首页 / 路径 / 小测 / 术语 / 教学 ──
  "nav.explore":  { zh: "探索", en: "Explore", fr: "Explorer", es: "Explorar", ar: "استكشاف" },
  "nav.learn":    { zh: "学习", en: "Learn", fr: "Apprendre", es: "Aprender", ar: "تعلّم" },
  "nav.teach":    { zh: "教学", en: "Teach", fr: "Enseigner", es: "Enseñar", ar: "التدريس" },
  "nav.about":    { zh: "关于", en: "About", fr: "À propos", es: "Acerca de", ar: "حول" },
  "nav.paths":    { zh: "学习路径", en: "Learning Paths", fr: "Parcours", es: "Rutas de aprendizaje", ar: "مسارات التعلّم" },
  "nav.quiz":     { zh: "掌握小测", en: "Mastery Quiz", fr: "Quiz de maîtrise", es: "Cuestionario", ar: "اختبار الإتقان" },
  "nav.terms":    { zh: "术语索引", en: "Glossary", fr: "Glossaire", es: "Glosario", ar: "مسرد المصطلحات" },
  // 一级栏目副标题（非中文界面的 hover 提示）不再手写：由 lib/nav.ts 的 items 派生，
  // 避免出现「副标题写君子路·六艺、下拉里却没有」这类文案与内容漂移。
  "nav.kiosk":    { zh: "课堂", en: "Kiosk", fr: "Kiosque", es: "Quiosco", ar: "كشك" },
  "nav.menu":     { zh: "菜单", en: "Menu", fr: "Menu", es: "Menú", ar: "القائمة" },
  "nav.close":    { zh: "关闭", en: "Close", fr: "Fermer", es: "Cerrar", ar: "إغلاق" },
  "breadcrumb.home": { zh: "首页", en: "Home", fr: "Accueil", es: "Inicio", ar: "الرئيسية" },
  // 页脚分组标题复用 nav.explore / nav.learn / nav.about，不再单独维护一份
  "footer.tagline":   { zh: "读中国 · 思中国 · 与中国同行", en: "Read China. Think. Live with China.", fr: "Lire la Chine. Penser. Vivre avec la Chine.", es: "Lee China. Piensa. Vive con China.", ar: "اقرأ الصين. فكّر. عِش مع الصين." },

  // 通用提示：区分「未登录」与「服务不可用」。
  // 此前 401 与网络故障共用一句「无法连接后端」，导致未登录用户被误导成后端挂了。
  "common.loginRequired": {
    zh: "该功能需要登录后使用，请先登录。",
    en: "This feature requires an account. Please log in first.",
    fr: "Cette fonction nécessite un compte. Connectez-vous d'abord.",
    es: "Esta función requiere una cuenta. Inicia sesión primero.",
    ar: "تتطلّب هذه الميزة تسجيل الدخول أولًا.",
  },

  // 登录解锁引导（成就勋章 / 今日修行任务属登录专属）
  "gate.title": {
    zh: "登录后开启成就与任务",
    en: "Log in to unlock badges and tasks",
    fr: "Connectez-vous pour débloquer badges et tâches",
    es: "Inicia sesión para desbloquear tu progreso",
    ar: "سجّل الدخول لفتح سجل تقدّمك",
  },
  "gate.desc": {
    zh: "读经、六艺、对话这些都能直接用。成就和任务要登录，你现在攒的进度登录后会带过去。",
    en: "Reading, the Six Arts and chat all work without an account. Badges and tasks need a login — whatever you've earned so far comes with you.",
    fr: "Toutes les fonctions de contenu restent accessibles sans compte. Les badges et les pratiques quotidiennes se débloquent à la connexion ; votre XP, votre progression des six arts et vos favoris sont fusionnés automatiquement.",
    es: "Todas las funciones de contenido están disponibles sin cuenta. Las insignias y las prácticas diarias se desbloquean al iniciar sesión; tu XP, progreso de las seis artes y favoritos se fusionan automáticamente.",
    ar: "تعمل جميع ميزات المحتوى دون حساب. تُفتح الأوسمة والتمارين اليومية بعد تسجيل الدخول، وتُدمج نقاطك وتقدّمك في الفنون الستة ومفضّلاتك تلقائيًا.",
  },
  "gate.login": {
    zh: "去登录", en: "Log in", fr: "Se connecter", es: "Iniciar sesión", ar: "تسجيل الدخول",
  },
  "gate.later": {
    zh: "稍后再说", en: "Not now", fr: "Plus tard", es: "Ahora no", ar: "لاحقًا",
  },
  "gate.badgesLocked": {
    zh: "成就勋章", en: "Badges", fr: "Badges", es: "Insignias", ar: "الأوسمة",
  },
  "gate.lockedTag": {
    zh: "需登录", en: "Login required", fr: "Connexion requise", es: "Requiere sesión", ar: "يتطلّب تسجيل الدخول",
  },
  "gate.tasksLocked": {
    zh: "今日修行", en: "Daily practice", fr: "Pratique du jour", es: "Práctica diaria", ar: "تمرين اليوم",
  },
  "login.mergedXp": {
    zh: "登录成功，游客态积累已并入账号：+{n} XP",
    en: "Signed in. Guest progress merged into your account: +{n} XP",
    fr: "Connecté. Progression invité fusionnée : +{n} XP",
    es: "Sesión iniciada. Progreso de invitado fusionado: +{n} XP",
    ar: "تم تسجيل الدخول. دُمج تقدّم الزائر: +{n} XP",
  },
  "login.tab.login": {
    zh: "登录", en: "Log in", fr: "Connexion", es: "Iniciar sesión", ar: "تسجيل الدخول",
  },
  "login.tab.register": {
    zh: "注册", en: "Sign up", fr: "Inscription", es: "Registrarse", ar: "إنشاء حساب",
  },
  "login.displayName": {
    zh: "昵称（选填）", en: "Display name (optional)", fr: "Nom affiché (facultatif)", es: "Nombre visible (opcional)", ar: "الاسم الظاهر (اختياري)",
  },
  "login.registerHint": {
    zh: "注册后，你在游客态积累的 XP、六艺进境与收藏会自动并入新账号。",
    en: "Your guest XP, Six Arts progress and favorites are merged into the new account automatically.",
    fr: "Votre XP, progression des six arts et favoris de visiteur seront fusionnés automatiquement.",
    es: "Tu XP, progreso de las seis artes y favoritos de invitado se fusionarán automáticamente.",
    ar: "تُدمج نقاطك وتقدّمك في الفنون الستة ومفضّلاتك تلقائيًا في الحساب الجديد.",
  },
  "login.registerSubmit": {
    zh: "创建账号", en: "Create account", fr: "Créer un compte", es: "Crear cuenta", ar: "إنشاء الحساب",
  },
  "login.registerErr": {
    zh: "注册失败：该邮箱可能已被注册，或密码不符合要求（至少 6 位）。",
    en: "Sign-up failed: the email may already be registered, or the password is too short (min 6).",
    fr: "Échec de l'inscription : e-mail déjà utilisé ou mot de passe trop court (6 min.).",
    es: "No se pudo registrar: el correo ya existe o la contraseña es demasiado corta (mín. 6).",
    ar: "فشل إنشاء الحساب: قد يكون البريد مستخدمًا أو كلمة المرور قصيرة (6 على الأقل).",
  },

  "home.hero.kicker": {
    zh: "The China Room · 中国文化学院",
    en: "The China Room · a modern academy for Chinese civilization",
    fr: "The China Room · une académie moderne de civilisation chinoise",
    es: "The China Room · una academia moderna de civilización china",
    ar: "ذا تشاينا روم · أكاديمية حديثة للحضارة الصينية",
  },
  "home.hero.title": {
    zh: "读中国 · 思中国 · 与中国同行",
    en: "Read China. Think China. Walk with China.",
    fr: "Lire la Chine. Penser la Chine. Cheminer avec la Chine.",
    es: "Leer China. Pensar China. Caminar con China.",
    ar: "اقرأ الصين. فكّر في الصين. سِر مع الصين.",
  },
  "home.hero.desc": {
    zh: "一间安静的现代学院：原文、译文、注释与多语释义并陈，每一句都可追溯出处。",
    en: "A calm modern academy: original text, translation, notes and multilingual definitions side by side — every sentence traceable to its source.",
    fr: "Une académie paisible : texte original, traduction, notes et définitions multilingues côte à côte, chaque phrase traçable.",
    es: "Una academia serena: texto original, traducción, notas y definiciones multilingües lado a lado, cada frase trazable.",
    ar: "أكاديمية هادئة: النص الأصلي والترجمة والشروح والتعريفات متعددة اللغات جنبًا إلى جنب، وكل جملة قابلة للتتبّع.",
  },
  "home.hero.ctaRead": { zh: "开始读经", en: "Start reading", fr: "Commencer", es: "Comenzar", ar: "ابدأ القراءة" },
  "home.hero.ctaChat": { zh: "向子曰君提问", en: "Ask the agent", fr: "Questionner l'agent", es: "Pregunta al agente", ar: "اسأل العميل" },
  "home.hero.ctaJourney": { zh: "开始六艺", en: "Enter the Six Arts", fr: "Entrer dans les six arts", es: "Entrar en las seis artes", ar: "ادخل الفنون الستة" },

  // 夜游博物馆首屏（破晓底图）：大标题、装饰拉丁行、入口行标签
  "home.night.title": {
    zh: "切问近思",
    en: "Inquire & Reflect",
    fr: "Interroger & Réfléchir",
    es: "Preguntar & Reflexionar",
    ar: "اسأل وتأمّل",
  },
  "home.night.latin": {
    zh: "Inquire & Reflect · Confucian Semantic Platform",
    en: "Inquire & Reflect · Confucian Semantic Platform",
    fr: "Inquire & Reflect · Confucian Semantic Platform",
    es: "Inquire & Reflect · Confucian Semantic Platform",
    ar: "Inquire & Reflect · Confucian Semantic Platform",
  },
  "home.night.explore": {
    zh: "继续探索 —",
    en: "Continue —",
    fr: "Continuer —",
    es: "Continuar —",
    ar: "واصل —",
  },

  // 首页首屏四主入口（唯一强入口区，其余区块降权）
  "home.primary.journey": { zh: "君子路 · 六艺", en: "Six Arts Journey", fr: "La Voie des six arts", es: "El Camino de las seis artes", ar: "سبيل الفنون الستة" },
  "home.primary.journey.desc": { zh: "礼乐射御书数六关，可玩、可评、可回溯。", en: "Ritual, music, archery, chariot, writing, math — playable and scored.", fr: "Rite, musique, tir, char, écriture, calcul : jouable et noté.", es: "Rito, música, tiro, carro, escritura, cálculo: jugable y puntuado.", ar: "الطقوس والموسيقى والرماية والعجلة والكتابة والحساب — قابلة للعب والتقييم." },
  "home.primary.chat": { zh: "向经典提问", en: "Ask the Classics", fr: "Interroger les classiques", es: "Pregunta a los clásicos", ar: "اسأل النصوص" },
  "home.primary.chat.desc": { zh: "每个回答标注出处，可逐条核验。", en: "Every answer cites its source and can be checked.", fr: "Chaque réponse cite sa source et se vérifie.", es: "Cada respuesta cita su fuente y se puede verificar.", ar: "كل إجابة تُسنِد إلى مصدرها ويمكن التحقق منها." },
  "home.primary.read": { zh: "读经", en: "Read", fr: "Lire", es: "Leer", ar: "اقرأ" },
  "home.primary.read.desc": { zh: "原文 · 注译 · 多语平行对照。", en: "Original, annotations, parallel translations.", fr: "Original, annotations, traductions parallèles.", es: "Original, anotaciones, traducciones paralelas.", ar: "النص الأصلي والشروح والترجمات المتوازية." },
  "home.primary.feed": { zh: "刷刷", en: "Feed", fr: "Fil", es: "Feed", ar: "تصفح" },
  "home.primary.feed.desc": { zh: "竖滑金句，双击点赞，一键存壁纸。", en: "Swipe quotes, double-tap to like, save as wallpaper.", fr: "Faites défiler les citations, aimez, enregistrez en fond d'écran.", es: "Desliza citas, doble toque para me gusta, guarda como fondo.", ar: "مرّر الاقتباسات، وانقر مرتين للإعجاب، واحفظها كخلفية." },
  "home.enter": { zh: "进入", en: "Enter", fr: "Entrer", es: "Entrar", ar: "دخول" },
  "home.more": { zh: "更多内容与数据", en: "More content & data", fr: "Plus de contenu et de données", es: "Más contenido y datos", ar: "مزيد من المحتوى والبيانات" },

  "home.mode.title": { zh: "选择你的进入方式", en: "Choose your mode", fr: "Choisissez votre mode", es: "Elige tu modo", ar: "اختر أسلوبك" },
  "home.mode.modern": { zh: "现代学者", en: "Modern Scholar", fr: "Érudit moderne", es: "Erudito moderno", ar: "الباحث الحديث" },
  "home.mode.modern.desc": {
    zh: "用你的语言提问，获得可溯源的当代解读。",
    en: "Ask in your language; get traceable, contemporary answers.",
    fr: "Posez vos questions dans votre langue ; réponses traçables et actuelles.",
    es: "Pregunta en tu idioma; respuestas trazables y contemporáneas.",
    ar: "اسأل بلغتك واحصل على إجابات معاصرة قابلة للتتبّع.",
  },
  "home.mode.sage": { zh: "古典贤者", en: "Classical Sage", fr: "Sage classique", es: "Sabio clásico", ar: "الحكيم الكلاسيكي" },
  "home.mode.sage.desc": {
    zh: "直接读原文、拼音与注释，沿经典脉络缓步前行。",
    en: "Read the original, pinyin and notes at your own pace.",
    fr: "Lisez l'original, le pinyin et les notes à votre rythme.",
    es: "Lee el original, el pinyin y las notas a tu ritmo.",
    ar: "اقرأ النص الأصلي والبينين والشروح على مهلك.",
  },
  "home.mode.enter": { zh: "进入", en: "Enter", fr: "Entrer", es: "Entrar", ar: "ادخل" },

  "home.civ.title": { zh: "当孔子遇见苏格拉底", en: "When Confucius meets Socrates", fr: "Quand Confucius rencontre Socrate", es: "Cuando Confucio conoce a Sócrates", ar: "حين يلتقي كونفوشيوس بسقراط" },
  "home.civ.desc": { zh: "把《论语》放进世界思想的坐标系:与斯多葛、启蒙、功利主义正面对话,看共鸣,也看分歧。", en: "Place the Analects in the coordinate system of world thought — dialogues with Stoicism, the Enlightenment and utilitarianism: echoes, and productive disagreements.", fr: "Situez les Entretiens dans la pensée mondiale — dialogues avec le stoïcisme, les Lumières et l'utilitarisme : échos et désaccords féconds.", es: "Sitúa las Analectas en el pensamiento mundial: diálogos con el estoicismo, la Ilustración y el utilitarismo; ecos y desacuerdos fértiles.", ar: "ضع «المنتخبات» في خريطة الفكر العالمي: حوارات مع الرواقية والتنوير والنفعية؛ أصداء واختلافات مثمرة." },
  "home.civ.cta": { zh: "进入跨文明对话", en: "Enter the dialogue", fr: "Entrer dans le dialogue", es: "Entrar al diálogo", ar: "ادخل الحوار" },
  "home.civ.q1": {
    zh: "「己所不欲，勿施于人」与全球伦理是否相通？",
    en: "Does \"do not impose on others what you do not desire\" connect with global ethics?",
    fr: "La règle d'or confucéenne rejoint-elle l'éthique mondiale ?",
    es: "¿Conecta la regla de oro confuciana con la ética global?",
    ar: "هل تتّصل القاعدة الذهبية الكونفوشيوسية بالأخلاقيات العالمية؟",
  },
  "home.civ.q2": {
    zh: "儒家如何看待个人与社群的关系？",
    en: "How does Confucian thought understand the individual and the community?",
    fr: "Comment la pensée confucéenne comprend-elle l'individu et la communauté ?",
    es: "¿Cómo entiende el pensamiento confuciano al individuo y a la comunidad?",
    ar: "كيف يفهم الفكر الكونفوشيوسي الفرد والمجتمع؟",
  },
  "home.civ.q3": {
    zh: "「君子」在今天还意味着什么？",
    en: "What does the junzi (noble person) mean today?",
    fr: "Que signifie le junzi (personne noble) aujourd'hui ?",
    es: "¿Qué significa hoy el junzi (persona noble)?",
    ar: "ماذا يعني «الجنز» (الإنسان النبيل) اليوم؟",
  },
  "home.civ.q4": {
    zh: "礼与法：两种秩序观如何对话？",
    en: "Ritual and law: how do two views of order converse?",
    fr: "Rite et loi : dialogue entre deux conceptions de l'ordre ?",
    es: "Rito y ley: ¿cómo dialogan dos visiones del orden?",
    ar: "الطقوس والقانون: كيف يتحاور تصوّران للنظام؟",
  },
  "home.civ.ask": { zh: "去对话", en: "Ask", fr: "Demander", es: "Preguntar", ar: "اسأل" },

  "home.why.title": { zh: "为何了解中国文化？", en: "Why learn Chinese culture?", fr: "Pourquoi apprendre la culture chinoise ?", es: "¿Por qué aprender la cultura china?", ar: "لماذا نتعلّم الثقافة الصينية؟" },
  "home.why.history": { zh: "历史", en: "History", fr: "Histoire", es: "Historia", ar: "التاريخ" },
  "home.why.history.desc": {
    zh: "从先秦诸子到近现代，一条连续而变动的思想长河。",
    en: "A continuous, changing river of thought from pre-Qin masters to modern times.",
    fr: "Un fleuve continu de pensée, des maîtres pré-Qin à l'époque moderne.",
    es: "Un río continuo de pensamiento, de los maestros pre-Qin hasta hoy.",
    ar: "نهر فكري متّصل من حكماء ما قبل تشين إلى العصر الحديث.",
  },
  "home.why.philosophy": { zh: "哲学", en: "Philosophy", fr: "Philosophie", es: "Filosofía", ar: "الفلسفة" },
  "home.why.philosophy.desc": {
    zh: "仁、义、礼、智、信——概念的关系网络。",
    en: "Benevolence, rightness, ritual, wisdom, trust — a network of concepts.",
    fr: "Bienveillance, justice, rite, sagesse, confiance — un réseau de concepts.",
    es: "Benevolencia, rectitud, rito, sabiduría, confianza: una red de conceptos.",
    ar: "الرحمة والصواب والطقوس والحكمة والثقة — شبكة مفاهيم.",
  },
  "home.why.literature": { zh: "文学", en: "Literature", fr: "Littérature", es: "Literatura", ar: "الأدب" },
  "home.why.literature.desc": {
    zh: "《论语》《孟子》《道德经》——原典原文并读。",
    en: "The Analects, Mencius, Dao De Jing — read in the original.",
    fr: "Les Analectes, Mencius, Dao De Jing — dans le texte original.",
    es: "Las Analectas, Mencio, Dao De Jing: en el texto original.",
    ar: "«المنتخبات» و«منسيوس» و«داو ديه جينغ» — في أصلها.",
  },
  "home.why.visual": { zh: "视觉艺术", en: "Visual arts", fr: "Arts visuels", es: "Artes visuales", ar: "الفنون البصرية" },
  "home.why.visual.desc": {
    zh: "书艺、乐舞与六艺——可动手的文化实践。",
    en: "Calligraphy, music and the Six Arts — culture you can practice.",
    fr: "Calligraphie, musique et Six Arts — une culture que l'on pratique.",
    es: "Caligrafía, música y Seis Artes: cultura que puedes practicar.",
    ar: "الخط والموسيقى والفنون الستة — ثقافة تمارسها بيدك.",
  },

  "home.need.title": { zh: "按你的需求开始", en: "Start with what you need", fr: "Commencez selon vos besoins", es: "Empieza según lo que necesitas", ar: "ابدأ حسب حاجتك" },
  "home.need.exam": { zh: "考试", en: "For exams", fr: "Examens", es: "Para exámenes", ar: "للامتحانات" },
  "home.need.exam.desc": {
    zh: "按章节读经、术语速查、掌握度小测。",
    en: "Read by chapter, quick glossary, mastery quizzes.",
    fr: "Lecture par chapitre, glossaire rapide, quiz de maîtrise.",
    es: "Lectura por capítulo, glosario rápido, cuestionarios.",
    ar: "القراءة بحسب الفصل، مسرد سريع، اختبارات إتقان.",
  },
  "home.need.business": { zh: "商务", en: "For business", fr: "Affaires", es: "Para negocios", ar: "للأعمال" },
  "home.need.business.desc": {
    zh: "礼与和的当代含义，跨文明对话案例。",
    en: "Contemporary meaning of ritual and harmony; cross-civ cases.",
    fr: "Sens actuel du rite et de l'harmonie ; cas inter-civilisations.",
    es: "Sentido actual del rito y la armonía; casos intercivilizacionales.",
    ar: "المعنى المعاصر للطقوس والوئام؛ حالات بين الحضارات.",
  },
  "home.need.culture": { zh: "文化", en: "For curiosity", fr: "Curiosité", es: "Por curiosidad", ar: "للفضول الثقافي" },
  "home.need.culture.desc": {
    zh: "从一个金句或一张图谱进入世界。",
    en: "Enter through a single quote or the knowledge graph.",
    fr: "Entrez par une citation ou le graphe de connaissances.",
    es: "Entra por una cita o por el grafo de conocimiento.",
    ar: "ادخل عبر حكمة واحدة أو عبر الرسم المعرفي.",
  },
  "home.need.quick": { zh: "快捷入口", en: "Quick links", fr: "Accès rapides", es: "Accesos rápidos", ar: "روابط سريعة" },
  "home.need.timeline": { zh: "时间轴", en: "Timeline", fr: "Chronologie", es: "Línea de tiempo", ar: "الخط الزمني" },
  "home.need.terms": { zh: "术语", en: "Glossary", fr: "Glossaire", es: "Glosario", ar: "المصطلحات" },
  "home.need.classics": { zh: "读原典", en: "Read classics", fr: "Lire les classiques", es: "Leer clásicos", ar: "قراءة النصوص" },

  "home.paths.title": { zh: "精选学习路径", en: "Featured learning paths", fr: "Parcours recommandés", es: "Rutas destacadas", ar: "مسارات تعلّم مختارة" },
  "home.paths.more": { zh: "全部路径", en: "All paths", fr: "Tous les parcours", es: "Todas las rutas", ar: "كل المسارات" },

  "paths.kicker": { zh: "学习路径 · Paths", en: "Learning paths", fr: "Parcours d'apprentissage", es: "Rutas de aprendizaje", ar: "مسارات التعلّم" },
  "paths.title": { zh: "从入门到脉络的结构化旅程", en: "Structured journeys from first steps to the lineage", fr: "Des parcours structurés du premier pas à la filiation", es: "Rutas estructuradas del primer paso al linaje", ar: "رحلات منظّمة من الخطوة الأولى إلى الأنساب الفكرية" },
  "paths.desc": { zh: "不重复造内容，只做导航与编排：每一步都通向已有的读经、图谱、对话与六艺。", en: "No new content — just navigation and curation: every step links to existing reading, graph, dialogue and Six Arts.", fr: "Pas de contenu nouveau : navigation et curation, chaque pas renvoie vers lecture, graphe, dialogue et Six Arts.", es: "Sin contenido nuevo: navegación y curación, cada paso enlaza a lectura, grafo, diálogo y Seis Artes.", ar: "لا محتوى جديد — تنظيم وتوجيه فقط: كل خطوة تفضي إلى القراءة أو الرسم أو الحوار أو الفنون الستة." },
  "paths.step": { zh: "步", en: "steps", fr: "étapes", es: "pasos", ar: "خطوات" },
  "paths.analects.title": { zh: "《论语》入门", en: "Intro to the Analects", fr: "Introduction aux Analectes", es: "Introducción a las Analectas", ar: "مقدمة في «المنتخبات»" },
  "paths.analects.desc": { zh: "二十句核心章节，从学而到里仁。", en: "Twenty core passages, from Xue Er to Li Ren.", fr: "Vingt passages clés, de Xue Er à Li Ren.", es: "Veinte pasajes centrales, de Xue Er a Li Ren.", ar: "عشرون مقطعًا أساسيًا من «علم» إلى «الإنسان»." },
  "paths.lineage.title": { zh: "儒家思想脉络", en: "Confucian intellectual lineage", fr: "Filiation intellectuelle confucéenne", es: "Linaje intelectual confuciano", ar: "النسب الفكري الكونفوشيوسي" },
  "paths.lineage.desc": { zh: "孔子—孟子—荀子—宋明理学的关系网络。", en: "Confucius—Mencius—Xunzi—Song-Ming Neo-Confucianism as a graph.", fr: "Confucius—Mencius—Xunzi—Néoconfucianisme Song-Ming en graphe.", es: "Confucio—Mencio—Xunzi—Neoconfucianismo Song-Ming en grafo.", ar: "كونفوشيوس—منسيوس—شونزي—الكونفوشية الجديدة في رسم بياني." },
  "paths.arts.title": { zh: "六艺实操", en: "Six Arts, hands-on", fr: "Six Arts en pratique", es: "Seis Artes prácticas", ar: "الفنون الستة عمليًا" },
  "paths.arts.desc": { zh: "礼、乐、射、御、书、数——游戏化通关。", en: "Rites, music, archery, charioteering, calligraphy, numbers — gamified.", fr: "Rites, musique, tir, char, calligraphie, chiffres — en jeu.", es: "Ritos, música, arquería, carro, caligrafía, números: en juego.", ar: "الطقوس والموسيقى والرمي والقيادة والخط والحساب — بأسلوب الألعاب." },
  "paths.crossciv.title": { zh: "跨文明对话", en: "Cross-civilizational dialogue", fr: "Dialogue inter-civilisations", es: "Diálogo intercivilizacional", ar: "الحوار بين الحضارات" },
  "paths.crossciv.desc": { zh: "同一议题，儒家与基督教、启蒙、佛教并陈。", en: "One topic, set beside Christian, Enlightenment and Buddhist stances.", fr: "Un thème, mis en regard des positions chrétienne, lumiériste et bouddhique.", es: "Un tema, junto a posiciones cristiana, ilustrada y budista.", ar: "موضوع واحد بموازاة المواقف المسيحية والتنويرية والبوذية." },
  "paths.feedEntry.title": { zh: "刷刷 · 流式经典", en: "Feed · swipe through the classics", fr: "Fil · faites défiler les classiques", es: "Feed · desliza por los clásicos", ar: "تصفّح · مرّر النصوص الكلاسيكية" },
  "paths.feedEntry.sub": { zh: "不用规划路径，直接流式刷：一条金句、一段注疏，往下滑就好。", en: "No path to plan — just scroll: one quote, one gloss, keep swiping.", fr: "Aucun parcours à planifier : défilez, une citation, une glose, continuez.", es: "Sin ruta que planificar: desplázate, una cita, una glosa, sigue.", ar: "لا مسار تخطّط له — فقط مرّر: حكمة واحدة، شرح واحد، تابع التمرير." },

  "quiz.kicker": { zh: "掌握度 · Mastery", en: "Mastery", fr: "Maîtrise", es: "Maestría", ar: "الإتقان" },
  "quiz.title": { zh: "检验你掌握了多少", en: "Check how much has taken root", fr: "Vérifiez ce qui a pris racine", es: "Comprueba lo que ha echado raíces", ar: "اختبر ما رَسَخ لديك" },
  "quiz.desc": { zh: "小测不排名、不打分制裁人：它把你送回六艺游戏与读经问答，在做中学。", en: "Quizzes do not rank or judge: they send you back into the Six-Arts games and reading Q&A to learn by doing.", fr: "Les quiz ne classent pas : ils vous renvoient vers les Six Arts et la lecture pour apprendre en faisant.", es: "Los cuestionarios no ordenan ni juzgan: te devuelven a los Seis Artes y a la lectura para aprender haciendo.", ar: "الاختبارات لا ترتّب ولا تحكم: بل تعيدك إلى ألعاب الفنون الستة وأسئلة القراءة لتتعلّم بالممارسة." },
  "quiz.gamesTitle": { zh: "六艺通关", en: "Six-Arts games", fr: "Jeux des Six Arts", es: "Juegos de las Seis Artes", ar: "ألعاب الفنون الستة" },
  "quiz.readTitle": { zh: "读经问答", en: "Read & answer", fr: "Lire et répondre", es: "Leer y responder", ar: "اقرأ وأجب" },
  "quiz.readDesc": { zh: "在《论语》章节中边读边问，让智能体溯源作答。", en: "Read the Analects and ask as you go; the agent answers with sources.", fr: "Lisez les Analectes et questionnez : l'agent répond avec sources.", es: "Lee las Analectas y pregunta mientras lees; el agente responde con fuentes.", ar: "اقرأ «المنتخبات» واسأل وأنت تقرأ؛ والعميل يجيب بالمصادر." },
  "quiz.enter": { zh: "开始", en: "Start", fr: "Commencer", es: "Comenzar", ar: "ابدأ" },
  "quiz.learned": { zh: "已掌握", en: "Mastered", fr: "Maîtrisé", es: "Dominado", ar: "متقَن" },

  "read.parallel": { zh: "平行文本", en: "Parallel text", fr: "Texte parallèle", es: "Texto paralelo", ar: "نص موازٍ" },
  "read.parallelHint": {
    zh: "原文中文与当前语译文左右并陈（移动端上下堆叠）。",
    en: "Original Chinese beside the current-language translation (stacked on mobile).",
    fr: "Texte original chinois à côté de la traduction (empilé sur mobile).",
    es: "Chino original junto a la traducción (apilado en móvil).",
    ar: "النص الصيني الأصلي بجانب الترجمة الحالية (مكدّس على الجوال).",
  },

  "terms.kicker": { zh: "术语索引 · Glossary", en: "Glossary", fr: "Glossaire", es: "Glosario", ar: "مسرد المصطلحات" },
  "terms.overview.title": { zh: "三十秒读懂五个核心概念", en: "Five core ideas in 30 seconds", fr: "Cinq idées clés en 30 secondes", es: "Cinco ideas clave en 30 segundos", ar: "خمسة مفاهيم أساسية في ثلاثين ثانية" },
  "terms.overview.note": { zh: "刚接触儒家思想?先记住这五个词,再看下面的术语表就轻松了。", en: "New to Confucian thought? These five words first — the glossary below will feel easy.", fr: "Nouveau en pensée confucéenne ? Ces cinq mots d'abord — le glossaire sera plus clair.", es: "¿Nuevo en el pensamiento confuciano? Primero estas cinco palabras; el glosario será fácil.", ar: "جديد على الفكر الكونفوشيوسي؟ ابدأ بهذه الكلمات الخمس، وسيصبح المسرد سهلاً." },
  "terms.ov.ren.def": { zh: "仁爱:把人当人,推己及人", en: "Humaneness: treat others as fully human", fr: "Humanité : traiter autrui en humain", es: "Humanidad: tratar al otro como persona", ar: "الإنسانية: عامل الآخرين كبشر" },
  "terms.ov.li.def": { zh: "礼:恰到好处的言行分寸", en: "Ritual: acting with proper measure", fr: "Rite : agir avec justesse", es: "Rito: actuar con la medida justa", ar: "الطقس: التصرف بقدر مناسب" },
  "terms.ov.junzi.def": { zh: "君子:不断自我完善的人", en: "Exemplary person: one who keeps refining the self", fr: "L'homme de bien : se perfectionner sans cesse", es: "Persona ejemplar: quien se perfecciona", ar: "الإنسان النبيل: من يُكمّل نفسه" },
  "terms.ov.yi.def": { zh: "义:该做就做的正当性", en: "Righteousness: doing what is right", fr: "Justice : faire ce qui est juste", es: "Rectitud: hacer lo correcto", ar: "الاستقامة: فعل ما هو صواب" },
  "terms.ov.zhi.def": { zh: "智:明辨是非的判断力", en: "Wisdom: discerning right from wrong", fr: "Sagesse : discerner le bien du mal", es: "Sabiduría: discernir el bien", ar: "الحكمة: التمييز بين الصواب والخطأ" },
  "terms.title": { zh: "儒家核心术语", en: "Core Confucian terms", fr: "Termes confucéens essentiels", es: "Términos confucianos clave", ar: "المصطلحات الكونفوشيوسية الأساسية" },
  "terms.desc": { zh: "外文解释在前，原文中文与出处并列。可搜索、可按学派筛选。", en: "Foreign explanation first; original Chinese and source beside it. Searchable and filterable by school.", fr: "Explication en langue étrangère d'abord ; original chinois et source à côté. Recherche et filtre par école.", es: "Explicación en primer lugar; chino original y fuente al lado. Buscable y filtrable por escuela.", ar: "الشرح باللغة الأجنبية أولًا؛ والأصل الصيني والمصدر بجانبه. قابل للبحث والتصفية حسب المدرسة." },
  "terms.search": { zh: "搜索术语…", en: "Search terms…", fr: "Rechercher un terme…", es: "Buscar término…", ar: "ابحث عن مصطلح…" },
  "terms.all": { zh: "全部学派", en: "All schools", fr: "Toutes les écoles", es: "Todas las escuelas", ar: "كل المدارس" },
  "terms.source": { zh: "出处", en: "Source", fr: "Source", es: "Fuente", ar: "المصدر" },
  "terms.empty": { zh: "没有匹配的术语", en: "No matching terms", fr: "Aucun terme trouvé", es: "Sin términos coincidentes", ar: "لا مصطلحات مطابقة" },

  "teach.kicker": { zh: "教师板块 · For teachers", en: "For teachers", fr: "Pour les enseignants", es: "Para docentes", ar: "للمعلّمين" },
  "teach.title": { zh: "把儒家语义平台带进课堂", en: "Bring the Confucian semantic platform into the classroom", fr: "Apportez la plateforme sémantique en classe", es: "Lleva la plataforma semántica al aula", ar: "أدخل المنصة الدلالية الكونفوشيوسية إلى الصف" },
  "teach.desc": { zh: "工具包、课程计划、课堂模式与测评，全部接自读经、六艺与案例库。", en: "Toolkit, lesson plans, classroom mode and assessment, all wired to reading, Six Arts and cases.", fr: "Trousse, plans de cours, mode classe et évaluation, reliés à lecture, Six Arts et cas.", es: "Kit, planes de lección, modo aula y evaluación, conectados a lectura, Seis Artes y casos.", ar: "الحقيبة وخطط الدروس ووضع الصف والتقييم، موصولة بالقراءة والفنون الستة والحالات." },
  "teach.toolkit.title": { zh: "教师工具包", en: "Teacher toolkit", fr: "Trousse de l'enseignant", es: "Kit del docente", ar: "حقيبة المعلّم" },
  "teach.toolkit.desc": { zh: "可嵌入的金句卡、SVG 海报与 API Key。", en: "Embeddable quote cards, SVG posters and API keys.", fr: "Cartes de citation intégrables, affiches SVG et clés API.", es: "Tarjetas incrustables, pósters SVG y claves API.", ar: "بطاقات اقتباس مضمّنة وملصقات SVG ومفاتيح API." },
  "teach.lesson.title": { zh: "课程计划", en: "Lesson plans", fr: "Plans de cours", es: "Planes de lección", ar: "خطط الدروس" },
  "teach.lesson.desc": { zh: "按历史 / 哲学 / 文学 / 艺术四条线索组织的单元。", en: "Units organised along history, philosophy, literature and the arts.", fr: "Unités organisées par histoire, philosophie, littérature et arts.", es: "Unidades organizadas por historia, filosofía, literatura y artes.", ar: "وحدات منظّمة على محاور التاريخ والفلسفة والأدب والفنون." },
  "teach.classroom.title": { zh: "课堂模式", en: "Classroom mode", fr: "Mode salle de classe", es: "Modo aula", ar: "وضع الصف" },
  "teach.classroom.desc": { zh: "大屏轮播金句，学生扫码继续阅读。", en: "Kiosk rotation on the big screen; students scan to keep reading.", fr: "Rotation kiosque sur grand écran ; les élèves scannent pour continuer.", es: "Rotación kiosco en pantalla grande; los alumnos escanean para seguir.", ar: "عرض دوري على الشاشة الكبيرة؛ والطلاب يمسحون الرمز لمتابعة القراءة." },
  "teach.assessment.title": { zh: "测评", en: "Assessment", fr: "Évaluation", es: "Evaluación", ar: "التقييم" },
  "teach.assessment.desc": { zh: "六艺掌握度与读经问答，自动留痕。", en: "Six-Arts mastery and reading Q&A, with automatic records.", fr: "Maîtrise des Six Arts et Q&A de lecture, trace automatique.", es: "Maestría de las Seis Artes y preguntas de lectura, con registro automático.", ar: "إتقان الفنون الستة وأسئلة القراءة، مع تسجيل تلقائي." },
  "teach.openToolkit": { zh: "打开工具包", en: "Open toolkit", fr: "Ouvrir la trousse", es: "Abrir el kit", ar: "افتح الحقيبة" },
  "teach.openKiosk": { zh: "进入课堂模式", en: "Open classroom mode", fr: "Ouvrir le mode classe", es: "Abrir el modo aula", ar: "افتح وضع الصف" },
  "teach.openQuiz": { zh: "查看掌握度", en: "View mastery", fr: "Voir la maîtrise", es: "Ver la maestría", ar: "عرض الإتقان" },
  "teach.openPaths": { zh: "浏览课程单元", en: "Browse units", fr: "Parcourir les unités", es: "Explorar unidades", ar: "تصفّح الوحدات" },

  // ── 管理后台 · 写操作文案（五语，缺键补齐）─────────────────────
  "admin.nav.settings": { zh: "设置", en: "Settings", fr: "Paramètres", es: "Ajustes", ar: "الإعدادات" },

  // 通用按钮 / 弹窗
  "admin.common.save": { zh: "保存", en: "Save", fr: "Enregistrer", es: "Guardar", ar: "حفظ" },
  "admin.common.cancel": { zh: "取消", en: "Cancel", fr: "Annuler", es: "Cancelar", ar: "إلغاء" },
  "admin.common.confirm": { zh: "确认", en: "Confirm", fr: "Confirmer", es: "Confirmar", ar: "تأكيد" },
  "admin.common.delete": { zh: "删除", en: "Delete", fr: "Supprimer", es: "Eliminar", ar: "حذف" },
  "admin.common.edit": { zh: "编辑", en: "Edit", fr: "Modifier", es: "Editar", ar: "تعديل" },
  "admin.common.create": { zh: "新建", en: "Create", fr: "Créer", es: "Crear", ar: "إنشاء" },
  "admin.common.close": { zh: "关闭", en: "Close", fr: "Fermer", es: "Cerrar", ar: "إغلاق" },
  "admin.common.actions": { zh: "操作", en: "Actions", fr: "Actions", es: "Acciones", ar: "إجراءات" },
  "admin.common.loading": { zh: "处理中…", en: "Working…", fr: "Traitement…", es: "Procesando…", ar: "جارٍ المعالجة…" },
  "admin.common.saved": { zh: "已保存", en: "Saved", fr: "Enregistré", es: "Guardado", ar: "تم الحفظ" },
  "admin.common.failed": { zh: "操作失败", en: "Action failed", fr: "Échec de l'action", es: "Falló la acción", ar: "فشل الإجراء" },
  "admin.common.search": { zh: "搜索…", en: "Search…", fr: "Rechercher…", es: "Buscar…", ar: "ابحث…" },
  "admin.common.emptyList": { zh: "暂无记录", en: "No records", fr: "Aucun enregistrement", es: "Sin registros", ar: "لا سجلات" },
  "admin.common.unsaved": { zh: "未保存", en: "Unsaved", fr: "Non enregistré", es: "Sin guardar", ar: "غير محفوظ" },

  // 危险操作二次确认
  "admin.op.dangerTitle": { zh: "危险操作", en: "Dangerous action", fr: "Action dangereuse", es: "Acción peligrosa", ar: "إجراء خطير" },
  "admin.op.irreversible": { zh: "此操作不可撤销，请确认。", en: "This cannot be undone. Please confirm.", fr: "Irréversible. Veuillez confirmer.", es: "Esto no se puede deshacer. Confirma.", ar: "لا يمكن التراجع عن هذا. يرجى التأكيد." },
  "admin.op.cannotSelf": { zh: "不能对自己执行此操作", en: "You cannot perform this on yourself", fr: "Vous ne pouvez pas faire cela sur vous-même", es: "No puedes hacer esto contigo mismo", ar: "لا يمكنك تنفيذ هذا على نفسك" },
  "admin.op.reason": { zh: "原因 / 备注（可选）", en: "Reason / note (optional)", fr: "Motif / remarque (facultatif)", es: "Motivo / nota (opcional)", ar: "السبب / ملاحظة (اختياري)" },

  // 用户管理
  "admin.user.exportCsv": { zh: "导出 CSV", en: "Export CSV", fr: "Exporter CSV", es: "Exportar CSV", ar: "تصدير CSV" },
  "admin.user.exporting": { zh: "正在导出…", en: "Exporting…", fr: "Exportation…", es: "Exportando…", ar: "جارٍ التصدير…" },
  "admin.user.editName": { zh: "编辑显示名", en: "Edit display name", fr: "Modifier le nom affiché", es: "Editar nombre", ar: "تعديل الاسم الظاهر" },
  "admin.user.newName": { zh: "新显示名", en: "New display name", fr: "Nouveau nom affiché", es: "Nuevo nombre", ar: "الاسم الظاهر الجديد" },
  "admin.user.makeAdmin": { zh: "设为管理员", en: "Make admin", fr: "Nommer admin", es: "Hacer admin", ar: "تعيين مشرفًا" },
  "admin.user.revokeAdmin": { zh: "撤销管理员", en: "Revoke admin", fr: "Révoquer l'admin", es: "Revocar admin", ar: "إلغاء صلاحية المشرف" },
  "admin.user.ban": { zh: "停用", en: "Ban", fr: "Bloquer", es: "Suspender", ar: "حظر" },
  "admin.user.unban": { zh: "启用", en: "Unban", fr: "Débloquer", es: "Reactivar", ar: "رفع الحظر" },
  "admin.user.delete": { zh: "删除用户", en: "Delete user", fr: "Supprimer l'utilisateur", es: "Eliminar usuario", ar: "حذف المستخدم" },
  "admin.user.confirmDelete": { zh: "确定删除用户 {name}？", en: "Delete user {name}?", fr: "Supprimer l'utilisateur {name} ?", es: "¿Eliminar al usuario {name}?", ar: "هل تريد حذف المستخدم {name}؟" },
  "admin.user.confirmDemote": { zh: "确定撤销 {name} 的管理员权限？", en: "Revoke admin from {name}?", fr: "Révoquer l'admin de {name} ?", es: "¿Revocar admin de {name}?", ar: "هل تريد إلغاء صلاحية المشرف عن {name}؟" },
  "admin.user.confirmBan": { zh: "确定停用用户 {name}？", en: "Ban user {name}?", fr: "Bloquer l'utilisateur {name} ?", es: "¿Suspender al usuario {name}?", ar: "هل تريد حظر المستخدم {name}؟" },
  "admin.user.bannedBadge": { zh: "已停用", en: "Banned", fr: "Bloqué", es: "Suspendido", ar: "محظور" },
  "admin.user.detail": { zh: "详情", en: "Details", fr: "Détails", es: "Detalles", ar: "التفاصيل" },
  "admin.user.activity": { zh: "活动概览", en: "Activity overview", fr: "Aperçu d'activité", es: "Resumen de actividad", ar: "نظرة عامة على النشاط" },
  "admin.user.act.games": { zh: "游戏局数", en: "Game rounds", fr: "Manches", es: "Rondas", ar: "جولات اللعب" },
  "admin.user.act.contribs": { zh: "投稿", en: "Contributions", fr: "Contributions", es: "Contribuciones", ar: "المساهمات" },
  "admin.user.act.lastActive": { zh: "最近活跃", en: "Last active", fr: "Dernière activité", es: "Última actividad", ar: "آخر نشاط" },
  "admin.user.act.recentRounds": { zh: "近期对局", en: "Recent rounds", fr: "Manches récentes", es: "Rondas recientes", ar: "الجولات الأخيرة" },
  "admin.user.act.recentContribs": { zh: "近期投稿", en: "Recent contributions", fr: "Contributions récentes", es: "Contribuciones recientes", ar: "المساهمات الأخيرة" },
  "admin.user.act.none": { zh: "暂无活动记录", en: "No activity yet", fr: "Aucune activité", es: "Sin actividad", ar: "لا نشاط بعد" },

  // 内容管理
  "admin.content.tab.books": { zh: "典籍", en: "Books", fr: "Livres", es: "Libros", ar: "الكتب" },
  "admin.content.tab.chapters": { zh: "篇章", en: "Chapters", fr: "Chapitres", es: "Capítulos", ar: "الفصول" },
  "admin.content.tab.passages": { zh: "段落", en: "Passages", fr: "Passages", es: "Pasajes", ar: "الفقرات" },
  "admin.content.tab.concepts": { zh: "概念", en: "Concepts", fr: "Concepts", es: "Conceptos", ar: "المفاهيم" },
  "admin.content.newItem": { zh: "新建内容", en: "New content", fr: "Nouveau contenu", es: "Nuevo contenido", ar: "محتوى جديد" },
  "admin.content.editItem": { zh: "编辑内容", en: "Edit content", fr: "Modifier le contenu", es: "Editar contenido", ar: "تعديل المحتوى" },
  "admin.content.publish": { zh: "发布", en: "Publish", fr: "Publier", es: "Publicar", ar: "نشر" },
  "admin.content.unpublish": { zh: "下架", en: "Unpublish", fr: "Dépublier", es: "Despublicar", ar: "إلغاء النشر" },
  "admin.content.confirmDelete": { zh: "确定删除「{title}」？其译文与注译将一并删除。", en: "Delete \"{title}\"? Its translations and annotations will be removed too.", fr: "Supprimer « {title} » ? Ses traductions et annotations seront aussi supprimées.", es: "¿Eliminar «{title}»? También se eliminarán sus traducciones y anotaciones.", ar: "هل تريد حذف «{title}»؟ ستحذف ترجماته وشروحه أيضًا." },
  "admin.content.f.title": { zh: "标题", en: "Title", fr: "Titre", es: "Título", ar: "العنوان" },
  "admin.content.f.source": { zh: "出处 source", en: "Source", fr: "Source", es: "Fuente", ar: "المصدر" },
  "admin.content.f.version": { zh: "版本 version", en: "Version", fr: "Version", es: "Versión", ar: "الإصدار" },
  "admin.content.f.accession": { zh: "编号 accession", en: "Accession", fr: "Cote", es: "N.º", ar: "الرقم" },
  "admin.content.f.era": { zh: "年代 era", en: "Era", fr: "Époque", es: "Época", ar: "الحقبة" },
  "admin.content.f.published": { zh: "已发布", en: "Published", fr: "Publié", es: "Publicado", ar: "منشور" },
  "admin.content.f.id": { zh: "标识 ID", en: "ID", fr: "ID", es: "ID", ar: "المعرّف" },
  "admin.content.f.idHint": { zh: "新建必填，如 guanzi.chengma.1", en: "Required on create, e.g. guanzi.chengma.1", fr: "Obligatoire à la création, p. ex. guanzi.chengma.1", es: "Obligatorio al crear, p. ej. guanzi.chengma.1", ar: "مطلوب عند الإنشاء، مثل guanzi.chengma.1" },
  "admin.content.f.bookId": { zh: "所属书 ID", en: "Book ID", fr: "ID du livre", es: "ID del libro", ar: "معرّف الكتاب" },
  "admin.content.f.chapterId": { zh: "所属章 ID", en: "Chapter ID", fr: "ID du chapitre", es: "ID del capítulo", ar: "معرّف الفصل" },
  "admin.content.f.originalText": { zh: "原文", en: "Original text", fr: "Texte original", es: "Texto original", ar: "النص الأصلي" },
  "admin.settings.auditPrev": { zh: "上一页", en: "Prev", fr: "Préc.", es: "Anterior", ar: "السابق" },
  "admin.settings.auditNext": { zh: "下一页", en: "Next", fr: "Suiv.", es: "Siguiente", ar: "التالي" },
  "admin.content.newTranslation": { zh: "新增译文", en: "Add translation", fr: "Ajouter une traduction", es: "Añadir traducción", ar: "إضافة ترجمة" },
  "admin.content.newAnnotation": { zh: "新增注译", en: "Add annotation", fr: "Ajouter une annotation", es: "Añadir anotación", ar: "إضافة شرح" },
  "admin.content.f.lang": { zh: "语言", en: "Language", fr: "Langue", es: "Idioma", ar: "اللغة" },
  "admin.content.f.text": { zh: "文本", en: "Text", fr: "Texte", es: "Texto", ar: "النص" },
  "admin.content.f.type": { zh: "类型", en: "Type", fr: "Type", es: "Tipo", ar: "النوع" },
  "admin.content.f.translator": { zh: "译者", en: "Translator", fr: "Traducteur", es: "Traductor", ar: "المترجم" },
  "admin.content.selectPassage": { zh: "选择一条段落，查看并管理其译文与注译。", en: "Select a passage to manage its translations and annotations.", fr: "Sélectionnez un passage pour gérer ses traductions et annotations.", es: "Selecciona un pasaje para gestionar sus traducciones y anotaciones.", ar: "اختر فقرة لإدارة ترجماتها وشروحها." },
  "admin.content.cascadeHint": { zh: "删除段落会级联删除其译文与注译。", en: "Deleting a passage cascades to its translations and annotations.", fr: "Supprimer un passage supprime aussi ses traductions et annotations.", es: "Eliminar un pasaje elimina también sus traducciones y anotaciones.", ar: "حذف الفقرة يحذف ترجماتها وشروحها تبعًا." },
  "admin.content.publishedBadge": { zh: "已发布", en: "Published", fr: "Publié", es: "Publicado", ar: "منشور" },
  "admin.content.draftBadge": { zh: "草稿", en: "Draft", fr: "Brouillon", es: "Borrador", ar: "مسودة" },

  // 游戏局明细
  "admin.games.filter": { zh: "六艺筛选", en: "Filter by art", fr: "Filtrer par art", es: "Filtrar por arte", ar: "تصفية حسب الفن" },
  "admin.games.all": { zh: "全部", en: "All", fr: "Tous", es: "Todos", ar: "الكل" },
  "admin.games.detail": { zh: "对局明细", en: "Round details", fr: "Détails des manches", es: "Detalles de rondas", ar: "تفاصيل الجولات" },
  "admin.games.user": { zh: "用户", en: "User", fr: "Utilisateur", es: "Usuario", ar: "المستخدم" },
  "admin.games.score": { zh: "分数", en: "Score", fr: "Score", es: "Puntaje", ar: "النقاط" },
  "admin.games.time": { zh: "时间", en: "Time", fr: "Heure", es: "Hora", ar: "الوقت" },
  "admin.games.deleteRound": { zh: "删除记录", en: "Delete record", fr: "Supprimer l'enregistrement", es: "Eliminar registro", ar: "حذف السجل" },
  "admin.games.confirmDeleteRound": { zh: "确定删除这条对局记录？", en: "Delete this round record?", fr: "Supprimer cet enregistrement de manche ?", es: "¿Eliminar este registro de ronda?", ar: "هل تريد حذف سجل الجولة هذا؟" },
  "admin.games.emptyRounds": { zh: "该游戏暂无对局记录", en: "No rounds for this game yet", fr: "Aucune manche pour ce jeu", es: "Sin rondas para este juego", ar: "لا جولات لهذه اللعبة بعد" },

  // 案例审核
  "admin.cases.approve": { zh: "通过", en: "Approve", fr: "Approuver", es: "Aprobar", ar: "موافقة" },
  "admin.cases.reject": { zh: "驳回", en: "Reject", fr: "Rejeter", es: "Rechazar", ar: "رفض" },
  "admin.cases.needsRevision": { zh: "需修改", en: "Needs revision", fr: "À retravailler", es: "Necesita revisión", ar: "يحتاج إلى تعديل" },
  "admin.cases.reviewNote": { zh: "审核备注", en: "Review note", fr: "Note de relecture", es: "Nota de revisión", ar: "ملاحظة المراجعة" },
  "admin.cases.st.approved": { zh: "已通过", en: "Approved", fr: "Approuvé", es: "Aprobado", ar: "موافَق" },
  "admin.cases.st.rejected": { zh: "已驳回", en: "Rejected", fr: "Rejeté", es: "Rechazado", ar: "مرفوض" },
  "admin.cases.st.needsRevision": { zh: "需修改", en: "Needs revision", fr: "À retravailler", es: "Necesita revisión", ar: "يحتاج تعديلًا" },
  "admin.cases.reviewDone": { zh: "已提交审核结果", en: "Review submitted", fr: "Relecture soumise", es: "Revisión enviada", ar: "تم إرسال المراجعة" },

  // 机构管理
  "admin.inst.new": { zh: "新建机构", en: "New institution", fr: "Nouvelle institution", es: "Nueva institución", ar: "مؤسسة جديدة" },
  "admin.inst.edit": { zh: "编辑机构", en: "Edit institution", fr: "Modifier l'institution", es: "Editar institución", ar: "تعديل المؤسسة" },
  "admin.inst.delete": { zh: "删除机构", en: "Delete institution", fr: "Supprimer l'institution", es: "Eliminar institución", ar: "حذف المؤسسة" },
  "admin.inst.confirmDelete": { zh: "确定删除机构 {name} 及其所有 Key？", en: "Delete institution {name} and all its keys?", fr: "Supprimer l'institution {name} et toutes ses clés ?", es: "¿Eliminar la institución {name} y todas sus claves?", ar: "هل تريد حذف المؤسسة {name} وكل مفاتيحها؟" },
  "admin.inst.f.name": { zh: "机构名", en: "Name", fr: "Nom", es: "Nombre", ar: "الاسم" },
  "admin.inst.f.country": { zh: "国家", en: "Country", fr: "Pays", es: "País", ar: "البلد" },
  "admin.inst.f.contact": { zh: "联系邮箱", en: "Contact email", fr: "E-mail de contact", es: "Correo de contacto", ar: "بريد التواصل" },
  "admin.inst.f.purpose": { zh: "用途", en: "Purpose", fr: "Usage", es: "Propósito", ar: "الغرض" },
  "admin.inst.f.quota": { zh: "月配额", en: "Monthly quota", fr: "Quota mensuel", es: "Cuota mensual", ar: "الحصة الشهرية" },
  "admin.inst.revokeKey": { zh: "吊销 Key", en: "Revoke key", fr: "Révoquer la clé", es: "Revocar clave", ar: "إلغاء المفتاح" },
  "admin.inst.confirmRevoke": { zh: "确定吊销该 Key？", en: "Revoke this key?", fr: "Révoquer cette clé ?", es: "¿Revocar esta clave?", ar: "هل تريد إلغاء هذا المفتاح؟" },
  "admin.inst.usage": { zh: "查看用量", en: "Usage", fr: "Utilisation", es: "Uso", ar: "الاستخدام" },
  "admin.inst.usedToday": { zh: "今日", en: "Today", fr: "Aujourd'hui", es: "Hoy", ar: "اليوم" },
  "admin.inst.used7d": { zh: "近7日", en: "Last 7 days", fr: "7 jours", es: "7 días", ar: "7 أيام" },
  "admin.inst.usedMonth": { zh: "本月", en: "This month", fr: "Ce mois", es: "Este mes", ar: "هذا الشهر" },
  "admin.inst.topPaths": { zh: "热门路径", en: "Top paths", fr: "Chemins principaux", es: "Rutas principales", ar: "أهم المسارات" },
  "admin.inst.noUsage": { zh: "暂无用量数据", en: "No usage data", fr: "Pas de données d'utilisation", es: "Sin datos de uso", ar: "لا بيانات استخدام" },

  // 互动 / 投稿审核 / 公告
  "admin.eng.contribReview": { zh: "投稿审核", en: "Contribution review", fr: "Revue des contributions", es: "Revisión de contribuciones", ar: "مراجعة المساهمات" },
  "admin.eng.pendingContribs": { zh: "待审投稿", en: "Pending contributions", fr: "Contributions en attente", es: "Contribuciones pendientes", ar: "مساهمات قيد المراجعة" },
  "admin.eng.moderateApprove": { zh: "通过", en: "Approve", fr: "Approuver", es: "Aprobar", ar: "موافقة" },
  "admin.eng.moderateReject": { zh: "驳回", en: "Reject", fr: "Rejeter", es: "Rechazar", ar: "رفض" },
  "admin.eng.moderated": { zh: "已处理", en: "Done", fr: "Traité", es: "Procesado", ar: "تمت المعالجة" },
  "admin.ann.postAnnouncement": { zh: "发布公告", en: "Post announcement", fr: "Publier une annonce", es: "Publicar aviso", ar: "نشر إعلان" },
  "admin.ann.f.title": { zh: "标题", en: "Title", fr: "Titre", es: "Título", ar: "العنوان" },
  "admin.ann.f.body": { zh: "正文", en: "Body", fr: "Contenu", es: "Cuerpo", ar: "النص" },
  "admin.ann.f.lang": { zh: "语言", en: "Language", fr: "Langue", es: "Idioma", ar: "اللغة" },
  "admin.ann.f.active": { zh: "启用", en: "Active", fr: "Actif", es: "Activo", ar: "مفعّل" },
  "admin.ann.posted": { zh: "公告已发布", en: "Announcement posted", fr: "Annonce publiée", es: "Aviso publicado", ar: "تم نشر الإعلان" },

  // 设置页
  "admin.settings.title": { zh: "站点设置", en: "Site settings", fr: "Paramètres du site", es: "Ajustes del sitio", ar: "إعدادات الموقع" },
  "admin.settings.siteNotice": { zh: "顶部公告条", en: "Top announcement bar", fr: "Bandeau d'annonce", es: "Barra de aviso superior", ar: "شريط الإعلان العلوي" },
  "admin.settings.features": { zh: "功能开关（KV JSON）", en: "Feature flags (KV JSON)", fr: "Interrupteurs (KV JSON)", es: "Interruptores (KV JSON)", ar: "مفاتيح الميزات (KV JSON)" },
  "admin.settings.modeName": { zh: "模式名称", en: "Mode name", fr: "Nom du mode", es: "Nombre del modo", ar: "اسم الوضع" },
  "admin.settings.kvHint": { zh: "粘贴或编辑 JSON，保存即生效。", en: "Paste or edit JSON; saving takes effect immediately.", fr: "Collez ou modifiez le JSON ; l'enregistrement prend effet immédiatement.", es: "Pega o edita JSON; al guardar surte efecto.", ar: "الصق أو عدّل JSON؛ ويصبح الحفظ نافذًا فورًا." },
  "admin.settings.audit": { zh: "操作审计日志", en: "Audit log", fr: "Journal d'audit", es: "Registro de auditoría", ar: "سجل التدقيق" },
  "admin.settings.col.actor": { zh: "操作人", en: "Actor", fr: "Acteur", es: "Usuario", ar: "الجهة" },
  "admin.settings.col.action": { zh: "动作", en: "Action", fr: "Action", es: "Acción", ar: "الإجراء" },
  "admin.settings.col.target": { zh: "对象", en: "Target", fr: "Cible", es: "Objetivo", ar: "الهدف" },
  "admin.settings.col.when": { zh: "时间", en: "Time", fr: "Heure", es: "Hora", ar: "الوقت" },
  "admin.settings.saved": { zh: "设置已保存", en: "Settings saved", fr: "Paramètres enregistrés", es: "Ajustes guardados", ar: "تم حفظ الإعدادات" },
  "admin.settings.invalidJson": { zh: "JSON 格式有误", en: "Invalid JSON", fr: "JSON invalide", es: "JSON inválido", ar: "JSON غير صالح" },

  // 仪表盘
  "admin.dash.range": { zh: "时间范围", en: "Range", fr: "Période", es: "Periodo", ar: "المدة" },
  "admin.dash.days7": { zh: "7 天", en: "7 days", fr: "7 jours", es: "7 días", ar: "7 أيام" },
  "admin.dash.days30": { zh: "30 天", en: "30 days", fr: "30 jours", es: "30 días", ar: "30 يومًا" },
  "admin.dash.days90": { zh: "90 天", en: "90 days", fr: "90 jours", es: "90 días", ar: "90 يومًا" },
  "admin.dash.quickActions": { zh: "快捷操作", en: "Quick actions", fr: "Actions rapides", es: "Acciones rápidas", ar: "إجراءات سريعة" },
  "admin.dash.exportUsers": { zh: "导出用户 CSV", en: "Export users CSV", fr: "Exporter les utilisateurs CSV", es: "Exportar usuarios CSV", ar: "تصدير المستخدمين CSV" },
  "admin.dash.newContent": { zh: "新建内容", en: "New content", fr: "Nouveau contenu", es: "Nuevo contenido", ar: "محتوى جديد" },
  "admin.dash.postAnnouncement": { zh: "发公告", en: "Post announcement", fr: "Publier une annonce", es: "Publicar aviso", ar: "نشر إعلان" },
  // ── 楼中楼评论（target 无关，可复用）─────────────────────────────────
  "comments.count": { zh: "{n} 条评论", en: "{n} comments", fr: "{n} commentaires", es: "{n} comentarios", ar: "{n} تعليقًا" },
  "comments.title": { zh: "评论", en: "Discussion", fr: "Discussion", es: "Debate", ar: "النقاش" },
  "comments.placeholder": { zh: "写下你的读后心得…", en: "Share your thoughts on this passage…", fr: "Partagez votre lecture…", es: "Comparte tu lectura…", ar: "شارك تأملك في هذا النص…" },
  "comments.submit": { zh: "发布", en: "Post", fr: "Publier", es: "Publicar", ar: "نشر" },
  "comments.cancel": { zh: "取消", en: "Cancel", fr: "Annuler", es: "Cancelar", ar: "إلغاء" },
  "comments.reply": { zh: "回复", en: "Reply", fr: "Répondre", es: "Responder", ar: "رد" },
  "comments.like": { zh: "赞", en: "Like", fr: "J'aime", es: "Me gusta", ar: "أعجبني" },
  "comments.report": { zh: "举报", en: "Report", fr: "Signaler", es: "Reportar", ar: "إبلاغ" },
  "comments.delete": { zh: "删除", en: "Delete", fr: "Supprimer", es: "Eliminar", ar: "حذف" },
  "comments.deleteConfirm": { zh: "删除这条评论？", en: "Delete this comment?", fr: "Supprimer ce commentaire ?", es: "¿Eliminar este comentario?", ar: "هل تريد حذف هذا التعليق؟" },
  "comments.viewReplies": { zh: "查看 {n} 条回复", en: "View {n} replies", fr: "Voir {n} réponses", es: "Ver {n} respuestas", ar: "عرض {n} ردود" },
  "comments.hideReplies": { zh: "收起回复", en: "Hide replies", fr: "Masquer les réponses", es: "Ocultar respuestas", ar: "طي الردود" },
  "comments.empty.title": { zh: "还没有评论", en: "No comments yet", fr: "Pas encore de commentaire", es: "Sin comentarios", ar: "لا تعليقات بعد" },
  "comments.empty.sub": { zh: "读完这一段，留下你的第一句感想。", en: "Be the first to share a thought on this passage.", fr: "Soyez le premier à partager une lecture.", es: "Sé el primero en compartir una lectura.", ar: "كن أول من يشارك تأمله في هذا النص." },
  "comments.loading": { zh: "正在加载评论…", en: "Loading comments…", fr: "Chargement des commentaires…", es: "Cargando comentarios…", ar: "جارٍ تحميل التعليقات…" },
  "comments.error.title": { zh: "评论加载失败", en: "Couldn't load comments", fr: "Impossible de charger les commentaires", es: "No se pudieron cargar los comentarios", ar: "تعذّر تحميل التعليقات" },
  "comments.error.retry": { zh: "重试", en: "Retry", fr: "Réessayer", es: "Reintentar", ar: "إعادة المحاولة" },
  "comments.charLimit": { zh: "最多 500 字", en: "Up to 500 characters", fr: "500 caractères max.", es: "Máx. 500 caracteres", ar: "حتى 500 حرف" },
  "comments.minLen": { zh: "评论至少 1 个字", en: "Comment is too short", fr: "Commentaire trop court", es: "Comentario demasiado corto", ar: "التعليق قصير جدًا" },
  "comments.frequent": { zh: "发言太频繁，请稍后再试", en: "You're posting too fast; please wait a moment.", fr: "Postez moins vite, patientez un instant.", es: "Publicas demasiado rápido; espera un momento.", ar: "تنشر بسرعة؛ انتظر قليلًا." },
  "comments.postFailed": { zh: "发布失败，请稍后再试", en: "Failed to post; please try again.", fr: "Échec de la publication, réessayez.", es: "Error al publicar; inténtalo de nuevo.", ar: "فشل النشر؛ حاول مرة أخرى." },
  "comments.reported": { zh: "已举报，感谢反馈", en: "Reported. Thank you.", fr: "Signalé. Merci.", es: "Reportado. Gracias.", ar: "تم الإبلاغ. شكرًا." },
  "comments.deleted": { zh: "评论已删除", en: "Comment deleted", fr: "Commentaire supprimé", es: "Comentario eliminado", ar: "تم حذف التعليق" },
  "comments.guest": { zh: "访客", en: "Guest", fr: "Invité", es: "Invitado", ar: "زائر" },
  "comments.justNow": { zh: "刚刚", en: "just now", fr: "à l'instant", es: "ahora mismo", ar: "الآن" },
  "comments.minutesAgo": { zh: "{n} 分钟前", en: "{n} min ago", fr: "il y a {n} min", es: "hace {n} min", ar: "قبل {n} دقيقة" },
  "comments.hoursAgo": { zh: "{n} 小时前", en: "{n} h ago", fr: "il y a {n} h", es: "hace {n} h", ar: "قبل {n} ساعة" },
  "comments.daysAgo": { zh: "{n} 天前", en: "{n} d ago", fr: "il y a {n} j", es: "hace {n} d", ar: "قبل {n} يومًا" },
  // ── 隐私政策(与 /privacy 页一一对应)──
  "essays.kicker": { zh: "ESSAY STARTER PACKS", en: "ESSAY STARTER PACKS", fr: "KIT À DISSERTATION", es: "KIT PARA ENSAYOS", ar: "حِزَم بدء المقال" },
  "essays.title": { zh: "论文起手包", en: "Essay starter packs", fr: "Kits pour dissertations", es: "Kits para ensayos", ar: "حِزَم بدء المقال" },
  "essays.lead": { zh: "四个最常被写进论文的主题,每组三句核心章句配一句西方经典对照——原文、译文、出处齐备,一键复制引用,点章句去深读。", en: "Four essay-ready themes. Each pairs three key passages with one Western classic — original text, translation and reference included. Copy citations in one click; open a passage to go deeper.", fr: "Quatre thèmes prêts pour la dissertation : trois passages clés et un classique occidental — texte original, traduction et référence. Copiez les citations en un clic.", es: "Cuatro temas listos para tu ensayo: tres pasajes clave y un clásico occidental — texto original, traducción y referencia. Copia las citas en un clic.", ar: "أربعة موضوعات جاهزة لمقالك: ثلاثة مقاطع رئيسية مقابل نص غربي كلاسيكي، مع النص الأصلي والترجمة والمرجع، وانسخ الاستشهادات بضغطة." },
  "essays.citeAll": { zh: "复制整组引用", en: "Copy all citations", fr: "Copier toutes les citations", es: "Copiar todas las citas", ar: "نسخ كل الاستشهادات" },
  "essays.westLabel": { zh: "西方对照", en: "The West reads this", fr: "L'Occident le lit ainsi", es: "Occidente lo lee así", ar: "الغرب يقرأه هكذا" },
  "essays.justice.title": { zh: "义:正义与推己及人", en: "Justice & reciprocity", fr: "Justice et réciprocité", es: "Justicia y reciprocidad", ar: "العدل والمعاملة بالمثل" },
  "essays.justice.west.quote": { zh: "要只按照你同时能够愿意它成为普遍法则的准则去行动。", en: "Act only according to that maxim which you can at the same time will to become a universal law.", fr: "Agis uniquement d'après la maxime qui peut valoir en même temps comme loi universelle.", es: "Obra solo según la máxima que puedas querer que sea ley universal.", ar: "اعمل وفق القاعدة التي تستطيع أن تريدها قانونًا كونيًا." },
  "essays.justice.west.src": { zh: "康德《道德形而上学奠基》", en: "Immanuel Kant, Groundwork of the Metaphysics of Morals", fr: "Kant, Fondements de la métaphysique des mœurs", es: "Kant, Fundamentación de la metafísica de las costumbres", ar: "كانط، أسس ميتافيزيقا الأخلاق" },
  "essays.self.title": { zh: "修身:日日新的自己", en: "Self-cultivation", fr: "Culture de soi", es: "Cultivo de sí", ar: "تهذيب النفس" },
  "essays.self.west.quote": { zh: "美德由习惯养成:我们通过做正义的事成为正义的人。", en: "Moral virtue is formed by habit: we become just by doing just acts.", fr: "La vertu s'acquiert par l'habitude : on devient juste en faisant des actes justes.", es: "La virtud se adquiere por el hábito: nos hacemos justos haciendo actos justos.", ar: "تتكون الفضيلة بالعادة: نصير عادلين بأفعال عادلة." },
  "essays.self.west.src": { zh: "亚里士多德《尼各马可伦理学》", en: "Aristotle, Nicomachean Ethics II", fr: "Aristote, Éthique à Nicomaque II", es: "Aristóteles, Ética a Nicómaco II", ar: "أرسطو، أخلاق نيقوماخوس" },
  "essays.ritual.title": { zh: "礼:仪式与好的生活", en: "Ritual & the good life", fr: "Rite et vie bonne", es: "Rito y vida buena", ar: "الطقس والحياة الطيبة" },
  "essays.ritual.west.quote": { zh: "仪式不是迷信的残余,而是社会凝聚力的引擎。", en: "Ritual is not the residue of superstition but the engine of social solidarity.", fr: "Le rite n'est pas un résidu de superstition mais le moteur de la solidarité sociale.", es: "El rito no es residuo de superstición sino motor de la solidaridad social.", ar: "الطقس ليس بقايا خرافة بل محرّك التضامن الاجتماعي." },
  "essays.ritual.west.src": { zh: "涂尔干《宗教生活的基本形式》", en: "Émile Durkheim, The Elementary Forms of Religious Life", fr: "Durkheim, Les Formes élémentaires de la vie religieuse", es: "Durkheim, Las formas elementales de la vida religiosa", ar: "دوركهايم، الصور الأولية للحياة الدينية" },
  "essays.friendship.title": { zh: "友:友谊与信任", en: "Friendship & trust", fr: "Amitié et confiance", es: "Amistad y confianza", ar: "الصداقة والثقة" },
  "essays.friendship.west.quote": { zh: "朋友是另一个自我。", en: "A friend is a second self.", fr: "L'ami est un autre soi-même.", es: "El amigo es otro yo.", ar: "الصديق نفسٌ أخرى." },
  "essays.friendship.west.src": { zh: "亚里士多德《尼各马可伦理学》卷八", en: "Aristotle, Nicomachean Ethics VIII", fr: "Aristote, Éthique à Nicomaque VIII", es: "Aristóteles, Ética a Nicómaco VIII", ar: "أرسطو، أخلاق نيقوماخوس، الكتاب الثامن" },
  "about.community.title": { zh: "参与方式", en: "Get involved", fr: "Participer", es: "Participa", ar: "شارك" },
  "about.community.lead": { zh: "本站由社群共建:教师、开发者与内容贡献者各有入口。", en: "This platform is built with its community — educators, developers and contributors each have an entry point.", fr: "Cette plateforme se construit avec sa communauté : enseignants, développeurs et contributeurs ont chacun leur entrée.", es: "La plataforma se construye con su comunidad: docentes, desarrolladores y contribuidores tienen su entrada.", ar: "تُبنى المنصّة مع مجتمعها: للمعلّمين والمطورين والمساهمين مداخلهم الخاصة." },
  "about.comm.teach.desc": { zh: "共建教学课件与课堂材料", en: "Co-build teaching materials for the classroom", fr: "Co-construire des supports de classe", es: "Co-crear materiales para el aula", ar: "شارك في بناء مواد التعليم" },
  "about.comm.cocreate.desc": { zh: "参与译文、注释与案例的共建评审", en: "Contribute to translations, annotations and case review", fr: "Contribuer aux traductions, annotations et relecture des cas", es: "Contribuye a traducciones, anotaciones y revisión de casos", ar: "ساهم في الترجمات والشروح ومراجعة الحالات" },
  "about.comm.developers.desc": { zh: "开放 API:检索语料与概念图谱", en: "Open API: query the corpus and concept graph", fr: "API ouverte : interroger corpus et graphe de concepts", es: "API abierta: consulta el corpus y el grafo conceptual", ar: "واجهة مفتوحة: استعلم النصوص وشبكة المفاهيم" },
  "about.comm.plugins.desc": { zh: "把本站接入你自己的工具链", en: "Plug the platform into your own tools", fr: "Intégrez la plateforme à vos outils", es: "Integra la plataforma en tus herramientas", ar: "ادمج المنصّة في أدواتك" },
  "about.comm.reach.desc": { zh: "项目数据与成果一览", en: "Project metrics and milestones", fr: "Données et jalons du projet", es: "Datos e hitos del proyecto", ar: "بيانات المشروع ومراحله" },
  "terms.viewGraph": { zh: "图谱", en: "Graph", fr: "Graphe", es: "Grafo", ar: "الرسم" },
  "graph.toTerms": { zh: "查看术语表", en: "Open in glossary", fr: "Voir dans le glossaire", es: "Ver en el glosario", ar: "افتح في المسرد" },
  "essays.allPaths": { zh: "查看全部学习路径 →", en: "See all learning paths →", fr: "Voir tous les parcours →", es: "Ver todas las rutas →", ar: "عرض كل مسارات التعلّم →" },
  "paths.essays.banner": { zh: "写论文?四组主题起手包已备好:章句、译文、西方对照与一键引用。", en: "Writing an essay? Four themed starter packs: passages, translations, Western counterparts and one-click citations.", fr: "Une dissertation ? Quatre kits thématiques : passages, traductions, contrepoints occidentaux et citations en un clic.", es: "¿Escribes un ensayo? Cuatro kits temáticos: pasajes, traducciones, contrapuntos occidentales y citas en un clic.", ar: "تكتب مقالًا؟ أربع حِزَم موضوعية: مقاطع وترجمات ونصوص غربية مقابلة واستشهادات بضغطة." },
  "about.kicker": { zh: "ABOUT", en: "ABOUT", fr: "À PROPOS", es: "SOBRE", ar: "حول" },
  "about.title": { zh: "关于本项目", en: "About this project", fr: "À propos du projet", es: "Sobre el proyecto", ar: "عن المشروع" },
  "about.lead": { zh: "面向全球读者的儒家经典语义平台:读原典、查术语、比文明、问子曰君,全部免费。", en: "A free semantic platform on Confucian classics for readers worldwide: read the source texts, look up key terms, compare civilisations, and ask questions.", fr: "Une plateforme sémantique libre sur les classiques confucéens : lire les textes sources, chercher les termes clés, comparer les civilisations, poser des questions.", es: "Una plataforma semántica gratuita sobre los clásicos confucianos: lee las fuentes, consulta términos clave, compara civilizaciones y pregunta.", ar: "منصّة دلالية مجانية للتراث الكونفوشيوسي: اقرأ النصوص الأصلية وابحث في المصطلحات وقارن الحضارات واسأل." },
  "about.s1.title": { zh: "这是什么", en: "What this is", fr: "Ce que c'est", es: "Qué es", ar: "ما هذا" },
  "about.s1.body": { zh: "《论语》《孟子》《大学》《中庸》及礼乐书数御射六艺的原文、拼音、多语译文与注释,以博物馆式的浏览体验组织;每句都有可追溯的出处编号,跨文明案例库把经典放进世界思想的坐标系。", en: "The Analects, Mencius, Great Learning, Doctrine of the Mean and the Six Arts — source text, pinyin, multilingual translations and annotations, curated like a museum collection. Every passage carries a traceable reference; the case library places the classics among world philosophies.", fr: "Les Entretiens, Mencius, la Grande Étude, l'Invariable Milieu et les Six Arts — texte source, pinyin, traductions multilingues et annotations, organisés comme une collection de musée. Chaque passage a une référence traçable.", es: "Analectas, Mencio, Gran Sabiduría, Doctrina del Justo Medio y las Seis Artes: texto fuente, pinyin, traducciones y anotaciones, curados como una colección de museo. Cada pasaje tiene una referencia rastreable.", ar: "«المنتخبات» و«منسيوس» و«التعليم الأعظم» و«الوسط الثابت» والفنون الستة: النص الأصلي والبينيين والترجمات والشروح، منظّمة كمجموعة متحفية، ولكل مقطع مرجع قابل للتتبع." },
  "about.s2.title": { zh: "译文怎么来的", en: "How translations are made", fr: "Comment sont faites les traductions", es: "Cómo se hacen las traducciones", ar: "كيف تُصنع الترجمات" },
  "about.s2.body": { zh: "原文以通行本为底本;多语译文由平台编辑部译出,参考学界通行译本并逐条核对语境,标注为「平台译本」。每句译文旁附原文与拼音,鼓励读者对照;学术引用建议同时注明本平台与所据原典。", en: "Source texts follow standard critical editions. Multilingual translations are produced by our editorial board with reference to established scholarly versions, checked passage by passage, and labelled 'Platform translation'. Original text and pinyin sit beside every translation — compare before you cite; for coursework, cite both this platform and the classical source.", fr: "Les textes sources suivent les éditions critiques courantes. Les traductions sont produites par notre comité éditorial, référencées aux versions savantes établies et vérifiées passage par passage (« Traduction de la plateforme »). Le texte original et le pinyin accompagnent chaque traduction.", es: "Los textos fuente siguen ediciones críticas estándar. Las traducciones multilingües las produce nuestro consejo editorial con referencia a versiones académicas establecidas, verificadas pasaje a pasaje («Traducción de la plataforma»). El original y el pinyin acompañan cada traducción.", ar: "تتبع النصوص الأصلية الطبعات النقدية المعتمدة؛ وتنتج الترجمات هيئة تحريرنا بالاستناد إلى الترجمات الأكاديمية الراسخة ومراجعة مقطعًا بمقطع («ترجمة المنصة»). النص الأصلي والبينيين بجانب كل ترجمة." },
  "about.s3.title": { zh: "谁在维护", en: "Who maintains it", fr: "Qui le maintient", es: "Quién lo mantiene", ar: "من يشغّله" },
  "about.s3.body": { zh: "由平台编辑部持续维护与审校,内容建设向共建者开放:教学场景可通过「教」入口共建课件,开发者可通过开放 API 检索语料。案例库内容经评审后发布。", en: "Maintained and reviewed by an editorial board. Content contribution is open: educators can co-build teaching materials via the Teach section; developers can query the corpus through the open API. Case-library entries are published after review.", fr: "Maintenu et relu par un comité éditorial. Les contributions sont ouvertes : les enseignants peuvent co-construire via la section Enseigner ; les développeurs interroger le corpus via l'API ouverte. Les cas sont publiés après relecture.", es: "Mantenido y revisado por un consejo editorial. Las contribuciones están abiertas: docentes via Enseñar; desarrolladores vía API abierta. Los casos se publican tras revisión.", ar: "تشغّله هيئة تحريرية تراجعه باستمرار. المساهمات مفتوحة: المعلّمون عبر باب «التعليم»، والمطورون عبر الواجهة البرمجية المفتوحة، وتُنشر الحالات بعد المراجعة." },
  "about.s4.title": { zh: "联系与反馈", en: "Contact & feedback", fr: "Contact et retours", es: "Contacto y comentarios", ar: "التواصل والملاحظات" },
  "about.s4.body": { zh: "译文勘误、内容建议与合作意向,欢迎通过共建入口或开发者页面与我们联系;数据权利相关事宜见隐私政策。", en: "For translation corrections, content suggestions or collaboration, reach us via the co-create or developers pages; for data-rights matters see the privacy policy.", fr: "Pour corrections, suggestions ou collaborations, écrivez-nous via les pages co-création ou développeurs ; pour vos données, voir la politique de confidentialité.", es: "Para correcciones, sugerencias o colaboración, escríbenos vía co-creación o desarrolladores; sobre tus datos, consulta la política de privacidad.", ar: "لتصحيح الترجمات أو الاقتراحات أو التعاون، تواصل معنا عبر صفحات المشاركة أو المطوّرين؛ ولشؤون بياناتك راجع سياسة الخصوصية." },
  "about.cocreateLink": { zh: "参与共建", en: "Contribute", fr: "Contribuer", es: "Contribuir", ar: "شارك" },
  "about.developersLink": { zh: "开发者 API", en: "Developer API", fr: "API développeurs", es: "API para desarrolladores", ar: "واجهة المطوّرين" },
  "privacy.kicker": { zh: "PRIVACY", en: "PRIVACY", fr: "CONFIDENTIALITÉ", es: "PRIVACIDAD", ar: "الخصوصية" },
  "privacy.title": { zh: "隐私政策", en: "Privacy Policy", fr: "Politique de confidentialité", es: "Política de privacidad", ar: "سياسة الخصوصية" },
  "privacy.updated": { zh: "更新:2026 年 10 月", en: "Updated: October 2026", fr: "Mise à jour : octobre 2026", es: "Actualizado: octubre de 2026", ar: "آخر تحديث: أكتوبر 2026" },
  "privacy.s1.title": { zh: "我们收集什么", en: "What we collect", fr: "Ce que nous collectons", es: "Qué recopilamos", ar: "ما نجمعه" },
  "privacy.s1.body": {
    zh: "本站仅收集必要数据:浏览器本地存储中的语言与主题偏好;游客身份令牌与学习进度(阅读、签到、游戏化经验);如您主动注册,收集邮箱与显示名称;如您上传头像,收集该图片。我们不收集证件信息、通讯录、精确位置,也不接入第三方广告或追踪器。",
    en: "We collect only what is necessary: your language and theme preferences in browser local storage; a guest token and your learning progress (reading, check-ins, gamified XP); if you choose to register, your email and display name; and an image if you upload an avatar. We do not collect identity documents, contacts, precise location, and we run no third-party ads or trackers.",
    fr: "Nous ne collectons que le nécessaire : vos préférences de langue et de thème stockées localement ; un jeton d'invité et votre progression (lectures, points, XP) ; si vous créez un compte, votre e-mail et votre nom affiché ; et une image si vous téléversez un avatar. Aucun document d'identité, aucun contact, aucune localisation précise, ni publicité ou traqueur tiers.",
    es: "Solo recopilamos lo necesario: tus preferencias de idioma y tema en el almacenamiento local; un token de invitado y tu progreso de aprendizaje (lecturas, registros, XP); si te registras, tu correo y nombre visible; y una imagen si subes un avatar. No recopilamos documentos de identidad, contactos ni ubicación precisa, y no usamos publicidad ni rastreadores de terceros.",
    ar: "نجمع فقط ما يلزم: تفضيلات اللغة والمظهر في التخزين المحلي للمتصفح؛ رمز ضيف وتقدّمك في التعلّم (القراءات، تسجيل الحضور، نقاط الخبرة)؛ وإذا سجّلت، بريدك الإلكتروني واسمك المعروض؛ وصورة إذا رفعت صورة رمزية. لا نجمع وثائق هوية ولا جهات اتصال ولا موقعًا دقيقًا، ولا نستخدم إعلانات أو متتبعات خارجية.",
  },
  "privacy.s2.title": { zh: "访问统计与匿名化", en: "Analytics & anonymisation", fr: "Statistiques et anonymisation", es: "Estadísticas y anonimización", ar: "الإحصاءات وإخفاء الهوية" },
  "privacy.s2.body": {
    zh: "为统计各地区的使用情况,我们记录页面访问事件,IP 地址仅用于推导国家/地区代码后即丢弃,不存储原始 IP,也不与任何身份关联。",
    en: "To understand regional usage we log page-view events. IP addresses are used only to derive a country code and are then discarded — raw IPs are never stored or linked to any identity.",
    fr: "Pour comprendre l'usage par région, nous consignons les pages vues. L'adresse IP sert uniquement à déduire un code pays, puis est abandonnée — aucune IP brute n'est conservée ni reliée à une identité.",
    es: "Para conocer el uso por región registramos las páginas vistas. La IP solo se usa para deducir un código de país y luego se descarta: nunca se almacenan IPs en bruto ni se vinculan a una identidad.",
    ar: "لفهم الاستخدام حسب المنطقة نسجّل مشاهدات الصفحات. يُستخدم عنوان IP فقط لاستنتاج رمز البلد ثم يُهمَل — لا تُخزَّن عناوين IP الخام ولا تُربط بأي هوية.",
  },
  "privacy.s3.title": { zh: "您的数据权利(GDPR/CCPA)", en: "Your rights (GDPR/CCPA)", fr: "Vos droits (RGPD/CCPA)", es: "Tus derechos (GDPR/CCPA)", ar: "حقوقك (GDPR/CCPA)" },
  "privacy.s3.body": {
    zh: "您可随时在「个人中心」一键导出全部数据(JSON),或删除账户及全部关联数据;游客身份清除浏览器存储即等同于删除。我们不在任何场景出售您的数据。",
    en: "You can export all your data (JSON) or delete your account and everything linked to it at any time from your profile page; for guest identities, clearing browser storage is equivalent to deletion. We never sell your data.",
    fr: "Vous pouvez exporter toutes vos données (JSON) ou supprimer votre compte et les données associées à tout moment depuis votre profil ; pour un compte invité, vider le stockage du navigateur équivaut à une suppression. Nous ne vendons jamais vos données.",
    es: "Puedes exportar todos tus datos (JSON) o eliminar tu cuenta y todo lo asociado en cualquier momento desde tu perfil; para identidades de invitado, borrar el almacenamiento del navegador equivale a la eliminación. Nunca vendemos tus datos.",
    ar: "يمكنك تصدير جميع بياناتك (JSON) أو حذف حسابك وكل ما يرتبط به في أي وقت من صفحة ملفك؛ وللهوية الضيف يمسح تخزين المتصفح المقابل للحذف. لا نبيع بياناتك أبدًا.",
  },
  "privacy.s4.title": { zh: "本地存储(Cookie 声明)", en: "Local storage (cookie notice)", fr: "Stockage local (cookies)", es: "Almacenamiento local (cookies)", ar: "التخزين المحلي (الكوكيز)" },
  "privacy.s4.body": {
    zh: "本站使用浏览器本地存储(而非追踪型 Cookie)保存语言偏好、明暗主题、登录令牌与「不再提示」状态,全部为功能必需,可随时在浏览器设置中清除。",
    en: "This site uses browser local storage (not tracking cookies) for your language preference, theme, sign-in token and dismissal states — all strictly functional, and clearable from browser settings at any time.",
    fr: "Ce site utilise le stockage local du navigateur (et non des cookies de suivi) pour la langue, le thème, le jeton de connexion et les préférences d'affichage — purement fonctionnels et effaçables à tout moment.",
    es: "Este sitio usa almacenamiento local del navegador (no cookies de rastreo) para idioma, tema, token de sesión y estados de aviso — todos funcionales y borrables en cualquier momento.",
    ar: "يستخدم هذا الموقع التخزين المحلي للمتصفح (لا كوكيز تتبّع) للغة والمظهر ورمز الدخول وحالات العرض — كلها وظيفية ويمسحها متى شئت.",
  },
  "privacy.s5.title": { zh: "联系方式", en: "Contact", fr: "Contact", es: "Contacto", ar: "التواصل" },
  "privacy.s5.body": {
    zh: "对数据问题有疑问或需行使上述权利,请通过页脚联系方式与我们沟通,我们将在 30 天内回应。",
    en: "For any data question or to exercise the rights above, contact us via the footer. We respond within 30 days.",
    fr: "Pour toute question sur les données ou pour exercer ces droits, contactez-nous via le pied de page. Réponse sous 30 jours.",
    es: "Para cualquier cuestión sobre datos o para ejercer estos derechos, contáctanos desde el pie de página. Respondemos en 30 días.",
    ar: "لأي سؤال عن البيانات أو لممارسة هذه الحقوق، تواصل معنا عبر تذييل الصفحة. نرد خلال 30 يومًا.",
  },
  "privacy.footerNote": { zh: "行使数据权利请前往", en: "To exercise your data rights, visit", fr: "Pour exercer vos droits, rendez-vous sur", es: "Para ejercer tus derechos, visita", ar: "لممارسة حقوقك، انتقل إلى" },
  "privacy.meLink": { zh: "个人中心", en: "your profile", fr: "votre profil", es: "tu perfil", ar: "ملفك الشخصي" },
  "privacy.cookie.text": {
    zh: "本站使用本地存储保存语言与主题偏好等必要功能设置,不用于追踪。继续浏览即表示知悉。",
    en: "We use local storage for essential preferences (language, theme). No tracking. Continuing means you're fine with this.",
    fr: "Nous utilisons le stockage local pour vos préférences essentielles (langue, thème). Aucun suivi. Continuer vaut acceptation.",
    es: "Usamos almacenamiento local para preferencias esenciales (idioma, tema). Sin rastreo. Continuar implica aceptación.",
    ar: "نستخدم التخزين المحلي للتفضيلات الأساسية (اللغة والمظهر). بلا تتبّع. متابعة التصفح تعني الموافقة.",
  },
  "privacy.cookie.ok": { zh: "知道了", en: "Got it", fr: "Compris", es: "Entendido", ar: "فهمت" },

};

const STORAGE_KEY = "kongzi_lang";

function detect(): Lang {
  // 服务端渲染无法感知浏览器语言，兜底英语（本站面向海外大学生）
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGS.some((l) => l.code === stored)) return stored as Lang;
  } catch {
    /* ignore */
  }
  // 无已存偏好：遍历浏览器语言偏好列表（navigator.languages 优先于首选项），
  // 命中支持名单（zh/en/fr/es/ar）即用；名单外语言一律回落英语
  const candidates = [...(navigator.languages || []), navigator.language || ""];
  for (const c of candidates) {
    const base = (c || "").slice(0, 2).toLowerCase();
    const hit = LANGS.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return "en";
}

const listeners = new Set<(l: Lang) => void>();
let current: Lang | null = null;

function setHtmlAttrs(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = RTL_LANGS.includes(l) ? "rtl" : "ltr";
}

export function getLang(): Lang {
  if (current) return current;
  current = detect();
  return current;
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore */
  }
  setHtmlAttrs(l);
  listeners.forEach((fn) => fn(l));
}

const LangCtx = createContext<Lang>("en");

/** 根布局(服务端)按 Accept-Language 推断初始语言后包一层:
 *  SSR 首帧即以正确语言渲染,消除非英文用户的首帧英文闪屏。
 *  挂载后已存偏好(localStorage)优先于服务端推断。 */
export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    let stored: Lang | null = null;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && LANGS.some((l) => l.code === v)) stored = v as Lang;
    } catch {
      /* ignore */
    }
    const resolved = stored ?? initialLang;
    current = resolved;
    setLangState(resolved);
    setHtmlAttrs(resolved);
    const sub = (l: Lang) => setLangState(l);
    listeners.add(sub);
    return () => {
      listeners.delete(sub);
    };
  }, [initialLang]);
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useContext(LangCtx);
  useEffect(() => {
    // 保底:未经 Provider 的树(理论不存在)也校正 html 属性
    if (typeof document !== "undefined" && document.documentElement.lang !== lang) {
      setHtmlAttrs(lang);
    }
    const sub = () => {};
    listeners.add(sub);
    return () => {
      listeners.delete(sub);
    };
  }, [lang]);
  return [lang, setLang];
}

export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  return entry?.[lang] ?? entry?.["zh"] ?? key;
}

export function isRTL(l: Lang): boolean {
  return RTL_LANGS.includes(l);
}

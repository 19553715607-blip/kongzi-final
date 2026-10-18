// 站点元信息（标题 / 描述）的五语文案。
//
// 为什么单独一个模块：`app/layout.tsx` 是**服务端组件**，它的 `export const metadata`
// 在构建期求值，用不了客户端 hook（`lib/i18n.ts` 带 "use client"，被服务端导入只会拿到
// client reference 而不是真实值）。所以这份数据放在**不带 "use client"** 的普通模块里，
// 由 layout 直接 import 并在注水前写入 document.title / meta description。
// i18n-scan-ignore-start —— 本文件就是五语文案的数据源，中文值即词条本身
export const META_TITLE: Record<string, string> = {
  zh: "孔子 · 儒家语义交互平台",
  en: "Kongzi · Confucian Semantic Platform",
  fr: "Kongzi · Plateforme sémantique confucéenne",
  es: "Kongzi · Plataforma semántica confuciana",
  ar: "كونغ تسي · منصة المعنى الكونفوشيوسي",
};

export const META_DESCRIPTION: Record<string, string> = {
  zh: "多终端、多语言、多智能体的儒家经典语义交互平台",
  en: "A multi-terminal, multilingual, multi-agent semantic platform for the Confucian classics",
  fr: "Une plateforme sémantique multi-terminal, multilingue et multi-agents pour les classiques confucéens",
  es: "Una plataforma semántica multiterminal, multilingüe y multiagente para los clásicos confucianos",
  ar: "منصة دلالية متعددة الأجهزة واللغات والعملاء للنصوص الكونفوشيوسية",
};

export const META_KEYWORDS: Record<string, string> = {
  zh: "孔子,儒家,论语,四书五经,汉字,字源,经典,语义,多语言",
  en: "Kongzi, Confucius, Confucianism, Analects, Four Books, Chinese characters, philology, classics, multilingual",
  fr: "Kongzi, Confucius, confucéisme, Analectes, classiques chinois, caractères chinois, philologie, multilingue",
  es: "Kongzi, Confucio, confucianismo, Analectas, clásicos chinos, caracteres chinos, filología, multilingüe",
  ar: "كونغ تسي, كونفوشيوس, الكونفوشيوسية, المختارات, كلاسيكيات صينية, حروف صينية, متعدد اللغات",
};
// i18n-scan-ignore-end

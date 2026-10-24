import type { Metadata } from "next";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import Toaster from "@/components/Toast";
import Tracker from "@/components/Tracker";
import { META_DESCRIPTION, META_KEYWORDS, META_TITLE } from "@/lib/metaText";

export const metadata: Metadata = {
  title: META_TITLE.zh,
  description: META_DESCRIPTION.zh,
  keywords: META_KEYWORDS.zh,
  // 社交分享卡(WhatsApp/iMessage/X 等):生产部署需设 NEXT_PUBLIC_SITE_URL 指向真实域名
  openGraph: {
    type: "website",
    siteName: META_TITLE.zh,
    title: META_TITLE.zh,
    description: META_DESCRIPTION.zh,
    images: [{ url: "/og/card.png", width: 1200, height: 630, alt: META_TITLE.zh }],
    locale: "zh_CN",
    alternateLocale: ["en_US", "fr_FR", "es_ES", "ar_AR"],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE.zh,
    description: META_DESCRIPTION.zh,
    images: ["/og/card.png"],
  },
};

// 无闪烁主题：在 React 注水前写入 dark 类。
// 夜游博物馆为全站默认：无存储偏好时恒定暗色（不再跟随系统偏好）；
// 用户点过明暗切换则尊重其选择。
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

// 多语言标题：与 themeScript 同法，注水前按语言写入 title / description / lang / dir。
// 无已存偏好时按浏览器语言偏好列表检测（命中 T 的 key 即支持名单 zh/en/fr/es/ar），
// 名单外一律英语；检测结果落地存储，之后与手动切换的偏好同等对待。
const langScript = `(function(){try{var T=${JSON.stringify(META_TITLE)},D=${JSON.stringify(
  META_DESCRIPTION,
)},K=${JSON.stringify(
  META_KEYWORDS,
)};var l=localStorage.getItem('kongzi_lang');if(!l||!T[l]){l='en';var ls=[].concat(navigator.languages||[],navigator.language||'');for(var i=0;i<ls.length;i++){var c=(ls[i]||'').slice(0,2).toLowerCase();if(T[c]){l=c;break;}}try{localStorage.setItem('kongzi_lang',l);}catch(e){}}document.title=T[l];var m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',D[l]);var k=document.querySelector('meta[name="keywords"]');if(k)k.setAttribute('content',K[l]);document.documentElement.lang=l;document.documentElement.dir=(l==='ar')?'rtl':'ltr';var ogT=document.querySelector('meta[property="og:title"]');if(ogT)ogT.setAttribute('content',T[l]);var ogD=document.querySelector('meta[property="og:description"]');if(ogD)ogD.setAttribute('content',D[l]);var twT=document.querySelector('meta[name="twitter:title"]');if(twT)twT.setAttribute('content',T[l]);var twD=document.querySelector('meta[name="twitter:description"]');if(twD)twD.setAttribute('content',D[l]);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <Tracker />
        <PublicChrome>{children}</PublicChrome>
        <Toaster />
      </body>
    </html>
  );
}

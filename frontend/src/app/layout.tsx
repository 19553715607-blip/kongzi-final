import type { Metadata } from "next";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import Toaster from "@/components/Toast";
import Tracker from "@/components/Tracker";
import { META_DESCRIPTION, META_KEYWORDS, META_TITLE } from "@/lib/metaText";

export const metadata: Metadata = {
  title: META_TITLE.zh,
  description: META_DESCRIPTION.zh,
  keywords: META_KEYWORDS.zh,
};

// 无闪烁主题：在 React 注水前根据偏好设置 dark 类
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

// 多语言标题：与 themeScript 同法，注水前按已存语言写入 title / description / lang / dir
const langScript = `(function(){try{var T=${JSON.stringify(META_TITLE)},D=${JSON.stringify(
  META_DESCRIPTION,
)},K=${JSON.stringify(META_KEYWORDS)};var l=localStorage.getItem('kongzi_lang');if(!l||!T[l])return;document.title=T[l];var m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',D[l]);var k=document.querySelector('meta[name="keywords"]');if(k)k.setAttribute('content',K[l]);document.documentElement.lang=l;document.documentElement.dir=(l==='ar')?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
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

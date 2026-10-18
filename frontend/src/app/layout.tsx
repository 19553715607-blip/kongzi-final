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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <Tracker />
        <PublicChrome>{children}</PublicChrome>
        <Toaster />
      </body>
    </html>
  );
}

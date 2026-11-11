"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";

// 宣纸讲学 / 竹简夜读海报共用一份可翻译的标题和首页入口。
export default function NightHero({
  lang,
  quotePanel,
}: {
  lang: Lang;
  quotePanel: ReactNode;
}) {
  const entries = [
    { href: "/journey", label: t("home.primary.journey", lang) },
    { href: "/read", label: t("nav.read", lang) },
    { href: "/chat", label: t("nav.chat", lang) },
    { href: "/feed", label: t("nav.feed", lang) },
    { href: "/cases", label: t("nav.cases", lang) },
  ];

  return (
    <section className="nz-hero -mt-14 min-h-svh" aria-label={t("brand.title", lang)}>
      <div className="nz-poster" aria-hidden="true" />

      <div className="nz-content relative z-[2] mx-auto flex min-h-svh max-w-6xl flex-col px-5 pb-5 pt-[5.5rem] md:px-10 md:pb-7">
        {/* 公告细条：透明底金字，不与透明导航争空间 */}
        <p className="nz-announce">
          <span className="tag">{t("home.announce.tag", lang)}</span>
          <span className="truncate">{t("home.announce.text", lang)}</span>
        </p>

        <div className="nz-intro flex flex-1 items-center py-8">
          <div className="nz-copy">
            <p className="nz-kicker font-serif">
              {t("home.night.title", lang)}
            </p>
            <h1 className="nz-h1 font-serif font-black leading-[1.1] text-fg">
              {t("brand.short", lang)}
            </h1>
            <p className="nz-subtitle font-serif">
              {t("kiosk.brandSuffix", lang)}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 md:mt-10">
              <Link href="/chat" className="nz-btn">
                {t("home.primary.chat", lang)}
              </Link>
              <Link
                href="/journey"
                className="text-xs tracking-[0.26em] text-muted underline decoration-accent/40 underline-offset-8 transition hover:text-fg"
              >
                {t("home.hero.ctaJourney", lang)} →
              </Link>
            </div>
          </div>
        </div>

        {/* 金句面板：桌面固定宽度靠左，移动端占满。
            nz-quote 供 CSS 限高——各语言译文长度不同，不限制会把首屏撑高 */}
        <div className="nz-quote relative max-w-[22.5rem] md:max-w-[24rem]">{quotePanel}</div>

        {/* 底部入口行 */}
        <nav
          className="mt-5 flex flex-wrap items-center gap-y-2 border-t border-line pt-4 md:mt-6"
          aria-label={t("home.night.explore", lang)}
        >
          <span className="me-4 text-[0.6rem] tracking-[0.4em] text-faint">
            {t("home.night.explore", lang)}
          </span>
          {entries.map((e) => (
            <Link key={e.href} href={e.href} className="nz-e">
              {e.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";

// 首屏「夜游博物馆」主视觉：破晓底图（雕像居右约 1/3）+ 左侧衬线标题区 +
// 左下玻璃金句面板（内容按 children 传入，复用 page.tsx 的全部金句交互）+
// 底部金点分隔的入口行。-mt-14 让底图伸到透明导航下方。
export default function NightHero({
  lang,
  quotePanel,
}: {
  lang: Lang;
  quotePanel: ReactNode;
}) {
  const heroRef = useRef<HTMLElement>(null);

  // 高度吸附到整数像素：英雄区高度由内容行高决定、常落在小数像素，
  // 边缘的亚像素光栅化会在底边产生 1-2px 亮缝。四舍五入到整像素后
  // 底边与设备像素对齐，缝隙消失（视觉上 <1px 的高度变化不可感知）。
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const snap = () => {
      const h = el.getBoundingClientRect().height;
      if (Math.abs(h - Math.round(h)) > 0.01) el.style.height = `${Math.round(h)}px`;
    };
    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const entries = [
    { href: "/journey", label: t("home.primary.journey", lang) },
    { href: "/read", label: t("nav.read", lang) },
    { href: "/chat", label: t("nav.chat", lang) },
    { href: "/feed", label: t("nav.feed", lang) },
    { href: "/cases", label: t("nav.cases", lang) },
  ];

  return (
    <section ref={heroRef} className="nz-hero -mt-14 min-h-svh" aria-label={t("brand.title", lang)}>
      {/* 双时辰底图：暗=破晓夜雾，明=天亮晨光；由 .dark 切换显示（见 globals.css） */}
      <Image
        src="/home/hero-dawn.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="nz-img nz-img-dark"
      />
      <Image
        src="/home/hero-morning.webp"
        alt=""
        fill
        sizes="100vw"
        className="nz-img nz-img-light"
      />
      <div className="nz-scrim" aria-hidden="true" />

      <div className="relative z-[2] mx-auto flex min-h-svh max-w-6xl flex-col px-5 pb-5 pt-[5.5rem] md:px-10 md:pb-7">
        {/* 公告细条：透明底金字，不与透明导航争空间 */}
        <p className="nz-announce">
          <span className="tag">{t("home.announce.tag", lang)}</span>
          <span className="truncate">{t("home.announce.text", lang)}</span>
        </p>

        {/* 标题区：左侧垂直居中，右侧留白给雕像与晨光 */}
        <div className="flex flex-1 items-center py-8">
          <div className="max-w-xl">
            <p className="nz-kicker font-garamond text-[0.7rem] uppercase">
              {t("home.night.latin", lang)}
            </p>
            <h1 className="nz-h1 mt-4 font-serif text-[2.85rem] font-black leading-[1.14] tracking-[0.08em] text-fg md:mt-5 md:text-6xl">
              {t("home.night.title", lang)}
            </h1>
            <p className="mt-4 text-sm tracking-[0.28em] text-muted md:mt-5">
              {t("home.hero.title", lang)}
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

        {/* 金句面板：桌面固定宽度靠左，移动端占满 */}
        <div className="relative max-w-[22.5rem] md:max-w-[24rem]">{quotePanel}</div>

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

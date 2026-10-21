"use client";

import { useEffect, useRef, useState } from "react";
import { getFeed } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { track } from "@/lib/track";
import type { FeedItem } from "@/lib/types";

const AUTO_MS = 8000;

export default function KioskPage() {
  const [lang] = useLang();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [campus, setCampus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 从 query 读取校园（埋点 + 显示）
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const c = url.get("campus");
    setCampus(c);
    track("/kiosk", { device: "kiosk", source: "qr", campus: c || undefined });
    getFeed("en", 30).then(setItems).catch(() => {});
  }, []);

  // 自动轮播
  useEffect(() => {
    if (paused || items.length === 0) return;
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, AUTO_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, items.length]);

  // 控制栏自动隐藏
  const wake = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  };

  const goPrev = () => {
    setIdx((i) => (i - 1 + items.length) % items.length);
    wake();
  };
  const goNext = () => {
    setIdx((i) => (i + 1) % items.length);
    wake();
  };
  const togglePlay = () => {
    setPaused((p) => !p);
    wake();
  };

  const cur = items[idx];

  if (!cur)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-sm text-white/60">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#FAC775]" />
        {t("kiosk.loading", lang)}
      </div>
    );

  return (
    <div
      className="relative h-full w-full overflow-hidden cursor-pointer"
      onClick={wake}
    >
      {/* 氛围光斑 */}
      <div className="pointer-events-none absolute -right-20 -top-24 h-[60vh] w-[60vh] rounded-full bg-[#712B13] opacity-25 blur-[80px]" />
      <div className="pointer-events-none absolute -left-20 bottom-12 h-[40vh] w-[40vh] rounded-full bg-[#085041] opacity-30 blur-[80px]" />

      {/* 校园 / 平台标 */}
      <div className="absolute start-8 top-6 flex items-center gap-3">
        <span className="seal flex h-9 w-9 items-center justify-center rounded-md text-xl">孔</span>
        <div className="font-serif text-base">
          {campus ? `${campus} · ${t("kiosk.brandSuffix", lang)}` : t("kiosk.brand", lang)}
        </div>
      </div>

      <div className="absolute end-8 top-6 flex items-center gap-3 text-xs text-white/60">
        <span>{idx + 1} / {items.length}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          {paused ? t("kiosk.paused", lang) : t("kiosk.playing", lang)}
        </span>
      </div>

      {/* 主要内容 */}
      <div className="flex h-full flex-col items-center justify-center px-12">
        <p className="text-center font-serif text-[64px] leading-[1.5] tracking-[0.2em] text-[#F5F0E6]">
          {cur.original_text}
        </p>
        {cur.translation && (
          <p className="mt-10 max-w-[64ch] text-center font-serif text-lg italic leading-relaxed text-[#D3D1C7]">
            {cur.translation}
          </p>
        )}
        <span className="mt-10 inline-block rounded-full bg-white/10 px-5 py-2 text-sm text-[#F5F0E6]">
          {cur.ref_label}
        </span>
      </div>

      {/* 署名 + 标签 */}
      <div className="absolute bottom-8 start-8 end-8 flex items-end justify-between text-[#F5F0E6]">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BA7517] font-serif text-xs text-[#412402]">
              {cur.persona[0]}
            </span>
            {cur.persona}
          </div>
          <div className="text-xs text-[#FAC775]">{cur.tags.join("   ")}</div>
        </div>
        <div className="text-end text-xs text-white/50">
          {t("kiosk.footer", lang)}
        </div>
      </div>

      {/* 控制栏：上一张 / 播放暂停 / 下一张 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md transition-opacity duration-300 ${
          showControls || paused ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={goPrev}
          aria-label={t("kiosk.prev", lang)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 4.5L7.5 12l8 7.5V4.5z" />
          </svg>
        </button>
        <button
          onClick={togglePlay}
          aria-label={paused ? t("kiosk.play", lang) : t("kiosk.pause", lang)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#993C1D] text-white transition hover:bg-[#B34A24]"
        >
          {paused ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          )}
        </button>
        <button
          onClick={goNext}
          aria-label={t("kiosk.next", lang)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 4.5l8 7.5-8 7.5V4.5z" />
          </svg>
        </button>
      </div>

      {/* 进度条 */}
      <div className="absolute bottom-0 start-0 end-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-[#FAC775] transition-all"
          style={{ width: paused ? "100%" : `${((idx + 1) / items.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

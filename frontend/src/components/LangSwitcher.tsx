"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, t, useLang, type Lang } from "@/lib/i18n";

/**
 * 语言切换：按国际惯例做成「地球图标 + ISO 639-1 语言代码 + 下拉」。
 *
 * - 触发按钮只显示当前语种代码（ZH / EN / FR / ES / AR）与地球图标，
 *   收起态约 64px，不与主题按钮、登录入口争宽；
 * - 展开后列出各语言的**母语名**（中文 / English / Français / Español / العربية），
 *   右侧附 ISO 代码，母语名带 lang 属性以便读屏正确发音；
 * - 不使用国旗：国旗代表国家，不等于语言（同一语言多国、同一国家多语）。
 *
 * 无障碍：listbox 语义 + ↑↓ 移动 / Enter 选中 / Esc 关闭，焦点回到触发按钮；
 * 面板用逻辑属性 end-0 对齐，RTL（阿拉伯语）下自动从另一侧展开。
 */
export default function LangSwitcher() {
  const [lang, setLang] = useLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const label = t("nav.lang", lang);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const focusItem = (i: number) => {
    const n = LANGS.length;
    itemRefs.current[((i % n) + n) % n]?.focus();
  };

  const openAndFocus = (idx: number) => {
    setOpen(true);
    // 等面板挂载后再聚焦，否则 ref 还是 null
    requestAnimationFrame(() => focusItem(idx));
  };

  const pick = (code: Lang) => {
    setLang(code);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onBtnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAndFocus(Math.max(0, LANGS.findIndex((l) => l.code === lang)));
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const cur = itemRefs.current.findIndex((el) => el === document.activeElement);
      focusItem(e.key === "ArrowDown" ? cur + 1 : cur - 1);
      return;
    }
    // Home / End 直达首尾，长列表下省去连按
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      focusItem(e.key === "Home" ? 0 : LANGS.length - 1);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={current.native}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onBtnKeyDown}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        {/* 地球图标是语言切换的通用标识；不用国旗——国旗代表国家而非语言 */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9z" />
        </svg>
        <span aria-hidden="true" className="tracking-[0.08em]">
          {current.label}
        </span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        // 外层透明容器用 pt-1 覆盖按钮与面板的间隙：
        // 指针落在间隙上时仍在子树内，不会误触发外部点击关闭
        <div className="absolute top-full end-0 z-30 pt-1">
          <div
            role="listbox"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            className="nav-drop min-w-[168px] rounded-xl border border-line bg-surface p-1.5 shadow-lg"
          >
            {LANGS.map((l, i) => {
              const on = l.code === lang;
              return (
                <button
                  key={l.code}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(l.code as Lang)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${
                    on ? "bg-accent-soft text-accent" : "text-fg hover:bg-surface-2"
                  }`}
                >
                  {/* lang 属性让读屏按该语言发音，而不是用页面语言硬读 */}
                  <span lang={l.code} className="flex-1 whitespace-nowrap">
                    {l.native}
                  </span>
                  <span className="text-[10px] tracking-[0.08em] text-faint">{l.label}</span>
                  {on && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

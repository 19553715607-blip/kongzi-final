"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { isActive, isGroupActive, type NavGroup } from "@/lib/nav";

type Props = {
  group: NavGroup;
  path: string;
  lang: Lang;
  onNavigate?: () => void;
};

/**
 * 桌面一级下拉：hover 或 click 展开；点击外部 / Esc 关闭；
 * 键盘可达（Tab 聚焦、↑↓ 移动、Enter 选中、Esc 关闭）。
 * 方向用逻辑属性（start-/top-full），RTL 下自动从一侧展开。
 */
export default function NavDropdown({ group, path, lang, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const groupActive = isGroupActive(path, group);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const focusItem = (i: number) => {
    const el = itemRefs.current[i];
    if (el) el.focus();
  };

  const onBtnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const n = group.items.length;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cur = document.activeElement;
      const idx = itemRefs.current.findIndex((el) => el === cur);
      focusItem((idx + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cur = document.activeElement;
      const idx = itemRefs.current.findIndex((el) => el === cur);
      focusItem((idx - 1 + n) % n);
    }
  };

  const main = t(group.labelKey, lang);
  const tip =
    group.zhKey && lang !== "zh" ? t(group.zhKey, lang) || undefined : undefined;

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onBtnKeyDown}
        title={tip}
        className={`nav-primary-link gap-1 ${
          groupActive
            ? "is-active"
            : ""
        }`}
      >
        {main}
        <svg
          width="10"
          height="10"
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
        <div
          onKeyDown={onPanelKeyDown}
          className="nav-drop absolute top-full start-0 z-30 min-w-[208px] rounded-2xl border border-line bg-surface p-2 shadow-xl"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{main}</div>
          {group.items.map((it, i) => {
            const on = isActive(path, it.href);
            return (
              <Link
                key={it.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={it.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
                  on
                    ? "bg-accent-soft text-accent"
                    : "text-fg hover:bg-surface-2"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-accent" : "bg-line"}`}
                  aria-hidden="true"
                />
                {t(it.labelKey, lang)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

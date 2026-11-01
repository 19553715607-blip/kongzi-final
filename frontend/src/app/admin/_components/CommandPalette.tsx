"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadAdminUsersCsv } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/motion";
import { toast } from "@/components/Toast";

// ── 全局命令面板：⌘K / Ctrl+K 唤起，搜索跳转任意管理页 + 常用动作 ──
// 独立组件；ESC 关闭，方向键选择，Enter 执行；reduced-motion 下不做动画。

type CmdItem =
  | { kind: "page"; label: string; href: string; icon: string; hint?: string }
  | { kind: "action"; label: string; icon: string; run: () => void };

// 极简 16px 线性图标（stroke=currentColor），不引新依赖
const ICONS: Record<string, ReactNode> = {
  dash: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.8 13.5c.6-2.4 2.4-3.6 4.2-3.6s3.6 1.2 4.2 3.6" />
      <circle cx="12" cy="6" r="1.8" />
      <path d="M11.2 10.2c1.8.2 3 .6 3.6 2.3" />
    </svg>
  ),
  game: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 3.5h6a2.5 2.5 0 0 1 2.4 1.8l.9 3.2a2.6 2.6 0 0 1-4.3 2.6L9 9.5H7l-1 1.6a2.6 2.6 0 0 1-4.3-2.6l.9-3.2A2.5 2.5 0 0 1 5 3.5Z" />
      <path d="M6 6v2M5 7h2M10 6.5h.01M11.5 8h.01" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 1.5h5L12.5 5v9.5H4V1.5Z" />
      <path d="M9 1.5V5h3.5" />
      <path d="M6.5 8.5h4M6.5 11h4" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2a4 4 0 0 0-4 4c0 3-.8 4-.8 4h9.6s-.8-1-.8-4a4 4 0 0 0-4-4Z" />
      <path d="M6.5 13.5a1.6 1.6 0 0 0 3 0" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  ),
  build: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4.5 4.5l1.4 1.4M10.1 10.1l1.4 1.4M11.5 4.5l-1.4 1.4M5.9 10.1l-1.4 1.4" />
      <circle cx="8" cy="8" r="2.2" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2.5 12.5h11" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6 3.5H3.5v9h9V10M9.5 2.5H13.5V6.5M13.5 2.5L7 9" />
    </svg>
  ),
  trend: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 13.5V2M2 13.5h12" />
      <path d="M4 10l3-3 2.5 2L13 5" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2.5 3.5h11v8H6l-3.5 3v-3H2.5v-8Z" />
      <path d="M5.5 6.5h5M5.5 9h3" />
    </svg>
  ),
};

export default function CommandPalette() {
  const router = useRouter();
  const [lang] = useLang();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 触发：⌘K / Ctrl+K 唤起与切换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 打开时聚焦输入、重置查询
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const pages: CmdItem[] = useMemo(
    () => [
      { kind: "page", href: "/admin", label: t("admin.nav.dashboard", lang), icon: "dash", hint: "/" },
      { kind: "page", href: "/admin/users", label: t("admin.nav.users", lang), icon: "users" },
      { kind: "page", href: "/admin/audience", label: t("admin.nav.audience", lang), icon: "eye" },
      { kind: "page", href: "/admin/traffic", label: t("admin.nav.traffic", lang), icon: "trend" },
      { kind: "page", href: "/admin/games", label: t("admin.nav.games", lang), icon: "game" },
      { kind: "page", href: "/admin/content", label: t("admin.nav.content", lang), icon: "doc" },
      { kind: "page", href: "/admin/engagement", label: t("admin.nav.engagement", lang), icon: "bell" },
      { kind: "page", href: "/admin/comments", label: t("admin.nav.comments", lang), icon: "chat" },
      { kind: "page", href: "/admin/cases", label: t("admin.nav.review", lang), icon: "check" },
      { kind: "page", href: "/admin/institutions", label: t("admin.nav.institutions", lang), icon: "build" },
      { kind: "page", href: "/admin/settings", label: t("admin.nav.settings", lang), icon: "gear" },
    ],
    [lang],
  );

  const actions: CmdItem[] = useMemo(
    () => [
      {
        kind: "action",
        label: t("admin.dash.exportUsers", lang),
        icon: "download",
        run: async () => {
          try {
            await downloadAdminUsersCsv();
            toast(t("admin.common.saved", lang), "ok");
          } catch {
            toast(t("admin.common.failed", lang), "err");
          }
        },
      },
      { kind: "action", label: t("admin.dash.newContent", lang), icon: "doc", run: () => router.push("/admin/content") },
      { kind: "action", label: t("admin.dash.postAnnouncement", lang), icon: "bell", run: () => router.push("/admin/engagement") },
      { kind: "action", label: t("admin.cmds.backToSite", lang), icon: "external", run: () => router.push("/") },
    ],
    [lang, router],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const keep = (it: CmdItem) => !needle || it.label.toLowerCase().includes(needle);
    return { pages: pages.filter(keep), actions: actions.filter(keep) };
  }, [q, pages, actions]);

  const flat: CmdItem[] = useMemo(
    () => [...filtered.pages, ...filtered.actions],
    [filtered],
  );

  useEffect(() => setActive(0), [q]);

  const choose = (item: CmdItem) => {
    setOpen(false);
    if (item.kind === "page") router.push(item.href);
    else item.run();
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[active];
      if (item) choose(item);
    }
  };

  // 激活项滚动到可视区
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let idx = -1;
  const renderItem = (item: CmdItem, section: string) => {
    idx += 1;
    const i = idx;
    return (
      <button
        key={section + item.label + (item.kind === "page" ? item.href : "")}
        data-idx={i}
        className={`cmd-item ${i === active ? "is-active" : ""}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => choose(item)}
      >
        <span className="cmd-ico">{ICONS[item.icon]}</span>
        <span>{item.label}</span>
        <span className="cmd-tail">
          {item.kind === "page" ? t("admin.cmds.goto", lang) : t("admin.cmds.run", lang)}
        </span>
      </button>
    );
  };

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div
        className={`cmd-panel ${reduced ? "" : "cmd-anim"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("admin.nav.title", lang)}
      >
        <div className="cmd-input-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder={t("admin.cmds.placeholder", lang)}
            className="cmd-input"
          />
          <span className="cmd-kbd">⌘K</span>
        </div>
        <div className="cmd-list" ref={listRef}>
          {flat.length === 0 && (
            <div className="cmd-empty">{t("admin.cmds.empty", lang)}</div>
          )}
          {filtered.pages.length > 0 && (
            <>
              <div className="cmd-group">{t("admin.cmds.group.pages", lang)}</div>
              {filtered.pages.map((p) => renderItem(p, "p"))}
            </>
          )}
          {filtered.actions.length > 0 && (
            <>
              <div className="cmd-group">{t("admin.cmds.group.actions", lang)}</div>
              {filtered.actions.map((a) => renderItem(a, "a"))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

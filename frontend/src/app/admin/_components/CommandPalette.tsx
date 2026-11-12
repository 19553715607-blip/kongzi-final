"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadAdminUsersCsv } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/motion";
import { toast } from "@/components/Toast";
import Icon, { type IconName } from "@/components/ui/Icon";

// ── 全局命令面板：⌘K / Ctrl+K 唤起，搜索跳转任意管理页 + 常用动作 ──
// 独立组件；ESC 关闭，方向键选择，Enter 执行；reduced-motion 下不做动画。

type CmdItem =
  | { kind: "page"; label: string; href: string; icon: string; hint?: string }
  | { kind: "action"; label: string; icon: string; run: () => void };

// 图标取自全站唯一图标源（components/ui/Icon），与侧边栏同一套线条
const ICONS: Record<string, IconName> = {
  dash: "dashboard",
  users: "users",
  game: "game",
  doc: "doc",
  bell: "bell",
  check: "review",
  build: "institution",
  gear: "settings",
  eye: "eye",
  download: "download",
  external: "external",
  trend: "trend",
  chat: "chat",
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
        <span className="cmd-ico"><Icon name={ICONS[item.icon]} size={16} /></span>
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
          <Icon name="search" size={16} />
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

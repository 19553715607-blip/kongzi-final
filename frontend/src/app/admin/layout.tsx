"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api";
import { LANGS, t, useLang, type Lang } from "@/lib/i18n";
import type { AuthUser } from "@/lib/types";
import { AnnouncementBar } from "@/components/museum";
import CommandPalette from "./_components/CommandPalette";

// ── 导航分组：概览 / 管理 / 内容 / 系统 ──
type NavItem = { href: string; key: string; icon: string; exact?: boolean };
type NavGroup = { key: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    key: "admin.sb.group.overview",
    items: [{ href: "/admin", key: "admin.nav.dashboard", icon: "dash", exact: true }],
  },
  {
    key: "admin.sb.group.manage",
    items: [
      { href: "/admin/users", key: "admin.nav.users", icon: "users" },
      { href: "/admin/audience", key: "admin.nav.audience", icon: "eye" },
      { href: "/admin/traffic", key: "admin.nav.traffic", icon: "trend" },
      { href: "/admin/games", key: "admin.nav.games", icon: "game" },
      { href: "/admin/cases", key: "admin.nav.review", icon: "check" },
      { href: "/admin/institutions", key: "admin.nav.institutions", icon: "build" },
    ],
  },
  {
    key: "admin.sb.group.content",
    items: [
      { href: "/admin/content", key: "admin.nav.content", icon: "doc" },
      { href: "/admin/engagement", key: "admin.nav.engagement", icon: "bell" },
      { href: "/admin/comments", key: "admin.nav.comments", icon: "chat" },
    ],
  },
  {
    key: "admin.sb.group.system",
    items: [{ href: "/admin/settings", key: "admin.nav.settings", icon: "gear" }],
  },
];

// 与命令面板一致的 16px 线性图标
const NAV_ICONS: Record<string, ReactNode> = {
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

const SEGMENT_LABEL: Record<string, string> = {
  users: "admin.nav.users",
  audience: "admin.nav.audience",
  traffic: "admin.nav.traffic",
  comments: "admin.nav.comments",
  games: "admin.nav.games",
  content: "admin.nav.content",
  engagement: "admin.nav.engagement",
  cases: "admin.nav.review",
  institutions: "admin.nav.institutions",
  settings: "admin.nav.settings",
};

const COLLAPSE_KEY = "admin:sidebar:collapsed";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useLang();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 读取折叠状态
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    getMe()
      .then((u) => alive && setMe(u))
      .catch(() => alive && setMe(null))
      .finally(() => alive && setBooting(false));
    return () => {
      alive = false;
    };
  }, []);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // 面包屑：由路径段推导，逐级可点击回退
  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // ["admin","users"]
    const out: { href: string; label: string; here: boolean }[] = [
      { href: "/admin", label: t("admin.nav.title", lang), here: parts.length <= 1 },
    ];
    let acc = "";
    parts.forEach((seg, i) => {
      if (seg === "admin") return;
      acc += "/" + seg;
      const key = SEGMENT_LABEL[seg];
      out.push({
        href: acc,
        label: key ? t(key, lang) : seg,
        here: i === parts.length - 1,
      });
    });
    return out;
  }, [pathname, lang]);

  // 用 fixed 全屏容器盖住根布局的公共导航与底部 Tab（沿用 kiosk 方案），
  // 这样 /admin 拥有独立外壳，且不改动根布局/Nav。
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-bg text-fg">
      <CommandPalette />
      {booting ? (
        <div className="p-8 text-sm text-muted">{t("admin.guard.loading", lang)}</div>
      ) : !me || me.is_guest ? (
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="seal flex h-12 w-12 items-center justify-center rounded-lg text-xl">孔</div>
          <div className="font-serif text-lg text-fg">{t("admin.guard.needLogin", lang)}</div>
          <Link
            href="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
          >
            {t("admin.guard.loginLink", lang)}
          </Link>
        </div>
      ) : !me.is_admin ? (
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="font-serif text-lg text-fg">{t("admin.guard.needAdmin", lang)}</div>
          <p className="text-xs text-muted">{t("admin.guard.needAdminDesc", lang)}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted"
          >
            {t("admin.nav.back", lang)}
          </button>
        </div>
      ) : (
        <div className="flex min-h-full flex-col">
          {/* 顶栏 */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
            <span className="seal flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base">孔</span>
            <span className="hidden font-serif text-sm font-medium text-fg sm:block">
              {t("admin.nav.title", lang)}
            </span>

            {/* 面包屑 */}
            <nav className="crumb ms-2 hidden md:flex" aria-label="breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.href + i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="crumb-sep">/</span>}
                  {c.here ? (
                    <span className="crumb-here">{c.label}</span>
                  ) : (
                    <Link href={c.href}>{c.label}</Link>
                  )}
                </span>
              ))}
            </nav>

            <div className="ms-auto flex items-center gap-2">
              {/* 命令面板唤起按钮（桌面端可见 ⌘K 提示） */}
              <button
                onClick={() => {
                  // 通过键盘事件模拟，便于鼠标触发
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }),
                  );
                }}
                className="pressable hidden items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 sm:flex"
                aria-label={t("admin.cmds.placeholder", lang)}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <span className="cmd-kbd">⌘K</span>
              </button>
              <select
                value={lang}
                onChange={(e) => setLangState(e.target.value as Lang)}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted"
                aria-label="language"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
              <Link
                href="/"
                className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-surface-2"
              >
                {t("admin.nav.back", lang)}
              </Link>
            </div>
          </header>

          {/* 系统公告位（Met 墨底朱砂标识，可选） */}
          <AnnouncementBar tag={t("admin.announcement.tag", lang)}>
            {t("admin.announcement.bar", lang)}
          </AnnouncementBar>

          {/* 移动端：横向滚动导航 */}
          <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden">
            {GROUPS.flatMap((g) => g.items).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition ${
                  isActive(n.href, n.exact)
                    ? "bg-accent text-white"
                    : "border border-line text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {t(n.key, lang)}
              </Link>
            ))}
          </nav>

          <div className="admin-shell">
            {/* 桌面端可折叠侧边栏 */}
            <aside
              className={`admin-aside hidden md:flex ${collapsed ? "sb-collapsed" : ""}`}
              aria-label="admin sidebar"
            >
              <div className="sb-scroll">
                {GROUPS.map((g) => (
                  <div key={g.key} className="sb-group">
                    <div className="sb-group-label">
                      <span className="sb-group-text">{t(g.key, lang)}</span>
                    </div>
                    {g.items.map((n) => (
                      <Link
                        key={n.href}
                        href={n.href}
                        title={collapsed ? t(n.key, lang) : undefined}
                        className={`sb-link ${isActive(n.href, n.exact) ? "is-active" : ""}`}
                      >
                        <span className="sb-ico">{NAV_ICONS[n.icon]}</span>
                        <span className="sb-text">{t(n.key, lang)}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="sb-foot">
                {me.email && <div className="sb-email">{me.email}</div>}
                <button
                  onClick={toggleCollapsed}
                  className="sb-collapse-btn pressable"
                  aria-label={collapsed ? t("admin.sb.expand", lang) : t("admin.sb.collapse", lang)}
                >
                  <span className="sb-ico">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {collapsed ? (
                        <path d="M6 3l5 5-5 5" />
                      ) : (
                        <path d="M10 3l-5 5 5 5" />
                      )}
                    </svg>
                  </span>
                  <span className="sb-text">
                    {collapsed ? t("admin.sb.expand", lang) : t("admin.sb.collapse", lang)}
                  </span>
                </button>
              </div>
            </aside>

            <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      )}
    </div>
  );
}

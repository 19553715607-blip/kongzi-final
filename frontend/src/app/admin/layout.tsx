"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api";
import { LANGS, t, useLang, type Lang } from "@/lib/i18n";
import type { AuthUser } from "@/lib/types";
import { AnnouncementBar } from "@/components/museum";
import BrandGlyph from "@/components/BrandGlyph";
import Icon, { type IconName } from "@/components/ui/Icon";
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

// 与命令面板共用同一套图标源（components/ui/Icon），不再维护第二套 16px/1.4 图标
const NAV_ICONS: Record<string, IconName> = {
  dash: "dashboard",
  users: "users",
  game: "game",
  doc: "doc",
  bell: "bell",
  check: "review",
  build: "institution",
  gear: "settings",
  eye: "eye",
  trend: "trend",
  chat: "chat",
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
    // 根路径时品牌名即标题, 面包屑留空避免与顶栏品牌文本重复
    if (parts.length <= 1) return [];
    const out: { href: string; label: string; here: boolean }[] = [
      { href: "/admin", label: t("admin.nav.title", lang), here: false },
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
          <div className="seal flex h-12 w-12 items-center justify-center rounded-lg text-xl">
            <BrandGlyph />
          </div>
          <div className="font-serif text-lg text-fg">{t("admin.guard.needLogin", lang)}</div>
          <Link
            href="/login"
            className="btn btn-primary"
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
            className="btn btn-outline"
          >
            {t("admin.nav.back", lang)}
          </button>
        </div>
      ) : (
        <div className="flex min-h-full flex-col">
          {/* 顶栏 */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
            <span className="seal flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base">
              <BrandGlyph />
            </span>
            <span className="hidden min-w-0 truncate font-serif text-sm font-medium text-fg sm:block">
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
              <span className="hidden sm:block">
                <button
                  onClick={() => {
                    // 通过键盘事件模拟，便于鼠标触发
                    window.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }),
                    );
                  }}
                  className="btn btn-outline btn-sm"
                  aria-label={t("admin.cmds.placeholder", lang)}
                >
                  <Icon name="search" size={14} />
                  <span className="cmd-kbd">⌘K</span>
                </button>
              </span>
              {/* 语言下拉式切换器 */}
              <select
                value={lang}
                onChange={(e) => setLangState(e.target.value as Lang)}
                className="max-w-[130px] shrink-0 cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted"
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
                className="btn btn-outline btn-sm shrink-0"
              >
                <Icon name="arrowLeft" size={13} className="sm:hidden" />
                <span className="hidden sm:inline">{t("admin.nav.back", lang)}</span>
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
                className={`chip ${isActive(n.href, n.exact) ? "chip-accent" : ""}`}
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
                        <span className="sb-ico"><Icon name={NAV_ICONS[n.icon]} size={16} /></span>
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
                    <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} />
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

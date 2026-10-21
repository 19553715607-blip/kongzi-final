"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LangSwitcher from "./LangSwitcher";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import NavDropdown from "./NavDropdown";
import { t, useLang } from "@/lib/i18n";
import { areaOf, isActive, mobileTabs, navGroups } from "@/lib/nav";

// 移动端底部 tab 的图标。href 与 lib/nav.ts 的 mobileTabs() 对应；
// 新增 tab 时在这里补图标，缺省回落为圆点。
const TAB_ICONS: Record<string, string> = {
  "/": "M3 11l9-8 9 8M5 10v10h14V10",
  "/journey": "M12 2a10 10 0 100 20 10 10 0 000-20zM16.2 7.8l-2.4 6-6 2.4 2.4-6 6-2.4z",
  "/paths": "M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 7h8M8 11h6",
  "/me": "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
};
const TAB_ICON_FALLBACK = "M12 8a4 4 0 100 8 4 4 0 000-8z";

export default function Nav() {
  const path = usePathname();
  const [lang] = useLang();
  const [drawer, setDrawer] = useState(false);

  // 桌面下拉 / 移动抽屉 / 页脚 / 面包屑共用同一份分组，改归属只改 lib/nav.ts
  const groups = navGroups();
  const tabs = mobileTabs();

  // 路由切换时收起抽屉
  useEffect(() => {
    setDrawer(false);
  }, [path]);

  // Esc 关闭抽屉
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="seal flex h-8 w-8 items-center justify-center rounded-md text-lg">
              孔
            </span>
            <span className="font-serif text-base font-medium text-fg">
              <span className="hidden sm:inline">{t("brand.title", lang)}</span>
              <span className="sm:hidden">{t("brand.short", lang)}</span>
            </span>
          </Link>

          {/* 桌面：首页 + 3 个一级下拉 */}
          <nav className="ms-auto hidden items-center gap-1 md:flex" aria-label="primary">
            <Link
              href="/"
              aria-current={isActive(path, "/") ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                isActive(path, "/")
                  ? "text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {t("nav.home", lang)}
            </Link>
            {groups.map((g) => (
              <NavDropdown key={g.area} group={g} path={path} lang={lang} />
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <LangSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 移动端底部 tab：首页 / 探索 / 学习 / 我 + 更多 */}
      <nav
        className="fixed bottom-0 start-0 end-0 z-20 flex h-14 border-t border-line bg-bg/95 backdrop-blur md:hidden"
        aria-label="mobile"
      >
        {tabs.map((l) => {
          // 栏目 tab 按 area 高亮（/graph、/feed 同属探索，进入时「探索」tab 也亮）；
          // 首页与「我」按精确路径高亮。
          const on = l.area ? areaOf(path) === l.area : isActive(path, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
                on ? "text-accent" : "text-faint"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={TAB_ICONS[l.href] ?? TAB_ICON_FALLBACK} />
              </svg>
              {t(l.labelKey, lang)}
            </Link>
          );
        })}
        {/* 更多 / 菜单 */}
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label={t("nav.menu", lang)}
          aria-expanded={drawer}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
            drawer ? "text-accent" : "text-faint"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t("nav.menu", lang)}
        </button>
      </nav>

      {/* 移动端全屏抽屉：按一级栏目分组列出全部入口，与桌面下拉同源 */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t("nav.menu", lang)}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="nav-drop absolute bottom-0 start-0 end-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-serif text-sm text-fg">{t("nav.menu", lang)}</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label={t("nav.close", lang)}
                className="rounded-full p-1 text-muted hover:bg-surface-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {groups.map((g) => (
              <div key={g.area} className="mb-4">
                <div className="mb-1.5 px-1 text-[11px] uppercase tracking-wider text-faint">
                  {t(g.labelKey, lang)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`rounded-lg border border-line px-3 py-2.5 text-sm ${
                        isActive(path, it.href)
                          ? "border-accent/40 bg-accent-soft text-accent"
                          : "bg-surface text-fg"
                      }`}
                    >
                      {t(it.labelKey, lang)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* 系统页：个人中心与登录，不占一级栏目，避免与头像菜单重复 */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              <Link
                href="/me"
                className={`rounded-lg border border-line px-3 py-2.5 text-sm ${
                  isActive(path, "/me")
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "bg-surface text-fg"
                }`}
              >
                {t("nav.me", lang)}
              </Link>
              <Link
                href="/login"
                className={`rounded-lg border border-line px-3 py-2.5 text-sm ${
                  isActive(path, "/login")
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "bg-surface text-fg"
                }`}
              >
                {t("user.login", lang)}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

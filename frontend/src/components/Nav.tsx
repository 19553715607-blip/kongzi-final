"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LangSwitcher from "./LangSwitcher";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import NavDropdown from "./NavDropdown";
import Icon, { type IconName } from "./ui/Icon";
import { t, useLang } from "@/lib/i18n";
import { areaOf, isActive, mobileTabs, navGroups } from "@/lib/nav";

// 移动端底部 tab 的图标，与 lib/nav.ts 的 mobileTabs() 对应；
// 新增 tab 时在这里补图标，缺省回落为圆点。
const TAB_ICONS: Record<string, IconName> = {
  "/": "home",
  "/journey": "compass",
  "/paths": "book",
  "/me": "user",
};

export default function Nav({ ghost = false }: { ghost?: boolean }) {
  const path = usePathname();
  const [lang] = useLang();
  const [drawer, setDrawer] = useState(false);
  // 首页透明导航：页面顶部压在 Hero 底图上，滚过一屏的 24px 后恢复实底
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    if (!ghost) return;
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ghost]);

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
      <header
        className={`site-header sticky top-0 z-20 border-b border-line transition-colors ${
          ghost && !solid ? "nav-ghost" : ""
        }`}
      >
        <div className={`mx-auto flex h-14 items-center gap-3 px-4 md:px-6 ${ghost ? "max-w-6xl" : "max-w-4xl"}`}>
          <Link href="/" className="flex items-center gap-2" aria-label={t("brand.title", lang)}>
            <span className="seal-brand" aria-hidden="true" />
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

          <div className="ms-auto flex min-w-0 items-center gap-1.5 sm:gap-2 md:ms-0">
            <LangSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 移动端底部 tab：首页 / 探索 / 学习 / 我 + 更多 */}
      <nav
        className="site-tabbar fixed bottom-0 start-0 end-0 z-20 flex border-t border-line backdrop-blur md:hidden"
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
              <Icon name={TAB_ICONS[l.href] ?? "compass"} size={20} />
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
          <Icon name="grid" size={20} />
          {t("nav.menu", lang)}
        </button>
      </nav>

      {/* 移动端全屏抽屉：按一级栏目分组列出全部入口，与桌面下拉同源 */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("nav.menu", lang)}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="nav-drop absolute bottom-0 start-0 end-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(2rem+var(--safe-b,0px))]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-serif text-sm text-fg">{t("nav.menu", lang)}</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label={t("nav.close", lang)}
                className="btn btn-quiet btn-icon"
              >
                <Icon name="close" size={20} />
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
                className={`whitespace-nowrap rounded-lg border border-line px-3 py-2.5 text-sm ${
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

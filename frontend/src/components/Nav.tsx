"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import LangSwitcher from "./LangSwitcher";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import NavDropdown from "./NavDropdown";
import { t, useLang } from "@/lib/i18n";
import { EXTRA_LINKS, NAV_GROUPS, isActive, isGroupActive } from "@/lib/nav";

const MOBILE_TABS = [
  { href: "/", labelKey: "nav.home", icon: "M3 11l9-8 9 8M5 10v10h14V10", groupKey: undefined },
  { href: "/paths", labelKey: "nav.learn", icon: "M12 3v18M3 12h18", groupKey: "nav.learn" },
  { href: "/graph", labelKey: "nav.graph", icon: "M5 6a2 2 0 100-1 2 2 0 000 1zM19 18a2 2 0 100-1 2 2 0 000 1zM7 7l10 10", groupKey: undefined },
  { href: "/me", labelKey: "nav.me", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0", groupKey: undefined },
] as const;

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const [lang] = useLang();
  const [drawer, setDrawer] = useState(false);
  const drawerId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasCurrentMobileTab = MOBILE_TABS.some((tab) => tab.groupKey
    ? NAV_GROUPS.some((group) => group.labelKey === tab.groupKey && isGroupActive(path, group))
    : isActive(path, tab.href));

  useEffect(() => setDrawer(false), [path]);

  useEffect(() => {
    if (!drawer) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawer(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [drawer]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/90 shadow-[0_1px_8px_rgba(20,20,20,0.035)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 lg:gap-5">
          <Link href="/" aria-label={t("brand.title", lang)} className="group flex shrink-0 items-center gap-2.5 rounded-lg">
            <span className="seal flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform group-hover:-rotate-3">孔</span>
            <span className="font-serif text-base font-medium tracking-wide text-fg">
              <span className="hidden sm:inline">{t("brand.title", lang)}</span>
              <span className="sm:hidden">{t("brand.short", lang)}</span>
            </span>
          </Link>

          <nav className="ms-auto hidden items-center gap-1 lg:flex" aria-label={t("nav.primary", lang)}>
            <Link
              href="/"
              aria-current={isActive(path, "/") ? "page" : undefined}
              className={`nav-primary-link ${isActive(path, "/") ? "is-active" : ""}`}
            >
              {t("nav.home", lang)}
            </Link>
            {NAV_GROUPS.map((group) => (
              <NavDropdown key={group.labelKey} group={group} path={path} lang={lang} />
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-1.5 md:ms-2 lg:gap-2">
            <div className="hidden sm:block"><LangSwitcher /></div>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <nav className="mobile-tabbar fixed bottom-0 start-0 end-0 z-20 grid h-[4.25rem] grid-cols-5 border-t border-line/90 bg-bg/95 backdrop-blur-xl lg:hidden" aria-label={t("nav.mobile", lang)}>
        {MOBILE_TABS.map((tab) => {
          const active = tab.groupKey
            ? NAV_GROUPS.some((group) => group.labelKey === tab.groupKey && isGroupActive(path, group))
            : isActive(path, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? (tab.groupKey ? "location" : "page") : undefined}
              className={`mobile-tab ${active ? "is-active" : ""}`}
            >
              <Icon path={tab.icon} />
              <span>{t(tab.labelKey, lang)}</span>
            </Link>
          );
        })}
        <button
          id={`${drawerId}-trigger`}
          type="button"
          onClick={() => setDrawer(true)}
          aria-label={t("nav.menu", lang)}
          aria-expanded={drawer}
          aria-controls={drawerId}
          className={`mobile-tab ${drawer || (!hasCurrentMobileTab && path !== "/") ? "is-active" : ""}`}
        >
          <Icon path="M4 6h16M4 12h16M4 18h16" />
          <span>{t("nav.menu", lang)}</span>
        </button>
      </nav>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("nav.close", lang)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/45 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <section
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${drawerId}-title`}
            className="nav-drawer nav-drop absolute bottom-0 start-0 end-0 max-h-[86dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id={`${drawerId}-title`} className="font-serif text-lg text-fg">{t("nav.menu", lang)}</h2>
                <p className="mt-0.5 text-xs text-muted">{t("nav.menuHint", lang)}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setDrawer(false)}
                aria-label={t("nav.close", lang)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              <Link href="/" onClick={() => setDrawer(false)} aria-current={isActive(path, "/") ? "page" : undefined} className={`nav-drawer-link ${isActive(path, "/") ? "is-active" : ""}`}>
                <Icon path="M3 11l9-8 9 8M5 10v10h14V10" className="h-[18px] w-[18px]" />{t("nav.home", lang)}
              </Link>
              <Link href="/me" onClick={() => setDrawer(false)} aria-current={isActive(path, "/me") ? "page" : undefined} className={`nav-drawer-link ${isActive(path, "/me") ? "is-active" : ""}`}>
                <Icon path="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" className="h-[18px] w-[18px]" />{t("user.center", lang)}
              </Link>
            </div>

            {NAV_GROUPS.map((group) => (
              <section key={group.labelKey} className="mb-5" aria-labelledby={`${drawerId}-${group.labelKey}`}>
                <h3 id={`${drawerId}-${group.labelKey}`} className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                  <span className="h-px w-3 bg-accent/60" aria-hidden="true" />{t(group.labelKey, lang)}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const active = isActive(path, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawer(false)}
                        aria-current={active ? "page" : undefined}
                        className={`nav-drawer-link ${active ? "is-active" : ""}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{t(item.labelKey, lang)}</span>
                        <svg aria-hidden="true" className="shrink-0 opacity-45" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="border-t border-line pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">{t("nav.preferences", lang)}</span>
                <div className="flex items-center gap-2"><LangSwitcher compact /><ThemeToggle /></div>
              </div>
              {EXTRA_LINKS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawer(false)} className="nav-drawer-account-link">
                  {t(item.labelKey, lang)}<span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

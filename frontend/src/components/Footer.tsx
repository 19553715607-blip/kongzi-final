"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, useLang } from "@/lib/i18n";
import { FOOTER_GROUPS, isActive } from "@/lib/nav";

/** 页脚站点地图：分组列出全部用户端页面，移动端网格自适应。 */
export default function Footer() {
  const [lang] = useLang();
  const path = usePathname();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <nav aria-label={t("footer.siteMap", lang)} className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {FOOTER_GROUPS.map((g) => (
            <div key={g.labelKey}>
              <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
                {t(g.labelKey, lang)}
              </div>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={isActive(path, l.href) ? "page" : undefined}
                      className={`inline-flex min-h-8 items-center whitespace-nowrap text-sm transition hover:text-accent focus-visible:rounded-sm ${isActive(path, l.href) ? "font-medium text-accent" : "text-muted"}`}
                    >
                      {t(l.labelKey, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="ornament-rule mt-10 pt-6 text-center text-xs text-faint">
          <span className="font-serif">{t("brand.title", lang)}</span>
          <span className="hidden sm:inline">· {t("footer.tagline", lang)}</span>
        </div>
      </div>
    </footer>
  );
}

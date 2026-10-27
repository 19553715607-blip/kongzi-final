"use client";

import Link from "next/link";
import { t, useLang } from "@/lib/i18n";
import { footerGroups } from "@/lib/nav";

/** 页脚站点地图：与桌面下拉同源同分组，完整列出全部用户端页面，保证无孤儿页。 */
export default function Footer() {
  const [lang] = useLang();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <nav aria-label="sitemap" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {footerGroups().map((g) => (
            <div key={g.area}>
              <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
                {t(g.labelKey, lang)}
              </div>
              <ul className="space-y-2">
                {g.items.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition hover:text-accent"
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
          <span className="mx-2 text-line">|</span>
          <Link href="/privacy" className="underline underline-offset-4 transition hover:text-accent">
            {t("privacy.title", lang)}
          </Link>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, useLang } from "@/lib/i18n";
import { EXTRA_LINKS, NAV_GROUPS, isActive } from "@/lib/nav";

/**
 * 统一面包屑：首页 / 一级 / 二级。admin 下不显示（admin 自带面包屑）。
 * 首页不显示。
 */
export default function Breadcrumb() {
  const path = usePathname();
  const [lang] = useLang();

  if (path === "/" || path.startsWith("/admin")) return null;

  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (isActive(path, it.href)) {
        return (
          <nav aria-label={t("nav.breadcrumb", lang)} className="crumb mb-4">
            <Link href="/">{t("breadcrumb.home", lang)}</Link>
            <span className="crumb-sep" aria-hidden="true">/</span>
            <span className="text-muted">{t(g.labelKey, lang)}</span>
            <span className="crumb-sep" aria-hidden="true">/</span>
            <span className="crumb-here" aria-current="page">{t(it.labelKey, lang)}</span>
          </nav>
        );
      }
    }
  }

  const extra = EXTRA_LINKS.find((l) => isActive(path, l.href));
  if (extra) {
    return (
      <nav aria-label={t("nav.breadcrumb", lang)} className="crumb mb-4">
        <Link href="/">{t("breadcrumb.home", lang)}</Link>
        <span className="crumb-sep" aria-hidden="true">/</span>
        <span className="crumb-here" aria-current="page">{t(extra.labelKey, lang)}</span>
      </nav>
    );
  }

  return null;
}

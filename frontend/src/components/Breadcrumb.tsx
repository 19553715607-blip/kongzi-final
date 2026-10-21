"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, useLang } from "@/lib/i18n";
import { breadcrumbOf } from "@/lib/nav";

/**
 * 统一面包屑：首页 / 一级栏目 / 当前页。
 * 层级与归属全部由 lib/nav.ts 的 SITE_MAP 派生，因此 /journey/li、/cases/1
 * 这类深层路由也会正确归到「探索 / 君子路」「探索 / 案例」，不再退化为两级。
 * 首页、系统页（登录 / 个人中心）、/admin 下不显示。
 */
export default function Breadcrumb() {
  const path = usePathname();
  const [lang] = useLang();

  if (path === "/" || path.startsWith("/admin")) return null;

  const crumb = breadcrumbOf(path);
  if (!crumb) return null;

  return (
    <nav aria-label="breadcrumb" className="crumb mb-4">
      <Link href="/">{t("breadcrumb.home", lang)}</Link>
      <span className="crumb-sep" aria-hidden="true">/</span>
      <span className="text-muted">{t(crumb.areaLabelKey, lang)}</span>
      <span className="crumb-sep" aria-hidden="true">/</span>
      <span className="crumb-here">{t(crumb.pageLabelKey, lang)}</span>
    </nav>
  );
}

// 全站导航单一真相源（Single Source of Truth）。
//
// 规则：每个用户端页面在 SITE_MAP 里登记且仅登记一次，`area` 决定它属于哪个一级栏目。
// 桌面一级下拉、移动端抽屉、页脚站点地图、面包屑、移动端底部 tab 全部由此派生，
// 因此「同一个页面在不同入口归属不同分组」在结构上不再可能发生。
// 新增页面只改这张表；改归属也只改这张表，四个入口自动同步。
//
// 校验：`node scripts/check-ia.mjs`（无孤儿页 / 无重复归属 / 每栏目 ≤6 项 / 点击深度 ≤3）。

export type Area = "explore" | "learn" | "about";

export type PageDef = {
  href: string;
  labelKey: string;
  area: Area;
  /** 作为移动端底部 tab 的落地页（每个 area 至多一个） */
  tab?: boolean;
};

export type NavItem = { href: string; labelKey: string };
export type NavGroup = { area: Area; labelKey: string; items: NavItem[] };

/** 一级栏目。labelKey 同时用于桌面下拉标题、抽屉分组标题、页脚列标题。 */
export const AREAS: { id: Area; labelKey: string }[] = [
  { id: "explore", labelKey: "nav.explore" },
  { id: "learn", labelKey: "nav.learn" },
  { id: "about", labelKey: "nav.about" },
];

/**
 * 全部用户端页面。数组顺序即栏目内展示顺序。
 * 归属依据「用户意图」而非「功能类型」，三个栏目互斥：
 *   explore 探索 —— 无目标漫游，看到什么算什么
 *   learn   学习 —— 有明确目标，按路径推进
 *   about   关于 —— 站点信息、共建与长尾工具
 */
export const SITE_MAP: PageDef[] = [
  // 探索
  { href: "/graph", labelKey: "nav.graph", area: "explore" },
  { href: "/journey", labelKey: "nav.journey", area: "explore", tab: true },
  { href: "/feed", labelKey: "nav.feed", area: "explore" },
  { href: "/cases", labelKey: "nav.cases", area: "explore" },

  // 学习
  { href: "/paths", labelKey: "nav.paths", area: "learn", tab: true },
  { href: "/read", labelKey: "nav.read", area: "learn" },
  { href: "/chat", labelKey: "nav.chat", area: "learn" },
  { href: "/terms", labelKey: "nav.terms", area: "learn" },
  { href: "/quiz", labelKey: "nav.quiz", area: "learn" },

  // 关于
  { href: "/developers", labelKey: "nav.developers", area: "about" },
  { href: "/teach", labelKey: "nav.teach", area: "about" },
  { href: "/co-create", labelKey: "nav.cocreate", area: "about" },
  { href: "/plugins", labelKey: "nav.plugins", area: "about" },
  { href: "/reach", labelKey: "nav.reach", area: "about" },
  { href: "/kiosk", labelKey: "nav.kiosk", area: "about" },
];

/**
 * 不进导航的系统页。登录页由未登录态入口承载，个人中心由右上角头像菜单
 * 与移动端底部 tab 承载 —— 若同时进下拉会造成重复入口。
 */
export const SYSTEM_ROUTES: string[] = ["/login", "/me", "/api-diag"];

export function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

/**
 * 路由 → 页面定义。先精确匹配，再按最长前缀匹配，
 * 使 /journey/shu/write 归到 /journey、/cases/1 归到 /cases。
 */
export function pageOf(path: string): PageDef | undefined {
  const exact = SITE_MAP.find((p) => p.href === path);
  if (exact) return exact;
  return SITE_MAP.filter((p) => path.startsWith(p.href + "/")).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

export function areaOf(path: string): Area | undefined {
  return pageOf(path)?.area;
}

/** 一级栏目分组：桌面下拉与移动抽屉共用。 */
export function navGroups(): NavGroup[] {
  return AREAS.map((a) => ({
    area: a.id,
    labelKey: a.labelKey,
    items: SITE_MAP.filter((p) => p.area === a.id).map((p) => ({
      href: p.href,
      labelKey: p.labelKey,
    })),
  }));
}

/** 页脚站点地图：与下拉同源同分组，只是完整展示，保证无孤儿页。 */
export function footerGroups(): NavGroup[] {
  return navGroups();
}

/** 面包屑：首页 / 一级栏目 / 当前页。系统页与首页返回 undefined（不显示）。 */
export function breadcrumbOf(
  path: string,
): { areaLabelKey: string; pageLabelKey: string } | undefined {
  if (path === "/") return undefined;
  if (SYSTEM_ROUTES.some((r) => isActive(path, r))) return undefined;
  const page = pageOf(path);
  if (!page) return undefined;
  const area = AREAS.find((a) => a.id === page.area);
  if (!area) return undefined;
  return { areaLabelKey: area.labelKey, pageLabelKey: page.labelKey };
}

/** 移动端底部 tab：首页 + 各栏目落地页 + 我的（「更多」按钮由 Nav 追加）。 */
export function mobileTabs(): { href: string; labelKey: string; area?: Area }[] {
  const areaTabs = AREAS.map((a) => {
    const page = SITE_MAP.find((p) => p.area === a.id && p.tab);
    return page ? { href: page.href, labelKey: a.labelKey, area: a.id } : null;
  }).filter((x): x is { href: string; labelKey: string; area: Area } => x !== null);

  return [
    { href: "/", labelKey: "nav.home" },
    ...areaTabs,
    { href: "/me", labelKey: "nav.me" },
  ];
}

/** 当前页所属的一级栏目（用于桌面下拉高亮）。 */
export function activeGroup(path: string): NavGroup | undefined {
  const area = areaOf(path);
  return area ? navGroups().find((g) => g.area === area) : undefined;
}

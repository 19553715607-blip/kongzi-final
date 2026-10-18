// 全站导航单一数据源：桌面下拉 / 移动抽屉 / 页脚站点地图 / 面包屑共用。
// 路由路径不变，仅调整归属与层级。
export type NavItem = { href: string; labelKey: string };
export type NavGroup = { labelKey: string; zhKey?: string; items: NavItem[] };
export type FlatLink = { href: string; labelKey: string };

// 桌面导航分成“探索、学习、参与”三类，所有公开页面均从这里进入。
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.explore",
    zhKey: "nav.zh.explore",
    items: [
      { href: "/graph", labelKey: "nav.graph" },
      { href: "/journey", labelKey: "nav.journey" },
      { href: "/feed", labelKey: "nav.feed" },
      { href: "/cases", labelKey: "nav.cases" },
    ],
  },
  {
    labelKey: "nav.learn",
    zhKey: "nav.zh.learn",
    items: [
      { href: "/paths", labelKey: "nav.paths" },
      { href: "/read", labelKey: "nav.read" },
      { href: "/chat", labelKey: "nav.chat" },
      { href: "/quiz", labelKey: "nav.quiz" },
      { href: "/terms", labelKey: "nav.terms" },
    ],
  },
  {
    labelKey: "nav.participate",
    zhKey: "nav.zh.participate",
    items: [
      { href: "/developers", labelKey: "nav.developers" },
      { href: "/teach", labelKey: "nav.teach" },
      { href: "/co-create", labelKey: "nav.cocreate" },
      { href: "/plugins", labelKey: "nav.plugins" },
      { href: "/reach", labelKey: "nav.reach" },
      { href: "/kiosk", labelKey: "nav.kiosk" },
    ],
  },
];

// 账户入口单独呈现，不混进内容分类。
export const EXTRA_LINKS: FlatLink[] = [
  { href: "/login", labelKey: "user.login" },
];

// 页脚站点地图分组
export const FOOTER_GROUPS: { labelKey: string; links: FlatLink[] }[] = [
  { labelKey: "footer.explore", links: [
    { href: "/graph", labelKey: "nav.graph" },
    { href: "/journey", labelKey: "nav.journey" },
    { href: "/feed", labelKey: "nav.feed" },
    { href: "/cases", labelKey: "nav.cases" },
  ]},
  { labelKey: "footer.learn", links: [
    { href: "/paths", labelKey: "nav.paths" },
    { href: "/read", labelKey: "nav.read" },
    { href: "/quiz", labelKey: "nav.quiz" },
    { href: "/terms", labelKey: "nav.terms" },
    { href: "/chat", labelKey: "nav.chat" },
  ]},
  { labelKey: "nav.participate", links: [
    { href: "/developers", labelKey: "nav.developers" },
    { href: "/teach", labelKey: "nav.teach" },
    { href: "/co-create", labelKey: "nav.cocreate" },
    { href: "/plugins", labelKey: "nav.plugins" },
    { href: "/reach", labelKey: "nav.reach" },
    { href: "/kiosk", labelKey: "nav.kiosk" },
  ]},
];

export function isGroupActive(path: string, group: NavGroup): boolean {
  return group.items.some((item) => isActive(path, item.href));
}

export function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export function activeGroup(path: string): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.items.some((it) => isActive(path, it.href)));
}

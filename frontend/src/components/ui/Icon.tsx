import type { ReactNode, SVGProps } from "react";

/**
 * 全站唯一图标源：24 网格、1.75 描边、圆头圆角，颜色随 currentColor。
 * 新增图标只在这里加，避免各页再手写 <svg> 造成线条粗细与网格漂移。
 */
export type IconName =
  | "home" | "compass" | "book" | "user" | "grid"
  | "globe" | "sun" | "moon"
  | "chevronDown" | "chevronLeft" | "chevronRight" | "arrowUp" | "arrowLeft" | "arrowRight"
  | "check" | "close" | "search" | "plus" | "minus"
  | "heart" | "message" | "share" | "image" | "bookmark"
  | "eye" | "trend" | "game" | "doc" | "bell" | "chat" | "review" | "institution" | "settings" | "dashboard" | "users"
  | "refresh" | "alert" | "play" | "pause" | "stop" | "download" | "copy" | "external" | "logout" | "trash" | "edit" | "filter" | "spark" | "lock"
  | "quote" | "shuffle" | "volume" | "network"
  | "music" | "target" | "wheel" | "calculator";

const GLYPHS: Record<IconName, ReactNode> = {
  // ── 导航 ──
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16.2 7.8l-2.4 6-6 2.4 2.4-6 6-2.4z" />
    </>
  ),
  book: (
    <>
      <path d="M5 4a2 2 0 012-2h12v18H7a2 2 0 01-2-2V4z" />
      <path d="M9 7h8M9 11h6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),

  // ── 头部控件 ──
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,

  // ── 方向 ──
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
  arrowLeft: <path d="M19 12H5M12 5l-7 7 7 7" />,
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,

  // ── 通用动作 ──
  check: <path d="M20 6L9 17l-5-5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 11-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l9.5 17H2.5L12 3z" />
      <path d="M12 9.5v4.5M12 17.2h.01" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" />,
  pause: (
    <>
      <rect x="6.8" y="5" width="3.8" height="14" rx="1.3" />
      <rect x="13.4" y="5" width="3.8" height="14" rx="1.3" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  quote: (
    <>
      <path d="M9.5 7H6a2 2 0 00-2 2v3.5a2 2 0 002 2h1.8c0 2-.9 3.1-2.8 4" />
      <path d="M19.5 7H16a2 2 0 00-2 2v3.5a2 2 0 002 2h1.8c0 2-.9 3.1-2.8 4" />
    </>
  ),
  shuffle: <path d="M17 3l4 4-4 4M3 11V9a4 4 0 014-4h14M7 21l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />,
  network: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="5" cy="18" r="2.4" />
      <circle cx="19" cy="18" r="2.4" />
      <path d="M10.7 7.2l-4.4 8.6M13.3 7.2l4.4 8.6M7.4 18h9.2" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
    </>
  ),
  download: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
  logout: <path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10" />,
  trash: (
    <>
      <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11a2.1 2.1 0 00-3-3L5 17l-1 3z" />
      <path d="M14 6l3 3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />,
  spark: <path d="M12 3l2.2 5.3L20 10.5l-5.8 2.2L12 18l-2.2-5.3L4 10.5l5.8-2.2L12 3z" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </>
  ),

  // ── 六艺 ──
  music: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v6M12 14.6v6M3.5 12h6M14.6 12h6" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7.5h7" />
      <path d="M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
    </>
  ),

  // ── 内容互动 ──
  heart: <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 019 6.5c1.4 0 2.4.7 3 1.7.6-1 1.6-1.7 3-1.7a4.2 4.2 0 014 4.2C19 15.6 12 20 12 20z" />,
  message: <path d="M21 15a1 1 0 01-1 1H8l-5 4V6a1 1 0 011-1h16a1 1 0 011 1z" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M4 17l5-5 3.5 3.5L16 12l4 4" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4.5L6 21V3z" />,

  // ── 后台栏目 ──
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.5c.9-3.4 3.4-5 6.2-5s5.3 1.6 6.2 5" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M16.6 14.3c2.3.3 4 1.1 4.7 3.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trend: (
    <>
      <path d="M3 20V4M3 20h18" />
      <path d="M6 15l4.5-4.5 3.5 3L21 7" />
    </>
  ),
  game: (
    <>
      <path d="M7.5 5h9a3.7 3.7 0 013.6 2.7l1.3 4.8a3.9 3.9 0 01-6.4 3.9L13.5 14h-3l-1.5 2.4a3.9 3.9 0 01-6.4-3.9l1.3-4.8A3.7 3.7 0 017.5 5z" />
      <path d="M9 9v3M7.5 10.5h3M15 9.6h.01M17.4 12h.01" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h7l5 5v13H6V3z" />
      <path d="M13 3v5h5" />
      <path d="M9 13h6M9 16.5h6" />
    </>
  ),
  bell: (
    <>
      <path d="M12 3a6 6 0 00-6 6c0 4.4-1.2 6-1.2 6h14.4S18 13.4 18 9a6 6 0 00-6-6z" />
      <path d="M10 20a2.4 2.4 0 004 0" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a1 1 0 01-1 1H8l-5 4V6a1 1 0 011-1h16a1 1 0 011 1z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  review: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M7.5 12l3 3 6-7" />
    </>
  ),
  institution: (
    <>
      <path d="M12 3l9 6H3l9-6z" />
      <path d="M5.5 9v9M10 9v9M14 9v9M18.5 9v9" />
      <path d="M3 21h18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1" />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, "name" | "width" | "height" | "viewBox" | "strokeWidth">;

export default function Icon({ name, size = 16, className = "", strokeWidth = 1.75, ...rest }: Props) {
  return (
    <svg
      {...rest}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`.trim()}
    >
      {GLYPHS[name]}
    </svg>
  );
}

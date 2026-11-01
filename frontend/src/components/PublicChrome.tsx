"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";
import Breadcrumb from "./Breadcrumb";
import Footer from "./Footer";
import ScrollTopButton from "./ScrollTopButton";
import StorageNotice from "./StorageNotice";

/**
 * 公共外壳：仅在非管理端路由渲染用户端导航 / 面包屑 / 页脚 / 回顶按钮，
 * 并把页面内容约束在 max-w-4xl 主区。
 * /admin 下管理端拥有独立全屏外壳（见 app/admin/layout.tsx），
 * 这里直接原样渲染 children，避免任何公共导航/页脚遮挡管理界面。
 */
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  if (path?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // 课堂模式 /kiosk：纯净全屏，不渲染导航 / 面包屑 / 页脚 / 回顶
  const isKiosk = path?.startsWith("/kiosk");

  // 首页：夜游博物馆全出血外壳。.kz-night 作用域内局部覆盖语义 token，
  // 导航/页脚/复用组件自动换暗色金调；导航在页面顶部时透明压在 Hero 上。
  // 内容不再约束 max-w-4xl，由页面自分节控制宽度。
  if (path === "/") {
    return (
      <div className="kz-night flex min-h-screen flex-col pb-14 md:pb-0">
        <Nav ghost />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScrollTopButton />
        <StorageNotice />
      </div>
    );
  }

  return (
    <>
      {!isKiosk && <Nav />}
      <main className={isKiosk ? "" : "mx-auto max-w-4xl px-4 py-6 pb-20 md:pb-6"}>
        {!isKiosk && <Breadcrumb />}
        {children}
      </main>
      {!isKiosk && <Footer />}
      {!isKiosk && <ScrollTopButton />}
      {!isKiosk && <StorageNotice />}
    </>
  );
}

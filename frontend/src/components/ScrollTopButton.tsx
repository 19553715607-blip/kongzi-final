"use client";

import { useEffect, useState } from "react";

// 回到顶部悬浮按钮：滚动超过一屏后出现，点击平滑回顶。
export default function ScrollTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="back to top"
      className="fixed bottom-20 end-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90 text-muted shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:text-accent md:bottom-8 md:end-6"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

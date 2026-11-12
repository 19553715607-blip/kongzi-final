"use client";

import { useEffect, useState } from "react";
import Icon from "./ui/Icon";

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
      className="btn btn-outline btn-lg btn-icon fixed bottom-20 end-4 z-40 bg-surface/90 backdrop-blur md:bottom-8 md:end-6"
    >
      <Icon name="arrowUp" size={18} />
    </button>
  );
}

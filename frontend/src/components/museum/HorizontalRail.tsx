"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * 横向滑轨（可拖拽/横滑，scroll-snap），替代部分功能罗列。
 *
 * 两侧渐隐：只在「还有内容没露出来」的一侧显示。
 * 否则桌面端一屏装不下 4 张卡时，用户根本看不出右边还能滑。
 */
export function HorizontalRail({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdge({
        left: el.scrollLeft > 4,
        right: max > 4 && el.scrollLeft < max - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={railRef} className={`h-rail ${className}`}>
        {children}
      </div>
      <span aria-hidden="true" className={`rail-fade rail-fade-l${edge.left ? " is-on" : ""}`} />
      <span aria-hidden="true" className={`rail-fade rail-fade-r${edge.right ? " is-on" : ""}`} />
    </div>
  );
}

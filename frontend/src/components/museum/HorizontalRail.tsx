"use client";

import { ReactNode } from "react";

/** 横向滑轨（可拖拽/横滑，scroll-snap），替代部分功能罗列。 */
export function HorizontalRail({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`h-rail ${className}`}>{children}</div>;
}

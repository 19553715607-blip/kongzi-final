"use client";

import { ReactNode } from "react";

/** 顶部公告条（Met 风格，墨底 + 朱砂新展标识）。 */
export function AnnouncementBar({
  tag,
  children,
  className = "",
}: {
  tag?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`announcement-bar ${className}`}>
      {tag && <span className="ab-tag">{tag}</span>}
      <span>{children}</span>
    </div>
  );
}

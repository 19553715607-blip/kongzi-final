"use client";

import { ReactNode } from "react";

/** 图注即溯源：内容下固定一行元数据（出处/版本/编号/年代/作者/公有领域）。
 *  items: [{ label, value, pd?: boolean（公有领域高亮） }]
 */
export function ProvenanceCaption({
  items,
  className = "",
}: {
  items: { label: string; value: string; pd?: boolean }[];
  className?: string;
}) {
  return (
    <div className={`provenance ${className}`}>
      {items.map((it, i) => (
        <span key={i} className="pv-item">
          <span className="pv-label">{it.label}</span>
          <span className={`pv-value ${it.pd ? "pd" : ""}`}>{it.value}</span>
        </span>
      ))}
    </div>
  );
}

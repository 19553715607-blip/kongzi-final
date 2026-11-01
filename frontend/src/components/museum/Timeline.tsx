"use client";

import { useState } from "react";

/** 时间轴：节点即事件，可点击展开。
 *  events: [{ year, label, detail? }]，位置按 index 均分（也可传 percent）。
 */
export function Timeline({
  events,
  onSelect,
  className = "",
}: {
  events: { year: string; label: string; detail?: string; percent?: number }[];
  onSelect?: (i: number) => void;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const n = events.length;
  return (
    <div className={`timeline ${className}`}>
      <div className="tl-track">
        {events.map((ev, i) => {
          const left = ev.percent != null ? ev.percent : n <= 1 ? 50 : (i / (n - 1)) * 100;
          return (
            <span
              key={i}
              className="tl-node"
              style={{ left: `${left}%` }}
              onClick={() => {
                setActive(active === i ? null : i);
                onSelect?.(i);
              }}
              aria-label={ev.label}
            />
          );
        })}
      </div>
      <div className="tl-labels">
        {events.map((ev, i) => (
          <span key={i} onClick={() => setActive(active === i ? null : i)}>
            {ev.year} {ev.label}
          </span>
        ))}
      </div>
      {active != null && events[active]?.detail && (
        <div className="mt-3 text-xs leading-relaxed text-muted p-3 border border-line rounded-md bg-surface-2">
          {events[active].detail}
        </div>
      )}
    </div>
  );
}

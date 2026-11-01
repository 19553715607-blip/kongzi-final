"use client";

import { ReactNode } from "react";

/** 六艺路径节点（已通/当前呼吸/未解锁三态）。
 *  nodes: [{ label, state: 'done'|'cur'|'lock', href?, onClick? }]
 */
export function GamePath({
  nodes,
  className = "",
}: {
  nodes: { label: ReactNode; state: "done" | "cur" | "lock"; href?: string; onClick?: () => void }[];
  className?: string;
}) {
  return (
    <div className={`game-path ${className}`}>
      {nodes.map((nd, i) => (
        <span key={i} style={{ display: "contents" }}>
          {nd.href ? (
            <a href={nd.href} className={`gp-node node-${nd.state}`} onClick={nd.onClick}>
              {nd.label}
            </a>
          ) : (
            <button type="button" className={`gp-node node-${nd.state}`} onClick={nd.onClick} disabled={nd.state === "lock"}>
              {nd.label}
            </button>
          )}
          {i < nodes.length - 1 && (
            <span className={`gp-link ${nodes[i].state === "done" ? "link-done" : ""}`} />
          )}
        </span>
      ))}
    </div>
  );
}

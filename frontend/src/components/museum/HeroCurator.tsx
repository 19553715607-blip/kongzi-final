"use client";

import { ReactNode } from "react";

/** 策展主视觉（全出血，文字压图，chrome 近乎隐形）。
 *  bg: 图片/SVG/渐变节点；kicker/title/desc/cta 文字压底。
 */
export function HeroCurator({
  bg,
  kicker,
  title,
  desc,
  cta,
  className = "",
}: {
  bg: ReactNode;
  kicker?: string;
  title: ReactNode;
  desc?: ReactNode;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hero-curator ${className}`}>
      <div className="hc-bg">{bg}</div>
      <div className="hc-scrim" />
      <div className="hc-content">
        {kicker && <div className="hc-kicker">{kicker}</div>}
        <h1>{title}</h1>
        {desc && <p className="hc-desc">{desc}</p>}
        {cta && <div>{cta}</div>}
      </div>
    </section>
  );
}

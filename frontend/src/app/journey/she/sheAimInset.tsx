"use client";

/** 射 · 观德 — 放大靶 inset（SVG 覆盖层）
 *
 * 右上角圆形放大靶，解决 30m 靶在 3D 场景中太小的问题：
 *   - 实时准星（红 = 正常，橙 = 过满手抖）
 *   - 外圈力度环：理想力度 75% 处有金色刻度区，入区变绿、过满变橙
 *   - 靶缘红色虚线圈 = 上靶/脱靶边界（靶面单位 1）
 *   - 已中箭点 + 落点涟漪
 *
 * 准星/力度/涟漪经 rAF 直读 GameRefs（不走 React 渲染）；箭点用 React state。
 */

import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import type { GameRefs, StuckArrow } from "./sheScene";

const C = 60; // 圆心
const S = 46; // 靶面单位 1 → 46px
const GOLD = "#d9a521";
const RED = "#c03a2b";
const OVER = "#d98a17";

const RINGS: { r: number; color: string }[] = [
  { r: 0.8, color: "#26241f" },
  { r: 0.6, color: "#3f6f9e" },
  { r: 0.45, color: "#b23a2c" },
  { r: 0.28, color: GOLD },
  { r: 0.1, color: "#26241f" },
];

export default function AimInset({
  g,
  stuck,
  over,
}: {
  g: GameRefs;
  stuck: StuckArrow[];
  over: boolean;
}) {
  const crossRef = useRef<SVGGElement>(null);
  const rippleRef = useRef<SVGCircleElement>(null);
  const powerRef = useRef<SVGCircleElement>(null);
  const [lang] = useLang();

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      // 准星
      const el = crossRef.current;
      if (el) {
        const show = g.phase === "draw" && !!g.cross;
        el.style.display = show ? "" : "none";
        if (show && g.cross) {
          el.setAttribute("transform", `translate(${C + g.cross.x * S},${C + g.cross.y * S})`);
        }
      }
      // 力度环
      const pw = powerRef.current;
      if (pw) {
        const show = g.phase === "draw";
        pw.style.display = show ? "" : "none";
        if (show) {
          pw.setAttribute("stroke-dasharray", `${g.power * 100} 100`);
          pw.setAttribute(
            "stroke",
            g.over ? OVER : g.power >= 0.68 && g.power <= 0.84 ? "#3f6f4e" : "#6b5136",
          );
        }
      }
      // 涟漪
      const rp = rippleRef.current;
      if (rp) {
        if (!g.ripple) {
          rp.style.display = "none";
        } else {
          const k = (performance.now() - g.ripple.t0) / 600;
          if (k >= 1) {
            rp.style.display = "none";
          } else {
            rp.style.display = "";
            rp.setAttribute("cx", `${C + g.ripple.x * S}`);
            rp.setAttribute("cy", `${C + g.ripple.y * S}`);
            rp.setAttribute("r", `${3 + k * 15}`);
            rp.setAttribute("opacity", `${0.7 * (1 - k)}`);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g]);

  return (
    <div
      data-testid="aim-inset"
      className="pointer-events-none absolute right-3 top-3 flex flex-col items-center"
    >
      <svg viewBox="0 0 120 120" className="h-[132px] w-[132px] drop-shadow-md sm:h-[150px] sm:w-[150px]">
        {/* 底 */}
        <circle cx={C} cy={C} r={56} fill="#f6f1df" opacity={0.94} stroke="#8a6a44" strokeWidth={1} />
        {/* 环（外→内） */}
        {RINGS.map((ring, i) => (
          <circle key={i} cx={C} cy={C} r={ring.r * S} fill={ring.color} />
        ))}
        {/* 脱靶边界（靶面单位 1） */}
        <circle
          cx={C} cy={C} r={S} fill="none"
          stroke={RED} strokeWidth={0.9} strokeDasharray="3 3" opacity={0.65}
        />
        {/* 已中箭点 */}
        {stuck.map((a, i) => (
          <circle
            key={i}
            cx={C + a.x * S}
            cy={C + a.y * S}
            r={2.4}
            fill="#f6f1df"
            stroke="#26241f"
            strokeWidth={1.4}
          />
        ))}
        {/* 落点涟漪 */}
        <circle ref={rippleRef} style={{ display: "none" }} fill="none" stroke={RED} strokeWidth={1.6} />
        {/* 准星 */}
        <g ref={crossRef} style={{ display: "none" }}>
          <circle r={6} fill="none" stroke={over ? OVER : RED} strokeWidth={1.6} />
          <circle r={1.3} fill={over ? OVER : RED} />
          <line x1={-9} y1={0} x2={-6.5} y2={0} stroke={over ? OVER : RED} strokeWidth={1.4} />
          <line x1={6.5} y1={0} x2={9} y2={0} stroke={over ? OVER : RED} strokeWidth={1.4} />
          <line x1={0} y1={-9} x2={0} y2={-6.5} stroke={over ? OVER : RED} strokeWidth={1.4} />
          <line x1={0} y1={6.5} x2={0} y2={9} stroke={over ? OVER : RED} strokeWidth={1.4} />
        </g>
        {/* 力度环：轨道 + 理想区刻度 + 当前力度 */}
        <g transform={`rotate(-90 ${C} ${C})`}>
          <circle cx={C} cy={C} r={53} fill="none" stroke="#3c3428" strokeOpacity={0.18} strokeWidth={2.6} pathLength={100} />
          {/* 理想力度区 68%–84%（POWER_IDEAL=0.75 前后） */}
          <circle
            cx={C} cy={C} r={53} fill="none"
            stroke={GOLD} strokeWidth={2.6} strokeOpacity={0.85}
            pathLength={100} strokeDasharray="16 100" strokeDashoffset={-68}
          />
          <circle
            ref={powerRef}
            cx={C} cy={C} r={53} fill="none"
            stroke="#6b5136" strokeWidth={2.6} strokeLinecap="round"
            pathLength={100} strokeDasharray="0 100"
            style={{ display: "none" }}
          />
        </g>
      </svg>
      <div className="mt-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] text-white backdrop-blur">
        {gt("放大靶 · 金区松手最稳", lang)}
      </div>
    </div>
  );
}

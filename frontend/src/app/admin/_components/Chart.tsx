"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion";

/** 监听 <html> 的 dark 类，供图表配色随主题切换。 */
export function useDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** 统一配色：与站点主色保持一致。 */
export const ADMIN_PALETTE = [
  "#8C5A2B",
  "#0F6E56",
  "#1E5F8E",
  "#854F0B",
  "#534AB7",
  "#B23A48",
  "#3E7C59",
  "#9A6B2F",
];

/** 取一套随主题变化的文本/轴线颜色。 */
export function chartTextColors(dark: boolean) {
  return {
    text: dark ? "#ECE6DA" : "#2C2C2A",
    muted: dark ? "#9C9486" : "#888780",
    line: dark ? "rgba(255,255,255,0.12)" : "#E5E0D6",
    split: dark ? "rgba(255,255,255,0.08)" : "#F0ECE3",
  };
}

/**
 * 自包含 ECharts 容器：挂载时 init，option/dark 变化时重绘，卸载时 dispose。
 * 与 graph 页同一模式，StrictMode 安全。
 * 自带柔和进场动画（animationDuration/animationEasing）；prefers-reduced-motion 下关闭。
 */
export default function Chart({
  option,
  height = 320,
  animate = true,
  animationDuration = 900,
  animationEasing = "cubicOut",
}: {
  option: echarts.EChartsOption;
  height?: number;
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    const chart = echarts.init(el);
    const merged = {
      ...option,
      ...(animate && !reduced
        ? { animation: true as const, animationDuration, animationEasing }
        : { animation: false as const }),
    } as echarts.EChartsOption;
    chart.setOption(merged);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [option, reduced, animate, animationDuration, animationEasing]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}

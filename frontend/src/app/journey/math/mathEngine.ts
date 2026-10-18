/** 数艺·量仓分赈 — 薄逻辑引擎
 *
 * 只负责：allocations 状态（浮点存储）、出粮/回粮钳制、占比计算。
 * 由 mathScene 的 useFrame 按 dt 推进；React 不随每帧渲染。
 */

import type { MathScenarioBrief } from "@/lib/types";

export interface MathEngineState {
  scenario: MathScenarioBrief;
  /** 各对象已分量（浮点，展示时取整） */
  allocations: Record<string, number>;
  /** 当前选中村（items 下标） */
  selected: number;
  /** 本帧是否实际在流动（驱动粒子/音效） */
  flowing: "pour" | "scoop" | null;
}

export function createEngine(scenario: MathScenarioBrief): MathEngineState {
  const allocations: Record<string, number> = {};
  for (const it of scenario.items) allocations[it.name] = 0;
  return { scenario, allocations, selected: 0, flowing: null };
}

/** 已分总量 */
export function allocatedSum(st: MathEngineState): number {
  let s = 0;
  for (const it of st.scenario.items) s += st.allocations[it.name] ?? 0;
  return s;
}

/** 仓内剩余（总量超分时为 0，不出现负） */
export function remaining(st: MathEngineState): number {
  return Math.max(0, st.scenario.total - allocatedSum(st));
}

/** 倾倒速率：total × 0.06 / 秒 */
export function pourRate(st: MathEngineState): number {
  return st.scenario.total * 0.06;
}

/** 出粮：仓 → 选中村。不能使剩余 < 0。返回实际流动量。 */
export function pourStep(st: MathEngineState, dt: number): number {
  const it = st.scenario.items[st.selected];
  if (!it) return 0;
  const amt = Math.min(pourRate(st) * dt, remaining(st));
  if (amt <= 0) return 0;
  st.allocations[it.name] = (st.allocations[it.name] ?? 0) + amt;
  return amt;
}

/** 回粮：选中村 → 仓。不能使该村 < 0。返回实际流动量。 */
export function scoopStep(st: MathEngineState, dt: number): number {
  const it = st.scenario.items[st.selected];
  if (!it) return 0;
  const cur = st.allocations[it.name] ?? 0;
  const amt = Math.min(pourRate(st) * dt, cur);
  if (amt <= 0) return 0;
  st.allocations[it.name] = cur - amt;
  return amt;
}

/** 切换目标村（环回）。返回新下标。 */
export function selectDelta(st: MathEngineState, dir: number): number {
  const n = st.scenario.items.length;
  st.selected = ((st.selected + dir) % n + n) % n;
  return st.selected;
}

/** 某村占总量的比例（0..1，可能略超 1 的边界由钳制保证不出现） */
export function shareOf(st: MathEngineState, name: string): number {
  const t = st.scenario.total;
  return t > 0 ? (st.allocations[name] ?? 0) / t : 0;
}

/** 调试钩子用：直接设某村分量（钳 0..剩余+自身） */
export function setAlloc(st: MathEngineState, name: string, v: number): void {
  if (!(name in st.allocations)) return;
  const others = allocatedSum(st) - (st.allocations[name] ?? 0);
  const cap = Math.max(0, st.scenario.total - others);
  st.allocations[name] = Math.max(0, Math.min(cap, v));
}

/** 提交用：四舍五入到两位小数的完整 allocations */
export function finalizeAllocations(st: MathEngineState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of st.scenario.items) {
    out[it.name] = Math.round((st.allocations[it.name] ?? 0) * 100) / 100;
  }
  return out;
}

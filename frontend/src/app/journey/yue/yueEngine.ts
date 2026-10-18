/** 乐艺·编钟合鸣 — 薄逻辑引擎
 *
 * 只负责：sequence 状态（宫商角徵羽 + 休止）、击钟/休止/撤销、
 * 五音分布计算、五音相生判定（场景提示用）、长度校验。
 * 动画/音频触发由 YueGame 统一走 performStrike，引擎不做表现。
 */

import type { YueNote, YueScenarioBrief } from "@/lib/types";

export type YueToken = YueNote | "rest";

export const NOTES: YueNote[] = ["gong", "shang", "jue", "zhi", "yu"];
export const NOTE_LABEL: Record<YueToken, string> = {
  gong: "宫", shang: "商", jue: "角", zhi: "徵", yu: "羽", rest: "休",
};

/** 五音相生序：宫→徵→商→羽→角→宫 */
export const SHENG_NEXT: Record<YueNote, YueNote> = {
  gong: "zhi", zhi: "shang", shang: "yu", yu: "jue", jue: "gong",
};

/** 相邻两音的相生关系（rest 不参与，由调用方跳过） */
export type ShengRel = "sheng" | "same" | "skip" | "reverse";
export function shengRelation(a: YueNote, b: YueNote): ShengRel {
  if (a === b) return "same";
  if (SHENG_NEXT[a] === b) return "sheng"; // 顺生 +1
  if (SHENG_NEXT[SHENG_NEXT[a]] === b) return "skip"; // 隔一 +0.5
  return "reverse"; // 逆跳 -0.3
}

export interface YueEngineState {
  scenario: YueScenarioBrief;
  sequence: YueToken[];
}

export const TARGET_LEN = 8;  // 建议长度
export const MAX_LEN = 16;    // 游戏内上限（API 允许 32）
export const MIN_LEN = 4;     // 提交下限

export function createEngine(scenario: YueScenarioBrief): YueEngineState {
  return { scenario, sequence: [] };
}

export function realCount(st: YueEngineState): number {
  return st.sequence.filter((t) => t !== "rest").length;
}

/** 击钟：追加一枚真实音。返回是否成功（超上限则否）。 */
export function strike(st: YueEngineState, note: YueNote): boolean {
  if (st.sequence.length >= MAX_LEN) return false;
  st.sequence.push(note);
  return true;
}

/** 休止符。 */
export function pushRest(st: YueEngineState): boolean {
  if (st.sequence.length >= MAX_LEN) return false;
  st.sequence.push("rest");
  return true;
}

/** 撤销上一音（含休止）。返回被撤销的 token。 */
export function undo(st: YueEngineState): YueToken | null {
  return st.sequence.pop() ?? null;
}

/** 截断到第 i 枚之前（乐章谱点撤销：去掉 i 及其后）。 */
export function truncate(st: YueEngineState, i: number): void {
  st.sequence.length = Math.max(0, Math.min(i, st.sequence.length));
}

/** 第 i 枚之前最近一枚真实音（相生提示用；无则 null） */
export function prevRealNote(st: YueEngineState, beforeIdx: number): YueNote | null {
  for (let i = Math.min(beforeIdx, st.sequence.length) - 1; i >= 0; i--) {
    const t = st.sequence[i];
    if (t !== "rest") return t;
  }
  return null;
}

/** 五音分布（rest 不计入），键固定五音齐全 */
export function distribution(st: YueEngineState): Record<YueNote, number> {
  const dist: Record<YueNote, number> = { gong: 0, shang: 0, jue: 0, zhi: 0, yu: 0 };
  const n = realCount(st);
  if (n === 0) return dist;
  for (const t of st.sequence) if (t !== "rest") dist[t] += 1 / n;
  return dist;
}

/** 提交校验：长度 4..MAX 且真实音 ≥4 */
export function canSubmit(st: YueEngineState): boolean {
  return st.sequence.length >= MIN_LEN && realCount(st) >= MIN_LEN;
}

/** 提交用 token 数组（拷贝） */
export function finalizeSequence(st: YueEngineState): YueToken[] {
  return [...st.sequence];
}

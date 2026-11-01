/** 射 · 观德 — 瞄准/物理模型（纯函数，无渲染依赖）
 *
 * 一键操作的两个技巧维度：
 *   时机 — 准星随呼吸在靶面漂移，松开瞬间的横向位置决定水平精度
 *   力度 — 按住时长决定蓄力；不足则箭下坠，过满则手抖（不极不躁）
 *
 * 坐标约定：以靶心为原点、靶半径为 1 的「靶面单位」，y 向下为正。
 */

import { getLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";

export interface AimState {
  t: number; // 按住秒数
  power: number; // 0..1 蓄力
  swayX: number; // 准星横偏（靶面单位）
  swayY: number; // 准星纵偏
  amp: number; // 当前摆动幅度
  over: boolean; // 是否过满手抖
}

export interface Impact {
  x: number; // 落点横偏（靶面单位）
  y: number; // 落点纵偏（下为正）
  d: number; // 距靶心
  score: number; // 0-10 环
}

/** 理想力度：75%。「射不主皮，为力不同科」——不需要拉满 */
export const POWER_IDEAL = 0.75;
/** 拉满所需秒数 */
export const FULL_DRAW_S = 1.4;
/** 最佳窗口：0.8s 后摆动收敛，1.8s 后手抖渐起 */
const STEADY_FROM = 1.0;
const SHAKE_FROM = 1.8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 按住 t 秒后的瞄准状态。wind 为后端给定风速（-3..3 m/s），phaseSeed 让每次呼吸相位不同 */
export function aimAt(t: number, wind: number, phaseSeed: number): AimState {
  const power = clamp(t / FULL_DRAW_S, 0, 1);

  // 摆动包络：先收敛（呼吸沉稳）→ 最佳窗口 → 过满手抖
  let amp: number;
  if (t < STEADY_FROM) amp = 0.5 - 0.3 * (t / STEADY_FROM);
  else if (t < SHAKE_FROM) amp = 0.2;
  else amp = Math.min(0.85, 0.2 + (t - SHAKE_FROM) * 0.45);

  const breathe = Math.sin((2 * Math.PI * t) / 1.6 + phaseSeed);
  const gust = Math.sin((2 * Math.PI * t) / 3.7 + phaseSeed * 1.7);

  // 风把准星持续推向下风侧（看得见的风，不用心算），阵风再加缓慢扰动
  const swayX =
    amp * breathe * 0.9 +
    wind * 0.09 +
    gust * Math.min(0.12, Math.abs(wind) * 0.05);
  const swayY = amp * 0.38 * Math.sin((2 * Math.PI * t) / 2.3 + phaseSeed * 2.3);

  return { t, power, swayX, swayY, amp, over: t > SHAKE_FROM };
}

/** 松开瞬间结算落点与环数 */
export function computeImpact(aim: AimState, rand: () => number = Math.random): Impact {
  // 力度不足 → 箭下坠；略过理想 → 稍高（封顶）
  const drop = Math.max(-0.25, (POWER_IDEAL - aim.power) * 1.35);
  const x = aim.swayX + (rand() - 0.5) * 0.06;
  const y = aim.swayY + drop + (rand() - 0.5) * 0.06;
  const d = Math.hypot(x, y);
  const score = d <= 1 ? Math.max(1, Math.ceil(10 - d * 10)) : 0;
  return { x, y, d, score };
}

/** 环数对应的一句点评（结算卡/喊环用） */
export function scoreVerdict(score: number): string {
  if (score >= 10) return gt("正中黄心", getLang());
  if (score >= 9) return gt("九环 · 几近于道", getLang());
  if (score >= 7) return gt("七环 · 稳中求", getLang());
  if (score >= 4) return gt("四环 · 差之毫厘", getLang());
  if (score >= 1) return gt("上靶 · 继续调整", getLang());
  return gt("脱靶 · 反求诸己", getLang());
}

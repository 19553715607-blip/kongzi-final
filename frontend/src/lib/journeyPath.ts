/**
 * 君子之路 · 路径推导
 *
 * 全部是纯函数，不依赖后端 —— 路径所需的 unlocked / 品评都由 liuyi 分数推导，
 * 因此这一档改造无需后端配合。
 *
 * ⚠️ 关于分数语义
 * liuyi 的分数是「累计奖励」而非「掌握度」：每次达标 +8、上限 100
 * （backend/app/services/gamify.py 的 _award_art）。阈值偏低时路径推进会过快，
 * 调参集中在本文件的两个常量里，不要散落到组件内。
 *
 * ⚠️ 只有一套评级口径
 * 品评用项目既有的五档（神 / 妙 / 中 / 试 / 未起，阈值 80 / 60 / 40 / 20），
 * 与 BADGE_DEFS、i18n 的 jrn.grade.* 完全对齐。**不要**再引入星星等第二套刻度。
 */

/** 六艺顺序，与 backend/app/routers/journey.py 的 ARTS 保持一致 */
export const ART_ORDER = ["li", "yue", "she", "yu", "shu", "shu2"] as const;

/**
 * 解锁阈值：前序**全部**达到该分数，下一艺才解锁。
 *
 * 取 40 而非 30，有两个理由：
 *  1. 与 BADGE_DEFS 的 all_40（六艺通才 = 每艺 ≥ 40）以及品评「中」档同界；
 *  2. 分数是累计奖励（每次 +8），30 分只需约 4 次动作即达成，路径会推进过快。
 */
export const UNLOCK_THRESHOLD = 40;

/** 路径节点的 S 形横向偏移（px）。RTL 下由 CSS 取反，勿在此判断方向 */
export const TRAIL_OFFSETS = [-74, 0, 74, 0, -74, 0] as const;

/** 品评分档（从高到低）：[分数下限, i18n key] */
const GRADE_TIERS: readonly (readonly [number, string])[] = [
  [80, "jrn.grade.divine"],
  [60, "jrn.grade.excellent"],
  [40, "jrn.grade.good"],
  [20, "jrn.grade.basic"],
];

/** 品评等级的 i18n key（神 / 妙 / 中 / 试 / 未起） */
export function gradeKeyOf(score: number): string {
  for (const [min, key] of GRADE_TIERS) {
    if (score >= min) return key;
  }
  return "jrn.grade.none";
}

export type NodeState = "done" | "now" | "lock";

/**
 * 第 index 个节点是否已解锁。
 *
 * 规则取「前序全部达标」，与 backend 的 _title_for() 口径一致 ——
 * 否则同一页会出现两套标准。首个节点恒解锁。
 */
export function isUnlocked(scores: number[], index: number): boolean {
  if (index <= 0) return true;
  return scores.slice(0, index).every((s) => s >= UNLOCK_THRESHOLD);
}

export function nodeStateOf(scores: number[], index: number): NodeState {
  // 达到解锁阈值即视为已通关 —— 与 isUnlocked 共用同一个阈值，不留第二套刻度
  if ((scores[index] ?? 0) >= UNLOCK_THRESHOLD) return "done";
  return isUnlocked(scores, index) ? "now" : "lock";
}

/**
 * 全部节点状态。
 *
 * 按「前序全部达标」规则，最多只会出现一个 `now`：
 * 分数达阈值的节点已是 done，未达阈值的节点一旦其前序存在未达标者即为 lock。
 */
export function trailStates(scores: number[]): NodeState[] {
  return scores.map((_, i) => nodeStateOf(scores, i));
}

/** 当前应聚焦的节点下标（首个 now）；六艺全部通关时返回 -1 */
export function currentNodeIndex(scores: number[]): number {
  return trailStates(scores).findIndex((s) => s === "now");
}

/** 六艺总分（满分 600） */
export function totalOf(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}

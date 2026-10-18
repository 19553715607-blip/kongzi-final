import type { LiHostGuestCfg, LiHostRoundDetail, LiHostScenarioCfg } from "./liHostData";
import { RANK_META } from "./liHostData";
import type { LiHostScores } from "@/lib/types";
import { getLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function scoreBow(
  guest: LiHostGuestCfg,
  depth: number,
  scenario: LiHostScenarioCfg,
): { score: number; verdict: string } {
  const meta = RANK_META[guest.rank];
  const zoneW = guest.zoneW ?? scenario.zoneW;
  const dist = Math.abs(depth - meta.depth);
  const L = getLang();
  if (dist <= zoneW) {
    return { score: Math.round(100 - (dist / zoneW) * 25), verdict: gt("揖让得宜", L) };
  }
  if (depth > meta.depth) {
    return { score: Math.round(clamp(70 - (dist - zoneW) * 240, 5, 69)), verdict: gt("过恭近谄", L) };
  }
  return { score: Math.round(clamp(70 - (dist - zoneW) * 240, 5, 69)), verdict: gt("失之轻慢", L) };
}

export function checkGreetOrder(
  guests: LiHostGuestCfg[],
  greetedIds: string[],
  pickId: string,
): boolean {
  const remainMax = Math.max(
    ...guests.filter((g) => !greetedIds.includes(g.id)).map((g) => RANK_META[g.rank].priority),
  );
  const pick = guests.find((g) => g.id === pickId);
  return pick ? RANK_META[pick.rank].priority >= remainMax : false;
}

export function scoreSeats(guests: LiHostGuestCfg[], assignments: Record<string, number>): number {
  const sorted = [...guests].sort(
    (a, b) => RANK_META[b.rank].priority - RANK_META[a.rank].priority,
  );
  let correct = 0;
  for (const g of guests) {
    const seat = assignments[g.id];
    if (seat == null) continue;
    const expected = RANK_META[sorted[seat].rank].priority;
    if (RANK_META[g.rank].priority === expected) correct += 1;
  }
  return Math.round((correct / guests.length) * 100);
}

export function scoreEventTiming(
  t: number,
  window: [number, number],
): { score: number; verdict: string } {
  const [w0, w1] = window;
  const L = getLang();
  if (t < w0) return { score: 55, verdict: gt("太急则躁", L) };
  if (t <= w1) {
    const mid = (w0 + w1) / 2;
    const off = Math.abs(t - mid) / ((w1 - w0) / 2);
    return { score: Math.round(100 - off * 15), verdict: gt("恰到好处", L) };
  }
  return { score: 70, verdict: gt("稍迟了些", L) };
}

export function buildRoundDetail(input: {
  bows: { guest: string; verdict: string; score: number }[];
  orderHits: number;
  orderTotal: number;
  seatScore: number;
  events: { label: string; verdict: string; score: number }[];
  overActs: number;
  atmosphere: number;
}): LiHostRoundDetail {
  const bowAvg = input.bows.length
    ? Math.round(input.bows.reduce((a, b) => a + b.score, 0) / input.bows.length)
    : 0;
  const orderScore = input.orderTotal
    ? Math.round((input.orderHits / input.orderTotal) * 100)
    : 0;
  const eventAvg = input.events.length
    ? Math.round(input.events.reduce((a, b) => a + b.score, 0) / input.events.length)
    : 0;

  let highlight = "";
  const L = getLang();
  const bestBow = [...input.bows].sort((a, b) => b.score - a.score)[0];
  const bestEv = [...input.events].sort((a, b) => b.score - a.score)[0];
  if (bestBow && bestBow.score >= 85) highlight = `${gt("最佳一揖：向", L)}${bestBow.guest}，${bestBow.verdict}`;
  else if (bestEv && bestEv.score >= 85) highlight = `${gt("最佳照应：", L)}${bestEv.label}，${bestEv.verdict}`;

  return {
    bowAvg,
    orderScore,
    seatScore: input.seatScore,
    eventAvg,
    overActs: input.overActs,
    atmosphere: input.atmosphere,
    highlight,
    bows: input.bows,
    events: input.events,
  };
}

export function detailToScores(d: LiHostRoundDetail): LiHostScores {
  const jie = Math.round(clamp(d.eventAvg - d.overActs * 6, 0, 100));
  const xu = Math.round(0.5 * d.orderScore + 0.5 * d.seatScore);
  return { jing: d.bowAvg, xu, jie };
}

export function geomTotal(s: LiHostScores): number {
  return Math.round((Math.max(s.jing, 1) * Math.max(s.xu, 1) * Math.max(s.jie, 1)) ** (1 / 3));
}

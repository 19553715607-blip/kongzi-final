/** 御艺·五御 — 驾驶物理 + 事件判定（纯函数，无渲染依赖）
 *
 * 与后端 /api/v1/yu/scenario/{sid}/drive 的评分语义一一对应：
 *   trajectory = [{t(ms), x(米·车道中心为0), y(米·沿路), speed(m/s)}]，每 150ms 采样
 *   events     = beat_hit / junbiao_pass / li / pedestrian_yield / hit_pedestrian
 *                / chase / hard_brake / overspeed
 *
 * 物理常数（后端评分只看速度统计与事件，不看 x，横向手感可调）：
 *   加速 8 m/s² · 刹车 18 m/s² · 自然减速 1.2 m/s² · 极速 14 m/s
 *   横移极速 20 m/s（vx 平滑加减速）· 车道半宽 8 m（与视觉路面一致）
 */

import type {
  YuEvent,
  YuRoadConfig,
  YuScenarioBrief,
  YuTraffic,
  YuTrajectoryPoint,
} from "@/lib/types";

export const PHYS = {
  ACC: 8,
  BRK: 18,
  FRICTION: 1.2,
  MAX_SPEED: 14,
  LAT_SPEED: 20,
  LAT_ACC: 34,   // 横向加速度（转向平滑）
  LAT_DAMP: 5.5, // 松手横向阻尼（/s）
  ROAD_HALF: 8,  // 车道中心向左右可偏的最大值（米，与视觉路半宽 9 对齐）
  RUT_ZONE: 1.1,   // 循轨范围：|x| 在此内视为双轮入辙（辙距 ±0.75）
  RUT_GUIDE: 1.4,  // 循轨导向：松手时辙将车向中线带回（/s）
  OFFRUT_DRAG: 0.9, // 出辙颠簸阻力（m/s²）
} as const;

/** 玩家输入（持续量 + li 边沿） */
export interface YuInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  liPressed: boolean; // 本帧按下「礼」（边沿，引擎消费后清零）
}

export interface YuRunState {
  car: { x: number; y: number; speed: number; vx: number };
  trajectory: YuTrajectoryPoint[];
  events: YuEvent[];
  elapsedMs: number;
  lastSampleMs: number;
  nextBeatIdx: number;
  triggeredPedestrians: Set<number>;
  pedestrianDone: Set<number>;
  passedJunbiao: Set<number>;
  chasedDeer: Set<number>;
  pedTriggerMs: Map<number, number>; // 行人开始横穿的时刻（场景动画用）
  deerFleeMs: Map<number, number>; // 鹿受惊奔逃的时刻
  rutOff: number; // 出辙程度 0=循轨 1=完全出辙（车身颠簸/音效用）
  metOncoming: Set<number>; // 已判定过会车的 traffic 下标
  metLi: Set<number>; // 已相揖的对向车下标
  tailgateMs: Map<number, number>; // 慢车：逼随累计时长
  tailgated: Set<number>; // 已记逼随事件的慢车下标
  finished: boolean;
}

export function createRunState(): YuRunState {
  return {
    car: { x: 0, y: 0, speed: 0, vx: 0 },
    trajectory: [],
    events: [],
    elapsedMs: 0,
    lastSampleMs: -999,
    nextBeatIdx: 0,
    triggeredPedestrians: new Set(),
    pedestrianDone: new Set(),
    passedJunbiao: new Set(),
    chasedDeer: new Set(),
    pedTriggerMs: new Map(),
    deerFleeMs: new Map(),
    rutOff: 0,
    metOncoming: new Set(),
    metLi: new Set(),
    tailgateMs: new Map(),
    tailgated: new Set(),
    finished: false,
  };
}

/** 弯道中心线偏移（米）：每个 curve 段是一个 smoothstep 凸包（出弯回正） */
export function roadCenterX(cfg: YuRoadConfig | undefined, y: number): number {
  if (!cfg?.curves) return 0;
  let off = 0;
  for (const c of cfg.curves) {
    if (y <= c.start || y >= c.end) continue;
    const k = (y - c.start) / (c.end - c.start);
    // 旧 2D：offset 单位是像素（1m = 4px）；凸包 sin(πk) 出弯再回来
    off += (c.offset / 4) * Math.sin(Math.PI * k);
  }
  return off;
}

export interface StepResult {
  newEvents: YuEvent[]; // 本帧新产生的事件（用于音效/提示）
  justFinished: boolean;
}

/** 第 i 道节拍门的期望位置：以目标速度巡航，beats[i] 秒应达之处 */
export function beatExpectedY(scenario: YuScenarioBrief, i: number): number {
  const beats = scenario.road_config?.beats ?? [];
  return (beats[i] ?? 0) * scenario.target_speed;
}

/** 推进一帧。dt 秒；scenario 提供 road_config / target_speed / kind。 */
export function stepRun(
  rs: YuRunState,
  scenario: YuScenarioBrief,
  input: YuInput,
  dt: number,
): StepResult {
  const out: StepResult = { newEvents: [], justFinished: false };
  if (rs.finished) return out;

  const roadCfg = scenario.road_config || { type: "straight", length: 600, obstacles: [] };
  const obstacles = roadCfg.obstacles || [];
  const beats = roadCfg.beats || [];
  const length = roadCfg.length || 600;

  rs.elapsedMs += dt * 1000;
  const elapsed = rs.elapsedMs;
  const car = rs.car;
  const prevSpeed = car.speed;

  // ── 纵向 ──
  if (input.up) car.speed += PHYS.ACC * dt;
  else if (input.down) car.speed -= PHYS.BRK * dt;
  else car.speed -= PHYS.FRICTION * dt;
  car.speed = Math.max(0, Math.min(PHYS.MAX_SPEED, car.speed));
  car.y += car.speed * dt;

  // 急刹（与 2D 同口径：单帧降幅 > 5·dt·60）
  if (prevSpeed - car.speed > 5 * dt * 60) {
    push(out, rs, { t: elapsed, type: "hard_brake" });
  }
  // 超速（> 目标 1.5 倍，2 秒去重）
  if (car.speed > scenario.target_speed * 1.5) {
    const last = rs.events[rs.events.length - 1];
    if (!last || last.type !== "overspeed" || elapsed - last.t > 2000) {
      push(out, rs, { t: elapsed, type: "overspeed" });
    }
  }

  // ── 横向（x = 相对车道中心，米；vx 平滑加减速，转向不生硬） ──
  if (input.left) car.vx -= PHYS.LAT_ACC * dt;
  else if (input.right) car.vx += PHYS.LAT_ACC * dt;
  else car.vx -= car.vx * Math.min(1, PHYS.LAT_DAMP * dt);
  car.vx = Math.max(-PHYS.LAT_SPEED, Math.min(PHYS.LAT_SPEED, car.vx));
  car.x += car.vx * dt;
  // 循轨导向：不打方向且在辙区时，车辙将车向中线带回（行于轨则稳）
  if (!input.left && !input.right && Math.abs(car.x) <= PHYS.RUT_ZONE && car.speed > 0.5) {
    car.x -= car.x * Math.min(1, PHYS.RUT_GUIDE * dt);
  }
  if (car.x > PHYS.ROAD_HALF) { car.x = PHYS.ROAD_HALF; car.vx = Math.min(0, car.vx); }
  if (car.x < -PHYS.ROAD_HALF) { car.x = -PHYS.ROAD_HALF; car.vx = Math.max(0, car.vx); }

  // 出辙：颠簸阻力 + 出辙程度（0..1，供车身抖动与音效）
  rs.rutOff = Math.max(0, Math.min(1, (Math.abs(car.x) - PHYS.RUT_ZONE) / 3));
  if (rs.rutOff > 0 && car.speed > 0) {
    car.speed = Math.max(0, car.speed - PHYS.OFFRUT_DRAG * rs.rutOff * dt);
  }

  // ── 节拍（鸣和鸾）：beats[i] 秒时应达 beats[i]·target_speed，±30m 算合拍 ──
  while (rs.nextBeatIdx < beats.length && elapsed / 1000 >= beats[rs.nextBeatIdx]) {
    const i = rs.nextBeatIdx;
    const expectedY = beats[i] * scenario.target_speed;
    if (Math.abs(car.y - expectedY) <= 30) {
      push(out, rs, { t: elapsed, type: "beat_hit" });
    } else {
      // 未中也发一个占位事件供 UI 变红（不上报：提交前过滤，见 finalizeEvents）
      push(out, rs, { t: elapsed, type: "beat_hit", meta: { missed: true } });
    }
    rs.nextBeatIdx = i + 1;
  }

  // ── 障碍物 ──
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === "junbiao") {
      if (!rs.passedJunbiao.has(i) && Math.abs(car.y - o.y) < 5 && car.speed < 4) {
        push(out, rs, { t: elapsed, type: "junbiao_pass" });
        rs.passedJunbiao.add(i);
      }
    } else if (o.type === "pedestrian") {
      const trigY = o.trigger_y ?? o.y - 50;
      if (!rs.triggeredPedestrians.has(i) && car.y >= trigY) {
        rs.triggeredPedestrians.add(i);
        rs.pedTriggerMs.set(i, elapsed);
      }
      if (rs.triggeredPedestrians.has(i) && !rs.pedestrianDone.has(i) && Math.abs(car.y - o.y) < 15) {
        if (car.speed < 1) {
          push(out, rs, { t: elapsed, type: "pedestrian_yield", meta: { idx: i } });
          rs.pedestrianDone.add(i);
        } else if (car.speed > 3) {
          push(out, rs, { t: elapsed, type: "hit_pedestrian", meta: { idx: i } });
          rs.pedestrianDone.add(i);
        }
      }
    } else if (o.type === "deer") {
      // 车近 60m 鹿受惊奔逃（场景动画）
      if (!rs.deerFleeMs.has(i) && car.y >= o.y - 60) {
        rs.deerFleeMs.set(i, elapsed);
      }
      if (Math.abs(car.y - o.y) < 80 && !rs.chasedDeer.has(i) && car.x < -1) {
        push(out, rs, { t: elapsed, type: "chase", meta: { idx: i } });
        rs.chasedDeer.add(i);
      }
    }
  }

  // ── 车马往来（会车礼让 / 随行勿逼） ──
  const traffic = roadCfg.traffic || [];
  for (let i = 0; i < traffic.length; i++) {
    const tr = traffic[i];
    const yAi = trafficY(tr, elapsed);
    if (tr.type === "oncoming") {
      if (!rs.metOncoming.has(i) && Math.abs(car.y - yAi) < 6) {
        // 会车：靠右让道（x > 1.2）为有礼
        push(out, rs, { t: elapsed, type: car.x > 1.2 ? "meet_yield" : "meet_rude", meta: { idx: i } });
        rs.metOncoming.add(i);
      }
    } else {
      // 慢车在前：尾随过近（<8m）且明显更快，持续 1.2s → 逼随（不极）
      const v = tr.speed ?? 4.5;
      const gap = yAi - car.y;
      if (!rs.tailgated.has(i) && gap > 0 && gap < 8 && car.speed > v + 2.5) {
        const acc = (rs.tailgateMs.get(i) ?? 0) + dt * 1000;
        rs.tailgateMs.set(i, acc);
        if (acc > 1200) {
          push(out, rs, { t: elapsed, type: "tailgate", meta: { idx: i } });
          rs.tailgated.add(i);
        }
      }
    }
  }

  // ── 礼（边沿）：任何时候可致礼；会车窗口内按礼 = 相揖（对方回礼） ──
  if (input.liPressed) {
    input.liPressed = false;
    push(out, rs, { t: elapsed, type: "li" });
    for (let i = 0; i < traffic.length; i++) {
      const tr = traffic[i];
      if (tr.type !== "oncoming" || rs.metLi.has(i)) continue;
      if (Math.abs(car.y - trafficY(tr, elapsed)) < 25) {
        push(out, rs, { t: elapsed, type: "meet_li", meta: { idx: i } });
        rs.metLi.add(i);
      }
    }
  }

  // ── 采样（150ms） ──
  if (rs.elapsedMs - rs.lastSampleMs >= 150) {
    rs.trajectory.push({
      t: Math.round(elapsed),
      x: Number(car.x.toFixed(2)),
      y: Number(car.y.toFixed(2)),
      speed: Number(car.speed.toFixed(2)),
    });
    rs.lastSampleMs = rs.elapsedMs;
  }

  // ── 终点 ──
  if (car.y >= length) {
    rs.finished = true;
    out.justFinished = true;
  }
  return out;
}

function push(out: StepResult, rs: YuRunState, e: YuEvent) {
  rs.events.push(e);
  out.newEvents.push(e);
}

/** 提交前整理：beat 未中的占位事件不上报 */
export function finalizeEvents(rs: YuRunState): YuEvent[] {
  return rs.events.filter((e) => !(e.type === "beat_hit" && e.meta?.missed));
}

/** 行人横穿进度 0..1（未触发返回 -1；全程约 6 秒，停在路中让行） */
export function pedProgress(rs: YuRunState, idx: number): number {
  const t0 = rs.pedTriggerMs.get(idx);
  if (t0 == null) return -1;
  return Math.min(1, (rs.elapsedMs - t0) / 6000);
}

/** 鹿奔逃进度 0..1（未受惊返回 -1；约 3 秒跑出视野） */
export function deerProgress(rs: YuRunState, idx: number): number {
  const t0 = rs.deerFleeMs.get(idx);
  if (t0 == null) return -1;
  return Math.min(1, (rs.elapsedMs - t0) / 3000);
}

/** AI 车马在 elapsedMs 时刻的沿路位置（米） */
export function trafficY(tr: YuTraffic, elapsedMs: number): number {
  const v = tr.speed ?? (tr.type === "oncoming" ? 6 : 4.5);
  return tr.type === "oncoming" ? tr.y - v * (elapsedMs / 1000) : tr.y + v * (elapsedMs / 1000);
}

/** AI 车马的横向车道位置（各靠其右：对向车在玩家左侧，慢车在玩家右侧） */
export function trafficX(tr: YuTraffic): number {
  return tr.type === "oncoming" ? -2.5 : 2.5;
}

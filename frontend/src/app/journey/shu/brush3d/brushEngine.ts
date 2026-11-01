/** 书艺·竹简挥毫 — 书写引擎（薄逻辑，与 3D 表现解耦）
 *
 * 负责：底稿光栅（hanzi-writer strokes → 米字格浅灰底稿，缺数据回退系统楷体）、
 * 毛笔笔迹（压感/速度提按、笔头惯性、藏锋起笔、出锋收笔、飞白、墨色浓淡）、
 * 段数/时长统计、precision/recall/score 评分（离屏 256×256 掩膜分析，描红经典算法）。
 *
 * 手感模型：
 *   - 压感优先：指针上报过非恒 0.5 的 pressure 即认定真实压感设备，pressure→按压因子；
 *     否则速度模拟（慢=按、快=提），smoothstep + 死区，平滑单调不跳变。
 *   - 笔头惯性：按压因子与当前宽度均一阶低通向目标逼近（×0.25），相邻点不许突变。
 *   - 藏锋：段首 3 点宽度 0.55→1 渐升（逆锋起笔的圆润笔头）。
 *   - 出锋：抬笔时把末尾 4 点宽度递减收尖——快抬收到 15%（出锋），慢抬收到 55%（顿笔圆尾）。
 *   - 飞白：按压因子 < 0.35 时笔画拆成 3 条平行细线（垂直向 ±1-2px 抖动、低透明度）。
 *   - 墨色：按=浓近黑、提=淡灰黑；段内墨量随行距轻微递减（写到后面略枯）。
 *   - 视图渲染与评分掩膜共用同一套几何（drawDot/drawSegment），掩膜只是不透明版本。
 *
 * 计时纪律：全部用 Date.now() 真实时间，与 Canvas 时钟无关。
 */

export interface HanziData {
  strokes: string[];
  medians: number[][][];
}

export const CANVAS_SIZE = 1024; // 书写画布（纹理分辨率）
const ANALYSIS = 256; // 评分分析分辨率
const TOL = 34; // 容差膨胀（hanzi 1024 坐标系单位）

// ── 手感参数 ──
const W_MAX = 36; // 按笔最大宽（画布 px）
const W_MIN = 8; // 提笔最小宽
const S_LO = 260; // 速度死区（px/s）：低于此=全按
const S_HI = 2400; // 速度饱和：高于此=全提
const INERTIA = 0.25; // 笔头惯性（一阶低通系数）
const LEAD_PTS = 3; // 藏锋点数
const LEAD_MIN = 0.55; // 藏锋起始宽度比
const TAPER_PTS = 4; // 收笔递减点数
const TIP_SHARP = 0.15; // 快抬=出锋尖
const TIP_ROUND = 0.55; // 慢抬=顿笔圆尾
const LIFT_FAST = 1000; // 快抬速度阈值（px/s）
const DRY_F = 0.35; // 飞白按压阈值
const INK_LIGHT = 0.55; // 最淡墨 alpha
const INK_DARK = 0.97; // 最浓墨 alpha
const INK_DEPLETE = 0.25; // 段内墨量最大递减
const DEPLETE_DIST = 2600; // 墨量递减距离（画布 px）

export interface InkSegment {
  x0: number; y0: number; x1: number; y1: number;
  /** 两端宽度（链式连续 w1=下一段 w0，收笔可递减） */
  w0: number; w1: number;
  /** 不透明度（墨色浓淡） */
  a: number;
  /** 飞白：垂直运动方向的偏移（px，建段时定死）与单线宽 */
  fly?: { o: [number, number, number]; lw: number };
}
export interface InkDot { x: number; y: number; r: number; a: number }

export interface BrushEngineState {
  char: string;
  /** 底稿路径（hanzi 原始 1024 坐标，渲染时统一做 y 翻转） */
  paths: Path2D[];
  hasHanziData: boolean;
  /** 墨迹：段 + 起笔墨点 */
  segments: InkSegment[];
  dots: InkDot[];
  /** 显示画布（纸 + 格 + 底稿 + 墨），即 CanvasTexture 源 */
  view: HTMLCanvasElement;
  dirty: boolean;
  /** 段数（抬笔次数）与时长（首次落墨到交卷的真实毫秒） */
  strokes: number;
  firstInkAt: number | null;
  /** paintGuide 已作墨的底稿笔数（评分掩膜用） */
  guidePainted: number;
  /** 运笔状态 */
  penDown: boolean;
  lastX: number;
  lastY: number;
  /** 笔头当前宽（惯性低通后）与本点生效宽（含藏锋系数） */
  lastW: number;
  lastWEff: number;
  /** 真实压感设备（上报过非恒 0.5 的 pressure 后粘滞为 true） */
  realPressure: boolean;
  /** 平滑按压因子 0=提 1=按（3D 毛笔联动共用此值） */
  pressF: number;
  /** 段内采样序号（藏锋）/ 本段起始 segment 下标（出锋）/ 段内行距（墨量递减） */
  strokePt: number;
  strokeStartSeg: number;
  strokeDist: number;
  lastSpeed: number;
  /** 飞白抖动用确定性 PRNG 状态（避免 Math.random 高频分配顾虑） */
  rngState: number;
}

export async function loadHanziData(char: string): Promise<HanziData | null> {
  try {
    const r = await fetch(`/hanzi-data/${encodeURIComponent(char)}.json`);
    if (!r.ok) return null;
    const d = (await r.json()) as HanziData;
    return Array.isArray(d.strokes) && d.strokes.length > 0 ? d : null;
  } catch {
    return null;
  }
}

/** hanzi 1024 坐标 → 画布坐标（y 翻转：scale(1,-1)+translate(0,-900)，缩放到画布） */
function applyHanziTransform(ctx: CanvasRenderingContext2D, size: number) {
  const k = size / 1024;
  ctx.setTransform(k, 0, 0, -k, 0, 900 * k);
}

export function createEngine(char: string, data: HanziData | null): BrushEngineState {
  const view = document.createElement("canvas");
  view.width = CANVAS_SIZE;
  view.height = CANVAS_SIZE;
  const st: BrushEngineState = {
    char,
    paths: (data?.strokes ?? []).map((d) => new Path2D(d)),
    hasHanziData: !!data,
    segments: [],
    dots: [],
    view,
    dirty: true,
    strokes: 0,
    firstInkAt: null,
    guidePainted: 0,
    penDown: false,
    lastX: 0,
    lastY: 0,
    lastW: 26,
    lastWEff: 26,
    realPressure: false,
    pressF: 0,
    strokePt: 0,
    strokeStartSeg: 0,
    strokeDist: 0,
    lastSpeed: 0,
    rngState: 0x9e3779b9,
  };
  redrawView(st);
  return st;
}

// ── 手感核心 ──

/** 确定性 PRNG（LCG）：飞白抖动每段定死，视图/掩膜同几何 */
function prand(st: BrushEngineState) {
  st.rngState = (st.rngState * 1664525 + 1013904223) >>> 0;
  return st.rngState / 4294967296;
}

/** 目标按压因子 f∈[0,1]（1=按 0=提）：真实压感优先，否则速度模拟（smoothstep + 死区） */
function targetF(st: BrushEngineState, speed: number, pressure: number) {
  // 鼠标按住恒报 0.5；压感笔/触控会给出变化值，见到一次非 0.5 即切换
  if (pressure > 0 && Math.abs(pressure - 0.5) > 0.02) st.realPressure = true;
  if (st.realPressure) {
    const p = Math.max(0, Math.min(1, pressure));
    return Math.pow(p, 0.85);
  }
  const t = Math.max(0, Math.min(1, (speed - S_LO) / (S_HI - S_LO)));
  return 1 - t * t * (3 - 2 * t);
}

/** 墨色浓淡：按=浓近黑，提=淡灰黑；段内墨量随行距轻微递减 */
function inkAlpha(st: BrushEngineState, f: number) {
  const base = INK_LIGHT + (INK_DARK - INK_LIGHT) * f;
  const deplete = 1 - INK_DEPLETE * Math.min(1, st.strokeDist / DEPLETE_DIST);
  return base * deplete;
}

// ── 笔迹几何（视图渲染与评分掩膜共用；forMask 时强制不透明黑） ──

function drawSegment(ctx: CanvasRenderingContext2D, s: InkSegment, k: number, forMask: boolean) {
  ctx.globalAlpha = forMask ? 1 : s.a;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.fly) {
    // 飞白：3 条平行细线，沿垂直于运动方向偏移
    const dx = s.x1 - s.x0;
    const dy = s.y1 - s.y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * k;
    const py = (dx / len) * k;
    ctx.lineWidth = s.fly.lw * k;
    for (const o of s.fly.o) {
      ctx.beginPath();
      ctx.moveTo(s.x0 * k + px * o, s.y0 * k + py * o);
      ctx.lineTo(s.x1 * k + px * o, s.y1 * k + py * o);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = ((s.w0 + s.w1) / 2) * k;
    ctx.beginPath();
    ctx.moveTo(s.x0 * k, s.y0 * k);
    ctx.lineTo(s.x1 * k, s.y1 * k);
    ctx.stroke();
  }
}

function drawDot(ctx: CanvasRenderingContext2D, d: InkDot, k: number, forMask: boolean) {
  ctx.globalAlpha = forMask ? 1 : d.a;
  ctx.beginPath();
  ctx.arc(d.x * k, d.y * k, d.r * k, 0, Math.PI * 2);
  ctx.fill();
}

/** 画全部墨迹（视图 k=1 / 掩膜 k=ANALYSIS/CANVAS_SIZE） */
function drawAllInk(ctx: CanvasRenderingContext2D, st: BrushEngineState, k: number, forMask: boolean) {
  ctx.strokeStyle = forMask ? "#000" : "#211d18";
  ctx.fillStyle = forMask ? "#000" : "#211d18";
  for (const d of st.dots) drawDot(ctx, d, k, forMask);
  for (const s of st.segments) drawSegment(ctx, s, k, forMask);
  ctx.globalAlpha = 1;
}

// ── 底稿与重绘 ──

/** 重绘显示画布：宣纸底 + 米字格 + 浅灰底稿 + 全部墨迹 */
export function redrawView(st: BrushEngineState) {
  const ctx = st.view.getContext("2d")!;
  const S = CANVAS_SIZE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 宣纸底
  ctx.fillStyle = "#f6f0dd";
  ctx.fillRect(0, 0, S, S);
  // 纸纹（淡斑点）
  ctx.fillStyle = "rgba(180,160,110,0.05)";
  for (let i = 0; i < 120; i++) {
    const x = (i * 733) % S;
    const y = (i * 397) % S;
    ctx.fillRect(x, y, 3 + (i % 5), 2 + (i % 3));
  }
  // 边框
  ctx.strokeStyle = "rgba(150,50,40,0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, S - 60, S - 60);
  // 米字格
  ctx.strokeStyle = "rgba(150,50,40,0.28)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(S / 2, 40); ctx.lineTo(S / 2, S - 40);
  ctx.moveTo(40, S / 2); ctx.lineTo(S - 40, S / 2);
  ctx.moveTo(40, 40); ctx.lineTo(S - 40, S - 40);
  ctx.moveTo(S - 40, 40); ctx.lineTo(40, S - 40);
  ctx.stroke();
  ctx.setLineDash([]);
  // 底稿
  applyHanziTransform(ctx, S);
  if (st.hasHanziData) {
    ctx.fillStyle = "rgba(60,55,48,0.20)";
    for (const p of st.paths) ctx.fill(p);
  } else {
    // 回退：系统楷体大字
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(60,55,48,0.20)";
    ctx.font = `${S * 0.72}px "Songti SC", "STKaiti", "KaiTi", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.char, S / 2, S / 2 + S * 0.04);
  }
  // 墨迹（与掩膜同几何）
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawAllInk(ctx, st, 1, false);
  st.dirty = true;
}

// ── 运笔 ──

export function penDown(st: BrushEngineState, x: number, y: number, pressure = 0.5) {
  st.penDown = true;
  st.lastX = x;
  st.lastY = y;
  st.strokePt = 0;
  st.strokeStartSeg = st.segments.length;
  st.strokeDist = 0;
  st.lastSpeed = 0;
  const f = targetF(st, 0, pressure); // 落笔瞬间尚未移动：鼠标=慢=按
  st.pressF = f;
  // 藏锋起笔：宽度从 LEAD_MIN 起步渐升
  st.lastW = (W_MIN + (W_MAX - W_MIN) * f) * LEAD_MIN;
  st.lastWEff = st.lastW;
  if (st.firstInkAt === null) st.firstInkAt = Date.now();
  // 起笔墨点（小而圆）
  const d: InkDot = { x, y, r: Math.max(2.5, st.lastW * 0.6), a: inkAlpha(st, f) };
  st.dots.push(d);
  const ctx = inkCtx(st);
  drawDot(ctx, d, 1, false);
  ctx.globalAlpha = 1;
  st.dirty = true;
}

/** speed：画布像素/秒；pressure：指针压力 0~1（鼠标按住恒 0.5） */
export function penMove(st: BrushEngineState, x: number, y: number, speed: number, pressure = 0.5) {
  if (!st.penDown) return;
  if (st.firstInkAt === null) st.firstInkAt = Date.now();
  const f = targetF(st, speed, pressure);
  // 按压因子与宽度均一阶低通：按下渐粗、提起渐细，不许突变
  st.pressF += (f - st.pressF) * INERTIA;
  st.lastSpeed = speed;
  const target = W_MIN + (W_MAX - W_MIN) * st.pressF;
  const w = st.lastW + (target - st.lastW) * INERTIA;
  // 藏锋：段首 LEAD_PTS 点宽度 0.55→1
  const cf = st.strokePt >= LEAD_PTS ? 1 : LEAD_MIN + ((1 - LEAD_MIN) * st.strokePt) / LEAD_PTS;
  const wEff = Math.max(2, w * cf);
  const seg: InkSegment = {
    x0: st.lastX, y0: st.lastY, x1: x, y1: y,
    w0: st.lastWEff, w1: wEff,
    a: inkAlpha(st, st.pressF),
  };
  // 飞白：提笔疾行 → 3 条平行细线（偏移建段即定，视图/掩膜同几何）
  if (st.pressF < DRY_F) {
    const off = Math.max(2, wEff * 0.34);
    seg.fly = {
      o: [-(off + 1 + prand(st) * 1.2), (prand(st) - 0.5) * 1.6, off + 1 + prand(st) * 1.2],
      lw: Math.max(1.5, wEff * 0.42),
    };
    seg.a *= 0.6;
  }
  st.segments.push(seg);
  st.strokeDist += Math.hypot(x - st.lastX, y - st.lastY);
  st.strokePt += 1;
  st.lastX = x;
  st.lastY = y;
  st.lastW = w;
  st.lastWEff = wEff;
  const ctx = inkCtx(st);
  drawSegment(ctx, seg, 1, false);
  ctx.globalAlpha = 1;
  st.dirty = true;
}

export function penUp(st: BrushEngineState) {
  if (!st.penDown) return;
  st.penDown = false;
  st.strokes += 1;
  // 收笔：末尾 TAPER_PTS 点宽度递减。快抬→出锋尖（15%），慢抬→顿笔圆尾（55%）
  const n = st.segments.length - st.strokeStartSeg;
  if (n > 0) {
    const tip = st.lastSpeed > LIFT_FAST ? TIP_SHARP : TIP_ROUND;
    const K = Math.min(n, TAPER_PTS);
    for (let j = 0; j <= K; j++) {
      const f = tip + (1 - tip) * (j / K); // j=0 为末点，j=K 回到全宽
      const iW1 = st.segments.length - 1 - j; // 该点的 w1 所在段
      const iW0 = st.segments.length - j; // 该点的 w0 所在段
      if (iW1 >= st.strokeStartSeg) {
        const s = st.segments[iW1];
        s.w1 *= f;
        if (s.fly) s.fly.lw *= f;
      }
      if (iW0 <= st.segments.length - 1 && iW0 >= st.strokeStartSeg) st.segments[iW0].w0 *= f;
    }
    redrawView(st); // 末尾几段已上墨，整幅重绘一次应用收笔
  }
}

/** 增量上墨的上下文（不全幅重绘，只画最新一点/段） */
function inkCtx(st: BrushEngineState) {
  const ctx = st.view.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = "#211d18";
  ctx.fillStyle = "#211d18";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return ctx;
}

export function clearInk(st: BrushEngineState) {
  st.segments = [];
  st.dots = [];
  st.strokes = 0;
  st.firstInkAt = null;
  st.penDown = false;
  st.lastW = 26;
  st.lastWEff = 26;
  st.pressF = 0;
  st.strokePt = 0;
  st.strokeStartSeg = 0;
  st.strokeDist = 0;
  st.lastSpeed = 0;
  st.guidePainted = 0;
  // realPressure 粘滞保留（设备能力不因清墨改变）
  redrawView(st);
}

// ── 评分（离屏 256×256 掩膜分析） ──

function renderGuideMask(st: BrushEngineState, ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ANALYSIS, ANALYSIS);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  if (st.hasHanziData) {
    applyHanziTransform(ctx, ANALYSIS);
    for (const p of st.paths) ctx.fill(p);
    // 容差：底稿描边膨胀
    ctx.lineWidth = TOL;
    ctx.lineJoin = "round";
    for (const p of st.paths) ctx.stroke(p);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${ANALYSIS * 0.72}px "Songti SC", "STKaiti", "KaiTi", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.char, ANALYSIS / 2, ANALYSIS / 2 + ANALYSIS * 0.04);
    // 文字回退不做膨胀（字体渲染已偏粗）
  }
}

function renderInkMask(st: BrushEngineState, ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ANALYSIS, ANALYSIS);
  const k = ANALYSIS / CANVAS_SIZE;
  // paintGuide 作墨的底稿笔（与底稿掩膜同样加容差描边，使描红满分时 recall=1）
  if (st.guidePainted > 0 && st.hasHanziData) {
    applyHanziTransform(ctx, ANALYSIS);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    const painted = st.paths.slice(0, st.guidePainted);
    for (const p of painted) ctx.fill(p);
    ctx.lineWidth = TOL;
    ctx.lineJoin = "round";
    for (const p of painted) ctx.stroke(p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // 真实笔迹：与视图渲染同一套几何（不透明版）
  drawAllInk(ctx, st, k, true);
}

export interface BrushScore { precision: number; recall: number; score: number }

export function computeScore(st: BrushEngineState): BrushScore {
  const g = document.createElement("canvas");
  g.width = ANALYSIS; g.height = ANALYSIS;
  const gctx = g.getContext("2d", { willReadFrequently: true })!;
  renderGuideMask(st, gctx);
  const gData = gctx.getImageData(0, 0, ANALYSIS, ANALYSIS).data;

  const ik = document.createElement("canvas");
  ik.width = ANALYSIS; ik.height = ANALYSIS;
  const ictx = ik.getContext("2d", { willReadFrequently: true })!;
  renderInkMask(st, ictx);
  const iData = ictx.getImageData(0, 0, ANALYSIS, ANALYSIS).data;

  let guideTotal = 0, covered = 0, inkTotal = 0, inkOutside = 0;
  for (let i = 3; i < gData.length; i += 4) {
    const gm = gData[i] > 40;
    const im = iData[i] > 40;
    if (gm) guideTotal++;
    if (im) inkTotal++;
    if (gm && im) covered++;
    if (im && !gm) inkOutside++;
  }
  if (guideTotal === 0 || inkTotal === 0) return { precision: 0, recall: 0, score: 0 };
  const recall = covered / guideTotal;
  const precision = 1 - inkOutside / inkTotal;
  return { precision, recall, score: Math.round(precision * recall * 100) };
}

/** 交卷数据 */
export function finalize(st: BrushEngineState) {
  const sc = computeScore(st);
  return {
    strokes: st.strokes,
    durationMs: st.firstInkAt === null ? 0 : Date.now() - st.firstInkAt,
    ...sc,
  };
}

// ── 调试钩子用 ──

/** 把底稿当笔迹画进去（高分路径；n 限定只画前 n 笔） */
export function paintGuide(st: BrushEngineState, n?: number) {
  const paths = n == null ? st.paths : st.paths.slice(0, Math.max(0, n));
  if (st.hasHanziData && paths.length > 0) {
    const ctx = st.view.getContext("2d")!;
    applyHanziTransform(ctx, CANVAS_SIZE);
    ctx.fillStyle = "#211d18";
    for (const p of paths) ctx.fill(p);
    st.guidePainted = Math.max(st.guidePainted, paths.length);
    st.strokes += paths.length;
  } else {
    // 回退：沿米字格画满（覆盖率靠字体掩膜）
    scribble(st, 6, true);
    return;
  }
  if (st.firstInkAt === null) st.firstInkAt = Date.now();
  st.dirty = true;
}

/** 乱涂（低分路径） */
export function scribble(st: BrushEngineState, count = 4, tidy = false) {
  const S = CANVAS_SIZE;
  const rnd = mulberry32(tidy ? 42 : Date.now() % 100000);
  for (let k = 0; k < count; k++) {
    let x = S * (0.15 + rnd() * 0.7);
    let y = S * (0.15 + rnd() * 0.7);
    st.dots.push({ x, y, r: 14, a: 0.8 });
    const steps = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < steps; i++) {
      const nx = tidy ? S * (0.15 + rnd() * 0.7) : x + (rnd() - 0.5) * S * 0.5;
      const ny = tidy ? S * (0.15 + rnd() * 0.7) : y + (rnd() - 0.5) * S * 0.5;
      const w = 20 + rnd() * 12;
      st.segments.push({ x0: x, y0: y, x1: nx, y1: ny, w0: w, w1: w, a: 0.85 });
      x = nx; y = ny;
    }
    st.strokes += 1;
  }
  if (st.firstInkAt === null) st.firstInkAt = Date.now();
  redrawView(st);
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

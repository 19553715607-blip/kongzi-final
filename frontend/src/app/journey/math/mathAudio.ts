/** 数艺·量仓分赈 — WebAudio 合成音效（无外部资源）
 *
 *   setPouring(on, dir)  倾倒沙沙声（持续层，出粮/回粮时响起）
 *   switchVillage()      切换目标村（清越双音）
 *   bell()               封仓验收钟声
 *   finish(score)        结算凯旋（按评级给不同明亮度）
 *   stopAll()            停所有持续声
 */

let ctx: AudioContext | null = null;
let pourSrc: AudioBufferSourceNode | null = null;
let pourGain: GainNode | null = null;
let pourFilter: BiquadFilterNode | null = null;

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  freq: number,
  dur = 0.08,
  type: OscillatorType = "sine",
  vol = 0.05,
  when = 0,
  slideTo?: number,
) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur = 0.12, vol = 0.05, low = 400, high = 2000, when = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = (low + high) / 2;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

// ── 持续层：倾倒沙沙声（谷粒流，颗粒感噪声） ──
export function setPouring(on: boolean, dir: "pour" | "scoop" = "pour") {
  const c = ac();
  if (!c) return;
  if (on && !pourSrc) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      // 颗粒感：低频游走 + 高频沙粒
      v = v * 0.72 + (Math.random() * 2 - 1) * 0.28;
      d[i] = v * 0.55 + (Math.random() * 2 - 1) * 0.45;
    }
    pourSrc = c.createBufferSource();
    pourSrc.buffer = buf;
    pourSrc.loop = true;
    pourFilter = c.createBiquadFilter();
    pourFilter.type = "bandpass";
    pourFilter.Q.value = 0.9;
    pourGain = c.createGain();
    pourGain.gain.value = 0;
    pourSrc.connect(pourFilter).connect(pourGain).connect(c.destination);
    pourSrc.start();
  }
  if (pourGain && pourFilter) {
    // 出粮偏高频（谷物落斗），回粮略低沉
    pourFilter.frequency.setTargetAtTime(dir === "pour" ? 2600 : 1700, c.currentTime, 0.08);
    pourGain.gain.setTargetAtTime(on ? 0.05 : 0, c.currentTime, on ? 0.05 : 0.1);
  }
  if (!on && pourSrc) {
    const src = pourSrc;
    setTimeout(() => { try { src.stop(); } catch { /* noop */ } }, 500);
    pourSrc = null;
    pourGain = null;
    pourFilter = null;
  }
}

export function stopAll() {
  if (pourSrc) { try { pourSrc.stop(); } catch { /* noop */ } pourSrc = null; pourGain = null; pourFilter = null; }
}

// ── 事件音 ──

/** 切换目标村（木梆双响） */
export const switchVillage = () => {
  tone(740, 0.07, "triangle", 0.045);
  tone(988, 0.1, "sine", 0.035, 0.05);
  noiseBurst(0.04, 0.02, 1500, 3200);
};

/** 封仓验收（钟声） */
export const bell = () => {
  tone(392, 0.6, "sine", 0.06);
  tone(588, 0.5, "sine", 0.035, 0.02);
  tone(784, 0.4, "sine", 0.02, 0.05);
};

/** 仓空警示（再想出粮而仓已空） */
export const emptyBin = () => {
  tone(220, 0.12, "square", 0.025);
};

/** 结算凯旋（按评级给不同明亮度） */
export function finish(score: number) {
  const bright = score >= 75;
  const base = bright ? [523, 659, 784, 1047] : score >= 40 ? [440, 554, 659] : [330, 392];
  base.forEach((f, i) => tone(f, 0.35, "triangle", 0.055, i * 0.13));
  if (bright) tone(1319, 0.6, "sine", 0.05, base.length * 0.13);
}

/** 乐艺·编钟合鸣 — WebAudio 合成音效（无外部资源）
 *
 *   strikeBell(note)  青铜编钟：基频 + 非谐泛音列（2.0/2.74/4.07/5.43）指数衰减 + 击奏噪声；
 *                     宫钟加 0.5 倍次低频分量（大钟低八度感）
 *   shengChime()      相生泛音（清脆上行）
 *   reverseHint()     逆跳弱提示（低哑）
 *   undoTick()        撤销轻音
 *   submitBell()      奏乐验收（深钟）
 *   finish(score)     结算凯旋（按评级给不同明亮度）
 *   stopAll()
 */

import type { YueNote } from "@/lib/types";

let ctx: AudioContext | null = null;

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

/** 单个泛音（指数衰减长音） */
function partial(freq: number, dur: number, vol: number, when = 0, detune = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t0);
  if (detune) o.detune.setValueAtTime(detune, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const NOTE_FREQ: Record<YueNote, number> = {
  gong: 261.63, // 宫 C4
  shang: 293.66, // 商 D4
  jue: 329.63, // 角 E4
  zhi: 392.0, // 徵 G4
  yu: 440.0, // 羽 A4
};

/** 击钟：基频 + 非谐泛音列（青铜钟频谱），各自指数衰减 */
export function strikeBell(note: YueNote, when = 0) {
  const f = NOTE_FREQ[note];
  // [倍频, 音量, 衰减时长]
  const parts: [number, number, number][] = [
    [1.0, 0.2, 3.4],
    [2.0, 0.09, 2.5],
    [2.74, 0.065, 2.0],
    [4.07, 0.04, 1.5],
    [5.43, 0.025, 1.1],
  ];
  if (note === "gong") parts.push([0.5, 0.11, 4.0]); // 大钟次低频（低八度感）
  for (const [r, v, d] of parts) {
    partial(f * r, d, v, when);
    partial(f * r, d * 0.9, v * 0.4, when, 6); // 微失谐增厚
  }
  noiseBurst(0.05, 0.05, 900, 4200, when); // 槌击 attack
}

/** 相生泛音（青色光弧时的清脆上行） */
export const shengChime = () => {
  tone(1568, 0.5, "sine", 0.03);
  tone(2093, 0.6, "sine", 0.022, 0.06);
  tone(2637, 0.7, "sine", 0.014, 0.12);
};

/** 逆跳弱提示（暗红弧线时的低哑音） */
export const reverseHint = () => {
  tone(196, 0.22, "sine", 0.028);
  tone(147, 0.26, "sine", 0.02, 0.08);
};

/** 休止符（木鱼轻叩） */
export const restTok = () => {
  tone(880, 0.05, "square", 0.018);
  noiseBurst(0.04, 0.02, 700, 1800);
};

/** 撤销轻音 */
export const undoTick = () => {
  tone(523, 0.06, "triangle", 0.03);
  noiseBurst(0.03, 0.015, 1200, 3000);
};

/** 奏乐验收（深钟二响） */
export const submitBell = () => {
  partial(196, 3.2, 0.18);
  partial(98, 4.0, 0.13);
  partial(392, 2.2, 0.06, 0.02);
  noiseBurst(0.06, 0.05, 500, 2400);
};

export function stopAll() {
  // 编钟均为一次性衰减音，无持续层；保留接口与数游戏一致
}

/** 结算凯旋（按评级给不同明亮度） */
export function finish(score: number) {
  const bright = score >= 75;
  const base = bright ? [523, 659, 784, 1047] : score >= 40 ? [440, 554, 659] : [330, 392];
  base.forEach((f, i) => tone(f, 0.35, "triangle", 0.055, i * 0.13));
  if (bright) tone(1319, 0.6, "sine", 0.05, base.length * 0.13);
}

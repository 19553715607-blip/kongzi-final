/** 射 · 观德 — Web Audio 合成音效（无外部资源）
 *
 * 全部为短促的合成音：拉弓吱呀、放箭弦响、破空、中靶、黄心清音、解锁。
 * AudioContext 在首次用户手势时创建（浏览器自动播放策略）。
 */

let ctx: AudioContext | null = null;
let creakNodes: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** 拉弓：低频吱呀（持续，直到 stopCreak） */
export function startCreak(): void {
  const c = ac();
  if (!c || creakNodes) return;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 52;
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 6.5;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 9;
  lfo.connect(lfoGain).connect(osc.frequency);
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.035, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  lfo.start();
  creakNodes = { osc, gain, lfo };
}

export function stopCreak(): void {
  if (!ctx || !creakNodes) return;
  const { osc, gain, lfo } = creakNodes;
  creakNodes = null;
  try {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    osc.stop(ctx.currentTime + 0.2);
    lfo.stop(ctx.currentTime + 0.2);
  } catch {
    /* 已停止 */
  }
}

/** 放箭：弦响 + 破空 */
export function release(): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  // 弦响（三角波快速下滑）
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(210, t);
  osc.frequency.exponentialRampToValueAtTime(65, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.18);
  // 破空（带通噪声上扫）
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.45);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(420, t);
  bp.frequency.exponentialRampToValueAtTime(1900, t + 0.4);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  src.connect(bp).connect(ng).connect(c.destination);
  src.start(t);
  src.stop(t + 0.5);
}

/** 中靶：低频闷响；环数越高越实 */
export function thud(score: number): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const strength = 0.1 + Math.min(0.16, score * 0.02);
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(105, t);
  osc.frequency.exponentialRampToValueAtTime(58, t + 0.16);
  const g = c.createGain();
  g.gain.setValueAtTime(strength, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.22);
  // 纸面轻响
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.06);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const ng = c.createGain();
  ng.gain.setValueAtTime(strength * 0.7, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(lp).connect(ng).connect(c.destination);
  src.start(t);
  src.stop(t + 0.08);
}

/** 黄心 / 九环以上：两声清越泛音（编钟意象） */
export function chime(): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  [523.25, 783.99].forEach((freq, i) => {
    const t = t0 + i * 0.09;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}

/** 脱靶：一声轻闷 */
export function missThud(): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.07, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.32);
}

/** 解锁经典：三音上行 */
export function unlock(): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  [392, 523.25, 659.25].forEach((freq, i) => {
    const t = t0 + i * 0.1;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

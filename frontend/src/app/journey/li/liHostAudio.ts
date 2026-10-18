/** 礼艺·执礼宾至如归 — WebAudio 合成音效（无外部资源，复用乐艺 ac/tone/noiseBurst 模式）
 *
 *   startAmbience()  院中环境声（微风持续层 + 偶发鸟鸣 + 极轻古琴泛音），离局 stopAll()
 *   stopAll()
 *   step()           石板脚步声（行走节奏钩子，短促轻响）
 *   bowQing()        揖礼磬音（石磬泛音列，清越绵长）
 *   chimeGood/Bad()  迎宾先后得宜 / 失序
 *   riteGood/Bad()   揖礼合度 / 失礼低哑
 *   seatGood/Bad()   安席合礼 / 位次有出入
 *   attendGood/Bad() 照应得时 / 怠慢或失时
 *   overAct()        过度殷勤（无事频扰）
 *   neglect()        照应超时（怠慢）
 *   tap()            普通确认轻音
 *   finish(total)    终局凯旋（按总分给明亮度）
 */

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

// ── 环境声（微风 + 鸟鸣 + 古琴泛音偶发） ──

let windSrc: AudioBufferSourceNode | null = null;
let windGain: GainNode | null = null;
let ambienceTimers: ReturnType<typeof setTimeout>[] = [];
let ambienceOn = false;

function birdChirp(when = 0) {
  const c = ac();
  if (!c) return;
  const base = 2200 + Math.random() * 1400;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const t = when + i * (0.09 + Math.random() * 0.05);
    tone(base * (1 + Math.random() * 0.12), 0.07, "sine", 0.012, t, base * 0.72);
  }
}

function qinPluck(when = 0) {
  // 古琴泛音：五声音阶挑弦，极低音量、快起缓衰
  const scale = [196, 220, 261.6, 293.7, 329.6, 392];
  const f = scale[Math.floor(Math.random() * scale.length)];
  partial(f, 2.8, 0.016, when);
  partial(f * 2, 1.8, 0.007, when);
  partial(f * 3.01, 1.1, 0.004, when);
}

export function startAmbience() {
  const c = ac();
  if (!c || ambienceOn) return;
  ambienceOn = true;
  // 微风：循环棕噪声 + 低通，音量极轻、缓慢起伏
  const len = c.sampleRate * 3;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < len; i++) {
    v = v * 0.96 + (Math.random() * 2 - 1) * 0.04;
    d[i] = v * 2.2;
  }
  windSrc = c.createBufferSource();
  windSrc.buffer = buf;
  windSrc.loop = true;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 420;
  windGain = c.createGain();
  windGain.gain.value = 0.018;
  // 风势起伏 LFO
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.007;
  lfo.connect(lfoG).connect(windGain.gain);
  lfo.start();
  windSrc.connect(f).connect(windGain).connect(c.destination);
  windSrc.start();
  windSrc.onended = () => { try { lfo.stop(); } catch { /* noop */ } };
  // 偶发鸟鸣（4~9s）与古琴泛音（18~40s）
  const bird = () => {
    if (!ambienceOn) return;
    birdChirp();
    ambienceTimers.push(setTimeout(bird, 4000 + Math.random() * 5000));
  };
  const qin = () => {
    if (!ambienceOn) return;
    qinPluck();
    ambienceTimers.push(setTimeout(qin, 18000 + Math.random() * 22000));
  };
  ambienceTimers.push(setTimeout(bird, 1500 + Math.random() * 2500));
  ambienceTimers.push(setTimeout(qin, 6000 + Math.random() * 8000));
}

export function stopAll() {
  ambienceOn = false;
  for (const t of ambienceTimers) clearTimeout(t);
  ambienceTimers = [];
  if (windSrc) { try { windSrc.stop(); } catch { /* noop */ } windSrc = null; windGain = null; }
}

// ── 石板脚步（行走节奏钩子；步频由调用方控制） ──
let stepFlip = false;
export function step() {
  stepFlip = !stepFlip;
  noiseBurst(0.045, 0.022, stepFlip ? 260 : 320, stepFlip ? 750 : 900);
}

// ── 揖礼磬音（石磬：基频 + 非谐泛音，清越绵长） ──
export function bowQing() {
  const f = 840;
  partial(f, 2.6, 0.09);
  partial(f * 2.76, 1.7, 0.04, 0, 4);
  partial(f * 5.4, 1.0, 0.02, 0.01);
  noiseBurst(0.04, 0.03, 1800, 5200);
}

// ── 迎宾先后 ──
export const chimeGood = () => {
  tone(1047, 0.16, "sine", 0.04);
  tone(1568, 0.22, "sine", 0.028, 0.07);
};
export const chimeBad = () => {
  tone(220, 0.24, "sine", 0.035);
  tone(185, 0.3, "sine", 0.026, 0.09);
};

// ── 揖礼合度 / 失礼 ──
export const riteGood = () => {
  tone(784, 0.2, "triangle", 0.045);
  tone(1047, 0.26, "triangle", 0.032, 0.08);
};
export const riteBad = () => {
  tone(196, 0.3, "sine", 0.04);
  noiseBurst(0.12, 0.02, 160, 480);
};

// ── 安席 ──
export const seatGood = () => {
  tone(659, 0.18, "triangle", 0.045);
  tone(880, 0.22, "triangle", 0.032, 0.08);
  tone(1319, 0.3, "sine", 0.022, 0.16);
};
export const seatBad = () => {
  tone(247, 0.26, "sine", 0.035);
  tone(208, 0.3, "sine", 0.026, 0.1);
};

// ── 席间照应 ──
export const attendGood = () => {
  tone(988, 0.14, "sine", 0.035);
  tone(1319, 0.2, "sine", 0.024, 0.06);
};
export const attendBad = () => {
  tone(233, 0.22, "sine", 0.03);
};
export const overAct = () => {
  tone(311, 0.14, "square", 0.016);
  tone(262, 0.18, "square", 0.014, 0.08);
};
export const neglect = () => {
  tone(175, 0.34, "sine", 0.035);
  tone(147, 0.4, "sine", 0.026, 0.12);
};

/** 普通确认轻音 */
export const tap = () => {
  tone(660, 0.05, "triangle", 0.025);
  noiseBurst(0.03, 0.012, 1000, 2600);
};

/** 终局凯旋（按总分给明亮度） */
export function finish(total: number) {
  const bright = total >= 75;
  const base = bright ? [523, 659, 784, 1047] : total >= 45 ? [440, 554, 659] : [330, 392];
  base.forEach((f, i) => tone(f, 0.36, "triangle", 0.05, i * 0.14));
  if (bright) {
    tone(1319, 0.7, "sine", 0.045, base.length * 0.14);
    partial(262, 2.4, 0.05, base.length * 0.14);
  }
}

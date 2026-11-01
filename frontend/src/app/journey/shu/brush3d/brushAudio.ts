/** 书艺·竹简挥毫 — WebAudio 合成音效（无外部资源）
 *
 *   setStroking(on, speed01)  笔触沙沙声（持续层，速度驱动音量/明亮度）
 *   dropTick()                起笔墨滴轻响
 *   submitBell()              交卷钟声
 *   finish(score)             结算凯旋（按品级给不同明亮度）
 *   stopAll()
 */

let ctx: AudioContext | null = null;
let strokeSrc: AudioBufferSourceNode | null = null;
let strokeGain: GainNode | null = null;
let strokeFilter: BiquadFilterNode | null = null;

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

// ── 持续层：笔触沙沙（纸面摩擦，速度驱动） ──
export function setStroking(on: boolean, speed01 = 0.5) {
  const c = ac();
  if (!c) return;
  if (on && !strokeSrc) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      // 纸面颗粒摩擦：中频游走 + 细砂
      v = v * 0.82 + (Math.random() * 2 - 1) * 0.18;
      d[i] = v * 0.7 + (Math.random() * 2 - 1) * 0.3;
    }
    strokeSrc = c.createBufferSource();
    strokeSrc.buffer = buf;
    strokeSrc.loop = true;
    strokeFilter = c.createBiquadFilter();
    strokeFilter.type = "bandpass";
    strokeFilter.Q.value = 1.1;
    strokeGain = c.createGain();
    strokeGain.gain.value = 0;
    strokeSrc.connect(strokeFilter).connect(strokeGain).connect(c.destination);
    strokeSrc.start();
  }
  if (strokeGain && strokeFilter) {
    // 快写更亮更响，慢写低沉细微
    strokeFilter.frequency.setTargetAtTime(900 + speed01 * 1400, c.currentTime, 0.06);
    strokeGain.gain.setTargetAtTime(on ? 0.02 + speed01 * 0.045 : 0, c.currentTime, on ? 0.05 : 0.09);
  }
  if (!on && strokeSrc) {
    const src = strokeSrc;
    setTimeout(() => { try { src.stop(); } catch { /* noop */ } }, 400);
    strokeSrc = null;
    strokeGain = null;
    strokeFilter = null;
  }
}

export function stopAll() {
  if (strokeSrc) { try { strokeSrc.stop(); } catch { /* noop */ } strokeSrc = null; strokeGain = null; strokeFilter = null; }
}

// ── 事件音 ──

/** 起笔墨滴轻响 */
export const dropTick = () => {
  tone(640, 0.05, "sine", 0.03);
  noiseBurst(0.03, 0.018, 900, 2400);
};

/** 交卷钟声 */
export const submitBell = () => {
  tone(392, 0.6, "sine", 0.06);
  tone(588, 0.5, "sine", 0.035, 0.02);
  tone(784, 0.4, "sine", 0.02, 0.05);
};

/** 结算凯旋（按品级给不同明亮度） */
export function finish(score: number) {
  const bright = score >= 75;
  const base = bright ? [523, 659, 784, 1047] : score >= 40 ? [440, 554, 659] : [330, 392];
  base.forEach((f, i) => tone(f, 0.35, "triangle", 0.055, i * 0.13));
  if (bright) tone(1319, 0.6, "sine", 0.05, base.length * 0.13);
}

/** 御艺·五御 — WebAudio 合成音效（无外部资源）
 *
 *   update(speed)  马蹄「哒-哒」小快步 + 木轴轻响 + 鸾铃 + 轻风 + 出辙低鸣，速度驱动（每帧调用）
 *   beatChime(ok)  节拍门：合拍 = 鸾铃清响，错过 = 低哑
 *   junbiao()      过君表（缓行致礼）一声钟
 *   li()           按「礼」— 揖礼磬音
 *   yieldOk()      让行人成功
 *   hitPed()       撞到行人（闷响 + 下行音）
 *   deer()         鹿鸣奔逃
 *   hardBrake()    急刹（噪声刮擦）
 *   overspeed()    超速提示
 *   finish(grade)  冲线凯旋（按评级给不同明亮度）
 */

let ctx: AudioContext | null = null;
let windSrc: AudioBufferSourceNode | null = null;
let windGain: GainNode | null = null;
let rumbleSrc: AudioBufferSourceNode | null = null;
let rumbleGain: GainNode | null = null;
let hoofTimer: ReturnType<typeof setInterval> | null = null;
let hoofStep = 0;
let lastSpeed = 0;

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

// ── 持续层：马蹄 + 车轮木声 + 轻风 + 出辙颠簸声（每帧以速度驱动） ──
export function update(speed: number, running: boolean, rutOff = 0) {
  const c = ac();
  if (!c) return;
  lastSpeed = speed;

  // 高速轻风气流声（很弱，不作主声）
  if (running && !windSrc) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; // 白噪声
    windSrc = c.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 0.4;
    windGain = c.createGain();
    windGain.gain.value = 0;
    windSrc.connect(f).connect(windGain).connect(c.destination);
    windSrc.start();
  }
  if (windGain) {
    const target = running ? Math.min(0.014, speed * 0.0013) : 0;
    windGain.gain.setTargetAtTime(target, c.currentTime, 0.2);
  }
  if (!running && windSrc) {
    windGain?.gain.setTargetAtTime(0, c.currentTime, 0.15);
    const src = windSrc;
    setTimeout(() => { try { src.stop(); } catch { /* noop */ } }, 600);
    windSrc = null;
    windGain = null;
  }

  // 出辙颠簸低鸣（碎石/软土，音量随出辙程度与速度）
  if (running && !rumbleSrc) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = v * 0.94 + (Math.random() * 2 - 1) * 0.06; // 松散颗粒感
      d[i] = v * 4;
    }
    rumbleSrc = c.createBufferSource();
    rumbleSrc.buffer = buf;
    rumbleSrc.loop = true;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    rumbleGain = c.createGain();
    rumbleGain.gain.value = 0;
    rumbleSrc.connect(f).connect(rumbleGain).connect(c.destination);
    rumbleSrc.start();
  }
  if (rumbleGain) {
    const target = running ? rutOff * Math.min(1, speed / 8) * 0.055 : 0;
    rumbleGain.gain.setTargetAtTime(target, c.currentTime, 0.12);
  }
  if (!running && rumbleSrc) {
    rumbleGain?.gain.setTargetAtTime(0, c.currentTime, 0.1);
    const src = rumbleSrc;
    setTimeout(() => { try { src.stop(); } catch { /* noop */ } }, 500);
    rumbleSrc = null;
    rumbleGain = null;
  }

  // 马蹄（小快步「哒-哒」成对，节奏随速度）+ 木轴/鸾铃点缀
  if (running && speed > 1 && !hoofTimer) {
    const schedule = () => {
      const s = lastSpeed;
      if (s <= 1) return;
      const which = hoofStep % 2;
      if (which === 0) {
        // clip（前蹄，偏高）
        tone(1050, 0.04, "sine", 0.032, 0, 520);
        noiseBurst(0.025, 0.016, 1400, 3000);
      } else {
        // clop（后蹄，偏低）
        tone(760, 0.045, "sine", 0.03, 0, 380);
        noiseBurst(0.03, 0.014, 900, 2200);
      }
      hoofStep++;
      // 木轴轻响（每 4 对蹄声一次）
      if (hoofStep % 8 === 0) {
        const f = 300 + Math.random() * 140;
        tone(f, 0.16, "triangle", 0.007, 0.02, f * 0.82);
      }
      // 鸾铃轻颤（每 6 对一次）
      if (hoofStep % 12 === 6) {
        tone(2350, 0.1, "sine", 0.007, 0.03);
        tone(3136, 0.12, "sine", 0.005, 0.07);
      }
      const within = Math.max(0.1, 0.17 - s * 0.004);   // 一对之内
      const between = Math.max(0.16, 0.55 - s * 0.028); // 两对之间
      hoofTimer = setTimeout(schedule, (which === 0 ? within : between) * 1000);
    };
    hoofTimer = setTimeout(schedule, 0);
  } else if ((!running || speed <= 1) && hoofTimer) {
    clearTimeout(hoofTimer);
    hoofTimer = null;
  }
}

export function stopAll() {
  if (hoofTimer) { clearTimeout(hoofTimer); hoofTimer = null; }
  if (windSrc) { try { windSrc.stop(); } catch { /* noop */ } windSrc = null; windGain = null; }
  if (rumbleSrc) { try { rumbleSrc.stop(); } catch { /* noop */ } rumbleSrc = null; rumbleGain = null; }
}

// ── 事件音 ──
export const beatChime = (ok: boolean) => {
  if (ok) {
    tone(880, 0.16, "sine", 0.06);
    tone(1320, 0.22, "sine", 0.045, 0.05);
    tone(1760, 0.3, "sine", 0.03, 0.1);
  } else {
    tone(185, 0.16, "sawtooth", 0.03);
  }
};

export const junbiao = () => {
  tone(392, 0.5, "sine", 0.055); // 钟
  tone(588, 0.4, "sine", 0.03, 0.02);
};

export const li = () => {
  tone(660, 0.18, "triangle", 0.05);
  tone(990, 0.24, "sine", 0.03, 0.06);
};

export const yieldOk = () => {
  tone(523, 0.12, "triangle", 0.045);
  tone(784, 0.18, "triangle", 0.04, 0.08);
};

export const hitPed = () => {
  noiseBurst(0.2, 0.09, 150, 700);
  tone(160, 0.35, "sawtooth", 0.05, 0, 70);
};

export const deer = () => {
  tone(1200, 0.12, "sine", 0.03);
  tone(1500, 0.1, "sine", 0.025, 0.09);
};

/** 会车礼让（清越双音） */
export const meetOk = () => {
  tone(587, 0.14, "triangle", 0.05);
  tone(880, 0.2, "sine", 0.04, 0.07);
};

/** 会车失礼（低哑不和） */
export const meetRude = () => {
  tone(196, 0.22, "sawtooth", 0.04);
  noiseBurst(0.16, 0.04, 200, 900);
};

/** 相揖而礼（揖礼三音，温厚上行） */
export const meetLi = () => {
  tone(660, 0.18, "triangle", 0.05);
  tone(990, 0.24, "sine", 0.035, 0.1);
  tone(1320, 0.3, "sine", 0.025, 0.22);
};

/** 逼随前车（警告） */
export const tailgate = () => {
  tone(330, 0.09, "square", 0.03);
  tone(294, 0.11, "square", 0.03, 0.13);
};

export const hardBrake = () => noiseBurst(0.28, 0.06, 900, 3400);

export const overspeed = () => {
  tone(440, 0.09, "square", 0.03);
  tone(440, 0.09, "square", 0.03, 0.14);
};

export function finish(score: number) {
  const bright = score >= 75;
  const base = bright ? [523, 659, 784, 1047] : score >= 40 ? [440, 554, 659] : [330, 392];
  base.forEach((f, i) => tone(f, 0.35, "triangle", 0.055, i * 0.13));
  if (bright) tone(1319, 0.6, "sine", 0.05, base.length * 0.13);
}

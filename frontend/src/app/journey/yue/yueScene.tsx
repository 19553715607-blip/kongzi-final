"use client";

/** 乐艺·编钟合鸣 3D — React Three Fiber 场景
 *
 * 与数/御场景同一宣纸色调：宣纸天光 + 淡墨远山 + 田野松柏。
 * 宗庙明堂中央一座编钟木架（簨簴：髹漆立柱横梁），悬挂五口青铜甬钟，
 * 宫商角徵羽自左而右、由大而小；悬浮木槌指向当前钟。
 *
 * 击钟表现全部由 YueGame 写入 YueRefs（bellT/ripples/arc/hammer），
 * 场景 useFrame 只读 refs 做动画，不走 React 渲染。
 * 点钟：R3F onPointerDown raycast → g.onStrike。
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { YueNote } from "@/lib/types";
import { useGT } from "@/lib/gameDict";
import { NOTES, type YueEngineState } from "./yueEngine";

// ── 共享可变状态 ──
export interface Ripple { idx: number; t0: number }
export interface ShengArc { from: number; to: number; kind: "sheng" | "reverse"; t0: number }

export interface YueRefs {
  running: boolean;
  engine: YueEngineState | null;
  /** 各钟最近一次被击时刻（秒，场景时钟） */
  bellT: Record<YueNote, number>;
  ripples: Ripple[];
  arc: ShengArc | null;
  hammerIdx: number;
  hammerT: number;
  /** 场景时钟镜像（Game 侧触发动画时取此刻） */
  now: number;
  onStrike: MutableRefObject<(note: YueNote) => void>;
}

export function createYueRefs(): YueRefs {
  return {
    running: false,
    engine: null,
    bellT: { gong: -10, shang: -10, jue: -10, zhi: -10, yu: -10 },
    ripples: [],
    arc: null,
    hammerIdx: 2,
    hammerT: -10,
    now: 0,
    onStrike: { current: () => {} },
  };
}

// ── 场景常量（与数场景同一宣纸色调） ──
const SKY = "#f1ead7";
const FOG = "#ece4cd";
const GOLD = "#d9a521";
const BRONZE = "#a8905a";
const BRONZE_DARK = "#8a7448";
const LACQUER = "#6b2420"; // 髹漆朱
const WOOD = "#5a3b1d";
const SHENG_COLOR = "#2f8f7b"; // 相生 · 青
const REVERSE_COLOR = "#8a3530"; // 逆跳 · 暗红

export const MOOD_COLOR: Record<string, string> = {
  solemn: "#2b3a4a", // 庄重 · 玄青
  joyful: "#b8860b", // 和乐 · 金黄
  sad: "#3a5a8c", // 哀别 · 黛蓝
  calm: "#4a7a5a", // 闲适 · 竹绿
  heroic: "#b23a2c", // 激昂 · 赤朱
};

// ── 编钟布局 ──
const RACK_Z = -3;
const BEAM_Y = 3.55;
const BELL_X = [-2.6, -1.3, 0, 1.3, 2.6];
const BELL_SCALE = [1.15, 1.0, 0.88, 0.78, 0.68]; // 宫大羽小
const NOTE_NAME: Record<YueNote, string> = { gong: "宫", shang: "商", jue: "角", zhi: "徵", yu: "羽" };

function bellCenter(idx: number): THREE.Vector3 {
  const s = BELL_SCALE[idx];
  return new THREE.Vector3(BELL_X[idx], BEAM_Y - 0.34 - (1.05 * s) / 2, RACK_Z);
}

// ── 文字标签（CanvasTexture sprite，沿用数场景写法） ──
interface LabelLine { text: string; size: number; color: string; bold?: boolean }

function makeLabelTexture(lines: LabelLine[], pad = 18): THREE.CanvasTexture {
  const W = 512;
  const lineH = (l: LabelLine) => l.size + 14;
  const H = lines.reduce((s, l) => s + lineH(l), 0) + pad * 2;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(250,246,232,0.92)";
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,96,54,0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();
  let y = pad + 8;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const l of lines) {
    ctx.font = `${l.bold ? "700" : "400"} ${l.size}px "Songti SC", "STSong", "SimSun", serif`;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, W / 2, y);
    y += lineH(l);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Label({ lines, position, width = 0.85 }: {
  lines: LabelLine[];
  position: [number, number, number];
  width?: number;
}) {
  const tex = useMemo(() => makeLabelTexture(lines), [lines]);
  const aspect = tex.image.height / tex.image.width;
  return (
    <sprite position={position} scale={[width, width * aspect, 1]} renderOrder={8}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

// ── 场景根 ──
export function YueScene({ g }: { g: YueRefs }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 2.75, 7.8));
  const camLook = useRef(new THREE.Vector3(0, 2.15, -3));

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    g.now = state.clock.elapsedTime;
    // 相机：固定全景 + 极轻微偏向最近击的钟（呼吸感）
    const bx = BELL_X[g.hammerIdx] ?? 0;
    camPos.current.x += (bx * 0.1 - camPos.current.x) * Math.min(1, dt * 2);
    camPos.current.y = 2.75 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 38, 130]} />
      <hemisphereLight args={["#f8f4e6", "#aebd90", 0.95]} />
      <directionalLight position={[30, 40, 20]} intensity={0.7} color="#fff1d4" />

      <Ground />
      <Fields />
      <Mountains />
      <Pines />
      <Clouds />
      <Platform />
      <Lanterns />
      <BellRack g={g} />
      <Hammer g={g} />
      <Ripples g={g} />
      <ShengArcView g={g} />
    </>
  );
}

// ── 环境（与数场景同款） ──
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
      <planeGeometry args={[110, 90]} />
      <meshStandardMaterial color="#b3c091" />
    </mesh>
  );
}

function Fields() {
  const strips = useMemo(() => {
    const arr: { x: number; z: number; w: number; d: number; c: string }[] = [];
    const colors = ["#a8b87e", "#9cae74", "#b3bd88", "#a2b178"];
    for (let i = 0; i < 8; i++) {
      arr.push({ x: -26 - (i % 2) * 12, z: 12 - i * 8, w: 20, d: 7, c: colors[i % 4] });
      arr.push({ x: 26 + ((i + 1) % 2) * 12, z: 10 - i * 8, w: 20, d: 7, c: colors[(i + 2) % 4] });
    }
    return arr;
  }, []);
  return (
    <>
      {strips.map((s, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0.02, s.z]}>
          <planeGeometry args={[s.w, s.d]} />
          <meshStandardMaterial color={s.c} />
        </mesh>
      ))}
    </>
  );
}

function Mountains() {
  const ridges = useMemo(() => {
    const mk = (z: number, hBase: number, f1: number, f2: number, phase: number) => {
      const pts: number[] = [];
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const x = -110 + (220 * i) / n;
        const h = hBase + Math.sin(i * f1 + phase) * hBase * 0.45 + Math.sin(i * f2) * hBase * 0.2;
        pts.push(x, 0, z, x, h, z);
      }
      const idx: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      geo.setIndex(idx);
      return geo;
    };
    return [
      { geo: mk(-58, 12, 0.9, 0.31, 1.2), color: "#93a495", opacity: 0.5 },
      { geo: mk(-46, 8.5, 1.1, 0.4, 4.1), color: "#849a8c", opacity: 0.6 },
      { geo: mk(-34, 5.5, 0.8, 0.35, 2.2), color: "#8b9c8d", opacity: 0.45 },
    ];
  }, []);
  return (
    <>
      {ridges.map((r, i) => (
        <mesh key={i} geometry={r.geo}>
          <meshBasicMaterial color={r.color} transparent opacity={r.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Pines() {
  const trees = useMemo(
    () => [
      { x: -17, z: -8, s: 1.3 }, { x: 16, z: -11, s: 1.1 }, { x: -21, z: 4, s: 1.5 },
      { x: 20, z: 2, s: 1.2 }, { x: -13, z: -18, s: 1.0 }, { x: 13, z: -21, s: 1.4 },
    ],
    [],
  );
  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.09, 0.13, 1, 7]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[0.85, 1.6, 8]} />
            <meshStandardMaterial color="#40543d" />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <coneGeometry args={[0.6, 1.3, 8]} />
            <meshStandardMaterial color="#4a6044" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.03) * 5;
  });
  const clouds = useMemo(
    () => [
      { x: -22, y: 16, z: -42, s: 3.6 }, { x: 16, y: 19, z: -52, s: 4.4 }, { x: 2, y: 15, z: -36, s: 2.8 },
    ],
    [],
  );
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#fbf8ee" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.9, -0.15, 0]} scale={0.7}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#fbf8ee" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-0.9, -0.2, 0]} scale={0.65}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#fbf8ee" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 宗庙台基 ──
function Platform() {
  return (
    <group position={[0, 0, RACK_Z]}>
      <mesh position={[0, 0.09, 0.6]}>
        <boxGeometry args={[9.4, 0.18, 4.6]} />
        <meshStandardMaterial color="#c9bfa4" />
      </mesh>
      <mesh position={[0, 0.22, 0.4]}>
        <boxGeometry args={[8.2, 0.16, 3.6]} />
        <meshStandardMaterial color="#d4c9ac" />
      </mesh>
    </group>
  );
}

// ── 两侧立灯（宗庙氛围） ──
function Lanterns() {
  return (
    <>
      {[-4.6, 4.6].map((x) => (
        <group key={x} position={[x, 0.3, RACK_Z + 0.6]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 2.2, 8]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[0.42, 0.52, 0.42]} />
            <meshStandardMaterial color="#c0392b" emissive="#e8a34c" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <coneGeometry args={[0.36, 0.22, 4]} />
            <meshStandardMaterial color={LACQUER} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── 编钟架（簨簴）+ 五口甬钟 ──
function BellRack({ g }: { g: YueRefs }) {
  return (
    <group position={[0, 0.3, 0]}>
      {/* 立柱（髹漆） */}
      {[-3.5, 3.5].map((x) => (
        <group key={x} position={[x, 0, RACK_Z]}>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 3.8, 10]} />
            <meshStandardMaterial color={LACQUER} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.6, 0.24, 0.6]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          <mesh position={[0, 3.86, 0]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* 横梁（髹漆彩绘：朱梁金缘） */}
      <mesh position={[0, BEAM_Y, RACK_Z]}>
        <boxGeometry args={[7.4, 0.22, 0.26]} />
        <meshStandardMaterial color={LACQUER} />
      </mesh>
      <mesh position={[0, BEAM_Y + 0.13, RACK_Z]}>
        <boxGeometry args={[7.4, 0.05, 0.28]} />
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* 五口钟 */}
      {NOTES.map((note, i) => (
        <Bell key={note} g={g} note={note} idx={i} />
      ))}
    </group>
  );
}

function Bell({ g, note, idx }: { g: YueRefs; note: YueNote; idx: number }) {
  const tr = useGT();
  const s = BELL_SCALE[idx];
  const grp = useRef<THREE.Group>(null);
  const center = bellCenter(idx);

  // 乳钉纹（两圈六钉）
  const studs = useMemo(() => {
    const arr: { x: number; y: number; z: number }[] = [];
    for (const ry of [-0.18, 0.14]) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        arr.push({
          x: Math.cos(a) * 0.4 * s,
          y: ry * s,
          z: Math.sin(a) * 0.25 * s,
        });
      }
    }
    return arr;
  }, [s]);

  useFrame(() => {
    const el = grp.current;
    if (!el) return;
    // 击后悬摆（绕前后轴小角衰减振荡）；dt 为负（跨局时间戳残留）时不动
    const dt = g.now - g.bellT[note];
    el.rotation.x = dt >= 0 && dt < 2.5 ? 0.1 * Math.exp(-2.6 * dt) * Math.sin(11 * dt) : 0;
  });

  return (
    <group position={[center.x, center.y, center.z]}>
      {/* 挂索 */}
      <mesh position={[0, (BEAM_Y - center.y) / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, BEAM_Y - center.y - 0.1, 6]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <group ref={grp} onPointerDown={(e) => { e.stopPropagation(); g.onStrike.current(note); }}>
        {/* 甬柄 */}
        <mesh position={[0, (1.05 * s) / 2 + 0.1, 0]}>
          <cylinderGeometry args={[0.07 * s, 0.09 * s, 0.24, 8]} />
          <meshStandardMaterial color={BRONZE_DARK} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* 钟体（合瓦扁形：上大下小锥台 + 压扁） */}
        <mesh scale={[1, 1, 0.62]}>
          <cylinderGeometry args={[0.3 * s, 0.46 * s, 1.05 * s, 18]} />
          <meshStandardMaterial color={BRONZE} metalness={0.28} roughness={0.48} />
        </mesh>
        {/* 钟口沿（水平环） */}
        <mesh position={[0, -(1.05 * s) / 2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
          <torusGeometry args={[0.46 * s, 0.035 * s, 8, 18]} />
          <meshStandardMaterial color={BRONZE_DARK} metalness={0.3} roughness={0.45} />
        </mesh>
        {/* 乳钉 */}
        {studs.map((p, i) => (
          <mesh key={i} position={[p.x, p.y, p.z]} scale={[1, 1, 1.4]}>
            <sphereGeometry args={[0.038 * s, 8, 6]} />
            <meshStandardMaterial color={BRONZE_DARK} metalness={0.3} roughness={0.45} />
          </mesh>
        ))}
        {/* 腰箍 */}
        <mesh scale={[1, 1, 0.62]}>
          <cylinderGeometry args={[0.385 * s, 0.39 * s, 0.07 * s, 18]} />
          <meshStandardMaterial color={BRONZE_DARK} metalness={0.32} roughness={0.42} />
        </mesh>
      </group>
      {/* 名牌（梁上） */}
      <Label
        lines={[{ text: tr(NOTE_NAME[note]), size: 150, color: "#2b2925", bold: true }]}
        position={[0, BEAM_Y - center.y + 0.58, 0]}
        width={1.0}
      />
    </group>
  );
}

// ── 悬浮木槌（指向当前钟，击时挥下） ──
function Hammer({ g }: { g: YueRefs }) {
  const grp = useRef<THREE.Group>(null);
  const swing = useRef<THREE.Group>(null);
  const pos = useMemo(() => new THREE.Vector3(0, 4.3, RACK_Z + 1.7), []);
  useFrame((state, dtRaw) => {
    const el = grp.current;
    if (!el) return;
    const dt = Math.min(0.05, dtRaw);
    const c = bellCenter(g.hammerIdx);
    pos.x += (c.x - pos.x) * Math.min(1, dt * 5);
    pos.y = 4.3 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
    el.position.copy(pos);
    // 挥槌：击后 0.28s 一个来回
    if (swing.current) {
      const d = g.now - g.hammerT;
      swing.current.rotation.x = d >= 0 && d < 0.6 ? -Math.sin(Math.min(1, d / 0.28) * Math.PI) * 0.85 : 0;
    }
  });
  return (
    <group ref={grp} position={[0, 4.3, RACK_Z + 1.7]}>
      <group ref={swing}>
        {/* 槌柄（斜持） */}
        <mesh position={[0, -0.34, 0]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 1.05, 8]} />
          <meshStandardMaterial color="#8a6a3f" />
        </mesh>
        {/* 槌头 */}
        <mesh position={[0, -0.8, 0.26]} scale={[1, 1, 1.3]}>
          <sphereGeometry args={[0.17, 12, 10]} />
          <meshStandardMaterial color="#a8865a" />
        </mesh>
      </group>
    </group>
  );
}

// ── 金色涟漪光圈（击钟处扩散） ──
function Ripples({ g }: { g: YueRefs }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(() => {
    // 清理过期（含跨局残留：时钟重计后 t0 比 now 大，d 为负也清掉）
    while (g.ripples.length > 0) {
      const dd = g.now - g.ripples[0].t0;
      if (dd > 1.1 || dd < 0) g.ripples.shift(); else break;
    }
    for (let i = 0; i < 8; i++) {
      const m = refs.current[i];
      const mat = matRefs.current[i];
      if (!m || !mat) continue;
      const r = g.ripples[i];
      if (!r) { m.visible = false; continue; }
      const d = g.now - r.t0;
      const p = d / 1.0; // 1s 扩散
      const c = bellCenter(r.idx);
      m.visible = p >= 0 && p <= 1;
      m.position.set(c.x, c.y + 0.3, c.z + 0.42);
      const sc = 0.4 + p * 1.7;
      m.scale.set(sc, sc, 1);
      mat.opacity = 0.75 * (1 - p);
    }
  });
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <ringGeometry args={[0.82, 1.0, 40]} />
          <meshBasicMaterial
            ref={(el) => { matRefs.current[i] = el; }}
            color={GOLD} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ── 相生光弧（顺生青色 / 逆跳暗红，两钟之间） ──
function ShengArcView({ g }: { g: YueRefs }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const built = useRef<{ from: number; to: number; t0: number } | null>(null);

  useFrame(() => {
    const m = meshRef.current;
    const mat = matRef.current;
    if (!m || !mat) return;
    const arc = g.arc;
    const arcAge = arc ? g.now - arc.t0 : -1;
    if (!arc || arcAge > 1.6 || arcAge < 0) {
      m.visible = false;
      return;
    }
    // 同一事件只重建一次几何
    if (!built.current || built.current.from !== arc.from || built.current.to !== arc.to || built.current.t0 !== arc.t0) {
      built.current = { ...arc };
      const a = bellCenter(arc.from);
      const b = bellCenter(arc.to);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 1.15;
      mid.z += 0.55;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const geo = new THREE.TubeGeometry(curve, 24, 0.045, 6, false);
      m.geometry.dispose();
      m.geometry = geo;
      mat.color.set(arc.kind === "sheng" ? SHENG_COLOR : REVERSE_COLOR);
    }
    const d = g.now - arc.t0;
    m.visible = true;
    mat.opacity = (arc.kind === "sheng" ? 0.85 : 0.55) * Math.max(0, 1 - d / 1.6);
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <bufferGeometry />
      <meshBasicMaterial ref={matRef} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

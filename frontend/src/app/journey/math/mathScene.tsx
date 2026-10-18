"use client";

/** 数艺·量仓分赈 3D — React Three Fiber 场景
 *
 * 与御艺同风格：宣纸天光 + 淡墨远山 + 田野松柏。
 * 中央官仓（圆仓 + 茅草锥顶，仓内粮堆锥体随剩余量缩小），
 * 前方弧形排开 3-5 个村落（茅草屋），每村前一具斗斛（开口方箱），
 * 内部填充块随分配量长高；村名与指标用 CanvasTexture sprite 标签。
 *
 * 游戏数值由 mathEngine 在根 useFrame 推进（存 MathRefs，不走 React 渲染）。
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MathScenarioBrief } from "@/lib/types";
import {
  createEngine,
  pourStep,
  remaining,
  scoopStep,
  type MathEngineState,
} from "./mathEngine";
import * as sfx from "./mathAudio";

// ── 共享可变状态 ──
export interface MathRefs {
  running: boolean;
  engine: MathEngineState | null;
  input: { pour: boolean; scoop: boolean };
}

export function createMathRefs(): MathRefs {
  return { running: false, engine: null, input: { pour: false, scoop: false } };
}

export { createEngine };

// ── 场景常量（与御场景同一宣纸色调） ──
const SKY = "#f1ead7";
const FOG = "#ece4cd";
const GOLD = "#d9a521";
const GRAIN = "#ddb45e";
const THATCH = "#a8894f";
const WOOD = "#7a5c36";
const GRANARY = { x: 0, z: -5 };
const ARC_R = 9.6; // 村落弧半径

export const KIND_COLOR: Record<string, string> = {
  junshu: "#1E5F8E", // 均输 · 青
  cuifen: "#993C1D", // 衰分 · 赭
};

/** 村落弧张角：固定角间距，村越多弧越开（名签不互相挤压） */
function arcSpread(n: number): number {
  return Math.min(1.55, 0.38 * (n - 1));
}

/** 第 i 村的世界位置（以官仓为圆心的前弧） */
function villagePos(n: number, i: number): { x: number; z: number; angle: number } {
  const spread = arcSpread(n);
  const a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
  return { x: Math.sin(a) * ARC_R, z: GRANARY.z + Math.cos(a) * ARC_R, angle: a };
}

/** 斗斛位置：村与官仓之间，靠近村 */
function containerPos(n: number, i: number): { x: number; z: number } {
  const v = villagePos(n, i);
  const dx = v.x - GRANARY.x;
  const dz = v.z - GRANARY.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: v.x - (dx / len) * 1.75, z: v.z - (dz / len) * 1.75 };
}

/** 仓口（粒子起点） */
const SPOUT = new THREE.Vector3(0, 2.15, GRANARY.z + 1.9);

// ── 文字标签（CanvasTexture sprite，跟随 yuScene 不引 drei） ──
interface LabelLine { text: string; size: number; color: string; bold?: boolean }

function makeLabelTexture(lines: LabelLine[], pad = 18): THREE.CanvasTexture {
  const W = 512;
  const lineH = (l: LabelLine) => l.size + 14;
  const H = lines.reduce((s, l) => s + lineH(l), 0) + pad * 2;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  // 宣纸底
  ctx.fillStyle = "rgba(250,246,232,0.92)";
  const r = 26;
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, r);
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

/** 静态标签（村名 + 指标） */
function Label({ lines, position, width = 2.3 }: {
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

/** 动态分量标签（每帧读 engine，整数值变化才重绘 canvas） */
function AmountLabel({ g, idx, position }: { g: MathRefs; idx: number; position: [number, number, number] }) {
  const pack = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 320;
    cv.height = 150;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, tex, last: "" };
  }, []);
  useFrame(() => {
    const st = g.engine;
    if (!st) return;
    const it = st.scenario.items[idx];
    if (!it) return;
    const v = st.allocations[it.name] ?? 0;
    const pct = Math.round((v / st.scenario.total) * 100);
    const key = `${Math.round(v)}|${pct}|${st.selected === idx}`;
    if (key === pack.last) return;
    pack.last = key;
    const ctx = pack.cv.getContext("2d")!;
    ctx.clearRect(0, 0, 320, 150);
    ctx.fillStyle = st.selected === idx ? "rgba(251,243,220,0.96)" : "rgba(250,246,232,0.85)";
    ctx.beginPath();
    ctx.roundRect(6, 6, 308, 138, 22);
    ctx.fill();
    ctx.strokeStyle = st.selected === idx ? GOLD : "rgba(120,96,54,0.45)";
    ctx.lineWidth = st.selected === idx ? 6 : 3;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 58px "Songti SC", "STSong", "SimSun", serif`;
    ctx.fillStyle = "#2b2925";
    ctx.fillText(`${Math.round(v)} ${st.scenario.unit}`, 160, 58);
    ctx.font = `400 36px "Songti SC", "STSong", "SimSun", serif`;
    ctx.fillStyle = "#6b6046";
    ctx.fillText(`${pct}%`, 160, 116);
    pack.tex.needsUpdate = true;
  });
  return (
    <sprite position={position} scale={[1.5, 0.7, 1]} renderOrder={10}>
      <spriteMaterial map={pack.tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

// ── 场景根 ──
export function MathScene({ g }: { g: MathRefs }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 5.4, 10.6));
  const camLook = useRef(new THREE.Vector3(0, 1.2, -2.5));
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const posTarget = useMemo(() => new THREE.Vector3(), []);
  const wasRunning = useRef(false);

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const st = g.engine;

    // 引擎推进：出粮 / 回粮
    if (g.running && st) {
      let flowing: "pour" | "scoop" | null = null;
      if (g.input.pour && pourStep(st, dt) > 0) flowing = "pour";
      else if (g.input.scoop && scoopStep(st, dt) > 0) flowing = "scoop";
      st.flowing = flowing;
      sfx.setPouring(flowing !== null, flowing ?? "pour");
    } else {
      sfx.setPouring(false);
    }
    if (wasRunning.current !== g.running) wasRunning.current = g.running;

    // 相机：默认视角覆盖整条村弧 + 官仓，随村数拉远/升高/加大 FOV；
    // 选中村时只轻度偏向该村（不贴脸），保证其余村仍在画面内
    const n = st?.scenario.items.length ?? 3;
    const back = Math.max(0, n - 3); // 0..2
    const camY = 4.9 + back * 0.85;
    const camZ = 9.4 + back * 2.4;
    const sel = st?.selected ?? 0;
    const cv = containerPos(n, sel);
    posTarget.set(cv.x * 0.32, camY, camZ);
    lookTarget.set(cv.x * 0.42, 0.9, cv.z * 0.45 - 1.9);
    const k = Math.min(1, dt * 3.4);
    camPos.current.lerp(posTarget, k);
    camLook.current.lerp(lookTarget, Math.min(1, dt * 4));
    // 微浮动（呼吸感）
    camera.position.set(
      camPos.current.x,
      camPos.current.y + Math.sin(state.clock.elapsedTime * 0.8) * 0.05,
      camPos.current.z,
    );
    camera.lookAt(camLook.current);
    // FOV 随村数加宽
    const cam = camera as THREE.PerspectiveCamera;
    const fovT = 55 + back * 5.5;
    if (Math.abs(cam.fov - fovT) > 0.05) {
      cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }
  });

  const sc = g.engine?.scenario ?? null;

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
      <Granary g={g} />
      {sc && <Villages g={g} scenario={sc} />}
      {sc && <PourParticles g={g} />}
    </>
  );
}

// ── 环境（与御场景同款） ──
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

// ── 官仓：圆仓 + 茅草锥顶 + 粮堆（随剩余量缩小） ──
function Granary({ g }: { g: MathRefs }) {
  const grainRef = useRef<THREE.Mesh>(null);
  const grainMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const st = g.engine;
    if (!st || !grainRef.current) return;
    const ratio = Math.max(0.0, remaining(st) / st.scenario.total);
    const h = Math.max(0.02, Math.cbrt(ratio)); // 体积比例 → 高度
    grainRef.current.scale.set(Math.max(0.02, Math.sqrt(ratio)), h, Math.max(0.02, Math.sqrt(ratio)));
    grainRef.current.visible = ratio > 0.002;
    if (grainMat.current) grainMat.current.emissiveIntensity = 0.06 + ratio * 0.05;
  });
  return (
    <group position={[GRANARY.x, 0, GRANARY.z]}>
      {/* 台基 */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[2.6, 2.9, 0.28, 24]} />
        <meshStandardMaterial color="#bfae87" />
      </mesh>
      {/* 仓壁（圆仓） */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[1.75, 1.85, 1.4, 24]} />
        <meshStandardMaterial color="#c9a86b" />
      </mesh>
      {/* 壁箍 */}
      {[0.55, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[1.83, 0.05, 8, 32]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      {/* 粮堆锥体（随剩余量缩放） */}
      <mesh ref={grainRef} position={[0, 1.65, 0]}>
        <coneGeometry args={[1.45, 2.2, 20]} />
        <meshStandardMaterial ref={grainMat} color={GRAIN} emissive={GRAIN} emissiveIntensity={0.08} roughness={0.9} />
      </mesh>
      {/* 支柱 + 茅草锥顶 */}
      {[[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 2.3, z]}>
          <cylinderGeometry args={[0.07, 0.09, 2.2, 8]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      <mesh position={[0, 4.05, 0]}>
        <coneGeometry args={[2.5, 1.5, 20]} />
        <meshStandardMaterial color={THATCH} />
      </mesh>
      <mesh position={[0, 4.9, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* 仓口斜槽 */}
      <mesh position={[0, 1.95, 1.65]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[0.5, 0.14, 1.1]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {/* 仓前粮袋装饰 */}
      {[[-2.6, 1.2], [-3.1, 0.5], [2.7, 1.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.32, z]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[0.42, 12, 10]} />
          <meshStandardMaterial color="#c9b18a" />
        </mesh>
      ))}
    </group>
  );
}

// ── 村落群 ──
function Villages({ g, scenario }: { g: MathRefs; scenario: MathScenarioBrief }) {
  return (
    <>
      {scenario.items.map((it, i) => (
        <Village key={it.name} g={g} scenario={scenario} idx={i} />
      ))}
    </>
  );
}

function Village({ g, scenario, idx }: { g: MathRefs; scenario: MathScenarioBrief; idx: number }) {
  const it = scenario.items[idx];
  const n = scenario.items.length;
  const v = villagePos(n, idx);
  const cp = containerPos(n, idx);
  const kindColor = KIND_COLOR[scenario.kind] ?? "#2b2925";

  const fillRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const flagRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const st = g.engine;
    if (!st) return;
    const alloc = st.allocations[it.name] ?? 0;
    // 斗内填充块随分量长高
    if (fillRef.current) {
      const h = Math.max(0.001, Math.min(1, alloc / scenario.total));
      fillRef.current.scale.y = h;
      fillRef.current.position.y = 0.06 + (1.0 * h) / 2;
    }
    // 选中高亮圈 + 旗帜
    const sel = st.selected === idx;
    if (ringRef.current) {
      ringRef.current.visible = sel;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      ringRef.current.scale.set(pulse, pulse, 1);
    }
    if (ringMat.current) {
      ringMat.current.opacity = sel ? 0.75 + Math.sin(state.clock.elapsedTime * 4) * 0.2 : 0;
    }
    if (flagRef.current) {
      flagRef.current.visible = sel;
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.18;
    }
  });

  const labelLines: LabelLine[] = [
    { text: it.name, size: 64, color: "#2b2925", bold: true },
    { text: it.attrs, size: 40, color: "#5c5340" },
  ];

  return (
    <group>
      {/* 茅草屋 */}
      <group position={[v.x, 0, v.z]} rotation={[0, -v.angle, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.5, 1.1, 1.3]} />
          <meshStandardMaterial color="#d8c8a2" />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.35, 0.95, 4]} />
          <meshStandardMaterial color={THATCH} />
        </mesh>
        <mesh position={[0, 0.42, 0.66]}>
          <boxGeometry args={[0.42, 0.7, 0.04]} />
          <meshStandardMaterial color="#6b4a2e" />
        </mesh>
        {/* 炊烟 */}
        <mesh position={[0.4, 2.3, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial color="#f4efe0" transparent opacity={0.5} />
        </mesh>
        {/* 村名 + 指标标签 */}
        <Label lines={labelLines} position={[0, 3.45, 0]} />
      </group>

      {/* 斗斛（开口方箱） */}
      <group position={[cp.x, 0, cp.z]}>
        {/* 底 */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.25, 0.1, 1.25]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
        {/* 四壁 */}
        {[
          { p: [0, 0.56, 0.6] as const, s: [1.25, 1.02, 0.08] as const },
          { p: [0, 0.56, -0.6] as const, s: [1.25, 1.02, 0.08] as const },
          { p: [0.6, 0.56, 0] as const, s: [0.08, 1.02, 1.08] as const },
          { p: [-0.6, 0.56, 0] as const, s: [0.08, 1.02, 1.08] as const },
        ].map((w, i) => (
          <mesh key={i} position={[w.p[0], w.p[1], w.p[2]]}>
            <boxGeometry args={[w.s[0], w.s[1], w.s[2]]} />
            <meshStandardMaterial color={i % 2 ? "#8a6a3f" : "#96764a"} />
          </mesh>
        ))}
        {/* 填充粮块（随分量长高） */}
        <mesh ref={fillRef} position={[0, 0.06, 0]} scale={[1, 0.001, 1]}>
          <boxGeometry args={[1.02, 1.0, 1.02]} />
          <meshStandardMaterial color={GRAIN} roughness={0.9} />
        </mesh>
        {/* 选中高亮圈 */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} visible={false}>
          <ringGeometry args={[1.05, 1.3, 36]} />
          <meshBasicMaterial ref={ringMat} color={GOLD} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        {/* 选中旗帜（kind 着色） */}
        <group ref={flagRef} position={[0.85, 0, 0.85]} visible={false}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.8, 6]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          <mesh position={[0.32, 1.5, 0]}>
            <boxGeometry args={[0.6, 0.36, 0.03]} />
            <meshStandardMaterial color={kindColor} />
          </mesh>
        </group>
        {/* 分量标签 */}
        <AmountLabel g={g} idx={idx} position={[0, 2.0, 0]} />
      </group>
    </group>
  );
}

// ── 倾倒粒子流（仓口 → 选中斗斛的球串） ──
const PARTICLES = 16;

function PourParticles({ g }: { g: MathRefs }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const st = g.engine;
    const flowing = g.running && st && st.flowing;
    const n = st?.scenario.items.length ?? 3;
    const cp = containerPos(n, st?.selected ?? 0);
    target.set(cp.x, 1.2, cp.z);
    mid.set((SPOUT.x + target.x) / 2, Math.max(SPOUT.y, target.y) + 1.4, (SPOUT.z + target.z) / 2);
    for (let i = 0; i < PARTICLES; i++) {
      const m = refs.current[i];
      if (!m) continue;
      if (!flowing || !st) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const speed = 1.6;
      let t = (state.clock.elapsedTime * speed + i / PARTICLES) % 1;
      if (st.flowing === "scoop") t = 1 - t; // 回粮：粒子反向流回仓口
      // 二次贝塞尔：仓口 → 空中弧线 → 斗斛
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      m.position.set(
        a * SPOUT.x + b * mid.x + c * target.x,
        a * SPOUT.y + b * mid.y + c * target.y,
        a * SPOUT.z + b * mid.z + c * target.z,
      );
      const s = 0.75 + Math.sin(i * 2.1) * 0.25;
      m.scale.set(s, s, s);
    }
  });

  return (
    <>
      {Array.from({ length: PARTICLES }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshStandardMaterial color={GRAIN} emissive={GRAIN} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </>
  );
}

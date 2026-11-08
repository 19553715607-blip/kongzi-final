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
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { InkWorld, InkMat, AutoCastShadow } from "@/components/three/inkwash";
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
const GOLD = "#d9a521";
const BRONZE = "#a8905a";
const BRONZE_DARK = "#8a7448";
const BRONZE_DEEP = "#755d2b"; // 甬/钉/箍等深黄铜强调件
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
  return new THREE.Vector3(BELL_X[idx], BEAM_Y - 0.5 - (1.4 * s) / 2, RACK_Z);
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
      <InkWorld
        fogRange={[38, 130]}
        groundSize={[110, 90]}
        groundPosition={[0, 0, -2]}
        mountains={[
          { z: -58, hBase: 12, f1: 0.9, f2: 0.31, phase: 1.2, color: "#93a495", opacity: 0.5, span: 220 },
          { z: -46, hBase: 8.5, f1: 1.1, f2: 0.4, phase: 4.1, color: "#849a8c", opacity: 0.6, span: 220 },
          { z: -34, hBase: 5.5, f1: 0.8, f2: 0.35, phase: 2.2, color: "#8b9c8d", opacity: 0.45, span: 220 },
        ]}
        pines={[
          { x: -17, z: -8, s: 1.3 }, { x: 16, z: -11, s: 1.1 }, { x: -21, z: 4, s: 1.5 },
          { x: 20, z: 2, s: 1.2 }, { x: -13, z: -18, s: 1.0 }, { x: 13, z: -21, s: 1.4 },
        ]}
        clouds={[
          { x: -22, y: 16, z: -42, s: 3.6 }, { x: 16, y: 19, z: -52, s: 4.4 }, { x: 2, y: 15, z: -36, s: 2.8 },
        ]}
        sun={{ focus: [0, 1.2, -4], size: 24, offset: [14, 20, 9] }}
      >
        <AutoCastShadow />
        <Fields />
      </InkWorld>
      <Platform />
      <Lanterns />
      <BellRack g={g} />
      <Hammer g={g} />
      <Ripples g={g} />
      <ShengArcView g={g} />
    </>
  );
}

/** 田野色块 */
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
          <InkMat color={s.c} />
        </mesh>
      ))}
    </>
  );
}

// ── 宗庙台基 ──
function Platform() {
  return (
    <group position={[0, 0, RACK_Z]}>
      <mesh position={[0, 0.09, 0.6]}>
        <boxGeometry args={[9.4, 0.18, 4.6]} />
        <InkMat color="#c9bfa4" />
      </mesh>
      <mesh position={[0, 0.22, 0.4]}>
        <boxGeometry args={[8.2, 0.16, 3.6]} />
        <InkMat color="#d4c9ac" />
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
            <InkMat color={WOOD} grain="wood" repeat={[2, 1]} />
          </mesh>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[0.42, 0.52, 0.42]} />
            <meshStandardMaterial color="#c0392b" emissive="#e8a34c" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <coneGeometry args={[0.36, 0.22, 4]} />
            <InkMat color={LACQUER} grain="lacquer" repeat={[2, 2]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── 编钟架（簨簴）+ 五口甬钟 ──
function BellRack({ g }: { g: YueRefs }) {
  const woodCol = useMemo(() => rackWoodTexture(false), []);
  const woodBeam = useMemo(() => rackWoodTexture(true), []);
  return (
    <group position={[0, 0.3, 0]}>
      {/* 立柱（髹漆） */}
      {[-3.5, 3.5].map((x) => (
        <group key={x} position={[x, 0, RACK_Z]}>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 3.8, 10]} />
            <meshStandardMaterial map={woodCol} roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.6, 0.24, 0.6]} />
            <meshStandardMaterial map={woodCol} color="#d8c3a0" roughness={0.75} />
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
        <meshStandardMaterial map={woodBeam} roughness={0.72} />
      </mesh>
      <mesh position={[0, BEAM_Y + 0.13, RACK_Z]}>
        <boxGeometry args={[7.4, 0.05, 0.28]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* 五口钟 */}
      {NOTES.map((note, i) => (
        <Bell key={note} g={g} note={note} idx={i} />
      ))}
    </group>
  );
}

/** 真实铭文（曾侯乙编钟格式）：律名+音名（姑洗之宫式）与作器者，错金竖排 */
const INSCRIPTION: Record<YueNote, [string, string]> = {
  gong: ["姑洗之宫", "曾侯乙"],
  shang: ["姑洗之商", "曾侯乙"],
  jue: ["姑洗之角", "曾侯乙"],
  zhi: ["姑洗之徵", "曾侯乙"],
  yu: ["姑洗之羽", "曾侯乙"],
};

/** 钟体贴图：青铜底 + 铜绿斑 + 错金铭文（两面各一组竖排） */
/** 青铜斑驳斑块: dark 锈暗 / patina 铜绿 / wear 磨亮, 同源坐标喂三张贴图保持对齐 */
/** 簨簴木质贴图: 竖向年轮纹+节疤+板色带, 固定种子; rot=true 供横梁横向用 */
function rackWoodTexture(rot = false): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const rnd = bellRng(11);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#755431");
  g.addColorStop(1, "#66472a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 宽板色带(竖向软带, 分板感)
  for (let i = 0; i < 6; i++) {
    const x = rnd() * W;
    const w = 30 + rnd() * 70;
    const bg = ctx.createLinearGradient(x, 0, x + w, 0);
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(0.5, i % 2 === 0 ? "rgba(64,42,20,0.10)" : "rgba(150,108,60,0.09)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(x, 0, w, H);
  }
  // 竖向年轮纹: 波浪细线, 明暗相间
  for (let i = 0; i < 90; i++) {
    const x0 = rnd() * W;
    const ph = rnd() * Math.PI * 2;
    const amp = 2 + rnd() * 5;
    const dark = rnd() < 0.55;
    ctx.strokeStyle = dark
      ? `rgba(58,38,18,${(0.14 + rnd() * 0.14).toFixed(3)})`
      : `rgba(146,106,60,${(0.1 + rnd() * 0.12).toFixed(3)})`;
    ctx.lineWidth = 1.2 + rnd() * 2.6;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const x = x0 + Math.sin(ph + (y / H) * Math.PI * 2) * amp;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 节疤(深芯+亮环)
  for (let i = 0; i < 6; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.fillStyle = `rgba(52,34,16,${(0.18 + rnd() * 0.12).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rnd() * 6, 7 + rnd() * 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(150,110,62,${(0.14 + rnd() * 0.08).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + rnd() * 7, 10 + rnd() * 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 细碎木屑点
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(60,40,20,0.06)" : "rgba(160,120,70,0.05)";
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (rot) {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2; // 横梁: 纹理转向水平
    tex.repeat.set(2, 1);
  } else {
    tex.repeat.set(1, 2); // 柱: 竖纹拉密
  }
  return tex;
}

/** 固定种子伪随机(mulberry32): 五口钟共用同源斑驳, 质感统一 */
function bellRng(seed = 7) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let ta = a;
    ta = Math.imul(ta ^ (ta >>> 15), ta | 1);
    ta ^= ta + Math.imul(ta ^ (ta >>> 7), ta | 61);
    return ((ta ^ (ta >>> 14)) >>> 0) / 4294967296;
  };
}

/** 钟体贴图：抛光青铜(馆展级) — 铸层软带+竖向拭痕+错金铭文带，干净温润不脏不塑料 */
function bellSkin(note: YueNote): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const rnd = bellRng(7); // 同源随机: 五钟纹理一致, 仅铭文随音名变化
  const W = 1024;
  const H = 512;
  const mk = () => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    return cv.getContext("2d")!;
  };
  const ca = mk(); // 颜色
  const cr = mk(); // 粗糙度
  // 底色：温润青铜纵向渐变
  const g = ca.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#b2914e");
  g.addColorStop(0.55, "#a0803f");
  g.addColorStop(1, "#83672f");
  ca.fillStyle = g;
  ca.fillRect(0, 0, W, H);
  // 铸层带：4 条超宽软横带，极低对比，给大面层次而非噪点
  for (let i = 0; i < 4; i++) {
    const y = H * (0.1 + i * 0.22) + rnd() * 18;
    const h = H * (0.1 + rnd() * 0.08);
    const bg = ca.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(0.5, i % 2 === 0 ? "rgba(78,58,22,0.08)" : "rgba(226,196,126,0.06)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ca.fillStyle = bg;
    ca.fillRect(0, y, W, h);
  }
  // 竖向拭痕：跟随钟形的抛光痕迹(细长条, 极低透明度)
  for (let i = 0; i < 42; i++) {
    const x = rnd() * W;
    const w = 2 + rnd() * 4;
    const h = 60 + rnd() * 240;
    const y = rnd() * (H - h);
    ca.fillStyle = rnd() < 0.5 ? "rgba(206,212,164,0.05)" : "rgba(44,52,32,0.05)";
    ca.fillRect(x, y, w, h);
  }
  // 粗糙度：抛光基准 + 少量大块柔变(反射缓变, 无颗粒)
  cr.fillStyle = "#b4"; // 0.71 哑光基准
  cr.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 90 + rnd() * 140;
    const v = rnd() < 0.5 ? 86 : 52; // 局部更哑/更亮
    cr.save();
    cr.translate(x, y);
    cr.scale(1, 0.6);
    const rg = cr.createRadialGradient(0, 0, 0, 0, 0, r);
    rg.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    cr.fillStyle = rg;
    cr.beginPath();
    cr.arc(0, 0, r, 0, Math.PI * 2);
    cr.fill();
    cr.restore();
  }
  // 铭文带：鼓部深色带内错金双列竖排（右起, 传统钟铭行款）, 金线镶边
  const lines = INSCRIPTION[note];
  const bandY = H * 0.5;
  const bandH = H * 0.3;
  ca.textAlign = "center";
  ca.textBaseline = "middle";
  for (const face of [{ cx: W * 0.25, col: lines[0] }, { cx: W * 0.75, col: lines[1] }]) {
    ca.fillStyle = "rgba(40,31,13,0.78)";
    ca.fillRect(face.cx - 78, bandY, 156, bandH);
    ca.fillStyle = "#caa245";
    ca.fillRect(face.cx - 78, bandY, 156, 3);
    ca.fillRect(face.cx - 78, bandY + bandH - 3, 156, 3);
    ca.font = `${60}px "Kaiti SC", "STKaiti", "KaiTi", serif`;
    const cols = [face.col.slice(0, 2).split(""), face.col.slice(2).split("")]; // 右列前两字, 左列余字
    cols.forEach((chars, ci) => {
      const x = face.cx + (ci === 0 ? 34 : -34);
      chars.forEach((ch, ri) => {
        const y = bandY + bandH / 2 - 34 + ri * 72;
        ca.fillStyle = "rgba(30,22,8,0.9)";
        ca.fillText(ch, x + 3, y + 3);
        ca.fillStyle = "#f6d06a";
        ca.fillText(ch, x, y);
      });
    });
  }
  const map = new THREE.CanvasTexture(ca.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(cr.canvas);
  return { map, roughnessMap };
}

function Bell({ g, note, idx }: { g: YueRefs; note: YueNote; idx: number }) {
  const tr = useGT();
  const s = BELL_SCALE[idx];
  const grp = useRef<THREE.Group>(null);
  const center = bellCenter(idx);
  const skin = useMemo(() => bellSkin(note), [note]);

  const ropeH = BEAM_Y - 0.11 - (center.y + 0.8 * s); // 挂索: 梁底→甬上旋环
  // Blender 建模 GLB(合瓦形+曲于口+甬旋衡+枚+篆带), 材质按名覆写
  const { scene: bellGlb } = useGLTF("/models/sixarts/bianzhong.glb", false, true);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ map: skin.map, roughnessMap: skin.roughnessMap, metalness: 0.25, roughness: 1, envMapIntensity: 0.25, side: THREE.DoubleSide }), [skin]);
  const deepMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BRONZE_DEEP, metalness: 0.3, roughness: 0.75, envMapIntensity: 0.25 }), []);
  const model = useMemo(() => {
    const c = bellGlb.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const src = m.material as THREE.MeshStandardMaterial;
      m.material = src.name === "bronze_body" ? bodyMat : deepMat;
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return c;
  }, [bellGlb, bodyMat, deepMat]);

  useFrame(() => {
    const el = grp.current;
    if (!el) return;
    // 击后悬摆（绕前后轴小角衰减振荡）；dt 为负（跨局时间戳残留）时不动
    const dt = g.now - g.bellT[note];
    el.rotation.x = dt >= 0 && dt < 2.5 ? 0.1 * Math.exp(-2.6 * dt) * Math.sin(11 * dt) : 0;
  });

  return (
    <group position={[center.x, center.y, center.z]}>
      {/* 挂索（梁底→甬上旋环） */}
      <mesh position={[0, BEAM_Y - 0.11 - center.y - ropeH / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, ropeH, 6]} />
        <InkMat color={WOOD} grain="wood" repeat={[2, 1]} />
      </mesh>
      <group ref={grp} onPointerDown={(e) => { e.stopPropagation(); g.onStrike.current(note); }}>
        {/* 钟体(Blender 建模): 甬/旋/衡+钟身(空心壁)+枚+篆带 */}
        <Suspense fallback={null}>
          <primitive object={model} scale={s} position={[0, -0.7 * s, 0]} />
        </Suspense>
      </group>
      {/* 名牌（钟顶上方） */}
      <Label
        lines={[{ text: tr(NOTE_NAME[note]), size: 150, color: "#2b2925", bold: true }]}
        position={[0, 0.7 * s + 0.16, 0]}
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
          <InkMat color="#8a6a3f" />
        </mesh>
        {/* 槌头 */}
        <mesh position={[0, -0.8, 0.26]} scale={[1, 1, 1.3]}>
          <sphereGeometry args={[0.17, 12, 10]} />
          <InkMat color="#a8865a" />
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

/**
 * 礼 · 宾主雅集场景与深衣袍服人偶
 *
 * 家族统一视觉（与 御/数/乐/书 同一宣纸天光）：
 *   宣纸天光 + 淡墨远山 + 田野松柏 + 缓慢流云；
 *   雅集院落：石板径、层次草地、竹丛、石灯笼、院墙门楼；
 *   主厅为带坡顶檐角的敞轩（朱柱、瓦顶、匾额、后屏）。
 * 人偶：深衣交领宽袖、腰绦、冠/帻按尊卑（贵宾高冠、长者帻、平辈小冠、幼辈总角）。
 *
 * 交互锚点（guestWorldPos/seatWorldPos/WORLD）与低模版完全一致，玩法逻辑不动。
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { RANK_META, type Rank } from "./liHostData";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";

export const PAL = {
  skyTop: "#f1ead7", // 页头渐变沿用（Li3DGame）
  skyBot: "#ece4cd",
  fog: "#ece4cd",
  grass: "#b3c091",
  grassLight: "#c0cd9a",
  stone: "#cfc6ae",
  stoneDark: "#b8ad92",
  wood: "#5a3b1d",
  pillar: "#9c3a24", // 朱柱
  lacquer: "#6b2420", // 髹漆梁
  roof: "#55635c", // 瓦
  roofDark: "#46534c",
  paper: "#f2ebe0",
  mat: "#c9b896",
  matEdge: "#9a7f5c",
  skin: "#d9b48f",
  hostRobe: "#3d4f6a", // 主人袍色（liHostPlayer 沿用）
  bronze: "#8a7448",
  gold: "#d9a521",
  glow: "#f0c878",
  trim: "#993C1D",
} as const;

export const WORLD = {
  minX: -5.2,
  maxX: 5.2,
  minZ: -8.2,
  maxZ: 2.2,
  interactRadius: 1.55,
  seatRadius: 1.25,
} as const;

const SEAT_ANGLES = [-0.8, -0.25, 0.25, 0.8];

export function guestWorldPos(
  index: number,
  total: number,
  seatIdx: number | null,
  seated: boolean,
): THREE.Vector3 {
  if (seated && seatIdx != null) {
    const a = SEAT_ANGLES[seatIdx] ?? 0;
    return new THREE.Vector3(Math.sin(a) * 2.6, 0, -4.2 + Math.cos(a) * 1.1);
  }
  const spread = (index - (total - 1) / 2) * 1.5;
  return new THREE.Vector3(spread, 0, -6.2);
}

export function seatWorldPos(idx: number): THREE.Vector3 {
  const a = SEAT_ANGLES[idx] ?? 0;
  return new THREE.Vector3(Math.sin(a) * 2.6, 0, -4.2 + Math.cos(a) * 1.1);
}

// ── CanvasTexture 文字（匾额 / 宾客名签，沿用乐场景写法） ──

function makePlaqueTexture(title: string): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 160;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 160);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 92px "Songti SC", "STKaiti", "KaiTi", serif`;
  ctx.fillStyle = "#e8c96a";
  ctx.fillText(title, 256, 84);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeNameTexture(name: string, label: string, color: string): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 176;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(250,246,232,0.94)";
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 156, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,96,54,0.55)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = `700 44px "Songti SC", "STSong", serif`;
  ctx.fillStyle = color;
  ctx.fillText(label, 256, 66);
  ctx.font = `400 40px "Songti SC", "STSong", serif`;
  ctx.fillStyle = "#3a332a";
  ctx.fillText(name, 256, 124);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ── 深衣袍服人偶（交领宽袖、腰绦、冠帻尊卑） ──

type HatKind = "host" | Rank | "none";

export function LowPolyPerson({
  robeColor,
  hat = "none",
  bowTilt = 0,
  walking = false,
  walkRef,
  faceZ = 0,
  seated = false,
}: {
  robeColor: string;
  hat?: HatKind;
  bowTilt?: number;
  walking?: boolean;
  walkRef?: MutableRefObject<number>;
  faceZ?: number;
  /** 跪坐姿态（入席后） */
  seated?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const sleeveL = useRef<THREE.Group>(null);
  const sleeveR = useRef<THREE.Group>(null);

  // 袍色衍生的缘边色（压暗）
  const trimColor = useMemo(() => {
    const c = new THREE.Color(robeColor);
    return `#${c.multiplyScalar(0.62).getHexString()}`;
  }, [robeColor]);
  const sashColor = useMemo(() => {
    const c = new THREE.Color(robeColor);
    return `#${c.multiplyScalar(1.35).getHexString()}`;
  }, [robeColor]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (upper.current) {
      // 揖礼俯仰（保留原幅度）
      upper.current.rotation.x = THREE.MathUtils.lerp(upper.current.rotation.x, -bowTilt * 0.55, 0.16);
    }
    // 宽袖随揖摆动（滞后于上身，俯身时袖向前垂）
    const sway = -bowTilt * 0.5;
    if (sleeveL.current) sleeveL.current.rotation.x = THREE.MathUtils.lerp(sleeveL.current.rotation.x, sway, 0.1);
    if (sleeveR.current) sleeveR.current.rotation.x = THREE.MathUtils.lerp(sleeveR.current.rotation.x, sway, 0.1);
    // 行走：袍身轻摇 + 微起伏（深衣曳地不见腿，以袍摆晃动示步）
    const moving = walking || (walkRef?.current ?? 0) > 0.5;
    if (root.current) {
      const bob = moving && !seated ? Math.abs(Math.sin(t * 9)) * 0.035 : 0;
      root.current.position.y = bob;
      root.current.rotation.z = moving && !seated ? Math.sin(t * 9) * 0.03 : 0;
    }
  });

  const hemH = seated ? 0.42 : 0.66;
  const hemY = hemH / 2;
  const pivotY = seated ? 0.4 : 0.62;

  return (
    <group ref={root} rotation={[0, faceZ, 0]}>
      {/* 深衣下摆（上窄下宽曳地） */}
      <mesh position={[0, hemY, 0]}>
        <cylinderGeometry args={[seated ? 0.27 : 0.24, seated ? 0.44 : 0.4, hemH, 12]} />
        <meshStandardMaterial color={robeColor} roughness={0.85} />
      </mesh>
      {/* 摆缘 */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[seated ? 0.445 : 0.405, seated ? 0.45 : 0.41, 0.07, 12]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* 腰绦 */}
      <mesh position={[0, pivotY + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[seated ? 0.27 : 0.245, 0.028, 8, 20]} />
        <meshStandardMaterial color={sashColor} roughness={0.7} />
      </mesh>

      <group ref={upper} position={[0, pivotY, 0]}>
        {/* 上身（深衣上衣） */}
        <mesh position={[0, seated ? 0.21 : 0.25, 0]}>
          <cylinderGeometry args={[0.19, seated ? 0.27 : 0.25, seated ? 0.42 : 0.5, 12]} />
          <meshStandardMaterial color={robeColor} roughness={0.85} />
        </mesh>
        {/* 交领（左右衽交叠） */}
        <mesh position={[-0.045, seated ? 0.26 : 0.3, 0.16]} rotation={[0.12, 0, 0.42]}>
          <boxGeometry args={[0.05, 0.34, 0.03]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} />
        </mesh>
        <mesh position={[0.045, seated ? 0.26 : 0.3, 0.165]} rotation={[0.12, 0, -0.42]}>
          <boxGeometry args={[0.05, 0.34, 0.03]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} />
        </mesh>
        {/* 宽袖（垂胡袖：肩窄口宽） */}
        <group ref={sleeveL} position={[-0.26, seated ? 0.32 : 0.38, 0.02]}>
          <group rotation={[0, 0, 0.3]}>
            <mesh position={[-0.03, -0.2, 0]}>
              <boxGeometry args={[0.15, 0.42, 0.16]} />
              <meshStandardMaterial color={robeColor} roughness={0.85} />
            </mesh>
            <mesh position={[-0.055, -0.42, 0]}>
              <boxGeometry args={[0.2, 0.09, 0.2]} />
              <meshStandardMaterial color={trimColor} roughness={0.85} />
            </mesh>
            {/* 手（拱于袖内，露出少许） */}
            <mesh position={[-0.05, -0.46, 0.03]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={PAL.skin} roughness={0.7} />
            </mesh>
          </group>
        </group>
        <group ref={sleeveR} position={[0.26, seated ? 0.32 : 0.38, 0.02]}>
          <group rotation={[0, 0, -0.3]}>
            <mesh position={[0.03, -0.2, 0]}>
              <boxGeometry args={[0.15, 0.42, 0.16]} />
              <meshStandardMaterial color={robeColor} roughness={0.85} />
            </mesh>
            <mesh position={[0.055, -0.42, 0]}>
              <boxGeometry args={[0.2, 0.09, 0.2]} />
              <meshStandardMaterial color={trimColor} roughness={0.85} />
            </mesh>
            <mesh position={[0.05, -0.46, 0.03]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={PAL.skin} roughness={0.7} />
            </mesh>
          </group>
        </group>
        {/* 首 */}
        <mesh position={[0, seated ? 0.52 : 0.6, 0]}>
          <sphereGeometry args={[0.145, 14, 12]} />
          <meshStandardMaterial color={PAL.skin} roughness={0.65} />
        </mesh>
        {/* 发髻（冠下） */}
        <mesh position={[0, seated ? 0.63 : 0.71, -0.02]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color="#2b2620" roughness={0.8} />
        </mesh>
        {/* 冠帻（尊卑） */}
        {hat === "host" && (
          <group position={[0, seated ? 0.72 : 0.8, 0]}>
            {/* 主人玄冠：平板 + 金簪 */}
            <mesh>
              <boxGeometry args={[0.36, 0.05, 0.28]} />
              <meshStandardMaterial color="#2b2620" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.013, 0.013, 0.46, 6]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.5} roughness={0.35} />
            </mesh>
          </group>
        )}
        {hat === "honored" && (
          <group position={[0, seated ? 0.74 : 0.82, 0]}>
            {/* 贵宾高冠：梁冠 + 金缘 */}
            <mesh>
              <boxGeometry args={[0.24, 0.17, 0.2]} />
              <meshStandardMaterial color="#2b2620" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.095, 0]}>
              <boxGeometry args={[0.3, 0.035, 0.24]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.55} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.013, 0.013, 0.42, 6]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.5} roughness={0.35} />
            </mesh>
          </group>
        )}
        {hat === "elder" && (
          <group position={[0, seated ? 0.7 : 0.78, 0]}>
            {/* 长者帻：布巾裹发 */}
            <mesh scale={[1, 0.6, 1]}>
              <sphereGeometry args={[0.155, 12, 10]} />
              <meshStandardMaterial color="#4a3728" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.09, -0.03]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#4a3728" roughness={0.9} />
            </mesh>
          </group>
        )}
        {hat === "peer" && (
          <mesh position={[0, seated ? 0.72 : 0.8, 0]}>
            {/* 平辈小冠 */}
            <cylinderGeometry args={[0.09, 0.115, 0.1, 10]} />
            <meshStandardMaterial color="#2b2620" roughness={0.65} />
          </mesh>
        )}
        {hat === "junior" && (
          <group position={[0, seated ? 0.68 : 0.76, 0]}>
            {/* 幼辈总角（双髻） */}
            {[-0.095, 0.095].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#2b2620" roughness={0.8} />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </group>
  );
}

// ── 环境（家族配方：宣纸天光 + 远山 + 田野 + 流云 + 松柏） ──

function FarGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -2]}>
      <planeGeometry args={[110, 90]} />
      <meshStandardMaterial color={PAL.grass} />
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

function Pine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
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
  );
}

// ── 竹丛 ──
function BambooGrove({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const stalks = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: Math.cos(i * 2.4) * (0.25 + (i % 3) * 0.16),
        z: Math.sin(i * 2.4) * (0.25 + (i % 3) * 0.16),
        h: 2.3 + (i % 4) * 0.42,
        tilt: (i % 2 === 0 ? 1 : -1) * 0.03 * (1 + (i % 3)),
      })),
    [],
  );
  return (
    <group position={position} scale={scale}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[s.tilt, 0, s.tilt * 0.7]}>
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.028, 0.04, s.h, 6]} />
            <meshStandardMaterial color="#6a8a52" roughness={0.8} />
          </mesh>
          {/* 节环 */}
          {[0.35, 0.65, 0.9].map((f) => (
            <mesh key={f} position={[0, s.h * f, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.03, 6]} />
              <meshStandardMaterial color="#55703f" roughness={0.8} />
            </mesh>
          ))}
          {/* 叶冠 */}
          <mesh position={[0, s.h + 0.12, 0]} scale={[1, 0.55, 1]}>
            <sphereGeometry args={[0.42, 8, 6]} />
            <meshStandardMaterial color="#4f7040" roughness={0.85} />
          </mesh>
          <mesh position={[0.2, s.h - 0.35, 0.08]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshStandardMaterial color="#5a7a46" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 石灯笼 ──
function StoneLantern({ position, warm }: { position: [number, number, number]; warm: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.52, 0.18, 0.52]} />
        <meshStandardMaterial color={PAL.stoneDark} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 0.62, 8]} />
        <meshStandardMaterial color={PAL.stone} />
      </mesh>
      {/* 火袋（四面透窗） */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.34, 0.3, 0.34]} />
        <meshStandardMaterial color={PAL.stone} />
      </mesh>
      {([0, Math.PI / 2, Math.PI, -Math.PI / 2] as const).map((ry) => (
        <mesh key={ry} position={[Math.sin(ry) * 0.172, 0.95, Math.cos(ry) * 0.172]} rotation={[0, ry, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.012]} />
          <meshStandardMaterial
            color="#f5e9c8"
            emissive="#e8a34c"
            emissiveIntensity={0.35 + warm * 0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.18, 0]}>
        <coneGeometry args={[0.4, 0.24, 4]} />
        <meshStandardMaterial color={PAL.roofDark} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={PAL.stone} />
      </mesh>
    </group>
  );
}

// ── 院墙与门楼 ──
function Walls() {
  const cap = (w: number, d: number) => (
    <mesh position={[0, 1.78, 0]}>
      <boxGeometry args={[w, 0.14, d]} />
      <meshStandardMaterial color={PAL.roofDark} />
    </mesh>
  );
  return (
    <>
      {/* 左右墙 */}
      {[-6.5, 6.5].map((x) => (
        <group key={x} position={[x, 0, -2.9]}>
          <mesh position={[0, 0.88, 0]}>
            <boxGeometry args={[0.26, 1.76, 12.2]} />
            <meshStandardMaterial color="#d8cfae" />
          </mesh>
          {cap(0.44, 12.3)}
        </group>
      ))}
      {/* 后墙 */}
      <group position={[0, 0, -9.0]}>
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[13.3, 1.76, 0.26]} />
          <meshStandardMaterial color="#d8cfae" />
        </mesh>
        {cap(13.4, 0.44)}
      </group>
      {/* 前墙（留门） */}
      {[-3.9, 3.9].map((x) => (
        <group key={x} position={[x, 0, 3.1]}>
          <mesh position={[0, 0.88, 0]}>
            <boxGeometry args={[5.4, 1.76, 0.26]} />
            <meshStandardMaterial color="#d8cfae" />
          </mesh>
          {cap(5.5, 0.44)}
        </group>
      ))}
      {/* 门楼 */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.05, 3.1]}>
          <boxGeometry args={[0.3, 2.1, 0.3]} />
          <meshStandardMaterial color={PAL.lacquer} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 3.1]}>
        <boxGeometry args={[3.4, 0.26, 0.42]} />
        <meshStandardMaterial color={PAL.lacquer} />
      </mesh>
      <mesh position={[0, 2.3, 3.1]}>
        <boxGeometry args={[3.9, 0.14, 0.95]} />
        <meshStandardMaterial color={PAL.roofDark} />
      </mesh>
    </>
  );
}

// ── 雅集院落（石板径 + 层次草地） ──
function CourtyardGround() {
  const patches = useMemo(
    () => [
      { x: -3.4, z: -0.6, r: 1.9, c: "#b3c48a" }, { x: 3.6, z: -1.4, r: 1.6, c: "#9fb277" },
      { x: -2.6, z: -6.9, r: 1.5, c: "#adbd83" }, { x: 4.4, z: -6.4, r: 1.8, c: "#a4b57c" },
      { x: -4.6, z: 1.6, r: 1.4, c: "#9fb277" }, { x: 4.7, z: 1.4, r: 1.5, c: "#b3c48a" },
      { x: 0.2, z: -7.6, r: 1.6, c: "#a2b178" },
    ],
    [],
  );
  const slabs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        z: 2.55 - i * 0.62,
        x: (i % 2 === 0 ? 1 : -1) * 0.09,
        c: i % 2 === 0 ? PAL.stone : PAL.stoneDark,
      })),
    [],
  );
  return (
    <>
      {/* 院内草地（底色 + 色块层次） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2.9]}>
        <planeGeometry args={[12.9, 11.7]} />
        <meshStandardMaterial color="#a9ba7e" />
      </mesh>
      {patches.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.009, p.z]}>
          <circleGeometry args={[p.r, 24]} />
          <meshStandardMaterial color={p.c} />
        </mesh>
      ))}
      {/* 石板径 */}
      {slabs.map((s, i) => (
        <mesh key={i} position={[s.x, 0.028, s.z]}>
          <boxGeometry args={[1.35, 0.05, 0.52]} />
          <meshStandardMaterial color={s.c} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ── 敞轩（台基 + 朱柱 + 坡顶檐角 + 匾额 + 后屏） ──
function Hall({ title, warm }: { title: string; warm: number }) {
  const plaqueTex = useMemo(() => makePlaqueTexture(title), [title]);
  return (
    <group>
      {/* 石地坪（席位所在，与玩法锚点齐平） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -4.5]}>
        <circleGeometry args={[4.9, 48]} />
        <meshStandardMaterial color="#c9bfa4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, -4.5]}>
        <ringGeometry args={[4.35, 4.9, 48]} />
        <meshStandardMaterial color={PAL.stoneDark} />
      </mesh>
      {/* 正面两级浅阶 */}
      {[2.62, 2.86].map((w, i) => (
        <mesh key={w} position={[0, 0.02 + i * 0.02, 0.15 + i * 0.22]}>
          <boxGeometry args={[w, 0.05, 0.24]} />
          <meshStandardMaterial color={PAL.stone} />
        </mesh>
      ))}

      {/* 六朱柱 + 柱础 */}
      {([-3.7, 3.7] as const).flatMap((x) =>
        [-2.5, -4.5, -6.5].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 1.62, 0]}>
              <cylinderGeometry args={[0.13, 0.155, 3.24, 10]} />
              <meshStandardMaterial color={PAL.pillar} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <boxGeometry args={[0.46, 0.22, 0.46]} />
              <meshStandardMaterial color={PAL.stoneDark} />
            </mesh>
          </group>
        )),
      )}
      {/* 前后横梁 + 侧梁（髹漆） */}
      {[-2.5, -6.5].map((z) => (
        <mesh key={z} position={[0, 3.26, z]}>
          <boxGeometry args={[8.1, 0.24, 0.26]} />
          <meshStandardMaterial color={PAL.lacquer} roughness={0.55} />
        </mesh>
      ))}
      {[-3.7, 3.7].map((x) => (
        <mesh key={x} position={[x, 3.26, -4.5]}>
          <boxGeometry args={[0.26, 0.24, 4.3]} />
          <meshStandardMaterial color={PAL.lacquer} roughness={0.55} />
        </mesh>
      ))}

      {/* 坡顶瓦面（四棱锥压扁）+ 正脊 */}
      <mesh position={[0, 4.15, -4.5]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.68]}>
        <coneGeometry args={[4.95, 1.75, 4]} />
        <meshStandardMaterial color={PAL.roof} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 4.98, -4.5]}>
        <boxGeometry args={[3.4, 0.2, 0.28]} />
        <meshStandardMaterial color={PAL.roofDark} roughness={0.8} />
      </mesh>
      {[-1.85, 1.85].map((x) => (
        <mesh key={x} position={[x, 4.98, -4.5]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color={PAL.roofDark} roughness={0.8} />
        </mesh>
      ))}
      {/* 檐角起翘（四角上挑） */}
      {[
        { p: [4.62, 3.62, -4.5] as const, r: [0, 0, -0.7] as const },
        { p: [-4.62, 3.62, -4.5] as const, r: [0, 0, 0.7] as const },
        { p: [0, 3.62, -1.32] as const, r: [0.7, 0, 0] as const },
        { p: [0, 3.62, -7.68] as const, r: [-0.7, 0, 0] as const },
      ].map((c, i) => (
        <mesh key={i} position={[c.p[0], c.p[1], c.p[2]]} rotation={[c.r[0], c.r[1], c.r[2]]}>
          <boxGeometry args={[0.14, 0.6, 0.14]} />
          <meshStandardMaterial color={PAL.roofDark} roughness={0.8} />
        </mesh>
      ))}

      {/* 匾额（雅集题名） */}
      <group position={[0, 2.82, -2.34]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[2.36, 0.74, 0.05]} />
          <meshStandardMaterial color={PAL.gold} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.24, 0.62, 0.06]} />
          <meshStandardMaterial color="#2b2018" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.036]}>
          <planeGeometry args={[2.06, 0.5]} />
          <meshBasicMaterial map={plaqueTex} transparent />
        </mesh>
      </group>

      {/* 轩下立灯一对（宗庙氛围） */}
      {[-4.5, 4.5].map((x) => (
        <group key={x} position={[x, 0, -2.1]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 2.2, 8]} />
            <meshStandardMaterial color={PAL.wood} />
          </mesh>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[0.42, 0.52, 0.42]} />
            <meshStandardMaterial
              color="#c0392b"
              emissive="#e8a34c"
              emissiveIntensity={0.25 + warm * 0.45}
            />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <coneGeometry args={[0.36, 0.22, 4]} />
            <meshStandardMaterial color={PAL.lacquer} />
          </mesh>
        </group>
      ))}

      {/* 后屏（纸本三扇 + 淡墨笔意） */}
      <group position={[0, 0, -7.55]}>
        {[-2.35, 0, 2.35].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 1.45, 0]}>
              <boxGeometry args={[2.2, 2.7, 0.08]} />
              <meshStandardMaterial color={PAL.paper} roughness={0.9} />
            </mesh>
            {/* 淡墨山石笔意 */}
            <mesh position={[-0.3, 1.1, 0.05]} rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.09, 1.5, 0.015]} />
              <meshStandardMaterial color="#c8c2b2" roughness={0.9} />
            </mesh>
            <mesh position={[0.35, 0.95, 0.05]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.07, 1.1, 0.015]} />
              <meshStandardMaterial color="#d0cab8" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {[-3.5, -1.15, 1.15, 3.5].map((x) => (
          <mesh key={x} position={[x, 1.45, 0.02]}>
            <boxGeometry args={[0.14, 2.9, 0.14]} />
            <meshStandardMaterial color={PAL.wood} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── 席间道具（席垫 + 矮几 + 酒尊/爵） ──
function SeatFurnishings({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const p = seatWorldPos(i);
        // 几案在席垫朝向庭心一侧
        const dir = new THREE.Vector3(-p.x, 0, -3.5 - p.z).normalize();
        const tx = p.x + dir.x * 0.62;
        const tz = p.z + dir.z * 0.62;
        return (
          <group key={i}>
            {/* 蒲席 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.03, p.z]}>
              <circleGeometry args={[0.56, 24]} />
              <meshStandardMaterial color={PAL.mat} roughness={0.95} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.032, p.z]}>
              <ringGeometry args={[0.48, 0.56, 24]} />
              <meshStandardMaterial color={PAL.matEdge} roughness={0.95} />
            </mesh>
            {/* 矮几（面向庭心） */}
            <group position={[tx, 0, tz]} rotation={[0, Math.atan2(dir.x, dir.z), 0]}>
              <mesh position={[0, 0.26, 0]}>
                <boxGeometry args={[0.74, 0.07, 0.44]} />
                <meshStandardMaterial color={PAL.wood} roughness={0.6} />
              </mesh>
              {[-0.26, 0.26].map((x) => (
                <mesh key={x} position={[x, 0.12, 0]}>
                  <boxGeometry args={[0.07, 0.24, 0.34]} />
                  <meshStandardMaterial color={PAL.wood} roughness={0.6} />
                </mesh>
              ))}
              {/* 酒尊 */}
              <mesh position={[-0.16, 0.39, 0]}>
                <cylinderGeometry args={[0.075, 0.1, 0.18, 10]} />
                <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
              </mesh>
              <mesh position={[-0.16, 0.5, 0]}>
                <cylinderGeometry args={[0.05, 0.075, 0.05, 10]} />
                <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
              </mesh>
              {/* 爵（三足小杯，简化） */}
              <mesh position={[0.16, 0.365, 0.05]}>
                <cylinderGeometry args={[0.05, 0.035, 0.09, 8]} />
                <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
              </mesh>
              {[-0.03, 0.03].map((x) => (
                <mesh key={x} position={[0.16 + x, 0.315, 0.05]}>
                  <cylinderGeometry args={[0.008, 0.01, 0.05, 6]} />
                  <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
      {/* 主人案（庭心稍远） */}
      <group position={[0, 0, -5.7]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[1.5, 0.08, 0.6]} />
          <meshStandardMaterial color={PAL.wood} roughness={0.55} />
        </mesh>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.14, 0]}>
            <boxGeometry args={[0.08, 0.28, 0.5]} />
            <meshStandardMaterial color={PAL.wood} roughness={0.55} />
          </mesh>
        ))}
        <mesh position={[-0.3, 0.44, 0]}>
          <cylinderGeometry args={[0.09, 0.12, 0.24, 10]} />
          <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh position={[0.18, 0.38, 0.06]}>
          <cylinderGeometry args={[0.055, 0.04, 0.1, 8]} />
          <meshStandardMaterial color={PAL.bronze} metalness={0.35} roughness={0.45} />
        </mesh>
      </group>
    </>
  );
}

// ── 场景根 ──
export function CourtyardScene({ atmosphere, title = "宾至如归" }: { atmosphere: number; title?: string }) {
  const warm = atmosphere / 100;
  return (
    <>
      <color attach="background" args={[PAL.skyTop]} />
      <fog attach="fog" args={[PAL.fog, 30, 110]} />
      <hemisphereLight args={["#f8f4e6", "#aebd90", 0.85 + warm * 0.2]} />
      <directionalLight position={[30, 40, 20]} intensity={0.62 + warm * 0.12} color="#fff1d4" />

      <FarGround />
      <Fields />
      <Mountains />
      <Clouds />
      {/* 院外松柏 */}
      <Pine position={[-9.5, 0, -7]} scale={1.35} />
      <Pine position={[9.8, 0, -5]} scale={1.15} />
      <Pine position={[-8.8, 0, 2.5]} scale={1.05} />
      <Pine position={[8.6, 0, 1.5]} scale={1.25} />
      <Pine position={[-5.4, 0, -8.2]} scale={0.9} />
      <Pine position={[5.5, 0, -8.3]} scale={1.0} />

      <Walls />
      <CourtyardGround />
      <BambooGrove position={[-5.6, 0, -7.5]} scale={1.1} />
      <BambooGrove position={[5.7, 0, -7.3]} />
      <BambooGrove position={[-5.8, 0, 1.6]} scale={0.9} />
      <StoneLantern position={[-2.4, 0, -0.9]} warm={warm} />
      <StoneLantern position={[2.4, 0, -0.9]} warm={warm} />

      <Hall title={title} warm={warm} />
      <SeatFurnishings count={4} />
    </>
  );
}

// ── 宾客 NPC（名签 + 高亮环 + 跪坐） ──

export function GuestNPC({
  guest,
  index,
  total,
  phase,
  highlighted,
  seated,
}: {
  guest: {
    id: string;
    name: string;
    rank: Rank;
    seatIdx: number | null;
    bowFlash: number;
  };
  index: number;
  total: number;
  phase: string;
  highlighted: boolean;
  seated: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const meta = RANK_META[guest.rank];
  const [lang] = useLang();
  const rankLabel = gt(meta.label, lang);
  const target = useMemo(
    () => guestWorldPos(index, total, guest.seatIdx, seated),
    [index, total, guest.seatIdx, seated],
  );
  const nameTex = useMemo(
    () => makeNameTexture(gt(guest.name, lang), rankLabel, meta.hex),
    [guest.name, rankLabel, meta.hex, lang],
  );

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0, dtRaw)); // 防负 dt
    if (!group.current) return;
    group.current.position.lerp(target, 1 - Math.exp(-4 * dt));
    const face = seated
      ? Math.atan2(-group.current.position.x, 3.5)
      : Math.atan2(-group.current.position.x, 2);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, face, 0.08);
  });

  const bowTilt = guest.bowFlash > 0 ? 0.35 * guest.bowFlash : 0;

  return (
    <group ref={group} position={target.toArray()}>
      {highlighted && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <ringGeometry args={[0.48, 0.72, 32]} />
          <meshBasicMaterial color={PAL.glow} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <LowPolyPerson
        robeColor={meta.hex}
        hat={guest.rank}
        bowTilt={bowTilt}
        seated={seated}
        faceZ={0}
      />
      {/* 名签（高亮时浮现） */}
      {highlighted && (phase === "greet" || phase === "banquet" || phase === "seat") && (
        <sprite position={[0, seated ? 1.55 : 1.95, 0]} scale={[1.55, 0.53, 1]} renderOrder={8}>
          <spriteMaterial map={nameTex} transparent depthWrite={false} depthTest={false} />
        </sprite>
      )}
    </group>
  );
}

export function SeatMarkers({ visible, count }: { visible: boolean; count: number }) {
  if (!visible) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const p = seatWorldPos(i);
        return (
          <group key={i} position={p.toArray()}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
              <ringGeometry args={[0.42, 0.64, 32]} />
              <meshBasicMaterial color={PAL.glow} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

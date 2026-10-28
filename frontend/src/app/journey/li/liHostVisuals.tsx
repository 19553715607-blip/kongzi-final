/**
 * 礼 · 宾主雅集场景与深衣袍服人偶
 *
 * 写实古风庭院：清晨薄雾、远山松林、青石庭院、朱柱青瓦重檐主殿。
 * 人偶：深衣交领宽袖、腰绦、冠/帻按尊卑（贵宾高冠、长者帻、平辈小冠、幼辈总角）。
 *
 * 交互锚点（guestWorldPos/seatWorldPos/WORLD）保持稳定，玩法逻辑不动。
 */

import { useFrame } from "@react-three/fiber";
import { useCourtyardSurface, useCourtyardTexture } from "./liHostTextures";
import { CourtyardColorGrade, InkMountainMaterial } from "./liHostRendering";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { RANK_META, type Rank } from "./liHostData";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";

export const PAL = {
  skyTop: "#9eafb6",
  skyBot: "#d5d0c3",
  fog: "#b9c5c6",
  grass: "#87917f",
  grassLight: "#99a28b",
  stone: "#c9c7bf",
  stoneDark: "#a09b8e",
  wood: "#6d5a4b",
  pillar: "#80604c",
  lacquer: "#5c493d",
  roof: "#344b45",
  roofDark: "#3d4c44",
  paper: "#dcd6c8",
  mat: "#c3ad82",
  matEdge: "#8f7550",
  skin: "#d9b48f",
  hostRobe: "#263847", // 主人袍色（liHostPlayer 沿用）
  bronze: "#8e7040",
  gold: "#d6b36a",
  glow: "#f1cf82",
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
  ctx.shadowColor = "rgba(20, 16, 10, 0.42)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
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

// ── 礼服人物（交领、宽袖、腰绦与冠帻层次） ──

type HatKind = "host" | Rank | "none";

export function RiteFigure({
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
  const clothSurface = useCourtyardSurface("cloth");
  const robeGeometry = useMemo(() => {
    const hem = seated ? 0.42 : 0.66;
    const points = seated
      ? [[0.27, 0], [0.39, 0.05], [0.42, 0.12], [0.34, 0.22], [0.26, 0.32], [0.23, hem]]
      : [[0.25, 0], [0.39, 0.04], [0.42, 0.11], [0.37, 0.22], [0.31, 0.4], [0.26, 0.56], [0.22, hem]];
    return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  }, [seated]);

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

  const pivotY = seated ? 0.4 : 0.62;

  return (
    <group ref={root} rotation={[0, faceZ, 0]}>
      {/* 外袍：连续的缓弧衣摆，避免圆柱拼接感 */}
      <mesh geometry={robeGeometry} castShadow>
        {/* 【渲染优化】低强度丝光表现织物纤维，不改变衣物模型。 */}
        <meshPhysicalMaterial {...clothSurface} color={robeColor} roughness={0.94} sheen={0.14} sheenRoughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* 摆缘 */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[seated ? 0.42 : 0.42, seated ? 0.43 : 0.43, 0.045, 32]} />
        <meshStandardMaterial color={trimColor} roughness={0.78} />
      </mesh>
      {/* 腰绦 */}
      <mesh position={[0, pivotY + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[seated ? 0.27 : 0.245, 0.028, 8, 20]} />
        <meshStandardMaterial color={sashColor} roughness={0.7} />
      </mesh>

      <group ref={upper} position={[0, pivotY, 0]}>
        {/* 上身（深衣上衣） */}
        <mesh position={[0, seated ? 0.21 : 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.19, seated ? 0.27 : 0.25, seated ? 0.42 : 0.5, 24, 4]} />
          <meshPhysicalMaterial {...clothSurface} color={robeColor} roughness={0.94} sheen={0.14} sheenRoughness={0.92} />
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
            <mesh position={[-0.03, -0.2, 0]} rotation={[0, 0, 0.08]} castShadow>
              <cylinderGeometry args={[0.14, 0.2, 0.42, 24, 4]} />
              <meshPhysicalMaterial {...clothSurface} color={robeColor} roughness={0.94} sheen={0.14} sheenRoughness={0.92} />
            </mesh>
            <mesh position={[-0.055, -0.42, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.055, 24]} />
              <meshStandardMaterial color={trimColor} roughness={0.76} />
            </mesh>
          </group>
        </group>
        <group ref={sleeveR} position={[0.26, seated ? 0.32 : 0.38, 0.02]}>
          <group rotation={[0, 0, -0.3]}>
            <mesh position={[0.03, -0.2, 0]} rotation={[0, 0, -0.08]} castShadow>
              <cylinderGeometry args={[0.14, 0.2, 0.42, 24, 4]} />
              <meshPhysicalMaterial {...clothSurface} color={robeColor} roughness={0.94} sheen={0.14} sheenRoughness={0.92} />
            </mesh>
            <mesh position={[0.055, -0.42, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.055, 24]} />
              <meshStandardMaterial color={trimColor} roughness={0.76} />
            </mesh>
          </group>
        </group>
        {/* 双手相拱于身前 */}
        <group position={[0, seated ? 0.15 : 0.17, 0.205]}>
          <mesh position={[-0.048, 0, 0]} scale={[1, 0.82, 0.72]}>
            <sphereGeometry args={[0.074, 20, 16]} />
            <meshStandardMaterial color={PAL.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0.048, 0, 0]} scale={[1, 0.82, 0.72]}>
            <sphereGeometry args={[0.074, 20, 16]} />
            <meshStandardMaterial color={PAL.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.045, -0.012]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.035, 0.14, 0.035]} />
            <meshStandardMaterial color={PAL.skin} roughness={0.6} />
          </mesh>
        </group>
        {/* 首 */}
        <mesh position={[0, seated ? 0.52 : 0.6, 0]} castShadow>
          <sphereGeometry args={[0.145, 24, 20]} />
          <meshStandardMaterial color={PAL.skin} roughness={0.65} />
        </mesh>
        {/* 正面五官与主人须髯 */}
        <mesh position={[-0.052, seated ? 0.535 : 0.615, 0.119]}>
          <sphereGeometry args={[0.012, 12, 10]} />
          <meshStandardMaterial color="#211d18" roughness={0.55} />
        </mesh>
        <mesh position={[0.052, seated ? 0.535 : 0.615, 0.119]}>
          <sphereGeometry args={[0.012, 12, 10]} />
          <meshStandardMaterial color="#211d18" roughness={0.55} />
        </mesh>
        <mesh position={[0, seated ? 0.485 : 0.565, 0.138]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.018, 0.055, 12]} />
          <meshStandardMaterial color="#9b7058" roughness={0.58} />
        </mesh>
        {(hat === "host" || hat === "elder") && (
          <mesh position={[0, seated ? 0.385 : 0.465, 0.118]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.065, seated ? 0.17 : 0.2, 16]} />
            <meshStandardMaterial color={hat === "elder" ? "#756c5a" : "#292720"} roughness={0.82} />
          </mesh>
        )}
        {/* 发髻（冠下） */}
        <mesh position={[0, seated ? 0.63 : 0.71, -0.02]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color="#2b2620" roughness={0.8} />
        </mesh>
        {/* 冠帻（尊卑） */}
        {hat === "host" && (
          <group position={[0, seated ? 0.72 : 0.8, 0]}>
            {/* 主人玄冠：软巾底座、冠梁与金簪 */}
            <mesh position={[0, -0.025, 0]}>
              <cylinderGeometry args={[0.12, 0.16, 0.08, 24]} />
              <meshStandardMaterial color="#28251f" roughness={0.72} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[0.36, 0.06, 0.24]} />
              <meshStandardMaterial color="#2b2620" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.013, 0.013, 0.46, 6]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
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
              <meshStandardMaterial color={PAL.gold} metalness={0.14} roughness={0.72} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.013, 0.013, 0.42, 6]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -2]} receiveShadow>
      <planeGeometry args={[110, 90]} />
      <meshStandardMaterial color={PAL.grass} />
    </mesh>
  );
}

function Fields() {
  const strips = useMemo(() => {
    const arr: { x: number; z: number; w: number; d: number; c: string }[] = [];
    const colors = ["#a6ad9a", "#9ca594", "#b0b4a0", "#a0a895"];
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
      const uvs: number[] = [];
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const x = -110 + (220 * i) / n;
        const h = hBase + Math.sin(i * f1 + phase) * hBase * 0.45 + Math.sin(i * f2) * hBase * 0.2;
        pts.push(x, 0, z, x, h, z);
        uvs.push(i / n, 0, i / n, 1);
      }
      const idx: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      return geo;
    };
    return [
      { geo: mk(-58, 12, 0.9, 0.31, 1.2), color: "#e4ebe7", opacity: 0.3 },
      { geo: mk(-46, 8.5, 1.1, 0.4, 4.1), color: "#e6e7de", opacity: 0.43 },
      { geo: mk(-34, 5.5, 0.8, 0.35, 2.2), color: "#d4e0dd", opacity: 0.56 },
    ];
  }, []);

  return (
    <>
      {ridges.map((r, i) => (
        <mesh key={i} geometry={r.geo}>
          <InkMountainMaterial color={r.color} opacity={r.opacity} />
        </mesh>
      ))}
    </>
  );
}

function MorningLightRays() {
  const texture = useCourtyardTexture("ray");
  return (
    <>
      <sprite position={[-2.2, 3.8, -2.5]} rotation={[0, 0, -0.22]} scale={[1.7, 7.2, 1]} renderOrder={1}>
        <spriteMaterial map={texture} transparent opacity={0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite position={[1.2, 3.5, -4.1]} rotation={[0, 0, 0.18]} scale={[1.1, 6.2, 1]} renderOrder={1}>
        <spriteMaterial map={texture} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

function Clouds() {
  const mist = useCourtyardTexture("mist");
  useFrame((state) => {
    mist.offset.x = state.clock.elapsedTime * 0.0015;
  });
  const clouds = useMemo(
    () => [
      { x: -22, y: 16, z: -42, s: 3.6 }, { x: 16, y: 19, z: -52, s: 4.4 }, { x: 2, y: 15, z: -36, s: 2.8 },
    ],
    [],
  );
  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial alphaMap={mist} color="#edf0e9" depthWrite={false} transparent opacity={0.12} />
          </mesh>
          <mesh position={[0.9, -0.15, 0]} scale={0.7}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial alphaMap={mist} color="#edf0e9" depthWrite={false} transparent opacity={0.1} />
          </mesh>
          <mesh position={[-0.9, -0.2, 0]} scale={0.65}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial alphaMap={mist} color="#edf0e9" depthWrite={false} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Pine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  // 【渲染优化】轻摆现有松冠，树干与场景结构保持不动。
  const foliage = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (foliage.current) foliage.current.rotation.z = Math.sin(clock.elapsedTime * 0.32 + position[0]) * 0.009;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.15, 1, 20, 3]} />
        <meshStandardMaterial color="#493a2b" roughness={0.9} />
      </mesh>
      <group ref={foliage}>
        {[
          { p: [0, 1.3, 0] as const, s: [0.95, 0.55, 0.8] as const, c: "#34483a" },
          { p: [-0.15, 1.9, 0.04] as const, s: [0.78, 0.52, 0.68] as const, c: "#3d5744" },
          { p: [0.12, 2.45, -0.04] as const, s: [0.62, 0.5, 0.56] as const, c: "#49644d" },
        ].map((layer, i) => (
          <mesh key={i} position={layer.p} scale={layer.s} castShadow>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color={layer.c} roughness={0.92} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── 竹丛 ──
function BambooGrove({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  // 【渲染优化】以极小幅度带动现有竹叶和竹竿，模拟环境微风。
  const grove = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grove.current) grove.current.rotation.z = Math.sin(clock.elapsedTime * 0.27 + position[2]) * 0.004;
  });
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
    <group ref={grove} position={position} scale={scale}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[s.tilt, 0, s.tilt * 0.7]}>
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.028, 0.04, s.h, 14, 3]} />
            <meshStandardMaterial color="#68765e" roughness={0.9} />
          </mesh>
          {/* 节环 */}
          {[0.35, 0.65, 0.9].map((f) => (
            <mesh key={f} position={[0, s.h * f, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.03, 14]} />
              <meshStandardMaterial color="#5e6b54" roughness={0.9} />
            </mesh>
          ))}
          {/* 叶冠 */}
          <mesh position={[0, s.h + 0.12, 0]} scale={[1, 0.55, 1]}>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial color="#58674f" roughness={0.92} />
          </mesh>
          <mesh position={[0.2, s.h - 0.35, 0.08]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.3, 18, 14]} />
            <meshStandardMaterial color="#627057" roughness={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 石灯笼 ──
function StoneLantern({ position, warm }: { position: [number, number, number]; warm: number }) {
  const light = useRef<THREE.PointLight>(null);
  const glowTexture = useCourtyardTexture("glow");
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!light.current) return;
    const t = clock.elapsedTime;
    const flicker = 0.96 + Math.sin(t * 2.1 + phase) * 0.035 + Math.sin(t * 5.2 + phase * 1.7) * 0.018;
    light.current.intensity = (0.95 + warm * 0.35) * flicker;
  });
  return (
    <group position={position}>
      <sprite position={[0, 0.98, 0]} scale={[1.45, 1.45, 1]}>
        <spriteMaterial map={glowTexture} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh position={[0, 0.09, 0]} castShadow>
        <boxGeometry args={[0.52, 0.18, 0.52]} />
        <meshStandardMaterial color={PAL.stoneDark} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 0.62, 20, 3]} />
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
            color="#ead7ab"
            emissive="#e4be7e"
            emissiveIntensity={0.5 + warm * 0.22}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.18, 0]} castShadow>
        <coneGeometry args={[0.4, 0.24, 16]} />
        <meshStandardMaterial color={PAL.roofDark} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshStandardMaterial color={PAL.stone} />
      </mesh>
      <pointLight ref={light} position={[0, 0.98, 0]} color="#ebce92" intensity={0.95 + warm * 0.35} distance={4.6} decay={2} />
    </group>
  );
}

function LanternDust({ position }: { position: [number, number, number] }) {
  const geometry = useMemo(() => {
    const points = new Float32Array(12 * 3);
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.399;
      const radius = 0.18 + (i % 4) * 0.12;
      points[i * 3] = Math.cos(angle) * radius;
      points[i * 3 + 1] = 0.2 + (i % 6) * 0.24;
      points[i * 3 + 2] = Math.sin(angle) * radius * 0.65;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(points, 3));
    return result;
  }, []);
  useFrame(({ clock }) => {
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.399 + t * 0.16;
      const radius = 0.18 + (i % 4) * 0.12;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.2 + (i % 6) * 0.24 + Math.sin(t * 0.7 + i) * 0.045;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.65;
    }
    attribute.needsUpdate = true;
  });
  return (
    <points geometry={geometry} position={position}>
      <pointsMaterial color="#ffe3ae" size={0.035} transparent opacity={0.24} depthWrite={false} sizeAttenuation />
    </points>
  );
}

// ── 院墙与门楼 ──
function Walls() {
  const woodSurface = useCourtyardSurface("wood");
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
            <meshStandardMaterial color="#d1cec2" />
          </mesh>
          {cap(0.44, 12.3)}
        </group>
      ))}
      {/* 后墙 */}
      <group position={[0, 0, -9.0]}>
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[13.3, 1.76, 0.26]} />
          <meshStandardMaterial color="#d1cec2" />
        </mesh>
        {cap(13.4, 0.44)}
      </group>
      {/* 前墙（留门） */}
      {[-3.9, 3.9].map((x) => (
        <group key={x} position={[x, 0, 3.1]}>
          <mesh position={[0, 0.88, 0]}>
            <boxGeometry args={[5.4, 1.76, 0.26]} />
            <meshStandardMaterial color="#d1cec2" />
          </mesh>
          {cap(5.5, 0.44)}
        </group>
      ))}
      {/* 门楼 */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.05, 3.1]}>
          <boxGeometry args={[0.3, 2.1, 0.3]} />
          <meshStandardMaterial {...woodSurface} color={PAL.lacquer} roughness={0.84} metalness={0.02} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 3.1]}>
        <boxGeometry args={[3.4, 0.26, 0.42]} />
        <meshStandardMaterial {...woodSurface} color={PAL.lacquer} roughness={0.84} metalness={0.02} />
      </mesh>
      <mesh position={[0, 2.3, 3.1]}>
        <boxGeometry args={[3.9, 0.14, 0.95]} />
        <meshStandardMaterial color={PAL.roofDark} />
      </mesh>
    </>
  );
}

// ── 雅集院落（石板径 + 层次草地） ──
function makeHippedRoofGeometry(width: number, depth: number, ridgeLength: number, rise: number, eaveLift: number) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const divisionsU = 24;
  const divisionsV = 12;
  const faces = [
    (u: number, v: number) => [u * (ridgeLength / 2 + (width / 2 - ridgeLength / 2) * v), rise * (1 - v) + eaveLift * v * Math.pow(Math.abs(u), 6), v * depth / 2],
    (u: number, v: number) => [u * (ridgeLength / 2 + (width / 2 - ridgeLength / 2) * v), rise * (1 - v) + eaveLift * v * Math.pow(Math.abs(u), 6), -v * depth / 2],
    (u: number, v: number) => [-(ridgeLength / 2 + (width / 2 - ridgeLength / 2) * v), rise * (1 - v) + eaveLift * v * Math.pow(Math.abs(u), 6), u * v * depth / 2],
    (u: number, v: number) => [ridgeLength / 2 + (width / 2 - ridgeLength / 2) * v, rise * (1 - v) + eaveLift * v * Math.pow(Math.abs(u), 6), u * v * depth / 2],
  ];

  for (const point of faces) {
    const offset = positions.length / 3;
    for (let row = 0; row <= divisionsV; row++) {
      const v = row / divisionsV;
      for (let col = 0; col <= divisionsU; col++) {
        const u = col / divisionsU * 2 - 1;
        const [x, y, z] = point(u, v);
        positions.push(x, y, z);
        uvs.push(col / divisionsU, row / divisionsV);
      }
    }
    for (let row = 0; row < divisionsV; row++) {
      for (let col = 0; col < divisionsU; col++) {
        const a = offset + row * (divisionsU + 1) + col;
        const b = a + divisionsU + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function CourtyardGround() {
  const stoneSurface = useCourtyardSurface("stone");
  const woodSurface = useCourtyardSurface("wood");
  const patches = useMemo(
    () => [
      { x: -3.4, z: -0.6, r: 1.9, c: "#a3aa95" }, { x: 3.6, z: -1.4, r: 1.6, c: "#969f8c" },
      { x: -2.6, z: -6.9, r: 1.5, c: "#a4ab97" }, { x: 4.4, z: -6.4, r: 1.8, c: "#9ca38e" },
      { x: -4.6, z: 1.6, r: 1.4, c: "#969f8c" }, { x: 4.7, z: 1.4, r: 1.5, c: "#a3aa95" },
      { x: 0.2, z: -7.6, r: 1.6, c: "#99a28e" },
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2.9]} receiveShadow>
        <planeGeometry args={[12.9, 11.7]} />
        <meshStandardMaterial color="#8e9a83" roughness={1} />
      </mesh>
      {patches.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.009, p.z]}>
          <circleGeometry args={[p.r, 24]} />
          <meshStandardMaterial color={p.c} />
        </mesh>
      ))}
      {/* 【渲染优化】中轴青石砖庭保留细缝纹理与微弱反射，不改地面网格。 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, -2.8]} receiveShadow>
        <planeGeometry args={[9.6, 13.8]} />
        <meshStandardMaterial {...stoneSurface} color="#e2ddd2" roughness={0.88} metalness={0.025} />
      </mesh>
      {/* 前庭两侧低栏，给出通往主殿的纵深轴线 */}
      {([-4.82, 4.82] as const).map((x) => (
        <group key={`rail-${x}`} position={[x, 0, -2.1]}>
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[0.16, 0.14, 9.8]} />
            {/* 【渲染优化】木栏保留木纹粗糙质感并加入极弱反射层次。 */}
            <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.86} metalness={0.02} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.2, 0.035, 9.82]} />
            <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} position={[0, 0, 2.35 - i * 1.75]}>
              <mesh position={[0, 0.34, 0]}>
                <cylinderGeometry args={[0.065, 0.08, 0.68, 20]} />
                <meshStandardMaterial color={PAL.stoneDark} roughness={0.78} />
              </mesh>
              <mesh position={[0, 0.72, 0]}>
                <sphereGeometry args={[0.1, 16, 12]} />
                <meshStandardMaterial color={PAL.stone} roughness={0.72} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* 引向殿前的独立石板 */}
      {slabs.map((s, i) => (
        <mesh key={i} position={[s.x, 0.028, s.z]}>
          <boxGeometry args={[1.48, 0.035, 0.58]} />
          <meshStandardMaterial color={s.c} roughness={0.84} />
        </mesh>
      ))}
    </>
  );
}

// ── 重檐主殿（台基 + 朱柱 + 歇山屋顶 + 匾额 + 格扇） ──
function Hall({ title, warm }: { title: string; warm: number }) {
  const plaqueTex = useMemo(() => makePlaqueTexture(title), [title]);
  // 【渲染优化】木构件、瓦面和石坪继续使用既有 PBR 贴图，只微调表面参数。
  const roofSurface = useCourtyardSurface("roof");
  const woodSurface = useCourtyardSurface("wood");
  const stoneSurface = useCourtyardSurface("stone");
  const roofGeometry = useMemo(() => makeHippedRoofGeometry(8.9, 5.3, 3.6, 1.62, 0.22), []);
  const upperRoofGeometry = useMemo(() => makeHippedRoofGeometry(5.7, 3.55, 2.5, 1.05, 0.18), []);
  return (
    <group>
      {/* 【渲染优化】石地坪使用现有青石 PBR 贴图，席位锚点保持不变。 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -4.5]} receiveShadow>
        <circleGeometry args={[4.9, 48]} />
        <meshStandardMaterial {...stoneSurface} color="#e2ddd1" roughness={0.88} metalness={0.025} />
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
            <mesh position={[0, 1.62, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.13, 0.155, 3.24, 10]} />
              <meshStandardMaterial {...woodSurface} color={PAL.pillar} roughness={0.84} metalness={0.02} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <boxGeometry args={[0.46, 0.22, 0.46]} />
              <meshStandardMaterial color={PAL.stoneDark} />
            </mesh>
            <mesh position={[0, 3.31, 0]}>
              <boxGeometry args={[0.5, 0.11, 0.5]} />
              <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.84} metalness={0.02} />
            </mesh>
            <mesh position={[0, 3.4, 0]}>
              <boxGeometry args={[0.36, 0.09, 0.36]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
            </mesh>
          </group>
        )),
      )}
      {/* 前后横梁 + 侧梁（髹漆） */}
      {[-2.5, -6.5].map((z) => (
        <mesh key={z} position={[0, 3.26, z]} castShadow receiveShadow>
          <boxGeometry args={[8.1, 0.24, 0.26]} />
          <meshStandardMaterial {...woodSurface} color={PAL.lacquer} roughness={0.84} metalness={0.02} />
        </mesh>
      ))}
      {[-3.7, 3.7].map((x) => (
        <mesh key={x} position={[x, 3.26, -4.5]} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.24, 4.3]} />
          <meshStandardMaterial {...woodSurface} color={PAL.lacquer} roughness={0.84} metalness={0.02} />
        </mesh>
      ))}

      {/* 下层歇山顶：前后坡面、两端山花与轻微翘檐 */}
      <mesh geometry={roofGeometry} position={[0, 3.38, -4.5]} castShadow receiveShadow>
        {/* 【渲染优化】微弱瓦面高光与贴图粗糙度塑造陶瓦层次。 */}
        <meshStandardMaterial {...roofSurface} color="#d8ded0" roughness={0.8} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>
      {/* 上层殿阁与第二重屋檐，保持正中轴线和前后关系 */}
      <mesh position={[0, 4.98, -4.5]}>
        <boxGeometry args={[4.1, 0.16, 2.9]} />
        <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.84} metalness={0.02} />
      </mesh>
      {([-1.65, 1.65] as const).flatMap((x) => [-5.2, -3.8].map((z) => (
        <group key={`upper-post-${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 5.42, 0]}>
            <cylinderGeometry args={[0.075, 0.095, 0.9, 24]} />
            <meshStandardMaterial {...woodSurface} color={PAL.pillar} roughness={0.84} metalness={0.02} />
          </mesh>
          <mesh position={[0, 4.98, 0]}>
            <boxGeometry args={[0.25, 0.1, 0.25]} />
            <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
          </mesh>
        </group>
      )))}
      {[-3.72, -5.28].map((z) => (
        <group key={`upper-screen-${z}`} position={[0, 0, z]}>
          <mesh position={[0, 5.45, 0]}>
            <boxGeometry args={[3.3, 0.72, 0.08]} />
            <meshStandardMaterial {...woodSurface} color="#726657" roughness={0.92} />
          </mesh>
          {[-1.1, -0.55, 0, 0.55, 1.1].map((x) => (
            <mesh key={x} position={[x, 5.45, z > -4.5 ? 0.052 : -0.052]}>
              <boxGeometry args={[0.035, 0.62, 0.025]} />
              <meshStandardMaterial color={PAL.gold} metalness={0.1} roughness={0.74} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh geometry={upperRoofGeometry} position={[0, 5.82, -4.5]} castShadow receiveShadow>
        <meshStandardMaterial {...roofSurface} color="#e0e4d8" roughness={0.8} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 6.89, -4.5]}>
        <boxGeometry args={[2.3, 0.13, 0.16]} />
        <meshStandardMaterial color={PAL.roofDark} roughness={0.72} />
      </mesh>
      {/* 正面瓦垄：细密的檐线让主殿屋面有层次，但不增加交互碰撞体 */}
      {Array.from({ length: 6 }, (_, i) => {
        const progress = (i + 1) / 7;
        const width = 7.5 * (1 - progress * 0.9);
        return (
          <mesh key={`tile-row-${i}`} position={[0, 3.38 + (1 - progress) * 1.62 + progress * 0.18, -1.85 - progress * 2.65]}>
            <boxGeometry args={[width, 0.045, 0.075]} />
            <meshStandardMaterial color={i % 2 ? PAL.roofDark : "#53665e"} roughness={0.72} />
          </mesh>
        );
      })}
      {/* 檐下暗木与细金线 */}
      <mesh position={[0, 3.34, -2.48]}>
        <boxGeometry args={[8.45, 0.12, 0.34]} />
        <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.84} metalness={0.02} />
      </mesh>
      <mesh position={[0, 3.28, -2.48]}>
        <boxGeometry args={[8.48, 0.025, 0.35]} />
        <meshStandardMaterial color={PAL.gold} metalness={0.12} roughness={0.72} />
      </mesh>
      <mesh position={[0, 5.03, -4.5]}>
        <boxGeometry args={[3.6, 0.14, 0.2]} />
        <meshStandardMaterial color={PAL.roofDark} roughness={0.76} />
      </mesh>
      {[-1.95, 1.95].map((x) => (
        <mesh key={x} position={[x, 4.98, -4.5]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={PAL.roofDark} roughness={0.8} />
        </mesh>
      ))}
      <pointLight position={[-2.7, 2.45, -2.2]} color="#ebce92" intensity={1.7 + warm * 0.65} distance={8} decay={2} />
      <pointLight position={[2.7, 2.45, -2.2]} color="#ebce92" intensity={1.7 + warm * 0.65} distance={8} decay={2} />
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
          <meshStandardMaterial color={PAL.gold} metalness={0.16} roughness={0.68} />
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
            <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.84} metalness={0.02} />
          </mesh>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[0.42, 0.52, 0.42]} />
            <meshStandardMaterial
              color="#e1c28c"
              emissive="#e4be7e"
              emissiveIntensity={0.4 + warm * 0.22}
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
            {/* 格扇木线与横枨 */}
            {[-0.82, -0.41, 0, 0.41, 0.82].map((dx) => (
              <mesh key={`lattice-${dx}`} position={[dx, 1.45, 0.052]}>
                <boxGeometry args={[0.025, 2.48, 0.025]} />
                <meshStandardMaterial color="#8d7453" roughness={0.78} />
              </mesh>
            ))}
            {[0.2, 2.7].map((y) => (
              <mesh key={`rail-${y}`} position={[0, y, 0.06]}>
                <boxGeometry args={[2.14, 0.045, 0.028]} />
                <meshStandardMaterial color="#765c40" roughness={0.72} />
              </mesh>
            ))}
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
                <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
              </mesh>
              <mesh position={[-0.16, 0.5, 0]}>
                <cylinderGeometry args={[0.05, 0.075, 0.05, 10]} />
                <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
              </mesh>
              {/* 爵（三足小杯，简化） */}
              <mesh position={[0.16, 0.365, 0.05]}>
                <cylinderGeometry args={[0.05, 0.035, 0.09, 8]} />
                <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
              </mesh>
              {[-0.03, 0.03].map((x) => (
                <mesh key={x} position={[0.16 + x, 0.315, 0.05]}>
                  <cylinderGeometry args={[0.008, 0.01, 0.05, 6]} />
                  <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
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
          <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
        </mesh>
        <mesh position={[0.18, 0.38, 0.06]}>
          <cylinderGeometry args={[0.055, 0.04, 0.1, 8]} />
          <meshStandardMaterial color={PAL.bronze} metalness={0.16} roughness={0.72} />
        </mesh>
      </group>
    </>
  );
}

function DistantPavilion({ x, scale }: { x: number; scale: number }) {
  const roofSurface = useCourtyardSurface("roof");
  const woodSurface = useCourtyardSurface("wood");
  const lowerRoof = useMemo(() => makeHippedRoofGeometry(6.8, 4.2, 2.8, 1.15, 0.18), []);
  const upperRoof = useMemo(() => makeHippedRoofGeometry(4.25, 2.8, 1.8, 0.72, 0.12), []);
  return (
    <group position={[x, 0, -19]} scale={scale}>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[7.2, 0.36, 4.5]} />
        <meshStandardMaterial color={PAL.stoneDark} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.05, -1.72]}>
        <boxGeometry args={[5.8, 1.45, 0.18]} />
        <meshStandardMaterial color={PAL.paper} roughness={0.92} />
      </mesh>
      {([-2.65, 2.65] as const).flatMap((px) => [-1.45, 1.25].map((z) => (
        <group key={`${px}-${z}`} position={[px, 0, z]}>
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 2.5, 20]} />
            <meshStandardMaterial {...woodSurface} color={PAL.pillar} roughness={0.84} metalness={0.02} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.32, 0.24, 0.32]} />
            <meshStandardMaterial color={PAL.stone} roughness={0.85} />
          </mesh>
        </group>
      )))}
      <mesh geometry={lowerRoof} position={[0, 2.35, 0]}>
        <meshStandardMaterial {...roofSurface} color="#c7d0c4" roughness={0.8} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[3.5, 0.1, 2.1]} />
        <meshStandardMaterial {...woodSurface} color={PAL.wood} roughness={0.84} metalness={0.02} />
      </mesh>
      <mesh geometry={upperRoof} position={[0, 3.53, 0]}>
        <meshStandardMaterial {...roofSurface} color="#d0d7cc" roughness={0.8} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── 场景根 ──
export function CourtyardScene({ atmosphere, title = "宾至如归" }: { atmosphere: number; title?: string }) {
  const warm = atmosphere / 100;
  return (
    <>
      <CourtyardColorGrade />
      <color attach="background" args={[PAL.skyTop]} />
      {/* 【渲染优化】远山分层淡雾，院内保留清晰度与材质明暗。 */}
      <fog attach="fog" args={["#aebbb9", 30, 66]} />
      <hemisphereLight args={["#dce6e3", "#777d70", 0.78 + warm * 0.05]} />
      <directionalLight
        castShadow
        position={[-12, 20, 8]}
        intensity={1.05}
        color="#f0e4cb"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-radius={3}
        shadow-intensity={0.68}
      />
      {/* 【渲染优化】克制的天空漫反射补光，避免阴影面死黑。 */}
      <directionalLight position={[10, 12, -18]} intensity={0.32} color="#c3d1d0" />
      <ambientLight intensity={0.16} color="#c7d0ca" />
      <MorningLightRays />
      <mesh position={[-17, 11, -43]}>
        <sphereGeometry args={[1.55, 20, 16]} />
        <meshBasicMaterial color="#e8dfbd" transparent opacity={0.42} />
      </mesh>

      <FarGround />
      <Fields />
      <Mountains />
      <Clouds />
      <DistantPavilion x={-9.2} scale={0.9} />
      <DistantPavilion x={9.2} scale={0.9} />
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
      <LanternDust position={[-2.4, 0.35, -0.9]} />
      <LanternDust position={[2.4, 0.35, -0.9]} />

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
      <RiteFigure
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

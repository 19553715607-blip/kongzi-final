"use client";

/** 六艺共享宣纸环境基建(inkwash)
 *
 * 风格定稿:方案 A「宣纸淡墨」为主 + 吸收方案 B 的真实柔影。
 *  - 统一色板与 toon 渐变带(MeshToonMaterial + 4 档线性渐变 = 软墨分档)
 *  - Ground / Mountains / Pines / Clouds 四件套(原先六景逐字复制的代码收拢于此)
 *  - SunWithShadow:可跟随焦点(马车/玩家)的柔影平行光
 *  - SoftEnv:本地 RoomEnvironment 反射,只喂给青铜/鎏金等 standard 材质(不引外网 HDR)
 *
 * 约定:unlit FX(远山/云/旗/涟漪)仍用 meshBasicMaterial;受光主体用 <InkMat>;
 * 需要投影的网格 castShadow,地面 receiveShadow。
 */

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

// ── 统一色板 ──
export const INK = {
  sky: "#f1ead7",
  fog: "#ece4cd",
  gold: "#d9a521",
  vermilion: "#b23a2c",
  wood: "#5a3b1d",
  ground: "#b3c091",
  path: "#d8ceaf",
  trunk: "#5a4632",
  pineDark: "#40543d",
  pineMid: "#465c42",
  pineLight: "#4a6044",
  cloud: "#fbf8ee",
} as const;

// ── toon 渐变带(模块级单例) ──
let _grad: THREE.DataTexture | null = null;
export function toonGradient(): THREE.DataTexture {
  if (_grad) return _grad;
  const steps = [96, 152, 204, 236];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  _grad = tex;
  return tex;
}

// ── 程序化材质纹理(去塑料感:木纹/漆器/灰浆/竹纹/布纹/草皮) ──
export type GrainKind = "wood" | "lacquer" | "plaster" | "bamboo" | "cloth" | "grass";
const _grainBase: Partial<Record<GrainKind, HTMLCanvasElement>> = {};

function grainCanvas(kind: GrainKind): HTMLCanvasElement {
  const hit = _grainBase[kind];
  if (hit) return hit;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const line = (x1: number, y1: number, x2: number, y2: number, w: number, a: string) => {
    ctx.strokeStyle = a;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  if (kind === "wood") {
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * size;
      const wob = 6 + Math.random() * 10;
      line(x, 0, x + (Math.random() < 0.5 ? wob : -wob), size, 1 + Math.random() * 2.2,
        `rgba(96,64,30,${0.08 + Math.random() * 0.16})`);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(90,58,26,${0.10 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 3 + Math.random() * 5, 8 + Math.random() * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "lacquer") {
    for (let i = 0; i < 26; i++) {
      line(Math.random() * size, 0, Math.random() * size, size, 1 + Math.random() * 2,
        `rgba(70,40,16,${0.05 + Math.random() * 0.07})`);
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(255,214,140,${0.04 + Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 22 + Math.random() * 34, 10 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "plaster") {
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(118,108,92,${0.05 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(206,200,186,${0.06 + Math.random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 18 + Math.random() * 30, 14 + Math.random() * 22, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "bamboo") {
    for (let i = 0; i < 70; i++) {
      const x = (i / 70) * size + Math.random() * 2;
      line(x, 0, x + (Math.random() * 4 - 2), size, 1, `rgba(108,88,40,${0.10 + Math.random() * 0.12})`);
    }
    for (const y of [size * 0.3, size * 0.72]) {
      ctx.fillStyle = "rgba(104,80,38,0.24)";
      ctx.fillRect(0, y, size, 6);
      ctx.fillStyle = "rgba(255,240,200,0.18)";
      ctx.fillRect(0, y + 6, size, 2);
    }
  } else if (kind === "cloth") {
    for (let y = 0; y < size; y += 4) line(0, y, size, y, 1, "rgba(96,86,64,0.12)");
    for (let x = 0; x < size; x += 4) line(x, 0, x, size, 1, "rgba(96,86,64,0.09)");
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(210,196,160,${0.05 + Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 20 + Math.random() * 30, 16 + Math.random() * 24, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // grass
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const h = 4 + Math.random() * 9;
      line(x, y, x + (Math.random() * 4 - 2), y - h, 1.2,
        Math.random() < 0.5 ? `rgba(88,118,58,${0.14 + Math.random() * 0.12})` : `rgba(168,196,116,${0.12 + Math.random() * 0.10})`);
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(140,158,96,${0.08 + Math.random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 24 + Math.random() * 36, 14 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  _grainBase[kind] = c;
  return c;
}

export function grainTexture(kind: GrainKind, rx: number, ry: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(grainCanvas(kind));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 受光主体材质:宣纸分档着色 + 可选程序化纹理(去塑料感) */
export function InkMat({
  color,
  opacity,
  grain,
  repeat = [1, 1],
}: {
  color?: string;
  opacity?: number;
  grain?: GrainKind;
  repeat?: [number, number];
}) {
  const grad = toonGradient();
  const map = useMemo(
    () => (grain ? grainTexture(grain, repeat[0], repeat[1]) : null),
    [grain, repeat[0], repeat[1]],
  );
  return (
    <meshToonMaterial
      color={color}
      gradientMap={grad}
      map={map ?? undefined}
      transparent={opacity != null && opacity < 1}
      opacity={opacity ?? 1}
    />
  );
}

// ── 柔影平行光(可跟随焦点) ──
export type FocusRef = { current: { x: number; y: number; z: number } | null };

export function SunWithShadow({
  offset = [12, 18, 7],
  size = 26,
  focus = [0, 0, 0],
  follow,
  intensity = 1.9,
  mapSize = 2048,
}: {
  offset?: [number, number, number];
  size?: number;
  focus?: [number, number, number];
  /** 每帧把太阳聚焦到该引用指向的世界坐标(如马车/玩家);null 时用 focus */
  follow?: FocusRef;
  intensity?: number;
  mapSize?: number;
}) {
  const { scene } = useThree();
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff1d4", intensity);
    l.castShadow = true;
    l.shadow.mapSize.set(mapSize, mapSize);
    const c = l.shadow.camera;
    c.left = -size;
    c.right = size;
    c.top = size;
    c.bottom = -size;
    c.near = 1;
    c.far = 140;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    scene.add(l);
    scene.add(l.target);
    return l;
  }, [scene, size, mapSize, intensity]);
  useEffect(() => () => {
    scene.remove(light);
    scene.remove(light.target);
    light.dispose();
  }, [scene, light]);
  const fixed = useRef(new THREE.Vector3(...focus));
  useFrame(() => {
    const f = follow?.current ?? fixed.current;
    light.position.set(f.x + offset[0], f.y + offset[1], f.z + offset[2]);
    light.target.position.set(f.x, f.y, f.z);
  });
  return null;
}

/** 全场景自动投影:给所有受光网格(toon/standard)开 castShadow(basic 材质 FX 不受影响) */
export function AutoCastShadow() {
  const { scene } = useThree();
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.Material | undefined;
      if (!m.isMesh || !mat || Array.isArray(mat)) return;
      const anyMat = mat as THREE.MeshToonMaterial & THREE.MeshStandardMaterial;
      if (anyMat.isMeshToonMaterial || anyMat.isMeshStandardMaterial) {
        m.castShadow = true;
      }
    });
  });
  return null;
}

/** 半球天光(柔) — 与 SunWithShadow 搭配 */
export function InkHemi({ intensity = 0.7 }: { intensity?: number }) {
  return <hemisphereLight args={["#f8f4e6", "#aebd90", intensity]} />;
}

// ── 本地环境反射(青铜/鎏金 standard 材质用) ──
export function SoftEnv({ strength = 0.5 }: { strength?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = strength;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, strength]);
  return null;
}

// ── 地面(程序化草地点彩) ──
let _groundTex: THREE.CanvasTexture | null = null;
function groundTexture(): THREE.CanvasTexture {
  if (_groundTex) return _groundTex;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = INK.ground;
  ctx.fillRect(0, 0, size, size);
  // 草地点彩:深浅两色随机椭圆
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3.5;
    ctx.fillStyle =
      Math.random() < 0.5 ? "rgba(122,138,88,0.16)" : "rgba(196,206,158,0.15)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // 淡横向笔触
  ctx.strokeStyle = "rgba(255,252,238,0.05)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + 6, size * 0.6, y - 6, size, y + 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  _groundTex = tex;
  return tex;
}

export function InkGround({
  size = [220, 140],
  position = [0, 0, -20],
}: {
  size?: [number, number];
  position?: [number, number, number];
}) {
  // 纹理按 ~28m/格 平铺,大地面自动加密
  const tex = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(2, size[0] / 28), Math.max(2, size[1] / 28));
    return t;
  }, [size[0], size[1]]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size[0], size[1]]} />
      <meshToonMaterial map={tex} gradientMap={toonGradient()} />
    </mesh>
  );
}

// ── 远山(墨韵叠层,unlit) ──
export interface RidgeDef {
  z: number;
  hBase: number;
  f1: number;
  f2: number;
  phase: number;
  color: string;
  opacity: number;
  span?: number;
}
export function InkMountains({ ridges }: { ridges?: RidgeDef[] }) {
  const defs: RidgeDef[] = ridges ?? [
    { z: -58, hBase: 9, f1: 0.9, f2: 0.31, phase: 1.2, color: "#93a495", opacity: 0.55 },
    { z: -46, hBase: 6, f1: 1.1, f2: 0.4, phase: 4.1, color: "#849a8c", opacity: 0.7 },
    { z: -38, hBase: 3.6, f1: 1.4, f2: 0.5, phase: 2.6, color: "#7a9184", opacity: 0.85 },
  ];
  const geos = useMemo(
    () =>
      defs.map((r) => {
        const span = r.span ?? 140;
        const pts: number[] = [];
        const n = 26;
        for (let i = 0; i <= n; i++) {
          const x = -span / 2 + (span * i) / n;
          const h =
            r.hBase +
            Math.sin(i * r.f1 + r.phase) * r.hBase * 0.45 +
            Math.sin(i * r.f2) * r.hBase * 0.2;
          pts.push(x, 0, r.z, x, h, r.z);
        }
        const idx: number[] = [];
        for (let i = 0; i < n; i++) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        geo.setIndex(idx);
        return { geo, r };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(defs)],
  );
  return (
    <>
      {geos.map(({ geo, r }, i) => (
        <mesh key={i} geometry={geo}>
          <meshBasicMaterial color={r.color} transparent opacity={r.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

// ── 松树(分层针叶,投射阴影) ──
export interface PineDef {
  x: number;
  z: number;
  s: number;
}
export function InkPines({ trees, dark = INK.pineDark, mid = INK.pineMid, light = INK.pineLight }: {
  trees: PineDef[];
  dark?: string;
  mid?: string;
  light?: string;
}) {
  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s} rotation={[0, (i * 1.7) % Math.PI, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 1, 7]} />
            <InkMat color={INK.trunk} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <coneGeometry args={[0.85, 1.6, 9]} />
            <InkMat color={dark} />
          </mesh>
          <mesh position={[0, 2.32, 0]} castShadow>
            <coneGeometry args={[0.62, 1.3, 9]} />
            <InkMat color={mid} />
          </mesh>
          <mesh position={[0, 3.05, 0]} castShadow>
            <coneGeometry args={[0.4, 1.0, 9]} />
            <InkMat color={light} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── 云(unlit 漂移) ──
export function InkClouds({ clouds, drift = 6 }: {
  clouds: { x: number; y: number; z: number; s: number }[];
  drift?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.03) * drift;
  });
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color={INK.cloud} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.9, -0.15, 0]} scale={0.7}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color={INK.cloud} transparent opacity={0.8} />
          </mesh>
          <mesh position={[-0.9, -0.2, 0]} scale={0.65}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color={INK.cloud} transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 宣纸天空 + 雾(场景根第一节) */
export function InkAtmo({ fogRange }: { fogRange: [number, number] }) {
  return (
    <>
      <color attach="background" args={[INK.sky]} />
      <fog attach="fog" args={[INK.fog, fogRange[0], fogRange[1]]} />
    </>
  );
}

/** 一站式环境包:天/雾/天光/柔影太阳/地面/远山/松/云 */
export function InkWorld({
  fogRange,
  groundSize,
  groundPosition,
  mountains,
  pines,
  clouds,
  sun,
  sunSize,
  sunFocus,
  children,
}: {
  fogRange: [number, number];
  groundSize?: [number, number];
  groundPosition?: [number, number, number];
  mountains?: RidgeDef[];
  pines?: PineDef[];
  clouds?: { x: number; y: number; z: number; s: number }[];
  sun?: { offset?: [number, number, number]; size?: number; focus?: [number, number, number]; follow?: FocusRef; mapSize?: number };
  sunSize?: number;
  sunFocus?: [number, number, number];
  children?: ReactNode;
}) {
  return (
    <>
      <InkAtmo fogRange={fogRange} />
      <InkHemi />
      <SoftEnv />
      <SunWithShadow
        size={sun?.size ?? sunSize}
        focus={sun?.focus ?? sunFocus}
        follow={sun?.follow}
        offset={sun?.offset}
        mapSize={sun?.mapSize}
      />
      <InkGround size={groundSize} position={groundPosition} />
      <InkMountains ridges={mountains} />
      {pines && <InkPines trees={pines} />}
      {clouds && <InkClouds clouds={clouds} />}
      {children}
    </>
  );
}

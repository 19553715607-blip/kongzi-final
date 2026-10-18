"use client";

/** 书艺·竹简挥毫 3D — React Three Fiber 场景
 *
 * 与数/乐场景同一宣纸色调：宣纸天光 + 远山 + 田野。
 * 书斋一张矮书案：宣纸书写面（CanvasTexture：米字格 + 浅灰底稿 + 墨迹）、
 * 砚台、笔山、镇纸、烛灯（火苗晃动 + 暖光）、背景竹帘。
 * 毛笔悬浮跟随指针（raycast 到纸面 UV → 画布坐标），落笔压下、沙沙有声。
 *
 * 书写事件：纸面 mesh 的 pointer 事件 → g.onPen(type,x,y,speed)（Game 侧接引擎）。
 * 纹理更新：引擎置 dirty，useFrame 置 needsUpdate。
 */

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { CANVAS_SIZE, type BrushEngineState } from "./brushEngine";

// ── 共享可变状态 ──
export type PenEvent = "down" | "move" | "up";

export interface BrushRefs {
  running: boolean;
  engine: BrushEngineState | null;
  /** 毛笔目标点（世界坐标，纸面）与落笔状态（场景动画用） */
  penWorld: THREE.Vector3;
  penActive: boolean;
  penDown: boolean;
  onPen: MutableRefObject<(type: PenEvent, x: number, y: number, speed: number, pressure: number) => void>;
}

export function createBrushRefs(): BrushRefs {
  return {
    running: false,
    engine: null,
    penWorld: new THREE.Vector3(0, 0.92, -1.0),
    penActive: false,
    penDown: false,
    onPen: { current: () => {} },
  };
}

// ── 场景常量（同一宣纸色调） ──
const SKY = "#f1ead7";
const FOG = "#ece4cd";
const GOLD = "#d9a521";
const WOOD = "#6b4a2e";
const WOOD_DARK = "#4a3520";
const BAMBOO = "#b8a25e";

const DESK_Y = 0.9;
const PAPER = { w: 3.7, y: DESK_Y + 0.03, cx: 0, cz: -1.0 };

// ── 场景根 ──
export function BrushScene({ g }: { g: BrushRefs }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 4.35, 4.9));
  const camLook = useRef(new THREE.Vector3(0, 0.85, -1.7));

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0, dtRaw)); // 防负 dt
    // 相机：固定书案视角 + 极轻微跟随笔锋（呼吸感）
    camPos.current.x += (g.penWorld.x * 0.08 - camPos.current.x) * Math.min(1, dt * 2);
    camPos.current.y = 4.35 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 30, 110]} />
      <hemisphereLight args={["#f8f4e6", "#aebd90", 0.9]} />
      <directionalLight position={[30, 40, 20]} intensity={0.65} color="#fff1d4" />

      <Ground />
      <Fields />
      <Mountains />
      <Clouds />
      <BambooScreen />
      <Desk />
      <InkStone />
      <BrushRest />
      <PaperWeights />
      <Candle />
      <Paper g={g} />
      <Brush g={g} />
    </>
  );
}

// ── 环境（同款） ──
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

// ── 竹帘背景 ──
function BambooScreen() {
  const slats = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      x: -8.4 + i * 0.58,
      c: i % 3 === 0 ? "#b09a55" : i % 3 === 1 ? BAMBOO : "#c0ab6a",
    })),
    [],
  );
  return (
    <group position={[0, 0, -5.6]}>
      {slats.map((s, i) => (
        <mesh key={i} position={[s.x, 3.1, 0]}>
          <boxGeometry args={[0.4, 6.2, 0.06]} />
          <meshStandardMaterial color={s.c} />
        </mesh>
      ))}
      {/* 帘上横梁 */}
      {[5.4, 3.4].map((y) => (
        <mesh key={y} position={[0, y, 0.06]}>
          <boxGeometry args={[17.4, 0.09, 0.04]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
    </group>
  );
}

// ── 书案 ──
function Desk() {
  return (
    <group position={[0, 0, -1.2]}>
      <mesh position={[0, DESK_Y - 0.16, 0]}>
        <boxGeometry args={[7.6, 0.32, 4.8]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {/* 案沿 */}
      <mesh position={[0, DESK_Y + 0.005, 0]}>
        <boxGeometry args={[7.7, 0.03, 4.9]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      {[[-3.4, -2.0], [3.4, -2.0], [-3.4, 2.0], [3.4, 2.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, DESK_Y / 2 - 0.16, z]}>
          <boxGeometry args={[0.3, DESK_Y - 0.3, 0.3]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
    </group>
  );
}

// ── 砚台（磨墨反光） ──
function InkStone() {
  return (
    <group position={[2.6, DESK_Y + 0.02, -0.7]}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.58, 0.64, 0.18, 20]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.6} />
      </mesh>
      {/* 墨池（镜面反光） */}
      <mesh position={[0, 0.185, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.36, 20]} />
        <meshStandardMaterial color="#12100e" metalness={0.85} roughness={0.15} />
      </mesh>
    </group>
  );
}

// ── 笔山 ──
function BrushRest() {
  return (
    <group position={[-2.5, DESK_Y + 0.02, -2.5]}>
      {[-0.28, 0, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0]}>
          <coneGeometry args={[0.16, 0.32 + (i === 1 ? 0.1 : 0), 8]} />
          <meshStandardMaterial color="#7a8a96" />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.9, 0.06, 0.3]} />
        <meshStandardMaterial color="#5a6a76" />
      </mesh>
    </group>
  );
}

// ── 镇纸 ──
function PaperWeights() {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (PAPER.w / 2 + 0.12), PAPER.y + 0.05, PAPER.cz]}>
          <boxGeometry args={[0.16, 0.09, 2.8]} />
          <meshStandardMaterial color="#4a4440" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

// ── 烛灯（火苗晃动 + 暖光） ──
function Candle() {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (flame.current) {
      flame.current.scale.set(
        1 + Math.sin(t * 11) * 0.08,
        1 + Math.sin(t * 13.7) * 0.15,
        1 + Math.cos(t * 9.3) * 0.08,
      );
      flame.current.rotation.z = Math.sin(t * 7.1) * 0.06;
    }
    if (light.current) light.current.intensity = 0.9 + Math.sin(t * 12.7) * 0.12;
  });
  return (
    <group position={[3.2, DESK_Y + 0.02, -2.6]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 1.0, 8]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.22, 0.14, 0.1, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={flame} position={[0, 1.22, 0]}>
        <coneGeometry args={[0.06, 0.22, 10]} />
        <meshBasicMaterial color="#f5a83c" />
      </mesh>
      <pointLight ref={light} position={[0, 1.4, 0]} color="#ffc978" intensity={0.9} distance={9} />
    </group>
  );
}

// ── 宣纸书写面（CanvasTexture + raycast UV 桥） ──
function Paper({ g }: { g: BrushRefs }) {
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const lastPt = useRef<{ x: number; y: number; t: number } | null>(null);

  const tex = useMemo(() => {
    const st = g.engine;
    if (!st) return null;
    const t = new THREE.CanvasTexture(st.view);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texRef.current = t;
    return t;
  }, [g.engine]);

  useFrame(() => {
    const st = g.engine;
    if (st && st.dirty && texRef.current) {
      texRef.current.needsUpdate = true;
      st.dirty = false;
    }
  });

  const toCanvas = (e: ThreeEvent<PointerEvent>) => {
    const uv = e.uv;
    if (!uv) return null;
    return { x: uv.x * CANVAS_SIZE, y: (1 - uv.y) * CANVAS_SIZE };
  };

  const speedOf = (x: number, y: number) => {
    const now = performance.now();
    const lp = lastPt.current;
    lastPt.current = { x, y, t: now };
    if (!lp) return 0;
    const dt = Math.max(1, now - lp.t) / 1000;
    return Math.hypot(x - lp.x, y - lp.y) / dt;
  };

  /** 真实压感（压感笔/触控 0~1 变化；鼠标按住恒 0.5） */
  const pressureOf = (e: ThreeEvent<PointerEvent>) => {
    const p = (e.nativeEvent as PointerEvent).pressure;
    return typeof p === "number" ? p : 0.5;
  };

  if (!tex) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[PAPER.cx, PAPER.y, PAPER.cz]}
      onPointerDown={(e) => {
        e.stopPropagation();
        const p = toCanvas(e);
        if (!p) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        g.penDown = true;
        g.penActive = true;
        g.penWorld.copy(e.point);
        lastPt.current = { x: p.x, y: p.y, t: performance.now() };
        g.onPen.current("down", p.x, p.y, 0, pressureOf(e));
      }}
      onPointerMove={(e) => {
        const p = toCanvas(e);
        if (!p) return;
        g.penActive = true;
        g.penWorld.copy(e.point);
        if (g.penDown) g.onPen.current("move", p.x, p.y, speedOf(p.x, p.y), pressureOf(e));
      }}
      onPointerUp={(e) => {
        if (!g.penDown) return;
        g.penDown = false;
        lastPt.current = null;
        g.onPen.current("up", 0, 0, 0, pressureOf(e));
      }}
      onPointerLeave={() => {
        g.penActive = false;
        if (g.penDown) {
          g.penDown = false;
          lastPt.current = null;
          g.onPen.current("up", 0, 0, 0, 0.5);
        }
      }}
    >
      <planeGeometry args={[PAPER.w, PAPER.w]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  );
}

// ── 毛笔（竹杆 + 锥形笔头，悬浮跟随指针；按压下压、笔头压扁） ──
function Brush({ g }: { g: BrushRefs }) {
  const grp = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const pressSm = useRef(0); // 平滑按压（与引擎 pressF 同步）
  const pos = useMemo(() => new THREE.Vector3(1.6, PAPER.y + 1.6, 0.4), []);
  useFrame((state, dtRaw) => {
    const el = grp.current;
    if (!el) return;
    const dt = Math.min(0.05, Math.max(0, dtRaw)); // 防负 dt
    // 按压：落笔时读引擎 pressF（0=提 1=按），提笔归零
    const st = g.engine;
    const press = g.penDown && st ? st.pressF : 0;
    pressSm.current += (press - pressSm.current) * Math.min(1, dt * 10);
    const pf = pressSm.current;
    // 目标：指针点上方；无指针时搁在砚台旁待命。按得越深笔越低
    const hoverH = g.penDown ? 0.44 - 0.26 * pf : 0.95;
    const tx = g.penActive ? g.penWorld.x : 1.6;
    const tz = g.penActive ? g.penWorld.z : 0.4;
    pos.x += (tx - pos.x) * Math.min(1, dt * 9);
    pos.z += (tz - pos.z) * Math.min(1, dt * 9);
    const bob = g.penDown ? 0 : Math.sin(state.clock.elapsedTime * 2.2) * 0.03;
    pos.y += (PAPER.y + hoverH + bob - pos.y) * Math.min(1, dt * 9);
    el.position.copy(pos);
    // 落笔压下更直立，按压力度越大倾角略大；提笔复原
    const tiltX = g.penDown ? 0.3 + 0.3 * pf : 0.5;
    el.rotation.x += (tiltX - el.rotation.x) * Math.min(1, dt * 8);
    // 笔头压扁：按=锥体压短变粗，提=复原收尖
    if (tip.current) {
      const ty = 1 - 0.5 * pf;
      const txz = 1 + 0.3 * pf;
      tip.current.scale.set(txz, ty, txz);
    }
  });
  return (
    <group ref={grp} position={[1.6, PAPER.y + 1.6, 0.4]} rotation={[0.5, 0, 0.12]}>
      {/* 竹杆 */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 1.25, 10]} />
        <meshStandardMaterial color="#b08d57" />
      </mesh>
      {/* 杆顶挂绳 */}
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      {/* 笔斗 */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.06, 0.055, 0.12, 10]} />
        <meshStandardMaterial color="#e8dcc0" />
      </mesh>
      {/* 笔头（锥形墨尖，按压压扁） */}
      <mesh ref={tip} position={[0, -0.2, 0]}>
        <coneGeometry args={[0.062, 0.26, 10]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, -0.31, 0]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshStandardMaterial color="#12100e" roughness={0.3} />
      </mesh>
    </group>
  );
}

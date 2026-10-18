"use client";

/** 射 · 观德 3D — React Three Fiber 场景
 *
 * 第一人称射圃：宣纸色天光 + 淡墨远山 + 松柏 + 风向旗 + 飘叶，
 * 木架靶布五环（靶面单位 → 世界坐标 R_WORLD=0.75m，距离 30m），
 * 拉弓时弦后引、相机 FOV 收窄；箭矢沿贝塞尔飞行带拖尾，中靶插箭留痕。
 *
 * 所有游戏数值来自 SheGame 持有的可变 GameRefs（useFrame 直读，不走 React 渲染）。
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { aimAt, type Impact } from "./sheEngine";

// ── 共享可变游戏状态（SheGame 创建并传入） ──
export type ScenePhase = "ready" | "draw" | "fly" | "mark" | "summary";

export interface StuckArrow { x: number; y: number; score: number } // 靶面单位
export interface Flight3D {
  u: number;
  t0: number;
  imp: Impact;
  from: [number, number, number];
  ctrl: [number, number, number];
  power: number;
  trail: [number, number, number][];
}

export interface GameRefs {
  phase: ScenePhase;
  wind: number;
  holdT0: number;
  seed: number;
  cross: { x: number; y: number } | null;
  aim: { x: number; y: number } | null; // 玩家指向偏移（靶面单位，移动鼠标/手指控制）
  amp: number;
  power: number;
  over: boolean;
  zoom: number;
  stuck: StuckArrow[];
  flight: Flight3D | null;
  ripple: { x: number; y: number; t0: number } | null;
  shakeT0: number | null;
}

export function createGameRefs(): GameRefs {
  return {
    phase: "ready",
    wind: 0,
    holdT0: 0,
    seed: 1,
    cross: null,
    aim: null,
    amp: 0.5,
    power: 0,
    over: false,
    zoom: 1,
    stuck: [],
    flight: null,
    ripple: null,
    shakeT0: null,
  };
}

// ── 场景常量 ──
const SKY = "#f1ead7";
const FOG = "#ece4cd";
const R_WORLD = 0.75; // 靶面单位 1 → 0.75m
const TARGET_Z = -30;
const TARGET_Y = 1.6;
const FLY_MS = 620;

const CROSS = "#c03a2b";
const CROSS_OVER = "#d98a17";
const GOLD = "#d9a521";

const RINGS: { r: number; color: string }[] = [
  { r: 0.8, color: "#26241f" },
  { r: 0.6, color: "#3f6f9e" },
  { r: 0.45, color: "#b23a2c" },
  { r: 0.28, color: GOLD },
  { r: 0.1, color: "#26241f" },
];

const FOV_BY_PHASE: Record<ScenePhase, number> = {
  ready: 55,
  draw: 47,
  fly: 45,
  mark: 40,
  summary: 55,
};

export function impactWorld(x: number, y: number): [number, number, number] {
  return [x * R_WORLD, TARGET_Y - y * R_WORLD, TARGET_Z];
}

// ── 场景根：驱动游戏数值 + 相机 ──
export function ArcheryScene({
  g,
  landRef,
  onOver,
}: {
  g: GameRefs;
  landRef: MutableRefObject<(imp: Impact) => void>;
  onOver?: (over: boolean) => void;
}) {
  const { camera } = useThree();
  const prevOver = useRef(false);
  // 相机注视点（平滑跟随）：拉弓时随指向轻转，飞/落靶时转向箭的归宿
  const lookRef = useRef(new THREE.Vector3(0, TARGET_Y, TARGET_Z));

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const now = performance.now();

    if (g.phase === "draw") {
      const t = (now - g.holdT0) / 1000;
      const a = aimAt(t, g.wind, g.seed);
      // 准星 = 呼吸漂移 + 玩家指向（移动鼠标/手指）
      g.cross = { x: a.swayX + (g.aim?.x ?? 0), y: a.swayY + (g.aim?.y ?? 0) };
      g.amp = a.amp;
      g.power = a.power;
      g.over = a.over;
      if (a.over !== prevOver.current) {
        prevOver.current = a.over;
        onOver?.(a.over);
      }
    } else if (g.phase !== "fly") {
      g.power = 0;
      g.cross = null;
      if (prevOver.current) {
        prevOver.current = false;
        onOver?.(false);
      }
    }

    // FOV 缓动（zoom 感）
    const cam = camera as THREE.PerspectiveCamera;
    const fovT = FOV_BY_PHASE[g.phase];
    if (Math.abs(cam.fov - fovT) > 0.05) {
      cam.fov += (fovT - cam.fov) * Math.min(1, dt * 5);
      cam.updateProjectionMatrix();
    }

    // 相机注视：draw 随指向 45%，fly/mark 随落点 70%，其余回正
    let lx = 0;
    let ly = TARGET_Y;
    if (g.phase === "draw" && g.cross) {
      const [ax, ay] = impactWorld(g.cross.x, g.cross.y);
      lx = ax * 0.45;
      ly = TARGET_Y + (ay - TARGET_Y) * 0.45;
    } else if (g.phase === "fly" || g.phase === "mark") {
      const ix = g.flight?.imp.x ?? g.ripple?.x ?? 0;
      const iy = g.flight?.imp.y ?? g.ripple?.y ?? 0;
      const [ax, ay] = impactWorld(ix, iy);
      lx = ax * 0.7;
      ly = TARGET_Y + (ay - TARGET_Y) * 0.7;
    }
    const kk = Math.min(1, dt * 4);
    lookRef.current.x += (lx - lookRef.current.x) * kk;
    lookRef.current.y += (ly - lookRef.current.y) * kk;
    camera.lookAt(lookRef.current.x, lookRef.current.y, TARGET_Z);

    // 飞行推进
    if (g.phase === "fly" && g.flight) {
      g.flight.u = (now - g.flight.t0) / FLY_MS;
      if (g.flight.u >= 1) {
        const imp = g.flight.imp;
        g.flight = null;
        landRef.current(imp);
      }
    }
  });

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 22, 85]} />
      <hemisphereLight args={["#f8f4e6", "#aebd90", 0.95]} />
      <directionalLight position={[6, 10, 4]} intensity={0.65} color="#fff1d4" />

      <Ground />
      <RangePath />
      <Mountains />
      <Pines />
      <Clouds />
      <TargetStand g={g} />
      <WindFlag g={g} />
      <Leaves g={g} />
      <Bow g={g} />
      <Reticle g={g} />
      <StuckArrows g={g} />
      <FlightArrow g={g} />
      <Ripple g={g} />
    </>
  );
}

// ── 环境 ──
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
      <planeGeometry args={[220, 140]} />
      <meshStandardMaterial color="#b3c091" />
    </mesh>
  );
}

function RangePath() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -15]}>
      <planeGeometry args={[2.4, 32]} />
      <meshStandardMaterial color="#d8ceaf" />
    </mesh>
  );
}

function Mountains() {
  const ridges = useMemo(() => {
    const mk = (z: number, hBase: number, f1: number, f2: number, phase: number) => {
      const pts: number[] = [];
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const x = -70 + (140 * i) / n;
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
      { geo: mk(-58, 9, 0.9, 0.31, 1.2), color: "#93a495", opacity: 0.55 },
      { geo: mk(-46, 6, 1.1, 0.4, 4.1), color: "#849a8c", opacity: 0.7 },
      { geo: mk(-38, 3.6, 1.4, 0.5, 2.6), color: "#7a9184", opacity: 0.85 },
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
      { x: -5.5, z: -14, s: 1.2 }, { x: 6.5, z: -18, s: 1.5 },
      { x: -8, z: -24, s: 1.8 }, { x: 9, z: -27, s: 1.3 },
      { x: -4, z: -33, s: 1.6 }, { x: 5, z: -35, s: 2.0 },
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
    if (ref.current) ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.03) * 6;
  });
  const clouds = useMemo(
    () => [
      { x: -16, y: 13, z: -50, s: 3.2 }, { x: 4, y: 16, z: -55, s: 4 },
      { x: 18, y: 12, z: -48, s: 2.6 },
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

// ── 靶架 + 靶布 + 环 ──
function TargetStand({ g }: { g: GameRefs }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    let sx = 0;
    let sy = 0;
    if (g.shakeT0 != null) {
      const k = (performance.now() - g.shakeT0) / 260;
      if (k < 1) {
        const d = (1 - k) * 0.03;
        sx = Math.sin(performance.now() / 16) * d;
        sy = Math.cos(performance.now() / 21) * d * 0.6;
      }
    }
    ref.current.position.set(sx, sy, 0);
  });
  return (
    <group position={[0, 0, TARGET_Z]}>
      <group ref={ref}>
        {/* 木架 */}
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} position={[x, 1.25, 0.06]}>
            <boxGeometry args={[0.09, 2.5, 0.09]} />
            <meshStandardMaterial color="#6b5136" />
          </mesh>
        ))}
        <mesh position={[0, 2.42, 0.06]}>
          <boxGeometry args={[2.35, 0.09, 0.09]} />
          <meshStandardMaterial color="#6b5136" />
        </mesh>
        {/* 靶布（侯） */}
        <mesh position={[0, TARGET_Y, 0]}>
          <planeGeometry args={[1.9, 1.9]} />
          <meshStandardMaterial color="#f6f1df" />
        </mesh>
        {/* 靶布木框 */}
        <mesh position={[0, TARGET_Y + 0.97, 0.01]}>
          <boxGeometry args={[1.98, 0.05, 0.03]} />
          <meshStandardMaterial color="#8a6a44" />
        </mesh>
        <mesh position={[0, TARGET_Y - 0.97, 0.01]}>
          <boxGeometry args={[1.98, 0.05, 0.03]} />
          <meshStandardMaterial color="#8a6a44" />
        </mesh>
        {/* 环（外→内） */}
        {RINGS.map((ring, i) => (
          <mesh key={i} position={[0, TARGET_Y, 0.012 + i * 0.0012]}>
            <circleGeometry args={[ring.r * R_WORLD, 48]} />
            <meshBasicMaterial color={ring.color} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── 风向旗 ──
function WindFlag({ g }: { g: GameRefs }) {
  const flagRef = useRef<THREE.Mesh>(null);
  const dirRef = useRef(1);
  useFrame((state) => {
    const mesh = flagRef.current;
    if (!mesh) return;
    const dir = g.wind >= 0 ? 1 : -1;
    if (dir !== dirRef.current) {
      dirRef.current = dir;
      mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    }
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    const speed = 4 + Math.abs(g.wind) * 3;
    const amp = 0.02 + Math.abs(g.wind) * 0.02;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const k = (x + 0.28) / 0.56; // 0 旗根 → 1 旗梢
      pos.setZ(i, Math.sin(t * speed + x * 9) * amp * k);
    }
    pos.needsUpdate = true;
  });
  return (
    <group position={[-1.75, 0, TARGET_Z + 0.4]}>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.022, 0.028, 2.7, 8]} />
        <meshStandardMaterial color="#6b5136" />
      </mesh>
      <mesh ref={flagRef} position={[0.3, 2.52, 0]}>
        <planeGeometry args={[0.56, 0.17, 12, 1]} />
        <meshBasicMaterial color="#b23a2c" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── 飘叶（风的可视化） ──
const LEAF_COUNT = 22;
function Leaves({ g }: { g: GameRefs }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const leaves = useMemo(
    () =>
      Array.from({ length: LEAF_COUNT }, () => ({
        x: (Math.random() - 0.5) * 16,
        y: 0.3 + Math.random() * 3.4,
        z: -4 - Math.random() * 30,
        vy: 0.25 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((state, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(0.05, dtRaw);
    const t = state.clock.elapsedTime;
    leaves.forEach((l, i) => {
      l.x += g.wind * 0.9 * dt + Math.sin(t * 1.6 + l.ph) * 0.35 * dt;
      l.y -= l.vy * dt;
      l.rot += dt * 2;
      if (l.y < 0.05 || Math.abs(l.x) > 11) {
        l.x = -Math.sign(g.wind || 1) * 10 + (Math.random() - 0.5) * 3;
        l.y = 1.5 + Math.random() * 3;
        l.z = -4 - Math.random() * 30;
      }
      dummy.position.set(l.x, l.y, l.z);
      dummy.rotation.set(l.rot, l.rot * 0.7, l.rot * 1.3);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, LEAF_COUNT]}>
      <planeGeometry args={[0.07, 0.035]} />
      <meshBasicMaterial color="#7a8a5a" side={THREE.DoubleSide} transparent opacity={0.7} />
    </instancedMesh>
  );
}

// ── 第一人称弓 ──
function Bow({ g }: { g: GameRefs }) {
  const groupRef = useRef<THREE.Group>(null);
  const strTopRef = useRef<THREE.Mesh>(null);
  const strBotRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const limbCurve = useMemo(() => {
    const upper = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.34, 0.02),
      new THREE.Vector3(0.02, 0.18, -0.02),
      new THREE.Vector3(0.03, 0, -0.03),
    ]);
    const lower = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03, 0, -0.03),
      new THREE.Vector3(0.02, -0.18, -0.02),
      new THREE.Vector3(0, -0.34, 0.02),
    ]);
    return { upper, lower };
  }, []);

  const vA = useMemo(() => new THREE.Vector3(), []);
  const vB = useMemo(() => new THREE.Vector3(), []);
  const vDir = useMemo(() => new THREE.Vector3(), []);
  const Y_AXIS = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((state) => {
    const grp = groupRef.current;
    if (!grp) return;
    // 挂在相机右下前方
    grp.position.copy(camera.position);
    grp.quaternion.copy(camera.quaternion);
    grp.translateX(0.3);
    grp.translateY(-0.3);
    grp.translateZ(-0.72);
    // 拉弓时随准星微微转动 + 呼吸微晃
    const swayX = g.cross ? g.cross.x : 0;
    const swayY = g.cross ? g.cross.y : 0;
    grp.rotation.y += -swayX * 0.045;
    grp.rotation.x += swayY * 0.045;
    const idle = g.phase === "draw" ? Math.sin(state.clock.elapsedTime * 5) * 0.004 * (g.over ? 4 : 1) : 0;
    grp.rotation.z += idle;

    // 弦：两段 V 形，从弓梢连到拉弦点
    const pull = g.power * 0.17;
    const seg = (mesh: THREE.Mesh | null, top: boolean) => {
      if (!mesh) return;
      vA.set(0, top ? 0.335 : -0.335, 0.02);
      vB.set(0, 0, pull);
      vDir.subVectors(vB, vA);
      const len = vDir.length();
      mesh.position.copy(vA).addScaledVector(vDir, 0.5);
      mesh.quaternion.setFromUnitVectors(Y_AXIS, vDir.normalize());
      mesh.scale.set(1, len, 1);
    };
    seg(strTopRef.current, true);
    seg(strBotRef.current, false);

    if (arrowRef.current) {
      arrowRef.current.visible = g.phase === "draw" || g.phase === "ready";
      arrowRef.current.position.z = pull - 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 弓臂 */}
      <mesh>
        <tubeGeometry args={[limbCurve.upper, 12, 0.011, 6]} />
        <meshStandardMaterial color="#5a3b1d" />
      </mesh>
      <mesh>
        <tubeGeometry args={[limbCurve.lower, 12, 0.011, 6]} />
        <meshStandardMaterial color="#5a3b1d" />
      </mesh>
      {/* 握把 */}
      <mesh position={[0.032, 0, -0.03]}>
        <cylinderGeometry args={[0.016, 0.016, 0.11, 8]} />
        <meshStandardMaterial color="#7a5330" />
      </mesh>
      {/* 弦（V 形两段） */}
      <mesh ref={strTopRef}>
        <cylinderGeometry args={[0.0022, 0.0022, 1, 4]} />
        <meshBasicMaterial color="#efe9d8" />
      </mesh>
      <mesh ref={strBotRef}>
        <cylinderGeometry args={[0.0022, 0.0022, 1, 4]} />
        <meshBasicMaterial color="#efe9d8" />
      </mesh>
      {/* 搭箭 */}
      <group ref={arrowRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.006, 0.006, 0.6, 6]} />
          <meshStandardMaterial color="#8a6a3f" />
        </mesh>
        <mesh position={[0, -0.33, 0]}>
          <coneGeometry args={[0.012, 0.045, 6]} />
          <meshStandardMaterial color="#4a463e" />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.002, 0.07, 0.03]} />
          <meshBasicMaterial color="#b23a2c" />
        </mesh>
      </group>
    </group>
  );
}

// ── 准星（靶面 3D 位置） ──
function Reticle({ g }: { g: GameRefs }) {
  const ref = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const grp = ref.current;
    if (!grp) return;
    const show = g.phase === "draw" && !!g.cross;
    grp.visible = show;
    if (!show || !g.cross) return;
    const [x, y] = impactWorld(g.cross.x, g.cross.y);
    grp.position.set(x, y, TARGET_Z + 0.06);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (g.over ? 14 : 6)) * 0.1;
    grp.scale.setScalar(pulse);
    const color = g.over ? CROSS_OVER : CROSS;
    matRef.current?.color.set(color);
    ringMatRef.current?.color.set(color);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh>
        <ringGeometry args={[0.028, 0.035, 24]} />
        <meshBasicMaterial ref={matRef} color={CROSS} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.006, 12]} />
        <meshBasicMaterial ref={ringMatRef} color={CROSS} />
      </mesh>
      {/* 十字线 */}
      <mesh>
        <boxGeometry args={[0.075, 0.004, 0.001]} />
        <meshBasicMaterial color={CROSS} transparent opacity={0.8} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.004, 0.075, 0.001]} />
        <meshBasicMaterial color={CROSS} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ── 飞行箭 + 拖尾 ──
function FlightArrow({ g }: { g: GameRefs }) {
  const arrowRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
  ), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const prev = useMemo(() => new THREE.Vector3(), []);

  const trail = useMemo(() => {
    const l = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "#8a6a3f", transparent: true, opacity: 0.45 }),
    );
    l.visible = false;
    l.frustumCulled = false;
    return l;
  }, []);

  useFrame(() => {
    const f = g.flight;
    const arrow = arrowRef.current;
    if (!arrow) return;
    if (!f) {
      arrow.visible = false;
      trail.visible = false;
      return;
    }
    arrow.visible = true;
    const [ix, iy, iz] = impactWorld(f.imp.x, f.imp.y);
    curve.v0.set(...f.from);
    curve.v1.set(...f.ctrl);
    curve.v2.set(ix, iy, iz);
    const u = Math.min(1, f.u);
    curve.getPoint(u, pos);
    curve.getPoint(Math.max(0, u - 0.03), prev);
    arrow.position.copy(pos);
    arrow.lookAt(prev);
    arrow.rotateX(Math.PI / 2);

    // 拖尾
    f.trail.push([pos.x, pos.y, pos.z]);
    if (f.trail.length > 16) f.trail.shift();
    if (f.trail.length > 1) {
      trail.visible = true;
      trail.geometry.dispose();
      trail.geometry = new THREE.BufferGeometry().setFromPoints(
        f.trail.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      );
    }
  });

  return (
    <>
      <group ref={arrowRef} visible={false}>
        <mesh>
          <cylinderGeometry args={[0.006, 0.006, 0.6, 6]} />
          <meshStandardMaterial color="#8a6a3f" />
        </mesh>
        <mesh position={[0, -0.33, 0]}>
          <coneGeometry args={[0.012, 0.045, 6]} />
          <meshStandardMaterial color="#4a463e" />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.002, 0.07, 0.03]} />
          <meshBasicMaterial color="#b23a2c" />
        </mesh>
      </group>
      <primitive object={trail} />
    </>
  );
}

// ── 插在靶上的箭 ──
function StuckArrows({ g }: { g: GameRefs }) {
  return (
    <>
      {g.stuck.map((a, i) => {
        const [x, y] = impactWorld(a.x, a.y);
        return (
          <group
            key={i}
            position={[x, y, TARGET_Z + 0.32]}
            rotation={[Math.PI / 2 + (a.y > 1 ? -0.15 : 0.06), 0, 0]}
          >
            <mesh>
              <cylinderGeometry args={[0.006, 0.006, 0.6, 6]} />
              <meshStandardMaterial color="#8a6a3f" />
            </mesh>
            <mesh position={[0, 0.27, 0]}>
              <boxGeometry args={[0.002, 0.07, 0.03]} />
              <meshBasicMaterial color="#b23a2c" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ── 命中涟漪 ──
function Ripple({ g }: { g: GameRefs }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!g.ripple) {
      mesh.visible = false;
      return;
    }
    const k = (performance.now() - g.ripple.t0) / 620;
    if (k >= 1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const [x, y] = impactWorld(g.ripple.x, g.ripple.y);
    mesh.position.set(x, y, TARGET_Z + 0.05);
    mesh.scale.setScalar(0.2 + k * 1.1);
    if (matRef.current) matRef.current.opacity = 0.55 * (1 - k);
  });
  return (
    <mesh ref={ref} visible={false}>
      <ringGeometry args={[0.09, 0.105, 32]} />
      <meshBasicMaterial ref={matRef} color="#b23a2c" transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

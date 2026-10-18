"use client";

/** 御艺·五御 3D — React Three Fiber 场景
 *
 * 第三人称追尾视角：宣纸天光 + 淡墨远山 + 田野松柏，
 * 双马轺车（枣红/青骢、四轮辐转动、华盖、鸾铃）沿 600m 御道前行，
 * 鸣和鸾金铃节拍门 / 过君表朱漆牌坊 / 舞交衢行人横穿 / 逐禽左奔鹿。
 *
 * 游戏逻辑全部由 yuEngine 在根 useFrame 推进（数值存 YuRefs，不走 React 渲染）。
 * 世界坐标约定：game y(0..600m) → z = -y；x 与车道中心偏移一致（米）。
 */

import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { YuEvent, YuObstacle, YuRoadConfig, YuScenarioBrief, YuTraffic } from "@/lib/types";
import {
  beatExpectedY,
  createRunState,
  deerProgress,
  pedProgress,
  roadCenterX,
  stepRun,
  trafficX,
  trafficY,
  type YuInput,
  type YuRunState,
} from "./yuEngine";
import * as sfx from "./yuAudio";

// ── 共享可变状态 ──
export interface YuRefs {
  running: boolean;
  scenario: YuScenarioBrief | null;
  run: YuRunState;
  input: YuInput;
  onEvents: MutableRefObject<(evts: YuEvent[], finished: boolean) => void>;
}

export function createYuRefs(): YuRefs {
  return {
    running: false,
    scenario: null,
    run: createRunState(),
    input: { left: false, right: false, up: false, down: false, liPressed: false },
    onEvents: { current: () => {} },
  };
}

// ── 场景常量 ──
const SKY = "#f1ead7";
const FOG = "#ece4cd";
const ROAD_W = 18; // 视觉路宽（米）
const GOLD = "#d9a521";
const VERMILION = "#b23a2c";

/** 车的世界位置（含弯道中心偏移） */
function carWorld(g: YuRefs): { x: number; z: number; yaw: number } {
  const { x, y } = g.run.car;
  const cfg = g.scenario?.road_config;
  const cx = roadCenterX(cfg, y);
  // 车头方向：弯道斜率 + 横向速度倾斜
  const ahead = roadCenterX(cfg, y + 6);
  const yaw = Math.atan2(ahead - cx, 6);
  return { x: cx + x, z: -y, yaw };
}

// ── 场景根 ──
export function YuScene({ g }: { g: YuRefs }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 4.0, 8.6));
  const camLook = useRef(new THREE.Vector3(0, 2.1, -5.5));
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);

    // 引擎推进
    if (g.running && g.scenario && !g.run.finished) {
      const out = stepRun(g.run, g.scenario, g.input, dt);
      if (out.newEvents.length > 0 || out.justFinished) {
        g.onEvents.current(out.newEvents, out.justFinished);
      }
    }
    const speed = g.run.car.speed;
    sfx.update(g.running ? speed : 0, g.running, g.run.rutOff);

    // 追尾相机：沿车头方向跟在正后方（弯道时相机随车转）+ 速度 FOV + 高速微颠
    const cw = carWorld(g);
    const t = state.clock.elapsedTime;
    const shake = speed > 9 ? (speed - 9) * 0.012 : 0;
    const fx = Math.sin(cw.yaw);
    const fz = -Math.cos(cw.yaw);
    const px = cw.x - fx * 8.6 + Math.sin(t * 17) * shake;
    const py = 4.6 + Math.cos(t * 21) * shake * 0.6;
    const pz = cw.z - fz * 8.6;
    const k = Math.min(1, dt * 3.2);
    camPos.current.x += (px - camPos.current.x) * k;
    camPos.current.y += (py - camPos.current.y) * k;
    camPos.current.z += (pz - camPos.current.z) * Math.min(1, dt * 5);
    camera.position.copy(camPos.current);
    lookTarget.set(cw.x + fx * 6, 2.2, cw.z + fz * 6);
    camLook.current.lerp(lookTarget, Math.min(1, dt * 4));
    camera.lookAt(camLook.current);
    const cam = camera as THREE.PerspectiveCamera;
    const fovT = 55 + Math.min(13, speed * 0.9);
    if (Math.abs(cam.fov - fovT) > 0.05) {
      cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }
  });

  const cfg = g.scenario?.road_config;
  const length = cfg?.length ?? 600;

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 60, 320]} />
      <hemisphereLight args={["#f8f4e6", "#aebd90", 0.95]} />
      <directionalLight position={[30, 40, 20]} intensity={0.7} color="#fff1d4" />

      <Ground length={length} />
      <Fields length={length} />
      <Mountains length={length} />
      <Pines length={length} />
      <Clouds />
      <Road g={g} />
      {cfg?.curves && cfg.curves.length > 0 && <River cfg={cfg} />}
      <BeatGates g={g} />
      <Obstacles g={g} />
      <Traffic g={g} />
      <FinishGate g={g} />
      <Chariot g={g} />
    </>
  );
}

// ── 环境 ──
function Ground({ length }: { length: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length / 2]}>
      <planeGeometry args={[500, length + 240]} />
      <meshStandardMaterial color="#b3c091" />
    </mesh>
  );
}

/** 田野色块（路两侧条状农田） */
function Fields({ length }: { length: number }) {
  const strips = useMemo(() => {
    const arr: { x: number; z: number; w: number; d: number; c: string }[] = [];
    const colors = ["#a8b87e", "#9cae74", "#b3bd88", "#a2b178"];
    for (let i = 0; i < Math.ceil(length / 55); i++) {
      const z = -i * 55 - 30;
      arr.push({ x: -45 - (i % 2) * 22, z, w: 42, d: 50, c: colors[i % 4] });
      arr.push({ x: 45 + ((i + 1) % 2) * 22, z, w: 42, d: 50, c: colors[(i + 2) % 4] });
    }
    return arr;
  }, [length]);
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

function Mountains({ length }: { length: number }) {
  const ridges = useMemo(() => {
    const mk = (z: number, hBase: number, f1: number, f2: number, phase: number) => {
      const pts: number[] = [];
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const x = -180 + (360 * i) / n;
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
    const zEnd = -length - 120;
    return [
      { geo: mk(zEnd - 40, 14, 0.9, 0.31, 1.2), color: "#93a495", opacity: 0.5 },
      { geo: mk(zEnd, 10, 1.1, 0.4, 4.1), color: "#849a8c", opacity: 0.65 },
      { geo: mk(-60, 8, 0.8, 0.35, 2.2), color: "#8b9c8d", opacity: 0.45 },
    ];
  }, [length]);
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

function Pines({ length }: { length: number }) {
  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < Math.ceil(length / 70); i++) {
      const side = i % 2 === 0 ? -1 : 1;
      arr.push({
        x: side * (20 + ((i * 37) % 25)),
        z: -i * 70 - 40,
        s: 1.1 + ((i * 13) % 10) / 10,
      });
    }
    return arr;
  }, [length]);
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
    if (ref.current) ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.03) * 8;
  });
  const clouds = useMemo(
    () => [
      { x: -30, y: 22, z: -140, s: 5 }, { x: 20, y: 26, z: -260, s: 6.5 },
      { x: -14, y: 20, z: -420, s: 4 }, { x: 34, y: 24, z: -560, s: 5.5 },
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

// ── 御道（随弯道偏移的夯土条带 + 界石 + 车辙双轨「九六线」） ──
//  先秦无现代黑白标线：路面为夯土色，车道以两轮车辙（轨）示向，
//  轨距取「车同轨」六尺制约 ±0.75m，随弯道一同偏移。
function Road({ g }: { g: YuRefs }) {
  const data = useMemo(() => {
    const cfg = g.scenario?.road_config;
    const length = cfg?.length ?? 600;
    const step = 8;
    const n = Math.ceil(length / step);
    // 路面条带
    const pts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const y = i * step;
      const cx = roadCenterX(cfg, y);
      pts.push(cx - ROAD_W / 2, 0.03, -y, cx + ROAD_W / 2, 0.03, -y);
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // 车辙双轨（两条压实土痕）
    const rutPts: number[] = [];
    const rutIdx: number[] = [];
    const RUT = 0.75; // 轨距之半（≈六尺）
    const RW = 0.22;  // 辙宽之半
    for (let i = 0; i <= n; i++) {
      const y = i * step;
      const cx = roadCenterX(cfg, y);
      rutPts.push(
        cx - RUT - RW, 0.045, -y, cx - RUT + RW, 0.045, -y,
        cx + RUT - RW, 0.045, -y, cx + RUT + RW, 0.045, -y,
      );
    }
    for (let i = 0; i < n; i++) {
      const a = i * 4;
      // 左辙
      rutIdx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
      // 右辙
      rutIdx.push(a + 2, a + 3, a + 6, a + 3, a + 7, a + 6);
    }
    const rutGeo = new THREE.BufferGeometry();
    rutGeo.setAttribute("position", new THREE.Float32BufferAttribute(rutPts, 3));
    rutGeo.setIndex(rutIdx);
    rutGeo.computeVertexNormals();
    // 界石
    const stones: { x: number; z: number }[] = [];
    for (let y = 10; y < length; y += 20) {
      const cx = roadCenterX(cfg, y);
      stones.push({ x: cx - ROAD_W / 2 - 0.6, z: -y });
      stones.push({ x: cx + ROAD_W / 2 + 0.6, z: -y });
    }
    return { geo, rutGeo, stones };
  }, [g.scenario]);

  return (
    <>
      <mesh geometry={data.geo}>
        <meshStandardMaterial color="#d8ceaf" />
      </mesh>
      <mesh geometry={data.rutGeo}>
        <meshStandardMaterial color="#bfae87" />
      </mesh>
      {data.stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.1, s.z]}>
          <boxGeometry args={[0.45, 0.2, 0.45]} />
          <meshStandardMaterial color="#b0a184" />
        </mesh>
      ))}
    </>
  );
}

/** 逐水曲：路右侧蜿蜒水道 */
function River({ cfg }: { cfg: YuRoadConfig }) {
  const geo = useMemo(() => {
    const length = cfg.length ?? 600;
    const step = 8;
    const n = Math.ceil(length / step);
    const pts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const y = i * step;
      const cx = roadCenterX(cfg, y) + 24; // 路右 24m
      pts.push(cx - 5, 0.02, -y, cx + 5, 0.02, -y);
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g2.setIndex(idx);
    return g2;
  }, [cfg]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#9dc2cf" transparent opacity={0.9} />
    </mesh>
  );
}

// ── 鸣和鸾：金铃节拍门 ──
function BeatGates({ g }: { g: YuRefs }) {
  const beats = g.scenario?.road_config?.beats ?? [];
  if (beats.length === 0 || !g.scenario) return null;
  const s = g.scenario;
  return (
    <>
      {beats.map((_, i) => (
        <BeatGate key={i} g={g} idx={i} y={beatExpectedY(s, i)} />
      ))}
    </>
  );
}

function BeatGate({ g, idx, y }: { g: YuRefs; idx: number; y: number }) {
  const bellRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const rs = g.run;
    const beats = g.scenario?.road_config?.beats ?? [];
    // 状态：已过 = 看事件（中/未中）；当前 = 下一门；未到 = 金
    let color = GOLD;
    let emissive = 0.25;
    const done = rs.events.filter((e) => e.type === "beat_hit").length > idx;
    if (done) {
      const ev = rs.events.filter((e) => e.type === "beat_hit")[idx];
      color = ev?.meta?.missed ? "#9c3c30" : "#3f6f4e";
      emissive = 0.05;
    } else if (rs.nextBeatIdx === idx) {
      // 临近节拍时铃发光脉动
      const timeTo = beats[idx] - rs.elapsedMs / 1000;
      emissive = timeTo < 1 ? 0.9 : 0.4;
    }
    if (matRef.current) {
      matRef.current.color.set(color);
      matRef.current.emissive.set(color);
      matRef.current.emissiveIntensity = emissive;
    }
    if (bellRef.current) {
      bellRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2.4) * 0.08;
    }
  });
  return (
    <group position={[0, 0, -y]}>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 2.4, 0]}>
          <cylinderGeometry args={[0.14, 0.18, 4.8, 8]} />
          <meshStandardMaterial color={VERMILION} />
        </mesh>
      ))}
      <mesh position={[0, 4.9, 0]}>
        <boxGeometry args={[10.2, 0.3, 0.3]} />
        <meshStandardMaterial color={VERMILION} />
      </mesh>
      <group ref={bellRef} position={[0, 4.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.42, 14, 12]} />
          <meshStandardMaterial ref={matRef} color={GOLD} emissive={GOLD} emissiveIntensity={0.25} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <coneGeometry args={[0.12, 0.24, 8]} />
          <meshStandardMaterial color="#8a6a3f" />
        </mesh>
      </group>
    </group>
  );
}

// ── 障碍物：君表牌坊 / 行人 / 奔鹿 ──
function Obstacles({ g }: { g: YuRefs }) {
  const obstacles = g.scenario?.road_config?.obstacles ?? [];
  return (
    <>
      {obstacles.map((o, i) => {
        if (o.type === "junbiao") return <JunbiaoArch key={i} g={g} o={o} idx={i} />;
        if (o.type === "pedestrian") return <Pedestrian key={i} g={g} o={o} idx={i} />;
        if (o.type === "deer") return <Deer key={i} g={g} o={o} idx={i} />;
        return null;
      })}
    </>
  );
}

/** 君表：朱漆石门牌坊 + 前 30m 缓行金环（操作提示） */
function JunbiaoArch({ g, o, idx }: { g: YuRefs; o: YuObstacle; idx: number }) {
  const plaqueRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = plaqueRef.current;
    if (!m) return;
    const active = Math.abs(g.run.car.y - o.y) < 40 && !g.run.passedJunbiao.has(idx);
    m.emissive.set(active ? "#7c2317" : "#000000");
    m.emissiveIntensity = active ? 0.8 : 0;
  });
  return (
    <group position={[roadCenterX(g.scenario?.road_config, o.y), 0, -o.y]}>
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]}>
          <boxGeometry args={[0.5, 5.2, 0.5]} />
          <meshStandardMaterial color={VERMILION} />
        </mesh>
      ))}
      <mesh position={[0, 5.4, 0]}>
        <boxGeometry args={[8.2, 0.5, 0.6]} />
        <meshStandardMaterial color={VERMILION} />
      </mesh>
      <mesh position={[0, 4.6, 0]}>
        <boxGeometry args={[2.2, 0.9, 0.2]} />
        <meshStandardMaterial ref={plaqueRef} color="#2b2925" emissive="#7c2317" emissiveIntensity={0} />
      </mesh>
      {/* 缓行提示环（前 30m） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 30]}>
        <ringGeometry args={[4.2, 4.7, 40]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** 行人：宽袍大袖横穿马路；被撞则倾倒 */
function Pedestrian({ g, o, idx }: { g: YuRefs; o: YuObstacle; idx: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((state) => {
    const el = grp.current;
    if (!el) return;
    const p = pedProgress(g.run, idx);
    if (p < 0) {
      // 未触发：站在路边等待
      el.position.set(-(o.cross_dir ?? 1) * 11 + roadCenterX(g.scenario?.road_config, o.y), 0, -o.y);
      el.rotation.z = 0;
      return;
    }
    const dir = o.cross_dir ?? 1;
    const x = (-11 + 22 * p) * dir + roadCenterX(g.scenario?.road_config, o.y);
    el.position.x = x;
    el.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 7)) * 0.06; // 走路起伏
    const hit = g.run.events.some((e) => e.type === "hit_pedestrian" && e.meta?.idx === idx);
    el.rotation.z = hit ? 1.35 : 0;
  });
  return (
    <group ref={grp} position={[0, 0, -o.y]}>
      {/* 袍 */}
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.34, 1.24, 10]} />
        <meshStandardMaterial color="#5b6e8c" />
      </mesh>
      {/* 头 */}
      <mesh position={[0, 1.44, 0]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color="#e8c9a0" />
      </mesh>
      {/* 冠 */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.12, 8]} />
        <meshStandardMaterial color="#2b2925" />
      </mesh>
    </group>
  );
}

/** 奔鹿：车近受惊，向左奔逸（逐禽左：勿追） */
function Deer({ g, o, idx }: { g: YuRefs; o: YuObstacle; idx: number }) {
  const grp = useRef<THREE.Group>(null);
  const legsRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const el = grp.current;
    if (!el) return;
    const p = deerProgress(g.run, idx);
    if (p < 0) {
      el.position.set(-16 + roadCenterX(g.scenario?.road_config, o.y), 0, -o.y);
      el.visible = true;
      return;
    }
    // 奔逃：向左远处跑去
    const run = p * 60;
    el.position.x = -16 + roadCenterX(g.scenario?.road_config, o.y) - run;
    el.position.z = -o.y - p * 12;
    el.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 12)) * 0.18 * (1 - p);
    el.visible = p < 0.98;
    if (legsRef.current) legsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 12) * 0.4 * (1 - p);
  });
  return (
    <group ref={grp} position={[-16, 0, -o.y]} rotation={[0, Math.PI / 2, 0]}>
      {/* 身 */}
      <mesh position={[0, 0.78, 0]}>
        <capsuleGeometry args={[0.26, 0.7, 6, 10]} />
        <meshStandardMaterial color="#9a7148" />
      </mesh>
      {/* 颈 + 头 */}
      <mesh position={[0, 1.16, 0.42]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.5, 8]} />
        <meshStandardMaterial color="#9a7148" />
      </mesh>
      <mesh position={[0, 1.44, 0.56]}>
        <boxGeometry args={[0.2, 0.2, 0.3]} />
        <meshStandardMaterial color="#8a6339" />
      </mesh>
      {/* 角 */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 1.64, 0.5]} rotation={[0.3, 0, x > 0 ? -0.4 : 0.4]}>
          <coneGeometry args={[0.03, 0.34, 5]} />
          <meshStandardMaterial color="#6b5136" />
        </mesh>
      ))}
      {/* 腿 */}
      <group ref={legsRef}>
        {[[-0.16, 0.3], [0.16, 0.3], [-0.16, -0.3], [0.16, -0.3]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.3, z]}>
            <cylinderGeometry args={[0.045, 0.04, 0.62, 6]} />
            <meshStandardMaterial color="#8a6339" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 终点牌坊 */
function FinishGate({ g }: { g: YuRefs }) {
  const cfg = g.scenario?.road_config;
  const length = cfg?.length ?? 600;
  const cx = roadCenterX(cfg, length);
  return (
    <group position={[cx, 0, -length]}>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 2.8, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 5.6, 8]} />
          <meshStandardMaterial color="#6b5136" />
        </mesh>
      ))}
      <mesh position={[0, 5.7, 0]}>
        <boxGeometry args={[10.4, 0.4, 0.4]} />
        <meshStandardMaterial color={GOLD} />
      </mesh>
      <mesh position={[0, 5.05, 0]}>
        <boxGeometry args={[3, 0.8, 0.15]} />
        <meshStandardMaterial color="#f6f1df" />
      </mesh>
    </group>
  );
}

/** 御者（深衣拱手，受「礼」时俯身相揖） */
const Driver = forwardRef<THREE.Group, { coat: string }>(
  function DriverInner({ coat }, ref) {
    return (
      <group ref={ref} position={[0, 1.28, -0.1]}>
        {/* 深衣 */}
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.42, 10]} />
          <meshStandardMaterial color={coat} />
        </mesh>
        {/* 双臂前拱 */}
        <mesh position={[0, 0.22, -0.14]} rotation={[Math.PI / 2.6, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshStandardMaterial color={coat} />
        </mesh>
        {/* 首 */}
        <mesh position={[0, 0.44, 0]}>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial color="#d9b48f" />
        </mesh>
        {/* 冠 */}
        <mesh position={[0, 0.53, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.08, 10]} />
          <meshStandardMaterial color="#2b2620" />
        </mesh>
      </group>
    );
  },
);
Driver.displayName = "Driver";

/** 最近一次「礼/相揖」事件时刻（无则 -1） */
function lastBowT(g: YuRefs, idx?: number): number {
  const evs = g.run.events;
  for (let i = evs.length - 1; i >= 0; i--) {
    const e = evs[i];
    if (idx == null ? e.type === "li" || e.type === "meet_li" : e.type === "meet_li" && e.meta?.idx === idx) {
      return e.t;
    }
  }
  return -1;
}

/** 拱手俯身角：事件后 1.4s 一揖到底再起身；delay 用于回礼稍迟 */
function bowAngle(g: YuRefs, t0: number, delayMs = 0): number {
  if (t0 < 0) return 0;
  const ph = (g.run.elapsedMs - t0 - delayMs) / 1400;
  return ph >= 0 && ph <= 1 ? Math.sin(ph * Math.PI) * 0.55 : 0;
}

// ── 车马往来：AI 轺车（对向会车 / 前行慢车，单马素盖以别于玩家） ──
function Traffic({ g }: { g: YuRefs }) {
  const list = g.scenario?.road_config?.traffic ?? [];
  if (!g.scenario || list.length === 0) return null;
  return (
    <>
      {list.map((tr, i) => (
        <AIChariot key={i} g={g} tr={tr} idx={i} />
      ))}
    </>
  );
}

function AIChariot({ g, tr, idx }: { g: YuRefs; tr: YuTraffic; idx: number }) {
  const root = useRef<THREE.Group>(null);
  const horseRef = useRef<THREE.Group>(null);
  const wheelL = useRef<THREE.Group>(null);
  const wheelR = useRef<THREE.Group>(null);
  const driverRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const el = root.current;
    if (!el) return;
    const cfg = g.scenario?.road_config;
    const yAi = trafficY(tr, g.run.elapsedMs);
    const cx = roadCenterX(cfg, yAi);
    el.position.set(cx + trafficX(tr), 0, -yAi);
    const speed = tr.speed ?? (tr.type === "oncoming" ? 6 : 4.5);
    // 朝向：对向车朝 +z（迎玩家），慢车与玩家同向
    const lookY = tr.type === "oncoming" ? yAi - 6 : yAi + 6;
    const a = Math.atan2(roadCenterX(cfg, lookY) - cx, 6);
    el.rotation.y = tr.type === "oncoming" ? a - Math.PI : -a;
    const t = state.clock.elapsedTime;
    const spin = (speed / 0.65) * 0.016;
    if (wheelL.current) wheelL.current.rotation.x += spin;
    if (wheelR.current) wheelR.current.rotation.x += spin;
    const hg = horseRef.current;
    if (hg) {
      const phase = t * (4 + speed * 1.1);
      hg.position.y = Math.abs(Math.sin(phase)) * 0.05;
      hg.children.forEach((child) => {
        if (child.userData.leg != null) {
          const off = child.userData.leg % 2 === 0 ? 0 : Math.PI;
          child.rotation.x = Math.sin(phase + off) * 0.5;
        }
      });
    }
    // 相揖回礼（稍迟 0.4s，先受礼再答礼）
    if (driverRef.current) {
      driverRef.current.rotation.x = bowAngle(g, lastBowT(g, idx), 400);
    }
  });

  const oncoming = tr.type === "oncoming";
  return (
    <group ref={root}>
      <Horse ref={horseRef} x={0} coat={oncoming ? "#3a3a42" : "#6e5233"} mane="#241c14" />
      {/* 辕 */}
      <mesh position={[0, 0.86, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 2.4, 8]} />
        <meshStandardMaterial color="#5a3b1d" />
      </mesh>
      {/* 舆（与玩家朱厢相别） */}
      <mesh position={[0, 0.98, 0.2]}>
        <boxGeometry args={[1.6, 0.48, 1.4]} />
        <meshStandardMaterial color={oncoming ? "#474a55" : "#6b4a2e"} />
      </mesh>
      {/* 盖 */}
      <mesh position={[0, 1.9, 0.22]}>
        <cylinderGeometry args={[0.035, 0.035, 1.25, 8]} />
        <meshStandardMaterial color="#5a3b1d" />
      </mesh>
      <mesh position={[0, 2.58, 0.22]}>
        <coneGeometry args={[1.05, 0.46, 12]} />
        <meshStandardMaterial color={oncoming ? "#5a6e8c" : "#7c8a5a"} />
      </mesh>
      <Driver ref={driverRef} coat={oncoming ? "#3c4048" : "#4e3f2c"} />
      <SpokedWheel ref={wheelL} x={-0.9} z={0.22} />
      <SpokedWheel ref={wheelR} x={0.9} z={0.22} />
    </group>
  );
}

// ── 双马轺车（精细主角） ──
function Chariot({ g }: { g: YuRefs }) {
  const root = useRef<THREE.Group>(null);
  const wheelL = useRef<THREE.Group>(null);
  const wheelR = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const driverRef = useRef<THREE.Group>(null);
  const horseRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];

  useFrame((state) => {
    const el = root.current;
    if (!el) return;
    const cw = carWorld(g);
    const speed = g.run.car.speed;
    el.position.set(cw.x, 0, cw.z);
    // 车头朝 -z；朝向 = 弯道切线 + 横向速度分量（rotation.y 取负：三维里 rotation.y 正 = 朝 -x）
    const velYaw = cw.yaw + Math.atan2(g.run.car.vx, Math.max(2, speed));
    const latLean = g.input.left ? 0.06 : g.input.right ? -0.06 : 0;
    el.rotation.y = -velYaw + (g.input.left ? 0.06 : g.input.right ? -0.06 : 0);
    el.rotation.z = latLean;

    const t = state.clock.elapsedTime;
    // 车轮滚动（r=0.65）
    const spin = (speed / 0.65) * 0.016;
    if (wheelL.current) wheelL.current.rotation.x += spin;
    if (wheelR.current) wheelR.current.rotation.x += spin;
    // 车身起伏（循轨平稳；出辙则颠簸加剧、带横向摇晃）
    if (bodyRef.current) {
      const off = g.run.rutOff * Math.min(1, speed / 7); // 出辙颠簸强度
      const jolt =
        (Math.sin(t * 23.7) * 0.5 + Math.sin(t * 31.3) * 0.35 + Math.sin(t * 47.1) * 0.15) * off;
      bodyRef.current.position.y =
        Math.sin(t * 9) * 0.02 * Math.min(1, speed / 6) + jolt * 0.075;
      bodyRef.current.rotation.x = Math.sin(t * 7.3) * 0.008 * Math.min(1, speed / 6) + jolt * 0.02;
      bodyRef.current.rotation.z = Math.sin(t * 27.9) * 0.022 * off;
    }
    // 马蹄快步
    horseRefs.forEach((h, hi) => {
      const hg = h.current;
      if (!hg) return;
      const phase = t * (4 + speed * 1.1) + hi * Math.PI;
      hg.position.y = Math.abs(Math.sin(phase)) * 0.05 * Math.min(1, speed / 4);
      hg.children.forEach((child) => {
        if (child.userData.leg != null) {
          const off = child.userData.leg % 2 === 0 ? 0 : Math.PI;
          child.rotation.x = Math.sin(phase + off) * 0.5 * Math.min(1, speed / 4);
        }
      });
    });
    // 御者拱手（按礼时一揖）
    if (driverRef.current) {
      driverRef.current.rotation.x = bowAngle(g, lastBowT(g));
    }
  });

  return (
    <group ref={root} position={[0, 0, 0]}>
      {/* 马（枣红 + 青骢） */}
      <Horse ref={horseRefs[0]} x={-0.62} coat="#7a4a2b" mane="#3c2a1a" />
      <Horse ref={horseRefs[1]} x={0.62} coat="#4e4a44" mane="#211d19" />
      {/* 辕 + 轭 */}
      <mesh position={[0, 0.86, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 2.8, 8]} />
        <meshStandardMaterial color="#5a3b1d" />
      </mesh>
      <mesh position={[0, 1.05, -2.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 1.7, 8]} />
        <meshStandardMaterial color="#6b4a26" />
      </mesh>
      {/* 鸾铃（轭两端） */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.94, -2.6]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* 车舆 */}
      <group ref={bodyRef} position={[0, 0, 0]}>
        {/* 厢体 */}
        <mesh position={[0, 0.98, 0.2]}>
          <boxGeometry args={[1.7, 0.5, 1.5]} />
          <meshStandardMaterial color="#8c2f24" />
        </mesh>
        {/* 栏杆 */}
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 1.45, 0.2]}>
            <boxGeometry args={[0.06, 0.45, 1.5]} />
            <meshStandardMaterial color="#5a3b1d" />
          </mesh>
        ))}
        <mesh position={[0, 1.45, 0.92]}>
          <boxGeometry args={[1.7, 0.45, 0.06]} />
          <meshStandardMaterial color="#5a3b1d" />
        </mesh>
        {/* 轼（前横木） */}
        <mesh position={[0, 1.32, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
          <meshStandardMaterial color="#6b4a26" />
        </mesh>
        {/* 御者（按礼时拱手一揖） */}
        <Driver ref={driverRef} coat="#6b2420" />
        {/* 华盖杆 + 盖 */}
        <mesh position={[0, 1.9, 0.25]}>
          <cylinderGeometry args={[0.035, 0.035, 1.3, 8]} />
          <meshStandardMaterial color="#5a3b1d" />
        </mesh>
        <mesh position={[0, 2.62, 0.25]}>
          <coneGeometry args={[1.15, 0.5, 12]} />
          <meshStandardMaterial color="#c9a24a" />
        </mesh>
        <mesh position={[0, 2.86, 0.25]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
      {/* 大车轮（辐条） */}
      <SpokedWheel ref={wheelL} x={-0.95} z={0.25} />
      <SpokedWheel ref={wheelR} x={0.95} z={0.25} />
    </group>
  );
}

/** 马：身/颈/头/耳/鬃/尾/四腿（腿带 userData.leg 供快步动画） */
const Horse = forwardRef<THREE.Group, { x: number; coat: string; mane: string }>(
  function HorseInner({ x, coat, mane }, ref) {
    return (
      <group ref={ref} position={[x, 0, -2.6]}>
        {/* 身 */}
        <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.3, 0.85, 6, 12]} />
          <meshStandardMaterial color={coat} />
        </mesh>
        {/* 颈 */}
        <mesh position={[0, 1.38, -0.5]} rotation={[0.7, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.2, 0.65, 10]} />
          <meshStandardMaterial color={coat} />
        </mesh>
        {/* 头 */}
        <mesh position={[0, 1.66, -0.78]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.24, 0.26, 0.52]} />
          <meshStandardMaterial color={coat} />
        </mesh>
        {/* 耳 */}
        {[-0.08, 0.08].map((ex) => (
          <mesh key={ex} position={[ex, 1.84, -0.66]}>
            <coneGeometry args={[0.045, 0.14, 6]} />
            <meshStandardMaterial color={coat} />
          </mesh>
        ))}
        {/* 鬃 */}
        <mesh position={[0, 1.52, -0.38]} rotation={[0.7, 0, 0]}>
          <boxGeometry args={[0.06, 0.5, 0.16]} />
          <meshStandardMaterial color={mane} />
        </mesh>
        {/* 尾 */}
        <mesh position={[0, 1.05, 0.62]} rotation={[-0.9, 0, 0]}>
          <coneGeometry args={[0.09, 0.6, 8]} />
          <meshStandardMaterial color={mane} />
        </mesh>
        {/* 腿（快步动画节点） */}
        {[[-0.16, -0.34], [0.16, -0.34], [-0.16, 0.36], [0.16, 0.36]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.42, lz]} userData={{ leg: i }}>
            <cylinderGeometry args={[0.055, 0.045, 0.85, 8]} />
            <meshStandardMaterial color={coat} />
          </mesh>
        ))}
      </group>
    );
  },
);
Horse.displayName = "Horse";

/** 十二辐大车轮 */
const SpokedWheel = forwardRef<THREE.Group, { x: number; z: number }>(
  function WheelInner({ x, z }, ref) {
    const spokes = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6), []);
    return (
      <group ref={ref} position={[x, 0.65, z]}>
        {/* 轮圈（绕 x 轴旋转 → 圈在 yz 平面） */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.62, 0.055, 10, 28]} />
          <meshStandardMaterial color="#4a3520" />
        </mesh>
        {/* 辐条 */}
        {spokes.map((a, i) => (
          <mesh key={i} rotation={[a, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 1.2, 6]} />
            <meshStandardMaterial color="#6b4a26" />
          </mesh>
        ))}
        {/* 毂 */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.18, 10]} />
          <meshStandardMaterial color="#3c2a16" />
        </mesh>
      </group>
    );
  },
);
SpokedWheel.displayName = "SpokedWheel";

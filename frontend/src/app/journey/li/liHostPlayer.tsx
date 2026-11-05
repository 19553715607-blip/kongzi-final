/**
 * 礼 · 庭院行走操控（WASD / 方向键 + 过门跟随镜头）
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { RiteFigure, PAL, WORLD, LI_COLLIDERS } from "./liHostVisuals";
import * as sfx from "./liHostAudio";

export const PLAYER_START = new THREE.Vector3(0, 0, 1.2);

const PLAYER_R = 0.26;

/** 实体碰撞：圆推离 + 盒最小轴推出（与 WORLD 边界钳制配合）。 */
function resolveColliders(px: number, pz: number): [number, number] {
  for (const c of LI_COLLIDERS.circles) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + PLAYER_R;
    if (d < min && d > 1e-4) {
      px = c.x + (dx / d) * min;
      pz = c.z + (dz / d) * min;
    }
  }
  for (const b of LI_COLLIDERS.boxes) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const ox = b.hx + PLAYER_R - Math.abs(dx);
    const oz = b.hz + PLAYER_R - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      if (ox < oz) px = b.x + Math.sign(dx || 1) * (b.hx + PLAYER_R);
      else pz = b.z + Math.sign(dz || 1) * (b.hz + PLAYER_R);
    }
  }
  return [px, pz];
}

export interface MoveInput {
  x: number;
  z: number;
}

export function useMovementKeys(enabled: boolean) {
  const input = useRef<MoveInput>({ x: 0, z: 0 });

  useEffect(() => {
    if (!enabled) {
      input.current = { x: 0, z: 0 };
      return;
    }
    const keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false };
    const sync = () => {
      let x = 0;
      let z = 0;
      if (keys.w || keys.up) z -= 1;
      if (keys.s || keys.down) z += 1;
      if (keys.a || keys.left) x -= 1;
      if (keys.d || keys.right) x += 1;
      const len = Math.hypot(x, z);
      input.current = len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
    };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const game = ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
      if (game) e.preventDefault();
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.w = keys.up = down;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.s = keys.down = down;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.a = keys.left = down;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.d = keys.right = down;
      sync();
    };
    const dn = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
      input.current = { x: 0, z: 0 };
    };
  }, [enabled]);

  return input;
}

export function PlayerAvatar({
  input,
  enabled,
  bowTilt,
  onMove,
}: {
  input: MutableRefObject<MoveInput>;
  enabled: boolean;
  bowTilt: number;
  onMove: (pos: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const walkRef = useRef(0);
  const moving = useRef(false);
  const stepAcc = useRef(0); // 步行节奏钩子（石板脚步声）

  useFrame((_, dtRaw) => {
    if (!group.current) return;
    const dt = Math.min(0.05, Math.max(0, dtRaw)); // 防负 dt
    const speed = enabled ? 3.4 : 0;
    const ix = input.current.x;
    const iz = input.current.z;
    moving.current = enabled && (ix !== 0 || iz !== 0);
    walkRef.current = moving.current ? 1 : 0;

    if (moving.current) {
      const nx = group.current.position.x + ix * speed * dt;
      const nz = group.current.position.z + iz * speed * dt;
      const [cx, cz] = resolveColliders(nx, nz);
      group.current.position.x = THREE.MathUtils.clamp(cx, WORLD.minX, WORLD.maxX);
      group.current.position.z = THREE.MathUtils.clamp(cz, WORLD.minZ, WORLD.maxZ);
      const targetYaw = Math.atan2(ix, iz);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetYaw, 0.14);
      // 石板脚步：每行进 0.62 个世界单位一步
      stepAcc.current += speed * dt;
      if (stepAcc.current >= 0.62) {
        stepAcc.current = 0;
        sfx.step();
      }
    } else {
      stepAcc.current = 0.3; // 再起第一步更快出声
    }

    onMove(group.current.position);
  });

  return (
    <group ref={group} position={PLAYER_START.toArray()}>
      <RiteFigure robeColor={PAL.hostRobe} hat="host" bowTilt={bowTilt} walkRef={walkRef} />
    </group>
  );
}

/** 跟随镜头：随人物过门推进；近亭自动降高缩距钻入檐下（瓦顶不挡视线）。 */
export function FollowRiteCamera({ playerPos }: { playerPos: MutableRefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.8, -4.5));
  const ideal = useRef(new THREE.Vector3(0, 4.8, 10.5));
  useFrame(() => {
    const p = playerPos.current;
    // 深度系数：1=门外/门内前段（高机位远观），0=亭前（低机位檐下近观）
    const depth = THREE.MathUtils.clamp((p.z + 4.5) / 5.7, 0, 1);
    const h = 2.2 + 2.55 * depth;
    const back = 5.2 + 3.8 * depth;
    const side = 2.2 * (1 - depth); // 近亭侧前方斜视角（避开正对名签与檐柱）
    ideal.current.set(p.x * 0.55 + side, h, p.z + back);
    camera.position.lerp(ideal.current, 0.06);
    look.current.lerp(new THREE.Vector3(p.x * 0.75 + side * 0.35, 1.35 + 0.25 * depth, p.z - 0.6 - 2.4 * depth), 0.08);
    camera.lookAt(look.current);
  });
  return null;
}

export function dist2d(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * 礼 · 第三人称行走操控（WASD / 方向键 + 跟随镜头，参考 Summer Afternoon）
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { LowPolyPerson, PAL, WORLD } from "./liHostVisuals";
import * as sfx from "./liHostAudio";

export const PLAYER_START = new THREE.Vector3(0, 0, 1.2);

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
      group.current.position.x += ix * speed * dt;
      group.current.position.z += iz * speed * dt;
      group.current.position.x = THREE.MathUtils.clamp(group.current.position.x, WORLD.minX, WORLD.maxX);
      group.current.position.z = THREE.MathUtils.clamp(group.current.position.z, WORLD.minZ, WORLD.maxZ);
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
      <LowPolyPerson robeColor={PAL.hostRobe} hat="host" bowTilt={bowTilt} walkRef={walkRef} />
    </group>
  );
}

/** Summer Afternoon 式跟随镜头：后上方平滑追随 */
export function FollowCamera({
  target,
  active,
  bowTilt,
}: {
  target: MutableRefObject<THREE.Vector3>;
  active: boolean;
  bowTilt: number;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const ideal = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!active) return;
    const t = target.current;
    const dist = 4.2 - bowTilt * 0.8;
    const height = 2.35 + bowTilt * 0.3;
    ideal.current.set(t.x, t.y + height, t.z + dist);
    camera.position.lerp(ideal.current, 0.09);
    look.current.set(t.x, t.y + 1.05 - bowTilt * 0.4, t.z - 1.8);
    camera.lookAt(look.current);
  });

  return null;
}

export function dist2d(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const ROOT = "/textures/journey/li";
const SURFACES = {
  roof: { repeat: [1, 1], normal: 0.2 },
  wood: { repeat: [1.5, 1.5], normal: 0.16 },
  stone: { repeat: [4, 5], normal: 0.18 },
  cloth: { repeat: [1.5, 1.5], normal: 0.18 },
} as const;

// PCFSoft ignores LightShadow.radius in this Three.js version. Broaden the
// existing taps locally, without extra shadow maps or a global ShaderChunk edit.
const shadowChunk = THREE.ShaderChunk.shadowmap_pars_fragment.replace(
  /(#elif defined\( SHADOWMAP_TYPE_PCF_SOFT \))([\s\S]*?)(#elif defined\( SHADOWMAP_TYPE_VSM \))/,
  (_, start: string, body: string, end: string) => start + body
    .replace("float dx = texelSize.x;", "float dx = texelSize.x * 2.2;")
    .replace("float dy = texelSize.y;", "float dy = texelSize.y * 2.2;")
    .replace("uv + texelSize", "uv + vec2( dx, dy )") + end,
);

export function softenCourtyardShadows(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <shadowmap_pars_fragment>", shadowChunk);
}

function shadowProgramKey() { return "li-pcf-soft-2"; }

export function useCourtyardSurface(name: keyof typeof SURFACES) {
  const maps = useTexture([
    `${ROOT}/${name}-color.webp`,
    `${ROOT}/${name}-normal.png`,
    `${ROOT}/${name}-roughness.png`,
  ]);
  const gl = useThree((state) => state.gl);
  return useMemo(() => {
    const spec = SURFACES[name];
    maps.forEach((map, index) => {
      const colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      if (map.colorSpace !== colorSpace || map.wrapS !== THREE.RepeatWrapping) {
        map.colorSpace = colorSpace;
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(spec.repeat[0], spec.repeat[1]);
        map.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        map.needsUpdate = true;
      }
    });
    return {
      map: maps[0], normalMap: maps[1], roughnessMap: maps[2],
      normalScale: new THREE.Vector2(spec.normal, spec.normal),
      onBeforeCompile: softenCourtyardShadows,
      customProgramCacheKey: shadowProgramKey,
    };
  }, [gl, maps, name]);
}

const EFFECTS = {
  mountains: "mountains-ink.webp",
  mountainAlpha: "mountain-edge-alpha.png",
  mist: "mist-alpha.png",
  glow: "lantern-glow.png",
  ray: "morning-ray.png",
} as const;

export function useCourtyardTexture(name: keyof typeof EFFECTS) {
  const texture = useTexture(`${ROOT}/${EFFECTS[name]}`);
  return useMemo(() => {
    const colorSpace = name === "mist" || name === "mountainAlpha" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    if (texture.colorSpace !== colorSpace || texture.name !== EFFECTS[name]) {
      texture.colorSpace = colorSpace;
      texture.name = EFFECTS[name];
      if (name === "mist") texture.wrapS = THREE.RepeatWrapping;
      if (name === "mountains") {
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(5, 1);
      }
      texture.needsUpdate = true;
    }
    return texture;
  }, [name, texture]);
}

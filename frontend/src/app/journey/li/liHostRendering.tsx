import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { useCourtyardTexture } from "./liHostTextures";

// 【渲染优化】调色与轻暗角仅作用于 WebGL 画布，不影响 HUD。
const silkGrade = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    #include <common>
    void main() {
      vec4 sampleColor = texture2D(tDiffuse, vUv);
      vec3 c = max(sampleColor.rgb, vec3(0.0));
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float warmLight = smoothstep(0.12, 0.6, c.r - c.b) * smoothstep(0.25, 0.9, luma);
      c = mix(vec3(luma), c, mix(0.74, 0.84, warmLight));
      float shadowLift = 0.018 * (1.0 - smoothstep(0.0, 0.24, luma));
      c += vec3(0.93, 0.95, 0.88) * shadowLift;
      c *= vec3(0.99, 1.005, 1.01);
      float edge = smoothstep(0.35, 0.92, length((vUv - 0.5) * vec2(1.0, 0.82)));
      c *= 1.0 - edge * 0.12;
      gl_FragColor = vec4(c, sampleColor.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function CourtyardColorGrade() {
  const { gl, scene, camera, size, viewport } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const next = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    // 【渲染优化】极轻景深聚焦院中人物，限制模糊半径以控制开销。
    const bokeh = new BokehPass(scene, camera, { focus: 15, aperture: 0.00012, maxblur: 0.003 });
    const grade = new ShaderPass(silkGrade);
    next.addPass(render);
    next.addPass(bokeh);
    next.addPass(grade);
    composer.current = next;
    return () => {
      composer.current = null;
      render.dispose();
      bokeh.dispose();
      grade.dispose();
      next.dispose();
    };
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.current?.setPixelRatio(Math.min(viewport.dpr, 1.5));
    composer.current?.setSize(size.width, size.height);
  }, [size.width, size.height, viewport.dpr]);
  useFrame((state, delta) => {
    if (composer.current) composer.current.render(delta);
    else state.gl.render(state.scene, state.camera);
  }, 1);
  return null;
}

// 【渲染优化】在现有远山材质内滚动薄雾，不增加场景几何。
export function InkMountainMaterial({ color, opacity }: { color: string; opacity: number }) {
  const ink = useCourtyardTexture("mountains");
  const alpha = useCourtyardTexture("mountainAlpha");
  const mist = useCourtyardTexture("mist");
  const time = useMemo(() => ({ value: 0 }), []);
  const haze = useMemo(() => ({ value: new THREE.Color("#d2d7ce") }), []);
  useFrame(({ clock }) => { time.value = clock.elapsedTime; });
  const onBeforeCompile = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.liMistTime = time;
    shader.uniforms.liMistColor = haze;
    shader.uniforms.liMistMap = { value: mist };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 liWorldPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nliWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 liWorldPosition;
      uniform float liMistTime; uniform vec3 liMistColor; uniform sampler2D liMistMap;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      vec3 liInkSample = texture2D(map, vMapUv).rgb;
      float liInkDensity = 1.0 - dot(liInkSample, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.a *= smoothstep(0.24, 0.68, liInkDensity);
      diffuseColor.rgb = diffuse * mix(vec3(0.5, 0.59, 0.58), vec3(0.3, 0.4, 0.4), liInkDensity);
      float liBand = texture2D(liMistMap, vec2(liWorldPosition.x * 0.025 + liMistTime * 0.0015, liWorldPosition.y * 0.2 + 0.15)).g;
      float liHeight = smoothstep(0.06, 0.22, vAlphaMapUv.y) * (1.0 - smoothstep(0.62, 0.86, vAlphaMapUv.y));
      float liHaze = liBand * liHeight * 0.22;
      diffuseColor.rgb = mix(diffuseColor.rgb, liMistColor, liHaze);
      diffuseColor.a *= 1.0 - liHaze * 0.35;`);
  }, [haze, mist, time]);
  return <meshBasicMaterial map={ink} alphaMap={alpha} color={color} opacity={opacity}
    transparent depthWrite={false} side={THREE.DoubleSide} fog={false}
    onBeforeCompile={onBeforeCompile} customProgramCacheKey={() => "li-ink-mist-1"} />;
}

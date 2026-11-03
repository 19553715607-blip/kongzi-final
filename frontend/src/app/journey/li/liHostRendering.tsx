import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { useCourtyardTexture } from "./liHostTextures";

// 【渲染优化】复用景深的深度图：六步高度雾、牌匾局部 Bloom 和暖灰调色均不影响 HUD。
const silkGrade = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null }, tMist: { value: null },
    inverseProjection: { value: new THREE.Matrix4() }, cameraWorld: { value: new THREE.Matrix4() },
    mistColor: { value: new THREE.Color("#cbc7bc") }, time: { value: 0 },
    texel: { value: new THREE.Vector2() }, plaqueRect: { value: new THREE.Vector4(2, 2, 2, 2) },
    plaqueMin: { value: new THREE.Vector3() }, plaqueMax: { value: new THREE.Vector3() },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tDepth, tMist; varying vec2 vUv;
    uniform mat4 inverseProjection, cameraWorld;
    uniform vec3 mistColor, plaqueMin, plaqueMax;
    uniform vec4 plaqueRect;
    uniform vec2 texel;
    uniform float time;
    #include <common>
    #include <packing>
    vec3 worldAt(vec2 uv) {
      float depth = unpackRGBAToDepth(texture2D(tDepth, uv));
      vec4 view = inverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      return (cameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
    }
    vec3 plaqueHighlight(vec2 uv) {
      vec3 p = worldAt(uv);
      // 深度遮挡检查排除牌匾前方名签和场景中其他亮物，牌匾材质本身不变。
      if (any(lessThan(p, plaqueMin)) || any(greaterThan(p, plaqueMax))) return vec3(0.0);
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float gold = smoothstep(0.04, 0.20, c.r - c.b);
      float bright = smoothstep(0.20, 0.50, dot(c, vec3(0.2126, 0.7152, 0.0722)));
      return max(c - 0.22, 0.0) * gold * bright;
    }
    vec3 plaqueBloom(vec2 uv) {
      vec2 r = texel * 2.5;
      if (any(lessThan(uv, plaqueRect.xy - r)) || any(greaterThan(uv, plaqueRect.zw + r))) return vec3(0.0);
      vec3 glow = plaqueHighlight(uv) * 0.25;
      glow += (plaqueHighlight(uv + vec2(r.x, 0.0)) + plaqueHighlight(uv - vec2(r.x, 0.0))
        + plaqueHighlight(uv + vec2(0.0, r.y)) + plaqueHighlight(uv - vec2(0.0, r.y))) * 0.125;
      glow += (plaqueHighlight(uv + r) + plaqueHighlight(uv - r)
        + plaqueHighlight(uv + vec2(r.x, -r.y)) + plaqueHighlight(uv + vec2(-r.x, r.y))) * 0.0625;
      return glow * 0.18;
    }
    void main() {
      vec4 sampleColor = texture2D(tDiffuse, vUv);
      vec3 c = max(sampleColor.rgb, vec3(0.0));
      vec3 origin = cameraWorld[3].xyz;
      vec3 ray = worldAt(vUv) - origin;
      float distanceToSurface = length(ray);
      float opticalDepth = 0.0;
      // 雾在地表附近、庭院后方渐浓；不叠加几何体或强光柱，主体仅有极薄空气感。
      for (int i = 0; i < 6; i++) {
        vec3 p = origin + ray * ((float(i) + 0.5) / 6.0);
        float band = texture2D(tMist, vec2(p.x * 0.025 + time * 0.001, p.z * 0.014 + 0.5)).g;
        float distant = smoothstep(10.0, 38.0, -p.z);
        float heightFalloff = exp(-max(p.y - 0.4, 0.0) * 0.24);
        opticalDepth += mix(0.0007, 0.018, distant) * heightFalloff * mix(0.65, 1.0, band);
      }
      float mist = min(0.32, 1.0 - exp(-opticalDepth * distanceToSurface / 6.0));
      c = mix(c, mistColor, mist) + plaqueBloom(vUv);
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, 0.62);
      c = mix(vec3(0.22), c, 0.94);
      float shadowLift = 0.014 * (1.0 - smoothstep(0.0, 0.28, luma));
      c += vec3(1.0, 0.97, 0.90) * shadowLift;
      c *= vec3(1.025, 1.008, 0.98);
      float edge = smoothstep(0.35, 0.92, length((vUv - 0.5) * vec2(1.0, 0.82)));
      c *= 1.0 - edge * 0.045;
      gl_FragColor = vec4(c, sampleColor.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function CourtyardColorGrade() {
  const { gl, scene, camera, size, viewport } = useThree();
  const mist = useCourtyardTexture("mist");
  const composer = useRef<EffectComposer | null>(null);
  const updateGrade = useRef<(time: number) => void>(() => {});
  useEffect(() => {
    const next = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    // 【渲染优化】24 米以内直接保留原图，只有远景轻微虚化；主体免去 41 次模糊采样。
    const bokeh = new BokehPass(scene, camera, { focus: 24, aperture: 0.0001, maxblur: 0.0025 });
    bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader.replace(
      "float factor = ( focus + viewZ );",
      "if (-viewZ <= focus) { gl_FragColor = texture2D(tColor, vUv); return; } float factor = ( focus + viewZ );",
    );
    const grade = new ShaderPass(silkGrade);
    grade.uniforms.tDepth.value = bokeh.renderTargetDepth.texture;
    grade.uniforms.tMist.value = mist;
    const bounds = new THREE.Box3();
    const projected = new THREE.Vector3();
    let plaque: THREE.Object3D | undefined;
    updateGrade.current = (time) => {
      grade.uniforms.time.value = time;
      grade.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      grade.uniforms.cameraWorld.value.copy(camera.matrixWorld);
      grade.uniforms.texel.value.set(1 / next.readBuffer.width, 1 / next.readBuffer.height);
      // 仅读取原牌匾的世界包围盒作为 Bloom 遮罩，不改题字、材质、位置或尺寸。
      plaque ??= scene.getObjectByName("li-plaque-bloom");
      if (!plaque) return;
      bounds.setFromObject(plaque).expandByScalar(0.025);
      grade.uniforms.plaqueMin.value.copy(bounds.min);
      grade.uniforms.plaqueMax.value.copy(bounds.max);
      const rect = grade.uniforms.plaqueRect.value as THREE.Vector4;
      rect.set(1, 1, 0, 0);
      for (let i = 0; i < 8; i++) {
        projected.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z).project(camera);
        const x = projected.x * 0.5 + 0.5;
        const y = projected.y * 0.5 + 0.5;
        rect.set(Math.min(rect.x, x), Math.min(rect.y, y), Math.max(rect.z, x), Math.max(rect.w, y));
      }
    };
    next.addPass(render);
    next.addPass(bokeh);
    next.addPass(grade);
    composer.current = next;
    return () => {
      composer.current = null;
      updateGrade.current = () => {};
      render.dispose();
      bokeh.dispose();
      grade.dispose();
      next.dispose();
    };
  }, [gl, scene, camera, mist]);
  useEffect(() => {
    composer.current?.setPixelRatio(Math.min(viewport.dpr, 1.5));
    composer.current?.setSize(size.width, size.height);
  }, [size.width, size.height, viewport.dpr]);
  useFrame((state, delta) => {
    updateGrade.current(state.clock.elapsedTime);
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
  const haze = useMemo(() => ({ value: new THREE.Color("#ccc9bf") }), []);
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
      diffuseColor.rgb = diffuse * mix(vec3(0.56, 0.58, 0.55), vec3(0.39, 0.43, 0.41), liInkDensity);
      float liBand = texture2D(liMistMap, vec2(liWorldPosition.x * 0.025 + liMistTime * 0.0015, liWorldPosition.y * 0.2 + 0.15)).g;
      float liHeight = smoothstep(0.06, 0.22, vAlphaMapUv.y) * (1.0 - smoothstep(0.62, 0.86, vAlphaMapUv.y));
      float liHaze = liBand * liHeight * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, liMistColor, liHaze);
      diffuseColor.a *= 1.0 - liHaze * 0.35;`);
  }, [haze, mist, time]);
  return <meshBasicMaterial map={ink} alphaMap={alpha} color={color} opacity={opacity}
    transparent depthWrite={false} side={THREE.DoubleSide} fog={false}
    onBeforeCompile={onBeforeCompile} customProgramCacheKey={() => "li-ink-mist-2"} />;
}

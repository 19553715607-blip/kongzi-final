"use client";

/**
 * 射 · 观德 — 一键射箭 · 3D 版（Three.js / React Three Fiber）
 *
 * 操作：按住（鼠标 / 手指 / 空格）= 拉弓，松开 = 放箭。全平台同一套。
 * 技巧：时机（准星随呼吸漂移，选松开瞬间）× 力度（按住时长，过满手抖）。
 *
 * 流程：ready → draw → fly → mark →（未中：reflect / 主皮警告：zhupi）→ ready …
 *       五矢一局 → summary → 再来一局。
 * 后端契约不变：POST /she/round（风、连击、主皮警告）+ POST /she/result（环数、反省）。
 * 后端不可达时自动进入离线练习模式（本地计分，不上报）。
 *
 * 表现层：第一人称射圃 3D 场景（sheScene.tsx），游戏数值经可变 GameRefs 直连
 * useFrame，React 只渲染 HUD / 卡片。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";
import { getSheProgress, startSheRound, submitSheResult } from "@/lib/api";
import type {
  SheProgressResp,
  SheRefBrief,
  SheReflection,
  SheRoundResp,
} from "@/lib/types";
import { aimAt, computeImpact, scoreVerdict, type Impact } from "./sheEngine";
import {
  ArcheryScene,
  createGameRefs,
  impactWorld,
  type ScenePhase,
  type StuckArrow,
} from "./sheScene";
import AimInset from "./sheAimInset";
import * as sfx from "./sheAudio";

const ARROWS_PER_SET = 5;
/** 屏幕边缘 → 瞄准偏移（靶面单位）。指针位置直接映射为指向：屏心 = 靶心 */
const AIM_RANGE = 1.15;

const REFLECTION_OPTIONS: { key: SheReflection; label: string; hint: string }[] = [
  { key: "calm", label: "心未静，气未沉", hint: "呼吸太快、抢射、未守静" },
  { key: "force", label: "力度过 / 不及", hint: "蓄力没到位或拉得太满" },
  { key: "wind", label: "估风错了", hint: "没看清风向旗就出手" },
  { key: "win", label: "求胜心切", hint: "想赢的念头压倒了平和" },
];

export default function SheGame() {
  const [lang] = useLang();
  // ── React 状态（仅 UI：HUD / 卡片） ──
  const [phase, setPhase] = useState<ScenePhase>("ready");
  const [progress, setProgress] = useState<SheProgressResp | null>(null);
  const [round, setRound] = useState<SheRoundResp | null>(null);
  const [offline, setOffline] = useState(false);
  const [arrowIdx, setArrowIdx] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionHits, setSessionHits] = useState(0);
  const [bestArrow, setBestArrow] = useState(0);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [resultMsg, setResultMsg] = useState("");
  const [needReflect, setNeedReflect] = useState(false);
  const [zhupiChoice, setZhupiChoice] = useState(false);
  const [unlocked, setUnlocked] = useState<SheRefBrief[]>([]);
  const [coach, setCoach] = useState(true);
  const [streakLocal, setStreakLocal] = useState(0);
  const [over, setOver] = useState(false);
  const [callout, setCallout] = useState<{ text: string; sub: string; color: string } | null>(null);
  const [stuckView, setStuckView] = useState<StuckArrow[]>([]); // 放大靶箭点（镜像 g.stuck）

  // 3D 场景共享的可变游戏状态（useFrame 直读，不走 React 渲染）
  const [g] = useState(() => createGameRefs());

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roundRef = useRef(round);
  roundRef.current = round;
  const offlineRef = useRef(offline);
  offlineRef.current = offline;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhaseBoth = useCallback(
    (p: ScenePhase) => {
      g.phase = p;
      setPhase(p);
    },
    [g],
  );

  // ── 开局信息（风 / 连击 / 主皮警告）。失败 → 离线练习 ──
  const prefetchRound = useCallback(async () => {
    try {
      const r = await startSheRound();
      setRound(r);
      g.wind = r.wind;
      setOffline(false);
    } catch {
      const local = {
        wind: Math.round((Math.random() * 5 - 2.5) * 100) / 100,
        distance_m: 30,
        streak: streakLocal,
        zhupi_warning: false,
        zhupi_ref: null,
        total_rounds: 0,
      } satisfies SheRoundResp;
      setRound(local);
      g.wind = local.wind;
      setOffline(true);
    }
  }, [g, streakLocal]);

  useEffect(() => {
    getSheProgress().then(setProgress).catch(() => setOffline(true));
    void prefetchRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 下一箭 / 小结 ──
  const advance = useCallback(() => {
    setNeedReflect(false);
    setZhupiChoice(false);
    setImpact(null);
    setArrowIdx((i) => i + 1);
  }, []);

  // 箭序推进的副作用集中在这里（保持 setState updater 纯净）
  useEffect(() => {
    if (arrowIdx >= ARROWS_PER_SET) {
      setPhaseBoth("summary");
    } else if (arrowIdx > 0) {
      void prefetchRound();
      setPhaseBoth("ready");
    }
  }, [arrowIdx, prefetchRound, setPhaseBoth]);

  const restartSet = useCallback(() => {
    g.stuck = [];
    setStuckView([]);
    setArrowIdx(0);
    setSessionScore(0);
    setSessionHits(0);
    setBestArrow(0);
    setResultMsg("");
    void prefetchRound();
    setPhaseBoth("ready");
  }, [g, prefetchRound, setPhaseBoth]);

  // ── 上报（或离线本地结算） ──
  const settle = useCallback(
    async (imp: Impact, reflection?: SheReflection, note?: string) => {
      const r = roundRef.current;
      if (!r) return;
      const finish = (msg: string, refs: SheRefBrief[]) => {
        setResultMsg(msg);
        if (refs.length > 0) {
          setUnlocked(refs);
          sfx.unlock();
          timerRef.current = setTimeout(() => setUnlocked([]), 6000);
        }
        timerRef.current = setTimeout(advance, imp.score > 0 ? 1100 : 300);
      };
      if (offlineRef.current) {
        const ns = imp.score > 0 ? streakLocal + 1 : 0;
        setStreakLocal(ns);
        finish(
          imp.score > 0
            ? `${imp.score} ${gt("环", lang)} · ${scoreVerdict(imp.score)}（${gt("离线练习", lang)}）`
            : gt("未中 · 反求诸己（离线练习）", lang),
          [],
        );
        return;
      }
      try {
        const res = await submitSheResult({
          score: imp.score,
          distance_m: r.distance_m,
          wind: r.wind,
          aim_drift: Number(imp.d.toFixed(3)),
          reflection_choice: reflection ?? null,
          reflection_note: note?.trim() || null,
          streak_before: r.streak,
          zhupi_warned: r.zhupi_warning,
        });
        const msg =
          reflection === "abstain"
            ? `${gt("克己 · 射不主皮", lang)} · ${gt("射艺", lang)} +${res.she_delta}`
            : imp.score > 0
              ? `${imp.score} ${gt("环", lang)} · ${scoreVerdict(imp.score)} · ${gt("射艺", lang)} +${res.she_delta}`
              : `${gt("未中 · 反求诸己", lang)} · ${gt("射艺", lang)} +${res.she_delta}`;
        finish(msg, res.new_unlocked_refs);
        const next = await getSheProgress().catch(() => null);
        if (next) setProgress(next);
      } catch {
        setOffline(true);
        finish(gt("连接断开 · 转为离线练习", lang), []);
      }
    },
    [advance, streakLocal, lang],
  );

  // ── 落箭（3D 场景在飞行结束时调用，经 ref 桥接） ──
  const landRef = useRef<(imp: Impact) => void>(() => {});
  landRef.current = (imp: Impact) => {
    if (imp.score > 0) {
      g.stuck = [...g.stuck, { x: imp.x, y: imp.y, score: imp.score }];
      setStuckView(g.stuck);
    }
    g.ripple = {
      x: Math.min(1, Math.max(-1, imp.x)),
      y: Math.min(1.4, Math.max(-1, imp.y)),
      t0: performance.now(),
    };
    g.shakeT0 = imp.score > 0 ? performance.now() : null;

    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
    setCallout({
      text: imp.score > 0 ? `${imp.score} ${gt("环", lang)}` : gt("未中", lang),
      sub: scoreVerdict(imp.score),
      color:
        imp.score >= 9 ? "#d9a521" : imp.score >= 6 ? "#3f6f4e" : imp.score > 0 ? "#2b2925" : "#b23a2c",
    });
    calloutTimerRef.current = setTimeout(() => setCallout(null), 1100);

    if (imp.score >= 9) sfx.chime();
    else if (imp.score > 0) sfx.thud(imp.score);
    else sfx.missThud();

    setImpact(imp);
    setSessionScore((v) => v + imp.score);
    if (imp.score > 0) setSessionHits((v) => v + 1);
    setBestArrow((v) => Math.max(v, imp.score));
    setPhaseBoth("mark");

    const r = roundRef.current;
    if (imp.score === 0) setNeedReflect(true);
    else if (r?.zhupi_warning) setZhupiChoice(true);
    else void settle(imp);
  };

  // ── 输入：按住 = 拉弓，松开 = 放箭 ──
  const beginDraw = useCallback(() => {
    if (phaseRef.current !== "ready") return;
    setCoach(false);
    if (!roundRef.current) void prefetchRound();
    g.holdT0 = performance.now();
    g.seed = Math.random() * 7;
    sfx.startCreak();
    setPhaseBoth("draw");
  }, [g, prefetchRound, setPhaseBoth]);

  const releaseDraw = useCallback(() => {
    if (phaseRef.current !== "draw") return;
    const t = (performance.now() - g.holdT0) / 1000;
    const a = aimAt(t, g.wind, g.seed);
    // 落点 = 呼吸漂移 + 玩家指向（移动鼠标/手指控制方向）
    const aim = g.aim ?? { x: 0, y: 0 };
    const imp = computeImpact({ ...a, swayX: a.swayX + aim.x, swayY: a.swayY + aim.y });
    sfx.stopCreak();
    sfx.release();
    // 起飞点：弓口箭尖；弧线高低随力度（力不足抛物线更高、落得近）
    const [ix, iy, iz] = impactWorld(imp.x, imp.y);
    g.flight = {
      u: 0,
      t0: performance.now(),
      imp,
      from: [0.28, 1.42, -1.1],
      ctrl: [
        (0.28 + ix) / 2,
        Math.max(1.42, iy) + 0.5 + (1 - a.power) * 2.0,
        (iz - 1.1) / 2,
      ],
      power: a.power,
      trail: [],
    };
    setPhaseBoth("fly");
  }, [g, setPhaseBoth]);

  // 指针位置 → 瞄准偏移（屏心 = 靶心，靶面单位）
  const aimFromEvent = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      g.aim = {
        x: Math.max(-AIM_RANGE, Math.min(AIM_RANGE, nx * AIM_RANGE)),
        y: Math.max(-AIM_RANGE, Math.min(AIM_RANGE, ny * AIM_RANGE)),
      };
    },
    [g],
  );

  // 键盘（空格）— 与指针完全同构；在文本框中不触发
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      e.preventDefault();
      g.aim = { x: 0, y: 0 }; // 键盘无指向，从屏心开始
      beginDraw();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      releaseDraw();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [beginDraw, releaseDraw, g]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
    sfx.stopCreak();
  }, []);

  // ── 反省 / 主皮选择 ──
  const chooseReflection = (key: SheReflection, note: string) => {
    if (!impact) return;
    setNeedReflect(false);
    void settle(impact, key, note);
  };
  const chooseZhupi = (abstain: boolean) => {
    if (!impact) return;
    setZhupiChoice(false);
    if (abstain) void settle(impact, "abstain");
    else void settle(impact);
  };

  const windLabel = round
    ? `${round.wind > 0 ? "→" : round.wind < 0 ? "←" : "·"} ${Math.abs(round.wind).toFixed(1)} m/s`
    : "…";
  const streakShow = offline ? streakLocal : (round?.streak ?? 0);

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{gt("六艺 · 射", lang)}</div>
            <div className="font-serif text-xl text-fg">{gt("观德 · 反求诸己", lang)}</div>
            <div className="mt-1 text-xs text-muted">{gt("按住拉弓 · 移动瞄准 · 松开放箭 — 方向 × 力度 × 时机", lang)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {progress && <Stat label={gt("称号", lang)} value={gt(progress.title, lang)} />}
            {progress && <Stat label={gt("射艺", lang)} value={`${progress.liuyi_she}`} numeric />}
            <Stat label={gt("连击", lang)} value={`${streakShow}`} accent={streakShow >= 3} numeric />
            {progress && (
              <Stat label={gt("命中率", lang)} value={`${(progress.hit_rate * 100).toFixed(0)}%`} />
            )}
            <Link
              href="/journey"
              className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
            >
              {gt("← 六艺", lang)}
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Chip label={gt("风", lang)} value={windLabel} />
          <Chip label={gt("靶距", lang)} value={`${round?.distance_m ?? 30} m`} />
          <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] text-muted">
            {gt("本局", lang)}
            {Array.from({ length: ARROWS_PER_SET }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-2 w-2 rounded-full ${
                  i < arrowIdx ? "bg-accent" : i === arrowIdx ? "bg-gold" : "bg-line"
                }`}
              />
            ))}
            <b className="ms-1 font-serif text-sm text-fg">{sessionScore}</b> {gt("环", lang)}
          </span>
          {offline && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
              {gt("离线练习 · 不计入成绩", lang)}
            </span>
          )}
          {round?.zhupi_warning && (
            <span
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800"
              title="《论语·八佾》「射不主皮，为力不同科，古之道也」"
            >
              {gt("⚠ 射不主皮 — 此箭若中，可选「克己」", lang)}
            </span>
          )}
        </div>
      </Reveal>

      {/* 射场（3D） */}
      <section
        className="relative select-none overflow-hidden rounded-2xl border border-line"
        style={{ height: "min(64vh, 560px)", minHeight: 380, touchAction: "none" }}
        onPointerDown={(e) => {
          // 仅在「就绪可拉弓」时接管指针；卡片/按钮阶段不拦截，
          // 否则 setPointerCapture 会把 click 重定向到本层，按钮全部失效
          if (phaseRef.current !== "ready") return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          aimFromEvent(e); // 按下位置即初始指向
          beginDraw();
        }}
        onPointerMove={(e) => {
          if (phaseRef.current !== "draw") return;
          aimFromEvent(e); // 按住后移动 = 调整方向
        }}
        onPointerUp={(e) => {
          if (phaseRef.current !== "draw") return;
          e.preventDefault();
          releaseDraw();
        }}
        onPointerCancel={releaseDraw}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.7, 0], fov: 55, near: 0.1, far: 200 }}
          onCreated={({ camera }) => camera.lookAt(0, 1.6, -30)}
          className="block h-full w-full"
        >
          <ArcheryScene g={g} landRef={landRef} onOver={setOver} />
        </Canvas>

        {/* 放大靶 + 力度环（辅助瞄准） */}
        <AimInset g={g} stuck={stuckView} over={over} />

        {/* 首次引导 */}
        {coach && phase === "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Reveal>
              <div className="rounded-2xl bg-black/60 px-6 py-5 text-center text-white backdrop-blur">
                <div className="font-serif text-2xl">{gt("按住 · 移动 · 松开", lang)}</div>
                <div className="mt-2 text-xs leading-relaxed opacity-80">
                  {gt("按住屏幕任意处拉弓，", lang)}<b>{gt("移动手指/鼠标瞄准", lang)}</b><br />
                  {gt("右上角放大靶看准星 · 力度进金区最稳 · 拉满太久会手抖", lang)}
                </div>
              </div>
            </Reveal>
          </div>
        )}

        {/* 喊环 */}
        {callout && (
          <div className="pointer-events-none absolute inset-x-0 top-[26%] flex flex-col items-center">
            <div
              className="font-serif text-5xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
              style={{ color: callout.color === "#2b2925" ? "#f6f1df" : callout.color }}
            >
              {callout.text}
            </div>
            <div className="mt-1 rounded-full bg-black/55 px-3 py-0.5 font-serif text-sm text-white backdrop-blur">
              {callout.sub}
            </div>
          </div>
        )}

        {/* 底部状态条 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="rounded-full bg-black/55 px-4 py-1.5 text-[11px] text-white backdrop-blur">
            {phase === "ready" && (round ? gt("按住任意处 · 拉弓", lang) : gt("连接射场中…", lang))}
            {phase === "draw" && (over ? gt("过满则抖 — 快放！", lang) : gt("移动瞄准 · 力度进金区松手", lang))}
            {phase === "fly" && gt("箭出 · 看其所至", lang)}
            {phase === "mark" && (resultMsg || "…")}
            {phase === "summary" && gt("五矢已毕", lang)}
          </div>
        </div>

        {/* 解锁经典 toast */}
        {unlocked.length > 0 && (
          <Reveal className="absolute left-1/2 top-3 w-[min(92%,380px)] -translate-x-1/2">
            <div className="rounded-xl border-2 border-gold bg-[#fbf3dc]/95 p-3 text-[#6b4e12] shadow-xl animate-unlock">
              <div className="text-[10px] tracking-widest">{gt("🎖 解锁经典", lang)}</div>
              {unlocked.map((u) => (
                <div key={u.ref_id} className="mt-1 border-s-2 border-gold ps-2">
                  <div className="text-[10px] opacity-70">{u.ref_label}</div>
                  <div className="font-serif text-sm">{u.text}</div>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* 未中 → 反省卡（必答） */}
        {needReflect && (
          <Reveal className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-black/80 p-4 text-white backdrop-blur">
            <p className="text-center text-[11px] opacity-80">
              {gt("脱靶 — 为什么没中？", lang)}<span className="italic">「不怨胜己者，反求诸己」</span>
            </p>
            <ReflectionForm onChoose={chooseReflection} />
          </Reveal>
        )}

        {/* 主皮警告 → 克己选择 */}
        {zhupiChoice && (
          <Reveal className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-black/80 p-4 text-center text-white backdrop-blur">
            <p className="text-[11px] leading-relaxed opacity-85">
              {gt("你已连中", lang)}{round?.streak ?? 0}{gt("箭。", lang)}「射不主皮，为力不同科」——
              {gt("此时收弓不射，是克己复礼。", lang)}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <TactileButton
                variant="accent"
                onClick={() => chooseZhupi(true)}
                className="sm"
              >
                {gt("⊙ 克己 · 收弓（射艺 +5）", lang)}
              </TactileButton>
              <TactileButton
                variant="ghost"
                onClick={() => chooseZhupi(false)}
                className="sm"
              >
                {gt("继续求中", lang)}
              </TactileButton>
            </div>
          </Reveal>
        )}

        {/* 五矢小结 */}
        {phase === "summary" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-5 text-center shadow-2xl">
              <div className="text-[10px] tracking-widest text-faint">{gt("五矢小结", lang)}</div>
              <div className="mt-1 font-serif text-4xl text-fg"><CountUp value={sessionScore} /> {gt("环", lang)}</div>
              <div className="mt-1 text-xs text-muted">
                {gt("命中", lang)} {sessionHits} / {ARROWS_PER_SET}{gt(" · 最佳一箭 ", lang)}<CountUp value={bestArrow} /> {gt("环", lang)}
              </div>
              {progress && (
                <div className="mt-3 rounded-lg bg-surface-2/60 p-2 text-xs text-muted">
                  {gt("称号", lang)} {gt(progress.title, lang)} · {gt("射艺", lang)} {progress.liuyi_she}{gt(" · 累计反省 ", lang)}{progress.reflect_count}
                </div>
              )}
              <ProvenanceCaption
                className="mt-3"
                items={[
                  { label: gt("艺", lang), value: gt("射艺", lang) },
                  { label: gt("矢", lang), value: `${ARROWS_PER_SET}` },
                  { label: gt("模式", lang), value: offline ? gt("离线练习", lang) : gt("计分", lang) },
                ]}
              />
              <TactileButton
                variant="accent"
                onClick={restartSet}
                className="mt-4 w-full"
              >
                {gt("再来一局", lang)}
              </TactileButton>
            </div>
          </div>
        )}
      </section>

      {/* 经典图鉴 */}
      {progress && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 text-sm font-medium text-fg">
            {gt("射艺经典图鉴 ·", lang)} {progress.unlocked_refs.length} / {progress.all_she_refs.length}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {progress.all_she_refs.map((r) => (
              <div
                key={r.ref_id}
                className={`rounded-lg border p-3 text-xs ${
                  r.unlocked
                    ? "border-gold bg-accent-soft text-accent-ink"
                    : "border-line bg-surface-2/40 text-faint"
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest">
                  {r.unlocked ? gt("✓ 已解锁", lang) : gt("🔒 未解锁", lang)}
                </div>
                <div className="mt-0.5 font-medium">{r.ref_label || r.ref_id}</div>
                {r.unlocked && r.text && <div className="mt-1 font-serif text-fg">{r.text}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 归因分布 */}
      {progress && progress.reflect_count >= 3 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 text-sm font-medium text-fg">{gt("反省归因分布", lang)}</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {REFLECTION_OPTIONS.map((o) => {
              const n = progress.attribution[o.key] || 0;
              const pct = progress.reflect_count
                ? Math.round((n / progress.reflect_count) * 100)
                : 0;
              return (
                <div key={o.key} className="rounded-lg border border-line bg-surface-2/40 p-2">
                  <div className="font-serif text-lg text-fg">{n}</div>
                  <div className="text-[10px] text-muted">{gt(o.label, lang)}</div>
                  <div className="text-[10px] text-faint">{pct}%</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ReflectionForm({ onChoose }: { onChoose: (k: SheReflection, note: string) => void }) {
  const [note, setNote] = useState("");
  const [lang] = useLang();
  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {REFLECTION_OPTIONS.map((o) => (
          <Pressable
            key={o.key}
            onClick={() => onChoose(o.key, note)}
            className="rounded-lg border border-white/30 bg-white/10 p-2 text-start text-xs hover:bg-white/20"
          >
            <div className="font-medium">{gt(o.label, lang)}</div>
            <div className="text-[10px] opacity-70">{gt(o.hint, lang)}</div>
          </Pressable>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={gt("（可选）写一句更具体的反思 · ≥5 字省分更高", lang)}
        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs placeholder-white/40 outline-none"
      />
    </div>
  );
}

function Stat({ label, value, accent, numeric }: { label: string; value: string; accent?: boolean; numeric?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1 ${accent ? "bg-amber-100" : "bg-surface-2"}`}>
      <div className="text-[10px] text-faint">{label}</div>
      <div className="font-serif text-sm text-fg">
        {numeric ? <CountUp value={parseInt(value, 10) || 0} /> : value}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] text-muted">
      {label}：{value}
    </span>
  );
}

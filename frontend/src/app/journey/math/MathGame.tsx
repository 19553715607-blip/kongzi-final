"use client";

/**
 * 数艺·量仓分赈 — 3D 分粮（Three.js / React Three Fiber）
 *
 * 操作：←→/AD 切换目标村 · ↑/W 按住出粮 · ↓/S 按住回粮 · Enter 封仓验收
 *       手机：◀ ▶ 切换 + 出粮/回粮按住按钮 + 封仓验收
 *
 * 后端契约：POST /math/scenario/{sid}/solve（allocations 全项，三维评分）。
 * 游戏数值由 mathEngine 在场景 useFrame 推进；React 只管 HUD / 卡片。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";
import { getMathProgress, getMathToday, solveMathScenario, errorHint } from "@/lib/api";
import type {
  MathProgressResp,
  MathScenarioBrief,
  MathSolveResp,
  MathTodayResp,
} from "@/lib/types";
import { allocatedSum, createEngine, finalizeAllocations, remaining, selectDelta, setAlloc } from "./mathEngine";
import { createMathRefs, MathScene, KIND_COLOR, type MathRefs } from "./mathScene";
import * as sfx from "./mathAudio";

type Phase = "idle" | "playing" | "submitting" | "scored";

const GRADE_COLOR: Record<string, string> = {
  衡均: "#0F6E56", 通算: "#1E5F8E", 中算: "#854F0B", 试算: "#993C1D", 学算: "#6b6046",
};

interface MathDebugHook {
  set: (name: string, v: number) => void;
  setAll: (obj: Record<string, number>) => void;
  select: (i: number) => void;
  state: () => { allocations: Record<string, number>; remaining: number; selected: number };
  submit: () => void;
}
declare global {
  interface Window { __math?: MathDebugHook }
}

export default function MathGame() {
  const [lang] = useLang();
  const [today, setToday] = useState<MathTodayResp | null>(null);
  const [progress, setProgress] = useState<MathProgressResp | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [current, setCurrent] = useState<MathScenarioBrief | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<MathSolveResp | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const [g] = useState(() => createMathRefs());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(() => {
    getMathToday(lang).then(setToday).catch((e) => setLoadErr(gt("无法加载数艺题库，请稍后重试", lang) + `（${errorHint(e)}）`));
    getMathProgress().then(setProgress).catch(() => {});
  }, [lang]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const say = useCallback((text: string, good: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, good });
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // ── 开局 ──
  const startScenario = useCallback((s: MathScenarioBrief) => {
    g.engine = createEngine(s);
    g.input = { pour: false, scoop: false };
    g.running = true;
    setCurrent(s);
    setResult(null);
    setShowGuide(true);
    setRunId((i) => i + 1);
    setPhase("playing");
    setTimeout(() => setShowGuide(false), 6500);
  }, [g]);

  // ── 切换目标村 ──
  const switchVillage = useCallback((dir: number) => {
    if (phaseRef.current !== "playing" || !g.engine) return;
    selectDelta(g.engine, dir);
    sfx.switchVillage();
  }, [g]);

  // ── 封仓验收 → 提交 ──
  const submitRef = useRef<() => void>(() => {});
  const submit = useCallback(async () => {
    if (phaseRef.current !== "playing" || !current || !g.engine) return;
    g.running = false;
    g.input.pour = false;
    g.input.scoop = false;
    sfx.setPouring(false);
    sfx.bell();
    setPhase("submitting");
    try {
      const res = await solveMathScenario(current.id, finalizeAllocations(g.engine), lang);
      setResult(res);
      sfx.finish(res.score);
      setPhase("scored");
      getMathProgress().then(setProgress).catch(() => {});
      getMathToday(lang).then(setToday).catch(() => {});
    } catch {
      say(gt("提交失败 — 请检查登录/网络", lang), false);
      setPhase("playing");
      g.running = true;
    }
  }, [current, g, say, lang]);
  submitRef.current = submit;

  // ── 调试钩子（CDP 测试用） ──
  useEffect(() => {
    window.__math = {
      set: (name, v) => { if (g.engine) setAlloc(g.engine, name, v); },
      setAll: (obj) => { if (g.engine) for (const [k, v] of Object.entries(obj)) setAlloc(g.engine, k, v); },
      select: (i) => {
        if (g.engine) {
          const n = g.engine.scenario.items.length;
          g.engine.selected = ((i % n) + n) % n;
        }
      },
      state: () => ({
        allocations: { ...(g.engine?.allocations ?? {}) },
        remaining: g.engine ? remaining(g.engine) : -1,
        selected: g.engine?.selected ?? -1,
      }),
      submit: () => submitRef.current(),
    };
    return () => { delete window.__math; };
  }, [g]);

  // ── 键盘 ──
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      switch (e.code) {
        case "ArrowUp": case "KeyW": g.input.pour = true; e.preventDefault(); break;
        case "ArrowDown": case "KeyS": g.input.scoop = true; e.preventDefault(); break;
        case "ArrowLeft": case "KeyA":
          if (!e.repeat) switchVillage(-1);
          e.preventDefault(); break;
        case "ArrowRight": case "KeyD":
          if (!e.repeat) switchVillage(1);
          e.preventDefault(); break;
        case "Enter":
          if (!e.repeat) void submitRef.current();
          e.preventDefault(); break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": g.input.pour = false; break;
        case "ArrowDown": case "KeyS": g.input.scoop = false; break;
      }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [g, switchVillage]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    sfx.stopAll();
  }, []);

  const backToSelect = useCallback(() => {
    g.running = false;
    sfx.stopAll();
    setPhase("idle");
    setCurrent(null);
    setResult(null);
    loadAll();
  }, [g, loadAll]);

  const bestMap = new Map(progress?.scenarios.map((s) => [s.id, s.best_score]) ?? []);

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{gt("六艺 · 数", lang)}</div>
            <div className="font-serif text-xl text-fg">{gt("量仓分赈 · 均输衰分", lang)}</div>
            <div className="mt-1 text-xs text-muted">{gt("出粮入斗 · 按权重均分 · 封仓验收定等第", lang)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {progress && <Stat label={gt("称号", lang)} value={gt(progress.title, lang)} />}
            {progress && <Stat label={gt("数艺", lang)} value={`${progress.liuyi_shu2}`} numeric />}
            {progress && <Stat label={gt("最佳", lang)} value={`${progress.best_score}`} numeric />}
            <Link href="/journey" className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2">
              {gt("← 六艺", lang)}
            </Link>
          </div>
        </div>
      </Reveal>

      {loadErr && (
        <div className="error-state">
          <div className="icon-plate">!</div>
          <div className="state-title">{gt("加载失败", lang)}</div>
          <p className="state-sub">{loadErr}</p>
          <button type="button" onClick={() => loadAll()} className="retry-btn">{gt("再试一次", lang)}</button>
        </div>
      )}

      {/* 关卡选择（横向卡条） */}
      {phase === "idle" && today && (
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {today.scenarios.map((s) => {
              const best = bestMap.get(s.id) ?? 0;
              const color = KIND_COLOR[s.kind] ?? "#2b2925";
              return (
                <button
                  key={s.id}
                  onClick={() => startScenario(s)}
                  className="card-hover min-w-[230px] max-w-[230px] shrink-0 rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ background: color }}>
                      {gt(s.kind_label, lang)}
                    </span>
                    <span className="flex gap-1">
                      {s.done_today && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{gt("今日已校 ✓", lang)}</span>}
                      {best > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{gt("最佳", lang)} {best}</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 font-serif text-base" style={{ color }}>{gt(s.title, lang)}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{gt(s.setting, lang)}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-faint">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5">{gt("共", lang)} {s.total} {s.unit}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5">{s.items.length} {gt("项", lang)}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-faint">
            {gt("七关皆可任算 · 今日已校", lang)} {today.today_done_count}/{today.daily_limit}{gt("· 每日每关首算计分，当日再算练手不加分", lang)}
          </p>
        </section>
      )}

      {/* 分粮场 */}
      {(phase === "playing" || phase === "submitting" || phase === "scored") && current && (
        <section className="relative select-none overflow-hidden rounded-2xl border border-line" style={{ height: "min(64vh, 560px)", minHeight: 340 }}>
          <Canvas
          shadows
            key={`${current.id}-${runId}`}
            dpr={[1, 2]}
            camera={{ position: [0, 5.4, 10.6], fov: 55, near: 0.1, far: 300 }}
            onCreated={({ camera }) => camera.lookAt(0, 1.2, -2.5)}
            className="block h-full w-full"
          >
            <MathScene g={g} />
          </Canvas>

          {/* 剩余量（顶部大字，rAF 直读 refs） */}
          <RemainingGauge g={g} />

          {/* 每村已分小条（左上） */}
          <VillageMeters g={g} scenario={current} />

          {/* 关卡提示 */}
          {showGuide && phase === "playing" && (
            <Reveal className="pointer-events-none absolute left-1/2 top-16 w-[min(92%,430px)] -translate-x-1/2">
              <div className="rounded-2xl bg-black/60 px-5 py-4 text-center text-white backdrop-blur animate-fadein">
                <div className="font-serif text-lg" style={{ color: "#f0d9a0" }}>{gt(current.title, lang)}</div>
                <div className="mt-1 text-xs leading-relaxed opacity-85">{gt(current.setting, lang)}</div>
                <div className="mt-1 text-[11px] opacity-70">{gt(current.hint, lang)}</div>
                {current.principle && <div className="mt-1.5 text-[11px] text-sky-200">{gt("法曰", lang)}{gt(current.principle, lang)}</div>}
              </div>
            </Reveal>
          )}

          {/* toast */}
          {toast && (
            <Reveal className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2">
              <div className={`rounded-full px-4 py-1.5 font-serif text-lg backdrop-blur animate-toast ${
                toast.good ? "bg-black/55 text-[#f0d9a0]" : "bg-red-900/70 text-white"
              }`}>
                {toast.text}
              </div>
            </Reveal>
          )}

          {/* 提交中 */}
          {phase === "submitting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="rounded-2xl bg-surface px-6 py-4 font-serif text-lg text-fg animate-fadein">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent align-middle" />{" "}
                {gt("封仓核验中…", lang)}
              </div>
            </div>
          )}

          {/* 结算卡 */}
          {phase === "scored" && result && (
            <ResultCard
              result={result}
              onRetry={() => startScenario(current)}
              onBack={backToSelect}
            />
          )}

          {/* 移动按钮 */}
          {phase === "playing" && (
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-between px-3 sm:px-6">
              <div className="flex gap-2">
                <Pressable
                  onClick={() => switchVillage(-1)}
                  className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl bg-black/50 text-lg text-white shadow-lg backdrop-blur"
                >◀</Pressable>
                <Pressable
                  onClick={() => switchVillage(1)}
                  className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl bg-black/50 text-lg text-white shadow-lg backdrop-blur"
                >▶</Pressable>
              </div>
              <TactileButton
                variant="accent"
                onClick={() => void submitRef.current()}
                className="h-14"
              >
                {gt("封仓验收", lang)}
              </TactileButton>
              <div className="flex gap-2">
                <HoldBtn label={gt("回粮", lang)} sub="↓" onHold={(v) => { g.input.scoop = v; }} />
                <HoldBtn label={gt("出粮", lang)} sub="↑" accent onHold={(v) => { g.input.pour = v; }} />
              </div>
            </div>
          )}

          {/* 桌面键位提示 */}
          {phase === "playing" && (
            <div className="pointer-events-none absolute right-3 top-3 hidden rounded-full bg-black/45 px-3 py-1 text-[10px] text-white backdrop-blur sm:block">
              {gt("←→ 选村 · ↑ 出粮 · ↓ 回粮 · Enter 验收", lang)}
            </div>
          )}
        </section>
      )}

      {/* 数艺进度 */}
      {progress && phase === "idle" && (
        <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4" delay={120}>
          <div className="mb-2 text-sm font-medium text-fg">
            {gt("数艺进境 ·", lang)} {progress.played_count} / {progress.total_scenarios} {gt("关", lang)} · {gt("均分", lang)} {progress.avg_score} · {gt("共算", lang)} {progress.total_plays} {gt("次", lang)}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {progress.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: KIND_COLOR[s.kind] ?? "#2b2925" }}>{gt(s.kind_label, lang)} · {gt(s.title, lang)}</span>
                  <span className={s.best_score > 0 ? "text-fg" : "text-faint"}>
                    {s.best_score > 0 ? `${gt("最佳", lang)} ${s.best_score}` : gt("未算", lang)}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted">{gt(s.setting, lang)}</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

// ── 剩余量（rAF 直读 refs，不走 React 渲染） ──
function RemainingGauge({ g }: { g: MathRefs }) {
  const [lang] = useLang();
  const numRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const st = g.engine;
      if (st && numRef.current) {
        const rem = remaining(st);
        numRef.current.textContent = `${Math.round(rem)}`;
        numRef.current.style.color = rem <= 0.001 ? "#d9a521" : "#ffffff";
        if (subRef.current) {
          const used = allocatedSum(st);
          subRef.current.textContent = `${gt("已分", lang)} ${Math.round(used)} / ${st.scenario.total} ${st.scenario.unit}`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g, lang]);
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-2xl bg-black/45 px-5 py-2 text-center backdrop-blur">
      <div className="text-[10px] tracking-widest text-white/60">{gt("仓中剩余", lang)}</div>
      <div>
        <span ref={numRef} className="font-serif text-3xl font-bold text-white">0</span>
        <span className="ms-1 text-xs text-white/60">{g.engine?.scenario.unit ?? ""}</span>
      </div>
      <div ref={subRef} className="text-[10px] text-white/60" />
    </div>
  );
}

// ── 每村已分小条（rAF 驱动） ──
function VillageMeters({ g, scenario }: { g: MathRefs; scenario: MathScenarioBrief }) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const txtRefs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const st = g.engine;
      if (st) {
        scenario.items.forEach((it, i) => {
          const v = st.allocations[it.name] ?? 0;
          const pct = Math.min(100, (v / scenario.total) * 100);
          const bar = barRefs.current[i];
          if (bar) {
            bar.style.width = `${pct}%`;
            bar.style.background = st.selected === i ? "#d9a521" : "#8fae7a";
          }
          const txt = txtRefs.current[i];
          if (txt) txt.textContent = `${Math.round(v)} ${scenario.unit} · ${Math.round(pct)}%`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g, scenario]);
  return (
    <div className="pointer-events-none absolute left-3 top-3 w-[190px] space-y-1.5 rounded-2xl bg-black/45 p-3 backdrop-blur">
      {scenario.items.map((it, i) => (
        <div key={it.name}>
          <div className="flex justify-between text-[10px] text-white/80">
            <span className="font-medium">{it.name_display ?? it.name}</span>
            <span ref={(el) => { txtRefs.current[i] = el; }} className="text-white/60" />
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div ref={(el) => { barRefs.current[i] = el; }} className="h-full rounded-full" style={{ width: "0%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 结算卡 ──
function ResultCard({ result, onRetry, onBack }: { result: MathSolveResp; onRetry: () => void; onBack: () => void }) {
  const [lang] = useLang();
  const sc = result.scenario;
  const ideals = new Map(sc.ideal_shares.map((x) => [x.name, x.ideal_share]));
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="text-center">
          <div className="text-[10px] tracking-widest text-faint">{gt(sc.kind_label, lang)} · {gt("核验", lang)}</div>
          <div className="mt-1 font-serif text-5xl text-fg"><CountUp value={result.score} /></div>
          <div
            className="mt-1 inline-block rounded-full px-3 py-0.5 font-serif text-sm text-white"
            style={{ background: GRADE_COLOR[result.grade] ?? "#6b6046" }}
          >
            {gt(result.grade, lang)}
            {result.score_applied
              ? (result.shu_delta > 0 ? `· ${gt("数艺", lang)} +${result.shu_delta}` : result.xp_delta > 0 ? `· ${gt("修为", lang)} +${result.xp_delta}` : "")
              : gt("（今日已校，不再计分）", lang)}
          </div>
        </div>
        {/* 三维条 */}
        <div className="mt-4 space-y-2">
          <DimBar label={gt("合总 · 总量相合", lang)} v={result.sum_match} color="#0F6E56" />
          <DimBar label={gt("均衡 · 各得其分", lang)} v={result.fairness} color="#1E5F8E" />
          <DimBar label={gt("节度 · 不过其量", lang)} v={result.moderation} color="#854F0B" />
        </div>
        {/* 你的分配 vs 圣算 */}
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-2/70 text-muted">
                <th className="px-2 py-1 text-start font-medium">{gt("对象", lang)}</th>
                <th className="px-2 py-1 text-end font-medium">{gt("你的分配", lang)}</th>
                <th className="px-2 py-1 text-end font-medium">{gt("圣算揭晓", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {sc.items.map((it) => {
                const mine = result.allocations[it.name] ?? 0;
                const ideal = ideals.get(it.name) ?? 0;
                const diff = Math.abs(mine - ideal);
                return (
                  <tr key={it.name} className="border-t border-line/60">
                    <td className="px-2 py-1 text-fg">{it.name_display ?? it.name}</td>
                    <td className="px-2 py-1 text-end text-fg">{Math.round(mine * 10) / 10} {sc.unit}</td>
                    <td className={`px-2 py-1 text-end ${diff / Math.max(1, sc.total) > 0.1 ? "text-amber-700" : "text-muted"}`}>
                      {Math.round(ideal * 10) / 10} {sc.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* 评判 tips */}
        {result.feedback.length > 0 && (
          <div className="mt-3 rounded-lg bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted">
            {result.feedback.map((t, i) => <div key={i} className="mt-0.5">· {gt(t, lang)}</div>)}
          </div>
        )}
        {/* 经典 */}
        {result.refs.length > 0 && (
          <div className="mt-3 rounded-lg border border-gold/50 bg-[#fbf3dc]/70 p-3 text-[11px] text-[#6b4e12]">
            {result.refs.slice(0, 2).map((r) => (
              <div key={r.ref_id} className="mt-1">
                <span className="opacity-70">{r.ref_label}：</span>
                <span className="font-serif">{r.text}</span>
                {result.new_unlocked_refs.some((u) => u.ref_id === r.ref_id) && (
                  <span className="ms-1 rounded-full bg-gold px-1.5 text-[9px] text-on-accent">{gt("新解锁", lang)}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <ProvenanceCaption
          className="mt-4"
          items={[
            { label: gt("艺", lang), value: gt("数艺", lang) },
            { label: gt("关卡", lang), value: gt(sc.kind_label, lang) },
            { label: "ID", value: `#${sc.id}` },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <TactileButton variant="accent" onClick={onRetry} className="flex-1">
            {gt("再算一次", lang)}
          </TactileButton>
          <TactileButton variant="cel" onClick={onBack} className="flex-1">
            {gt("换一关", lang)}
          </TactileButton>
        </div>
      </div>
    </div>
  );
}

function DimBar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span>{Math.round(v * 100)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.round(v * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function HoldBtn({ label, sub, accent, onHold }: { label: string; sub?: string; accent?: boolean; onHold: (v: boolean) => void }) {
  return (
    <Pressable
      onPointerDown={(e) => { e.preventDefault(); onHold(true); }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      className={`flex h-14 min-w-[64px] touch-none flex-col items-center justify-center rounded-2xl px-4 font-medium shadow-lg backdrop-blur ${
        accent ? "bg-accent/90 text-on-accent" : "bg-black/50 text-white"
      }`}
    >
      <span className="text-sm leading-none">{label}</span>
      {sub && <span className="mt-0.5 text-[9px] opacity-60">{sub}</span>}
    </Pressable>
  );
}

function Stat({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1">
      <div className="text-[10px] text-faint">{label}</div>
      <div className="font-serif text-sm text-fg">
        {numeric ? <CountUp value={parseInt(value, 10) || 0} /> : value}
      </div>
    </div>
  );
}

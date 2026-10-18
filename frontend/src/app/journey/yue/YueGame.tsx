"use client";

/**
 * 乐艺·编钟合鸣 — 3D 击钟（Three.js / React Three Fiber）
 *
 * 操作：点击编钟 / 1-5 或 A S D F G = 宫商角徵羽 · 空格 = 休止
 *       Backspace = 撤销 · Enter = 奏乐验收
 *       手机：底部五音大钮 + 休/撤销/试听/验收
 *
 * 后端契约：POST /yue/scenario/{sid}/play（sequence 4-32 枚，三维评分）。
 * 动画/音频由 Game 统一触发（写 YueRefs + 调 yueAudio），场景只读 refs。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGT } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";
import { getYueProgress, getYueToday, playYueScenario } from "@/lib/api";
import type {
  YueNote,
  YuePlayResp,
  YueProgressResp,
  YueScenarioBrief,
  YueTodayResp,
} from "@/lib/types";
import {
  canSubmit,
  createEngine,
  distribution,
  finalizeSequence,
  NOTES,
  NOTE_LABEL,
  prevRealNote,
  pushRest,
  realCount,
  shengRelation,
  strike,
  TARGET_LEN,
  truncate,
  undo,
  type YueToken,
} from "./yueEngine";
import { createYueRefs, YueScene, MOOD_COLOR } from "./yueScene";
import * as sfx from "./yueAudio";

type Phase = "idle" | "playing" | "submitting" | "scored";

const GRADE_COLOR: Record<string, string> = {
  神和: "#0F6E56", 协律: "#1E5F8E", 中和: "#854F0B", 试律: "#993C1D", 学律: "#6b6046",
};

interface YueDebugHook {
  strike: (note: YueNote) => void;
  rest: () => void;
  undo: () => void;
  setSeq: (seq: YueToken[]) => void;
  state: () => { sequence: YueToken[]; real: number; distribution: Record<YueNote, number> };
  submit: () => void;
}
declare global {
  interface Window { __yue?: YueDebugHook }
}

const KEY_NOTE: Record<string, YueNote> = {
  Digit1: "gong", Digit2: "shang", Digit3: "jue", Digit4: "zhi", Digit5: "yu",
  KeyA: "gong", KeyS: "shang", KeyD: "jue", KeyF: "zhi", KeyG: "yu",
};

export default function YueGame() {
  const tr = useGT();
  const [today, setToday] = useState<YueTodayResp | null>(null);
  const [progress, setProgress] = useState<YueProgressResp | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [current, setCurrent] = useState<YueScenarioBrief | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<YuePlayResp | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [listening, setListening] = useState(false);
  const [, setSeqTick] = useState(0); // 引擎变更后刷新乐章谱

  const [refs] = useState(() => createYueRefs());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const listeningRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(() => {
    getYueToday().then(setToday).catch(() => setLoadErr(tr("无法加载乐艺题库 — 请先登录")));
    getYueProgress().then(setProgress).catch(() => {});
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const tick = useCallback(() => setSeqTick((t) => t + 1), []);

  const say = useCallback((text: string, good: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, good });
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // ── 击钟表现（动画 + 音频 + 相生提示；编辑与试听共用） ──
  const fireBell = useCallback((note: YueNote, prev: YueNote | null) => {
    refs.bellT[note] = refs.now;
    refs.hammerIdx = NOTES.indexOf(note);
    refs.hammerT = refs.now;
    refs.ripples.push({ idx: NOTES.indexOf(note), t0: refs.now });
    if (prev) {
      const rel = shengRelation(prev, note);
      if (rel === "sheng") {
        refs.arc = { from: NOTES.indexOf(prev), to: NOTES.indexOf(note), kind: "sheng", t0: refs.now };
        sfx.shengChime();
      } else if (rel === "reverse") {
        refs.arc = { from: NOTES.indexOf(prev), to: NOTES.indexOf(note), kind: "reverse", t0: refs.now };
        sfx.reverseHint();
      }
    }
    sfx.strikeBell(note);
  }, [refs]);

  // ── 编辑操作 ──
  const doStrike = useCallback((note: YueNote) => {
    if (phaseRef.current !== "playing" || listeningRef.current || !refs.engine) return;
    const prev = prevRealNote(refs.engine, refs.engine.sequence.length);
    if (!strike(refs.engine, note)) { say(tr("已足十六音 · 可奏乐验收"), true); return; }
    fireBell(note, prev);
    if (refs.engine.sequence.length === TARGET_LEN + 5) say(tr("已过十二音 · 可奏乐验收"), true);
    tick();
  }, [refs, fireBell, say, tick]);

  const doRest = useCallback(() => {
    if (phaseRef.current !== "playing" || listeningRef.current || !refs.engine) return;
    if (pushRest(refs.engine)) sfx.restTok();
    tick();
  }, [refs, tick]);

  const doUndo = useCallback(() => {
    if (phaseRef.current !== "playing" || listeningRef.current || !refs.engine) return;
    if (undo(refs.engine)) sfx.undoTick();
    tick();
  }, [refs, tick]);

  const doTruncate = useCallback((i: number) => {
    if (phaseRef.current !== "playing" || listeningRef.current || !refs.engine) return;
    truncate(refs.engine, i);
    sfx.undoTick();
    tick();
  }, [refs, tick]);

  // ── 场景桥（点钟 → 编辑）：每次渲染直接赋值，避免闭包过期 ──
  refs.onStrike.current = doStrike;

  // ── 开局 ──
  const startScenario = useCallback((s: YueScenarioBrief) => {
    refs.engine = createEngine(s);
    refs.arc = null;
    refs.ripples = [];
    // 关键：Canvas 按 key 重挂载后场景时钟从 0 重计，
    // 必须重置上一局的击钟/木槌时间戳，否则负 dt 让摆动公式算出天文数字 → 编钟乱晃
    for (const n of NOTES) refs.bellT[n] = -10;
    refs.hammerT = -10;
    refs.running = true;
    setCurrent(s);
    setResult(null);
    setShowGuide(true);
    setRunId((i) => i + 1);
    setPhase("playing");
    tick();
    setTimeout(() => setShowGuide(false), 6500);
  }, [refs, tick]);

  // ── 试听（禁编辑，钟摆/涟漪/光弧同步） ──
  const doListen = useCallback(() => {
    const st = refs.engine;
    if (phaseRef.current !== "playing" || listeningRef.current || !st || st.sequence.length === 0) return;
    listeningRef.current = true;
    setListening(true);
    let i = 0;
    playTimer.current = setInterval(() => {
      if (!refs.engine || i >= refs.engine.sequence.length) {
        if (playTimer.current) clearInterval(playTimer.current);
        playTimer.current = null;
        listeningRef.current = false;
        setListening(false);
        return;
      }
      const t = refs.engine.sequence[i];
      if (t !== "rest") fireBell(t, prevRealNote(refs.engine, i));
      i++;
    }, 480);
  }, [refs, fireBell]);

  // ── 奏乐验收 → 提交 ──
  const submitRef = useRef<() => void>(() => {});
  const submit = useCallback(async () => {
    if (phaseRef.current !== "playing" || listeningRef.current || !current || !refs.engine) return;
    if (!canSubmit(refs.engine)) {
      say(`${tr("乐章太短 — 至少")} ${4} ${tr("枚音（当前")} ${realCount(refs.engine)}）`, false);
      return;
    }
    refs.running = false;
    sfx.submitBell();
    setPhase("submitting");
    try {
      const res = await playYueScenario(current.id, finalizeSequence(refs.engine) as YueNote[]);
      setResult(res);
      sfx.finish(res.score);
      setPhase("scored");
      getYueProgress().then(setProgress).catch(() => {});
      getYueToday().then(setToday).catch(() => {});
    } catch {
      say(tr("提交失败 — 请检查登录/网络"), false);
      setPhase("playing");
      refs.running = true;
    }
  }, [current, refs, say]);
  submitRef.current = submit;

  // ── 调试钩子（CDP 测试用） ──
  useEffect(() => {
    window.__yue = {
      strike: (note) => doStrike(note),
      rest: () => doRest(),
      undo: () => doUndo(),
      setSeq: (seq) => {
        if (refs.engine) {
          refs.engine.sequence = seq.filter((t) => NOTES.includes(t as YueNote) || t === "rest").slice(0, 16);
          tick();
        }
      },
      state: () => ({
        sequence: [...(refs.engine?.sequence ?? [])],
        real: refs.engine ? realCount(refs.engine) : 0,
        distribution: refs.engine ? distribution(refs.engine) : { gong: 0, shang: 0, jue: 0, zhi: 0, yu: 0 },
      }),
      submit: () => submitRef.current(),
    };
    return () => { delete window.__yue; };
  }, [refs, doStrike, doRest, doUndo, tick]);

  // ── 键盘 ──
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing" || listeningRef.current) return;
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      const note = KEY_NOTE[e.code];
      if (note) { if (!e.repeat) doStrike(note); e.preventDefault(); return; }
      switch (e.code) {
        case "Space": if (!e.repeat) doRest(); e.preventDefault(); break;
        case "Backspace": if (!e.repeat) doUndo(); e.preventDefault(); break;
        case "Enter": if (!e.repeat) void submitRef.current(); e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [doStrike, doRest, doUndo]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (playTimer.current) clearInterval(playTimer.current);
  }, []);

  const backToSelect = useCallback(() => {
    refs.running = false;
    if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
    listeningRef.current = false;
    setListening(false);
    setPhase("idle");
    setCurrent(null);
    setResult(null);
    loadAll();
  }, [refs, loadAll]);

  const bestMap = new Map(progress?.scenarios.map((s) => [s.id, s.best_score]) ?? []);
  const seq = refs.engine?.sequence ?? [];
  const moodColor = current ? (MOOD_COLOR[current.mood] ?? "#2b2925") : "#2b2925";

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{tr("六艺 · 乐")}</div>
            <div className="font-serif text-xl text-fg">{tr("编钟合鸣 · 五音相生")}</div>
            <div className="mt-1 text-xs text-muted">{tr("击钟成乐 · 五音相生 · 合于情境 · 奏乐验收定等第")}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {progress && <Stat label={tr("称号")} value={tr(progress.title)} />}
            {progress && <Stat label={tr("乐艺")} value={`${progress.liuyi_yue}`} numeric />}
            {progress && <Stat label={tr("最佳")} value={`${progress.best_score}`} numeric />}
            <Link href="/journey" className="route-link">
              {tr("← 六艺")}
            </Link>
          </div>
        </div>
      </Reveal>

      {loadErr && (
        <div className="error-state">
          <div className="icon-plate">!</div>
          <div className="state-title">{tr("加载失败")}</div>
          <p className="state-sub">{loadErr}</p>
          <Link href="/login" className="retry-btn">{tr("去登录")}</Link>
        </div>
      )}

      {/* 关卡选择（横向卡条） */}
      {phase === "idle" && today && (
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {today.scenarios.map((s) => {
              const best = bestMap.get(s.id) ?? 0;
              const color = MOOD_COLOR[s.mood] ?? "#2b2925";
              return (
                <button
                  key={s.id}
                  onClick={() => startScenario(s)}
                  className="card-hover min-w-[230px] max-w-[230px] shrink-0 rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ background: color }}>
                      {tr(s.mood_label)}
                    </span>
                    <span className="flex gap-1">
                      {s.done_today && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{tr("今日已奏 ✓")}</span>}
                      {best > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{tr("最佳")} {best}</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 font-serif text-base" style={{ color }}>{tr(s.title)}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{tr(s.setting)}</div>
                  <div className="mt-2 line-clamp-2 text-[10px] text-faint">{tr(s.hint)}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-faint">
            {tr("五关皆可任奏 · 今日已奏")} {today.today_done_count}/{today.daily_limit} · {tr("每日每关首奏计分，当日再奏练手不加分")}
          </p>
        </section>
      )}

      {/* 击钟台 */}
      {(phase === "playing" || phase === "submitting" || phase === "scored") && current && (
        <section className="relative select-none overflow-hidden rounded-2xl border border-line" style={{ height: "min(64vh, 560px)", minHeight: 340 }}>
          <Canvas
            key={`${current.id}-${runId}`}
            dpr={[1, 2]}
            camera={{ position: [0, 2.9, 8.4], fov: 52, near: 0.1, far: 300 }}
            onCreated={({ camera }) => camera.lookAt(0, 2.1, -3)}
            className="block h-full w-full"
          >
            <YueScene g={refs} />
          </Canvas>

          {/* 进度（右上：建议 8 音） */}
          {phase === "playing" && (
            <div className="pointer-events-none absolute right-3 top-3 rounded-2xl bg-black/45 px-3 py-2 text-center backdrop-blur">
              <div className="text-[10px] tracking-widest text-white/60">{tr("乐章")} {seq.length}/{TARGET_LEN}</div>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: TARGET_LEN }, (_, i) => (
                  <span
                    key={i}
                    className={`inline-block h-1.5 w-1.5 rounded-full ${i < seq.length ? "bg-gold" : "bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 关卡提示 */}
          {showGuide && phase === "playing" && (
            <Reveal className="pointer-events-none absolute left-1/2 top-14 w-[min(92%,430px)] -translate-x-1/2">
              <div className="rounded-2xl bg-black/60 px-5 py-4 text-center text-white backdrop-blur animate-fadein">
                <div className="font-serif text-lg" style={{ color: "#f0d9a0" }}>{tr(current.title)} · {tr(current.mood_label)}</div>
                <div className="mt-1 text-xs leading-relaxed opacity-85">{tr(current.setting)}</div>
                <div className="mt-1 text-[11px] opacity-70">{tr(current.hint)}</div>
                <div className="mt-1.5 text-[11px] text-teal-200">{tr("五音相生：")}{tr("宫")}→{tr("徵")}→{tr("商")}→{tr("羽")}→{tr("角")}→{tr("宫")}{tr("，顺生则青弧泛起")}</div>
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
              <div className="rounded-2xl bg-surface px-6 py-4 font-serif text-lg text-fg animate-fadein">{tr("审乐定声中…")}</div>
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

          {/* 乐章谱（底部横排音牌，点牌截断撤销） */}
          {phase === "playing" && (
            <div className="absolute inset-x-0 bottom-[88px] flex justify-center px-3">
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-black/45 px-3 py-2 backdrop-blur">
                {seq.length === 0 && <span className="px-2 text-[11px] text-white/50">{tr("击钟起乐…")}</span>}
                {seq.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => doTruncate(i)}
                    title={tr("点掉此音及其后")}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-serif text-base shadow ${
                      t === "rest"
                        ? "border border-white/40 text-white/70"
                        : "text-white"
                    }`}
                    style={t === "rest" ? {} : { background: moodColor }}
                  >
                    {tr(NOTE_LABEL[t])}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 操作钮（手机 + 桌面通用） */}
          {phase === "playing" && (
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-between gap-2 px-3 sm:px-6">
              <div className="flex gap-1.5">
                {NOTES.map((n, i) => (
                  <Pressable
                    key={n}
                    onClick={() => doStrike(n)}
                    className="flex h-14 w-11 touch-none flex-col items-center justify-center rounded-2xl font-medium text-white shadow-lg backdrop-blur sm:w-14"
                    style={{ background: ["#6b5a2e", "#7a4a2b", "#4a5e3a", "#8a3530", "#3a4a6b"][i] }}
                  >
                    <span className="font-serif text-base leading-none">{tr(NOTE_LABEL[n])}</span>
                    <span className="mt-0.5 text-[9px] opacity-60">{i + 1}</span>
                  </Pressable>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Pressable
                  onClick={doRest}
                  className="flex h-14 min-w-[44px] touch-none flex-col items-center justify-center rounded-2xl bg-black/50 px-3 font-medium text-white shadow-lg backdrop-blur"
                >
                  <span className="text-sm leading-none">{tr("休")}</span>
                  <span className="mt-0.5 text-[9px] opacity-60">{tr("空格")}</span>
                </Pressable>
                <Pressable
                  onClick={doUndo}
                  className="flex h-14 min-w-[44px] touch-none flex-col items-center justify-center rounded-2xl bg-black/50 px-3 font-medium text-white shadow-lg backdrop-blur"
                >
                  <span className="text-sm leading-none">{tr("撤销")}</span>
                  <span className="mt-0.5 text-[9px] opacity-60">⌫</span>
                </Pressable>
                <Pressable
                  onClick={doListen}
                  disabled={listening || seq.length === 0}
                  className="flex h-14 min-w-[44px] touch-none flex-col items-center justify-center rounded-2xl bg-black/50 px-3 font-medium text-white shadow-lg backdrop-blur disabled:opacity-50"
                >
                  <span className="text-sm leading-none">{listening ? tr("奏中") : tr("试听")}</span>
                  <span className="mt-0.5 text-[9px] opacity-60">♪</span>
                </Pressable>
                <TactileButton
                  variant="accent"
                  onClick={() => void submitRef.current()}
                  className="h-14"
                >
                  {tr("奏乐验收")}
                </TactileButton>
              </div>
            </div>
          )}

          {/* 桌面键位提示 */}
          {phase === "playing" && (
            <div className="pointer-events-none absolute left-3 top-3 hidden rounded-full bg-black/45 px-3 py-1 text-[10px] text-white backdrop-blur sm:block">
              {tr("1-5/ASDFG 击钟 · 空格 休 · ⌫ 撤销 · Enter 验收")}
            </div>
          )}
        </section>
      )}

      {/* 乐艺进度 */}
      {progress && phase === "idle" && (
        <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4" delay={120}>
          <div className="mb-2 text-sm font-medium text-fg">
            {tr("乐艺进境")} · {progress.played_count} / {progress.total_scenarios} {tr("关")} · {tr("均分")} {progress.avg_score} · {tr("共奏")} {progress.total_plays} {tr("次")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {progress.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: MOOD_COLOR[s.mood] ?? "#2b2925" }}>{tr(s.mood_label)} · {tr(s.title)}</span>
                  <span className={s.best_score > 0 ? "text-fg" : "text-faint"}>
                    {s.best_score > 0 ? `${tr("最佳")} ${s.best_score}` : tr("未奏")}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted">{tr(s.setting)}</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

// ── 结算卡 ──
function ResultCard({ result, onRetry, onBack }: { result: YuePlayResp; onRetry: () => void; onBack: () => void }) {
  const tr = useGT();
  const sc = result.scenario;
  const moodColor = MOOD_COLOR[sc.mood] ?? "#2b2925";
  const NOTES_ORDER: YueNote[] = ["gong", "shang", "jue", "zhi", "yu"];
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="text-center">
          <div className="text-[10px] tracking-widest text-faint">{tr(sc.mood_label)} · {tr("审乐")}</div>
          <div className="mt-1 font-serif text-5xl text-fg"><CountUp value={result.score} /></div>
          <div
            className="mt-1 inline-block rounded-full px-3 py-0.5 font-serif text-sm text-white"
            style={{ background: GRADE_COLOR[result.grade] ?? "#6b6046" }}
          >
            {tr(result.grade)}
            {result.score_applied
              ? (result.yue_delta > 0 ? ` ${tr("乐艺 +")}${result.yue_delta}` : result.xp_delta > 0 ? ` ${tr("修为 +")}${result.xp_delta}` : "")
              : tr("（今日已奏，不再计分）")}
          </div>
        </div>
        {/* 三维条 */}
        <div className="mt-4 space-y-2">
          <DimBar label={tr("和声 · 五音相生")} v={result.harmony} color="#2f8f7b" />
          <DimBar label={tr("合意 · 情境相合")} v={result.mood_match} color="#1E5F8E" />
          <DimBar label={tr("节度 · 不极不滥")} v={result.moderation} color="#854F0B" />
        </div>
        {/* 五音分布 vs 圣乐 */}
        <div className="mt-3 rounded-lg border border-line p-3">
          <div className="mb-1.5 text-[11px] font-medium text-fg">{tr("五音分布 · 你的 vs 圣乐")}</div>
          <div className="space-y-1.5">
            {NOTES_ORDER.map((n) => {
              const mine = Math.round((result.distribution[n] ?? 0) * 100);
              const ideal = Math.round((sc.ideal_distribution[n] ?? 0) * 100);
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-6 font-serif text-sm text-fg">{tr(NOTE_LABEL[n])}</span>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${mine}%`, background: moodColor }} />
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-[#9a8f74]" style={{ width: `${ideal}%` }} />
                    </div>
                  </div>
                  <span className="w-16 text-right text-[10px] text-muted">{mine}% / {ideal}%</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* 经典 */}
        {result.refs.length > 0 && (
          <div className="mt-3 rounded-lg border border-gold/50 bg-[#fbf3dc]/70 p-3 text-[11px] text-[#6b4e12]">
            {result.refs.slice(0, 2).map((r) => (
              <div key={r.ref_id} className="mt-1">
                <span className="opacity-70">{r.ref_label}：</span>
                <span className="font-serif">{r.text}</span>
                {result.new_unlocked_refs.some((u) => u.ref_id === r.ref_id) && (
                  <span className="ml-1 rounded-full bg-gold px-1.5 text-[9px] text-white">{tr("新解锁")}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <ProvenanceCaption
          className="mt-4"
          items={[
            { label: tr("艺"), value: tr("乐艺") },
            { label: tr("情境"), value: tr(sc.mood_label) },
            { label: "ID", value: `#${sc.id}` },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <TactileButton variant="accent" onClick={onRetry} className="flex-1">
            {tr("再奏一曲")}
          </TactileButton>
          <TactileButton variant="cel" onClick={onBack} className="flex-1">
            {tr("换一关")}
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

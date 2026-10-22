"use client";

/**
 * 书艺·竹简挥毫 — 3D 书写（Three.js / React Three Fiber）
 *
 * 操作：按住拖动 = 落墨运笔（鼠标/触屏，慢粗快细）· 松开 = 抬笔成段
 *       「重写」清墨 · 「交卷」提交 trace 评分
 *
 * 后端契约：POST /shu/card/{id}/trace（strokes>=3 且 duration_ms>=3000 才计分）。
 * 底稿/墨迹/评分由 brushEngine 管理（CanvasTexture 源 + 离屏掩膜分析）。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { getShuProgress, getShuToday, traceShuCard } from "@/lib/api";
import type {
  ShuCardBrief,
  ShuProgressResp,
  ShuTodayResp,
  ShuTraceResp,
} from "@/lib/types";
import {
  clearInk,
  computeScore,
  createEngine,
  finalize,
  loadHanziData,
  paintGuide,
  penDown,
  penMove,
  penUp,
  scribble,
  type HanziData,
} from "./brushEngine";
import { createBrushRefs, BrushScene, type BrushRefs } from "./brushScene";
import * as sfx from "./brushAudio";
import { useLang, getLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";

type Phase = "idle" | "loading" | "writing" | "submitting" | "scored";

const GRADE_COLOR: Record<string, string> = {
  神品: "#B8860B", 妙品: "#0F6E56", 能品: "#1E5F8E", 可观: "#854F0B", 试笔: "#6b6046",
};
const CAT_COLOR: Record<string, string> = {
  wuchang: "#993C1D", lunli: "#0F6E56", xiushen: "#534AB7", zhixue: "#1E5F8E", zhexue: "#854F0B",
};

interface Shu3dDebugHook {
  paintGuide: (n?: number) => void;
  scribble: () => void;
  clear: () => void;
  state: () => {
    strokes: number; durationMs: number; recall: number; precision: number; score: number;
    segs?: number; dots?: number; penDown?: boolean; pressF?: number; realPressure?: boolean;
  };
  submit: () => void;
}
declare global {
  interface Window { __shu3d?: Shu3dDebugHook }
}

const hanziCache = new Map<string, Promise<HanziData | null>>();
function loadHanziCached(char: string) {
  if (!hanziCache.has(char)) hanziCache.set(char, loadHanziData(char));
  return hanziCache.get(char)!;
}

export default function Brush3DGame() {
  const [lang] = useLang();
  const [today, setToday] = useState<ShuTodayResp | null>(null);
  const [progress, setProgress] = useState<ShuProgressResp | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [current, setCurrent] = useState<ShuCardBrief | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<ShuTraceResp | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [, setInkTick] = useState(0);

  const [g] = useState(() => createBrushRefs());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(() => {
    getShuToday(lang).then(setToday).catch(() => setLoadErr(gt("无法加载书艺字卡，请稍后重试", getLang())));
    getShuProgress().then(setProgress).catch(() => {});
  }, [lang]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const tick = useCallback(() => setInkTick((t) => t + 1), []);

  const say = useCallback((text: string, good: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, good });
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // ── 笔桥（场景 pointer → 引擎 + 音效）：每次渲染直接赋值 ──
  g.onPen.current = (type, x, y, speed, pressure) => {
    if (phaseRef.current !== "writing" || !g.engine) return;
    if (type === "down") {
      penDown(g.engine, x, y, pressure);
      sfx.dropTick();
      sfx.setStroking(true, 0.3);
    } else if (type === "move") {
      penMove(g.engine, x, y, speed, pressure);
      sfx.setStroking(true, Math.min(1, speed / 1600));
    } else {
      penUp(g.engine);
      sfx.setStroking(false);
      tick();
    }
  };

  // ── 开写 ──
  const startCard = useCallback(async (card: ShuCardBrief) => {
    setPhase("loading");
    setCurrent(card);
    const data = await loadHanziCached(card.char);
    g.engine = createEngine(card.char, data);
    g.penDown = false;
    g.penActive = false;
    g.running = true;
    setResult(null);
    setShowGuide(true);
    setRunId((i) => i + 1);
    setPhase("writing");
    tick();
    setTimeout(() => setShowGuide(false), 6000);
  }, [g, tick]);

  // ── 重写 ──
  const doClear = useCallback(() => {
    if (phaseRef.current !== "writing" || !g.engine) return;
    clearInk(g.engine);
    sfx.setStroking(false);
    tick();
  }, [g, tick]);

  // ── 交卷 → 提交 ──
  const submitRef = useRef<() => void>(() => {});
  const submit = useCallback(async () => {
    if (phaseRef.current !== "writing" || !current || !g.engine) return;
    const fin = finalize(g.engine);
    if (fin.strokes < 3) { say(gt("至少写成 3 段再交卷", getLang()), false); return; }
    if (fin.durationMs < 3000) { say(gt("书道忌躁 — 书写须满 3 秒", getLang()), false); return; }
    g.running = false;
    sfx.setStroking(false);
    sfx.submitBell();
    setPhase("submitting");
    try {
      const res = await traceShuCard(current.id, fin.strokes, fin.durationMs, fin.score, fin.precision, fin.recall);
      setResult(res);
      sfx.finish(res.score);
      setPhase("scored");
      getShuProgress().then(setProgress).catch(() => {});
      getShuToday(lang).then(setToday).catch(() => {});
    } catch {
      say(gt("提交失败 — 请检查登录/网络", getLang()), false);
      setPhase("writing");
      g.running = true;
    }
  }, [current, g, say, lang]);
  submitRef.current = submit;

  // ── 调试钩子（CDP 测试用） ──
  useEffect(() => {
    window.__shu3d = {
      paintGuide: (n) => { if (g.engine) { paintGuide(g.engine, n); tick(); } },
      scribble: () => { if (g.engine) { scribble(g.engine); tick(); } },
      clear: () => doClear(),
      state: () => {
        if (!g.engine) return { strokes: 0, durationMs: 0, recall: 0, precision: 0, score: 0 };
        const sc = computeScore(g.engine);
        return {
          strokes: g.engine.strokes,
          durationMs: g.engine.firstInkAt === null ? 0 : Date.now() - g.engine.firstInkAt,
          segs: g.engine.segments.length,
          dots: g.engine.dots.length,
          penDown: g.engine.penDown,
          pressF: Math.round(g.engine.pressF * 100) / 100,
          realPressure: g.engine.realPressure,
          ...sc,
        };
      },
      submit: () => submitRef.current(),
    };
    return () => { delete window.__shu3d; };
  }, [g, doClear, tick]);

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

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{gt("六艺 · 书", lang)}</div>
            <div className="font-serif text-xl text-fg">{gt("竹简挥毫 · 提按转折", lang)}</div>
            <div className="mt-1 text-xs text-muted">{gt("执笔写大字 · 墨入宣纸 · 交卷定品第", lang)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {progress && <Stat label={gt("称号", lang)} value={progress.title} />}
            {progress && <Stat label={gt("书艺", lang)} value={`${progress.liuyi_shu}`} numeric />}
            <Link href="/journey/shu" className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2">
              {gt("← 书艺", lang)}
            </Link>
          </div>
        </div>
      </Reveal>

      {loadErr && (
        <div className="error-state">
          <div className="icon-plate">!</div>
          <div className="state-title">{gt("加载失败", lang)}</div>
          <p className="state-sub">{loadErr}</p>
          <Link href="/login" className="retry-btn">{gt("去登录", lang)}</Link>
        </div>
      )}

      {/* 字卡选择（横向卡条） */}
      {phase === "idle" && today && (
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {today.cards.map((c) => (
              <button
                key={c.id}
                onClick={() => void startCard(c)}
                className="card-hover min-w-[200px] max-w-[200px] shrink-0 rounded-2xl border border-line bg-surface p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ background: CAT_COLOR[c.category] ?? "#555" }}>
                    {c.category_label}
                  </span>
                  <span className="flex gap-1">
                    {c.answered && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{gt("练过", lang)}</span>}
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{"★".repeat(c.difficulty)}</span>
                  </span>
                </div>
                <div className="mt-2 text-center font-serif text-5xl text-fg">{c.char}</div>
                <div className="mt-1 text-center text-xs text-muted">{c.pinyin} · {gt("部件", lang)} {c.components}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-faint">
            {gt("今日 {a}/{b} · 每张首次交卷计分，当日再写练手不加分 · 书写满 3 秒、至少 3 段方可交卷", lang)
              .replace("{a}", String(today.today_done_count))
              .replace("{b}", String(today.daily_limit))}
          </p>
        </section>
      )}

      {phase === "loading" && (
        <section className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
          <div className="skeleton mx-auto mb-3 h-40 w-full rounded-xl" />
          {gt("铺纸研墨…", lang)}
        </section>
      )}

      {/* 书案 */}
      {(phase === "writing" || phase === "submitting" || phase === "scored") && current && (
        <section className="relative select-none overflow-hidden rounded-2xl border border-line" style={{ height: "min(66vh, 580px)", minHeight: 360 }}>
          <Canvas
            key={`${current.id}-${runId}`}
            dpr={[1, 2]}
            camera={{ position: [0, 4.35, 4.9], fov: 50, near: 0.1, far: 300 }}
            onCreated={({ camera }) => camera.lookAt(0, 0.85, -1.7)}
            className="block h-full w-full"
          >
            <BrushScene g={g} />
          </Canvas>

          {/* 字信息（左上） */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-2xl bg-black/45 px-4 py-2.5 text-white backdrop-blur">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl">{current.char}</span>
              <span className="text-xs opacity-80">{current.pinyin}</span>
            </div>
            <div className="mt-0.5 text-[10px] opacity-60">{gt("部件", lang)} {current.components} · {current.category_label}</div>
          </div>

          {/* 实时书写统计（右上，rAF 直读引擎） */}
          <InkStats g={g} />

          {/* 引导卡 */}
          {showGuide && phase === "writing" && (
            <Reveal className="pointer-events-none absolute left-1/2 top-16 w-[min(92%,430px)] -translate-x-1/2">
              <div className="rounded-2xl bg-black/60 px-5 py-4 text-center text-white backdrop-blur animate-fadein">
                <div className="font-serif text-lg" style={{ color: "#f0d9a0" }}>{gt("写「{c}」字", lang).replace("{c}", current.char)}</div>
                <div className="mt-1 text-xs leading-relaxed opacity-85">
                  {gt("按住纸面拖动即落墨：慢=按笔（粗而浓）、快=提笔（细而枯），压感笔可真实提按。沿浅灰底稿摹写，写满写稳。", lang)}
                </div>
                <div className="mt-1 text-[11px] opacity-70">{gt("松开为一段 · 至少 3 段、满 3 秒可交卷", lang)}</div>
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
              <div className="rounded-2xl bg-surface px-6 py-4 font-serif text-lg text-fg animate-fadein">{gt("品鉴墨色中…", lang)}</div>
            </div>
          )}

          {/* 结算卡 */}
          {phase === "scored" && result && (
            <ResultCard
              result={result}
              onRetry={() => { if (g.engine) clearInk(g.engine); setResult(null); setPhase("writing"); g.running = true; tick(); }}
              onBack={backToSelect}
            />
          )}

          {/* 操作钮 */}
          {phase === "writing" && (
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-between px-3 sm:px-6">
              <div className="pointer-events-none hidden rounded-full bg-black/45 px-3 py-1 text-[10px] text-white backdrop-blur sm:block">
                {gt("按住拖动 = 运笔 · 慢=按 快=提 · 压感笔真实提按", lang)}
              </div>
              <div className="flex gap-2">
                <TactileButton variant="cel" onClick={doClear} className="h-14">
                  {gt("重写", lang)}
                </TactileButton>
                <TactileButton
                  variant="accent"
                  onClick={() => void submitRef.current()}
                  className="h-14"
                >
                  {gt("交卷", lang)}
                </TactileButton>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 书艺进度 */}
      {progress && phase === "idle" && (
        <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4" delay={120}>
          <div className="mb-2 text-sm font-medium text-fg">
            {gt("书艺进境 · 已学 {a} / {b} 字 · 正确率 {c}%", lang)
              .replace("{a}", String(progress.correct_cards))
              .replace("{b}", String(progress.total_cards))
              .replace("{c}", String(Math.round(progress.correct_rate * 100)))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(progress.by_category).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-surface-2/40 p-2 text-center">
                <div className="text-[10px]" style={{ color: CAT_COLOR[k] || "#555" }}>{v.label}</div>
                <div className="mt-0.5 font-serif text-sm text-fg">
                  {v.learned} <span className="text-[10px] text-faint">/ {v.total}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

// ── 实时书写统计（rAF 直读引擎，节流评分） ──
function InkStats({ g }: { g: BrushRefs }) {
  const [lang] = useLang();
  const segRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const covRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let lastScore = 0;
    const loop = () => {
      const st = g.engine;
      if (st) {
        if (segRef.current) segRef.current.textContent = `${st.strokes} ${gt("段", lang)}`;
        if (timeRef.current) {
          const ms = st.firstInkAt === null ? 0 : Date.now() - st.firstInkAt;
          timeRef.current.textContent = `${(ms / 1000).toFixed(0)} ${gt("秒", lang)}`;
        }
        const now = performance.now();
        if (now - lastScore > 600 && (st.segments.length > 0 || st.guidePainted > 0)) {
          lastScore = now;
          const sc = computeScore(st);
          if (covRef.current) covRef.current.textContent = `${gt("覆盖", lang)} ${Math.round(sc.recall * 100)}%`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g, lang]);
  return (
    <div className="pointer-events-none absolute right-3 top-3 rounded-2xl bg-black/45 px-3 py-2 text-center text-white backdrop-blur">
      <div className="text-[10px] tracking-widest text-white/60">{gt("书写", lang)}</div>
      <div className="mt-0.5 flex gap-2 text-xs">
        <span ref={segRef}>0 {gt("段", lang)}</span>
        <span ref={timeRef} className="text-white/70">0 {gt("秒", lang)}</span>
        <span ref={covRef} className="text-gold">{gt("覆盖", lang)} 0%</span>
      </div>
    </div>
  );
}

// ── 结算卡 ──
function ResultCard({ result, onRetry, onBack }: { result: ShuTraceResp; onRetry: () => void; onBack: () => void }) {
  const [lang] = useLang();
  const card = result.card;
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="text-center">
          <div className="text-[10px] tracking-widest text-faint">{card.category_label} · {gt("「{c}」品鉴", lang).replace("{c}", card.char)}</div>
          <div className="mt-1 font-serif text-5xl text-fg"><CountUp value={result.score} /></div>
          <div
            className="mt-1 inline-block rounded-full px-3 py-0.5 font-serif text-sm text-white"
            style={{ background: GRADE_COLOR[result.grade] ?? "#6b6046" }}
          >
            {result.grade}
            {result.score_applied
              ? (result.she_delta > 0 ? gt("· 书艺 +{a}", lang).replace("{a}", String(result.she_delta)) : result.xp_delta > 0 ? gt("· 修为 +{a}", lang).replace("{a}", String(result.xp_delta)) : "")
              : gt("（今日已练，不再计分）", lang)}
          </div>
        </div>
        {/* 双维条 */}
        <div className="mt-4 space-y-2">
          <DimBar label={gt("精准 · 墨不逾稿", lang)} v={result.precision} color="#0F6E56" />
          <DimBar label={gt("覆盖 · 笔笔到位", lang)} v={result.recall} color="#1E5F8E" />
        </div>
        {/* 字源故事 */}
        <div className="mt-3 rounded-lg bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-white">{card.method_label}</span>
            <span className="text-faint">{gt("本义", lang)}</span>
            <span className="font-medium text-fg">{card.benyi}</span>
          </div>
          <div>{card.story}</div>
          <div className="mt-1.5 text-[10px] text-faint">{gt("今义：", lang)}{card.jinyi}</div>
        </div>
        {/* 经典 */}
        {card.refs.length > 0 && (
          <div className="mt-3 rounded-lg border border-gold/50 bg-[#fbf3dc]/70 p-3 text-[11px] text-[#6b4e12]">
            {card.refs.slice(0, 2).map((r) => (
              <div key={r.ref_id} className="mt-1">
                <span className="opacity-70">{r.ref_label}：</span>
                <span className="font-serif">{r.text}</span>
                {result.new_unlocked_refs.some((u) => u.ref_id === r.ref_id) && (
                  <span className="ms-1 rounded-full bg-gold px-1.5 text-[9px] text-white">{gt("新解锁", lang)}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <ProvenanceCaption
          className="mt-4"
          items={[
            { label: gt("艺", lang), value: gt("书 · 竹简", lang) },
            { label: gt("字", lang), value: card.char },
            { label: gt("品", lang), value: result.grade },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <TactileButton variant="accent" onClick={onRetry} className="flex-1">
            {gt("再写一遍", lang)}
          </TactileButton>
          <TactileButton variant="cel" onClick={onBack} className="flex-1">
            {gt("下一个字", lang)}
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

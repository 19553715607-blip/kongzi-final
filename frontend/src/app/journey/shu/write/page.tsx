"use client";

/**
 * 描红写字 — HanziWriter quiz 模式
 *
 * 用 chanind/hanzi-writer 开源库做笔顺判定：
 *   - 玩家按正确笔顺一笔一笔写
 *   - 写对的笔画固定显示，错笔会抖动并提示
 *   - onMistake 累计错笔；onComplete 给最终评分
 *
 * 字形数据预下载到 /hanzi-data/{char}.json，不走外网 CDN。
 *
 * 评分（提交给后端 trace 端点）：
 *   - 0 错笔 = 100 神品
 *   - 1-2 错笔 = 75-90 妙品
 *   - 3-5 错笔 = 60-75 能品
 *   - 6-10 错笔 = 40-60 可观
 *   - >10 错笔 = <40 试笔
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getShuProgress,
  getShuToday,
  traceShuCard,
} from "@/lib/api";
import type {
  ShuCardBrief,
  ShuProgressResp,
  ShuRefBrief,
  ShuTraceResp,
} from "@/lib/types";
import { useLang, getLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";

// hanzi-writer 在 SSR 时会报错（依赖 DOM/SVG），用 dynamic import
// 因为 HanziWriter 是 class（非 React component），不用 next/dynamic，用 useEffect 内 import
type WriterInstance = {
  quiz: (opts: {
    onMistake?: (info: { strokeNum: number; mistakesOnStroke: number; totalMistakes: number; strokesRemaining: number }) => void;
    onCorrectStroke?: (info: { strokeNum: number; mistakesOnStroke: number; totalMistakes: number; strokesRemaining: number }) => void;
    onComplete?: (info: { totalMistakes: number }) => void;
    showHintAfterMisses?: number;
  }) => void;
  cancelQuiz: () => void;
  animateCharacter: (opts?: { onComplete?: () => void }) => void;
  hideCharacter: () => void;
  showCharacter: () => void;
};

export default function ShuWritePage() {
  const [lang] = useLang();
  const [cards, setCards] = useState<ShuCardBrief[]>([]);
  const [progress, setProgress] = useState<ShuProgressResp | null>(null);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<ShuTraceResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 笔顺状态
  const [strokeIdx, setStrokeIdx] = useState(0);          // 已写对的笔画数
  const [totalStrokes, setTotalStrokes] = useState(0);    // 该字总笔画数
  const [mistakes, setMistakes] = useState(0);            // 累计错笔
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showingDemo, setShowingDemo] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<WriterInstance | null>(null);

  // 启动
  useEffect(() => {
    getShuToday(lang).then((d) => setCards(d.cards)).catch(() => setErr(gt("无法加载题库", getLang())));
    getShuProgress().then(setProgress).catch(() => {});
  }, [lang]);

  const current = cards[idx];

  // 计时
  useEffect(() => {
    if (startedAt === null || result) return;
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - startedAt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, result]);

  // 当切换字时：销毁旧 writer，创建新 writer
  useEffect(() => {
    if (!current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let canceled = false;
    let writerInstance: WriterInstance | null = null;

    // 重置 UI 状态
    setStrokeIdx(0);
    setMistakes(0);
    setStartedAt(null);
    setElapsed(0);
    setResult(null);
    setShowingDemo(false);

    // 清空容器
    wrap.innerHTML = "";

    (async () => {
      try {
        const mod = await import("hanzi-writer");
        const HanziWriter = (mod as unknown as { default: { create: (el: HTMLElement, char: string, opts: object) => WriterInstance } }).default;
        if (canceled) return;

        const size = Math.min(wrap.clientWidth, 480);
        writerInstance = HanziWriter.create(wrap, current.char, {
          width: size,
          height: size,
          padding: 16,
          showCharacter: false,
          showOutline: true,
          strokeColor: "#1a1a1a",
          radicalColor: "#0F6E56",
          outlineColor: "#cfcab6",
          drawingColor: "#1a1a1a",
          drawingWidth: 24,
          strokeAnimationSpeed: 1.2,
          delayBetweenStrokes: 120,
          charDataLoader: (
            char: string,
            onLoad: (d: unknown) => void,
            onErr?: (e: unknown) => void,
          ) => {
            fetch(`/hanzi-data/${encodeURIComponent(char)}.json`)
              .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .then(onLoad)
              .catch((e) => {
                if (onErr) onErr(e);
              });
          },
        });
        writerRef.current = writerInstance;

        // 拿字形数据决定总笔画数（fetch 一次轻量 JSON）
        try {
          const r = await fetch(`/hanzi-data/${encodeURIComponent(current.char)}.json`);
          const data: { strokes: string[] } = await r.json();
          if (!canceled) setTotalStrokes(data.strokes.length);
        } catch {
          // 拿不到就让 onComplete 时再算
        }

        // 启动 quiz 模式 — 玩家按笔顺写
        writerInstance.quiz({
          showHintAfterMisses: 2,
          onCorrectStroke: () => {
            if (canceled) return;
            setStrokeIdx((s) => s + 1);
            if (startedAt === null) setStartedAt(performance.now());
          },
          onMistake: (info: { totalMistakes: number }) => {
            if (canceled) return;
            setMistakes(info.totalMistakes);
            if (startedAt === null) setStartedAt(performance.now());
          },
          onComplete: (info: { totalMistakes: number }) => {
            if (canceled) return;
            void submitQuizResult(info.totalMistakes);
          },
        });
      } catch (e) {
        console.error("hanzi-writer init failed", e);
        setErr(gt("书写组件加载失败", getLang()));
      }
    })();

    return () => {
      canceled = true;
      try {
        writerInstance?.cancelQuiz();
      } catch {
        // ignore
      }
      writerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // 提交评分
  const submitQuizResult = async (mistakesCount: number) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      // 评分公式：100 - 错笔 × 10，限制 0-100
      const score = Math.max(0, 100 - mistakesCount * 10);
      const durationMs = startedAt ? Math.round(performance.now() - startedAt) : 0;
      // 用「正确笔画数」近似算 precision/recall（HanziWriter 完成意味着所有笔画都正确写过，所以为 1.0；mistakes 只影响 score）
      const r = await traceShuCard(
        current.id,
        Math.max(3, totalStrokes),    // strokes 字段填总笔画
        Math.max(3000, durationMs),   // 至少 3 秒
        score,
        1.0,                          // precision — 完成 quiz 即"全在字内"
        1.0,                          // recall — 全部笔画都写过
      );
      setResult(r);
      getShuProgress().then(setProgress).catch(() => {});
    } catch {
      setErr(gt("提交失败", getLang()));
    } finally {
      setBusy(false);
    }
  };

  const playDemo = () => {
    if (!writerRef.current || showingDemo) return;
    setShowingDemo(true);
    try {
      writerRef.current.cancelQuiz();
      writerRef.current.hideCharacter();
      writerRef.current.animateCharacter({
        onComplete: () => {
          // 演示完毕，重新开始 quiz
          setStrokeIdx(0);
          setMistakes(0);
          setStartedAt(null);
          setElapsed(0);
          writerRef.current?.hideCharacter();
          writerRef.current?.quiz({
            showHintAfterMisses: 2,
            onCorrectStroke: () => setStrokeIdx((s) => s + 1),
            onMistake: (info) => setMistakes(info.totalMistakes),
            onComplete: (info) => {
              void submitQuizResult(info.totalMistakes);
            },
          });
          setShowingDemo(false);
        },
      });
    } catch {
      setShowingDemo(false);
    }
  };

  const onRetry = () => {
    if (!current) return;
    // 触发 useEffect 重建：把 idx 同值 set 一遍 → 不行，需要其他方式
    // 简单做法：直接 cancel + 重新 quiz
    setStrokeIdx(0);
    setMistakes(0);
    setStartedAt(null);
    setElapsed(0);
    setResult(null);
    if (writerRef.current) {
      try {
        writerRef.current.cancelQuiz();
        writerRef.current.hideCharacter();
        writerRef.current.quiz({
          showHintAfterMisses: 2,
          onCorrectStroke: () => setStrokeIdx((s) => s + 1),
          onMistake: (info) => setMistakes(info.totalMistakes),
          onComplete: (info) => {
            void submitQuizResult(info.totalMistakes);
          },
        });
      } catch {
        // ignore
      }
    }
  };

  const onNext = () => {
    setIdx((i) => (i < cards.length - 1 ? i + 1 : 0));
  };

  if (err) {
    return (
      <div className="error-state">
        <div className="icon-plate">!</div>
        <div className="state-title">{gt("加载失败", lang)}</div>
        <p className="state-sub">{err}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">{gt("再试一次", lang)}</button>
      </div>
    );
  }
  if (cards.length === 0 || !current) {
    return <div className="skeleton h-60 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      {/* HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{gt("六艺 · 书 · 笔顺", lang)}</div>
            <div className="font-serif text-lg text-fg">{gt("按正确笔顺一笔一笔写", lang)}</div>
            <div className="mt-1 text-[10px] text-muted">
              {gt("「书」非仅识字 — 笔顺、起收、提按皆有法度", lang)}
            </div>
          </div>
          {progress && (
            <div className="flex gap-2 text-xs text-muted">
              <Stat label={gt("书艺", lang)} value={`${progress.liuyi_shu}`} numeric />
              <Stat label="" value={gt("第 {a}/{b} 关", lang).replace("{a}", String(idx + 1)).replace("{b}", String(cards.length))} />
            </div>
          )}
          <Link
            href="/journey/shu"
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
          >
            {gt("← 书艺", lang)}
          </Link>
        </div>
      </Reveal>

      {/* 主区：HanziWriter SVG */}
      <section className="space-y-4 rounded-2xl border border-line bg-[#fffbef] p-6">
        <div className="text-center">
          <span className="font-serif text-2xl text-fg">{current.char}</span>
          <span className="ms-2 text-xs text-muted">{current.pinyin}</span>
          <span className="ms-2 text-xs text-muted">· {gt("部件", lang)} {current.components}</span>
        </div>
        <div
          ref={wrapRef}
          className="mx-auto flex aspect-square items-center justify-center rounded-xl border-2 border-rose-300 bg-white"
          style={{ width: "min(480px, 100%)", touchAction: "none" }}
        />
        {/* 状态条 */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <Pill
            label={gt("笔画", lang)}
            value={totalStrokes > 0 ? `${strokeIdx} / ${totalStrokes}` : `${strokeIdx}`}
            color={strokeIdx === totalStrokes && totalStrokes > 0 ? "#10b981" : "#737373"}
          />
          <Pill
            label={gt("错笔", lang)}
            value={`${mistakes}`}
            color={mistakes === 0 ? "#10b981" : mistakes <= 2 ? "#f59e0b" : "#ef4444"}
          />
          <Pill label={gt("时长", lang)} value={`${Math.floor(elapsed / 1000)}s`} color="#737373" />
        </div>
        {/* 操作 */}
        <div className="flex flex-wrap justify-center gap-3">
          <TactileButton
            variant="ghost"
            onClick={playDemo}
            disabled={showingDemo}
          >
            {showingDemo ? gt("演示中…", lang) : gt("看一遍笔顺", lang)}
          </TactileButton>
          <TactileButton variant="cel" onClick={onRetry} disabled={showingDemo}>
            {gt("重写", lang)}
          </TactileButton>
          {result && (
            <TactileButton variant="accent" onClick={onNext}>
              {gt("下一字 →", lang)}
            </TactileButton>
          )}
        </div>
        <div className="text-center text-[10px] text-faint">
          {result ? gt("已完成 — 字源在下方", lang) : gt("提示：连错 2 笔会自动高亮正确位置", lang)}
        </div>
      </section>

      {/* 字源 + 评分（完成后显示） */}
      {result && (
        <Reveal as="section" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          {/* 评分大牌 */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/70 p-4">
            <div className="flex items-baseline gap-3">
              <span
                className="font-serif leading-none"
                style={{ fontSize: "3.5rem", color: gradeColor(result.grade) }}
              >
                <CountUp value={result.score} />
              </span>
              <span className="text-xs text-muted">/ 100</span>
              <span
                className="rounded-full px-3 py-1 text-sm text-white"
                style={{ background: gradeColor(result.grade) }}
              >
                {gt(result.grade, lang)}
              </span>
            </div>
            <div className="text-xs text-muted">
              {gt("共 {a} 笔 · 错 {b} 笔 · 用时 {c}s", lang)
                .replace("{a}", String(totalStrokes))
                .replace("{b}", String(mistakes))
                .replace("{c}", String(Math.floor(elapsed / 1000)))}
              <br />
              {gt("书艺 +{a} · xp +{b}", lang)
                .replace("{a}", String(result.she_delta))
                .replace("{b}", String(result.xp_delta))}
            </div>
          </div>

          <div className="rounded-lg bg-white/70 p-3">
            <div className="text-[10px] text-muted">
              {result.card.method_label} · {gt("本义", lang)}
            </div>
            <div className="mt-0.5 font-serif text-base text-fg">{result.card.benyi}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{result.card.story}</p>
          </div>
          {result.new_unlocked_refs.length > 0 && (
            <div className="mt-3 rounded-lg border border-gold bg-amber-50 p-3">
              <div className="mb-1 text-[10px] tracking-widest text-amber-700">
                {gt("新解锁经典", lang)}
              </div>
              {result.new_unlocked_refs.map((r: ShuRefBrief) => (
                <div key={r.ref_id} className="mt-1 border-s-2 border-amber-500 ps-2 text-sm text-amber-900">
                  <div className="text-[10px] opacity-70">{r.ref_label}</div>
                  <div className="font-serif">{r.text}</div>
                </div>
              ))}
            </div>
          )}
          <ProvenanceCaption
            className="mt-3"
            items={[
              { label: gt("艺", lang), value: gt("书 · 笔顺", lang) },
              { label: gt("字", lang), value: current.char },
              { label: gt("品", lang), value: gt(result.grade, lang) },
            ]}
          />
        </Reveal>
      )}
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

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span
      className="rounded-full px-3 py-1"
      style={{ background: `${color}1a`, color }}
    >
      {label}：{value}
    </span>
  );
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "神品": return "#b45309";
    case "妙品": return "#0F6E56";
    case "能品": return "#1E5F8E";
    case "可观": return "#534AB7";
    default:     return "#737373";
  }
}

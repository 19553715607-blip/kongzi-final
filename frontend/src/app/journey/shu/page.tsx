"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  answerShuCard,
  getShuProgress,
  getShuToday,
} from "@/lib/api";
import type {
  ShuAnswerResp,
  ShuCardBrief,
  ShuProgressResp,
  ShuTodayResp,
} from "@/lib/types";
import { useLang, getLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";

const METHOD_COLOR: Record<string, string> = {
  xiangxing: "#854F0B",
  zhishi: "#0F6E56",
  huiyi: "#534AB7",
  xingsheng: "#1E5F8E",
  zhuanzhu: "#7A3A2E",
  jiajie: "#5A5A5A",
};
const CAT_COLOR: Record<string, string> = {
  wuchang: "#993C1D",
  lunli: "#0F6E56",
  xiushen: "#534AB7",
  zhixue: "#1E5F8E",
  zhexue: "#854F0B",
};

export default function ShuJourneyPage() {
  const [lang] = useLang();
  const [today, setToday] = useState<ShuTodayResp | null>(null);
  const [progress, setProgress] = useState<ShuProgressResp | null>(null);
  // 每张卡的答题结果（卡 id → resp）
  const [results, setResults] = useState<Record<number, ShuAnswerResp>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = () => {
    getShuToday().then(setToday).catch(() => setErr(gt("无法连接后端 — 请先登录", getLang())));
    getShuProgress().then(setProgress).catch(() => {});
  };
  useEffect(load, []);

  const onAnswer = async (card: ShuCardBrief, optionKey: string) => {
    if (busy === card.id || results[card.id]) return;
    setBusy(card.id);
    try {
      const r = await answerShuCard(card.id, optionKey);
      setResults((prev) => ({ ...prev, [card.id]: r }));
      // 异步刷新 progress
      getShuProgress().then(setProgress).catch(() => {});
    } catch {
      setErr(gt("提交失败 — 网络异常", getLang()));
    } finally {
      setBusy(null);
    }
  };

  if (err) {
    return (
      <div className="error-state">
        <div className="icon-plate">!</div>
        <div className="state-title">{gt("加载失败", lang)}</div>
        <p className="state-sub">{err}</p>
        <Link href="/login" className="retry-btn">{gt("去登录 →", lang)}</Link>
      </div>
    );
  }
  if (!today || !progress) {
    return <div className="skeleton h-60 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{gt("六艺 · 书", lang)}</div>
            <div className="font-serif text-xl text-fg">{gt("识字明义 · 字源图鉴", lang)}</div>
            <div className="mt-1 text-xs text-muted">
              {gt("「书以广其义」 — 每个汉字都藏着一个本义", lang)}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <Stat label={gt("称号", lang)} value={progress.title} />
            <Stat label={gt("书艺", lang)} value={`${progress.liuyi_shu}`} numeric />
            <Stat label={gt("已学", lang)} value={`${progress.correct_cards} / ${progress.total_cards}`} />
            <Stat label={gt("正确率", lang)} value={`${Math.round(progress.correct_rate * 100)}%`} />
          </div>
          <Link
            href="/journey"
            className="route-link"
          >
            {gt("← 六艺", lang)}
          </Link>
        </div>
        {/* 五类覆盖率 */}
        <div className="mt-3 grid grid-cols-5 gap-2">
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

      {/* 三个游戏入口 */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/journey/shu/assemble"
          className="card-hover group rounded-2xl border-2 border-accent bg-accent-soft p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-widest text-accent">{gt("游戏 · 1", lang)}</div>
              <div className="mt-1 font-serif text-xl text-accent-ink">{gt("拼字游戏 →", lang)}</div>
              <p className="mt-2 text-xs text-muted">
                {gt("从部件拼出汉字。「亻 + 二 = 仁」", lang)}
                <br/>
                {gt("理解汉字的造字结构，对了 +书艺 3-9。", lang)}
              </p>
            </div>
            <div className="font-serif text-5xl text-accent-ink opacity-50 group-hover:opacity-90">仁</div>
          </div>
        </Link>
        <Link
          href="/journey/shu/write"
          className="card-hover group rounded-2xl border-2 border-rose-400 bg-rose-50 p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-widest text-rose-600">{gt("游戏 · 2", lang)}</div>
              <div className="mt-1 font-serif text-xl text-rose-900">{gt("描红写字 →", lang)}</div>
              <p className="mt-2 text-xs text-muted">
                {gt("在灰色字上摹写。Canvas + 米字格。", lang)}
                <br/>
                {gt("体验「书」的动作，写过 +书艺 2。", lang)}
              </p>
            </div>
            <div className="font-serif text-5xl text-rose-900 opacity-50 group-hover:opacity-90">书</div>
          </div>
        </Link>
        <Link
          href="/journey/shu/brush3d"
          className="card-hover group rounded-2xl border-2 border-amber-600 bg-amber-50 p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-widest text-amber-700">{gt("游戏 · 3", lang)}</div>
              <div className="mt-1 font-serif text-xl text-amber-900">{gt("竹简挥毫 →", lang)}</div>
              <p className="mt-2 text-xs text-muted">
                {gt("在书案上执笔写大字。提按转折，墨入竹简。", lang)}
                <br/>
                {gt("3D 书斋描红，交卷定品第。", lang)}
              </p>
            </div>
            <div className="font-serif text-5xl text-amber-900 opacity-50 group-hover:opacity-90">筆</div>
          </div>
        </Link>
      </section>

      {/* 今日 3 张卡 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-fg">
            {gt("今日字卡", lang)} · {today.today_done_count} / {today.daily_limit}
          </div>
          <span className="text-[10px] text-faint">{gt("每张答对 +书艺2~6 +xp4，错亦得 xp1", lang)}</span>
        </div>
        {today.cards.length === 0 ? (
          <div className="empty-state">
            <div className="icon-plate">✦</div>
            <div className="state-title">{gt("已学完今日字卡", lang)}</div>
            <p className="state-sub">
              {gt("没有可学的字了 — 你已学完全部 {n} 字 🎉", lang).replace("{n}", String(progress.total_cards))}
            </p>
          </div>
        ) : (
          today.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              busy={busy === card.id}
              result={results[card.id] ?? null}
              onAnswer={onAnswer}
            />
          ))
        )}
      </section>

      {/* 字典 — 已学过的字 */}
      {progress.learned_chars.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">
            {gt("已学字典", lang)} · {progress.learned_chars.length}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {progress.learned_chars.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-lg border border-line bg-surface-2/40 p-2 text-center hover:bg-accent-soft"
                title={`${c.pinyin} · ${c.benyi}`}
              >
                <div className="font-serif text-2xl text-fg">{c.char}</div>
                <div className="text-[9px] text-faint">{c.pinyin}</div>
                <div className="text-[9px]" style={{ color: CAT_COLOR[c.category] }}>{c.category_label}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
function CardItem({
  card, busy, result, onAnswer,
}: {
  card: ShuCardBrief;
  busy: boolean;
  result: ShuAnswerResp | null;
  onAnswer: (c: ShuCardBrief, k: string) => void;
}) {
  const [lang] = useLang();
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      {/* 卡头：大字 + 拼音 + 部件 + 难度 */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col items-center justify-center rounded-xl bg-accent-soft px-6 py-4 min-w-[110px]">
          <div className="font-serif text-7xl leading-none text-accent-ink">{card.char}</div>
          <div className="mt-1 text-xs text-accent">{card.pinyin}</div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] text-white"
              style={{ background: CAT_COLOR[card.category] || "#555" }}
            >
              {card.category_label}
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] text-muted">
              {gt("难度", lang)} {"★".repeat(card.difficulty)}
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] text-muted">
              {gt("部件：", lang)}{card.components}
            </span>
          </div>
          <div className="font-serif text-base text-fg">
            {gt("「{c}」的本义是？", lang).replace("{c}", card.char)}
          </div>
          {!result && (
            <div className="text-[10px] text-faint">{gt("选完即展开字源故事与经典出处", lang)}</div>
          )}
        </div>
      </div>

      {/* 4 选项 */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {card.options.map((o) => {
          const isSelected = result?.chosen_key === o.key;
          const isAnswer = result?.card.answer_key === o.key;
          const showResult = !!result;
          let cls = "border border-line bg-surface-2/50 text-fg hover:bg-surface-2";
          if (showResult) {
            if (isAnswer) cls = "border-emerald-500 bg-emerald-50 text-emerald-900";
            else if (isSelected) cls = "border-rose-500 bg-rose-50 text-rose-900";
            else cls = "border-line bg-surface-2/30 text-faint";
          }
          return (
            <Pressable
              key={o.key}
              disabled={busy || !!result}
              onClick={() => onAnswer(card, o.key)}
              className={`rounded-lg p-3 text-left text-sm transition-all ${cls}`}
            >
              <span className="me-2 inline-block font-mono text-xs opacity-60">{o.key}</span>
              {o.text}
              {showResult && isAnswer && <span className="ms-2 text-[10px]">{gt("✓ 正解", lang)}</span>}
              {showResult && isSelected && !isAnswer && <span className="ms-2 text-[10px]">{gt("✗ 你选的", lang)}</span>}
            </Pressable>
          );
        })}
      </div>

      {/* 结果展开 */}
      {result && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {/* 结果横幅 */}
          <div
            className={`rounded-lg p-3 text-sm ${
              result.correct
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-amber-50 text-amber-900 border border-amber-200"
            }`}
          >
            {result.correct
              ? gt("✓ 答对 — 书艺 +{a}，xp +4", lang).replace("{a}", String(result.progress.liuyi_shu - (result.progress.liuyi_shu - card.difficulty * 2)))
              : gt("× 不要紧，「书以广其义」— 慢慢学", lang)}
          </div>

          {/* 字源故事 */}
          <div className="rounded-lg border border-line bg-surface-2/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-[10px]">
              <span
                className="rounded-full px-2 py-0.5 text-white"
                style={{ background: METHOD_COLOR[result.card.method] || "#555" }}
              >
                {result.card.method_label}
              </span>
              <span className="text-faint">{gt("本义", lang)}</span>
              <span className="font-medium text-fg">{result.card.benyi}</span>
            </div>
            <div className="mt-1 text-sm leading-relaxed text-muted">{result.card.story}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
              <span className="rounded bg-cel-soft px-1.5 py-0.5 text-cel-ink">{gt("今义：", lang)}{result.card.jinyi}</span>
            </div>
          </div>

          {/* 解锁经典 */}
          {result.new_unlocked_refs.length > 0 && (
            <div className="rounded-lg border border-gold bg-amber-50 p-3">
              <div className="mb-1 text-[10px] tracking-widest text-amber-700">{gt("🎖 新解锁经典", lang)}</div>
              {result.new_unlocked_refs.map((r) => (
                <div key={r.ref_id} className="mt-1 border-s-2 border-amber-500 ps-2 text-sm text-amber-900">
                  <div className="text-[10px] opacity-70">{r.ref_label}</div>
                  <div className="font-serif">{r.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* 已关联经典（含已解锁过的） */}
          {result.card.refs.length > 0 && result.new_unlocked_refs.length === 0 && (
            <div className="rounded-lg border border-line bg-surface-2/20 p-3">
              <div className="mb-1 text-[10px] tracking-widest text-faint">{gt("关联经典出处", lang)}</div>
              {result.card.refs.map((r) => (
                <div key={r.ref_id} className="mt-1 text-xs">
                  <span className="text-faint">{r.ref_label}：</span>
                  <span className="font-serif text-fg">{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
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

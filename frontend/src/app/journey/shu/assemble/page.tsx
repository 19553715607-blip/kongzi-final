"use client";

/**
 * 拼字游戏 — 2D 拆字拼字
 * 流程：选字 → 从部件库点选填空槽 → 全对触发成字 + 解锁经典
 * 触屏友好：点击式选择（不是 drag-and-drop，移动端更稳）
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  assembleShuCard,
  getShuProgress,
  getShuToday,
} from "@/lib/api";
import type {
  ShuAssembleResp,
  ShuCardBrief,
  ShuProgressResp,
  ShuRefBrief,
} from "@/lib/types";
import { t, useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";

// 公共部件池 — 用于干扰部件抽取
// i18n-scan-ignore-start —— 这些是汉字部件（拼字游戏素材），本身不可翻译
const PUBLIC_PARTS = [
  "亻", "二", "三", "人", "口", "心", "讠", "土", "禾", "羊",
  "我", "首", "辶", "彳", "直", "示", "豊", "矢", "知", "日",
  "目", "少", "甬", "力", "门", "囟", "尹", "又", "羽", "白",
  "苟", "攴", "言", "成", "中", "和", "生", "命", "令", "性",
  "门", "天", "大", "一", "聖", "壬", "耳", "学", "子",
];
// i18n-scan-ignore-end

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: string[], n: number): string[] {
  const taken = new Set(correct);
  const pool = PUBLIC_PARTS.filter((p) => !taken.has(p));
  return shuffle(pool).slice(0, n);
}

function parseComponents(components: string): string[] {
  // "亻+二" → ["亻", "二"]； "繁：學，从子从冖从爻从臼" → 提取「，」后部分用「从」拆
  // MVP：只用 + 分隔；若没有 +，作为单部件
  const plus = components.split("+").map((p) => p.trim()).filter(Boolean);
  if (plus.length >= 2) return plus;
  return [components.split(",").pop()?.trim() || components.trim()];
}

export default function ShuAssemblePage() {
  const [lang] = useLang();
  const [cards, setCards] = useState<ShuCardBrief[]>([]);
  const [progress, setProgress] = useState<ShuProgressResp | null>(null);
  const [idx, setIdx] = useState(0);                    // 当前第几张卡
  const [slots, setSlots] = useState<(string | null)[]>([]);  // 槽位状态
  const [pool, setPool] = useState<string[]>([]);       // 当前部件池
  const [result, setResult] = useState<ShuAssembleResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 启动：拉今日卡
  useEffect(() => {
    getShuToday().then((d) => setCards(d.cards)).catch(() => setErr(t("jrn.noBank", lang)));
    getShuProgress().then(setProgress).catch(() => {});
  }, []);

  const current = cards[idx];
  const correctParts = useMemo(
    () => (current ? parseComponents(current.components) : []),
    [current],
  );

  // 切换卡时重置局面
  useEffect(() => {
    if (!current) return;
    setSlots(Array(correctParts.length).fill(null));
    setPool(shuffle([...correctParts, ...pickDistractors(correctParts, 4)]));
    setResult(null);
  }, [current, correctParts]);

  // 部件填空：找第一个空槽
  const onPickPart = (part: string) => {
    if (result) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx < 0) return;
    setSlots((prev) => {
      const next = [...prev];
      next[emptyIdx] = part;
      return next;
    });
    setPool((prev) => prev.filter((p) => p !== part));
  };

  // 移除一个已填部件 → 放回池
  const onUnpickSlot = (slotIdx: number) => {
    if (result) return;
    const part = slots[slotIdx];
    if (!part) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setPool((prev) => [...prev, part]);
  };

  const allFilled = slots.length > 0 && slots.every((s) => s !== null);

  const onSubmit = async () => {
    if (!current || busy || !allFilled) return;
    setBusy(true);
    try {
      const r = await assembleShuCard(current.id, slots as string[]);
      setResult(r);
      getShuProgress().then(setProgress).catch(() => {});
    } catch {
      setErr(t("jrn.submitFail", lang));
    } finally {
      setBusy(false);
    }
  };

  const onRetry = () => {
    // 重置当前卡（不切换）
    setSlots(Array(correctParts.length).fill(null));
    setPool(shuffle([...correctParts, ...pickDistractors(correctParts, 4)]));
    setResult(null);
  };

  const onNext = () => {
    if (idx < cards.length - 1) setIdx(idx + 1);
    else setIdx(0);  // 循环
  };

  if (err) {
    return (
      <div className="error-state">
        <div className="icon-plate">!</div>
        <div className="state-title">{gt("加载失败", lang)}</div>
        <p className="state-sub">{err}</p>
        <Link href="/login" className="retry-btn">{gt("去登录", lang)}</Link>
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
            <div className="text-xs tracking-widest text-accent">{t("jrn.shu.assemble.kicker", lang)}</div>
            <div className="font-serif text-lg text-fg">{t("jrn.shu.assemble.title", lang)}</div>
            <div className="mt-1 text-[10px] text-muted">
              {t("jrn.shu.assemble.subtitle", lang)}
            </div>
          </div>
          {progress && (
            <div className="flex gap-2 text-xs text-muted">
              <Stat label={t("jrn.shu", lang)} value={`${progress.liuyi_shu}`} />
              <Stat label={t("jrn.learned", lang)} value={`${progress.correct_cards}/${progress.total_cards}`} />
              <Stat
                label=""
                value={t("jrn.levelN", lang)
                  .replace("{a}", String(idx + 1))
                  .replace("{b}", String(cards.length))}
              />
            </div>
          )}
          <Link
            href="/journey/shu"
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
          >
            {t("jrn.backToShu", lang)}
          </Link>
        </div>
      </Reveal>

      {/* 主关卡区 */}
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
        {/* 顶部：目标字（虚框） + 提示 */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent-soft px-8 py-4 min-w-[120px]">
            <div
              className="font-serif text-7xl leading-none text-accent-ink"
              style={{ opacity: result?.correct ? 1 : 0.15 }}
            >
              {current.char}
            </div>
            <div className="mt-1 text-xs text-accent">{current.pinyin}</div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-[10px] text-faint">{t("jrn.hintOrigin", lang)}</div>
            <div className="font-serif text-sm text-fg">
              {result ? result.card.benyi : t("jrn.revealAfter", lang)}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                {gt("结构提示：{a}（{b} 个部件）", lang)
                  .replace("{a}", current.components)
                  .replace("{b}", String(correctParts.length))}
              </span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                {gt("类：", lang)}{current.category_label}
              </span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                {gt("难度", lang)} {"★".repeat(current.difficulty)}
              </span>
            </div>
          </div>
        </div>

        {/* 中部：组装区 */}
        <div className="flex flex-wrap items-center justify-center gap-3 py-4">
          {slots.map((part, i) => (
            <Pressable
              key={i}
              onClick={() => onUnpickSlot(i)}
              disabled={!!result}
              className={`flex h-20 w-20 items-center justify-center rounded-xl border-2 text-3xl font-serif sm:h-24 sm:w-24 sm:text-4xl ${
                part
                  ? result?.correct
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : result && !result.correct
                    ? "border-rose-500 bg-rose-50 text-rose-900"
                    : "border-accent bg-accent-soft text-accent-ink hover:bg-amber-50"
                  : "border-dashed border-line bg-surface-2/40 text-faint"
              }`}
            >
              {part || "?"}
            </Pressable>
          ))}
          {/* 等号 + 目标轮廓 */}
          <span className="text-2xl text-muted">=</span>
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-line bg-surface-2/30 font-serif text-4xl sm:h-24 sm:w-24 sm:text-5xl">
            {result?.correct ? (
              <span className="text-emerald-700">{current.char}</span>
            ) : (
              <span className="text-faint opacity-30">{current.char}</span>
            )}
          </div>
        </div>

        {/* 底部：部件库 */}
        {!result && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted">{t("jrn.assembleHint", lang)}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {pool.map((part, i) => (
                <Pressable
                  key={`${part}-${i}`}
                  onClick={() => onPickPart(part)}
                  className="card-hover flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface-2 text-2xl font-serif text-fg shadow-sm"
                >
                  {part}
                </Pressable>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {!result && (
            <TactileButton
              variant="accent"
              disabled={!allFilled || busy}
              onClick={onSubmit}
            >
              {t("jrn.submit", lang)}
            </TactileButton>
          )}
          {result && (
            <>
              {!result.correct && (
                <TactileButton variant="cel" onClick={onRetry}>
                  {t("jrn.retryChar", lang)}
                </TactileButton>
              )}
              <TactileButton variant="accent" onClick={onNext}>
                {t("jrn.nextChar", lang)}
              </TactileButton>
            </>
          )}
        </div>
      </section>

      {/* 字源展开 */}
      {result && (
        <Reveal
          as="section"
          className={`rounded-2xl border p-5 ${
            result.correct
              ? "border-emerald-300 bg-emerald-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div
            className={`mb-2 text-sm font-medium ${
              result.correct ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {result.correct
              ? t("jrn.assembleOk", lang).replace(
                  "{a}",
                  String(result.progress.liuyi_shu - (progress?.liuyi_shu ?? 0)),
                )
              : t("jrn.assembleBad", lang).replace(
                  "{a}",
                  result.correct_parts.join(" + "),
                )}
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
                {t("jrn.newUnlock", lang)}
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
              { label: gt("艺", lang), value: t("jrn.shu", lang) },
              { label: gt("字", lang), value: current.char },
              { label: gt("类", lang), value: current.category_label },
            ]}
          />
        </Reveal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1">
      <div className="text-[10px] text-faint">{label}</div>
      <div className="font-serif text-sm text-fg">
        {/^\d+$/.test(value) ? <CountUp value={parseInt(value, 10)} /> : value}
      </div>
    </div>
  );
}

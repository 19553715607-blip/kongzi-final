"use client";

import { useEffect, useState } from "react";
import {
  checkin,
  completeTask,
  getGamifyProfile,
  getJourneyLeaderboard,
  getJourneyOverview,
} from "@/lib/api";
import type {
  Badge,
  GamifyProfile,
  JourneyArtBrief,
  JourneyBadge,
  JourneyLeaderboardResp,
  JourneyOverviewResp,
} from "@/lib/types";
import { t, useLang } from "@/lib/i18n";
import { CountUp, Reveal } from "@/lib/motion";
import { GamePath, HudAssets } from "@/components/museum";

const BADGE_TIER_COLOR: Record<string, string> = {
  normal: "#9CA3AF",
  gold: "#D4A017",
  treasure: "#B45309",
};
const BADGE_TIER_BG: Record<string, string> = {
  normal: "#F3F4F6",
  gold: "#FEF3C7",
  treasure: "#FED7AA",
};

export default function JourneyPage() {
  const [lang] = useLang();
  const [p, setP] = useState<GamifyProfile | null>(null);
  const [ov, setOv] = useState<JourneyOverviewResp | null>(null);
  const [lb, setLb] = useState<JourneyLeaderboardResp | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    getGamifyProfile().then(setP).catch(() => setErr(t("jrn.noBackend", lang)));
    getJourneyOverview(lang).then(setOv).catch(() => {});
    getJourneyLeaderboard(10).then(setLb).catch(() => {});
  };
  useEffect(load, []);

  const showAwards = (ids?: string[], badges?: Badge[]) => {
    if (!ids?.length || !badges) return;
    const names = ids
      .map((id) => badges.find((b) => b.id === id)?.name)
      .filter(Boolean) as string[];
    if (names.length) {
      setToast(names);
      setTimeout(() => setToast([]), 3200);
    }
  };

  const doCheckin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await checkin();
      setP(r);
      showAwards(r.awarded_badges, r.badges);
      getJourneyOverview(lang).then(setOv).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const doTask = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await completeTask(id);
      setP(r);
      showAwards(r.awarded_badges, r.badges);
      getJourneyOverview(lang).then(setOv).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  if (err)
    return (
      <div className="error-state">
        <span className="icon-plate">!</span>
        <span className="state-title">{t("state.error.title", lang)}</span>
        <span className="state-sub">{err}</span>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          {t("state.retry", lang)}
        </button>
      </div>
    );
  if (!p)
    return (
      <div className="space-y-4">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
    );

  const doneTasks = p.tasks.filter((x) => x.done).length;
  const goalPct = p.tasks.length ? Math.round((doneTasks / p.tasks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* HUD 资产：连续研读 / 经验 / 今日目标 */}
      <HudAssets
        streak={p.streak_days}
        xp={p.level.xp}
        goalPct={goalPct}
        goalLabel={t("jrn.goal", lang).replace("{a}", String(doneTasks)).replace("{b}", String(p.tasks.length))}
      />

      {/* 解锁提示 */}
      {toast.length > 0 && (
        <div className="rounded-xl border border-gold bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          🎖 {t("jrn.medalToast", lang).replace("{list}", toast.join(lang === "zh" ? "、" : lang === "ar" ? "، " : ", "))}
        </div>
      )}

      {/* 段位卡 + 打卡 */}
      <Reveal className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-end gap-2">
            <span className="font-serif text-3xl font-medium text-fg">{p.level.name}</span>
            <span className="mb-1 text-xs text-faint">lv · {p.level.xp} XP</span>
            {ov && (
              <span className="mb-1 ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent-ink">
                {t("jrn.liuyiTitle", lang).replace("{t}", ov.title)}
              </span>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.round(p.level.progress * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-faint">
            {p.level.next_name
              ? t("jrn.xpToNext", lang)
                  .replace("{name}", p.level.next_name)
                  .replace("{n}", String((p.level.next_at ?? 0) - p.level.xp))
              : t("jrn.maxRank", lang)}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-5">
          <div className="text-3xl">🔥</div>
          <CountUp value={p.streak_days} className="font-serif text-2xl font-medium text-fg" />
          <div className="mb-2 text-xs text-faint">{t("jrn.streak", lang)}</div>
          <button
            onClick={doCheckin}
            disabled={busy || p.checked_in_today}
            className={`rounded-full px-4 py-1.5 text-sm ${
              p.checked_in_today
                ? "bg-surface-2 text-faint"
                : "bg-accent text-white hover:opacity-90"
            }`}
          >
            {p.checked_in_today ? t("jrn.checkedToday", lang) : t("jrn.checkin", lang)}
          </button>
        </div>
      </Reveal>

      {/* 君子之路总览：六艺总分 + 6 张艺卡（带进度条+入口） */}
      {ov && (
        <Reveal delay={100} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-fg">{t("jrn.overview", lang)}</div>
              <div className="mt-0.5 text-xs text-muted">
                {t("jrn.totalScore", lang)} <CountUp value={ov.total_score} className="font-serif text-lg text-accent" />
                <span className="text-faint"> / 600</span>
                <span className="ml-2 text-faint">·</span>
                <span className="ml-2">{t("jrn.maxMin", lang).replace("{a}", String(ov.max_art)).replace("{b}", String(ov.min_art))}</span>
              </div>
            </div>
            <div className="text-[10px] text-faint">
              {t("jrn.medals", lang).replace("{a}", String(ov.badges_unlocked)).replace("{b}", String(ov.badges_total))}
            </div>
          </div>

          <GamePath nodes={buildPathNodes(ov.arts)} />
        </Reveal>
      )}

      {/* 今日修行 */}
      <Reveal delay={160} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-medium text-fg">{t("jrn.today", lang)}</div>
        <div className="space-y-2">
          {p.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-3"
            >
              <div className="flex-1">
                <div className={`text-sm ${task.done ? "text-faint line-through" : "text-fg"}`}>
                  {task.title}
                </div>
                <div className="text-xs text-faint">{task.hint} · +{task.xp} XP</div>
              </div>
              <button
                onClick={() => doTask(task.id)}
                disabled={busy || task.done}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  task.done ? "bg-cel-soft text-cel-ink" : "bg-accent text-white"
                }`}
              >
                {task.done ? t("jrn.done", lang) : t("jrn.todo", lang)}
              </button>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 君子勋章墙 */}
      {ov && (
        <Reveal delay={200} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">
            {t("jrn.junziMedals", lang).replace("{a}", String(ov.badges_unlocked)).replace("{b}", String(ov.badges_total))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ov.badges.map((b) => (
              <BadgeCell key={b.key} b={b} />
            ))}
          </div>
          <p className="mt-3 text-[10px] text-faint">
            {t("jrn.grandHint", lang)}
          </p>
        </Reveal>
      )}

      {/* 群体排行榜 */}
      {lb && lb.items.length > 0 && (
        <Reveal delay={240} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-fg">{t("jrn.leaderboard", lang)}</div>
            <div className="text-[10px] text-faint">
              {t("jrn.totalPlayers", lang).replace("{n}", String(lb.total_players))}
              {lb.self && lb.self.rank > 10 && (
                <span className="ml-2 text-accent">
                  {t("jrn.youRank", lang).replace("{n}", String(lb.self.rank))}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            {lb.items.map((row) => (
              <LeaderRow key={row.user_id} row={row} />
            ))}
            {/* 自己不在 Top 10 时单独显示 */}
            {lb.self && lb.self.rank > 10 && (
              <>
                <div className="text-center text-[10px] text-faint">···</div>
                <LeaderRow row={lb.self} />
              </>
            )}
          </div>
        </Reveal>
      )}

      {/* 旧 GamifyProfile 勋章（保留作系统勋章，但放底部） */}
      {p.badges.length > 0 && (
        <Reveal delay={280} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">
            {t("jrn.systemMedals", lang).replace("{a}", String(p.badges.filter((b) => b.unlocked).length)).replace("{b}", String(p.badges.length))}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {p.badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border p-2 text-center ${
                  b.unlocked ? "border-gold bg-accent-soft" : "border-line bg-surface-2/40"
                }`}
              >
                <div
                  className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full text-base"
                  style={{
                    background: b.unlocked ? "#F4C430" : "var(--line)",
                    filter: b.unlocked ? "none" : "grayscale(1)",
                    opacity: b.unlocked ? 1 : 0.5,
                  }}
                >
                  {b.unlocked ? "🏅" : "🔒"}
                </div>
                <div className={`text-[11px] ${b.unlocked ? "text-accent-ink" : "text-faint"}`}>
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

// ─── 六艺路径节点（礼乐射御书数）─────────────────────────────
const ART_ORDER: { key: string; glyph: string }[] = [
  { key: "li", glyph: "礼" },
  { key: "yue", glyph: "乐" },
  { key: "she", glyph: "射" },
  { key: "yu", glyph: "御" },
  { key: "shu", glyph: "书" },
  { key: "shu2", glyph: "数" },
];

function buildPathNodes(arts: JourneyArtBrief[]) {
  const ordered = ART_ORDER.map((o) => arts.find((a) => a.key === o.key)).filter(
    (a): a is JourneyArtBrief => !!a,
  );
  const curIdx = ordered.findIndex((a) => a.score < 60);
  return ordered.map((a) => {
    const glyph = ART_ORDER.find((o) => o.key === a.key)?.glyph ?? a.label;
    const state: "done" | "cur" | "lock" =
      a.score >= 60 ? "done" : a.score > 0 ? "cur" : "lock";
    return { label: glyph, state, href: a.path };
  });
}

// ─── 勋章 ───────────────────────────────────────────────────
function BadgeCell({ b }: { b: JourneyBadge }) {
  const color = BADGE_TIER_COLOR[b.tier] || "#9CA3AF";
  const bg = BADGE_TIER_BG[b.tier] || "#F3F4F6";
  return (
    <div
      className={`rounded-xl border-2 p-3 text-center transition-all ${
        b.unlocked ? "" : "opacity-50"
      }`}
      style={{
        borderColor: b.unlocked ? color : "var(--line)",
        background: b.unlocked ? bg : "transparent",
      }}
      title={b.desc}
    >
      <div
        className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full text-xl"
        style={{
          background: b.unlocked ? color : "var(--surface-2)",
          color: "#fff",
          filter: b.unlocked ? "none" : "grayscale(1)",
        }}
      >
        {b.unlocked ? (b.tier === "treasure" ? "💎" : b.tier === "gold" ? "🏆" : "🏅") : "🔒"}
      </div>
      <div
        className={`text-sm font-medium ${b.unlocked ? "" : "text-faint"}`}
        style={{ color: b.unlocked ? color : undefined }}
      >
        {b.name}
      </div>
      <div className="text-[10px] text-faint">{b.desc}</div>
    </div>
  );
}

// ─── 排行行 ─────────────────────────────────────────────────
function LeaderRow({ row }: { row: { rank: number; name: string; total: number; by_art: Record<string, number>; is_self: boolean } }) {
  const [lang] = useLang();
  const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `${row.rank}`;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        row.is_self ? "border border-accent bg-accent-soft" : "bg-surface-2/40"
      }`}
    >
      <div className="w-7 text-center font-serif text-sm" style={{ color: row.is_self ? "var(--accent)" : undefined }}>
        {medal}
      </div>
      <div className="flex-1">
        <div className={`text-sm ${row.is_self ? "font-medium text-accent-ink" : "text-fg"}`}>
          {row.name}{row.is_self && t("jrn.you", lang)}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1 text-[9px] text-muted">
          {[
            { k: "li", key: "jrn.art.li" },
            { k: "yue", key: "jrn.art.yue" },
            { k: "she", key: "jrn.art.she" },
            { k: "yu", key: "jrn.art.yu" },
            { k: "shu", key: "jrn.art.shu" },
            { k: "shu2", key: "jrn.art.shu2" },
          ].map(({ k, key }) => {
            const v = row.by_art[k] ?? 0;
            const lbl = t(key, lang);
            return (
              <span
                key={k}
                className="rounded bg-white/70 px-1 py-0.5"
                style={{ opacity: v > 0 ? 1 : 0.4 }}
              >
                {lbl} {v}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-right">
        <div className="font-serif text-lg text-fg">{row.total}</div>
        <div className="text-[9px] text-faint">/ 600</div>
      </div>
    </div>
  );
}

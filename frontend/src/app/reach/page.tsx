"use client";

import { useEffect, useState } from "react";
import { getReachStats } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal, CountUp } from "@/lib/motion";
import type { ReachStats } from "@/lib/types";

export default function ReachPage() {
  const [lang] = useLang();
  const [s, setS] = useState<ReachStats | null>(null);

  useEffect(() => {
    getReachStats().then(setS).catch(() => {});
  }, []);

  if (!s)
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    );

  const pct = (n: number, target: number) =>
    Math.min(100, (n / target) * 100);

  return (
    <div className="space-y-4">
      <Reveal as="section" delay={0} className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2.5">
          <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
            {t("brand.short", lang)}
          </span>
          <span className="text-xs tracking-[0.25em] text-accent">{t("reach.kicker", lang)}</span>
        </div>
        <h1 className="mt-2 font-serif text-xl leading-snug text-fg">
          {t("reach.target", lang)}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {t("reach.note", lang)}
        </p>
        <div className="ornament-rule mt-3">
          <span className="h-1 w-1 rounded-full bg-accent/60" />
        </div>
      </Reveal>

      {/* 主指标 */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Reveal delay={80}>
          <Goal
            label={t("reach.uvTitle", lang)}
            value={s.uv}
            target={s.targets.users_5w}
            targetLabel={t("reach.uvGoal", lang)}
            recent={t("reach.uv30", lang).replace("{n}", s.uv_30d.toLocaleString())}
          />
        </Reveal>
        <Reveal delay={140}>
          <Goal
            label={t("reach.pvTitle", lang)}
            value={s.pv}
            target={s.targets.reach_50w}
            targetLabel={t("reach.pvGoal", lang)}
            recent={t("reach.pvToday", lang)
              .replace("{a}", String(s.pv_today))
              .replace("{b}", s.pv_7d.toLocaleString())}
          />
        </Reveal>
        <Reveal delay={200}>
          <Goal
            label={t("reach.overseasPvTitle", lang)}
            value={s.overseas_pv}
            target={s.targets.reach_50w}
            targetLabel={t("reach.overseasGoal", lang)}
            recent={t("reach.overseasUv", lang)
              .replace("{a}", String(s.overseas_uv))
              .replace(
                "{b}",
                s.pv ? ((s.overseas_pv / s.pv) * 100).toFixed(1) : "0",
              )}
          />
        </Reveal>
      </section>

      {/* 分布 */}
      <section className="grid gap-3 md:grid-cols-2">
        <Reveal delay={240} className="h-full">
          <Distribution title={t("reach.terminal", lang)} rows={s.by_device} />
        </Reveal>
        <Reveal delay={280} className="h-full">
          <Distribution title={t("reach.source", lang)} rows={s.by_source} />
        </Reveal>
        <Reveal delay={320} className="h-full">
          <Distribution
            title={t("reach.country", lang)}
            rows={s.by_country.map((c) => ({ k: `${c.name} (${c.k})`, v: c.v }))}
          />
        </Reveal>
        <Reveal delay={360} className="h-full">
          <Distribution
            title={t("reach.campus", lang)}
            rows={
              s.by_campus.length
                ? s.by_campus
                : [{ k: t("reach.campusEmpty", lang), v: 0 }]
            }
          />
        </Reveal>
        <Reveal delay={400} className="h-full md:col-span-2">
          <Distribution title={t("reach.hotPaths", lang)} rows={s.by_path} />
        </Reveal>
      </section>
    </div>
  );

  function Goal({
    label,
    value,
    target,
    targetLabel,
    recent,
  }: {
    label: string;
    value: number;
    target: number;
    targetLabel: string;
    recent: string;
  }) {
    return (
      <div className="card-hover h-full rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-end gap-4">
          <div>
            <CountUp value={value} className="font-serif text-3xl font-medium leading-none text-fg" />
            <div className="mt-1 text-xs text-faint">{label}</div>
          </div>
          <div className="ms-auto text-end text-xs text-faint">
            {t("reach.goalPrefix", lang)} <CountUp value={target} /> · {targetLabel}
            <br />
            {recent}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct(value, target)}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-faint">
          {pct(value, target).toFixed(3)}%
        </div>
      </div>
    );
  }

  function Distribution({
    title,
    rows,
  }: {
    title: string;
    rows: { k: string; v: number }[];
  }) {
    const max = Math.max(...rows.map((r) => r.v), 1);
    return (
      <div className="card-hover h-full rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 text-xs text-faint">{title}</div>
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate text-muted">{r.k}</span>
              <div className="relative h-2 flex-1 rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0 start-0 rounded-full bg-accent"
                  style={{ width: `${(r.v / max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-end text-faint">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

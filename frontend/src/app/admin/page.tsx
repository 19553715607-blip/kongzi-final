"use client";

import * as echarts from "echarts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  downloadAdminUsersCsv,
  getAdminDashboard,
  getAdminAnalyticsEngagement,
  getAdminUsersTimeseries,
  getAuditLog,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AdminDashboardResp,
  AdminEngagementResp,
  AdminUsersTimeseriesResp,
  AuditLogItem,
} from "@/lib/types";
import Chart, {
  ADMIN_PALETTE,
  chartTextColors,
  useDark,
} from "./_components/Chart";
import { CountUp, Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";

// ── 迷你 sparkline：纯 SVG 折线 + 淡面积，无依赖 ──
function Sparkline({ data }: { data: number[] }) {
  const w = 120;
  const h = 34;
  if (!data || data.length < 2) {
    return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path className="spark-area" d={area} />
      <path className="spark-line" d={line} />
    </svg>
  );
}

function relTime(iso: string | null | undefined, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  const min = Math.floor(diff / 60);
  if (min < 1) return lang === "zh" ? "刚刚" : "now";
  if (min < 60) return lang === "zh" ? `${min} 分钟前` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return lang === "zh" ? `${hr} 小时前` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return lang === "zh" ? `${day} 天前` : `${day}d ago`;
}

export default function AdminDashboardPage() {
  const [lang] = useLang();
  const dark = useDark();
  const [days, setDays] = useState(30);
  const [dash, setDash] = useState<AdminDashboardResp | null>(null);
  const [ts, setTs] = useState<AdminUsersTimeseriesResp | null>(null);
  const [eng, setEng] = useState<AdminEngagementResp | null>(null);
  const [audit, setAudit] = useState<AuditLogItem[]>([]);
  const [err, setErr] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getAdminDashboard(days).then(setDash).catch(() => setErr(t("adm.loadFail", lang)));
    getAdminUsersTimeseries(days).then(setTs).catch(() => {});
    getAdminAnalyticsEngagement().then(setEng).catch(() => {});
    getAuditLog({ page: 1, page_size: 12 }).then((r) => setAudit(r.items ?? [])).catch(() => {});
  }, [lang, days]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAdminUsersCsv();
      toast(t("admin.common.saved", lang), "ok");
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setExporting(false);
    }
  };

  const colors = chartTextColors(dark);

  // 用户日增 / PV 时序 → sparkline 数据
  const userDaily = useMemo(() => (ts?.daily_new ?? []).map((d) => d.count), [ts]);
  const pvDaily = useMemo(() => (eng?.pv_series ?? []).map((d) => d.pv), [eng]);

  const heroKpis = useMemo(() => {
    if (!dash) return [];
    return [
      { label: t("admin.kpi.totalUsers", lang), value: dash.users.total, spark: userDaily },
      { label: t("admin.kpi.newToday", lang), value: dash.users.new_today, spark: userDaily.slice(-14) },
      { label: t("admin.kpi.dau", lang), value: dash.active.dau, spark: userDaily.slice(-14) },
      { label: t("admin.kpi.mau", lang), value: dash.active.mau, spark: userDaily },
      { label: t("admin.kpi.pvToday", lang), value: dash.traffic.pv_today, spark: pvDaily.slice(-14) },
      { label: t("admin.kpi.conversations", lang), value: dash.traffic.conversations, spark: pvDaily },
    ];
  }, [dash, lang, userDaily, pvDaily]);

  const newUsersOpt = useMemo<echarts.EChartsOption>(() => {
    const dayArr = ts?.daily_new ?? [];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 40, right: 16, top: 24, bottom: 24 },
      xAxis: {
        type: "category",
        data: dayArr.map((d) => d.date.slice(5)),
        axisLabel: { color: colors.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: colors.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
      },
      series: [
        {
          name: t("admin.chart.newUsers30d", lang),
          type: "line",
          smooth: true,
          data: dayArr.map((d) => d.count),
          itemStyle: { color: ADMIN_PALETTE[0] },
          areaStyle: { opacity: 0.12 },
        },
      ],
    };
  }, [ts, colors, lang]);

  const pvOpt = useMemo<echarts.EChartsOption>(() => {
    const series = eng?.pv_series ?? [];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 44, right: 16, top: 24, bottom: 24 },
      xAxis: {
        type: "category",
        data: series.map((d) => d.date.slice(5)),
        axisLabel: { color: colors.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: colors.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
      },
      series: [
        {
          name: t("admin.chart.pvTrend", lang),
          type: "bar",
          data: series.map((d) => d.pv),
          itemStyle: { color: ADMIN_PALETTE[2] },
        },
      ],
    };
  }, [eng, colors, lang]);

  const langOpt = useMemo<echarts.EChartsOption>(() => {
    const data = (ts?.by_lang ?? []).map((d) => ({ name: d.lang, value: d.count }));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
      color: ADMIN_PALETTE,
      series: [
        {
          type: "pie",
          radius: ["38%", "65%"],
          center: ["50%", "45%"],
          data,
          label: { color: colors.text, fontSize: 10 },
        },
      ],
    };
  }, [ts, colors]);

  const countryOpt = useMemo<echarts.EChartsOption>(() => {
    const rows = (ts?.by_country ?? []).slice(0, 12);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 50, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: "category",
        data: rows.map((d) => d.code),
        axisLabel: { color: colors.muted, fontSize: 10, rotate: 45 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: colors.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
      },
      series: [
        {
          type: "bar",
          data: rows.map((d) => d.count),
          itemStyle: { color: ADMIN_PALETTE[1] },
        },
      ],
    };
  }, [ts, colors]);

  if (err)
    return <div className="rounded-xl bg-accent-soft p-4 text-sm text-accent">{err}</div>;

  return (
    <div className="space-y-4">
      {/* 时间范围 + 快捷操作 */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <span className="text-xs text-faint">{t("admin.dash.range", lang)}</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`pressable rounded-full px-3 py-1 text-xs ${
              days === d ? "bg-accent text-white" : "border border-line text-muted"
            }`}
          >
            {d === 7 ? t("admin.dash.days7", lang) : d === 30 ? t("admin.dash.days30", lang) : t("admin.dash.days90", lang)}
          </button>
        ))}
        <div className="ms-auto flex flex-wrap gap-2">
          <TactileButton variant="cel" className="xs" onClick={handleExport} disabled={exporting}>
            {t("admin.dash.exportUsers", lang)}
          </TactileButton>
          <Link href="/admin/content">
            <TactileButton variant="ghost" className="xs">{t("admin.dash.newContent", lang)}</TactileButton>
          </Link>
          <Link href="/admin/engagement">
            <TactileButton variant="ghost" className="xs">{t("admin.dash.postAnnouncement", lang)}</TactileButton>
          </Link>
        </div>
      </section>

      {/* KPI 英雄行：CountUp + 迷你 sparkline */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {heroKpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 60}>
            <div className="card-hover flex h-full flex-col rounded-xl border border-line bg-surface p-3">
              <div className="font-serif text-[10px] tracking-wide text-muted">{k.label}</div>
              <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                <CountUp value={k.value} />
              </div>
              <div className="mt-auto pt-2">
                <Sparkline data={k.spark} />
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* 内容子项 */}
      {dash && (
        <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {([
            ["admin.kpi.books", dash.content.books],
            ["admin.kpi.chapters", dash.content.chapters],
            ["admin.kpi.passages", dash.content.passages],
            ["admin.kpi.concepts", dash.content.concepts],
            ["admin.kpi.translations", dash.content.translations],
            ["admin.kpi.annotations", dash.content.annotations],
          ] as [string, number][]).map(([label, v], i) => (
            <Reveal key={label} delay={i * 50}>
              <div className="card-hover rounded-xl border border-line bg-surface-2/40 p-2 text-center">
                <div className="font-serif text-base text-fg tabular-nums">
                  <CountUp value={v} />
                </div>
                <div className="text-[10px] text-muted">{t(label, lang)}</div>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      <div className="ornament-rule" aria-hidden>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>

      {/* 图表区 + 实时活动流（错峰入场） */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {[
            { title: t("admin.chart.newUsers30d", lang), opt: newUsersOpt, h: 260 },
            { title: t("admin.chart.pvTrend", lang), opt: pvOpt, h: 260 },
            { title: t("admin.chart.langDist", lang), opt: langOpt, h: 260 },
            { title: t("admin.chart.countryDist", lang), opt: countryOpt, h: 260 },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="card-hover h-full rounded-2xl border border-line bg-surface p-3">
                <div className="mb-2 text-xs font-medium text-fg">{c.title}</div>
                <Chart option={c.opt} height={c.h} />
              </div>
            </Reveal>
          ))}
        </section>

        {/* 最近实时活动 */}
        <Reveal delay={160}>
          <div className="card-hover flex h-full flex-col rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-fg">{t("admin.dash.activity", lang)}</div>
              <span className="badge badge-cel">
                {t("admin.dash.trend", lang)}
              </span>
            </div>
            <div className="activity-feed">
              {audit.length === 0 && (
                <div className="py-8 text-center text-xs text-faint">
                  {t("admin.dash.activityEmpty", lang)}
                </div>
              )}
              {audit.map((a) => (
                <div key={a.id} className="activity-item">
                  <span className="activity-ico">{(a.action ?? "·").slice(0, 1).toUpperCase()}</span>
                  <div className="activity-body">
                    <div className="activity-line">
                      <span className="text-fg">{a.actor || "—"}</span>
                      {" · "}
                      <span className="text-muted">{a.action || "—"}</span>
                      {a.target && <span className="text-faint"> · {a.target}</span>}
                    </div>
                    <div className="activity-meta">{relTime(a.created_at, lang)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

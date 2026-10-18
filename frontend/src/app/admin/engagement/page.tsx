"use client";

import * as echarts from "echarts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAnnouncement,
  getAdminAnalyticsEngagement,
  listPendingContributions,
  moderateContribution,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AdminEngagementResp,
  Contribution,
} from "@/lib/types";
import Chart, {
  ADMIN_PALETTE,
  chartTextColors,
  useDark,
} from "../_components/Chart";
import { CountUp, Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { Field, inputCls } from "../_components/adminUi";

export default function AdminEngagementPage() {
  const [lang] = useLang();
  const dark = useDark();
  const [data, setData] = useState<AdminEngagementResp | null>(null);

  // 投稿审核
  const [pending, setPending] = useState<Contribution[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  // 发布公告
  const [ann, setAnn] = useState({ title: "", body: "", lang: "zh", active: true });
  const [annBusy, setAnnBusy] = useState(false);

  useEffect(() => {
    getAdminAnalyticsEngagement().then(setData).catch(() => {});
  }, []);

  const loadPending = useCallback(() => {
    setPLoading(true);
    listPendingContributions(1, 20)
      .then((d) => setPending(d.items ?? []))
      .catch(() => setPending([]))
      .finally(() => setPLoading(false));
  }, []);
  useEffect(loadPending, [loadPending]);

  const colors = chartTextColors(dark);

  const contribOpt = useMemo<echarts.EChartsOption>(() => {
    const c = data?.contributions;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
      color: [ADMIN_PALETTE[5], ADMIN_PALETTE[1], "#888"],
      series: [
        {
          type: "pie",
          radius: ["35%", "62%"],
          center: ["50%", "45%"],
          data: [
            { name: t("admin.eng.pending", lang), value: c?.pending ?? 0 },
            { name: t("admin.eng.published", lang), value: c?.published ?? 0 },
            { name: t("admin.eng.rejected", lang), value: c?.rejected ?? 0 },
          ],
          label: { color: colors.text, fontSize: 10 },
        },
      ],
    };
  }, [data, colors, lang]);

  const instOpt = useMemo<echarts.EChartsOption>(() => {
    const i = data?.institutions;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 44, right: 16, top: 16, bottom: 48 },
      xAxis: {
        type: "category",
        data: [
          t("admin.eng.instPending", lang),
          t("admin.eng.instApproved", lang),
          t("admin.eng.instSuspended", lang),
          t("admin.eng.instRejected", lang),
        ],
        axisLabel: { color: colors.muted, fontSize: 10, interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      yAxis: { type: "value", axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.split } } },
      series: [
        {
          type: "bar",
          data: [i?.pending ?? 0, i?.approved ?? 0, i?.suspended ?? 0, i?.rejected ?? 0],
          itemStyle: { color: ADMIN_PALETTE[2] },
        },
      ],
    };
  }, [data, colors, lang]);

  const pvOpt = useMemo<echarts.EChartsOption>(() => {
    const series = data?.pv_series ?? [];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 44, right: 16, top: 24, bottom: 24 },
      xAxis: {
        type: "category",
        data: series.map((d) => d.date.slice(5)),
        boundaryGap: false,
        axisLabel: { color: colors.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      yAxis: { type: "value", axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.split } } },
      series: [
        {
          name: t("admin.chart.pvSeries", lang),
          type: "line",
          smooth: true,
          data: series.map((d) => d.pv),
          itemStyle: { color: ADMIN_PALETTE[0] },
          areaStyle: { opacity: 0.12 },
        },
      ],
    };
  }, [data, colors, lang]);

  const moderate = async (id: number, status: string) => {
    setBusy(id);
    try {
      await moderateContribution(id, status);
      toast(t("admin.eng.moderated", lang), "ok");
      loadPending();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const postAnnouncement = async () => {
    if (!ann.title.trim()) return;
    setAnnBusy(true);
    try {
      await createAnnouncement({ title: ann.title.trim(), body: ann.body, lang: ann.lang, active: ann.active });
      toast(t("admin.ann.posted", lang), "ok");
      setAnn({ title: "", body: "", lang: "zh", active: true });
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setAnnBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="skeleton mb-2 h-3 w-20" />
              <div className="skeleton h-6 w-24" />
            </div>
          ))}
        </section>
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="skeleton mb-2 h-3 w-24" />
          <div className="skeleton h-[260px] w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-3">
              <div className="skeleton mb-2 h-3 w-24" />
              <div className="skeleton h-[280px] w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 投稿审核（新增）── */}
      <section className="card-hover rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-medium text-fg">{t("admin.eng.contribReview", lang)}</div>
        {pLoading && <div className="skeleton h-20 w-full" />}
        {!pLoading && pending.length === 0 && (
          <div className="empty-state">
            <div className="icon-plate">孔</div>
            <div className="state-title">{t("admin.eng.pendingContribs", lang)}</div>
            <div className="state-sub">{t("admin.common.emptyList", lang)}</div>
          </div>
        )}
        <div className="space-y-2">
          {pending.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-surface-2/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-fg">{c.headline}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-muted">{c.detail}</div>
                  <div className="mt-1 text-[10px] text-faint tabular-nums">
                    #{c.id} · {c.kind} · {(c.created_at ?? "").slice(0, 10)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <TactileButton variant="cel" className="xs" disabled={busy === c.id} onClick={() => moderate(c.id, "approved")}>
                    {t("admin.eng.moderateApprove", lang)}
                  </TactileButton>
                  <TactileButton variant="ghost" className="xs text-accent" disabled={busy === c.id} onClick={() => moderate(c.id, "rejected")}>
                    {t("admin.eng.moderateReject", lang)}
                  </TactileButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 发布公告（新增）── */}
      <section className="card-hover rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-medium text-fg">{t("admin.ann.postAnnouncement", lang)}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.ann.f.title", lang)}>
            <input className={inputCls} value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} />
          </Field>
          <Field label={t("admin.ann.f.lang", lang)}>
            <select className={inputCls} value={ann.lang} onChange={(e) => setAnn({ ...ann, lang: e.target.value })}>
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("admin.ann.f.body", lang)}>
              <textarea className={inputCls} rows={3} value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={ann.active} onChange={(e) => setAnn({ ...ann, active: e.target.checked })} />
            {t("admin.ann.f.active", lang)}
          </label>
          <TactileButton variant="accent" className="sm" onClick={postAnnouncement} disabled={!ann.title.trim() || annBusy}>
            {annBusy ? t("admin.common.loading", lang) : t("admin.common.create", lang)}
          </TactileButton>
        </div>
      </section>

      {/* ── 既有分析（保留）── */}
      {data.api && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Reveal>
            <div className="card-hover rounded-xl border border-line bg-surface p-3">
              <div className="text-[10px] text-muted">{t("admin.eng.apiCalls", lang)}</div>
              <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                <CountUp value={data.api.calls} />
              </div>
            </div>
          </Reveal>
          <Reveal delay={70}>
            <div className="card-hover rounded-xl border border-line bg-surface p-3">
              <div className="text-[10px] text-muted">
                {t("admin.eng.avgLatency", lang)} · {t("admin.eng.latencyUnit", lang)}
              </div>
              <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                <CountUp value={data.api.avg_latency_ms} />
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {data.contributions && (
        <Reveal delay={140}>
          <section className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">
              {t("admin.eng.upvotes", lang)}:{" "}
              <span className="font-serif text-base text-accent tabular-nums">
                <CountUp value={data.contributions.upvotes} />
              </span>
            </div>
            <Chart option={contribOpt} height={260} />
          </section>
        </Reveal>
      )}

      <div className="ornament-rule" aria-hidden>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Reveal delay={80}>
          <div className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">{t("admin.chart.instStatus", lang)}</div>
            <Chart option={instOpt} height={280} />
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">{t("admin.chart.pvSeries", lang)}</div>
            <Chart option={pvOpt} height={280} />
          </div>
        </Reveal>
      </section>
    </div>
  );
}

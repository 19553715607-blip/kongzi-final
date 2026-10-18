"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useState } from "react";
import { getAdminAnalyticsAudience } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type { AdminAudienceResp } from "@/lib/types";
import Chart, {
  ADMIN_PALETTE,
  chartTextColors,
  useDark,
} from "../_components/Chart";
import { Reveal } from "@/lib/motion";

export default function AdminAudiencePage() {
  const [lang] = useLang();
  const dark = useDark();
  const [data, setData] = useState<AdminAudienceResp | null>(null);

  useEffect(() => {
    getAdminAnalyticsAudience().then(setData).catch(() => {});
  }, []);

  const colors = chartTextColors(dark);

  const langOpt = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
    color: ADMIN_PALETTE,
    series: [
      {
        type: "pie",
        radius: ["35%", "62%"],
        center: ["50%", "45%"],
        data: (data?.lang ?? []).map((d) => ({ name: d.lang, value: d.count })),
        label: { color: colors.text, fontSize: 10 },
      },
    ],
  }), [data, colors]);

  const countryOpt = useMemo<echarts.EChartsOption>(() => {
    const rows = (data?.country ?? []).slice(0, 12);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 16, top: 16, bottom: 40 },
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
      series: [{ type: "bar", data: rows.map((d) => d.count), itemStyle: { color: ADMIN_PALETTE[1] } }],
    };
  }, [data, colors]);

  const deviceOpt = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
    color: ADMIN_PALETTE,
    series: [
      {
        type: "pie",
        radius: "60%",
        center: ["50%", "45%"],
        data: (data?.device ?? []).map((d) => ({ name: d.device, value: d.count })),
        label: { color: colors.text, fontSize: 10 },
      },
    ],
  }), [data, colors]);

  const sourceOpt = useMemo<echarts.EChartsOption>(() => {
    const rows = (data?.source ?? []).slice(0, 12);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 16, top: 16, bottom: 24 },
      xAxis: { type: "value", axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.split } } },
      yAxis: {
        type: "category",
        data: rows.map((d) => d.source),
        axisLabel: { color: colors.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.line } },
      },
      series: [{ type: "bar", data: rows.map((d) => d.count), itemStyle: { color: ADMIN_PALETTE[3] } }],
    };
  }, [data, colors]);

  if (!data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-3">
            <div className="skeleton mb-3 h-3 w-24" />
            <div className="skeleton h-[300px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { title: t("admin.chart.langDist", lang), opt: langOpt },
    { title: t("admin.chart.countryDist", lang), opt: countryOpt },
    { title: t("admin.chart.deviceDist", lang), opt: deviceOpt },
    { title: t("admin.chart.sourceDist", lang), opt: sourceOpt },
  ];

  const hasAny =
    (data.lang?.length ?? 0) +
      (data.country?.length ?? 0) +
      (data.device?.length ?? 0) +
      (data.source?.length ?? 0) >
    0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {!hasAny ? (
        <div className="col-span-full">
          <div className="empty-state">
            <div className="icon-plate">孔</div>
            <div className="state-title">{t("state.empty.title", lang)}</div>
            <div className="state-sub">{t("state.empty.sub", lang)}</div>
          </div>
        </div>
      ) : (
        cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 80}>
            <div className="card-hover rounded-2xl border border-line bg-surface p-3">
              <div className="mb-2 text-xs font-medium text-fg">{c.title}</div>
              <Chart option={c.opt} height={300} />
            </div>
          </Reveal>
        ))
      )}
    </div>
  );
}

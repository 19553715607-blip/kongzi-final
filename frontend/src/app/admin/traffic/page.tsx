"use client";

import * as echarts from "echarts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearTrafficEvents,
  deleteTrafficEvent,
  downloadAdminTrafficCsv,
  getAdminTrafficEvents,
  getAdminTrafficPages,
  getAdminTrafficTimeseries,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AdminTrafficEventItem,
  AdminTrafficEventsResp,
  AdminTrafficPageRow,
  AdminTrafficPoint,
} from "@/lib/types";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import Chart, { ADMIN_PALETTE, chartTextColors, useDark } from "../_components/Chart";
import { ConfirmDialog } from "../_components/adminUi";
import DataTable, { type Column } from "../_components/DataTable";
import { CountUp, Reveal } from "@/lib/motion";

const EVENT_PAGE_SIZE = 20;

type Pending =
  | { kind: "delEvent"; event: AdminTrafficEventItem }
  | { kind: "clearPath"; path: string }
  | null;

export default function AdminTrafficPage() {
  const [lang] = useLang();
  const dark = useDark();

  const [pages, setPages] = useState<AdminTrafficPageRow[] | null>(null);
  const [series, setSeries] = useState<AdminTrafficPoint[] | null>(null);

  const [events, setEvents] = useState<AdminTrafficEventsResp | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPath, setEventsPath] = useState("");
  const [page, setPage] = useState(1);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<number | string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  // 点击页面行的 path → 聚焦到下方原始事件筛选
  const focusPath = useCallback((path: string) => {
    setEventsPath(path);
    setPage(1);
    if (typeof document !== "undefined") {
      document.getElementById("admin-traffic-events")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // ── 汇总：页面聚合 + 时序 ──
  const loadSummary = useCallback(() => {
    setErr("");
    getAdminTrafficPages()
      .then((rows) => setPages(rows))
      .catch(() => setErr(t("adm.loadFail", lang)));
    getAdminTrafficTimeseries(30).then(setSeries).catch(() => {});
  }, [lang]);

  useEffect(loadSummary, [loadSummary]);

  // ── 原始事件：按 path 筛选 + 分页 ──
  const loadEvents = useCallback(() => {
    setEventsLoading(true);
    getAdminTrafficEvents({
      page,
      page_size: EVENT_PAGE_SIZE,
      path: eventsPath || undefined,
    })
      .then(setEvents)
      .catch(() => setEvents({ items: [], total: 0, page, page_size: EVENT_PAGE_SIZE }))
      .finally(() => setEventsLoading(false));
  }, [page, eventsPath]);

  useEffect(loadEvents, [loadEvents]);

  // KPI 汇总
  const kpis = useMemo(() => {
    const rows = pages ?? [];
    return {
      pv: rows.reduce((s, r) => s + (r.pv || 0), 0),
      today: rows.reduce((s, r) => s + (r.today_pv || 0), 0),
      uv: rows.reduce((s, r) => s + (r.uv || 0), 0),
      logged: rows.reduce((s, r) => s + (r.logged_pv || 0), 0),
    };
  }, [pages]);

  const colors = chartTextColors(dark);
  const trendOpt = useMemo<echarts.EChartsOption>(() => {
    const rows = series ?? [];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
      grid: { left: 44, right: 16, top: 24, bottom: 40 },
      xAxis: {
        type: "category",
        data: rows.map((d) => (d.date || "").slice(5)),
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
          name: t("admin.traffic.chart.pv", lang),
          type: "line",
          smooth: true,
          data: rows.map((d) => d.pv),
          itemStyle: { color: ADMIN_PALETTE[0] },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: t("admin.traffic.chart.uv", lang),
          type: "line",
          smooth: true,
          data: rows.map((d) => d.uv),
          itemStyle: { color: ADMIN_PALETTE[2] },
        },
      ],
    };
  }, [series, colors, lang]);

  // ── 按页面表 ──
  const pageCols: Column<AdminTrafficPageRow>[] = [
    {
      key: "path",
      header: t("admin.traffic.col.path", lang),
      sortable: true,
      sortValue: (r) => r.path,
      render: (r) => (
        <button
          onClick={() => focusPath(r.path)}
          className="pressable font-medium text-accent underline-offset-2 hover:underline"
          title={t("admin.traffic.row.expand", lang)}
        >
          {r.path}
        </button>
      ),
    },
    {
      key: "pv",
      header: t("admin.traffic.col.pv", lang),
      sortable: true,
      sortValue: (r) => r.pv,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.pv.toLocaleString()}</span>,
    },
    {
      key: "uv",
      header: t("admin.traffic.col.uv", lang),
      sortable: true,
      sortValue: (r) => r.uv,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.uv.toLocaleString()}</span>,
    },
    {
      key: "logged",
      header: t("admin.traffic.col.logged", lang),
      sortable: true,
      sortValue: (r) => r.logged_pv,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.logged_pv.toLocaleString()}</span>,
    },
    {
      key: "today",
      header: t("admin.traffic.col.today", lang),
      sortable: true,
      sortValue: (r) => r.today_pv,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.today_pv.toLocaleString()}</span>,
    },
    {
      key: "week",
      header: t("admin.traffic.col.week", lang),
      sortable: true,
      sortValue: (r) => r.week_pv,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.week_pv.toLocaleString()}</span>,
    },
  ];

  // ── 原始事件表 ──
  const eventCols: Column<AdminTrafficEventItem>[] = [
    {
      key: "visitor",
      header: t("admin.traffic.col.visitor", lang),
      render: (e) => (
        <span className="text-muted">{(e.visitor_id || "—").slice(0, 8)}</span>
      ),
    },
    {
      key: "user",
      header: t("admin.traffic.col.user", lang),
      render: (e) => <span className="text-muted">{e.user_id || "—"}</span>,
    },
    { key: "path", header: t("admin.traffic.col.path", lang), render: (e) => e.path || "—" },
    {
      key: "device",
      header: t("admin.traffic.col.device", lang),
      render: (e) => <span className="text-muted">{e.device || "—"}</span>,
    },
    {
      key: "source",
      header: t("admin.traffic.col.source", lang),
      render: (e) => <span className="text-muted">{e.source || "—"}</span>,
    },
    {
      key: "country",
      header: t("admin.traffic.col.country", lang),
      render: (e) => <span className="text-muted">{e.country_code || "—"}</span>,
    },
    {
      key: "ts",
      header: t("admin.traffic.col.time", lang),
      sortable: true,
      sortValue: (e) => e.ts || "",
      render: (e) => (
        <span className="text-muted tabular-nums">
          {(e.ts || "").replace("T", " ").slice(0, 16)}
        </span>
      ),
    },
    {
      key: "act",
      header: t("admin.common.actions", lang),
      render: (e) => (
        <TactileButton
          variant="ghost"
          className="xs text-accent"
          disabled={busy === e.id}
          onClick={() => setPending({ kind: "delEvent", event: e })}
        >
          {t("admin.common.delete", lang)}
        </TactileButton>
      ),
    },
  ];

  const totalEventPages = events ? Math.max(1, Math.ceil(events.total / events.page_size)) : 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAdminTrafficCsv();
      toast(t("admin.common.saved", lang), "ok");
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setExporting(false);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "delEvent") {
        setBusy(pending.event.id);
        await deleteTrafficEvent(pending.event.id);
        toast(t("admin.common.saved", lang), "ok");
      } else {
        setBusy(pending.path);
        const res = await clearTrafficEvents(pending.path);
        toast(
          `${t("admin.common.saved", lang)} · ${(res as { deleted?: number }).deleted ?? 0}`,
          "ok",
        );
      }
      loadEvents();
      loadSummary();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
      setPending(null);
    }
  };

  if (err) {
    return (
      <div className="error-state">
        <div className="icon-plate">孔</div>
        <div className="state-title">{t("state.error.title", lang)}</div>
        <div className="state-sub">{t("state.error.sub", lang)}</div>
        <TactileButton variant="accent" className="sm" onClick={loadSummary}>
          {t("state.retry", lang)}
        </TactileButton>
      </div>
    );
  }

  const loading = pages === null;

  return (
    <div className="space-y-4">
      {/* 顶部：标题 + 操作 */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <div className="text-sm font-medium text-fg">{t("admin.nav.traffic", lang)}</div>
        <div className="ms-auto flex gap-2">
          {eventsPath && (
            <TactileButton
              variant="ghost"
              className="sm text-accent"
              disabled={!!busy}
              onClick={() => setPending({ kind: "clearPath", path: eventsPath })}
            >
              {t("admin.traffic.events.clear", lang)} · {eventsPath}
            </TactileButton>
          )}
          <TactileButton variant="cel" className="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? t("admin.user.exporting", lang) : t("admin.traffic.events.export", lang)}
          </TactileButton>
        </div>
      </section>

      {/* KPI 英雄行 */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: t("admin.traffic.kpi.pv", lang), value: kpis.pv },
          { label: t("admin.traffic.kpi.pvToday", lang), value: kpis.today },
          { label: t("admin.traffic.kpi.uv", lang), value: kpis.uv },
          { label: t("admin.traffic.kpi.logged", lang), value: kpis.logged },
        ].map((k, i) => (
          <Reveal key={k.label} delay={i * 60}>
            <div className="card-hover flex h-full flex-col rounded-xl border border-line bg-surface p-3">
              <div className="font-serif text-[10px] tracking-wide text-muted">{k.label}</div>
              <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                {loading ? (
                  <div className="skeleton h-6 w-20" />
                ) : (
                  <CountUp value={k.value} />
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* 趋势图 */}
      <Reveal delay={120}>
        <div className="card-hover rounded-2xl border border-line bg-surface p-3">
          <div className="mb-2 text-xs font-medium text-fg">
            {t("admin.traffic.chart.trend", lang)}
          </div>
          {series === null ? (
            <div className="skeleton h-[300px] w-full" />
          ) : (
            <Chart option={trendOpt} height={300} />
          )}
        </div>
      </Reveal>

      {/* 按页面表（点 path 聚焦事件） */}
      <Reveal delay={180}>
        <div className="space-y-2">
          <div className="text-xs font-medium text-fg">{t("admin.traffic.title.pages", lang)}</div>
          <DataTable<AdminTrafficPageRow>
            rows={pages ?? []}
            columns={pageCols}
            rowKey={(r) => r.path}
            loading={loading}
            initialSortKey="pv"
            minWidth={720}
            emptyNode={
              <div className="empty-state">
                <div className="icon-plate">孔</div>
                <div className="state-title">{t("state.empty.title", lang)}</div>
                <div className="state-sub">{t("state.empty.sub", lang)}</div>
              </div>
            }
          />
        </div>
      </Reveal>

      {/* 原始事件区 */}
      <Reveal delay={240}>
        <div id="admin-traffic-events" className="scroll-mt-20 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-medium text-fg">
              {t("admin.traffic.title.events", lang)}
            </div>
            <input
              value={eventsPath}
              onChange={(e) => {
                setPage(1);
                setEventsPath(e.target.value);
              }}
              placeholder={t("admin.traffic.filter.path", lang)}
              className="min-w-56 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
            />
          </div>
          <DataTable<AdminTrafficEventItem>
            rows={events?.items ?? []}
            columns={eventCols}
            rowKey={(e) => String(e.id)}
            loading={eventsLoading}
            page={page}
            totalPages={totalEventPages}
            total={events?.total ?? 0}
            onPageChange={setPage}
            pagerLabel={t("admin.table.pager", lang)}
            minWidth={900}
            emptyNode={
              <div className="empty-state">
                <div className="icon-plate">孔</div>
                <div className="state-title">{t("state.empty.title", lang)}</div>
                <div className="state-sub">{t("state.empty.sub", lang)}</div>
              </div>
            }
          />
        </div>
      </Reveal>

      <ConfirmDialog
        open={!!pending}
        title={t("admin.op.dangerTitle", lang)}
        message={
          pending?.kind === "delEvent"
            ? t("admin.traffic.events.confirmDelete", lang)
            : pending?.kind === "clearPath"
              ? t("admin.traffic.events.confirmClear", lang).replace("{path}", pending.path)
              : ""
        }
        confirmLabel={t("admin.common.confirm", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        loading={busy != null}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

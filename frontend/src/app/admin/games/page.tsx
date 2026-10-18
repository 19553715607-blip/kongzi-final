"use client";

import * as echarts from "echarts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteGameRound,
  getAdminAnalyticsGames,
  listGameRounds,
} from "@/lib/api";
import { t, useLang, type Lang } from "@/lib/i18n";
import type {
  AdminGameRoundsResp,
  AdminGameRoundItem,
  AdminGamesResp,
} from "@/lib/types";
import Chart, {
  ADMIN_PALETTE,
  chartTextColors,
  useDark,
} from "../_components/Chart";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { ConfirmDialog } from "../_components/adminUi";
import DataTable, { type Column } from "../_components/DataTable";

const ARTS = ["li", "yue", "she", "yu", "shu", "math"];
const PAGE_SIZE = 20;

export default function AdminGamesPage() {
  const [lang] = useLang();
  const dark = useDark();
  const [data, setData] = useState<AdminGamesResp | null>(null);

  // 对局明细
  const [game, setGame] = useState<string>("li");
  const [rounds, setRounds] = useState<AdminGameRoundsResp | null>(null);
  const [rLoading, setRLoading] = useState(false);
  const [rPage, setRPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminGameRoundItem | null>(null);

  useEffect(() => {
    getAdminAnalyticsGames().then(setData).catch(() => {});
  }, []);

  const loadRounds = useCallback(() => {
    setRLoading(true);
    listGameRounds(game, rPage, PAGE_SIZE)
      .then(setRounds)
      .catch(() => {
        setRounds(null);
        toast(t("admin.common.failed", lang), "err");
      })
      .finally(() => setRLoading(false));
  }, [game, rPage, lang]);

  useEffect(loadRounds, [loadRounds]);

  const colors = chartTextColors(dark);
  const games = data?.games ?? [];

  const barOpt = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
    grid: { left: 44, right: 16, top: 24, bottom: 48 },
    xAxis: {
      type: "category",
      data: games.map((g) => g.label),
      axisLabel: { color: colors.muted, fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: colors.line } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.split } },
    },
    color: ADMIN_PALETTE,
    series: [
      { name: t("admin.games.rounds", lang), type: "bar", data: games.map((g) => g.rounds) },
      { name: t("admin.games.players", lang), type: "bar", data: games.map((g) => g.players) },
      { name: t("admin.games.today", lang), type: "bar", data: games.map((g) => g.today) },
    ],
  }), [games, colors, lang]);

  const totalPages = rounds ? Math.max(1, Math.ceil(rounds.total / rounds.page_size)) : 1;

  const doDelete = async () => {
    if (!confirmDel) return;
    setBusy(confirmDel.id);
    try {
      await deleteGameRound(game, confirmDel.id);
      toast(t("admin.common.saved", lang), "ok");
      setConfirmDel(null);
      loadRounds();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 既有概览表（保留）── */}
      <section className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="border-b border-line bg-surface-2/50 text-[10px] uppercase tracking-tight text-muted">
            <tr>
              {[
                "admin.games.label",
                "admin.games.rounds",
                "admin.games.answers",
                "admin.games.players",
                "admin.games.avgScore",
                "admin.games.today",
              ].map((c) => (
                <th key={c} className="px-3 py-2 font-medium">{t(c, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 6 }).map((_, r) => (
                <tr key={`sk-${r}`} className="border-b border-line/40">
                  {[0, 1, 2, 3, 4, 5].map((c) => (
                    <td key={c} className="px-3 py-2.5">
                      <div className="skeleton h-3.5 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))}
            {data && games.length === 0 && (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="icon-plate">孔</div>
                  <div className="state-title">{t("state.empty.title", lang)}</div>
                  <div className="state-sub">{t("state.empty.sub", lang)}</div>
                </div>
              </td></tr>
            )}
            {data &&
              games.map((g, idx) => (
                <tr key={g.key} style={{ animationDelay: `${idx * 45}ms` }} className="row-in border-b border-line/60 transition-colors hover:bg-surface-2/40">
                  <td className="px-3 py-2 font-medium text-fg">{g.label}</td>
                  <td className="px-3 py-2 tabular-nums">{g.rounds.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{g.answers.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{g.players.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{g.avg_score.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums">{g.today.toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* ── 对局明细管理（新增）── */}
      <section className="card-hover rounded-2xl border border-line bg-surface p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">{t("admin.games.filter", lang)}</span>
          {ARTS.map((a) => (
            <button
              key={a}
              onClick={() => { setGame(a); setRPage(1); }}
              className={`pressable rounded-full px-3 py-1 text-xs ${game === a ? "bg-accent text-white" : "border border-line text-muted"}`}
            >
              {a}
            </button>
          ))}
        </div>

        <RoundsTable
          rounds={rounds}
          loading={rLoading}
          game={game}
          page={rPage}
          totalPages={totalPages}
          busy={busy}
          onPageChange={setRPage}
          onDelete={(r) => setConfirmDel(r)}
          lang={lang}
        />
      </section>

      {/* ── 既有柱状图（保留）── */}
      <Reveal delay={120}>
        <div className="card-hover rounded-2xl border border-line bg-surface p-3">
          <div className="mb-2 text-xs font-medium text-fg">{t("admin.chart.games", lang)}</div>
          {data ? <Chart option={barOpt} height={340} /> : <div className="skeleton h-[340px] w-full" />}
        </div>
      </Reveal>

      <ConfirmDialog
        open={!!confirmDel}
        title={t("admin.op.dangerTitle", lang)}
        message={t("admin.games.confirmDeleteRound", lang)}
        confirmLabel={t("admin.common.delete", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        loading={!!busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

// 对局明细统一表格（DataTable 落地）
function RoundsTable({
  rounds,
  loading,
  page,
  totalPages,
  busy,
  onPageChange,
  onDelete,
  lang,
}: {
  rounds: AdminGameRoundsResp | null;
  loading: boolean;
  game: string;
  page: number;
  totalPages: number;
  busy: number | null;
  onPageChange: (p: number) => void;
  onDelete: (r: AdminGameRoundItem) => void;
  lang: Lang;
}) {
  const items = rounds?.items ?? [];
  const cols: Column<AdminGameRoundItem>[] = [
    {
      key: "user",
      header: t("admin.games.user", lang),
      render: (r) => <span className="text-fg">{r.user_name || r.user_id || "—"}</span>,
    },
    {
      key: "score",
      header: t("admin.games.score", lang),
      sortable: true,
      sortValue: (r) => r.score ?? 0,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.score ?? 0}</span>,
    },
    {
      key: "answers",
      header: t("admin.games.answers", lang),
      sortable: true,
      sortValue: (r) => r.answers ?? 0,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.answers ?? 0}</span>,
    },
    {
      key: "time",
      header: t("admin.games.time", lang),
      sortable: true,
      sortValue: (r) => r.created_at ?? "",
      render: (r) => (
        <span className="text-muted tabular-nums">{(r.created_at ?? "").slice(0, 16).replace("T", " ")}</span>
      ),
    },
    {
      key: "actions",
      header: t("admin.common.actions", lang),
      align: "right",
      render: (r) => (
        <TactileButton
          variant="ghost"
          className="xs text-accent"
          disabled={busy === r.id}
          onClick={() => onDelete(r)}
        >
          {t("admin.games.deleteRound", lang)}
        </TactileButton>
      ),
    },
  ];
  return (
    <DataTable<AdminGameRoundItem>
      rows={items}
      columns={cols}
      rowKey={(r) => String(r.id)}
      loading={loading}
      skeletonRows={6}
      page={page}
      totalPages={totalPages}
      total={rounds?.total ?? 0}
      onPageChange={onPageChange}
      pagerLabel={t("admin.table.pager", lang)}
      minWidth={680}
      emptyNode={
        <div className="empty-state">
          <div className="icon-plate">孔</div>
          <div className="state-title">{t("admin.games.emptyRounds", lang)}</div>
        </div>
      }
    />
  );
}
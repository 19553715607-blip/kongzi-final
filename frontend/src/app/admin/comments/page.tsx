"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminComment,
  getAdminComments,
  getAdminCommentsStats,
  patchAdminComment,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type { AdminCommentItem, AdminCommentsListResp, AdminCommentsStatsResp } from "@/lib/types";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { ConfirmDialog, Drawer, Field, inputCls } from "../_components/adminUi";
import DataTable, { type Column } from "../_components/DataTable";
import { CountUp, Reveal } from "@/lib/motion";

const PAGE_SIZE = 20;

export default function AdminCommentsPage() {
  const [lang] = useLang();
  const [stats, setStats] = useState<AdminCommentsStatsResp | null>(null);
  const [data, setData] = useState<AdminCommentsListResp | null>(null);

  const [status, setStatus] = useState("");
  const [targetType, setTargetType] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  // 编辑内容抽屉
  const [editing, setEditing] = useState<AdminCommentItem | null>(null);
  const [editContent, setEditContent] = useState("");
  // 硬删确认
  const [deleting, setDeleting] = useState<AdminCommentItem | null>(null);

  const refreshStats = useCallback(() => {
    getAdminCommentsStats().then(setStats).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getAdminComments({
      status: status || undefined,
      target_type: targetType || undefined,
      q: q || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then(setData)
      .catch(() => {
        setErr(t("adm.loadFail", lang));
        setData({ items: [], total: 0 });
      })
      .finally(() => setLoading(false));
  }, [status, targetType, q, page, lang]);

  useEffect(() => {
    setErr("");
    refreshStats();
  }, [refreshStats]);
  useEffect(load, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const toggleStatus = async (c: AdminCommentItem) => {
    const next = c.status === "hidden" ? "visible" : "hidden";
    setBusy(c.id);
    try {
      await patchAdminComment(c.id, { status: next });
      toast(t("admin.common.saved", lang), "ok");
      load();
      refreshStats();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    setBusy(editing.id);
    try {
      await patchAdminComment(editing.id, { content: editContent });
      toast(t("admin.common.saved", lang), "ok");
      setEditing(null);
      load();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      await deleteAdminComment(deleting.id);
      toast(t("admin.common.saved", lang), "ok");
      setDeleting(null);
      load();
      refreshStats();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const byTargetEntries = Object.entries(stats?.by_target ?? {});

  const cols: Column<AdminCommentItem>[] = [
    {
      key: "author",
      header: t("admin.comments.col.author", lang),
      sortable: true,
      sortValue: (c) => c.author_name || "",
      render: (c) => <span className="font-medium text-fg">{c.author_name || "—"}</span>,
    },
    {
      key: "content",
      header: t("admin.comments.col.content", lang),
      render: (c) => (
        <span className="block max-w-[360px] truncate text-muted" title={c.content}>
          {c.content || "—"}
        </span>
      ),
    },
    {
      key: "target",
      header: t("admin.comments.col.target", lang),
      render: (c) => (
        <span className="text-muted">
          {c.target_type}
          {c.target_id != null ? `:${c.target_id}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: t("admin.comments.col.status", lang),
      sortable: true,
      sortValue: (c) => c.status || "",
      render: (c) =>
        c.status === "hidden" ? (
          <span className="badge badge-muted">{t("admin.comments.status.hidden", lang)}</span>
        ) : (
          <span className="badge badge-cel">{t("admin.comments.status.visible", lang)}</span>
        ),
    },
    {
      key: "likes",
      header: t("admin.comments.col.likes", lang),
      sortable: true,
      sortValue: (c) => c.likes ?? 0,
      align: "right",
      render: (c) => <span className="tabular-nums">{c.likes ?? 0}</span>,
    },
    {
      key: "reports",
      header: t("admin.comments.col.reports", lang),
      sortable: true,
      sortValue: (c) => c.report_count ?? 0,
      align: "right",
      render: (c) => (
        <span className={`tabular-nums ${(c.report_count ?? 0) > 0 ? "text-accent" : ""}`}>
          {c.report_count ?? 0}
        </span>
      ),
    },
    {
      key: "time",
      header: t("admin.comments.col.time", lang),
      sortable: true,
      sortValue: (c) => c.created_at || "",
      render: (c) => (
        <span className="text-muted tabular-nums">
          {(c.created_at || "").replace("T", " ").slice(0, 16)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("admin.common.actions", lang),
      render: (c) => (
        <div className="flex flex-wrap items-center gap-1">
          {c.status === "hidden" ? (
            <TactileButton
              variant="ghost"
              className="xs"
              disabled={busy === c.id}
              onClick={() => toggleStatus(c)}
            >
              {t("admin.comments.action.approve", lang)}
            </TactileButton>
          ) : (
            <TactileButton
              variant="ghost"
              className="xs"
              disabled={busy === c.id}
              onClick={() => toggleStatus(c)}
            >
              {t("admin.comments.action.hide", lang)}
            </TactileButton>
          )}
          <TactileButton
            variant="ghost"
            className="xs"
            disabled={busy === c.id}
            onClick={() => {
              setEditing(c);
              setEditContent(c.content || "");
            }}
          >
            {t("admin.common.edit", lang)}
          </TactileButton>
          <TactileButton
            variant="ghost"
            className="xs text-accent"
            disabled={busy === c.id}
            onClick={() => setDeleting(c)}
          >
            {t("admin.common.delete", lang)}
          </TactileButton>
        </div>
      ),
    },
  ];

  if (err) {
    return (
      <div className="error-state">
        <div className="icon-plate">孔</div>
        <div className="state-title">{t("state.error.title", lang)}</div>
        <div className="state-sub">{t("state.error.sub", lang)}</div>
        <TactileButton variant="accent" className="sm" onClick={load}>
          {t("state.retry", lang)}
        </TactileButton>
      </div>
    );
  }

  const statCards = [
    { label: t("admin.comments.stat.total", lang), value: stats?.total },
    { label: t("admin.comments.stat.visible", lang), value: stats?.visible },
    { label: t("admin.comments.stat.hidden", lang), value: stats?.hidden },
    { label: t("admin.comments.stat.todayNew", lang), value: stats?.today_new },
  ];

  return (
    <div className="space-y-4">
      {/* 统计卡 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <div className="card-hover rounded-xl border border-line bg-surface p-3">
              <div className="font-serif text-[10px] tracking-wide text-muted">{s.label}</div>
              <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                {s.value == null ? (
                  <div className="skeleton h-6 w-12" />
                ) : (
                  <CountUp value={s.value} />
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* 各对象分布 */}
      {byTargetEntries.length > 0 && (
        <Reveal delay={120}>
          <div className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">
              {t("admin.comments.stat.byTarget", lang)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {byTargetEntries.map(([k, v]) => (
                <span key={k} className="badge badge-muted">
                  {k} · {v}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* 筛选栏 */}
      <Reveal delay={160}>
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder={t("admin.common.search", lang)}
            className="min-w-40 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs"
            aria-label={t("admin.comments.filter.status", lang)}
          >
            <option value="">{t("admin.comments.filter.all", lang)}</option>
            <option value="visible">{t("admin.comments.filter.visible", lang)}</option>
            <option value="hidden">{t("admin.comments.filter.hidden", lang)}</option>
          </select>
          <input
            value={targetType}
            onChange={(e) => {
              setPage(1);
              setTargetType(e.target.value);
            }}
            placeholder={t("admin.comments.filter.targetType", lang)}
            className="w-32 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs"
          />
        </section>
      </Reveal>

      {/* 列表 */}
      <Reveal delay={200}>
        <DataTable<AdminCommentItem>
          rows={data?.items ?? []}
          columns={cols}
          rowKey={(c) => String(c.id)}
          loading={loading}
          page={page}
          totalPages={totalPages}
          total={data?.total ?? 0}
          onPageChange={setPage}
          pagerLabel={t("admin.table.pager", lang)}
          minWidth={980}
          emptyNode={
            <div className="empty-state">
              <div className="icon-plate">孔</div>
              <div className="state-title">{t("state.empty.title", lang)}</div>
              <div className="state-sub">{t("state.empty.sub", lang)}</div>
            </div>
          }
        />
      </Reveal>

      {/* 编辑内容抽屉 */}
      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t("admin.comments.edit.title", lang)}
      >
        {editing && (
          <div className="space-y-3">
            <div className="text-xs text-muted">
              {editing.author_name || "—"} · {editing.target_type}
              {editing.target_id != null ? `:${editing.target_id}` : ""}
            </div>
            <Field label={t("admin.comments.edit.content", lang)}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className={`${inputCls} resize-y`}
                autoFocus
              />
            </Field>
            <div className="flex justify-end gap-2">
              <TactileButton variant="ghost" className="sm" onClick={() => setEditing(null)}>
                {t("admin.common.cancel", lang)}
              </TactileButton>
              <TactileButton
                variant="accent"
                className="sm"
                onClick={submitEdit}
                disabled={busy === editing.id || !editContent.trim()}
              >
                {t("admin.common.save", lang)}
              </TactileButton>
            </div>
          </div>
        )}
      </Drawer>

      {/* 硬删确认 */}
      <ConfirmDialog
        open={!!deleting}
        title={t("admin.op.dangerTitle", lang)}
        message={t("admin.comments.confirmDelete", lang)}
        confirmLabel={t("admin.common.confirm", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        loading={busy != null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

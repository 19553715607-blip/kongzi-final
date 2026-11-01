"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminUser,
  downloadAdminUsersCsv,
  getAdminUserActivity,
  getAdminUsers,
  getMe,
  patchAdminUser,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AdminUserActivityResp,
  AdminUserItem,
  AdminUserListResp,
  AuthUser,
} from "@/lib/types";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { ConfirmDialog, Drawer, Field, Modal, inputCls } from "../_components/adminUi";
import DataTable, { type Column } from "../_components/DataTable";

const PAGE_SIZE = 20;

type PendingAction =
  | { kind: "delete"; user: AdminUserItem }
  | { kind: "demote"; user: AdminUserItem }
  | { kind: "ban"; user: AdminUserItem }
  | null;

export default function AdminUsersPage() {
  const [lang] = useLang();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [data, setData] = useState<AdminUserListResp | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // 抽屉详情
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);
  const [activity, setActivity] = useState<AdminUserActivityResp | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // 编辑显示名弹窗
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null);
  const [editName, setEditName] = useState("");

  // 危险操作确认
  const [pending, setPending] = useState<PendingAction>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    getAdminUsers({
      page,
      page_size: PAGE_SIZE,
      q: q || undefined,
      kind: kind || undefined,
      lang: langFilter || undefined,
      country: country || undefined,
    })
      .then(setData)
      .catch(() => setData({ total: 0, page, page_size: PAGE_SIZE, items: [] }))
      .finally(() => setLoading(false));
  }, [page, q, kind, langFilter, country]);

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (!detailUser) return;
    setActivityLoading(true);
    setActivity(null);
    getAdminUserActivity(detailUser.id)
      .then(setActivity)
      .catch(() => toast(t("admin.common.failed", lang), "err"))
      .finally(() => setActivityLoading(false));
  }, [detailUser, lang]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const isSelf = (u: AdminUserItem) => me?.id === u.id;

  const runPatch = async (u: AdminUserItem, body: Parameters<typeof patchAdminUser>[1]) => {
    setBusy(u.id);
    try {
      await patchAdminUser(u.id, body);
      toast(t("admin.common.saved", lang), "ok");
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

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

  const handleConfirm = async () => {
    if (!pending) return;
    const u = pending.user;
    setBusy(u.id);
    try {
      if (pending.kind === "delete") {
        await deleteAdminUser(u.id);
        toast(t("admin.common.saved", lang), "ok");
        setDetailUser((d) => (d?.id === u.id ? null : d));
      } else if (pending.kind === "demote") {
        await patchAdminUser(u.id, { is_admin: false });
        toast(t("admin.common.saved", lang), "ok");
      } else if (pending.kind === "ban") {
        await patchAdminUser(u.id, { is_banned: true });
        toast(t("admin.common.saved", lang), "ok");
      }
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
      setPending(null);
    }
  };

  const submitEditName = async () => {
    if (!editUser || !editName.trim()) return;
    setBusy(editUser.id);
    try {
      await patchAdminUser(editUser.id, { display_name: editName.trim() });
      toast(t("admin.common.saved", lang), "ok");
      setEditUser(null);
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const cols: Column<AdminUserItem>[] = [
    {
      key: "name",
      header: t("admin.col.name", lang),
      sortable: true,
      sortValue: (u) => u.display_name,
      render: (u) => (
        <span className="font-medium text-fg">
          {u.display_name}
          {isSelf(u) && <span className="ms-1 badge badge-gold">me</span>}
        </span>
      ),
    },
    { key: "email", header: t("admin.col.email", lang), render: (u) => <span className="text-muted">{u.email || "—"}</span> },
    {
      key: "guest",
      header: t("admin.col.guest", lang),
      render: (u) =>
        u.is_guest ? (
          <span className="badge badge-gold">{t("admin.table.yes", lang)}</span>
        ) : (
          <span className="badge badge-muted">{t("admin.table.no", lang)}</span>
        ),
    },
    {
      key: "admin",
      header: t("admin.col.admin", lang),
      render: (u) =>
        u.is_admin ? (
          <span className="badge badge-accent">{t("admin.table.yes", lang)}</span>
        ) : (
          <span className="badge badge-muted">{t("admin.table.no", lang)}</span>
        ),
    },
    { key: "lang", header: t("admin.col.lang", lang), render: (u) => u.lang || "—" },
    { key: "country", header: t("admin.col.country", lang), render: (u) => u.signup_country || "—" },
    {
      key: "xp",
      header: t("admin.col.xp", lang),
      sortable: true,
      sortValue: (u) => u.xp ?? 0,
      align: "right",
      render: (u) => <span className="tabular-nums">{u.xp?.toLocaleString?.() ?? 0}</span>,
    },
    {
      key: "streak",
      header: t("admin.col.streak", lang),
      sortable: true,
      sortValue: (u) => u.streak_days,
      align: "right",
      render: (u) => <span className="tabular-nums">{u.streak_days}</span>,
    },
    {
      key: "signup",
      header: t("admin.col.signup", lang),
      sortable: true,
      sortValue: (u) => u.created_at || "",
      render: (u) => <span className="text-muted tabular-nums">{(u.created_at || "").slice(0, 10)}</span>,
    },
    {
      key: "lastCheckin",
      header: t("admin.col.lastCheckin", lang),
      sortable: true,
      sortValue: (u) => u.last_checkin || "",
      render: (u) => <span className="text-muted tabular-nums">{(u.last_checkin || "").slice(0, 10)}</span>,
    },
    {
      key: "actions",
      header: t("admin.common.actions", lang),
      render: (u) => (
        <div className="flex flex-wrap items-center gap-1">
          <TactileButton variant="ghost" className="xs" onClick={() => setDetailUser(u)}>
            {t("admin.user.detail", lang)}
          </TactileButton>
          <TactileButton
            variant="ghost"
            className="xs"
            disabled={busy === u.id || isSelf(u)}
            onClick={() => {
              setEditUser(u);
              setEditName(u.display_name);
            }}
          >
            {t("admin.user.editName", lang)}
          </TactileButton>
          {u.is_admin ? (
            <TactileButton
              variant="ghost"
              className="xs"
              disabled={busy === u.id || isSelf(u)}
              onClick={() => setPending({ kind: "demote", user: u })}
            >
              {t("admin.user.revokeAdmin", lang)}
            </TactileButton>
          ) : (
            <TactileButton
              variant="ghost"
              className="xs"
              disabled={busy === u.id || isSelf(u)}
              onClick={() => runPatch(u, { is_admin: true })}
            >
              {t("admin.user.makeAdmin", lang)}
            </TactileButton>
          )}
          <TactileButton
            variant="ghost"
            className="xs"
            disabled={busy === u.id || isSelf(u)}
            onClick={() => runPatch(u, { is_banned: !((u as { is_banned?: boolean }).is_banned) })}
          >
            {((u as { is_banned?: boolean }).is_banned)
              ? t("admin.user.unban", lang)
              : t("admin.user.ban", lang)}
          </TactileButton>
          <TactileButton
            variant="ghost"
            className="xs text-accent"
            disabled={busy === u.id || isSelf(u)}
            onClick={() => setPending({ kind: "delete", user: u })}
          >
            {t("admin.user.delete", lang)}
          </TactileButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* 顶部操作 */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={t("admin.table.search", lang)}
          className="min-w-40 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
        />
        <select
          value={kind}
          onChange={(e) => {
            setPage(1);
            setKind(e.target.value);
          }}
          className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs"
        >
          <option value="">{t("admin.table.kindAll", lang)}</option>
          <option value="registered">{t("admin.table.kindRegistered", lang)}</option>
          <option value="guest">{t("admin.table.kindGuest", lang)}</option>
        </select>
        <input
          value={langFilter}
          onChange={(e) => {
            setPage(1);
            setLangFilter(e.target.value);
          }}
          placeholder={t("admin.table.lang", lang)}
          className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs"
        />
        <input
          value={country}
          onChange={(e) => {
            setPage(1);
            setCountry(e.target.value);
          }}
          placeholder={t("admin.table.country", lang)}
          className="w-24 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs"
        />
        <TactileButton
          variant="cel"
          className="sm ms-auto"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? t("admin.user.exporting", lang) : t("admin.user.exportCsv", lang)}
        </TactileButton>
      </section>

      {/* 统一表格 */}
      <DataTable<AdminUserItem>
        rows={data?.items ?? []}
        columns={cols}
        rowKey={(u) => u.id}
        loading={loading}
        selectable
        page={page}
        totalPages={totalPages}
        total={data?.total ?? 0}
        onPageChange={setPage}
        pagerLabel={t("admin.table.pager", lang)}
        minWidth={980}
      />

      {/* 详情抽屉 */}
      <Drawer
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title={detailUser ? `${detailUser.display_name} · ${t("admin.user.activity", lang)}` : ""}
      >
        {detailUser && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-surface-2/40 p-2">
                <div className="text-[10px] text-muted">{t("admin.user.act.games", lang)}</div>
                <div className="font-serif text-base text-fg tabular-nums">
                  {activity?.summary?.rounds ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/40 p-2">
                <div className="text-[10px] text-muted">{t("admin.user.act.contribs", lang)}</div>
                <div className="font-serif text-base text-fg tabular-nums">
                  {activity?.summary?.contributions ?? "—"}
                </div>
              </div>
            </div>
            {activityLoading && (
              <div className="space-y-2">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            )}
            {!activityLoading && (
              <>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-fg">
                    {t("admin.user.act.recentRounds", lang)}
                  </div>
                  {(activity?.recent_rounds ?? []).length === 0 && (
                    <div className="text-faint">{t("admin.user.act.none", lang)}</div>
                  )}
                  {(activity?.recent_rounds ?? []).map((r, i) => (
                    <div key={i} className="flex justify-between rounded-md bg-surface-2/40 px-2 py-1">
                      <span className="text-muted">{r.game ?? "—"}</span>
                      <span className="tabular-nums text-fg">{r.score ?? 0}</span>
                      <span className="text-faint">{(r.created_at ?? "").slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-fg">
                    {t("admin.user.act.recentContribs", lang)}
                  </div>
                  {(activity?.recent_contributions ?? []).length === 0 && (
                    <div className="text-faint">{t("admin.user.act.none", lang)}</div>
                  )}
                  {(activity?.recent_contributions ?? []).map((c, i) => (
                    <div key={i} className="flex justify-between gap-2 rounded-md bg-surface-2/40 px-2 py-1">
                      <span className="truncate text-muted">{c.headline ?? "—"}</span>
                      <span className="text-faint">{c.status ?? ""}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* 编辑显示名弹窗 */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={t("admin.user.editName", lang)}
      >
        <div className="space-y-3">
          <Field label={t("admin.user.newName", lang)}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <TactileButton variant="ghost" className="sm" onClick={() => setEditUser(null)}>
              {t("admin.common.cancel", lang)}
            </TactileButton>
            <TactileButton variant="accent" className="sm" onClick={submitEditName} disabled={!editName.trim()}>
              {t("admin.common.save", lang)}
            </TactileButton>
          </div>
        </div>
      </Modal>

      {/* 危险操作二次确认 */}
      <ConfirmDialog
        open={!!pending}
        title={t("admin.op.dangerTitle", lang)}
        message={
          pending?.kind === "delete"
            ? t("admin.user.confirmDelete", lang).replace("{name}", pending.user.display_name)
            : pending?.kind === "demote"
              ? t("admin.user.confirmDemote", lang).replace("{name}", pending.user.display_name)
              : pending?.kind === "ban"
                ? t("admin.user.confirmBan", lang).replace("{name}", pending.user.display_name)
                : ""
        }
        confirmLabel={t("admin.common.confirm", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        loading={!!busy}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createInstitution,
  deleteInstitution,
  getInstitutionUsage,
  getMe,
  issueKey,
  listInstitutions,
  patchInstitution,
  revokeInstitutionKey,
  updateInstitution,
} from "@/lib/api";
import type {
  AuthUser,
  InstitutionAdminItem,
  InstitutionUsageResp,
} from "@/lib/types";
import { t, useLang } from "@/lib/i18n";
import { CountUp, Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { ConfirmDialog, Drawer, Field, Modal, inputCls } from "../_components/adminUi";

const STATUS = ["pending", "approved", "suspended", "rejected"] as const;

const STATUS_KEYS: Record<string, string> = {
  pending: "st.draft",
  approved: "st.approved",
  suspended: "st.paused",
  rejected: "st.rejected",
};

function statusBadge(status: string): string {
  switch (status) {
    case "approved":
      return "badge-cel";
    case "pending":
      return "badge-accent";
    default:
      return "badge-muted";
  }
}

const emptyForm = { name: "", country: "", contact_email: "", purpose: "", monthly_quota: 10000 };

export default function AdminInstitutionsPage() {
  const [lang] = useLang();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [all, setAll] = useState<InstitutionAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<{ inst: number; key: string } | null>(null);

  // 新建 / 编辑弹窗
  const [formOpen, setFormOpen] = useState<{ item: InstitutionAdminItem | null } | null>(null);
  const [form, setForm] = useState(emptyForm);
  // 删除 / 吊销确认
  const [confirmDel, setConfirmDel] = useState<InstitutionAdminItem | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InstitutionAdminItem | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState("");
  // 用量抽屉
  const [usageInst, setUsageInst] = useState<InstitutionAdminItem | null>(null);
  const [usage, setUsage] = useState<InstitutionUsageResp | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    listInstitutions()
      .then((d) => {
        setAll(d);
        setErr("");
      })
      .catch(() => setErr(t("adm.loadFail", lang)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
  }, []);
  useEffect(() => {
    if (me?.is_admin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (!usageInst) return;
    setUsageLoading(true);
    setUsage(null);
    getInstitutionUsage(usageInst.id)
      .then(setUsage)
      .catch(() => toast(t("admin.common.failed", lang), "err"))
      .finally(() => setUsageLoading(false));
  }, [usageInst]);

  const update = async (id: number, body: { status?: string; monthly_quota?: number }) => {
    setBusy(id);
    try {
      await updateInstitution(id, body);
      toast(t("admin.common.saved", lang), "ok");
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const issue = async (id: number) => {
    setBusy(id);
    try {
      const r = await issueKey(id);
      setNewKey({ inst: id, key: r.key });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen({ item: null });
  };
  const openEdit = (i: InstitutionAdminItem) => {
    setForm({
      name: i.name,
      country: i.country,
      contact_email: i.contact_email,
      purpose: i.purpose,
      monthly_quota: i.monthly_quota,
    });
    setFormOpen({ item: i });
  };

  const submitForm = async () => {
    if (!formOpen) return;
    setBusy(formOpen.item?.id ?? -1);
    try {
      if (formOpen.item) {
        await patchInstitution(formOpen.item.id, form);
      } else {
        await createInstitution(form);
      }
      toast(t("admin.common.saved", lang), "ok");
      setFormOpen(null);
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    setBusy(confirmDel.id);
    try {
      await deleteInstitution(confirmDel.id);
      toast(t("admin.common.saved", lang), "ok");
      setConfirmDel(null);
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const doRevoke = async () => {
    if (!revokeTarget || !revokeKeyId) return;
    setBusy(revokeTarget.id);
    try {
      await revokeInstitutionKey(Number(revokeKeyId));
      toast(t("admin.common.saved", lang), "ok");
      setRevokeTarget(null);
      setRevokeKeyId("");
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  if (!me)
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-3">
            <div className="skeleton mb-2 h-3 w-16" />
            <div className="skeleton h-6 w-12" />
          </div>
        ))}
      </div>
    );

  if (!me.is_admin)
    return (
      <div className="card-hover rounded-2xl border border-line bg-surface p-6">
        <div className="mb-2 text-sm font-medium text-fg">{t("adm.noPerm", lang)}</div>
        <p className="text-xs text-muted">
          {t("adm.granted", lang)}
          {t("adm.granted2", lang)}
        </p>
        {me.is_guest ? (
          <Link
            href="/login"
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
          >
            {t("adm.loginAsAdmin", lang)}
          </Link>
        ) : (
          <div className="mt-3 text-xs text-muted">
            {t("adm.currentAccount", lang).replace("{email}", me.email ?? "")}
            {t("adm.applyHint2", lang)}
          </div>
        )}
      </div>
    );

  if (err)
    return (
      <div className="error-state">
        <div className="icon-plate">断</div>
        <div className="state-title">{t("state.error.title", lang)}</div>
        <div className="state-sub">{err}</div>
        <TactileButton
          variant="ghost"
          className="sm"
          onClick={() => {
            setErr("");
            refresh();
          }}
        >
          {t("state.retry", lang)}
        </TactileButton>
      </div>
    );

  const countOf = (v: string) =>
    v === "" ? all.length : all.filter((i) => i.status === v).length;

  const cards: [string, string][] = [
    ["adm.all", ""],
    ["st.draft", "pending"],
    ["st.approved", "approved"],
    ["st.paused", "suspended"],
    ["st.rejected", "rejected"],
  ];

  const filtered = filter ? all.filter((i) => i.status === filter) : all;

  return (
    <div className="space-y-4">
      {/* 新 key 一次性提示 */}
      {newKey && (
        <Reveal>
          <div className="card-hover rounded-xl border border-gold bg-accent-soft p-3 text-sm">
            <div className="mb-1 text-xs text-accent">{t("inst.newKeyOnce", lang).replace("{id}", String(newKey.inst))}</div>
            <code className="break-all font-mono text-accent-ink">{newKey.key}</code>
            <TactileButton
              variant="ghost"
              className="xs ms-3"
              onClick={() => {
                navigator.clipboard?.writeText(newKey.key);
                setNewKey(null);
              }}
            >
              {t("inst.copyClose", lang)}
            </TactileButton>
          </div>
        </Reveal>
      )}

      {/* 顶部：新建机构 */}
      <section className="flex items-center justify-between gap-2">
        <div className="text-xs text-faint">{t("admin.inst.empty", lang)}</div>
        <TactileButton variant="accent" className="sm" onClick={openCreate}>
          {t("admin.inst.new", lang)}
        </TactileButton>
      </section>

      {/* 统计 + 过滤 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {loading &&
          cards.map(([labelKey, val], i) => (
            <div key={val} className="rounded-xl border border-line bg-surface p-3" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="skeleton mb-2 h-3 w-16" />
              <div className="skeleton h-6 w-12" />
            </div>
          ))}
        {!loading &&
          cards.map(([labelKey, val], i) => (
            <Reveal key={val} delay={i * 60}>
              <button
                onClick={() => setFilter(val)}
                className={`card-hover w-full rounded-xl border px-3 py-2 text-xs ${
                  filter === val
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-muted"
                }`}
              >
                <div className="text-[10px] opacity-80">{t(labelKey, lang)}</div>
                <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                  <CountUp value={countOf(val)} />
                </div>
              </button>
            </Reveal>
          ))}
      </section>

      <div className="ornament-rule" aria-hidden>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>

      {/* 列表 */}
      <section className="space-y-2">
        {loading &&
          Array.from({ length: 3 }).map((_, r) => (
            <div key={`sk-${r}`} className="rounded-xl border border-line bg-surface p-3" style={{ animationDelay: `${r * 60}ms` }}>
              <div className="skeleton mb-2 h-4 w-1/3 max-w-[220px]" />
              <div className="skeleton h-3 w-1/2 max-w-[320px]" />
            </div>
          ))}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface">
            <div className="empty-state">
              <div className="icon-plate">孔</div>
              <div className="state-title">{t("state.empty.title", lang)}</div>
              <div className="state-sub">{t("inst.empty", lang)}</div>
            </div>
          </div>
        )}

        {!loading &&
          filtered.map((i, idx) => (
            <div key={i.id} style={{ animationDelay: `${idx * 40}ms` }} className="row-in card-hover rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-faint tabular-nums">#{i.id}</span>
                <div className="flex-1">
                  <div className="font-serif text-sm text-fg">
                    {i.name} <span className="text-xs text-faint">· {i.country || "—"}</span>
                  </div>
                  <div className="text-[10px] text-faint">
                    {i.contact_email} ·{" "}
                    <span className="tabular-nums">
                      {t("inst.quotaInline", lang).replace("{q}", i.monthly_quota.toLocaleString()).replace("{k}", String(i.key_count))}
                    </span>
                    {i.purpose && <> · {i.purpose}</>}
                  </div>
                </div>
                <span className={`badge ${statusBadge(i.status)}`}>
                  {t(STATUS_KEYS[i.status], lang) ?? i.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-faint">{t("inst.changeStatus", lang)}</span>
                {STATUS.map((s) => (
                  <TactileButton
                    key={s}
                    variant={i.status === s ? "accent" : "ghost"}
                    className="xs"
                    disabled={busy === i.id || i.status === s}
                    onClick={() => update(i.id, { status: s })}
                  >
                    {t(STATUS_KEYS[s], lang) ?? s}
                  </TactileButton>
                ))}
                <span className="mx-1 h-4 w-px bg-line" />
                <input
                  type="number"
                  defaultValue={i.monthly_quota}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (n && n !== i.monthly_quota) update(i.id, { monthly_quota: n });
                  }}
                  className="w-24 rounded border border-line bg-surface-2 px-2 py-0.5 text-[10px] tabular-nums"
                />
                <span className="text-[10px] text-faint">{t("inst.quota", lang)}</span>
                <TactileButton
                  variant="accent"
                  className="xs"
                  disabled={busy === i.id || i.status !== "approved"}
                  onClick={() => issue(i.id)}
                >
                  {t("inst.newKey", lang)}
                </TactileButton>
                <span className="mx-1 h-4 w-px bg-line" />
                <TactileButton variant="ghost" className="xs" disabled={busy === i.id} onClick={() => openEdit(i)}>
                  {t("admin.inst.edit", lang)}
                </TactileButton>
                <TactileButton variant="ghost" className="xs" disabled={busy === i.id} onClick={() => setUsageInst(i)}>
                  {t("admin.inst.usage", lang)}
                </TactileButton>
                <TactileButton variant="ghost" className="xs" disabled={busy === i.id} onClick={() => { setRevokeKeyId(""); setRevokeTarget(i); }}>
                  {t("admin.inst.revokeKey", lang)}
                </TactileButton>
                <TactileButton variant="ghost" className="xs text-accent" disabled={busy === i.id} onClick={() => setConfirmDel(i)}>
                  {t("admin.inst.delete", lang)}
                </TactileButton>
              </div>
            </div>
          ))}
      </section>

      {/* 新建/编辑弹窗 */}
      <Modal open={!!formOpen} onClose={() => setFormOpen(null)} title={formOpen?.item ? t("admin.inst.edit", lang) : t("admin.inst.new", lang)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.inst.f.name", lang)}>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("admin.inst.f.country", lang)}>
            <input className={inputCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label={t("admin.inst.f.contact", lang)}>
            <input className={inputCls} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </Field>
          <Field label={t("admin.inst.f.quota", lang)}>
            <input type="number" className={inputCls} value={form.monthly_quota} onChange={(e) => setForm({ ...form, monthly_quota: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("admin.inst.f.purpose", lang)}>
              <textarea className={inputCls} rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <TactileButton variant="ghost" className="sm" onClick={() => setFormOpen(null)}>{t("admin.common.cancel", lang)}</TactileButton>
          <TactileButton variant="accent" className="sm" onClick={submitForm} disabled={!!busy}>{t("admin.common.save", lang)}</TactileButton>
        </div>
      </Modal>

      {/* 用量抽屉 */}
      <Drawer open={!!usageInst} onClose={() => setUsageInst(null)} title={usageInst ? `${usageInst.name} · ${t("admin.inst.usage", lang)}` : ""}>
        {usageLoading && <div className="skeleton h-32 w-full" />}
        {!usageLoading && usage && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              {[
                [t("admin.inst.usedToday", lang), usage.used_today],
                [t("admin.inst.used7d", lang), usage.used_7d],
                [t("admin.inst.usedMonth", lang), usage.used_month],
              ].map(([label, v]) => (
                <div key={label} className="rounded-lg border border-line bg-surface-2/40 p-2 text-center">
                  <div className="font-serif text-base text-fg tabular-nums">{v ?? "—"}</div>
                  <div className="text-[10px] text-muted">{label}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-fg">{t("admin.inst.topPaths", lang)}</div>
              {(usage.top_paths ?? []).length === 0 && <div className="text-faint">{t("admin.inst.noUsage", lang)}</div>}
              {(usage.top_paths ?? []).map((p, i) => (
                <div key={i} className="flex justify-between rounded-md bg-surface-2/40 px-2 py-1">
                  <span className="truncate text-muted">{p.path}</span>
                  <span className="tabular-nums text-fg">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!confirmDel}
        title={t("admin.op.dangerTitle", lang)}
        message={t("admin.inst.confirmDelete", lang).replace("{name}", confirmDel?.name ?? "")}
        confirmLabel={t("admin.common.delete", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        loading={!!busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />

      {/* 吊销 Key 弹窗 */}
      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title={t("admin.inst.revokeKey", lang)}>
        <div className="space-y-3">
          <p className="text-xs text-muted">{t("admin.inst.confirmRevoke", lang)}</p>
          <Field label="Key ID">
            <input className={inputCls} value={revokeKeyId} onChange={(e) => setRevokeKeyId(e.target.value)} inputMode="numeric" />
          </Field>
          <div className="flex justify-end gap-2">
            <TactileButton variant="ghost" className="sm" onClick={() => setRevokeTarget(null)}>{t("admin.common.cancel", lang)}</TactileButton>
            <TactileButton variant="ghost" className="sm text-accent" onClick={doRevoke} disabled={!revokeKeyId || !!busy}>{t("admin.common.confirm", lang)}</TactileButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

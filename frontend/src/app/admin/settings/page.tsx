"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminSettings, getAuditLog, putAdminSettings } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type { AuditLogItem, SettingsKV } from "@/lib/types";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { Field, inputCls } from "../_components/adminUi";

export default function AdminSettingsPage() {
  const [lang] = useLang();
  const [notice, setNotice] = useState("");
  const [modeName, setModeName] = useState("");
  const [kvText, setKvText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const LOG_PAGE_SIZE = 30;

  useEffect(() => {
    getAdminSettings()
      .then((s) => {
        setNotice(String(s.site_notice ?? s.notice ?? ""));
        setModeName(String(s.mode_name ?? s.mode ?? ""));
        const { site_notice, notice, mode_name, mode, ...rest } = s as SettingsKV & {
          site_notice?: unknown; notice?: unknown; mode_name?: unknown; mode?: unknown;
        };
        setKvText(JSON.stringify(rest ?? {}, null, 2));
      })
      .catch(() => toast(t("admin.common.failed", lang), "err"))
      .finally(() => setLoading(false));
  }, [lang]);

  const loadLogs = useCallback(() => {
    setLogLoading(true);
    getAuditLog({ page: logPage, page_size: LOG_PAGE_SIZE })
      .then((d) => {
        setLogs(d.items ?? []);
        setLogTotal(d.total ?? 0);
      })
      .catch(() => setLogs([]))
      .finally(() => setLogLoading(false));
  }, [logPage]);
  useEffect(loadLogs, [loadLogs]);

  const save = async () => {
    let rest: SettingsKV = {};
    try {
      rest = kvText.trim() ? JSON.parse(kvText) : {};
    } catch {
      toast(t("admin.settings.invalidJson", lang), "err");
      return;
    }
    setSaving(true);
    try {
      await putAdminSettings({
        ...rest,
        site_notice: notice,
        mode_name: modeName,
      });
      toast(t("admin.settings.saved", lang), "ok");
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="skeleton mb-2 h-4 w-40" />
          <div className="skeleton h-20 w-full" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="skeleton mb-2 h-4 w-40" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 站点设置 */}
      <Reveal>
        <section className="card-hover rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 text-sm font-medium text-fg">{t("admin.settings.title", lang)}</div>
          <div className="grid gap-3">
            <Field label={t("admin.settings.siteNotice", lang)}>
              <textarea
                className={inputCls}
                rows={2}
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
              />
            </Field>
            <Field label={t("admin.settings.modeName", lang)}>
              <input
                className={inputCls}
                value={modeName}
                onChange={(e) => setModeName(e.target.value)}
              />
            </Field>
            <Field label={t("admin.settings.features", lang)} hint={t("admin.settings.kvHint", lang)}>
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={8}
                value={kvText}
                onChange={(e) => setKvText(e.target.value)}
                dir="ltr"
              />
            </Field>
            <div className="flex justify-end">
              <TactileButton variant="accent" className="sm" onClick={save} disabled={saving}>
                {saving ? t("admin.common.loading", lang) : t("admin.common.save", lang)}
              </TactileButton>
            </div>
          </div>
        </section>
      </Reveal>

      {/* 审计日志 */}
      <Reveal delay={100}>
        <section className="card-hover rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-fg">{t("admin.settings.audit", lang)}</div>
            <div className="flex items-center gap-2">
              <TactileButton variant="ghost" className="xs" onClick={loadLogs}>
                {t("state.retry", lang)}
              </TactileButton>
              <TactileButton variant="ghost" className="xs" disabled={logPage <= 1 || logLoading} onClick={() => setLogPage((p) => Math.max(1, p - 1))}>
                {t("admin.settings.auditPrev", lang)}
              </TactileButton>
              <span className="text-[11px] text-faint tabular-nums">
                {logPage} / {Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE))}
              </span>
              <TactileButton variant="ghost" className="xs" disabled={logPage * LOG_PAGE_SIZE >= logTotal || logLoading} onClick={() => setLogPage((p) => p + 1)}>
                {t("admin.settings.auditNext", lang)}
              </TactileButton>
            </div>
          </div>
          {logLoading && <div className="skeleton h-40 w-full" />}
          {!logLoading && logs.length === 0 && (
            <div className="empty-state">
              <div className="icon-plate">孔</div>
              <div className="state-title">{t("state.empty.title", lang)}</div>
              <div className="state-sub">{t("admin.common.emptyList", lang)}</div>
            </div>
          )}
          {!logLoading && logs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="border-b border-line bg-surface-2/50 text-[10px] uppercase tracking-tight text-muted">
                  <tr>
                    <th className="px-3 py-2">{t("admin.settings.col.actor", lang)}</th>
                    <th className="px-3 py-2">{t("admin.settings.col.action", lang)}</th>
                    <th className="px-3 py-2">{t("admin.settings.col.target", lang)}</th>
                    <th className="px-3 py-2">{t("admin.settings.col.when", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={l.id ?? i} className="border-b border-line/60 hover:bg-surface-2/40">
                      <td className="px-3 py-2 text-fg">{l.actor || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="badge badge-accent">{l.action || "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-muted">{l.target || "—"}</td>
                      <td className="px-3 py-2 text-muted tabular-nums">
                        {(l.created_at ?? "").slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}

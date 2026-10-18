"use client";

import * as echarts from "echarts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminContent,
  createPassageAnnotation,
  createPassageTranslation,
  deleteAdminContent,
  deleteAnnotation,
  deleteTranslation,
  getAdminAnalyticsContent,
  listAdminContent,
  listPassageAnnotations,
  listPassageTranslations,
  patchAdminContent,
  patchAnnotation,
  patchTranslation,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AdminAnnotationItem,
  AdminContentItem,
  AdminContentKind,
  AdminContentResp,
  AdminTranslationItem,
} from "@/lib/types";
import Chart, {
  ADMIN_PALETTE,
  chartTextColors,
  useDark,
} from "../_components/Chart";
import { CountUp, Reveal } from "@/lib/motion";
import { ProvenanceCaption, TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { ConfirmDialog, Field, Modal, inputCls } from "../_components/adminUi";

const TABS: AdminContentKind[] = ["books", "chapters", "passages", "concepts"];

type EditState = { kind: AdminContentKind; item: AdminContentItem | null } | null;

export default function AdminContentPage() {
  const [lang] = useLang();
  const dark = useDark();
  const [data, setData] = useState<AdminContentResp | null>(null);

  // 管理区
  const [tab, setTab] = useState<AdminContentKind>("books");
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | number | null>(null);
  const [selected, setSelected] = useState<AdminContentItem | null>(null);
  const [edit, setEdit] = useState<EditState>(null);
  const [form, setForm] = useState<{ id: string; title: string; source: string; version: string; accession: string; era: string; parentId: string; originalText: string; published: boolean }>({
    id: "", title: "", source: "", version: "", accession: "", era: "", parentId: "", originalText: "", published: false,
  });
  const [confirmDel, setConfirmDel] = useState<AdminContentItem | null>(null);

  // 段落译文/注译
  const [translations, setTranslations] = useState<AdminTranslationItem[]>([]);
  const [annotations, setAnnotations] = useState<AdminAnnotationItem[]>([]);
  const [subBusy, setSubBusy] = useState<number | null>(null);
  const [transForm, setTransForm] = useState<AdminTranslationItem | null>(null);
  const [annotForm, setAnnotForm] = useState<AdminAnnotationItem | null>(null);

  useEffect(() => {
    getAdminAnalyticsContent().then(setData).catch(() => {});
  }, []);

  const loadItems = useCallback(() => {
    setLoading(true);
    listAdminContent(tab, { page_size: 50 })
      .then((d) => setItems(d.items ?? []))
      .catch(() => {
        setItems([]);
        toast(t("admin.common.failed", lang), "err");
      })
      .finally(() => setLoading(false));
  }, [tab, lang]);

  useEffect(loadItems, [loadItems]);

  useEffect(() => {
    if (!selected) return;
    setTranslations([]);
    setAnnotations([]);
    listPassageTranslations(selected.id)
      .then(setTranslations)
      .catch(() => {});
    listPassageAnnotations(selected.id)
      .then(setAnnotations)
      .catch(() => {});
  }, [selected]);

  const colors = chartTextColors(dark);

  const transOpt = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: 44, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: "category",
      data: (data?.translations_by_lang ?? []).map((d) => d.lang),
      axisLabel: { color: colors.muted, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.line } },
    },
    yAxis: { type: "value", axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.split } } },
    series: [{ type: "bar", data: (data?.translations_by_lang ?? []).map((d) => d.count), itemStyle: { color: ADMIN_PALETTE[1] } }],
  }), [data, colors]);

  const annotOpt = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: 44, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: "category",
      data: (data?.annotations_by_lang ?? []).map((d) => d.lang),
      axisLabel: { color: colors.muted, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.line } },
    },
    yAxis: { type: "value", axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.split } } },
    series: [{ type: "bar", data: (data?.annotations_by_lang ?? []).map((d) => d.count), itemStyle: { color: ADMIN_PALETTE[4] } }],
  }), [data, colors]);

  // ── 写操作 ──
  const openCreate = () => {
    setEdit({ kind: tab, item: null });
    setForm({ id: "", title: "", source: "", version: "", accession: "", era: "", parentId: "", originalText: "", published: false });
  };
  const openEdit = (item: AdminContentItem) => {
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    setEdit({ kind: tab, item });
    setForm({
      id: String(item.id ?? ""),
      title: item.title || item.title_zh || item.ref_label || String(item.zh ?? ""),
      source: String(meta.source ?? ""),
      version: String(meta.version ?? ""),
      accession: String(meta.accession ?? ""),
      era: String(meta.era ?? ""),
      parentId: String(item.chapter_id ?? item.book_id ?? ""),
      originalText: String(item.original_text ?? ""),
      published: !!item.is_published,
    });
  };

  const submitForm = async () => {
    if (!edit) return;
    const meta: Record<string, unknown> = {
      source: form.source, version: form.version, accession: form.accession,
    };
    if (form.era) meta.era = form.era;
    const body: Record<string, unknown> = { is_published: form.published, meta };
    // 与后端模型字段名对齐：books/chapters=title_zh, concepts=zh, passages=ref_label
    if (edit.kind === "books") {
      body.title_zh = form.title;
      if (form.era) body.era = form.era;
    } else if (edit.kind === "chapters") {
      body.title_zh = form.title;
    } else if (edit.kind === "concepts") {
      body.zh = form.title;
    } else {
      body.ref_label = form.title;
    }
    if (!edit.item) {
      // 新建：后端要求 id；chapters 需 book_id，passages 需 chapter_id + original_text
      body.id = form.id.trim();
      if (edit.kind === "chapters") body.book_id = form.parentId.trim();
      if (edit.kind === "passages") {
        body.chapter_id = form.parentId.trim();
        body.original_text = form.originalText;
      }
    }
    setBusy(edit.item?.id ?? "new");
    try {
      if (edit.item) await patchAdminContent(edit.kind, edit.item.id, body);
      else await createAdminContent(edit.kind, body);
      toast(t("admin.common.saved", lang), "ok");
      setEdit(null);
      loadItems();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const togglePublish = async (item: AdminContentItem) => {
    setBusy(item.id);
    try {
      await patchAdminContent(tab, item.id, { is_published: !item.is_published });
      toast(t("admin.common.saved", lang), "ok");
      loadItems();
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
      await deleteAdminContent(tab, confirmDel.id);
      toast(t("admin.common.saved", lang), "ok");
      if (selected?.id === confirmDel.id) setSelected(null);
      setConfirmDel(null);
      loadItems();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  const saveTranslation = async () => {
    if (!transForm || !selected) return;
    setSubBusy(transForm.id ?? -1);
    const body = { lang: transForm.lang, text: transForm.text, translator: transForm.translator };
    try {
      if (transForm.id) await patchTranslation(transForm.id, body);
      else await createPassageTranslation(selected.id, body);
      toast(t("admin.common.saved", lang), "ok");
      setTransForm(null);
      listPassageTranslations(selected.id).then(setTranslations).catch(() => {});
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setSubBusy(null);
    }
  };

  const saveAnnotation = async () => {
    if (!annotForm || !selected) return;
    setSubBusy(annotForm.id ?? -1);
    const body = { type: annotForm.type, lang: annotForm.lang, content: annotForm.content, source: annotForm.source };
    try {
      if (annotForm.id) await patchAnnotation(annotForm.id, body);
      else await createPassageAnnotation(selected.id, body);
      toast(t("admin.common.saved", lang), "ok");
      setAnnotForm(null);
      listPassageAnnotations(selected.id).then(setAnnotations).catch(() => {});
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setSubBusy(null);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="skeleton mb-2 h-6 w-20" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </section>
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

  const cards: [string, number][] = [
    ["admin.content.passages", data.passages ?? 0],
    ["admin.content.concepts", data.concepts ?? 0],
    ["admin.content.topics", data.topics ?? 0],
    [
      "admin.content.translations",
      data.translations_by_lang?.reduce((s, d) => s + d.count, 0) ?? 0,
    ],
    [
      "admin.content.annotations",
      data.annotations_by_lang?.reduce((s, d) => s + d.count, 0) ?? 0,
    ],
  ];

  return (
    <div className="space-y-4">
      {/* ── 既有分析（保留）── */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cards.map(([label, v], i) => (
          <Reveal key={label} delay={i * 60}>
            <div className="card-hover rounded-xl border border-line bg-surface p-3 text-center">
              <div className="font-serif text-xl text-fg tabular-nums">
                <CountUp value={v} />
              </div>
              <div className="mt-0.5 text-[10px] text-muted">{t(label, lang)}</div>
            </div>
          </Reveal>
        ))}
      </section>

      <Reveal delay={200}>
        <ProvenanceCaption
          items={[
            { label: t("admin.prov.lang", lang), value: "zh · en · fr · es · ar" },
            { label: t("admin.prov.version", lang), value: "v1.0" },
            { label: t("admin.prov.catalog", lang), value: "CAT-01" },
            { label: t("admin.prov.snapshot", lang), value: String(new Date().getFullYear()) },
            { label: t("admin.prov.pd", lang), value: "✓", pd: true },
          ]}
        />
      </Reveal>

      {data.cases && (
        <Reveal delay={120}>
          <section className="rounded-2xl border border-line bg-surface p-3">
            <div className="mb-3 text-xs font-medium text-fg">{t("admin.content.casesTitle", lang)}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ["admin.eng.pending", data.cases.draft, "badge-accent"],
                ["admin.eng.published", data.cases.published, "badge-cel"],
                ["admin.eng.reviewed", data.cases.reviewed, "badge-gold"],
                ["admin.eng.rejected", data.cases.rejected, "badge-muted"],
              ] as [string, number, string][]).map(([label, v, cls]) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface-2/40 p-3 text-center">
                  <span className={`badge ${cls}`}>{t(label, lang)}</span>
                  <span className="font-serif text-lg text-fg tabular-nums">
                    <CountUp value={v} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <div className="ornament-rule" aria-hidden>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Reveal delay={80}>
          <div className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">{t("admin.chart.transByLang", lang)}</div>
            <Chart option={transOpt} height={280} />
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="card-hover rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">{t("admin.chart.annotByLang", lang)}</div>
            <Chart option={annotOpt} height={280} />
          </div>
        </Reveal>
      </section>

      {/* ── 内容管理（新增）── */}
      <section className="card-hover rounded-2xl border border-line bg-surface p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {TABS.map((k) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k);
                  setSelected(null);
                }}
                className={`pressable rounded-full px-3 py-1 text-xs ${
                  tab === k ? "bg-accent text-white" : "border border-line text-muted"
                }`}
              >
                {t(`admin.content.tab.${k}`, lang)}
              </button>
            ))}
          </div>
          <TactileButton variant="accent" className="sm ms-auto" onClick={openCreate}>
            {t("admin.content.newItem", lang)}
          </TactileButton>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-line bg-surface-2/50 text-[10px] uppercase tracking-tight text-muted">
              <tr>
                <th className="px-3 py-2">{t("admin.content.f.title", lang)}</th>
                <th className="px-3 py-2">{t("admin.content.f.published", lang)}</th>
                <th className="px-3 py-2 text-end">{t("admin.common.actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r} className="border-b border-line/40">
                    <td colSpan={3} className="px-3 py-2.5"><div className="skeleton h-3.5 w-1/2" /></td>
                  </tr>
                ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={3}>
                  <div className="empty-state">
                    <div className="icon-plate">孔</div>
                    <div className="state-title">{t("admin.common.emptyList", lang)}</div>
                  </div>
                </td></tr>
              )}
              {!loading &&
                items.map((it) => (
                  <tr key={String(it.id)} className={`border-b border-line/60 ${selected?.id === it.id ? "bg-surface-2/50" : ""}`}>
                    <td className="px-3 py-2">
                      <button
                        className="text-fg hover:text-accent"
                        onClick={() => tab === "passages" ? setSelected(it) : undefined}
                      >
                        {it.title || it.title_zh || String(it.id)}
                      </button>
                      {tab === "passages" && (
                        <span className="ms-1 text-[10px] text-faint">{t("admin.content.selectPassage", lang)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {it.is_published ? (
                        <span className="badge badge-cel">{t("admin.content.publishedBadge", lang)}</span>
                      ) : (
                        <span className="badge badge-muted">{t("admin.content.draftBadge", lang)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <TactileButton variant="ghost" className="xs" disabled={busy === it.id} onClick={() => openEdit(it)}>
                          {t("admin.common.edit", lang)}
                        </TactileButton>
                        <TactileButton variant="ghost" className="xs" disabled={busy === it.id} onClick={() => togglePublish(it)}>
                          {it.is_published ? t("admin.content.unpublish", lang) : t("admin.content.publish", lang)}
                        </TactileButton>
                        <TactileButton variant="ghost" className="xs text-accent" disabled={busy === it.id} onClick={() => setConfirmDel(it)}>
                          {t("admin.common.delete", lang)}
                        </TactileButton>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 段落译文/注译 */}
        {selected && tab === "passages" && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface-2/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium text-fg">{t("admin.content.translations", lang)}</div>
                <TactileButton variant="cel" className="xs" onClick={() => setTransForm({ id: 0, lang: "en", text: "" })}>
                  {t("admin.content.newTranslation", lang)}
                </TactileButton>
              </div>
              {translations.length === 0 && <div className="text-[11px] text-faint">{t("admin.common.emptyList", lang)}</div>}
              {translations.map((tr) => (
                <div key={tr.id} className="mb-1.5 rounded-lg border border-line bg-surface p-2">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-accent">{tr.lang}</span>
                    <div className="flex gap-1">
                      <button className="text-[11px] text-muted hover:text-fg" onClick={() => setTransForm(tr)}>{t("admin.common.edit", lang)}</button>
                      <button className="text-[11px] text-accent" onClick={async () => {
                        setSubBusy(tr.id);
                        try { await deleteTranslation(tr.id); toast(t("admin.common.saved", lang), "ok"); listPassageTranslations(selected.id).then(setTranslations).catch(() => {}); }
                        catch { toast(t("admin.common.failed", lang), "err"); }
                        finally { setSubBusy(null); }
                      }}>{t("admin.common.delete", lang)}</button>
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-muted">{tr.text}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-surface-2/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium text-fg">{t("admin.content.annotations", lang)}</div>
                <TactileButton variant="cel" className="xs" onClick={() => setAnnotForm({ id: 0, type: "classical", lang: "zh", content: "" })}>
                  {t("admin.content.newAnnotation", lang)}
                </TactileButton>
              </div>
              {annotations.length === 0 && <div className="text-[11px] text-faint">{t("admin.common.emptyList", lang)}</div>}
              {annotations.map((an) => (
                <div key={an.id} className="mb-1.5 rounded-lg border border-line bg-surface p-2">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-gold">{an.type}</span>
                    <div className="flex gap-1">
                      <button className="text-[11px] text-muted hover:text-fg" onClick={() => setAnnotForm(an)}>{t("admin.common.edit", lang)}</button>
                      <button className="text-[11px] text-accent" onClick={async () => {
                        setSubBusy(an.id);
                        try { await deleteAnnotation(an.id); toast(t("admin.common.saved", lang), "ok"); listPassageAnnotations(selected.id).then(setAnnotations).catch(() => {}); }
                        catch { toast(t("admin.common.failed", lang), "err"); }
                        finally { setSubBusy(null); }
                      }}>{t("admin.common.delete", lang)}</button>
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-muted">{an.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "passages" && selected && (
          <p className="mt-2 text-[10px] text-faint">{t("admin.content.cascadeHint", lang)}</p>
        )}
      </section>

      {/* 新建/编辑内容弹窗 */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.item ? t("admin.content.editItem", lang) : t("admin.content.newItem", lang)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.content.f.id", lang)} hint={edit?.item ? undefined : t("admin.content.f.idHint", lang)}>
            <input className={inputCls} value={form.id} disabled={!!edit?.item} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="guanzi.chengma.1" />
          </Field>
          <Field label={t("admin.content.f.title", lang)}>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          {!edit?.item && edit?.kind === "chapters" && (
            <Field label={t("admin.content.f.bookId", lang)}>
              <input className={inputCls} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} placeholder="guanzi" />
            </Field>
          )}
          {!edit?.item && edit?.kind === "passages" && (
            <Field label={t("admin.content.f.chapterId", lang)}>
              <input className={inputCls} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} placeholder="chengma" />
            </Field>
          )}
          <Field label={t("admin.content.f.source", lang)}>
            <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </Field>
          <Field label={t("admin.content.f.version", lang)}>
            <input className={inputCls} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </Field>
          <Field label={t("admin.content.f.accession", lang)}>
            <input className={inputCls} value={form.accession} onChange={(e) => setForm({ ...form, accession: e.target.value })} />
          </Field>
          {edit?.kind === "books" && (
            <Field label={t("admin.content.f.era", lang)}>
              <input className={inputCls} value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })} />
            </Field>
          )}
          {!edit?.item && edit?.kind === "passages" && (
            <div className="sm:col-span-2">
              <Field label={t("admin.content.f.originalText", lang)}>
                <textarea className={inputCls} rows={3} value={form.originalText} onChange={(e) => setForm({ ...form, originalText: e.target.value })} />
              </Field>
            </div>
          )}
          <label className="flex items-end gap-2 pb-2 text-xs text-muted">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            {t("admin.content.f.published", lang)}
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <TactileButton variant="ghost" className="sm" onClick={() => setEdit(null)}>{t("admin.common.cancel", lang)}</TactileButton>
          <TactileButton
            variant="accent"
            className="sm"
            onClick={submitForm}
            disabled={busy === edit?.item?.id || busy === "new" || (!!edit && !edit.item && (!form.id.trim() || !form.title.trim() || (edit.kind === "chapters" && !form.parentId.trim()) || (edit.kind === "passages" && (!form.parentId.trim() || !form.originalText.trim()))))}
          >
            {t("admin.common.save", lang)}
          </TactileButton>
        </div>
      </Modal>

      {/* 译文编辑弹窗 */}
      <Modal open={!!transForm} onClose={() => setTransForm(null)} title={transForm?.id ? t("admin.content.translations", lang) : t("admin.content.newTranslation", lang)}>
        <div className="space-y-3">
          <Field label={t("admin.content.f.lang", lang)}>
            <input className={inputCls} value={transForm?.lang ?? ""} onChange={(e) => setTransForm((f) => f && { ...f, lang: e.target.value })} />
          </Field>
          <Field label={t("admin.content.f.text", lang)}>
            <textarea className={inputCls} rows={4} value={transForm?.text ?? ""} onChange={(e) => setTransForm((f) => f && { ...f, text: e.target.value })} />
          </Field>
          <Field label={t("admin.content.f.translator", lang)}>
            <input className={inputCls} value={transForm?.translator ?? ""} onChange={(e) => setTransForm((f) => f && { ...f, translator: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <TactileButton variant="ghost" className="sm" onClick={() => setTransForm(null)}>{t("admin.common.cancel", lang)}</TactileButton>
            <TactileButton variant="accent" className="sm" onClick={saveTranslation} disabled={!!subBusy}>{t("admin.common.save", lang)}</TactileButton>
          </div>
        </div>
      </Modal>

      {/* 注译编辑弹窗 */}
      <Modal open={!!annotForm} onClose={() => setAnnotForm(null)} title={annotForm?.id ? t("admin.content.annotations", lang) : t("admin.content.newAnnotation", lang)}>
        <div className="space-y-3">
          <Field label={t("admin.content.f.type", lang)}>
            <select className={inputCls} value={annotForm?.type ?? "classical"} onChange={(e) => setAnnotForm((f) => f && { ...f, type: e.target.value })}>
              <option value="classical">classical</option>
              <option value="modern">modern</option>
              <option value="word">word</option>
            </select>
          </Field>
          <Field label={t("admin.content.f.lang", lang)}>
            <input className={inputCls} value={annotForm?.lang ?? ""} onChange={(e) => setAnnotForm((f) => f && { ...f, lang: e.target.value })} />
          </Field>
          <Field label={t("admin.content.f.text", lang)}>
            <textarea className={inputCls} rows={4} value={annotForm?.content ?? ""} onChange={(e) => setAnnotForm((f) => f && { ...f, content: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <TactileButton variant="ghost" className="sm" onClick={() => setAnnotForm(null)}>{t("admin.common.cancel", lang)}</TactileButton>
            <TactileButton variant="accent" className="sm" onClick={saveAnnotation} disabled={!!subBusy}>{t("admin.common.save", lang)}</TactileButton>
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!confirmDel}
        title={t("admin.op.dangerTitle", lang)}
        message={t("admin.content.confirmDelete", lang).replace("{title}", confirmDel?.title || confirmDel?.title_zh || String(confirmDel?.id ?? ""))}
        confirmLabel={t("admin.common.delete", lang)}
        cancelLabel={t("admin.common.cancel", lang)}
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

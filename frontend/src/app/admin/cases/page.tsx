"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCaseStats,
  getCases,
  getMe,
  getTopics,
  reviewCase,
  reviewCaseWorkflow,
} from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import type {
  AuthUser,
  CaseBrief,
  CaseStats,
  TopicBrief,
} from "@/lib/types";
import { CountUp, Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import { toast } from "@/components/Toast";
import { Field, Modal, inputCls } from "../_components/adminUi";

// 状态标签移入 lib/i18n，这里只保留 key
const STATUS_KEYS: Record<string, string> = {
  draft: "st.draft",
  reviewed: "st.reviewed",
  published: "st.published",
  rejected: "st.deprecated",
  approved: "admin.cases.st.approved",
  needs_revision: "admin.cases.st.needsRevision",
};

// 状态徽章配色（与管理端徽章体系一致）：
// 朱砂=待审，鎏金=已审，青绿=已发布/通过，灰=废弃/拒绝
function statusBadge(status: string): string {
  switch (status) {
    case "published":
    case "approved":
      return "badge-cel";
    case "reviewed":
      return "badge-gold";
    case "draft":
      return "badge-accent";
    case "needs_revision":
      return "badge-gold";
    default:
      return "badge-muted";
  }
}

export default function AdminCasesPage() {
  const [lang] = useLang();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [review, setReview] = useState<string>("");  // "" | unreviewed | stamped | rated
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CaseBrief[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [reviewTarget, setReviewTarget] = useState<{ c: CaseBrief; status: "approved" | "rejected" | "needs_revision" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const refresh = () => {
    setLoading(true);
    getCases({
      topic_id: topicId || undefined,
      status,
      review: review || undefined,
      page,
      page_size: 10,
    })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setErr("");
      })
      .catch(() => setErr(t("adm.loadFail", lang)))
      .finally(() => setLoading(false));
    getCaseStats().then(setStats).catch(() => {});
  };

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
    getTopics().then(setTopics).catch(() => {});
  }, []);
  useEffect(refresh, [topicId, status, review, page]);

  const update = async (
    id: number,
    body: { status?: string; quality?: number; review_note?: string },
  ) => {
    setBusy(id);
    try {
      await reviewCase(id, body);
      refresh();
    } finally {
      setBusy(null);
    }
  };

  // 新审核工作流：通过 / 驳回 / 需修改（PATCH /cases/{id}/review）
  const submitWorkflow = async () => {
    if (!reviewTarget) return;
    const { c, status } = reviewTarget;
    setBusy(c.id);
    try {
      await reviewCaseWorkflow(c.id, { status, reviewer_note: reviewNote || undefined });
      toast(t("admin.cases.reviewDone", lang), "ok");
      setReviewTarget(null);
      setReviewNote("");
      refresh();
    } catch {
      toast(t("admin.common.failed", lang), "err");
    } finally {
      setBusy(null);
    }
  };

  if (!me)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="skeleton mb-2 h-3 w-16" />
              <div className="skeleton h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    );

  if (!me.is_admin)
    return (
      <div className="space-y-3">
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
              {t("adm.applyHint", lang)}
            </div>
          )}
        </div>
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

  return (
    <div className="space-y-4">
      {/* 统计 — 议题分布 */}
      {stats && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(stats.by_topic).map(([id, tp], i) => (
            <Reveal key={id} delay={i * 60}>
              <div className="card-hover rounded-xl border border-line bg-surface p-3">
                <div className="truncate text-[10px] text-muted" title={tp.name}>
                  {tp.name}
                </div>
                <div className="mt-0.5 font-serif text-xl text-fg tabular-nums">
                  <CountUp value={tp.total} />
                </div>
                <div className="text-[10px] text-faint tabular-nums">
                  {t("adm.publishedCount", lang).replace(
                    "{n}",
                    String(tp.by_status.published || 0),
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      {/* 审核质量分布 — 暴露 AI 一键盖章 与 真正人审 的区别 */}
      {stats?.review_quality && (
        <Reveal>
          <section className="card-hover rounded-xl border border-line bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-fg">
              {(() => {
                const [before, after] = t("adm.qualityDist", lang).split("{n}");
                return (
                  <>
                    {before}
                    <span className="font-serif text-base text-accent tabular-nums">
                      <CountUp value={stats.total} />
                    </span>
                    {after}
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <QualityCell
                label={t("adm.audit.none", lang)}
                value={stats.review_quality.unreviewed}
                color="#888"
                hint={t("adm.audit.noneDesc", lang)}
              />
              <QualityCell
                label={t("adm.audit.ai", lang)}
                value={stats.review_quality.stamped}
                color="#854F0B"
                hint={t("adm.audit.aiDesc", lang)}
              />
              <QualityCell
                label={t("adm.audit.human", lang)}
                value={stats.review_quality.rated}
                color="#0F6E56"
                hint={t("adm.audit.humanDesc", lang)}
              />
            </div>
            <p className="mt-2 text-[10px] text-faint">
              {t("adm.audit.warn", lang)}
            </p>
          </section>
        </Reveal>
      )}

      <div className="ornament-rule" aria-hidden>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>

      {/* 筛选 */}
      <Reveal>
        <section className="rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-faint">{t("adm.topic", lang)}</span>
            <button
              onClick={() => {
                setTopicId(null);
                setPage(1);
              }}
              className={`pressable rounded-full px-2.5 py-1 text-xs ${
                topicId === null ? "bg-accent text-white" : "border border-line text-muted"
              }`}
            >
              {t("adm.all", lang)}
            </button>
            {topics.map((tp) => (
              <button
                key={tp.id}
                onClick={() => {
                  setTopicId(tp.id);
                  setPage(1);
                }}
                className={`pressable rounded-full px-2.5 py-1 text-xs ${
                  topicId === tp.id ? "text-white" : "border border-line text-muted"
                }`}
                style={topicId === tp.id ? { background: tp.color } : undefined}
              >
                {tp.name}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-line" />
            <span className="text-xs text-faint">{t("adm.status", lang)}</span>
            {["draft", "reviewed", "published"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`pressable rounded-full px-2.5 py-1 text-xs ${
                  status === s ? "bg-accent-soft text-accent" : "bg-surface-2 text-faint"
                }`}
              >
                {t(STATUS_KEYS[s], lang)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-faint">{t("adm.quality", lang)}</span>
            {[
              { v: "", key: "adm.all" },
              { v: "unreviewed", key: "adm.audit.none" },
              { v: "stamped", key: "adm.audit.ai" },
              { v: "rated", key: "adm.audit.human" },
            ].map((r) => (
              <button
                key={r.v}
                onClick={() => {
                  setReview(r.v);
                  setPage(1);
                }}
                className={`pressable rounded-full px-2.5 py-1 text-xs ${
                  review === r.v ? "bg-accent text-white" : "border border-line text-muted"
                }`}
              >
                {t(r.key, lang)}
              </button>
            ))}
          </div>
        </section>
      </Reveal>

      {/* 案例行 */}
      <section className="space-y-2">
        {loading &&
          Array.from({ length: 3 }).map((_, r) => (
            <div
              key={`sk-${r}`}
              className="rounded-xl border border-line bg-surface p-3"
              style={{ animationDelay: `${r * 60}ms` }}
            >
              <div className="skeleton mb-2 h-4 w-3/4 max-w-[420px]" />
              <div className="flex gap-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface">
            <div className="empty-state">
              <div className="icon-plate">孔</div>
              <div className="state-title">{t("state.empty.title", lang)}</div>
              <div className="state-sub">{t("adm.empty", lang)}</div>
            </div>
          </div>
        )}

        {!loading &&
          items.map((c, idx) => (
            <div
              key={c.id}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="row-in card-hover rounded-xl border border-line bg-surface p-3"
            >
              <div className="mb-1 flex items-start gap-2">
                <span className="text-[10px] text-faint tabular-nums">#{c.id}</span>
                <Link
                  href={`/cases/${c.id}`}
                  target="_blank"
                  className="flex-1 font-serif text-sm text-fg hover:text-accent"
                >
                  {c.question}
                </Link>
                <span className={`badge ${statusBadge(c.status)}`}>
                  {t(STATUS_KEYS[c.status], lang) ?? c.status}
                </span>
              </div>
              {/* 审核来源徽章行：AI 协助 + 审核状态 + reviewer */}
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                {c.ai_generated && (
                  <span
                    className="badge badge-muted"
                    title={t("adm.aiHint", lang)}
                  >
                    {t("adm.aiAssist", lang)}
                  </span>
                )}
                <ReviewBadge c={c} />
                {c.reviewer && (
                  <span className="text-[10px] text-faint">
                    {t("case.reviewer", lang)}{c.reviewer}
                    {c.reviewed_at && ` · ${c.reviewed_at.slice(0, 10)}`}
                  </span>
                )}
                {c.review_note && (
                  <span
                    className="badge badge-cel"
                    title={c.review_note}
                  >
                    {t("adm.note", lang)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-faint">{t("adm.qualityLabel", lang)}</span>
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    disabled={busy === c.id}
                    onClick={() => update(c.id, { quality: q })}
                    className={`pressable text-sm ${
                      q <= c.quality ? "text-amber-500" : "text-faint"
                    }`}
                    title={t("adm.stars", lang).replace("{n}", String(q))}
                  >
                    ★
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-line" />
                <TactileButton
                  variant="cel"
                  className="xs"
                  disabled={busy === c.id || c.status === "published"}
                  onClick={() => update(c.id, { status: "published" })}
                >
                  {t("adm.publish", lang)}
                </TactileButton>
                <TactileButton
                  variant="ghost"
                  className="xs"
                  disabled={busy === c.id || c.status === "rejected"}
                  onClick={() => update(c.id, { status: "rejected" })}
                >
                  {t("adm.deprecate", lang)}
                </TactileButton>
                {c.status !== "draft" && (
                  <TactileButton
                    variant="ghost"
                    className="xs"
                    disabled={busy === c.id}
                    onClick={() => update(c.id, { status: "draft" })}
                  >
                    {t("adm.withdraw", lang)}
                  </TactileButton>
                )}
                <span className="mx-1 h-4 w-px bg-line" />
                <TactileButton
                  variant="cel"
                  className="xs"
                  disabled={busy === c.id || c.status === "approved"}
                  onClick={() => { setReviewNote(c.review_note ?? ""); setReviewTarget({ c, status: "approved" }); }}
                >
                  {t("admin.cases.approve", lang)}
                </TactileButton>
                <TactileButton
                  variant="ghost"
                  className="xs text-amber-600"
                  disabled={busy === c.id}
                  onClick={() => { setReviewNote(c.review_note ?? ""); setReviewTarget({ c, status: "needs_revision" }); }}
                >
                  {t("admin.cases.needsRevision", lang)}
                </TactileButton>
                <TactileButton
                  variant="ghost"
                  className="xs text-accent"
                  disabled={busy === c.id || c.status === "rejected"}
                  onClick={() => { setReviewNote(c.review_note ?? ""); setReviewTarget({ c, status: "rejected" }); }}
                >
                  {t("admin.cases.reject", lang)}
                </TactileButton>
              </div>
            </div>
          ))}
      </section>

      {/* 分页 */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-xs">
          <TactileButton
            variant="ghost"
            className="xs"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t("adm.prev", lang)}
          </TactileButton>
          <span className="text-faint tabular-nums">
            {t("cases.pager", lang)
              .replace("{p}", String(page))
              .replace("{tp}", String(Math.max(1, Math.ceil(total / 10))))
              .replace("{n}", String(total))}
          </span>
          <TactileButton
            variant="ghost"
            className="xs"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 10 >= total}
          >
            {t("adm.next", lang)}
          </TactileButton>
        </div>
      )}

      {/* 审核工作流弹窗（带备注） */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={
          reviewTarget?.status === "approved"
            ? t("admin.cases.approve", lang)
            : reviewTarget?.status === "rejected"
              ? t("admin.cases.reject", lang)
              : t("admin.cases.needsRevision", lang)
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-muted">
            <span className="text-fg">{reviewTarget?.c.question}</span>
          </div>
          <Field label={t("admin.cases.reviewNote", lang)}>
            <textarea
              className={inputCls}
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={t("admin.op.reason", lang)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <TactileButton variant="ghost" className="sm" onClick={() => setReviewTarget(null)}>
              {t("admin.common.cancel", lang)}
            </TactileButton>
            <TactileButton variant="accent" className="sm" onClick={submitWorkflow} disabled={!!busy}>
              {t("admin.common.confirm", lang)}
            </TactileButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function QualityCell({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  hint: string;
}) {
  return (
    <div
      className="card-hover rounded-lg border border-line bg-surface-2/30 p-2"
      title={hint}
    >
      <div className="font-serif text-xl tabular-nums" style={{ color }}>
        <CountUp value={value} />
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function ReviewBadge({ c }: { c: CaseBrief }) {
  const [lang] = useLang();
  // 三态：完全未审 / AI 一键盖章 / 已人审
  if (!c.reviewer) {
    return (
      <span
        className="badge badge-muted"
        title={t("adm.noReviewer", lang)}
      >
        {t("adm.badge.none", lang)}
      </span>
    );
  }
  const hasNote = c.review_note && c.review_note.trim().length > 0;
  if (c.quality > 0 || hasNote) {
    return (
      <span
        className="badge badge-cel"
        title={t("adm.humanDesc", lang)}
      >
        {t("adm.badge.human", lang)}
      </span>
    );
  }
  return (
    <span
      className="badge badge-gold"
      title={t("adm.aiDesc2", lang)}
    >
      {t("adm.badge.ai", lang)}
    </span>
  );
}

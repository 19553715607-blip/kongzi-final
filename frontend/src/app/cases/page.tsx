"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCaseStats, getCases, getTopics, isAuthError } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal, CountUp } from "@/lib/motion";
import { CollectionCard } from "@/components/museum";
import type { CaseBrief, CaseStats, TopicBrief } from "@/lib/types";

const PAGE_SIZE = 12;

export default function CasesPage() {
  const [lang] = useLang();
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CaseBrief[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getTopics(lang).then(setTopics).catch((e) => setErr(isAuthError(e) ? t("common.loginRequired", lang) : t("cases.noBackend", lang)));
    getCaseStats().then(setStats).catch(() => {});
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    getCases({
      topic_id: topicId || undefined,
      q: q || undefined,
      page,
      page_size: PAGE_SIZE,
      status: "published",
      lang, // 后端按语种取行,缺行时回落中文并本地化问题标题
    })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [topicId, q, page, lang]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (err)
    return (
      <div className="error-state">
        <span className="icon-plate">!</span>
        <div className="state-title">{t("state.error.title", lang)}</div>
        <p className="state-sub">{err}</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* 顶部数据卡 */}
      {stats && (
        <Reveal as="section" delay={0} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <CountUp value={stats.total} className="font-serif text-3xl font-medium leading-none text-fg" />
              <div className="mt-1 text-xs text-faint">{t("cases.kicker", lang)}</div>
            </div>
            <div className="ms-auto text-xs text-faint">
              <CountUp
                value={Object.values(stats.by_topic).reduce(
                  (acc, x) => acc + (x.by_status.published || 0),
                  0,
                )}
              />{" "}
              {t("cases.published", lang)}
            </div>
          </div>
          <div className="ornament-rule my-3">
            <span className="h-1 w-1 rounded-full bg-accent/60" />
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {t("cases.desc1", lang)}
            {t("cases.desc2", lang)}
          </p>
        </Reveal>
      )}

      {/* 议题筛选 + 搜索 */}
      <Reveal as="section" delay={80} className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-faint">{t("cases.topic", lang)}</span>
          <button
            onClick={() => {
              setTopicId(null);
              setPage(1);
            }}
            className={`pressable rounded-full px-2.5 py-1 text-xs ${
              topicId === null ? "bg-accent text-on-accent" : "border border-line text-muted"
            }`}
          >
            {t("cases.all", lang)}
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
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("cases.searchPlaceholder", lang)}
            className="ms-auto w-44 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-fg outline-none focus:border-accent"
          />
        </div>
      </Reveal>

      {/* 列表 */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state rounded-2xl border border-line bg-surface">
          <span className="icon-plate">{t("state.empty.title", lang).charAt(0)}</span>
          <div className="state-title">{t("cases.empty", lang)}</div>
          <p className="state-sub">
            {t("cases.adminGo", lang)}
            <Link href="/admin/cases" className="mx-1 text-accent hover:underline">/admin/cases</Link>
            {t("cases.reviewPublish", lang)}
          </p>
          <p className="state-sub">
            {t("cases.adminGranted", lang)}
            <Link href="/login" className="ms-1 text-accent hover:underline">{t("cases.loginAsAdmin", lang)}</Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => {
            const topic = topics.find((tp) => tp.id === c.topic_id);
            return (
              <Reveal key={c.id} delay={Math.min(i, 8) * 60}>
                <CollectionCard
                  className="h-full text-start"
                  href={`/cases/${c.slug ?? c.id}`}
                  title={c.question}
                  
                  thumb={
                    topic ? (
                      <span
                        className="flex h-full items-center justify-center px-4 text-center font-serif text-sm leading-snug"
                        style={{ background: `${topic.color}1A`, color: topic.color }}
                      >
                        {topic.name}
                      </span>
                    ) : undefined
                  }
                />
              </Reveal>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="pressable rounded-full border border-line px-3 py-1 text-muted disabled:opacity-40"
          >
            {t("cases.prev", lang)}
          </button>
          <span className="text-faint">
            {t("cases.pager", lang)
              .replace("{p}", String(page))
              .replace("{tp}", String(totalPages))
              .replace("{n}", String(total))}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="pressable rounded-full border border-line px-3 py-1 text-muted disabled:opacity-40"
          >
            {t("cases.next", lang)}
          </button>
        </div>
      )}
    </div>
  );
}

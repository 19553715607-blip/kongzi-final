"use client";

import { useEffect, useState } from "react";
import {
  getTopics,
  listContribs,
  myContribs,
  submitContrib,
  voteContrib,
} from "@/lib/api";
import type { Contribution, TopicBrief } from "@/lib/types";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";

// 文明立场名移入 lib/i18n，这里只保留 code 与 key
const CIVS = [
  { code: "confucian", key: "civ.confucian" },
  { code: "christian", key: "civ.christian" },
  { code: "enlightenment", key: "civ.enlightenment" },
  { code: "kantian", key: "civ.kantian" },
  { code: "buddhist", key: "civ.buddhist" },
  { code: "daoist", key: "civ.daoist" },
  { code: "islamic", key: "civ.islamic" },
  { code: "secular_humanism", key: "civ.secular" },
  { code: "other", key: "civ.other" },
];

export default function CoCreatePage() {
  const [lang] = useLang();
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<"score" | "new">("score");
  const [items, setItems] = useState<Contribution[]>([]);
  const [mine, setMine] = useState<Contribution[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    topic_id: "climate",
    civilization: "daoist",
    headline: "",
    detail: "",
  });

  const refresh = () => {
    listContribs({ topic_id: filter || undefined, sort })
      .then((r) => setItems(r.items))
      .catch(() => {});
    myContribs().then(setMine).catch(() => {});
  };

  useEffect(() => {
    getTopics(lang).then(setTopics).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  useEffect(refresh, [filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.headline.trim()) return;
    await submitContrib({
      kind: "cross_civ",
      topic_id: form.topic_id,
      civilization: form.civilization,
      headline: form.headline,
      detail: form.detail,
    });
    setForm({ ...form, headline: "", detail: "" });
    setShowForm(false);
    refresh();
  };

  const vote = async (id: number, v: 1 | -1) => {
    setBusyId(id);
    try {
      await voteContrib(id, v);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <Reveal as="section" delay={0} className="rounded-2xl border border-line bg-accent-soft p-5">
        <div className="text-xs tracking-[0.25em] text-accent">{t("co.kicker", lang)}</div>
        <h1 className="mt-1 font-serif text-xl leading-snug text-accent-ink">
          {t("co.tagline", lang)}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {t("co.intro1", lang)}
          {t("co.intro2", lang)}
        </p>
        <div className="ornament-rule my-3">
          <span className="h-1 w-1 rounded-full bg-accent/60" />
        </div>
        <div className="mt-3 flex gap-2">
          <TactileButton
            variant="accent"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? t("co.collapse", lang) : t("co.submitStance", lang)}
          </TactileButton>
        </div>
      </Reveal>

      {/* 提交表单 */}
      {showForm && (
        <Reveal delay={60}>
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-muted">
                {t("co.topic", lang)}
                <select
                  value={form.topic_id}
                  onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm text-fg"
                >
                  {topics.map((tp) => (
                    <option key={tp.id} value={tp.id}>{tp.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                {t("co.tradition", lang)}
                <select
                  value={form.civilization}
                  onChange={(e) => setForm({ ...form, civilization: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm text-fg"
                >
                  {CIVS.map((c) => (
                    <option key={c.code} value={c.code}>{t(c.key, lang)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs text-muted">
              {t("co.stance", lang)}
              <input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                required
                placeholder={t("co.stancePlaceholder", lang)}
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="block text-xs text-muted">
              {t("co.argument", lang)}
              <textarea
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                rows={3}
                placeholder={t("co.argumentPlaceholder", lang)}
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </label>
            <TactileButton type="submit" variant="accent">
              {t("co.submit", lang)}
            </TactileButton>
          </form>
        </Reveal>
      )}

      {/* 我的贡献 */}
      {mine.length > 0 && (
        <Reveal as="section" delay={100} className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 text-xs text-faint">{t("co.mineN", lang).replace("{n}", String(mine.length))}</div>
          <div className="space-y-1">
            {mine.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  c.status === "published"
                    ? "bg-cel-soft text-cel-ink"
                    : c.status === "pending"
                    ? "bg-surface-2 text-faint"
                    : "bg-accent-soft text-accent"
                }`}>{c.status}</span>
                <span className="truncate text-muted">{c.headline}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* 筛选 + 排序 */}
      <Reveal as="section" delay={140} className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-faint">{t("co.topicPrefix", lang)}</span>
          <button
            onClick={() => setFilter(null)}
            className={`pressable rounded-full px-2.5 py-1 text-xs ${
              filter === null ? "bg-accent text-white" : "border border-line text-muted"
            }`}
          >
            {t("co.all", lang)}
          </button>
          {topics.map((tp) => (
            <button
              key={tp.id}
              onClick={() => setFilter(tp.id)}
              className={`pressable rounded-full px-2.5 py-1 text-xs ${
                filter === tp.id ? "text-white" : "border border-line text-muted"
              }`}
              style={filter === tp.id ? { background: tp.color } : undefined}
            >
              {tp.name}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {(["score", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`pressable rounded-full px-2.5 py-1 text-xs ${
                sort === s ? "bg-accent-soft text-accent" : "bg-surface-2 text-faint"
              }`}
            >
              {s === "score" ? t("co.hot", lang) : t("co.latest", lang)}
            </button>
          ))}
        </div>
      </Reveal>

      {/* 列表 */}
      <section className="space-y-2">
        {items.length === 0 ? (
          <div className="empty-state rounded-2xl border border-line bg-surface">
            <span className="icon-plate">{t("state.empty.title", lang).charAt(0)}</span>
            <div className="state-title">{t("state.empty.title", lang)}</div>
            <p className="state-sub">{t("co.empty", lang)}</p>
          </div>
        ) : (
          items.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i, 8) * 60}>
              <div className="card-hover rounded-xl border border-line bg-surface p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 text-xs">
                    <button
                      disabled={busyId === c.id}
                      onClick={() => vote(c.id, 1)}
                      className="pressable text-faint hover:text-accent disabled:opacity-40"
                    >
                      ▲
                    </button>
                    <span className="font-medium text-fg">{c.score}</span>
                    <button
                      disabled={busyId === c.id}
                      onClick={() => vote(c.id, -1)}
                      className="pressable text-faint hover:text-accent disabled:opacity-40"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-faint">
                      {c.topic_id && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5">
                          {topics.find((tp) => tp.id === c.topic_id)?.name ?? c.topic_id}
                        </span>
                      )}
                      {c.civilization && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5">
                          {(() => {
                            const civ = CIVS.find((x) => x.code === c.civilization);
                            return civ ? t(civ.key, lang) : c.civilization;
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="font-serif text-sm leading-relaxed text-fg">{c.headline}</div>
                    {c.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted">{c.detail}</p>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ))
        )}
      </section>
    </div>
  );
}

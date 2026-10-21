"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCase, getTopics } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { ProvenanceCaption, TactileButton } from "@/components/museum";
import type { CaseDetail, TopicBrief } from "@/lib/types";

const CIV_COLORS: Record<string, string> = {
  confucian: "#993C1D",
  christian: "#7A4B36",
  enlightenment: "#0F6E56",
  kantian: "#534AB7",
  buddhist: "#854F0B",
};

export default function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [lang] = useLang();
  const [c, setC] = useState<CaseDetail | null>(null);
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    getCase(Number(id)).then(setC).catch(() => setC(null));
    getTopics(lang).then(setTopics).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lang]);

  const topic = topics.find((tp) => tp.id === c?.topic_id);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1500);
  };

  const onShare = () => {
    if (!c) return;
    const text = `${c.question}\n\n${c.confucian_answer.split("\n")[0]}\n\n${t("case.shareSign", lang)}`;
    navigator.clipboard?.writeText(text);
    flash(t("case.copied", lang));
  };

  if (!c)
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-32 rounded-lg" />
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );

  return (
    <div className="relative space-y-4">
      {toast && (
        <div className="fixed left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-xs text-white">
          {toast}
        </div>
      )}

      {/* 返回 + 标题 */}
      <Reveal delay={0}>
        <div className="text-xs">
          <Link href="/cases" className="pressable text-faint hover:text-accent">
            {t("case.back", lang)}
          </Link>
        </div>
      </Reveal>

      {/* 议题 + 状态 */}
      <Reveal delay={60}>
        <div className="flex flex-wrap items-center gap-2">
          {topic && (
            <span
              className="rounded-full px-2.5 py-1 text-xs text-white"
              style={{ background: topic.color }}
            >
              {topic.name}
            </span>
          )}
          {c.status !== "published" && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint">
              {c.status === "draft" ? t("case.pending", lang) : c.status === "reviewed" ? t("case.reviewed", lang) : c.status}
            </span>
          )}
          {c.ai_generated && !c.reviewer && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint">
              {t("case.aiAssist", lang)}
            </span>
          )}
          {c.quality > 0 && (
            <span className="text-xs text-amber-500">{"★".repeat(c.quality)}</span>
          )}
          <TactileButton
            variant="ghost"
            onClick={onShare}
            className="ms-auto !rounded-full !px-3 !py-1 !text-xs"
          >
            {t("case.share", lang)}
          </TactileButton>
        </div>
      </Reveal>

      {/* 问题 */}
      <Reveal as="section" delay={100} className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-2 text-xs text-faint">{t("case.question", lang)}</div>
        <h1 className="font-serif text-xl leading-relaxed tracking-wide text-fg">{c.question}</h1>
        <div className="ornament-rule mt-4">
          <span className="h-1 w-1 rounded-full bg-accent/60" />
        </div>
      </Reveal>

      {/* 儒家答案 */}
      <Reveal as="section" delay={160} className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-3 text-xs text-faint">{t("case.reasoning", lang)}</div>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">
          {c.confucian_answer}
        </pre>
      </Reveal>

      {/* 经典依据 */}
      {c.citations.length > 0 && (
        <section className="space-y-2">
          <Reveal delay={200}>
            <div className="text-xs text-faint">{t("case.basis", lang)}</div>
          </Reveal>
          {c.citations.map((cit, i) => (
            <Reveal key={cit.ref_id} delay={220 + i * 60}>
              <Link
                href={`/read?ref=${encodeURIComponent(cit.ref_id)}`}
                className="card-hover block max-w-full rounded-e-lg border-s-[3px] border-accent bg-accent-soft px-3 py-2"
              >
                <div className="font-serif text-[15px] font-medium leading-relaxed tracking-wide text-accent-ink">
                  {cit.text}
                </div>
                <div className="mt-1 text-[10px] text-accent">{cit.ref_label}</div>
                <ProvenanceCaption
                  items={[
                    { label: t("admin.prov.catalog", lang), value: cit.ref_id },
                    { label: t("admin.prov.pd", lang), value: "CC0", pd: true },
                  ]}
                />
              </Link>
            </Reveal>
          ))}
        </section>
      )}

      {/* 跨文明对照 */}
      {c.cross_civ_views.length > 0 && (
        <section>
          <Reveal delay={280}>
            <div className="mb-2 text-xs text-faint">
              {t("cases.crossBanner", lang).replace("{n}", String(c.cross_civ_views.length))}
            </div>
          </Reveal>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {c.cross_civ_views.map((v, i) => {
              const color = CIV_COLORS[v.civilization] ?? "#888";
              return (
                <Reveal key={v.civilization} delay={300 + i * 60}>
                  <div className="card-hover h-full rounded-xl border border-line bg-surface p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 w-6 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-xs font-medium" style={{ color }}>
                        {v.civ_label}
                      </span>
                    </div>
                    <div className="font-serif text-sm leading-relaxed text-fg">
                      {v.headline}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* 审核信息 */}
      {(c.reviewer || c.review_note) && (
        <Reveal as="section" delay={360} className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs text-faint">
          <span>
            {c.reviewer && `${t("case.reviewer", lang)}${c.reviewer}`}
            {c.reviewed_at && ` · ${new Date(c.reviewed_at).toLocaleDateString()}`}
          </span>
          {c.review_note && (
            <div className="mt-1">
              {t("case.note", lang)}
              {c.review_note}
            </div>
          )}
        </Reveal>
      )}
    </div>
  );
}

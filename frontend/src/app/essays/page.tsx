"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPassage } from "@/lib/api";
import { copyText } from "@/lib/ui";
import { toast } from "@/components/Toast";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import type { Passage } from "@/lib/types";

/**
 * 论文起手包:为「下周一要交论文」的欧美学生准备的四组主题对照——
 * 每组 3 句核心章句(实时取语料库,带当前语言译文)+ 1 句西方经典对照 + 一键引用。
 * 章句 id 均为语料库真实编号,点卡片可跳转读经页深读。
 */
type Pack = {
  key: "justice" | "self" | "ritual" | "friendship";
  passageIds: string[];
};

const PACKS: Pack[] = [
  { key: "justice", passageIds: ["lunyu.liren.4.16", "lunyu.yanyuan.12.2", "lunyu.yanyuan.12.7"] },
  { key: "self", passageIds: ["lunyu.xueer.1.1", "lunyu.xueer.1.4", "lunyu.liren.4.17"] },
  { key: "ritual", passageIds: ["lunyu.yanyuan.12.1", "lunyu.bayi.3.3"] },
  { key: "friendship", passageIds: ["lunyu.xueer.1.6", "lunyu.liren.4.17", "lunyu.yanyuan.12.2"] },
];

const ALL_IDS = Array.from(new Set(PACKS.flatMap((p) => p.passageIds)));

export default function EssaysPage() {
  const [lang] = useLang();
  const [passages, setPassages] = useState<Record<string, Passage>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(
      ALL_IDS.map((id) =>
        getPassage(id, lang)
          .then((p) => [id, p] as const)
          .catch(() => [id, null] as const),
      ),
    ).then((pairs) => {
      if (!alive) return;
      const map: Record<string, Passage> = {};
      for (const [id, p] of pairs) if (p) map[id] = p;
      setPassages(map);
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  const citeOne = (p: Passage) =>
    `${p.original_text.slice(0, 24)}… ${p.ref_label ?? ""}. ${t("brand.title", lang)}, 2026, ${location.origin}/read?ref=${p.id}.`;

  const doCitePack = async (pack: Pack) => {
    const lines = pack.passageIds
      .map((id) => passages[id])
      .filter(Boolean)
      .map((p) => citeOne(p));
    if (!lines.length) return;
    const ok = await copyText(lines.join("\n"));
    toast(ok ? t("home.quote.cited", lang) : t("home.quote.copyFail", lang), ok ? "ok" : "err");
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <Reveal>
        <p className="nz-kicker font-garamond text-[0.7rem] uppercase">
          {t("essays.kicker", lang)}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-bold tracking-wide text-fg">
          {t("essays.title", lang)}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {t("essays.lead", lang)}
        </p>
        <Link href="/paths" className="mt-2 inline-block text-xs text-accent underline underline-offset-4">
          {t("essays.allPaths", lang)}
        </Link>
      </Reveal>

      <div className="mt-10 space-y-12">
        {PACKS.map((pack, pi) => (
          <Reveal key={pack.key} delay={pi * 50}>
            <section>
              <div className="mb-4 flex flex-wrap items-baseline gap-3">
                <h2 className="font-serif text-xl font-semibold tracking-wide text-fg">
                  {t(`essays.${pack.key}.title`, lang)}
                </h2>
                <button
                  onClick={() => void doCitePack(pack)}
                  className="pressable ms-auto rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  {t("essays.citeAll", lang)}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {pack.passageIds.map((id) => {
                  const p = passages[id];
                  if (!p) return <div key={id} className="skeleton h-28 rounded-2xl" />;
                  return (
                    <Link
                      key={id}
                      href={`/read?ref=${id}`}
                      className="pressable block rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/50"
                    >
                      <p className="font-serif text-base leading-relaxed text-accent-ink">
                        {p.original_text}
                      </p>
                      {lang !== "zh" && (
                        <p className="mt-2 font-serif text-xs italic leading-relaxed text-muted">
                          {p.translations.find((x) => x.lang === lang)?.text ??
                            p.translations.find((x) => x.lang === "en")?.text}
                        </p>
                      )}
                      <p className="mt-2 text-[10px] tracking-wide text-faint">{p.ref_label}</p>
                    </Link>
                  );
                })}

                {/* 西方对照 */}
                <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-accent">
                    {t("essays.westLabel", lang)}
                  </div>
                  <p className="mt-2 font-serif text-sm italic leading-relaxed text-accent-ink">
                    {t(`essays.${pack.key}.west.quote`, lang)}
                  </p>
                  <p className="mt-2 text-[11px] text-faint">
                    — {t(`essays.${pack.key}.west.src`, lang)}
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

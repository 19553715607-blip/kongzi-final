"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import ChineseBackdrop from "@/components/ChineseBackdrop";

type Step = { href: string; labelKey: string };
type Path = {
  key: string;
  titleKey: string;
  descKey: string;
  glyph: string;
  steps: Step[];
};

// 不重复造内容，只做导航与编排：步骤指向已有 read / graph / chat / journey / cases。
const PATHS: Path[] = [
  {
    key: "analects",
    titleKey: "paths.analects.title",
    descKey: "paths.analects.desc",
    glyph: "论",
    steps: [
      { href: "/read", labelKey: "home.entry.read" },
      { href: "/graph", labelKey: "home.entry.graph" },
      { href: "/chat", labelKey: "home.entry.chat" },
    ],
  },
  {
    key: "lineage",
    titleKey: "paths.lineage.title",
    descKey: "paths.lineage.desc",
    glyph: "儒",
    steps: [
      { href: "/graph", labelKey: "home.entry.graph" },
      { href: "/cases", labelKey: "home.entry.cases" },
      { href: "/read", labelKey: "home.entry.read" },
    ],
  },
  {
    key: "arts",
    titleKey: "paths.arts.title",
    descKey: "paths.arts.desc",
    glyph: "艺",
    steps: [
      { href: "/journey", labelKey: "home.entry.journey" },
      { href: "/journey/shu", labelKey: "jrn.art.shu" },
      { href: "/quiz", labelKey: "nav.quiz" },
    ],
  },
  {
    key: "crossciv",
    titleKey: "paths.crossciv.title",
    descKey: "paths.crossciv.desc",
    glyph: "对",
    steps: [
      { href: "/cases", labelKey: "home.entry.cases" },
      { href: "/chat", labelKey: "home.entry.chat" },
      { href: "/co-create", labelKey: "nav.cocreate" },
    ],
  },
];

export default function PathsPage() {
  const [lang] = useLang();
  return (
    <div className="relative space-y-6">
      <ChineseBackdrop variant="clouds" />
      <Reveal as="section" className="py-4">
        <p className="text-xs tracking-[0.25em] text-accent">{t("paths.kicker", lang)}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-fg">{t("paths.title", lang)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t("paths.desc", lang)}</p>
      </Reveal>

      <div className="grid gap-4">
        {PATHS.map((p, i) => (
          <Reveal
            key={p.key}
            delay={i * 80}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex items-start gap-4">
              <span className="seal inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md font-serif text-lg">
                {p.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-serif text-lg font-medium text-fg">{t(p.titleKey, lang)}</h2>
                  {lang !== "zh" && <span className="text-xs text-faint">{p.glyph}</span>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t(p.descKey, lang)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.steps.map((s, j) => (
                    <span key={s.href} className="inline-flex items-center gap-1.5 text-xs">
                      <Link
                        href={s.href}
                        className="pressable rounded-full border border-line bg-bg px-3 py-1.5 text-muted transition hover:border-accent hover:text-accent"
                      >
                        <span className="me-1 text-faint">{j + 1}.</span>
                        {t(s.labelKey, lang)}
                      </Link>
                      {j < p.steps.length - 1 && <span className="text-faint">→</span>}
                    </span>
                  ))}
                  <span className="ms-1 text-xs text-faint">
                    {p.steps.length} {t("paths.step", lang)}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

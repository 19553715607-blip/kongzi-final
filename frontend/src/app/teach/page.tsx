"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";

const BLOCKS = [
  {
    titleKey: "teach.toolkit.title",
    descKey: "teach.toolkit.desc",
    actionKey: "teach.openToolkit",
    href: "/plugins",
    glyph: "包",
  },
  {
    titleKey: "teach.lesson.title",
    descKey: "teach.lesson.desc",
    actionKey: "teach.openPaths",
    href: "/paths",
    glyph: "课",
  },
  {
    titleKey: "teach.classroom.title",
    descKey: "teach.classroom.desc",
    actionKey: "teach.openKiosk",
    href: "/kiosk",
    glyph: "堂",
  },
  {
    titleKey: "teach.assessment.title",
    descKey: "teach.assessment.desc",
    actionKey: "teach.openQuiz",
    href: "/quiz",
    glyph: "评",
  },
];

export default function TeachPage() {
  const [lang] = useLang();
  return (
    <div className="space-y-6">
      <Reveal as="section" className="py-4">
        <p className="text-xs tracking-[0.25em] text-accent">{t("teach.kicker", lang)}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-fg">{t("teach.title", lang)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t("teach.desc", lang)}</p>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {BLOCKS.map((b, i) => (
          <Reveal
            key={b.titleKey}
            delay={i * 80}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5"
          >
            <span className="seal mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md font-serif">
              {b.glyph}
            </span>
            <h2 className="font-serif text-lg font-medium text-fg">{t(b.titleKey, lang)}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{t(b.descKey, lang)}</p>
            <div className="mt-4">
              <Link href={b.href}>
                <TactileButton variant="accent">{t(b.actionKey, lang)} →</TactileButton>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal as="section" delay={200} className="rounded-2xl border border-line bg-accent-soft p-5">
        <p className="text-sm leading-relaxed text-accent-ink">
          {t("teach.classroom.desc", lang)}
        </p>
        <div className="mt-3">
          <Link href="/kiosk">
            <TactileButton variant="gold">{t("teach.openKiosk", lang)} →</TactileButton>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import Icon, { type IconName } from "@/components/ui/Icon";

const BLOCKS: {
  titleKey: string;
  descKey: string;
  actionKey: string;
  href: string;
  icon: IconName;
}[] = [
  {
    titleKey: "teach.toolkit.title",
    descKey: "teach.toolkit.desc",
    actionKey: "teach.openToolkit",
    href: "/plugins",
    icon: "grid",
  },
  {
    titleKey: "teach.lesson.title",
    descKey: "teach.lesson.desc",
    actionKey: "teach.openPaths",
    href: "/paths",
    icon: "book",
  },
  {
    titleKey: "teach.classroom.title",
    descKey: "teach.classroom.desc",
    actionKey: "teach.openKiosk",
    href: "/kiosk",
    icon: "institution",
  },
  {
    titleKey: "teach.assessment.title",
    descKey: "teach.assessment.desc",
    actionKey: "teach.openQuiz",
    href: "/quiz",
    icon: "review",
  },
];

export default function TeachPage() {
  const [lang] = useLang();
  return (
    <div className="space-y-6">
      <Reveal as="section" className="page-head">
        <p className="page-kicker">{t("teach.kicker", lang)}</p>
        <h1 className="page-title font-serif">{t("teach.title", lang)}</h1>
        <p className="page-lede">{t("teach.desc", lang)}</p>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {BLOCKS.map((b, i) => (
          <Reveal
            key={b.titleKey}
            delay={i * 80}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5"
          >
            <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2 text-accent">
              <Icon name={b.icon} size={19} />
            </span>
            <h2 className="font-serif text-lg font-medium text-fg">{t(b.titleKey, lang)}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{t(b.descKey, lang)}</p>
            <div className="mt-4">
              <Link href={b.href} className="nz-btn">
                {t(b.actionKey, lang)} →
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
          <Link href="/kiosk" className="nz-btn">
            {t("teach.openKiosk", lang)} →
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

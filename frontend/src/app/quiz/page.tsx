"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import Icon, { type IconName } from "@/components/ui/Icon";

const GAMES: { href: string; labelKey: string; icon: IconName }[] = [
  { href: "/journey/li",  labelKey: "jrn.art.li",  icon: "institution" },
  { href: "/journey/yue", labelKey: "jrn.art.yue", icon: "music" },
  { href: "/journey/she", labelKey: "jrn.art.she", icon: "target" },
  { href: "/journey/yu",  labelKey: "jrn.art.yu",  icon: "wheel" },
  { href: "/journey/shu", labelKey: "jrn.art.shu", icon: "edit" },
  { href: "/journey/math", labelKey: "jrn.art.shu2", icon: "calculator" },
];

export default function QuizPage() {
  const [lang] = useLang();
  return (
    <div className="space-y-6">
      <Reveal as="section" className="page-head">
        <p className="page-kicker">{t("quiz.kicker", lang)}</p>
        <h1 className="page-title font-serif">{t("quiz.title", lang)}</h1>
        <p className="page-lede">{t("quiz.desc", lang)}</p>
      </Reveal>

      <Reveal as="section" delay={80} className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-serif text-base font-medium text-fg">{t("quiz.gamesTitle", lang)}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group card-hover pressable flex items-center gap-3 rounded-xl border border-line bg-bg p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-accent">
                <Icon name={g.icon} size={17} />
              </span>
              <span className="text-sm text-fg">{t(g.labelKey, lang)}</span>
              <Icon
                name="chevronRight"
                size={14}
                className="ms-auto text-accent opacity-0 transition group-hover:opacity-100"
              />
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-start">
          <Link href="/journey" className="nz-btn">
            {t("quiz.pathCta", lang)} →
          </Link>
        </div>
      </Reveal>

      <Reveal as="section" delay={160} className="rounded-2xl border border-line bg-accent-soft p-5">
        <h2 className="font-serif text-base font-medium text-fg">{t("quiz.readTitle", lang)}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("quiz.readDesc", lang)}</p>
        <div className="mt-4">
          <Link href="/read" className="nz-btn">
            {t("quiz.enter", lang)} →
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

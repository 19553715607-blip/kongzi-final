"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";

const GAMES = [
  { href: "/journey/li",  labelKey: "jrn.art.li",  glyph: "礼" },
  { href: "/journey/yue", labelKey: "jrn.art.yue", glyph: "乐" },
  { href: "/journey/she", labelKey: "jrn.art.she", glyph: "射" },
  { href: "/journey/yu",  labelKey: "jrn.art.yu",  glyph: "御" },
  { href: "/journey/shu", labelKey: "jrn.art.shu", glyph: "书" },
  { href: "/journey/math", labelKey: "jrn.art.shu2", glyph: "数" },
];

export default function QuizPage() {
  const [lang] = useLang();
  return (
    <div className="space-y-6">
      <Reveal as="section" className="py-4">
        <p className="text-xs tracking-[0.25em] text-accent">{t("quiz.kicker", lang)}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-fg">{t("quiz.title", lang)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t("quiz.desc", lang)}</p>
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
              <span className="seal inline-flex h-9 w-9 items-center justify-center rounded-md font-serif text-sm">
                {g.glyph}
              </span>
              <span className="text-sm text-fg">{t(g.labelKey, lang)}</span>
              <span className="ms-auto text-accent opacity-0 transition group-hover:opacity-100">→</span>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-start">
          <Link href="/journey">
            <TactileButton variant="accent">{t("jrn.overview", lang)} →</TactileButton>
          </Link>
        </div>
      </Reveal>

      <Reveal as="section" delay={160} className="rounded-2xl border border-line bg-accent-soft p-5">
        <h2 className="font-serif text-base font-medium text-fg">{t("quiz.readTitle", lang)}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("quiz.readDesc", lang)}</p>
        <div className="mt-4">
          <Link href="/read">
            <TactileButton variant="gold">{t("quiz.enter", lang)} →</TactileButton>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

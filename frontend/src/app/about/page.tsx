"use client";

import Link from "next/link";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";

/**
 * 关于本项目:给全球学生的第一入口——这是什么、译文怎么来、谁在维护、如何联系。
 * 与隐私政策同结构(卡片式),内容全部走 i18n(5 语)。
 */
const SECTIONS: { titleKey: string; bodyKey: string }[] = [
  { titleKey: "about.s1.title", bodyKey: "about.s1.body" },
  { titleKey: "about.s2.title", bodyKey: "about.s2.body" },
  { titleKey: "about.s3.title", bodyKey: "about.s3.body" },
  { titleKey: "about.s4.title", bodyKey: "about.s4.body" },
];

export default function AboutPage() {
  const [lang] = useLang();
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <Reveal>
        <p className="nz-kicker font-garamond text-[0.7rem] uppercase">
          {t("about.kicker", lang)}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-bold tracking-wide text-fg">
          {t("about.title", lang)}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {t("about.lead", lang)}
        </p>
      </Reveal>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.titleKey} delay={i * 60}>
            <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
              <h2 className="font-serif text-base font-semibold tracking-wide text-accent-ink">
                {t(s.titleKey, lang)}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {t(s.bodyKey, lang)}
              </p>
            </section>
          </Reveal>
        ))}
      </div>

      {/* 参与方式:五个入口的枢纽(这些页面已退出一级导航,由此页承载) */}
      <Reveal delay={200}>
        <section className="mt-10">
          <h2 className="font-serif text-lg font-semibold tracking-wide text-fg">
            {t("about.community.title", lang)}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("about.community.lead", lang)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              { href: "/teach", titleKey: "nav.teach", descKey: "about.comm.teach.desc" },
              { href: "/co-create", titleKey: "about.cocreateLink", descKey: "about.comm.cocreate.desc" },
              { href: "/developers", titleKey: "about.developersLink", descKey: "about.comm.developers.desc" },
              { href: "/plugins", titleKey: "nav.plugins", descKey: "about.comm.plugins.desc" },
              { href: "/reach", titleKey: "nav.reach", descKey: "about.comm.reach.desc" },
            ] as const).map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="pressable rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/50"
              >
                <div className="font-serif text-sm font-medium text-fg">{t(c.titleKey, lang)}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(c.descKey, lang)}</p>
                <span className="mt-2 inline-block text-xs text-accent">→</span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-faint">
            <Link href="/privacy" className="text-accent underline underline-offset-4">
              {t("privacy.title", lang)}
            </Link>
          </p>
        </section>
      </Reveal>
    </div>
  );
}

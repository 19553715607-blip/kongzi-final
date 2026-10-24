"use client";

import Link from "next/link";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";

/**
 * 隐私政策(GDPR 友好):静态自述页面,内容按 5 语言词典键渲染。
 * 政策要点与站内实际行为一一对应:本地存储偏好、游客进度、可选注册、
 * 匿名化访问统计(IP 仅衍生国家码)、用户上传头像,以及导出/删除权。
 */
const SECTIONS: { titleKey: string; bodyKey: string }[] = [
  { titleKey: "privacy.s1.title", bodyKey: "privacy.s1.body" },
  { titleKey: "privacy.s2.title", bodyKey: "privacy.s2.body" },
  { titleKey: "privacy.s3.title", bodyKey: "privacy.s3.body" },
  { titleKey: "privacy.s4.title", bodyKey: "privacy.s4.body" },
  { titleKey: "privacy.s5.title", bodyKey: "privacy.s5.body" },
];

export default function PrivacyPage() {
  const [lang] = useLang();
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <Reveal>
        <p className="nz-kicker font-garamond text-[0.7rem] uppercase">
          {t("privacy.kicker", lang)}
        </p>
        <h1 className="mt-4 font-serif text-3xl font-bold tracking-wide text-fg">
          {t("privacy.title", lang)}
        </h1>
        <p className="mt-2 text-xs text-faint">{t("privacy.updated", lang)}</p>
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

      <Reveal delay={200}>
        <p className="mt-10 text-center text-xs text-faint">
          {t("privacy.footerNote", lang)}{" "}
          <Link href="/me" className="text-accent underline underline-offset-4">
            {t("privacy.meLink", lang)}
          </Link>
        </p>
      </Reveal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { loginByEmail } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";

export default function LoginPage() {
  const [lang] = useLang();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await loginByEmail(email, pw);
      setToken(r.token);
      // Preserve an internal destination such as /admin, while rejecting open redirects.
      const requested = new URLSearchParams(window.location.search).get("next");
      let destination = "/me";
      if (requested && !requested.includes("\\")) {
        try {
          const url = new URL(requested, window.location.origin);
          if (url.origin === window.location.origin) {
            destination = `${url.pathname}${url.search}${url.hash}`;
          }
        } catch {
          // Fall back to the account page for malformed return paths.
        }
      }
      window.location.assign(destination);
    } catch {
      setErr(t("login.err", lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <Reveal delay={0}>
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
              {t("brand.short", lang)}
            </span>
            <span className="text-xs tracking-[0.25em] text-accent">{t("login.kicker", lang)}</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl leading-snug text-fg">{t("login.title", lang)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("login.intro1", lang)}
            {t("login.intro2", lang)}
          </p>
          <div className="ornament-rule mt-4">
            <span className="h-1 w-1 rounded-full bg-accent/60" />
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <label className="block text-xs text-muted">
            {t("login.email", lang)}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              autoComplete="email"
            />
          </label>
          <label className="block text-xs text-muted">
            {t("login.password", lang)}
            <input
              type="password"
              required
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("login.pwHint", lang)}
              className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              autoComplete="current-password"
            />
          </label>
          {err && (
            <div className="error-state !flex-row !items-center !gap-3 !px-3 !py-2.5 !text-start">
              <span className="icon-plate !h-8 !w-8 !shrink-0 !text-base">!</span>
              <span className="state-sub">{err}</span>
            </div>
          )}
          <TactileButton
            type="submit"
            variant="accent"
            disabled={busy}
            className="w-full"
          >
            {busy ? t("login.busy", lang) : t("login.submit", lang)}
          </TactileButton>
        </form>
      </Reveal>

      <Reveal delay={160}>
        <section className="rounded-2xl border border-line bg-surface-2/40 p-4 text-xs text-muted">
          <div className="mb-1 font-medium text-fg">{t("login.noAccount", lang)}</div>
          <p className="leading-relaxed">
            {t("login.noAccountBody0", lang)}
            <Link href="/" className="text-accent hover:underline">
              {t("login.enter", lang)}
            </Link>
            {t("login.noAccountBody1", lang)}
            {t("login.noAccountBody2", lang)}
          </p>
        </section>
      </Reveal>
    </div>
  );
}

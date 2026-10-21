"use client";

import Link from "next/link";
import { useState } from "react";
import { loginByEmail, registerByEmail } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";

type Mode = "login" | "register";

export default function LoginPage() {
  const [lang] = useLang();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      // 两种模式都会带上当前游客 token：登录并入已有账号，注册并入新账号，
      // 游客态积累的 XP / 六艺进境 / 收藏都不会丢。
      const r =
        mode === "login"
          ? await loginByEmail(email, pw)
          : await registerByEmail(email, pw, name.trim() || undefined);
      setToken(r.token);
      const xp = r.merged?.xp_added ?? 0;
      if (xp > 0) {
        try {
          sessionStorage.setItem("kongzi_merged_xp", String(xp));
        } catch {
          /* 隐私模式下 sessionStorage 可能不可用，忽略 */
        }
      }
      // 从解锁弹窗跳来时带上 next，完成后回到原页面
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/me";
    } catch {
      setErr(t(mode === "login" ? "login.err" : "login.registerErr", lang));
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
          {/* 登录 / 注册切换 */}
          <div className="flex rounded-full bg-surface-2 p-0.5" role="tablist">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setErr("");
                }}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs transition ${
                  mode === m ? "bg-accent text-white" : "text-muted hover:text-fg"
                }`}
              >
                {t(m === "login" ? "login.tab.login" : "login.tab.register", lang)}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
              {t("login.registerHint", lang)}
            </p>
          )}

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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "register" && (
            <label className="block text-xs text-muted">
              {t("login.displayName", lang)}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </label>
          )}

          {err && (
            <div className="error-state !flex-row !items-center !gap-3 !px-3 !py-2.5 !text-start">
              <span className="icon-plate !h-8 !w-8 !shrink-0 !text-base">!</span>
              <span className="state-sub">{err}</span>
            </div>
          )}
          <TactileButton type="submit" variant="accent" disabled={busy} className="w-full">
            {busy
              ? t("login.busy", lang)
              : t(mode === "login" ? "login.submit" : "login.registerSubmit", lang)}
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

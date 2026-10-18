"use client";

import { getApiBase } from "@/lib/apiBase";

import { useState } from "react";
import { applyForApi, getDeveloperMe } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal, CountUp } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import type { DeveloperMe } from "@/lib/types";


export default function DevelopersPage() {
  const [lang] = useLang();
  const [form, setForm] = useState({ name: "", country: "", contact_email: "", purpose: "" });
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [dash, setDash] = useState<DeveloperMe | null>(null);
  const [busy, setBusy] = useState(false);
  const [probeKey, setProbeKey] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await applyForApi(form);
      setApiKey(r.api_key);
      setMsg(r.message);
      if (r.api_key) {
        setProbeKey(r.api_key);
        getDeveloperMe(r.api_key).then(setDash).catch(() => {});
      }
    } catch {
      setMsg(t("dev.applyFail", lang));
    } finally {
      setBusy(false);
    }
  };

  const loadDashboard = async () => {
    if (!probeKey) return;
    try {
      const d = await getDeveloperMe(probeKey);
      setDash(d);
    } catch {
      setMsg(t("dev.keyInvalid", lang));
    }
  };

  return (
    <div className="space-y-6">
      {/* 概览 */}
      <Reveal as="section" delay={0} className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2.5">
          <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
            {t("brand.short", lang)}
          </span>
          <span className="text-xs tracking-[0.25em] text-accent">{t("dev.kicker", lang)}</span>
        </div>
        <h1 className="mt-2 font-serif text-2xl leading-snug text-fg">
          {t("dev.tagline", lang)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("dev.desc1", lang)}
          {t("dev.desc2", lang)}
        </p>
        <div className="ornament-rule my-4">
          <span className="h-1 w-1 rounded-full bg-accent/60" />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5">{t("dev.quota", lang)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5">{t("dev.rate", lang)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5">{t("dev.langs", lang)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5">{t("dev.traceable", lang)}</span>
        </div>
      </Reveal>

      {/* 申请 */}
      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Reveal delay={80}>
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <div className="text-sm font-medium text-fg">{t("dev.applyTitle", lang)}</div>
            <Input label={t("dev.orgName", lang)} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Input label={t("dev.country", lang)} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            <Input
              label={t("dev.email", lang)}
              type="email"
              value={form.contact_email}
              onChange={(v) => setForm({ ...form, contact_email: v })}
              required
            />
            <label className="block text-xs text-muted">
              {t("dev.purpose", lang)}
              <textarea
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                rows={2}
                placeholder={t("dev.purposePlaceholder", lang)}
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </label>
            <TactileButton type="submit" variant="accent" disabled={busy}>
              {busy ? t("dev.applying", lang) : t("dev.applySubmit", lang)}
            </TactileButton>
            {msg && <div className="text-xs text-muted">{msg}</div>}
          </form>
        </Reveal>

        {/* Key 显示与快速联调 */}
        <Reveal delay={140}>
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <div className="text-sm font-medium text-fg">{t("dev.yourKey", lang)}</div>
            {apiKey ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-gold bg-accent-soft p-3">
                  <div className="break-all font-mono text-sm text-accent-ink">{apiKey}</div>
                  <div className="mt-1 text-[10px] text-accent">
                    {t("dev.keyOnce", lang)}
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(apiKey)}
                  className="pressable rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-surface-2"
                >
                  {t("dev.copyKey", lang)}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs leading-relaxed text-muted">
                  {t("dev.usageHint", lang)}
                </p>
                <input
                  value={probeKey}
                  onChange={(e) => setProbeKey(e.target.value)}
                  placeholder={t("dev.usagePlaceholder", lang)}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
                <button
                  onClick={loadDashboard}
                  disabled={!probeKey}
                  className="pressable rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-surface-2 disabled:opacity-40"
                >
                  {t("dev.query", lang)}
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* 用量看板 */}
      {dash && (
        <Reveal as="section" delay={180} className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">
            {dash.institution.name}（{dash.institution.country || "—"}） · {t("dev.dashboard", lang)}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <Metric label={t("dev.today", lang)} value={dash.stats.used_today} />
            <Metric label={t("dev.d7", lang)} value={dash.stats.used_7d} />
            <Metric label={t("dev.month", lang)} value={dash.stats.used_month} />
            <Metric label={t("dev.monthQuota", lang)} value={dash.institution.monthly_quota} />
          </div>
          <div className="mt-3 text-xs text-faint">
            {t("dev.rateStatus", lang)
              .replace("{a}", String(dash.rate_limit))
              .replace("{b}", String(dash.institution.status))}
          </div>
          {dash.stats.top_paths.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs text-faint">{t("dev.topEndpoints", lang)}</div>
              <div className="space-y-1">
                {dash.stats.top_paths.map((p) => (
                  <div key={p.path} className="flex items-center justify-between text-xs">
                    <code className="text-muted">{p.path}</code>
                    <span className="text-faint">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Reveal>
      )}

      {/* SDK 快速入门（curl 代码示例原样保留，仅外壳精修） */}
      <Reveal as="section" delay={220} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-medium text-fg">{t("dev.quickstart", lang)}</div>
        <div className="space-y-3">
          {/* i18n-scan-ignore-start —— 下面是 API 调用示例，示例查询词保持中文（演示检索中文经典）*/}
          <CodeBlock title="curl" code={`curl -H "X-API-Key: $KEY" \\
  "${getApiBase()}/api/v1/public/search?q=克己复礼&lang=en"`} />
          <CodeBlock title="JavaScript (fetch)" code={`const r = await fetch("${getApiBase()}/api/v1/public/cases?topic_id=climate", {
  headers: { "X-API-Key": process.env.KONGZI_KEY }
});
const data = await r.json();`} />
          <CodeBlock title="Python (requests)" code={`import requests
r = requests.get(
    "${getApiBase()}/api/v1/public/topics",
    headers={"X-API-Key": os.environ["KONGZI_KEY"]},
)
topics = r.json()`} />
          {/* i18n-scan-ignore-end */}
        </div>
      </Reveal>

      {/* 接口清单 */}
      <Reveal as="section" delay={260} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-fg">{t("dev.openEndpoints", lang)}</div>
          <a
            href={`${getApiBase()}/docs`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            {t("dev.swagger", lang)} ↗
          </a>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["GET", "/public/whoami", t("dev.authQuota", lang)],
            ["GET", "/public/search?q=克己复礼&lang=en", t("dev.ep.search", lang)],
            ["GET", "/public/passages/lunyu.xueer.1.1", t("dev.ep.passage", lang)],
            ["GET", "/public/topics", t("dev.ep.topics", lang)],
            ["GET", "/public/topics/climate", t("dev.ep.topicStances", lang)],
            ["GET", "/public/cases", t("dev.ep.cases", lang)],
            ["GET", "/public/corpus/stats", t("dev.ep.corpus", lang)],
          ].map(([m, ep, d], i) => {
            const fullUrl = `${getApiBase()}/api/v1${ep}`;
            return (
              <Reveal key={ep} delay={i * 60}>
                <div className="overflow-hidden rounded-xl border border-line bg-surface-2/30 transition hover:border-accent/40">
                  <div className="flex items-stretch">
                    <span className="flex w-20 shrink-0 items-center justify-center bg-accent-soft font-serif text-xs tracking-[0.2em] text-accent">
                      {m}
                    </span>
                    <div className="min-w-0 flex-1 px-3 py-2.5">
                      <div className="text-sm font-medium text-fg">{d}</div>
                      <code className="block truncate text-[11px] text-muted">{ep}</code>
                    </div>
                  </div>
                  <div className="flex gap-1.5 border-t border-line px-3 py-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(fullUrl);
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      {t("dev.copyUrl", lang)}
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      {t("dev.tryIt", lang)} ↗
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Reveal>

    </div>
  );
}

function Input({
  label, value, onChange, required, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-2/40 px-3 py-2">
      <CountUp value={value} className="block font-serif text-xl text-fg" />
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="border-b border-line bg-surface-2/60 px-3 py-1 text-[10px] text-faint">
        {title}
      </div>
      <pre className="overflow-x-auto bg-surface-2/30 p-3 text-xs leading-relaxed text-fg">
        {code}
      </pre>
    </div>
  );
}

"use client";

import { getApiBase } from "@/lib/apiBase";

import { useCallback, useEffect, useState } from "react";
import { listPlugins } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import type { PluginItem } from "@/lib/types";


const TYPE_COLORS: Record<string, string> = {
  embed: "#0F6E56",
  share: "#993C1D",
  bot: "#534AB7",
  tool: "#854F0B",
  feed: "#1E5F8E",
};

export default function PluginsPage() {
  const [lang] = useLang();
  const [items, setItems] = useState<PluginItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listPlugins()
      .then((r) => {
        setItems(r.items);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (id: string, snippet: string) => {
    navigator.clipboard?.writeText(snippet);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <Reveal as="section" delay={0} className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2.5">
          <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
            {t("brand.short", lang)}
          </span>
          <span className="text-xs tracking-[0.25em] text-accent">{t("plugins.kicker", lang)}</span>
        </div>
        <h1 className="mt-2 font-serif text-xl leading-snug text-fg">
          {t("plugins.count", lang).replace("{n}", String(items.length))}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {t("plugins.desc1", lang)}
          {t("plugins.desc2", lang)}
        </p>
        <div className="ornament-rule mt-3">
          <span className="h-1 w-1 rounded-full bg-accent/60" />
        </div>
      </Reveal>

      {/* 现场预览：iframe + SVG */}
      <Reveal as="section" delay={80} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-medium text-fg">{t("plugins.preview", lang)}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] text-faint">{t("plugins.iframe", lang)}</div>
            <iframe
              src={`${getApiBase()}/api/v1/embed/quote?ref=lunyu.yanyuan.12.2&lang=en`}
              className="h-44 w-full rounded-lg border border-line"
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] text-faint">{t("plugins.svg", lang)}</div>
            <img
              src={`${getApiBase()}/api/v1/embed/card.svg?ref=lunyu.liren.4.16&lang=en`}
              alt="quote card"
              className="h-44 w-full rounded-lg border border-line bg-paper object-contain"
            />
          </div>
        </div>
      </Reveal>

      {/* 插件清单 */}
      {failed ? (
        <div className="error-state">
          <span className="icon-plate">!</span>
          <div className="state-title">{t("state.error.title", lang)}</div>
          <p className="state-sub">{t("state.error.sub", lang)}</p>
          <button onClick={load} className="retry-btn">{t("state.retry", lang)}</button>
        </div>
      ) : items.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <div className="collection-card h-full p-4">
                <div className="mb-2 flex items-start gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] text-white"
                    style={{ background: TYPE_COLORS[p.type] ?? "#888" }}
                  >
                    {p.type}
                  </span>
                  <div className="flex-1">
                    <div className="font-serif text-base text-fg">{p.name}</div>
                    <div className="mt-0.5 text-xs text-faint">{p.summary}</div>
                  </div>
                </div>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-surface-2/50 p-2.5 text-[11px] leading-relaxed text-muted">
                    {p.snippet}
                  </pre>
                  <TactileButton
                    variant="ghost"
                    onClick={() => copy(p.id, p.snippet)}
                    className="!absolute !end-1 !top-1 !rounded !px-2 !py-0.5 !text-[10px]"
                  >
                    {copied === p.id ? t("plugins.copied", lang) : t("plugins.copy", lang)}
                  </TactileButton>
                </div>
              </div>
            </Reveal>
          ))}
        </section>
      )}
    </div>
  );
}

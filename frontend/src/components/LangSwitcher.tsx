"use client";

import { LANGS, useLang, type Lang } from "@/lib/i18n";

export default function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as Lang)}
          title={l.native}
          className={`rounded-full px-2 py-0.5 text-[11px] transition ${
            lang === l.code
              ? "bg-accent text-white"
              : "text-muted hover:bg-surface-2"
          }`}
        >
          {compact ? l.label : l.label}
        </button>
      ))}
    </div>
  );
}

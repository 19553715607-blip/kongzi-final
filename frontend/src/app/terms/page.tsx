"use client";

import { useEffect, useMemo, useState } from "react";
import { getConcepts } from "@/lib/api";
import { useLang, t, type Lang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import type { Concept } from "@/lib/types";

// 后端不可达时的静态精选（20 条以内，五语解释由 i18n 词表承担）
const FALLBACK: { zh: string; en: string; school: string }[] = [
  { zh: "仁", en: "Benevolence; humane care for others.", school: "ru" },
  { zh: "义", en: "Rightness; what is fitting to do.", school: "ru" },
  { zh: "礼", en: "Ritual, propriety and the forms of conduct.", school: "ru" },
  { zh: "智", en: "Wisdom; moral discernment.", school: "ru" },
  { zh: "信", en: "Trustworthiness; keeping one's word.", school: "ru" },
  { zh: "君子", en: "The noble person; the cultivated ideal.", school: "ru" },
  { zh: "道", en: "The Way; the path of heaven and of life.", school: "dao" },
  { zh: "德", en: "Virtue; effective moral power.", school: "ru" },
  { zh: "孝", en: "Filial piety; reverence for parents.", school: "ru" },
  { zh: "忠", en: "Loyalty; devoted conscientiousness.", school: "ru" },
  { zh: "和", en: "Harmony; cultivated balance.", school: "ru" },
  { zh: "中庸", en: "The golden mean; equilibrium and moderation.", school: "ru" },
];

function termLabel(c: Concept, lang: Lang): string {
  if (lang === "zh") return c.zh;
  return c.i18n?.[lang] || c.i18n?.en || c.zh;
}
function termDef(c: Concept, lang: Lang): string {
  if (lang === "zh") return c.definition?.zh || "";
  return c.definition?.[lang] || c.definition?.en || "";
}

export default function TermsPage() {
  const [lang] = useLang();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [q, setQ] = useState("");
  const [school, setSchool] = useState<string>("");

  useEffect(() => {
    getConcepts()
      .then((cs) => {
        if (cs && cs.length) setConcepts(cs);
        else {
          setConcepts(FALLBACK.map((f, i) => ({
            id: "fb-" + i,
            zh: f.zh,
            pinyin: null,
            i18n: { en: f.en },
            school: f.school,
            rarity: "common",
            definition: { en: f.en },
            related: [],
          })));
          setUsedFallback(true);
        }
      })
      .catch(() => {
        setConcepts(FALLBACK.map((f, i) => ({
          id: "fb-" + i,
          zh: f.zh,
          pinyin: null,
          i18n: { en: f.en },
          school: f.school,
          rarity: "common",
          definition: { en: f.en },
          related: [],
        })));
        setUsedFallback(true);
      });
  }, []);

  const schools = useMemo(() => {
    const s = new Set<string>();
    concepts.forEach((c) => c.school && s.add(c.school));
    return ["", ...Array.from(s).sort()];
  }, [concepts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return concepts.filter((c) => {
      if (school && c.school !== school) return false;
      if (!needle) return true;
      return (
        c.zh.toLowerCase().includes(needle) ||
        termLabel(c, lang).toLowerCase().includes(needle) ||
        termDef(c, lang).toLowerCase().includes(needle)
      );
    });
  }, [concepts, q, school, lang]);

  return (
    <div className="space-y-6">
      <Reveal as="section" className="py-4">
        <p className="text-xs tracking-[0.25em] text-accent">{t("terms.kicker", lang)}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-fg">{t("terms.title", lang)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t("terms.desc", lang)}</p>
      </Reveal>

      <Reveal as="section" delay={80} className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("terms.search", lang)}
          className="pressable min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {schools.map((s) => (
            <button
              key={s || "all"}
              onClick={() => setSchool(s)}
              className={`pressable rounded-full px-3 py-1.5 text-xs transition ${
                school === s
                  ? "bg-accent text-white"
                  : "border border-line text-muted hover:bg-surface-2"
              }`}
            >
              {s || t("terms.all", lang)}
            </button>
          ))}
        </div>
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal as="section" className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-faint">
          {t("terms.empty", lang)}
        </Reveal>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c, i) => (
            <Reveal
              key={c.id}
              delay={Math.min(i, 8) * 40}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-lg font-medium text-fg">{termLabel(c, lang)}</span>
                {lang !== "zh" && <span className="text-sm text-accent">{c.zh}</span>}
                {c.pinyin && lang !== "zh" && (
                  <span className="text-xs italic text-faint">{c.pinyin}</span>
                )}
              </div>
              {termDef(c, lang) && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{termDef(c, lang)}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-[10px] text-faint">
                {c.school && <span className="rounded bg-surface-2 px-2 py-0.5">{c.school}</span>}
                <span>{t("terms.source", lang)} · {c.id}</span>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {usedFallback && (
        <p className="text-xs text-faint">·</p>
      )}
    </div>
  );
}

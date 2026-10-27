"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addFavorite,
  getCorpusStats,
  getPassage,
  getPassageNeighbors,
  getRandomPassage,
  getTodayPassage,
  passageAudioUrl,
} from "@/lib/api";
import { copyText, speakText, speechLang } from "@/lib/ui";
import { exportQuoteCard } from "@/lib/shareCard";
import { toast } from "@/components/Toast";
import { t, useLang } from "@/lib/i18n";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { HorizontalRail, CollectionCard, ProvenanceCaption } from "@/components/museum";
import NightHero from "@/components/home/NightHero";
import type { CorpusStats, Passage } from "@/lib/types";

// 后端 /corpus/stats 的 breakdown 以中文为 key（数据契约，不能改）。
// 这里把中文 key 映射到 i18n 键，只翻译**显示标签**；查表仍用中文 key。
// i18n-scan-ignore-start —— 下面这些中文是后端数据键，不是待翻译的显示文案
const BD_KEY: Record<string, string> = {
  "经典原文": "corpus.bd.passages",
  "拼音标注": "corpus.bd.pinyin",
  "多语译文": "corpus.bd.translations",
  "注释（传统+现代）": "corpus.bd.annotations",
  "注释多语扩展": "corpus.bd.annoI18n",
  "概念条目": "corpus.bd.concepts",
  "概念多语术语": "corpus.bd.conceptTerms",
  "概念多语定义": "corpus.bd.conceptDefs",
  "全球议题": "corpus.bd.topics",
  "议题多语名称": "corpus.bd.topicNames",
  "议题多语描述": "corpus.bd.topicDescs",
  "跨文明立场（headline）": "corpus.bd.civHeadline",
  "跨文明立场（论证）": "corpus.bd.civArgument",
  "跨文明对话案例（条）": "corpus.bd.cases",
  "案例文明对照单元": "corpus.bd.caseCivUnits",
  "案例文明多语单元": "corpus.bd.caseCivI18n",
  "案例经典引用单元": "corpus.bd.caseCitations",
  "案例引用多语标签": "corpus.bd.caseCiteI18n",
  "案例多语标签": "corpus.bd.caseTagsI18n",
  "案例问题多语真译": "corpus.bd.caseQuestionI18n",
};
const BD_CASES_KEY = "跨文明对话案例（条）";
// i18n-scan-ignore-end

// 显示标签：有映射则用 i18n，否则回落中文 key（后端加了新指标时不会显示空白）
function bdLabel(k: string, lang: Parameters<typeof t>[1]): string {
  const key = BD_KEY[k];
  return key ? t(key, lang) : k;
}

export default function Home() {
  const [lang] = useLang();
  const [quote, setQuote] = useState<Passage | null>(null);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [err, setErr] = useState(false);
  const [mode, setMode] = useState<"daily" | "random">("daily");
  const [neighbors, setNeighbors] = useState<{
    prev: { id: string } | null;
    next: { id: string } | null;
  }>({ prev: null, next: null });
  const [faved, setFaved] = useState(false);
  const quoteSeq = useRef(0);

  // ── 朗读音频：优先后端合成（qwen-tts，服务端磁盘缓存），失败回落浏览器本地语音 ──
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSeq = useRef(0);

  const stopAudio = () => {
    audioSeq.current += 1; // 使在途的加载与播放全部失效
    const a = audioRef.current;
    audioRef.current = null;
    if (a) {
      a.onended = null;
      a.pause();
      if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
    }
    setAudioState("idle");
  };

  useEffect(() => {
    loadQuote(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // 语料统计与语言无关，只拉一次
  useEffect(() => {
    getCorpusStats().then(setStats).catch(() => {});
  }, []);

  async function loadQuote(m: "daily" | "random", refId?: string) {
    // 用请求序号代替「上锁丢弃」：连点「换一句」时后发的请求赢，先发的结果作废。
    const seq = ++quoteSeq.current;
    stopAudio(); // 换句后旧音频立即停
    setErr(false);
    setFaved(false);
    try {
      const p = refId
        ? await getPassage(refId, lang)
        : m === "daily"
          ? await getTodayPassage(lang)
          : await getRandomPassage(lang);
      if (seq !== quoteSeq.current) return;
      setQuote(p);
      getPassageNeighbors(p.id)
        .then((nb) => {
          if (seq === quoteSeq.current) setNeighbors({ prev: nb.prev, next: nb.next });
        })
        .catch(() => {});
    } catch {
      if (seq !== quoteSeq.current) return;
      setErr(true);
    }
  }

  const switchMode = (m: "daily" | "random") => {
    setMode(m);
    void loadQuote(m);
  };

  const doCopy = async () => {
    if (!quote) return;
    const tr =
      quote.translations.find((x) => x.lang === lang) ??
      quote.translations.find((x) => x.lang === "en");
    const ok = await copyText(
      `${quote.original_text}${tr ? `\n${tr.text}` : ""}\n—— ${quote.ref_label ?? ""}`,
    );
    toast(ok ? t("home.quote.copied", lang) : t("home.quote.copyFail", lang), ok ? "ok" : "err");
  };

  // 生成竖版分享卡(1080×1920 PNG,前端 Canvas 绘制,自动下载)
  const doShareCard = async () => {
    if (!quote) return;
    try {
      await exportQuoteCard({
        original: quote.original_text,
        translation: lang === "zh" ? undefined : translation?.text,
        refLabel: quote.ref_label ?? undefined,
        siteTitle: t("brand.title", lang),
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        rtl: lang === "ar",
      });
      toast(t("home.quote.shared", lang), "ok");
    } catch {
      toast(t("home.quote.shareFail", lang), "err");
    }
  };

  // 学术引用:出处 + 站名 + 年份 + 链接(MLA 风格骨架)
  const doCite = async () => {
    if (!quote) return;
    const text = `${quote.original_text.slice(0, 24)}… ${quote.ref_label ?? ""}. ${t("brand.title", lang)}, 2026, ${window.location.origin}.`;
    const ok = await copyText(text);
    toast(ok ? t("home.quote.cited", lang) : t("home.quote.copyFail", lang), ok ? "ok" : "err");
  };

  const doListen = async () => {
    if (!quote) return;
    if (audioState === "playing") {
      stopAudio();
      return;
    }
    if (audioState === "loading") return;
    const tr =
      quote.translations.find((x) => x.lang === lang) ??
      quote.translations.find((x) => x.lang === "en");
    const text = lang === "zh" ? quote.original_text : tr?.text ?? quote.original_text;
    const seq = ++audioSeq.current;
    setAudioState("loading");
    try {
      // 后端按 id+lang 合成（中文读原文，其他语言读译文），命中缓存时秒回
      const res = await fetch(passageAudioUrl(quote.id, lang));
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      if (seq !== audioSeq.current) return;
      const a = new Audio(URL.createObjectURL(blob));
      audioRef.current = a;
      a.onended = () => {
        if (seq === audioSeq.current) stopAudio();
      };
      await a.play();
      if (seq !== audioSeq.current) {
        stopAudio();
        return;
      }
      setAudioState("playing");
    } catch {
      if (seq !== audioSeq.current) return;
      setAudioState("idle");
      // 回落：浏览器本地语音合成（不依赖后端与外网）
      const ok = speakText(text, speechLang(lang));
      if (!ok) toast(t("home.quote.noTts", lang), "err");
    }
  };

  const doFav = async () => {
    if (!quote || faved) return;
    setFaved(true);
    try {
      await addFavorite("passage", quote.id, quote.original_text);
      toast(t("home.quote.saved", lang), "ok");
    } catch {
      setFaved(false);
      toast(t("home.quote.saveFail", lang), "err");
    }
  };

  const goTo = (id: string | null) => {
    if (!id) return;
    void loadQuote(mode, id);
  };

  const translation =
    quote?.translations.find((tr) => tr.lang === lang) ??
    quote?.translations.find((tr) => tr.lang === "en");

  // 精选学习路径 rail（纯文本：标题 + 一句话说明 + 编号，不配图）
  const pathCards = [
    { titleKey: "paths.analects.title", descKey: "paths.analects.desc", acc: "P-01" },
    { titleKey: "paths.lineage.title",  descKey: "paths.lineage.desc",  acc: "P-02" },
    { titleKey: "paths.arts.title",     descKey: "paths.arts.desc",     acc: "P-03" },
    { titleKey: "paths.crossciv.title", descKey: "paths.crossciv.desc", acc: "P-04" },
  ];

  // ── Hero 内的玻璃金句面板（保留全部交互：每日/随机、复制/朗读/收藏、前后句、溯源）──
  const quotePanel = (
    <div className="nz-glass p-5 md:p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[0.65rem] tracking-[0.4em] text-accent">{t("home.quote", lang)}</span>
        <span className="ms-auto flex items-center gap-0.5 rounded-full border border-line p-0.5">
          <button
            onClick={() => switchMode("daily")}
            className={`pressable rounded-full px-2.5 py-1 text-[11px] transition ${
              mode === "daily" ? "bg-accent text-bg" : "text-faint hover:text-fg"
            }`}
          >
            {t("home.quote.daily", lang)}
          </button>
          <button
            onClick={() => switchMode("random")}
            className={`pressable rounded-full px-2.5 py-1 text-[11px] transition ${
              mode === "random" ? "bg-accent text-bg" : "text-faint hover:text-fg"
            }`}
          >
            {t("home.quote.random", lang)}
          </button>
        </span>
      </div>

      {err ? (
        <p className="text-sm text-faint">{t("read.noBackend", lang)}</p>
      ) : quote ? (
        <>
          <p className="font-serif text-lg leading-relaxed tracking-wide text-accent-ink">
            {quote.original_text}
          </p>
          {translation && translation.lang !== "zh" && (
            <div className="mt-2">
              <p className="font-serif text-xs italic leading-relaxed text-muted">
                {translation.text}
              </p>
              {translation.translator && translation.translator !== "原文" && (
                <p className="mt-1 text-[10px] tracking-wide text-faint">
                  {t("home.quote.transBy", lang)}
                  {t("home.quote.transPlatform", lang)}
                </p>
              )}
            </div>
          )}
          {/* 动作行：允许换行——法/西/阿语的按钮文案明显更长，窄屏一行放不下 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 gap-y-2">
            <Pressable
              onClick={doCopy}
              title={t("home.quote.copy", lang)}
              className="flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] text-muted transition hover:border-accent hover:text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 012-2h10" />
              </svg>
              {t("home.quote.copy", lang)}
            </Pressable>
            <Pressable
              onClick={() => void doCite()}
              title={t("home.quote.cite", lang)}
              className="flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] text-muted transition hover:border-accent hover:text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 7H5a2 2 0 00-2 2v4a2 2 0 002 2h2c0 2-1 3-3 4" />
                <path d="M19 7h-4a2 2 0 00-2 2v4a2 2 0 002 2h2c0 2-1 3-3 4" />
              </svg>
              {t("home.quote.cite", lang)}
            </Pressable>
            <Pressable
              onClick={() => void doShareCard()}
              title={t("home.quote.share", lang)}
              className="flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] text-muted transition hover:border-accent hover:text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 012-2h10" />
              </svg>
              {t("home.quote.share", lang)}
            </Pressable>
            <Pressable
              onClick={() => void doListen()}
              title={audioState === "playing" ? t("home.quote.stop", lang) : t("home.quote.listen", lang)}
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] transition ${
                audioState === "playing"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {audioState === "loading" ? (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : audioState === "playing" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
                </svg>
              )}
              {audioState === "playing"
                ? t("home.quote.stop", lang)
                : audioState === "loading"
                  ? t("home.quote.loading", lang)
                  : t("home.quote.listen", lang)}
            </Pressable>
            <Pressable
              onClick={doFav}
              title={faved ? t("home.quote.saved", lang) : t("home.quote.save", lang)}
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] transition ${
                faved
                  ? "border-gold/60 bg-gold/20 text-gold"
                  : "border-line text-muted hover:border-accent hover:text-accent"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.6-9.5-9C.8 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.5 0 5.2 3.5 3.5 7-2.5 4.4-9.5 9-9.5 9z" />
              </svg>
            </Pressable>
            <span className="ms-auto flex items-center gap-1">
              <button
                onClick={() => goTo(neighbors.prev?.id ?? null)}
                disabled={!neighbors.prev}
                className="pressable flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent disabled:opacity-30"
                title={t("home.quote.prev", lang)}
              >
                ←
              </button>
              <button
                onClick={() => void loadQuote("random")}
                className="pressable flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent"
                title={t("home.quote.shuffle", lang)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              </button>
              <button
                onClick={() => goTo(neighbors.next?.id ?? null)}
                disabled={!neighbors.next}
                className="pressable flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent disabled:opacity-30"
                title={t("home.quote.next", lang)}
              >
                →
              </button>
            </span>
          </div>
          <ProvenanceCaption
            items={[
              { label: t("prov.label.source", lang), value: quote.ref_label ?? "—" },
              { label: t("prov.label.no", lang), value: quote.id },
            ]}
          />
        </>
      ) : (
        <div className="space-y-3">
          <div className="skeleton h-6 w-4/5" />
          <div className="skeleton h-4 w-3/5" />
          <div className="skeleton h-7 w-36 rounded-full" />
        </div>
      )}
    </div>
  );

  return (
    <div>
      <NightHero lang={lang} quotePanel={quotePanel} />

      {/* 跨文明对话前置条带:面向海外读者的差异化内容,紧随英雄区。
          纯文本呈现——案例没有封面图，改用左侧金线 + 衬线标题建立层次。 */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 md:flex-row md:items-center md:px-10">
          <div
            className="min-w-0 flex-1 border-s-2 ps-4 md:ps-5"
            style={{ borderInlineStartColor: "color-mix(in srgb, var(--accent) 45%, transparent)" }}
          >
            <h2 className="font-serif text-xl font-semibold tracking-wide text-fg md:text-2xl">
              {t("home.civ.title", lang)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {t("home.civ.desc", lang)}
            </p>
          </div>
          <Link
            href="/cases"
            className="nz-btn shrink-0 self-start md:self-auto"
          >
            {t("home.civ.cta", lang)} →
          </Link>
        </div>
      </section>

      {/* 精选学习路径（暗色金调皮肤，复用馆藏卡组件） */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
        <Reveal>
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="font-serif text-lg font-semibold tracking-[0.14em] text-fg">
              {t("home.paths.title", lang)}
            </h2>
            <Link href="/paths" className="pressable ms-auto text-xs tracking-widest text-accent hover:underline">
              {t("home.paths.more", lang)} →
            </Link>
            <span className="h-px flex-1 bg-gradient-to-r from-[rgba(216,188,126,0.35)] to-transparent" />
          </div>
          <HorizontalRail>
            {pathCards.map((p) => (
              <CollectionCard
                key={p.titleKey}
                className="w-[220px] self-stretch sm:w-[240px]"
                title={t(p.titleKey, lang)}
                note={t(p.descKey, lang)}
                accession={p.acc}
                href="/paths"
              />
            ))}
            <CollectionCard
              className="w-[220px] self-stretch sm:w-[240px]"
              title={t("nav.learn", lang)}
              note={`${t("home.paths.more", lang)} →`}
              badgeRaw="ALL"
              href="/paths"
            />
          </HorizontalRail>
        </Reveal>
      </section>

      {/* 语料看板：压成一条安静的数字行 */}
      {stats && (
        <section className="mx-auto max-w-6xl px-5 pb-16 md:px-10 md:pb-24">
          <Reveal className="rounded-2xl border border-line bg-surface/40 p-5 md:p-7">
            <div className="ornament-rule mb-4">
              <span className="text-[0.6rem] tracking-[0.3em] text-faint">{t("corpus.title", lang)}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <CountUp value={stats.total} className="font-serif text-4xl font-semibold leading-none text-accent-bright" />
                <div className="mt-1.5 text-xs text-faint">{t("corpus.units", lang)}</div>
              </div>
              <div className="text-xs text-faint">
                {t("corpus.target", lang)} <CountUp value={stats.target} />
                <span className="mx-1">·</span>
                {(stats.progress * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-faint">
                <CountUp value={stats.language_count} className="font-serif text-lg leading-none text-fg" />{" "}
                {t("corpus.langs", lang)}
                <span className="ms-2 text-faint">
                  {stats.languages.map((l) => l.toUpperCase()).join(" · ")}
                </span>
              </div>
              <Link href="/cases" className="pressable ms-auto text-xs text-accent hover:underline">
                <CountUp value={stats.breakdown[BD_CASES_KEY] ?? 0} /> {t("corpus.cases", lang)} →
              </Link>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-gradient-to-r from-accent to-gold transition-all"
                style={{ width: `${Math.min(100, stats.progress * 100)}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {Object.entries(stats.breakdown)
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-2/40 px-2 py-2 text-center">
                    <CountUp value={v} className="block font-serif text-lg leading-none text-fg" />
                    <div className="mt-1 text-[0.6rem] leading-tight text-faint">{bdLabel(k, lang)}</div>
                  </div>
                ))}
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
}

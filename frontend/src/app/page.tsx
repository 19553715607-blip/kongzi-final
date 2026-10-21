"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  addFavorite,
  getCorpusStats,
  getPassage,
  getPassageNeighbors,
  getRandomPassage,
  getTodayPassage,
  getTopics,
  getTopicPassages,
} from "@/lib/api";
import { copyText, speakText, speechLang } from "@/lib/ui";
import { toast } from "@/components/Toast";
import { t, useLang } from "@/lib/i18n";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import {
  HorizontalRail,
  CollectionCard,
  ProvenanceCaption,
  TactileButton,
  AnnouncementBar,
} from "@/components/museum";
import ChineseBackdrop from "@/components/ChineseBackdrop";
import type { CorpusStats, Passage, TopicBrief, TopicPassage } from "@/lib/types";

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

// 滑轨缩略图：有配图用配图，没有则退回品牌色几何小景（容错，避免图挂了出现破图）
function RailThumb({
  img,
  tone = "cinnabar",
}: {
  img?: string;
  tone?: "cinnabar" | "celadon" | "gold";
}) {
  if (img) {
    return (
      <span className="relative block h-full w-full overflow-hidden">
        <Image src={img} alt="" fill sizes="240px" className="object-cover" unoptimized />
      </span>
    );
  }
  // 渐变色跟随主题变量，避免换色后这里的朱砂红与全站冲突
  const map = {
    cinnabar: "linear-gradient(135deg,var(--accent) 0%,var(--accent-deep) 100%)",
    celadon: "linear-gradient(135deg,var(--cel) 0%,var(--cel-deep) 100%)",
    gold: "linear-gradient(135deg,var(--gold) 0%,var(--gold-deep) 100%)",
  } as const;
  return (
    <span className="flex h-full w-full items-center justify-center" style={{ background: map[tone] }}>
      <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-white" />
        <circle cx="24" cy="24" r="6" fill="currentColor" fillOpacity="0.65" className="text-white" />
      </svg>
    </span>
  );
}

export default function Home() {
  const [lang] = useLang();
  const [quote, setQuote] = useState<Passage | null>(null);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [err, setErr] = useState(false);
  // 增强交互状态
  const [mode, setMode] = useState<"daily" | "random">("daily");
  const [neighbors, setNeighbors] = useState<{
    prev: { id: string } | null;
    next: { id: string } | null;
  }>({ prev: null, next: null });
  const [faved, setFaved] = useState(false);
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [topicPassages, setTopicPassages] = useState<TopicPassage[]>([]);
  // 馆藏精选横轨用：跨议题并集，与上面「当前议题」的列表分开存
  const [railPassages, setRailPassages] = useState<TopicPassage[]>([]);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const quoteSeq = useRef(0);
  const quoteRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadQuote(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // 语料统计与语言无关，只拉一次
  useEffect(() => {
    getCorpusStats().then(setStats).catch(() => {});
  }, []);

  // 议题名称与议题下的原文/译文都是后端按 lang 返回的，
  // 必须跟着 lang 重拉；否则切语言后标题变了、议题 chip 还是旧语言。
  // 保留用户当前选中的议题，只在它已不存在时才回落到第一个。
  useEffect(() => {
    let alive = true;
    getTopics(lang)
      .then(async (ts) => {
        if (!alive) return;
        setTopics(ts);
        const keep = ts.find((x) => x.id === activeTopic) ?? ts[0];
        if (keep) {
          setActiveTopic(keep.id);
          void loadTopicPassages(keep.id);
        }

        // 馆藏精选横轨：单个议题的原文只有 1–2 条，撑不满一条横轨，
        // 改为取前 4 个议题做并集去重，最多 5 条。
        const lists = await Promise.all(
          ts.slice(0, 4).map((tp) => getTopicPassages(tp.id, lang).catch(() => [] as TopicPassage[])),
        );
        if (!alive) return;
        const seen = new Set<string>();
        const merged: TopicPassage[] = [];
        for (const list of lists) {
          for (const p of list) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            merged.push(p);
          }
        }
        setRailPassages(merged.slice(0, 5));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function loadQuote(m: "daily" | "random", refId?: string) {
    // 用请求序号代替「上锁丢弃」：连点「换一句」时后发的请求赢，先发的结果作废。
    // 原来 loadingRef 的做法会把后来的点击直接吞掉，导致模式切换了、正文却没变。
    const seq = ++quoteSeq.current;
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

  async function loadTopicPassages(topicId: string) {
    setLoadingTopic(true);
    try {
      const items = await getTopicPassages(topicId, lang);
      setTopicPassages(items.slice(0, 3));
    } catch {
      setTopicPassages([]);
    } finally {
      setLoadingTopic(false);
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

  const doListen = () => {
    if (!quote) return;
    const tr =
      quote.translations.find((x) => x.lang === lang) ??
      quote.translations.find((x) => x.lang === "en");
    const text = lang === "zh" ? quote.original_text : tr?.text ?? quote.original_text;
    const ok = speakText(text, speechLang(lang));
    if (!ok) toast(t("home.quote.noTts", lang), "err");
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
    quoteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickTopic = (id: string) => {
    setActiveTopic(id);
    void loadTopicPassages(id);
  };

  const translation =
    quote?.translations.find((tr) => tr.lang === lang) ??
    quote?.translations.find((tr) => tr.lang === "en");

  // 藏品精选已改为纯文本卡，不再需要缩略图色调轮换

  // 文明问题 chips
  const civQs = ["home.civ.q1", "home.civ.q2", "home.civ.q3", "home.civ.q4"];

  // 为何了解中国文化：四类 → 既有页面
  const whyCards = [
    { key: "home.why.history",     desc: "home.why.history.desc",     href: "/cases", glyph: "史" },
    { key: "home.why.philosophy",  desc: "home.why.philosophy.desc",  href: "/graph", glyph: "哲" },
    { key: "home.why.literature",  desc: "home.why.literature.desc",  href: "/read",   glyph: "文" },
    { key: "home.why.visual",     desc: "home.why.visual.desc",      href: "/journey", glyph: "艺" },
  ];

  // 按需求开始：三入口
  const needCards = [
    { key: "home.need.exam",     desc: "home.need.exam.desc",     href: "/quiz", glyph: "考" },
    { key: "home.need.business", desc: "home.need.business.desc", href: "/cases", glyph: "商" },
    { key: "home.need.culture",   desc: "home.need.culture.desc",   href: "/chat", glyph: "趣" },
  ];

  // 首屏四主入口：四个核心体验各一直达卡片。
  // 这里是全站唯一的强入口区，不再与导航下拉重复罗列全部页面。
  const primaryCards = [
    { href: "/journey", key: "home.primary.journey", desc: "home.primary.journey.desc", glyph: "艺" },
    { href: "/chat",    key: "home.primary.chat",    desc: "home.primary.chat.desc",    glyph: "问" },
    { href: "/read",    key: "home.primary.read",    desc: "home.primary.read.desc",    glyph: "经" },
    { href: "/feed",    key: "home.primary.feed",    desc: "home.primary.feed.desc",    glyph: "刷" },
  ];

  // 精选学习路径 rail（配图：竹简 / 山峦 / 编钟 / 两圆）
  // 用 WebP 480×360：卡片实际显示 240 CSS px，2x 屏刚好够，体积约为原 PNG 的 1/100。
  const pathCards = [
    { titleKey: "paths.analects.title",  acc: "P-01", img: "/home/path-analects.webp" },
    { titleKey: "paths.lineage.title",   acc: "P-02", img: "/home/path-lineage.webp" },
    { titleKey: "paths.arts.title",      acc: "P-03", img: "/home/path-arts.webp" },
    { titleKey: "paths.crossciv.title",  acc: "P-04", img: "/home/path-crossciv.webp" },
  ];

  return (
    <div className="space-y-8">
      {/* 公告条：新展/专题 */}
      <Reveal as="section" delay={0}>
        <AnnouncementBar tag={t("home.announce.tag", lang)}>
          {t("home.announce.text", lang)}
        </AnnouncementBar>
      </Reveal>

      {/* 留白主视觉：英文（当前语）主标题 + 副标题 + 双 CTA */}
      <Reveal as="section" delay={40} className="relative py-6 text-center md:py-10">
        <ChineseBackdrop variant="mountains clouds" />
        <p className="text-xs tracking-[0.25em] text-accent">{t("home.hero.kicker", lang)}</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-serif text-3xl leading-tight text-fg md:text-5xl">
          {t("home.hero.title", lang)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-base">
          {t("home.hero.desc", lang)}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/journey">
            <TactileButton variant="accent">{t("home.hero.ctaJourney", lang)}</TactileButton>
          </Link>
          <Link href="/chat">
            <TactileButton variant="ghost">{t("home.hero.ctaChat", lang)}</TactileButton>
          </Link>
        </div>
      </Reveal>

      {/* 首屏四主入口：君子路·六艺 / 向经典提问 / 读经 / 刷刷 */}
      <Reveal as="section" delay={80}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {primaryCards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group card-hover pressable flex flex-col rounded-2xl border border-line bg-surface p-4"
            >
              <span className="seal mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md font-serif text-sm">
                {c.glyph}
              </span>
              <div className="font-serif text-sm font-medium text-fg">{t(c.key, lang)}</div>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{t(c.desc, lang)}</p>
              <span className="mt-2 text-xs text-accent opacity-60 transition group-hover:opacity-100">
                {t("home.enter", lang)} →
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      {/* 从一个文明问题开始 */}
      <Reveal as="section" delay={120} className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-serif text-base font-medium text-fg">{t("home.civ.title", lang)}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {civQs.map((k) => (
            <Link
              key={k}
              href={`/chat?q=${encodeURIComponent(t(k, lang))}`}
              className="pressable rounded-full border border-line bg-bg px-3 py-1.5 text-xs leading-relaxed text-muted transition hover:border-accent hover:text-accent"
            >
              {t(k, lang)}
            </Link>
          ))}
        </div>
      </Reveal>

      {/* 按你的需求开始 + 快捷入口 */}
      <Reveal as="section" delay={200}>
        <h2 className="mb-3 font-serif text-base font-medium text-fg">{t("home.need.title", lang)}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {needCards.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="group card-hover pressable rounded-2xl border border-line bg-surface p-4"
            >
              <span className="seal mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md font-serif text-sm">
                {c.glyph}
              </span>
              <div className="font-serif text-sm font-medium text-fg">{t(c.key, lang)}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t(c.desc, lang)}</p>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/50 px-4 py-2.5 text-xs">
          <span className="text-faint">{t("home.need.quick", lang)}:</span>
          <Link href="/read" className="pressable rounded-full bg-bg px-3 py-1 text-muted hover:text-accent">{t("home.need.timeline", lang)}</Link>
          <Link href="/terms" className="pressable rounded-full bg-bg px-3 py-1 text-muted hover:text-accent">{t("home.need.terms", lang)}</Link>
          <Link href="/read" className="pressable rounded-full bg-bg px-3 py-1 text-muted hover:text-accent">{t("home.need.classics", lang)}</Link>
        </div>
      </Reveal>

      {/* 精选学习路径 rail */}
      <Reveal as="section" delay={240}>
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="font-serif text-base font-medium text-fg">{t("home.paths.title", lang)}</h2>
          <Link href="/paths" className="pressable ms-auto text-xs text-accent hover:underline">
            {t("home.paths.more", lang)} →
          </Link>
          <span className="ornament-rule flex-1">
            <span className="h-px flex-1 bg-line" />
          </span>
        </div>
        <HorizontalRail>
          {pathCards.map((p) => (
            <CollectionCard
              key={p.titleKey}
              className="w-[220px] sm:w-[240px] self-stretch"
              thumb={<RailThumb img={p.img} />}
              title={t(p.titleKey, lang)}
              accession={p.acc}
              href="/paths"
            />
          ))}
          <CollectionCard
            className="w-[220px] sm:w-[240px] self-stretch"
            thumb={
              <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface-2/70 text-accent">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className="font-serif text-xs">{t("home.paths.more", lang)}</span>
              </span>
            }
            title={t("nav.learn", lang)}
            accession="ALL"
            href="/paths"
          />
        </HorizontalRail>
      </Reveal>

      {/* 继续探索：跨议题的馆藏精选。
          原来首卡又放了一遍当前金句，和下面的大字正文完全重复，已去掉。 */}
      {railPassages.length > 0 && (
        <Reveal as="section" delay={280}>
          <div className="mb-2 flex items-baseline gap-2">
            <h2 className="font-serif text-base font-medium text-fg">{t("home.rail.title", lang)}</h2>
            <span className="ornament-rule flex-1">
              <span className="h-px flex-1 bg-line" />
            </span>
          </div>
          <HorizontalRail>
            {railPassages.map((p) => (
              <CollectionCard
                key={p.id}
                className="w-[220px] sm:w-[240px] self-stretch is-clamped"
                title={p.original_text}
                accession={p.ref_label ?? p.id}
                onClick={() => goTo(p.id)}
              />
            ))}
            <CollectionCard
              className="w-[220px] sm:w-[240px] self-stretch"
              title={t("nav.read", lang)}
              note={t("home.rail.readNote", lang)}
              accession="ALL"
              href="/read"
            />
          </HorizontalRail>
        </Reveal>
      )}

      {/* 今日金句（保留全部交互） */}
      <Reveal as="section" delay={320} className="rounded-2xl border border-line bg-accent-soft p-6 shadow-sm">
        <div ref={quoteRef} className="mb-3 flex flex-wrap items-center gap-2">
          <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
            {t("brand.short", lang)}
          </span>
          <span className="text-xs tracking-[0.25em] text-accent">
            {t("home.quote", lang)}
          </span>
          <span className="ms-auto flex items-center gap-1 rounded-full bg-surface/60 p-0.5">
            <button
              onClick={() => switchMode("daily")}
              className={`pressable rounded-full px-2.5 py-1 text-[11px] transition ${
                mode === "daily" ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {t("home.quote.daily", lang)}
            </button>
            <button
              onClick={() => switchMode("random")}
              className={`pressable rounded-full px-2.5 py-1 text-[11px] transition ${
                mode === "random" ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {t("home.quote.random", lang)}
            </button>
          </span>
        </div>
        {err ? (
          <p className="text-sm text-faint">
            {t("read.noBackend", lang)}
          </p>
        ) : quote ? (
          <>
            <p className="dropcap font-serif text-2xl leading-relaxed tracking-wide text-accent-ink">
              {quote.original_text}
            </p>
            {translation && translation.lang !== "zh" && (
              <p className="mt-3 font-serif text-sm italic leading-relaxed text-muted">
                {translation.text}
              </p>
            )}
            <div className="ornament-rule my-4">
              <span className="h-1 w-1 rounded-full bg-accent/60" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pressable
                onClick={doCopy}
                title={t("home.quote.copy", lang)}
                className="flex h-8 items-center gap-1 rounded-full bg-surface/70 px-3 text-xs text-accent transition hover:bg-surface"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 012-2h10" />
                </svg>
                {t("home.quote.copy", lang)}
              </Pressable>
              <Pressable
                onClick={doListen}
                title={t("home.quote.listen", lang)}
                className="flex h-8 items-center gap-1 rounded-full bg-surface/70 px-3 text-xs text-accent transition hover:bg-surface"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
                </svg>
                {t("home.quote.listen", lang)}
              </Pressable>
              <Pressable
                onClick={doFav}
                className={`flex h-8 items-center gap-1 rounded-full px-3 text-xs transition ${
                  faved
                    ? "bg-gold/20 text-gold"
                    : "bg-surface/70 text-accent hover:bg-surface"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-4.6-9.5-9C.8 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.5 0 5.2 3.5 3.5 7-2.5 4.4-9.5 9-9.5 9z" />
                </svg>
                {faved ? t("home.quote.saved", lang) : t("home.quote.save", lang)}
              </Pressable>
              <Pressable
                onClick={() => void loadQuote("random")}
                className="flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs text-white transition hover:brightness-110"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
                </svg>
                {t("home.quote.shuffle", lang)}
              </Pressable>
              <span className="ms-auto flex items-center gap-1">
                <button
                  onClick={() => goTo(neighbors.prev?.id ?? null)}
                  disabled={!neighbors.prev}
                  className="pressable flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/70 text-muted transition hover:bg-surface disabled:opacity-30"
                  title={t("home.quote.prev", lang)}
                >
                  ←
                </button>
                <button
                  onClick={() => goTo(neighbors.next?.id ?? null)}
                  disabled={!neighbors.next}
                  className="pressable flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/70 text-muted transition hover:bg-surface disabled:opacity-30"
                  title={t("home.quote.next", lang)}
                >
                  →
                </button>
              </span>
            </div>
            <ProvenanceCaption
              items={[
                { label: t("prov.label.source", lang), value: quote.ref_label ?? "—" },
                { label: t("prov.label.version", lang), value: t("prov.value.version", lang) },
                { label: t("prov.label.no", lang), value: quote.id },
                { label: t("prov.label.era", lang), value: t("prov.value.era", lang) },
                { label: t("prov.label.rights", lang), value: t("prov.value.pd", lang), pd: true },
              ]}
            />
          </>
        ) : (
          <div className="space-y-3">
            <div className="skeleton h-7 w-3/4" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-6 w-28 rounded-full" />
          </div>
        )}
      </Reveal>

      {/* 语料看板 — 保留 */}
      {stats && (
        <Reveal as="section" delay={360} className="rounded-2xl border border-line bg-surface p-5">
          <div className="ornament-rule mb-3">
            <span className="text-[10px] tracking-[0.25em] text-faint">{t("corpus.title", lang)}</span>
          </div>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <CountUp value={stats.total} className="font-serif text-3xl font-medium leading-none text-fg" />
              <div className="mt-1 text-xs text-faint">{t("corpus.units", lang)}</div>
            </div>
            <div className="text-xs text-faint">
              {t("corpus.target", lang)} <CountUp value={stats.target} />
              <span className="mx-1">·</span>
              {(stats.progress * 100).toFixed(2)}%
            </div>
            <div className="ms-auto text-xs text-faint">
              <CountUp value={stats.language_count} className="font-serif text-lg leading-none text-fg" />{" "}
              {t("corpus.langs", lang)}
              <span className="ms-2 text-faint">
                {stats.languages.map((l) => l.toUpperCase()).join(" · ")}
              </span>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-gradient-to-r from-accent to-gold transition-all"
              style={{ width: `${Math.min(100, stats.progress * 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
            {Object.entries(stats.breakdown)
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2/40 px-2 py-1.5 text-center">
                  <CountUp value={v} className="block font-serif text-base leading-none text-fg" />
                  <div className="mt-1 text-[10px] leading-tight text-faint">{bdLabel(k, lang)}</div>
                </div>
              ))}
          </div>
          <div className="mt-3 text-xs text-muted">
            <Link href="/cases" className="pressable text-accent hover:underline">
              <CountUp value={stats.breakdown[BD_CASES_KEY] ?? 0} />{" "}
              {t("corpus.cases", lang)} →
            </Link>
          </div>
        </Reveal>
      )}

      {/* 折叠区：收纳与主入口重复或次要的内容，保证首屏只有一条主路径 */}
      <details className="rounded-2xl border border-line bg-surface [&[open]>summary>svg]:rotate-180">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm text-muted transition hover:text-fg">
          <span>{t("home.more", lang)}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ms-auto transition-transform"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="space-y-6 px-5 pb-5">
          {/* 为何了解中国文化 */}
          <section>
            <h2 className="mb-3 font-serif text-base font-medium text-fg">{t("home.why.title", lang)}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {whyCards.map((c) => (
                <Link
                  key={c.key}
                  href={c.href}
                  className="group card-hover pressable rounded-2xl border border-line bg-surface-2/40 p-4"
                >
                  <span className="seal mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md font-serif text-sm">
                    {c.glyph}
                  </span>
                  <div className="font-serif text-sm font-medium text-fg">{t(c.key, lang)}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(c.desc, lang)}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* 全球议题精选 */}
          {topics.length > 0 && (
            <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-serif text-sm font-medium text-fg">{t("home.topics", lang)}</h2>
            <Link href="/cases" className="pressable ms-auto text-xs text-accent hover:underline">
              {t("home.topics.more", lang)} →
            </Link>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {topics.map((tp) => (
              <button
                key={tp.id}
                onClick={() => pickTopic(tp.id)}
                className={`pressable rounded-full px-3 py-1 text-xs transition ${
                  activeTopic === tp.id
                    ? "text-white"
                    : "border border-line text-muted hover:bg-surface-2"
                }`}
                style={activeTopic === tp.id ? { background: tp.color } : undefined}
              >
                {tp.name}
              </button>
            ))}
          </div>
          {loadingTopic ? (
            <div className="space-y-2">
              <div className="skeleton h-6 w-full" />
              <div className="skeleton h-6 w-4/5" />
            </div>
          ) : topicPassages.length > 0 ? (
            <div className="space-y-2">
              {topicPassages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-3 rounded-lg bg-surface-2/50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-sm leading-relaxed text-fg">
                      {p.original_text}
                    </div>
                    {p.translation && (
                      <div className="mt-0.5 text-xs text-faint">{p.translation}</div>
                    )}
                    <div className="mt-1 text-[10px] text-faint">{p.ref_label}</div>
                  </div>
                  <Link
                    href={`/chat?q=${encodeURIComponent(p.original_text)}`}
                    className="pressable shrink-0 self-center rounded-full bg-accent px-2.5 py-1 text-[11px] text-white transition hover:brightness-110"
                  >
                    {t("home.topics.ask", lang)}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-faint">{t("home.topics.empty", lang)}</p>
          )}
            </section>
          )}
        </div>
      </details>
    </div>
  );
}

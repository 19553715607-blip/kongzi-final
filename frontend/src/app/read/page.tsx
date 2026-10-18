"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addFavorite,
  getBooks,
  getChapters,
  getConcepts,
  getPassage,
  getPassageNeighbors,
  getPassages,
  getRelatedPassages,
} from "@/lib/api";
import { copyText } from "@/lib/ui";
import { toast } from "@/components/Toast";
import { t, useLang } from "@/lib/i18n";
import { Reveal, Pressable } from "@/lib/motion";
import { HorizontalRail, CollectionCard, ProvenanceCaption } from "@/components/museum";
import Comments from "@/components/Comments";
import ChineseBackdrop from "@/components/ChineseBackdrop";
import type { Book, Chapter, Concept, Passage, PassageBrief } from "@/lib/types";

type Layer = "original" | "pinyin" | "translation" | "annotation";
// 层标签的文案在 lib/i18n 的 read.layer.* 下
const LAYERS_ORDER: Layer[] = ["original", "pinyin", "translation", "annotation"];

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.4;
const FONT_STEP = 0.1;

export default function ReadPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [passages, setPassages] = useState<PassageBrief[]>([]);
  const [activeId, setActiveId] = useState("");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang] = useLang();
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    original: true,
    pinyin: true,
    translation: true,
    annotation: true,
  });
  const [err, setErr] = useState("");
  const [faved, setFaved] = useState(false);
  // 平行文本：原文中文与当前语译文左右并陈（移动端上下堆叠）
  const [parallel, setParallel] = useState(false);
  // 增强交互状态
  const [fontScale, setFontScale] = useState(1);
  const [neighbors, setNeighbors] = useState<{
    prev: { id: string } | null;
    next: { id: string } | null;
  }>({ prev: null, next: null });
  const [related, setRelated] = useState<Passage[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [conceptList, setConceptList] = useState<Concept[]>([]);

  useEffect(() => {
    getConcepts().then(setConceptList).catch(() => {});
  }, []);

  // 概念 id → 当前语言术语（zh 用汉字，其余用 i18n；缺失回落汉字）
  const conceptTerm = (cid: string): string => {
    const c = conceptList.find((x) => x.id === cid);
    if (!c) return cid;
    if (lang === "zh") return c.zh;
    return c.i18n?.[lang] || c.zh;
  };

  useEffect(() => {
    getBooks()
      .then((bs) => {
        setBooks(bs);
        if (bs[0]) setBookId(bs[0].id);
      })
      .catch(() => setErr(t("read.noBackend", lang)));
  }, [lang]);

  useEffect(() => {
    if (!bookId) return;
    getChapters(bookId).then((cs) => {
      setChapters(cs);
      if (cs[0]) setChapterId(cs[0].id);
    });
  }, [bookId]);

  useEffect(() => {
    if (!chapterId) return;
    getPassages(chapterId).then((ps) => {
      setPassages(ps);
      if (ps[0]) setActiveId(ps[0].id);
    });
  }, [chapterId]);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    setFaved(false);
    getPassage(activeId, lang)
      .then(setPassage)
      .finally(() => setLoading(false));
  }, [activeId, lang]);

  // 上下条导航（同书，跨章连续）
  useEffect(() => {
    if (!activeId) return;
    setNeighbors({ prev: null, next: null });
    getPassageNeighbors(activeId)
      .then((nb) => setNeighbors({ prev: nb.prev, next: nb.next }))
      .catch(() => {});
  }, [activeId]);

  // 相关经典（新增 API：同概念优先）
  useEffect(() => {
    if (!activeId) return;
    setRelatedLoading(true);
    getRelatedPassages(activeId, lang, 3)
      .then((rs) => setRelated(rs))
      .catch(() => setRelated([]))
      .finally(() => setRelatedLoading(false));
  }, [activeId, lang]);

  // 键盘导航：← 上一句 / → 下一句（输入框内不触发）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && neighbors.prev) {
        setActiveId(neighbors.prev.id);
        scrollToPassageList();
      } else if (e.key === "ArrowRight" && neighbors.next) {
        setActiveId(neighbors.next.id);
        scrollToPassageList();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighbors]);

  function scrollToPassageList() {
    // 移动端列表在上方，切句后滚回列表顶部，避免停留原文
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const doFav = async () => {
    if (!passage || faved) return;
    setFaved(true);
    try {
      await addFavorite("passage", passage.id, passage.original_text);
      toast(t("read.saved", lang), "ok");
    } catch {
      setFaved(false);
      toast(t("read.saveFail", lang), "err");
    }
  };

  const doCopy = async () => {
    if (!passage) return;
    const tr =
      passage.translations.find((x) => x.lang === lang) ??
      passage.translations.find((x) => x.lang === "en");
    const ok = await copyText(
      `${passage.original_text}${tr ? `\n${tr.text}` : ""}\n—— ${passage.ref_label ?? ""}`,
    );
    toast(ok ? t("read.copied", lang) : t("read.copyFail", lang), ok ? "ok" : "err");
  };

  const go = (id: string | null) => {
    if (id) {
      setActiveId(id);
      scrollToPassageList();
    }
  };

  const toggle = (l: Layer) => setLayers((s) => ({ ...s, [l]: !s[l] }));
  const translation =
    passage?.translations.find((tr) => tr.lang === lang) ??
    passage?.translations.find((tr) => tr.lang === "en");

  const originalStyle = useMemo(
    () => ({ fontSize: `${Math.round(fontScale * 24)}px` }),
    [fontScale],
  );

  if (err)
    return <div className="rounded-xl bg-accent-soft p-4 text-sm text-accent">{err}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      {/* 左栏 */}
      <aside className="space-y-3">
        <div className="flex gap-2">
          <select
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            className="flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-fg"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title_zh}</option>
            ))}
          </select>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-fg"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.title_zh}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:max-h-[60vh] md:flex-col md:overflow-y-auto">
          {passages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`pressable block w-full shrink-0 truncate rounded-lg px-3 py-2 text-start font-serif text-sm leading-relaxed md:shrink ${
                p.id === activeId
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              {p.original_text}
            </button>
          ))}
        </div>
      </aside>

      {/* 右栏 */}
      <section className="relative space-y-4">
        <ChineseBackdrop variant="mountains" />
        {/* 章节胶片条：章节卡横滑（下拉为辅） */}
        {chapters.length > 0 && (
          <Reveal as="section" delay={0}>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="font-serif text-sm font-medium text-fg">{t("read.chapterRail.title", lang)}</h2>
              <span className="ornament-rule flex-1">
                <span className="h-px flex-1 bg-line" />
              </span>
            </div>
            <HorizontalRail>
              {chapters.map((c, i) => (
                <CollectionCard
                  key={c.id}
                  className={`w-[132px] sm:w-[150px] ${
                    c.id === chapterId ? "ring-2 ring-accent" : ""
                  }`}
                  title={c.title_zh}
                  accession={`CH-${String(i + 1).padStart(2, "0")}`}
                  onClick={() => setChapterId(c.id)}
                />
              ))}
            </HorizontalRail>
          </Reveal>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="text-xs text-faint">
            {t("read.followHint", lang).replace("{lang}", lang.toUpperCase())}
          </span>
          <span className="mx-1 h-4 w-px bg-line" />
          <div className="flex flex-wrap gap-1">
            {LAYERS_ORDER.map((l) => (
              <button
                key={l}
                onClick={() => toggle(l)}
                className={`pressable rounded-full px-2.5 py-1 text-xs transition ${
                  layers[l] ? "bg-accent-soft text-accent" : "bg-surface-2 text-faint hover:bg-surface-2/70"
                }`}
              >
                {t(`read.layer.${l}`, lang)}
              </button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            onClick={() => setParallel((s) => !s)}
            title={t("read.parallelHint", lang)}
            className={`pressable rounded-full px-2.5 py-1 text-xs transition ${
              parallel ? "bg-cel-soft text-cel-ink" : "bg-surface-2 text-faint hover:bg-surface-2/70"
            }`}
          >
            {t("read.parallel", lang)}
          </button>
          {/* 字号调节 */}
          <span className="mx-1 h-4 w-px bg-line" />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setFontScale((s) => Math.max(FONT_SCALE_MIN, s - FONT_STEP))}
              disabled={fontScale <= FONT_SCALE_MIN}
              className="pressable rounded-md px-2 py-1 text-xs text-muted transition hover:bg-surface-2 disabled:opacity-30"
              title={t("read.fontDown", lang)}
            >
              A−
            </button>
            <button
              onClick={() => setFontScale((s) => Math.min(FONT_SCALE_MAX, s + FONT_STEP))}
              disabled={fontScale >= FONT_SCALE_MAX}
              className="pressable rounded-md px-2 py-1 text-xs text-muted transition hover:bg-surface-2 disabled:opacity-30"
              title={t("read.fontUp", lang)}
            >
              A+
            </button>
          </div>
        </div>

        {/* 上下条导航条（键盘 ←/→ 亦可）—— 胶片条之外的辅助翻页 */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-faint">
          <button
            onClick={() => go(neighbors.prev?.id ?? null)}
            disabled={!neighbors.prev}
            className="pressable rounded-full border border-line px-3 py-1 text-muted transition hover:bg-surface-2 disabled:opacity-30"
          >
            ← {t("read.prev", lang)}
          </button>
          <span className="flex-1 text-center">{t("read.kbdHint", lang)}</span>
          <button
            onClick={() => go(neighbors.next?.id ?? null)}
            disabled={!neighbors.next}
            className="pressable rounded-full border border-line px-3 py-1 text-muted transition hover:bg-surface-2 disabled:opacity-30"
          >
            {t("read.next", lang)} →
          </button>
        </div>

        {loading || !passage ? (
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-6">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-8 w-full" />
            <div className="skeleton h-8 w-5/6" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : (
          <Reveal key={passage.id} className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-serif text-sm tracking-wide text-accent">{passage.ref_label}</span>
              <div className="flex items-center gap-1.5">
                <Pressable
                  onClick={doCopy}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
                    faved ? "bg-accent-soft text-accent" : "border border-line text-muted hover:bg-surface-2"
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                  </svg>
                  {t("read.copy", lang)}
                </Pressable>
                <Pressable
                  onClick={doFav}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    faved ? "bg-accent-soft text-accent" : "border border-line text-muted hover:bg-surface-2"
                  }`}
                >
                  {faved ? t("read.saved", lang) : t("read.save", lang)}
                </Pressable>
              </div>
            </div>

            <div className="ornament-rule mb-4">
              <span className="h-1 w-1 rounded-full bg-accent/60" />
            </div>

            {parallel && translation && layers.original ? (
              // 平行文本：左右两栏（移动端上下堆叠）
              <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                <div>
                  <p className="font-serif leading-loose tracking-wide text-fg" style={originalStyle}>
                    {passage.original_text}
                  </p>
                  {layers.pinyin && passage.pinyin && (
                    <p className="mt-2 text-sm italic leading-relaxed text-faint">{passage.pinyin}</p>
                  )}
                </div>
                <div className="border-s-2 border-line ps-4 md:ps-6">
                  <p className="font-serif text-sm leading-relaxed text-muted">{translation.text}</p>
                </div>
              </div>
            ) : (
              <>
                {layers.original && (
                  <p
                    className="dropcap font-serif leading-loose tracking-wide text-fg"
                    style={originalStyle}
                  >
                    {passage.original_text}
                  </p>
                )}
                {layers.pinyin && passage.pinyin && (
                  <p className="mt-2 text-sm italic leading-relaxed text-faint">{passage.pinyin}</p>
                )}
                {layers.translation && translation && (
                  <p className="mt-4 font-serif text-sm leading-relaxed text-muted">{translation.text}</p>
                )}
              </>
            )}

            {layers.annotation && passage.annotations.length > 0 && (
              <div className="mt-5 space-y-2">
                {passage.annotations.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-surface-2 p-3 text-sm leading-relaxed text-muted transition hover:bg-surface-2/70"
                  >
                    <span className="me-2 text-xs text-accent">
                      {a.source === "现代释义"
                        ? t("anno.src.modern", lang)
                        : a.source === "编者"
                          ? t("anno.src.editor", lang)
                          : a.source ||
                            (a.type === "classical"
                              ? t("anno.classical", lang)
                              : t("anno.modern", lang))}
                    </span>
                    {a.content}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-lg border-s-[3px] border-cel bg-cel-soft p-3">
              <div className="mb-1 text-xs text-cel-ink">{t("read.aiReading", lang)}</div>
              <p className="text-sm leading-relaxed text-cel-ink/80">
                {t("read.aiReadingNote", lang)}
              </p>
              <Link
                href={`/chat?q=${encodeURIComponent(`${t("read.askPrefix", lang)}${passage.original_text}`)}`}
                className="pressable mt-2 inline-block text-sm text-accent hover:underline"
              >
                {t("read.askAgent", lang)}
              </Link>
            </div>

            {passage.concepts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {passage.concepts.map((c) => (
                  <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-faint">
                    {conceptTerm(c)}
                  </span>
                ))}
              </div>
            )}

            {/* 正文卡固定溯源图注：出处/版本/编号/年代/译者/公有领域 */}
            <ProvenanceCaption
              items={[
                { label: t("prov.label.source", lang), value: passage.ref_label ?? "—" },
                { label: t("prov.label.version", lang), value: t("prov.value.version", lang) },
                { label: t("prov.label.no", lang), value: passage.id },
                { label: t("prov.label.era", lang), value: t("prov.value.era", lang) },
                { label: t("prov.label.translator", lang), value: translation?.translator ?? "—" },
                { label: t("prov.label.rights", lang), value: t("prov.value.pd", lang), pd: true },
              ]}
            />
          </Reveal>
        )}

        {/* 楼中楼评论：挂在当前段落上，target 无关可复用 */}
        {passage && (
          <Comments targetType="passage" targetId={passage.id} />
        )}

        {/* 相关经典：藏品卡横滑 */}
        <Reveal as="section" className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">{t("read.related", lang)}</div>
          {relatedLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-6 w-full" />
              <div className="skeleton h-6 w-3/4" />
            </div>
          ) : related.length > 0 ? (
            <HorizontalRail>
              {related.map((r, i) => {
                const rtr =
                  r.translations.find((x) => x.lang === lang) ??
                  r.translations.find((x) => x.lang === "zh");
                return (
                  <CollectionCard
                    key={r.id}
                    className="w-[220px] sm:w-[240px]"
                    title={r.original_text}
                    accession={r.ref_label ?? r.id}
                    onClick={() => go(r.id)}
                  />
                );
              })}
            </HorizontalRail>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center">
              <span className="seal inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 font-serif text-sm leading-none">
                {t("state.empty.title", lang)}
              </span>
              <p className="text-xs text-faint">{t("read.relatedEmpty", lang)}</p>
            </div>
          )}
        </Reveal>
      </section>
    </div>
  );
}

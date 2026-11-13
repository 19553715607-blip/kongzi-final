"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addFavorite, getFeed, getFavorites, removeFavorite, isAuthError } from "@/lib/api";
import { getApiBase } from "@/lib/apiBase";
import { visitorHeaders } from "@/lib/visitor";
import { t, useLang } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { Reveal } from "@/lib/motion";
import ChineseBackdrop from "@/components/ChineseBackdrop";
import Icon from "@/components/ui/Icon";
import CommentSheet from "./_components/CommentSheet";
import WallpaperSheet from "./_components/WallpaperSheet";
import { renderCardImage } from "./_components/renderCard";
import type { FeedItem } from "@/lib/types";

type LikeState = { liked: boolean; count: number };

export default function FeedPage() {
  const [lang] = useLang();
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  // 收藏：key `passage:ref` -> 收藏行 id
  const [favMap, setFavMap] = useState<Record<string, number>>({});
  // 壁纸面板
  const [wall, setWall] = useState<{ dataUrl: string; filename: string } | null>(null);
  // 双击点赞爆裂动画信号：ref_id -> 自增计数
  const [bursts, setBursts] = useState<Record<string, number>>({});
  // 语言切换竞态防护:慢响应不得覆盖新语言的数据
  const feedSeq = useRef(0);
  // 当前打开的评论抽屉
  const [sheet, setSheet] = useState<{ targetId: string; title: string } | null>(null);
  // 滚动容器 + 滚轮节流锁
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);

  useEffect(() => {
    const seq = ++feedSeq.current;
    getFeed(lang, 20)
      .then((d) => {
        if (seq !== feedSeq.current) return; // 旧语言的慢响应,丢弃
        setItems(d);
        setReady(true);
        // 进入卡片后拉取每条金句的真实点赞数与本人 liked
        void preloadLikes(d);
      })
      .catch((e) => {
        if (seq !== feedSeq.current) return;
        setErr(isAuthError(e) ? t("common.loginRequired", lang) : t("feed.noBackend", lang));
      });
  }, [lang]);

  // 已登录用户：拉取收藏列表，初始化星星状态
  useEffect(() => {
    getFavorites()
      .then((list) => {
        const m: Record<string, number> = {};
        for (const f of list) m[`${f.type}:${f.ref}`] = f.id;
        setFavMap(m);
      })
      .catch(() => {});
  }, []);

  const preloadLikes = async (list: FeedItem[]) => {
    const results = await Promise.allSettled(
      list.map((it) =>
        fetch(
          `${getApiBase()}/api/v1/likes/count?target_type=passage&target_id=${encodeURIComponent(
            String(it.ref_id),
          )}`,
          { headers: visitorHeaders() },
        )
          .then((r) => (r.ok ? (r.json() as Promise<{ count: number; liked: boolean }>) : null))
          .then((d) =>
            d ? { id: String(it.ref_id), liked: d.liked, count: d.count } : null,
          ),
      ),
    );
    const next: Record<string, LikeState> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        next[r.value.id] = { liked: r.value.liked, count: r.value.count };
      }
    }
    setLikes((s) => ({ ...s, ...next }));
  };

  const toggleLike = useCallback(async (it: FeedItem) => {
    const id = String(it.ref_id);
    const cur = likes[id] ?? { liked: false, count: 0 };
    const nextLiked = !cur.liked;
    // 乐观更新
    setLikes((s) => ({
      ...s,
      [id]: { liked: nextLiked, count: Math.max(0, cur.count + (nextLiked ? 1 : -1)) },
    }));
    try {
      const res = await fetch(`${getApiBase()}/api/v1/likes/toggle`, {
        method: "POST",
        headers: visitorHeaders(true),
        body: JSON.stringify({ target_type: "passage", target_id: id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { liked: boolean; count: number };
      setLikes((s) => ({ ...s, [id]: { liked: d.liked, count: d.count } }));
    } catch {
      // 回滚
      setLikes((s) => ({ ...s, [id]: cur }));
    }
  }, [likes]);

  // 双击画面点赞：未赞则赞，并触发爆裂动画
  const doubleLike = useCallback(
    (it: FeedItem) => {
      const id = String(it.ref_id);
      const cur = likes[id] ?? { liked: false, count: 0 };
      if (!cur.liked) {
        void toggleLike(it);
        setBursts((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
      }
    },
    [likes, toggleLike],
  );

  const toggleSave = async (it: FeedItem) => {
    const id = String(it.ref_id);
    const key = `passage:${id}`;
    const favId = favMap[key];
    if (favId != null) {
      // 已收藏 → 取消（乐观移除）
      setFavMap((m) => {
        const n = { ...m };
        delete n[key];
        return n;
      });
      try {
        await removeFavorite(favId);
        toast(t("feed.unsaved", lang), "ok");
      } catch {
        setFavMap((m) => ({ ...m, [key]: favId }));
      }
      return;
    }
    // 未收藏 → 添加
    try {
      await addFavorite("passage", it.ref_id, it.original_text);
      const list = await getFavorites();
      const m: Record<string, number> = {};
      for (const f of list) m[`${f.type}:${f.ref}`] = f.id;
      setFavMap(m);
      toast(t("feed.saved", lang), "ok");
    } catch {
      toast(t("feed.loginToSave", lang), "err");
    }
  };

  // 生成壁纸：把当前卡片绘制成 9:16 图片，弹出预览/保存/复制面板
  const onWallpaper = (it: FeedItem) => {
    const dataUrl = renderCardImage(it, lang, t("brand.title", lang));
    if (!dataUrl) {
      toast(t("feed.copyUnsupported", lang), "err");
      return;
    }
    setWall({ dataUrl, filename: `kongzi-${String(it.ref_id)}.png` });
  };
  const onShare = (it: FeedItem) => {
    navigator.clipboard?.writeText(`${it.original_text} —《${it.ref_label}》`);
    toast(t("feed.copied", lang), "ok");
  };

  // 稳定回调：避免抽屉打开期间父组件状态变化触发重复加载/动画
  const closeSheet = useCallback(() => setSheet(null), []);
  const sheetTargetId = sheet?.targetId ?? "";
  const handleCountChange = useCallback(
    (n: number) => {
      setCommentCounts((s) => ({ ...s, [sheetTargetId]: n }));
    },
    [sheetTargetId],
  );

  // 一张卡片的高度即一屏，滚轮一格切一张
  const stepCard = useCallback(
    (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const h = el.clientHeight;
      if (!h || !items.length) return;
      const cur = Math.round(el.scrollTop / h);
      const next = Math.min(items.length - 1, Math.max(0, cur + dir));
      if (next === cur) return;
      el.scrollTo({ top: next * h, behavior: "smooth" });
    },
    [items.length],
  );

  useEffect(() => {
    // 触屏与无滚轮设备交给原生滑动
    if (window.matchMedia("(hover: none)").matches) return;
    const onWheel = (e: WheelEvent) => {
      if (sheet || wall) return; // 抽屉 / 壁纸面板自己滚动
      if (Math.abs(e.deltaY) < 4 || e.ctrlKey) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelLock.current = now + 480;
      stepCard(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [sheet, wall, stepCard]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  if (err)
    return (
      <div className="error-state">
        <span className="icon-plate">!</span>
        <span className="state-title">{t("state.error.title", lang)}</span>
        <span className="state-sub">{err}</span>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          {t("state.retry", lang)}
        </button>
      </div>
    );

  return (
    <div className="relative mx-auto max-w-md md:max-w-lg">
      <button
        type="button"
        onClick={goBack}
        className="btn btn-outline btn-sm absolute start-3 top-3 z-20 bg-surface/85 backdrop-blur"
      >
        <Icon name="chevronLeft" size={14} />
        {t("feed.back", lang)}
      </button>

      <div
        ref={scrollerRef}
        className="h-[calc(100dvh-9rem-var(--safe-b,0px))] snap-y snap-mandatory overflow-y-auto rounded-3xl md:h-[calc(100dvh-8rem)]"
      >
        {!ready ? (
          <div className="flex h-full flex-col gap-3 p-6">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state h-full justify-center">
            <span className="icon-plate">经</span>
            <span className="state-title">{t("state.empty.title", lang)}</span>
            <span className="state-sub">{t("feed.empty.sub", lang)}</span>
          </div>
        ) : (
          items.map((it) => {
            const id = String(it.ref_id);
            const lk = likes[id] ?? { liked: false, count: 0 };
            return (
              <Reveal key={id} as="div" className="h-full snap-start">
                <Card
                  it={it}
                  liked={lk.liked}
                  likeCount={lk.count}
                  commentCount={commentCounts[id] ?? 0}
                  burstSignal={bursts[id] ?? 0}
                  saved={favMap[`passage:${id}`] != null}
                  onLike={() => void toggleLike(it)}
                  onDoubleLike={() => doubleLike(it)}
                  onSave={() => void toggleSave(it)}
                  onShare={() => onShare(it)}
                  onWallpaper={() => onWallpaper(it)}
                  onOpenComments={() => setSheet({ targetId: id, title: it.ref_label })}
                />
              </Reveal>
            );
          })
        )}
      </div>

      {/* 评论底部抽屉（portal 到 body，避免被卡片 transform 裁切） */}
      <CommentSheet
        open={!!sheet}
        targetType="passage"
        targetId={sheet?.targetId ?? ""}
        title={sheet?.title}
        onClose={closeSheet}
        onCountChange={handleCountChange}
      />

      {/* 壁纸预览/保存/复制面板 */}
      <WallpaperSheet
        open={!!wall}
        dataUrl={wall?.dataUrl ?? ""}
        filename={wall?.filename ?? "kongzi-wallpaper.png"}
        onClose={() => setWall(null)}
      />
    </div>
  );
}

function Card({
  it,
  liked,
  likeCount,
  commentCount,
  burstSignal,
  saved,
  onLike,
  onDoubleLike,
  onSave,
  onShare,
  onWallpaper,
  onOpenComments,
}: {
  it: FeedItem;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  burstSignal: number;
  saved: boolean;
  onLike: () => void;
  onDoubleLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onWallpaper: () => void;
  onOpenComments: () => void;
}) {
  const [lang] = useLang();
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (!burstSignal) return;
    setShowBurst(true);
    const t = setTimeout(() => setShowBurst(false), 700);
    return () => clearTimeout(t);
  }, [burstSignal]);

  return (
    <section className="feed-card card-hover relative flex h-full snap-start overflow-hidden rounded-2xl border border-line bg-surface">
      <ChineseBackdrop variant="mountains clouds" />

      {/* 正文列：动作栏独立成列，正文永远不被压字 */}
      <div className="feed-body relative flex min-w-0 flex-1 flex-col justify-center px-6 pb-24 pt-10 text-center">
        {/* 原文大字（双击点赞区） */}
        <div onDoubleClick={onDoubleLike} className="relative select-none">
          <p className="feed-quote relative font-serif font-medium text-fg">
            {it.original_text}
          </p>
          {it.translation && (
            <p className="feed-trans relative font-serif italic text-muted">
              {it.translation}
            </p>
          )}
          <span className="feed-ref relative mx-auto inline-block rounded-full border border-line bg-surface-2 text-muted">
            {it.ref_label}
          </span>

          {/* 双击点赞：朱砂印章「赞」 */}
          {showBurst && (
            <div className="like-stamp" aria-hidden>
              <span className="stamp-ring" />
              <span className="stamp-seal">赞</span>
            </div>
          )}
        </div>
      </div>

      {/* 署名 + 标签（左下） */}
      <div className="feed-sign absolute bottom-7 start-6 end-24 text-start">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg">
          <span className="seal flex h-6 w-6 items-center justify-center rounded-full font-serif text-[10px]">
            {it.persona[0]}
          </span>
          {it.persona}
        </div>
        <div className="feed-tags text-[11px] text-faint">{it.tags.join("  ")}</div>
      </div>

      {/* 动作栏：印章字（赞 / 评 / 转 / 纸 / 藏） */}
      <div className="feed-rail relative z-10 flex w-16 shrink-0 flex-col items-center justify-end gap-3.5 pb-7">
        <Action
          label=""
          badge={likeCount > 0 ? String(likeCount) : ""}
          onClick={onLike}
          ariaLabel={t("feed.likeAria", lang)}
          active={liked}
        >
          <span className={`font-serif text-base ${liked ? "" : "text-muted"}`}>赞</span>
        </Action>
        <Action
          label=""
          badge={commentCount > 0 ? String(commentCount) : ""}
          onClick={onOpenComments}
          ariaLabel={t("feed.commentAria", lang)}
        >
          <span className="font-serif text-base text-muted">评</span>
        </Action>
        <Action label={t("feed.share", lang)} onClick={onShare} ariaLabel={t("feed.share", lang)}>
          <span className="font-serif text-base text-muted">转</span>
        </Action>
        <Action label={t("feed.wallpaper", lang)} onClick={onWallpaper} ariaLabel={t("feed.wallpaper", lang)}>
          <span className="font-serif text-base text-muted">纸</span>
        </Action>
        <Action label={saved ? t("feed.savedShort", lang) : t("feed.save", lang)} onClick={onSave} active={saved}>
          <span className={`font-serif text-base ${saved ? "" : "text-muted"}`}>藏</span>
        </Action>
      </div>
    </section>
  );
}

function Action({
  children,
  label,
  badge,
  onClick,
  ariaLabel,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
  ariaLabel?: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-fg">
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className={`btn btn-lg btn-icon pressable btn-outline ${active ? "is-active" : ""}`}
      >
        {children}
      </button>
      {/* 固定高度的说明槽：有无副标题都占同样行高，动作列才不会忽宽忽窄 */}
      <span className="rail-label mt-1 h-3 text-[10px] leading-none text-faint">
        {badge ?? label}
      </span>
    </div>
  );
}

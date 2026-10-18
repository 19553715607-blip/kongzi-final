"use client";

import { useCallback, useEffect, useState } from "react";
import { addFavorite, getFeed, getFavorites, removeFavorite } from "@/lib/api";
import { getApiBase } from "@/lib/apiBase";
import { visitorHeaders } from "@/lib/visitor";
import { t, useLang } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import CommentSheet from "./_components/CommentSheet";
import WallpaperSheet from "./_components/WallpaperSheet";
import { renderCardImage } from "./_components/renderCard";
import type { FeedItem } from "@/lib/types";

type LikeState = { liked: boolean; count: number };

export default function FeedPage() {
  const [lang] = useLang();
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
  // 当前打开的评论抽屉
  const [sheet, setSheet] = useState<{ targetId: string; title: string } | null>(null);

  useEffect(() => {
    getFeed(lang, 20)
      .then((d) => {
        setItems(d);
        setReady(true);
        // 进入卡片后拉取每条金句的真实点赞数与本人 liked
        void preloadLikes(d);
      })
      .catch(() => setErr(t("feed.noBackend", lang)));
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
    <div className="relative mx-auto max-w-md">
      <div className="h-[calc(100dvh-8rem)] snap-y snap-mandatory overflow-y-auto rounded-3xl">
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
          items.map((it, i) => {
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
    <section className="card-hover relative flex h-full snap-start flex-col justify-center overflow-hidden bg-[#2C2C2A] px-7 text-center">
      {/* 氛围光斑 */}
      <div className="pointer-events-none absolute -right-12 -top-8 h-56 w-56 rounded-full bg-[#712B13] opacity-30 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 bottom-24 h-44 w-44 rounded-full bg-[#085041] opacity-30 blur-2xl" />

      {/* 原文大字（双击点赞区） */}
      <div onDoubleClick={onDoubleLike} className="relative select-none">
        <p className="relative font-serif text-[28px] font-medium leading-[1.7] tracking-[0.18em] text-[#F5F0E6]">
          {it.original_text}
        </p>
        {it.translation && (
          <p className="relative mt-5 font-serif text-xs italic leading-relaxed text-[#D3D1C7]">
            {it.translation}
          </p>
        )}
        <span className="relative mx-auto mt-5 inline-block rounded-full bg-[#F5F0E6]/10 px-3 py-1 text-[11px] text-[#F5F0E6]">
          {it.ref_label}
        </span>

        {/* 双击点赞爆裂 */}
        {showBurst && (
          <div className="feed-burst" aria-hidden>
            <span className="burst-heart">❤️</span>
            {[0, 60, 120, 180, 240, 300].map((deg, k) => {
              const rad = (deg * Math.PI) / 180;
              const dx = Math.cos(rad) * 70;
              const dy = Math.sin(rad) * 70 - 30;
              return (
                <span
                  key={k}
                  className="burst-dot"
                  style={
                    {
                      "--dx": `${dx}px`,
                      "--dy": `${dy}px`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 署名 + 标签（左下） */}
      <div className="absolute bottom-7 start-6 end-20 text-start">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#F5F0E6]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#BA7517] font-serif text-[10px] text-[#412402]">
            {it.persona[0]}
          </span>
          {it.persona}
        </div>
        <div className="text-[11px] text-[#FAC775]">{it.tags.join("  ")}</div>
      </div>

      {/* 右侧动作栏 */}
      <div className="absolute bottom-7 end-4 flex flex-col items-center gap-5">
        <Action
          label=""
          badge={likeCount > 0 ? String(likeCount) : ""}
          onClick={onLike}
          ariaLabel={t("feed.likeAria", lang)}
          active={liked}
          activeCls="feed-like-btn liked"
        >
          <span className={`like-glyph text-2xl ${liked ? "scale-110" : ""}`}>
            {liked ? "❤️" : "🤍"}
          </span>
        </Action>
        <Action
          label=""
          badge={commentCount > 0 ? String(commentCount) : ""}
          onClick={onOpenComments}
        >
          💬
        </Action>
        <Action label={t("feed.share", lang)} onClick={onShare}>↗</Action>
        <Action label={t("feed.wallpaper", lang)} onClick={onWallpaper}>🖼</Action>
        <Action label={saved ? t("feed.savedShort", lang) : t("feed.save", lang)} onClick={onSave}>
          <span className="text-xl">{saved ? "⭐" : "☆"}</span>
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
  activeCls = "",
}: {
  children: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
  ariaLabel?: string;
  active?: boolean;
  activeCls?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-[#F5F0E6]">
      <TactileButton
        variant="ghost"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`!h-11 !w-11 !rounded-full !p-0 ${active ? activeCls : ""}`}
      >
        {children}
      </TactileButton>
      {badge ? (
        <span className="text-[10px] tabular-nums leading-none">{badge}</span>
      ) : label ? (
        <span className="text-[10px]">{label}</span>
      ) : null}
    </div>
  );
}

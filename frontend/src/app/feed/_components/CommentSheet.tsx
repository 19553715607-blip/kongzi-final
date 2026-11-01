"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, useLang, type Lang } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { getApiBase } from "@/lib/apiBase";
import { getVisitorId, visitorHeaders } from "@/lib/visitor";
import { useReducedMotion } from "@/lib/motion";

// ── 数据契约（与 /api/v1/comments 对齐）──────────────────────────────────
type CommentNode = {
  id: number;
  author_name: string;
  content: string;
  likes: number;
  created_at: string;
  visitor_id?: string | null;
  user_id?: string | null;
  replies?: CommentNode[];
};
type CommentsResp = { total: number; items: CommentNode[] };

const MAX_LEN = 500;
// 楼中楼：≤2 层全展开，≥3 层折叠
const COLLAPSE_DEPTH = 2;
// 客户端 10 秒发评论频控（与后端 429 互为兜底）
const POST_COOLDOWN_MS = 10_000;

type Props = {
  open: boolean;
  targetType: string;
  targetId: string;
  title?: string;
  onClose: () => void;
  /** 评论总数变化时回调（用于更新卡片上的 💬 角标） */
  onCountChange?: (n: number) => void;
};

function bumpLike(list: CommentNode[], id: number, delta: number): CommentNode[] {
  return list.map((c) => {
    if (c.id === id) return { ...c, likes: Math.max(0, c.likes + delta) };
    if (c.replies?.length) return { ...c, replies: bumpLike(c.replies, id, delta) };
    return c;
  });
}

function flattenCount(list: CommentNode[]): number {
  return list.reduce((acc, c) => acc + 1 + (c.replies ? flattenCount(c.replies) : 0), 0);
}

function relTime(iso: string, lang: Lang): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const m = Math.floor((Date.now() - then) / 60000);
  if (m < 1) return t("comments.justNow", lang);
  if (m < 60) return t("comments.minutesAgo", lang).replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t("comments.hoursAgo", lang).replace("{n}", String(h));
  const d = Math.floor(h / 24);
  return t("comments.daysAgo", lang).replace("{n}", String(d));
}

// ── 单条评论（递归 replies；≥3 层折叠/缩进）─────────────────────────────
function SheetItem({
  node,
  depth,
  myVisitor,
  lang,
  onLike,
  onReport,
  onDelete,
  onPostReply,
}: {
  node: CommentNode;
  depth: number;
  myVisitor: string;
  lang: Lang;
  onLike: (id: number) => void;
  onReport: (id: number) => void;
  onDelete: (id: number) => void;
  onPostReply: (parentId: number, content: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deepOpen, setDeepOpen] = useState(false);

  const replies = node.replies ?? [];
  const isDeep = depth >= COLLAPSE_DEPTH;
  const isMine = !!node.visitor_id && node.visitor_id === myVisitor;
  const name = node.author_name || t("comments.guest", lang);

  const submitReply = async () => {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    await onPostReply(node.id, content);
    setSending(false);
    setDraft("");
    setReplying(false);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="seal flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-sm">
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium text-fg">{name}</span>
            <span className="shrink-0 text-[11px] text-faint">{relTime(node.created_at, lang)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
            {node.content}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 ps-[42px] text-[11px]">
        <button
          onClick={() => onLike(node.id)}
          className="pressable inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-accent"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" /><path d="M15 5.88L14 10h5.6a2 2 0 011.96 2.4l-1.9 8A2 2 0 0117.7 22H7" />
          </svg>
          {t("comments.like", lang)}
          {node.likes > 0 && <span className="tabular-nums">{node.likes}</span>}
        </button>
        <button
          onClick={() => setReplying((s) => !s)}
          className="pressable rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-accent"
        >
          {t("comments.reply", lang)}
        </button>
        <button
          onClick={() => onReport(node.id)}
          className="pressable rounded-full px-2 py-0.5 text-faint transition hover:bg-surface-2 hover:text-accent"
        >
          {t("comments.report", lang)}
        </button>
        {isMine && (
          <button
            onClick={() => onDelete(node.id)}
            className="pressable rounded-full px-2 py-0.5 text-faint transition hover:bg-accent-soft hover:text-accent"
          >
            {t("comments.delete", lang)}
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2 ps-[42px]">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder={t("comments.placeholder", lang)}
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-accent"
          />
          <div className="mt-1 flex items-center gap-2">
            <button onClick={submitReply} disabled={!draft.trim() || sending} className="tactile-btn xs">
              {sending ? t("feed.sheet.sending", lang) : t("comments.submit", lang)}
            </button>
            <button
              onClick={() => { setReplying(false); setDraft(""); }}
              className="pressable rounded-full px-3 py-1 text-xs text-faint hover:bg-surface-2"
            >
              {t("comments.cancel", lang)}
            </button>
            <span className="ms-auto text-[10px] text-faint">{draft.length}/{MAX_LEN}</span>
          </div>
        </div>
      )}

      {replies.length > 0 && isDeep && !deepOpen && (
        <button
          onClick={() => setDeepOpen(true)}
          className="pressable mt-2 ms-[42px] inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-muted transition hover:border-accent hover:text-accent"
        >
          <span className="h-px w-4 bg-current opacity-50" />
          {t("comments.viewReplies", lang).replace("{n}", String(flattenCount(replies)))}
        </button>
      )}

      {replies.length > 0 && (!isDeep || deepOpen) && (
        <div className="mt-2 border-s-2 border-line ps-3 md:ps-4">
          {isDeep && (
            <button onClick={() => setDeepOpen(false)} className="pressable mb-1 text-[11px] text-faint hover:text-accent">
              {t("comments.hideReplies", lang)}
            </button>
          )}
          {replies.map((r) => (
            <div key={r.id}>
              <SheetItem
                node={r}
                depth={depth + 1}
                myVisitor={myVisitor}
                lang={lang}
                onLike={onLike}
                onReport={onReport}
                onDelete={onDelete}
                onPostReply={onPostReply}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 底部抽屉 ─────────────────────────────────────────────────────────────
export default function CommentSheet({ open, targetType, targetId, title, onClose, onCountChange }: Props) {
  const [lang] = useLang();
  const reduced = useReducedMotion();
  const [items, setItems] = useState<CommentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const myVisitor = useRef<string>("");
  const lastPostAt = useRef<number>(0);

  // 入场动画：挂载后下一帧滑入
  const [entered, setEntered] = useState(false);
  // 下滑拖拽距离（px，仅向下）
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/comments?target_type=${encodeURIComponent(
          targetType,
        )}&target_id=${encodeURIComponent(targetId)}`,
        { headers: visitorHeaders() },
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as CommentsResp;
      setItems(data.items ?? []);
      const n = data.total ?? flattenCount(data.items ?? []);
      setTotal(n);
      onCountChange?.(n);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, onCountChange]);

  // 打开时：记录游客身份、拉取评论、锁背景滚动、入场动画、Esc 关闭
  useEffect(() => {
    if (!open) return;
    myVisitor.current = getVisitorId();
    void load();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      setEntered(false);
      setDragY(0);
    };
  }, [open, load, onClose]);

  const post = useCallback(
    async (parentId: number | null, content: string) => {
      // 客户端 10s 频控
      const now = Date.now();
      if (now - lastPostAt.current < POST_COOLDOWN_MS) {
        toast(t("comments.frequent", lang), "err");
        return;
      }
      const res = await fetch(`${getApiBase()}/api/v1/comments`, {
        method: "POST",
        headers: visitorHeaders(true),
        body: JSON.stringify({
          content,
          target_type: targetType,
          target_id: targetId,
          ...(parentId ? { parent_id: parentId } : {}),
        }),
      });
      if (res.status === 429) {
        toast(t("comments.frequent", lang), "err");
        return;
      }
      if (!res.ok) {
        toast(t("comments.postFailed", lang), "err");
        return;
      }
      lastPostAt.current = Date.now();
      await load();
    },
    [targetType, targetId, lang, load],
  );

  const submitTop = async () => {
    const content = draft.trim();
    if (!content) {
      toast(t("comments.minLen", lang), "err");
      return;
    }
    if (content.length > MAX_LEN) {
      toast(t("comments.charLimit", lang), "err");
      return;
    }
    setSubmitting(true);
    await post(null, content);
    setSubmitting(false);
    setDraft("");
  };

  const onLike = useCallback((id: number) => {
    setItems((tree) => bumpLike(tree, id, 1));
    fetch(`${getApiBase()}/api/v1/comments/${id}/like`, { method: "POST", headers: visitorHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => setItems((tree) => bumpLike(tree, id, -1)));
  }, []);

  const onReport = useCallback(
    (id: number) => {
      fetch(`${getApiBase()}/api/v1/comments/${id}/report`, {
        method: "POST",
        headers: visitorHeaders(),
      })
        .then((res) => {
          if (res.ok) toast(t("comments.reported", lang), "ok");
        })
        .catch(() => {});
    },
    [lang],
  );

  const onDelete = useCallback(
    (id: number) => {
      if (!window.confirm(t("comments.deleteConfirm", lang))) return;
      fetch(`${getApiBase()}/api/v1/comments/${id}`, {
        method: "DELETE",
        headers: visitorHeaders(),
      })
        .then((res) => {
          if (res.ok) {
            toast(t("comments.deleted", lang), "ok");
            void load();
          }
        })
        .catch(() => {});
    },
    [lang, load],
  );

  // 下滑拖拽关闭
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 80) onClose();
    setDragY(0);
    touchStartY.current = null;
  };

  if (!open || typeof document === "undefined") return null;

  const panelTransform =
    reduced || dragY > 0
      ? `translateY(${dragY}px)`
      : entered
        ? "translateY(0)"
        : "translateY(100%)";

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("feed.sheet.title", lang)}>
      {/* 半透明遮罩 */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 ${
          entered && dragY === 0 ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 抽屉面板 */}
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[62dvh] max-w-md flex-col rounded-t-2xl bg-surface text-fg shadow-2xl"
        style={{
          transform: panelTransform,
          transition: reduced ? "none" : "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* 拖拽手柄 + 头部 */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="shrink-0 cursor-grab touch-none active:cursor-grabbing">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-base font-medium">
                {title ?? t("feed.sheet.title", lang)}
              </h3>
              <span className="text-xs text-faint">
                {t("comments.count", lang).replace("{n}", String(total))}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label={t("feed.sheet.close", lang)}
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-faint transition hover:bg-surface-2 hover:text-fg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 评论列表 */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line/60">
          {loading ? (
            <div className="space-y-3 p-4">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-16 w-5/6" />
              <div className="skeleton h-16 w-4/6" />
            </div>
          ) : err ? (
            <div className="error-state m-4">
              <span className="icon-plate">!</span>
              <div className="state-title">{t("comments.error.title", lang)}</div>
              <button onClick={() => void load()} className="retry-btn">
                {t("comments.error.retry", lang)}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <span className="icon-plate">言</span>
              <div className="state-title">{t("comments.empty.title", lang)}</div>
              <div className="state-sub">{t("comments.empty.sub", lang)}</div>
            </div>
          ) : (
            <div className="divide-y divide-line/50">
              {items.map((c) => (
                <SheetItem
                  key={c.id}
                  node={c}
                  depth={0}
                  myVisitor={myVisitor.current}
                  lang={lang}
                  onLike={onLike}
                  onReport={onReport}
                  onDelete={onDelete}
                  onPostReply={async (pid, content) => {
                    await post(pid, content);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部固定输入框 */}
        <div className="shrink-0 border-t border-line bg-surface p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
              rows={2}
              placeholder={t("comments.placeholder", lang)}
              className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-accent"
            />
            <button
              onClick={submitTop}
              disabled={!draft.trim() || submitting}
              className="tactile-btn xs shrink-0"
            >
              {submitting ? t("feed.sheet.sending", lang) : t("comments.submit", lang)}
            </button>
          </div>
          <div className="mt-1 text-end text-[10px] text-faint">
            {draft.length}/{MAX_LEN} · {t("comments.charLimit", lang)}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

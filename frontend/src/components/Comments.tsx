"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t, useLang, type Lang } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { Reveal, Pressable } from "@/lib/motion";
import { getApiBase } from "@/lib/apiBase";

// ── 数据契约（与后端 /api/v1/comments 对齐）─────────────────────────────
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

type Props = {
  /** 评论对象类型，如 passage / book / chapter */
  targetType: string;
  /** 评论对象 id */
  targetId: string;
  /** 可选标题；缺省显示「评论 + 数量」 */
  title?: string;
};

const VISITOR_KEY = "kongzi_visitor_id";
const MAX_LEN = 500;
// 超过该深度的回复默认折叠（楼中楼 ≤2 层全展开）
const COLLAPSE_DEPTH = 2;

// 稳定的游客身份：localStorage uuid，所有评论请求带 X-Visitor-Id
function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      const rnd =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      v = "v_" + rnd;
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const vid = getVisitorId();
  if (vid) h["X-Visitor-Id"] = vid;
  return h;
}

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

// ── 单条评论（递归渲染 replies）────────────────────────────────────────
function CommentItem({
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
    <div className="comment-item">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-sm font-medium text-fg">{node.author_name}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint">
          {node.author_name ? "" : t("comments.guest", lang)}
        </span>
        <span className="text-[11px] text-faint">{relTime(node.created_at, lang)}</span>
      </div>

      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
        {node.content}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
        <Pressable
          onClick={() => onLike(node.id)}
          className="pressable inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-accent"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" /><path d="M15 5.88L14 10h5.6a2 2 0 011.96 2.4l-1.9 8A2 2 0 0117.7 22H7" />
          </svg>
          {t("comments.like", lang)}
          {node.likes > 0 && <span className="tabular-nums">{node.likes}</span>}
        </Pressable>
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
        <div className="mt-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder={t("comments.placeholder", lang)}
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-accent"
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={submitReply}
              disabled={!draft.trim() || sending}
              className="tactile-btn xs"
            >
              {t("comments.submit", lang)}
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
          className="pressable mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-muted transition hover:border-accent hover:text-accent"
        >
          <span className="h-px w-4 bg-current opacity-50" />
          {t("comments.viewReplies", lang).replace("{n}", String(flattenCount(replies)))}
        </button>
      )}

      {replies.length > 0 && (!isDeep || deepOpen) && (
        <div className="mt-2 border-s-2 border-line ps-3 md:ps-4">
          {isDeep && (
            <button
              onClick={() => setDeepOpen(false)}
              className="pressable mb-1 text-[11px] text-faint hover:text-accent"
            >
              {t("comments.hideReplies", lang)}
            </button>
          )}
          {replies.map((r) => (
            <div key={r.id} className="py-1.5">
              <CommentItem
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

// ── 评论区容器（target 无关）───────────────────────────────────────────
export default function Comments({ targetType, targetId, title }: Props) {
  const [lang] = useLang();
  const [items, setItems] = useState<CommentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const myVisitor = useRef<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/comments?target_type=${encodeURIComponent(
          targetType,
        )}&target_id=${encodeURIComponent(targetId)}`,
        { headers: headers() },
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as CommentsResp;
      setItems(data.items ?? []);
      setTotal(data.total ?? flattenCount(data.items ?? []));
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    myVisitor.current = getVisitorId();
    void load();
  }, [load]);

  const post = useCallback(
    async (parentId: number | null, content: string) => {
      const res = await fetch(`${getApiBase()}/api/v1/comments`, {
        method: "POST",
        headers: headers(true),
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

  const onLike = useCallback(
    (id: number) => {
      setItems((tree) => bumpLike(tree, id, 1));
      fetch(`${getApiBase()}/api/v1/comments/${id}/like`, { method: "POST", headers: headers() })
        .then((res) => {
          if (!res.ok) throw new Error();
        })
        .catch(() => setItems((tree) => bumpLike(tree, id, -1)));
    },
    [],
  );

  const onReport = useCallback((id: number) => {
    fetch(`${getApiBase()}/api/v1/comments/${id}/report`, {
      method: "POST",
      headers: headers(),
    })
      .then((res) => {
        if (res.ok) toast(t("comments.reported", lang), "ok");
      })
      .catch(() => {});
  }, [lang]);

  const onDelete = useCallback(
    (id: number) => {
      if (!window.confirm(t("comments.deleteConfirm", lang))) return;
      fetch(`${getApiBase()}/api/v1/comments/${id}`, {
        method: "DELETE",
        headers: headers(),
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

  return (
    <section className="card-hover rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-serif text-sm font-medium text-fg">
          {title ?? t("comments.title", lang)}
        </h3>
        <span className="text-xs text-faint">
          {t("comments.count", lang).replace("{n}", String(total))}
        </span>
        <span className="ornament-rule flex-1">
          <span className="h-px flex-1 bg-line" />
        </span>
      </div>

      {/* 主评论输入框 */}
      <div className="mb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          rows={3}
          placeholder={t("comments.placeholder", lang)}
          className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-accent"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={submitTop}
            disabled={!draft.trim() || submitting}
            className="tactile-btn xs"
          >
            {t("comments.submit", lang)}
          </button>
          <span className="ms-auto text-[10px] text-faint">
            {draft.length}/{MAX_LEN} · {t("comments.charLimit", lang)}
          </span>
        </div>
      </div>

      {/* 列表态：加载 / 错误 / 空 / 列表 */}
      {loading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-5/6" />
        </div>
      ) : err ? (
        <div className="error-state">
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
        <div className="space-y-1">
          {items.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i * 40, 160)}>
              <div className="border-t border-line/60 py-3 first:border-t-0">
                <CommentItem
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
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

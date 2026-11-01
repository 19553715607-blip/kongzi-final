"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getTopics, streamChat } from "@/lib/api";
import { copyText } from "@/lib/ui";
import { toast } from "@/components/Toast";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import type {
  CitationEvent,
  CrossCivView,
  TopicBrief,
  TopicCard,
  VerifyEvent,
} from "@/lib/types";

interface AssistantMsg {
  role: "assistant";
  text: string;
  citations: CitationEvent[];
  agents: string[];
  verify?: VerifyEvent;
  topic?: TopicCard;
  crossCiv?: CrossCivView[];
  streaming: boolean;
}
interface UserMsg {
  role: "user";
  text: string;
}
type Msg = UserMsg | AssistantMsg;

// 智能体名与校验分轨的中文标签移入 lib/i18n，这里只保留 key
const AGENT_KEY: Record<string, { key: string; color: string }> = {
  router: { key: "chat.agent.chief", color: "#993C1D" },
  retrieval: { key: "chat.agent.retrieval", color: "#0F6E56" },
  synthesizer: { key: "chat.agent.synthesis", color: "#854F0B" },
  topic_engine: { key: "chat.agent.topic", color: "#1E5F8E" },
  cross_civilization: { key: "chat.agent.crossciv", color: "#534AB7" },
  translator: { key: "chat.agent.translate", color: "#7A6F2C" },
  cross_culture: { key: "chat.agent.crossculture", color: "#1E5F8E" },
  verifier: { key: "chat.agent.verify", color: "#A63A2C" },
};

const CIV_COLORS: Record<string, string> = {
  confucian: "#993C1D",
  christian: "#7A4B36",
  enlightenment: "#0F6E56",
  kantian: "#534AB7",
  buddhist: "#854F0B",
};

const VERIFY_KEYS: [keyof VerifyEvent, string][] = [
  ["textual", "chat.track.text"],
  ["modern", "chat.track.modern"],
  ["cultural", "chat.track.cultural"],
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [lang] = useLang();
  const [busy, setBusy] = useState(false);
  const [topics, setTopics] = useState<TopicBrief[]>([]);
  const [topicHint, setTopicHint] = useState<string | null>(null);
  // 兼容：crypto.randomUUID() 仅 secure context (HTTPS/localhost) 可用；HTTP+IP 时需要 fallback
  const convId = useRef<string>(
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : "conv-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  /** 输入框随内容增高，最高 10rem（约 6 行）后内部滚动 */
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  const abortRef = useRef<AbortController | null>(null);

  // 议题清单随语言切换；用取消标志避免 zh→ar 首次加载时旧请求后到覆盖新结果
  useEffect(() => {
    let alive = true;
    getTopics(lang)
      .then((d) => {
        if (alive) setTopics(d);
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [lang]);

  // 仅在挂载时读取一次 URL 上的 q / topic
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const q = url.get("q");
    const t = url.get("topic");
    if (t) setTopicHint(t);
    if (q) void send(q, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, followups]);

  async function send(text: string, hintOverride?: string | null) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setFollowups([]);
    setInput("");
    // 复位输入框高度，否则发送后仍留着上一条的高度
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "assistant", text: "", citations: [], agents: [], streaming: true },
    ]);

    const patchLast = (fn: (a: AssistantMsg) => AssistantMsg) =>
      setMessages((m) => {
        const copy = [...m];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "assistant") {
            copy[i] = fn(copy[i] as AssistantMsg);
            break;
          }
        }
        return copy;
      });

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat(
        {
          message: q,
          conversation_id: convId.current,
          lang,
          device: "web",
          topic_hint: hintOverride !== undefined ? hintOverride : topicHint,
        },
        {
          onAgents: (e) => patchLast((a) => ({ ...a, agents: e.active })),
          onTopic: (e) => patchLast((a) => ({ ...a, topic: e })),
          onCitation: (e) => patchLast((a) => ({ ...a, citations: [...a.citations, e] })),
          onToken: (t) => patchLast((a) => ({ ...a, text: a.text + t })),
          onVerify: (e) => patchLast((a) => ({ ...a, verify: e })),
          onCrossCiv: (e) => patchLast((a) => ({ ...a, crossCiv: e.views })),
          onFollowups: (items) => setFollowups(items),
          onDone: () => patchLast((a) => ({ ...a, streaming: false })),
          onError: (msg) =>
            patchLast((a) => ({
              ...a,
              streaming: false,
              text: a.text || t("chat.errHint", lang).replace("{msg}", msg),
            })),
        },
        ctrl.signal,
      );
    } catch (e) {
      // AbortError 是用户主动停止，不算失败
      if ((e as Error)?.name !== "AbortError") {
        patchLast((a) => ({
          ...a,
          streaming: false,
          text: a.text || t("chat.noBackend", lang),
        }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  const stop = () => {
    abortRef.current?.abort();
    setMessages((m) =>
      m.map((x) =>
        x.role === "assistant" && x.streaming ? { ...x, streaming: false } : x,
      ),
    );
  };

  const clearAll = () => {
    if (messages.length === 0) return;
    setMessages([]);
    setFollowups([]);
    toast(t("chat.cleared", lang), "ok");
  };

  const doCopy = async (msg: AssistantMsg) => {
    const parts: string[] = [];
    if (msg.topic) parts.push(`${t("chat.topicPrefix", lang)}${msg.topic.name} — ${msg.topic.description}`);
    for (const c of msg.citations) {
      parts.push(`${c.text}\n（${c.ref_label}）`);
    }
    if (msg.text) parts.push(msg.text);
    const ok = await copyText(parts.join("\n\n"));
    toast(ok ? t("chat.copied", lang) : t("chat.copyFail", lang), ok ? "ok" : "err");
  };

  return (
    <div className="flex h-[calc(100dvh-11rem-var(--notice-h,0px))] flex-col md:h-[calc(100dvh-7.5rem-var(--notice-h,0px))]">
      {/* 会话头：人格 + 议题筛选。横向居中，与对话列同宽 */}
      <header className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2.5 border-b border-line/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <span className="truncate">{t("chat.personaName", lang)}</span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
            </div>
            <div className="truncate text-xs text-faint">{t("chat.tagline", lang)}</div>
          </div>
          <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint sm:inline">
            {lang.toUpperCase()}
          </span>
          {messages.length > 0 && (
            <button
              onClick={clearAll}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition hover:bg-surface-2 hover:text-accent"
              title={t("chat.clear", lang)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
              {t("chat.clear", lang)}
            </button>
          )}
        </div>

        {/* 议题 chip 选择器（申报书 5 大全球议题） */}
        {topics.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="shrink-0 text-[11px] text-faint">{t("chat.topicPrefix", lang)}</span>
            <button
              onClick={() => setTopicHint(null)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                topicHint === null ? "bg-accent text-on-accent" : "border border-line text-muted"
              }`}
            >
              {t("chat.auto", lang)}
            </button>
            {topics.map((tp) => (
              <button
                key={tp.id}
                onClick={() => setTopicHint(tp.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                  topicHint === tp.id ? "text-white" : "border border-line text-muted"
                }`}
                style={topicHint === tp.id ? { background: tp.color } : undefined}
              >
                {tp.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 消息流：整列居中，宽度对齐阅读舒适区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full max-w-3xl py-5 ${
            messages.length === 0 ? "flex min-h-full flex-col justify-center" : "space-y-7"
          }`}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <div className="font-serif text-xl text-fg">{t("chat.personaName", lang)}</div>
              <p className="max-w-md text-sm leading-relaxed text-muted">{t("chat.tryTopics", lang)}</p>
              {topics.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {topics.slice(0, 3).map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => {
                        setTopicHint(tp.id);
                        taRef.current?.focus();
                      }}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
                    >
                      {tp.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-ee-lg bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed text-fg">
                  {m.text}
                </div>
              </div>
            ) : (
              <AssistantBubble key={i} msg={m} onCopy={doCopy} />
            ),
          )}
        </div>
      </div>

      {/* 输入区：圆角容器 + 自适应高度 textarea，Enter 发送 / Shift+Enter 换行 */}
      <div className="mx-auto w-full max-w-3xl shrink-0 pt-2">
        {followups.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {followups.map((f) => (
              <button
                key={f}
                onClick={() => send(f)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition focus-within:border-accent/70"
        >
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              // 中文/日文输入法组合期间的回车不能当发送
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={t("chat.placeholder", lang)}
            disabled={busy}
            className="max-h-40 w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed text-fg outline-none placeholder:text-faint disabled:opacity-60"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <span className="ps-2 text-[10px] text-faint">{t("chat.inputHint", lang)}</span>
            <div className="ms-auto flex items-center gap-1.5">
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-muted transition hover:border-accent hover:text-accent"
                  title={t("chat.stop", lang)}
                >
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-current" />
                  {t("chat.stop", lang)}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label={t("chat.send", lang)}
                  title={t("chat.send", lang)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent transition hover:opacity-90 disabled:opacity-30"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssistantBubble({ msg, onCopy }: { msg: AssistantMsg; onCopy: (m: AssistantMsg) => void }) {
  const [lang] = useLang();
  // 已完整落地的历史消息直接全量显示，只有正在流式的消息才逐字揭示
  const [visibleLength, setVisibleLength] = useState(() => (msg.streaming ? 0 : msg.text.length));
  const latestText = useRef(msg.text);
  latestText.current = msg.text;
  const caughtUp = !msg.streaming && visibleLength >= msg.text.length;

  // 打字机揭示：单个常驻定时器，按积压量自适应步长，避免流式速度超过揭示速度时长期滞后
  useEffect(() => {
    if (caughtUp) return;
    const timer = window.setInterval(() => {
      setVisibleLength((length) => {
        const total = latestText.current.length;
        if (length >= total) return length;
        const backlog = total - length;
        return Math.min(length + Math.max(1, Math.ceil(backlog / 24)), total);
      });
    }, 16);
    return () => window.clearInterval(timer);
  }, [caughtUp]);

  const visibleText = msg.text.slice(0, visibleLength);
  const typing = msg.streaming || visibleLength < msg.text.length;
  return (
    <div className="group">
      <div className="min-w-0 space-y-2.5">
      {msg.agents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 ps-1">
          {msg.agents.map((a) => {
            const meta = AGENT_KEY[a] ?? { key: "", color: "#888" };
            const label = meta.key ? t(meta.key, lang) : a;
            return (
              <span key={a} className="flex items-center gap-1 text-[10px] text-faint" title={label}>
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* 议题识别横幅 */}
      {msg.topic && (
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={{
            background: `${msg.topic.color}1A`,
            borderInlineStart: `3px solid ${msg.topic.color}`,
            color: "var(--fg)",
          }}
        >
          <span className="me-2 font-medium" style={{ color: msg.topic.color }}>
            {t("chat.topicBanner", lang).replace("{name}", msg.topic.name)}
          </span>
          {msg.topic.description}
        </div>
      )}

      {/* 引证：合并成一个紧凑区块，避免五张卡把正文挤到屏幕外 */}
      {msg.citations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface-2/40">
          <div className="flex items-center gap-1.5 border-b border-line/60 px-3 py-1.5 text-[10px] tracking-wide text-faint">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            {t("chat.citeLabel", lang)} · {msg.citations.length}
          </div>
          <ol className="divide-y divide-line/50">
            {msg.citations.map((c) => (
              <li key={c.ref_id} className="px-3 py-2">
                <div className="font-serif text-[13.5px] leading-relaxed text-fg">{c.text}</div>
                <div className="mt-0.5 text-[10px] text-accent">{c.ref_label}</div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(msg.text || msg.streaming) && (
        <div>
          <div className="text-[15px] leading-[1.8] text-fg">
            {renderAssistantMarkdown(visibleText)}
            {typing && (
              <span
                className="ms-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle"
                aria-hidden="true"
              />
            )}
            {/* 首个 token 到达前的空窗：给一个呼吸点，避免看起来卡住 */}
            {!msg.text && msg.streaming && (
              <span className="inline-flex items-center gap-1 align-middle">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
              </span>
            )}
          </div>
          {!msg.streaming && msg.text && (
            <div className="mt-1.5 flex items-center gap-1">
              <button
                onClick={() => onCopy(msg)}
                title={t("chat.copy", lang)}
                className="rounded-md px-1.5 py-1 text-[11px] text-faint opacity-0 transition hover:bg-surface-2 hover:text-accent group-hover:opacity-100 focus:opacity-100"
              >
                {t("chat.copy", lang)}
              </button>
            </div>
          )}
        </div>
      )}

      {msg.verify && (
        <div className="flex flex-wrap gap-1.5">
          {VERIFY_KEYS.map(([k, key]) => {
            const v = msg.verify![k];
            const good = v >= 0.8;
            return (
              <span
                key={k}
                className={`rounded-full px-2 py-0.5 text-[10px] ${good ? "bg-cel-soft text-cel-ink" : "bg-surface-2 text-muted"
                  }`}
              >
                {t(key, lang)} {Math.round(v * 100)}%
              </span>
            );
          })}
        </div>
      )}

      {/* 跨文明对照（并列卡片网格） */}
      {msg.crossCiv && msg.crossCiv.length > 0 && (
        <div>
          <div className="mb-2 mt-1 text-xs text-faint">
            {t("chat.crossBanner", lang).replace("{n}", String(msg.crossCiv.length))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {msg.crossCiv.map((v) => (
              <CrossCivCard key={v.civilization} v={v} />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function renderAssistantMarkdown(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="whitespace-pre-wrap">
        {renderInlineMarkdown(paragraph.join("\n"))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 ps-5 marker:text-accent">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="font-semibold text-accent-ink">
          {renderInlineMarkdown(heading[1])}
        </h3>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return <div className="space-y-2.5">{blocks}</div>;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-accent-ink">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function CrossCivCard({ v }: { v: CrossCivView }) {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const color = CIV_COLORS[v.civilization] ?? "#888";
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="block w-full p-3 text-start"
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-6 rounded-full"
            style={{ background: color }}
          />
          <span className="text-xs font-medium" style={{ color }}>
            {v.civ_label}
          </span>
          {v.ai_generated && !v.reviewed && (
            <span className="ms-auto rounded-full bg-surface-2 px-1.5 text-[9px] text-faint">
              {t("chat.aiAssist", lang)}
            </span>
          )}
        </div>
        <div className="font-serif text-sm leading-relaxed text-fg">
          {v.headline}
        </div>
        <div className="mt-1 text-[10px] text-faint">
          {open ? t("chat.collapse", lang) : t("chat.expand", lang)}
        </div>
      </button>
      {open && (
        <div className="border-t border-line bg-surface-2/40 px-3 py-3">
          <p className="text-xs leading-relaxed text-muted">{v.detail}</p>
          {v.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {v.sources.map((s, i) => (
                <span
                  key={i}
                  title={s.citation}
                  className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-faint"
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

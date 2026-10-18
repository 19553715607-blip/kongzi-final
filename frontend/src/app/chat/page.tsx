"use client";

import { useEffect, useRef, useState } from "react";
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
  const abortRef = useRef<AbortController | null>(null);

  // 议题清单随语言切换；用取消标志避免 zh→ar 首次加载时旧请求后到覆盖新结果
  useEffect(() => {
    let alive = true;
    getTopics(lang)
      .then((d) => {
        if (alive) setTopics(d);
      })
      .catch(() => {});
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
    <div className="flex h-[calc(100dvh-11rem)] flex-col md:h-[calc(100dvh-7.5rem)]">
      {/* AI 人格名片 */}
      <Reveal className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-celadon font-serif text-celadon-deep">
          {t("chat.avatar", lang)}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
            {t("chat.personaName", lang)} <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          </div>
          <div className="text-xs text-faint">{t("chat.tagline", lang)}</div>
        </div>
        <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint sm:inline">
          {lang.toUpperCase()}
        </span>
        {messages.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition hover:bg-surface-2 hover:text-accent"
            title={t("chat.clear", lang)}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
            {t("chat.clear", lang)}
          </button>
        )}
      </Reveal>

      {/* 议题 chip 选择器（申报书 5 大全球议题） */}
      {topics.length > 0 && (
        <Reveal delay={60} className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs text-faint">{t("chat.topicPrefix", lang)}</span>
          <button
            onClick={() => setTopicHint(null)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
              topicHint === null
                ? "bg-accent text-white"
                : "border border-line text-muted"
            }`}
          >
            {t("chat.auto", lang)}
          </button>
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setTopicHint(t.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                topicHint === t.id ? "text-white" : "border border-line text-muted"
              }`}
              style={topicHint === t.id ? { background: t.color } : undefined}
            >
              {t.name}
            </button>
          ))}
        </Reveal>
      )}

      {/* 消息流 */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pe-1">
        {messages.length === 0 && (
          <div className="empty-state">
            <span className="icon-plate">曰</span>
            <span className="state-title">{t("state.empty.title", lang)}</span>
            <span className="state-sub">{t("chat.tryTopics", lang)}</span>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <Reveal key={i} delay={i * 60}>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-ee-sm bg-cinnabar px-4 py-2 text-sm leading-relaxed text-cinnabar-soft">
                  {m.text}
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal key={i} delay={i * 60}>
              <AssistantBubble msg={m} onCopy={doCopy} />
            </Reveal>
          ),
        )}
      </div>

      {/* 追问 chips */}
      {followups.length > 0 && (
        <Reveal delay={100} className="flex flex-wrap gap-2 py-2">
          {followups.map((f) => (
            <button
              key={f}
              onClick={() => send(f)}
              className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-muted hover:bg-accent-soft hover:text-accent"
            >
              {f}
            </button>
          ))}
        </Reveal>
      )}

      {/* 输入框 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder", lang)}
          disabled={busy}
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg outline-none focus:border-accent disabled:opacity-50"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="flex h-10 w-16 items-center justify-center gap-1 rounded-full bg-surface-2 text-sm text-accent"
            title={t("chat.stop", lang)}
          >
            <span className="h-3 w-3 rounded-[3px] bg-accent" />
            {t("chat.stop", lang)}
          </button>
        ) : (
          <TactileButton
            type="submit"
            variant="cel"
            disabled={!input.trim()}
            className="h-10 w-10 !rounded-full !p-0"
            aria-label={t("chat.send", lang)}
          >
            ↑
          </TactileButton>
        )}
      </form>
    </div>
  );
}

function AssistantBubble({ msg, onCopy }: { msg: AssistantMsg; onCopy: (m: AssistantMsg) => void }) {
  const [lang] = useLang();
  return (
    <div className="group space-y-2">
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
          className="max-w-[88%] rounded-lg px-3 py-2 text-xs"
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

      {msg.citations.map((c) => (
        <div
          key={c.ref_id}
          className="max-w-[88%] rounded-e-lg border-s-[3px] border-accent bg-accent-soft px-3 py-2"
        >
          <div className="font-serif text-[15px] font-medium tracking-wide text-accent-ink">
            {c.text}
          </div>
          <div className="mt-1 text-[10px] text-accent">{c.ref_label}</div>
        </div>
      ))}

      {(msg.text || msg.streaming) && (
        <div className="flex items-start gap-2">
          <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-es-sm bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-fg">
            {msg.text}
            {msg.streaming && (
              <span className="ms-1 inline-flex gap-0.5 align-middle">
                <span className="typing-dot h-1 w-1 rounded-full bg-faint" />
                <span className="typing-dot h-1 w-1 rounded-full bg-faint" />
                <span className="typing-dot h-1 w-1 rounded-full bg-faint" />
              </span>
            )}
          </div>
          {!msg.streaming && msg.text && (
            <button
              onClick={() => onCopy(msg)}
              title={t("chat.copy", lang)}
              className="mt-1 shrink-0 rounded-full border border-line px-2 py-1 text-[10px] text-faint opacity-0 transition hover:bg-surface-2 hover:text-accent group-hover:opacity-100"
            >
              {t("chat.copy", lang)}
            </button>
          )}
        </div>
      )}

      {msg.verify && (
        <div className="flex flex-wrap gap-1.5 ps-1">
          {VERIFY_KEYS.map(([k, key]) => {
            const v = msg.verify![k];
            const good = v >= 0.8;
            return (
              <span
                key={k}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  good ? "bg-cel-soft text-cel-ink" : "bg-surface-2 text-muted"
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
        <div className="ps-1">
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
  );
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

"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getLiHostLeaderboard, getLiHostToday, isAuthError, submitLiHostResult, errorHint } from "@/lib/api";
import type {
  LiHostLeaderboardResp,
  LiHostResultResp,
  LiHostScores,
  LiHostStateItem,
  LiHostTodayResp,
} from "@/lib/types";
import { LI_HOST_SCENARIOS, liHostScenario } from "./liHostData";
import type { LiHostRoundDetail } from "./liHostData";
import { geomTotal } from "./liHostLogic";
import { t, useLang } from "@/lib/i18n";
import { gt, useGT } from "@/lib/gameDict";
import LiDilemma from "./LiDilemma";

function LiLoading() {
  const g = useGT();
  return (
    <div className="rounded-2xl border border-line bg-surface p-12 text-center">
      <div className="font-serif text-lg text-fg">{g("礼部修行场准备中…")}</div>
      <div className="mt-2 text-xs text-faint">{g("正在加载 3D 宾主厅")}</div>
    </div>
  );
}

const Li3DGame = dynamic(() => import("./Li3DGame"), {
  ssr: false,
  loading: () => <LiLoading />,
});

type View = "hub" | "playing" | "result";

const DIFF_LABEL = ["", "入门", "初阶", "进阶", "高阶", "终局"];

const GRADE_COLOR: Record<string, string> = {
  礼之大成: "#993C1D",
  君子儒: "#854F0B",
  守礼君子: "#0F6E56",
  通情达人: "#1E5F8E",
  习礼者: "#6b7280",
};

export default function LiGamePage() {
  const [view, setView] = useState<View>("hub");
  const [today, setToday] = useState<LiHostTodayResp | null>(null);
  const [board, setBoard] = useState<LiHostLeaderboardResp | null>(null);
  const [currentKey, setCurrentKey] = useState("");
  const [scores, setScores] = useState<LiHostScores | null>(null);
  const [detail, setDetail] = useState<LiHostRoundDetail | null>(null);
  const [result, setResult] = useState<LiHostResultResp | null>(null);
  const [err, setErr] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [lang] = useLang();

  const refresh = useCallback(() => {
    getLiHostToday().then(setToday).catch((e) => setErr(isAuthError(e) ? t("common.loginRequired", lang) : gt("无法加载礼艺场景，请稍后重试", lang) + `（${errorHint(e)}）`));
    getLiHostLeaderboard(8).then(setBoard).catch(() => {});
  }, [lang]);

  useEffect(refresh, [refresh]);

  const play = (key: string) => {
    setCurrentKey(key);
    setScores(null);
    setDetail(null);
    setResult(null);
    setShareMsg("");
    setView("playing");
  };

  const backToHub = () => {
    setView("hub");
    setCurrentKey("");
    refresh();
  };

  const handleFinish = async (s: LiHostScores, d: LiHostRoundDetail) => {
    setScores(s);
    setDetail(d);
    setView("result");
    try {
      const r = await submitLiHostResult(currentKey, s);
      setResult(r);
    } catch {
      setErr(gt("结算上报失败，分数未入账", lang));
    }
  };

  const shareResult = async () => {
    if (!scores || !result) return;
    const cfg = liHostScenario(currentKey);
    const text = `${gt("执礼", lang)} · ${gt(cfg.title, lang)} — ${gt(result.grade, lang)} ${result.total} ${gt("分", lang)}（${gt("敬", lang)}${scores.jing}·${gt("序", lang)}${scores.xu}·${gt("节", lang)}${scores.jie}）`;
    try {
      if (navigator.share) {
        await navigator.share({ title: gt("执礼 · 宾至如归", lang), text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareMsg(gt("成绩已复制到剪贴板", lang));
      }
    } catch {
      setShareMsg(gt("分享已取消", lang));
    }
  };

  if (view === "playing" && currentKey) {
    return <Li3DGame scenarioKey={currentKey} onExit={backToHub} onFinish={handleFinish} />;
  }

  if (view === "result" && currentKey && scores && detail) {
    return (
      <div className="space-y-3">
        {err && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-soft p-3 text-xs text-accent">
            <span className="flex-1">{err}</span>
            <button
              type="button"
              onClick={() => {
                setErr("");
                refresh();
              }}
              className="pressable shrink-0 rounded-full bg-surface px-2.5 py-1 text-accent"
            >
              {gt("再试一次", lang)}
            </button>
          </div>
        )}
        <ResultView
          scenarioKey={currentKey}
          scores={scores}
          detail={detail}
          result={result}
          shareMsg={shareMsg}
          onShare={shareResult}
          onBack={backToHub}
        />
      </div>
    );
  }

  return (
    <HubView
      today={today}
      board={board}
      err={err}
      onPlay={play}
    />
  );
}

function HubView({
  today,
  board,
  err,
  onPlay,
}: {
  today: LiHostTodayResp | null;
  board: LiHostLeaderboardResp | null;
  err: string;
  onPlay: (key: string) => void;
}) {
  const [lang] = useLang();
  const t = (zh: string) => gt(zh, lang);
  const state = new Map<string, LiHostStateItem>(
    (today?.scenarios ?? []).map((s) => [s.key, s]),
  );
  const liScore = today?.progress.liuyi_li ?? 0;

  if (err) {
    return <div className="rounded-lg bg-accent-soft p-4 text-sm text-accent">{err}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/journey" className="text-xs text-faint hover:text-accent">
          {t("← 君子之路")}
        </Link>
        <div className="font-serif text-lg text-fg">{t("礼 · 执礼")}</div>
        <div className="w-16" />
      </div>

      {/* 修行场 hub */}
      <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#5c5046] via-[#7a6b5c] to-[#4a4038] p-5 text-[#f5efe6]">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-2xl" />
        <div className="relative flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#e8b87a]/80">{t("礼部修行场")}</div>
            <div className="font-serif text-3xl">{t("执礼 · 宾至如归")}</div>
            <div className="mt-1 text-xs text-[#f5efe6]/65">{t("第三人称漫步庭院 · 走近互动完成三幕礼仪")}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#ffffff22" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="#e8b87a" strokeWidth="3"
                  strokeDasharray={`${liScore * 0.94} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="mt-1 text-[10px] text-[#e8b87a]">{t("六艺·礼")} {liScore}</div>
            </div>
            {today && (
              <div className="space-y-1 text-end text-xs">
                <div>{t("儒分")} <span className="font-serif text-base text-[#e8b87a]">{today.progress.ru_score}</span></div>
                <div>{t("情分")} <span className="font-serif text-base text-[#e8b87a]">{today.progress.qing_score}</span></div>
              </div>
            )}
          </div>
        </div>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-[#f5efe6]/75">
          {t("步入夏日般宁静的宾主院，走近宾客完成揖礼、安席与席间照应——无事频扰，反失于「节」。")}
        </p>
      </section>

      {/* 雅集列表 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-faint">{t("五场雅集 · 由浅入深")}</div>
          <div className="text-[10px] text-faint">{t("敬 · 序 · 节 几何平均计分")}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LI_HOST_SCENARIOS.map((cfg) => {
            const st = state.get(cfg.key);
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => onPlay(cfg.key)}
                className="group relative overflow-hidden rounded-lg border border-line bg-surface p-4 text-start transition hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
                style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#993C1D" }}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
                    {t(DIFF_LABEL[cfg.difficulty])}
                  </span>
                  {st?.ref_unlocked && (
                    <span className="rounded-full bg-cel-soft px-2 py-0.5 text-[10px] text-cel-ink">{t("经典已解锁")}</span>
                  )}
                  {st?.played_today && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint">{t("今日已计分")}</span>
                  )}
                </div>
                <h3 className="mt-2 font-serif text-lg font-medium text-fg">{t(cfg.title)}</h3>
                <div className="text-[11px] text-faint">{t(cfg.subtitle)}</div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{t(cfg.intro)}</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-[11px] text-faint">
                    {st && st.plays > 0 ? `${t("已赴")} ${st.plays} ${t("局")}` : t("尚未赴宴")}
                  </span>
                  {st?.best_total != null && (
                    <span
                      className="font-serif text-sm"
                      style={{ color: GRADE_COLOR[st.best_grade ?? ""] ?? "#6b7280" }}
                    >
                      {t("最佳")} {st.best_total} · {t(st.best_grade ?? "")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 日常情境抉择：li_scenarios 内容层的入口（此前无任何页面取用） */}
      <LiDilemma />

      {/* 排行 */}
      {board && board.items.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-serif text-base text-fg">{t("执礼排行")}</div>
            <div className="text-[10px] text-faint">{board.note}</div>
          </div>
          <div className="space-y-1.5">
            {board.items.map((it) => (
              <div
                key={it.rank}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  it.is_self ? "bg-accent-soft text-accent-ink" : "bg-surface-2/40 text-muted"
                }`}
              >
                <span className="w-6 font-serif text-faint">{it.rank}</span>
                <span className="flex-1 font-medium">{it.name}</span>
                <span className="font-serif" style={{ color: GRADE_COLOR[it.best_grade] ?? "#6b7280" }}>
                  {it.best_total}
                </span>
                <span className="text-[10px] text-faint">{t(it.best_grade)}</span>
              </div>
            ))}
          </div>
          {board.self && !board.items.some((i) => i.is_self) && (
            <div className="mt-2 rounded-lg border border-dashed border-accent/40 px-3 py-2 text-xs text-accent">
              {t("你的最佳：")}{board.self.best_total} · {t(board.self.best_grade)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ResultView({
  scenarioKey,
  scores,
  detail,
  result,
  shareMsg,
  onShare,
  onBack,
}: {
  scenarioKey: string;
  scores: LiHostScores;
  detail: LiHostRoundDetail;
  result: LiHostResultResp | null;
  shareMsg: string;
  onShare: () => void;
  onBack: () => void;
}) {
  const [lang] = useLang();
  const t = (zh: string) => gt(zh, lang);
  const cfg = liHostScenario(scenarioKey);
  const total = result?.total ?? geomTotal(scores);
  const grade = result?.grade ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-faint hover:text-accent">
          {t("← 回到修行场")}
        </button>
        <div className="text-xs text-faint">{t(cfg.title)} · {t("结算")}</div>
      </div>

      <section className="rounded-lg border-2 border-accent bg-accent-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-accent">{t("礼成")}</div>
            <h2 className="mt-1 font-serif text-2xl text-accent-ink">{grade ? t(grade) : t("结算中…")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(cfg.lesson)}</p>
            {detail.highlight && (
              <p className="mt-2 rounded-lg bg-surface/60 px-3 py-2 text-xs text-accent-ink">{detail.highlight}</p>
            )}
          </div>
          <div className="text-end">
            <div className="text-[10px] text-accent">{t("总分")} · {t("全场气氛")} {detail.atmosphere}</div>
            <div className="font-serif text-4xl text-accent-ink">{total}</div>
            {result && !result.score_applied && (
              <div className="mt-1 text-[10px] text-faint">{t("今日此场已计过分")}</div>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Meter label={t("敬 · 揖礼深浅")} value={scores.jing} color="#993C1D" />
          <Meter label={t("序 · 先后与位次")} value={scores.xu} color="#854F0B" />
          <Meter label={t("节 · 时机与克己")} value={scores.jie} color="#0F6E56" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{t("本局回看")}</div>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
            <li>{t("迎宾先后")} {detail.orderScore} · {t("席位")} {detail.seatScore}</li>
            {detail.bows.map((b, i) => (
              <li key={`b${i}`}>{t("揖")} {t(b.guest)} — {b.verdict}（{b.score}）</li>
            ))}
            {detail.events.map((e, i) => (
              <li key={`e${i}`}>{t(e.label)} — {e.verdict}（{e.score}）</li>
            ))}
            {detail.overActs > 0 && (
              <li className="text-accent">{t("殷勤过度")} ×{detail.overActs}</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{t("入账")}</div>
          {result ? (
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              <li>{t("儒分")} +{result.ru_delta} · {t("情分")} +{result.qing_delta}</li>
              <li>{t("六艺·礼")} +{result.li_delta}（{t("当前")} {result.progress.liuyi_li}）</li>
              <li>{t("修行 XP")} +{result.xp_delta}</li>
            </ul>
          ) : (
            <div className="mt-2 text-xs text-faint">{t("上报中…")}</div>
          )}
        </div>
      </section>

      {result && result.new_unlocked_refs.length > 0 && (
        <section className="space-y-2">
          <div className="text-xs text-faint">{t("解锁经典")}</div>
          {result.new_unlocked_refs.map((ref) => (
            <div key={ref.ref_id} className="rounded-e-lg border-s-[3px] border-accent bg-accent-soft px-3 py-2">
              <div className="font-serif text-sm leading-relaxed text-accent-ink">{ref.text}</div>
              <div className="mt-1 text-[10px] text-accent">{ref.ref_label}</div>
            </div>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 rounded-lg border border-line bg-surface py-3 text-sm text-fg hover:bg-surface-2"
        >
          {t("分享成绩")}
        </button>
        <button type="button" onClick={onBack} className="flex-1 rounded-lg bg-accent py-3 text-sm font-medium text-white">
          {t("回到修行场")}
        </button>
      </div>
      {shareMsg && <p className="text-center text-xs text-faint">{shareMsg}</p>}
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-faint">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

"use client";

/**
 * 礼艺 · 日常情境抉择（`li_scenarios` 内容层的入口）
 *
 * 背景：后端 `/api/v1/li/*` 与 10 道「情境抉择卡」（地铁让座、同事邀功……）一直存在，
 * 但前端没有任何页面取用，这批内容与译文在界面上是「死」的。本组件把它接到礼艺 hub
 * 的雅集列表下方，成为六艺中「礼」的第二个玩法入口：
 *
 * - 每日 3 题（后端 `LiScenario.played` 控制今日去重与计分）；
 * - 选后展示儒分/情分增减、儒家视角点评、他人反应、经典依据；
 * - 文案走 gameDict（以中文字面量为键），与其它六艺页面一致；
 * - 布局全部用逻辑属性（`text-start` / `ms-` / `ps-`），阿拉伯语 RTL 下自动镜像。
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { chooseLiOption, errorHint, getLiToday, isAuthError } from "@/lib/api";
import type { LiChooseResp, LiScenarioBrief, LiTodayResp } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { useGT } from "@/lib/gameDict";

const CATEGORY_LABEL: Record<string, string> = {
  daily: "日常",
  work: "职场",
  friend: "朋友",
  family: "家庭",
  public: "公共",
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function LiDilemma() {
  const [lang] = useLang();
  const gt = useGT();
  const [today, setToday] = useState<LiTodayResp | null>(null);
  const [results, setResults] = useState<Record<number, LiChooseResp>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [authErr, setAuthErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // 切换语言后旧的点评是上一语的，清掉避免同屏混语
    setResults({});
    getLiToday(lang)
      .then((d) => {
        if (!alive) return;
        setToday(d);
        setErr("");
        setAuthErr(false);
      })
      .catch((e) => {
        if (!alive) return;
        const needLogin = isAuthError(e);
        setAuthErr(needLogin);
        setErr(
          needLogin
            ? gt("登录后可记录儒分与情分")
            : `${gt("无法加载情境题，请稍后重试")}（${errorHint(e)}）`,
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // gt 随 lang 变化而变，依赖 lang 即可覆盖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const choose = useCallback(
    async (s: LiScenarioBrief, key: string) => {
      if (busy !== null || results[s.id]) return;
      setBusy(s.id);
      try {
        const r = await chooseLiOption(s.id, key, lang);
        setResults((m) => ({ ...m, [s.id]: r }));
        setToday((d) =>
          d
            ? {
                ...d,
                scenarios: d.scenarios.map((x) =>
                  x.id === s.id ? { ...x, played: true } : x,
                ),
              }
            : d,
        );
        setErr("");
      } catch (e) {
        setAuthErr(isAuthError(e));
        setErr(
          isAuthError(e)
            ? gt("登录后可记录儒分与情分")
            : `${gt("提交失败 — 请检查登录/网络")}（${errorHint(e)}）`,
        );
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, results, lang],
  );

  const scenarios = today?.scenarios ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg text-fg">{gt("日常情境 · 择一而行")}</h2>
          <p className="mt-0.5 text-[11px] text-faint">{gt("每日三题，选后见儒分与点评")}</p>
        </div>
        {today && (
          <div className="text-[10px] text-faint">
            {today.today_done_count}/{today.daily_limit}
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-lg bg-accent-soft p-3 text-sm text-accent">
          {err}
          {authErr && (
            <Link href="/login" className="ms-2 underline">
              {gt("去登录")}
            </Link>
          )}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-line bg-surface p-6 text-center text-xs text-faint">
          {gt("加载中…")}
        </div>
      )}

      {!loading && !err && scenarios.length === 0 && (
        <div className="rounded-lg border border-line bg-surface p-6 text-center text-xs text-faint">
          {gt("今日情境已答完，明日再来")}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {scenarios.map((s) => {
          const res = results[s.id];
          const chosen = res?.chosen;
          return (
            <article
              key={s.id}
              className="rounded-lg border border-line bg-surface p-4"
              style={{ borderInlineStartWidth: 4, borderInlineStartColor: "#993C1D" }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
                  {gt(CATEGORY_LABEL[s.category] ?? "日常")}
                </span>
                {s.played && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-faint">
                    {gt("今日已计分")}
                  </span>
                )}
              </div>

              <h3 className="mt-2 font-serif text-base font-medium text-fg">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.setting}</p>

              {!chosen && (
                <div className="mt-3 space-y-1.5">
                  {s.options.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => choose(s, o.key)}
                      className="flex w-full items-start gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-2 text-start text-xs leading-relaxed text-fg transition hover:border-accent hover:bg-accent-soft/40 disabled:opacity-50"
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-surface px-1.5 text-[10px] text-accent">
                        {o.key}
                      </span>
                      <span>{o.text}</span>
                    </button>
                  ))}
                  {busy === s.id && (
                    <div className="text-[10px] text-faint">{gt("正在结算…")}</div>
                  )}
                </div>
              )}

              {chosen && res && (
                <div className="mt-3 space-y-2 rounded-md bg-accent-soft/50 p-3">
                  <div className="flex items-start gap-2 text-xs text-fg">
                    <span className="mt-0.5 shrink-0 rounded bg-surface px-1.5 text-[10px] text-accent">
                      {chosen.key}
                    </span>
                    <span>{chosen.text}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded-full bg-surface px-2 py-0.5 text-fg">
                      {gt("儒分")} {signed(chosen.ru_delta)}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-fg">
                      {gt("情分")} {signed(chosen.qing_delta)}
                    </span>
                    {!res.score_applied && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-faint">
                        {gt("本题已计分")}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-faint">
                      {gt("儒家视角")}
                    </div>
                    <p className="font-serif text-sm leading-relaxed text-accent-ink">
                      {chosen.comment_ru}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-faint">
                      {gt("他人反应")}
                    </div>
                    <p className="text-xs leading-relaxed text-muted">{chosen.comment_others}</p>
                  </div>

                  {chosen.refs.length > 0 && (
                    <div className="space-y-1 border-t border-line pt-2">
                      <div className="text-[10px] uppercase tracking-wide text-faint">
                        {gt("经典依据")}
                      </div>
                      {chosen.refs.map((r) => (
                        <Link
                          key={r.ref_id}
                          href={`/read?ref=${encodeURIComponent(r.ref_id)}`}
                          className="block rounded text-[11px] leading-relaxed transition hover:bg-surface hover:underline"
                        >
                          <span className="text-accent">{r.ref_label}</span>
                          <span className="ms-1 text-muted">{r.text}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

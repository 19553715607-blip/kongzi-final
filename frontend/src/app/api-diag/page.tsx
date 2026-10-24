"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "@/lib/apiBase";
import { ensureToken, getToken } from "@/lib/auth";
import { t, useLang } from "@/lib/i18n";

type Row = {
  name: string;
  url: string;
  status: string;
  ms: number;
  err?: string;
};

const TARGETS = [
  { name: "语料统计（公开）", path: "/api/v1/corpus/stats", auth: false, method: "GET" },
  { name: "书目列表（公开）", path: "/api/v1/books", auth: false, method: "GET" },
  { name: "领取游客 token（POST）", path: "/api/v1/auth/guest", auth: false, method: "POST" },
  { name: "御艺题库（需 token）", path: "/api/v1/yu/today", auth: true, method: "GET" },
  { name: "书艺字卡（需 token）", path: "/api/v1/shu/today", auth: true, method: "GET" },
  { name: "成长档案（需 token）", path: "/api/v1/gamify/profile", auth: true, method: "GET" },
];

/**
 * 接口连通性自检页（诊断用，不进导航）。
 *
 * 六艺关卡报「network」时，这里能一次性看清：请求实际打到了哪个地址、
 * 是 HTTP 错误还是网络层失败、以及当前 origin / apiBase / token 状态。
 */
export default function ApiDiagPage() {
  const [lang] = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [env, setEnv] = useState("");
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const base = getApiBase();
    // 与 authFetch 一致：没有 token 时先领游客身份，再测需要鉴权的接口
    let token = getToken();
    let tokenNote = token ? "已存在" : "（无，尝试领取…）";
    if (!token) {
      try {
        token = await ensureToken();
        tokenNote = "新领游客 token";
      } catch (e) {
        tokenNote = `领取失败：${e instanceof Error ? e.message : String(e)}`;
      }
    }

    setEnv(
      [
        `origin   : ${window.location.origin}`,
        `apiBase  : ${base === "" ? "（空 → 同源 /api）" : base}`,
        `token    : ${token ? `${token.slice(0, 20)}…（${tokenNote}）` : tokenNote}`,
        `protocol : ${window.location.protocol}`,
      ].join("\n"),
    );

    const out: Row[] = [];
    for (const target of TARGETS) {
      let url = `${base}${target.path}`;
      try {
        url = new URL(url, window.location.origin).href;
      } catch {
        /* 保留原样 */
      }
      const t0 = performance.now();
      try {
        const res = await fetch(`${base}${target.path}`, {
          method: target.method,
          headers:
            target.auth && token ? { Authorization: `Bearer ${token}` } : {},
        });
        out.push({
          name: target.name,
          url,
          status: String(res.status),
          ms: Math.round(performance.now() - t0),
        });
      } catch (e) {
        out.push({
          name: target.name,
          url,
          status: "FAIL",
          ms: Math.round(performance.now() - t0),
          err: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }
    }
    setRows(out);
    setBusy(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const copy = () => {
    const text = [
      env,
      "",
      ...rows.map(
        (r) =>
          `${r.status.padEnd(6)} ${String(r.ms).padStart(5)}ms  ${r.url}${r.err ? `  ← ${r.err}` : ""}`,
      ),
    ].join("\n");
    void navigator.clipboard?.writeText(text);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="font-serif text-lg text-fg">接口连通性自检</h1>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="ms-auto rounded-full bg-accent px-3 py-1.5 text-xs text-on-accent disabled:opacity-50"
          >
            {busy ? "检测中…" : "重新检测"}
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted"
          >
            复制
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted">
          {env || "…"}
        </pre>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-surface p-5">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-faint">
              <th className="pb-2 pe-3 font-normal">接口</th>
              <th className="pb-2 pe-3 font-normal">状态</th>
              <th className="pb-2 pe-3 font-normal">耗时</th>
              <th className="pb-2 font-normal">请求地址</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.url} className="border-t border-line/60">
                <td className="py-2 pe-3 text-fg">{r.name}</td>
                <td
                  className={`py-2 pe-3 font-mono ${
                    r.status === "200" ? "text-cel-ink" : "text-accent"
                  }`}
                >
                  {r.status}
                </td>
                <td className="py-2 pe-3 font-mono text-muted">{r.ms}ms</td>
                <td className="py-2 font-mono text-muted">
                  <div className="break-all">{r.url}</div>
                  {r.err && <div className="mt-0.5 text-accent">{r.err}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-6 text-center text-xs text-faint">{busy ? "检测中…" : "暂无数据"}</p>}
      </section>

      <p className="text-[11px] leading-relaxed text-faint">
        {t("brand.title", lang)} · 排查用，不在导航里。公开接口通、带 token 的不通，是登录态问题；
        全部 FAIL，是网络或反代问题。
      </p>
    </div>
  );
}

// 轻量埋点：visitor_id 存 localStorage，每次路由变化打点一次。
import { getApiBase } from "./apiBase";
const KEY = "kongzi_visitor";

function visitorId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = "v_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function track(path: string, opts: { device?: string; source?: string; campus?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    await fetch(`${getApiBase()}/api/v1/reach/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: visitorId(),
        path,
        device: opts.device || (window.matchMedia("(max-width: 768px)").matches ? "mobile" : "web"),
        source: opts.source || (new URLSearchParams(location.search).get("src") || "direct"),
        campus: opts.campus || new URLSearchParams(location.search).get("campus") || undefined,
      }),
    });
  } catch {
    /* silent */
  }
}

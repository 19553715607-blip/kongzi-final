// 稳定的游客身份：localStorage uuid，评论/点赞等写操作统一带 X-Visitor-Id。
// 与 Comments.tsx 内既有逻辑保持一致（localStorage key = kongzi_visitor_id）。
const VISITOR_KEY = "kongzi_visitor_id";

export function getVisitorId(): string {
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

/** 构造请求头：可选 JSON Content-Type，并附加 X-Visitor-Id。 */
export function visitorHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const vid = getVisitorId();
  if (vid) h["X-Visitor-Id"] = vid;
  return h;
}

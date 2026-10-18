// 智能选 API base：
// - 浏览器：用当前 hostname + 8000 端口（部署到任何 IP/域名自适应）
// - SSR/build：用 NEXT_PUBLIC_API_BASE 或本地 fallback
//
// 这样开发本地 (localhost)、内网部署 (10.x.x.x)、外网域名都不用改代码。

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    // 显式覆盖优先（部署时指向独立域名/反代时用）
    const override = process.env.NEXT_PUBLIC_API_BASE;
    if (override) return override;
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
}

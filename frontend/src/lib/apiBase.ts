// 智能选 API base：
// - 浏览器：默认走「同源 /api 反代」——前端 dev/prod 服务器把 /api/* 转发给后端，
//   这样只需暴露一个端口（3000/80/隧道域名），不需要给后端单独开口。
// - SSR/build：用 NEXT_PUBLIC_API_BASE 或本地 fallback。
//
// 解析优先级：
//   1. NEXT_PUBLIC_API_BASE        显式覆盖（独立后端域名时用，例如 https://api.example.com）
//   2. NEXT_PUBLIC_API_SAMEORIGIN=0 停用同源反代，退回「当前主机:端口」
//   3. 同源（默认）                → 返回 ""，请求落到 /api/v1/... 由 Next 转发
//   4. 兜底                        → 当前主机名:8000（本地直连后端）

export const DEFAULT_BACKEND_PORT = "8000";

/** 是否使用同源 /api 反代。默认开启；设 NEXT_PUBLIC_API_SAMEORIGIN=0 关闭。 */
export function sameOriginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_API_SAMEORIGIN !== "0";
}

export function getApiBase(): string {
  const override = process.env.NEXT_PUBLIC_API_BASE;
  if (override) return override;

  if (typeof window !== "undefined") {
    if (sameOriginEnabled()) {
      // 返回空串：调用处拼成 `${base}${path}` → "/api/v1/..." 即同源相对路径
      return "";
    }
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
  }

  // SSR / build 阶段：容器内与独立后端不通，需绝对地址
  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

// 无摩擦鉴权：首次访问自动领取游客 token，存 localStorage。
import { getApiBase } from "./apiBase";
const KEY = "kongzi_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** 退出登录：清当前 token + 跳转到登录页（或首页）。 */
export function logout(redirect: string = "/login") {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = redirect;
  }
}

/** 切换游客身份：清 token 自动让下一次 ensureToken 领新游客。 */
export function switchGuest(redirect: string = "/") {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = redirect;
  }
}

let provisioning: Promise<string> | null = null;

/** 确保有可用 token：无则向后端领取游客账号。并发安全。 */
export async function ensureToken(): Promise<string> {
  const existing = getToken();
  if (existing) return existing;
  if (!provisioning) {
    provisioning = fetch(`${getApiBase()}/api/v1/auth/guest`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setToken(d.token);
        return d.token as string;
      })
      .finally(() => {
        provisioning = null;
      });
  }
  return provisioning;
}

/** 带鉴权的 fetch：自动附 Bearer，401 时重新领游客 token 重试一次。 */
export async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await ensureToken();
  const call = (t: string) =>
    fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
    });
  let res = await call(token);
  if (res.status === 401) {
    clearToken();
    token = await ensureToken();
    res = await call(token);
  }
  return res;
}

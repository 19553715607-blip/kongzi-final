import { authFetch, getToken } from "./auth";
import type {
  AdminAudienceResp,
  AdminContentKind,
  AdminContentListResp,
  AdminContentResp,
  AdminDashboardResp,
  AdminEngagementResp,
  AdminGameRoundsResp,
  AdminGamesResp,
  AdminUserActivityResp,
  AdminUserListResp,
  AdminUsersTimeseriesResp,
  AnnouncementItem,
  AuditLogResp,
  AuthUser,
  Book,
  Chapter,
  ChatHandlers,
  ChatRequest,
  CaseDetail,
  CaseListResp,
  CaseStats,
  ApplyResult,
  Concept,
  Contribution,
  ContributionListResp,
  CorpusStats,
  DeveloperMe,
  InstitutionAdminItem,
  InstitutionUsageResp,
  PluginItem,
  ReachStats,
  CrossCivView,
  Favorite,
  FeedItem,
  GamifyProfile,
  GraphData,
  MergeSummary,
  Passage,
  PassageBrief,
  PassageNeighbors,
  SettingsKV,
  TopicBrief,
  TopicPassage,
  TopicCard,
} from "./types";

import { getApiBase } from "./apiBase";
const apiBase = () => getApiBase();

/**
 * 后端返回非 2xx 时抛出，携带 HTTP 状态码。
 * 存在的意义：让调用方把「未登录（401/403）」和「真的连不上后端」区分开。
 * 此前所有失败都抛普通 Error，页面 catch 后统一显示「无法连接后端」，
 * 导致未登录用户访问 /journey、/me 时被误导成服务挂了。
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, detail?: string) {
    super(detail ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 是否属于「未登录 / 无权限」，用于显示「请先登录」而非「无法连接后端」。 */
export function isAuthError(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.status === 403);
}

/**
 * 把错误压成一句可展示的短原因，附在失败提示后面。
 * 目的是让用户（和排查者）一眼看出是鉴权、服务端还是网络问题，
 * 而不是只看到笼统的「加载失败」。
 */
export function errorHint(e: unknown): string {
  if (e instanceof ApiError) return `HTTP ${e.status}`;
  if (e instanceof TypeError) return "network";
  if (e instanceof Error && e.message) return e.message.slice(0, 40);
  return "unknown";
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`).catch(() => {
    // 同 authFetch：网络层失败时补上请求路径，避免只看到 "Failed to fetch"
    throw new Error(`network @ ${path}`);
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── 经典内容 ──────────────────────────────────────────────────
export const getBooks = (lang = "zh") => getJSON<Book[]>(`/api/v1/books?lang=${lang}`);
export const getChapters = (bookId: string, lang = "zh") =>
  getJSON<Chapter[]>(`/api/v1/books/${bookId}/chapters?lang=${lang}`);
export const getPassages = (chapterId: string, lang = "zh") =>
  getJSON<PassageBrief[]>(`/api/v1/chapters/${chapterId}/passages?lang=${lang}`);
export const getPassage = (refId: string, lang = "zh") =>
  getJSON<Passage>(`/api/v1/passages/${refId}?lang=${lang}`);
export const getConcept = (id: string, lang = "zh") =>
  getJSON<Concept>(`/api/v1/concepts/${id}?lang=${lang}`);
export const getConcepts = () =>
  getJSON<Concept[]>(`/api/v1/concepts`);
export const getFeed = (lang = "en", limit = 20) =>
  getJSON<FeedItem[]>(`/api/v1/feed?lang=${lang}&limit=${limit}`);

// ── 新增强交互 API（随机/每日/上下条/相关/议题经典）─────────────
export const getRandomPassage = (lang = "zh") =>
  getJSON<Passage>(`/api/v1/passages/random?lang=${lang}`);
export const getTodayPassage = (lang = "zh") =>
  getJSON<Passage>(`/api/v1/passages/today?lang=${lang}`);
export const getPassageNeighbors = (refId: string) =>
  getJSON<PassageNeighbors>(`/api/v1/passages/${refId}/neighbors`);
export const getRelatedPassages = (refId: string, lang = "zh", k = 3) =>
  getJSON<Passage[]>(`/api/v1/passages/${refId}/related?lang=${lang}&k=${k}`);
export const getTopicPassages = (topicId: string, lang = "zh") =>
  getJSON<TopicPassage[]>(`/api/v1/topics/${topicId}/passages?lang=${lang}`);

// ── 语料统计 ───────────────────────────────────────────────────
export const getCorpusStats = () => getJSON<CorpusStats>("/api/v1/corpus/stats");

// ── 开发者公开 API（无需登录）─────────────────────────────────
export async function applyForApi(body: {
  name: string;
  country: string;
  contact_email: string;
  purpose: string;
}) {
  const r = await fetch(`${apiBase()}/api/v1/developers/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(r.status);
  return r.json() as Promise<ApplyResult>;
}

export async function getDeveloperMe(apiKey: string) {
  const r = await fetch(`${apiBase()}/api/v1/developers/me`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!r.ok) throw new ApiError(r.status);
  return r.json() as Promise<DeveloperMe>;
}

export const listInstitutions = (status?: string) =>
  authJSON<InstitutionAdminItem[]>(
    `/api/v1/admin/institutions${status ? `?status=${status}` : ""}`,
  );
export const updateInstitution = (id: number, body: { status?: string; monthly_quota?: number }) =>
  authJSON<{ id: number; status: string; monthly_quota: number }>(
    `/api/v1/admin/institutions/${id}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
export const issueKey = (id: number, label = "default") =>
  authJSON<{ id: number; key: string; label: string; institution_id: number }>(
    `/api/v1/admin/institutions/${id}/keys?label=${encodeURIComponent(label)}`,
    { method: "POST" },
  );
export const revokeKey = (keyId: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/keys/${keyId}`, { method: "DELETE" });

// ── 共创广场 ───────────────────────────────────────────────────
export const listContribs = (params: { topic_id?: string; status?: string; sort?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return getJSON<ContributionListResp>(`/api/v1/contributions?${qs.toString()}`);
};
export const submitContrib = (body: {
  kind?: string;
  topic_id?: string;
  civilization?: string;
  headline: string;
  detail?: string;
  sources?: { label: string; citation: string }[];
  lang?: string;
}) => authJSON<Contribution>("/api/v1/contributions", { method: "POST", body: JSON.stringify(body) });
export const voteContrib = (id: number, value: 1 | -1) =>
  authJSON<Contribution>(`/api/v1/contributions/${id}/vote?value=${value}`, { method: "POST" });
export const reviewContrib = (id: number, status: string) =>
  authJSON<Contribution>(`/api/v1/contributions/admin/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
export const myContribs = () => authJSON<Contribution[]>("/api/v1/contributions/mine");

// ── 插件清单 ───────────────────────────────────────────────────
export const listPlugins = () => getJSON<{ total: number; items: PluginItem[] }>("/api/v1/embed/plugins");

// ── 传播看板 ───────────────────────────────────────────────────
export const getReachStats = () => getJSON<ReachStats>("/api/v1/reach/stats");

// ── 礼之器游戏 ─────────────────────────────────────────────────
export const getLiToday = (lang = "zh") =>
  authJSON<import("./types").LiTodayResp>(`/api/v1/li/today?lang=${lang}`);
export const getLiProgress = () =>
  authJSON<import("./types").LiProgressResp>("/api/v1/li/progress");
export const chooseLiOption = (sid: number, optionKey: string, lang = "zh") =>
  authJSON<import("./types").LiChooseResp>(`/api/v1/li/scenario/${sid}/choose?lang=${lang}`, {
    method: "POST",
    body: JSON.stringify({ option_key: optionKey }),
  });
export const getLiHostToday = () =>
  authJSON<import("./types").LiHostTodayResp>("/api/v1/li/host/today");
export const submitLiHostResult = (key: string, scores: import("./types").LiHostScores) =>
  authJSON<import("./types").LiHostResultResp>(`/api/v1/li/host/${key}/result`, {
    method: "POST",
    body: JSON.stringify(scores),
  });
export const getLiHostLeaderboard = (limit = 10) =>
  authJSON<import("./types").LiHostLeaderboardResp>(`/api/v1/li/host/leaderboard?limit=${limit}`);

// ── 书艺游戏 ───────────────────────────────────────────────────
export const getShuToday = (lang = "zh") =>
  authJSON<import("./types").ShuTodayResp>(`/api/v1/shu/today?lang=${lang}`);
export const answerShuCard = (cardId: number, optionKey: string, lang = "zh") =>
  authJSON<import("./types").ShuAnswerResp>(`/api/v1/shu/card/${cardId}/answer?lang=${lang}`, {
    method: "POST",
    body: JSON.stringify({ option_key: optionKey }),
  });
export const assembleShuCard = (cardId: number, parts: string[]) =>
  authJSON<import("./types").ShuAssembleResp>(`/api/v1/shu/card/${cardId}/assemble`, {
    method: "POST",
    body: JSON.stringify({ parts }),
  });
export const traceShuCard = (
  cardId: number,
  strokes: number,
  durationMs: number,
  score: number = 0,
  precision: number = 0,
  recall: number = 0,
) =>
  authJSON<import("./types").ShuTraceResp>(`/api/v1/shu/card/${cardId}/trace`, {
    method: "POST",
    body: JSON.stringify({
      strokes,
      duration_ms: durationMs,
      score,
      precision,
      recall,
    }),
  });
export const getShuProgress = () =>
  authJSON<import("./types").ShuProgressResp>("/api/v1/shu/progress");
export const getShuLeaderboard = (limit = 20) =>
  getJSON<import("./types").ShuLeaderboardResp>(`/api/v1/shu/leaderboard?limit=${limit}`);

// ── 君子之路 · 总览 + 勋章 + 排行 ──────────────────────────────
export const getJourneyOverview = (lang = "zh") =>
  authJSON<import("./types").JourneyOverviewResp>(`/api/v1/journey/overview?lang=${lang}`);
export const getJourneyLeaderboard = (limit = 20) =>
  authJSON<import("./types").JourneyLeaderboardResp>(`/api/v1/journey/leaderboard?limit=${limit}`);

// ── 御艺·五御 ──────────────────────────────────────────────────
export const getYuToday = (lang = "zh") =>
  authJSON<import("./types").YuTodayResp>(`/api/v1/yu/today?lang=${lang}`);
export const driveYuScenario = (
  sid: number,
  trajectory: import("./types").YuTrajectoryPoint[],
  events: import("./types").YuEvent[],
  lang = "zh",
) =>
  authJSON<import("./types").YuDriveResp>(`/api/v1/yu/scenario/${sid}/drive?lang=${lang}`, {
    method: "POST",
    body: JSON.stringify({ trajectory, events }),
  });
export const getYuProgress = () =>
  authJSON<import("./types").YuProgressResp>("/api/v1/yu/progress");

// ── 数艺·均输衰分 ──────────────────────────────────────────────
export const getMathToday = (lang = "zh") =>
  authJSON<import("./types").MathTodayResp>(`/api/v1/math/today?lang=${lang}`);
export const solveMathScenario = (
  sid: number,
  allocations: Record<string, number>,
  lang = "zh",
) =>
  authJSON<import("./types").MathSolveResp>(`/api/v1/math/scenario/${sid}/solve?lang=${lang}`, {
    method: "POST",
    body: JSON.stringify({ allocations }),
  });
export const getMathProgress = () =>
  authJSON<import("./types").MathProgressResp>("/api/v1/math/progress");

// ── 乐艺·五音合鸣 ──────────────────────────────────────────────
export const getYueToday = (lang = "zh") =>
  authJSON<import("./types").YueTodayResp>(`/api/v1/yue/today?lang=${lang}`);
export const playYueScenario = (sid: number, sequence: import("./types").YueNote[], lang = "zh") =>
  authJSON<import("./types").YuePlayResp>(`/api/v1/yue/scenario/${sid}/play?lang=${lang}`, {
    method: "POST",
    body: JSON.stringify({ sequence }),
  });
export const getYueProgress = () =>
  authJSON<import("./types").YueProgressResp>("/api/v1/yue/progress");

// ── 射艺游戏 ───────────────────────────────────────────────────
export const startSheRound = () =>
  authJSON<import("./types").SheRoundResp>("/api/v1/she/round", { method: "POST" });
export const submitSheResult = (body: import("./types").SheResultIn) =>
  authJSON<import("./types").SheResultResp>("/api/v1/she/result", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const getSheProgress = () =>
  authJSON<import("./types").SheProgressResp>("/api/v1/she/progress");
export const getSheLeaderboard = (metric = "reflection", limit = 20) =>
  getJSON<import("./types").SheLeaderboardResp>(
    `/api/v1/she/leaderboard?metric=${metric}&limit=${limit}`,
  );

// ── 议题 / 跨文明 ───────────────────────────────────────────────
export const getTopics = (lang = "zh") =>
  getJSON<TopicBrief[]>(`/api/v1/topics?lang=${lang}`);
export const getTopic = (id: string, lang = "zh") =>
  getJSON<TopicCard & { cross_civ_views: CrossCivView[] }>(
    `/api/v1/topics/${id}?lang=${lang}`,
  );

// ── 跨文明对话案例库 ────────────────────────────────────────────
export const getCases = (params: {
  topic_id?: string;
  lang?: string;
  status?: string;
  q?: string;
  review?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return getJSON<CaseListResp>(`/api/v1/cases?${qs.toString()}`);
};
export const getCase = (id: number) => getJSON<CaseDetail>(`/api/v1/cases/${id}`);
export const getCaseStats = () => getJSON<CaseStats>("/api/v1/cases/stats");

export const reviewCase = (
  id: number,
  body: { status?: string; quality?: number; review_note?: string },
) =>
  authJSON<CaseDetail>(`/api/v1/admin/cases/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
// promoteSelfAdmin 已移除：admin 通过后端 ADMIN_EMAILS 白名单授予

// ── 知识图谱 ───────────────────────────────────────────────────
export const getNeighborhood = (nodeId: string, depth = 2) =>
  getJSON<GraphData>(
    `/api/v1/graph/concept/${encodeURIComponent(nodeId)}/neighborhood?depth=${depth}`,
  );
export const getPath = (from: string, to: string) =>
  getJSON<GraphData>(
    `/api/v1/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );

// ── 游戏化 / 收藏 / 账户（需鉴权，authFetch 自动领游客 token）──────
async function authJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

export const getGamifyProfile = () =>
  authJSON<GamifyProfile>("/api/v1/gamify/profile");
export const checkin = () =>
  authJSON<GamifyProfile>("/api/v1/gamify/checkin", { method: "POST" });
export const completeTask = (id: string) =>
  authJSON<GamifyProfile>(`/api/v1/gamify/task/${id}/complete`, { method: "POST" });

export const getFavorites = () => authJSON<Favorite[]>("/api/v1/gamify/favorites");
export const addFavorite = (target_type: string, target_ref: string, label = "") =>
  authJSON<{ ok: boolean; profile: GamifyProfile }>("/api/v1/gamify/favorites", {
    method: "POST",
    body: JSON.stringify({ target_type, target_ref, label }),
  });
export const removeFavorite = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/gamify/favorites/${id}`, { method: "DELETE" });

export const getMe = () => authJSON<AuthUser>("/api/v1/auth/me");
export const exportMe = () => authJSON<Record<string, unknown>>("/api/v1/auth/me/export");
export const upgradeAccount = (email: string, password: string, display_name?: string) =>
  authJSON<{ token: string; user: AuthUser }>("/api/v1/auth/upgrade", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  });

/**
 * 邮箱注册（带当前游客 token）。
 * 后端会把游客态积累的进度并入新账号，注册即完成「进度迁移」。
 */
export async function registerByEmail(
  email: string,
  password: string,
  display_name?: string,
) {
  const guestToken = getToken();
  const r = await fetch(`${apiBase()}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(guestToken ? { "X-Guest-Token": guestToken } : {}),
    },
    body: JSON.stringify({ email, password, display_name }),
  });
  if (!r.ok) throw new ApiError(r.status);
  return r.json() as Promise<{
    token: string;
    user: AuthUser;
    merged?: MergeSummary;
  }>;
}

/** 邮箱登录（不需要鉴权 header）。
 * 带上当前游客 token，让后端把游客态积累的 XP / 六艺进境 / 收藏并入目标账号，
 * 否则用户登录后会发现之前的进度凭空消失。
 */
export async function loginByEmail(email: string, password: string) {
  const guestToken = getToken();
  const r = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(guestToken ? { "X-Guest-Token": guestToken } : {}),
    },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new ApiError(r.status);
  return r.json() as Promise<{
    token: string;
    user: AuthUser;
    merged?: MergeSummary;
  }>;
}

// ── 对话（SSE 流式）────────────────────────────────────────────
// chat 走 POST，EventSource 不支持，这里用 fetch + ReadableStream 手动解析 SSE。
export async function streamChat(
  req: ChatRequest,
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    handlers.onError?.(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    switch (event) {
      case "agents":
        handlers.onAgents?.(data as never);
        break;
      case "topic":
        handlers.onTopic?.(data as never);
        break;
      case "citation":
        handlers.onCitation?.(data as never);
        break;
      case "token":
        handlers.onToken?.((data as { text: string }).text);
        break;
      case "verify":
        handlers.onVerify?.(data as never);
        break;
      case "cross_civ":
        handlers.onCrossCiv?.(data as never);
        break;
      case "followups":
        handlers.onFollowups?.(data as string[]);
        break;
      case "done":
        handlers.onDone?.(data as never);
        break;
      case "error":
        handlers.onError?.((data as { message: string }).message);
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE 帧以空行分隔
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (frame.trim()) dispatch(frame);
    }
  }
}

// ── 管理后台（/api/v1/admin，需管理员 token；authFetch 自动带 Bearer）──
export const getAdminDashboard = (days?: number) =>
  authJSON<AdminDashboardResp>(
    `/api/v1/admin/dashboard${days ? `?days=${days}` : ""}`,
  );

export const getAdminUsers = (params: {
  page?: number;
  page_size?: number;
  q?: string;
  kind?: string;
  lang?: string;
  country?: string;
}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return authJSON<AdminUserListResp>(`/api/v1/admin/users?${qs.toString()}`);
};

export const getAdminUsersTimeseries = (days = 30) =>
  authJSON<AdminUsersTimeseriesResp>(`/api/v1/admin/users/timeseries?days=${days}`);

export const getAdminAnalyticsAudience = () =>
  authJSON<AdminAudienceResp>("/api/v1/admin/analytics/audience");

export const getAdminAnalyticsGames = () =>
  authJSON<AdminGamesResp>("/api/v1/admin/analytics/games");

export const getAdminAnalyticsContent = () =>
  authJSON<AdminContentResp>("/api/v1/admin/analytics/content");

export const getAdminAnalyticsEngagement = () =>
  authJSON<AdminEngagementResp>("/api/v1/admin/analytics/engagement");

// ── 管理后台 · 写端点（PATCH/POST/DELETE，均 require_admin）─────────
// 用户管理
export const patchAdminUser = (
  id: string,
  body: { display_name?: string; is_admin?: boolean; is_banned?: boolean },
) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteAdminUser = (id: string) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/users/${id}`, { method: "DELETE" });

export const getAdminUserActivity = (id: string) =>
  authJSON<AdminUserActivityResp>(`/api/v1/admin/users/${id}/activity`);

/** 导出用户 CSV：带鉴权取 blob，触发浏览器下载。 */
export async function downloadAdminUsersCsv(): Promise<void> {
  const res = await authFetch(`/api/v1/admin/users/export.csv`);
  if (!res.ok) throw new ApiError(res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 内容管理（books/chapters/passages/concepts 统一 CRUD）
export const listAdminContent = (
  kind: AdminContentKind,
  params: { page?: number; page_size?: number; q?: string } = {},
) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return authJSON<AdminContentListResp>(
    `/api/v1/admin/${kind}?${qs.toString()}`,
  );
};

export const createAdminContent = (kind: AdminContentKind, body: Record<string, unknown>) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/${kind}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const patchAdminContent = (
  kind: AdminContentKind,
  id: string | number,
  body: Record<string, unknown>,
) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/${kind}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteAdminContent = (kind: AdminContentKind, id: string | number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/${kind}/${id}`, { method: "DELETE" });

// 段落的译文 / 注译
export const listPassageTranslations = (pid: string | number) =>
  authJSON<import("./types").AdminTranslationItem[]>(
    `/api/v1/admin/passages/${pid}/translations`,
  );

export const listPassageAnnotations = (pid: string | number) =>
  authJSON<import("./types").AdminAnnotationItem[]>(
    `/api/v1/admin/passages/${pid}/annotations`,
  );

export const createPassageTranslation = (
  pid: string | number,
  body: Record<string, unknown>,
) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/passages/${pid}/translations`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const createPassageAnnotation = (
  pid: string | number,
  body: Record<string, unknown>,
) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/passages/${pid}/annotations`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const patchTranslation = (id: number, body: Record<string, unknown>) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/translations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteTranslation = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/translations/${id}`, { method: "DELETE" });

export const patchAnnotation = (id: number, body: Record<string, unknown>) =>
  authJSON<Record<string, unknown>>(`/api/v1/admin/annotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteAnnotation = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/annotations/${id}`, { method: "DELETE" });

// 游戏局/答题明细
export const listGameRounds = (game: string, page = 1, page_size = 20) =>
  authJSON<AdminGameRoundsResp>(
    `/api/v1/admin/games/rounds?game=${game}&page=${page}&page_size=${page_size}`,
  );

export const deleteGameRound = (game: string, id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/games/rounds/${game}/${id}`, {
    method: "DELETE",
  });

// 案例审核工作流
export const reviewCaseWorkflow = (
  id: number,
  body: { status: "approved" | "rejected" | "needs_revision" | "draft"; reviewer_note?: string },
) =>
  authJSON<CaseDetail>(`/api/v1/admin/cases/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// 机构 CRUD + Key + 用量
export const createInstitution = (body: Record<string, unknown>) =>
  authJSON<InstitutionAdminItem>(`/api/v1/admin/institutions`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const patchInstitution = (id: number, body: Record<string, unknown>) =>
  authJSON<InstitutionAdminItem>(`/api/v1/admin/institutions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteInstitution = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/institutions/${id}`, { method: "DELETE" });

export const revokeInstitutionKey = (keyId: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/institutions/keys/${keyId}`, {
    method: "DELETE",
  });

export const getInstitutionUsage = (id: number) =>
  authJSON<InstitutionUsageResp>(`/api/v1/admin/institutions/${id}/usage`);

// 互动：投稿审核 + 发公告
export const moderateContribution = (id: number, status: string) =>
  authJSON<Contribution>(`/api/v1/admin/contributions/${id}/moderate`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const listPendingContributions = (page = 1, page_size = 20) =>
  authJSON<ContributionListResp>(
    `/api/v1/contributions?status=pending&page=${page}&page_size=${page_size}`,
  );

export const createAnnouncement = (body: {
  title: string;
  body: string;
  lang: string;
  active: boolean;
}) =>
  authJSON<AnnouncementItem>(`/api/v1/admin/announcements`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// 设置 + 审计日志
export const getAdminSettings = () =>
  authJSON<SettingsKV>(`/api/v1/admin/settings`);

export const putAdminSettings = (body: SettingsKV) =>
  authJSON<SettingsKV>(`/api/v1/admin/settings`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const getAuditLog = (params: { page?: number; page_size?: number } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return authJSON<AuditLogResp>(`/api/v1/admin/audit-log?${qs.toString()}`);
};

// ── 管理后台 · 流量 / 人次（/api/v1/admin/traffic，require_admin）──
export const getAdminTrafficPages = (): Promise<
  import("./types").AdminTrafficPageRow[]
> =>
  authJSON<
    | { items?: import("./types").AdminTrafficPageRow[] }
    | import("./types").AdminTrafficPageRow[]
  >("/api/v1/admin/traffic/pages").then((r) =>
    Array.isArray(r) ? r : r.items ?? [],
  );

export const getAdminTrafficTimeseries = (
  days = 30,
): Promise<import("./types").AdminTrafficPoint[]> =>
  authJSON<
    | { series?: import("./types").AdminTrafficPoint[] }
    | import("./types").AdminTrafficPoint[]
  >(`/api/v1/admin/traffic/timeseries?days=${days}`).then((r) =>
    Array.isArray(r) ? r : r.series ?? [],
  );

export const getAdminTrafficEvents = (params: {
  path?: string;
  page?: number;
  page_size?: number;
  from?: string;
  to?: string;
}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return authJSON<import("./types").AdminTrafficEventsResp>(
    `/api/v1/admin/traffic/events?${qs.toString()}`,
  );
};

export const deleteTrafficEvent = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/traffic/events/${id}`, { method: "DELETE" });

export const clearTrafficEvents = (path: string) =>
  authJSON<{ deleted: number }>(
    `/api/v1/admin/traffic/events?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
  );

/** 导出流量 CSV：带鉴权取 blob，触发浏览器下载。 */
export async function downloadAdminTrafficCsv(): Promise<void> {
  const res = await authFetch(`/api/v1/admin/traffic/export.csv`);
  if (!res.ok) throw new ApiError(res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "traffic.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── 管理后台 · 评论（/api/v1/admin/comments，require_admin）──────
export const getAdminCommentsStats = () =>
  authJSON<import("./types").AdminCommentsStatsResp>(`/api/v1/admin/comments/stats`);

export const getAdminComments = (params: {
  status?: string;
  target_type?: string;
  q?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  return authJSON<import("./types").AdminCommentsListResp>(
    `/api/v1/admin/comments?${qs.toString()}`,
  );
};

export const patchAdminComment = (
  id: number,
  body: { status?: string; content?: string },
) =>
  authJSON<import("./types").AdminCommentItem>(`/api/v1/admin/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteAdminComment = (id: number) =>
  authJSON<{ ok: boolean }>(`/api/v1/admin/comments/${id}`, { method: "DELETE" });
export interface Book {
  id: string;
  title_zh: string;
  title_i18n: Record<string, string>;
  /** 后端按 lang 解析好的书名；缺译时与 title_zh 相同 */
  title?: string;
}

export interface Chapter {
  id: string;
  title_zh: string;
  /** 后端按 lang 解析好的篇名；缺译时与 title_zh 相同 */
  title?: string;
}

export interface PassageBrief {
  id: string;
  ref_label: string;
  original_text: string;
}

export interface Translation {
  lang: string;
  text: string;
  translator?: string | null;
}

export interface Annotation {
  type: string; // classical | modern | word
  lang: string;
  source?: string | null;
  content: string;
}

export interface Passage {
  id: string;
  ref_label: string | null;
  /** 定位字段：供 /read?ref=xxx 深链跳转 */
  chapter_id?: string | null;
  book_id?: string | null;
  original_text: string;
  pinyin: string | null;
  concepts: string[];
  translations: Translation[];
  annotations: Annotation[];
  ai_reading: string | null;
}

// ── 新增强交互 API（随机/每日/上下条/相关）──────────────────────
export interface PassageNeighbor {
  id: string;
  ref_label: string | null;
  original_text: string;
}

export interface PassageNeighbors {
  current: PassageNeighbor | null;
  prev: PassageNeighbor | null;
  next: PassageNeighbor | null;
}

export interface TopicPassage {
  id: string;
  ref_label: string | null;
  original_text: string;
  translation: string | null;
}

export interface Concept {
  id: string;
  zh: string;
  pinyin: string | null;
  i18n: Record<string, string>;
  school: string | null;
  rarity: string;
  definition: Record<string, string>;
  related: string[];
}

// ── 短视频流 ───────────────────────────────────────────────────
export interface FeedItem {
  ref_id: string;
  ref_label: string;
  book: string;
  original_text: string;
  translation: string;
  persona: string;
  tags: string[];
}

// ── 知识图谱 ───────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  label: string;
  label_en: string | null;
  type: "person" | "concept" | "passage" | "proposition" | "school";
  color: string;
  meta: Record<string, unknown>;
}
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center?: string;
  order?: string[];
}

// ── 用户 / 游戏化 ──────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string | null;
  is_guest: boolean;
  is_admin?: boolean;
  display_name: string;
  avatar_url?: string | null;
  lang: string;
  theme: string;
  ai_persona: string;
}
export interface Level {
  key: string;
  name: string;
  xp: number;
  next_name: string | null;
  next_at: number | null;
  progress: number;
}
export interface LiuyiItem {
  key: string;
  label: string;
  value: number;
}
export interface DailyTask {
  id: string;
  title: string;
  xp: number;
  art: string;
  hint: string;
  done: boolean;
}
export interface Badge {
  id: string;
  name: string;
  desc: string;
  tier: string;
  unlocked: boolean;
  unlocked_at: string | null;
}
export interface GamifyProfile {
  display_name: string;
  is_guest: boolean;
  /** 游客态为 true：进度照记，但成就勋章与今日任务尚未解锁 */
  locked?: boolean;
  level: Level;
  streak_days: number;
  checked_in_today: boolean;
  liuyi: LiuyiItem[];
  tasks: DailyTask[];
  badges: Badge[];
  awarded_badges?: string[];
  already?: boolean;
}

/** 登录/注册时把游客进度并入账号的结果摘要 */
export interface MergeSummary {
  merged: boolean;
  xp_added?: number;
  favorites_moved?: number;
}
export interface Favorite {
  id: number;
  type: string;
  ref: string;
  label: string;
}

// ── 礼之器游戏 ─────────────────────────────────────────────────
export interface LiOption {
  key: string;
  text: string;
}
export interface LiOptionFull extends LiOption {
  ru_delta: number;
  qing_delta: number;
  comment_ru: string;
  comment_others: string;
  refs: { ref_id: string; ref_label: string; text: string }[];
}
export interface LiScenarioBrief {
  id: number;
  title: string;
  category: string;
  setting: string;
  options: LiOption[];
  related_concepts: string[];
  played: boolean;
}
export interface LiTodayResp {
  scenarios: LiScenarioBrief[];
  today_done_count: number;
  daily_limit: number;
}
export interface LiChooseResp {
  score_applied: boolean;
  chosen: LiOptionFull;
  all_options: LiOptionFull[];
  new_unlocked_refs: string[];
  progress: {
    ru_score: number;
    qing_score: number;
    liuyi_li: number;
    unlocked_count: number;
  };
}
export interface LiProgressResp {
  ru_score: number;
  qing_score: number;
  title: string;
  total_played: number;
  total_scenarios: number;
  liuyi_li: number;
  unlocked_refs: { ref_id: string; ref_label: string; text: string }[];
}

// ── 礼 ·「执礼 · 宾至如归」──────────────────────────────────────
export interface LiHostRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface LiHostStateItem {
  key: string;
  title: string;
  played_today: boolean;
  plays: number;
  best_total: number | null;
  best_grade: string | null;
  ref_id: string;
  ref_unlocked: boolean;
}
export interface LiHostProgress {
  ru_score: number;
  qing_score: number;
  liuyi_li: number;
  unlocked_count: number;
}
export interface LiHostTodayResp {
  scenarios: LiHostStateItem[];
  progress: LiHostProgress;
}
export interface LiHostScores {
  jing: number;
  xu: number;
  jie: number;
}
export interface LiHostResultResp {
  total: number;
  grade: string;
  score_applied: boolean;
  ru_delta: number;
  qing_delta: number;
  li_delta: number;
  xp_delta: number;
  new_unlocked_refs: LiHostRefBrief[];
  scenario_ref: LiHostRefBrief | null;
  progress: LiHostProgress;
}
export interface LiHostLeaderboardItem {
  rank: number;
  name: string;
  best_total: number;
  best_grade: string;
  plays: number;
  is_self?: boolean;
}
export interface LiHostLeaderboardResp {
  items: LiHostLeaderboardItem[];
  self: LiHostLeaderboardItem | null;
  note: string;
}

// ── 书艺游戏 ───────────────────────────────────────────────────
export interface ShuCardOption {
  key: string;
  text: string;
}
export interface ShuCardBrief {
  id: number;
  char: string;
  pinyin: string;
  components: string;
  category: string;
  category_label: string;
  difficulty: number;
  options: ShuCardOption[];
  answered: boolean;
}
export interface ShuTodayResp {
  cards: ShuCardBrief[];
  today_done_count: number;
  daily_limit: number;
}
export interface ShuRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface ShuCardFull extends ShuCardBrief {
  answer_key: string;
  benyi: string;
  jinyi: string;
  story: string;
  method: string;
  method_label: string;
  refs: ShuRefBrief[];
}
export interface ShuAnswerResp {
  correct: boolean;
  score_applied: boolean;
  chosen_key: string;
  card: ShuCardFull;
  new_unlocked_refs: ShuRefBrief[];
  progress: { liuyi_shu: number; xp: number };
}
export interface ShuLearnedChar {
  id: number;
  char: string;
  pinyin: string;
  benyi: string;
  category: string;
  category_label: string;
}
export interface ShuProgressResp {
  liuyi_shu: number;
  title: string;
  total_cards: number;
  answered_cards: number;
  correct_cards: number;
  correct_rate: number;
  learned_chars: ShuLearnedChar[];
  by_category: Record<string, { label: string; total: number; learned: number }>;
}
export interface ShuAssembleResp {
  correct: boolean;
  score_applied: boolean;
  card: ShuCardFull;
  correct_parts: string[];
  new_unlocked_refs: ShuRefBrief[];
  progress: { liuyi_shu: number; xp: number };
}
export interface ShuTraceResp {
  success: boolean;
  score_applied: boolean;
  score: number;            // 0-100 描字质量
  grade: string;            // 神品/妙品/能品/可观/试笔
  she_delta: number;
  xp_delta: number;
  precision: number;        // 0-1 不出界
  recall: number;           // 0-1 写得全
  card: ShuCardFull;
  new_unlocked_refs: ShuRefBrief[];
  progress: { liuyi_shu: number; xp: number };
}
export interface ShuLeaderboardResp {
  metric: string;
  items: { rank: number; name: string; learned: number; attempts: number }[];
}

// ── 君子之路 · 总览 + 勋章 + 排行 ──────────────────────────────
export interface JourneyArtBrief {
  key: string;          // li / yue / she / yu / shu / shu2
  label: string;
  subtitle: string;
  color: string;
  score: number;
  path: string;         // 跳转链接
}
export interface JourneyBadge {
  key: string;
  name: string;
  desc: string;
  tier: "normal" | "gold" | "treasure";
  unlocked: boolean;
}
export interface JourneyOverviewResp {
  total_score: number;
  title: string;
  min_art: number;
  max_art: number;
  arts: JourneyArtBrief[];
  badges: JourneyBadge[];
  badges_unlocked: number;
  badges_total: number;
}
export interface JourneyLeaderboardItem {
  rank: number;
  user_id: string;
  name: string;
  total: number;
  by_art: Record<string, number>;
  is_self: boolean;
}
export interface JourneyLeaderboardResp {
  items: JourneyLeaderboardItem[];
  total_players: number;
  self: JourneyLeaderboardItem | null;
}

// ── 御艺·五御 ──────────────────────────────────────────────────
export interface YuRoadCurve {
  start: number;
  end: number;
  offset: number;
}
export interface YuObstacle {
  type: "junbiao" | "pedestrian" | "deer" | "crossing";
  y: number;
  x?: number;
  label?: string;
  cross_dir?: number;
  trigger_y?: number;
  flee_dir?: number;
}
export interface YuRoadConfig {
  type: "straight" | "curve";
  length: number;
  beats?: number[];
  curves?: YuRoadCurve[];
  obstacles?: YuObstacle[];
  traffic?: YuTraffic[];
}
export interface YuTraffic {
  type: "oncoming" | "slow";
  y: number;         // t=0 时所在位置（米）
  speed?: number;    // 默认对向 6 / 慢车 4.5
}
export interface YuRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface YuScenarioBrief {
  id: number;
  title: string;
  kind: string;
  kind_label: string;
  setting: string;
  hint: string;
  road_config: YuRoadConfig;
  target_speed: number;
  target_duration_ms: number;
  answered: boolean;
  done_today?: boolean;
}
export interface YuTrajectoryPoint {
  t: number;
  x: number;
  y: number;
  speed: number;
}
export type YuEventType =
  | "li" | "chase" | "hit_pedestrian" | "beat_hit"
  | "pedestrian_yield" | "junbiao_pass"
  | "hard_brake" | "overspeed"
  | "meet_yield" | "meet_rude" | "tailgate" | "meet_li";
export interface YuEvent {
  t: number;
  type: YuEventType;
  meta?: Record<string, unknown>;
}
export interface YuDriveResp {
  scenario: YuScenarioBrief;
  score: number;
  grade: string;
  jie: number;
  rang: number;
  buji: number;
  stats: {
    avg_speed: number;
    speed_std: number;
    beat_hits: number;
    beats_total: number;
    li_count: number;
    pedestrian_yields: number;
    junbiao_passes: number;
    hit_pedestrian: number;
    hard_brakes: number;
    chase_attempts: number;
    overspeeds: number;
    meet_yields?: number;
    meet_rudes?: number;
    meet_li?: number;
    tailgates?: number;
  };
  yu_delta: number;
  xp_delta: number;
  score_applied: boolean;
  new_unlocked_refs: YuRefBrief[];
  refs: YuRefBrief[];
  progress: { liuyi_yu: number; xp: number };
}
export interface YuTodayResp {
  scenarios: YuScenarioBrief[];
  today_done_count: number;
  daily_limit: number;
}
export interface YuScenarioWithBest extends YuScenarioBrief {
  best_score: number;
}
export interface YuProgressResp {
  liuyi_yu: number;
  title: string;
  total_plays: number;
  avg_score: number;
  best_score: number;
  grade_count: Record<string, number>;
  scenarios: YuScenarioWithBest[];
  total_scenarios: number;
  played_count: number;
}

// ── 数艺·均输衰分 ──────────────────────────────────────────────
export interface MathItemBrief {
  name: string;
  /** 多语显示名；缺译时后端回落到中文，与 name 相同 */
  name_display?: string;
  attrs: string;
  metrics?: Record<string, number>;
}
export interface MathItemIdeal {
  name: string;
  ideal_share: number;
}
export interface MathRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface MathScenarioBrief {
  id: number;
  title: string;
  kind: string;
  kind_label: string;
  setting: string;
  hint: string;
  items: MathItemBrief[];
  metric_labels?: Record<string, string>;
  default_weights?: Record<string, number>;
  principle?: string;
  total: number;
  unit: string;
  answered: boolean;
  done_today?: boolean;
}
export interface MathScenarioFull extends MathScenarioBrief {
  ideal_shares: MathItemIdeal[];
}
export interface MathTodayResp {
  scenarios: MathScenarioBrief[];
  today_done_count: number;
  daily_limit: number;
}
export interface MathSolveResp {
  scenario: MathScenarioFull;
  allocations: Record<string, number>;
  score: number;
  grade: string;
  sum_match: number;
  fairness: number;
  moderation: number;
  feedback: string[];
  shu_delta: number;
  xp_delta: number;
  score_applied: boolean;
  new_unlocked_refs: MathRefBrief[];
  refs: MathRefBrief[];
  progress: { liuyi_shu2: number; xp: number };
}
export interface MathScenarioWithBest extends MathScenarioBrief {
  best_score: number;
}
export interface MathProgressResp {
  liuyi_shu2: number;
  title: string;
  total_plays: number;
  avg_score: number;
  best_score: number;
  grade_count: Record<string, number>;
  scenarios: MathScenarioWithBest[];
  total_scenarios: number;
  played_count: number;
}

// ── 乐艺·五音合鸣 ──────────────────────────────────────────────
export type YueNote = "gong" | "shang" | "jue" | "zhi" | "yu";
export interface YueRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface YueScenarioBrief {
  id: number;
  title: string;
  mood: string;
  mood_label: string;
  setting: string;
  hint: string;
  answered: boolean;
  done_today?: boolean;
}
export interface YueScenarioFull extends YueScenarioBrief {
  ideal_distribution: Record<string, number>;
}
export interface YueTodayResp {
  scenarios: YueScenarioBrief[];
  today_done_count: number;
  daily_limit: number;
}
export interface YuePlayResp {
  scenario: YueScenarioFull;
  sequence: YueNote[];
  score: number;
  grade: string;
  harmony: number;
  mood_match: number;
  moderation: number;
  distribution: Record<string, number>;
  yue_delta: number;
  xp_delta: number;
  score_applied: boolean;
  new_unlocked_refs: YueRefBrief[];
  refs: YueRefBrief[];
  progress: { liuyi_yue: number; xp: number };
}
export interface YueScenarioWithBest extends YueScenarioBrief {
  best_score: number;
}
export interface YueProgressResp {
  liuyi_yue: number;
  title: string;
  total_plays: number;
  avg_score: number;
  best_score: number;
  grade_count: Record<string, number>;
  scenarios: YueScenarioWithBest[];
  total_scenarios: number;
  played_count: number;
}

// ── 射艺游戏 ───────────────────────────────────────────────────
export interface SheRefBrief {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface SheRoundResp {
  wind: number;
  distance_m: number;
  streak: number;
  zhupi_warning: boolean;
  zhupi_ref: SheRefBrief | null;
  total_rounds: number;
}
export type SheReflection = "calm" | "force" | "wind" | "win" | "abstain";
export interface SheResultIn {
  score: number;
  distance_m: number;
  wind: number;
  aim_drift: number;
  reflection_choice?: SheReflection | null;
  reflection_note?: string | null;
  streak_before: number;
  zhupi_warned: boolean;
}
export interface SheResultResp {
  hit: boolean;
  score: number;
  she_delta: number;
  xp_delta: number;
  abstain_after_warning: boolean;
  new_unlocked_refs: SheRefBrief[];
  progress: { liuyi_she: number; xp: number; total_unlocked: number };
  streak_after: number;
}
export interface SheProgressResp {
  liuyi_she: number;
  title: string;
  total_rounds: number;
  hits: number;
  hit_rate: number;
  avg_score: number;
  reflect_count: number;
  deep_reflect_count: number;
  attribution: Record<string, number>;
  unlocked_refs: SheRefBrief[];
  all_she_refs: (SheRefBrief & { unlocked: boolean })[];
}
export interface SheLeaderItem {
  rank: number;
  name: string;
  reflect_count?: number;
  deep_count?: number;
  total_rounds: number;
  depth_score?: number;
  hits?: number;
  total_score?: number;
}
export interface SheLeaderboardResp {
  metric: string;
  items: SheLeaderItem[];
  note: string;
}

// ── 共创广场 + 插件 + 传播 ──────────────────────────────────────
export interface Contribution {
  id: number;
  user_id: string | null;
  kind: string;
  topic_id: string | null;
  civilization: string | null;
  headline: string;
  detail: string;
  sources: { label?: string; citation?: string }[];
  lang: string;
  status: string;
  score: number;
  upvotes: number;
  downvotes: number;
  created_at: string | null;
}
export interface ContributionListResp {
  total: number;
  page: number;
  page_size: number;
  items: Contribution[];
}
export interface PluginItem {
  id: string;
  name: string;
  type: string;
  snippet: string;
  summary: string;
}
export interface ReachStats {
  targets: { users_5w: number; reach_50w: number };
  pv: number;
  pv_7d: number;
  pv_today: number;
  uv: number;
  uv_30d: number;
  by_device: { k: string; v: number }[];
  by_source: { k: string; v: number }[];
  by_campus: { k: string; v: number }[];
  by_path: { k: string; v: number }[];
  by_country: { k: string; name: string; v: number }[];
  overseas_pv: number;
  overseas_uv: number;
}

// ── 开放接口（机构 / API Key / 用量）─────────────────────────
export interface ApplyResult {
  institution: { id: number; name: string; status: string; monthly_quota: number };
  api_key: string | null;
  message: string;
}
export interface DeveloperMe {
  institution: {
    id: number; name: string; country: string;
    status: string; monthly_quota: number;
  };
  stats: {
    used_today: number;
    used_7d: number;
    used_month: number;
    top_paths: { path: string; count: number }[];
  };
  rate_limit: string;
}
export interface InstitutionAdminItem {
  id: number;
  name: string;
  country: string;
  contact_email: string;
  purpose: string;
  status: string;
  monthly_quota: number;
  created_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  key_count: number;
  last_used_at: string | null;
}

// ── 语料统计 ───────────────────────────────────────────────────
export interface CorpusStats {
  target: number;
  total: number;
  progress: number;
  languages: string[];
  language_count: number;
  breakdown: Record<string, number>;
}

// ── 跨文明对话案例库 ────────────────────────────────────────────
export interface CaseBrief {
  slug?: string;
  id: number;
  topic_id: string;
  lang: string;
  title: string;
  question: string;
  status: string;
  quality: number;
  ai_generated: boolean;
  reviewer: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  tags: string[];
  civ_count: number;
}
export interface CaseCivSummary {
  civilization: string;
  civ_label: string;
  headline: string;
}
export interface CaseCitation {
  ref_id: string;
  ref_label: string;
  text: string;
}
export interface CaseDetail extends CaseBrief {
  confucian_answer: string;
  cross_civ_views: CaseCivSummary[];
  citations: CaseCitation[];
  reviewer: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}
export interface CaseListResp {
  total: number;
  page: number;
  page_size: number;
  items: CaseBrief[];
}
export interface CaseStats {
  total: number;
  by_topic: Record<string, { name: string; total: number; by_status: Record<string, number> }>;
  review_quality?: {
    unreviewed: number;
    stamped: number;
    rated: number;
  };
}

// ── 议题 / 跨文明 ──────────────────────────────────────────────
export interface TopicBrief {
  id: string;
  name: string;
  description: string;
  color: string;
}
export interface TopicCard extends TopicBrief {
  related_concepts: string[];
  related_passages: string[];
}
export interface CrossCivSource {
  label: string;
  citation: string;
}
export interface CrossCivView {
  civilization: string;
  civ_label: string;
  headline: string;
  detail: string;
  sources: CrossCivSource[];
  ai_generated: boolean;
  reviewed: boolean;
}
export interface CrossCivEvent {
  topic_id: string;
  views: CrossCivView[];
}

// ── 对话 SSE 事件 ──────────────────────────────────────────────
export interface AgentsEvent {
  active: string[];
}
export interface CitationEvent {
  ref_id: string;
  book: string;
  chapter: string;
  ref_label: string;
  text: string;
}
export interface VerifyEvent {
  textual: number;
  modern: number;
  cultural: number;
}
export interface DoneEvent {
  answer: string;
  citations: string[];
  agents_used: string[];
  verify_scores: VerifyEvent;
  topic_id?: string | null;
  cross_civ_count?: number;
}

export interface ChatHandlers {
  onAgents?: (e: AgentsEvent) => void;
  onTopic?: (e: TopicCard) => void;
  onCitation?: (e: CitationEvent) => void;
  onToken?: (text: string) => void;
  onVerify?: (e: VerifyEvent) => void;
  onCrossCiv?: (e: CrossCivEvent) => void;
  onFollowups?: (items: string[]) => void;
  onDone?: (e: DoneEvent) => void;
  onError?: (msg: string) => void;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  mode?: "beginner" | "class" | "research";
  persona?: string;
  lang?: string;
  device?: string;
  topic_hint?: string | null;
}

// ── 管理后台（/api/v1/admin）──────────────────────────────────
export interface AdminDashboardResp {
  users: {
    total: number;
    registered: number;
    guests: number;
    admins: number;
    new_today: number;
    new_7d: number;
    new_30d: number;
  };
  active: { dau: number; active_7d: number; mau: number };
  traffic: { pv_total: number; pv_today: number; conversations: number };
  content: {
    books: number;
    chapters: number;
    passages: number;
    concepts: number;
    translations: number;
    annotations: number;
  };
}

export interface AdminUserItem {
  id: string;
  display_name: string;
  email: string | null;
  is_guest: boolean;
  is_admin: boolean;
  lang: string;
  signup_country: string | null;
  xp: number;
  streak_days: number;
  created_at: string | null;
  last_checkin: string | null;
}
export interface AdminUserListResp {
  total: number;
  page: number;
  page_size: number;
  items: AdminUserItem[];
}

export interface AdminCountPoint { date: string; count: number }
export interface AdminLangCount { lang: string; count: number }
export interface AdminCountryCount { code: string; count: number }
export interface AdminUsersTimeseriesResp {
  daily_new: AdminCountPoint[];
  by_lang: AdminLangCount[];
  by_country: AdminCountryCount[];
}

export interface AdminAudienceResp {
  lang: AdminLangCount[];
  country: AdminCountryCount[];
  device: { device: string; count: number }[];
  source: { source: string; count: number }[];
}

export interface AdminGameStat {
  key: string;
  label: string;
  rounds: number;
  answers: number;
  players: number;
  avg_score: number;
  today: number;
}
export interface AdminGamesResp { games: AdminGameStat[] }

export interface AdminContentResp {
  passages: number;
  translations_by_lang: AdminLangCount[];
  annotations_by_lang: AdminLangCount[];
  concepts: number;
  topics: number;
  cases: { draft: number; reviewed: number; published: number; rejected: number };
}

export interface AdminEngagementResp {
  contributions: { pending: number; published: number; rejected: number; upvotes: number };
  institutions: { pending: number; approved: number; suspended: number; rejected: number };
  api: { calls: number; avg_latency_ms: number };
  pv_series: { date: string; pv: number }[];
}

// ── 管理后台 · 写操作扩展（/api/v1/admin）──────────────────────
// 字段尽量宽松：后端字段未全量约定时用可选/unknown，保证前端不脆崩。
export interface AdminUserActivityResp {
  summary?: {
    games?: number;
    rounds?: number;
    contributions?: number;
    last_active?: string | null;
  };
  recent_rounds?: {
    game?: string;
    score?: number;
    created_at?: string | null;
  }[];
  recent_contributions?: {
    id?: number;
    headline?: string;
    status?: string;
    created_at?: string | null;
  }[];
  [k: string]: unknown;
}

export type AdminContentKind = "books" | "chapters" | "passages" | "concepts";

export interface AdminContentItem {
  id: string | number;
  title?: string;
  title_zh?: string;
  ref_label?: string;
  original_text?: string;
  lang?: string;
  is_published?: boolean;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  [k: string]: unknown;
}
export interface AdminContentListResp {
  total: number;
  page: number;
  page_size: number;
  items: AdminContentItem[];
}

export interface AdminTranslationItem {
  id: number;
  lang?: string;
  text?: string;
  translator?: string | null;
  [k: string]: unknown;
}
export interface AdminAnnotationItem {
  id: number;
  type?: string;
  lang?: string;
  content?: string;
  source?: string | null;
  [k: string]: unknown;
}

export interface AdminGameRoundItem {
  id: number;
  user_id?: string;
  user_name?: string;
  score?: number;
  answers?: number;
  duration_ms?: number;
  created_at?: string | null;
  [k: string]: unknown;
}
export interface AdminGameRoundsResp {
  total: number;
  page: number;
  page_size: number;
  items: AdminGameRoundItem[];
}

export interface InstitutionUsageResp {
  used_today?: number;
  used_7d?: number;
  used_month?: number;
  quota?: number;
  top_paths?: { path: string; count: number }[];
  [k: string]: unknown;
}

export interface InstitutionKeyItem {
  id: number;
  label?: string;
  prefix?: string;
  last_used_at?: string | null;
  revoked?: boolean;
  [k: string]: unknown;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  lang: string;
  active: boolean;
  created_at?: string | null;
}

export type SettingsKV = Record<string, unknown>;

export interface AuditLogItem {
  id: number;
  actor?: string;
  action?: string;
  target?: string;
  created_at?: string | null;
  meta?: Record<string, unknown>;
}
export interface AuditLogResp {
  total: number;
  page: number;
  page_size: number;
  items: AuditLogItem[];
}

// ── 管理后台 · 流量 / 人次（/api/v1/admin/traffic）────────────
export interface AdminTrafficPageRow {
  path: string;
  pv: number;
  uv: number;
  logged_pv: number;
  today_pv: number;
  week_pv: number;
}
export interface AdminTrafficPoint {
  date: string;
  pv: number;
  uv: number;
}
export interface AdminTrafficEventItem {
  id: number;
  visitor_id?: string | null;
  user_id?: string | null;
  path?: string;
  device?: string | null;
  source?: string | null;
  country_code?: string | null;
  ts?: string | null;
  [k: string]: unknown;
}
export interface AdminTrafficEventsResp {
  items: AdminTrafficEventItem[];
  total: number;
  page: number;
  page_size: number;
}

// ── 管理后台 · 评论（/api/v1/admin/comments）─────────────────
export interface AdminCommentItem {
  id: number;
  target_type?: string;
  target_id?: string | number;
  author_name?: string | null;
  content?: string;
  status?: string;
  likes?: number;
  report_count?: number;
  created_at?: string | null;
  [k: string]: unknown;
}
export interface AdminCommentsStatsResp {
  total: number;
  visible: number;
  hidden: number;
  today_new: number;
  by_target?: Record<string, number>;
}
export interface AdminCommentsListResp {
  items: AdminCommentItem[];
  total: number;
  page?: number;
  page_size?: number;
}
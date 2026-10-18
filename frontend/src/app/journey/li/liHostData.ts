/** 「执礼 · 宾至如归」场景配置（礼艺 3D / 数据层共享） */

export type Rank = "honored" | "elder" | "peer" | "junior";

export interface LiHostGuestCfg {
  id: string;
  name: string;
  rank: Rank;
  color: number;
  note: string;
  zoneW?: number;
}

export interface LiHostEventCfg {
  at: number;
  guest: string;
  icon: string;
  label: string;
  duration: number;
  window: [number, number];
}

export interface LiHostScenarioCfg {
  key: string;
  title: string;
  subtitle: string;
  place: string;
  intro: string;
  tip: string;
  lesson: string;
  difficulty: number;
  gaugeSpeed: number;
  zoneW: number;
  banquetSeconds: number;
  guests: LiHostGuestCfg[];
  events: LiHostEventCfg[];
}

export interface LiHostRoundDetail {
  bowAvg: number;
  orderScore: number;
  seatScore: number;
  eventAvg: number;
  overActs: number;
  atmosphere: number;
  highlight?: string;
  bows: { guest: string; verdict: string; score: number }[];
  events: { label: string; verdict: string; score: number }[];
}

export const RANK_META: Record<
  Rank,
  { label: string; priority: number; depth: number; color: number; hex: string }
> = {
  honored: { label: "贵宾", priority: 4, depth: 0.82, color: 0x993c1d, hex: "#993C1D" },
  elder: { label: "长者", priority: 3, depth: 0.68, color: 0x854f0b, hex: "#854F0B" },
  peer: { label: "平辈", priority: 2, depth: 0.5, color: 0x1e5f8e, hex: "#1E5F8E" },
  junior: { label: "幼辈", priority: 1, depth: 0.32, color: 0x0f6e56, hex: "#0F6E56" },
};

export const SEAT_NAMES = ["尊位", "次位", "三位", "末位"];

export const LI_HOST_SCENARIOS: LiHostScenarioCfg[] = [
  {
    key: "xiangyin",
    title: "乡饮酒礼",
    subtitle: "教学局 · 先学迎宾与安席",
    place: "村社学堂",
    intro: "乡里设宴敬老。你是今日主人：先依礼迎宾，再安排席位，席间照应周全。",
    tip: "先尊后卑迎客；对长者深揖，对幼辈浅揖——过深近谄，过浅近慢。",
    lesson: "乡饮酒礼的核心是「序」：谁先谁后、谁坐哪里，排序本身就是敬意。",
    difficulty: 1,
    gaugeSpeed: 0.75,
    zoneW: 0.11,
    banquetSeconds: 30,
    guests: [
      { id: "elder", name: "里中长者·伯翁", rank: "elder", color: 0x854f0b, note: "拄杖而来，望之俨然" },
      { id: "peer", name: "乡邻·仲叔", rank: "peer", color: 0x1e5f8e, note: "同辈乡邻，久未相见" },
      { id: "junior", name: "后生·小季", rank: "junior", color: 0x0f6e56, note: "初次赴宴，有些拘谨" },
    ],
    events: [
      { at: 4, guest: "elder", icon: "🍵", label: "长者杯空了", duration: 5, window: [0.3, 0.8] },
      { at: 11, guest: "peer", icon: "🍶", label: "仲叔举杯相邀", duration: 5, window: [0.3, 0.8] },
      { at: 18, guest: "junior", icon: "💬", label: "小季插不上话", duration: 5, window: [0.3, 0.8] },
      { at: 24, guest: "elder", icon: "🧓", label: "长者起身欲行", duration: 5, window: [0.3, 0.8] },
    ],
  },
  {
    key: "shixiangjian",
    title: "士相见礼",
    subtitle: "初次拜会 · 分寸更严",
    place: "府中正堂",
    intro: "远近士人来访相见。贵宾在列，揖礼的深浅、席位的高下都更讲究了。",
    tip: "贵宾之礼最深最严；「自卑而尊人」，但卑不是谄。",
    lesson: "礼者，自卑而尊人——把自己放低、把对方抬高，对任何人都如此。",
    difficulty: 2,
    gaugeSpeed: 0.9,
    zoneW: 0.09,
    banquetSeconds: 38,
    guests: [
      { id: "honored", name: "来访国士·公孙子", rank: "honored", color: 0x993c1d, note: "名满一方，执贽来见" },
      { id: "elder", name: "引见长者·师叔", rank: "elder", color: 0x854f0b, note: "为双方引见的前辈" },
      { id: "peer", name: "同门·子有", rank: "peer", color: 0x1e5f8e, note: "同门学友，随行而来" },
      { id: "junior", name: "门下弟子·阿俭", rank: "junior", color: 0x0f6e56, note: "执礼在侧的少年" },
    ],
    events: [
      { at: 4, guest: "honored", icon: "🎁", label: "国士奉上贽礼", duration: 4.5, window: [0.35, 0.72] },
      { at: 11, guest: "elder", icon: "🍵", label: "师叔杯空了", duration: 4.5, window: [0.35, 0.72] },
      { at: 18, guest: "peer", icon: "🍶", label: "子有举杯相邀", duration: 4.5, window: [0.35, 0.72] },
      { at: 25, guest: "junior", icon: "💬", label: "阿俭受了冷落", duration: 4.5, window: [0.35, 0.72] },
      { at: 32, guest: "honored", icon: "🧓", label: "国士起身告辞", duration: 4.5, window: [0.35, 0.72] },
    ],
  },
  {
    key: "jiayan",
    title: "家宴",
    subtitle: "长幼齐聚 · 事件频密考「节」",
    place: "自家堂屋",
    intro: "祖父寿辰，长幼齐聚。家人之间的礼最难：色难。",
    tip: "幼辈频频插话、长辈随时需要照应——沉住气，挑准时机，别忙乱。",
    lesson: "子曰：色难。对亲人尽礼，难的不是端茶送饭，而是脸色与心意。",
    difficulty: 3,
    gaugeSpeed: 0.95,
    zoneW: 0.085,
    banquetSeconds: 42,
    guests: [
      { id: "elder", name: "祖父", rank: "elder", color: 0x854f0b, note: "今日寿星，最要紧的人" },
      { id: "peer", name: "堂兄", rank: "peer", color: 0x1e5f8e, note: "多年未见的平辈" },
      { id: "junior1", name: "小侄", rank: "junior", color: 0x0f6e56, note: "坐不住的小孩" },
      { id: "junior2", name: "小妹", rank: "junior", color: 0x534ab7, note: "一直看手机的少女" },
    ],
    events: [
      { at: 3, guest: "elder", icon: "🍵", label: "祖父杯空了", duration: 4.5, window: [0.35, 0.7] },
      { at: 8, guest: "junior1", icon: "✋", label: "小侄打断祖父说话", duration: 4, window: [0.35, 0.7] },
      { at: 14, guest: "peer", icon: "🍶", label: "堂兄举杯相邀", duration: 4.5, window: [0.35, 0.7] },
      { at: 19, guest: "junior2", icon: "💬", label: "小妹被晾在一边", duration: 4, window: [0.35, 0.7] },
      { at: 25, guest: "elder", icon: "🧓", label: "祖父要讲旧事", duration: 4.5, window: [0.35, 0.7] },
      { at: 31, guest: "junior1", icon: "✋", label: "小侄又闹起来了", duration: 4, window: [0.35, 0.7] },
      { at: 37, guest: "elder", icon: "🍵", label: "给祖父添汤", duration: 4.5, window: [0.35, 0.7] },
    ],
  },
  {
    key: "yuanke",
    title: "待远客",
    subtitle: "有朋自远方来 · 宽严之间",
    place: "郊居庭院",
    intro: "远方友人来访，不识中土礼数。对远人当宽，对己当严。",
    tip: "对远客的揖礼区间更宽容；但你自己的顺序与时机，一点不能松。",
    lesson: "有朋自远方来，不亦乐乎？礼待远人，贵在诚意而不苛求形式。",
    difficulty: 4,
    gaugeSpeed: 1.0,
    zoneW: 0.085,
    banquetSeconds: 40,
    guests: [
      { id: "honored", name: "远客·安岚", rank: "honored", color: 0x993c1d, note: "跨海而来，不识中礼", zoneW: 0.16 },
      { id: "elder", name: "长者·伯翁", rank: "elder", color: 0x854f0b, note: "闻远客至，欣然赴会" },
      { id: "peer", name: "同窗·子敬", rank: "peer", color: 0x1e5f8e, note: "与你同窗多年" },
    ],
    events: [
      { at: 4, guest: "honored", icon: "❓", label: "远客不知如何举箸", duration: 5.5, window: [0.25, 0.85] },
      { at: 11, guest: "elder", icon: "🍵", label: "长者杯空了", duration: 4.5, window: [0.35, 0.7] },
      { at: 17, guest: "honored", icon: "🗺", label: "远客说起故乡", duration: 5.5, window: [0.25, 0.85] },
      { at: 24, guest: "peer", icon: "🍶", label: "子敬举杯相邀", duration: 4.5, window: [0.35, 0.7] },
      { at: 30, guest: "honored", icon: "💬", label: "远客误了礼数很窘", duration: 5.5, window: [0.25, 0.85] },
      { at: 36, guest: "elder", icon: "🧓", label: "长者起身欲行", duration: 4.5, window: [0.35, 0.7] },
    ],
  },
  {
    key: "dashe",
    title: "大射前宴",
    subtitle: "终局 · 全机制高难度",
    place: "射宫外庑",
    intro: "明日大射，今夜设宴。正宾在座，司正在侧——这是对你「执礼」的总考。",
    tip: "中礼区间最窄、事件最密。揖让而升，下而饮：其争也君子。",
    lesson: "射礼与宴礼相为表里：先能敬人、序人、节己，明日才谈得上反求诸己。",
    difficulty: 5,
    gaugeSpeed: 1.2,
    zoneW: 0.07,
    banquetSeconds: 45,
    guests: [
      { id: "honored", name: "射礼正宾·公仪子", rank: "honored", color: 0x993c1d, note: "明日大射的正宾" },
      { id: "elder", name: "司正·老丈", rank: "elder", color: 0x854f0b, note: "执掌礼仪纠察的长者" },
      { id: "peer", name: "同射·子臧", rank: "peer", color: 0x1e5f8e, note: "明日与你同射之人" },
      { id: "junior", name: "观礼少年·小柯", rank: "junior", color: 0x0f6e56, note: "来观礼的少年" },
    ],
    events: [
      { at: 3, guest: "honored", icon: "🍶", label: "正宾举杯", duration: 4, window: [0.42, 0.68] },
      { at: 8, guest: "elder", icon: "🍵", label: "司正杯空了", duration: 4, window: [0.42, 0.68] },
      { at: 13, guest: "peer", icon: "🏹", label: "子臧论弓矢", duration: 4, window: [0.42, 0.68] },
      { at: 18, guest: "junior", icon: "💬", label: "小柯欲问不敢问", duration: 4, window: [0.42, 0.68] },
      { at: 23, guest: "honored", icon: "🎁", label: "正宾赠玉玦", duration: 4, window: [0.42, 0.68] },
      { at: 29, guest: "elder", icon: "🧓", label: "司正宣宴将毕", duration: 4, window: [0.42, 0.68] },
      { at: 34, guest: "peer", icon: "🍶", label: "子臧再邀一杯", duration: 4, window: [0.42, 0.68] },
      { at: 40, guest: "honored", icon: "🧓", label: "正宾起身还席", duration: 4, window: [0.42, 0.68] },
    ],
  },
];

export function liHostScenario(key: string): LiHostScenarioCfg {
  return LI_HOST_SCENARIOS.find((s) => s.key === key) ?? LI_HOST_SCENARIOS[0];
}

// 游戏 i18n 总入口：合并公共字典 + 各游戏分字典，导出 gt(zhText, lang)。
// 约定：以【中文字面量】为键；zh 即键本身故各分字典只列 en/fr/es/ar。
// gt 命中返回译文，缺失时回落中文原键，永不返回 undefined/空串。
"use client";

import type { Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import { COMMON } from "./common";
import { LI } from "./li";
import { MATH } from "./math";
import { SHE } from "./she";
import { SHU } from "./shu";
import { YU } from "./yu";
import { YUE } from "./yue";

type E = Partial<Record<Lang, string>>;

const TABLE: Record<string, E> = Object.assign(
  {},
  COMMON,
  LI,
  MATH,
  SHE,
  SHU,
  YU,
  YUE,
);

/** 把一个外壳中文字面量按当前语言翻译；zh 原样返回，未收录则回落中文。 */
export function gt(zhText: string, lang: Lang): string {
  if (lang === "zh") return zhText;
  const e = TABLE[zhText];
  const v = e?.[lang];
  return v && v.length ? v : zhText;
}

/** 组件内便捷 hook：返回绑定当前 lang 的 g(zh)。 */
export function useGT(): (zh: string) => string {
  const [lang] = useLang();
  return (zh: string) => gt(zh, lang);
}

export default gt;

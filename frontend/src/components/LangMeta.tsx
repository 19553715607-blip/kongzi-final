"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { META_DESCRIPTION, META_KEYWORDS, META_TITLE } from "@/lib/metaText";

/**
 * 让 <title> 与社交分享 meta 跟随当前语言。
 *
 * layout 里的 langScript 只在**注水前**写一次；随后 React 注水会按服务端
 * `metadata`（取 META_TITLE.zh）重建 <title>，把脚本写的值覆盖回中文，
 * 于是切换语言后标签页标题永远是中文（实测 zh/en/fr/es/ar 均为「孔子 · 儒家语义交互平台」）。
 *
 * 这里在客户端按 lang 变化重写一遍，覆盖字段与 langScript 完全一致：
 * title / description / keywords / og:title / og:description / twitter:title / twitter:description。
 * 放在 I18nProvider 内部（需要 useLang 上下文），随语言切换即时生效。
 */
export default function LangMeta() {
  const [lang] = useLang();

  useEffect(() => {
    const title = META_TITLE[lang] ?? META_TITLE.zh;
    const desc = META_DESCRIPTION[lang] ?? META_DESCRIPTION.zh;
    const keys = META_KEYWORDS[lang] ?? META_KEYWORDS.zh;

    document.title = title;

    const pairs: Array<[string, string]> = [
      ['meta[name="description"]', desc],
      ['meta[name="keywords"]', keys],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', desc],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', desc],
    ];
    for (const [selector, value] of pairs) {
      document.querySelector(selector)?.setAttribute("content", value);
    }
  }, [lang]);

  return null;
}

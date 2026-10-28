"use client";

/**
 * 案例卡（纯文本版）
 *
 * 与馆藏卡 `CollectionCard` 的区别：**没有缩略图位**。案例的内容是「一个问题 +
 * 多文明对照」，没有合适的封面图；此前用议题色块充当缩略图，占掉 4:3 的高度却
 * 不承载信息。改为纯文本后：
 *
 * - 议题色只保留为左侧 3px 竖条与一个小圆点（识别用，不占版面）；
 * - 标题用衬线体、最多三行，信息密度高于配图卡；
 * - 底部一行放标签与前缀编号，保持馆藏编号的视觉语言。
 *
 * 布局全部用逻辑属性（`border-inline-start` / `ms-auto` / `text-start`），
 * 阿拉伯语 RTL 下自动镜像。
 */
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import type { CaseBrief } from "@/lib/types";

export function CaseCard({
  c,
  topicName,
  topicColor,
  lang,
  className = "",
}: {
  c: CaseBrief;
  /** 议题名（已按当前语言解析）；缺失时回落为编号 */
  topicName?: string;
  /** 议题色，仅用于竖条与圆点 */
  topicColor?: string;
  lang: Lang;
  className?: string;
}) {
  const accent = topicColor || "var(--accent)";
  return (
    <Link
      href={`/cases/${c.slug ?? c.id}`}
      className={`case-card ${className}`}
      style={{ borderInlineStartColor: accent }}
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        <span className="truncate text-[11px] tracking-wide" style={{ color: accent }}>
          {topicName || t("cases.topic", lang).replace(/[：:]\s*$/, "")}
        </span>
        <span className="ms-auto shrink-0 font-mono text-[10px] tracking-wider text-faint">
          C-{String(c.id).padStart(3, "0")}
        </span>
      </span>

      <span className="case-card__q">{c.question}</span>

      <span className="mt-auto flex items-center gap-1.5 overflow-hidden text-[10px] text-faint">
        {c.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="truncate rounded-full bg-surface-2 px-1.5 py-0.5">
            {tag}
          </span>
        ))}
        <span className="ms-auto shrink-0">
          {t("cases.civCount", lang).replace("{n}", String(c.civ_count))}
        </span>
      </span>
    </Link>
  );
}

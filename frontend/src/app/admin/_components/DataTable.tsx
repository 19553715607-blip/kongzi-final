"use client";

import { ReactNode, useMemo, useState } from "react";
import { t, useLang, type Lang } from "@/lib/i18n";

// ── 统一管理数据表格：可排序表头 / 行 hover / 批量选择 / 骨架 / 空态 / 分页 ──
// 泛型化，可复用到 users/games/cases/institutions 等页。
// 全部使用 CSS 变量与逻辑属性；reduced-motion 由全局规则降级。

export type SortDir = "asc" | "desc";

export type Column<T> = {
  key: string;
  header: string; // 已翻译
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyNode?: ReactNode;
  selectable?: boolean;
  // 排序（内部，对当前页数据排序）
  initialSortKey?: string;
  // 分页（受控）
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  pagerLabel?: string; // 已含 {p}/{tp}/{n} 占位
  onPrevLabel?: string;
  onNextLabel?: string;
  bulkBar?: ReactNode;
  minWidth?: number;
};

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading = false,
  skeletonRows = 8,
  emptyNode,
  selectable = false,
  initialSortKey,
  page,
  totalPages = 1,
  total = 0,
  onPageChange,
  pagerLabel,
  onPrevLabel,
  onNextLabel,
  bulkBar,
  minWidth = 760,
}: Props<T>) {
  const [lang] = useLang();
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (col.sortValue) {
        const va = col.sortValue(a);
        const vb = col.sortValue(b);
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else cmp = String(va).localeCompare(String(vb));
      } else if (col.render) {
        const va = col.render(a);
        const vb = col.render(b);
        const na = typeof va === "number" ? va : Number(va);
        const nb = typeof vb === "number" ? vb : Number(vb);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) cmp = na - nb;
        else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) rows.forEach((r) => next.delete(rowKey(r)));
      else rows.forEach((r) => next.add(rowKey(r)));
      return next;
    });
  };
  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const alignCls = (a?: "left" | "right") => (a === "right" ? "text-end" : "text-left");
  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <section className="overflow-x-auto rounded-2xl border border-line bg-surface">
      {selectable && selected.size > 0 && (
        <div className="bulk-bar">
          <span>
            {t("admin.table.selected", lang).replace("{n}", String(selected.size))}
          </span>
          {bulkBar}
          <button
            className="ms-auto text-faint hover:text-fg underline-offset-2 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            {t("admin.table.clear", lang)}
          </button>
        </div>
      )}
      <table className="w-full" style={{ minWidth }}>
        <thead className="border-b border-line bg-surface-2/50 text-[10px] uppercase tracking-tight text-muted">
          <tr>
            {selectable && (
              <th className="th-check">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="select all"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-medium ${alignCls(c.align)} ${
                  c.sortable ? "th-sort" : ""
                }`}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                aria-sort={
                  sortKey === c.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {c.header}
                {c.sortable && sortKey === c.key && (
                  <span className="th-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`sk-${r}`} className="border-b border-line/40">
                {selectable && <td className="th-check" />}
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2.5">
                    <div className="skeleton h-3.5 w-full max-w-[160px]" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colSpan}>
                {emptyNode ?? (
                  <div className="empty-state">
                    <div className="icon-plate">孔</div>
                    <div className="state-title">{t("state.empty.title", lang)}</div>
                    <div className="state-sub">{t("state.empty.sub", lang)}</div>
                  </div>
                )}
              </td>
            </tr>
          )}
          {!loading &&
            sortedRows.map((row) => {
              const key = rowKey(row);
              const checked = selected.has(key);
              return (
                <tr
                  key={key}
                  className={`border-b border-line/60 transition-colors hover:bg-surface-2/40 ${
                    checked ? "row-selected" : ""
                  }`}
                >
                  {selectable && (
                    <td className="th-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(key)}
                        aria-label="select row"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${alignCls(c.align)} ${c.className ?? ""}`}
                    >
                      {c.render ? c.render(row) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>

      {page != null && onPageChange && (
        <div className="flex items-center justify-center gap-3 border-t border-line/60 py-2.5 text-xs">
          <button
            className="pressable rounded-full border border-line px-3 py-1 text-muted"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            {onPrevLabel ?? t("adm.prev", lang)}
          </button>
          <span className="text-faint tabular-nums">
            {pagerLabel
              ?.replace("{p}", String(page))
              .replace("{tp}", String(totalPages))
              .replace("{n}", String(total)) ??
              `${page} / ${totalPages}`}
          </span>
          <button
            className="pressable rounded-full border border-line px-3 py-1 text-muted"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            {onNextLabel ?? t("adm.next", lang)}
          </button>
        </div>
      )}
    </section>
  );
}

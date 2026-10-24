"use client";

import Link from "next/link";
import { ReactNode } from "react";

/** 馆藏卡：缩略图 + 衬线标题 + 固定 ACC. 式编号行。 */
export function CollectionCard({
  thumb,
  title,
  note,
  accession,
  badgeRaw,
  href,
  onClick,
  className = "",
}: {
  thumb?: ReactNode;
  title: string;
  /** 标题下的一行说明，用来填掉等高布局留下的空白 */
  note?: string;
  accession?: string;
  /** 原样徽标:直接渲染该文本,不加 ACC. 前缀(用于引用编号等自有格式的值) */
  badgeRaw?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {thumb && <span className="cc-thumb">{thumb}</span>}
      <span className="cc-body">
        <span className="cc-title">{title}</span>
        {note && <span className="cc-note">{note}</span>}
        {badgeRaw ? (
          <span className="cc-acc">{badgeRaw}</span>
        ) : (
          accession && <span className="cc-acc">ACC. {accession}</span>
        )}
      </span>
    </>
  );
  if (href) {
    // 用 Link 走客户端路由：原生 <a> 会整页刷新，丢掉 SPA 状态、白屏一帧
    return (
      <Link href={href} className={`collection-card ${className}`}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`collection-card ${className}`}>
      {inner}
    </button>
  );
}

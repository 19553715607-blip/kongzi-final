"use client";

import { ReactNode } from "react";

/** 馆藏卡：缩略图 + 衬线标题 + 固定 ACC. 式编号行。 */
export function CollectionCard({
  thumb,
  title,
  accession,
  href,
  onClick,
  className = "",
}: {
  thumb?: ReactNode;
  title: string;
  accession?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {thumb && <span className="cc-thumb">{thumb}</span>}
      <span className="cc-body">
        <span className="cc-title">{title}</span>
        {accession && <span className="cc-acc">ACC. {accession}</span>}
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={`collection-card ${className}`}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`collection-card ${className}`}>
      {inner}
    </button>
  );
}

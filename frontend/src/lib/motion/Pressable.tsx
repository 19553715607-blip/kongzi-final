"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** 按压反馈按钮：active 轻微缩放 + 聚焦可见环。尊重 reduced-motion。 */
export function Pressable({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <button
      {...rest}
      className={`pressable ${reduced ? "no-motion" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

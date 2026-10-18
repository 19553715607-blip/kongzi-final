"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

/** 立体按压按钮（Duolingo 触觉机制，品牌配色）。底部 4px 实色阴影，按下下移 4px。 */
export function TactileButton({
  children,
  variant = "accent",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "accent" | "cel" | "gold" | "ghost";
}) {
  const reduced = useReducedMotion();
  return (
    <button
      {...rest}
      className={`tactile-btn ${variant} ${reduced ? "no-tactile" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

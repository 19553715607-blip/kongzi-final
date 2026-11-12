"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

/** 旧博物馆按钮门面：几何已并入全站 .btn 基线（扁平胶囊，见 globals.css）。 */
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

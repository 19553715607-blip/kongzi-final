"use client";

import { useEffect, useState } from "react";

// 轻量全局 Toast：任何组件均可 toast("文案", "ok|info|err")，
// 通过 CustomEvent 通知 <Toaster /> 渲染，避免引入全局 Context。
type ToastKind = "ok" | "info" | "err";
interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

export function toast(text: string, kind: ToastKind = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { text, kind } }));
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const on = (e: Event) => {
      const { text, kind } = (e as CustomEvent).detail as ToastItem;
      const id = Date.now() + Math.random();
      setItems((it) => [...it.slice(-3), { id, text, kind }]);
      window.setTimeout(
        () => setItems((it) => it.filter((x) => x.id !== id)),
        2600,
      );
    };
    window.addEventListener("app-toast", on);
    return () => window.removeEventListener("app-toast", on);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8">
      {items.map((it) => (
        <div
          key={it.id}
          className={`animate-toast rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur ${
            it.kind === "ok"
              ? "border-line bg-surface/95 text-fg"
              : it.kind === "info"
                ? "border-cel/40 bg-cel-soft/95 text-cel-ink"
                : "border-accent/40 bg-accent-soft/95 text-accent-ink"
          }`}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

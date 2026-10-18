"use client";

import { ReactNode, useEffect } from "react";
import { TactileButton } from "@/components/museum";
import { useReducedMotion } from "@/lib/motion";

// ── 共享管理 UI：Modal / ConfirmDialog / Drawer ──────────────────
// 全部使用逻辑属性（ms-/me-/ps-/pe-/start-/end-/border-s-/border-e-），
// ar 走 RTL 时自动翻转；reduced-motion 已降级（不动效）。

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[85vh] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-2xl`}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-base text-fg">{title}</h3>
            <button
              onClick={onClose}
              aria-label="close"
              className="rounded-md px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="font-serif text-base text-fg">{title}</h3>
      <div className="mt-2 text-sm text-muted">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <TactileButton variant="ghost" className="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </TactileButton>
        <TactileButton
          variant={danger ? "ghost" : "accent"}
          className="sm"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "…" : confirmLabel}
        </TactileButton>
      </div>
    </Modal>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`absolute inset-y-0 end-0 w-full max-w-md overflow-y-auto border-s border-line bg-surface p-4 shadow-2xl ${
          reduced ? "" : "animate-toast"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-base text-fg">{title}</h3>
          <button
            onClick={onClose}
            aria-label="close"
            className="rounded-md px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg"
          >
            ✕
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

/** 表单字段外壳：label + children，逻辑内边距。 */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent";

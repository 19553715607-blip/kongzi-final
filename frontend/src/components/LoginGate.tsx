"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { t, useLang } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 弹窗标题 i18n 键，缺省用通用文案 */
  titleKey?: string;
};

/**
 * 登录解锁引导弹窗。
 *
 * 用于「成就勋章 / 今日修行任务」这类登录专属能力：游客点到时弹出，
 * 说明其余功能不受影响、游客态积累会在登录时自动并入，再由用户决定是否去登录。
 * 不使用浏览器原生 confirm，避免样式割裂与移动端体验问题。
 */
export default function LoginGate({ open, onClose, titleKey = "gate.title" }: Props) {
  const [lang] = useLang();
  const path = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // 弹窗期间锁背景滚动，关闭后恢复
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const next = encodeURIComponent(path || "/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-gate-title"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="nav-drop relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="seal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-xs leading-none">
            孔
          </span>
          <div className="min-w-0">
            <h2 id="login-gate-title" className="font-serif text-base text-fg">
              {t(titleKey, lang)}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("gate.desc", lang)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/login?next=${next}`}
            className="pressable flex-1 rounded-full bg-accent px-4 py-2.5 text-center text-sm text-white transition hover:brightness-110"
          >
            {t("gate.login", lang)}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-full border border-line px-4 py-2.5 text-sm text-muted transition hover:bg-surface-2"
          >
            {t("gate.later", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

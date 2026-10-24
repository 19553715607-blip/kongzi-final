"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t, useLang } from "@/lib/i18n";

const KEY = "kongzi_storage_ok";

/** 首次访问的本地存储提示条(EU 友好):说明只用功能型本地存储、不追踪;
 *  「知道了」后不再出现。不阻断浏览。 */
export default function StorageNotice() {
  const [show, setShow] = useState(false);
  const [lang] = useLang();

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* 存储不可用则不提示 */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="note"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg md:inset-x-auto md:left-1/2 md:-translate-x-1/2"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
        {t("privacy.cookie.text", lang)}{" "}
        <Link href="/privacy" className="whitespace-nowrap text-accent underline underline-offset-4">
          {t("privacy.title", lang)}
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="pressable rounded-full border border-accent/50 px-3.5 py-1.5 text-xs text-accent transition hover:bg-accent-soft"
      >
        {t("privacy.cookie.ok", lang)}
      </button>
    </div>
  );
}

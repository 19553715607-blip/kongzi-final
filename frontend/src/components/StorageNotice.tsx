"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { t, useLang } from "@/lib/i18n";

const KEY = "kongzi_storage_ok";

/** 首次访问的本地存储提示条(EU 友好):说明只用功能型本地存储、不追踪;
 *  「知道了」后不再出现。不阻断浏览。 */
export default function StorageNotice() {
  const [show, setShow] = useState(false);
  const [lang] = useLang();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* 存储不可用则不提示 */
    }
  }, []);

  // 提示条是 fixed 的，会盖住页面底部的固定元素（例如对话页输入框）。
  // 把自身高度写进 --notice-h，页面按这个变量让出空间；宽度变化时重测。
  useEffect(() => {
    const el = boxRef.current;
    if (!show || !el) {
      document.body.style.removeProperty("--notice-h");
      document.body.removeAttribute("data-storage-notice");
      return;
    }
    const apply = () => {
      document.body.style.setProperty("--notice-h", `${el.offsetHeight + 12}px`);
      document.body.setAttribute("data-storage-notice", "1");
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.style.removeProperty("--notice-h");
      document.body.removeAttribute("data-storage-notice");
    };
  }, [show]);

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
      ref={boxRef}
      role="note"
      className="fixed inset-x-3 bottom-[4.25rem] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg md:inset-x-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2"
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

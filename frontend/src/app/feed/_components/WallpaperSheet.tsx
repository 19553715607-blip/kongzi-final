"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { t, useLang } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { useReducedMotion } from "@/lib/motion";
import Icon from "@/components/ui/Icon";

type Props = {
  open: boolean;
  dataUrl: string;
  filename: string;
  onClose: () => void;
};

function canCopyImage(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard.write === "function"
  );
}

export default function WallpaperSheet({ open, dataUrl, filename, onClose }: Props) {
  const [lang] = useLang();
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const copyOk = canCopyImage();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      setEntered(false);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const download = async () => {
    if (saved) return;
    try {
      // 大文件用 Blob URL 更可靠（dataURL 直接 download 在部分浏览器会被静默拦截）
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 延迟释放 Blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(true);
      toast(t("feed.imageSaved", lang), "ok");
    } catch {
      // 兜底：新标签页打开图片，用户可右键保存
      window.open(dataUrl, "_blank");
      toast(t("feed.imageSaved", lang), "ok");
    }
  };

  const copy = async () => {
    if (busy) return;
    setBusy(true);
    setCopied(false);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast(t("feed.imageCopied", lang), "ok");
    } catch {
      toast(t("feed.copyUnsupported", lang), "err");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("feed.wallpaperTitle", lang)}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] max-w-md flex-col rounded-t-2xl bg-surface text-fg shadow-2xl"
        style={{
          transform: entered ? "translateY(0)" : "translateY(100%)",
          transition: reduced ? "none" : "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center gap-2 px-4 py-2.5">
          <h3 className="min-w-0 flex-1 truncate font-serif text-base font-medium">
            {t("feed.wallpaperTitle", lang)}
          </h3>
          <button
            onClick={onClose}
            aria-label={t("feed.sheet.close", lang)}
            className="btn btn-quiet btn-sm btn-icon text-faint"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* 图片预览 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          <img
            src={dataUrl}
            alt={t("feed.wallpaperTitle", lang)}
            className="mx-auto max-h-[56dvh] w-auto rounded-xl border border-line shadow-lg"
          />
        </div>

        {/* 操作按钮 */}
        <div className="shrink-0 grid grid-cols-2 gap-3 border-t border-line p-4">
          <button onClick={() => void download()} className="tactile-btn">
            <Icon name={saved ? "check" : "download"} size={16} />
            {t("feed.downloadImage", lang)}
          </button>
          <button
            onClick={() => void copy()}
            disabled={!copyOk || busy}
            className={`tactile-btn ${copyOk ? "cel" : ""}`}
            title={copyOk ? "" : t("feed.copyUnsupported", lang)}
          >
            <Icon name={copied ? "check" : "copy"} size={16} />
            {busy ? "…" : t("feed.copyImage", lang)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

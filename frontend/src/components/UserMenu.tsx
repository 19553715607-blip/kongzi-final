"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getMe } from "@/lib/api";
import { logout, switchGuest } from "@/lib/auth";
import { t, useLang } from "@/lib/i18n";
import type { AuthUser } from "@/lib/types";

export default function UserMenu() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [lang] = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const path = usePathname();

  useEffect(() => {
    getMe().then(setMe).catch(() => setMe(null));
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!me) {
    return (
      <Link
        href="/login"
        className="min-h-9 rounded-full border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
      >
        {t("user.login", lang)}
      </Link>
    );
  }

  const initial = (me.display_name || t("user.initial", lang)).slice(0, 1);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("user.menu", lang)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-cel-soft font-serif text-sm font-medium text-cel-ink transition hover:ring-2 hover:ring-cel/30"
      >
        {initial}
      </button>

      {open && (
        <div id={menuId} className="absolute end-0 top-11 z-30 w-60 rounded-2xl border border-line bg-surface p-2 shadow-xl">
          <div className="border-b border-line px-3 py-2">
            <div className="font-serif text-sm text-fg">{me.display_name}</div>
            <div className="mt-0.5 text-[10px] text-faint">
              {me.is_guest ? t("user.guest", lang) : me.email || t("user.account", lang)}
              {me.is_admin && (
                <span className="ms-1 rounded-full bg-accent-soft px-1.5 text-accent">admin</span>
              )}
            </div>
          </div>

          <Link
            href="/me"
            onClick={() => setOpen(false)}
            aria-current={path === "/me" ? "page" : undefined}
            className="block rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface-2"
          >
            {t("user.center", lang)}
          </Link>

          <div className="my-1 border-t border-line" />

          {me.is_guest ? (
            <button
              onClick={() => {
                if (confirm(t("user.switchGuestConfirm", lang))) {
                  switchGuest("/");
                }
              }}
              className="block w-full rounded-lg px-3 py-2 text-start text-sm text-muted hover:bg-surface-2"
            >
              {t("user.switchGuest", lang)}
            </button>
          ) : (
            <button
              onClick={() => logout("/login")}
              className="block w-full rounded-lg px-3 py-2 text-start text-sm text-accent hover:bg-accent-soft"
            >
              {t("user.logout", lang)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { t, useLang } from "@/lib/i18n";
import Icon from "./ui/Icon";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [lang] = useLang();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={t("theme.toggle", lang)}
      className="btn btn-outline btn-sm btn-icon"
      title={dark ? t("theme.toLight", lang) : t("theme.toDark", lang)}
    >
      <Icon name={dark ? "sun" : "moon"} size={15} />
    </button>
  );
}

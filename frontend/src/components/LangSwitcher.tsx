"use client";

import { LANGS, t, useLang, type Lang } from "@/lib/i18n";

/**
 * 语言切换。
 *
 * 桌面/平板用五枚胶囊；**手机端改为原生 select**——五枚胶囊宽约 180px，
 * 与主题切换、登录按钮挤在 390px 的头部里，法语/西语的「Connexion /
 * Iniciar sesión」会把整行顶出视口（实测溢出 32px / 44px）。原生下拉约 60px，
 * 且自带移动端滚轮选择，比自定义弹层更稳。
 */
export default function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useLang();
  const label = t("nav.lang", lang);

  return (
    <>
      <div className="hidden items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 sm:flex">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            title={l.native}
            aria-label={l.native}
            aria-pressed={lang === l.code}
            className={`rounded-full px-2 py-0.5 text-[11px] transition ${
              lang === l.code
                ? "bg-accent text-on-accent"
                : "text-muted hover:bg-surface-2"
            }`}
          >
            {compact ? l.label : l.label}
          </button>
        ))}
      </div>

      <select
        aria-label={label}
        title={label}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-full border border-line bg-surface px-2 py-1 text-[11px] text-muted outline-none focus:border-accent sm:hidden"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </>
  );
}

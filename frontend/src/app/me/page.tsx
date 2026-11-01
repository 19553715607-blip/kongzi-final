"use client";

import { getApiBase } from "@/lib/apiBase";

import { useEffect, useRef, useState } from "react";
import {
  exportMe,
  getFavorites,
  getGamifyProfile,
  getMe,
  removeFavorite,
  upgradeAccount,
  uploadAvatar,
  deleteAvatar,
  isAuthError,
} from "@/lib/api";
import { clearToken, logout, setToken, switchGuest } from "@/lib/auth";
import { t, useLang } from "@/lib/i18n";
import { CountUp, Reveal } from "@/lib/motion";
import Avatar from "@/components/Avatar";
import { TactileButton } from "@/components/museum";
import LoginGate from "@/components/LoginGate";
import type { AuthUser, Favorite, GamifyProfile } from "@/lib/types";


export default function MePage() {
  const [lang] = useLang();
  const [p, setP] = useState<GamifyProfile | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // 游客点到登录专属区（成就）时弹出解锁引导
  const [gateOpen, setGateOpen] = useState(false);

  const load = () => {
    getGamifyProfile().then(setP).catch((e) => setMsg(isAuthError(e) ? t("common.loginRequired", lang) : t("me.noBackend", lang)));
    getMe().then(setMe).catch(() => setMe(null));
    getFavorites().then(setFavs).catch(() => {});
  };

  // 头像更换：选中即上传（服务端裁方压缩 256px），成功后即时刷新
  const onPickAvatar = async (f: File | undefined) => {
    if (!f || avatarBusy) return;
    setAvatarBusy(true);
    try {
      setMe(await uploadAvatar(f));
    } catch (e) {
      setMsg(isAuthError(e) ? t("common.loginRequired", lang) : t("me.avatar.fail", lang));
    } finally {
      setAvatarBusy(false);
    }
  };
  const onResetAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      setMe(await deleteAvatar());
    } catch {
      setMsg(t("me.avatar.fail", lang));
    } finally {
      setAvatarBusy(false);
    }
  };
  useEffect(() => {
    load();
    // 登录时后端并入了游客进度，这里提示一次后清除
    try {
      const mergedXp = sessionStorage.getItem("kongzi_merged_xp");
      if (mergedXp) {
        setMsg(t("login.mergedXp", lang).replace("{n}", mergedXp));
        sessionStorage.removeItem("kongzi_merged_xp");
      }
    } catch {
      /* sessionStorage 不可用时忽略 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const doUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await upgradeAccount(email, pw);
      setToken(r.token);
      setEmail("");
      setPw("");
      setMsg(t("me.upgraded", lang));
      load();
    } catch {
      setMsg(t("me.upgradeFail", lang));
    }
  };

  const doExport = async () => {
    const data = await exportMe();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kongzi-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doDelete = async () => {
    if (!confirm(t("me.confirmDelete", lang))) return;
    await fetch(`${getApiBase()}/api/v1/auth/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("kongzi_token")}` },
    });
    clearToken();
    location.href = "/";
  };

  if (!p)
    return (
      <div className="space-y-4">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-4">
      {msg && (
        <Reveal>
          <div className="rounded-xl border border-line bg-surface px-4 py-2 text-sm text-muted">
            {msg}
          </div>
        </Reveal>
      )}

      {/* 头像名片 + KPI：点击头像即可更换（上传后服务端裁方压缩） */}
      <Reveal>
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <div className="relative shrink-0">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              title={t("me.avatar.change", lang)}
              aria-label={t("me.avatar.change", lang)}
              className="group relative block rounded-full focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Avatar url={me?.avatar_url} name={p?.display_name} size={56} className={avatarBusy ? "opacity-50" : ""} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] tracking-widest text-white opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? t("me.avatar.busy", lang) : t("me.avatar.changeHint", lang)}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                void onPickAvatar(e.target.files?.[0]);
                e.target.value = ""; // 允许连续选同一文件
              }}
            />
          </div>
          <div className="flex-1">
            <div className="font-serif text-lg text-fg">{p.display_name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-faint">
              <span>
                {p.level.name} ·{" "}
                <CountUp value={p.level.xp} className="font-serif text-accent" />{" "}
                XP ·{" "}
                {t("me.streak", lang).replace(
                  "{n}",
                  String(p.streak_days),
                )}
              </span>
              {p.is_guest && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-faint">
                  {t("me.guest", lang)}
                </span>
              )}
              {me?.avatar_url && !avatarBusy && (
                <button
                  onClick={() => void onResetAvatar()}
                  className="pressable rounded-full border border-line px-2 py-0.5 text-[10px] text-faint transition hover:border-accent hover:text-accent"
                >
                  {t("me.avatar.reset", lang)}
                </button>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {/* 游客升级 */}
      {p.is_guest && (
        <Reveal delay={80}>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-1 text-sm font-medium text-fg">{t("me.upgradeTitle", lang)}</div>
            <div className="mb-3 text-xs text-faint">{t("me.upgradeDesc", lang)}</div>
            <form onSubmit={doUpgrade} className="flex flex-wrap gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("me.email", lang)}
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
              <input
                type="password"
                required
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={t("me.passwordHint", lang)}
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
              <TactileButton type="submit" variant="accent">
                {t("me.upgrade", lang)}
              </TactileButton>
            </form>
          </section>
        </Reveal>
      )}

      {/* 勋章墙摘要：登录后解锁 */}
      <Reveal delay={120}>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-fg">
              {p.locked
                ? t("gate.badgesLocked", lang)
                : t("me.badges", lang)
                    .replace("{n}", String(p.badges.filter((b) => b.unlocked).length))
                    .replace("{m}", String(p.badges.length))}
            </span>
            {p.locked && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent-ink">
                {t("gate.lockedTag", lang)}
              </span>
            )}
          </div>
          {p.locked ? (
            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="pressable w-full rounded-xl border border-dashed border-line bg-surface-2/40 px-4 py-6 text-center transition hover:border-accent/40"
            >
              <div className="font-serif text-sm text-fg">{t("gate.title", lang)}</div>
              <div className="mt-1 text-xs text-muted">{t("gate.login", lang)} →</div>
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {p.badges.map((b) => (
                <span
                  key={b.id}
                  title={b.desc}
                  className={`rounded-full px-3 py-1 text-xs ${
                    b.unlocked
                      ? "bg-accent-soft text-accent-ink"
                      : "bg-surface-2 text-faint opacity-60"
                  }`}
                >
                  {b.unlocked ? "勋" : "封"} {b.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* 收藏夹 */}
      <Reveal delay={160}>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">
            {t("me.favorites", lang).replace(
              "{n}",
              String(favs.length),
            )}
          </div>
          {favs.length === 0 ? (
            <div className="empty-state !py-6">
              <span className="icon-plate">藏</span>
              <span className="state-sub">{t("me.noFavorites", lang)}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {favs.map((f) => (
                <div
                  key={f.id}
                  className="collection-card flex items-center gap-2 px-3 py-2"
                >
                  <span className="flex-1 truncate font-serif text-sm text-fg">
                    {f.label || f.ref}
                  </span>
                  <span className="text-[10px] text-faint">{f.type}</span>
                  <button
                    onClick={async () => {
                      await removeFavorite(f.id);
                      setFavs((x) => x.filter((y) => y.id !== f.id));
                    }}
                    className="text-xs text-faint hover:text-accent"
                  >
                    {t("me.remove", lang)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* 登录状态 */}
      <Reveal delay={200}>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">{t("me.loginStatus", lang)}</div>
          <div className="flex flex-wrap gap-2">
            {p.is_guest ? (
              <TactileButton
                variant="ghost"
                onClick={() => {
                  if (confirm(t("me.switchGuestConfirm", lang))) {
                    switchGuest("/");
                  }
                }}
              >
                {t("me.switchGuest", lang)}
              </TactileButton>
            ) : (
              <TactileButton variant="accent" onClick={() => logout("/login")}>
                {t("me.logout", lang)}
              </TactileButton>
            )}
          </div>
          <p className="mt-2 text-[10px] text-faint">
            {p.is_guest ? t("me.guestNote", lang) : t("me.logoutNote", lang)}
          </p>
        </section>
      </Reveal>

      {/* 数据与隐私 */}
      <Reveal delay={240}>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 text-sm font-medium text-fg">{t("me.dataPrivacy", lang)}</div>
          <div className="flex flex-wrap gap-2">
            <TactileButton variant="ghost" onClick={doExport}>
              {t("me.exportData", lang)}
            </TactileButton>
            <TactileButton variant="ghost" onClick={doDelete}>
              {t("me.deleteAccount", lang)}
            </TactileButton>
          </div>
          <p className="mt-2 text-[10px] text-faint">
            {t("me.deleteNote", lang).replace(
              "{x}",
              p.is_guest ? t("me.switchGuest", lang) : t("me.logout", lang),
            )}
          </p>
        </section>
      </Reveal>

      <LoginGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}

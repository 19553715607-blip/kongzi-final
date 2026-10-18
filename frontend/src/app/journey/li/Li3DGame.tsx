"use client";

/**
 * 礼 ·「执礼 · 宾至如归」
 * 参考 Summer Afternoon：第三人称漫步 + 跟随镜头 + 低多边形场景，走近互动完成三幕礼仪。
 */

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { LiHostScores } from "@/lib/types";
import {
  liHostScenario,
  RANK_META,
  type LiHostGuestCfg,
  type LiHostRoundDetail,
  type LiHostScenarioCfg,
} from "./liHostData";
import {
  buildRoundDetail,
  checkGreetOrder,
  clamp,
  detailToScores,
  scoreBow,
  scoreEventTiming,
  scoreSeats,
} from "./liHostLogic";
import * as sfx from "./liHostAudio";
import { useLang } from "@/lib/i18n";
import { gt } from "@/lib/gameDict";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton } from "@/components/museum";
import {
  dist2d,
  FollowCamera,
  PLAYER_START,
  PlayerAvatar,
  useMovementKeys,
  type MoveInput,
} from "./liHostPlayer";
import {
  CourtyardScene,
  guestWorldPos,
  GuestNPC,
  PAL,
  SeatMarkers,
  seatWorldPos,
  WORLD,
} from "./liHostVisuals";

type Phase = "intro" | "greet" | "bow" | "seat" | "banquet" | "done";

declare global {
  interface Window {
    __li3d?: {
      pos: () => [number, number, number];
      phase: () => string;
      atmosphere: () => number;
      interact: () => void;
    };
  }
}
type GuestState = LiHostGuestCfg & {
  greeted: boolean;
  seatIdx: number | null;
  mood: number;
  bowFlash: number;
};

type LiveEv = {
  cfg: LiHostScenarioCfg["events"][0];
  guestId: string;
  startMs: number;
  resolved: boolean;
};

export default function Li3DGame({
  scenarioKey,
  onExit,
  onFinish,
}: {
  scenarioKey: string;
  onExit: () => void;
  onFinish: (scores: LiHostScores, detail: LiHostRoundDetail) => void;
}) {
  const scenario = useMemo(() => liHostScenario(scenarioKey), [scenarioKey]);
  const [lang] = useLang();
  const t = (zh: string) => gt(zh, lang);
  const [phase, setPhase] = useState<Phase>("intro");
  const [guests, setGuests] = useState<GuestState[]>(() =>
    scenario.guests.map((g) => ({ ...g, greeted: false, seatIdx: null, mood: 0, bowFlash: 0 })),
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const [orderHits, setOrderHits] = useState(0);
  const [bows, setBows] = useState<LiHostRoundDetail["bows"]>([]);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [seatGuestIdx, setSeatGuestIdx] = useState(0);
  const [seatScoreVal, setSeatScoreVal] = useState(0);

  const [bowDepth, setBowDepth] = useState(0);
  const [bowDir, setBowDir] = useState(1);
  const [charging, setCharging] = useState(false);
  const bowRaf = useRef<number | null>(null);

  const [banquetStart, setBanquetStart] = useState(0);
  const [eventCursor, setEventCursor] = useState(0);
  const [liveEvents, setLiveEvents] = useState<LiveEv[]>([]);
  const [eventResults, setEventResults] = useState<LiHostRoundDetail["events"]>([]);
  const [overActs, setOverActs] = useState(0);
  const [atmosphere, setAtmosphere] = useState(62);
  const [toast, setToast] = useState("");
  const [isTouch, setIsTouch] = useState(false);
  const [nearbyHint, setNearbyHint] = useState("");

  const playerPos = useRef(new THREE.Vector3().copy(PLAYER_START));
  const touchInput = useRef<MoveInput>({ x: 0, z: 0 });
  const mergedInput = useRef<MoveInput>({ x: 0, z: 0 });
  const keyboardInput = useMovementKeys(phase !== "intro" && phase !== "done" && phase !== "bow");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1400);
  };

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false));
  }, []);

  // 环境声生命周期：离局/卸载时停掉（入院时 startAmbience）
  useEffect(() => () => sfx.stopAll(), []);

  // 调试钩子（CDP 测试用）：每渲染重赋值，始终读到最新闭包
  useEffect(() => {
    window.__li3d = {
      pos: () => playerPos.current.toArray() as [number, number, number],
      phase: () => phase,
      atmosphere: () => atmosphere,
      interact: () => tryInteract(),
    };
    return () => { delete window.__li3d; };
  });

  useEffect(() => {
    const sync = () => {
      const t = touchInput.current;
      const k = keyboardInput.current;
      if (Math.hypot(t.x, t.z) > 0.1) mergedInput.current = { ...t };
      else mergedInput.current = { ...k };
    };
    const id = window.setInterval(sync, 32);
    return () => clearInterval(id);
  }, [keyboardInput]);

  const remaining = guests.filter((g) => !g.greeted);
  const focusGuest = focusId ? guests.find((g) => g.id === focusId) : null;
  const seatTarget = phase === "seat" ? guests[seatGuestIdx] : null;
  const activeEventGuest = liveEvents.find((e) => !e.resolved)?.guestId ?? null;

  const onPlayerMove = useCallback((pos: THREE.Vector3) => {
    playerPos.current.copy(pos);
  }, []);

  const findNearby = useCallback((): { type: "guest"; id: string } | { type: "seat"; idx: number } | null => {
    const p = playerPos.current;
    if (phase === "greet") {
      let bestId: string | null = null;
      let bestD = Infinity;
      remaining.forEach((g) => {
        const idx = guests.findIndex((x) => x.id === g.id);
        const wp = guestWorldPos(idx, guests.length, g.seatIdx, false);
        const d = dist2d(p, wp);
        if (d < WORLD.interactRadius && d < bestD) {
          bestD = d;
          bestId = g.id;
        }
      });
      return bestId ? { type: "guest" as const, id: bestId } : null;
    }
    if (phase === "seat" && seatTarget) {
      for (let i = 0; i < guests.length; i++) {
        if (Object.values(assignments).includes(i)) continue;
        const d = dist2d(p, seatWorldPos(i));
        if (d < WORLD.seatRadius) return { type: "seat" as const, idx: i };
      }
    }
    if (phase === "banquet") {
      let bestId: string | null = null;
      let bestD = Infinity;
      guests.forEach((g, idx) => {
        const wp = guestWorldPos(idx, guests.length, g.seatIdx, true);
        const d = dist2d(p, wp);
        if (d < WORLD.interactRadius && d < bestD) {
          bestD = d;
          bestId = g.id;
        }
      });
      return bestId ? { type: "guest" as const, id: bestId } : null;
    }
    return null;
  }, [phase, remaining, guests, seatTarget, assignments]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const near = findNearby();
      if (!near) {
        setNearbyHint("");
        return;
      }
      if (phase === "greet" && near.type === "guest") {
        const g = guests.find((x) => x.id === near.id);
        setNearbyHint(g ? `${t("靠近")} ${t(g.name)} · ${t("按空格迎宾")}` : "");
      } else if (phase === "seat" && near.type === "seat") {
        setNearbyHint(`${t("站在席位上 · 按空格安排")} ${seatTarget?.name ? t(seatTarget.name) : t("宾客")}`);
      } else if (phase === "banquet" && near.type === "guest") {
        const g = guests.find((x) => x.id === near.id);
        const ev = liveEvents.find((e) => !e.resolved && e.guestId === near.id);
        setNearbyHint(ev ? `${t("照应")} ${g ? t(g.name) : ""} · ${t(ev.cfg.label)}` : `${t("走近")} ${g ? t(g.name) : ""}`);
      }
    }, 120);
    return () => clearInterval(id);
  }, [phase, findNearby, guests, seatTarget, liveEvents]);

  const pickGuest = (id: string) => {
    if (phase !== "greet" || remaining.length === 0) return;
    const ok = checkGreetOrder(scenario.guests, guests.filter((g) => g.greeted).map((g) => g.id), id);
    if (ok) {
      setOrderHits((h) => h + 1);
      showToast(t("先后得宜"));
      sfx.chimeGood();
    } else {
      showToast(t("失了先后"));
      setAtmosphere((a) => clamp(a - 8, 20, 100));
      sfx.chimeBad();
    }
    setFocusId(id);
    setPhase("bow");
    setBowDepth(0);
    setBowDir(1);
  };

  const tryInteract = () => {
    const near = findNearby();
    if (phase === "greet" && near?.type === "guest") pickGuest(near.id);
    else if (phase === "seat" && near?.type === "seat") assignSeat(near.idx);
    else if (phase === "banquet" && near?.type === "guest") tapGuestBanquet(near.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "e" && e.key !== "E") return;
      if (e.repeat) return;
      if (phase === "bow") return;
      if (phase === "intro" || phase === "done") return;
      e.preventDefault();
      tryInteract();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, findNearby]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "bow" || !charging) {
      if (bowRaf.current) cancelAnimationFrame(bowRaf.current);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setBowDepth((d) => {
        let nd = d + bowDir * scenario.gaugeSpeed * dt;
        let dir = bowDir;
        if (nd >= 1) { nd = 1; dir = -1; }
        if (nd <= 0) { nd = 0; dir = 1; }
        setBowDir(dir);
        return nd;
      });
      bowRaf.current = requestAnimationFrame(tick);
    };
    bowRaf.current = requestAnimationFrame(tick);
    return () => { if (bowRaf.current) cancelAnimationFrame(bowRaf.current); };
  }, [phase, charging, bowDir, scenario.gaugeSpeed]);

  const releaseBow = () => {
    if (phase !== "bow" || !focusId) return;
    setCharging(false);
    const guest = scenario.guests.find((g) => g.id === focusId)!;
    const { score, verdict } = scoreBow(guest, bowDepth, scenario);
    sfx.bowQing();
    if (score >= 70) sfx.riteGood();
    else if (score < 50) sfx.riteBad();
    setBows((b) => [...b, { guest: guest.name, verdict, score }]);
    setGuests((gs) =>
      gs.map((g) =>
        g.id === focusId
          ? { ...g, greeted: true, mood: score >= 70 ? 0.8 : score >= 50 ? 0.2 : -0.6, bowFlash: 1 }
          : g,
      ),
    );
    setAtmosphere((a) => clamp(a + (score >= 70 ? 6 : score >= 50 ? 0 : -10), 20, 100));
    showToast(`${verdict} · ${score}`);
    setFocusId(null);
    const left = guests.filter((g) => !g.greeted && g.id !== focusId).length;
    if (left > 0) setPhase("greet");
    else {
      setSeatGuestIdx(0);
      setPhase("seat");
    }
    window.setTimeout(() => {
      setGuests((gs) => gs.map((g) => ({ ...g, bowFlash: 0 })));
    }, 800);
  };

  const assignSeat = (seatIdx: number) => {
    if (phase !== "seat") return;
    const g = guests[seatGuestIdx];
    if (!g) return;
    if (Object.values(assignments).includes(seatIdx)) {
      showToast(t("此席已有宾客"));
      return;
    }
    const next = { ...assignments, [g.id]: seatIdx };
    setAssignments(next);
    setGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, seatIdx } : x)));
    const nextIdx = seatGuestIdx + 1;
    if (nextIdx >= guests.length) {
      const ss = scoreSeats(scenario.guests, next);
      setSeatScoreVal(ss);
      setAtmosphere((a) => clamp(a + (ss >= 75 ? 8 : ss >= 50 ? 0 : -12), 20, 100));
      showToast(ss >= 75 ? t("位次尽合于礼") : t("位次略有出入"));
      window.setTimeout(() => {
        setBanquetStart(performance.now());
        setEventCursor(0);
        setLiveEvents([]);
        setPhase("banquet");
      }, 900);
    } else {
      setSeatGuestIdx(nextIdx);
    }
  };

  const tapGuestBanquet = (id: string) => {
    if (phase !== "banquet") return;
    const ev = liveEvents.find((e) => !e.resolved && e.guestId === id);
    if (!ev) {
      setOverActs((o) => o + 1);
      setAtmosphere((a) => clamp(a - 5, 20, 100));
      showToast(t("过度殷勤 · 失于节"));
      return;
    }
    const tp = (performance.now() - ev.startMs) / (ev.cfg.duration * 1000);
    const { score, verdict } = scoreEventTiming(tp, ev.cfg.window);
    setEventResults((r) => [...r, { label: ev.cfg.label, verdict, score }]);
    setLiveEvents((le) => le.map((e) => (e === ev ? { ...e, resolved: true } : e)));
    setAtmosphere((a) => clamp(a + (score >= 80 ? 8 : score >= 55 ? 2 : -6), 20, 100));
    showToast(`${verdict} · ${score}`);
  };

  useEffect(() => {
    if (phase !== "banquet") return;
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - banquetStart) / 1000;
      while (eventCursor < scenario.events.length && scenario.events[eventCursor].at <= elapsed) {
        const cfg = scenario.events[eventCursor];
        setLiveEvents((le) => [
          ...le,
          { cfg, guestId: cfg.guest, startMs: performance.now(), resolved: false },
        ]);
        setEventCursor((c) => c + 1);
      }
      setLiveEvents((le) => {
        let changed = false;
        const next = le.map((e) => {
          if (e.resolved) return e;
          const tp = (performance.now() - e.startMs) / (e.cfg.duration * 1000);
          if (tp >= 1) {
            changed = true;
            setEventResults((r) => [...r, { label: e.cfg.label, verdict: t("怠慢了"), score: 30 }]);
            setAtmosphere((a) => clamp(a - 8, 20, 100));
            return { ...e, resolved: true };
          }
          return e;
        });
        return changed ? next : le;
      });
      if (elapsed >= scenario.banquetSeconds && phase === "banquet") setPhase("done");
    }, 120);
    return () => clearInterval(id);
  }, [phase, banquetStart, eventCursor, scenario]);

  useEffect(() => {
    if (phase !== "done") return;
    const detail = buildRoundDetail({
      bows,
      orderHits,
      orderTotal: scenario.guests.length,
      seatScore: seatScoreVal,
      events: eventResults,
      overActs,
      atmosphere,
    });
    const scores = detailToScores(detail);
    window.setTimeout(() => onFinish(scores, detail), 600);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const canWalk = phase !== "intro" && phase !== "done" && phase !== "bow";
  const bowTilt = phase === "bow" ? bowDepth : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TactileButton type="button" variant="ghost" onClick={onExit} className="sm">{t("← 退出修行")}</TactileButton>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">
          {t("漫步宾主院")} · {t(scenario.title)}
        </span>
      </div>

      <section
        className="relative overflow-hidden rounded-2xl border border-line select-none shadow-inner"
        style={{ height: "min(68vh, 520px)", minHeight: 380, touchAction: "none", background: `linear-gradient(180deg, ${PAL.skyTop}, ${PAL.skyBot})` }}
      >
        <Canvas camera={{ position: [0, 2.5, 5], fov: 48, near: 0.1, far: 60 }} dpr={[1, 1.75]}>
          <Suspense fallback={null}>
            <CourtyardScene atmosphere={atmosphere} />
            {guests.map((g, i) => (
              <GuestNPC
                key={g.id}
                guest={g}
                index={i}
                total={guests.length}
                phase={phase}
                highlighted={
                  g.id === focusId ||
                  g.id === activeEventGuest ||
                  (phase === "greet" && !g.greeted) ||
                  (phase === "seat" && seatTarget?.id === g.id)
                }
                seated={g.seatIdx != null && phase !== "greet" && phase !== "bow"}
              />
            ))}
            <SeatMarkers visible={phase === "seat"} count={guests.length} />
            <PlayerAvatar
              input={mergedInput}
              enabled={canWalk}
              bowTilt={bowTilt}
              onMove={onPlayerMove}
            />
            <FollowCamera target={playerPos} active={phase !== "intro"} bowTilt={bowTilt} />
          </Suspense>
        </Canvas>

        {/* 操控提示 */}
        {canWalk && (
          <div className="pointer-events-none absolute left-3 top-14 rounded-lg bg-[#2c241c]/50 px-2.5 py-1 text-[10px] text-[#f5efe6]/85 backdrop-blur-sm">
            {isTouch ? t("左侧摇杆移动") : t("WASD / 方向键移动")} · {t("走近按空格互动")}
          </div>
        )}

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#2c241c]/40 to-transparent p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-serif text-sm text-[#f5efe6]">{t(scenario.place)}</div>
              <div className="text-[11px] text-[#f5efe6]/75">
                {phase === "intro" && t("入院")}
                {phase === "greet" && t("一幕 · 走近迎宾")}
                {phase === "bow" && t("作揖")}
                {phase === "seat" && t("二幕 · 走近安席")}
                {phase === "banquet" && t("三幕 · 席间照应")}
                {phase === "done" && t("礼成")}
              </div>
            </div>
            <div className="rounded-lg bg-[#2c241c]/50 px-2.5 py-1 text-end backdrop-blur-sm">
              <div className="text-[10px] text-[#f5efe6]/65">{t("全场气氛")}</div>
              <div className="font-serif text-lg text-[#f0c878]"><CountUp value={atmosphere} /></div>
            </div>
          </div>
        </div>

        {toast && (
          <Reveal className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2">
            <div className="rounded-full border border-accent/30 bg-[#2c241c]/80 px-4 py-1.5 text-sm text-[#f5efe6] backdrop-blur-sm animate-toast">
              {toast}
            </div>
          </Reveal>
        )}
        {nearbyHint && canWalk && (
          <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-accent/75 px-3 py-1 text-xs text-white">
            {nearbyHint}
          </div>
        )}

        {/* 触屏摇杆 */}
        {isTouch && canWalk && (
          <TouchJoystick onChange={(x, z) => { touchInput.current = { x, z }; }} />
        )}

        {/* Phase overlays */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2c241c]/85 via-[#2c241c]/45 to-transparent p-4 pt-12">
          {phase === "intro" && (
            <div className="mx-auto max-w-md text-center">
              <Reveal>
                <p className="text-sm leading-relaxed text-[#f5efe6]/90">{t(scenario.intro)}</p>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-2 text-xs text-[#f0c878]/90">{t("要诀：")}{t(scenario.tip)}</p>
              </Reveal>
              <Reveal delay={220}>
                <p className="mt-2 text-[10px] text-[#f5efe6]/60">{t("入院后可自由漫步，走近宾客互动")}</p>
              </Reveal>
              <Reveal delay={320}>
                <TactileButton
                  type="button"
                  variant="accent"
                  onClick={() => setPhase("greet")}
                  className="pointer-events-auto mt-4 w-full"
                >
                  {t("入 院")}
                </TactileButton>
              </Reveal>
            </div>
          )}

          {phase === "greet" && (
            <p className="text-center text-xs text-[#f5efe6]/85">
              {t("先尊后卑 · 走近当先迎的宾客按空格（或点「迎宾」）· 还剩")} {remaining.length} {t("位")}
            </p>
          )}

          {phase === "bow" && focusGuest && (
            <div className="mx-auto max-w-sm">
              <p className="text-center text-xs text-[#f5efe6]/85">
                {t("向")} {t(RANK_META[focusGuest.rank].label)} {t(focusGuest.name)} {t("行揖礼")}
              </p>
              <p className="mt-1 text-center text-[10px] text-[#f0c878]/85">{t(focusGuest.note)}</p>
              <div className="relative mx-auto mt-3 h-3 w-full overflow-hidden rounded-full bg-[#f5efe6]/15">
                <div
                  className="absolute inset-y-0 rounded-full bg-accent/70"
                  style={{
                    left: `${Math.max(0, (RANK_META[focusGuest.rank].depth - (focusGuest.zoneW ?? scenario.zoneW)) * 100)}%`,
                    width: `${(focusGuest.zoneW ?? scenario.zoneW) * 200}%`,
                  }}
                />
                <div className="absolute top-0 h-full w-1 bg-[#f5efe6]" style={{ left: `${bowDepth * 100}%` }} />
              </div>
              <Pressable
                type="button"
                className="pointer-events-auto mt-3 w-full rounded-xl bg-accent py-3 text-sm font-medium text-white"
                onPointerDown={() => setCharging(true)}
                onPointerUp={releaseBow}
                onPointerLeave={() => charging && releaseBow()}
              >
                {t("按住作揖 · 松手定深浅")}
              </Pressable>
            </div>
          )}

          {phase === "seat" && seatTarget && (
            <p className="text-center text-xs text-[#f5efe6]/85">
              {t("为")} <span className="text-[#f0c878]">{t(seatTarget.name)}</span> {t("安排席位 — 走到发光席圈上按空格")}
            </p>
          )}

          {phase === "banquet" && (
            <p className="text-center text-xs text-[#f5efe6]/85">
              {t("走近有需求的宾客按空格照应；无事频扰反失「节」")}
            </p>
          )}

          {phase === "done" && (
            <p className="text-center font-serif text-lg text-[#f0c878]">{t("宾主尽欢 · 礼成")}</p>
          )}

          {/* 触屏互动钮 */}
          {isTouch && (phase === "greet" || phase === "seat" || phase === "banquet") && (
            <TactileButton
              type="button"
              variant="accent"
              onClick={tryInteract}
              className="pointer-events-auto mx-auto mt-3 block"
            >
              {t("互 动")}
            </TactileButton>
          )}
        </div>
      </section>
    </div>
  );
}

function TouchJoystick({ onChange }: { onChange: (x: number, z: number) => void }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [lang] = useLang();
  const reset = () => {
    origin.current = null;
    onChange(0, 0);
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-20 left-4 h-24 w-24 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm"
      onPointerDown={(e) => {
        origin.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!origin.current) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        const len = Math.hypot(dx, dy);
        const max = 36;
        const s = len > max ? max / len : 1;
        onChange((dx * s) / max, (dy * s) / max);
      }}
      onPointerUp={reset}
      onPointerLeave={reset}
    >
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50">{gt("移动", lang)}</div>
    </div>
  );
}

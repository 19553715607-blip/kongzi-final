"use client";

/**
 * 礼 ·「执礼 · 宾至如归」
 * 正面固定镜头下的庭院漫步与三幕礼仪互动。
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
  FixedRiteCamera,
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
  // 合并修复：稳定翻译函数，避免宴席定时器随每次渲染重建。
  const t = useCallback((zh: string) => gt(zh, lang), [lang]);
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
  const eventCursorRef = useRef(0);
  const [liveEvents, setLiveEvents] = useState<LiveEv[]>([]);
  const liveEventsRef = useRef<LiveEv[]>([]);
  liveEventsRef.current = liveEvents;
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

  // 空格按住作揖:keydown 蓄力 / keyup 松手(ref 取最新闭包,避免每帧重订阅)
  const releaseBowRef = useRef<() => void>(() => {});
  releaseBowRef.current = releaseBow;
  useEffect(() => {
    if (phase !== "bow") return;
    // 合并修复：只有在作揖阶段按下的空格才能结算，忽略迎宾按键的松开。
    let spaceHeld = false;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.repeat || spaceHeld) return;
      spaceHeld = true;
      setCharging(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!spaceHeld) return;
      spaceHeld = false;
      releaseBowRef.current();
    };
    const cancel = () => {
      spaceHeld = false;
      setCharging(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", cancel);
    };
  }, [phase]);

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
        eventCursorRef.current = 0;
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
      // 到点事件出列(ref 游标,循环体内可控)
      const spawn: LiHostScenarioCfg["events"] = [];
      while (eventCursorRef.current < scenario.events.length && scenario.events[eventCursorRef.current].at <= elapsed) {
        spawn.push(scenario.events[eventCursorRef.current]);
        eventCursorRef.current += 1;
      }
      if (spawn.length > 0) {
        const nowMs = performance.now();
        setLiveEvents((le) => [
          ...le,
          ...spawn.map((cfg) => ({ cfg, guestId: cfg.guest, startMs: nowMs, resolved: false })),
        ]);
      }
      // 超时未照应 → 怠慢(副作用放在 updater 之外)
      const nowMs = performance.now();
      const expired = liveEventsRef.current.filter(
        (e) => !e.resolved && (nowMs - e.startMs) / (e.cfg.duration * 1000) >= 1,
      );
      if (expired.length > 0) {
        const expiredSet = new Set(expired);
        setLiveEvents((le) => le.map((e) => (expiredSet.has(e) ? { ...e, resolved: true } : e)));
        expired.forEach((e) => {
          setEventResults((r) => [...r, { label: e.cfg.label, verdict: t("怠慢了"), score: 30 }]);
          setAtmosphere((a) => clamp(a - 8, 20, 100));
        });
      }
      if (elapsed >= scenario.banquetSeconds) setPhase("done");
    }, 120);
    return () => clearInterval(id);
  }, [phase, banquetStart, scenario, t]);

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
  const stageIndex = phase === "seat" ? 1 : phase === "banquet" ? 2 : phase === "done" ? 3 : 0;
  const stageLabels = [t("一幕 · 走近迎宾"), t("二幕 · 走近安席"), t("三幕 · 席间照应")];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TactileButton type="button" variant="ghost" onClick={onExit} className="sm">{t("← 退出修行")}</TactileButton>
        <span className="rounded-full border border-[#b79a5b]/25 bg-[#f4eddd] px-3 py-1 text-xs text-[#735c2f]">
          {t("礼部修行场")} · {t(scenario.title)}
        </span>
      </div>

      <section
        className="relative isolate overflow-hidden rounded-[1.35rem] border border-[#9a7940]/40 bg-[#e9dfc7] select-none shadow-[0_24px_70px_-32px_rgba(39,30,18,0.7)] ring-1 ring-white/60"
        style={{ height: "min(76vh, 650px)", minHeight: 440, touchAction: "none", background: `linear-gradient(180deg, ${PAL.skyTop}, ${PAL.skyBot})` }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 4.8, 10.5], fov: 42, near: 0.1, far: 60 }}
          dpr={[1, 1.75]}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.9;
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
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
            <FixedRiteCamera />
          </Suspense>
        </Canvas>

        {/* 【渲染优化】仅调整 HUD 的磨砂半透外观，文字与交互状态保持原样。 */}
        {/* 操控提示 */}
        {canWalk && (
          <div className="li-glass-panel pointer-events-none absolute left-4 top-[5.4rem] rounded-full border px-3 py-1.5 text-[10px] tracking-wide text-[#f8f1e4]/90">
            {isTouch ? t("左侧摇杆移动") : t("WASD / 方向键移动")} · {t("走近按空格互动")}
          </div>
        )}

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="li-glass-panel flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[#f8f1e4]">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-[#dfbf70]/55 font-serif text-lg text-[#e8c878] shadow-[inset_0_0_0_3px_rgba(223,191,112,0.09)]">礼</div>
              <div>
                <div className="font-serif text-sm tracking-[0.12em]">{t(scenario.place)}</div>
                <div className="mt-0.5 text-[10px] tracking-[0.16em] text-[#e9cf91]/75">
                  {phase === "intro" && t("入院")}
                  {phase === "greet" && stageLabels[0]}
                  {phase === "bow" && t("作揖")}
                  {phase === "seat" && stageLabels[1]}
                  {phase === "banquet" && stageLabels[2]}
                  {phase === "done" && t("礼成")}
                </div>
              </div>
            </div>
            <div className="li-glass-panel min-w-[118px] rounded-xl border px-3.5 py-2.5 text-end text-[#f8f1e4]">
              <div className="flex items-center justify-between gap-3 text-[10px] tracking-[0.12em] text-[#e9cf91]/75">
                <span>{t("全场气氛")}</span>
                <span className="font-serif text-base leading-none text-[#f0d58e]"><CountUp value={atmosphere} /></span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-[#b58a43] via-[#e8cf8e] to-[#f5e5b7] transition-[width] duration-700" style={{ width: `${atmosphere}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex max-w-[230px] gap-1.5" aria-label={t("礼仪进程")}>
            {stageLabels.map((label, index) => (
              <div key={label} className="h-1 flex-1 overflow-hidden rounded-full bg-[#211d17]/45" title={label}>
                <div className={`h-full rounded-full transition-all duration-500 ${index < stageIndex ? "w-full bg-[#e6c675]" : index === stageIndex && phase !== "intro" ? "w-2/3 bg-[#d2ad5b]" : "w-0"}`} />
              </div>
            ))}
          </div>
        </div>

        {toast && (
          <Reveal className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2">
            <div className="li-glass-panel rounded-full border px-4 py-1.5 text-sm text-[#fff7e5] animate-toast">
              {toast}
            </div>
          </Reveal>
        )}
        {nearbyHint && canWalk && (
          <div className="li-glass-panel pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full border px-3.5 py-1.5 text-xs text-white">
            {nearbyHint}
          </div>
        )}

        {/* 触屏摇杆 */}
        {isTouch && canWalk && (
          <TouchJoystick onChange={(x, z) => { touchInput.current = { x, z }; }} />
        )}

        {/* Phase overlays */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
          {phase === "intro" && (
            <div className="li-glass-panel mx-auto max-w-2xl rounded-2xl border px-4 py-4 text-center text-[#f8f1e4] sm:px-7 sm:py-5">
              <Reveal>
                <div className="flex items-center justify-center gap-3 text-[9px] tracking-[0.24em] text-[#e5c77e]/80">
                  <span className="h-px w-8 bg-[#d4b46c]/45" />
                  <span>{t("礼部修行场")} · {t(scenario.place)}</span>
                  <span className="h-px w-8 bg-[#d4b46c]/45" />
                </div>
                <h2 className="mt-2 font-serif text-2xl tracking-[0.12em] text-[#fff8e8] drop-shadow sm:text-3xl">{t(scenario.title)}</h2>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-[#f4eddf]/85 sm:text-sm">{t(scenario.intro)}</p>
              </Reveal>
              <Reveal delay={120}>
                <div className="mx-auto mt-3 flex max-w-xl items-start gap-2 rounded-lg border border-[#d8bb72]/20 bg-black/15 px-3 py-2 text-start">
                  <span className="mt-px shrink-0 font-serif text-xs text-[#e8c878]">{t("要诀：")}</span>
                  <p className="text-[11px] leading-5 text-[#e8d7ad]/90 sm:text-xs">{t(scenario.tip)}</p>
                </div>
              </Reveal>
              <Reveal delay={220}>
                <div className="mt-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
                  <p className="text-[11px] text-[#f5efe6]/55">{t("入院后可自由漫步，走近宾客互动")}</p>
                  <TactileButton
                    type="button"
                    variant="accent"
                    onClick={() => setPhase("greet")}
                    className="li-enter-btn pointer-events-auto w-full min-w-48 sm:w-auto"
                  >
                    {t("入 院")} <span className="ms-2 opacity-70">↗</span>
                  </TactileButton>
                </div>
              </Reveal>
            </div>
          )}

          {phase === "greet" && (
            <div className="li-glass-panel mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[#f8f1e4]">
              <div>
                <div className="font-serif text-sm text-[#f0d58e]">{stageLabels[0]}</div>
                <p className="mt-1 text-[11px] leading-5 text-[#f5efe6]/80">{t("先尊后卑 · 走近当先迎的宾客按空格（或点「迎宾」）· 还剩")} {remaining.length} {t("位")}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#d8bb72]/30 px-2.5 py-1 font-serif text-xs text-[#e8c878]">01 / 03</span>
            </div>
          )}

          {phase === "bow" && focusGuest && (
            <div className="li-glass-panel mx-auto max-w-lg rounded-xl border px-4 py-3 text-[#f8f1e4] sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#f5efe6]/85">{t("向")} {t(RANK_META[focusGuest.rank].label)} {t(focusGuest.name)} {t("行揖礼")}</p>
                  <p className="mt-1 text-[10px] text-[#f0c878]/85">{t(focusGuest.note)}</p>
                </div>
                <span className="rounded-full border border-[#d8bb72]/25 px-2.5 py-1 text-[10px] text-[#e8c878]">{t("作揖")}</span>
              </div>
              <div className="relative mx-auto mt-3 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#92713b] via-[#e5c875] to-[#fff0b7] shadow-[0_0_12px_rgba(229,200,117,0.5)]"
                  style={{
                    left: `${Math.max(0, (RANK_META[focusGuest.rank].depth - (focusGuest.zoneW ?? scenario.zoneW)) * 100)}%`,
                    width: `${(focusGuest.zoneW ?? scenario.zoneW) * 200}%`,
                  }}
                />
                <div className="absolute -top-1 h-5 w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" style={{ left: `${bowDepth * 100}%` }} />
              </div>
              <Pressable
                type="button"
                className="pointer-events-auto mt-3 w-full rounded-xl border border-[#f2dc9c]/30 bg-gradient-to-b from-[#a8823d] to-[#80612c] py-3 text-sm font-medium tracking-wide text-white shadow-lg shadow-black/20 transition hover:brightness-110"
                onPointerDown={() => setCharging(true)}
                onPointerUp={releaseBow}
                onPointerLeave={() => charging && releaseBow()}
              >
                {isTouch ? t("按住按钮作揖 · 松手定深浅") : t("按住空格作揖 · 松手定深浅")}
              </Pressable>
            </div>
          )}

          {phase === "seat" && seatTarget && (
            <div className="li-glass-panel mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[#f8f1e4]">
              <div>
                <div className="font-serif text-sm text-[#f0d58e]">{stageLabels[1]}</div>
                <p className="mt-1 text-[11px] leading-5 text-[#f5efe6]/80">{t("为")} <span className="text-[#f0c878]">{t(seatTarget.name)}</span> {t("安排席位 — 走到发光席圈上按空格")}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#d8bb72]/30 px-2.5 py-1 font-serif text-xs text-[#e8c878]">02 / 03</span>
            </div>
          )}

          {phase === "banquet" && (
            <div className="li-glass-panel mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[#f8f1e4]">
              <div>
                <div className="font-serif text-sm text-[#f0d58e]">{stageLabels[2]}</div>
                <p className="mt-1 text-[11px] leading-5 text-[#f5efe6]/80">{t("走近有需求的宾客按空格照应；无事频扰反失「节」")}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#d8bb72]/30 px-2.5 py-1 font-serif text-xs text-[#e8c878]">03 / 03</span>
            </div>
          )}

          {phase === "done" && (
            <div className="li-glass-panel mx-auto max-w-2xl rounded-xl border px-5 py-4 text-center font-serif text-lg tracking-[0.14em] text-[#f0d58e]">{t("宾主尽欢 · 礼成")}</div>
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
      className="pointer-events-auto absolute bottom-32 left-4 h-24 w-24 rounded-full border border-[#f1dfb1]/40 bg-[#211d17]/35 shadow-lg backdrop-blur-md"
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

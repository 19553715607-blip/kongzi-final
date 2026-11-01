"use client";

/**
 * 御艺·五御 — 3D 驭车（Three.js / React Three Fiber）
 *
 * 操作：↑/W 扬鞭催行 · ↓/S 收缰缓行 · ←→/AD 调辕转向 · 空格 = 礼
 *       手机：底部五个大按钮（◀ 扬鞭 收缰 ▶ 礼）
 *
 * 五关：鸣和鸾（节拍门）/ 逐水曲（弯道居中）/ 过君表（缓行致礼）/
 *       舞交衢（停让行人）/ 逐禽左（禽奔不追）
 *
 * 后端契约不变：POST /yu/scenario/{sid}/drive（trajectory + events 三维评分）。
 * 游戏数值由 yuEngine 在场景 useFrame 推进；React 只管 HUD / 卡片。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGT } from "@/lib/gameDict";
import { useLang } from "@/lib/i18n";
import { Reveal, CountUp, Pressable } from "@/lib/motion";
import { TactileButton, ProvenanceCaption } from "@/components/museum";
import { driveYuScenario, getYuProgress, getYuToday, errorHint } from "@/lib/api";
import type {
  YuDriveResp,
  YuEvent,
  YuProgressResp,
  YuScenarioBrief,
  YuTodayResp,
} from "@/lib/types";
import { createRunState, finalizeEvents, trafficY } from "./yuEngine";
import { createYuRefs, YuScene, type YuRefs } from "./yuScene";
import * as sfx from "./yuAudio";

const KIND_COLOR: Record<string, string> = {
  mingheluan: "#854F0B",
  zhushui: "#0F6E56",
  junbiao: "#993C1D",
  jiaoqu: "#1E5F8E",
  qinzuo: "#534AB7",
};

const KIND_GUIDE: Record<string, { goal: string; tips: string }> = {
  mingheluan: { goal: "过金铃门要踩准节拍", tips: "速度稳在目标值附近，铃亮即到门时机" },
  zhushui: { goal: "沿水弯道居中行驶", tips: "提前看弯道方向，小幅多次调整" },
  junbiao: { goal: "君表前缓行 + 按「礼」", tips: "看到地上金环就减速到 4 以下，过牌坊按空格" },
  jiaoqu: { goal: "行人横穿必须停让", tips: "行人上路就停（<1 m/s），等他过完再走" },
  qinzuo: { goal: "禽奔于左 · 勿追", tips: "鹿出现别左转，扶直辕原路前行" },
};

type Phase = "idle" | "playing" | "submitting" | "scored";

export default function YuGame() {
  const tr = useGT();
  const [today, setToday] = useState<YuTodayResp | null>(null);
  const [progress, setProgress] = useState<YuProgressResp | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [current, setCurrent] = useState<YuScenarioBrief | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<YuDriveResp | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const [beatsDone, setBeatsDone] = useState<(boolean | null)[]>([]); // true 中 false 未中
  const [showGuide, setShowGuide] = useState(true);

  const [refs] = useState(() => createYuRefs());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 加载 ──
  // 注意：useGT() 每次渲染都返回新函数，不能作为 useCallback 依赖，否则会无限重载。
  // 依赖语言码（稳定字符串）即可：语言切换时重新拉取，其余渲染不受影响。
  const [lang] = useLang();
  const reload = useCallback(() => {
    setLoadErr("");
    getYuToday(lang).then(setToday).catch((e) => setLoadErr(tr("无法加载御艺场景，请稍后重试") + `（${errorHint(e)}）`));
    getYuProgress().then(setProgress).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    reload();
  }, [reload]);

  const say = useCallback((text: string, good: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, good });
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // ── 事件桥（场景 useFrame → React）：每次渲染直接赋值，避免闭包过期 ──
  const onFinishRef = useRef<() => void>(() => {});
  refs.onEvents.current = (evts: YuEvent[], finished: boolean) => {
    for (const e of evts) {
      switch (e.type) {
        case "beat_hit":
          if (e.meta?.missed) {
            sfx.beatChime(false);
            say(tr("节拍未合"), false);
            setBeatsDone((b) => [...b, false]);
          } else {
            sfx.beatChime(true);
            say(tr("♩ 合拍"), true);
            setBeatsDone((b) => [...b, true]);
          }
          break;
        case "junbiao_pass": sfx.junbiao(); say(tr("过君表 · 缓行 ✓"), true); break;
        case "li": sfx.li(); say(tr("致礼"), true); break;
        case "pedestrian_yield": sfx.yieldOk(); say(tr("礼让行人 ✓"), true); break;
        case "hit_pedestrian": sfx.hitPed(); say(tr("撞到行人！"), false); break;
        case "chase": sfx.deer(); say(tr("逐禽违礼！"), false); break;
        case "meet_yield": sfx.meetOk(); say(tr("会车 · 礼让 ✓"), true); break;
        case "meet_li": sfx.meetLi(); say(tr("相揖而礼 ✓"), true); break;
        case "meet_rude": sfx.meetRude(); say(tr("会车失礼 — 靠右缓行"), false); break;
        case "tailgate": sfx.tailgate(); say(tr("逼随前车 — 勿极勿逼"), false); break;
        case "hard_brake": sfx.hardBrake(); say(tr("急刹！"), false); break;
        case "overspeed": sfx.overspeed(); say(tr("超速 — 收缰"), false); break;
      }
    }
    if (finished) void onFinishRef.current();
  };

  // ── 开局 ──
  const startScenario = useCallback((s: YuScenarioBrief) => {
    refs.scenario = s;
    refs.run = createRunState();
    refs.input = { left: false, right: false, up: false, down: false, liPressed: false };
    refs.running = true;
    setCurrent(s);
    setResult(null);
    setBeatsDone([]);
    setShowGuide(true);
    setRunId((i) => i + 1);
    setPhase("playing");
    setTimeout(() => setShowGuide(false), 5200);
  }, [refs]);

  // ── 冲线 → 提交 ──
  const onFinish = useCallback(async () => {
    if (phaseRef.current !== "playing" || !current) return;
    refs.running = false;
    sfx.stopAll();
    setPhase("submitting");
    try {
      const res = await driveYuScenario(current.id, refs.run.trajectory, finalizeEvents(refs.run), lang);
      setResult(res);
      sfx.finish(res.score);
      setPhase("scored");
      getYuProgress().then(setProgress).catch(() => {});
    } catch {
      say(tr("提交失败 — 请检查登录/网络"), false);
      setPhase("playing");
      refs.running = true;
    }
  }, [current, refs, say, lang]);
  onFinishRef.current = onFinish;

  // ── 键盘 ──
  useEffect(() => {
    const key = (e: KeyboardEvent, down: boolean) => {
      if (phaseRef.current !== "playing") return;
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      switch (e.code) {
        case "ArrowUp": case "KeyW": refs.input.up = down; e.preventDefault(); break;
        case "ArrowDown": case "KeyS": refs.input.down = down; e.preventDefault(); break;
        case "ArrowLeft": case "KeyA": refs.input.left = down; e.preventDefault(); break;
        case "ArrowRight": case "KeyD": refs.input.right = down; e.preventDefault(); break;
        case "Space":
          if (down && !e.repeat) refs.input.liPressed = true;
          e.preventDefault();
          break;
      }
    };
    const kd = (e: KeyboardEvent) => key(e, true);
    const ku = (e: KeyboardEvent) => key(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [refs]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    sfx.stopAll();
  }, []);

  const backToSelect = useCallback(() => {
    refs.running = false;
    sfx.stopAll();
    setPhase("idle");
    setCurrent(null);
    setResult(null);
  }, [refs]);

  const guide = current ? KIND_GUIDE[current.kind] : null;

  return (
    <div className="space-y-3">
      {/* 顶部 HUD */}
      <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-accent">{tr("六艺 · 御")}</div>
            <div className="font-serif text-xl text-fg">{tr("五御 · 以礼行驱")}</div>
            <div className="mt-1 text-xs text-muted">{tr("扬鞭催行 · 收缰缓行 · 调辕转向 · 遇事致礼")}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {progress && <Stat label={tr("称号")} value={tr(progress.title)} />}
            {progress && <Stat label={tr("御艺")} value={`${progress.liuyi_yu}`} numeric />}
            {progress && <Stat label={tr("最佳")} value={`${progress.best_score}`} numeric />}
            <Link href="/journey" className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2">
              {tr("← 六艺")}
            </Link>
          </div>
        </div>
      </Reveal>

      {loadErr && (
        <div className="error-state">
          <div className="icon-plate">!</div>
          <div className="state-title">{tr("加载失败")}</div>
          <p className="state-sub">{loadErr}</p>
          <button type="button" onClick={reload} className="retry-btn">{tr("再试一次")}</button>
        </div>
      )}

      {/* 场景选择 */}
      {phase === "idle" && today && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {today.scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => startScenario(s)}
              className="card-hover rounded-2xl border border-line bg-surface p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg" style={{ color: KIND_COLOR[s.kind] ?? "#2b2925" }}>
                  {tr(s.title)}
                </span>
                <span className="flex gap-1">
                  {s.done_today && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{tr("今日已评")}</span>}
                  {s.answered && !s.done_today && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{tr("已驭过")}</span>}
                </span>
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{tr(s.setting)}</div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-faint">
                <span className="rounded-full bg-surface-2 px-2 py-0.5">{tr("目标")} {s.target_speed} m/s</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5">{KIND_GUIDE[s.kind] ? tr(KIND_GUIDE[s.kind]!.goal) : ""}</span>
              </div>
            </button>
          ))}
          <p className="text-[11px] text-faint sm:col-span-2 lg:col-span-3">
            {tr("五关皆可任驭 · 每日每关首驭计分，当日再驭练手不加分")}
          </p>
        </section>
      )}

      {/* 驾驶舱 */}
      {(phase === "playing" || phase === "submitting" || phase === "scored") && current && (
        <section className="relative select-none overflow-hidden rounded-2xl border border-line" style={{ height: "min(64vh, 560px)", minHeight: 340 }}>
          <Canvas
            key={`${current.id}-${runId}`}
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 4.3, 8.6], fov: 55, near: 0.1, far: 900 }}
            onCreated={({ camera }) => camera.lookAt(0, 1.4, -7)}
            className="block h-full w-full"
          >
            <YuScene g={refs} />
          </Canvas>

          {/* 速度表（左下） */}
          <SpeedGauge g={refs} target={current.target_speed} />

          {/* 进度条（顶部） */}
          <ProgressBar g={refs} scenario={current} beatsDone={beatsDone} />

          {/* 关卡提示 */}
          {showGuide && phase === "playing" && guide && (
            <Reveal className="pointer-events-none absolute left-1/2 top-14 w-[min(92%,430px)] -translate-x-1/2">
              <div className="rounded-2xl bg-black/60 px-5 py-4 text-center text-white backdrop-blur animate-fadein">
                <div className="font-serif text-lg" style={{ color: "#f0d9a0" }}>{tr(current.title)} · {tr(guide.goal)}</div>
                <div className="mt-1 text-xs leading-relaxed opacity-85">{tr(current.hint)}</div>
                <div className="mt-1 text-[11px] opacity-70">{tr(guide.tips)}</div>
                {(current.road_config?.traffic?.length ?? 0) > 0 && (
                  <div className="mt-1.5 text-[11px] text-sky-200">
                    {tr("途中有车马往来 —— 对向会车请靠右缓行，相遇时按空格「礼」可相揖；遇慢车勿逼随")}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* 事件 toast */}
          {toast && (
            <Reveal className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2">
              <div className={`rounded-full px-4 py-1.5 font-serif text-lg backdrop-blur animate-toast ${
                toast.good ? "bg-black/55 text-[#f0d9a0]" : "bg-red-900/70 text-white"
              }`}>
                {toast.text}
              </div>
            </Reveal>
          )}

          {/* 提交中 */}
          {phase === "submitting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="rounded-2xl bg-surface px-6 py-4 font-serif text-lg text-fg animate-fadein">{tr("评判中…")}</div>
            </div>
          )}

          {/* 结算卡 */}
          {phase === "scored" && result && (
            <ResultCard
              result={result}
              onRetry={() => startScenario(current)}
              onBack={backToSelect}
            />
          )}

          {/* 移动按钮 */}
          {phase === "playing" && (
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-between px-3 sm:px-6">
              <div className="flex gap-2">
                <HoldBtn label="◀" onHold={(v) => { refs.input.left = v; }} />
                <HoldBtn label="▶" onHold={(v) => { refs.input.right = v; }} />
              </div>
              <Pressable
                onClick={() => { refs.input.liPressed = true; }}
                className="h-14 w-14 rounded-full border-2 border-gold bg-[#fbf3dc]/90 font-serif text-lg text-[#6b4e12] shadow-lg"
              >
                {tr("礼")}
              </Pressable>
              <div className="flex gap-2">
                <HoldBtn label={tr("收缰")} sub="↓" onHold={(v) => { refs.input.down = v; }} />
                <HoldBtn label={tr("扬鞭")} sub="↑" accent onHold={(v) => { refs.input.up = v; }} />
              </div>
            </div>
          )}

          {/* 桌面键位提示 */}
          {phase === "playing" && (
            <div className="pointer-events-none absolute right-3 top-3 hidden rounded-full bg-black/45 px-3 py-1 text-[10px] text-white backdrop-blur sm:block">
              {tr("↑ 扬鞭 · ↓ 收缰 · ←→ 调辕 · 空格 礼")}
            </div>
          )}
        </section>
      )}

      {/* 御艺进度 */}
      {progress && phase === "idle" && (
        <Reveal as="section" className="rounded-2xl border border-line bg-surface p-4" delay={120}>
          <div className="mb-2 text-sm font-medium text-fg">
            {tr("御艺进境")} · {progress.played_count} / {progress.total_scenarios} {tr("关")} · {tr("均分")} {progress.avg_score}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {progress.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: KIND_COLOR[s.kind] ?? "#2b2925" }}>{tr(s.kind_label)}</span>
                  <span className={s.best_score > 0 ? "text-fg" : "text-faint"}>
                    {s.best_score > 0 ? `${tr("最佳")} ${s.best_score}` : tr("未驭")}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted">{tr(s.setting)}</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

// ── 速度表（rAF 直读 refs，不走 React 渲染） ──
function SpeedGauge({ g, target }: { g: YuRefs; target: number }) {
  const tr = useGT();
  const needleRef = useRef<SVGLineElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = g.run.car.speed;
      const ang = -110 + (Math.min(14, v) / 14) * 220;
      needleRef.current?.setAttribute("transform", `rotate(${ang} 60 62)`);
      const inBand = Math.abs(v - target) <= 1.5;
      needleRef.current?.setAttribute("stroke", v > target * 1.5 ? "#c0392b" : inBand ? "#3f6f4e" : "#2b2925");
      if (numRef.current) {
        numRef.current.textContent = v.toFixed(1);
        numRef.current.style.color = v > target * 1.5 ? "#c0392b" : inBand ? "#3f6f4e" : "#2b2925";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g, target]);

  // 目标区间弧（±1.5）
  const a0 = -110 + ((target - 1.5) / 14) * 220;
  const a1 = -110 + ((target + 1.5) / 14) * 220;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl bg-black/45 p-2 backdrop-blur">
      <svg viewBox="0 0 120 86" className="h-[86px] w-[120px]">
        <path d={arc(60, 62, 50, -110, 110)} fill="none" stroke="#ffffff33" strokeWidth={7} strokeLinecap="round" />
        <path d={arc(60, 62, 50, a0, a1)} fill="none" stroke="#d9a521" strokeWidth={7} strokeLinecap="round" opacity={0.85} />
        <line ref={needleRef} x1={60} y1={62} x2={60} y2={22} stroke="#2b2925" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={60} cy={62} r={4} fill="#2b2925" />
      </svg>
      <div className="-mt-2 text-center">
        <span ref={numRef} className="font-serif text-base font-bold text-white">0.0</span>
        <span className="ml-0.5 text-[9px] text-white/60">m/s · {tr("目标")} {target}</span>
      </div>
    </div>
  );
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => `${cx + r * Math.sin((a * Math.PI) / 180)},${cy - r * Math.cos((a * Math.PI) / 180)}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
}

// ── 进度条（rAF 驱动车位置） ──
function ProgressBar({ g, scenario, beatsDone }: { g: YuRefs; scenario: YuScenarioBrief; beatsDone: (boolean | null)[] }) {
  const carRef = useRef<HTMLDivElement>(null);
  const length = scenario.road_config?.length ?? 600;
  const obstacles = scenario.road_config?.obstacles ?? [];
  const beats = scenario.road_config?.beats ?? [];
  const traffic = scenario.road_config?.traffic ?? [];
  const trafficRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pct = Math.min(100, (g.run.car.y / length) * 100);
      if (carRef.current) carRef.current.style.left = `${pct}%`;
      traffic.forEach((tr, i) => {
        const el = trafficRefs.current[i];
        if (el) {
          const p = Math.min(100, Math.max(0, (trafficY(tr, g.run.elapsedMs) / length) * 100));
          el.style.left = `${p}%`;
        }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [g, length, traffic]);
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 sm:inset-x-6">
      <div className="relative h-2 rounded-full bg-black/35 backdrop-blur">
        <div ref={carRef} className="absolute -top-[7px] -ml-2 text-sm transition-none">🐎</div>
        {obstacles.map((o, i) => (
          <div key={i} className="absolute -top-[5px] -ml-2 text-xs"
            style={{ left: `${(o.y / length) * 100}%` }}>
            {o.type === "junbiao" ? "⛩️" : o.type === "pedestrian" ? "🚶" : "🦌"}
          </div>
        ))}
        {traffic.map((tr, i) => (
          <div key={`t${i}`} ref={(el) => { trafficRefs.current[i] = el; }}
            className="absolute -top-[5px] -ml-2 text-xs" style={{ left: "0%" }}>
            {tr.type === "oncoming" ? "🐴" : "🐂"}
          </div>
        ))}
        <div className="absolute -top-[6px] right-0 -mr-1 text-xs">🏁</div>
      </div>
      {beats.length > 0 && (
        <div className="mt-1.5 flex justify-center gap-1.5">
          {beats.map((_, i) => (
            <span
              key={i}
              className={`inline-block h-2 w-2 rounded-full ${
                i < beatsDone.length
                  ? beatsDone[i] ? "bg-emerald-400" : "bg-red-400"
                  : i === beatsDone.length ? "bg-gold" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 结算卡 ──
function ResultCard({ result, onRetry, onBack }: { result: YuDriveResp; onRetry: () => void; onBack: () => void }) {
  const tr = useGT();
  const tips: string[] = [];
  const st = result.stats;
  if (st.beats_total > 0) tips.push(`${tr("节拍：命中")} ${st.beat_hits}/${st.beats_total}。${tr("铃变绿即合拍，变红说明到早了或晚了。")}`);
  if (st.junbiao_passes > 0 || st.li_count > 0) tips.push(`${tr("礼让：君表通过")} ${st.junbiao_passes}${tr(" 次，按礼 ")}${st.li_count}${tr(" 次。要慢下来再按礼。")}`);
  if (st.pedestrian_yields > 0 || st.hit_pedestrian > 0) tips.push(`${tr("行人：让行")} ${st.pedestrian_yields}${tr(" 次")}${st.hit_pedestrian > 0 ? `${tr("，撞人")} ${st.hit_pedestrian}${tr(" 次")}` : ""}。${tr("见人先停稳。")}`);
  if (st.chase_attempts > 0) tips.push(`${tr("逐禽：追了")} ${st.chase_attempts}${tr(" 次。")}${tr("「禽逃则止，不复追」——直行即是礼。")}`);
  if ((st.meet_yields ?? 0) > 0 || (st.meet_rudes ?? 0) > 0) tips.push(`${tr("会车：礼让")} ${st.meet_yields ?? 0}${tr(" 次")}${(st.meet_rudes ?? 0) > 0 ? `${tr("，失礼")} ${st.meet_rudes}${tr(" 次")}` : ""}。${tr("对向来车，靠右缓行。")}`);
  if ((st.meet_li ?? 0) > 0) tips.push(`${tr("相揖：会车时致礼")} ${st.meet_li}${tr(" 次，对方车夫也拱手回礼了。「礼尚往来」。")}`);
  if ((st.tailgates ?? 0) > 0) tips.push(`${tr("随行：逼随前车")} ${st.tailgates}${tr(" 次。")}${tr("车距即礼数，勿极勿逼。")}`);
  if (st.hard_brakes > 0 || st.overspeeds > 0) tips.push(`${tr("不极：急刹")} ${st.hard_brakes}${tr(" 次、超速")} ${st.overspeeds}${tr(" 次。")}${tr("早收缰，匀速行。")}`);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="text-center">
          <div className="text-[10px] tracking-widest text-faint">{tr(result.scenario.kind_label)} · {tr("评判")}</div>
          <div className="mt-1 font-serif text-5xl text-fg"><CountUp value={result.score} /></div>
          <div className="mt-1 inline-block rounded-full bg-accent-soft px-3 py-0.5 font-serif text-sm text-accent-ink">
            {tr(result.grade)}{result.yu_delta > 0 ? `${tr("御艺 +")}${result.yu_delta}` : tr("（今日已评，不再加分）")}
          </div>
        </div>
        {/* 三维条 */}
        <div className="mt-4 space-y-2">
          <DimBar label={tr("节 · 节奏稳匀")} v={result.jie} color="#854F0B" />
          <DimBar label={tr("让 · 遇礼则让")} v={result.rang} color="#993C1D" />
          <DimBar label={tr("不极 · 不急不追")} v={result.buji} color="#0F6E56" />
        </div>
        {/* 提示 */}
        {tips.length > 0 && (
          <div className="mt-3 rounded-lg bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted">
            {tips.map((t, i) => <div key={i} className="mt-0.5">· {t}</div>)}
          </div>
        )}
        {/* 经典 */}
        {result.refs.length > 0 && (
          <div className="mt-3 rounded-lg border border-gold/50 bg-[#fbf3dc]/70 p-3 text-[11px] text-[#6b4e12]">
            {result.refs.slice(0, 2).map((r) => (
              <div key={r.ref_id} className="mt-1">
                <span className="opacity-70">{r.ref_label}：</span>
                <span className="font-serif">{r.text}</span>
                {result.new_unlocked_refs.some((u) => u.ref_id === r.ref_id) && (
                  <span className="ml-1 rounded-full bg-gold px-1.5 text-[9px] text-on-accent">{tr("新解锁")}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <ProvenanceCaption
          className="mt-4"
          items={[
            { label: tr("艺"), value: tr("御艺") },
            { label: tr("关卡"), value: tr(result.scenario.kind_label) },
            { label: "ID", value: `#${result.scenario.id}` },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <TactileButton variant="accent" onClick={onRetry} className="flex-1">
            {tr("再驭一次")}
          </TactileButton>
          <TactileButton variant="cel" onClick={onBack} className="flex-1">
            {tr("换一关")}
          </TactileButton>
        </div>
      </div>
    </div>
  );
}

function DimBar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span>{Math.round(v * 100)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.round(v * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function HoldBtn({ label, sub, accent, onHold }: { label: string; sub?: string; accent?: boolean; onHold: (v: boolean) => void }) {
  return (
    <Pressable
      onPointerDown={(e) => { e.preventDefault(); onHold(true); }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      className={`flex h-14 min-w-[64px] touch-none flex-col items-center justify-center rounded-2xl px-4 font-medium shadow-lg backdrop-blur ${
        accent ? "bg-accent/90 text-on-accent" : "bg-black/50 text-white"
      }`}
    >
      <span className="text-sm leading-none">{label}</span>
      {sub && <span className="mt-0.5 text-[9px] opacity-60">{sub}</span>}
    </Pressable>
  );
}

function Stat({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1">
      <div className="text-[10px] text-faint">{label}</div>
      <div className="font-serif text-sm text-fg">
        {numeric ? <CountUp value={parseInt(value, 10) || 0} /> : value}
      </div>
    </div>
  );
}

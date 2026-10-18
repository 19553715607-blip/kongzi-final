"use client";

/** HUD 资产（连续天数/经验/体力，可见资产）。
 *  streak/xp/energy 数字；goalPct 今日目标进度 0-100。
 */
export function HudAssets({
  streak,
  xp,
  energy,
  goalPct,
  goalLabel,
  className = "",
}: {
  streak?: number;
  xp?: number;
  energy?: number;
  goalPct?: number;
  goalLabel?: string;
  className?: string;
}) {
  return (
    <div className={`hud-assets ${className}`}>
      {streak != null && (
        <span className="ha-item">
          🔥 <b>{streak}</b>
        </span>
      )}
      {xp != null && (
        <span className="ha-item">
          XP <b>{xp}</b>
        </span>
      )}
      {energy != null && (
        <span className="ha-item">
          ⚡ <b>{energy}</b>
        </span>
      )}
      {goalPct != null && (
        <>
          <span className="ha-bar">
            <i style={{ width: `${Math.min(100, Math.max(0, goalPct))}%` }} />
          </span>
          {goalLabel && <span className="ha-item">{goalLabel}</span>}
        </>
      )}
    </div>
  );
}

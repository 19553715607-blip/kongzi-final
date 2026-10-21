"use client";

/** HUD 资产（连续天数/经验/体力，可见资产）。
 *  streak/xp/energy 数字；goalPct 今日目标进度 0-100。
 *  不用 emoji，用汉字标签承载，保持纸感。
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
          连习 <b>{streak}</b> 日
        </span>
      )}
      {xp != null && (
        <span className="ha-item">
          修行 <b>{xp}</b> XP
        </span>
      )}
      {energy != null && (
        <span className="ha-item">
          体力 <b>{energy}</b>
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

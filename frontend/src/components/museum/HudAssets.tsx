"use client";

import { t, type Lang } from "@/lib/i18n";

/** HUD 资产（连续天数/经验/体力，可见资产）。
 *  streak/xp/energy 数字；goalPct 今日目标进度 0-100。
 *  标签走 i18n（hud.streak / hud.xp / hud.energy），非中文环境不再露汉字。
 */
export function HudAssets({
  streak,
  xp,
  energy,
  goalPct,
  goalLabel,
  lang = "zh",
  className = "",
}: {
  streak?: number;
  xp?: number;
  energy?: number;
  goalPct?: number;
  goalLabel?: string;
  lang?: Lang;
  className?: string;
}) {
  return (
    <div className={`hud-assets ${className}`}>
      {streak != null && (
        <span className="ha-item">
          {t("hud.streak", lang).replace("{a}", String(streak))}
        </span>
      )}
      {xp != null && (
        <span className="ha-item">
          {t("hud.xp", lang).replace("{a}", String(xp))}
        </span>
      )}
      {energy != null && (
        <span className="ha-item">
          {t("hud.energy", lang).replace("{a}", String(energy))}
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

"use client";

import { useState } from "react";
import { getApiBase } from "@/lib/apiBase";

// 用户头像：设置了自定义头像（后端 avatar_url）才显示图片；
// 未设置或加载失败一律回落为「名首字」青瓷圆章——默认不展示任何图片头像。
export default function Avatar({
  url,
  name,
  size = 32,
  className = "",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [err, setErr] = useState(false);

  if (url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 运行时动态 URL，不进 next/image 优化管线
      <img
        src={getApiBase() + url}
        alt={name || ""}
        width={size}
        height={size}
        onError={() => setErr(true)}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = (name || "").trim().slice(0, 1) || "君";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-celadon font-serif text-celadon-deep ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}

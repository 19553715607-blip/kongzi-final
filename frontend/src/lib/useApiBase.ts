"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BACKEND_PORT, sameOriginEnabled } from "./apiBase";

/**
 * 展示用的绝对 API 基址（给文档、示例代码渲染用）。
 *
 * 为什么不能直接渲染 getApiBase()：
 * - SSR 拿到 `http://localhost:8000`，浏览器同源模式拿到 `""`，两边文本不同，
 *   React 报 hydration mismatch 后整段丢弃 SSR HTML（/developers 就是这么挂的）。
 * - 同源模式下 getApiBase() 返回空串，curl 示例会被渲染成 `/api/v1/...`，
 *   粘到终端里根本跑不了。
 *
 * 这里首帧（SSR 与客户端一致）统一给 `""`，挂载后再补上真实 origin，
 * 既让 hydration 对齐，也让示例代码是可执行的绝对地址。
 */
export function useApiBase(): string {
  const [base, setBase] = useState("");

  useEffect(() => {
    const override = process.env.NEXT_PUBLIC_API_BASE;
    if (override) {
      setBase(override);
      return;
    }
    setBase(
      sameOriginEnabled()
        ? window.location.origin
        : `${window.location.protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`,
    );
  }, []);

  return base;
}

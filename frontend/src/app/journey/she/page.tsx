import dynamic from "next/dynamic";

// 3D 射场依赖 WebGL，仅在客户端渲染（关闭 SSR）
const SheGame = dynamic(() => import("./SheGame"), { ssr: false });

export default function ShePage() {
  return <SheGame />;
}

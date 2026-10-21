import dynamic from "next/dynamic";

// 3D 御道依赖 WebGL，仅在客户端渲染（关闭 SSR）
const YuGame = dynamic(() => import("./YuGame"), { ssr: false });

export default function YuPage() {
  return <YuGame />;
}

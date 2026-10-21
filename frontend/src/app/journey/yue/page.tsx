import dynamic from "next/dynamic";

// 3D 编钟合鸣依赖 WebGL，仅在客户端渲染（关闭 SSR）
const YueGame = dynamic(() => import("./YueGame"), { ssr: false });

export default function YuePage() {
  return <YueGame />;
}

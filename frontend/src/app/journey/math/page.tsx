import dynamic from "next/dynamic";

// 3D 量仓分赈依赖 WebGL，仅在客户端渲染（关闭 SSR）
const MathGame = dynamic(() => import("./MathGame"), { ssr: false });

export default function MathPage() {
  return <MathGame />;
}

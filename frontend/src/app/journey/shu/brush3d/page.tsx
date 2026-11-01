import dynamic from "next/dynamic";

// 3D 竹简挥毫依赖 WebGL，仅在客户端渲染（关闭 SSR）
const Brush3DGame = dynamic(() => import("./Brush3DGame"), { ssr: false });

export default function Brush3DPage() {
  return <Brush3DGame />;
}

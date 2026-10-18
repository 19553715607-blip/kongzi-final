/** @type {import('next').NextConfig} */
const nextConfig = {
  // 让 docker 镜像可独立运行（不需要安装 node_modules）
  output: "standalone",
};

export default nextConfig;

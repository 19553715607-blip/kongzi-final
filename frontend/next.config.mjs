/** @type {import('next').NextConfig} */
const nextConfig = {
  // 让 docker 镜像可独立运行（不需要安装 node_modules）
  output: "standalone",
  // 同源反代：浏览器只连前端这一个端口，/api/* 由 Next 转发给后端。
  // 后端地址用 BACKEND_ORIGIN 指定（服务端变量，不进浏览器产物），
  // 故本机 / 局域网 / 公网隧道三种场景都只需暴露一个端口。
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;

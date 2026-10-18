// kiosk 路由：纯净全屏，无 nav 无 padding，给校园终端 / 大屏展示用。
// 用极高的 z-index 盖住根布局的 Nav + 底部 Tab，营造真正的全屏沉浸。
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#2C2C2A] text-white">
      {children}
    </div>
  );
}

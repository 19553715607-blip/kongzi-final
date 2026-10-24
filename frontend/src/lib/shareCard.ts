/**
 * 金句分享卡导出:纯前端 Canvas 绘制 1080×1920 竖版故事卡(Instagram Story
 * 适配),完成后自动下载 PNG。不依赖后端与任何第三方服务。
 * 视觉与站点一致:深靛蓝底(浅色主题为米纸底)、晨光金细框、衬线字。
 */

const W = 1080;
const H = 1920;

// 主题化配色(与 globals.css 令牌一致)
const PALETTE = {
  dark: {
    bg: "#0A0F1A",
    bgGlow: "rgba(216, 188, 126, 0.10)",
    frame: "#D8BC7E",
    frameDim: "rgba(216, 188, 126, 0.45)",
    fg: "#F5F1E6",
    muted: "rgba(245, 241, 230, 0.66)",
    faint: "rgba(245, 241, 230, 0.40)",
    sealFrom: "#C9A86A",
    sealTo: "#8A6D3B",
    sealText: "#10141F",
  },
  light: {
    bg: "#F8F4EB",
    bgGlow: "rgba(138, 109, 47, 0.08)",
    frame: "#8A6D2F",
    frameDim: "rgba(138, 109, 47, 0.45)",
    fg: "#26211A",
    muted: "rgba(38, 33, 26, 0.72)",
    faint: "rgba(38, 33, 26, 0.45)",
    sealFrom: "#C9A86A",
    sealTo: "#8A6D3B",
    sealText: "#FFFFFF",
  },
} as const;

/** 按字符宽度换行(CJK 与西文混排都按宽度截断) */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function exportQuoteCard(opts: {
  original: string;
  translation?: string;
  refLabel?: string;
  siteTitle: string;
  theme?: "dark" | "light";
  rtl?: boolean;
}): Promise<void> {
  const c = PALETTE[opts.theme === "light" ? "light" : "dark"];

  // 确保衬线字体已就绪(站点已加载 @fontsource 字重)
  try {
    await Promise.all([
      document.fonts.load('900 76px "Noto Serif SC"'),
      document.fonts.load('500 44px "EB Garamond"'),
      document.fonts.load('600 40px "Noto Serif SC"'),
    ]);
  } catch {
    /* 字体不可用则回落系统字体 */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  // 底色 + 顶部金晕
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.24, -H * 0.06, 80, W * 0.24, -H * 0.06, H * 0.5);
  glow.addColorStop(0, c.bgGlow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 双细金框
  ctx.strokeStyle = c.frame;
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.strokeStyle = c.frameDim;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(76, 76, W - 152, H - 152);

  // 顶部品牌:方印 + 站名
  const seal = 108;
  const sg = ctx.createLinearGradient(96, 96, 96 + seal, 96 + seal);
  sg.addColorStop(0, c.sealFrom);
  sg.addColorStop(1, c.sealTo);
  ctx.fillStyle = sg;
  ctx.fillRect(96, 96, seal, seal);
  ctx.fillStyle = c.sealText;
  ctx.font = '600 64px "Noto Serif SC", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("孔", 96 + seal / 2, 96 + seal / 2 + 4);
  ctx.textAlign = "left";
  ctx.font = '500 44px "EB Garamond", serif';
  ctx.fillStyle = c.frame;
  ctx.fillText(opts.siteTitle, 96 + seal + 36, 132);
  ctx.font = '500 30px "EB Garamond", serif';
  ctx.fillStyle = c.faint;
  ctx.fillText("INQUIRE & REFLECT", 96 + seal + 36, 178);

  // 原文:字号按长度自适应
  const orig = opts.original.trim();
  const size = orig.length <= 28 ? 92 : orig.length <= 56 ? 72 : 58;
  ctx.font = `900 ${size}px "Noto Serif SC", serif`;
  ctx.fillStyle = c.fg;
  const maxW = W - 96 * 2 - 80;
  const lines = wrap(ctx, orig, maxW).slice(0, 12);
  const lineH = Math.round(size * 1.62);
  const blockH = lines.length * lineH;
  let y = (H - blockH) / 2 - 60;
  for (const ln of lines) {
    ctx.fillText(ln, 136, y);
    y += lineH;
  }

  // 译文(斜体衬线,居中)
  if (opts.translation) {
    ctx.font = '500 44px "EB Garamond", serif';
    ctx.fillStyle = c.muted;
    const tl = wrap(ctx, opts.translation.trim(), maxW).slice(0, 6);
    let ty = y + 36;
    if (opts.rtl) ctx.direction = "rtl";
    for (const ln of tl) {
      ctx.fillText(ln, 136, ty);
      ty += 66;
    }
    if (opts.rtl) ctx.direction = "ltr";
  }

  // 底部:出处 + 金线 + 域名提示
  ctx.textAlign = "center";
  ctx.font = '600 40px "Noto Serif SC", serif';
  ctx.fillStyle = c.frame;
  ctx.fillText(opts.refLabel || "", W / 2, H - 300);
  const rule = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0);
  rule.addColorStop(0, "rgba(0,0,0,0)");
  rule.addColorStop(0.5, c.frame);
  rule.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rule;
  ctx.fillRect(W * 0.3, H - 252, W * 0.4, 2);
  ctx.font = '500 32px "EB Garamond", serif';
  ctx.fillStyle = c.faint;
  ctx.fillText(location.host || "kongzi", W / 2, H - 196);

  // 下载
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png", 0.95));
  if (!blob) throw new Error("toBlob failed");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kongzi-quote.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

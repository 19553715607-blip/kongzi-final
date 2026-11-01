// 把刷刷卡片用 Canvas 绘制成 9:16 壁纸图片（无外部依赖、无位图）。
// 宣纸立轴观感：纸底 + 双线框 + 朱砂印章 + 墨色原文 + 出处胶囊 + 署名行。
import type { FeedItem } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

export const WALL_W = 1080;
export const WALL_H = 1920;

// 主题色（与 globals.css 浅色 token 对齐；canvas 取不到 CSS 变量）
const PAPER = "#FBFAF7";
const INK = "#141414";
const MUTED = "#5A5750";
const FAINT = "#8A8781";
const ACCENT_DEEP = "#6E2A12";
const ACCENT_SOFT = "#FAECE7";
const GOLD = "#9E7A1C";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  const isCJK = /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  if (isCJK) {
    const NO_START = new Set("？?。！，、；：）】」』%…");
    let line = "";
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) {
        if (line && NO_START.has(ch)) {
          // 避头尾：标点不置于行首，挤入当前行后换行
          out.push(line + ch);
          line = "";
        } else {
          out.push(line);
          line = ch;
        }
      } else line += ch;
    }
    if (line) out.push(line);
  } else {
    for (const para of text.split("\n")) {
      let line = "";
      for (const w of para.split(/\s+/)) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = w;
        } else line += w;
      }
      if (line) out.push(line);
    }
  }
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.closePath();
}

export function renderCardImage(it: FeedItem, lang: Lang, brand: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = WALL_W;
  canvas.height = WALL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ── 纸底 ──
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WALL_W, WALL_H);
  // 底部极淡的暖调渐变（像纸的沉色），克制
  const warm = ctx.createLinearGradient(0, WALL_H * 0.55, 0, WALL_H);
  warm.addColorStop(0, "rgba(251,250,247,0)");
  warm.addColorStop(1, "rgba(153,60,29,0.05)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, WALL_H * 0.55, WALL_W, WALL_H * 0.45);

  // ── 双线框（立轴）──
  ctx.strokeStyle = "rgba(20,20,20,0.30)";
  ctx.lineWidth = 3;
  roundRect(ctx, 44, 44, WALL_W - 88, WALL_H - 88, 6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,20,20,0.12)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 62, 62, WALL_W - 124, WALL_H - 124, 4);
  ctx.stroke();

  // ── 朱砂印章（右上：圆角方 + 品牌首字）──
  const sealX = WALL_W - 176;
  const sealY = 108;
  const sealG = ctx.createLinearGradient(sealX, sealY, sealX + 96, sealY + 96);
  sealG.addColorStop(0, "#A8451F");
  sealG.addColorStop(1, "#7E2F13");
  ctx.fillStyle = sealG;
  roundRect(ctx, sealX, sealY, 96, 96, 14);
  ctx.fill();
  ctx.fillStyle = "#FAECE7";
  ctx.font = '700 46px "Songti SC","STSong","SimSun",Georgia,serif';
  ctx.textAlign = "center";
  ctx.fillText(brand.slice(0, 1), sealX + 48, sealY + 64);

  ctx.textAlign = "center";
  ctx.direction = lang === "ar" ? "rtl" : "ltr";

  // ── 品牌名 + 出处（顶部）──
  ctx.fillStyle = INK;
  ctx.font = '34px Georgia, "Songti SC", serif';
  ctx.fillText(brand, WALL_W / 2 - 40, 158);
  ctx.fillStyle = FAINT;
  ctx.font = '26px Georgia, serif';
  ctx.fillText("—  " + it.ref_label + "  —", WALL_W / 2 - 40, 214);

  // ── 原文大字（墨色）──
  ctx.fillStyle = INK;
  ctx.font = '600 76px "Songti SC","STSong","SimSun",Georgia,serif';
  const lines = wrapLines(ctx, it.original_text, WALL_W - 260);
  const lh = 118;
  let y = 760 - ((lines.length - 1) * lh) / 2;
  for (const ln of lines) {
    ctx.fillText(ln, WALL_W / 2, y);
    y += lh;
  }

  // ── 译文 ──
  if (it.translation) {
    ctx.fillStyle = MUTED;
    ctx.font = 'italic 38px Georgia, "Songti SC", serif';
    const tlines = wrapLines(ctx, it.translation, WALL_W - 300);
    y += 46;
    for (const ln of tlines) {
      ctx.fillText(ln, WALL_W / 2, y);
      y += 56;
    }
  }

  // ── 出处胶囊（朱砂边、纸底）──
  const pillW = Math.max(260, ctx.measureText(it.ref_label).width + 90);
  ctx.fillStyle = ACCENT_SOFT;
  roundRect(ctx, (WALL_W - pillW) / 2, y + 34, pillW, 64, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(153,60,29,0.45)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, (WALL_W - pillW) / 2, y + 34, pillW, 64, 32);
  ctx.stroke();
  ctx.fillStyle = ACCENT_DEEP;
  ctx.font = '30px Georgia, "Songti SC", serif';
  ctx.fillText(it.ref_label, WALL_W / 2, y + 78);

  // ── 底部署名 + 标签 ──
  ctx.textAlign = "start";
  ctx.direction = "ltr";
  const bx = 110;
  const by = WALL_H - 190;
  // 署名小金点（ persona 首字）
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(bx + 30, by, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1A1408";
  ctx.font = '26px "Songti SC", serif';
  ctx.textAlign = "center";
  ctx.fillText(it.persona.slice(0, 1), bx + 30, by + 9);
  ctx.textAlign = "start";
  ctx.fillStyle = INK;
  ctx.font = '30px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(it.persona, bx + 80, by + 2);
  ctx.fillStyle = FAINT;
  ctx.font = '26px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(it.tags.join("   "), bx + 80, by + 46);

  return canvas.toDataURL("image/png");
}

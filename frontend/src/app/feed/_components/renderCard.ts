// 把刷刷卡片用 Canvas 绘制成 9:16 壁纸图片（无外部依赖、无位图）。
// 复刻卡片观感：深底 + 朱砂/青绿光斑 + 原文大字 + 译文 + 出处 + 署名标签 + 品牌水印。
import type { FeedItem } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

export const WALL_W = 1080;
export const WALL_H = 1920;

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
        } else line = test;
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
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function renderCardImage(it: FeedItem, lang: Lang, brand: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = WALL_W;
  canvas.height = WALL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 背景
  ctx.fillStyle = "#2C2C2A";
  ctx.fillRect(0, 0, WALL_W, WALL_H);
  blob(ctx, WALL_W + 40, -40, 460, "rgba(113,43,19,0.55)");
  blob(ctx, -60, WALL_H - 520, 420, "rgba(8,80,65,0.5)");

  ctx.textAlign = "center";
  ctx.direction = lang === "ar" ? "rtl" : "ltr";

  // 品牌水印（顶部，印章方块 + 名称）
  ctx.fillStyle = "rgba(245,240,230,0.7)";
  ctx.font = '34px Georgia, "Songti SC", serif';
  ctx.fillText(brand, WALL_W / 2, 170);
  ctx.fillStyle = "rgba(245,240,230,0.45)";
  ctx.font = '26px Georgia, serif';
  ctx.fillText("—  " + it.ref_label + "  —", WALL_W / 2, 226);

  // 原文大字
  ctx.fillStyle = "#F5F0E6";
  ctx.font = '600 76px "Songti SC","STSong","SimSun",Georgia,serif';
  const lines = wrapLines(ctx, it.original_text, WALL_W - 200);
  const lh = 118;
  let y = 720 - ((lines.length - 1) * lh) / 2;
  for (const ln of lines) {
    ctx.fillText(ln, WALL_W / 2, y);
    y += lh;
  }

  // 译文
  if (it.translation) {
    ctx.fillStyle = "#D3D1C7";
    ctx.font = 'italic 38px Georgia, "Songti SC", serif';
    const tlines = wrapLines(ctx, it.translation, WALL_W - 240);
    y += 40;
    for (const ln of tlines) {
      ctx.fillText(ln, WALL_W / 2, y);
      y += 56;
    }
  }

  // 出处胶囊
  const pillW = Math.max(260, ctx.measureText(it.ref_label).width + 90);
  ctx.fillStyle = "rgba(245,240,230,0.14)";
  roundRect(ctx, (WALL_W - pillW) / 2, y + 30, pillW, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#F5F0E6";
  ctx.font = '30px Georgia, "Songti SC", serif';
  ctx.fillText(it.ref_label, WALL_W / 2, y + 74);

  // 底部署名 + 标签
  ctx.textAlign = "start";
  ctx.direction = "ltr";
  const bx = 90;
  const by = WALL_H - 170;
  ctx.fillStyle = "#BA7517";
  ctx.beginPath();
  ctx.arc(bx + 30, by, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#412402";
  ctx.font = '26px "Songti SC", serif';
  ctx.textAlign = "center";
  ctx.fillText(it.persona.slice(0, 1), bx + 30, by + 9);
  ctx.textAlign = "start";
  ctx.fillStyle = "#F5F0E6";
  ctx.font = '30px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(it.persona, bx + 80, by + 2);
  ctx.fillStyle = "#FAC775";
  ctx.font = '26px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(it.tags.join("   "), bx + 80, by + 46);

  return canvas.toDataURL("image/png");
}

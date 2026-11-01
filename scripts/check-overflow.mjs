#!/usr/bin/env node
/**
 * 横向溢出校验（Overflow Check）
 *
 * 目的：让「切换语言后文字撑出容器」这类问题不会回潮。
 * 多语站点最容易出的不是错字，而是**排版**：同一句中文四五个字，法语/西语可能
 * 长出 1.5～2 倍，把定宽容器、不换行的按钮行、flex 行顶出视口。人工逐语种点开
 * 每个页面不现实，所以这里用真实浏览器量。
 *
 * 判定标准（只报「真问题」）：
 *   1. 元素右边界超出视口 > 1px；
 *   2. 且它不是横向滚动容器（overflow-x: auto/scroll/hidden/clip）的后代
 *      —— 滑轨里故意放到屏外的卡片不算溢出。
 *
 * 用法：
 *   node scripts/check-overflow.mjs                     # 默认 http://127.0.0.1:3000
 *   node scripts/check-overflow.mjs --base http://localhost:3000
 *   node scripts/check-overflow.mjs --widths 390,768    # 只跑指定宽度
 *   node scripts/check-overflow.mjs --pages /,/cases
 *
 * 前置：前端已启动（npm run dev / docker compose up），且安装了 playwright-core。
 * 浏览器：优先读环境变量 CHROME_PATH；否则用 Playwright 缓存里的 chromium；
 *        再退回系统 Chrome / Edge。
 *
 * 退出码：0 全部通过；1 存在溢出；2 环境不满足（服务未起 / 无浏览器 / 无依赖）
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = path.join(ROOT, "frontend");

const DEFAULT_PAGES = [
  "/",
  "/cases",
  "/read",
  "/journey",
  "/feed",
  "/paths",
  "/graph",
  "/chat",
  "/me",
  "/about",
  "/essays",
];
const DEFAULT_LANGS = ["zh", "en", "fr", "es", "ar"];
const DEFAULT_WIDTHS = [1440, 390];

// ── 参数 ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { base: "http://127.0.0.1:3000", pages: DEFAULT_PAGES, langs: DEFAULT_LANGS, widths: DEFAULT_WIDTHS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    if (a === "--base") out.base = val();
    else if (a === "--pages") out.pages = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--langs") out.langs = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--widths") out.widths = val().split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

// ── 依赖与浏览器 ────────────────────────────────────────────────────
function loadPlaywright() {
  const req = createRequire(path.join(FRONTEND, "package.json"));
  try {
    return req("playwright-core");
  } catch {
    console.error("✗ 缺少 playwright-core。在 frontend/ 下执行：npm i -D playwright-core");
    process.exit(2);
  }
}

function findBrowser() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;

  const cache = path.join(os.homedir(), "AppData/Local/ms-playwright");
  if (fs.existsSync(cache)) {
    const dirs = fs
      .readdirSync(cache)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .reverse();
    for (const d of dirs) {
      for (const rel of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"]) {
        const p = path.join(cache, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }

  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

// ── 页面内检测（在浏览器上下文执行）─────────────────────────────────
const SCAN = () => {
  const vw = document.documentElement.clientWidth;
  const insideScroller = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (["auto", "scroll", "hidden", "clip"].includes(cs.overflowX)) return true;
      p = p.parentElement;
    }
    return false;
  };
  const hits = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const over = Math.round(r.right - vw);
    if (over <= 1) return;
    if (insideScroller(el)) return;
    hits.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 70),
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28),
      over,
      w: Math.round(r.width),
    });
  });
  hits.sort((a, b) => b.over - a.over);
  return {
    vw,
    doc: document.documentElement.scrollWidth - vw,
    hits: hits.slice(0, 6),
  };
};

// ── 主流程 ──────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    return 0;
  }

  // 服务可达性
  try {
    const res = await fetch(args.base, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`✗ 无法访问 ${args.base}（${e.message}）`);
    console.error("  先启动前端：cd frontend && npm run dev");
    return 2;
  }

  const exe = findBrowser();
  if (!exe) {
    console.error("✗ 找不到 Chromium/Chrome。设置 CHROME_PATH，或 npx playwright install chromium");
    return 2;
  }
  console.log(`▷ 浏览器：${exe}`);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: exe, headless: true });

  let total = 0;
  let failed = 0;
  const failures = [];

  for (const width of args.widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
    const page = await ctx.newPage();

    // 先落在同源首页把语言写进 localStorage，之后逐页导航即可（localStorage 按 origin 生效，
    // 省掉每页 reload，也避免 about:blank 上访问 localStorage 触发 SecurityError）
    await page.goto(args.base, { waitUntil: "domcontentloaded" }).catch(() => {});

    for (const lang of args.langs) {
      await page
        .evaluate((l) => {
          try {
            localStorage.setItem("kongzi_lang", l);
          } catch {}
        }, lang)
        .catch(() => {});

      for (const p of args.pages) {
        total++;
        const ok = await page
          .goto(args.base + p, { waitUntil: "networkidle", timeout: 20000 })
          .then(() => true)
          .catch(() => false);
        if (!ok) {
          failed++;
          failures.push({ width, page: p, lang, doc: 0, hits: [], note: "页面加载失败" });
          continue;
        }
        await page.waitForTimeout(350);

        let r;
        try {
          r = await page.evaluate(SCAN);
        } catch (e) {
          failed++;
          failures.push({ width, page: p, lang, doc: 0, hits: [], note: `检测失败：${e.message}` });
          continue;
        }
        if (r.doc > 1 || r.hits.length > 0) {
          failed++;
          failures.push({ width, page: p, lang, doc: r.doc, hits: r.hits });
        }
      }
    }
    await ctx.close();
  }

  await browser.close();

  if (!failed) {
    console.log(`✓ ${total} 组（${args.pages.length} 页 × ${args.langs.length} 语 × ${args.widths.length} 宽）均无横向溢出`);
    return 0;
  }

  console.log(`\n✗ ${failed}/${total} 组存在横向溢出：\n`);
  for (const f of failures) {
    console.log(`  ${f.width}px  ${f.page}  [${f.lang}]  页面溢出 ${f.doc}px${f.note ? `  ${f.note}` : ""}`);
    for (const h of f.hits) {
      console.log(`      +${h.over}px  <${h.tag}> ${h.w}px  "${h.text}"  .${h.cls}`);
    }
  }
  console.log("\n提示：定宽容器补 min-w-0 / 允许 flex-wrap / 长语种改紧凑控件。");
  return 1;
}

main().then((code) => process.exit(code));

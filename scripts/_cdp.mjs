// scripts/_cdp.mjs — 六艺 CDP 回归脚本的跨平台公共层
//
// 统一处理四件在 Windows / macOS 上写法不同的事：
//   ① 浏览器可执行文件位置（Chrome 优先，Edge 兜底）
//   ② 临时目录（macOS 的 /tmp 在 Windows 上并不存在）
//   ③ 进程清理（macOS 用 pkill，Windows 用 taskkill / PowerShell）
//   ④ 拉起前端 dev server（Windows 上 npm 必须经 shell 解析到 npm.cmd）
//
// 环境变量覆盖：
//   KONGZI_CHROME   浏览器可执行文件绝对路径
//   KONGZI_PORT     前端端口，默认 3000（与后端 CORS 白名单一致）
//   KONGZI_ORIGIN   前端完整 origin，默认 http://localhost:<KONGZI_PORT>
//   KONGZI_API      后端地址，默认 http://localhost:8000
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const IS_WIN = process.platform === "win32";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(SCRIPTS_DIR, "..");
export const FRONTEND_DIR = join(REPO_ROOT, "frontend");

const PF = process.env.ProgramFiles || process.env.PROGRAMFILES || "C:\\Program Files";
const PF86 = process.env["ProgramFiles(x86)"] || process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
const LOCAL = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "C:\\Users\\Default", "AppData", "Local");

const CANDIDATES = IS_WIN
  ? [
      join(PF, "Google", "Chrome", "Application", "chrome.exe"),
      join(PF86, "Google", "Chrome", "Application", "chrome.exe"),
      join(LOCAL, "Google", "Chrome", "Application", "chrome.exe"),
      join(PF86, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(PF, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]
  : [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ];

function pickBrowser() {
  const override = process.env.KONGZI_CHROME;
  if (override) {
    if (!existsSync(override)) throw new Error(`KONGZI_CHROME 指向的文件不存在：${override}`);
    return override;
  }
  const hit = CANDIDATES.find((p) => existsSync(p));
  if (!hit) throw new Error("未找到 Chrome 或 Edge。请安装其一，或用 KONGZI_CHROME=<可执行文件绝对路径> 指定。");
  return hit;
}

export const CHROME = pickBrowser();
export const FRONT_PORT = Number(process.env.KONGZI_PORT ?? 3000);
export const FRONT_ORIGIN = process.env.KONGZI_ORIGIN ?? `http://localhost:${FRONT_PORT}`;
export const API_ORIGIN = process.env.KONGZI_API ?? "http://localhost:8000";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function profileDir(name) {
  return join(tmpdir(), `kongzi-cdp-${name}`);
}

export function outFile(name) {
  return join(tmpdir(), name);
}

export function launchChrome({ port, profile, url = "about:blank", windowSize = "1000,750" }) {
  return spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--enable-unsafe-swiftshader",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-allow-origins=*",
      `--remote-debugging-port=${port}`,
      `--window-size=${windowSize}`,
      `--user-data-dir=${profileDir(profile)}`,
      url,
    ],
    { stdio: "ignore" },
  );
}

export function killTree(proc) {
  if (!proc || proc.pid === undefined || proc.exitCode !== null) return;
  try {
    if (IS_WIN) execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: "ignore" });
    else proc.kill("SIGKILL");
  } catch {}
}

export function killByCmdline(substring) {
  try {
    if (IS_WIN) {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${substring}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" },
      );
    } else {
      execSync(`pkill -f '${substring}'`, { stdio: "ignore" });
    }
  } catch {}
}

export async function isUp(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

export function npmSpawn(args, opts = {}) {
  return IS_WIN ? spawn("npm", args, { ...opts, shell: true }) : spawn("npm", args, opts);
}

export async function ensureDevServer({ port = FRONT_PORT, timeoutMs = 60000 } = {}) {
  if (await isUp(`http://localhost:${port}/`)) return null;
  console.log(`前端未运行，启动 npm run dev -- -p ${port} …`);
  const proc = npmSpawn(["run", "dev", "--", "-p", String(port)], { cwd: FRONTEND_DIR, stdio: "ignore" });
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await sleep(1000);
    if (await isUp(`http://localhost:${port}/`)) break;
  }
  return proc;
}

export function stopDevServer(proc) {
  killTree(proc);
}

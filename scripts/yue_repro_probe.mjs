// 乐艺 — 复现"再奏一曲后开局乱晃"：击钟 → 验收 → 再奏一曲 → 连拍 4 帧
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9379;
const FRONT = "http://localhost:7100/journey/yue";
const API = "http://localhost:8000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
await sleep(800);

const guest = await (await fetch(`${API}/api/v1/auth/guest`, { method: "POST" })).json();
const TOKEN = guest.token;

let devProc = null;
async function frontUp() {
  try { await fetch("http://localhost:7100/", { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}
if (!(await frontUp())) {
  devProc = spawn("npm", ["run", "dev", "--", "-p", "7100"], {
    cwd: new URL("../frontend", import.meta.url).pathname, stdio: "ignore",
  });
  for (let i = 0; i < 60 && !(await frontUp()); i++) await sleep(1000);
}

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1280,800",
  "--user-data-dir=/tmp/yue_repro_profile", "about:blank",
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}
async function clickButton(text) {
  const btn = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes(${JSON.stringify(text)}));
    if (!b) return null; b.scrollIntoView({block:"center"});
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  if (!btn) return false;
  const { x, y } = JSON.parse(btn);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await sleep(80);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  return true;
}
async function waitFor(expr, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJs(expr)) return true;
    await sleep(700);
  }
  console.log("  [等待超时]", label);
  return false;
}
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(name, Buffer.from(r.data, "base64"));
}

await sleep(2500);
const targets = await (await fetch(`http://localhost:${PORT}/json`)).json();
const page = targets.find((t) => t.type === "page");
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
await send("Runtime.enable");
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `localStorage.setItem("kongzi_token", ${JSON.stringify(TOKEN)});`,
});
await send("Page.navigate", { url: FRONT });

await waitFor(`[...document.querySelectorAll("button")].some(b => b.innerText.includes("闲居抚琴"))`, 90000, "关卡卡条");
await clickButton("闲居抚琴");
await waitFor(`!!window.__yue`, 30000, "调试钩子");
await sleep(2000);

// 击 5 个音 + 验收（让 bellT 写到几秒后）
for (const n of ["gong", "zhi", "shang", "yu", "jue"]) {
  await evalJs(`window.__yue.strike("${n}")`);
  await sleep(700);
}
await sleep(4000); // 让时钟走到 ~10s，摆停
await evalJs(`window.__yue.submit()`);
await waitFor(`document.body.innerText.includes("再奏一曲")`, 30000, "结算卡");
await clickButton("再奏一曲");
console.log("已点再奏一曲，连拍 4 帧…");
for (let i = 0; i < 4; i++) {
  await sleep(900);
  await shot(`/tmp/yue_repro_${i}.png`);
  console.log(`帧 ${i} 已拍`);
}

chrome.kill();
if (devProc) devProc.kill();
try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
try { execSync("pkill -f 'next dev.*7100'"); } catch {}
process.exit(0);

// 书艺·竹简挥毫 — 截屏：选第 1 张字卡 → 真实鼠标拖一笔（验证 raycast 书写链路）
//  → paintGuide(2) 补两笔墨 → 截图（书案/宣纸/砚台/烛灯/毛笔入镜）
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9382;
const FRONT = "http://localhost:7100/journey/shu/brush3d";
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
  "--user-data-dir=/tmp/shu3d_shot_profile", "about:blank",
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

await waitFor(`[...document.querySelectorAll("button")].filter(b => b.innerText.includes("部件")).length >= 1`, 90000, "字卡卡条");
await clickButton("部件");
await waitFor(`document.body.innerText.includes("交卷") && !!window.__shu3d`, 30000, "书案 HUD");
await sleep(7000); // 等场景编译/首帧/引导卡消失

// 真实鼠标拖一笔（纸面中央区域），验证 raycast 书写链路
const drag = async (x0, y0, x1, y1, steps = 12) => {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: x0 + ((x1 - x0) * i) / steps,
      y: y0 + ((y1 - y0) * i) / steps,
      button: "left", buttons: 1,
    });
    await sleep(90);
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x1, y: y1, button: "left", buttons: 0, clickCount: 1 });
};
await drag(540, 430, 700, 520);
await sleep(600);
console.log("鼠标拖拽后段数:", await evalJs(`window.__shu3d ? window.__shu3d.state().strokes : -1`));

// 补两笔底稿墨（显示墨迹层次）
await evalJs(`window.__shu3d && window.__shu3d.paintGuide(2)`);
await sleep(1200);

const r = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("/tmp/shu_brush.png", Buffer.from(r.data, "base64"));
console.log("截图完成 /tmp/shu_brush.png");

chrome.kill();
if (devProc) devProc.kill();
try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
try { execSync("pkill -f 'next dev.*7100'"); } catch {}
process.exit(0);

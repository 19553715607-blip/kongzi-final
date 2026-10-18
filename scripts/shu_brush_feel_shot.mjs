// 书艺·竹简挥毫 手感升级验证 — 截屏：选第 1 张字卡 → 三条对比笔画：
//   (a) 慢拖长横（应粗而浓、圆尾顿收）
//   (b) 快拖长撇（应细而枯、可见飞白、尖锋出笔）
//   (c) 慢→快→慢折（应粗→细→粗渐变，无突变）
// 截 1280×800 大图供人工核对笔触差异
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9383;
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
  "--user-data-dir=/tmp/shu3d_feel_profile", "about:blank",
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) console.log("  [eval 异常]", r.exceptionDetails.text, r.exceptionDetails.exception?.description ?? "");
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

// 沿路径拖一笔：points=[{x,y}], stepDelay=每步间隔 ms（小=快=提笔，大=慢=按笔）
// midShot：在第 midShot.at 步时（仍按住）截一张图存 midShot.path（验证 3D 毛笔按压姿态）
async function stroke(points, stepDelay, midShot) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: points[0].x, y: points[0].y, button: "left", buttons: 1, clickCount: 1 });
  await sleep(stepDelay);
  for (let i = 1; i < points.length; i++) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: points[i].x, y: points[i].y, button: "left", buttons: 1 });
    await sleep(stepDelay);
    if (midShot && i === midShot.at) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(midShot.path, Buffer.from(r.data, "base64"));
    }
  }
  const last = points[points.length - 1];
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: last.x, y: last.y, button: "left", buttons: 0, clickCount: 1 });
}
const line = (x0, y0, x1, y1, n) =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));

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

// (a) 慢拖长横：24 步 × 130ms ≈ 230 px/s（死区内=全按）→ 应粗而浓
//     第 16 步（仍按住重按）截一张，验证 3D 毛笔下压/笔头压扁
await stroke(line(545, 430, 740, 432, 24), 130, { at: 16, path: "/tmp/shu_brush_press.png" });
await sleep(400);
console.log("(a) 慢横后段数:", await evalJs(`window.__shu3d.state().strokes`));

// (b) 快拖长撇：4 步 × 15ms ≈ 12000 px/s（饱和=全提）→ 应细而枯、飞白、尖锋
await stroke(line(720, 415, 560, 505, 4), 15);
await sleep(400);
console.log("(b) 快撇后段数:", await evalJs(`window.__shu3d.state().strokes`));

// (c) 慢→快→慢折（一笔完成，分段延时）：粗 → 细 → 粗渐变，慢收=圆尾
async function strokePhases(phases) {
  const first = phases[0].pts[0];
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: first.x, y: first.y, button: "left", buttons: 1, clickCount: 1 });
  for (const ph of phases) {
    for (const p of ph.pts) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y, button: "left", buttons: 1 });
      await sleep(ph.delay);
    }
  }
  const lastPts = phases[phases.length - 1].pts;
  const last = lastPts[lastPts.length - 1];
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: last.x, y: last.y, button: "left", buttons: 0, clickCount: 1 });
}
await strokePhases([
  { pts: line(560, 455, 680, 455, 12), delay: 120 },          // 慢横（按）
  { pts: line(680, 455, 702, 505, 6).slice(1), delay: 15 },   // 快折（提，6 个采样让惯性落到飞白区）
  { pts: line(702, 505, 708, 521, 8).slice(1), delay: 110 },  // 慢收（按）
]);
console.log("(c) 折笔后段数:", await evalJs(`window.__shu3d.state().strokes`));
await sleep(600);

const r = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("/tmp/shu_brush_feel.png", Buffer.from(r.data, "base64"));
console.log("截图完成 /tmp/shu_brush_feel.png");

chrome.kill();
if (devProc) devProc.kill();
try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
try { execSync("pkill -f 'next dev.*7100'"); } catch {}
process.exit(0);

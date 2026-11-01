// 射·观德 — CDP 相机跟随截图：拉弓中瞄中心 vs 瞄右侧，对比视角偏转
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9338;
const URL = process.env.SHE_URL ?? "http://localhost:7100/journey/she";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile6", URL,
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
const consoleMsgs = [];
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
const mouse = (type, x, y, buttons = 0) =>
  send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1 });
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(name, Buffer.from(r.data, "base64"));
}

async function main() {
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page" && t.url.includes("/journey/she"));
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error("找不到页面");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleMsgs.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    }
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await sleep(5000);

  // A：瞄中心拉弓（保持按住截图）
  await mouse("mousePressed", 500, 465, 1);
  await sleep(1300);
  await shot("/tmp/she_cam_center.png");
  await mouse("mouseReleased", 500, 465, 0);
  await sleep(2500);

  // B：按住后拖向右侧（保持按住截图）
  await mouse("mousePressed", 500, 465, 1);
  await sleep(300);
  await mouse("mouseMoved", 850, 465, 1);
  await sleep(1100);
  await shot("/tmp/she_cam_right.png");
  await mouse("mouseReleased", 850, 465, 0);
  await sleep(2000);

  console.log("console 错误:", consoleMsgs.length ? "\n" + consoleMsgs.join("\n") : "（无）");
  console.log("截图完成: /tmp/she_cam_center.png /tmp/she_cam_right.png");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

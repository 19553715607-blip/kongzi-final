// 射·观德 3D — CDP 交互冒烟测试：按住 1.3s → 松开 → 截屏验证中靶流程
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const URL = "http://localhost:7100/journey/she";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile",
  URL,
], { stdio: "ignore" });

let ws;
let msgId = 0;
const pending = new Map();
const consoleMsgs = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  // 等待 DevTools 端口就绪
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page" && t.url.includes("/journey/she"));
      if (target) break;
    } catch { /* retry */ }
  }
  if (!target) throw new Error("找不到页面 target");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id).resolve(m.result);
      pending.delete(m.id);
    } else if (m.method === "Runtime.consoleAPICalled") {
      const lvl = m.params.type;
      if (lvl === "error" || lvl === "warning") {
        consoleMsgs.push(`[${lvl}] ` + m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
      }
    } else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  };

  await send("Runtime.enable");
  await send("Page.enable");

  // 等页面 + R3F 场景起来
  await sleep(5000);
  const hasCanvas = await send("Runtime.evaluate", {
    expression: `!!document.querySelector("canvas")`,
    returnByValue: true,
  });
  console.log("canvas 存在:", hasCanvas.result.value);

  // 按住 1.3 秒（拉弓）→ 截图（拉弓态）
  const x = 500, y = 450;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await sleep(1300);
  let shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/she3d_draw.png", Buffer.from(shot.data, "base64"));

  // 松开放箭 → 等飞行+落靶 → 截图（mark 态）
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(400);
  shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/she3d_fly.png", Buffer.from(shot.data, "base64"));
  await sleep(1400);
  shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/she3d_mark.png", Buffer.from(shot.data, "base64"));

  console.log("console 错误/警告:");
  console.log(consoleMsgs.length ? consoleMsgs.slice(0, 15).join("\n") : "（无）");
}

main()
  .catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

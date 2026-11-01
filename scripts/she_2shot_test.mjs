// 射·观德 — CDP 连射两箭测试：验证 advance → 第二次拉弓是否可用
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;
const URL = process.env.SHE_URL ?? "http://localhost:7100/journey/she";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile2", URL,
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
async function status() {
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const bar = [...document.querySelectorAll("section div")].find(d => d.className.includes("bottom-3"));
      const pill = bar ? bar.innerText.trim() : "(无状态条)";
      const dots = [...document.querySelectorAll("section span span")].filter(s => s.className.includes("rounded-full") && s.className.includes("h-2")).length;
      const reflect = document.body.innerText.includes("为什么没中");
      const zhupi = document.body.innerText.includes("克己 · 收弓");
      return JSON.stringify({ pill, reflect, zhupi });
    })()`,
    returnByValue: true,
  });
  return r.result.value;
}
async function shoot(holdMs, tag) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 500, y: 450, button: "left", buttons: 1, clickCount: 1 });
  await sleep(holdMs);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 500, y: 450, button: "left", buttons: 0, clickCount: 1 });
  console.log(`[${tag}] 已松开，状态:`, await status());
  await sleep(2500);
  console.log(`[${tag}] 2.5s 后状态:`, await status());
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
  if (!target) throw new Error("找不到页面 target");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
    else if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
      consoleMsgs.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    } else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await sleep(5000);
  console.log("初始:", await status());

  await shoot(1200, "第1箭");
  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/she_2shot_1.png", Buffer.from(shot1.data, "base64"));

  await shoot(1100, "第2箭");
  const shot2 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/she_2shot_2.png", Buffer.from(shot2.data, "base64"));

  console.log("console 错误/警告:", consoleMsgs.length ? "\n" + consoleMsgs.slice(0, 10).join("\n") : "（无）");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

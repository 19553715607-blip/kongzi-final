// 射·观德 — CDP 脱靶反省流程测试：短按脱靶 → 反省卡 → 点击按钮 → 恢复可射
import { spawn } from "node:child_process";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9335;
const URL = process.env.SHE_URL ?? "http://localhost:7100/journey/she";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile3", URL,
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
const consoleMsgs = [];
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true });
  return r.result?.value;
}
const status = () => evalJs(`(() => {
  const bar = [...document.querySelectorAll("section div")].find(d => d.className.includes("bottom-3"));
  return JSON.stringify({
    pill: bar ? bar.innerText.trim() : "(无)",
    reflect: document.body.innerText.includes("为什么没中"),
  });
})()`);

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
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleMsgs.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    } else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  };
  await send("Runtime.enable");
  await sleep(5000);
  console.log("初始:", await status());

  // 极短按（150ms）→ 力度不足脱靶
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 500, y: 450, button: "left", buttons: 1, clickCount: 1 });
  await sleep(150);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 500, y: 450, button: "left", buttons: 0, clickCount: 1 });
  await sleep(2000);
  const st1 = await status();
  console.log("短按后:", st1);
  if (!JSON.parse(st1).reflect) { console.log("⚠ 未出现反省卡（可能意外命中），直接测下一箭"); }

  // 点击反省卡第一个选项按钮
  const btn = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes("心未静"));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  if (btn) {
    const { x, y } = JSON.parse(btn);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(60);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
    console.log("已点击反省按钮");
  } else {
    console.log("⚠ 找不到反省按钮");
  }
  await sleep(1500);
  console.log("点按钮后:", await status());

  // 再射一箭（正常按住 1.2s）
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 500, y: 450, button: "left", buttons: 1, clickCount: 1 });
  await sleep(1200);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 500, y: 450, button: "left", buttons: 0, clickCount: 1 });
  await sleep(2500);
  console.log("第二箭后:", await status());

  console.log("console 错误:", consoleMsgs.length ? "\n" + consoleMsgs.join("\n") : "（无）");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

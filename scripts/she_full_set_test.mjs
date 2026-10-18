// 射·观德 — CDP 五箭全局测试：射满五矢 → 小结卡 → 点「再来一局」→ 恢复可射
// 核心验证：卡片按钮在 setPointerCapture 修复后可点击
import { spawn } from "node:child_process";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9336;
const URL = process.env.SHE_URL ?? "http://localhost:7100/journey/she";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile4", URL,
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
  const sum = document.body.innerText.match(/五矢小结/);
  const score = document.body.innerText.match(/本局[\\s\\S]{0,80}?(\\d+) 环/);
  return JSON.stringify({
    pill: bar ? bar.innerText.trim() : "(无)",
    summary: !!sum,
    reflect: document.body.innerText.includes("为什么没中"),
    zhupi: document.body.innerText.includes("克己 · 收弓"),
  });
})()`);
async function clickButton(text) {
  const btn = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes(${JSON.stringify(text)}));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  if (!btn) return false;
  const { x, y } = JSON.parse(btn);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await sleep(60);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  return true;
}
async function shoot(holdMs) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 500, y: 450, button: "left", buttons: 1, clickCount: 1 });
  await sleep(holdMs);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 500, y: 450, button: "left", buttons: 0, clickCount: 1 });
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
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleMsgs.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    } else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  };
  await send("Runtime.enable");
  await sleep(5000);
  console.log("初始:", await status());

  for (let i = 1; i <= 5; i++) {
    await shoot(1100);
    await sleep(2200);
    let st = JSON.parse(await status());
    // 若弹出反省卡（脱靶）或克己卡，点击对应按钮
    if (st.reflect) { console.log(`第${i}箭脱靶 → 点反省`); await clickButton("心未静"); await sleep(1200); st = JSON.parse(await status()); }
    else if (st.zhupi) { console.log(`第${i}箭遇主皮警告 → 继续求中`); await clickButton("继续求中"); await sleep(1200); st = JSON.parse(await status()); }
    console.log(`第${i}箭后:`, JSON.stringify(st));
  }

  const fin = JSON.parse(await status());
  console.log("五箭后:", JSON.stringify(fin));
  if (!fin.summary) { console.log("✗ 未进入五矢小结"); process.exitCode = 1; return; }

  const clicked = await clickButton("再来一局");
  console.log("点击「再来一局」:", clicked ? "成功找到按钮" : "✗ 按钮不存在");
  await sleep(1500);
  const after = JSON.parse(await status());
  console.log("点击后状态:", JSON.stringify(after));

  // 修复判定：点击后回到 ready（可再次拉弓）
  if (after.pill.includes("拉弓") && !after.summary) console.log("✓ 修复生效：按钮可点击，已恢复可射");
  else { console.log("✗ 仍卡住——按钮点击未生效"); process.exitCode = 1; }

  // 再射一箭确认真的能继续
  await shoot(1100);
  await sleep(2200);
  console.log("再来一局后第一箭:", await status());
  console.log("console 错误:", consoleMsgs.length ? "\n" + consoleMsgs.join("\n") : "（无）");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

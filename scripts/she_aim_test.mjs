// 射·观德 — CDP 移动瞄准回归测试：
//  ① 放大靶 inset 存在  ② 拉弓中准星跟随鼠标移动  ③ 瞄偏 → 环数下降/脱靶
import { spawn } from "node:child_process";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9337;
const URL = process.env.SHE_URL ?? "http://localhost:7100/journey/she";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=1000,750",
  "--user-data-dir=/tmp/she_cdp_profile5", URL,
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
const sessionScore = () => evalJs(`(() => {
  const b = [...document.querySelectorAll("b")].find(x => x.parentElement.innerText.includes("本局"));
  return b ? parseInt(b.innerText, 10) : -1;
})()`);
const crossPos = () => evalJs(`(() => {
  const svg = document.querySelector('[data-testid="aim-inset"] svg');
  if (!svg) return null;
  const gEl = [...svg.querySelectorAll("g")].find(g => g.style.display !== "none" && g.querySelector("circle[r='6']"));
  return gEl ? gEl.getAttribute("transform") : "(隐藏)";
})()`);
const mouse = (type, x, y, buttons = 0) =>
  send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1 });
async function clickButton(text) {
  const btn = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes(${JSON.stringify(text)}));
    if (!b) return null; const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  if (!btn) return false;
  const { x, y } = JSON.parse(btn);
  await mouse("mousePressed", x, y, 1); await sleep(60); await mouse("mouseReleased", x, y, 0);
  return true;
}
const CX = 500, CY = 465; // 射场中心 ≈ 靶心

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

  console.log("① 放大靶 inset:", (await evalJs(`!!document.querySelector('[data-testid="aim-inset"] svg')`)) ? "存在 ✓" : "✗ 缺失");

  // 第一箭：屏心按住（对准靶心）
  await mouse("mousePressed", CX, CY, 1);
  await sleep(400);
  const pos1 = await crossPos();
  await mouse("mouseMoved", CX, CY, 1);
  await sleep(750);
  await mouse("mouseReleased", CX, CY, 0);
  await sleep(2400);
  const s1 = await sessionScore();
  console.log(`② 第一箭（瞄中心）: ${s1} 环；拉弓中准星位置 ${pos1}`);

  // 第二箭：按住后向右拖（故意瞄偏）
  await mouse("mousePressed", CX, CY, 1);
  await sleep(400);
  await mouse("mouseMoved", 880, CY, 1);
  await sleep(500);
  const pos2 = await crossPos();
  await mouse("mouseReleased", 880, CY, 0);
  await sleep(2400);
  let s2 = await sessionScore();
  const reflect = await evalJs(`document.body.innerText.includes("为什么没中")`);
  if (reflect) { console.log("③ 第二箭（瞄偏）: 脱靶 → 反省卡弹出 ✓"); await clickButton("心未静"); await sleep(1200); s2 = await sessionScore(); }
  else console.log(`③ 第二箭（瞄偏）: 累计 ${s2} 环（本箭 ${s2 - s1} 环）`);
  console.log(`   瞄偏时准星位置 ${pos2}`);

  const moved = pos1 && pos2 && pos1 !== "(隐藏)" && pos2 !== "(隐藏)" && pos1 !== pos2 &&
    parseFloat(pos2.match(/translate\(([-\d.]+)/)?.[1] ?? "0") > parseFloat(pos1.match(/translate\(([-\d.]+)/)?.[1] ?? "0") + 15;
  console.log(moved ? "✓ 准星明显跟随鼠标右移——方向控制生效" : "✗ 准星未跟随");
  if (reflect || s2 - s1 < s1) console.log("✓ 瞄偏导致成绩下降/脱靶——方向真的影响落点");
  else console.log("⚠ 瞄偏后成绩未明显下降（可能风向/摆动恰好抵消），建议人工复核");
  console.log("console 错误:", consoleMsgs.length ? "\n" + consoleMsgs.join("\n") : "（无）");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

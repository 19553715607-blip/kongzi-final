// 快速取景检查：选第一张卡 → 加速到 ~8 m/s → 截图
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9341;
const URL = process.env.YU_URL ?? "http://localhost:7100/journey/yu";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=700,460",
  "--user-data-dir=/tmp/yu_frame_profile", URL,
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true });
  return r.result?.value;
}

async function main() {
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page" && t.url.includes("/journey/yu"));
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error("找不到页面");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  await send("Page.enable");
  await sleep(6000);

  const cardName = process.env.YU_CARD;
  const card = await evalJs(`(() => {
    const want = ${JSON.stringify(cardName ?? "")};
    const bs = [...document.querySelectorAll("button")].filter(x => x.innerText.includes("m/s"));
    const b = want ? bs.find(x => x.innerText.includes(want)) : bs[0];
    if (!b) return null; b.scrollIntoView({block:"center"});
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  if (!card) throw new Error("无场景卡");
  const { x, y } = JSON.parse(card);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await sleep(60);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(2500);

  // 巡航到 ~8 m/s 保持（CRUISE=0 则一直扬鞭冲高速，用于快速到达弯道）
  const cruise = process.env.CRUISE !== "0";
  const offRut = process.env.OFFRUT === "1"; // 中途右打出辙，验证颠簸
  let holding = false;
  let shots = 0;
  if (!cruise) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", code: "ArrowUp", key: "ArrowUp" });
    holding = true;
  }
  for (let i = 0; i < 160; i++) {
    const v = await evalJs(`(() => {
      const el = [...document.querySelectorAll("span")].find(s => s.nextSibling?.textContent?.includes("m/s"));
      return el ? parseFloat(el.textContent) : -1;
    })()`);
    if (cruise && v >= 0) {
      if (v < 7.8 && !holding) { await send("Input.dispatchKeyEvent", { type: "keyDown", code: "ArrowUp", key: "ArrowUp" }); holding = true; }
      else if (v > 8.4 && holding) { await send("Input.dispatchKeyEvent", { type: "keyUp", code: "ArrowUp", key: "ArrowUp" }); holding = false; }
    }
    if (offRut && i === 24) await send("Input.dispatchKeyEvent", { type: "keyDown", code: "ArrowRight", key: "ArrowRight" });
    if (offRut && i === 34) await send("Input.dispatchKeyEvent", { type: "keyUp", code: "ArrowRight", key: "ArrowRight" });
    const every = cruise ? 50 : 40;
    if (i > 0 && i % every === 0 && shots < 4) {
      shots++;
      const r = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(shots === 1 ? "/tmp/yu_frame.png" : `/tmp/yu_curve_${shots}.png`, Buffer.from(r.data, "base64"));
      console.log(`已截图 ${shots}, 速度`, v);
    }
    await sleep(250);
  }
  if (holding) await send("Input.dispatchKeyEvent", { type: "keyUp", code: "ArrowUp", key: "ArrowUp" });
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

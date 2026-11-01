// 御艺·五御 — CDP 全程驾驶测试：
//  选「鸣和鸾」→ 按速度表自动巡航（~8 m/s）→ 冲线 → 结算卡
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9339;
const URL = process.env.YU_URL ?? "http://localhost:7100/journey/yu";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=700,460",
  "--user-data-dir=/tmp/yu_cdp_profile", URL,
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
  await sleep(60);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  return true;
}
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(name, Buffer.from(r.data, "base64"));
}
const readSpeed = () => evalJs(`(() => {
  const el = [...document.querySelectorAll("span")].find(s => s.nextSibling?.textContent?.includes("m/s"));
  return el ? parseFloat(el.textContent) : -1;
})()`);
const pageState = () => evalJs(`(() => {
  const t = document.body.innerText;
  return JSON.stringify({
    scored: t.includes("再驭一次"),
    submitting: t.includes("评判中"),
    driving: t.includes("扬鞭"),
  });
})()`);
async function key(code, down) {
  await send("Input.dispatchKeyEvent", { type: down ? "keyDown" : "keyUp", code, key: code });
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
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleMsgs.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    } else if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push("[exception] " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
    }
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await sleep(10000);

  const cards = await evalJs(`[...document.querySelectorAll("button")].filter(b => b.innerText.includes("m/s")).length`);
  console.log("① 场景卡数量:", cards);
  if (!cards) {
    const dump = await evalJs(`document.body.innerText.slice(0,300)`);
    console.log("页面内容:", dump);
    console.log("console:", consoleMsgs.slice(0,6).join("\n") || "（无）");
    throw new Error("场景卡未加载（登录失败？）");
  }

  // /today 返回「当前用户未玩过的前 3 关」，玩过后会换卡 → 点第一张场景卡
  const firstCardName = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes("m/s"));
    return b ? b.innerText.split("\\n")[0] : null;
  })()`);
  const picked = await evalJs(`(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.innerText.includes("m/s"));
    if (!b) return false; b.scrollIntoView({block:"center"});
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  })()`);
  let okCard = false;
  if (picked) {
    const { x, y } = JSON.parse(picked);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(60);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
    okCard = true;
  }
  console.log(`② 选关「${firstCardName}」:`, okCard ? "✓" : "✗");
  if (!okCard) { chrome.kill("SIGKILL"); process.exit(1); }
  await sleep(2500);
  await shot("/tmp/yu_3d_start.png");

  // 自动巡航：目标 8 m/s（MEET=1 时在 40%~52% 进度靠右，验证会车礼让）
  const meetMode = process.env.MEET === "1";
  let holding = false;
  let holdingRight = false;
  let bowed = false;
  let shotMid = false;
  let shotMeet = false;
  let lastLog = 0;
  const t0 = Date.now();
  let finalState = null;
  const readPct = () => evalJs(`(() => { const d = [...document.querySelectorAll("div")].find(x => x.textContent === "🐎"); return d ? parseFloat(d.style.left) : -1; })()`);
  while (Date.now() - t0 < 260000) {
    const st = JSON.parse(await pageState());
    if (st.scored) { finalState = st; break; }
    const v = await readSpeed();
    if (v >= 0) {
      if (v < 7.6 && !holding) { await key("ArrowUp", true); holding = true; }
      else if (v > 8.4 && holding) { await key("ArrowUp", false); holding = false; }
    }
    const pct = await readPct();
    if (meetMode) {
      if (pct > 40 && pct < 52 && !holdingRight) { await key("ArrowRight", true); holdingRight = true; console.log("   → 靠右让车（进度", pct, "）"); }
      if ((pct >= 52 || (pct > 0 && pct <= 40)) && holdingRight) { await key("ArrowRight", false); holdingRight = false; }
      if (!bowed && pct > 45 && pct < 51) {
        bowed = true;
        await send("Input.dispatchKeyEvent", { type: "keyDown", code: "Space", key: " " });
        await sleep(80);
        await send("Input.dispatchKeyEvent", { type: "keyUp", code: "Space", key: " " });
        console.log("   → 按礼相揖（进度", pct, "）");
      }
      if (!shotMeet && pct > 45 && pct < 52) { await shot("/tmp/yu_meet.png"); shotMeet = true; console.log("   ③ 会车截图（进度", pct, "）"); }
    }
    if (!shotMid && Date.now() - t0 > 20000) { await shot("/tmp/yu_3d_mid.png"); shotMid = true; console.log("③ 中途截图（速度", v, "）"); }
    if (Date.now() - lastLog > 10000) {
      lastLog = Date.now();
      console.log("   …进度", pct, "速度", v);
    }
    await sleep(280);
  }
  if (holding) await key("ArrowUp", false);
  if (holdingRight) await key("ArrowRight", false);
  await sleep(1200);
  await shot("/tmp/yu_3d_result.png");

  const summary = await evalJs(`(() => {
    const t = document.body.innerText;
    const score = t.match(/评判[\\s\\S]{0,30}?(\\d{1,3})/)?.[1];
    const grade = t.match(/(神驭|妙驭|中驭|试驭|学驭)/)?.[1];
    const bars = ["节 · 节奏稳匀","让 · 遇礼则让","不极 · 不急不追"].filter(x => t.includes(x)).length;
    return JSON.stringify({ score, grade, bars, beatLine: t.match(/节拍：命中 (\\d+\\/\\d+)/)?.[1],
      meetLine: t.match(/会车：[^。]*。/)?.[0], bowLine: t.match(/相揖：[^。]*。/)?.[0], tailLine: t.match(/随行：[^。]*。/)?.[0] });
  })()`);
  console.log("④ 结算:", summary);
  console.log("console 错误:", consoleMsgs.length ? "\n" + consoleMsgs.slice(0, 8).join("\n") : "（无）");
  if (!finalState?.scored) { console.log("✗ 未完成驾驶流程"); process.exitCode = 1; }
}
main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill("SIGKILL"); });

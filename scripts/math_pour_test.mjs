// 数艺·量仓分赈 — CDP 全程测试：
//  选「均输三乡赋税」→ 键盘出粮/切村 → 调试钩子按 20:9:4 设量 → 封仓验收（高分）
//  → 再算一次 → 全倒给一村 → 验收（低分 + 今日已校）
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9377;
const FRONT = process.env.MATH_URL ?? "http://localhost:7100/journey/math";
const API = process.env.MATH_API ?? "http://localhost:8000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 跑前清场
try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
await sleep(800);

// ── 游客 token ──
const guest = await (await fetch(`${API}/api/v1/auth/guest`, { method: "POST" })).json();
const TOKEN = guest.token;
console.log("游客 token:", TOKEN ? "✓" : "✗");

// ── 前端 dev server（未起则拉起，参照 yu_drive_test 用 7100） ──
let devProc = null;
async function frontUp() {
  try { await fetch("http://localhost:7100/", { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}
if (!(await frontUp())) {
  console.log("前端未运行，启动 npm run dev -- -p 7100 …");
  devProc = spawn("npm", ["run", "dev", "--", "-p", "7100"], {
    cwd: new URL("../frontend", import.meta.url).pathname, stdio: "ignore",
  });
  for (let i = 0; i < 60 && !(await frontUp()); i++) await sleep(1000);
}
console.log("前端:", (await frontUp()) ? "✓" : "✗");

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, "--window-size=760,500",
  "--user-data-dir=/tmp/math_cdp_profile", "about:blank",
], { stdio: "ignore" });

let ws, msgId = 0;
const pending = new Map();
const consoleMsgs = [];
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
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(name, Buffer.from(r.data, "base64"));
}
async function key(code, keyName, down) {
  await send("Input.dispatchKeyEvent", { type: down ? "keyDown" : "keyUp", code, key: keyName });
}
const mathState = () => evalJs(`window.__math ? JSON.stringify(window.__math.state()) : null`);
const pageText = () => evalJs(`document.body.innerText`);

let failures = 0;
function assert(cond, label) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
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

async function main() {
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
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
  // 注入游客 token 后再进游戏页
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("kongzi_token", ${JSON.stringify(TOKEN)});`,
  });
  await send("Page.navigate", { url: FRONT });

  // ① 关卡卡条加载（dev 首次编译较慢，留足时间）
  const cardsReady = await waitFor(
    `[...document.querySelectorAll("button")].filter(b => b.innerText.includes("共 ") && b.innerText.includes("项")).length >= 7`,
    90000, "关卡卡条",
  );
  const cards = await evalJs(`[...document.querySelectorAll("button")].filter(b => b.innerText.includes("共 ") && b.innerText.includes("项")).length`);
  console.log("① 关卡卡数量:", cards);
  assert(cardsReady && cards >= 7, "七关卡条已加载");
  if (!cardsReady) {
    console.log("页面内容:", (await pageText())?.slice(0, 300));
    console.log("console:", consoleMsgs.slice(0, 6).join("\n") || "（无）");
    throw new Error("关卡卡未加载");
  }

  // ② 选第 1 关「均输三乡赋税」
  assert(await clickButton("均输三乡赋税"), "② 选关「均输三乡赋税」");
  const hudReady = await waitFor(`document.body.innerText.includes("仓中剩余") && !!window.__math`, 30000, "分粮场 HUD");
  assert(hudReady, "分粮场 HUD + 调试钩子就绪");
  await sleep(4000); // 等场景编译/首帧
  await shot("/tmp/math_3d_start.png");

  // ③ 真实键盘出粮（验证引擎链路）：按住 ↑ 约 3 真实秒（swiftshader 下游戏时间更慢）
  await key("ArrowUp", "ArrowUp", true);
  await sleep(3000);
  await key("ArrowUp", "ArrowUp", false);
  let st = JSON.parse(await mathState());
  console.log("③ 键盘出粮后:", JSON.stringify(st));
  assert(st.allocations["甲乡"] > 0.5, "按住出粮 → 甲乡得粮（引擎链路通）");
  assert(st.remaining < 90, "仓中剩余减少");

  // ④ 键盘切村 → 再出一点
  await key("ArrowRight", "ArrowRight", true); await sleep(80);
  await key("ArrowRight", "ArrowRight", false);
  st = JSON.parse(await mathState());
  assert(st.selected === 1, "④ → 切换到乙乡");
  await key("ArrowUp", "ArrowUp", true);
  await sleep(1500);
  await key("ArrowUp", "ArrowUp", false);
  st = JSON.parse(await mathState());
  assert(st.allocations["乙乡"] > 0, "乙乡得粮");
  await shot("/tmp/math_pouring.png");

  // ⑤ 调试钩子按 20:9:4 设量（≈ 圣算 54.5/24.5/11），封仓验收
  await evalJs(`window.__math.setAll({ "甲乡": 54.5, "乙乡": 24.5, "丙乡": 11 })`);
  st = JSON.parse(await mathState());
  console.log("⑤ 设定后:", JSON.stringify(st));
  assert(Math.abs(st.remaining) < 0.5, "总量分尽（剩余≈0）");
  assert(await clickButton("封仓验收"), "点「封仓验收」");
  const scored1 = await waitFor(`document.body.innerText.includes("再算一次")`, 40000, "结算卡");
  await sleep(1200);
  await shot("/tmp/math_result_good.png");

  const t1 = await pageText();
  const score1 = t1?.match(/核验[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade1 = t1?.match(/(衡均|通算|中算|试算|学算)/)?.[1];
  const bars1 = ["合总 · 总量相合", "均衡 · 各得其分", "节度 · 不过其量"].filter((x) => t1?.includes(x)).length;
  console.log(`⑥ 结算一：分数 ${score1} · 评级 ${grade1} · 三维条 ${bars1}/3`);
  assert(scored1, "结算卡出现");
  assert(Number(score1) >= 75, `高分路径（${score1} 分）`);
  assert(bars1 === 3, "三维条齐全");
  assert(t1.includes("圣算揭晓"), "圣算对照表出现");

  // ⑦ 再算一次 → 全倒给甲乡（低分路径）
  assert(await clickButton("再算一次"), "⑦ 点「再算一次」");
  const playing2 = await waitFor(`document.body.innerText.includes("仓中剩余") && window.__math && window.__math.state().remaining === 90`, 30000, "第二局就绪");
  assert(playing2, "第二局就绪（剩余重置为 90）");
  await sleep(2500);
  await evalJs(`window.__math.setAll({ "甲乡": 90, "乙乡": 0, "丙乡": 0 })`);
  await evalJs(`window.__math.submit()`);
  const scored2 = await waitFor(`document.body.innerText.includes("再算一次")`, 40000, "第二次结算");
  await sleep(1200);
  await shot("/tmp/math_result_bad.png");
  const t2 = await pageText();
  const score2 = t2?.match(/核验[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade2 = t2?.match(/(衡均|通算|中算|试算|学算)/)?.[1];
  console.log(`⑧ 结算二：分数 ${score2} · 评级 ${grade2}`);
  assert(scored2, "第二次结算卡出现");
  assert(Number(score2) < Number(score1), `低分路径（${score2} < ${score1}）`);
  assert(t2.includes("今日已校"), "当日重复玩提示「今日已校，不再计分」");

  // console 错误（过滤无关噪音）
  const errs = consoleMsgs.filter((m) =>
    !/favicon|DevTools|AudioContext|Autoplay|WebGL.*fallback|GroupMarkerNotSet|swiftshader/i.test(m));
  console.log("console 错误:", errs.length ? "\n" + errs.slice(0, 8).join("\n") : "（无）");
  assert(errs.length === 0, "无 console 错误");

  console.log(failures === 0 ? "\n全部断言通过 ✓" : `\n${failures} 项断言失败 ✗`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => {
    try { ws?.close(); } catch {}
    chrome.kill("SIGKILL");
    if (devProc) devProc.kill("SIGKILL");
    // npm 包装进程被杀后 next dev 子进程可能残留，按模式清一遍
    if (devProc) { try { execSync("pkill -f 'next dev.*7100'"); } catch {} }
  });

// 乐艺·编钟合鸣 — CDP 全程测试：
//  选「闲居抚琴」→ 键盘击音验证引擎链路 → 钩子设 宫徵商羽角宫徵商 → 验收（高分）
//  → 再奏一曲全敲宫 → 验收（低分 + 今日已奏）
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9379;
const FRONT = process.env.YUE_URL ?? "http://localhost:7100/journey/yue";
const API = process.env.YUE_API ?? "http://localhost:8000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 跑前清场
try { execSync('pkill -f "remote-debugging-port=93"'); } catch {}
await sleep(800);

// ── 游客 token ──
const guest = await (await fetch(`${API}/api/v1/auth/guest`, { method: "POST" })).json();
const TOKEN = guest.token;
console.log("游客 token:", TOKEN ? "✓" : "✗");

// ── 前端 dev server（未起则拉起） ──
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
  "--user-data-dir=/tmp/yue_cdp_profile", "about:blank",
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
async function key(code, keyName) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", code, key: keyName });
  await sleep(70);
  await send("Input.dispatchKeyEvent", { type: "keyUp", code, key: keyName });
}
const yueState = () => evalJs(`window.__yue ? JSON.stringify(window.__yue.state()) : null`);
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

  // ① 关卡卡条加载
  const cardsReady = await waitFor(
    `[...document.querySelectorAll("button")].filter(b => b.innerText.includes("闲居抚琴") || b.innerText.includes("祭祖大典")).length >= 2`,
    90000, "关卡卡条",
  );
  const cards = await evalJs(`[...document.querySelectorAll("button")].filter(b => b.innerText.includes(" · ") || b.innerText.includes("已奏")).length`);
  console.log("① 关卡卡就绪:", cardsReady, "（含徽标按钮共", cards, "枚）");
  assert(cardsReady, "五关卡条已加载");
  if (!cardsReady) {
    console.log("页面内容:", (await pageText())?.slice(0, 300));
    console.log("console:", consoleMsgs.slice(0, 6).join("\n") || "（无）");
    throw new Error("关卡卡未加载");
  }

  // ② 选「闲居抚琴」（理想五音均衡）
  assert(await clickButton("闲居抚琴"), "② 选关「闲居抚琴」");
  const hudReady = await waitFor(`document.body.innerText.includes("乐章") && !!window.__yue`, 30000, "击钟台 HUD");
  assert(hudReady, "击钟台 HUD + 调试钩子就绪");
  await sleep(4000); // 等场景编译/首帧

  // ③ 真实键盘击音（验证引擎链路）：A A S（宫宫商）+ 空格休止 + 撤销
  await key("KeyA", "a");
  await sleep(400);
  await key("KeyA", "a");
  await sleep(400);
  await key("KeyS", "s");
  await sleep(400);
  await key("Space", " ");
  let st = JSON.parse(await yueState());
  console.log("③ 键盘击音后:", JSON.stringify(st.sequence));
  assert(st.sequence.join(",") === "gong,gong,shang,rest", "键盘击音/休止（引擎链路通）");
  assert(st.real === 3, "真实音计数 3");
  await key("Backspace", "Backspace");
  st = JSON.parse(await yueState());
  assert(st.sequence.join(",") === "gong,gong,shang", "⌫ 撤销休止符");
  await shot("/tmp/yue_striking.png");

  // ④ 钩子设 宫徵商羽角宫徵商（顺生 + 均衡），奏乐验收
  await evalJs(`window.__yue.setSeq(["gong","zhi","shang","yu","jue","gong","zhi","shang"])`);
  st = JSON.parse(await yueState());
  console.log("④ 设定后:", JSON.stringify(st));
  assert(st.sequence.length === 8 && st.real === 8, "八音就绪");
  assert(await clickButton("奏乐验收"), "点「奏乐验收」");
  const scored1 = await waitFor(`document.body.innerText.includes("再奏一曲")`, 40000, "结算卡");
  await sleep(1200);
  await shot("/tmp/yue_result_good.png");

  const t1 = await pageText();
  const score1 = t1?.match(/审乐[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade1 = t1?.match(/(神和|协律|中和|试律|学律)/)?.[1];
  const bars1 = ["和声 · 五音相生", "合意 · 情境相合", "节度 · 不极不滥"].filter((x) => t1?.includes(x)).length;
  console.log(`⑤ 结算一：分数 ${score1} · 评级 ${grade1} · 三维条 ${bars1}/3`);
  assert(scored1, "结算卡出现");
  assert(Number(score1) >= 75, `高分路径（${score1} 分）`);
  assert(bars1 === 3, "三维条齐全");
  assert(t1.includes("五音分布 · 你的 vs 圣乐"), "分布对照条出现");

  // ⑥ 再奏一曲 → 全敲宫（低分路径：无相生、单音占比 100%）
  assert(await clickButton("再奏一曲"), "⑥ 点「再奏一曲」");
  const playing2 = await waitFor(`document.body.innerText.includes("乐章") && window.__yue && window.__yue.state().sequence.length === 0`, 30000, "第二局就绪");
  assert(playing2, "第二局就绪（乐章清空）");
  await sleep(2500);
  await evalJs(`window.__yue.setSeq(["gong","gong","gong","gong","gong","gong","gong","gong"])`);
  await evalJs(`window.__yue.submit()`);
  const scored2 = await waitFor(`document.body.innerText.includes("再奏一曲")`, 40000, "第二次结算");
  await sleep(1200);
  await shot("/tmp/yue_result_bad.png");
  const t2 = await pageText();
  const score2 = t2?.match(/审乐[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade2 = t2?.match(/(神和|协律|中和|试律|学律)/)?.[1];
  console.log(`⑦ 结算二：分数 ${score2} · 评级 ${grade2}`);
  assert(scored2, "第二次结算卡出现");
  assert(Number(score2) < Number(score1), `低分路径（${score2} < ${score1}）`);
  assert(t2.includes("今日已奏"), "当日重复奏提示「今日已奏，不再计分」");

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

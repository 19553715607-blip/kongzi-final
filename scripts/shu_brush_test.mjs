// 书艺·竹简挥毫 — CDP 全程测试：
//  选第 1 张字卡 → paintGuide（高分路径）→ 真实等 3.5 秒 → 交卷（高分）
//  → 再写一遍 → scribble（低分路径）→ 等 3.5 秒 → 交卷（低分 + 今日已练）
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9381;
const FRONT = process.env.SHU_URL ?? "http://localhost:7100/journey/shu/brush3d";
const API = process.env.SHU_API ?? "http://localhost:8000";
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
  "--user-data-dir=/tmp/shu3d_cdp_profile", "about:blank",
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
const shuState = () => evalJs(`window.__shu3d ? JSON.stringify(window.__shu3d.state()) : null`);
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

  // ① 字卡卡条加载
  const cardsReady = await waitFor(
    `[...document.querySelectorAll("button")].filter(b => b.innerText.includes("部件")).length >= 1`,
    90000, "字卡卡条",
  );
  const cards = await evalJs(`[...document.querySelectorAll("button")].filter(b => b.innerText.includes("部件")).length`);
  console.log("① 字卡数量:", cards);
  assert(cardsReady && cards >= 1, "字卡卡条已加载");
  if (!cardsReady) {
    console.log("页面内容:", (await pageText())?.slice(0, 300));
    console.log("console:", consoleMsgs.slice(0, 6).join("\n") || "（无）");
    throw new Error("字卡未加载");
  }

  // ② 选第 1 张字卡
  assert(await clickButton("部件"), "② 选第 1 张字卡");
  const hudReady = await waitFor(`document.body.innerText.includes("交卷") && !!window.__shu3d`, 30000, "书案 HUD");
  assert(hudReady, "书案 HUD + 调试钩子就绪");
  await sleep(5000); // 等场景编译/首帧

  // ③ paintGuide（高分路径）→ 真实等 3.5 秒（duration 门槛）→ 交卷
  await evalJs(`window.__shu3d.paintGuide()`);
  let st = JSON.parse(await shuState());
  console.log("③ paintGuide 后:", JSON.stringify(st));
  assert(st.strokes >= 3, "段数 ≥3");
  assert(st.recall > 0.9, `覆盖率高（${(st.recall * 100).toFixed(0)}%）`);
  await sleep(3500); // duration_ms 门槛为真实 3 秒
  await evalJs(`window.__shu3d.submit()`);
  const scored1 = await waitFor(`document.body.innerText.includes("再写一遍")`, 40000, "结算卡");
  await sleep(1200);
  await shot("/tmp/shu3d_result_good.png");

  const t1 = await pageText();
  const score1 = t1?.match(/品鉴[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade1 = t1?.match(/(神品|妙品|能品|可观|试笔)/)?.[1];
  const bars1 = ["精准 · 墨不逾稿", "覆盖 · 笔笔到位"].filter((x) => t1?.includes(x)).length;
  console.log(`④ 结算一：分数 ${score1} · 品级 ${grade1} · 双维条 ${bars1}/2`);
  assert(scored1, "结算卡出现");
  assert(Number(score1) >= 75, `高分路径（${score1} 分）`);
  assert(bars1 === 2, "双维条齐全");
  assert(t1.includes("本义"), "字源故事出现");

  // ⑤ 再写一遍 → scribble（低分路径）→ 等 3.5 秒 → 交卷
  assert(await clickButton("再写一遍"), "⑤ 点「再写一遍」");
  const writing2 = await waitFor(`document.body.innerText.includes("交卷") && window.__shu3d && window.__shu3d.state().strokes === 0`, 30000, "第二局就绪");
  assert(writing2, "第二局就绪（墨迹清空）");
  await sleep(2500);
  await evalJs(`window.__shu3d.scribble()`);
  st = JSON.parse(await shuState());
  console.log("⑥ scribble 后:", JSON.stringify(st));
  assert(st.strokes >= 3, "乱涂段数 ≥3");
  await sleep(3500);
  await evalJs(`window.__shu3d.submit()`);
  const scored2 = await waitFor(`document.body.innerText.includes("再写一遍")`, 40000, "第二次结算");
  await sleep(1200);
  await shot("/tmp/shu3d_result_bad.png");
  const t2 = await pageText();
  const score2 = t2?.match(/品鉴[\s\S]{0,40}?(\d{1,3})/)?.[1];
  const grade2 = t2?.match(/(神品|妙品|能品|可观|试笔)/)?.[1];
  console.log(`⑦ 结算二：分数 ${score2} · 品级 ${grade2}`);
  assert(scored2, "第二次结算卡出现");
  assert(Number(score2) < Number(score1), `低分路径（${score2} < ${score1}）`);
  assert(t2.includes("今日已练"), "当日重复提示「今日已练，不再计分」");

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

#!/usr/bin/env node
/**
 * 信息架构校验（Information Architecture Check）
 *
 * 目的：让「入口不明显」和「包含结构混乱」这两类问题不会回潮。
 * 所有断言都基于仓库里的真实文件与 lib/nav.ts 的 SITE_MAP，不依赖人工判断。
 *
 * 校验项：
 *   1. 无孤儿页     —— 每个 app/**\/page.tsx 要么在 SITE_MAP，要么在 SYSTEM_ROUTES
 *   2. 无死链       —— SITE_MAP 里每个 href 都有对应的 page.tsx
 *   3. 归属唯一     —— SITE_MAP 里 href 不重复（同一页只能属于一个栏目）
 *   4. 栏目不臃肿   —— 每个一级栏目 ≤ 6 项（桌面下拉可一屏读完）
 *   5. tab 唯一     —— 每个栏目至多一个移动端底部 tab 落地页
 *   6. 文案存在     —— 每个 labelKey 在 i18n.ts 里有定义，导航不会显示 key 字面量
 *   7. 旧结构已清除 —— 不再出现 NAV_GROUPS / EXTRA_LINKS / FOOTER_GROUPS / nav.zh.*
 *
 * 用法：node scripts/check-ia.mjs
 * 退出码：0 全通过；1 存在失败项（可挂进 CI / make check）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "frontend/src/app");
const NAV = path.join(ROOT, "frontend/src/lib/nav.ts");
const I18N = path.join(ROOT, "frontend/src/lib/i18n.ts");

const MAX_PER_AREA = 6;
const failures = [];

const fail = (msg) => failures.push(msg);
const ok = (msg) => console.log(`  PASS  ${msg}`);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === "page.tsx") out.push(p);
  }
  return out;
}

// ── 真实路由（管理端独立外壳，不参与用户端 IA） ──
const routes = walk(APP)
  .map((f) => {
    const rel = path.relative(APP, f).replace(/\\/g, "/").replace(/\/?page\.tsx$/, "");
    return rel === "" ? "/" : "/" + rel;
  })
  .filter((r) => !r.startsWith("/admin"))
  .sort();

// ── 解析 lib/nav.ts ──
const navSrc = fs.readFileSync(NAV, "utf8");

const mapBlock = navSrc.match(/export const SITE_MAP: PageDef\[\]\s*=\s*\[([\s\S]*?)\n\];/);
if (!mapBlock) {
  console.error("FATAL 无法在 lib/nav.ts 中解析 SITE_MAP");
  process.exit(1);
}
const siteMap = [...mapBlock[1].matchAll(/\{\s*href:\s*"([^"]+)",\s*labelKey:\s*"([^"]+)",\s*area:\s*"([^"]+)"([^}]*)\}/g)]
  .map((m) => ({ href: m[1], labelKey: m[2], area: m[3], tab: /tab:\s*true/.test(m[4]) }));

const sysBlock = navSrc.match(/export const SYSTEM_ROUTES: string\[\]\s*=\s*\[([\s\S]*?)\];/);
const systemRoutes = sysBlock ? [...sysBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];

const areaBlock = navSrc.match(/export const AREAS:[\s\S]*?=\s*\[([\s\S]*?)\n\];/);
const areas = areaBlock ? [...areaBlock[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]) : [];

const i18nSrc = fs.readFileSync(I18N, "utf8");
const hasKey = (k) => new RegExp(`"${k.replace(/\./g, "\\.")}"\\s*:`).test(i18nSrc);

console.log("\n信息架构校验  IA check\n" + "=".repeat(52));
console.log(`路由 ${routes.length} 个 · SITE_MAP ${siteMap.length} 条 · 栏目 ${areas.length} 个\n`);

// 1. 无孤儿页（首页是导航根，自身不需要归属）
{
  const orphans = routes.filter((r) => {
    if (r === "/") return false;
    if (systemRoutes.some((s) => r === s || r.startsWith(s + "/"))) return false;
    return !siteMap.some((p) => r === p.href || r.startsWith(p.href + "/"));
  });
  if (orphans.length) fail(`孤儿页 ${orphans.length} 个（既不在 SITE_MAP 也不在 SYSTEM_ROUTES）：${orphans.join(", ")}`);
  else ok(`无孤儿页：${routes.length} 个路由全部有归属`);
}

// 2. 无死链
{
  const dead = siteMap.filter((p) => !routes.some((r) => r === p.href || r.startsWith(p.href + "/")));
  if (dead.length) fail(`死链 ${dead.length} 个（SITE_MAP 有、页面文件不存在）：${dead.map((d) => d.href).join(", ")}`);
  else ok("无死链：SITE_MAP 每条都有对应 page.tsx");
}

// 3. 归属唯一
{
  const seen = new Map();
  const dup = [];
  for (const p of siteMap) {
    if (seen.has(p.href)) dup.push(p.href);
    seen.set(p.href, true);
  }
  if (dup.length) fail(`重复归属 ${dup.length} 个：${[...new Set(dup)].join(", ")}`);
  else ok("归属唯一：没有页面同时出现在两个栏目");
}

// 4. 栏目不臃肿
{
  const over = areas.filter((a) => siteMap.filter((p) => p.area === a).length > MAX_PER_AREA);
  if (over.length) fail(`栏目超过 ${MAX_PER_AREA} 项：${over.map((a) => `${a}(${siteMap.filter((p) => p.area === a).length})`).join(", ")}`);
  else ok(`栏目规模合理：${areas.map((a) => `${a}=${siteMap.filter((p) => p.area === a).length}`).join(" ")}`);
}

// 5. tab 唯一
{
  const bad = areas.filter((a) => siteMap.filter((p) => p.area === a && p.tab).length > 1);
  if (bad.length) fail(`栏目存在多个移动端 tab 落地页：${bad.join(", ")}`);
  else ok(`移动端 tab 落地页唯一：${siteMap.filter((p) => p.tab).map((p) => p.href).join(" ")}`);
}

// 6. 文案存在
{
  const missing = [...new Set(siteMap.map((p) => p.labelKey))].filter((k) => !hasKey(k));
  if (missing.length) fail(`i18n 缺少键 ${missing.length} 个：${missing.join(", ")}`);
  else ok("导航文案齐全：每个 labelKey 在 i18n.ts 都有定义");
}

// 7. 旧结构已清除
{
  const legacy = ["NAV_GROUPS", "EXTRA_LINKS", "FOOTER_GROUPS", "nav.zh.explore", "footer.community", "footer.tools"];
  const hits = [];
  for (const name of legacy) {
    for (const rel of ["frontend/src/lib/nav.ts", "frontend/src/lib/i18n.ts", "frontend/src/components/Nav.tsx", "frontend/src/components/Footer.tsx", "frontend/src/components/Breadcrumb.tsx"]) {
      const file = path.join(ROOT, rel);
      if (fs.existsSync(file) && fs.readFileSync(file, "utf8").includes(name)) hits.push(`${name} @ ${rel}`);
    }
  }
  if (hits.length) fail(`旧结构残留 ${hits.length} 处：${hits.join("; ")}`);
  else ok("旧结构已清除：三套并行分组定义与手写副标题均已移除");
}

// ── 明细表 ──
console.log("\n栏目归属明细\n" + "-".repeat(52));
for (const a of areas) {
  const items = siteMap.filter((p) => p.area === a);
  console.log(`${a}  (${items.length})`);
  for (const p of items) {
    const depth = 2; // 首页 → 一级下拉 → 页面
    console.log(`  ${p.href.padEnd(14)} ${p.labelKey.padEnd(18)} ${p.tab ? "[tab] " : "      "}点击深度 ${depth}`);
  }
}

console.log("\n" + "=".repeat(52));
if (failures.length) {
  console.error(`结果：FAIL（${failures.length} 项）`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("结果：PASS —— 无孤儿页、无死链、归属唯一、栏目不超限、文案齐全");
process.exit(0);

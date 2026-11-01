#!/usr/bin/env node
// 孔子平台 · 跨平台任务入口
//
// Windows 默认没有 make，而 Makefile 承载了本地 docker 起停、部署到服务器、
// 种子灌入等全部操作入口。本文件提供等价实现，Windows / macOS / Linux 通用。
//
// 用法：node scripts/tasks.mjs <任务>
// 环境变量：KONGZI_REMOTE（默认 exp605@10.26.6.108）、KONGZI_REMOTE_DIR（默认 /home/exp605/kongzi）
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REMOTE = process.env.KONGZI_REMOTE ?? "exp605@10.26.6.108";
const REMOTE_DIR = process.env.KONGZI_REMOTE_DIR ?? "/home/exp605/kongzi";

function run(cmd, args, { allowFail = false } = {}) {
  console.log(`▷ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT });
  if (r.error) {
    console.error(`✗ 无法执行 ${cmd}：${r.error.message}`);
    if (!allowFail) process.exit(1);
    return 1;
  }
  if (r.status !== 0 && !allowFail) process.exit(r.status ?? 1);
  return r.status ?? 0;
}

const docker = (args, o) => run("docker", ["compose", ...args], o);
const ssh = (cmd, o) => run("ssh", ["-o", "ConnectTimeout=10", REMOTE, cmd], o);
const remoteDocker = (args, o) => ssh(`cd ${REMOTE_DIR} && docker compose ${args.join(" ")}`, o);

const TASKS = {
  help() {
    console.log(`孔子 · 跨平台任务入口（Windows / macOS / Linux 通用）

本地 docker
  node scripts/tasks.mjs up                  起全栈（Neo4j + 后端 + 前端）
  node scripts/tasks.mjs down                停全栈
  node scripts/tasks.mjs logs                看本地日志（跟随）
  node scripts/tasks.mjs build               重建镜像（--no-cache）
  node scripts/tasks.mjs clean               清数据卷（危险，会删数据）

部署：本地 → 云效 → 服务器
  node scripts/tasks.mjs push                仅推到云效
  node scripts/tasks.mjs deploy              推 + 服务器 pull + 重 build + 起服务
  node scripts/tasks.mjs deploy-fast         推 + pull + 起服务（不重 build）
  node scripts/tasks.mjs status              看服务器容器状态
  node scripts/tasks.mjs logs-remote         看服务器日志（跟随）
  node scripts/tasks.mjs seed-all            服务器灌全部种子（书/乐/数/射）

数据
  node scripts/tasks.mjs translate-annos     用千问真译注释（约 8 分钟）
  node scripts/tasks.mjs translate-concepts  用千问真译概念定义
  node scripts/tasks.mjs neo4j-ingest        把内存图灌入 neo4j 容器

环境变量
  KONGZI_REMOTE       服务器 SSH 目标，默认 ${REMOTE}
  KONGZI_REMOTE_DIR   服务器项目目录，默认 ${REMOTE_DIR}

首次连接服务器需确认主机指纹（只需一次，否则远程任务报 Host key verification failed）
  ssh ${REMOTE}       # 看到指纹后输入 yes

等价 Makefile：make up / make deploy / make seed-all …（需要装 make）`);
  },

  up() {
    docker(["up", "-d"]);
    console.log("\n▷ 后端 http://localhost:8000   前端 http://localhost:3000   Neo4j http://localhost:7474");
  },
  down: () => docker(["down"]),
  logs: () => docker(["logs", "-f", "--tail=80"]),
  build: () => docker(["build", "--no-cache"]),
  clean: () => docker(["down", "-v"]),

  push: () => run("git", ["push"]),

  deploy() {
    console.log("==> 1/4 推送到云效…");
    run("git", ["push"]);
    console.log("==> 2/4 服务器 git pull…");
    ssh(`cd ${REMOTE_DIR} && git pull`);
    console.log("==> 3/4 docker build…");
    remoteDocker(["build"]);
    console.log("==> 4/4 起服务…");
    remoteDocker(["up", "-d"]);
    remoteDocker(["ps"]);
    console.log(`\n▷ 已部署：http://${REMOTE.split("@")[1]}:3000`);
  },

  "deploy-fast"() {
    console.log("==> 1/3 推送到云效…");
    run("git", ["push"]);
    console.log("==> 2/3 服务器 git pull…");
    ssh(`cd ${REMOTE_DIR} && git pull`);
    console.log("==> 3/3 起服务…");
    remoteDocker(["up", "-d"]);
    remoteDocker(["ps"]);
  },

  status: () => remoteDocker(["ps"]),
  "logs-remote": () => remoteDocker(["logs", "-f", "--tail=80"]),

  "seed-all"() {
    const seeds = [
      ["shu 经典", "app.seed_she_passages"],
      ["shu 30 字", "app.seed_shu_cards"],
      ["yue 5 场景", "app.seed_yue_scenarios"],
      ["math 5 场景", "app.seed_math_scenarios"],
    ];
    let failed = 0;
    for (const [label, mod] of seeds) {
      console.log(`==> seed ${label}`);
      const code = ssh(`cd ${REMOTE_DIR} && docker compose exec -T backend python -m ${mod}`, { allowFail: true });
      if (code !== 0) { failed++; console.error(`    ✗ ${label} 失败`); }
    }
    console.log(failed === 0 ? "\n▷ 全部种子灌入完成" : `\n▷ 完成，其中 ${failed} 项失败`);
    if (failed) process.exit(1);
  },

  "translate-annos": () => docker(["exec", "backend", "python", "-m", "app.translate_corpus", "--annos"]),
  "translate-concepts": () => docker(["exec", "backend", "python", "-m", "app.translate_corpus", "--concepts"]),
  "neo4j-ingest": () => docker(["exec", "backend", "python", "-m", "app.graph_ingest"]),
};

const name = (process.argv[2] ?? "help").replace(/^--?/, "");
const task = TASKS[name];

if (!task) {
  console.error(`✗ 未知任务：${name}\n`);
  TASKS.help();
  process.exit(1);
}
task();

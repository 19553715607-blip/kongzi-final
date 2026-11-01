# scripts/ — 六艺关卡回归测试与启动脚本

这批脚本用 **CDP（Chrome DevTools Protocol）** 驱动无头浏览器，对六艺 3D 关卡做自动化回归：
模拟真实鼠标/键盘输入、读取页面内部状态、截图留证、逐条打印断言结果。

Windows 与 macOS 均可直接运行。

## 前置条件

1. **浏览器**：Chrome 或 Edge（自动探测常见安装位置）
2. **Node.js 18+**（用到了内置 `fetch` 与 `WebSocket`）
3. **后端**跑在 8000：`bash scripts/start-backend.sh`（Windows 也可双击 `scripts\start-backend.cmd`）
4. **前端**：脚本会自己检查 3000 端口，没起就自动 `npm run dev -- -p 3000`

> 端口必须是 **3000**：后端 CORS 白名单只放行 `localhost:3000` 与 `localhost:5173`，
> 换个端口页面调后端会被浏览器拦掉。

## 用法

```bash
node scripts/she_aim_test.mjs          # 单个脚本
node scripts/shu_brush_test.mjs
```

断言失败时退出码为 1，可直接接 CI。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `KONGZI_CHROME` | 自动探测 | 浏览器可执行文件绝对路径 |
| `KONGZI_PORT` | `3000` | 前端端口 |
| `KONGZI_ORIGIN` | `http://localhost:<PORT>` | 前端完整 origin |
| `KONGZI_API` | `http://localhost:8000` | 后端地址 |

各脚本另有自己的覆盖变量（`SHE_URL` / `YUE_URL` / `SHU_URL` / `YU_URL` / `MATH_URL`
及对应的 `*_API`），优先级高于 `KONGZI_*`。

## 脚本清单

### 射 · 观德（`she_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `she_aim_test.mjs` | 拉弓中准星跟随鼠标；瞄偏 → 环数下降或脱靶 |
| `she_cdp_test.mjs` | 按住 → 松开 → 截屏，验证中靶流程 |
| `she_2shot_test.mjs` | 连续两箭流程 |
| `she_cam_test.mjs` | 准心/偏右两视角截屏对比 |
| `she_full_set_test.mjs` | 五矢全流程 + 「再来一局」不卡死 |
| `she_miss_flow_test.mjs` | 脱靶后的反省卡流程 |

### 乐 · 击钟（`yue_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `yue_bell_test.mjs` | 击钟全程：选乐章 → 按序击打 → 结算 → 第二局 |
| `yue_idle_probe.mjs` | 闲置态探针，逐帧打印内部状态 |
| `yue_repro_probe.mjs` | 复现探针 |
| `yue_shot.mjs` | 场景截屏（`YUE_SCEN` 可指定场景名） |

### 书 · 竹简挥毫（`shu_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `shu_brush_test.mjs` | 全程：高分路径（paintGuide）与低分路径（scribble）双跑 |
| `shu_brush_probe.mjs` | 慢笔零墨迹探针，逐帧打印引擎状态 |
| `shu_brush_shot.mjs` | 书案截屏 |
| `shu_brush_feel_shot.mjs` | 毛笔手感截屏 |

### 御 · 驾车（`yu_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `yu_drive_test.mjs` | 选关 → 驾驶 → 结算全程（`MEET=1` 走会车分支） |
| `yu_frame_test.mjs` | 帧率与颠簸（`CRUISE=0` 不巡航；`OFFRUT=1` 中途出辙） |

### 数 · 分粮（`math_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `math_pour_test.mjs` | 分粮场全程：HUD → 倒粮 → 结算 → 第二局 |
| `math_shot.mjs` | 场景截屏 |

### 礼 · 执礼雅集（`li_*`）

| 脚本 | 验证内容 |
| --- | --- |
| `li_current_shot.mjs` | 雅集首页与场景截屏 |

## 公共层 `_cdp.mjs`

所有脚本共享 `scripts/_cdp.mjs`，它封装了四件跨平台差异：

| 导出 | 作用 |
| --- | --- |
| `CHROME` | 探测到的浏览器路径（Chrome 优先，Edge 兜底） |
| `FRONT_PORT` / `FRONT_ORIGIN` / `API_ORIGIN` | 端口与地址 |
| `launchChrome({port, profile, url, windowSize})` | 用系统临时目录作 `--user-data-dir` 拉起无头浏览器 |
| `ensureDevServer()` / `stopDevServer(proc)` | 探测或拉起前端 dev server，并**整棵进程树**清理 |
| `killTree(proc)` | 终止进程树（Windows 用 `taskkill /F /T`，macOS 用 `SIGKILL`） |
| `killByCmdline(substr)` | 按命令行特征清理残留进程（替代 `pkill -f`） |
| `outFile(name)` / `profileDir(name)` | 系统临时目录下的输出与浏览器 profile 路径 |
| `isUp(url)` / `sleep(ms)` / `npmSpawn()` | 小工具 |

截图与中间产物统一落在**系统临时目录**：
Windows `%TEMP%`，macOS/Linux `/tmp`。脚本运行时会把实际路径打印出来。

## 跨平台任务入口 `tasks.mjs`

Windows 默认没有 `make`，而根目录 `Makefile` 承载了本地 docker 起停、部署到服务器、
种子灌入等全部操作入口。`tasks.mjs` 是它的跨平台等价实现：

```bash
node scripts/tasks.mjs help        # 列出全部任务
node scripts/tasks.mjs up          # 本地起全栈（Neo4j + 后端 + 前端）
node scripts/tasks.mjs status      # 看服务器容器状态
node scripts/tasks.mjs deploy      # 推 + 服务器 pull + 重 build + 起服务
node scripts/tasks.mjs seed-all    # 服务器灌全部种子
```

任务与 Makefile 一一对应：`up` / `down` / `logs` / `build` / `clean` /
`push` / `deploy` / `deploy-fast` / `status` / `logs-remote` / `seed-all` /
`translate-annos` / `translate-concepts` / `neo4j-ingest`。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `KONGZI_REMOTE` | `exp605@10.26.6.108` | 服务器 SSH 目标 |
| `KONGZI_REMOTE_DIR` | `/home/exp605/kongzi` | 服务器项目目录 |

> 远程任务首次运行前，需先确认服务器主机指纹：`ssh exp605@10.26.6.108` 并输入 `yes`。
> 否则会报 `Host key verification failed`。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `未找到 Chrome 或 Edge` | 装一个，或设 `KONGZI_CHROME=<可执行文件绝对路径>` |
| 页面白屏、断言全挂 | 确认后端已在 8000 起（`curl http://localhost:8000/health`） |
| 截图全黑 | 无头浏览器走软件渲染，WebGL 首帧较慢；脚本已内置等待，机器慢时可加大等待 |
| 上次跑完有 Chrome 残留 | 脚本开头会自动按 `remote-debugging-port=93` 特征清理 |
| 端口 3000 被占 | 释放端口，或设 `KONGZI_PORT` 并同步改后端 `CORS_ORIGINS` |

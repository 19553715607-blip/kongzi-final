# 孔子 · 前端（Stage 1 首切）

Next.js 14 (App Router) + Tailwind，新东方美学。接后端真实 API。
本切包含：**首页（今日金句 + 入口）· 读一读（五层信息）· 聊一聊（SSE 流式对话）**。

## 运行

需要后端先起在 8000（见 `../backend/README.md`）：

```bash
cd ../backend && .venv/bin/uvicorn app.main:app --port 8000   # 终端 A
```

前端：

```bash
npm install          # 首次
npm run dev          # http://localhost:3000
```

> 后端 CORS 已放行 `localhost:3000`，所以前端**必须**跑在 3000。
> 后端地址可在 `.env.local` 改 `NEXT_PUBLIC_API_BASE`。

## 页面 ↔ 后端接口

| 页面 | 路由 | 消费接口 |
|------|------|----------|
| 首页 | `/` | `GET /api/v1/passages/{ref}` `GET /api/v1/passages/today` `GET /api/v1/passages/random`（今日金句/换一句） |
| 刷刷（短视频流） | `/feed` | `GET /api/v1/feed`（沉浸式滑动卡片） |
| 读一读 | `/read` | `/books` `/chapters` `/passages/{ref}` `/passages/{ref}/neighbors` `/passages/{ref}/related` |
| 知识图谱 | `/graph` | `/graph/concept/{id}/neighborhood` `/graph/path` |
| 聊一聊 | `/chat` | `POST /api/v1/chat`（SSE） |
| 君子之路 | `/journey` | `/gamify/profile` `/checkin` `/task/{id}/complete` |
| 个人中心 | `/me` | `/auth/me` `/auth/upgrade` `/auth/me/export` `/gamify/favorites` |

> 首页「全球议题·每日思考」板块额外消费 `GET /api/v1/topics/{id}/passages`（议题关联经典）。

> 鉴权无摩擦：`src/lib/auth.ts` 首访自动领游客 token（`POST /auth/guest`），存 localStorage，
> `authFetch` 自动附 Bearer 并在 401 时重领重试。个人中心可绑邮箱升级为正式账号。

## 关键实现

- `src/lib/api.ts` — REST 封装 + **SSE 手写解析器**（chat 是 POST，EventSource 用不了，
  用 `fetch` + `ReadableStream` 按空行切帧，分发 `agents/token/citation/verify/followups/done`）。
- `src/app/chat/page.tsx` — 流式对话页：智能体色点、逐字正文、经典依据卡、校验徽章三评分、追问 chips、多轮、中/EN 切换、支持 `/chat?q=` 预填。
- `src/app/read/page.tsx` — 读经页：书/章/句三级 + 五层信息（原文/拼音/译文/释义）可独立开关 + AI 解读引导到对话。
- `src/app/graph/page.tsx` — 知识图谱页：ECharts 力导向图，节点按类型着色 + 中文关系标签 + 节点详情/关系卡 + 深度调节 + 单击查看/双击钻取；移动端降级为关系卡列表。
- `tailwind.config.ts` — 设计 token（朱砂 `#993C1D`、青绿解读 `#E1F5EE`、宣纸底、宋体）取自 mockups。

## 进度

8 屏全部接真实 API 完成：首页 · 刷刷 · 读一读 · 知识图谱 · 智能对话 · 君子之路 · 个人中心（+概念图鉴/搜索）。

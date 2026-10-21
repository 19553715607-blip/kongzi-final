# 孔子 · 后端（Stage 1 骨架）

承接《后台设计方案》（见 `docs/孔子平台-说明与设计.md` 第四篇）的最小可运行后端：**经典内容 API + RAG 流式对话 + 概念图鉴**。
默认零配置（SQLite + Mock LLM），不需要任何 API key 即可跑通全链路。

## 快速开始

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env                      # 可选，默认值即可
.venv/bin/uvicorn app.main:app --reload --port 8077
```

启动后：
- 交互式文档（Swagger）：http://127.0.0.1:8077/docs
- 首次启动自动建表并灌入论语种子数据（5 句 + 5 概念）。

## 验证

```bash
# 健康检查
curl http://127.0.0.1:8077/health

# 读经页五层信息（原文/拼音/译文/注释）
curl "http://127.0.0.1:8077/api/v1/passages/lunyu.yanyuan.12.1?lang=en"

# 混合检索（中文需 URL 编码）
curl -G "http://127.0.0.1:8077/api/v1/search" --data-urlencode "q=克己复礼"

# 概念图鉴
curl "http://127.0.0.1:8077/api/v1/concepts/ren?lang=en"

# 流式对话（SSE）—— 注意 -N 关闭缓冲才能看到逐字流出
curl -N -X POST "http://127.0.0.1:8077/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"克己复礼是什么意思？","lang":"zh","device":"web"}'
```

SSE 事件序列（前端按此驱动 UI）：

| 事件 | 用途（对应前端） |
|------|------------------|
| `agents` | 点亮本次激活的智能体（状态条/色点） |
| `citation` | 经典卡片（朱砂左边框 + 原文 + 出处） |
| `token` | 逐字流式正文 |
| `verify` | 校验徽章三评分（文本依据/现代发挥/文化适配） |
| `followups` | 推荐追问 chips |
| `done` | 完整答案 + citations + agents_used，落库 |

> 非中文 `lang`（如 `en`）会自动多激活 `translator` + `cross_culture` 智能体。

## 目录结构

```
backend/app/
  config.py            配置（env 驱动）
  db.py                SQLAlchemy 引擎/会话/建表
  models.py            ORM：书·篇·句 + 译文/注释/概念 + 会话/消息
  schemas.py           Pydantic 出入参
  seed.py              论语种子数据（仅库空时灌入）
  main.py              FastAPI 应用装配 + CORS + lifespan
  routers/
    health.py          /health
    content.py         /books /chapters /passages /search
    concepts.py        /concepts（图鉴）
    chat.py            /chat（SSE 流式）
  services/
    embeddings.py      Embedding 抽象（local 多语言 / openai / hash 兜底）
    vector_store.py    Chroma 封装：索引 + 查询
    retrieval.py       RAG 检索：vector / keyword / hybrid(RRF)，签名稳定
    llm.py             LLM 抽象（mock / openai / anthropic）
    orchestrator.py    智能体编排：route→retrieve→synth→verify→followups
  index.py             python -m app.index  构建向量索引
  eval_rag.py          python -m app.eval_rag  检索质量评测
```

## 向量检索（Chroma）与质量评测

检索已从关键词升级为 **Chroma 向量库 + 多语言 Embedding**（`paraphrase-multilingual-MiniLM-L12-v2`，跨语言、零 API key）。

```bash
# 构建/重建向量索引（首次会下载 ~470MB 模型）
.venv/bin/python -m app.index            # 增量
.venv/bin/python -m app.index --rebuild  # 重建

# RAG 质量评测：关键词 vs 向量 vs 混合（Hit@1 / Hit@3 / MRR）
.venv/bin/python -m app.eval_rag
```

服务启动时会自动建索引（`retrieval_backend=auto|vector` 且集合为空）。
检索后端由 `.env` 的 `RETRIEVAL_BACKEND` 控制：`auto`(默认) / `vector` / `keyword` / `hybrid`。

**实测结果**（10 条评测集：5 条中文释义改写 + 5 条跨语言英文）：

| 后端 | 模型 | Hit@1 | Hit@3 | MRR |
|------|------|:----:|:----:|:----:|
| 关键词 keyword | — | 40% | 90% | 0.617 |
| 向量 vector | MiniLM-L12（384d, ~470MB） | 70% | 100% | 0.850 |
| **向量 vector** | **bge-m3（1024d, ~2.2GB）** | **100%** | **100%** | **1.000** |
| 混合 hybrid(RRF) | bge-m3 | 80% | 100% | 0.900 |

要点：① 关键词在跨语言英文上仅 2/5，向量全中；② 换 `bge-m3` 后向量 **10/10 全中、MRR=1.0**，
MiniLM 漏掉的 3 条中文释义改写全部补齐；③ embedder 变强后，混合(RRF) 反被弱关键词路拖低
（80% < 100%）——印证「小语料上单路向量最佳」，故 `auto` 默认走向量，hybrid 留待大语料 + 真实 BM25。
默认模型仍是轻量 MiniLM；要复现满分把 `.env:EMBEDDING_MODEL=BAAI/bge-m3` 并 `python -m app.index --rebuild`。

## 知识图谱

人物 / 概念 / 篇章 / 命题 / 学派 + 它们之间的边，两种后端可切换：

- **memory（默认，零配置）**：从关系库即时构建邻接表，纯 Python BFS。
- **neo4j（可选）**：真实图数据库。

```bash
# 接口
GET /api/v1/graph/meta
GET /api/v1/graph/concept/{node_id}/neighborhood?depth=2   # 任意类型节点的 N 跳子图
GET /api/v1/graph/path?from=ren&to=kongzi                  # 两节点最短路径
```

返回结构 `{nodes:[{id,label,label_en,type,color,meta}], edges:[{source,target,label}]}`，两后端一致。

### 切换到 Neo4j

```bash
docker compose -f docker-compose.neo4j.yml up -d          # 起 Neo4j（需 Docker）
.venv/bin/pip install neo4j
NEO4J_URI=bolt://localhost:7687 .venv/bin/python -m app.graph_ingest   # 灌数据
# .env 设 GRAPH_BACKEND=neo4j 后重启后端
```

`app/graph_ingest.py` 复用内存图的节点/边构建逻辑推入 Neo4j，确保两后端数据一致。

## 鉴权与游戏化（君子之路 / 个人中心）

轻量 JWT（自包含 HS256，无新依赖）+ 无摩擦游客：前端首访自动领游客 token，可后续绑邮箱升级。

```bash
POST /api/v1/auth/guest                 # 领游客账号 + token
POST /api/v1/auth/register | /login     # 邮箱注册 / 登录
POST /api/v1/auth/upgrade               # 游客绑邮箱升级（保留进度，需 Bearer）
GET  /api/v1/auth/me  | PUT /me         # 资料 / 偏好
GET  /api/v1/auth/me/export             # GDPR/CCPA 数据导出
DELETE /api/v1/auth/me                  # 账户与数据删除

GET  /api/v1/gamify/profile             # 段位/六艺/打卡/今日修行/勋章
POST /api/v1/gamify/checkin             # 打卡（+XP，连击，解锁勋章）
POST /api/v1/gamify/task/{id}/complete  # 完成今日修行
GET/POST/DELETE /api/v1/gamify/favorites
```

- 科举段位：童生→秀才→举人→进士→翰林（XP 阈值 0/100/300/600/1000）
- 六艺：礼乐射御书数（0–100），打卡/修行累加
- 勋章：初心 / 七日不辍 / 秀才及第 / 集萃 / 好学（服务端判定解锁）

> 口令用 PBKDF2 哈希、JWT 自签——原型够用；生产应换 pyjwt + argon2 与 KMS 密钥。

## 切换到真实模型

编辑 `.env`：

```ini
LLM_PROVIDER=openai          # 或 anthropic
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

业务代码无需改动——`services/llm.py:get_llm()` 会自动路由。

## 通往 Stage 3 的升级点（已预留接口）

| 现状（Stage 1） | 升级目标 | 改动位置 |
|------|---------|---------|
| SQLite | PostgreSQL | `.env` 的 `DATABASE_URL` |
| Chroma + MiniLM 向量 | Milvus + bge-m3 + 真实 BM25 + reranker | `services/vector_store.py` / `embeddings.py`（`retrieve()` 签名不变） |
| 规则路由 + 启发式校验 | LangGraph + 约束式 LLM 校验 | `services/orchestrator.py` 各节点 |
| `create_all` 建表 | Alembic 迁移 | `db.py:init_db()` |
| 种子数据 | 语料导入管线（清洗→标注→向量化→审核） | 独立离线任务 |
```

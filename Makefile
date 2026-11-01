.PHONY: help up down logs build clean translate-annos translate-concepts neo4j-ingest \
        push deploy deploy-fast remote-logs remote-status seed-all

# ─── 服务器地址（统一变量，方便切换）────────────────────────────
REMOTE := exp605@10.26.6.108
REMOTE_DIR := /home/exp605/kongzi
SSH := ssh $(REMOTE)
DC := cd $(REMOTE_DIR) && docker compose

help:
	@echo "孔子 · 一键命令"
	@echo ""
	@echo "─── 本地 docker ──────────────────────────────────────"
	@echo "  make up                   docker compose 起全栈"
	@echo "  make down                 停全栈"
	@echo "  make logs                 看本地日志"
	@echo "  make build                重建镜像（带 --no-cache）"
	@echo "  make clean                清数据卷（危险）"
	@echo ""
	@echo "─── 部署到云效 → 服务器 ──────────────────────────────"
	@echo "  make push                 仅推到云效（不部署）"
	@echo "  make deploy               推 + 服务器 pull + 全重 build + 起服务"
	@echo "  make deploy-fast          推 + pull + 起服务（不重 build，仅代码改动）"
	@echo "  make remote-status        看服务器三个容器状态"
	@echo "  make remote-logs          看服务器日志（实时）"
	@echo "  make seed-all             服务器灌全部种子（书/乐/数/射经典）"
	@echo ""
	@echo "─── 数据 ─────────────────────────────────────────────"
	@echo "  make translate-annos      用千问真译注释（≈ 8 分钟）"
	@echo "  make translate-concepts   用千问真译概念定义"
	@echo "  make neo4j-ingest         把内存图灌入 neo4j 容器"

# ─── 本地 docker ───────────────────────────────────────────────
up:
	docker compose up -d
	@echo "▷ 后端 http://localhost:8000  前端 http://localhost:3000  Neo4j http://localhost:7474"

down:
	docker compose down

logs:
	docker compose logs -f --tail=80

build:
	docker compose build --no-cache

clean:
	docker compose down -v

# ─── 部署：本地 → 云效 → 服务器 ──────────────────────────────
push:
	git push

# 完整部署：push → 服务器 pull → 重 build → 重启
deploy:
	@echo "==> 1/4 推送到云效..."
	git push
	@echo "==> 2/4 服务器 git pull..."
	$(SSH) '$(DC) -f docker-compose.yml exec -T backend echo "(健康检查)" 2>/dev/null || true; cd $(REMOTE_DIR) && git pull'
	@echo "==> 3/4 docker build..."
	$(SSH) '$(DC) build'
	@echo "==> 4/4 起服务..."
	$(SSH) '$(DC) up -d'
	@$(SSH) '$(DC) ps'
	@echo "▷ 已部署：http://10.26.6.108:3000"

# 快速部署：跳过 build（仅适用于纯代码改动且未改 Dockerfile/依赖）
# Next.js 是 standalone build 必须 build 一次，所以这条只对后端 hot-reload 有意义
deploy-fast:
	@echo "==> 1/3 推送到云效..."
	git push
	@echo "==> 2/3 服务器 git pull..."
	$(SSH) 'cd $(REMOTE_DIR) && git pull'
	@echo "==> 3/3 起服务..."
	$(SSH) '$(DC) up -d'
	@$(SSH) '$(DC) ps'

remote-status:
	@$(SSH) '$(DC) ps'

remote-logs:
	$(SSH) '$(DC) logs -f --tail=80'

# 服务器灌所有种子
seed-all:
	@echo "==> seed shu 经典 (4 条)"
	-$(SSH) '$(DC) exec -T backend python -m app.seed_she_passages'
	@echo "==> seed shu 30 字"
	-$(SSH) '$(DC) exec -T backend python -m app.seed_shu_cards'
	@echo "==> seed yue 5 场景"
	-$(SSH) '$(DC) exec -T backend python -m app.seed_yue_scenarios'
	@echo "==> seed math 5 场景"
	-$(SSH) '$(DC) exec -T backend python -m app.seed_math_scenarios'

# ─── 数据处理 ────────────────────────────────────────────────
translate-annos:
	docker compose exec backend python -m app.translate_corpus --annos

translate-concepts:
	docker compose exec backend python -m app.translate_corpus --concepts

neo4j-ingest:
	docker compose exec backend python -m app.graph_ingest

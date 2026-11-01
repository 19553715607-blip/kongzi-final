#!/bin/bash
# 孔子平台 · 启动后端（端口 8000，前端 .env.local 已指向此端口）
# 用法：bash scripts/start-backend.sh   （或双击运行）
cd "$(dirname "$0")/../backend" || exit 1
exec .venv/bin/uvicorn app.main:app --port 8000

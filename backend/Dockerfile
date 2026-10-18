# 后端镜像：FastAPI + SQLAlchemy + Chroma + bge-m3 (sentence-transformers)
# 多阶段构建以保持镜像小

FROM docker.m.daocloud.io/library/python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# 安装最小系统依赖（sentence-transformers 需要 libgomp）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装依赖以便缓存
COPY requirements.txt .
RUN pip install -r requirements.txt && pip install neo4j==5.22.0

# 复制代码（.dockerignore 排除 venv/db/chroma 等）
COPY . .

# 数据卷：sqlite db、chroma 索引、hf 模型缓存
VOLUME ["/data"]
ENV DATABASE_URL=sqlite:////data/kongzi.db \
    CHROMA_PATH=/data/chroma \
    HF_HOME=/data/hf_home \
    TRANSFORMERS_CACHE=/data/hf_home

EXPOSE 8000

# 入口：可选执行种子/扩展 + 启动
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

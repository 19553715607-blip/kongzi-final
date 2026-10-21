from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./kongzi.db"

    # 检索：vector(Chroma 向量) | keyword(关键词重叠) | auto(有向量则用向量，否则降级)
    retrieval_backend: str = "auto"
    chroma_path: str = "./chroma"

    # Embedding：local(sentence-transformers) | openai | hash(无语义，仅保证可跑)
    embedding_provider: str = "local"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    openai_embedding_model: str = "text-embedding-3-small"

    # 知识图谱：memory(内存图，零配置) | neo4j(需 NEO4J_URI 可达)
    graph_backend: str = "memory"
    neo4j_uri: str = ""  # 例 bolt://localhost:7687
    neo4j_user: str = "neo4j"
    neo4j_password: str = "kongzi-graph"

    # 鉴权
    jwt_secret: str = "kongzi-dev-secret-change-me"
    jwt_ttl_days: int = 30
    # 管理员邮箱白名单（逗号分隔）。登录/注册/升级时邮箱命中则自动置 is_admin。
    admin_emails: str = ""

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    llm_provider: str = "mock"  # mock | openai | anthropic | qwen
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-latest"

    # 千问（阿里 DashScope）—— OpenAI 兼容协议
    qwen_api_key: str = "sk-5d3bcd36eca94b8d8c3e49cb3b850b01"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen-plus"  # 可选: qwen-max / qwen-turbo / qwen-long / qwen2.5-72b-instruct

    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

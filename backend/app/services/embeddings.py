"""Embedding 抽象层。

支持三种后端，统一 `embed(texts) -> List[List[float]]`：
- local：sentence-transformers 多语言模型（跨语言检索，零 API key）
- openai：text-embedding-3-small（需 key）
- hash：确定性哈希向量，**无语义**，仅用于无依赖环境保证链路可跑（不要用它评测质量）

模型按需懒加载，进程内单例，避免重复加载权重。
"""
from __future__ import annotations

import hashlib
import math
from typing import List, Optional

from ..config import get_settings

settings = get_settings()


class Embedder:
    dim: int = 0
    name: str = "base"

    def embed(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError


class LocalEmbedder(Embedder):
    def __init__(self, model_name: Optional[str] = None) -> None:
        from sentence_transformers import SentenceTransformer  # 懒加载

        self.name = model_name or settings.embedding_model
        self._model = SentenceTransformer(self.name)
        self.dim = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: List[str]) -> List[List[float]]:
        vecs = self._model.encode(
            texts, normalize_embeddings=True, convert_to_numpy=True
        )
        return vecs.tolist()


class OpenAIEmbedder(Embedder):
    def __init__(self) -> None:
        self.name = settings.openai_embedding_model
        self.dim = 1536

    def embed(self, texts: List[str]) -> List[List[float]]:
        import httpx

        url = f"{settings.openai_base_url}/embeddings"
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        r = httpx.post(
            url,
            headers=headers,
            json={"model": self.name, "input": texts},
            timeout=60,
        )
        r.raise_for_status()
        data = sorted(r.json()["data"], key=lambda d: d["index"])
        return [d["embedding"] for d in data]


class HashEmbedder(Embedder):
    """无语义的确定性向量（词袋哈希 + L2 归一化）。仅兜底，勿用于质量评测。"""

    def __init__(self, dim: int = 256) -> None:
        self.dim = dim
        self.name = "hash"

    def embed(self, texts: List[str]) -> List[List[float]]:
        out: List[List[float]] = []
        for text in texts:
            v = [0.0] * self.dim
            for ch in text:
                h = int(hashlib.md5(ch.encode("utf-8")).hexdigest(), 16)
                v[h % self.dim] += 1.0
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / norm for x in v])
        return out


_embedder: Optional[Embedder] = None


def get_embedder() -> Embedder:
    global _embedder
    if _embedder is not None:
        return _embedder
    provider = settings.embedding_provider.lower()
    if provider == "openai" and settings.openai_api_key:
        _embedder = OpenAIEmbedder()
    elif provider == "hash":
        _embedder = HashEmbedder()
    else:
        _embedder = LocalEmbedder()
    return _embedder

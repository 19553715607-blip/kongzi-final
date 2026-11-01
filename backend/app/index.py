"""把经典语料向量化入 Chroma。

用法：
    python -m app.index            # 增量 upsert
    python -m app.index --rebuild  # 删除集合重建
"""
from __future__ import annotations

import sys

from .db import SessionLocal, init_db
from .seed import seed_if_empty
from .services import vector_store


def main() -> None:
    rebuild = "--rebuild" in sys.argv
    init_db()
    seed_if_empty()
    db = SessionLocal()
    try:
        n = vector_store.index_corpus(db, rebuild=rebuild)
        print(f"[index] embedded & upserted {n} passages "
              f"(collection now has {vector_store.count()}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

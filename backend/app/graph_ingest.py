"""把关系库里的图谱数据灌入 Neo4j。

用法（需先起 Neo4j，见 docker-compose.neo4j.yml，并 pip install neo4j）：
    NEO4J_URI=bolt://localhost:7687 python -m app.graph_ingest

灌完后把后端切到 neo4j 后端即可（.env: GRAPH_BACKEND=neo4j）。
节点与边直接复用内存图的构建逻辑，确保两后端数据一致。
"""
from __future__ import annotations

from .config import get_settings
from .db import SessionLocal, init_db
from .seed import seed_if_empty
from .services.graph_store import MemoryGraphStore

settings = get_settings()


def main() -> None:
    if not settings.neo4j_uri:
        raise SystemExit("请先设置 NEO4J_URI（如 bolt://localhost:7687）")

    from neo4j import GraphDatabase

    init_db()
    seed_if_empty()
    db = SessionLocal()
    store = MemoryGraphStore(db)  # 复用内存图：nodes + edges

    driver = GraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
    )
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")  # 清空重建
        for n in store.nodes.values():
            label = n["type"].capitalize()  # person→Person ...
            session.run(
                f"MERGE (x:{label} {{id:$id}}) "
                "SET x.label=$label, x.label_en=$en, x.type=$type",
                id=n["id"], label=n["label"], en=n.get("label_en"), type=n["type"],
            )
        for e in store.edges:
            # rel 标签来自受控集合（RELATED_TO/MENTIONS/...），可安全内联
            session.run(
                f"MATCH (a {{id:$s}}),(b {{id:$t}}) MERGE (a)-[:{e['label']}]->(b)",
                s=e["source"], t=e["target"],
            )
    driver.close()
    db.close()
    print(
        f"[graph_ingest] pushed {len(store.nodes)} nodes, "
        f"{len(store.edges)} edges to {settings.neo4j_uri}"
    )


if __name__ == "__main__":
    main()

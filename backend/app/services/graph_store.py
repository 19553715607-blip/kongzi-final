"""知识图谱存储（可插拔后端）。

- memory：从关系库即时构建邻接表，纯 Python BFS，零额外依赖、零配置。
- neo4j：连真实 Neo4j（配 NEO4J_URI 且 neo4j 驱动已装时启用），Cypher 查询。

对外统一返回 {nodes:[{id,label,label_en,type,meta}], edges:[{source,target,label}]}，
两种后端可互换，路由与前端无感。
"""
from __future__ import annotations

from collections import deque
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import (
    Concept,
    GraphEdge,
    Passage,
    Person,
    Proposition,
    School,
)

settings = get_settings()

NODE_COLORS = {
    "person": "#993C1D",
    "concept": "#0F6E56",
    "passage": "#854F0B",
    "proposition": "#534AB7",
    "school": "#1E5F8E",
}


def _truncate(s: str, n: int = 14) -> str:
    return s if len(s) <= n else s[: n - 1] + "…"


class GraphStore:
    def node(self, node_id: str) -> Optional[dict]:
        raise NotImplementedError

    def neighborhood(self, node_id: str, depth: int = 2) -> dict:
        raise NotImplementedError

    def path(self, a: str, b: str) -> dict:
        raise NotImplementedError


# ── 内存后端 ──────────────────────────────────────────────────────────────────
class MemoryGraphStore(GraphStore):
    def __init__(self, db: Session) -> None:
        self.nodes: Dict[str, dict] = {}
        self.edges: List[dict] = []
        self.adj: Dict[str, List[Tuple[str, str]]] = {}  # id -> [(neighbor, label)]
        self._build(db)

    def _add_node(self, nid, label, label_en, ntype, meta=None):
        self.nodes[nid] = {
            "id": nid,
            "label": label,
            "label_en": label_en,
            "type": ntype,
            "color": NODE_COLORS.get(ntype, "#888"),
            "meta": meta or {},
        }

    def _build(self, db: Session) -> None:
        for c in db.execute(select(Concept)).scalars():
            self._add_node(c.id, c.zh, (c.i18n or {}).get("en"), "concept",
                           {"pinyin": c.pinyin, "rarity": c.rarity, "school": c.school})
        for p in db.execute(select(Passage)).scalars():
            self._add_node(p.id, _truncate(p.original_text), None, "passage",
                           {"ref_label": p.ref_label})
        for pe in db.execute(select(Person)).scalars():
            self._add_node(pe.id, pe.name_zh, (pe.name_i18n or {}).get("en"), "person",
                           {"era": pe.era, "bio": pe.bio})
        for pr in db.execute(select(Proposition)).scalars():
            self._add_node(pr.id, _truncate(pr.text_zh), (pr.text_i18n or {}).get("en"),
                           "proposition", {"passage_ref": pr.passage_ref})
        for s in db.execute(select(School)).scalars():
            self._add_node(s.id, s.name_zh, (s.name_i18n or {}).get("en"), "school", {})

        for e in db.execute(select(GraphEdge)).scalars():
            if e.source_id not in self.nodes or e.target_id not in self.nodes:
                continue
            self.edges.append(
                {"source": e.source_id, "target": e.target_id, "label": e.label}
            )
            self.adj.setdefault(e.source_id, []).append((e.target_id, e.label))
            self.adj.setdefault(e.target_id, []).append((e.source_id, e.label))

    def _subgraph(self, ids: set) -> dict:
        return {
            "nodes": [self.nodes[i] for i in ids if i in self.nodes],
            "edges": [
                e for e in self.edges
                if e["source"] in ids and e["target"] in ids
            ],
        }

    def node(self, node_id: str) -> Optional[dict]:
        return self.nodes.get(node_id)

    def neighborhood(self, node_id: str, depth: int = 2) -> dict:
        if node_id not in self.nodes:
            return {"nodes": [], "edges": []}
        visited = {node_id}
        frontier = deque([(node_id, 0)])
        while frontier:
            cur, d = frontier.popleft()
            if d >= depth:
                continue
            for nb, _ in self.adj.get(cur, []):
                if nb not in visited:
                    visited.add(nb)
                    frontier.append((nb, d + 1))
        sub = self._subgraph(visited)
        sub["center"] = node_id
        return sub

    def path(self, a: str, b: str) -> dict:
        if a not in self.nodes or b not in self.nodes:
            return {"nodes": [], "edges": []}
        prev: Dict[str, Optional[str]] = {a: None}
        q = deque([a])
        while q:
            cur = q.popleft()
            if cur == b:
                break
            for nb, _ in self.adj.get(cur, []):
                if nb not in prev:
                    prev[nb] = cur
                    q.append(nb)
        if b not in prev:
            return {"nodes": [], "edges": []}
        chain: List[str] = []
        cur: Optional[str] = b
        while cur is not None:
            chain.append(cur)
            cur = prev[cur]
        chain.reverse()
        ids = set(chain)
        # 只保留路径相邻节点之间的边
        edges = []
        for i in range(len(chain) - 1):
            s, t = chain[i], chain[i + 1]
            for e in self.edges:
                if {e["source"], e["target"]} == {s, t}:
                    edges.append(e)
                    break
        return {"nodes": [self.nodes[i] for i in chain], "edges": edges, "order": chain}


# ── Neo4j 后端 ────────────────────────────────────────────────────────────────
class Neo4jGraphStore(GraphStore):
    def __init__(self) -> None:
        from neo4j import GraphDatabase

        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    @staticmethod
    def _node(rec) -> dict:
        t = list(rec.labels)[0].lower() if rec.labels else "node"
        return {
            "id": rec.get("id"),
            "label": rec.get("label"),
            "label_en": rec.get("label_en"),
            "type": t,
            "color": NODE_COLORS.get(t, "#888"),
            "meta": {},
        }

    def neighborhood(self, node_id: str, depth: int = 2) -> dict:
        # 变长路径深度不能参数化，故内联（depth 已转 int，无注入风险）
        cy = (
            f"MATCH (c {{id:$id}}) "
            f"OPTIONAL MATCH (c)-[*1..{int(depth)}]-(m) "
            "WITH c, collect(DISTINCT m) AS ms "
            "RETURN c AS center, ms AS nodes"
        )
        with self._driver.session() as s:
            rec = s.run(cy, id=node_id).single()
            if not rec:
                return {"nodes": [], "edges": []}
            seen = set()
            nodes = []
            for n in [rec["center"], *rec["nodes"]]:
                node = self._node(n)
                current_id = node.get("id")
                if not current_id or current_id in seen:
                    continue
                seen.add(current_id)
                nodes.append(node)
            ids = [n["id"] for n in nodes]
            edges = self._edges_among(s, ids)
            return {"nodes": nodes, "edges": edges, "center": node_id}

    def path(self, a: str, b: str) -> dict:
        cy = (
            "MATCH (x {id:$a}),(y {id:$b}), p=shortestPath((x)-[*..6]-(y)) "
            "RETURN nodes(p) AS ns, relationships(p) AS rs"
        )
        with self._driver.session() as s:
            rec = s.run(cy, a=a, b=b).single()
            if not rec:
                return {"nodes": [], "edges": []}
            nodes = [self._node(n) for n in rec["ns"]]
            edges = [
                {"source": r.start_node.get("id"), "target": r.end_node.get("id"),
                 "label": r.type}
                for r in rec["rs"]
            ]
            return {"nodes": nodes, "edges": edges, "order": [n["id"] for n in nodes]}

    def _edges_among(self, session, ids: List[str]) -> List[dict]:
        cy = (
            "MATCH (a)-[r]-(b) WHERE a.id IN $ids AND b.id IN $ids "
            "RETURN DISTINCT a.id AS s, b.id AS t, type(r) AS label"
        )
        out = []
        seen = set()
        for rec in session.run(cy, ids=ids):
            key = tuple(sorted([rec["s"], rec["t"]])) + (rec["label"],)
            if key in seen:
                continue
            seen.add(key)
            out.append({"source": rec["s"], "target": rec["t"], "label": rec["label"]})
        return out

    def node(self, node_id: str) -> Optional[dict]:
        with self._driver.session() as s:
            rec = s.run("MATCH (n {id:$id}) RETURN n", id=node_id).single()
            return self._node(rec["n"]) if rec else None


_neo4j_singleton: Optional[Neo4jGraphStore] = None


def get_graph_store(db: Session) -> GraphStore:
    if settings.graph_backend.lower() == "neo4j" and settings.neo4j_uri:
        global _neo4j_singleton
        if _neo4j_singleton is None:
            _neo4j_singleton = Neo4jGraphStore()
        return _neo4j_singleton
    return MemoryGraphStore(db)

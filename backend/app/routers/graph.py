from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..services.graph_store import get_graph_store

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


@router.get("/meta")
def meta() -> dict:
    return {"backend": get_settings().graph_backend}


@router.get("/concept/{node_id}/neighborhood")
def neighborhood(
    node_id: str,
    depth: int = Query(2, ge=1, le=4),
    db: Session = Depends(get_db),
) -> dict:
    """返回以某节点为中心、depth 跳内的子图。node_id 可为任意类型节点。"""
    store = get_graph_store(db)
    if store.node(node_id) is None:
        raise HTTPException(404, f"node {node_id} not found")
    return store.neighborhood(node_id, depth)


@router.get("/path")
def path(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    """两节点间最短路径（含路径上的节点与边）。"""
    store = get_graph_store(db)
    result = store.path(from_, to)
    if not result["nodes"]:
        raise HTTPException(404, f"no path between {from_} and {to}")
    return result

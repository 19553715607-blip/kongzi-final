"""RAG 检索质量评测：关键词 vs 向量。

评测集刻意采用「释义改写」与「跨语言」查询——表层字面与原文重叠很少，
正是关键词检索的短板、向量检索的长处。

指标：Hit@1 / Hit@3 / MRR。

用法：
    python -m app.eval_rag
"""
from __future__ import annotations

from typing import Callable, List, Tuple

from .db import SessionLocal, init_db
from .seed import seed_if_empty
from .services import retrieval, vector_store

# (查询, 语言, 期望命中的 ref_id 列表)
EVAL: List[Tuple[str, str, List[str]]] = [
    ("怎样克制自身的欲望、让言行回到规矩，才算成就德行", "zh", ["lunyu.yanyuan.12.1"]),
    ("与人相处该将心比心，不愿承受的就别强加给别人", "zh", ["lunyu.yanyuan.12.2"]),
    ("孔子回顾自己从少年到晚年各个人生阶段的修养历程", "zh", ["lunyu.weizheng.2.4"]),
    ("不断温习所学、又有志同道合的人来访，为何令人愉悦", "zh", ["lunyu.xueer.1.1"]),
    ("品德高尚的人看重道义，见识浅薄的人只盯着好处", "zh", ["lunyu.liren.4.16"]),
    ("What does it mean to restrain yourself and return to propriety?", "en", ["lunyu.yanyuan.12.1"]),
    ("the golden rule: don't do to others what you wouldn't want done to you", "en", ["lunyu.yanyuan.12.2"]),
    ("the difference between a noble-minded person and a petty one", "en", ["lunyu.liren.4.16"]),
    ("Confucius described the stages of his life at fifteen, thirty, forty", "en", ["lunyu.weizheng.2.4"]),
    ("the joy of lifelong learning and friends visiting from afar", "en", ["lunyu.xueer.1.1"]),
]


def _metrics(
    db, fn: Callable[..., List[retrieval.Evidence]], k: int = 3
) -> Tuple[float, float, float, List[Tuple[str, str, bool]]]:
    hit1 = hit3 = mrr = 0.0
    rows: List[Tuple[str, str, bool]] = []
    for query, lang, expected in EVAL:
        results = fn(db, query, lang=lang, k=k)
        ranked = [e.ref_id for e in results]
        top1 = ranked[0] if ranked else "—"
        ok1 = bool(ranked) and ranked[0] in expected
        ok3 = any(r in expected for r in ranked[:3])
        rank = next((i + 1 for i, r in enumerate(ranked) if r in expected), 0)
        hit1 += 1 if ok1 else 0
        hit3 += 1 if ok3 else 0
        mrr += (1.0 / rank) if rank else 0.0
        rows.append((query, top1, ok1))
    n = len(EVAL)
    return hit1 / n, hit3 / n, mrr / n, rows


def main() -> None:
    init_db()
    seed_if_empty()
    db = SessionLocal()
    try:
        # 确保向量库已建
        if vector_store.count() == 0:
            print("[eval] vector index empty, building...")
            vector_store.index_corpus(db, rebuild=False)

        print("\n================ RAG 检索质量评测 ================")
        print(f"评测集：{len(EVAL)} 条（释义改写 5 + 跨语言英文 5）\n")

        for name, fn in [
            ("关键词 keyword", retrieval.retrieve_keyword),
            ("向量 vector ", retrieval.retrieve_vector),
            ("混合 hybrid ", retrieval.retrieve_hybrid),
        ]:
            h1, h3, mrr, rows = _metrics(db, fn)
            print(f"── {name} ──  Hit@1={h1:.0%}  Hit@3={h3:.0%}  MRR={mrr:.3f}")
            for query, top1, ok in rows:
                mark = "✅" if ok else "❌"
                q = (query[:34] + "…") if len(query) > 35 else query
                print(f"    {mark} top1={top1:<22} ← {q}")
            print()
    finally:
        db.close()


if __name__ == "__main__":
    main()

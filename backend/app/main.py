from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from .routers import admin, admin_traffic, admin_write, auth, cases, chat, cocreate, comments, concepts, content, corpus, embed, feed, gamify, graph, health, institutions, journey, li_game, likes, math as math_router, openapi, reach, she, shu, topics, yu, yue
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    # 五语适配：幂等补齐既有库的译文 / 注释多语字段（新建库由 seed_if_empty 内部完成）
    try:
        from .db import SessionLocal
        from .seed_i18n_patch import apply_i18n_patch

        _db = SessionLocal()
        try:
            _counts = apply_i18n_patch(_db)
            if any(_counts.values()):
                print(f"[startup] i18n patch applied: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] i18n patch skipped ({exc})")
    # 五语语言包：幂等补齐议题名/描述、文明名、跨文明立场详情的 fr/es/ar（en）
    try:
        from .db import SessionLocal
        from .seed_lang_pack import apply_lang_pack

        _db = SessionLocal()
        try:
            apply_lang_pack(_db)
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] lang pack skipped ({exc})")
    # 六艺场景层：关卡标题/情境/提示/选项/明细的多语补丁（乐·御·数·书·礼）
    try:
        from .db import SessionLocal
        from .seed_scenario_i18n import apply_scenario_i18n

        _db = SessionLocal()
        try:
            _counts = apply_scenario_i18n(_db)
            _db.commit()
            if any(_counts.values()):
                print(f"[startup] scenario i18n applied: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] scenario i18n skipped ({exc})")
    # 经典层短字段：书目 / 篇名 / 人物 / 学派 / 命题的多语补齐
    try:
        from .db import SessionLocal
        from .seed_ref_i18n import apply_ref_i18n

        _db = SessionLocal()
        try:
            _counts = apply_ref_i18n(_db)
            if any(_counts.values()):
                print(f"[startup] ref i18n applied: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] ref i18n skipped ({exc})")
    # 注疏（Annotation）多语补齐：按 (passage_id, type) 补，古注与编者按各译各的
    try:
        from .db import SessionLocal
        from .seed_annotation_i18n import apply_annotation_i18n

        _db = SessionLocal()
        try:
            _counts = apply_annotation_i18n(_db)
            if _counts["updated"]:
                print(f"[startup] annotation i18n applied: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] annotation i18n skipped ({exc})")
    # 中文（现代汉语）译文补齐：缺 zh 行的经文补一条
    try:
        from .db import SessionLocal
        from .seed_zh_translations import apply_zh_translations

        _db = SessionLocal()
        try:
            _counts = apply_zh_translations(_db)
            if _counts["added"]:
                print(f"[startup] zh translations added: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] zh translations skipped ({exc})")
    # 已知错译的定点修复（幂等，仅在错译仍在库中时替换）
    try:
        from .db import SessionLocal
        from .repair_i18n import repair_translations

        _db = SessionLocal()
        try:
            _counts = repair_translations(_db)
            if _counts["repaired"]:
                print(f"[startup] translations repaired: {_counts}")
        finally:
            _db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] translation repair skipped ({exc})")
    # 向量后端：启动时确保索引就绪（auto/vector 模式且集合为空时构建）
    s = get_settings()
    # LLM 提供方自检：hunao 缺 key 时明确告警，避免首问才在流中报错
    if s.llm_provider.lower() == "hunao" and not s.hunao_api_key:
        print(
            "[startup] LLM_PROVIDER=hunao 但 HUNAO_API_KEY 为空："
            "/api/v1/chat 将直接返回错误，请填写 backend/.env 后重启"
        )
    if s.retrieval_backend.lower() in ("auto", "vector"):
        try:
            from .db import SessionLocal
            from .services import vector_store

            if vector_store.count() == 0:
                db = SessionLocal()
                try:
                    n = vector_store.index_corpus(db)
                    print(f"[startup] vector index built: {n} passages")
                finally:
                    db.close()
        except Exception as exc:  # noqa: BLE001  向量栈缺失时静默降级到关键词
            print(f"[startup] vector index skipped ({exc}); fallback to keyword")
    yield


settings = get_settings()

app = FastAPI(
    title="孔子 · 儒家语义交互平台 API",
    version="0.1.0",
    description="Stage 1 后端骨架：经典内容 + RAG 流式对话 + 概念图鉴。",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id"],
)

app.include_router(health.router)
app.include_router(content.router)
app.include_router(feed.router)
app.include_router(concepts.router)
app.include_router(graph.router)
app.include_router(topics.router)
app.include_router(cases.router)
app.include_router(corpus.router)
app.include_router(chat.router)
app.include_router(institutions.router)
app.include_router(openapi.router)
app.include_router(cocreate.router)
app.include_router(reach.router)
app.include_router(embed.router)
app.include_router(li_game.router)
app.include_router(she.router)
app.include_router(shu.router)
app.include_router(yue.router)
app.include_router(math_router.router)
app.include_router(yu.router)
app.include_router(journey.router)
app.include_router(auth.router)
app.include_router(gamify.router)
app.include_router(admin.router)
app.include_router(admin_write.router)
app.include_router(admin_traffic.router)
app.include_router(comments.public_router)
app.include_router(comments.admin_router)
app.include_router(likes.router)

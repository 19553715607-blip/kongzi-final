from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

# SQLite 需要 check_same_thread=False 以配合多线程的 FastAPI
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Stage 1 用 create_all 起步；进入多服务后切换到 Alembic 迁移
    from . import models  # noqa: F401  确保模型已注册

    Base.metadata.create_all(bind=engine)
    _lightweight_migrations()


def _lightweight_migrations() -> None:
    """对已存在的表补列（SQLite ALTER TABLE ADD COLUMN）。

    create_all 不会改已存在的表，这里手动补。只做"加可空列"这种安全操作，
    不做改类型/删列/改约束。生产应换 Alembic。
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)

    def _add_columns_if_missing(table: str, cols: list[tuple[str, str]]) -> None:
        if table not in insp.get_table_names():
            return
        existing = {c["name"] for c in insp.get_columns(table)}
        with engine.begin() as conn:
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))

    # PageEvent: 加 IP / 国家字段
    _add_columns_if_missing(
        "page_events",
        [
            ("ip", "TEXT"),
            ("country_code", "TEXT"),
            ("country_name", "TEXT"),
        ],
    )
    # User: 加注册 IP / 国家字段
    _add_columns_if_missing(
        "users",
        [
            ("signup_ip", "TEXT"),
            ("signup_country", "TEXT"),
            ("is_banned", "BOOLEAN NOT NULL DEFAULT 0"),
        ],
    )
    # 内容表：发布开关 + 溯源 meta（既有库补列；新库由 create_all 建）
    _add_columns_if_missing(
        "books",
        [
            ("is_published", "BOOLEAN NOT NULL DEFAULT 1"),
            ("meta", "JSON"),
        ],
    )
    _add_columns_if_missing(
        "chapters",
        [
            ("is_published", "BOOLEAN NOT NULL DEFAULT 1"),
            ("meta", "JSON"),
        ],
    )
    _add_columns_if_missing(
        "passages",
        [
            ("is_published", "BOOLEAN NOT NULL DEFAULT 1"),
        ],
    )
    _add_columns_if_missing(
        "concepts",
        [
            ("is_published", "BOOLEAN NOT NULL DEFAULT 1"),
            ("meta", "JSON"),
        ],
    )
    # Annotation: 加注疏出处标签的多语字段（与 content_i18n 同构）
    _add_columns_if_missing(
        "annotations",
        [
            ("source_i18n", "JSON"),
        ],
    )

    # Comment：楼中楼评论表。create_all 已按模型建表；这里用原生 DDL 兜底，
    # 确保既有库升级时表与复合索引（target_type,target_id,status）、(root_id) 一定存在。
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS comments (
                    id TEXT PRIMARY KEY,
                    target_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    visitor_id TEXT NOT NULL,
                    user_id TEXT,
                    author_name TEXT DEFAULT '',
                    content TEXT NOT NULL,
                    parent_id TEXT,
                    root_id TEXT,
                    status TEXT NOT NULL DEFAULT 'visible',
                    likes INTEGER NOT NULL DEFAULT 0,
                    report_count INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_target_type ON comments (target_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_target_id ON comments (target_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_status ON comments (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments (parent_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_root_id ON comments (root_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_visitor_id ON comments (visitor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_user_id ON comments (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_created_at ON comments (created_at)"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_comments_target ON comments (target_type, target_id, status)"
            )
        )

    # ContentLike：内容点赞表。create_all 已按模型建表；这里用原生 DDL 兜底既有库升级。
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS content_likes (
                    id TEXT PRIMARY KEY,
                    target_type TEXT NOT NULL DEFAULT 'passage',
                    target_id TEXT NOT NULL,
                    visitor_id TEXT NOT NULL,
                    user_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_likes_target_type ON content_likes (target_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_likes_target_id ON content_likes (target_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_likes_visitor_id ON content_likes (visitor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_likes_user_id ON content_likes (user_id)"))
        # 唯一约束：防同一访客对同一目标重复点赞
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_content_likes_target_visitor "
                "ON content_likes (target_type, target_id, visitor_id)"
            )
        )

"""Pool di connessioni PostgreSQL asincrone (psycopg 3) con supporto pgvector."""
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pgvector.psycopg import register_vector_async
from loguru import logger

from app.core.config import settings


_pool: Optional[AsyncConnectionPool] = None


async def _configure(conn: psycopg.AsyncConnection) -> None:
    """Configurazione per connessione: righe dict e adattatore pgvector."""
    await register_vector_async(conn)


async def init_db() -> None:
    global _pool
    if _pool is not None:
        return
    _pool = AsyncConnectionPool(
        conninfo=settings.DATABASE_URL,
        min_size=1,
        max_size=10,
        kwargs={"row_factory": dict_row},
        configure=_configure,
        open=False,
    )
    await _pool.open()
    logger.info(f"✓ DB pool opened → {settings.DATABASE_URL.split('@')[-1]}")


async def close_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("✓ DB pool closed")


@asynccontextmanager
async def get_conn() -> AsyncIterator[psycopg.AsyncConnection]:
    if _pool is None:
        await init_db()
    async with _pool.connection() as conn:  # type: ignore[union-attr]
        yield conn


async def fetch_one(sql: str, params: tuple = ()) -> Optional[dict]:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            return await cur.fetchone()


async def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            return await cur.fetchall()


async def execute(sql: str, params: tuple = ()) -> None:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)

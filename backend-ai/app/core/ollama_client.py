"""Async Ollama HTTP client (chat + embeddings)."""
from typing import AsyncIterator, List, Dict, Any
import json
import httpx
from loguru import logger

from app.core.config import settings


class OllamaClient:
    def __init__(self, host: str | None = None) -> None:
        self.host = (host or settings.OLLAMA_HOST).rstrip("/")
        self._http = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    async def aclose(self) -> None:
        await self._http.aclose()

    # ───────────────────── chat ─────────────────────
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str | None = None,
        options: dict | None = None,
    ) -> str:
        payload = {
            "model": model or settings.OLLAMA_DEFAULT_MODEL,
            "messages": messages,
            "stream": False,
            "options": options or {"temperature": 0.7},
        }
        r = await self._http.post(f"{self.host}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str | None = None,
        options: dict | None = None,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model or settings.OLLAMA_DEFAULT_MODEL,
            "messages": messages,
            "stream": True,
            "options": options or {"temperature": 0.7},
        }
        async with self._http.stream("POST", f"{self.host}/api/chat", json=payload) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msg = chunk.get("message", {})
                if (content := msg.get("content")):
                    yield content
                if chunk.get("done"):
                    break

    # ───────────────────── embeddings ─────────────────────
    async def embed(self, text: str, model: str | None = None) -> List[float]:
        payload = {
            "model": model or settings.OLLAMA_EMBED_MODEL,
            "prompt": text,
        }
        r = await self._http.post(f"{self.host}/api/embeddings", json=payload)
        r.raise_for_status()
        data = r.json()
        emb = data.get("embedding") or []
        if len(emb) != settings.PGVECTOR_DIM:
            logger.warning(
                f"Ollama returned embedding of dim {len(emb)}, "
                f"expected {settings.PGVECTOR_DIM} — adjust PGVECTOR_DIM if model differs."
            )
        return emb

    async def embed_many(self, texts: List[str], model: str | None = None) -> List[List[float]]:
        return [await self.embed(t, model) for t in texts]


ollama = OllamaClient()

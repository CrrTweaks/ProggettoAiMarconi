"""
═══════════════════════════════════════════════════════════════════
  AI School Workspace · FastAPI AI microservice
═══════════════════════════════════════════════════════════════════
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.db import init_db, close_db
from app.routers import chat, rag, concept_map, voice, suggest


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("⚡ Starting AI service…")
    await init_db()
    yield
    await close_db()
    logger.info("👋 AI service stopped")


app = FastAPI(
    title="AI School Workspace · AI Service",
    version="1.0.0",
    description="Local AI: chat, RAG, concept maps, voice (Ollama-powered).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "backend-ai",
        "ollama": settings.OLLAMA_HOST,
        "model": settings.OLLAMA_DEFAULT_MODEL,
    }


app.include_router(chat.router,        prefix="/chat",        tags=["chat"])
app.include_router(rag.router,         prefix="/rag",         tags=["rag"])
app.include_router(concept_map.router, prefix="/concept-map", tags=["concept-map"])
app.include_router(voice.router,       prefix="/voice",       tags=["voice"])
app.include_router(suggest.router,     prefix="/suggest",     tags=["suggest"])

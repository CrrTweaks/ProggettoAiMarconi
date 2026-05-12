"""Settings · loaded from .env via pydantic-settings."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # ── App ──
    AI_HOST: str = "0.0.0.0"
    AI_PORT: int = 8000

    # ── CORS ──
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4000",
        "http://127.0.0.1:5173",
    ]

    # ── Database ──
    DATABASE_URL: str = (
        "postgresql://postgres:postgres@localhost:5432/aischool"
    )

    # ── Ollama ──
    OLLAMA_HOST: str           = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str  = "llama3"
    OLLAMA_EMBED_MODEL: str    = "nomic-embed-text"
    PGVECTOR_DIM: int          = 768

    # ── RAG / PDF ──
    UPLOAD_DIR: str            = "./uploads"
    MAX_PDF_MB: int            = 25
    CHUNK_SIZE: int            = 800
    CHUNK_OVERLAP: int         = 120


settings = Settings()

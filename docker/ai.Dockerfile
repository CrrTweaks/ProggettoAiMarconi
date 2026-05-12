# ─────────────────────────────────────────────────────
#  FastAPI AI Backend · build context = project root
#  Build: docker build -f docker/ai.Dockerfile .
# ─────────────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps for PyPDF, pgvector adapter, audio (speech_recognition / pydub), gTTS
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ffmpeg \
        flac \
        libportaudio2 \
        libsndfile1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend-ai/ ./

RUN mkdir -p /app/uploads

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD curl -fsS http://localhost:${AI_PORT:-8000}/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

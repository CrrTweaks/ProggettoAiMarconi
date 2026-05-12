"""/rag · upload PDF, query against indexed corpus."""
import os
import uuid
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.chat import RagQueryRequest, RagQueryResponse, RagSource
from app.services import rag_service

router = APIRouter()

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: UUID = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_PDF_MB:
        raise HTTPException(413, f"PDF exceeds {settings.MAX_PDF_MB} MB limit")

    safe_name = f"{uuid.uuid4()}_{Path(file.filename).name}"
    target = Path(settings.UPLOAD_DIR) / safe_name
    target.write_bytes(contents)

    try:
        result = await rag_service.index_pdf(
            user_id=user_id,
            file_path=str(target),
            filename=file.filename,
            size_bytes=len(contents),
        )
    except ValueError as exc:
        target.unlink(missing_ok=True)
        raise HTTPException(422, str(exc))
    except Exception as exc:
        target.unlink(missing_ok=True)
        raise HTTPException(500, f"Indexing failed: {exc}")

    return {"ok": True, "document": result}


@router.post("/query", response_model=RagQueryResponse)
async def rag_query(req: RagQueryRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(400, "query required")

    sources = await rag_service.retrieve(
        user_id=req.user_id,
        query=req.query,
        top_k=req.top_k,
        document_ids=req.document_ids,
    )
    answer = await rag_service.answer_with_context(
        query=req.query,
        sources=sources,
        model=req.model,
    )
    return RagQueryResponse(
        answer=answer,
        sources=[
            RagSource(
                document_id=s["document_id"],
                chunk_id=s["id"],
                page=s["page"],
                similarity=float(s["similarity"]),
                content=s["content"][:500],
            )
            for s in sources
        ],
    )

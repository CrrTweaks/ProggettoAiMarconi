"""Crea una mappa concettuale sotto forma di grafo da testo o da un PDF."""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.core.db import get_conn
from app.schemas.chat import ConceptMapRequest, ConceptMapResponse, ConceptNode, ConceptEdge
from app.services import concept_map_service

router = APIRouter()


@router.post("", response_model=ConceptMapResponse)
async def build_concept_map(req: ConceptMapRequest):
    if not req.user_id:
        raise HTTPException(400, "user_id obbligatorio")
    if not req.text and not req.document_id:
        raise HTTPException(400, "Fornire 'text' oppure 'document_id'")

    text = req.text or ""
    if req.document_id:
        async with get_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT string_agg(content, E'\\n\\n' ORDER BY chunk_index) AS text
                       FROM pdf_chunks WHERE document_id=%s""",
                    (str(req.document_id),),
                )
                row = await cur.fetchone()
                if not row or not row.get("text"):
                    raise HTTPException(404, "Documento PDF non trovato o vuoto")
                text = (text + "\n\n" + row["text"]) if text else row["text"]

    try:
        graph = await concept_map_service.generate_concept_map(
            text=text,
            max_concepts=req.max_concepts,
            model=req.model,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception as exc:
        logger.exception("Concept map generation failed")
        raise HTTPException(500, f"Generazione fallita: {exc}")

    title = req.title or graph["title"]
    map_id = await concept_map_service.save_concept_map(
        user_id=req.user_id,
        title=title,
        graph=graph,
        source_text=req.text,
        source_pdf_id=req.document_id,
    )

    return ConceptMapResponse(
        map_id=map_id,
        title=title,
        nodes=[ConceptNode(**n) for n in graph["nodes"]],
        edges=[ConceptEdge(**e) for e in graph["edges"]],
    )

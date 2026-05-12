"""RAG pipeline · PDF text extraction → chunking → embeddings → pgvector → retrieval."""
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from loguru import logger

from app.core.config import settings
from app.core.db import get_conn
from app.core.ollama_client import ollama


# ───────────────────── PDF extraction ─────────────────────
def extract_pdf_text(path: str) -> List[dict]:
    """Return [{ 'page': i, 'text': str }, ...] (pages with non-empty text)."""
    reader = PdfReader(path)
    out: List[dict] = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = (page.extract_text() or "").strip()
        except Exception as exc:
            logger.warning(f"page {i} extract error: {exc}")
            text = ""
        if text:
            out.append({"page": i, "text": text})
    return out


# ───────────────────── Chunking ─────────────────────
def chunk_pages(pages: List[dict]) -> List[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks: List[dict] = []
    idx = 0
    for p in pages:
        for piece in splitter.split_text(p["text"]):
            if not piece.strip():
                continue
            chunks.append({"chunk_index": idx, "page": p["page"], "content": piece.strip()})
            idx += 1
    return chunks


# ───────────────────── Indexing ─────────────────────
async def index_pdf(
    user_id: UUID,
    file_path: str,
    filename: str,
    size_bytes: int,
) -> dict:
    pages = extract_pdf_text(file_path)
    if not pages:
        raise ValueError("PDF appears to contain no extractable text.")

    chunks = chunk_pages(pages)
    logger.info(f"PDF '{filename}': {len(pages)} pages → {len(chunks)} chunks")

    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO pdf_documents
                     (user_id, filename, storage_path, size_bytes, pages, status)
                   VALUES (%s,%s,%s,%s,%s,'processing')
                   RETURNING id""",
                (str(user_id), filename, file_path, size_bytes, len(pages)),
            )
            row = await cur.fetchone()
            doc_id = row["id"]

            # Embed + insert chunks
            for ch in chunks:
                emb = await ollama.embed(ch["content"])
                await cur.execute(
                    """INSERT INTO pdf_chunks
                         (document_id, chunk_index, page, content, embedding)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (doc_id, ch["chunk_index"], ch["page"], ch["content"], emb),
                )

            await cur.execute(
                "UPDATE pdf_documents SET status='ready' WHERE id=%s",
                (doc_id,),
            )
        await conn.commit()

    return {"id": str(doc_id), "filename": filename, "pages": len(pages), "chunks": len(chunks)}


# ───────────────────── Retrieval ─────────────────────
async def retrieve(
    user_id: Optional[UUID],
    query: str,
    top_k: int = 5,
    document_ids: Optional[List[UUID]] = None,
) -> List[dict]:
    qemb = await ollama.embed(query)
    user_param = str(user_id) if user_id else None
    doc_param  = [str(d) for d in document_ids] if document_ids else None

    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT * FROM match_pdf_chunks(%s, %s, %s, %s)""",
                (qemb, top_k, user_param, doc_param),
            )
            return await cur.fetchall()


# ───────────────────── Answer generation ─────────────────────
SYSTEM_RAG = (
    "Sei un assistente allo studio AI. Rispondi alla domanda dell'utente usando SOLO i "
    "brani di contesto forniti quando pertinenti. Se il contesto non contiene la risposta, dillo "
    "onestamente. Cita sempre i numeri di pagina tra parentesi quadre come [p.3]. "
    "Rispondi nella lingua dell'utente."
)


async def answer_with_context(
    query: str,
    sources: List[dict],
    model: Optional[str] = None,
    history: Optional[List[dict]] = None,
) -> str:
    if not sources:
        ctx = "(no relevant context found)"
    else:
        ctx = "\n\n".join(
            f"[p.{s['page']}] {s['content']}" for s in sources
        )
    history = history or []
    messages = [
        {"role": "system", "content": SYSTEM_RAG},
        *history,
        {"role": "user",   "content": f"Context:\n{ctx}\n\nQuestion: {query}"},
    ]
    return await ollama.chat(messages, model=model)

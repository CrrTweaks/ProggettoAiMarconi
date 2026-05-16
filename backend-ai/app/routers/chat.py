"""Chat senza streaming e con streaming SSE, con contesto RAG opzionale."""
import json
from uuid import UUID
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from app.core.config import settings
from app.core.ollama_client import ollama
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessage
from app.services import chat_service, rag_service, school_context_service

router = APIRouter()


_SCHOOL_KEYWORDS = (
    "compit", "verific", "esam", "interrog", "lezion", "argoment",
    "materi", "scuola", "studi", "ripass", "prossim", "scaden",
    "quando", "settiman", "calendar", "agenda", "homework", "exam",
    "test", "quiz",
)


def _is_school_related(req_messages: list) -> bool:
    """Heuristica: il contesto scolastico va iniettato solo se l'ultimo
    messaggio utente parla effettivamente di scuola, altrimenti il modello
    tende ad allucinare dati che non c'entrano nulla con la domanda."""
    last = next((m for m in reversed(req_messages) if m.role == "user"), None)
    if not last:
        return False
    text = (last.content or "").lower()
    return any(k in text for k in _SCHOOL_KEYWORDS)


def _build_messages(
    history: list[dict],
    req_messages: list,
    rag_context: str | None,
    school_context: str | None = None,
) -> list[dict]:
    msgs: list[dict] = [{"role": "system", "content": chat_service.SYSTEM_PROMPT}]
    if school_context and _is_school_related(req_messages):
        msgs.append({
            "role": "system",
            "content": (
                "L'utente ha fatto una domanda relativa alla scuola. Rispondi "
                "usando ESCLUSIVAMENTE i dati reali qui sotto. Se l'informazione "
                "richiesta non è presente, dillo chiaramente: NON inventare voci "
                "di compiti, verifiche o interrogazioni che non compaiono "
                "esplicitamente in questi dati. Non citare questi dati per "
                "saluti o domande generiche.\n\n" + school_context
            ),
        })
    if rag_context:
        msgs.append({
            "role": "system",
            "content": f"Usa il seguente contesto recuperato quando pertinente:\n{rag_context}",
        })
    msgs.extend(history)
    # L ultimo messaggio utente in req_messages e il nuovo turno
    for m in req_messages:
        msgs.append({"role": m.role, "content": m.content})
    return msgs


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.user_id:
        raise HTTPException(400, "user_id obbligatorio")
    if not req.messages:
        raise HTTPException(400, "messages obbligatorio")

    user_msg = req.messages[-1]
    if user_msg.role != "user":
        raise HTTPException(400, "L'ultimo messaggio deve essere dell'utente")

    model = req.model or settings.OLLAMA_DEFAULT_MODEL
    chat_row = await chat_service.get_or_create_chat(req.user_id, req.chat_id, model)
    chat_id = chat_row["id"]

    # Salva il messaggio utente
    await chat_service.append_message(chat_id, "user", user_msg.content)

    # Recupero RAG opzionale
    sources: list[dict] = []
    rag_context = None
    if req.use_rag:
        sources = await rag_service.retrieve(req.user_id, user_msg.content,
                                             top_k=5, document_ids=req.document_ids)
        if sources:
            rag_context = "\n\n".join(f"[p.{s['page']}] {s['content']}" for s in sources)

    school_context = (
        await school_context_service.build_user_context(req.user_id)
        if _is_school_related(req.messages) else None
    )

    history = await chat_service.load_history(chat_id, limit=20)
    history = history[:-1]  # remove the last user msg we just inserted, keep prior context
    messages = _build_messages(history, req.messages, rag_context, school_context)

    try:
        reply = await ollama.chat(messages, model=model)
    except Exception as exc:
        logger.exception("Ollama chat failed")
        raise HTTPException(502, f"Errore Ollama: {exc}")

    await chat_service.append_message(chat_id, "assistant", reply)

    # Titolo al primo turno
    if not chat_row.get("title") or chat_row["title"] in ("New chat", "Nuova chat"):
        title = user_msg.content.strip().split("\n")[0][:60] or "Nuova chat"
        await chat_service.update_chat_title(chat_id, title)

    return ChatResponse(
        chat_id=chat_id,
        message=ChatMessage(role="assistant", content=reply),
        sources=[{"page": s["page"], "content": s["content"][:300],
                  "document_id": str(s["document_id"]),
                  "similarity": s["similarity"]} for s in sources],
    )


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    if not req.user_id or not req.messages:
        raise HTTPException(400, "user_id e messages obbligatori")

    user_msg = req.messages[-1]
    if user_msg.role != "user":
        raise HTTPException(400, "L'ultimo messaggio deve essere dell'utente")

    model = req.model or settings.OLLAMA_DEFAULT_MODEL
    chat_row = await chat_service.get_or_create_chat(req.user_id, req.chat_id, model)
    chat_id = chat_row["id"]

    await chat_service.append_message(chat_id, "user", user_msg.content)

    sources: list[dict] = []
    rag_context = None
    if req.use_rag:
        sources = await rag_service.retrieve(req.user_id, user_msg.content,
                                             top_k=5, document_ids=req.document_ids)
        if sources:
            rag_context = "\n\n".join(f"[p.{s['page']}] {s['content']}" for s in sources)

    school_context = (
        await school_context_service.build_user_context(req.user_id)
        if _is_school_related(req.messages) else None
    )

    history = await chat_service.load_history(chat_id, limit=20)
    history = history[:-1]
    messages = _build_messages(history, req.messages, rag_context, school_context)

    async def event_stream():
        # Invia metadati chat e fonti in anticipo
        meta = {
            "chat_id": str(chat_id),
            "sources": [
                {"page": s["page"], "content": s["content"][:300],
                 "document_id": str(s["document_id"]),
                 "similarity": float(s["similarity"])}
                for s in sources
            ],
        }
        yield f"data: {json.dumps({'event': 'meta', 'data': meta})}\n\n"

        full = []
        try:
            async for chunk in ollama.chat_stream(messages, model=model):
                full.append(chunk)
                yield f"data: {json.dumps({'event': 'chunk', 'data': chunk})}\n\n"
        except Exception as exc:
            # Logga sempre l'errore lato server, altrimenti rimarrebbe nascosto
            # dentro lo stream SSE (HTTP risponde 200 ma l'evento è 'error').
            logger.exception(f"Ollama stream failed (model={model})")
            detail = str(exc)
            # httpx 4xx/5xx → estrai il messaggio di Ollama, tipicamente JSON
            resp = getattr(exc, "response", None)
            if resp is not None:
                try:
                    body = resp.json()
                    detail = body.get("error") or body.get("message") or detail
                except Exception:
                    detail = (resp.text or detail)[:300]
            yield f"data: {json.dumps({'event': 'error', 'data': f'Errore Ollama: {detail}'})}\n\n"
            return

        reply = "".join(full)
        await chat_service.append_message(chat_id, "assistant", reply)
        if not chat_row.get("title") or chat_row["title"] in ("New chat", "Nuova chat"):
            title = user_msg.content.strip().split("\n")[0][:60] or "Nuova chat"
            await chat_service.update_chat_title(chat_id, title)

        yield f"data: {json.dumps({'event': 'done', 'data': {'chat_id': str(chat_id)}})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform",
                                      "X-Accel-Buffering": "no"})

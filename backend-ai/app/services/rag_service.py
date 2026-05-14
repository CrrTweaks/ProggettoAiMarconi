"""Pipeline RAG: estrazione testo da PDF, segmentazione, embeddings, pgvector, recupero."""
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from loguru import logger

from app.core.config import settings
from app.core.db import get_conn
from app.core.ollama_client import ollama


# Estrazione PDF
def extract_pdf_text(path: str) -> List[dict]:
    """Restituisce pagine con testo non vuoto sotto forma di lista di dizionari."""
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


# Segmentazione
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


# Indicizzazione
async def index_pdf(
    user_id: UUID,
    file_path: str,
    filename: str,
    size_bytes: int,
) -> dict:
    pages = extract_pdf_text(file_path)
    if not pages:
        raise ValueError(
            "PDF appears to contain no extractable text. "
            "Possible causes: (1) scanned/image-only PDF without OCR, "
            "(2) corrupted file, or (3) text in unsupported encoding. "
            "Try a PDF with selectable text."
        )

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

            # Genera embedding e inserisce i chunk
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


# Recupero
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
                """SELECT * FROM match_pdf_chunks(%s::vector, %s, %s, %s)""",
                (qemb, top_k, user_param, doc_param),
            )
            return await cur.fetchall()


# Generazione risposta
SYSTEM_RAG_BASE = """Sei un tutor scolastico AI esperto. Rispondi SEMPRE e SOLO in italiano, usando ESCLUSIVAMENTE le informazioni presenti nei brani di contesto forniti.

REGOLE GENERALI:
- Se il contesto non contiene abbastanza informazioni, dillo chiaramente invece di inventare.
- Cita SEMPRE le pagine di riferimento usando il formato [p.N] (es. [p.3], [p.7-8]).
- Usa Markdown per strutturare la risposta: titoli (##, ###), elenchi puntati/numerati, **grassetto** per i termini chiave, tabelle quando utile, e blocchi di codice per formule o codice.
- Sii chiaro, didattico e conciso. Evita ripetizioni e frasi vuote.
- Non inserire mai disclaimer del tipo "come modello AI"."""

SYSTEM_RAG_QUIZ = """

MODALITÀ: GENERAZIONE QUIZ
Genera un quiz didattico ben strutturato basato esclusivamente sul contenuto fornito.

FORMATO OBBLIGATORIO (Markdown puro, NIENTE tag HTML come <details> o <summary>):

## Quiz: <titolo argomento>

### Domanda 1 — <tipo: scelta multipla / vero-falso / aperta breve>
**D:** <testo della domanda>
- A) <opzione>
- B) <opzione>
- C) <opzione>
- D) <opzione>

**Risposta corretta:** <lettera> — <breve spiegazione> [p.N]

---

### Domanda 2 — ...
(continua con lo stesso schema)

REGOLE STRETTE SUL FORMATO:
- Ogni domanda DEVE iniziare con `### Domanda N — <tipo>` (tre cancelletti, numero, trattino lungo —, tipo).
- La risposta DEVE essere su una singola riga che inizia con `**Risposta corretta:**`.
- NON usare mai `<details>`, `<summary>` o altro HTML: il frontend renderizza un'interfaccia interattiva a partire dal Markdown.
- Per domande aperte (senza opzioni A–D) ometti il blocco delle opzioni e nella riga risposta usa `**Risposta corretta:** — <testo della risposta> [p.N]` (lascia vuoto il posto della lettera).

LINEE GUIDA CONTENUTO:
- Genera 5–8 domande di difficoltà crescente, salvo diversa richiesta dell'utente.
- Mescola tipi: scelta multipla (4 opzioni con UNA sola corretta e distrattori plausibili), vero/falso, e 1–2 domande aperte brevi.
- Ogni domanda DEVE avere la fonte [p.N] nella riga risposta.
- Se il contesto è insufficiente per N domande, genera meno domande ma di qualità.
- ACCURATEZZA TECNICA: per domande su protocolli di rete e informatica, assicurati che la risposta sia tecnicamente corretta in base al contesto fornito.
  * Esempi: IP è connectionless e NON garantisce consegna né integrità dei dati (lo fa TCP). UDP è connectionless. TCP è connection-oriented e garantisce affidabilità.
  * Per domande vero/falso, la risposta deve essere inequivocabile. Se l'affermazione è falsa, la risposta corretta è Falso (o B se l'opzione B è "Falso").
  * Se una domanda vero/falso non ha opzioni A/B, usa il formato standard: A) Vero / B) Falso."""

SYSTEM_RAG_SUMMARY = """

MODALITÀ: RIASSUNTO / SINTESI
Produci un riassunto strutturato e gerarchico del materiale.

FORMATO:
## <Titolo argomento>

### 🎯 Idee chiave
- punto 1 [p.N]
- punto 2 [p.N]

### 📚 Concetti principali
**Concetto A** [p.N]: spiegazione concisa.
**Concetto B** [p.N]: spiegazione concisa.

### 🔗 Collegamenti / Conclusioni
Sintesi finale che lega i concetti."""

SYSTEM_RAG_EXPLAIN = """

MODALITÀ: SPIEGAZIONE DIDATTICA
Spiega l'argomento come faresti con uno studente, partendo dalle basi.

FORMATO:
## <Argomento>

### 💡 In breve
1–2 frasi che riassumono l'idea centrale [p.N].

### 📖 Spiegazione passo-passo
Paragrafi numerati o elencati, con esempi concreti dal testo.

### 🧩 Esempio pratico
Un esempio tratto o ispirato al contenuto [p.N].

### ⚠️ Errori comuni / Note
Eventuali precisazioni utili."""


def _detect_intent(query: str) -> str:
    """Classifica l intento dell utente per scegliere il prompt corretto."""
    q = query.lower()
    quiz_kw    = ("quiz", "domande", "test", "verifica", "esercizi", "interroga", "interrogami", "fammi un test")
    summary_kw = ("riassunt", "riassumi", "sintesi", "sintetizza", "schema", "punti chiave", "riepilog")
    explain_kw = ("spiega", "spiegazione", "spiegami", "cos'è", "cosa è", "come funziona", "perché", "perche")
    if any(k in q for k in quiz_kw):    return "quiz"
    if any(k in q for k in summary_kw): return "summary"
    if any(k in q for k in explain_kw): return "explain"
    return "default"


def _system_prompt_for(intent: str) -> str:
    extra = {
        "quiz":    SYSTEM_RAG_QUIZ,
        "summary": SYSTEM_RAG_SUMMARY,
        "explain": SYSTEM_RAG_EXPLAIN,
    }.get(intent, "")
    return SYSTEM_RAG_BASE + extra


async def answer_with_context(
    query: str,
    sources: List[dict],
    model: Optional[str] = None,
    history: Optional[List[dict]] = None,
) -> str:
    intent = _detect_intent(query)
    if not sources:
        ctx = "(nessun contesto pertinente trovato nei PDF dell'utente)"
    else:
        ctx = "\n\n---\n\n".join(
            f"[p.{s['page']}]\n{s['content']}" for s in sources
        )

    options = {
        "temperature": 0.3 if intent == "quiz" else 0.5,
        "num_ctx": 8192,
    }

    history = history or []
    messages = [
        {"role": "system", "content": _system_prompt_for(intent)},
        *history,
        {
            "role": "user",
            "content": (
                f"### Contesto estratto dai PDF\n{ctx}\n\n"
                f"### Richiesta dell'utente\n{query}"
            ),
        },
    ]
    return await ollama.chat(messages, model=model, options=options)

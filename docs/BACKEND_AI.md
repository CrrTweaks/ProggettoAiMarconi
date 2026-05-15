# Documentazione `backend-ai`

Microservizio AI di **AI School Workspace**. Espone API FastAPI per chat, RAG, mappe concettuali, voce e suggerimenti. Tutte le funzionalità sono basate su **Ollama** (LLM locale) e **PostgreSQL + pgvector** (embeddings).

---

## Stack

- **Framework**: FastAPI 0.115 + Uvicorn 0.30
- **Validazione**: Pydantic 2.x + pydantic-settings
- **AI Engine**: Ollama (chat + embeddings)
- **LangChain**: `langchain-text-splitters` per chunking
- **Vettori**: `pgvector` su PostgreSQL (`psycopg` 3 pool asincrona)
- **PDF**: `pypdf` (estrazione testo)
- **Voce**: `SpeechRecognition` (Google STT), `gTTS` (TTS), `pydub` (conversione formati)
- **Log**: Loguru

---

## Struttura

```
backend-ai/
  app/
    main.py                   # Entry point: lifespan, CORS, inclusione router
    core/
      config.py               # Pydantic Settings (.env)
      db.py                   # AsyncConnectionPool psycopg 3 + pgvector helpers
      ollama_client.py        # Client HTTP asincrono per Ollama
    routers/
      chat.py                 # Chat normale e streaming SSE
      rag.py                  # Upload PDF e query RAG
      concept_map.py          # Generazione mappe concettuali
      voice.py                # STT e TTS
      suggest.py              # Suggerimenti calendario AI
    services/
      chat_service.py         # Persistenza chat/messaggi
      rag_service.py          # Pipeline: estrazione → chunk → embedding → retrieval
      concept_map_service.py  # Generazione grafo concettuale via Ollama
      voice_service.py        # Transcrizione e sintesi vocale
      school_context_service.py # Contesto scolastico utente per risposte personalizzate
    schemas/
      chat.py                 # Modelli Pydantic (chat, RAG, mappe, voce, suggest)
  requirements.txt
```

---

## Avvio

```bash
cd backend-ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Sviluppo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Produzione
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Variabili d'ambiente (file `.env` a root progetto):

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `AI_HOST` | `0.0.0.0` | Bind host |
| `AI_PORT` | `8000` | Porta servizio |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/aischool` | Connessione PG |
| `OLLAMA_HOST` | `http://localhost:11434` | Endpoint Ollama |
| `OLLAMA_DEFAULT_MODEL` | `llama3` | Modello chat default |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Modello embeddings |
| `PGVECTOR_DIM` | `768` | Dimensione vettori embedding |
| `UPLOAD_DIR` | `./uploads` | Cartella salvataggio PDF |
| `MAX_PDF_MB` | `25` | Limite dimensione upload |
| `CHUNK_SIZE` | `800` | Caratteri per chunk RAG |
| `CHUNK_OVERLAP` | `120` | Sovrapposizione chunk |

---

## Moduli chiave

### `core/config.py`

Impostazioni caricate tramite `pydantic-settings` da `.env`. Supporta `env_file=('.env', '../.env')` per poter girare sia da root progetto che da cartella `backend-ai`. `extra='ignore'` evita crash su variabili non dichiarate.

### `core/db.py`

Pool asincrono `psycopg` 3 con:

- `row_factory=dict_row` — righe restituite come dizionari.
- `register_vector_async` — registra l'adattatore `pgvector` per ogni connessione.
- Pool min 1, max 10 connessioni.

Helper esposti:
- `init_db()` / `close_db()` — apertura/chiusura pool (chiamate dal `lifespan` di FastAPI).
- `get_conn()` — async context manager per una connessione dal pool.
- `fetch_one(sql, params)` — singola riga (o `None`).
- `fetch_all(sql, params)` — lista di righe.
- `execute(sql, params)` — INSERT/UPDATE/DELETE senza risultato.

### `core/ollama_client.py`

Client HTTP asincrono (`httpx.AsyncClient`) verso l'API Ollama locale.

Metodi:

- **`chat(messages, model, options)`** — chiamata sincrona a `POST /api/chat` con `stream=false`. Restituisce la stringa di risposta.
- **`chat_stream(messages, model, options)`** — streaming a `POST /api/chat` con `stream=true`. Yied token per token decodificando le linee JSON SSE di Ollama.
- **`embed(text, model)`** — genera embedding vettoriale via `POST /api/embeddings`. Verifica che la dimensione restituita combaci con `PGVECTOR_DIM`.
- **`embed_many(texts, model)`** — batch sequenziale di `embed()`.

Timeout impostato a 600 secondi per gestire modelli lenti.

---

## Router

### Chat (`/chat`)

File: `@/home/crr/Desktop/ProgettoPY/backend-ai/app/routers/chat.py`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/chat` | Chat completa con salvataggio messaggi e titolo auto. |
| `POST` | `/chat/stream` | **SSE streaming** della risposta. |

**Flusso chat completa** (`POST /chat`):
1. Valida `user_id` e `messages` (l'ultimo messaggio deve avere `role=user`).
2. Recupera o crea la chat (`chat_service.get_or_create_chat`).
3. Salva il messaggio utente.
4. Se `use_rag=true`, esegue retrieval semantico (`rag_service.retrieve`) con `top_k=5`.
5. Recupera il contesto scolastico dell'utente (`school_context_service.build_user_context`).
6. Carica la cronologia dei messaggi precedenti (`chat_service.load_history`).
7. Costruisce il payload per Ollama con system prompt + contesto scolastico + contesto RAG + cronologia.
8. Invia a Ollama (`ollama.chat`), salva la risposta e restituisce `ChatResponse`.
9. Se è il primo messaggio, genera il titolo dalla prima riga del prompt utente.

**Flusso streaming** (`POST /chat/stream`):
Identico alla chat completa, ma usa `ollama.chat_stream` e yied eventi SSE:
- `event: meta` — contiene `chat_id` e le fonti RAG.
- `event: chunk` — token singolo della risposta.
- `event: done` — fine stream.
- `event: error` — errore da Ollama.

Il messaggio completo viene salvato solo al termine dello stream.

**System prompt** (`chat_service.SYSTEM_PROMPT`):
Il prompt definisce "Aria" come tutor AI per studenti con regole rigide: rispondere sempre in italiano, usare sempre la seconda persona singolare (tu/hai/devi), essere conciso, non ripetere mai le istruzioni.

### RAG (`/rag`)

File: `@/home/crr/Desktop/ProgettoPY/backend-ai/app/routers/rag.py`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/rag/upload` | Riceve file PDF multipart, salva su disco, estrae testo, chunka e indicizza vettorialmente. |
| `POST` | `/rag/query` | Interroga il corpus recuperando chunk simili e generando una risposta contestualizzata. |

**Pipeline upload**:
1. Verifica estensione `.pdf` e dimensione (`MAX_PDF_MB`).
2. Salva con nome sicuro `uuid + filename` in `UPLOAD_DIR`.
3. Chiama `rag_service.index_pdf(user_id, file_path, filename, size_bytes)`:
   - `extract_pdf_text()` — `pypdf.PdfReader`, restituisce array `{page, text}`.
   - `chunk_pages()` — `RecursiveCharacterTextSplitter` (chunk 800, overlap 120) con separatori `\n\n`, `\n`, `. `, ` `, ``.
   - Inserisce il documento in `pdf_documents` con stato `processing`.
   - Per ogni chunk genera embedding con `ollama.embed()` e inserisce in `pdf_chunks`.
   - Aggiorna stato a `ready`.

**Pipeline query**:
1. Se la query contiene keyword di riassunto/quiz/spiegazione (`quiz`, `domande`, `riassumi`, `spiega`...), aumenta automaticamente `top_k` a 12 per avere più contesto.
2. `rag_service.retrieve()` — genera embedding della query e chiama la funzione SQL `match_pdf_chunks(query_embedding, top_k, user_id, document_ids)`.
3. `rag_service.answer_with_context()` — classifica l'intento (`quiz` / `summary` / `explain` / `default`) e costruisce un system prompt specializzato:
   - **quiz**: formato rigoroso Markdown con domande a scelta multipla, vero/falso e aperte. Ogni risposta deve terminare con `**Risposta corretta:**` e citare `[p.N]`.
   - **summary**: struttura gerarchica con idee chiave, concetti principali, collegamenti.
   - **explain**: spiegazione didattica passo-passo con esempio pratico.
   - **default**: risposta basata sui brani forniti, citando sempre le pagine.
4. La temperatura viene adattata (`0.3` per quiz, `0.5` per altri).

### Concept Map (`/concept-map`)

File: `@/home/crr/Desktop/ProgettoPY/backend-ai/app/routers/concept_map.py`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/concept-map` | Genera una mappa concettuale sotto forma di grafo JSON da testo libero o da un PDF caricato. |

Flusso:
1. Accetta `text` oppure `document_id`. Se si fornisce `document_id`, recupera il testo aggregato dalla tabella `pdf_chunks`.
2. `concept_map_service.generate_concept_map(text, max_concepts, model)`:
   - Costruisce un prompt che chiede esplicitamente un oggetto JSON con `title`, `nodes`, `edges`.
   - Richiede label in italiano anche se il testo è in inglese.
   - Esegue parsing con regex e retry una volta se il JSON è malformato.
   - Sanitizza nodi e archi (filtra nodi senza label, archi con source/target validi).
3. Salva il grafo in `concept_maps` come JSONB.
4. Restituisce `ConceptMapResponse` con `map_id`, `title`, `nodes`, `edges`.

### Voice (`/voice`)

File: `@/home/crr/Desktop/ProgettoPY/backend-ai/app/routers/voice.py`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/voice/transcribe` | Speech-to-text da file audio. |
| `POST` | `/voice/tts` | Text-to-speech, restituisce stream MP3. |

**Transcribe** (`voice_service.transcribe_audio`):
- Converte qualsiasi formato in WAV via `pydub`.
- Scrive in file temporaneo (richiesto da `speech_recognition`).
- Usa `recognize_google` (lang default `it-IT`).
- Fallback a `recognize_sphinx` se Google non è disponibile.
- Restituisce stringa vuota in caso di audio non riconoscibile.

**TTS** (`voice_service.synthesize_speech`):
- Usa `gTTS` (Google Text-to-Speech) per generare MP3.
- Tronca il testo a 5000 caratteri.
- Restituisce bytes audio grezzi in uno `StreamingResponse` FastAPI.

### Suggest (`/suggest`)

File: `@/home/crr/Desktop/ProgettoPY/backend-ai/app/routers/suggest.py`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/suggest/exam-day` | Suggerisce il giorno migliore per programmare una verifica basandosi sul carico scolastico. |

Logica ibrida:
1. Riceve un array `workload` con i dati giornalieri (`homework`, `exams`, `interrogations`).
2. Calcola uno **score deterministico** con euristica: `5.0 - (homework*0.5 + exams*1.5 + interrogations*1.0)`.
3. Ordina per score decrescente e sceglie il giorno migliore.
4. Chiede a Ollama una **motivazione breve** (max 50 parole) in italiano, forzandolo a citare solo il giorno scelto.
5. Valida la risposta LLM:
   - deve menzionare il giorno scelto;
   - NON deve menzionare altri giorni;
   - NON deve contenere timestamp ISO.
   Se la validazione fallisce, usa una spiegazione di fallback deterministica.

---

## Servizi

### `services/chat_service.py`

- `SYSTEM_PROMPT` — prompt di sistema con le regole di personalità e linguaggio di Aria.
- `get_or_create_chat(user_id, chat_id, model)` — restituisce la chat esistente o ne crea una nuova.
- `append_message(chat_id, role, content)` — inserisce messaggio e aggiorna `updated_at` della chat.
- `update_chat_title(chat_id, title)` — imposta il titolo (troncato a 200 char).
- `load_history(chat_id, limit)` — carica gli ultimi N messaggi in ordine cronologico.

### `services/rag_service.py`

- **`extract_pdf_text(path)`** — `pypdf.PdfReader`, restituisce `{page, text}` per ogni pagina non vuota.
- **`chunk_pages(pages)`** — `RecursiveCharacterTextSplitter` con separatori gerarchici.
- **`index_pdf(user_id, file_path, filename, size_bytes)`** — pipeline completa: estrazione → chunking → embedding → insert in transazione.
- **`retrieve(user_id, query, top_k, document_ids)`** — genera embedding query e chiama `match_pdf_chunks(...)`.
- **`answer_with_context(query, sources, model, history)`** — intent detection + costruzione system prompt specializzato + chiamata Ollama.

Prompt system specializzati:
- `SYSTEM_RAG_BASE` — regole generali (italiano, citare pagine, markdown, non inventare).
- `SYSTEM_RAG_QUIZ` — formato quiz rigoroso con opzioni e risposta corretta.
- `SYSTEM_RAG_SUMMARY` — struttura gerarchica del materiale.
- `SYSTEM_RAG_EXPLAIN` — spiegazione didattica passo-passo.

### `services/school_context_service.py`

`build_user_context(user_id, days_ahead=14)`:

Interroga PostgreSQL per costruire un riassunto Markdown del contesto scolastico imminente dell'utente:

- **Profilo**: nome, ruolo, data odierna.
- **Classi**: elenco materie a cui partecipa.
- **Compiti**: in scadenza nei prossimi 14 giorni, ordinati per data e priorità (⚠️ per priority >= 3).
- **Verifiche**: esami programmati con argomenti.
- **Interrogazioni**: con topic e data.
- **Lezioni recenti**: ultime 10 lezioni svolte negli ultimi 14 giorni.

Il testo risultante viene iniettato come messaggio di sistema nella chat, permettendo al modello di rispondere usando dati reali (es. "la tua prossima verifica di matematica è giovedì").

### `services/concept_map_service.py`

- **`generate_concept_map(text, max_concepts, model)`** — prompt strutturato che chiede JSON con `title`, `nodes` (id `n1`, `n2`...), `edges` (source/target/label). Retry automatico se il parsing fallisce.
- **`save_concept_map(user_id, title, graph, source_text, source_pdf_id)`** — serializza il grafo in JSONB su `concept_maps`.

### `services/voice_service.py`

- **`transcribe_audio(file_bytes, lang)`** — conversione formato → WAV → Google STT.
- **`synthesize_speech(text, lang)`** — gTTS → bytes MP3.

---

## Schema DB (tabelle AI)

Le tabelle seguenti sono definite in `@/home/crr/Desktop/ProgettoPY/database/schema.sql`.

### `ai_chats`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `title` | VARCHAR(200) | Default "Nuova chat" |
| `model` | VARCHAR(60) | Default `llama3` |
| `context` | JSONB | Metadati extra |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-update via trigger |

### `ai_messages`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | UUID PK | |
| `chat_id` | UUID FK → ai_chats | ON DELETE CASCADE |
| `role` | VARCHAR(20) | `system` / `user` / `assistant` |
| `content` | TEXT | |
| `tokens` | INTEGER | Opzionale |
| `created_at` | TIMESTAMPTZ | |

### `pdf_documents`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `filename` | VARCHAR(255) | Nome originale |
| `storage_path` | TEXT | Percorso su disco |
| `size_bytes` | BIGINT | |
| `pages` | INTEGER | |
| `status` | VARCHAR(20) | `processing` / `ready` |
| `metadata` | JSONB | |

### `pdf_chunks`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | UUID PK | |
| `document_id` | UUID FK → pdf_documents | |
| `chunk_index` | INTEGER | Ordine nel documento |
| `page` | INTEGER | Pagina di origine |
| `content` | TEXT | Testo del chunk |
| `embedding` | vector(768) | Vettore pgvector |

Indice: `ivfflat` su `embedding` con `vector_cosine_ops` (100 liste).

### `concept_maps`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `title` | VARCHAR(200) | |
| `source_text` | TEXT | Testo di origine |
| `source_pdf_id` | UUID FK → pdf_documents | Nullable |
| `graph` | JSONB | `{ nodes:[], edges:[] }` |

---

## Funzione SQL `match_pdf_chunks`

Definita in `@/home/crr/Desktop/ProgettoPY/database/schema.sql`:

```sql
CREATE OR REPLACE FUNCTION match_pdf_chunks(
  query_embedding vector(768),
  match_count     INT DEFAULT 5,
  filter_user_id  UUID DEFAULT NULL,
  filter_doc_ids  UUID[] DEFAULT NULL
)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, page INTEGER, similarity FLOAT)
```

Calcola la similarità coseno (`1 - (embedding <=> query_embedding)`) e restituisce i chunk più simili, filtrati per utente e/o lista di documenti. Usata da `rag_service.retrieve()`.

---

## Integrazione con `backend-node`

`backend-node` non chiama direttamente questi endpoint dall'esterno: li espone al frontend tramite il router `/ai`, aggiungendo `user_id` dall'utente autenticato e gestendo la persistenza dei metadati (chat, documenti, mappe) su PostgreSQL.

Il flusso tipico è:
1. Frontend → `POST /ai/chat` su Node.
2. Node inoltra `POST /chat` su FastAPI aggiungendo `user_id`.
3. FastAPI processa la richiesta con Ollama e risponde a Node.
4. Node restituisce la risposta al frontend.

Per lo streaming SSE, Node funge da proxy pass-through: apre uno stream verso FastAPI e rinvia ogni chunk al client mantenendo il formato SSE.

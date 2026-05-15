# Documentazione Backend

Panoramica dei due microservizi backend del progetto **AI School Workspace**.

---

## `backend-node` — API principale (Node.js / Express)

### Stack
- **Runtime**: Node.js ≥ 20 (ES modules)
- **Framework**: Express 4.x
- **Database**: PostgreSQL (driver `pg`), con supporto opzionale Supabase
- **Realtime**: Socket.io 4.x
- **Auth**: JWT (access + refresh), bcryptjs
- **Sicurezza**: Helmet, CORS, rate-limit (`express-rate-limit`), compression
- **Log**: Pino + pino-pretty

### Struttura
```
src/
  server.js          # Entry point: HTTP server + Socket.io
  app.js             # Factory Express: middleware + route
  config/
    env.js           # Validazione variabili d'ambiente
    logger.js        # Configurazione Pino
    db.js            # Connessione PostgreSQL
  routes/            # 11 router (auth, users, classes, calendar, ...)
  controllers/       # Business logic per ogni dominio
  middleware/        # Auth, error handler, ecc.
  services/
    socket.js        # Gestione Socket.io (room per user/role/chat)
    ai-proxy.js      # Client Axios verso backend-ai
  scripts/
    seed.js          # Seed dati iniziali
```

### Endpoint principali
| Prefisso | Descrizione |
|----------|-------------|
| `/auth` | Login, register, refresh, logout |
| `/users` | CRUD utenti e profili |
| `/classes` | Gestione classi |
| `/calendar` | Eventi calendario |
| `/homework` | Compiti |
| `/lessons` | Lezioni |
| `/absences` | Assenze |
| `/exams` | Verifiche |
| `/interrogations` | Interrogazioni |
| `/notifications` | Notifiche |
| `/ai` | **Proxy autenticato** verso `backend-ai` (chat, RAG, mappe, voce, suggest) |
| `/health` | Healthcheck |

### Funzionalità chiave
- **Proxy AI**: tutte le chiamate AI passano da `/ai` e vengono inoltrate al microservizio FastAPI. Node gestisce la persistenza storico chat, documenti RAG e mappe concettuali su PostgreSQL.
- **Streaming chat**: endpoint `/ai/chat/stream` usa SSE per lo streaming della risposta dal modello Ollama.
- **Socket.io**: autenticazione JWT in handshake; room personali (`user:<id>`), per ruolo (`role:<role>`) e per chat (`chat:<room>`).

### Avvio
```bash
cd backend-node
npm install
npm run dev        # node --watch src/server.js
npm start          # produzione
```

---

## `backend-ai` — Microservizio AI (Python / FastAPI)

### Stack
- **Framework**: FastAPI 0.115 + Uvicorn
- **AI Engine**: Ollama (locale) — chat + embeddings
- **LangChain**: `langchain`, `langchain-ollama`, `langchain-text-splitters`
- **Vettori**: `pgvector` su PostgreSQL (`psycopg` 3 + pool asincrona)
- **PDF**: `pypdf` (estrazione testo), chunking con LangChain
- **Voce**: `SpeechRecognition`, `gTTS`, `pydub`
- **Log**: Loguru

### Struttura
```
app/
  main.py              # Entry point: lifespan (init/close DB), router inclusion
  core/
    config.py          # Pydantic Settings (.env)
    db.py              # AsyncConnectionPool psycopg 3 + pgvector
    ollama_client.py   # Client HTTP asincrono per Ollama (chat, stream, embed)
  routers/
    chat.py            # Chat normale e streaming SSE
    rag.py             # Upload PDF, query RAG
    concept_map.py     # Generazione mappe concettuali
    voice.py           # STT (transcribe) e TTS
    suggest.py         # Suggerimenti AI (es. giorno verifica)
  services/
    chat_service.py           # CRUD chat/messaggi su DB
    rag_service.py            # Pipeline: estrazione → chunk → embedding → retrieval
    concept_map_service.py    # Generazione mappe concettuali via Ollama
    voice_service.py          # Transcrizione e sintesi vocale
    school_context_service.py # Contesto scolastico utente per risposte personalizzate
  schemas/
    chat.py            # Pydantic models chat
```

### Endpoint principali
| Prefisso | Descrizione |
|----------|-------------|
| `/chat` | Chat completa (con/senza streaming), storico, titolo auto |
| `/rag` | Upload PDF, query con retrieval semantico (`pgvector`) |
| `/concept-map` | Generazione mappe concettuali |
| `/voice` | Trascrivi audio (`/transcribe`) e sintesi vocale (`/tts`) |
| `/suggest` | Suggerimenti AI basati su workload (es. giorno migliore per verifica) |
| `/health` | Stato servizio + info Ollama |

### Funzionalità chiave
- **RAG completo**: upload PDF → estrazione testo (`pypdf`) → chunking (`RecursiveCharacterTextSplitter`) → embeddings Ollama (`nomic-embed-text`) → storage in `pgvector` → retrieval con `match_pdf_chunks()`.
- **Intent detection RAG**: il sistema classifica la richiesta (quiz / riassunto / spiegazione / default) e sceglie il system prompt adeguato.
- **Chat contestualizzata**: ogni messaggio utente può includere contesto scolastico (compiti, verifiche, interrogazioni) recuperato dinamicamente da PostgreSQL.
- **Streaming SSE**: endpoint `/chat/stream` restituisce eventi `meta` (chat_id, fonti), `chunk` (token), `done` / `error`.

### Configurazione (`.env`)
```
AI_HOST=0.0.0.0
AI_PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aischool
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
PGVECTOR_DIM=768
UPLOAD_DIR=./uploads
MAX_PDF_MB=25
CHUNK_SIZE=800
CHUNK_OVERLAP=120
```

### Avvio
```bash
cd backend-ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Comunicazione tra i servizi

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │──────│ backend-node│──────│ backend-ai  │
│  (React)    │      │  (Express)  │      │  (FastAPI)  │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                    │
                            └──── PostgreSQL ────┘
```

- Il **frontend** chiama sempre `backend-node`.
- `backend-node` funge da **API Gateway / proxy** verso `backend-ai` aggiungendo `user_id` e gestendo auth.
- `backend-node` persiste i **metadati** (chat, documenti, mappe) su PostgreSQL.
- `backend-ai` persiste i **chunk vettoriali** su PostgreSQL (schema `pgvector`) e interagisce con **Ollama** locale per LLM/embeddings.

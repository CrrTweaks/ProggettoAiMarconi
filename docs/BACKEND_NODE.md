# Documentazione `backend-node`

API Gateway principale di **AI School Workspace**. Espone REST API per il dominio scolastico, gestisce autenticazione, notifiche realtime e funge da proxy autenticato verso il microservizio AI.

---

## Stack

- **Runtime**: Node.js >= 20 (ES modules)
- **Framework**: Express 4.x
- **Database**: PostgreSQL (driver `pg`), con fallback SSL per Supabase
- **Realtime**: Socket.io 4.x
- **Auth**: JWT (access + refresh), bcryptjs
- **Sicurezza**: Helmet, CORS dinamico, `express-rate-limit`, compression, cookie-parser
- **Log**: Pino + pino-pretty (dev) / JSON (prod)

---

## Struttura

```
backend-node/
  src/
    server.js              # Entry point: HTTP server + Socket.io
    app.js                 # Factory Express: middleware + route
    config/
      env.js               # Validazione variabili d'ambiente
      logger.js            # Configurazione Pino
      db.js                # Pool PostgreSQL + helper query/transazioni
    middleware/
      auth.js              # JWT auth: requireAuth, requireRole, optionalAuth
      error.js             # HttpError, asyncHandler, errorHandler, notFound
    routes/
      auth.routes.js
      user.routes.js
      class.routes.js
      calendar.routes.js
      homework.routes.js
      lesson.routes.js
      absence.routes.js
      exam.routes.js
      interrogation.routes.js
      notification.routes.js
      ai-proxy.routes.js    # Proxy verso backend-ai
    controllers/
      auth.controller.js
      user.controller.js
      class.controller.js
      calendar.controller.js
      homework.controller.js
      lesson.controller.js
      absence.controller.js
      exam.controller.js
      interrogation.controller.js
      notification.controller.js
    services/
      socket.js             # Init Socket.io + helper emit
      ai-proxy.js           # Client Axios verso FastAPI
    utils/
      jwt.js                # Sign/verify access & refresh token
      password.js           # Hash/compare bcryptjs
    scripts/
      seed.js               # Popola dati iniziali
```

---

## Avvio

```bash
cd backend-node
npm install
npm run dev          # node --watch src/server.js
npm start            # node src/server.js
npm run seed         # node src/scripts/seed.js
```

Variabili d'ambiente principali (file `.env` a root progetto):

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NODE_ENV` | `development` | Ambiente |
| `NODE_HOST` | `0.0.0.0` | Bind host |
| `NODE_PORT` | `4000` | Porta API |
| `CORS_ORIGIN` | `http://localhost:5173` | Origini permesse (csv) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/aischool` | Connessione PG |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL microservizio AI |
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-me` | Segreto access token |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-me` | Segreto refresh token |
| `JWT_ACCESS_EXPIRES` | `15m` | TTL access token |
| `JWT_REFRESH_EXPIRES` | `7d` | TTL refresh token |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Finestra rate limit |
| `RATE_LIMIT_MAX` | `200` | Richieste max per finestra |

---

## Moduli chiave

### `config/env.js`

Caricatore centralizzato con funzione `required(key, fallback)` che emette un warning invece di crashare se una variabile è mancante in sviluppo. Supporta valori di default per tutti i parametri critici.

### `config/db.js`

Crea un `pg.Pool` con SSL automatico quando l'host contiene `supabase.co`.

- `query(text, params)` — esegue una query sul pool.
- `withTransaction(fn)` — esegue `fn(client)` dentro una transazione con `BEGIN` / `COMMIT` / `ROLLBACK` automatici.

### `config/logger.js`

Pino configurato con:
- Livello `debug` in dev, `info` in prod.
- Livello custom `http` (25) per i log di accesso.
- Transport `pino-pretty` in sviluppo con colori e timestamp tradotto.

### `middleware/auth.js`

- **`requireAuth`** — estrae il Bearer token dall'header `Authorization`, verifica la firma JWT e popola `req.user` con `{ id, email, role }`.
- **`requireRole(...roles)`** — restituisce middleware che blocca con 403 se `req.user.role` non è incluso.
- **`optionalAuth`** — come `requireAuth` ma non blocca in caso di token assente o invalido; utile per endpoint pubblici che possono personalizzarsi se l'utente è loggato.

### `middleware/error.js`

- **`HttpError`** — estende `Error` aggiungendo `status` e `details`.
- **`asyncHandler(fn)`** — wrapper che cattura le rejection delle funzioni async e le inoltra a `next(err)`.
- **`errorHandler`** — middleware Express per errori. Logga 500+ come error, 4xx come warn. Risponde con JSON `{ error, details? }`.
- **`notFound`** — risponde 404 per route non esistenti.

### `services/socket.js`

Inizializza Socket.io sul server HTTP condiviso.

- **Handshake JWT**: ogni socket deve presentare un token valido (da `socket.handshake.auth.token` o header `Authorization`). Il payload viene salvato in `socket.user`.
- **Room**: ogni socket joina automaticamente `user:<id>` e `role:<role>`.
- **Eventi supportati**: `chat:join`, `chat:leave`, `chat:typing`.
- **Helper pubblici**:
  - `emitToUser(userId, event, payload)`
  - `emitToRole(role, event, payload)`
  - `emitToRoom(room, event, payload)`

### `services/ai-proxy.js`

Client Axios verso `backend-ai` (timeout 120s). Interceptor che logga errori con Pino. Esporta helper:

- `aiChat(body)` → `POST /chat`
- `aiRagQuery(body)` → `POST /rag/query`
- `aiConceptMap(body)` → `POST /concept-map`
- `aiHealth()` → `GET /health`

---

## Router & Controllers

### Auth (`/auth`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/auth.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `POST` | `/auth/register` | Registra nuovo utente con hash bcrypt. Restituisce user, access e refresh token. |
| `POST` | `/auth/login` | Verifica credenziali, aggiorna `last_login_at`, emette token. |
| `POST` | `/auth/refresh` | Rinnova access token usando refresh token (da cookie o body). |
| `POST` | `/auth/logout` | Cancella il cookie `aiws_refresh`. |
| `GET`  | `/auth/me` | Profilo dell'utente autenticato. |

Il refresh token viene salvato in un cookie `httpOnly` (`aiws_refresh`) con path `/auth`, SameSite lax e secure in produzione.

### Users (`/users`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/user.controller.js`

| Metodo | Route | Auth | Descrizione |
|--------|-------|------|-------------|
| `GET`  | `/users` | autenticato | Lista utenti (max 200). Filtrabile per `?role=` e `?q=` (full_name/email). |
| `GET`  | `/users/:id` | autenticato | Dettaglio utente. |
| `PATCH`| `/users/me` | autenticato | Aggiorna profilo personale (`full_name`, `avatar_url`, `bio`, `preferences`). |
| `DELETE`| `/users/me` | autenticato | Soft delete (setta `deleted_at`). |

### Classes (`/classes`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/class.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/classes` | Lista classi visibili (admin = tutte; altri = possedute o membro). |
| `GET`  | `/classes/:id` | Dettaglio con membri e orario (`schedules`). |
| `POST` | `/classes` | Crea classe e inserisce il creatore come teacher nella tabella pivot. |
| `PATCH`| `/classes/:id` | Aggiorna dati classe. |
| `DELETE`| `/classes/:id` | Soft delete. |
| `POST` | `/classes/:id/members` | Aggiunge membro (`user_id`, `role`). |
| `DELETE`| `/classes/:id/members/:userId` | Rimuove membro. |

La creazione avviene in transazione per garantire atomicità.

### Calendar (`/calendar`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/calendar.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/calendar/events` | Aggregazione unificata (homework, exam, interrogation, lesson) in un singolo array ordinato. Supporta `?from=`, `?to=`, `?class_id=`. |
| `GET`  | `/calendar/workload` | Carico settimanale: per ogni giorno conta compiti, verifiche e interrogazioni. |

L'endpoint `events` usa `UNION ALL` per mescolare le 4 tabelle e restituire un formato omogeneo con `type`, `start_at`, `end_at`.

### Homework (`/homework`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/homework.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/homework` | Lista compiti visibili. Filtri: `class_id`, `from`, `to`. |
| `POST` | `/homework` | Crea compito. Invia notifica push+socket agli studenti della classe. |
| `PATCH`| `/homework/:id` | Aggiorna (usa `COALESCE` per partial update). |
| `DELETE`| `/homework/:id` | Soft delete (`deleted_at`). |

### Lessons (`/lessons`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/lesson.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/lessons` | Lista lezioni con join su classe e docente. |
| `POST` | `/lessons` | Crea lezione (`teacher_id` = utente corrente). |
| `PATCH`| `/lessons/:id` | Aggiorna lezione. |
| `DELETE`| `/lessons/:id` | Elimina fisicamente. |

### Absences (`/absences`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/absence.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/absences` | Studenti vedono solo le proprie; docenti/admin vedono tutte. Filtri: `user_id`, `class_id`, `from`, `to`. |
| `POST` | `/absences` | Registra assenza. |
| `PATCH`| `/absences/:id` | Aggiorna ore, giustifica, motivo. |
| `DELETE`| `/absences/:id` | Elimina fisicamente. |

### Exams (`/exams`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/exam.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/exams` | Lista verifiche visibili. Filtri: `class_id`, `from`, `to`. |
| `POST` | `/exams` | Crea verifica (`teacher_id` = corrente). Invia notifica agli studenti. |
| `PATCH`| `/exams/:id` | Aggiorna verifica. |
| `DELETE`| `/exams/:id` | Elimina fisicamente. |

### Interrogations (`/interrogations`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/interrogation.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/interrogations` | Lista interrogazioni. Studenti vedono solo le proprie. Filtri: `class_id`, `student_id`, `from`, `to`. |
| `POST` | `/interrogations` | Crea interrogazione. Se `student_id` è presente, notifica lo studente. |
| `PATCH`| `/interrogations/:id` | Aggiorna (incluso `grade` e `notes`). |
| `DELETE`| `/interrogations/:id` | Elimina fisicamente. |

### Notifications (`/notifications`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/controllers/notification.controller.js`

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| `GET`  | `/notifications` | Ultime 100 notifiche dell'utente. |
| `GET`  | `/notifications/unread-count` | Conteggio notifiche non lette. |
| `POST` | `/notifications/:id/read` | Marca come letta. |
| `POST` | `/notifications/read-all` | Marca tutte come lette. |

Esiste anche `pushNotification(userId, payload)` — helper usato da altri controller per creare una notifica DB + emetterla via socket.

---

## Proxy AI (`/ai`)

File: `@/home/crr/Desktop/ProgettoPY/backend-node/src/routes/ai-proxy.routes.js`

Tutti gli endpoint richiedono autenticazione (`requireAuth`). Node aggiunge automaticamente `user_id` prima di inoltrare la richiesta a `backend-ai`.

| Metodo | Route | Inoltro FastAPI | Descrizione |
|--------|-------|-----------------|-------------|
| `GET`  | `/ai/health` | `GET /health` | Healthcheck pass-through. |
| `POST` | `/ai/chat` | `POST /chat` | Chat completa. |
| `POST` | `/ai/chat/stream` | `POST /chat/stream` | **SSE streaming**. Node setta header per event-stream e pipe il chunk upstream. |
| `GET`  | `/ai/chats` | — (DB locale) | Lista chat dell'utente. |
| `GET`  | `/ai/chats/:id/messages` | — (DB locale) | Messaggi di una chat. |
| `DELETE`| `/ai/chats/:id` | — (DB locale) | Elimina chat. |
| `POST` | `/ai/rag/upload` | `POST /rag/upload` | Upload PDF per RAG. |
| `GET`  | `/ai/rag/documents` | — (DB locale) | Lista documenti PDF dell'utente. |
| `DELETE`| `/ai/rag/documents/:id` | — (DB locale) | Elimina documento. |
| `POST` | `/ai/rag/query` | `POST /rag/query` | Query RAG. |
| `POST` | `/ai/concept-map` | `POST /concept-map` | Genera mappa concettuale. |
| `GET`  | `/ai/concept-maps` | — (DB locale) | Lista mappe. |
| `GET`  | `/ai/concept-maps/:id` | — (DB locale) | Dettaglio mappa. |
| `POST` | `/ai/voice/transcribe` | `POST /voice/transcribe` | Speech-to-text. |
| `POST` | `/ai/voice/tts` | `POST /voice/tts` | Text-to-speech (restituisce stream audio). |
| `POST` | `/ai/suggest/exam-day` | `POST /suggest/exam-day` | Suggerimento giorno verifica. |

**Note tecniche streaming**: per `/ai/chat/stream`, Node:
1. Setta `Content-Encoding: identity`, `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
2. Disabilita Nagle (`req.socket.setNoDelay(true)`).
3. Apre una richiesta Axios con `responseType: "stream"` e timeout `0`.
4. Pipa i chunk dal server AI al client, gestendo `data`, `end`, `error` e `req.on('close')`.

---

## Schema DB (tabelle gestite da Node)

Il database è PostgreSQL con estensione `pgvector` (usata dal servizio AI per gli embedding). Le tabelle di dominio scolastico sono create da `@/home/crr/Desktop/ProgettoPY/database/schema.sql`.

### Tabelle principali
- **`users`** — profili, ruoli (`student`/`teacher`/`admin`), soft delete (`deleted_at`).
- **`classes`** — classi con owner e soft delete.
- **`class_members`** — relazione molti-a-molti tra utenti e classi.
- **`schedules`** — orario settimanale (`weekday`, `start_time`, `end_time`).
- **`homework`** — compiti con `due_date`, `priority` (1-3), `assigned_by`.
- **`lessons`** — lezioni/argomenti svolti (`taught_on`).
- **`absences`** — assenze con ore, giustifica, motivo.
- **`exams`** — verifiche con `scheduled_for`, `duration_min`, array `topics`.
- **`interrogations`** — interrogazioni con `student_id`, `grade`, `topic`.
- **`notifications`** — notifiche con `type`, `read_at`, payload JSONB `data`.

### Tabelle AI (Node persiste metadati, AI persiste contenuti)
- **`ai_chats`** — sessioni chat (`title`, `model`).
- **`ai_messages`** — messaggi di ogni chat (`role`, `content`).
- **`pdf_documents`** — metadati PDF uploadati (`filename`, `status`, `pages`).
- **`pdf_chunks`** — chunk vettoriali (popolati da `backend-ai`).
- **`concept_maps`** — grafo JSONB (`nodes`, `edges`).

---

## Sicurezza

- **Helmet**: header HTTP di sicurezza (`crossOriginResourcePolicy: cross-origin` per supportare asset da altri domini).
- **CORS**: origin dinamico. Lista esplicita in produzione; in dev accetta automaticamente `localhost` e `127.0.0.1` su qualsiasi porta.
- **Rate limit**: 200 richieste ogni 15 minuti (globale). Auth ha rate limit proprio più stringente.
- **JWT**: access token breve (15 min), refresh token lungo (7 gg) in cookie `httpOnly`.
- **Password**: hash bcrypt con salt automatico.
- **SQL injection**: tutte le query usano parametri `$1, $2, ...` del driver `pg`.

---

## Notifiche Realtime

Quando un docente crea compiti, verifiche o interrogazioni con uno studente assegnato:
1. Inserisce una riga in `notifications`.
2. Chiama `emitToUser(userId, "notification:new", notifica)`.
3. Il frontend riceve l'evento via socket e aggiorna il badge notifiche.

Le notifiche possono anche essere lette tramite REST e marcare come lette.

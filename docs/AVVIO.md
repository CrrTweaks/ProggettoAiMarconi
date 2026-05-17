# Guida all'Avvio — AI School Workspace

Questo documento spiega come avviare l'intero stack su **Windows** e su **Linux**, sia con **Docker** (consigliato) che in **modalità manuale** per lo sviluppo.

---

## Prerequisiti

| Sistema | Requisiti |
|---------|-----------|
| **Windows** | Docker Desktop (con WSL2 backend), Git, Ollama installato ed eseguito localmente |
| **Linux** | Docker Engine + Docker Compose v2, Git, (opzionale) NVIDIA Container Toolkit per GPU |

> **Nota su Ollama**
> - Su **Windows** Ollama gira **fuori da Docker** (si installa da [ollama.ai](https://ollama.ai)) e viene raggiunto dai container tramite `host.docker.internal`.
> - Su **Linux** Ollama viene gestito come **servizio Docker** all'interno del compose (`docker-compose.yml`).

---

## 1. Configurazione iniziale

Indipendentemente dal sistema operativo, crea il file `.env` nella root del progetto:

```bash
# Windows (PowerShell)
copy .env.example .env

# Linux (Bash)
cp .env.example .env
```

Modifica almeno questi valori:

```env
JWT_ACCESS_SECRET=<stringa-lunga-casuale>
JWT_REFRESH_SECRET=<altra-stringa-lunga-casuale>
```

Se usi **Supabase** invece del Postgres locale, inserisci anche `SUPABASE_URL` e le chiavi.

---

## 2. Avvio con Docker (consigliato)

### Windows

Assicurati che **Ollama** sia in esecuzione sulla taskbar di Windows, poi:

```powershell
# Prima build e avvio
docker compose -f docker-compose.windows.yml up --build

# Avvio senza rebuild (dopo la prima volta)
docker compose -f docker-compose.windows.yml up

# Avvio in background
docker compose -f docker-compose.windows.yml up -d

# Fermare tutto
docker compose -f docker-compose.windows.yml down

# Vedere i log
docker compose -f docker-compose.windows.yml logs -f

# Ricostruire solo un servizio (es. frontend)
docker compose -f docker-compose.windows.yml up --build frontend
```

### Linux

```bash
# Prima build e avvio
docker compose -f docker-compose.yml up --build

# Avvio senza rebuild
docker compose -f docker-compose.yml up

# Avvio in background
docker compose -f docker-compose.yml up -d

# Fermare tutto
docker compose -f docker-compose.yml down

# Vedere i log
docker compose -f docker-compose.yml logs -f

# Ricostruire solo un servizio (es. backend-ai)
docker compose -f docker-compose.yml up --build backend-ai
```

> **Suggerimento Linux GPU:** se hai una scheda NVIDIA e `nvidia-container-toolkit`, decommenta il blocco `deploy.resources` nel servizio `ollama` di `docker-compose.yml` per accelerare l'inferenza.

---

## 3. URL dei servizi dopo l'avvio

| Servizio | URL |
|----------|-----|
| Frontend | http://localhost:5174 |
| Node API | http://localhost:4000 |
| AI API (FastAPI) | http://localhost:8000 |
| Postgres | localhost:5432 |
| Ollama (solo Linux / Docker) | http://localhost:11434 |

---

## 4. Account di test (dopo il seed automatico)

Il database viene inizializzato automaticamente con gli script in `database/schema.sql` e `database/seed.sql`.

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | `admin@school.test` | `Admin123!` |
| Docente | `teacher@school.test` | `Teacher123!` |
| Studente | `student@school.test` | `Student123!` |

---

## 5. Avvio manuale (modalità sviluppo nativo)

Se preferisci non usare Docker, avvia ogni servizio in un terminale separato.

### 5.1 Avvia Postgres

Devi avere PostgreSQL 15+ con estensione `pgvector` installata.

```bash
# Crea il DB e applica schema/seed
psql postgresql://postgres:postgres@localhost:5432/aischool -f database/schema.sql
psql postgresql://postgres:postgres@localhost:5432/aischool -f database/seed.sql
```

### 5.2 Avvia Ollama

Su entrambi i sistemi, assicurati che Ollama sia attivo e scarica i modelli necessari:

```bash
ollama pull mistral
ollama pull nomic-embed-text
# opzionali
ollama pull llama3
ollama pull deepseek-coder
```

### 5.3 Backend Node.js

```bash
cd backend-node
npm install
npm run dev
```

Di default gira su `http://localhost:4000`.

### 5.4 Backend AI (FastAPI)

```bash
cd backend-ai
# crea virtualenv se vuoli
python -m venv venv
# Windows
venv\Scripts\activate
# Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Di default gira su `http://localhost:8000`.

### 5.5 Frontend

```bash
cd frontend
npm install
npm run dev
```

Di default gira su `http://localhost:5173` (o la porta configurata da Vite).

---

## 6. Differenze chiave tra i due compose

| Aspetto | `docker-compose.windows.yml` | `docker-compose.yml` (Linux) |
|---------|------------------------------|------------------------------|
| Ollama | Fuori da Docker (host locale) | Servizio Docker `ollama` incluso |
| Connessione AI→Ollama | `OLLAMA_HOST=http://host.docker.internal:11434` | `OLLAMA_HOST=http://ollama:11434` |
| GPU | Gestita dall'installer Ollama nativo | Opzionale via `deploy.resources` NVIDIA |
| Volume modelli | N/A (gestito da Ollama nativo) | `${HOME}/.ollama:/root/.ollama` |

---

## 7. Troubleshooting rapido

- **Porta già in uso:** chiudi altri container o servizi che usano `5432`, `4000`, `8000`, `5174`.
- **Ollama non raggiungibile (Windows):** verifica che Ollama sia avviato e raggiungibile da PowerShell con `ollama list`.
- **Modelli non trovati (Linux Docker):** esegui `docker compose -f docker-compose.yml exec ollama ollama pull mistral` dopo l'avvio.
- **Errori ESM nel backend-node:** usa sempre `npm run dev` (non `node server.js` direttamente).

---

## Riepilogo comandi veloci

```bash
# WINDOWS — build e avvio completo
docker compose -f docker-compose.windows.yml up --build

# LINUX — build e avvio completo
docker compose -f docker-compose.yml up --build
```

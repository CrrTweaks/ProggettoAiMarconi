# Seed dati demo

Questo documento descrive il dataset di esempio caricato all'avvio del database e fornisce **tutte le credenziali** per accedere al frontend.

## Come ricaricare il seed

Il dataset viene popolato in due passi:

1. **Schema + dati strutturali** — `database/schema.sql` + `database/seed.sql` vengono eseguiti automaticamente da Postgres alla prima inizializzazione del volume (`docker-entrypoint-initdb.d`).
2. **Hash password** — `database/seed.sql` inserisce password placeholder. Per renderle utilizzabili devi rigenerarle col bcrypt del backend Node:

```powershell
# resetta volumi (cancella tutti i dati) e riavvia
docker compose -f docker-compose.windows.yml down -v
docker compose -f docker-compose.windows.yml up -d --build

# attendi 5-10s che Postgres finisca l'init, poi:
docker compose -f docker-compose.windows.yml exec backend-node npm run seed
```

> Senza il secondo passaggio **NON puoi fare login**: gli hash nel SQL sono fittizi.

---

## Credenziali

Tutte le email sono nel dominio `@school.test`. Password identiche per ruolo, semplici da ricordare in dev.

### Admin (1)

| Email                | Password    | Nome           |
|----------------------|-------------|----------------|
| `admin@school.test`  | `Admin123!` | Admin School   |

### Insegnanti (5) — password unica `Teacher123!`

| Email                   | Nome              | Materia principale |
|-------------------------|-------------------|--------------------|
| `rossi@school.test`     | Maria Rossi       | Matematica         |
| `verdi@school.test`     | Giovanni Verdi    | Italiano           |
| `bianchi@school.test`   | Anna Bianchi      | Fisica             |
| `ferrari@school.test`   | Paolo Ferrari     | Storia / Filosofia |
| `esposito@school.test`  | Lucia Esposito    | Inglese            |

### Studenti (15) — password unica `Student123!`

#### Classe 3A

| Email                  | Nome             |
|------------------------|------------------|
| `conti@school.test`    | Luca Conti       |
| `romano@school.test`   | Sofia Romano     |
| `galli@school.test`    | Marco Galli      |
| `marini@school.test`   | Giulia Marini    |
| `greco@school.test`    | Davide Greco     |

#### Classe 4B

| Email                   | Nome              |
|-------------------------|-------------------|
| `bruno@school.test`     | Chiara Bruno      |
| `rizzi@school.test`     | Matteo Rizzi      |
| `fontana@school.test`   | Alessia Fontana   |
| `caruso@school.test`    | Riccardo Caruso   |
| `lombardi@school.test`  | Martina Lombardi  |

#### Classe 5A

| Email                   | Nome              |
|-------------------------|-------------------|
| `moretti@school.test`   | Andrea Moretti    |
| `barbieri@school.test`  | Elena Barbieri    |
| `mancini@school.test`   | Federico Mancini  |
| `colombo@school.test`   | Sara Colombo      |
| `rinaldi@school.test`   | Tommaso Rinaldi   |

---

## Cosa viene creato

### Classi (3)

| Nome                  | Anno scolastico | Color | Studenti |
|-----------------------|-----------------|-------|----------|
| 3A Liceo Scientifico  | 2025/2026       | blu   | 5        |
| 4B Liceo Scientifico  | 2025/2026       | verde | 5        |
| 5A Liceo Scientifico  | 2025/2026       | viola | 5        |

Tutti e 5 gli **insegnanti** sono iscritti a tutte e 3 le classi.

### Orario settimanale

5 ore di lezione fisse per classe distribuite tra Lunedì e Venerdì (Matematica, Italiano, Fisica, Storia/Filosofia, Inglese), in aule e laboratori dedicati.

### Compiti (16)

Distribuiti su tutte le classi e materie, con **scadenze relative a `CURRENT_DATE`** (alcuni già scaduti, la maggior parte nei prossimi 1-10 giorni). Priorità varie (1-3).

### Lezioni svolte (14)

Argomenti coerenti per livello classe negli ultimi ~10 giorni:

- **3A**: equazioni di II grado, Promessi Sposi, cinematica, Rivoluzione Francese.
- **4B**: studio di funzione, Leopardi, principi di Newton, Kant.
- **5A**: integrali, Pirandello, induzione elettromagnetica, Nietzsche.

### Verifiche (9)

3 per classe (matematica, materia letteraria, scientifica/altra), tutte programmate **da +4 a +20 giorni** rispetto a oggi.

### Interrogazioni (13)

Mix di:

- programmate (senza voto) nei prossimi 3-11 giorni;
- già svolte (con voto da 6.5 a 9.0 e note del docente) negli ultimi 4-12 giorni.

Almeno una interrogazione per ogni studente nominato.

### Assenze (3)

Esempi sparsi nelle 3 classi (giustificate e no).

### Notifiche

Per **ogni studente** vengono create 2 notifiche iniziali:

- una di tipo `homework` (compiti in scadenza)
- una di tipo `exam` (verifica programmata)

---

## Date relative

Tutte le date in `homework`, `lessons`, `exams`, `interrogations`, `absences` e `notifications` usano `CURRENT_DATE` / `NOW()` con un offset, quindi rimangono "fresche" ogni volta che ricarichi il seed.

---

## File coinvolti

- `@c:\Users\crist\OneDrive\Desktop\ProggettoAiMarconi\database\schema.sql` — definizione tabelle, enum, trigger e helper RAG.
- `@c:\Users\crist\OneDrive\Desktop\ProggettoAiMarconi\database\seed.sql` — dataset demo (utenti placeholder + classi + tutto il resto).
- `@c:\Users\crist\OneDrive\Desktop\ProggettoAiMarconi\backend-node\src\scripts\seed.js` — rehash bcrypt delle password (da eseguire dopo l'init Postgres).

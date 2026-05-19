# 🚀 PROMPT PER GEMINI PRO: GENERATORE DI SLIDE EDITABILI IN POWERPOINT (VBA)

Questa guida ti fornisce un **Master Prompt** eccezionale da dare in pasto a **Gemini Pro** (o Gemini Advanced). Il prompt è progettato per forzare l'AI a generare un codice **VBA (Visual Basic for Applications)** completo ed esente da errori. 

Eseguendo questa macro all'interno di PowerPoint, il sistema creerà automaticamente **tutte le 9 slide** del progetto *AI School Workspace*, applicando la palette cyberpunk scura, i layout asimmetrici, i box a schede, le icone e i diagrammi a blocchi logici. Il risultato sarà una presentazione **100% editabile direttamente in PowerPoint** (potrai cliccare su ogni testo, forma o colore e modificarlo a piacimento).

---

## 📖 GUIDA ALL'USO IN 5 PASSI (Come generare le slide in 60 secondi)

1. **Copia il Master Prompt:** Seleziona e copia interamente il testo presente nella sezione **"📥 MASTER PROMPT DA COPIARE"** qui sotto (tutto ciò che si trova all'interno del riquadro di testo).
2. **Incollalo in Gemini Pro:** Invia il prompt a Gemini Pro. L'AI analizzerà la struttura delle slide ed elaborerà un unico blocco di codice VBA.
3. **Copia il Codice VBA:** Una volta che Gemini ha terminato, copia il codice VBA generato (solitamente si chiama `Sub CreaPresentazioneAI()`).
4. **Apri PowerPoint su Windows:**
   * Crea una nuova presentazione vuota.
   * Premi la combinazione di tasti **`Alt + F11`** sulla tastiera per aprire l'editor VBA.
   * Nel menu in alto, fai clic su **`Inserisci`** ➔ **`Modulo`**.
   * Incolla il codice copiato all'interno dell'editor di testo bianco appena apparso.
5. **Esegui la Macro:**
   * Premi il tasto **`F5`** sulla tastiera o fai clic sull'icona verde **"Esegui Sub"** (il simbolo "Play" nella barra degli strumenti in alto).
   * Chiudi la finestra del VBA editor.
   * **Fatto!** Troverai la tua presentazione premium, con le 9 slide strutturate, i colori Deep Obsidian, Electric Cyan e Tech Violet, i box arrotondati, i diagrammi dei servizi e i testi pronti da modificare o esibire.

> [!TIP]
> **Transizione MORPH (Cangia):** Per un effetto "wow" estremo, una volta generata la presentazione, seleziona tutte le slide in PowerPoint (cliccandone una e premendo `Ctrl + A` nella barra laterale sinistra), vai sulla scheda **Transizioni** in alto e seleziona **Cangia (Morph)**. PowerPoint animerà automaticamente tutti i blocchi geometrici da una slide all'altra in modo cinematico!

---

## 📥 MASTER PROMPT DA COPIARE (Incollalo in Gemini Pro)

```text
Sei un ingegnere del software senior ed esperto designer di presentazioni PowerPoint. Il tuo compito è convertire l'outline della presentazione "AI School Workspace" in una macro VBA (Visual Basic for Applications) per Microsoft PowerPoint robusta, pulita ed esente da errori di compilazione, che generi un deck di 9 slide dall'aspetto premium, moderno ed estremamente accattivante.

La presentazione deve avere un design "Premium SaaS / Cyberpunk Dark Mode" con le seguenti specifiche grafiche rigide che devi implementare nel codice VBA:

### 🎨 TEMA GRAFICO E COSTANTI CROMATICHE (RGB)
Applica costantemente questi colori per sfondi, testi e forme:
- Sfondo Slide (Background): Deep Space Obsidian -> RGB(10, 14, 26) [Hex: #0A0E1A]
- Accento Primario (Elementi Chiave, Titoli Evidenziati): Electric Cyan -> RGB(0, 242, 254) [Hex: #00F2FE]
- Accento Secondario (Glow, Evidenziazioni): Tech Violet -> RGB(138, 43, 226) [Hex: #8A2BE2]
- Testo Primario: Pure Snow -> RGB(255, 255, 255) [Hex: #FFFFFF]
- Testo Secondario: Muted Slate -> RGB(148, 163, 184) [Hex: #94A3B8]
- Box e Card Scuri (Contenitori): Cyber Blue Gray -> RGB(24, 30, 48) [Hex: #181E30]
- Success Glow: Cyber Green -> RGB(0, 230, 118) [Hex: #00E676]

### 📐 REGOLE DI DESIGN ED EVITAMENTO BUG
1. Tutte le slide devono avere lo sfondo impostato su Deep Space Obsidian (RGB(10, 14, 26)).
2. NON usare i layout standard di PowerPoint. Imposta ogni slide su layout vuoto (ppLayoutBlank) e costruisci i componenti geometrici a mano per garantire simmetria visiva.
3. Evita sovrapposizioni di testo. Calcola accuratamente le coordinate 'Left', 'Top', 'Width' e 'Height' per ogni blocco.
4. Per inserire i testi, usa caselle di testo o forme arrotondate (msoShapeRoundedRectangle) impostate con riempimento color Cyber Blue Gray e bordi color Electric Cyan o Tech Violet.
5. Rimuovi i margini interni delle caselle di testo per evitare il troncamento delle parole:
   .TextFrame.MarginLeft = 10
   .TextFrame.MarginRight = 10
   .TextFrame.MarginTop = 5
   .TextFrame.MarginBottom = 5
   .TextFrame.WordWrap = msoTrue
6. Utilizza font moderni: "Outfit" o "Inter" per i Titoli, "Plus Jakarta Sans" o "Arial" per i testi di descrizione.
7. Ogni slide deve avere un titolo chiaro in Electric Cyan (dimensione 36-40, Bold) e un sottotitolo in Muted Slate (dimensione 16-18) in alto a sinistra.

### 🗂️ STRUTTURA DELLE 9 SLIDE DA GENERARE

Genera una macro chiamata `Sub CreaPresentazioneAI()` che crei le seguenti slide con layout altamente professionali ed enterprise-grade (evita semplici elenchi puntati orizzontali, preferisci griglie logiche strutturate):

#### Slide 1: Enterprise-Grade Local AI E-Learning Platform
- Layout Asimmetrico 60/40.
- A Sinistra (60%): Un grande box rettangolare arrotondato color Cyber Blue Gray con bordo Electric Cyan (simula la dashboard SaaS principale dell'applicazione) contenente una sintesi di valore del sistema.
- A Destra (40%): 3 card fluttuanti verticali sovrapposte (Cyber Blue Gray con bordo Tech Violet), ciascuna con un pilastro chiave dell'infrastruttura (Data Sovereignty & GDPR Security, Registro Intelligente, Universal Design & Accessibility).

#### Slide 2: Decoupled System Architecture & Vectorized Ledger
- Layout a Griglia con 4 blocchi connessi che illustra i componenti del backend e database.
- Tre box arrotondati orizzontali in alto:
  1. Client-Side UI (React 18 & Zustand) - Bordo Electric Cyan
  2. Security API Gateway (Node.js & JWT) - Bordo Tech Violet
  3. AI Orchestration Service (FastAPI) - Bordo Cyber Green
- Sotto i tre blocchi, posiziona un grande blocco orizzontale che li unisce tutti: "Unified Persistence Layer (Supabase PostgreSQL + pgvector Vector Ledger)".
- Scrivi all'interno di ogni box i relativi punti di forza e pro tecnologici.

#### Slide 3: Low-Latency Realtime Streaming: Server-Sent Events Proxy
- Split Layout 50/50.
- A Sinistra: Un box che simula un editor di codice (sfondo nero RGB(5, 5, 10)) contenente le ottimizzazioni di rete a livello di socket (disabilitazione dell'algoritmo di Nagle tramite setNoDelay(true), bypass di middleware GZIP/compressione in Express).
- A Destra: Un box che simula una console/terminale di rete scura (bordo Electric Cyan) che mostra lo stream asincrono asincrono dei Server-Sent Events (SSE).

#### Slide 4: Deterministic Context Grounding: Allucinazioni Zero
- Schema Piramidale o a Tre Livelli Verticali.
- Livello 1 (In alto): Box di input "Domanda Utente" (es. interazione e intento scolastico).
- Livello 2 (Al centro): Box "Parser Euristico dell'Intento & Query SQL Ottimizzate" (Bordo Tech Violet).
- Livello 3 (In basso): Box "System Prompt Iniettato con Record Didattici Reali (Orizzonte Temporale 14 Giorni)".

#### Slide 5: Document Retrieval-Augmented Generation (RAG)
- Layout Tripartito Lineare (Fase 1 ➔ Fase 2 ➔ Fase 3).
- Tre box allineati orizzontalmente con frecce logiche "➔" tra di essi:
  - Box 1: "Asynchronous Parsing & Chunking" (Lettura PDF e splittore ricorsivo a 800 caratteri)
  - Box 2: "Vector Embeddings Storage" (Modello locale a 768 dimensioni inserito in pgvector)
  - Box 3: "Semantic Match Query" (Stored procedure SQL match_pdf_chunks con similarità coseno)
- Aggiungi sotto i dettagli sulle citazioni automatiche [p. N] e la generazione di Quiz a risposta aperta.

#### Slide 6: Generative Concept Mapping & React Flow Engine
- Layout asimmetrico diagonale.
- A Sinistra: Box di testo grezzo non strutturato.
- A Destra: Un box grande con bordo Electric Cyan e nodi interni arrotondati interconnessi che rappresenta il grafo React Flow, con la spiegazione dell'algoritmo di recovery e auto-correzione sintattica a temperatura zero (0.0).

#### Slide 7: Hybrid Predictive Scheduling: Algoritmo Calendario
- Layout a Due Livelli Verticali.
- Livello Alto: Il Calcolo Deterministico (visualizza la formula matematica del carico pesato: Carico = 0.5*Compiti + 1.0*Interrogazioni + 1.5*Verifiche, e l'euristica di preferenza dei giorni centrali).
- Livello Basso: Spiegazione Semantica AI (un fumetto in Cyber Blue Gray con la spiegazione colloquiale e predittiva generata da Ollama per docenti e studenti).

#### Slide 8: Natural Audio Channels & Native Inclusivity
- Diagramma a due colonne contrapposte (Input Vocale vs Output Vocale).
- Colonna Sinistra (Input): Traccia la pipeline: Acquisizione WebM ➔ pydub Transcoding WAV PCM 16-bit ➔ Google Speech Recognition / CMU Sphinx Offline Fallback.
- Colonna Destra (Output): Traccia la pipeline: Risposta AI ➔ Generazione MP3 tramite gTTS ➔ Audio Player HTML5.

#### Slide 9: Enterprise Value Proposition & Local AI Revolution
- Layout a 3 Grandi Colonne Verticali (Card Elevate).
- Colonna 1: "Per gli Studenti" (Studio assistito, accessibilità DSA nativa, riduzione dell'ansia da carico didattico).
- Colonna 2: "Per i Docenti" (Pianificazione oggettiva supportata da dati reali, generazione rapida di quiz).
- Colonna 3: "Per l'Istituto" (GDPR Compliance 100%, zero costi di licenza o API a consumo, sovranità tecnologica on-premises).

### 🛠️ REQUISITI DEL CODICE VBA
- Il codice deve essere interamente autocontenuto in un unico blocco.
- Usa variabili fortemente tipizzate (es. `Dim pptPresentation As Presentation`, `Dim pptSlide As Slide`, `Dim shp As Shape`).
- Assicurati che non ci siano riferimenti a file esterni o immagini (usa solo forme geometriche native di PowerPoint come rettangoli arrotondati, frecce ed ellissi per rappresentare icone e grafi).
- Aggiungi commenti in italiano per descrivere le slide create.
- Fornisci unicamente il codice VBA all'interno di un blocco di codice markdown pronto per essere copiato.

Di seguito ti fornisco il testo dettagliato delle slide da inserire all'interno della macro VBA:

---
### 📌 CONTENUTO E TESTI DELLE SLIDE DA TRASFORMARE IN VBA:

#### Slide 1: Enterprise-Grade Local AI E-Learning Platform
*   **Titolo della Slide:** "AI School Workspace"
*   **Sottotitolo:** "Il Futuro della Didattica: Sicura, Predittiva e Inclusiva."
*   **Bullet Points Chiave:**
    - Data Sovereignty & GDPR Security: Totale sovranità sul dato scolastico sensibile grazie a modelli LLM open-source (Ollama/Llama 3) eseguiti a perimetro locale (on-premises), garantendo la totale compliance GDPR (PII Protection).
    - Registro Intelligente & Interfaccia Predittiva: Trasformazione del registro elettronico statico in un hub cognitivo asincrono a supporto dei flussi di lavoro di studenti e docenti.
    - Universal Design & Native Accessibility: Accesso equo al servizio tramite un canale vocale bidirezionale (STT/TTS) asincrono ottimizzato per DSA e bisogni educativi speciali.

#### Slide 2: Decoupled System Architecture & Vectorized Ledger
*   **Titolo della Slide:** "Disaccoppiamento Applicativo & Sicurezza"
*   **Sottotitolo:** "L'Architettura a Tre Livelli con Memoria Condivisa Vettoriale."
*   **Bullet Points Chiave:**
    - React 18 Single Page Application: Frontend ultra-reattivo governato da Zustand per lo stato globale e Tailwind CSS per una UX premium glassmorphism.
    - Enterprise Node.js API Gateway: Presidio di sicurezza basato su token JWT a doppia firma, controllo d'accesso granulare RBAC e comunicazioni in tempo reale via WebSocket.
    - Python FastAPI AI Microservice: Gestore asincrono ad alta efficienza per l'orchestrazione di pipeline RAG, sintesi vocale e calcoli predittivi di carico didattico.
    - Unified Supabase/PostgreSQL + pgvector Store: Unico database di persistenza relazionale integrato con estensione vettoriale, che minimizza i tempi di latenza e garantisce consistenza transazionale.

#### Slide 3: Low-Latency Realtime Streaming: Server-Sent Events Proxy
*   **Titolo della Slide:** "Senza Latenza: Live Streaming SSE"
*   **Sottotitolo:** "Server-Sent Events Multiplexing ed Express Proxying."
*   **Bullet Points Chiave:**
    - Asynchronous Token Streaming: Generazione nativa tramite FastAPI StreamingResponse con MIME-type text/event-stream ad aggancio rapido.
    - Express Chunk Proxying: Inoltro immediato dei chunk di dati senza buffering intermedio o compressione GZIP in memoria gateway.
    - Nagle's Algorithm Bypass (setNoDelay): Ottimizzazione TCP a basso livello sul socket di rete per forzare la trasmissione dei pacchetti IP senza delay indotti a livello kernel.
    - Zero-Latency UI Rendering: Renderizzazione progressiva dei token sul client con effetto macchina da scrivere per minimizzare la latenza percepita dall'utente.

#### Slide 4: Deterministic Context Grounding: Allucinazioni Zero
*   **Titolo della Slide:** "Eliminazione delle Allucinazioni"
*   **Sottotitolo:** "Iniezione Dinamica del Contesto Didattico Realtime."
*   **Bullet Points Chiave:**
    - Keyword Intent Parser: Filtro euristico preliminare sulle chiamate utente per intercettare query di registro didattico ed evitare colli di bottiglia computazionali sul DB.
    - Dynamic Context Extraction: Query automatiche SQL che estraggono scadenze, voti e compiti dell'utente autenticato per un intervallo temporale predittivo di 14 giorni.
    - Strict System Guardrails: Vincolo imperativo a livello prompt che limita il modello locale ad attenersi rigidamente e unicamente al contesto didattico reale iniettato.
    - Zero Data Leakage Boundary: Elaborazione locale totale che impedisce qualsiasi trasmissione di PII dello studente a server cloud di terze parti.

#### Slide 5: Document Retrieval-Augmented Generation (RAG)
*   **Titolo della Slide:** "RAG: Studio e Comprensione Documentale"
*   **Sottotitolo:** "Pipeline di Embedding Locale e Analisi Vettoriale."
*   **Bullet Points Chiave:**
    - Asynchronous Chunking & Parsing: Estrazione di PDF nativi tramite pypdf con suddivisione semantica ricorsiva a 800 caratteri (overlap 120).
    - pgvector Cosine Distance Querying: Stored procedure match_pdf_chunks per calcolare la distanza vettoriale coseno in millisecondi, velocizzata da indice ivfflat.
    - Nomic Embeddings Local Engine: Conversione semantica del testo tramite modello open-source a 768 dimensioni eseguito on-premises.
    - Verifiable AI Insights & Quiz Engine: Risposte adattive corredate da citazioni precise delle pagine sorgente [p. N] e generazione automatica di quiz didattici.

#### Slide 6: Generative Concept Mapping & React Flow Engine
*   **Titolo della Slide:** "Mappe Concettuali Dinamiche"
*   **Sottotitolo:** "Constraint JSON Output, Auto-Correction & React Flow Rendering."
*   **Bullet Points Chiave:**
    - Structured Entity-Relation Extraction: Prompting avanzato che forza l'LLM a produrre esclusivamente payload JSON formattati con array di Nodes ed Edges.
    - Two-Stage Self-Healing Pipeline: Rilevamento automatico di JSON corrotti, fallback a temperatura deterministica (0.0) e re-prompting istantaneo di correzione sintattica.
    - Dynamic React Flow Visualization: Interfaccia a grafo 100% interattiva con ricalcolo degli archi in tempo reale durante il dragging dei nodi.

#### Slide 7: Hybrid Predictive Scheduling: Algoritmo Calendario
*   **Titolo della Slide:** "Pianificazione Didattica Bilanciata"
*   **Sottotitolo:** "Algoritmo Ibrido Deterministico-Semantico per il Carico Didattico."
*   **Bullet Points Chiave:**
    - Quantitative Cognitive Load Score: Algoritmo deterministico pesato: Carico = (0.5 * Compiti) + (1.0 * Interrogazioni) + (1.5 * Verifiche).
    - Pedagogical Preference Heuristics: Assegnazione automatica di punteggi bonus ai giorni infrasettimanali centrali per prevenire burn-out e picchi da weekend (Mercoledì +0.2).
    - Explainable AI Commentary: Sintesi naturale di Ollama che argomenta in italiano corrente i vantaggi logistici del giorno ideale individuato dal calcolo.
    - Strict Output Validation: Meccanismo a backend che valida la consistenza delle date generate per evitare leak di timestamp e allucinazioni temporali.

#### Slide 8: Natural Audio Channels & Native Inclusivity
*   **Titolo della Slide:** "Inclusività & Assistenza Vocale"
*   **Sottotitolo:** "Speech-to-Text asincrono con CMU Sphinx Offline Fallback."
*   **Bullet Points Chiave:**
    - Dynamic Audio Transcoding: Conversione dinamica tramite pydub da flussi web compressi .webm in formato lossless WAV PCM 16-bit.
    - Dual-Engine Speech-to-Text: Trascrizione ibrida basata su Google Speech API online con fallback immediato offline su CMU Sphinx in caso di problemi di rete.
    - Zero-Latency Text-to-Speech: Generazione dinamica di risposte audio MP3 di alta qualità tramite motore di sintesi vocale (gTTS).
    - Inclusione WCAG & Accessibilità DSA: Interfaccia accessibile progettata per eliminare le barriere fisiche e mentali legate all'uso della tastiera.

#### Slide 9: Enterprise Value Proposition & Local AI Revolution
*   **Titolo della Slide:** "La Rivoluzione della Didattica Locale"
*   **Sottotitolo:** "AI School Workspace: Sicurezza, Zero Costi API, Efficacia Didattica."
*   **Bullet Points Chiave:**
    - Absolute Data Privacy: Garanzia totale di riservatezza sui dati sensibili dei minori grazie all'infrastruttura di calcolo on-premises (GDPR compliant).
    - Zero Costi Ricorrenti di Licenza: Modello di business sostenibile a costo marginale zero, slegato da API cloud a consumo di OpenAI o Google.
    - Algoritmi Ibridi di Ottimizzazione: Equilibrio perfetto tra rigore logico deterministico e intelligenza generativa discorsiva.
    - Production-Ready Deployment: Intero ecosistema containerizzato con Docker Compose, configurato e pronto per la distribuzione con un solo comando.
---
```

---

## 💡 COME PERSONALIZZARE IL PROGETTO (Modificabilità Assoluta)

Una volta eseguita la macro in PowerPoint, potrai personalizzare la presentazione nei seguenti modi:
* **Testi e Font:** Fai doppio clic su qualsiasi testo per riscriverlo o cambiare la dimensione del carattere.
* **Colori delle Card e degli Sfondi:** Clicca con il tasto destro su qualsiasi forma geometrica (card, blocchi dell'architettura o frecce), seleziona *Formato forma* e cambia il colore di riempimento o del bordo per adattarlo al tuo gusto.
* **Aggiungere Immagini e Screenshot reali:** Puoi eliminare i rettangoli segnaposto (es. il box screenshot nella Slide 1 o il box console nella Slide 3) e incollare al loro posto gli screenshot reali catturati durante le tue demo o presi dall'applicazione in esecuzione.
* **Layout ed Elementi grafici:** Trascina i blocchi logici o le frecce per modificare il layout dei diagrammi o aggiungere nuovi nodi al sistema.

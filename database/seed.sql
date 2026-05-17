-- ════════════════════════════════════════════════════════════════
--  AI School Workspace · Seed dati demo realistici
--
--  ⚠️  Le password_hash qui sotto sono PLACEHOLDER non funzionanti.
--      Per generare gli hash bcrypt veri esegui DOPO l'avvio:
--          docker compose exec backend-node npm run seed
--      (oppure `npm run seed` da backend-node/ in locale)
--
--  Account creati (vedi docs/SEED_DATA.md per la tabella completa):
--    Admin     : admin@school.test           / Admin123!
--    Teachers  : <nome>@school.test          / Teacher123!
--    Students  : <cognome>@school.test       / Student123!
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- Helper SQL · giorno scolastico valido
--   - Esclude sabato e domenica (settimana corta)
--   - Esclude le festività e i ponti dell'a.s. 2025/2026
-- Le funzioni sono usate per garantire che TUTTE le date inserite
-- nel seed cadano in un giorno scolastico valido.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.is_school_day(d date) RETURNS boolean AS $$
BEGIN
  IF EXTRACT(DOW FROM d) IN (0, 6) THEN RETURN FALSE; END IF;
  IF d = DATE '2025-11-01' THEN RETURN FALSE; END IF;
  IF d = DATE '2025-12-08' THEN RETURN FALSE; END IF;
  IF d BETWEEN DATE '2025-12-23' AND DATE '2026-01-06' THEN RETURN FALSE; END IF;
  IF d BETWEEN DATE '2026-02-16' AND DATE '2026-02-17' THEN RETURN FALSE; END IF;
  IF d BETWEEN DATE '2026-04-02' AND DATE '2026-04-07' THEN RETURN FALSE; END IF;
  IF d = DATE '2026-04-25' THEN RETURN FALSE; END IF;
  IF d = DATE '2026-05-01' THEN RETURN FALSE; END IF;
  IF d = DATE '2026-06-02' THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.next_school_day(d date) RETURNS date AS $$
DECLARE cur date := d;
BEGIN
  FOR i IN 1..90 LOOP
    IF pg_temp.is_school_day(cur) THEN RETURN cur; END IF;
    cur := cur + 1;
  END LOOP;
  RETURN cur;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.prev_school_day(d date) RETURNS date AS $$
DECLARE cur date := d;
BEGIN
  FOR i IN 1..90 LOOP
    IF pg_temp.is_school_day(cur) THEN RETURN cur; END IF;
    cur := cur - 1;
  END LOOP;
  RETURN cur;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Overload: CURRENT_DATE + INTERVAL '...' ritorna timestamp, non date.
-- Questi overload accettano timestamp e delegano alla versione date.
CREATE OR REPLACE FUNCTION pg_temp.next_school_day(ts timestamp) RETURNS date AS $$
BEGIN RETURN pg_temp.next_school_day(ts::date); END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.prev_school_day(ts timestamp) RETURNS date AS $$
BEGIN RETURN pg_temp.prev_school_day(ts::date); END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.next_school_ts(ts timestamptz) RETURNS timestamptz AS $$
DECLARE
  d  date := ts::date;
  nd date := pg_temp.next_school_day(d);
BEGIN
  RETURN ts + make_interval(days => (nd - d));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.prev_school_ts(ts timestamptz) RETURNS timestamptz AS $$
DECLARE
  d  date := ts::date;
  nd date := pg_temp.prev_school_day(d);
BEGIN
  RETURN ts + make_interval(days => (nd - d));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Hash placeholder: 'Password123!' fittizio (il seed Node lo sostituisce)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, primary_subject) VALUES
  -- Admin
  ('10000000-0000-0000-0000-000000000001', 'admin@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Admin School', 'admin', NULL),

  -- Teachers
  ('20000000-0000-0000-0000-000000000001', 'rossi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Maria Rossi',     'teacher', 'Matematica'),
  ('20000000-0000-0000-0000-000000000002', 'verdi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Giovanni Verdi',  'teacher', 'Italiano'),
  ('20000000-0000-0000-0000-000000000003', 'bianchi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Anna Bianchi',    'teacher', 'Fisica'),
  ('20000000-0000-0000-0000-000000000004', 'ferrari@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Paolo Ferrari',   'teacher', 'Storia'),
  ('20000000-0000-0000-0000-000000000005', 'esposito@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Lucia Esposito',  'teacher', 'Inglese'),

  -- Students classe 3A (5)
  ('30000000-0000-0000-0000-000000000001', 'conti@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Luca Conti',      'student', NULL),
  ('30000000-0000-0000-0000-000000000002', 'romano@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Sofia Romano',    'student', NULL),
  ('30000000-0000-0000-0000-000000000003', 'galli@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Marco Galli',     'student', NULL),
  ('30000000-0000-0000-0000-000000000004', 'marini@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Giulia Marini',   'student', NULL),
  ('30000000-0000-0000-0000-000000000005', 'greco@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Davide Greco',    'student', NULL),

  -- Students classe 4B (5)
  ('30000000-0000-0000-0000-000000000006', 'bruno@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Chiara Bruno',    'student', NULL),
  ('30000000-0000-0000-0000-000000000007', 'rizzi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Matteo Rizzi',    'student', NULL),
  ('30000000-0000-0000-0000-000000000008', 'fontana@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Alessia Fontana', 'student', NULL),
  ('30000000-0000-0000-0000-000000000009', 'caruso@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Riccardo Caruso', 'student', NULL),
  ('30000000-0000-0000-0000-000000000010', 'lombardi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Martina Lombardi','student', NULL),

  -- Students classe 5A (5)
  ('30000000-0000-0000-0000-000000000011', 'moretti@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Andrea Moretti',  'student', NULL),
  ('30000000-0000-0000-0000-000000000012', 'barbieri@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Elena Barbieri',  'student', NULL),
  ('30000000-0000-0000-0000-000000000013', 'mancini@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Federico Mancini','student', NULL),
  ('30000000-0000-0000-0000-000000000014', 'colombo@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Sara Colombo',    'student', NULL),
  ('30000000-0000-0000-0000-000000000015', 'rinaldi@school.test',
   '$2a$12$placeholder0000000000000000000000000000000000000000000', 'Tommaso Rinaldi', 'student', NULL)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Classi
-- ─────────────────────────────────────────────────────────────────
INSERT INTO classes (id, name, description, school_year, subject, color, owner_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '3A Liceo Scientifico',
   'Terza A indirizzo scientifico', '2025/2026', 'Generale', '#3b82f6',
   '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '4B Liceo Scientifico',
   'Quarta B indirizzo scientifico', '2025/2026', 'Generale', '#10b981',
   '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '5A Liceo Scientifico',
   'Quinta A indirizzo scientifico', '2025/2026', 'Generale', '#a855f7',
   '20000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Iscrizioni: tutti i docenti seguono tutte le classi; gli studenti
-- sono ripartiti su una sola classe.
-- ─────────────────────────────────────────────────────────────────
INSERT INTO class_members (class_id, user_id, role)
SELECT c.id, t.id, 'teacher'
FROM classes c
CROSS JOIN users t
WHERE c.id IN (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003'
)
  AND t.role = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO class_members (class_id, user_id, role) VALUES
  -- 3A
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'student'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'student'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'student'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'student'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'student'),
  -- 4B
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'student'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 'student'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', 'student'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', 'student'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000010', 'student'),
  -- 5A
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000011', 'student'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000012', 'student'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000013', 'student'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000014', 'student'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000015', 'student')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Orario settimanale (weekday: 1=lun .. 5=ven)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO schedules (class_id, weekday, start_time, end_time, subject, room, teacher_id) VALUES
  -- 3A
  ('40000000-0000-0000-0000-000000000001', 1, '08:00', '09:00', 'Matematica', 'Aula 12', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', 1, '09:00', '10:00', 'Italiano',   'Aula 12', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000001', 2, '10:00', '11:00', 'Fisica',     'Lab Fis', '20000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000001', 3, '08:00', '09:00', 'Storia',     'Aula 12', '20000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000001', 4, '11:00', '12:00', 'Inglese',    'Aula 12', '20000000-0000-0000-0000-000000000005'),
  -- 4B
  ('40000000-0000-0000-0000-000000000002', 1, '10:00', '11:00', 'Matematica', 'Aula 21', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 2, '08:00', '09:00', 'Italiano',   'Aula 21', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', 3, '11:00', '12:00', 'Fisica',     'Lab Fis', '20000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000002', 4, '09:00', '10:00', 'Filosofia',  'Aula 21', '20000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000002', 5, '08:00', '09:00', 'Inglese',    'Aula 21', '20000000-0000-0000-0000-000000000005'),
  -- 5A
  ('40000000-0000-0000-0000-000000000003', 1, '11:00', '12:00', 'Matematica', 'Aula 30', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', 2, '09:00', '10:00', 'Italiano',   'Aula 30', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', 3, '10:00', '11:00', 'Fisica',     'Lab Fis', '20000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003', 4, '08:00', '09:00', 'Filosofia',  'Aula 30', '20000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000003', 5, '11:00', '12:00', 'Inglese',    'Aula 30', '20000000-0000-0000-0000-000000000005');

-- ─────────────────────────────────────────────────────────────────
-- Compiti (mix di scaduti, in scadenza e futuri)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO homework (class_id, title, description, subject, due_date, assigned_by, priority) VALUES
  -- 3A
  ('40000000-0000-0000-0000-000000000001', 'Esercizi cap. 5', 'Pag. 180-185 numeri 1-20', 'Matematica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '2 day'), '20000000-0000-0000-0000-000000000001', 2),
  ('40000000-0000-0000-0000-000000000001', 'Tema su Manzoni', 'Analisi del cap. VIII dei Promessi Sposi (min. 600 parole)', 'Italiano',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '5 day'), '20000000-0000-0000-0000-000000000002', 3),
  ('40000000-0000-0000-0000-000000000001', 'Problemi di cinematica', 'Esercizi 4.1-4.6', 'Fisica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '7 day'), '20000000-0000-0000-0000-000000000003', 1),
  ('40000000-0000-0000-0000-000000000001', 'Riassunto Rivoluzione Francese', 'Da pag. 88 a 102', 'Storia',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '4 day'), '20000000-0000-0000-0000-000000000004', 2),
  ('40000000-0000-0000-0000-000000000001', 'Reading comprehension', 'Unit 5 esercizi A-B-C', 'Inglese',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '1 day'), '20000000-0000-0000-0000-000000000005', 2),
  ('40000000-0000-0000-0000-000000000001', 'Esercizi disequazioni', 'Scheda allegata', 'Matematica',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '3 day'), '20000000-0000-0000-0000-000000000001', 1),

  -- 4B
  ('40000000-0000-0000-0000-000000000002', 'Studio funzioni', 'Esercizi pag. 240-245', 'Matematica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '3 day'), '20000000-0000-0000-0000-000000000001', 3),
  ('40000000-0000-0000-0000-000000000002', 'Analisi Leopardi', 'Confronto tra L''Infinito e A Silvia', 'Italiano',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '6 day'), '20000000-0000-0000-0000-000000000002', 2),
  ('40000000-0000-0000-0000-000000000002', 'Problemi dinamica', 'Forze e accelerazione, esercizi 6.10-6.20', 'Fisica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '8 day'), '20000000-0000-0000-0000-000000000003', 2),
  ('40000000-0000-0000-0000-000000000002', 'Schema Kant', 'Critica della Ragion Pura - estetica trascendentale', 'Filosofia',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '4 day'), '20000000-0000-0000-0000-000000000004', 1),
  ('40000000-0000-0000-0000-000000000002', 'Essay on climate change', 'Min. 300 words, intro/body/conclusion', 'Inglese',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '10 day'), '20000000-0000-0000-0000-000000000005', 2),

  -- 5A
  ('40000000-0000-0000-0000-000000000003', 'Integrali definiti', 'Esercizi pag. 320-330 numeri pari', 'Matematica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '2 day'), '20000000-0000-0000-0000-000000000001', 3),
  ('40000000-0000-0000-0000-000000000003', 'Saggio breve Pirandello', 'L''umorismo - tracce a scelta', 'Italiano',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '5 day'), '20000000-0000-0000-0000-000000000002', 3),
  ('40000000-0000-0000-0000-000000000003', 'Elettromagnetismo', 'Legge di Faraday, esercizi 9.1-9.10', 'Fisica',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '6 day'), '20000000-0000-0000-0000-000000000003', 2),
  ('40000000-0000-0000-0000-000000000003', 'Mappa Nietzsche', 'Genealogia della morale - schema concettuale', 'Filosofia',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '3 day'), '20000000-0000-0000-0000-000000000004', 2),
  ('40000000-0000-0000-0000-000000000003', 'Speaking exam prep', 'Topics: globalization, identity, technology', 'Inglese',
   pg_temp.next_school_day(CURRENT_DATE + INTERVAL '9 day'), '20000000-0000-0000-0000-000000000005', 2);

-- ─────────────────────────────────────────────────────────────────
-- Lezioni svolte (ultime 2 settimane)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO lessons (class_id, teacher_id, title, topic, taught_on) VALUES
  -- 3A
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Equazioni di secondo grado', 'Formula risolutiva, discriminante, casi particolari',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '8 day')),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Disequazioni di secondo grado', 'Studio del segno e rappresentazione grafica',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '4 day')),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'I Promessi Sposi - cap. VIII', 'La notte degli imbrogli, fuga di Renzo e Lucia',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '5 day')),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
   'Cinematica del punto materiale', 'Moto rettilineo uniforme e uniformemente accelerato',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '6 day')),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
   'Rivoluzione Francese 1789', 'Cause economiche e sociali, presa della Bastiglia',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '3 day')),

  -- 4B
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Studio di funzione', 'Dominio, intersezioni, asintoti',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '7 day')),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Leopardi - i Canti', 'L''Infinito e poetica del vago e indefinito',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '5 day')),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003',
   'Dinamica - principi di Newton', 'Tre principi e applicazioni',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '4 day')),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004',
   'Kant - Estetica trascendentale', 'Spazio e tempo come forme a priori',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '2 day')),

  -- 5A
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Integrali indefiniti', 'Tecniche di integrazione: sostituzione e per parti',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '9 day')),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Integrali definiti', 'Teorema fondamentale del calcolo integrale',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '5 day')),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   'Pirandello - Il fu Mattia Pascal', 'Crisi dell''identità e maschere sociali',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '4 day')),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
   'Induzione elettromagnetica', 'Legge di Faraday-Neumann-Lenz',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '3 day')),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004',
   'Nietzsche - La gaia scienza', 'Morte di Dio e oltreuomo',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '2 day'));

-- ─────────────────────────────────────────────────────────────────
-- Verifiche programmate
-- ─────────────────────────────────────────────────────────────────
INSERT INTO exams (class_id, teacher_id, title, subject, description, scheduled_for, duration_min, topics) VALUES
  -- 3A
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Verifica Algebra', 'Matematica', 'Equazioni e disequazioni di secondo grado',
   pg_temp.next_school_ts(NOW() + INTERVAL '5 day'), 60,
   ARRAY['Equazioni di II grado','Disequazioni','Sistemi']),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
   'Verifica Fisica', 'Fisica', 'Cinematica',
   pg_temp.next_school_ts(NOW() + INTERVAL '12 day'), 60,
   ARRAY['Moto rettilineo','Velocità','Accelerazione']),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Tema in classe', 'Italiano', 'Promessi Sposi - capitoli I-X',
   pg_temp.next_school_ts(NOW() + INTERVAL '8 day'), 120,
   ARRAY['Manzoni','Promessi Sposi']),

  -- 4B
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Verifica Funzioni', 'Matematica', 'Studio completo di funzione',
   pg_temp.next_school_ts(NOW() + INTERVAL '6 day'), 90,
   ARRAY['Dominio','Asintoti','Derivate']),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004',
   'Verifica Filosofia', 'Filosofia', 'Empirismo e Kant',
   pg_temp.next_school_ts(NOW() + INTERVAL '10 day'), 60,
   ARRAY['Hume','Kant','Critica Ragion Pura']),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005',
   'English Test - Unit 6', 'Inglese', 'Reading + Writing + Grammar',
   pg_temp.next_school_ts(NOW() + INTERVAL '4 day'), 60,
   ARRAY['Past Perfect','Reading comprehension','Essay']),

  -- 5A
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Verifica Integrali', 'Matematica', 'Integrali definiti e applicazioni',
   pg_temp.next_school_ts(NOW() + INTERVAL '7 day'), 120,
   ARRAY['Integrali','Aree','Volumi']),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
   'Verifica Elettromagnetismo', 'Fisica', 'Induzione e onde',
   pg_temp.next_school_ts(NOW() + INTERVAL '14 day'), 90,
   ARRAY['Faraday','Lenz','Onde EM']),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   'Simulazione prima prova', 'Italiano', 'Tipologie A, B, C',
   pg_temp.next_school_ts(NOW() + INTERVAL '20 day'), 360,
   ARRAY['Analisi del testo','Saggio breve','Tema']);

-- ─────────────────────────────────────────────────────────────────
-- Interrogazioni (mix programmate / svolte con voto)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO interrogations (class_id, student_id, teacher_id, subject, topic, scheduled_for, grade, notes) VALUES
  -- 3A — programmate
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000004', 'Storia', 'Illuminismo e rivoluzioni',
   pg_temp.next_school_ts(NOW() + INTERVAL '3 day'), NULL, NULL),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000005', 'Inglese', 'Unit 4-5 grammar + speaking',
   pg_temp.next_school_ts(NOW() + INTERVAL '6 day'), NULL, NULL),
  -- 3A — già svolte
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'Matematica', 'Equazioni di II grado',
   pg_temp.prev_school_ts(NOW() - INTERVAL '5 day'), 7.5, 'Buona padronanza, qualche errore di calcolo'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000002', 'Italiano', 'Manzoni e Promessi Sposi',
   pg_temp.prev_school_ts(NOW() - INTERVAL '8 day'), 8.0, 'Esposizione fluida'),

  -- 4B — programmate
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000003', 'Fisica', 'Principi della dinamica',
   pg_temp.next_school_ts(NOW() + INTERVAL '4 day'), NULL, NULL),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009',
   '20000000-0000-0000-0000-000000000004', 'Filosofia', 'Hume - empirismo',
   pg_temp.next_school_ts(NOW() + INTERVAL '7 day'), NULL, NULL),
  -- 4B — già svolte
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000001', 'Matematica', 'Studio di funzione',
   pg_temp.prev_school_ts(NOW() - INTERVAL '4 day'), 6.5, 'Insicurezza sugli asintoti'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008',
   '20000000-0000-0000-0000-000000000002', 'Italiano', 'Leopardi - Canti',
   pg_temp.prev_school_ts(NOW() - INTERVAL '10 day'), 9.0, 'Ottima analisi del testo'),

  -- 5A — programmate
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000011',
   '20000000-0000-0000-0000-000000000001', 'Matematica', 'Integrali e applicazioni',
   pg_temp.next_school_ts(NOW() + INTERVAL '5 day'), NULL, NULL),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000013',
   '20000000-0000-0000-0000-000000000003', 'Fisica', 'Faraday e induzione',
   pg_temp.next_school_ts(NOW() + INTERVAL '8 day'), NULL, NULL),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000015',
   '20000000-0000-0000-0000-000000000004', 'Filosofia', 'Nietzsche',
   pg_temp.next_school_ts(NOW() + INTERVAL '11 day'), NULL, NULL),
  -- 5A — già svolte
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000012',
   '20000000-0000-0000-0000-000000000002', 'Italiano', 'Pirandello - Il fu Mattia Pascal',
   pg_temp.prev_school_ts(NOW() - INTERVAL '6 day'), 8.5, 'Padronanza del tema, bei collegamenti'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000014',
   '20000000-0000-0000-0000-000000000005', 'Inglese', 'Speaking - identity & technology',
   pg_temp.prev_school_ts(NOW() - INTERVAL '12 day'), 7.0, 'Pronuncia da migliorare');

-- ─────────────────────────────────────────────────────────────────
-- Assenze esempio
-- ─────────────────────────────────────────────────────────────────
INSERT INTO absences (user_id, class_id, date, hours, justified, reason) VALUES
  ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '6 day'), 5, TRUE, 'Visita medica'),
  ('30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000002',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '3 day'), 2, FALSE, NULL),
  ('30000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000003',
   pg_temp.prev_school_day(CURRENT_DATE - INTERVAL '10 day'), 5, TRUE, 'Influenza');

-- ─────────────────────────────────────────────────────────────────
-- Notifiche per ogni studente (compito + verifica imminenti)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, body)
SELECT m.user_id, 'homework', 'Nuovi compiti assegnati', 'Hai compiti in scadenza nei prossimi giorni - controlla la pagina Compiti.'
FROM class_members m
JOIN users u ON u.id = m.user_id
WHERE u.role = 'student';

INSERT INTO notifications (user_id, type, title, body)
SELECT m.user_id, 'exam', 'Verifica programmata', 'Una nuova verifica è stata pianificata. Controlla la pagina Verifiche.'
FROM class_members m
JOIN users u ON u.id = m.user_id
WHERE u.role = 'student';

-- ════════════════════════════════════════════════════════════════
--  AI School Workspace · Seed data (dev only)
--  Passwords below are bcrypt hashes (12 rounds) of the plaintext
--  shown in README.md.
-- ════════════════════════════════════════════════════════════════

-- Admin    : Admin123!
-- Teacher  : Teacher123!
-- Student  : Student123!

INSERT INTO users (id, email, password_hash, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'admin@school.test',
   '$2a$12$KIXl4Z3yVQ2N1d2Rf9b1Uu6pOq3bM8vS5tDx0KLwH9Q7R8YxA1F2K',
   'Admin User',     'admin'),
  ('22222222-2222-2222-2222-222222222222',
   'teacher@school.test',
   '$2a$12$L0aeQ3yVQ2N1d2Rf9b1Uu6pOq3bM8vS5tDx0KLwH9Q7R8YxA1F2K',
   'Maria Rossi',    'teacher'),
  ('33333333-3333-3333-3333-333333333333',
   'student@school.test',
   '$2a$12$M3aeQ3yVQ2N1d2Rf9b1Uu6pOq3bM8vS5tDx0KLwH9Q7R8YxA1F2K',
   'Luca Bianchi',   'student')
ON CONFLICT (email) DO NOTHING;

-- NOTE: in production, the Node backend hashes passwords with bcrypt.
-- The hashes above are placeholders; on first start, run the
-- "npm run seed" script in backend-node which will (re)hash them.

INSERT INTO classes (id, name, description, school_year, subject, owner_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '5A Liceo Scientifico', 'Classe demo', '2025/2026', 'Generale',
   '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO class_members (class_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'teacher'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'student')
ON CONFLICT DO NOTHING;

INSERT INTO schedules (class_id, weekday, start_time, end_time, subject, room, teacher_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '08:00', '09:00', 'Matematica', 'Aula 12', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '09:00', '10:00', 'Italiano',   'Aula 12', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '08:00', '09:00', 'Fisica',     'Aula 12', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '10:00', '11:00', 'Storia',     'Aula 12', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '11:00', '12:00', 'Inglese',    'Aula 12', '22222222-2222-2222-2222-222222222222');

INSERT INTO homework (class_id, title, description, subject, due_date, assigned_by, priority) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Esercizi capitolo 7',
   'Risolvere gli esercizi da pag. 220 a 225',
   'Matematica',
   CURRENT_DATE + INTERVAL '3 day',
   '22222222-2222-2222-2222-222222222222',
   2);

INSERT INTO exams (class_id, teacher_id, title, subject, description, scheduled_for, topics) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   'Verifica Algebra',
   'Matematica',
   'Capitoli 5-7',
   NOW() + INTERVAL '7 day',
   ARRAY['Polinomi','Equazioni','Disequazioni']);

INSERT INTO lessons (class_id, teacher_id, title, topic, taught_on) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   'Introduzione alle equazioni di secondo grado',
   'Formula risolutiva, discriminante, casi particolari',
   CURRENT_DATE - INTERVAL '2 day');

INSERT INTO notifications (user_id, type, title, body) VALUES
  ('33333333-3333-3333-3333-333333333333', 'homework', 'Nuovi compiti di Matematica', 'Esercizi capitolo 7 - scadenza tra 3 giorni'),
  ('33333333-3333-3333-3333-333333333333', 'exam',     'Verifica programmata',         'Verifica Algebra tra una settimana');

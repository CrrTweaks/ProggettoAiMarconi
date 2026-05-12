-- ════════════════════════════════════════════════════════════════
--  AI School Workspace · Supabase / PostgreSQL Schema
--  Requires: pgvector extension
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Drop in safe order (idempotent dev re-runs)
DROP TABLE IF EXISTS notifications      CASCADE;
DROP TABLE IF EXISTS concept_maps       CASCADE;
DROP TABLE IF EXISTS pdf_chunks         CASCADE;
DROP TABLE IF EXISTS pdf_documents      CASCADE;
DROP TABLE IF EXISTS ai_messages        CASCADE;
DROP TABLE IF EXISTS ai_chats           CASCADE;
DROP TABLE IF EXISTS interrogations     CASCADE;
DROP TABLE IF EXISTS exams              CASCADE;
DROP TABLE IF EXISTS absences           CASCADE;
DROP TABLE IF EXISTS lessons            CASCADE;
DROP TABLE IF EXISTS homework           CASCADE;
DROP TABLE IF EXISTS schedules          CASCADE;
DROP TABLE IF EXISTS class_members      CASCADE;
DROP TABLE IF EXISTS classes            CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
DROP TYPE  IF EXISTS user_role          CASCADE;
DROP TYPE  IF EXISTS event_type         CASCADE;
DROP TYPE  IF EXISTS notification_type  CASCADE;

-- ─────────── ENUM TYPES ───────────
CREATE TYPE user_role          AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE event_type         AS ENUM ('homework', 'exam', 'interrogation', 'lesson', 'event');
CREATE TYPE notification_type  AS ENUM ('homework', 'exam', 'interrogation', 'message', 'system', 'ai');

-- ─────────── USERS ───────────
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  role              user_role    NOT NULL DEFAULT 'student',
  avatar_url        TEXT,
  bio               TEXT,
  preferences       JSONB        NOT NULL DEFAULT '{}',
  last_login_at     TIMESTAMPTZ,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_users_email     ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role      ON users (role)  WHERE deleted_at IS NULL;

-- ─────────── CLASSES ───────────
CREATE TABLE classes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  school_year   VARCHAR(20)  NOT NULL,
  subject       VARCHAR(80),
  color         VARCHAR(20)  DEFAULT '#3b82f6',
  owner_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_classes_owner ON classes (owner_id);

CREATE TABLE class_members (
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'student',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX idx_class_members_user ON class_members (user_id);

-- ─────────── SCHEDULES (orario) ───────────
CREATE TABLE schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  subject     VARCHAR(120) NOT NULL,
  room        VARCHAR(60),
  teacher_id  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedules_class ON schedules (class_id);

-- ─────────── HOMEWORK ───────────
CREATE TABLE homework (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  subject       VARCHAR(80),
  due_date      DATE NOT NULL,
  assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  priority      SMALLINT DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_homework_class_due ON homework (class_id, due_date);

-- ─────────── LESSONS (argomenti svolti) ───────────
CREATE TABLE lessons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id),
  title       VARCHAR(200) NOT NULL,
  topic       TEXT,
  notes       TEXT,
  taught_on   DATE NOT NULL,
  duration_min SMALLINT DEFAULT 60,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lessons_class_date ON lessons (class_id, taught_on);

-- ─────────── ABSENCES ───────────
CREATE TABLE absences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  hours       SMALLINT DEFAULT 1,
  justified   BOOLEAN DEFAULT FALSE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_absences_user_date ON absences (user_id, date);

-- ─────────── EXAMS ───────────
CREATE TABLE exams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id),
  title       VARCHAR(200) NOT NULL,
  subject     VARCHAR(80),
  description TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_min SMALLINT DEFAULT 60,
  topics      TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exams_class_date ON exams (class_id, scheduled_for);

-- ─────────── INTERROGATIONS ───────────
CREATE TABLE interrogations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES users(id),
  teacher_id    UUID REFERENCES users(id),
  subject       VARCHAR(80),
  topic         TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  grade         NUMERIC(4,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interrogations_class_date ON interrogations (class_id, scheduled_for);

-- ─────────── AI CHAT ───────────
CREATE TABLE ai_chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) DEFAULT 'New chat',
  model       VARCHAR(60)  DEFAULT 'llama3',
  context     JSONB        DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_chats_user ON ai_chats (user_id, updated_at DESC);

CREATE TABLE ai_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('system','user','assistant')),
  content     TEXT NOT NULL,
  tokens      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_messages_chat ON ai_messages (chat_id, created_at);

-- ─────────── PDF DOCUMENTS + RAG CHUNKS ───────────
CREATE TABLE pdf_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      VARCHAR(255) NOT NULL,
  storage_path  TEXT NOT NULL,
  size_bytes    BIGINT,
  pages         INTEGER,
  status        VARCHAR(20) DEFAULT 'processing',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pdf_user ON pdf_documents (user_id, created_at DESC);

CREATE TABLE pdf_chunks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  page          INTEGER,
  content       TEXT NOT NULL,
  embedding     vector(768),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pdf_chunks_doc ON pdf_chunks (document_id);
CREATE INDEX idx_pdf_chunks_embedding
  ON pdf_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─────────── CONCEPT MAPS ───────────
CREATE TABLE concept_maps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  source_text TEXT,
  source_pdf_id UUID REFERENCES pdf_documents(id) ON DELETE SET NULL,
  graph       JSONB NOT NULL,        -- { nodes:[], edges:[] }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_concept_maps_user ON concept_maps (user_id, created_at DESC);

-- ─────────── NOTIFICATIONS ───────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'system',
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- ─────────── updated_at TRIGGER ───────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name='updated_at' AND table_schema='public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_%I ON %I;
       CREATE TRIGGER trg_updated_%I BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t);
  END LOOP;
END$$;

-- ─────────── pgvector similarity helper ───────────
CREATE OR REPLACE FUNCTION match_pdf_chunks(
  query_embedding vector(768),
  match_count     INT DEFAULT 5,
  filter_user_id  UUID DEFAULT NULL,
  filter_doc_ids  UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  document_id  UUID,
  content      TEXT,
  page         INTEGER,
  similarity   FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.document_id, c.content, c.page,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM pdf_chunks c
  JOIN pdf_documents d ON d.id = c.document_id
  WHERE (filter_user_id IS NULL OR d.user_id = filter_user_id)
    AND (filter_doc_ids IS NULL OR c.document_id = ANY(filter_doc_ids))
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;$$;

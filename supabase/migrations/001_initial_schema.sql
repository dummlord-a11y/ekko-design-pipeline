-- EkkoDesign Pipeline - Initial Schema

-- Enums
CREATE TYPE task_status AS ENUM ('backlog', 'assigned', 'in_progress', 'review', 'done');
CREATE TYPE task_category AS ENUM ('label_design', 'packaging', 'sticker', 'banner', 'brochure', 'other');

-- Designers table
CREATE TABLE designers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'designer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  gmail_thread_id TEXT,
  sender TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  full_body TEXT,
  complexity SMALLINT NOT NULL DEFAULT 3 CHECK (complexity BETWEEN 1 AND 5),
  category task_category NOT NULL DEFAULT 'other',
  ai_summary TEXT,
  ai_analysis JSONB,
  status task_status NOT NULL DEFAULT 'backlog',
  assigned_to UUID REFERENCES designers(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  gmail_attachment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sync metadata (singleton)
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  last_history_id TEXT
);

INSERT INTO sync_metadata (id) VALUES (1);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_complexity ON tasks(complexity);
CREATE INDEX idx_tasks_gmail_message_id ON tasks(gmail_message_id);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- RLS (permissive for internal tool v1)
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for designers" ON designers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sync_metadata" ON sync_metadata FOR ALL USING (true) WITH CHECK (true);

-- Seed designers
INSERT INTO designers (name, email, role) VALUES
  ('Олена Петренко', 'olena@ekko.design', 'Старший дизайнер'),
  ('Максим Коваль', 'maksym@ekko.design', 'Дизайнер'),
  ('Анна Шевченко', 'anna@ekko.design', 'Дизайнер');

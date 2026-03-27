-- ============================================================
-- TaskPilot – Full Supabase Schema
-- Run this once in the Supabase SQL Editor to initialize.
-- ============================================================

-- Drop and recreate with full schema
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS oauth_tokens CASCADE;

-- PROFILES (user accounts)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  email         TEXT,
  avatar_color  TEXT DEFAULT '#2563EB',
  theme         TEXT DEFAULT 'dark',
  accent_color  TEXT DEFAULT 'blue',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- WORKFLOWS
CREATE TABLE workflows (
  workflow_id   TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  source_text   TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- TASKS
CREATE TABLE tasks (
  task_id       TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workflow_id   TEXT REFERENCES workflows(workflow_id) ON DELETE SET NULL,
  task          TEXT NOT NULL,
  owner         TEXT NOT NULL DEFAULT 'unassigned',
  deadline      TEXT NOT NULL,
  priority      TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  status        TEXT NOT NULL CHECK (status IN ('pending','completed','delayed'))
                DEFAULT 'pending',
  depends_on    JSONB DEFAULT '[]',
  is_checked    BOOLEAN DEFAULT FALSE,
  calendar_event_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- LOGS
CREATE TABLE logs (
  log_id        TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  reason        TEXT NOT NULL,
  decision_trace TEXT,
  timestamp     TIMESTAMPTZ DEFAULT now(),
  task_id       TEXT REFERENCES tasks(task_id) ON DELETE SET NULL
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  message       TEXT NOT NULL,
  task_id       TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- OAUTH TOKENS (Google Calendar / Gmail)
CREATE TABLE oauth_tokens (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT DEFAULT 'google',
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ
);

-- =========================
-- RLS (Row Level Security)
-- =========================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile"       ON profiles      FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_workflows"     ON workflows     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tasks"         ON tasks         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_logs"          ON logs          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_oauth"         ON oauth_tokens  FOR ALL USING (auth.uid() = user_id);

-- =========================
-- FUNCTIONS
-- =========================

-- Username availability check (normalized)
CREATE OR REPLACE FUNCTION check_username_available(uname TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT NOT EXISTS (SELECT 1 FROM profiles WHERE username = LOWER(uname));
$$;

GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;

-- Auto-updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_tasks_user_id      ON tasks(user_id);
CREATE INDEX idx_tasks_status       ON tasks(status);
CREATE INDEX idx_tasks_workflow     ON tasks(workflow_id);
CREATE INDEX idx_logs_user_id       ON logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;

-- ============================================================
-- TaskPilot – Supabase Schema Migration
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── tasks table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    task_id     TEXT PRIMARY KEY,
    task        TEXT        NOT NULL,
    owner       TEXT        NOT NULL DEFAULT 'unassigned',
    deadline    TEXT        NOT NULL,
    priority    TEXT        NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status      TEXT        NOT NULL CHECK (status IN ('pending', 'completed', 'delayed')) DEFAULT 'pending',
    depends_on  TEXT[]      NOT NULL DEFAULT '{}',
    created_at  TEXT        NOT NULL,
    updated_at  TEXT        NOT NULL
);

-- Index for fast status-based queries (self-heal, monitoring)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- ── logs table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
    log_id      TEXT PRIMARY KEY,
    action      TEXT    NOT NULL,
    reason      TEXT    NOT NULL,
    timestamp   TEXT    NOT NULL,
    task_id     TEXT    NOT NULL REFERENCES tasks (task_id) ON DELETE CASCADE,
    decision_trace TEXT NOT NULL
);

-- Index for chronological log retrieval
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_logs_task_id   ON logs (task_id);

-- ── Row Level Security (RLS) ─────────────────────────────────
-- Enable RLS and allow full access via service-role key (backend only).
-- Adjust policies if you add user-scoped access in your frontend.

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs  ENABLE ROW LEVEL SECURITY;

-- Allow all operations from authenticated service role
CREATE POLICY "service_role_tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_logs" ON logs
    FOR ALL USING (true) WITH CHECK (true);

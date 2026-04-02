-- Migration 001: Add all new features to productivity_db
-- Run this against your PostgreSQL database:
--   psql -U postgres -d productivity_db -f migrations/001_add_features.sql
--
-- This migration is idempotent (safe to run multiple times).

BEGIN;

-- ============================================================
-- 1. UPDATE USERS TABLE
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- 2. EMAIL VERIFICATION CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_code ON email_verification_codes(code);

-- ============================================================
-- 3. UPDATE TASKS TABLE
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add check constraint for priority (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. TASK SHARING
-- ============================================================
CREATE TABLE IF NOT EXISTS task_shares (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(10) DEFAULT 'view',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, shared_with_user_id)
);

-- Add check constraint for permission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_shares_permission_check'
  ) THEN
    ALTER TABLE task_shares ADD CONSTRAINT task_shares_permission_check
      CHECK (permission IN ('view', 'edit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_shares_task ON task_shares(task_id);
CREATE INDEX IF NOT EXISTS idx_task_shares_user ON task_shares(shared_with_user_id);

-- ============================================================
-- 5. TASK ACTIVITY LOG (for productivity insights)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_activity_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_task ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON task_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON task_activity_log(created_at);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read)
  WHERE read = false;

COMMIT;

-- ============================================================
-- VERIFICATION QUERY: Run this to confirm all tables exist
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

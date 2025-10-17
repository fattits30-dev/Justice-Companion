-- Migration 013: Add Remember Me Functionality
-- Adds remember_me column to sessions table to support extended session duration
-- Sessions with remember_me=1 will have longer expiration times (e.g., 30 days vs 24 hours)

-- UP
ALTER TABLE sessions ADD COLUMN remember_me INTEGER DEFAULT 0 NOT NULL CHECK(remember_me IN (0, 1));

-- Add index for analytics and filtering queries
CREATE INDEX IF NOT EXISTS idx_sessions_remember_me ON sessions(remember_me);

-- DOWN
DROP INDEX IF EXISTS idx_sessions_remember_me;

-- Remove remember_me column
-- Note: ALTER TABLE DROP COLUMN requires SQLite 3.35.0+ (2021-03-12)
-- better-sqlite3 12.4.1 uses SQLite 3.47+, so this is supported
ALTER TABLE sessions DROP COLUMN remember_me;

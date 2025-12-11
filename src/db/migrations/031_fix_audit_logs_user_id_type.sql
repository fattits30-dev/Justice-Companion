-- Migration 031: Fix audit_logs user_id type from TEXT to INTEGER
-- This migration recreates the audit_logs table with correct user_id typing

-- Step 1: Create new audit_logs table with INTEGER user_id
CREATE TABLE IF NOT EXISTS audit_logs_new (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id INTEGER,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'export', 'decrypt')),
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1)),
  error_message TEXT,
  integrity_hash TEXT NOT NULL,
  previous_log_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data from old table to new table (converting user_id from TEXT to INTEGER)
INSERT INTO audit_logs_new
SELECT
  id,
  timestamp,
  event_type,
  CASE
    WHEN user_id IS NULL THEN NULL
    WHEN user_id = '' THEN NULL
    ELSE CAST(user_id AS INTEGER)
  END as user_id,
  resource_type,
  resource_id,
  action,
  details,
  ip_address,
  user_agent,
  success,
  error_message,
  integrity_hash,
  previous_log_hash,
  created_at
FROM audit_logs;

-- Step 3: Drop old table
DROP TABLE audit_logs;

-- Step 4: Rename new table to old name
ALTER TABLE audit_logs_new RENAME TO audit_logs;

-- Step 5: Recreate indexes
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_chain ON audit_logs(timestamp ASC, id ASC);

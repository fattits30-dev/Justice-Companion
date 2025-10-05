-- Migration 003: Audit Logs Table
-- Immutable audit trail with blockchain-style integrity verification
-- This table is INSERT-ONLY - no updates or deletes allowed at application layer

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT,
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

-- Index for chronological queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Index for resource lookups
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Index for event type filtering
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

-- Partial index for user queries (only when user_id exists)
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Index for chain verification (ordered by timestamp + id)
CREATE INDEX idx_audit_logs_chain ON audit_logs(timestamp ASC, id ASC);

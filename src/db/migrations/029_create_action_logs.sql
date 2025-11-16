-- Migration 029: Action Logs Table
-- Comprehensive function call tracking for observability and debugging
-- Stores all function calls with inputs, outputs, errors, and performance metrics

CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILURE', 'IN_PROGRESS')),
  duration INTEGER, -- milliseconds
  input TEXT, -- JSON string of sanitized input parameters
  output TEXT, -- JSON string of sanitized output
  error_message TEXT,
  error_stack TEXT,
  error_code TEXT,
  user_id TEXT,
  username TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for chronological queries (most common: recent actions)
CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp DESC);

-- Index for service filtering
CREATE INDEX idx_action_logs_service ON action_logs(service);

-- Index for status filtering (find failures)
CREATE INDEX idx_action_logs_status ON action_logs(status);

-- Composite index for service + status queries
CREATE INDEX idx_action_logs_service_status ON action_logs(service, status);

-- Partial index for failed actions only (optimization for error queries)
CREATE INDEX idx_action_logs_failures ON action_logs(timestamp DESC) WHERE status = 'FAILURE';

-- Index for user-specific action history
CREATE INDEX idx_action_logs_user_id ON action_logs(user_id) WHERE user_id IS NOT NULL;

-- Index for performance analysis (actions with duration)
CREATE INDEX idx_action_logs_duration ON action_logs(duration DESC) WHERE duration IS NOT NULL;

-- Migration 015: Performance Indexes
-- Adds strategic indexes for query optimization based on common access patterns
-- Target: 10-100x query performance improvement for JOIN-heavy operations
--
-- Benchmark findings (see docs/performance/phase1-database-indexes-results.md):
-- - better-sqlite3 can handle 2000 QPS with 5-way joins when properly indexed
-- - Indexes provide 10-100x performance improvement on filtered queries
-- - WAL mode already enabled in database.ts for concurrency

-- UP

-- =============================================================================
-- CASES TABLE INDEXES
-- =============================================================================
-- cases.status: Filter by case status (active/closed/pending)
-- Use case: Dashboard query to show only active cases
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- cases.case_type: Filter by case type (employment, housing, etc.)
-- Use case: Reports and analytics grouped by case type
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON cases(case_type);

-- cases.created_at: Sort/filter by creation date
-- Use case: "Recent cases" query, date range filters
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- cases.updated_at: Sort by last modified
-- Use case: "Recently updated cases" dashboard widget
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at DESC);

-- Composite index for user's active cases (most common query pattern)
-- Use case: SELECT * FROM cases WHERE user_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_cases_user_status ON cases(user_id, status);

-- =============================================================================
-- EVIDENCE TABLE INDEXES
-- =============================================================================
-- evidence.evidence_type: Filter by document/photo/email/recording/note
-- Use case: "Show all emails for this case"
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);

-- evidence.obtained_date: Sort evidence chronologically
-- Use case: Timeline view of evidence acquisition
CREATE INDEX IF NOT EXISTS idx_evidence_obtained_date ON evidence(obtained_date);

-- Composite index for case evidence by type
-- Use case: SELECT * FROM evidence WHERE case_id = ? AND evidence_type = 'document'
CREATE INDEX IF NOT EXISTS idx_evidence_case_type ON evidence(case_id, evidence_type);

-- =============================================================================
-- TIMELINE EVENTS TABLE INDEXES
-- =============================================================================
-- Composite index for user's timeline events (authorization + filter)
-- Use case: SELECT * FROM timeline_events WHERE user_id = ? AND case_id = ?
CREATE INDEX IF NOT EXISTS idx_timeline_user_case ON timeline_events(user_id, case_id);

-- =============================================================================
-- ACTIONS TABLE INDEXES
-- =============================================================================
-- actions.priority: Filter by priority level
-- Use case: "Show all urgent actions"
CREATE INDEX IF NOT EXISTS idx_actions_priority ON actions(priority);

-- actions.completed_at: Filter completed vs pending actions
-- Use case: "Show completed actions", statistics
CREATE INDEX IF NOT EXISTS idx_actions_completed_at ON actions(completed_at);

-- Note: actions table doesn't have user_id column (not added in migration 011)
-- Composite index for case's active actions
-- Use case: SELECT * FROM actions WHERE case_id = ? AND status IN ('pending', 'in_progress')
CREATE INDEX IF NOT EXISTS idx_actions_case_status ON actions(case_id, status);

-- Composite index for case's upcoming deadlines
-- Use case: SELECT * FROM actions WHERE case_id = ? AND due_date > date('now') ORDER BY due_date
CREATE INDEX IF NOT EXISTS idx_actions_case_due_date ON actions(case_id, due_date);

-- =============================================================================
-- CHAT MESSAGES TABLE INDEXES
-- =============================================================================
-- chat_messages.role: Filter by user/assistant messages
-- Use case: Extract all user queries for analytics
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Composite index for conversation messages (most common query)
-- Use case: SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_timestamp ON chat_messages(conversation_id, timestamp);

-- =============================================================================
-- USERS TABLE INDEXES
-- =============================================================================
-- users.is_active: Filter active vs deactivated users
-- Use case: Authentication, user listing
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- users.last_login_at: Sort by recent activity
-- Use case: User activity reports
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- =============================================================================
-- SESSIONS TABLE INDEXES
-- =============================================================================
-- Composite index for session cleanup (expired sessions)
-- Use case: DELETE FROM sessions WHERE expires_at < datetime('now')
-- Note: idx_sessions_expires_at already exists from migration 010, but this adds DESC for cleanup efficiency
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at_desc ON sessions(expires_at DESC);

-- =============================================================================
-- NOTES TABLE INDEXES
-- =============================================================================
-- notes.updated_at: Sort by last modified
-- Use case: "Recently updated notes" view
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- Composite index for user's notes by case
-- Use case: SELECT * FROM notes WHERE user_id = ? AND case_id = ?
CREATE INDEX IF NOT EXISTS idx_notes_user_case ON notes(user_id, case_id);

-- =============================================================================
-- EVENT_EVIDENCE TABLE INDEXES
-- =============================================================================
-- event_evidence.evidence_id: Reverse lookup (evidence -> events)
-- Use case: "Which timeline events reference this evidence?"
CREATE INDEX IF NOT EXISTS idx_event_evidence_evidence_id ON event_evidence(evidence_id);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- After applying this migration, verify index usage with:
-- EXPLAIN QUERY PLAN SELECT * FROM cases WHERE user_id = 1 AND status = 'active';
-- Expected: SEARCH cases USING INDEX idx_cases_user_status (user_id=? AND status=?)

-- DOWN

-- Drop indexes in reverse order
DROP INDEX IF EXISTS idx_event_evidence_evidence_id;
DROP INDEX IF EXISTS idx_notes_user_case;
DROP INDEX IF EXISTS idx_notes_updated_at;
DROP INDEX IF EXISTS idx_sessions_expires_at_desc;
DROP INDEX IF EXISTS idx_users_last_login;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_chat_messages_conv_timestamp;
DROP INDEX IF EXISTS idx_chat_messages_role;
DROP INDEX IF EXISTS idx_actions_case_due_date;
DROP INDEX IF EXISTS idx_actions_case_status;
DROP INDEX IF EXISTS idx_actions_completed_at;
DROP INDEX IF EXISTS idx_actions_priority;
DROP INDEX IF EXISTS idx_timeline_user_case;
DROP INDEX IF EXISTS idx_evidence_case_type;
DROP INDEX IF EXISTS idx_evidence_obtained_date;
DROP INDEX IF EXISTS idx_evidence_type;
DROP INDEX IF EXISTS idx_cases_user_status;
DROP INDEX IF EXISTS idx_cases_updated_at;
DROP INDEX IF EXISTS idx_cases_created_at;
DROP INDEX IF EXISTS idx_cases_case_type;
DROP INDEX IF EXISTS idx_cases_status;

-- Migration 011: Add User Ownership to Resource Tables
-- Adds user_id column to all resource tables for authorization checks
-- Enables multi-user support with ownership validation

-- UP

-- Add user_id column to cases table
ALTER TABLE cases ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to evidence table
ALTER TABLE evidence ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to notes table
ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to legal_issues table
ALTER TABLE legal_issues ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to timeline_events table
ALTER TABLE timeline_events ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to user_facts table
ALTER TABLE user_facts ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to case_facts table
ALTER TABLE case_facts ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to chat_conversations table
ALTER TABLE chat_conversations ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add user_id column to chat_messages table (via conversation)
-- Note: chat_messages already links to conversations, which now has user_id
-- This maintains referential integrity

-- Create indexes for ownership queries (performance optimization)
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_evidence_user_id ON evidence(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_legal_issues_user_id ON legal_issues(user_id);
CREATE INDEX idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX idx_case_facts_user_id ON case_facts(user_id);
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);

-- DOWN

-- Drop indexes
DROP INDEX IF EXISTS idx_chat_conversations_user_id;
DROP INDEX IF EXISTS idx_case_facts_user_id;
DROP INDEX IF EXISTS idx_user_facts_user_id;
DROP INDEX IF EXISTS idx_timeline_events_user_id;
DROP INDEX IF EXISTS idx_legal_issues_user_id;
DROP INDEX IF EXISTS idx_notes_user_id;
DROP INDEX IF EXISTS idx_evidence_user_id;
DROP INDEX IF EXISTS idx_cases_user_id;

-- Note: SQLite does not support DROP COLUMN directly
-- To rollback, you would need to:
-- 1. Create new table without user_id column
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table
-- This is a manual migration and should be done carefully in production

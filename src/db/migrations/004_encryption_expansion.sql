-- Migration 004: Encryption Expansion
-- Documents encryption coverage for Phase 3 implementation
-- NO SCHEMA CHANGES - Uses existing TEXT columns with application-layer encryption

-- UP

-- Create encryption metadata table to track which fields use application-layer encryption
CREATE TABLE IF NOT EXISTS encryption_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  encrypted_since TEXT NOT NULL DEFAULT (datetime('now')),
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2')) DEFAULT 'P1',
  notes TEXT,
  UNIQUE(table_name, column_name)
);

-- Document encrypted fields (P0 = Critical, P1 = Important, P2 = Optional)
INSERT INTO encryption_metadata (table_name, column_name, priority, notes) VALUES
  -- Phase 1 (Already Encrypted)
  ('cases', 'description', 'P0', 'Encrypted since Phase 1 - Contains sensitive case details and PII'),
  ('evidence', 'content', 'P0', 'Encrypted since Phase 1 - Document text, emails, recordings'),

  -- Phase 3 P0 (Critical - MUST ENCRYPT)
  ('notes', 'content', 'P0', 'Encrypted since Phase 3 - User private observations about cases'),
  ('chat_messages', 'content', 'P0', 'Encrypted since Phase 3 - AI chat history with case context'),
  ('user_profile', 'email', 'P0', 'Encrypted since Phase 3 - PII, GDPR compliance required'),
  ('user_profile', 'name', 'P0', 'Encrypted since Phase 3 - PII, GDPR compliance required'),

  -- Phase 3 P1 (Important - SHOULD ENCRYPT)
  ('chat_messages', 'thinking_content', 'P1', 'Encrypted since Phase 3 - AI reasoning may reference case facts'),
  ('legal_issues', 'description', 'P1', 'Encrypted since Phase 3 - Case-specific legal details'),
  ('timeline_events', 'description', 'P1', 'Encrypted since Phase 3 - Chronological case facts with potential PII');

-- Create index for faster metadata lookups
CREATE INDEX IF NOT EXISTS idx_encryption_metadata_table
  ON encryption_metadata(table_name);

-- DOWN

-- Rollback: Drop encryption metadata table
DROP TABLE IF EXISTS encryption_metadata;
DROP INDEX IF EXISTS idx_encryption_metadata_table;

-- Migration 005: User Facts and Case Facts Tables
-- Creates quick-reference fact tracking for cases with encryption
-- P0 encryption: user_facts.fact_content (direct PII)
-- P1 encryption: case_facts.fact_content (may contain PII)

-- UP

-- Create user_facts table for personal/user-related facts
CREATE TABLE IF NOT EXISTS user_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  fact_content TEXT NOT NULL,  -- Encrypted with AES-256-GCM (P0 priority)
  fact_type TEXT NOT NULL CHECK(fact_type IN ('personal', 'employment', 'financial', 'contact', 'medical', 'other')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Create case_facts table for case-specific facts
CREATE TABLE IF NOT EXISTS case_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  fact_content TEXT NOT NULL,  -- Encrypted with AES-256-GCM (P1 priority)
  fact_category TEXT NOT NULL CHECK(fact_category IN ('timeline', 'evidence', 'witness', 'location', 'communication', 'other')),
  importance TEXT NOT NULL CHECK(importance IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_facts_case_id
  ON user_facts(case_id);

CREATE INDEX IF NOT EXISTS idx_user_facts_type
  ON user_facts(case_id, fact_type);

CREATE INDEX IF NOT EXISTS idx_case_facts_case_id
  ON case_facts(case_id);

CREATE INDEX IF NOT EXISTS idx_case_facts_category
  ON case_facts(case_id, fact_category);

CREATE INDEX IF NOT EXISTS idx_case_facts_importance
  ON case_facts(case_id, importance);

-- Create triggers for updated_at timestamp management
CREATE TRIGGER IF NOT EXISTS update_user_facts_timestamp
AFTER UPDATE ON user_facts
BEGIN
  UPDATE user_facts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_case_facts_timestamp
AFTER UPDATE ON case_facts
BEGIN
  UPDATE case_facts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update encryption_metadata table with new encrypted fields
INSERT INTO encryption_metadata (table_name, column_name, priority, notes) VALUES
  ('user_facts', 'fact_content', 'P0', 'Encrypted since Migration 005 - Direct PII (personal, financial, medical, contact info)'),
  ('case_facts', 'fact_content', 'P1', 'Encrypted since Migration 005 - May contain PII (witness names, locations, communications)');

-- DOWN

-- Rollback: Drop triggers first
DROP TRIGGER IF EXISTS update_case_facts_timestamp;
DROP TRIGGER IF EXISTS update_user_facts_timestamp;

-- Drop indexes
DROP INDEX IF EXISTS idx_case_facts_importance;
DROP INDEX IF EXISTS idx_case_facts_category;
DROP INDEX IF EXISTS idx_case_facts_case_id;
DROP INDEX IF EXISTS idx_user_facts_type;
DROP INDEX IF EXISTS idx_user_facts_case_id;

-- Drop tables
DROP TABLE IF EXISTS case_facts;
DROP TABLE IF EXISTS user_facts;

-- Remove encryption metadata entries
DELETE FROM encryption_metadata WHERE table_name IN ('user_facts', 'case_facts');

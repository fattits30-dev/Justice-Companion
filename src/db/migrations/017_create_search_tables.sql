-- Migration: Create search tables for advanced search/filter system
-- This migration adds saved searches and a full-text search index using SQLite FTS5

-- UP
-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  query_json TEXT NOT NULL, -- JSON-encoded SearchQuery
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  use_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for saved searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used ON saved_searches(last_used_at);

-- Create full-text search virtual table using FTS5
-- Note: FTS5 tables don't support regular constraints or foreign keys
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  -- Searchable columns
  entity_type UNINDEXED,      -- 'case', 'evidence', 'conversation', 'note'
  entity_id UNINDEXED,         -- ID of the entity
  user_id UNINDEXED,           -- User who owns this entity
  case_id UNINDEXED,           -- Associated case ID (if applicable)
  title,                       -- Title of the entity (searchable)
  content,                     -- Main content (searchable)
  tags,                        -- Extracted tags (searchable)

  -- Metadata columns (not indexed for FTS)
  created_at UNINDEXED,
  status UNINDEXED,            -- For cases
  case_type UNINDEXED,         -- For cases
  evidence_type UNINDEXED,     -- For evidence
  file_path UNINDEXED,         -- For evidence
  message_count UNINDEXED,     -- For conversations
  is_pinned UNINDEXED,         -- For notes

  -- Configure tokenizer for better search
  tokenize = 'porter unicode61'
);

-- Create a regular table to track search index metadata
CREATE TABLE IF NOT EXISTS search_index_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row
  last_rebuild_at DATETIME,
  total_documents INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1
);

-- Initialize metadata
INSERT OR IGNORE INTO search_index_meta (id, last_rebuild_at, total_documents, version)
VALUES (1, NULL, 0, 1);

-- Create audit log for search queries (for analytics and suggestions)
CREATE TABLE IF NOT EXISTS search_query_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER,
  execution_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for search query log
CREATE INDEX IF NOT EXISTS idx_search_query_log_user ON search_query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_search_query_log_created ON search_query_log(created_at);

-- Trigger to update search index when cases are modified
CREATE TRIGGER IF NOT EXISTS update_search_index_on_case_insert
AFTER INSERT ON cases
BEGIN
  -- Note: Actual indexing will be done by the application
  -- This trigger is a placeholder for future direct SQL indexing
  SELECT 1;
END;

CREATE TRIGGER IF NOT EXISTS update_search_index_on_case_update
AFTER UPDATE ON cases
BEGIN
  SELECT 1;
END;

CREATE TRIGGER IF NOT EXISTS update_search_index_on_case_delete
AFTER DELETE ON cases
BEGIN
  DELETE FROM search_index
  WHERE entity_type = 'case' AND entity_id = OLD.id;
END;

-- Trigger to update search index when evidence is modified
CREATE TRIGGER IF NOT EXISTS update_search_index_on_evidence_insert
AFTER INSERT ON evidence
BEGIN
  SELECT 1;
END;

CREATE TRIGGER IF NOT EXISTS update_search_index_on_evidence_update
AFTER UPDATE ON evidence
BEGIN
  SELECT 1;
END;

CREATE TRIGGER IF NOT EXISTS update_search_index_on_evidence_delete
AFTER DELETE ON evidence
BEGIN
  DELETE FROM search_index
  WHERE entity_type = 'evidence' AND entity_id = OLD.id;
END;

-- Trigger to update search index when chat conversations are modified
CREATE TRIGGER IF NOT EXISTS update_search_index_on_conversation_delete
AFTER DELETE ON chat_conversations
BEGIN
  DELETE FROM search_index
  WHERE entity_type = 'conversation' AND entity_id = OLD.id;
END;

-- Trigger to update search index when notes are modified
CREATE TRIGGER IF NOT EXISTS update_search_index_on_notes_delete
AFTER DELETE ON notes
BEGIN
  DELETE FROM search_index
  WHERE entity_type = 'note' AND entity_id = OLD.id;
END;

-- DOWN
-- Remove triggers
DROP TRIGGER IF EXISTS update_search_index_on_notes_delete;
DROP TRIGGER IF EXISTS update_search_index_on_conversation_delete;
DROP TRIGGER IF EXISTS update_search_index_on_evidence_delete;
DROP TRIGGER IF EXISTS update_search_index_on_evidence_update;
DROP TRIGGER IF EXISTS update_search_index_on_evidence_insert;
DROP TRIGGER IF EXISTS update_search_index_on_case_delete;
DROP TRIGGER IF EXISTS update_search_index_on_case_update;
DROP TRIGGER IF EXISTS update_search_index_on_case_insert;

-- Remove tables
DROP TABLE IF EXISTS search_query_log;
DROP TABLE IF EXISTS search_index_meta;
DROP TABLE IF EXISTS search_index;
DROP TABLE IF EXISTS saved_searches;
-- Migration: Create Case Tagging System
-- Description: Adds case_tags junction table for case organization
-- Date: 2025-01-13
-- Migrated from: 018_create_tags_system.sql (adapted for cases instead of evidence)

-- Case tags junction table (many-to-many between cases and tags)
CREATE TABLE IF NOT EXISTS case_tags (
  case_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (case_id, tag_id),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_tags_case ON case_tags(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tags_tag ON case_tags(tag_id);

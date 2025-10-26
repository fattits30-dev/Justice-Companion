-- Migration 024: Add updated_at column to evidence table
-- This column was missing from the initial schema but is used by EvidenceRepository

-- Add updated_at column to evidence table
ALTER TABLE evidence
ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Create trigger to automatically update the timestamp
CREATE TRIGGER IF NOT EXISTS update_evidence_timestamp
AFTER UPDATE ON evidence
BEGIN
  UPDATE evidence SET updated_at = datetime('now') WHERE id = NEW.id;
END;

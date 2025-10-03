-- Justice Companion Database Schema
-- Migration 001: Initial schema for case management

-- Cases table: Main container for legal matters
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  case_type TEXT NOT NULL CHECK(case_type IN ('employment', 'housing', 'consumer', 'family', 'debt', 'other')),
  status TEXT NOT NULL CHECK(status IN ('active', 'closed', 'pending')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Legal Issues table: Specific legal questions within a case
CREATE TABLE IF NOT EXISTS legal_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  relevant_law TEXT,
  guidance TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Evidence table: Documents, photos, communications
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT,
  content TEXT,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('document', 'photo', 'email', 'recording', 'note')),
  obtained_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CHECK ((file_path IS NOT NULL AND content IS NULL) OR (file_path IS NULL AND content IS NOT NULL))
);

-- Timeline Events table: Chronological record of what happened
CREATE TABLE IF NOT EXISTS timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Event Evidence junction table: Links timeline events to evidence
CREATE TABLE IF NOT EXISTS event_evidence (
  event_id INTEGER NOT NULL,
  evidence_id INTEGER NOT NULL,
  PRIMARY KEY (event_id, evidence_id),
  FOREIGN KEY (event_id) REFERENCES timeline_events(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

-- Actions table: Tasks and deadlines for the user
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Notes table: User's notes and observations
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_issues_case_id ON legal_issues(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_actions_case_id ON actions(case_id);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_notes_case_id ON notes(case_id);

-- Trigger to update updated_at timestamp on cases
CREATE TRIGGER IF NOT EXISTS update_case_timestamp
AFTER UPDATE ON cases
BEGIN
  UPDATE cases SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on notes
CREATE TRIGGER IF NOT EXISTS update_note_timestamp
AFTER UPDATE ON notes
BEGIN
  UPDATE notes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

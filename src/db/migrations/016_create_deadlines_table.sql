-- Migration 016: Create Deadlines Table for Timeline Tracker
-- Adds table for tracking legal deadlines and milestones with priority and status management

-- UP
CREATE TABLE IF NOT EXISTS deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Foreign keys
  case_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  deadline_date TEXT NOT NULL, -- ISO 8601 date format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)

  -- Enums
  priority TEXT NOT NULL CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK(status IN ('upcoming', 'overdue', 'completed')) DEFAULT 'upcoming',

  -- Timestamps
  completed_at TEXT, -- ISO 8601 timestamp when marked as completed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT, -- Soft delete timestamp for audit trail

  -- Foreign key constraints
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);

-- Composite index for common queries (upcoming deadlines by date)
CREATE INDEX IF NOT EXISTS idx_deadlines_status_date ON deadlines(status, deadline_date)
  WHERE deleted_at IS NULL;

-- Composite index for user's active deadlines
CREATE INDEX IF NOT EXISTS idx_deadlines_user_status ON deadlines(user_id, status)
  WHERE deleted_at IS NULL;

-- Index for soft deletes
CREATE INDEX IF NOT EXISTS idx_deadlines_deleted_at ON deadlines(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_deadline_timestamp
AFTER UPDATE ON deadlines
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at -- Only update if not explicitly set
BEGIN
  UPDATE deadlines SET updated_at = datetime('now') WHERE id = NEW.id;
END;

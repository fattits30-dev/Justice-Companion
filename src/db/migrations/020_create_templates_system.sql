-- Migration 020: Case Templates System
-- Creates case templates library with built-in and custom templates

-- Case templates table
CREATE TABLE IF NOT EXISTS case_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN (
    'civil', 'criminal', 'family', 'employment', 'housing', 'immigration', 'other'
  )),
  is_system_template INTEGER DEFAULT 0 CHECK(is_system_template IN (0, 1)), -- Built-in vs user-created
  user_id INTEGER, -- NULL for system templates

  -- Template data (stored as JSON)
  template_fields_json TEXT NOT NULL, -- Case fields template
  suggested_evidence_types_json TEXT, -- Evidence categories
  timeline_milestones_json TEXT, -- Key dates/milestones
  checklist_items_json TEXT, -- Todo checklist

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_templates_user ON case_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON case_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_system ON case_templates(is_system_template);

-- Template usage tracking
CREATE TABLE IF NOT EXISTS template_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  case_id INTEGER, -- Resulting case (NULL if case creation failed)
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (template_id) REFERENCES case_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
);

-- Indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_template ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_case ON template_usage(case_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON template_usage(used_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_template_timestamp
AFTER UPDATE ON case_templates
FOR EACH ROW
BEGIN
  UPDATE case_templates
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

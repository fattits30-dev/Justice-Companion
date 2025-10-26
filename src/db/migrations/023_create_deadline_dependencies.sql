-- Migration: Create deadline dependencies for Gantt chart
-- Wave 6 Task 3: Timeline Gantt Chart
-- Adds dependency tracking between deadlines

-- ============================================
-- Deadline Dependencies Table
-- ============================================

CREATE TABLE IF NOT EXISTS deadline_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_deadline_id INTEGER NOT NULL,
  target_deadline_id INTEGER NOT NULL,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish')),
  lag_days INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  FOREIGN KEY (source_deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
  FOREIGN KEY (target_deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Prevent self-dependencies
  CHECK (source_deadline_id != target_deadline_id),

  -- Prevent duplicate dependencies
  UNIQUE (source_deadline_id, target_deadline_id)
);

-- Indexes for efficient dependency queries
CREATE INDEX IF NOT EXISTS idx_deadline_dependencies_source
  ON deadline_dependencies(source_deadline_id);

CREATE INDEX IF NOT EXISTS idx_deadline_dependencies_target
  ON deadline_dependencies(target_deadline_id);

-- ============================================
-- Helper Views
-- ============================================

-- View: Deadlines with dependency counts
CREATE VIEW IF NOT EXISTS deadlines_with_dependency_counts AS
SELECT
  d.id,
  d.case_id,
  d.user_id,
  d.title,
  d.deadline_date,
  d.priority,
  d.status,
  COUNT(DISTINCT dep_out.id) as dependencies_count,
  COUNT(DISTINCT dep_in.id) as dependents_count
FROM deadlines d
LEFT JOIN deadline_dependencies dep_out ON d.id = dep_out.source_deadline_id
LEFT JOIN deadline_dependencies dep_in ON d.id = dep_in.target_deadline_id
WHERE d.deleted_at IS NULL
GROUP BY d.id;

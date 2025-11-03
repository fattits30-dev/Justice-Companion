-- Migration: Add backup_settings table for automatic backup configuration
-- Description: Enables users to configure automatic database backups with retention policies

-- Add backup_settings table
CREATE TABLE IF NOT EXISTS backup_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0,  -- SQLite doesn't have BOOLEAN, use INTEGER 0/1
  frequency TEXT NOT NULL DEFAULT 'daily',  -- 'daily', 'weekly', 'monthly'
  backup_time TEXT NOT NULL DEFAULT '03:00',  -- HH:mm format
  keep_count INTEGER NOT NULL DEFAULT 7,  -- Number of backups to retain (1-30)
  last_backup_at TEXT,  -- ISO timestamp of last auto-backup
  next_backup_at TEXT,  -- ISO timestamp of next scheduled backup
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient user lookup
CREATE INDEX IF NOT EXISTS idx_backup_settings_user_id ON backup_settings(user_id);

-- Create composite index for scheduler queries (check enabled backups by next run time)
CREATE INDEX IF NOT EXISTS idx_backup_settings_next_backup ON backup_settings(enabled, next_backup_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_backup_settings_timestamp
AFTER UPDATE ON backup_settings
FOR EACH ROW
BEGIN
  UPDATE backup_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

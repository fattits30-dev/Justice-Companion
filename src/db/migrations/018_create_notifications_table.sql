-- Migration: Create notifications and notification preferences tables
-- Version: 018
-- Description: Support for real-time notification system with user preferences

-- Notifications table for storing all notification types
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'deadline_reminder',
    'case_status_change',
    'evidence_uploaded',
    'document_updated',
    'system_alert',
    'system_warning',
    'system_info'
  )),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata_json TEXT, -- JSON: { caseId, evidenceId, deadlineId, etc. }
  is_read INTEGER DEFAULT 0,
  is_dismissed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for efficient notification queries
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_severity ON notifications(severity, created_at DESC) WHERE is_read = 0;

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,

  -- Notification type toggles
  deadline_reminders_enabled INTEGER DEFAULT 1,
  deadline_reminder_days INTEGER DEFAULT 7, -- Days before deadline to remind
  case_updates_enabled INTEGER DEFAULT 1,
  evidence_updates_enabled INTEGER DEFAULT 1,
  system_alerts_enabled INTEGER DEFAULT 1,

  -- Delivery preferences
  sound_enabled INTEGER DEFAULT 1,
  desktop_notifications_enabled INTEGER DEFAULT 1,

  -- Quiet hours (stored as HH:MM strings)
  quiet_hours_enabled INTEGER DEFAULT 0,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for preferences lookup
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Trigger to update the updated_at timestamp on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  AFTER UPDATE ON notification_preferences
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE notification_preferences
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
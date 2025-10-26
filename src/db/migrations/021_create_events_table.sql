-- Create events table for Event Bus event persistence
-- Migration: 021_create_events_table.sql
-- Created: 2025-10-25

-- Events table stores all domain events for audit trail and event replay
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_id TEXT NOT NULL,        -- e.g., 'case-123', 'user-456'
  event_type TEXT NOT NULL,           -- e.g., 'case.created', 'evidence.uploaded'
  event_data TEXT NOT NULL,           -- JSON payload
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for aggregate_id lookups (event replay)
CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);

-- Index for event_type lookups (filtering by event type)
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Composite index for aggregate_id + occurred_at (efficient event replay with time range)
CREATE INDEX IF NOT EXISTS idx_events_aggregate_occurred ON events(aggregate_id, occurred_at);

-- Index for occurred_at (time-based queries)
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at);

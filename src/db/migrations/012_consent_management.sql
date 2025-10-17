-- Migration 012: GDPR Consent Management
-- Creates consents table for tracking user consent for data processing
-- Implements GDPR Article 7 (Conditions for consent) and Article 17 (Right to be forgotten)

-- UP
CREATE TABLE consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL CHECK(consent_type IN (
    'data_processing',    -- Required for app to function (legal basis)
    'encryption',         -- Consent to encrypt sensitive data
    'ai_processing',      -- Consent to use AI features (optional)
    'marketing'           -- Consent to receive marketing communications (optional)
  )),
  granted INTEGER NOT NULL DEFAULT 0,  -- Boolean: 1 = granted, 0 = not granted
  granted_at TEXT,                     -- ISO 8601 timestamp when consent was granted
  revoked_at TEXT,                     -- ISO 8601 timestamp when consent was revoked (GDPR Article 7.3)
  version TEXT NOT NULL,               -- Privacy policy version (e.g., "1.0", "2.0")
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_consents_type ON consents(consent_type);
CREATE INDEX idx_consents_user_type ON consents(user_id, consent_type);

-- Unique constraint: one active consent per user per type
-- (user can't have multiple active consents for same type)
CREATE UNIQUE INDEX idx_consents_unique_active
  ON consents(user_id, consent_type)
  WHERE revoked_at IS NULL;

-- DOWN
DROP INDEX IF EXISTS idx_consents_unique_active;
DROP INDEX IF EXISTS idx_consents_user_type;
DROP INDEX IF EXISTS idx_consents_type;
DROP INDEX IF EXISTS idx_consents_user_id;
DROP TABLE IF EXISTS consents;

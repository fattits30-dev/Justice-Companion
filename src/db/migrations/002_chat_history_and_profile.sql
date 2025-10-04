-- Justice Companion Database Schema
-- Migration 002: Chat history and user profile

-- Chat Conversations table: Persistent chat sessions linked to cases
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER, -- Nullable: can have general chats without case context
  title TEXT NOT NULL, -- Auto-generated from first user message
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  message_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Chat Messages table: Individual messages within conversations
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL, -- Message text
  thinking_content TEXT, -- AI reasoning (from <think> tags), nullable
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  token_count INTEGER, -- Optional: track token usage
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

-- User Profile table: Single row for local user profile
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
  name TEXT NOT NULL DEFAULT 'Legal User',
  email TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_case_id ON chat_conversations(case_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Trigger to update updated_at timestamp on conversations
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER UPDATE ON chat_conversations
BEGIN
  UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on user_profile
CREATE TRIGGER IF NOT EXISTS update_profile_timestamp
AFTER UPDATE ON user_profile
BEGIN
  UPDATE user_profile SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to increment message_count when message added
CREATE TRIGGER IF NOT EXISTS increment_message_count
AFTER INSERT ON chat_messages
BEGIN
  UPDATE chat_conversations
  SET message_count = message_count + 1,
      updated_at = datetime('now')
  WHERE id = NEW.conversation_id;
END;

-- Insert default user profile
INSERT OR IGNORE INTO user_profile (id, name, email)
VALUES (1, 'Legal User', NULL);

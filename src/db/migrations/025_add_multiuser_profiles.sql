-- Migration 025: Add Multi-User Support to Profiles
-- Removes single-row constraint and adds user_id foreign key

-- 1. Create a new user_profile_new table with proper structure
CREATE TABLE user_profile_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE, -- Each user has exactly one profile
  name TEXT NOT NULL DEFAULT 'Legal User',
  email TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Add the new fields that were missing
  full_name TEXT,
  location TEXT,
  bio_context TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Copy existing data if any (map to user_id = 1 if a default user exists)
INSERT INTO user_profile_new (user_id, name, email, avatar_url, created_at, updated_at)
SELECT
  COALESCE((SELECT id FROM users LIMIT 1), 1) as user_id, -- Use first user or default to 1
  name,
  email,
  avatar_url,
  created_at,
  updated_at
FROM user_profile
WHERE EXISTS (SELECT 1 FROM users); -- Only copy if there are users

-- 3. Drop the old table
DROP TABLE user_profile;

-- 4. Rename the new table to user_profile
ALTER TABLE user_profile_new RENAME TO user_profile;

-- 5. Recreate indexes
CREATE INDEX idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX idx_user_profile_updated_at ON user_profile(updated_at DESC);

-- 6. Recreate the trigger for updated_at
CREATE TRIGGER update_profile_timestamp
AFTER UPDATE ON user_profile
FOR EACH ROW
BEGIN
  UPDATE user_profile SET updated_at = datetime('now') WHERE id = NEW.id;
END;
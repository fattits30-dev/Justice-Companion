-- Justice Companion Database Schema
-- Migration 024: Add extended profile fields

-- Add first_name, last_name, and phone fields to user_profile
-- These fields support the ProfileService frontend/backend integration

ALTER TABLE user_profile ADD COLUMN first_name TEXT;
ALTER TABLE user_profile ADD COLUMN last_name TEXT;
ALTER TABLE user_profile ADD COLUMN phone TEXT;

-- Update existing profile to populate first_name/last_name from name if possible
UPDATE user_profile
SET
  first_name = CASE
    WHEN name LIKE '% %' THEN substr(name, 1, instr(name, ' ') - 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name LIKE '% %' THEN substr(name, instr(name, ' ') + 1)
    ELSE ''
  END
WHERE id = 1 AND (first_name IS NULL OR last_name IS NULL);

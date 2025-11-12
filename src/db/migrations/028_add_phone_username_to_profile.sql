-- Migration 028: Add phone and username fields to user_profile table
-- Adds phone number and username fields for more complete profile management

-- Add username column (nullable, can be different from auth username)
ALTER TABLE user_profile ADD COLUMN username TEXT;

-- Add phone column (nullable)
ALTER TABLE user_profile ADD COLUMN phone TEXT;

-- Note: Phone field is encrypted by the EncryptionService in the repository layer
-- Username is encrypted as it's user preference data that may differ from auth username
/**
 * Debug script to test consent seeding and checking
 * Run with: node test-consent-debug.js
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test database
const dbPath = path.join(__dirname, 'test-data', 'debug-test.db');

// Clean up old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Ensure test-data directory exists
const testDataDir = path.dirname(dbPath);
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

console.log('Creating test database at:', dbPath);
const db = new Database(dbPath);

// Create tables (simplified schema)
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    consent_type TEXT NOT NULL CHECK(consent_type IN (
      'data_processing',
      'encryption',
      'ai_processing',
      'marketing'
    )),
    granted INTEGER NOT NULL DEFAULT 0,
    granted_at TEXT,
    revoked_at TEXT,
    version TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_consents_user_id ON consents(user_id);
  CREATE INDEX idx_consents_type ON consents(consent_type);
  CREATE INDEX idx_consents_user_type ON consents(user_id, consent_type);
  CREATE UNIQUE INDEX idx_consents_unique_active
    ON consents(user_id, consent_type)
    WHERE revoked_at IS NULL;
`);

console.log('✅ Tables created');

// Create test user
const username = `testuser_${Date.now()}`;
const email = `${username}@example.com`;
const password = 'SecurePassword123!';

const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64);
const passwordHash = Buffer.concat([salt, hash]).toString('base64');
const passwordSalt = salt.toString('base64');

db.prepare(`
  INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
`).run(username, email, passwordHash, passwordSalt);

const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
console.log('✅ User created:', { id: user.id, username: user.username });

// Seed consent (EXACTLY as the test does)
console.log('\n📝 Seeding consent...');
db.prepare(`
  INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
  VALUES (?, 'data_processing', 1, datetime('now'), '1.0')
`).run(user.id);

console.log('✅ Consent seeded');

// Check if consent exists
console.log('\n🔍 Checking consent...');
const consent = db.prepare(`
  SELECT * FROM consents WHERE user_id = ? AND consent_type = ?
`).get(user.id, 'data_processing');

console.log('Consent record:', consent);

// Check using the same logic as ConsentRepository.findActiveConsent
const activeConsent = db.prepare(`
  SELECT
    id,
    user_id as userId,
    consent_type as consentType,
    granted,
    granted_at as grantedAt,
    revoked_at as revokedAt,
    version,
    created_at as createdAt
  FROM consents
  WHERE user_id = ? AND consent_type = ? AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
`).get(user.id, 'data_processing');

console.log('Active consent (using repository query):', activeConsent);

// Check using the same logic as ConsentService.hasConsent
if (activeConsent) {
  const hasConsent = activeConsent.granted === 1 && activeConsent.revokedAt === null;
  console.log('\n✅ hasConsent result:', hasConsent);
  console.log('   - granted:', activeConsent.granted, '(should be 1)');
  console.log('   - revokedAt:', activeConsent.revokedAt, '(should be null)');
} else {
  console.log('\n❌ No active consent found!');
}

// List all consents
console.log('\n📋 All consents in database:');
const allConsents = db.prepare('SELECT * FROM consents').all();
console.log(allConsents);

db.close();
console.log('\n✅ Test complete');


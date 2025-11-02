"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const perf_hooks_1 = require("perf_hooks");
const better_sqlite3_1 = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
// Performance Analysis for Justice Companion
console.log('=== JUSTICE COMPANION PERFORMANCE ANALYSIS ===\n');
// Database Performance Analysis
function analyzeDatabasePerformance() {
    console.log('## Database Performance Analysis\n');
    try {
        const dbPath = path.join(process.cwd(), '.justice-companion', 'justice.db');
        if (!fs.existsSync(dbPath)) {
            console.log('Database not found at:', dbPath);
            console.log('Creating test database for analysis...\n');
            // Create a test database
            const db = new better_sqlite3_1.default(':memory:');
            // Create schema
            db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          case_type TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL,
          evidence_type TEXT,
          file_path TEXT,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (case_id) REFERENCES cases(id)
        );
      `);
            // Insert test data
            const insertUser = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
            const insertCase = db.prepare('INSERT INTO cases (user_id, title, description, case_type, status) VALUES (?, ?, ?, ?, ?)');
            const insertEvidence = db.prepare('INSERT INTO evidence (case_id, evidence_type, file_path, description) VALUES (?, ?, ?, ?)');
            // Create test users
            for (let i = 1; i <= 10; i++) {
                insertUser.run(`user${i}`, `user${i}@test.com`, 'hash' + i);
            }
            // Create test cases
            for (let i = 1; i <= 20; i++) {
                insertCase.run(i % 10 + 1, `Case ${i}`, `Description for case ${i}`, 'Civil', 'active');
            }
            // Create test evidence
            for (let i = 1; i <= 50; i++) {
                insertEvidence.run(i % 20 + 1, 'Document', `/path/to/evidence${i}.pdf`, `Evidence ${i} description`);
            }
            console.log('Test database created successfully with sample data.');
        } else {
            console.log('Database found at:', dbPath);
        }
    } catch (error) {
        console.error('Error during database performance analysis:', error);
    }
}
// Run the analysis
analyzeDatabasePerformance();
#!/usr/bin/env node

/**
 * Verify Sessions Table Indexes
 *
 * This script checks the current state of indexes on the sessions table
 * and validates query performance with EXPLAIN QUERY PLAN.
 *
 * Usage:
 *   node scripts/verify-sessions-indexes.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'justice.db');

function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  Sessions Table Index Verification');
  console.log('='.repeat(60));
  console.log(`\nDatabase: ${DB_PATH}\n`);

  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });

    // 1. List all indexes on sessions table
    console.log('📋 Current Indexes on sessions table:');
    console.log('-'.repeat(60));

    const indexes = db
      .prepare(
        `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'index' AND tbl_name = 'sessions'
      ORDER BY name
    `
      )
      .all();

    if (indexes.length === 0) {
      console.log('   ⚠️  No indexes found (only PRIMARY KEY exists)');
    } else {
      indexes.forEach((idx, i) => {
        console.log(`   ${i + 1}. ${idx.name || '(auto-generated)'}`);
        if (idx.sql) {
          console.log(`      ${idx.sql}`);
        }
      });
    }

    // 2. Check for remember_me index specifically
    console.log('\n\n🔍 Checking for idx_sessions_remember_me:');
    console.log('-'.repeat(60));

    const rememberMeIndex = db
      .prepare(
        `
      SELECT name
      FROM sqlite_master
      WHERE type = 'index'
        AND tbl_name = 'sessions'
        AND name = 'idx_sessions_remember_me'
    `
      )
      .get();

    if (rememberMeIndex) {
      console.log('   ❌ idx_sessions_remember_me EXISTS (should be removed)');
      console.log('   💡 Run migration 014 to remove this index');
    } else {
      console.log('   ✅ idx_sessions_remember_me NOT FOUND (correctly removed)');
    }

    // 3. Verify essential indexes exist
    console.log('\n\n✅ Essential Index Verification:');
    console.log('-'.repeat(60));

    const essentialIndexes = ['idx_sessions_user_id', 'idx_sessions_expires_at'];

    essentialIndexes.forEach((indexName) => {
      const exists = db
        .prepare(
          `
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND tbl_name = 'sessions'
          AND name = ?
      `
        )
        .get(indexName);

      if (exists) {
        console.log(`   ✅ ${indexName} exists`);
      } else {
        console.log(`   ❌ ${indexName} MISSING (critical for performance!)`);
      }
    });

    // 4. Explain query plan for common queries
    console.log('\n\n📊 Query Performance Analysis (EXPLAIN QUERY PLAN):');
    console.log('-'.repeat(60));

    const queries = [
      {
        name: 'findById',
        sql: 'SELECT * FROM sessions WHERE id = ?',
        expectedIndex: 'PRIMARY KEY',
      },
      {
        name: 'findByUserId',
        sql: 'SELECT * FROM sessions WHERE user_id = ?',
        expectedIndex: 'idx_sessions_user_id',
      },
      {
        name: 'deleteExpired',
        sql: "SELECT * FROM sessions WHERE expires_at < datetime('now')",
        expectedIndex: 'idx_sessions_expires_at',
      },
      {
        name: 'countActiveSessionsByUserId',
        sql: "SELECT COUNT(*) FROM sessions WHERE user_id = ? AND expires_at > datetime('now')",
        expectedIndex: 'idx_sessions_user_id',
      },
    ];

    queries.forEach(({ name, sql, expectedIndex }) => {
      console.log(`\n   Query: ${name}`);
      console.log(`   SQL: ${sql}`);

      try {
        const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
        plan.forEach((step) => {
          const detail = step.detail || '';
          console.log(`   → ${detail}`);

          // Check if expected index is used
          if (detail.includes(expectedIndex)) {
            console.log(`   ✅ Uses ${expectedIndex}`);
          } else if (detail.includes('SCAN TABLE')) {
            console.log(`   ⚠️  Table scan (index not used)`);
          }
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    });

    // 5. Table statistics
    console.log('\n\n📈 Table Statistics:');
    console.log('-'.repeat(60));

    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    console.log(`   Total sessions: ${sessionCount.count}`);

    const activeCount = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expires_at > datetime('now')
    `
      )
      .get();
    console.log(`   Active sessions: ${activeCount.count}`);

    const expiredCount = sessionCount.count - activeCount.count;
    console.log(`   Expired sessions: ${expiredCount}`);

    console.log('\n' + '='.repeat(60));
    console.log('  Verification Complete');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure database file exists: justice.db');
    console.error('  2. Run migrations first: pnpm db:migrate');
    console.error('  3. Rebuild better-sqlite3: pnpm rebuild better-sqlite3\n');
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the script
main();

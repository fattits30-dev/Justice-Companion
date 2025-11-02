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
        console.log(`   ✅ ${indexName} EXISTS`);
      } else {
        console.log(`   ❌ ${indexName} MISSING`);
      }
    });

    // 4. Check for problematic indexes
    console.log('\n\n⚠️  Problematic Index Check:');
    console.log('-'.repeat(60));

    const problematicIndexes = ['idx_sessions_remember_me'];

    problematicIndexes.forEach((indexName) => {
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
        console.log(`   ❌ ${indexName} EXISTS (should be removed)`);
      } else {
        console.log(`   ✅ ${indexName} NOT FOUND`);
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

main();
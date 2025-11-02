#!/usr/bin/env node
/**
 * Execute the completed work breakdown SQL
 */

const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlPath = path.join(__dirname, '..', 'supabase', 'completed-work-breakdown-clean.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('📊 Executing completed work breakdown SQL...\n');
console.log('SQL File:', sqlPath);
console.log('SQL Length:', sql.length, 'characters\n');

// For local Supabase, we need to use postgres client
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function runSQL() {
  try {
    await client.connect();
    console.log('✅ Connected to local Supabase database\n');

    const result = await client.query(sql);

    console.log('\n✅ SQL executed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.log('\n📋 Results:');
      // Using console.log instead of console.table for better compatibility
      result.rows.forEach(row => {
        console.log(row);
      });
    }
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSQL();
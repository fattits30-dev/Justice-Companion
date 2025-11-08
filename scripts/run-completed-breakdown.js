#!/usr/bin/env node
/**
 * Execute the completed work breakdown SQL
 */

const fs = require("node:fs");
const path = require("node:path");

// Read the SQL file
const sqlPath = path.join(
  __dirname,
  "..",
  "supabase",
  "completed-work-breakdown-clean.sql"
);
const sql = fs.readFileSync(sqlPath, "utf-8");

console.log("📊 Executing completed work breakdown SQL...\n");
console.log("SQL File:", sqlPath);
console.log("SQL Length:", sql.length, "characters\n");

// For local Supabase, we need to use postgres client
const { Client } = require("pg");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const client = new Client({
  host: process.env.PG_HOST ?? "127.0.0.1",
  port: Number(process.env.PG_PORT ?? "54322"),
  database: process.env.PG_DATABASE ?? "postgres",
  user: process.env.PG_USER ?? "postgres",
  password: getRequiredEnv("PG_PASSWORD"),
});

async function runSQL() {
  try {
    await client.connect();
    console.log("✅ Connected to local Supabase database\n");

    const result = await client.query(sql);

    console.log("\n✅ SQL executed successfully!");
    if (result.rows && result.rows.length > 0) {
      console.log("\n📋 Results:");
      for (const row of result.rows) {
        console.log(row);
      }
    }
  } catch (error) {
    console.error("❌ Error executing SQL:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// eslint-disable-next-line promise/prefer-top-level-await
void runSQL();

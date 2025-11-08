#!/usr/bin/env node
/**
 * Show completed tasks from Supabase
 */

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

async function showTasks() {
  try {
    await client.connect();
    console.log("✅ Connected to local Supabase database\n");

    // Get summary stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_tasks,
        SUM(actual_hours) as total_hours,
        SUM(story_points) as total_points,
        COUNT(*) FILTER (WHERE ai_breakdown_parent = TRUE) as parent_tasks
      FROM tasks
      WHERE status = 'done'
        AND created_at > NOW() - INTERVAL '10 minutes';
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log("📊 COMPLETED WORK SUMMARY");
    console.log("========================\n");
    console.log(`✅ Total Completed Tasks: ${stats.total_tasks}`);
    console.log(`⏱️  Total Hours: ${stats.total_hours}h`);
    console.log(`📈 Total Story Points: ${stats.total_points}`);
    console.log(`📦 Parent Tasks: ${stats.parent_tasks}`);
    console.log("\n");

    // Get all completed tasks
    const tasksQuery = `
      SELECT
        title,
        task_type,
        priority,
        actual_hours,
        story_points,
        TO_CHAR(completed_date, 'YYYY-MM-DD') as completed
      FROM tasks
      WHERE status = 'done'
        AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        completed_date DESC
      LIMIT 50;
    `;

    const tasksResult = await client.query(tasksQuery);

    console.log("📋 COMPLETED TASKS (Most Recent)");
    console.log("=================================\n");

    console.table(tasksResult.rows);

    console.log("\n✨ All completed work has been documented in Supabase!");
    console.log("🌐 View in Supabase Studio: http://127.0.0.1:54323");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// eslint-disable-next-line promise/prefer-top-level-await
showTasks();

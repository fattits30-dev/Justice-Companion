#!/usr/bin/env node
/**
 * Show Supabase Database Structure
 * Displays all tables, views, and sample data from your deployed database
 */

const { execSync } = require('child_process');

const queries = {
  '📊 Projects': `SELECT id, name, status, priority FROM projects;`,

  '🏷️  Labels': `SELECT name, color, description FROM labels ORDER BY name;`,

  '📋 Database Tables': `
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `,

  '👁️  Views': `
    SELECT table_name AS view_name
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `,

  '🔍 Indexes': `
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `,

  '⚡ Triggers': `
    SELECT event_object_table AS table_name, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `,
};

console.log('\n🎯 Justice Companion - Supabase Database Explorer\n');
console.log('═'.repeat(70) + '\n');

// Check if Supabase CLI is authenticated
try {
  execSync('npx -y supabase@latest projects list', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Not authenticated. Run: pnpm supabase:login\n');
  process.exit(1);
}

// Run each query
for (const [title, query] of Object.entries(queries)) {
  console.log(`${title}`);
  console.log('─'.repeat(70));

  try {
    // Execute query via Supabase CLI
    const result = execSync(`npx -y supabase@latest db query "${query.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(result.trim() || '  (empty)');
  } catch (error) {
    console.error('  ⚠️  Query failed');
  }

  console.log('\n');
}

console.log('═'.repeat(70));
console.log('\n✅ Database exploration complete!\n');
console.log('📚 Full documentation: supabase/README.md');
console.log('🚀 Quick start guide: supabase/QUICKSTART.md');
console.log('💻 TypeScript client: supabase/client-example.ts');
console.log('\n📊 View in dashboard:');
console.log('   https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/editor\n');

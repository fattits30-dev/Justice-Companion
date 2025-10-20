/**
 * Database Query Performance Benchmark Script
 *
 * Benchmarks common database queries BEFORE and AFTER applying performance indexes.
 * Uses EXPLAIN QUERY PLAN to validate index usage.
 *
 * Usage:
 *   BEFORE indexes: pnpm tsx scripts/benchmark-database-queries.ts --before
 *   AFTER indexes:  pnpm tsx scripts/benchmark-database-queries.ts --after
 *   Compare both:   pnpm tsx scripts/benchmark-database-queries.ts --compare
 *
 * Requirements:
 *   - Database must have realistic test data (100+ cases, 500+ evidence items)
 *   - Run with Node.js 20.18.0 LTS
 *   - better-sqlite3 must be rebuilt for Node: pnpm rebuild:node
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Use the justice.db in root directory for benchmarking
const dbPath = path.join(process.cwd(), 'justice.db');
const getDb = () => {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}. Run migrations first.`);
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
};

interface BenchmarkResult {
  queryName: string;
  description: string;
  executionTimeMs: number;
  rowsReturned: number;
  queryPlan: string;
  usesIndex: boolean;
  indexName?: string;
  iterations: number;
}

interface BenchmarkSummary {
  timestamp: string;
  nodeVersion: string;
  sqliteVersion: string;
  totalQueries: number;
  totalExecutionTimeMs: number;
  averageQueryTimeMs: number;
  indexedQueries: number;
  results: BenchmarkResult[];
}

class DatabaseBenchmark {
  private db = getDb();
  private results: BenchmarkResult[] = [];

  /**
   * Warm up the database cache to ensure consistent benchmarks
   */
  private warmupCache(): void {
    console.log('Warming up database cache...');
    this.db.prepare('SELECT COUNT(*) FROM cases').get();
    this.db.prepare('SELECT COUNT(*) FROM evidence').get();
    this.db.prepare('SELECT COUNT(*) FROM chat_messages').get();
    console.log('✓ Cache warmed up\n');
  }

  /**
   * Generate realistic test data if it doesn't exist
   */
  private ensureTestData(): void {
    // Create test user if it doesn't exist (required for foreign keys)
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count === 0) {
      console.log('Creating test user...');
      this.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, password_salt, role)
        VALUES (1, 'benchmark_user', 'benchmark@test.com', 'hash', 'salt', 'user')
      `).run();
      console.log('✓ Test user created\n');
    }

    const caseCount = this.db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };

    if (caseCount.count < 100) {
      console.log('Generating test data (100 cases, 500 evidence items)...');

      // Create 100 test cases
      const insertCase = this.db.prepare(`
        INSERT INTO cases (title, description, case_type, status, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, datetime('now', '-' || ? || ' days'), datetime('now'))
      `);

      const insertEvidence = this.db.prepare(`
        INSERT INTO evidence (case_id, title, evidence_type, obtained_date, user_id, content)
        VALUES (?, ?, ?, datetime('now', '-' || ? || ' days'), 1, ?)
      `);

      const insertMessage = this.db.prepare(`
        INSERT INTO chat_messages (conversation_id, role, content, timestamp)
        VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
      `);

      const caseTypes = ['employment', 'housing', 'consumer', 'family', 'debt', 'other'];
      const statuses = ['active', 'closed', 'pending'];
      const evidenceTypes = ['document', 'photo', 'email', 'recording', 'note'];

      for (let i = 1; i <= 100; i++) {
        const caseType = caseTypes[i % caseTypes.length];
        const status = statuses[i % statuses.length];
        const daysAgo = Math.floor(Math.random() * 365);

        insertCase.run(
          `Test Case ${i}`,
          `Description for test case ${i} with various keywords for searching`,
          caseType,
          status,
          daysAgo
        );

        // Add 5 evidence items per case
        for (let j = 1; j <= 5; j++) {
          const evidenceType = evidenceTypes[j % evidenceTypes.length];
          insertEvidence.run(
            i,
            `Evidence ${j} for Case ${i}`,
            evidenceType,
            Math.floor(Math.random() * 365),
            `Sample evidence content for ${evidenceType}`
          );
        }
      }

      // Create test conversations and messages
      const insertConversation = this.db.prepare(`
        INSERT INTO chat_conversations (case_id, title, user_id)
        VALUES (?, ?, 1)
      `);

      for (let i = 1; i <= 50; i++) {
        const result = insertConversation.run(i, `Conversation for Case ${i}`);
        const conversationId = result.lastInsertRowid;

        // Add 20 messages per conversation
        for (let j = 1; j <= 20; j++) {
          insertMessage.run(
            conversationId,
            j % 2 === 0 ? 'user' : 'assistant',
            `Message ${j} in conversation ${i}`,
            j * 2
          );
        }
      }

      console.log('✓ Test data generated\n');
    } else {
      console.log(`✓ Test data exists (${caseCount.count} cases)\n`);
    }
  }

  /**
   * Execute a query multiple times and measure average performance
   */
  private benchmarkQuery(
    name: string,
    description: string,
    sql: string,
    iterations: number = 1000
  ): BenchmarkResult {
    const stmt = this.db.prepare(sql);

    // Get query plan
    const queryPlan = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
    const planText = (queryPlan as Array<{ detail: string }>)
      .map(row => row.detail)
      .join(' | ');

    const usesIndex = planText.includes('USING INDEX') || planText.includes('COVERING INDEX');
    const indexMatch = planText.match(/USING INDEX ([\w_]+)/);
    const indexName = indexMatch ? indexMatch[1] : undefined;

    // Warm up
    stmt.all();

    // Benchmark
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      stmt.all();
    }
    const endTime = performance.now();

    const totalTimeMs = endTime - startTime;
    const avgTimeMs = totalTimeMs / iterations;
    const rows = stmt.all();

    const result: BenchmarkResult = {
      queryName: name,
      description,
      executionTimeMs: avgTimeMs,
      rowsReturned: Array.isArray(rows) ? rows.length : 0,
      queryPlan: planText,
      usesIndex,
      indexName,
      iterations,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run all benchmarks
   */
  public runBenchmarks(): BenchmarkSummary {
    console.log('=== DATABASE QUERY PERFORMANCE BENCHMARK ===\n');

    this.ensureTestData();
    this.warmupCache();

    console.log('Running benchmarks (1000 iterations per query)...\n');

    // 1. Filter cases by user and status (most common query)
    this.benchmarkQuery(
      'User Active Cases',
      'SELECT * FROM cases WHERE user_id = 1 AND status = \'active\'',
      'SELECT * FROM cases WHERE user_id = 1 AND status = \'active\''
    );

    // 2. Filter cases by type
    this.benchmarkQuery(
      'Cases by Type',
      'SELECT * FROM cases WHERE case_type = \'employment\'',
      'SELECT * FROM cases WHERE case_type = \'employment\''
    );

    // 3. Recent cases (sort by date)
    this.benchmarkQuery(
      'Recent Cases',
      'SELECT * FROM cases ORDER BY created_at DESC LIMIT 20',
      'SELECT * FROM cases ORDER BY created_at DESC LIMIT 20'
    );

    // 4. JOIN: Cases with evidence count
    this.benchmarkQuery(
      'Cases with Evidence Count',
      'SELECT c.*, COUNT(e.id) FROM cases c LEFT JOIN evidence e ON c.id = e.case_id GROUP BY c.id',
      `SELECT c.*, COUNT(e.id) as evidence_count
       FROM cases c
       LEFT JOIN evidence e ON c.id = e.case_id
       GROUP BY c.id`
    );

    // 5. JOIN: Evidence by case and type
    this.benchmarkQuery(
      'Evidence by Case and Type',
      'SELECT * FROM evidence WHERE case_id = 1 AND evidence_type = \'document\'',
      'SELECT * FROM evidence WHERE case_id = 1 AND evidence_type = \'document\''
    );

    // 6. JOIN: Timeline events for case
    this.benchmarkQuery(
      'Timeline Events for Case',
      'SELECT * FROM timeline_events WHERE user_id = 1 AND case_id = 1',
      'SELECT * FROM timeline_events WHERE user_id = 1 AND case_id = 1'
    );

    // 7. JOIN: Active actions by case
    this.benchmarkQuery(
      'Active Actions by Case',
      'SELECT * FROM actions WHERE case_id = 1 AND status IN (\'pending\', \'in_progress\')',
      'SELECT * FROM actions WHERE case_id = 1 AND status IN (\'pending\', \'in_progress\')'
    );

    // 8. JOIN: Upcoming deadlines by case
    this.benchmarkQuery(
      'Upcoming Deadlines',
      'SELECT * FROM actions WHERE case_id = 1 AND due_date > date(\'now\') ORDER BY due_date',
      'SELECT * FROM actions WHERE case_id = 1 AND due_date > date(\'now\') ORDER BY due_date'
    );

    // 9. JOIN: Chat messages for conversation (hot path)
    this.benchmarkQuery(
      'Chat Messages for Conversation',
      'SELECT * FROM chat_messages WHERE conversation_id = 1 ORDER BY timestamp',
      'SELECT * FROM chat_messages WHERE conversation_id = 1 ORDER BY timestamp'
    );

    // 10. Complex JOIN: Case with all related data
    this.benchmarkQuery(
      'Complex 5-Way JOIN',
      'SELECT c.*, e.id, t.id, a.id, n.id FROM cases c LEFT JOIN evidence e, timeline_events t, actions a, notes n',
      `SELECT
        c.title,
        COUNT(DISTINCT e.id) as evidence_count,
        COUNT(DISTINCT t.id) as timeline_count,
        COUNT(DISTINCT a.id) as action_count,
        COUNT(DISTINCT n.id) as note_count
       FROM cases c
       LEFT JOIN evidence e ON c.id = e.case_id
       LEFT JOIN timeline_events t ON c.id = t.case_id
       LEFT JOIN actions a ON c.id = a.case_id
       LEFT JOIN notes n ON c.id = n.case_id
       WHERE c.user_id = 1
       GROUP BY c.id
       LIMIT 10`,
      100 // Fewer iterations for complex query
    );

    // 11. Session cleanup query
    this.benchmarkQuery(
      'Expired Sessions Cleanup',
      'SELECT * FROM sessions WHERE expires_at < datetime(\'now\')',
      'SELECT * FROM sessions WHERE expires_at < datetime(\'now\')'
    );

    // 12. User facts by case
    this.benchmarkQuery(
      'User Facts by Case',
      'SELECT * FROM user_facts WHERE user_id = 1 AND case_id = 1',
      'SELECT * FROM user_facts WHERE user_id = 1 AND case_id = 1'
    );

    // Calculate summary statistics
    const totalTime = this.results.reduce((sum, r) => sum + r.executionTimeMs, 0);
    const indexedCount = this.results.filter(r => r.usesIndex).length;

    const summary: BenchmarkSummary = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      sqliteVersion: this.db.prepare('SELECT sqlite_version() as version').get() as string,
      totalQueries: this.results.length,
      totalExecutionTimeMs: totalTime,
      averageQueryTimeMs: totalTime / this.results.length,
      indexedQueries: indexedCount,
      results: this.results,
    };

    this.printResults(summary);
    return summary;
  }

  /**
   * Print benchmark results to console
   */
  private printResults(summary: BenchmarkSummary): void {
    console.log('\n=== BENCHMARK RESULTS ===\n');
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log(`Node: ${summary.nodeVersion} | SQLite: ${summary.sqliteVersion}`);
    console.log(`Total Queries: ${summary.totalQueries}`);
    console.log(`Indexed Queries: ${summary.indexedQueries}/${summary.totalQueries} (${((summary.indexedQueries / summary.totalQueries) * 100).toFixed(1)}%)\n`);

    // Sort by execution time (slowest first)
    const sortedResults = [...this.results].sort((a, b) => b.executionTimeMs - a.executionTimeMs);

    console.log('Query Performance (sorted by execution time):\n');
    sortedResults.forEach((result, index) => {
      const indexIcon = result.usesIndex ? '✓' : '✗';
      const indexInfo = result.usesIndex ? `[${result.indexName}]` : '[FULL SCAN]';

      console.log(`${index + 1}. ${result.queryName}`);
      console.log(`   ${result.description}`);
      console.log(`   Time: ${result.executionTimeMs.toFixed(4)} ms | Rows: ${result.rowsReturned} | Index: ${indexIcon} ${indexInfo}`);
      console.log(`   Plan: ${result.queryPlan}`);
      console.log('');
    });

    console.log(`Total Execution Time: ${summary.totalExecutionTimeMs.toFixed(2)} ms`);
    console.log(`Average Query Time: ${summary.averageQueryTimeMs.toFixed(4)} ms`);
  }

  /**
   * Save results to JSON file
   */
  public saveResults(filename: string): void {
    const summary: BenchmarkSummary = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      sqliteVersion: (this.db.prepare('SELECT sqlite_version() as version').get() as { version: string }).version,
      totalQueries: this.results.length,
      totalExecutionTimeMs: this.results.reduce((sum, r) => sum + r.executionTimeMs, 0),
      averageQueryTimeMs: this.results.reduce((sum, r) => sum + r.executionTimeMs, 0) / this.results.length,
      indexedQueries: this.results.filter(r => r.usesIndex).length,
      results: this.results,
    };

    const outputPath = path.join(process.cwd(), 'docs', 'performance', filename);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    console.log(`\n✓ Results saved to: ${outputPath}`);
  }
}

// Main execution
const args = process.argv.slice(2);
const mode = args[0] || '--before';

const benchmark = new DatabaseBenchmark();
const summary = benchmark.runBenchmarks();

// Save results based on mode
if (mode === '--before') {
  benchmark.saveResults('benchmark-before-indexes.json');
} else if (mode === '--after') {
  benchmark.saveResults('benchmark-after-indexes.json');
} else if (mode === '--compare') {
  benchmark.saveResults('benchmark-comparison.json');

  // Load and compare both results
  const beforePath = path.join(process.cwd(), 'docs', 'performance', 'benchmark-before-indexes.json');
  const afterPath = path.join(process.cwd(), 'docs', 'performance', 'benchmark-after-indexes.json');

  if (fs.existsSync(beforePath) && fs.existsSync(afterPath)) {
    const before = JSON.parse(fs.readFileSync(beforePath, 'utf-8')) as BenchmarkSummary;
    const after = JSON.parse(fs.readFileSync(afterPath, 'utf-8')) as BenchmarkSummary;

    console.log('\n=== BEFORE vs AFTER COMPARISON ===\n');
    console.log(`Before: ${before.averageQueryTimeMs.toFixed(4)} ms avg`);
    console.log(`After:  ${after.averageQueryTimeMs.toFixed(4)} ms avg`);
    console.log(`Improvement: ${((before.averageQueryTimeMs / after.averageQueryTimeMs)).toFixed(2)}x faster`);
    console.log(`\nIndexed Queries: ${before.indexedQueries} → ${after.indexedQueries} (+${after.indexedQueries - before.indexedQueries})`);
  }
}

console.log('\n✓ Benchmark complete!');

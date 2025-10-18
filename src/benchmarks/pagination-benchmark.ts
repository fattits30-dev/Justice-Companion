/**
 * Performance Benchmark: Pagination vs Full Load
 *
 * Validates 60-80% improvement target for Phase 2 pagination optimization
 *
 * Test Scenarios:
 * 1. Small dataset (100 cases)
 * 2. Medium dataset (500 cases)
 * 3. Large dataset (1000 cases)
 *
 * Metrics:
 * - Load time (ms)
 * - Decryption operations count
 * - Memory usage (MB)
 * - Improvement percentage
 */

import Database from 'better-sqlite3';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogger } from '../services/AuditLogger';
import { DecryptionCache } from '../services/DecryptionCache';
import { CaseRepositoryPaginated } from '../repositories/CaseRepositoryPaginated';

// Benchmark configuration
const DATASET_SIZES = [100, 500, 1000];
const PAGE_SIZE = 20;
const ENCRYPTION_KEY = Buffer.from('a'.repeat(64), 'hex'); // 32-byte key

interface BenchmarkResult {
  datasetSize: number;
  method: 'findAll' | 'findPaginated';
  loadTimeMs: number;
  decryptionCount: number;
  memoryUsedMB: number;
}

/**
 * Setup in-memory test database
 */
function setupTestDatabase(): Database.Database {
  const db = new Database(':memory:');

  // Create cases table
  db.exec(`
    CREATE TABLE cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      case_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create audit_logs table (required by AuditLogger)
  db.exec(`
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      user_id TEXT,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      integrity_hash TEXT NOT NULL,
      previous_log_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

/**
 * Populate database with test cases
 */
function populateDatabase(
  db: Database.Database,
  encryptionService: EncryptionService,
  count: number,
): void {
  const stmt = db.prepare(`
    INSERT INTO cases (title, description, case_type, status)
    VALUES (@title, @description, @caseType, 'active')
  `);

  for (let i = 1; i <= count; i++) {
    const description = `This is case description #${i}. `.repeat(10); // ~300 chars
    const encryptedDescription = encryptionService.encrypt(description);

    stmt.run({
      title: `Case ${i}`,
      description: encryptedDescription ? JSON.stringify(encryptedDescription) : null,
      caseType: 'civil',
    });
  }

  console.log(`✓ Populated database with ${count} cases`);
}

/**
 * Measure memory usage
 */
function getMemoryUsageMB(): number {
  const usage = process.memoryUsage();
  return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
}

/**
 * Benchmark findAll() - loads all cases at once
 */
function benchmarkFindAll(repo: CaseRepositoryPaginated): BenchmarkResult {
  const startMemory = getMemoryUsageMB();
  const startTime = performance.now();

  const cases = repo.findAll();

  const endTime = performance.now();
  const endMemory = getMemoryUsageMB();

  return {
    datasetSize: cases.length,
    method: 'findAll',
    loadTimeMs: Math.round((endTime - startTime) * 100) / 100,
    decryptionCount: cases.length, // Decrypts all cases
    memoryUsedMB: endMemory - startMemory,
  };
}

/**
 * Benchmark findPaginated() - loads only first page
 */
function benchmarkFindPaginated(repo: CaseRepositoryPaginated): BenchmarkResult {
  const startMemory = getMemoryUsageMB();
  const startTime = performance.now();

  const result = repo.findPaginated({ limit: PAGE_SIZE, direction: 'desc' });

  const endTime = performance.now();
  const endMemory = getMemoryUsageMB();

  return {
    datasetSize: result.items.length,
    method: 'findPaginated',
    loadTimeMs: Math.round((endTime - startTime) * 100) / 100,
    decryptionCount: result.items.length, // Only decrypts visible page
    memoryUsedMB: endMemory - startMemory,
  };
}

/**
 * Run benchmark for a specific dataset size
 */
function runBenchmark(datasetSize: number): {
  findAll: BenchmarkResult;
  findPaginated: BenchmarkResult;
  improvement: number;
} {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmark: ${datasetSize} cases`);
  console.log('='.repeat(60));

  // Setup
  const db = setupTestDatabase();
  const encryptionService = new EncryptionService(ENCRYPTION_KEY);
  const auditLogger = new AuditLogger(db);
  const cache = new DecryptionCache(auditLogger);

  populateDatabase(db, encryptionService, datasetSize);

  // Run benchmarks
  const repo1 = new CaseRepositoryPaginated(encryptionService, auditLogger, cache, db);
  const findAllResult = benchmarkFindAll(repo1);

  // Clear cache between tests
  cache.clear();

  const repo2 = new CaseRepositoryPaginated(encryptionService, auditLogger, cache, db);
  const findPaginatedResult = benchmarkFindPaginated(repo2);

  // Calculate improvement
  const improvement = Math.round(((findAllResult.loadTimeMs - findPaginatedResult.loadTimeMs) / findAllResult.loadTimeMs) * 100);

  // Cleanup
  db.close();

  return {
    findAll: findAllResult,
    findPaginated: findPaginatedResult,
    improvement,
  };
}

/**
 * Print results table
 */
function printResults(results: ReturnType<typeof runBenchmark>[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(80));

  results.forEach((result) => {
    console.log(`\n📊 Dataset: ${result.findAll.datasetSize} cases`);
    console.log('-'.repeat(80));

    console.log('\nfindAll() - Load ALL cases:');
    console.log(`  ⏱️  Load Time:       ${result.findAll.loadTimeMs} ms`);
    console.log(`  🔓 Decryptions:     ${result.findAll.decryptionCount}`);
    console.log(`  💾 Memory Used:     ${result.findAll.memoryUsedMB} MB`);

    console.log('\nfindPaginated() - Load FIRST PAGE only (20 items):');
    console.log(`  ⏱️  Load Time:       ${result.findPaginated.loadTimeMs} ms`);
    console.log(`  🔓 Decryptions:     ${result.findPaginated.decryptionCount}`);
    console.log(`  💾 Memory Used:     ${result.findPaginated.memoryUsedMB} MB`);

    const improvementColor = result.improvement >= 60 ? '🟢' : result.improvement >= 40 ? '🟡' : '🔴';
    console.log(`\n${improvementColor} Performance Improvement: ${result.improvement}%`);

    if (result.improvement >= 60) {
      console.log('   ✅ TARGET ACHIEVED (60-80% improvement)');
    } else if (result.improvement >= 40) {
      console.log('   ⚠️  BELOW TARGET (expected 60-80%)');
    } else {
      console.log('   ❌ SIGNIFICANT UNDERPERFORMANCE');
    }
  });

  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const avgImprovement = Math.round(
    results.reduce((sum, r) => sum + r.improvement, 0) / results.length,
  );

  console.log(`\nAverage Improvement: ${avgImprovement}%`);
  console.log(`Target Range: 60-80%`);

  if (avgImprovement >= 60 && avgImprovement <= 80) {
    console.log('\n✅ PERFORMANCE TARGET ACHIEVED');
  } else if (avgImprovement > 80) {
    console.log('\n🎯 EXCEEDED TARGET - Excellent performance!');
  } else {
    console.log('\n⚠️  TARGET NOT MET - Further optimization needed');
  }

  console.log('\nKey Insight:');
  console.log(`With pagination, you only decrypt ${PAGE_SIZE} items instead of ALL items.`);
  console.log(`For a 1000-case dataset, that's ${PAGE_SIZE}/1000 = 2% of the work!`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Main benchmark execution
 */
function main(): void {
  console.log('🚀 Starting Pagination Performance Benchmark\n');
  console.log(`Configuration:`);
  console.log(`  - Page Size: ${PAGE_SIZE} items`);
  console.log(`  - Dataset Sizes: ${DATASET_SIZES.join(', ')} cases`);
  console.log(`  - Target Improvement: 60-80%\n`);

  const results = DATASET_SIZES.map((size) => runBenchmark(size));

  printResults(results);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runBenchmark, DATASET_SIZES, PAGE_SIZE };

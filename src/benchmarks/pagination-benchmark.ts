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
import { logger } from '../utils/logger';

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

  logger.info('BenchmarkSetup', `Populated database with ${count} cases`);
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
  logger.info('Benchmark', `\n${'='.repeat(60)}`);
  logger.info('Benchmark', `Dataset: ${datasetSize} cases`);
  logger.info('Benchmark', '='.repeat(60));

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
  logger.info('BenchmarkResults', '\n' + '='.repeat(80));
  logger.info('BenchmarkResults', 'PERFORMANCE BENCHMARK RESULTS');
  logger.info('BenchmarkResults', '='.repeat(80));

  results.forEach((result) => {
    logger.info('BenchmarkResults', `\nDataset: ${result.findAll.datasetSize} cases`);
    logger.info('BenchmarkResults', '-'.repeat(80));

    logger.info('BenchmarkResults', '\nfindAll() - Load ALL cases:');
    logger.info('BenchmarkResults', `  Load Time:       ${result.findAll.loadTimeMs} ms`);
    logger.info('BenchmarkResults', `  Decryptions:     ${result.findAll.decryptionCount}`);
    logger.info('BenchmarkResults', `  Memory Used:     ${result.findAll.memoryUsedMB} MB`);

    logger.info('BenchmarkResults', '\nfindPaginated() - Load FIRST PAGE only (20 items):');
    logger.info('BenchmarkResults', `  Load Time:       ${result.findPaginated.loadTimeMs} ms`);
    logger.info('BenchmarkResults', `  Decryptions:     ${result.findPaginated.decryptionCount}`);
    logger.info('BenchmarkResults', `  Memory Used:     ${result.findPaginated.memoryUsedMB} MB`);

    const improvementColor = result.improvement >= 60 ? '🟢' : result.improvement >= 40 ? '🟡' : '🔴';
    logger.info('BenchmarkResults', `\n${improvementColor} Performance Improvement: ${result.improvement}%`);

    if (result.improvement >= 60) {
      logger.info('BenchmarkResults', '   TARGET ACHIEVED (60-80% improvement)');
    } else if (result.improvement >= 40) {
      logger.warn('BenchmarkResults', '   BELOW TARGET (expected 60-80%)');
    } else {
      logger.error('BenchmarkResults', '   SIGNIFICANT UNDERPERFORMANCE');
    }
  });

  // Overall summary
  logger.info('BenchmarkResults', '\n' + '='.repeat(80));
  logger.info('BenchmarkResults', 'SUMMARY');
  logger.info('BenchmarkResults', '='.repeat(80));

  const avgImprovement = Math.round(
    results.reduce((sum, r) => sum + r.improvement, 0) / results.length,
  );

  logger.info('BenchmarkResults', `\nAverage Improvement: ${avgImprovement}%`);
  logger.info('BenchmarkResults', `Target Range: 60-80%`);

  if (avgImprovement >= 60 && avgImprovement <= 80) {
    logger.info('BenchmarkResults', '\nPERFORMANCE TARGET ACHIEVED');
  } else if (avgImprovement > 80) {
    logger.info('BenchmarkResults', '\nEXCEEDED TARGET - Excellent performance!');
  } else {
    logger.warn('BenchmarkResults', '\nTARGET NOT MET - Further optimization needed');
  }

  logger.info('BenchmarkResults', '\nKey Insight:');
  logger.info('BenchmarkResults', `With pagination, you only decrypt ${PAGE_SIZE} items instead of ALL items.`);
  logger.info('BenchmarkResults', `For a 1000-case dataset, that's ${PAGE_SIZE}/1000 = 2% of the work!`);
  logger.info('BenchmarkResults', '='.repeat(80) + '\n');
}

/**
 * Main benchmark execution
 */
function main(): void {
  logger.info('Benchmark', 'Starting Pagination Performance Benchmark\n');
  logger.info('Benchmark', `Configuration:`);
  logger.info('Benchmark', `  - Page Size: ${PAGE_SIZE} items`);
  logger.info('Benchmark', `  - Dataset Sizes: ${DATASET_SIZES.join(', ')} cases`);
  logger.info('Benchmark', `  - Target Improvement: 60-80%\n`);

  const results = DATASET_SIZES.map((size) => runBenchmark(size));

  printResults(results);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runBenchmark, DATASET_SIZES, PAGE_SIZE };

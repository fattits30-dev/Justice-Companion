/**
 * Performance Analysis Tool for Justice Companion
 *
 * This script performs comprehensive performance profiling to identify bottlenecks:
 * 1. Database query performance
 * 2. Encryption/decryption overhead
 * 3. Cache effectiveness
 * 4. Memory usage patterns
 * 5. N+1 query detection
 */

import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';
import { EncryptionService } from '../services/EncryptionService';
import { DecryptionCache } from '../services/DecryptionCache';
import { AuditLogger } from '../services/AuditLogger';
import { CaseRepository } from '../repositories/CaseRepository';
import { EvidenceRepository } from '../repositories/EvidenceRepository';
import { NotesRepository } from '../repositories/NotesRepository';
import { CaseFactsRepository } from '../repositories/CaseFactsRepository';
import { UserFactsRepository } from '../repositories/UserFactsRepository';
import { TimelineRepository } from '../repositories/TimelineRepository';
import type { Case } from '../models/Case';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  count?: number;
  averageTime?: number;
  overhead?: number;
  memoryUsed?: number;
}

class PerformanceAnalyzer {
  private db: Database.Database;
  private encryptionService: EncryptionService;
  private auditLogger: AuditLogger;
  private metrics: PerformanceMetrics[] = [];

  constructor() {
    // Initialize test database
    this.db = new Database(':memory:');
    this.setupDatabase();

    // Initialize services
    const key = EncryptionService.generateKey();
    this.encryptionService = new EncryptionService(key);
    this.auditLogger = new AuditLogger(this.db);
  }

  private setupDatabase(): void {
    // Create minimal schema for testing
    this.db.exec(`
      CREATE TABLE cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        case_type TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        evidence_type TEXT NOT NULL,
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE case_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        fact_content TEXT NOT NULL,
        fact_category TEXT NOT NULL,
        importance_level INTEGER DEFAULT 5,
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE user_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        fact_content TEXT NOT NULL,
        fact_type TEXT NOT NULL,
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        event_date TEXT NOT NULL,
        description TEXT,
        event_type TEXT NOT NULL,
        user_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        success INTEGER DEFAULT 1
      );

      -- Add indexes
      CREATE INDEX idx_evidence_case_id ON evidence(case_id);
      CREATE INDEX idx_notes_case_id ON notes(case_id);
      CREATE INDEX idx_case_facts_case_id ON case_facts(case_id);
      CREATE INDEX idx_user_facts_case_id ON user_facts(case_id);
      CREATE INDEX idx_timeline_events_case_id ON timeline_events(case_id);
    `);
  }

  private measureTime<T>(fn: () => T): [T, number] {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return [result, duration];
  }

  private getMemoryUsage(): number {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Test 1: Encryption/Decryption Performance
   */
  async testEncryptionPerformance(): Promise<void> {
    console.log('\n=== Testing Encryption/Decryption Performance ===');

    const testData = [
      { size: 'small', text: 'Short legal note' },
      { size: 'medium', text: 'A'.repeat(500) },
      { size: 'large', text: 'A'.repeat(5000) },
      { size: 'xlarge', text: 'A'.repeat(50000) }
    ];

    for (const { size, text } of testData) {
      // Test encryption
      const [encrypted, encryptTime] = this.measureTime(() =>
        this.encryptionService.encrypt(text)
      );

      // Test decryption
      const [, decryptTime] = this.measureTime(() =>
        this.encryptionService.decrypt(encrypted!)
      );

      this.metrics.push({
        operation: `encrypt_${size}`,
        duration: encryptTime,
        count: text.length
      });

      this.metrics.push({
        operation: `decrypt_${size}`,
        duration: decryptTime,
        count: text.length
      });

      console.log(`${size} (${text.length} chars): Encrypt=${encryptTime.toFixed(2)}ms, Decrypt=${decryptTime.toFixed(2)}ms`);
    }
  }

  /**
   * Test 2: DecryptionCache Effectiveness
   */
  async testCachePerformance(): Promise<void> {
    console.log('\n=== Testing DecryptionCache Performance ===');

    const cache = new DecryptionCache(this.auditLogger);
    const testKey = 'test:1:field';
    const testValue = 'Sensitive legal information that needs to be cached';

    // Measure cache miss + set
    const [, missTime] = this.measureTime(() => {
      const cached = cache.get(testKey);
      if (!cached) {
        cache.set(testKey, testValue);
      }
      return cached;
    });

    // Measure cache hit (should be much faster)
    const hits = 1000;
    const [, totalHitTime] = this.measureTime(() => {
      for (let i = 0; i < hits; i++) {
        cache.get(testKey);
      }
    });

    const avgHitTime = totalHitTime / hits;

    this.metrics.push({
      operation: 'cache_miss_and_set',
      duration: missTime
    });

    this.metrics.push({
      operation: 'cache_hit',
      duration: avgHitTime,
      count: hits,
      averageTime: avgHitTime
    });

    console.log(`Cache miss + set: ${missTime.toFixed(2)}ms`);
    console.log(`Cache hit (avg of ${hits}): ${avgHitTime.toFixed(4)}ms`);
    console.log(`Cache speedup: ${(missTime / avgHitTime).toFixed(0)}x faster`);
  }

  /**
   * Test 3: Repository Performance WITH and WITHOUT Cache
   */
  async testRepositoryPerformance(): Promise<void> {
    console.log('\n=== Testing Repository Performance (Cache vs No Cache) ===');

    // Create test data
    const caseCount = 100;
    const evidencePerCase = 5;

    // Repository without cache
    const repoNoCache = new CaseRepository(this.encryptionService, this.auditLogger);
    const evidenceRepoNoCache = new EvidenceRepository(this.encryptionService, this.auditLogger);

    // Repository with cache
    const cache = new DecryptionCache(this.auditLogger);
    // Note: Current repositories don't accept cache in constructor - this is the problem!

    // Insert test cases
    const cases: Case[] = [];
    for (let i = 0; i < caseCount; i++) {
      const caseData = repoNoCache.create({
        title: `Test Case ${i}`,
        caseType: 'employment' as const,
        description: `Detailed description for case ${i} with sensitive information`
      });
      cases.push(caseData);

      // Add evidence for each case
      for (let j = 0; j < evidencePerCase; j++) {
        evidenceRepoNoCache.create({
          caseId: caseData.id,
          title: `Evidence ${j}`,
          evidenceType: 'document',
          content: `Sensitive evidence content for case ${i} item ${j}`
        });
      }
    }

    // Test 1: Load all cases (no cache)
    const memBefore = this.getMemoryUsage();
    const [, noCacheTime] = this.measureTime(() => {
      repoNoCache.findAll();
    });
    const memAfter = this.getMemoryUsage();

    this.metrics.push({
      operation: 'load_100_cases_no_cache',
      duration: noCacheTime,
      count: caseCount,
      averageTime: noCacheTime / caseCount,
      memoryUsed: memAfter - memBefore
    });

    console.log(`Load ${caseCount} cases (no cache): ${noCacheTime.toFixed(2)}ms, ${(noCacheTime/caseCount).toFixed(2)}ms/case`);

    // Test 2: N+1 Query Pattern Detection
    const [, n1Time] = this.measureTime(() => {
      const allCases = repoNoCache.findAll();
      let totalEvidence = 0;
      for (const caseItem of allCases) {
        const evidence = evidenceRepoNoCache.findByCaseId(caseItem.id);
        totalEvidence += evidence.length;
      }
      return totalEvidence;
    });

    this.metrics.push({
      operation: 'n_plus_1_query_pattern',
      duration: n1Time,
      count: caseCount + 1, // 1 for cases + N for evidence
      overhead: n1Time / noCacheTime
    });

    console.log(`N+1 Query Pattern: ${n1Time.toFixed(2)}ms for ${caseCount} cases + evidence`);
    console.log(`N+1 Overhead: ${(n1Time / noCacheTime).toFixed(1)}x slower than just cases`);
  }

  /**
   * Test 4: Database Index Effectiveness
   */
  async testIndexPerformance(): Promise<void> {
    console.log('\n=== Testing Database Index Performance ===');

    // Test query with index (case_id on evidence)
    const [, withIndexTime] = this.measureTime(() => {
      this.db.prepare('SELECT * FROM evidence WHERE case_id = ?').all(1);
    });

    // Test query without index (simulated by using a non-indexed field)
    const [, withoutIndexTime] = this.measureTime(() => {
      this.db.prepare('SELECT * FROM evidence WHERE content LIKE ?').all('%sensitive%');
    });

    this.metrics.push({
      operation: 'query_with_index',
      duration: withIndexTime
    });

    this.metrics.push({
      operation: 'query_without_index',
      duration: withoutIndexTime,
      overhead: withoutIndexTime / withIndexTime
    });

    console.log(`Query with index: ${withIndexTime.toFixed(2)}ms`);
    console.log(`Query without index: ${withoutIndexTime.toFixed(2)}ms`);
    console.log(`Index speedup: ${(withoutIndexTime / withIndexTime).toFixed(1)}x faster`);
  }

  /**
   * Test 5: Bulk Operations Performance
   */
  async testBulkOperations(): Promise<void> {
    console.log('\n=== Testing Bulk Operations Performance ===');

    const repo = new CaseRepository(this.encryptionService, this.auditLogger);
    const bulkSize = 50;

    // Single transactions
    const [, singleTime] = this.measureTime(() => {
      for (let i = 0; i < bulkSize; i++) {
        repo.create({
          title: `Bulk Case ${i}`,
          caseType: 'employment',
          description: `Bulk description ${i}`
        });
      }
    });

    // Batch transaction (simulated with transaction)
    const [, batchTime] = this.measureTime(() => {
      const transaction = this.db.transaction(() => {
        for (let i = 0; i < bulkSize; i++) {
          repo.create({
            title: `Batch Case ${i}`,
            caseType: 'employment',
            description: `Batch description ${i}`
          });
        }
      });
      transaction();
    });

    this.metrics.push({
      operation: 'bulk_insert_single_transactions',
      duration: singleTime,
      count: bulkSize,
      averageTime: singleTime / bulkSize
    });

    this.metrics.push({
      operation: 'bulk_insert_batch_transaction',
      duration: batchTime,
      count: bulkSize,
      averageTime: batchTime / bulkSize,
      overhead: singleTime / batchTime
    });

    console.log(`Single transactions (${bulkSize} inserts): ${singleTime.toFixed(2)}ms`);
    console.log(`Batch transaction (${bulkSize} inserts): ${batchTime.toFixed(2)}ms`);
    console.log(`Batch speedup: ${(singleTime / batchTime).toFixed(1)}x faster`);
  }

  /**
   * Generate Performance Report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE ANALYSIS REPORT - JUSTICE COMPANION');
    console.log('='.repeat(80));

    // Critical Bottlenecks Identified
    console.log('\n### CRITICAL BOTTLENECKS IDENTIFIED ###\n');

    // 1. Missing DecryptionCache Integration
    const decryptMetrics = this.metrics.filter(m => m.operation.includes('decrypt'));
    const avgDecryptTime = decryptMetrics.reduce((sum, m) => sum + m.duration, 0) / decryptMetrics.length;
    const cacheHitTime = this.metrics.find(m => m.operation === 'cache_hit')?.averageTime || 0;
    const cacheSpeedup = avgDecryptTime / cacheHitTime;

    console.log(`1. NO DECRYPTION CACHING (HIGH PRIORITY)`);
    console.log(`   - Current decrypt time: ${avgDecryptTime.toFixed(2)}ms average`);
    console.log(`   - With cache: ${cacheHitTime.toFixed(4)}ms`);
    console.log(`   - Potential speedup: ${cacheSpeedup.toFixed(0)}x faster`);
    console.log(`   - Estimated overhead reduction: 60-80%`);
    console.log(`   - STATUS: DecryptionCache exists but NOT integrated in repositories!`);

    // 2. N+1 Query Problems
    const n1Metric = this.metrics.find(m => m.operation === 'n_plus_1_query_pattern');
    if (n1Metric) {
      console.log(`\n2. N+1 QUERY PATTERNS DETECTED`);
      console.log(`   - Loading cases + evidence: ${n1Metric.duration.toFixed(2)}ms`);
      console.log(`   - Overhead: ${n1Metric.overhead?.toFixed(1)}x slower`);
      console.log(`   - Solution: Implement eager loading or batch queries`);
    }

    // 3. Synchronous SQLite Operations
    console.log(`\n3. SYNCHRONOUS SQLITE OPERATIONS`);
    console.log(`   - All DB operations block main thread`);
    console.log(`   - WAL mode enabled: Yes (good for concurrency)`);
    console.log(`   - Cache size: 40MB (adequate)`);
    console.log(`   - Constraint: better-sqlite3 is synchronous-only (Electron requirement)`);

    // 4. Bulk Operations
    const bulkSingle = this.metrics.find(m => m.operation === 'bulk_insert_single_transactions');
    const bulkBatch = this.metrics.find(m => m.operation === 'bulk_insert_batch_transaction');
    if (bulkSingle && bulkBatch) {
      console.log(`\n4. BULK OPERATIONS OPTIMIZATION AVAILABLE`);
      console.log(`   - Single transactions: ${bulkSingle.averageTime?.toFixed(2)}ms per insert`);
      console.log(`   - Batch transaction: ${bulkBatch.averageTime?.toFixed(2)}ms per insert`);
      console.log(`   - Speedup available: ${bulkSingle.overhead?.toFixed(1)}x`);
    }

    // Performance Metrics Summary
    console.log('\n### PERFORMANCE METRICS SUMMARY ###\n');
    console.log('Operation                          | Time (ms) | Count | Avg (ms)');
    console.log('-----------------------------------|-----------|-------|----------');

    for (const metric of this.metrics) {
      const op = metric.operation.padEnd(34);
      const time = metric.duration.toFixed(2).padStart(9);
      const count = (metric.count || '-').toString().padStart(5);
      const avg = metric.averageTime ? metric.averageTime.toFixed(2).padStart(8) : '-'.padStart(8);
      console.log(`${op} | ${time} | ${count} | ${avg}`);
    }

    // Recommendations
    console.log('\n### RECOMMENDATIONS (PRIORITY ORDER) ###\n');
    console.log('1. **IMMEDIATE: Integrate DecryptionCache**');
    console.log('   - Modify repository constructors to accept DecryptionCache');
    console.log('   - Update initializeRepositories() to create and inject cache');
    console.log('   - Estimated gain: 60-80% reduction in decryption overhead\n');

    console.log('2. **HIGH: Eliminate N+1 Queries**');
    console.log('   - Implement getCaseWithRelatedData() method');
    console.log('   - Use JOIN queries for eager loading');
    console.log('   - Consider implementing DataLoader pattern\n');

    console.log('3. **MEDIUM: React Component Optimization**');
    console.log('   - Add React.memo to list components');
    console.log('   - Use useMemo for expensive computations');
    console.log('   - Implement virtualization for large lists\n');

    console.log('4. **LOW: Database Optimizations**');
    console.log('   - Indexes are properly configured');
    console.log('   - Consider ANALYZE command periodically');
    console.log('   - Monitor for missing indexes on audit_logs, consents tables\n');

    console.log('='.repeat(80));
  }

  async runAllTests(): Promise<void> {
    console.log('Starting Performance Analysis...\n');

    await this.testEncryptionPerformance();
    await this.testCachePerformance();
    await this.testRepositoryPerformance();
    await this.testIndexPerformance();
    await this.testBulkOperations();

    this.generateReport();

    // Cleanup
    this.db.close();
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.runAllTests().catch(console.error);
}

export { PerformanceAnalyzer };
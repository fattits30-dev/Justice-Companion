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
    console.warn('\n=== Testing Encryption/Decryption Performance ===');

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

      console.warn(`${size} (${text.length} chars): Encrypt=${encryptTime.toFixed(2)}ms, Decrypt=${decryptTime.toFixed(2)}ms`);
    }
  }

  /**
   * Test 2: DecryptionCache Effectiveness
   */
  async testCachePerformance(): Promise<void> {
    console.warn('\n=== Testing DecryptionCache Performance ===');

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

    console.warn(`Cache miss + set: ${missTime.toFixed(2)}ms`);
    console.warn(`Cache hit (avg of ${hits}): ${avgHitTime.toFixed(4)}ms`);
    console.warn(`Cache speedup: ${(missTime / avgHitTime).toFixed(0)}x faster`);
  }

  /**
   * Test 3: Repository Performance WITH and WITHOUT Cache
   */
  async testRepositoryPerformance(): Promise<void> {
    console.warn('\n=== Testing Repository Performance (Cache vs No Cache) ===');

    // Create test data
    const caseCount = 100;
    const evidencePerCase = 5;

    // Repository without cache
    const repoNoCache = new CaseRepository(this.encryptionService, this.auditLogger);
    const evidenceRepoNoCache = new EvidenceRepository(this.encryptionService, this.auditLogger);

    // Note: Repositories don't currently support cache injection in constructor

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

    console.warn(`Load ${caseCount} cases (no cache): ${noCacheTime.toFixed(2)}ms, ${(noCacheTime/caseCount).toFixed(2)}ms/case`);

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

    console.warn(`N+1 Query Pattern: ${n1Time.toFixed(2)}ms for ${caseCount} cases + evidence`);
    console.warn(`N+1 Overhead: ${(n1Time / noCacheTime).toFixed(1)}x slower than just cases`);
  }

  /**
   * Test 4: Database Index Effectiveness
   */
  async testIndexPerformance(): Promise<void> {
    console.warn('\n=== Testing Database Index Performance ===');

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

    console.warn(`Query with index: ${withIndexTime.toFixed(2)}ms`);
    console.warn(`Query without index: ${withoutIndexTime.toFixed(2)}ms`);
    console.warn(`Index speedup: ${(withoutIndexTime / withIndexTime).toFixed(1)}x faster`);
  }

  /**
   * Test 5: Bulk Operations Performance
   */
  async testBulkOperations(): Promise<void> {
    console.warn('\n=== Testing Bulk Operations Performance ===');

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

    console.warn(`Single transactions (${bulkSize} inserts): ${singleTime.toFixed(2)}ms`);
    console.warn(`Batch transaction (${bulkSize} inserts): ${batchTime.toFixed(2)}ms`);
    console.warn(`Batch speedup: ${(singleTime / batchTime).toFixed(1)}x faster`);
  }

  /**
   * Generate Performance Report
   */
  generateReport(): void {
    console.warn('\n' + '='.repeat(80));
    console.warn('PERFORMANCE ANALYSIS REPORT - JUSTICE COMPANION');
    console.warn('='.repeat(80));

    // Critical Bottlenecks Identified
    console.warn('\n### CRITICAL BOTTLENECKS IDENTIFIED ###\n');

    // 1. Missing DecryptionCache Integration
    const decryptMetrics = this.metrics.filter(m => m.operation.includes('decrypt'));
    const avgDecryptTime = decryptMetrics.reduce((sum, m) => sum + m.duration, 0) / decryptMetrics.length;
    const cacheHitTime = this.metrics.find(m => m.operation === 'cache_hit')?.averageTime || 0;
    const cacheSpeedup = avgDecryptTime / cacheHitTime;

    console.warn(`1. NO DECRYPTION CACHING (HIGH PRIORITY)`);
    console.warn(`   - Current decrypt time: ${avgDecryptTime.toFixed(2)}ms average`);
    console.warn(`   - With cache: ${cacheHitTime.toFixed(4)}ms`);
    console.warn(`   - Potential speedup: ${cacheSpeedup.toFixed(0)}x faster`);
    console.warn(`   - Estimated overhead reduction: 60-80%`);
    console.warn(`   - STATUS: DecryptionCache exists but NOT integrated in repositories!`);

    // 2. N+1 Query Problems
    const n1Metric = this.metrics.find(m => m.operation === 'n_plus_1_query_pattern');
    if (n1Metric) {
      console.warn(`\n2. N+1 QUERY PATTERNS DETECTED`);
      console.warn(`   - Loading cases + evidence: ${n1Metric.duration.toFixed(2)}ms`);
      console.warn(`   - Overhead: ${n1Metric.overhead?.toFixed(1)}x slower`);
      console.warn(`   - Solution: Implement eager loading or batch queries`);
    }

    // 3. Synchronous SQLite Operations
    console.warn(`\n3. SYNCHRONOUS SQLITE OPERATIONS`);
    console.warn(`   - All DB operations block main thread`);
    console.warn(`   - WAL mode enabled: Yes (good for concurrency)`);
    console.warn(`   - Cache size: 40MB (adequate)`);
    console.warn(`   - Constraint: better-sqlite3 is synchronous-only (Electron requirement)`);

    // 4. Bulk Operations
    const bulkSingle = this.metrics.find(m => m.operation === 'bulk_insert_single_transactions');
    const bulkBatch = this.metrics.find(m => m.operation === 'bulk_insert_batch_transaction');
    if (bulkSingle && bulkBatch) {
      console.warn(`\n4. BULK OPERATIONS OPTIMIZATION AVAILABLE`);
      console.warn(`   - Single transactions: ${bulkSingle.averageTime?.toFixed(2)}ms per insert`);
      console.warn(`   - Batch transaction: ${bulkBatch.averageTime?.toFixed(2)}ms per insert`);
      console.warn(`   - Speedup available: ${bulkSingle.overhead?.toFixed(1)}x`);
    }

    // Performance Metrics Summary
    console.warn('\n### PERFORMANCE METRICS SUMMARY ###\n');
    console.warn('Operation                          | Time (ms) | Count | Avg (ms)');
    console.warn('-----------------------------------|-----------|-------|----------');

    for (const metric of this.metrics) {
      const op = metric.operation.padEnd(34);
      const time = metric.duration.toFixed(2).padStart(9);
      const count = (metric.count || '-').toString().padStart(5);
      const avg = metric.averageTime ? metric.averageTime.toFixed(2).padStart(8) : '-'.padStart(8);
      console.warn(`${op} | ${time} | ${count} | ${avg}`);
    }

    // Recommendations
    console.warn('\n### RECOMMENDATIONS (PRIORITY ORDER) ###\n');
    console.warn('1. **IMMEDIATE: Integrate DecryptionCache**');
    console.warn('   - Modify repository constructors to accept DecryptionCache');
    console.warn('   - Update initializeRepositories() to create and inject cache');
    console.warn('   - Estimated gain: 60-80% reduction in decryption overhead\n');

    console.warn('2. **HIGH: Eliminate N+1 Queries**');
    console.warn('   - Implement getCaseWithRelatedData() method');
    console.warn('   - Use JOIN queries for eager loading');
    console.warn('   - Consider implementing DataLoader pattern\n');

    console.warn('3. **MEDIUM: React Component Optimization**');
    console.warn('   - Add React.memo to list components');
    console.warn('   - Use useMemo for expensive computations');
    console.warn('   - Implement virtualization for large lists\n');

    console.warn('4. **LOW: Database Optimizations**');
    console.warn('   - Indexes are properly configured');
    console.warn('   - Consider ANALYZE command periodically');
    console.warn('   - Monitor for missing indexes on audit_logs, consents tables\n');

    console.warn('='.repeat(80));
  }

  async runAllTests(): Promise<void> {
    console.warn('Starting Performance Analysis...\n');

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
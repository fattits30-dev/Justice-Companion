#!/usr/bin/env tsx

import { performance } from 'perf_hooks';
import { databaseManager } from '../db/database.ts';
import { EncryptionService } from '../services/EncryptionService.ts';
import { AuditLogger } from '../services/AuditLogger.ts';
import { getCacheService, resetCacheService } from '../services/CacheService.ts';
import { getCacheMetrics } from '../utils/cache-metrics.ts';
import type Database from 'better-sqlite3';

// Import base repositories
import { CaseRepository } from '../repositories/CaseRepository.ts';
import { EvidenceRepository } from '../repositories/EvidenceRepository.ts';
import { SessionRepository } from '../repositories/SessionRepository.ts';
import { UserProfileRepository } from '../repositories/UserProfileRepository.ts';

// Import cached repositories
import { CachedCaseRepository } from '../repositories/CachedCaseRepository.ts';
import { CachedEvidenceRepository } from '../repositories/CachedEvidenceRepository.ts';
import { CachedSessionRepository } from '../repositories/CachedSessionRepository.ts';
import { CachedUserProfileRepository } from '../repositories/CachedUserProfileRepository.ts';

import type { CreateCaseInput } from '../domains/cases/entities/Case.ts';
import type { CreateEvidenceInput } from '../domains/evidence/entities/Evidence.ts';
import type { CreateSessionInput } from '../domains/auth/entities/Session.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Performance benchmark for LRU cache implementation
 * Compares direct database access vs cached access
 */

interface BenchmarkResult {
  operation: string;
  directMs: number;
  cachedFirstMs: number;
  cachedSecondMs: number;
  speedup: number;
  hitRate: number;
}

class CachePerformanceBenchmark {
  private encryptionService: EncryptionService;
  private auditLogger: AuditLogger;
  private results: BenchmarkResult[] = [];

  constructor(db: Database.Database) {
    // Initialize services
    const encryptionKey = Buffer.from('test-key-for-benchmarking-only!!').toString('base64');
    this.encryptionService = new EncryptionService(encryptionKey);
    this.auditLogger = new AuditLogger(db);
  }

  /**
   * Run a single benchmark iteration
   */
  private async runBenchmark(
    name: string,
    directFn: () => any,
    cachedFn: () => Promise<any>
  ): Promise<BenchmarkResult> {
    // Clear cache before each benchmark
    const cacheService = getCacheService();
    cacheService.clear();
    cacheService.resetStats();

    // Measure direct database access
    const directStart = performance.now();
    await directFn();
    const directEnd = performance.now();
    const directMs = directEnd - directStart;

    // Measure first cached access (cache miss)
    const cachedFirstStart = performance.now();
    await cachedFn();
    const cachedFirstEnd = performance.now();
    const cachedFirstMs = cachedFirstEnd - cachedFirstStart;

    // Measure second cached access (cache hit)
    const cachedSecondStart = performance.now();
    await cachedFn();
    const cachedSecondEnd = performance.now();
    const cachedSecondMs = cachedSecondEnd - cachedSecondStart;

    // Get cache stats
    const stats = cacheService.getStats();
    const totalHits = stats.reduce((sum, s) => sum + s.hits, 0);
    const totalMisses = stats.reduce((sum, s) => sum + s.misses, 0);
    const hitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

    const speedup = directMs > 0 ? directMs / cachedSecondMs : 0;

    return {
      operation: name,
      directMs,
      cachedFirstMs,
      cachedSecondMs,
      speedup,
      hitRate,
    };
  }

  /**
   * Benchmark case operations
   */
  async benchmarkCases(): Promise<void> {
    console.log('\n📊 Benchmarking Case Operations...');

    const baseRepo = new CaseRepository(this.encryptionService, this.auditLogger);
    const cachedRepo = new CachedCaseRepository(this.encryptionService, this.auditLogger);

    // Create test data
    const testCase: CreateCaseInput = {
      title: 'Benchmark Test Case',
      description: 'This is a test case for benchmarking cache performance',
      caseType: 'employment',
    };

    const createdCase = baseRepo.create(testCase);
    const caseId = createdCase.id;

    // Benchmark findById
    const result1 = await this.runBenchmark(
      'Case.findById',
      () => baseRepo.findById(caseId),
      () => cachedRepo.findByIdAsync(caseId)
    );
    this.results.push(result1);

    // Benchmark findAll
    const result2 = await this.runBenchmark(
      'Case.findAll',
      () => baseRepo.findAll(),
      () => cachedRepo.findAllAsync()
    );
    this.results.push(result2);

    // Benchmark statistics
    const result3 = await this.runBenchmark(
      'Case.getStatistics',
      () => baseRepo.getStatistics(),
      () => cachedRepo.getStatisticsAsync()
    );
    this.results.push(result3);

    // Clean up
    baseRepo.delete(caseId);
  }

  /**
   * Benchmark evidence operations
   */
  async benchmarkEvidence(): Promise<void> {
    console.log('\n📊 Benchmarking Evidence Operations...');

    const caseRepo = new CaseRepository(this.encryptionService, this.auditLogger);
    const baseRepo = new EvidenceRepository(this.encryptionService, this.auditLogger);
    const cachedRepo = new CachedEvidenceRepository(this.encryptionService, this.auditLogger);

    // Create test case and evidence
    const testCase = caseRepo.create({
      title: 'Evidence Benchmark Case',
      caseType: 'housing',
    });

    const testEvidence: CreateEvidenceInput = {
      caseId: testCase.id,
      title: 'Test Evidence',
      content: 'Encrypted evidence content for benchmarking',
      evidenceType: 'document',
      obtainedDate: new Date().toISOString(),
    };

    const createdEvidence = baseRepo.create(testEvidence);
    const evidenceId = createdEvidence.id;

    // Create more evidence for batch operations
    for (let i = 0; i < 10; i++) {
      baseRepo.create({
        ...testEvidence,
        title: `Test Evidence ${i}`,
      });
    }

    // Benchmark findById
    const result1 = await this.runBenchmark(
      'Evidence.findById',
      () => baseRepo.findById(evidenceId),
      () => cachedRepo.findByIdAsync(evidenceId)
    );
    this.results.push(result1);

    // Benchmark findByCaseId
    const result2 = await this.runBenchmark(
      'Evidence.findByCaseId',
      () => baseRepo.findByCaseId(testCase.id),
      () => cachedRepo.findByCaseIdAsync(testCase.id)
    );
    this.results.push(result2);

    // Benchmark countByCase
    const result3 = await this.runBenchmark(
      'Evidence.countByCase',
      () => baseRepo.countByCase(testCase.id),
      () => cachedRepo.countByCaseAsync(testCase.id)
    );
    this.results.push(result3);

    // Clean up
    caseRepo.delete(testCase.id); // Cascades to evidence
  }

  /**
   * Benchmark session operations
   */
  async benchmarkSessions(): Promise<void> {
    console.log('\n📊 Benchmarking Session Operations...');

    const baseRepo = new SessionRepository();
    const cachedRepo = new CachedSessionRepository();

    // Create test session
    const testSession: CreateSessionInput = {
      id: uuidv4(),
      userId: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      rememberMe: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Benchmark/1.0',
    };

    const createdSession = baseRepo.create(testSession);
    const sessionId = createdSession.id;

    // Create more sessions for batch operations
    for (let i = 0; i < 5; i++) {
      baseRepo.create({
        ...testSession,
        id: uuidv4(),
      });
    }

    // Benchmark findById
    const result1 = await this.runBenchmark(
      'Session.findById',
      () => baseRepo.findById(sessionId),
      () => cachedRepo.findByIdAsync(sessionId)
    );
    this.results.push(result1);

    // Benchmark findByUserId
    const result2 = await this.runBenchmark(
      'Session.findByUserId',
      () => baseRepo.findByUserId(1),
      () => cachedRepo.findByUserIdAsync(1)
    );
    this.results.push(result2);

    // Benchmark countActiveSessionsByUserId
    const result3 = await this.runBenchmark(
      'Session.countActive',
      () => baseRepo.countActiveSessionsByUserId(1),
      () => cachedRepo.countActiveSessionsByUserIdAsync(1)
    );
    this.results.push(result3);

    // Clean up
    baseRepo.deleteByUserId(1);
  }

  /**
   * Benchmark user profile operations
   */
  async benchmarkUserProfile(): Promise<void> {
    console.log('\n📊 Benchmarking User Profile Operations...');

    const baseRepo = new UserProfileRepository(this.encryptionService, this.auditLogger);
    const cachedRepo = new CachedUserProfileRepository(this.encryptionService, this.auditLogger);

    // Update profile with test data
    baseRepo.update({
      name: 'Benchmark User',
      email: 'benchmark@test.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    // Benchmark get
    const result1 = await this.runBenchmark(
      'Profile.get',
      () => baseRepo.get(),
      () => cachedRepo.getAsync()
    );
    this.results.push(result1);

    // Benchmark getName
    const result2 = await this.runBenchmark(
      'Profile.getName',
      () => baseRepo.get().name,
      () => cachedRepo.getNameAsync()
    );
    this.results.push(result2);

    // Benchmark getSummary
    const result3 = await this.runBenchmark(
      'Profile.getSummary',
      () => {
        const profile = baseRepo.get();
        return {
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          isComplete: !!(profile.name && profile.email),
        };
      },
      () => cachedRepo.getSummaryAsync()
    );
    this.results.push(result3);
  }

  /**
   * Run stress test to measure cache performance under load
   */
  async runStressTest(): Promise<void> {
    console.log('\n🔥 Running Stress Test...');

    const cachedCase = new CachedCaseRepository(this.encryptionService, this.auditLogger);
    const cacheService = getCacheService();

    // Create test cases
    const caseIds: number[] = [];
    const baseRepo = new CaseRepository(this.encryptionService, this.auditLogger);

    for (let i = 0; i < 100; i++) {
      const testCase = baseRepo.create({
        title: `Stress Test Case ${i}`,
        description: `Description for stress test case ${i}`,
        caseType: i % 2 === 0 ? 'employment' : 'housing',
      });
      caseIds.push(testCase.id);
    }

    // Clear cache and reset stats
    cacheService.clear();
    cacheService.resetStats();

    // Simulate realistic access pattern
    console.log('  Simulating realistic access pattern (1000 operations)...');
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      // 80% reads on popular items (cache friendly)
      if (Math.random() < 0.8) {
        const popularId = caseIds[Math.floor(Math.random() * 10)]; // Top 10 cases
        await cachedCase.findByIdAsync(popularId);
      } else {
        // 20% reads on random items
        const randomId = caseIds[Math.floor(Math.random() * caseIds.length)];
        await cachedCase.findByIdAsync(randomId);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const opsPerSecond = 1000 / (totalTime / 1000);

    // Get final stats
    const stats = cacheService.getStats('cases')[0];
    const metrics = getCacheMetrics().collect();

    console.log('\n📈 Stress Test Results:');
    console.log(`  Total Operations: 1000`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Operations/Second: ${opsPerSecond.toFixed(2)}`);
    console.log(`  Cache Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`  Cache Size: ${stats.size}/${stats.maxSize}`);
    console.log(`  Evictions: ${stats.evictions}`);
    console.log(`  Memory Usage: ~${metrics.performance.estimatedMemoryMB.toFixed(2)}MB`);

    // Clean up
    for (const id of caseIds) {
      baseRepo.delete(id);
    }
  }

  /**
   * Print benchmark results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(100));
    console.log('📊 CACHE PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(100));

    // Print table header
    console.log('\n| Operation              | Direct (ms) | Cached 1st (ms) | Cached 2nd (ms) | Speedup | Hit Rate |');
    console.log('|------------------------|-------------|-----------------|-----------------|---------|----------|');

    // Print results
    for (const result of this.results) {
      const operation = result.operation.padEnd(22);
      const direct = result.directMs.toFixed(2).padStart(11);
      const first = result.cachedFirstMs.toFixed(2).padStart(15);
      const second = result.cachedSecondMs.toFixed(2).padStart(15);
      const speedup = `${result.speedup.toFixed(1)}x`.padStart(7);
      const hitRate = `${result.hitRate.toFixed(1)}%`.padStart(8);

      console.log(`| ${operation} | ${direct} | ${first} | ${second} | ${speedup} | ${hitRate} |`);
    }

    // Calculate averages
    const avgDirect = this.results.reduce((sum, r) => sum + r.directMs, 0) / this.results.length;
    const avgCachedSecond = this.results.reduce((sum, r) => sum + r.cachedSecondMs, 0) / this.results.length;
    const avgSpeedup = avgDirect / avgCachedSecond;

    console.log('\n📈 Summary Statistics:');
    console.log(`  Average Direct Access: ${avgDirect.toFixed(2)}ms`);
    console.log(`  Average Cached Access: ${avgCachedSecond.toFixed(2)}ms`);
    console.log(`  Average Speedup: ${avgSpeedup.toFixed(1)}x`);

    // Print cache metrics
    const metrics = getCacheMetrics().collect();
    console.log('\n💾 Cache Metrics:');
    console.log(`  Overall Hit Rate: ${metrics.overall.averageHitRate.toFixed(2)}%`);
    console.log(`  Total Cache Size: ${metrics.overall.totalSize}/${metrics.overall.totalMaxSize}`);
    console.log(`  Memory Utilization: ${metrics.overall.memoryUtilization.toFixed(2)}%`);
    console.log(`  Estimated Memory: ${metrics.performance.estimatedMemoryMB.toFixed(2)}MB`);
    console.log(`  Cache Efficiency: ${metrics.performance.cacheEfficiency.toFixed(2)}/100`);

    if (metrics.performance.recommendedActions.length > 0) {
      console.log('\n💡 Recommendations:');
      metrics.performance.recommendedActions.forEach(action => {
        console.log(`  • ${action}`);
      });
    }
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('🚀 Starting Cache Performance Benchmark...');
    console.log('   Environment: Electron + better-sqlite3');
    console.log(`   Cache Enabled: ${process.env.ENABLE_CACHE !== 'false'}`);
    console.log('   Database: SQLite with encryption\n');

    const startTime = performance.now();

    // Run individual benchmarks
    await this.benchmarkCases();
    await this.benchmarkEvidence();
    await this.benchmarkSessions();
    await this.benchmarkUserProfile();

    // Run stress test
    await this.runStressTest();

    const totalTime = performance.now() - startTime;

    // Print results
    this.printResults();

    console.log('\n⏱️ Total Benchmark Time: ' + (totalTime / 1000).toFixed(2) + ' seconds');
    console.log('\n✅ Benchmark Complete!');
  }
}

// Run benchmark
async function main() {
  try {
    // Initialize database
    console.log('Initializing database...');
    const db = databaseManager.getDatabase();

    // Reset cache service
    resetCacheService();

    // Run benchmarks
    const benchmark = new CachePerformanceBenchmark(db);
    await benchmark.runAll();

    process.exit(0);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}
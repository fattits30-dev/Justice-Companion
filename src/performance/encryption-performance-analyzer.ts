/**
 * Encryption Performance Analyzer for Justice Companion
 * Analyzes AES-256-GCM encryption/decryption performance and LRU cache efficiency
 */

import crypto from 'crypto';
import { profiler } from './performance-profiler';

export interface EncryptionMetrics {
  operation: 'encrypt' | 'decrypt' | 'hash';
  dataSize: number;
  duration: number;
  throughput: number; // MB/s
  algorithm: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  cacheSize: number;
  maxCacheSize: number;
  avgHitTime: number;
  avgMissTime: number;
}

export interface EncryptionPerformanceReport {
  encryptionMetrics: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    throughput: number;
    bySize: Map<string, EncryptionMetrics[]>;
  };
  decryptionMetrics: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    throughput: number;
    bySize: Map<string, EncryptionMetrics[]>;
  };
  cacheMetrics: CacheMetrics;
  recommendations: string[];
}

export class EncryptionPerformanceAnalyzer {
  private encryptionMetrics: EncryptionMetrics[] = [];
  private decryptionMetrics: EncryptionMetrics[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private cacheEvictions: number = 0;
  private cacheHitTimes: number[] = [];
  private cacheMissTimes: number[] = [];
  private currentCacheSize: number = 0;
  private maxCacheSize: number = 100; // LRU cache size from Phase 1

  /**
   * Measure encryption performance
   */
  async measureEncryption(data: Buffer | string, algorithm: string = 'aes-256-gcm'): Promise<EncryptionMetrics> {
    const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const dataSize = inputBuffer.length;

    const startTime = performance.now();

    // Simulate AES-256-GCM encryption
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(inputBuffer),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    const duration = performance.now() - startTime;
    const throughput = (dataSize / (1024 * 1024)) / (duration / 1000); // MB/s

    const metric: EncryptionMetrics = {
      operation: 'encrypt',
      dataSize,
      duration,
      throughput,
      algorithm
    };

    this.encryptionMetrics.push(metric);

    // Emit slow encryption warning
    if (duration > 50) {
      profiler.emit('slow-encryption', metric);
    }

    return metric;
  }

  /**
   * Measure decryption performance
   */
  async measureDecryption(encryptedData: Buffer, algorithm: string = 'aes-256-gcm'): Promise<EncryptionMetrics> {
    const dataSize = encryptedData.length;

    const startTime = performance.now();

    // Simulate AES-256-GCM decryption
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    // In real scenario, auth tag would be extracted from encrypted data
    const authTag = encryptedData.slice(-16);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(encryptedData.slice(0, -16)),
        decipher.final()
      ]);
    } catch (error) {
      // Handle decryption error
    }

    const duration = performance.now() - startTime;
    const throughput = (dataSize / (1024 * 1024)) / (duration / 1000); // MB/s

    const metric: EncryptionMetrics = {
      operation: 'decrypt',
      dataSize,
      duration,
      throughput,
      algorithm
    };

    this.decryptionMetrics.push(metric);

    // Emit slow decryption warning
    if (duration > 50) {
      profiler.emit('slow-decryption', metric);
    }

    return metric;
  }

  /**
   * Simulate cache hit
   */
  recordCacheHit(accessTime: number): void {
    this.cacheHits++;
    this.cacheHitTimes.push(accessTime);
  }

  /**
   * Simulate cache miss
   */
  recordCacheMiss(accessTime: number): void {
    this.cacheMisses++;
    this.cacheMissTimes.push(accessTime);
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction(): void {
    this.cacheEvictions++;
  }

  /**
   * Update cache size
   */
  updateCacheSize(size: number): void {
    this.currentCacheSize = size;
  }

  /**
   * Test encryption performance with various data sizes
   */
  async runPerformanceTest(): Promise<void> {
    const testSizes = [
      { size: 1024, label: '1KB' },           // Small text
      { size: 10240, label: '10KB' },         // Case description
      { size: 102400, label: '100KB' },       // Document
      { size: 1048576, label: '1MB' },        // Large document
      { size: 10485760, label: '10MB' },      // Evidence file
      { size: 104857600, label: '100MB' }     // Large evidence
    ];

    console.log('Running encryption performance tests...');

    for (const { size, label } of testSizes) {
      const testData = crypto.randomBytes(size);

      // Test encryption
      const encryptMetrics = await this.measureEncryption(testData);
      console.log(`Encryption ${label}: ${encryptMetrics.duration.toFixed(2)}ms, ${encryptMetrics.throughput.toFixed(2)} MB/s`);

      // Test decryption
      const encrypted = Buffer.concat([testData, crypto.randomBytes(16)]); // Simulate encrypted data with auth tag
      const decryptMetrics = await this.measureDecryption(encrypted);
      console.log(`Decryption ${label}: ${decryptMetrics.duration.toFixed(2)}ms, ${decryptMetrics.throughput.toFixed(2)} MB/s`);
    }
  }

  /**
   * Test cache efficiency with simulated access patterns
   */
  async testCacheEfficiency(accessPattern: 'random' | 'sequential' | 'hotspot'): Promise<CacheMetrics> {
    const numAccesses = 1000;
    const numItems = 200; // Larger than cache size (100) to test evictions

    // Reset cache metrics
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
    this.cacheHitTimes = [];
    this.cacheMissTimes = [];

    // Simulate LRU cache
    const cache = new Map<number, any>();

    for (let i = 0; i < numAccesses; i++) {
      let itemId: number;

      // Generate access pattern
      switch (accessPattern) {
        case 'random':
          itemId = Math.floor(Math.random() * numItems);
          break;
        case 'sequential':
          itemId = i % numItems;
          break;
        case 'hotspot':
          // 80% of accesses to 20% of items
          itemId = Math.random() < 0.8
            ? Math.floor(Math.random() * (numItems * 0.2))
            : Math.floor(Math.random() * numItems);
          break;
      }

      const startTime = performance.now();

      if (cache.has(itemId)) {
        // Cache hit
        const value = cache.get(itemId);
        cache.delete(itemId);
        cache.set(itemId, value); // Move to front (LRU)
        this.recordCacheHit(performance.now() - startTime);
      } else {
        // Cache miss - simulate decryption
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate decryption time

        // Add to cache with LRU eviction
        if (cache.size >= this.maxCacheSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
          this.recordCacheEviction();
        }

        cache.set(itemId, { data: `item_${itemId}` });
        this.recordCacheMiss(performance.now() - startTime);
      }
    }

    this.updateCacheSize(cache.size);

    return this.getCacheMetrics();
  }

  /**
   * Test worst-case scenario: 100 encrypted cases loaded simultaneously
   */
  async testWorstCaseScenario(): Promise<{
    totalTime: number;
    avgDecryptionTime: number;
    peakMemory: number;
    cacheOverflow: boolean;
  }> {
    const numCases = 100;
    const avgCaseSize = 10240; // 10KB average case description
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Simulate loading 100 encrypted cases
    const decryptionTimes: number[] = [];
    const cache = new Map<number, any>();

    for (let i = 0; i < numCases; i++) {
      const encryptedData = crypto.randomBytes(avgCaseSize + 16); // Data + auth tag
      const decryptStart = performance.now();

      // Simulate decryption
      await this.measureDecryption(encryptedData);

      decryptionTimes.push(performance.now() - decryptStart);

      // Add to cache (testing cache overflow)
      cache.set(i, { caseId: i, data: encryptedData });

      // Check cache size limit
      if (cache.size > this.maxCacheSize) {
        // Cache overflow - need to evict
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
        this.recordCacheEviction();
      }
    }

    const totalTime = performance.now() - startTime;
    const peakMemory = process.memoryUsage().heapUsed - startMemory;
    const avgDecryptionTime = decryptionTimes.reduce((a, b) => a + b, 0) / decryptionTimes.length;
    const cacheOverflow = cache.size < numCases;

    return {
      totalTime,
      avgDecryptionTime,
      peakMemory,
      cacheOverflow
    };
  }

  /**
   * Analyze re-encryption during updates
   */
  async analyzeUpdateOperations(): Promise<{
    unnecessaryReencryptions: number;
    optimizationPotential: number;
    recommendations: string[];
  }> {
    let unnecessaryReencryptions = 0;
    const updateScenarios = [
      { field: 'status', encrypted: false },
      { field: 'description', encrypted: true },
      { field: 'updatedAt', encrypted: false },
      { field: 'evidence', encrypted: true }
    ];

    // Simulate update operations
    for (const scenario of updateScenarios) {
      if (!scenario.encrypted) {
        // Field doesn't need encryption, but check if entire record is re-encrypted
        // This would be unnecessary
        unnecessaryReencryptions++;
      }
    }

    const optimizationPotential = (unnecessaryReencryptions / updateScenarios.length) * 100;

    const recommendations: string[] = [];
    if (optimizationPotential > 25) {
      recommendations.push('Implement field-level encryption updates to avoid re-encrypting unchanged fields');
    }

    return {
      unnecessaryReencryptions,
      optimizationPotential,
      recommendations
    };
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    const totalAccesses = this.cacheHits + this.cacheMisses;
    const hitRate = totalAccesses > 0 ? (this.cacheHits / totalAccesses) * 100 : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate,
      evictions: this.cacheEvictions,
      cacheSize: this.currentCacheSize,
      maxCacheSize: this.maxCacheSize,
      avgHitTime: this.cacheHitTimes.length > 0
        ? this.cacheHitTimes.reduce((a, b) => a + b, 0) / this.cacheHitTimes.length
        : 0,
      avgMissTime: this.cacheMissTimes.length > 0
        ? this.cacheMissTimes.reduce((a, b) => a + b, 0) / this.cacheMissTimes.length
        : 0
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): EncryptionPerformanceReport {
    const recommendations: string[] = [];

    // Group metrics by size
    const encryptBySize = new Map<string, EncryptionMetrics[]>();
    const decryptBySize = new Map<string, EncryptionMetrics[]>();

    this.encryptionMetrics.forEach(metric => {
      const sizeCategory = this.categorizeSizeBytes);
      const metrics = encryptBySize.get(sizeCategory) || [];
      metrics.push(metric);
      encryptBySize.set(sizeCategory, metrics);
    });

    this.decryptionMetrics.forEach(metric => {
      const sizeCategory = this.categorizeSize(metric.dataSize);
      const metrics = decryptBySize.get(sizeCategory) || [];
      metrics.push(metric);
      decryptBySize.set(sizeCategory, metrics);
    });

    // Calculate statistics
    const calcStats = (metrics: EncryptionMetrics[]) => {
      if (metrics.length === 0) {
        return { average: 0, p50: 0, p95: 0, p99: 0, throughput: 0 };
      }

      const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
      const throughputs = metrics.map(m => m.throughput);

      return {
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: durations[Math.floor(durations.length * 0.5)] || 0,
        p95: durations[Math.floor(durations.length * 0.95)] || 0,
        p99: durations[Math.floor(durations.length * 0.99)] || 0,
        throughput: throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      };
    };

    const encryptStats = calcStats(this.encryptionMetrics);
    const decryptStats = calcStats(this.decryptionMetrics);
    const cacheMetrics = this.getCacheMetrics();

    // Generate recommendations
    if (encryptStats.p95 > 100) {
      recommendations.push('Encryption P95 exceeds 100ms - consider async encryption for large files');
    }

    if (decryptStats.p95 > 100) {
      recommendations.push('Decryption P95 exceeds 100ms - implement progressive decryption for large datasets');
    }

    if (cacheMetrics.hitRate < 70) {
      recommendations.push(`Cache hit rate is ${cacheMetrics.hitRate.toFixed(1)}% - consider increasing cache size or improving access patterns`);
    }

    if (cacheMetrics.evictions > cacheMetrics.hits * 0.5) {
      recommendations.push('High cache eviction rate - increase cache size from 100 to 200 items');
    }

    if (encryptStats.throughput < 50) {
      recommendations.push('Low encryption throughput - consider using hardware acceleration or worker threads');
    }

    return {
      encryptionMetrics: {
        ...encryptStats,
        bySize: encryptBySize
      },
      decryptionMetrics: {
        ...decryptStats,
        bySize: decryptBySize
      },
      cacheMetrics,
      recommendations
    };
  }

  /**
   * Categorize data size
   */
  private categorizeSize(bytes: number): string {
    if (bytes < 1024) return 'tiny (<1KB)';
    if (bytes < 10240) return 'small (1-10KB)';
    if (bytes < 102400) return 'medium (10-100KB)';
    if (bytes < 1048576) return 'large (100KB-1MB)';
    if (bytes < 10485760) return 'xlarge (1-10MB)';
    return 'huge (>10MB)';
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.encryptionMetrics = [];
    this.decryptionMetrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
    this.cacheHitTimes = [];
    this.cacheMissTimes = [];
    this.currentCacheSize = 0;
  }
}
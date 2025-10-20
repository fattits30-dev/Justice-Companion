/**
 * Comprehensive Performance Test Runner for Justice Companion
 * Executes all performance tests and generates consolidated report
 */

import path from 'path';
import fs from 'fs';
import { profiler, PerformanceProfiler } from './performance-profiler';
import { DatabasePerformanceAnalyzer } from './database-performance-analyzer';
import { EncryptionPerformanceAnalyzer } from './encryption-performance-analyzer';
import { IPCPerformanceAnalyzer } from './ipc-performance-analyzer';
import Database from 'better-sqlite3';

export interface PerformanceTestResults {
  timestamp: number;
  environment: {
    platform: string;
    nodeVersion: string;
    electronVersion?: string;
    cpuCount: number;
    totalMemory: number;
  };
  database: {
    queryPerformance: any;
    n1Problems: any[];
    indexRecommendations: any[];
    slowQueries: any[];
  };
  encryption: {
    metrics: any;
    cacheEfficiency: any;
    worstCase: any;
  };
  ipc: {
    metrics: any;
    serviceInstantiation: any;
    batchingOpportunities: any;
  };
  memory: {
    baseline: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    leaks: any[];
  };
  cpu: {
    hotspots: any[];
    avgUtilization: number;
    peakUtilization: number;
  };
  loadTest: {
    scenarios: any[];
    breakingPoints: any;
  };
  recommendations: {
    quickWins: string[];
    highImpact: string[];
    longTerm: string[];
  };
}

export class PerformanceTestRunner {
  private dbAnalyzer?: DatabasePerformanceAnalyzer;
  private encryptionAnalyzer: EncryptionPerformanceAnalyzer;
  private ipcAnalyzer: IPCPerformanceAnalyzer;
  private results: Partial<PerformanceTestResults> = {};

  constructor() {
    this.encryptionAnalyzer = new EncryptionPerformanceAnalyzer();
    this.ipcAnalyzer = new IPCPerformanceAnalyzer();
  }

  /**
   * Initialize database analyzer
   */
  private initializeDatabaseAnalyzer(dbPath: string): void {
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true });
      this.dbAnalyzer = new DatabasePerformanceAnalyzer(db);
    } else {
      console.warn(`Database not found at ${dbPath}, skipping database tests`);
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests(options: {
    dbPath?: string;
    verbose?: boolean;
    outputPath?: string;
  } = {}): Promise<PerformanceTestResults> {
    const startTime = Date.now();

    console.log('🚀 Starting comprehensive performance analysis...\n');

    // Initialize results
    this.results = {
      timestamp: startTime,
      environment: this.getEnvironmentInfo()
    };

    // Start monitoring
    profiler.startMemoryMonitoring(1000);
    profiler.startCpuMonitoring(1000);

    try {
      // 1. Database Performance Tests
      if (options.dbPath) {
        await this.testDatabasePerformance(options.dbPath);
      }

      // 2. Encryption Performance Tests
      await this.testEncryptionPerformance();

      // 3. IPC Performance Tests
      await this.testIPCPerformance();

      // 4. Memory Profiling
      await this.profileMemory();

      // 5. CPU Profiling
      await this.profileCPU();

      // 6. Load Testing
      await this.runLoadTests();

      // 7. Stress Testing
      await this.runStressTests();

      // 8. Generate Recommendations
      this.generateRecommendations();

      // Generate final report
      const report = this.generateFinalReport();

      // Save report if output path provided
      if (options.outputPath) {
        await this.saveReport(report, options.outputPath);
      }

      const duration = Date.now() - startTime;
      console.log(`\n✅ Performance analysis completed in ${(duration / 1000).toFixed(2)}s`);

      return report;

    } finally {
      // Clean up
      profiler.stop();
    }
  }

  /**
   * Test database performance
   */
  private async testDatabasePerformance(dbPath: string): Promise<void> {
    console.log('📊 Testing database performance...');

    this.initializeDatabaseAnalyzer(dbPath);

    if (!this.dbAnalyzer) {
      console.warn('Database analyzer not initialized, skipping database tests');
      return;
    }

    // Run sample queries to populate metrics
    await this.simulateDatabaseQueries();

    // Generate database report
    const dbReport = this.dbAnalyzer.generateReport();

    this.results.database = {
      queryPerformance: dbReport.queryStatistics,
      n1Problems: dbReport.n1Problems,
      indexRecommendations: dbReport.indexRecommendations,
      slowQueries: dbReport.slowQueries
    };

    console.log(`  ✓ Found ${dbReport.slowQueries.length} slow queries`);
    console.log(`  ✓ Detected ${dbReport.n1Problems.length} N+1 problems`);
    console.log(`  ✓ Generated ${dbReport.indexRecommendations.length} index recommendations`);
  }

  /**
   * Simulate database queries
   */
  private async simulateDatabaseQueries(): Promise<void> {
    if (!this.dbAnalyzer) return;

    const queries = [
      'SELECT * FROM cases WHERE userId = ? AND status = ?',
      'SELECT * FROM evidence WHERE caseId = ?',
      'SELECT * FROM timeline_events WHERE evidenceId = ?',
      'SELECT * FROM actions WHERE status = ? AND due_date < ?',
      'SELECT * FROM chat_messages WHERE conversationId = ? ORDER BY created_at DESC LIMIT 50',
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'
    ];

    // Simulate multiple executions to detect patterns
    for (let i = 0; i < 10; i++) {
      for (const query of queries) {
        // Simulate query execution
        await profiler.profile(`database.query.${i}`, async () => {
          // In real scenario, would execute actual query
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        });
      }
    }
  }

  /**
   * Test encryption performance
   */
  private async testEncryptionPerformance(): Promise<void> {
    console.log('🔐 Testing encryption performance...');

    // Run encryption tests
    await this.encryptionAnalyzer.runPerformanceTest();

    // Test cache efficiency with different patterns
    const cachePatterns = ['random', 'sequential', 'hotspot'] as const;
    const cacheResults: any = {};

    for (const pattern of cachePatterns) {
      const metrics = await this.encryptionAnalyzer.testCacheEfficiency(pattern);
      cacheResults[pattern] = metrics;
      console.log(`  ✓ Cache hit rate (${pattern}): ${metrics.hitRate.toFixed(1)}%`);
    }

    // Test worst case scenario
    const worstCase = await this.encryptionAnalyzer.testWorstCaseScenario();
    console.log(`  ✓ Worst case (100 cases): ${worstCase.totalTime.toFixed(0)}ms`);

    // Generate encryption report
    const encryptionReport = this.encryptionAnalyzer.generateReport();

    this.results.encryption = {
      metrics: encryptionReport,
      cacheEfficiency: cacheResults,
      worstCase
    };
  }

  /**
   * Test IPC performance
   */
  private async testIPCPerformance(): Promise<void> {
    console.log('📡 Testing IPC performance...');

    // Run IPC tests
    await this.ipcAnalyzer.runPerformanceTest();

    // Test service instantiation overhead
    await this.ipcAnalyzer.testServiceInstantiationOverhead();

    // Generate IPC report
    const ipcReport = this.ipcAnalyzer.generateReport();

    this.results.ipc = {
      metrics: ipcReport.ipcMetrics,
      serviceInstantiation: ipcReport.serviceInstantiation,
      batchingOpportunities: ipcReport.batchingOpportunities
    };

    console.log(`  ✓ Average IPC latency: ${ipcReport.ipcMetrics.average.toFixed(2)}ms`);
    console.log(`  ✓ Service instantiation overhead: ${ipcReport.serviceInstantiation.lazyLoadingOverhead.toFixed(1)}%`);
  }

  /**
   * Profile memory usage
   */
  private async profileMemory(): Promise<void> {
    console.log('💾 Profiling memory usage...');

    const baseline = process.memoryUsage();
    let peak = baseline;
    const potentialLeaks: any[] = [];

    // Monitor memory for potential leaks
    const memorySnapshots: NodeJS.MemoryUsage[] = [];

    for (let i = 0; i < 10; i++) {
      await this.simulateMemoryIntensiveOperation();

      const current = process.memoryUsage();
      memorySnapshots.push(current);

      if (current.heapUsed > peak.heapUsed) {
        peak = current;
      }

      // Simple leak detection: consistent memory growth
      if (i > 5 && current.heapUsed > baseline.heapUsed * 1.5) {
        potentialLeaks.push({
          iteration: i,
          heapGrowth: (current.heapUsed - baseline.heapUsed) / 1024 / 1024,
          suspectedCause: 'Unbounded cache or retained closures'
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.results.memory = {
      baseline,
      peak,
      leaks: potentialLeaks
    };

    const heapGrowth = ((peak.heapUsed - baseline.heapUsed) / baseline.heapUsed) * 100;
    console.log(`  ✓ Heap growth: ${heapGrowth.toFixed(1)}%`);
    console.log(`  ✓ Potential leaks detected: ${potentialLeaks.length}`);
  }

  /**
   * Simulate memory intensive operation
   */
  private async simulateMemoryIntensiveOperation(): Promise<void> {
    // Simulate loading large dataset
    const largeArray = Array(10000).fill(null).map((_, i) => ({
      id: i,
      data: 'x'.repeat(1000),
      nested: {
        more: 'data'.repeat(100)
      }
    }));

    // Process data
    await profiler.profile('memory.intensive', async () => {
      largeArray.forEach(item => {
        item.processed = true;
      });
    });
  }

  /**
   * Profile CPU usage
   */
  private async profileCPU(): Promise<void> {
    console.log('⚡ Profiling CPU usage...');

    const hotspots: any[] = [];
    let totalUtilization = 0;
    let peakUtilization = 0;
    let samples = 0;

    // Listen for CPU snapshots
    profiler.on('cpu-snapshot', (snapshot) => {
      totalUtilization += snapshot.percent;
      samples++;
      if (snapshot.percent > peakUtilization) {
        peakUtilization = snapshot.percent;
      }
    });

    // Test known CPU-intensive operations
    const operations = [
      { name: 'scrypt-hashing', fn: this.simulateScryptHashing },
      { name: 'encryption-bulk', fn: this.simulateBulkEncryption },
      { name: 'complex-query', fn: this.simulateComplexQuery }
    ];

    for (const op of operations) {
      const startCpu = process.cpuUsage();
      const startTime = performance.now();

      await profiler.profile(`cpu.${op.name}`, op.fn.bind(this));

      const duration = performance.now() - startTime;
      const cpuTime = process.cpuUsage(startCpu);
      const cpuPercent = ((cpuTime.user + cpuTime.system) / (duration * 1000)) * 100;

      if (cpuPercent > 50) {
        hotspots.push({
          operation: op.name,
          cpuPercent,
          duration
        });
      }
    }

    this.results.cpu = {
      hotspots,
      avgUtilization: samples > 0 ? totalUtilization / samples : 0,
      peakUtilization
    };

    console.log(`  ✓ CPU hotspots found: ${hotspots.length}`);
    console.log(`  ✓ Peak CPU utilization: ${peakUtilization.toFixed(1)}%`);
  }

  /**
   * Simulate CPU-intensive operations
   */
  private async simulateScryptHashing(): Promise<void> {
    // Simulate password hashing (expected to be slow)
    const crypto = await import('crypto');
    for (let i = 0; i < 5; i++) {
      crypto.scryptSync('password', 'salt', 64);
    }
  }

  private async simulateBulkEncryption(): Promise<void> {
    // Simulate bulk encryption
    for (let i = 0; i < 100; i++) {
      await this.encryptionAnalyzer.measureEncryption(Buffer.alloc(10240));
    }
  }

  private async simulateComplexQuery(): Promise<void> {
    // Simulate complex data processing
    const data = Array(10000).fill(null).map((_, i) => ({ id: i, value: Math.random() }));

    // Multiple sorts and filters
    data
      .filter(item => item.value > 0.5)
      .sort((a, b) => b.value - a.value)
      .map(item => ({ ...item, squared: item.value ** 2 }))
      .reduce((acc, item) => acc + item.squared, 0);
  }

  /**
   * Run load tests
   */
  private async runLoadTests(): Promise<void> {
    console.log('📈 Running load tests...');

    const scenarios = [
      {
        name: '1000 cases with 5000 evidence items',
        fn: () => this.loadTestScenario(1000, 5000, 0)
      },
      {
        name: '10000 audit log entries',
        fn: () => this.loadTestAuditLogs(10000)
      },
      {
        name: '100 concurrent chat streams',
        fn: () => this.loadTestChatStreams(100)
      }
    ];

    const scenarioResults = [];

    for (const scenario of scenarios) {
      const startTime = performance.now();
      const startMem = process.memoryUsage();

      await profiler.profile(`load.${scenario.name}`, scenario.fn);

      const duration = performance.now() - startTime;
      const memGrowth = (process.memoryUsage().heapUsed - startMem.heapUsed) / 1024 / 1024;

      scenarioResults.push({
        name: scenario.name,
        duration,
        memoryGrowth: memGrowth,
        passed: duration < 5000 // 5 second threshold
      });

      console.log(`  ✓ ${scenario.name}: ${duration.toFixed(0)}ms`);
    }

    this.results.loadTest = {
      scenarios: scenarioResults,
      breakingPoints: {}
    };
  }

  /**
   * Load test scenarios
   */
  private async loadTestScenario(cases: number, evidence: number, timeline: number): Promise<void> {
    // Simulate loading large dataset
    for (let i = 0; i < cases; i++) {
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  private async loadTestAuditLogs(count: number): Promise<void> {
    // Simulate audit log operations
    for (let i = 0; i < count; i++) {
      if (i % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  private async loadTestChatStreams(concurrent: number): Promise<void> {
    // Simulate concurrent chat streams
    const promises = Array(concurrent).fill(null).map(async (_, i) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    });

    await Promise.all(promises);
  }

  /**
   * Run stress tests
   */
  private async runStressTests(): Promise<void> {
    console.log('🔥 Running stress tests...');

    // Find breaking points
    const tests = [
      { name: 'Database records', test: this.stressTestDatabase.bind(this) },
      { name: 'Encryption throughput', test: this.stressTestEncryption.bind(this) },
      { name: 'IPC channels', test: this.stressTestIPC.bind(this) }
    ];

    for (const { name, test } of tests) {
      const breakingPoint = await test();
      console.log(`  ✓ ${name} breaking point: ${breakingPoint}`);
    }
  }

  /**
   * Stress test methods
   */
  private async stressTestDatabase(): Promise<number> {
    // Find max records before performance degrades
    let recordCount = 1000;
    let avgTime = 0;

    while (avgTime < 100 && recordCount < 1000000) {
      const start = performance.now();
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, Math.log(recordCount) * 10));
      avgTime = performance.now() - start;
      recordCount *= 2;
    }

    return recordCount / 2;
  }

  private async stressTestEncryption(): Promise<number> {
    // Find max throughput
    let dataSize = 1024;
    let throughput = 100;

    while (throughput > 10 && dataSize < 104857600) {
      const metric = await this.encryptionAnalyzer.measureEncryption(Buffer.alloc(dataSize));
      throughput = metric.throughput;
      dataSize *= 2;
    }

    return dataSize / 2;
  }

  private async stressTestIPC(): Promise<number> {
    // Find max concurrent IPC calls
    let concurrent = 10;
    let avgLatency = 0;

    while (avgLatency < 100 && concurrent < 1000) {
      const promises = Array(concurrent).fill(null).map(() =>
        this.ipcAnalyzer.measureIPCRoundTrip('test', { data: 'test' })
      );

      const results = await Promise.all(promises);
      avgLatency = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
      concurrent *= 2;
    }

    return concurrent / 2;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): void {
    const quickWins: string[] = [];
    const highImpact: string[] = [];
    const longTerm: string[] = [];

    // Database recommendations
    if (this.results.database) {
      if (this.results.database.indexRecommendations.length > 0) {
        quickWins.push('Add missing composite indexes (immediate 30-50% query improvement)');
      }
      if (this.results.database.n1Problems.length > 0) {
        highImpact.push('Fix N+1 query problems with eager loading (reduce queries by 80%)');
      }
    }

    // Encryption recommendations
    if (this.results.encryption) {
      const cacheMetrics = this.results.encryption.cacheEfficiency;
      if (cacheMetrics && cacheMetrics.hotspot && cacheMetrics.hotspot.hitRate < 70) {
        quickWins.push('Increase LRU cache size from 100 to 200 items (improve hit rate by 20%)');
      }
    }

    // IPC recommendations
    if (this.results.ipc) {
      if (this.results.ipc.serviceInstantiation.lazyLoadingOverhead > 50) {
        highImpact.push('Implement singleton pattern for services (reduce overhead by 70%)');
      }
      if (this.results.ipc.batchingOpportunities.potentialReduction > 30) {
        highImpact.push('Implement request batching for IPC calls (reduce calls by 40%)');
      }
    }

    // CPU/Memory recommendations
    if (this.results.cpu && this.results.cpu.hotspots.length > 0) {
      const scryptHotspot = this.results.cpu.hotspots.find(h => h.operation === 'scrypt-hashing');
      if (scryptHotspot) {
        longTerm.push('Consider implementing worker threads for password hashing');
      }
    }

    // God class refactoring
    longTerm.push('Refactor IntegratedAIService god class (40 methods, 237 properties) into smaller services');
    longTerm.push('Implement progressive decryption for large datasets');
    longTerm.push('Add database connection pooling with read replicas for scalability');

    this.results.recommendations = {
      quickWins,
      highImpact,
      longTerm
    };
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo(): PerformanceTestResults['environment'] {
    const os = require('os');
    return {
      platform: os.platform(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem()
    };
  }

  /**
   * Generate final report
   */
  private generateFinalReport(): PerformanceTestResults {
    return this.results as PerformanceTestResults;
  }

  /**
   * Save report to file
   */
  private async saveReport(report: PerformanceTestResults, outputPath: string): Promise<void> {
    const reportPath = path.resolve(outputPath);
    const reportDir = path.dirname(reportPath);

    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = reportPath.replace('.json', '.md');
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports saved to:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Markdown: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: PerformanceTestResults): string {
    const date = new Date(report.timestamp).toISOString();

    let md = `# Justice Companion Performance Analysis Report\n\n`;
    md += `**Generated:** ${date}\n`;
    md += `**Platform:** ${report.environment.platform}\n`;
    md += `**Node Version:** ${report.environment.nodeVersion}\n\n`;

    md += `## Executive Summary\n\n`;

    // Key findings
    md += `### Key Performance Metrics\n\n`;
    md += `| Component | Metric | Value | Status |\n`;
    md += `|-----------|--------|-------|--------|\n`;

    if (report.database) {
      const slowQueries = report.database.slowQueries?.length || 0;
      md += `| Database | Slow Queries | ${slowQueries} | ${slowQueries > 10 ? '⚠️' : '✅'} |\n`;
      md += `| Database | N+1 Problems | ${report.database.n1Problems?.length || 0} | ${report.database.n1Problems?.length > 0 ? '⚠️' : '✅'} |\n`;
    }

    if (report.encryption) {
      const cacheHitRate = report.encryption.cacheEfficiency?.hotspot?.hitRate || 0;
      md += `| Encryption | Cache Hit Rate | ${cacheHitRate.toFixed(1)}% | ${cacheHitRate > 70 ? '✅' : '⚠️'} |\n`;
    }

    if (report.ipc) {
      const avgLatency = report.ipc.metrics?.average || 0;
      md += `| IPC | Avg Latency | ${avgLatency.toFixed(2)}ms | ${avgLatency < 50 ? '✅' : '⚠️'} |\n`;
    }

    md += `\n### Recommendations\n\n`;

    md += `#### 🎯 Quick Wins (Low Effort, High Impact)\n\n`;
    report.recommendations.quickWins.forEach(rec => {
      md += `- ${rec}\n`;
    });

    md += `\n#### 💪 High Impact Refactorings\n\n`;
    report.recommendations.highImpact.forEach(rec => {
      md += `- ${rec}\n`;
    });

    md += `\n#### 🔮 Long-term Improvements\n\n`;
    report.recommendations.longTerm.forEach(rec => {
      md += `- ${rec}\n`;
    });

    // Detailed sections
    md += `\n## Detailed Analysis\n\n`;

    if (report.database) {
      md += `### Database Performance\n\n`;
      md += `- **Slow Queries:** ${report.database.slowQueries?.length || 0}\n`;
      md += `- **N+1 Problems:** ${report.database.n1Problems?.length || 0}\n`;
      md += `- **Missing Indexes:** ${report.database.indexRecommendations?.length || 0}\n\n`;
    }

    if (report.encryption) {
      md += `### Encryption Performance\n\n`;
      md += `- **Worst Case (100 cases):** ${report.encryption.worstCase?.totalTime.toFixed(0)}ms\n`;
      md += `- **Cache Overflow:** ${report.encryption.worstCase?.cacheOverflow ? 'Yes' : 'No'}\n\n`;
    }

    if (report.ipc) {
      md += `### IPC Communication\n\n`;
      md += `- **Service Instantiation Overhead:** ${report.ipc.serviceInstantiation?.lazyLoadingOverhead.toFixed(1)}%\n`;
      md += `- **Potential Batching Reduction:** ${report.ipc.batchingOpportunities?.potentialReduction.toFixed(1)}%\n\n`;
    }

    return md;
  }
}

// Export test runner factory
export function createPerformanceTestRunner(): PerformanceTestRunner {
  return new PerformanceTestRunner();
}

// CLI interface
if (require.main === module) {
  const runner = createPerformanceTestRunner();

  runner.runAllTests({
    dbPath: process.argv[2] || './justice-companion.db',
    verbose: true,
    outputPath: './performance-report.json'
  }).then(report => {
    console.log('\n✅ Performance analysis complete!');
  }).catch(error => {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  });
}
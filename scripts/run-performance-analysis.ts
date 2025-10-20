#!/usr/bin/env node

/**
 * Performance Analysis Script for Justice Companion
 * Run comprehensive performance tests and generate report
 */

import path from 'path';
import fs from 'fs';
import { createPerformanceTestRunner } from '../src/performance/performance-test-runner';

async function main() {
  console.log('🚀 Justice Companion Performance Analysis');
  console.log('=========================================\n');

  // Check if database exists
  const dbPath = path.join(process.cwd(), 'justice-companion.db');
  const dbExists = fs.existsSync(dbPath);

  if (!dbExists) {
    console.log('⚠️  Database not found. Creating test database...');
    // In production, would create test database here
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'performance-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
  const outputPath = path.join(outputDir, `performance-report-${timestamp}.json`);

  // Run performance analysis
  const runner = createPerformanceTestRunner();

  try {
    const report = await runner.runAllTests({
      dbPath: dbExists ? dbPath : undefined,
      verbose: true,
      outputPath
    });

    // Print summary
    console.log('\n📊 Performance Analysis Summary');
    console.log('================================\n');

    // Quick wins
    if (report.recommendations.quickWins.length > 0) {
      console.log('🎯 Quick Wins (implement immediately):');
      report.recommendations.quickWins.forEach(rec => {
        console.log(`  • ${rec}`);
      });
      console.log();
    }

    // High impact
    if (report.recommendations.highImpact.length > 0) {
      console.log('💪 High Impact Improvements:');
      report.recommendations.highImpact.forEach(rec => {
        console.log(`  • ${rec}`);
      });
      console.log();
    }

    // Critical issues
    const criticalIssues = [];

    if (report.database?.n1Problems?.length > 0) {
      criticalIssues.push(`${report.database.n1Problems.length} N+1 query problems detected`);
    }

    if (report.database?.slowQueries?.length > 10) {
      criticalIssues.push(`${report.database.slowQueries.length} slow queries found`);
    }

    if (report.ipc?.serviceInstantiation?.lazyLoadingOverhead > 50) {
      criticalIssues.push(`Service instantiation overhead: ${report.ipc.serviceInstantiation.lazyLoadingOverhead.toFixed(1)}%`);
    }

    if (criticalIssues.length > 0) {
      console.log('⚠️  Critical Issues:');
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
      console.log();
    }

    console.log('✅ Analysis complete! Reports saved to:');
    console.log(`  • ${outputPath}`);
    console.log(`  • ${outputPath.replace('.json', '.md')}`);

  } catch (error) {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runPerformanceAnalysis };
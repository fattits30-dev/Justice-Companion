/**
 * Database Performance Analyzer for Justice Companion
 * Identifies query bottlenecks, N+1 problems, and missing indexes
 */

import Database from 'better-sqlite3';
import { profiler } from './performance-profiler';

export interface QueryPerformance {
  sql: string;
  executionTime: number;
  rowsRead: number;
  rowsReturned: number;
  isSlowQuery: boolean;
  queryPlan?: QueryPlanStep[];
  suggestions: string[];
}

export interface QueryPlanStep {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

export interface IndexAnalysis {
  table: string;
  columns: string[];
  currentIndexes: string[];
  missingIndexes: string[];
  unusedIndexes: string[];
  recommendations: string[];
}

export interface N1ProblemDetection {
  pattern: string;
  queries: string[];
  count: number;
  recommendation: string;
}

export class DatabasePerformanceAnalyzer {
  private db: Database.Database;
  private queryLog: Map<string, QueryPerformance[]> = new Map();
  private slowQueryThreshold: number = 50; // ms
  private queryPatterns: Map<string, number> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
    this.enableQueryProfiling();
  }

  /**
   * Enable query profiling and logging
   */
  private enableQueryProfiling(): void {
    // Enable query timing
    this.db.pragma('query_only = OFF');

    // Wrap database methods to track performance
    const originalPrepare = this.db.prepare.bind(this.db);

    this.db.prepare = (sql: string) => {
      const statement = originalPrepare(sql);
      const originalRun = statement.run.bind(statement);
      const originalGet = statement.get.bind(statement);
      const originalAll = statement.all.bind(statement);

      // Track run() performance
      statement.run = (...params: any[]) => {
        return this.measureQuery(sql, () => originalRun(...params), 'run');
      };

      // Track get() performance
      statement.get = (...params: any[]) => {
        return this.measureQuery(sql, () => originalGet(...params), 'get');
      };

      // Track all() performance
      statement.all = (...params: any[]) => {
        return this.measureQuery(sql, () => originalAll(...params), 'all');
      };

      return statement;
    };
  }

  /**
   * Measure query performance
   */
  private measureQuery<T>(sql: string, fn: () => T, method: string): T {
    const startTime = performance.now();
    const result = fn();
    const executionTime = performance.now() - startTime;

    // Normalize SQL for pattern matching
    const normalizedSql = this.normalizeSql(sql);

    // Track query pattern frequency
    const currentCount = this.queryPatterns.get(normalizedSql) || 0;
    this.queryPatterns.set(normalizedSql, currentCount + 1);

    // Log query performance
    const queryPerf: QueryPerformance = {
      sql,
      executionTime,
      rowsRead: 0, // Will be populated by EXPLAIN
      rowsReturned: Array.isArray(result) ? result.length : result ? 1 : 0,
      isSlowQuery: executionTime > this.slowQueryThreshold,
      suggestions: []
    };

    // Analyze slow queries
    if (queryPerf.isSlowQuery) {
      this.analyzeSlowQuery(queryPerf);
    }

    // Store query log
    const queries = this.queryLog.get(normalizedSql) || [];
    queries.push(queryPerf);
    this.queryLog.set(normalizedSql, queries);

    // Emit performance event
    if (queryPerf.isSlowQuery) {
      profiler.emit('slow-query', queryPerf);
    }

    return result;
  }

  /**
   * Normalize SQL for pattern matching
   */
  private normalizeSql(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\?/g, '?')
      .replace(/\d+/g, 'N')
      .trim()
      .toLowerCase();
  }

  /**
   * Analyze slow query with EXPLAIN QUERY PLAN
   */
  private analyzeSlowQuery(queryPerf: QueryPerformance): void {
    try {
      const explainResult = this.db.prepare(`EXPLAIN QUERY PLAN ${queryPerf.sql}`).all() as QueryPlanStep[];
      queryPerf.queryPlan = explainResult;

      // Analyze query plan for issues
      explainResult.forEach(step => {
        if (step.detail.includes('SCAN TABLE')) {
          queryPerf.suggestions.push('Full table scan detected - consider adding an index');
        }
        if (step.detail.includes('USING TEMP')) {
          queryPerf.suggestions.push('Temporary table usage detected - optimize query structure');
        }
        if (step.detail.includes('USING FILESORT')) {
          queryPerf.suggestions.push('Filesort detected - consider adding a covering index');
        }
      });

      // Check for missing indexes
      const missingIndexes = this.detectMissingIndexes(queryPerf.sql);
      if (missingIndexes.length > 0) {
        queryPerf.suggestions.push(`Missing indexes on: ${missingIndexes.join(', ')}`);
      }
    } catch (error) {
      // EXPLAIN might fail for some queries
      console.warn('Failed to analyze query:', error);
    }
  }

  /**
   * Detect missing indexes based on WHERE and JOIN clauses
   */
  private detectMissingIndexes(sql: string): string[] {
    const missingIndexes: string[] = [];

    // Extract table and column references from WHERE clause
    const whereMatch = sql.match(/WHERE\s+(\w+)\.?(\w+)\s*=/gi);
    const joinMatch = sql.match(/JOIN\s+\w+\s+ON\s+(\w+)\.?(\w+)\s*=/gi);

    // Known composite index requirements from Phase 1 review
    const requiredCompositeIndexes = [
      { table: 'actions', columns: ['status', 'due_date'] },
      { table: 'cases', columns: ['userId', 'status'] },
      { table: 'chat_messages', columns: ['conversationId', 'created_at'] }
    ];

    // Check if required indexes exist
    requiredCompositeIndexes.forEach(({ table, columns }) => {
      if (sql.toLowerCase().includes(table)) {
        const indexExists = this.checkIndexExists(table, columns);
        if (!indexExists) {
          missingIndexes.push(`${table}(${columns.join(', ')})`);
        }
      }
    });

    return missingIndexes;
  }

  /**
   * Check if an index exists on specified columns
   */
  private checkIndexExists(table: string, columns: string[]): boolean {
    try {
      const indexes = this.db.prepare(`PRAGMA index_list(${table})`).all() as any[];

      for (const index of indexes) {
        const indexInfo = this.db.prepare(`PRAGMA index_info(${index.name})`).all() as any[];
        const indexColumns = indexInfo.map((col: any) => col.name);

        // Check if index covers required columns
        if (columns.every(col => indexColumns.includes(col))) {
          return true;
        }
      }
    } catch (error) {
      console.warn(`Failed to check indexes for ${table}:`, error);
    }

    return false;
  }

  /**
   * Detect N+1 query problems
   */
  detectN1Problems(): N1ProblemDetection[] {
    const problems: N1ProblemDetection[] = [];

    // Analyze query patterns for N+1
    this.queryPatterns.forEach((count, pattern) => {
      // Detect repeated single-row queries
      if (count > 10 && pattern.includes('where') && pattern.includes('= ?')) {
        problems.push({
          pattern,
          queries: [pattern],
          count,
          recommendation: 'Consider using JOIN or IN clause to fetch related data in a single query'
        });
      }

      // Detect case -> evidence -> timeline pattern
      if (pattern.includes('evidence') && count > 5) {
        const relatedPatterns = Array.from(this.queryPatterns.keys()).filter(p =>
          p.includes('timeline') || p.includes('documents')
        );

        if (relatedPatterns.length > 0) {
          problems.push({
            pattern: 'case -> evidence -> timeline',
            queries: [pattern, ...relatedPatterns],
            count,
            recommendation: 'Use eager loading with JOINs to fetch related data in a single query'
          });
        }
      }
    });

    return problems;
  }

  /**
   * Analyze table statistics
   */
  analyzeTableStatistics(): Map<string, { rowCount: number; indexCount: number; size: number }> {
    const stats = new Map<string, any>();

    // Get all tables
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    tables.forEach(({ name }) => {
      try {
        // Get row count
        const rowCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as { count: number };

        // Get index count
        const indexes = this.db.prepare(`PRAGMA index_list(${name})`).all() as any[];

        // Estimate table size
        const pageCount = this.db.prepare(`PRAGMA page_count`).get() as { page_count: number };
        const pageSize = this.db.pragma('page_size')[0].page_size;
        const estimatedSize = (pageCount.page_count * pageSize) / tables.length; // Rough estimate

        stats.set(name, {
          rowCount: rowCount.count,
          indexCount: indexes.length,
          size: estimatedSize
        });
      } catch (error) {
        console.warn(`Failed to analyze table ${name}:`, error);
      }
    });

    return stats;
  }

  /**
   * Generate index recommendations
   */
  generateIndexRecommendations(): IndexAnalysis[] {
    const recommendations: IndexAnalysis[] = [];

    // Analyze each table
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    tables.forEach(({ name }) => {
      const analysis: IndexAnalysis = {
        table: name,
        columns: [],
        currentIndexes: [],
        missingIndexes: [],
        unusedIndexes: [],
        recommendations: []
      };

      // Get current indexes
      try {
        const indexes = this.db.prepare(`PRAGMA index_list(${name})`).all() as any[];
        analysis.currentIndexes = indexes.map((idx: any) => idx.name);

        // Check for missing composite indexes (from Phase 1)
        if (name === 'actions') {
          if (!this.checkIndexExists('actions', ['status', 'due_date'])) {
            analysis.missingIndexes.push('idx_actions_status_due_date');
            analysis.recommendations.push('CREATE INDEX idx_actions_status_due_date ON actions(status, due_date)');
          }
        }

        if (name === 'cases') {
          if (!this.checkIndexExists('cases', ['userId', 'status'])) {
            analysis.missingIndexes.push('idx_cases_userId_status');
            analysis.recommendations.push('CREATE INDEX idx_cases_userId_status ON cases(userId, status)');
          }
        }

        if (name === 'chat_messages') {
          if (!this.checkIndexExists('chat_messages', ['conversationId', 'created_at'])) {
            analysis.missingIndexes.push('idx_chat_messages_conversationId_created');
            analysis.recommendations.push('CREATE INDEX idx_chat_messages_conversationId_created ON chat_messages(conversationId, created_at)');
          }
        }

        // Detect unused indexes (indexes not referenced in query patterns)
        analysis.currentIndexes.forEach(indexName => {
          const isUsed = Array.from(this.queryPatterns.keys()).some(pattern =>
            pattern.includes(name) && pattern.includes('using index')
          );

          if (!isUsed && !indexName.includes('PRIMARY')) {
            analysis.unusedIndexes.push(indexName);
          }
        });

      } catch (error) {
        console.warn(`Failed to analyze indexes for ${name}:`, error);
      }

      if (analysis.missingIndexes.length > 0 || analysis.unusedIndexes.length > 0) {
        recommendations.push(analysis);
      }
    });

    return recommendations;
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    slowQueries: QueryPerformance[];
    n1Problems: N1ProblemDetection[];
    indexRecommendations: IndexAnalysis[];
    queryStatistics: Map<string, { avg: number; p95: number; count: number }>;
    tableStatistics: Map<string, any>;
  } {
    // Get slow queries
    const slowQueries: QueryPerformance[] = [];
    this.queryLog.forEach(queries => {
      slowQueries.push(...queries.filter(q => q.isSlowQuery));
    });

    // Calculate query statistics
    const queryStatistics = new Map<string, any>();
    this.queryLog.forEach((queries, pattern) => {
      const times = queries.map(q => q.executionTime).sort((a, b) => a - b);
      queryStatistics.set(pattern, {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        p95: times[Math.floor(times.length * 0.95)] || 0,
        count: queries.length
      });
    });

    return {
      slowQueries: slowQueries.sort((a, b) => b.executionTime - a.executionTime).slice(0, 20),
      n1Problems: this.detectN1Problems(),
      indexRecommendations: this.generateIndexRecommendations(),
      queryStatistics,
      tableStatistics: this.analyzeTableStatistics()
    };
  }

  /**
   * Clear query log
   */
  reset(): void {
    this.queryLog.clear();
    this.queryPatterns.clear();
  }
}

// Export analyzer factory
export function createDatabaseAnalyzer(dbPath: string): DatabasePerformanceAnalyzer {
  const db = new Database(dbPath, { readonly: true });
  return new DatabasePerformanceAnalyzer(db);
}
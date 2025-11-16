/**
 * Database Query Analyzer
 * Analyzes query performance and provides optimization suggestions
 * Created by Desktop Commander Demo
 */

import Database from "better-sqlite3";
import { logger } from "./logger";

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsAffected: number;
  usesIndex: boolean;
  recommendations: string[];
}

interface QueryPlan {
  detail: string;
  usesIndex: boolean;
}

export class DatabaseQueryAnalyzer {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  /**
   * Analyze a SQL query and provide performance insights
   */
  analyzeQuery(sql: string, params: unknown[] = []): QueryAnalysis {
    const startTime = performance.now();

    // Get query execution plan
    const plan = this.getQueryPlan(sql);

    // Execute the query
    let rowsAffected = 0;
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params);
      rowsAffected = Array.isArray(result) ? result.length : 0;
    } catch (error) {
      logger.error("Query analysis error:", error);
    }

    const executionTime = performance.now() - startTime;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      sql,
      plan,
      executionTime,
    );

    return {
      query: sql,
      executionTime,
      rowsAffected,
      usesIndex: plan.usesIndex,
      recommendations,
    };
  }

  /**
   * Get SQLite query execution plan
   */
  private getQueryPlan(sql: string): QueryPlan {
    try {
      const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
      const planText = JSON.stringify(plan);

      return {
        detail: planText,
        usesIndex: planText.toLowerCase().includes("index"),
      };
    } catch (error) {
      return {
        detail: "Unable to analyze query plan",
        usesIndex: false,
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    sql: string,
    plan: QueryPlan,
    executionTime: number,
  ): string[] {
    const recommendations: string[] = [];

    // Check execution time
    if (executionTime > 100) {
      recommendations.push(
        `Slow query (${executionTime.toFixed(2)}ms). Consider optimization.`,
      );
    }

    // Check for missing indexes
    if (!plan.usesIndex && sql.toLowerCase().includes("where")) {
      recommendations.push(
        "Query does not use an index. Consider adding one on filtered columns.",
      );
    }

    // Check for SELECT *
    if (sql.toLowerCase().includes("select *")) {
      recommendations.push(
        "Avoid SELECT *. Specify only needed columns for better performance.",
      );
    }

    // Check for OR conditions
    if (sql.toLowerCase().includes(" or ")) {
      recommendations.push(
        "OR conditions can prevent index usage. Consider restructuring with UNION.",
      );
    }

    // Check for functions in WHERE
    if (/where.*\(.*\)/.test(sql.toLowerCase())) {
      recommendations.push(
        "Functions in WHERE clause prevent index usage. Consider computed columns.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Query looks well-optimized!");
    }

    return recommendations;
  }

  /**
   * Benchmark a query by running it multiple times
   */
  benchmarkQuery(
    sql: string,
    params: unknown[] = [],
    iterations: number = 100,
  ): {
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  } {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      try {
        const stmt = this.db.prepare(sql);
        stmt.all(...params);
      } catch (error) {
        logger.error("Benchmark error:", error);
      }
      times.push(performance.now() - startTime);
    }

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime: times.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Find all tables without indexes
   */
  findUnindexedTables(): Array<{ table: string; columns: string[] }> {
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>;

    const unindexedTables: Array<{ table: string; columns: string[] }> = [];

    for (const { name } of tables) {
      const indexes = this.db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?`,
        )
        .all(name);

      if (indexes.length === 0) {
        const columns = this.db
          .prepare(`PRAGMA table_info(${name})`)
          .all() as Array<{ name: string }>;

        unindexedTables.push({
          table: name,
          columns: columns.map((c) => c.name),
        });
      }
    }

    return unindexedTables;
  }

  /**
   * Generate an optimization report for the entire database
   */
  generateOptimizationReport(): {
    unindexedTables: Array<{ table: string; columns: string[] }>;
    databaseSize: number;
    recommendations: string[];
  } {
    const unindexedTables = this.findUnindexedTables();

    // Get database file size
    const pageCount = this.db.pragma("page_count", { simple: true }) as number;
    const pageSize = this.db.pragma("page_size", { simple: true }) as number;
    const databaseSize = pageCount * pageSize;

    const recommendations: string[] = [];

    if (unindexedTables.length > 0) {
      recommendations.push(
        `Found ${unindexedTables.length} tables without indexes.`,
      );
    }

    if (databaseSize > 100 * 1024 * 1024) {
      recommendations.push(
        "Database is over 100MB. Consider archiving old data.",
      );
    }

    // Check for vacuum opportunity
    const freelistCount = this.db.pragma("freelist_count", {
      simple: true,
    }) as number;
    if (freelistCount > 1000) {
      recommendations.push(
        "Database has fragmentation. Run VACUUM to reclaim space.",
      );
    }

    return {
      unindexedTables,
      databaseSize,
      recommendations,
    };
  }
}

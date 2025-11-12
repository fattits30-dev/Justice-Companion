/**
 * Performance Analysis Script for Justice Companion
 * Comprehensive performance metrics and scalability assessment
 */

import { performance } from "perf_hooks";
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Performance metric types
interface PerformanceMetric {
  operation: string;
  duration: number;
  throughput?: number;
  memory?: {
    before: number;
    after: number;
    delta: number;
  };
  details?: Record<string, any>;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetric[] = [];
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(
      process.cwd(),
      ".justice-companion",
      "performance-test.db"
    );

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database with performance optimizations (matching production config)
    this.db = new Database(dbPath);

    // Apply production pragmas
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("cache_size = -40000"); // 40MB cache
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("temp_store = MEMORY");

    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Create production-like schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cases (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT, -- Encrypted field
        case_type TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(rowid)
      );

      CREATE TABLE IF NOT EXISTS evidence (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        type TEXT,
        file_path TEXT, -- Encrypted field
        description TEXT, -- Encrypted field
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(rowid)
      );

      CREATE TABLE IF NOT EXISTS chat_conversations (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        user_id INTEGER NOT NULL,
        message TEXT, -- Encrypted field
        response TEXT, -- Encrypted field
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(rowid),
        FOREIGN KEY (user_id) REFERENCES users(rowid)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        hash TEXT NOT NULL,
        previous_hash TEXT,
        FOREIGN KEY (user_id) REFERENCES users(rowid)
      );

      -- Create indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
      CREATE INDEX IF NOT EXISTS idx_chat_case_id ON chat_conversations(case_id);
      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
    `);
  }

  private measureOperation<T>(
    operation: string,
    fn: () => T,
    details?: Record<string, any>
  ): T {
    const memBefore = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = fn();

    const duration = performance.now() - start;
    const memAfter = process.memoryUsage().heapUsed;

    this.metrics.push({
      operation,
      duration,
      memory: {
        before: memBefore,
        after: memAfter,
        delta: memAfter - memBefore,
      },
      details,
    });

    return result;
  }

  // Simulate AES-256-GCM encryption (matching production)
  private encrypt(text: string): string {
    const algorithm = "aes-256-gcm";
    // Use environment variable or generate secure test values
    const testKey =
      process.env.PERFORMANCE_TEST_KEY ||
      crypto.randomBytes(32).toString("hex");
    const testSalt =
      process.env.PERFORMANCE_TEST_SALT ||
      crypto.randomBytes(16).toString("hex");
    const key = crypto.scryptSync(testKey, testSalt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      authTag: authTag.toString("hex"),
      iv: iv.toString("hex"),
    });
  }

  private decrypt(encryptedData: string): string {
    const data = JSON.parse(encryptedData);
    const algorithm = "aes-256-gcm";
    // Use environment variable or generate secure test values
    const testKey =
      process.env.PERFORMANCE_TEST_KEY ||
      crypto.randomBytes(32).toString("hex");
    const testSalt =
      process.env.PERFORMANCE_TEST_SALT ||
      crypto.randomBytes(16).toString("hex");
    const key = crypto.scryptSync(testKey, testSalt, 32);
    const iv = Buffer.from(data.iv, "hex");
    const authTag = Buffer.from(data.authTag, "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  public async runFullAnalysis(): Promise<void> {
    console.log("🚀 JUSTICE COMPANION PERFORMANCE ANALYSIS");
    console.log("=".repeat(60) + "\n");

    await this.setupTestData();
    await this.analyzeQueryPerformance();
    await this.analyzeEncryptionOverhead();
    await this.analyzePaginationPerformance();
    await this.analyzeRepositoryPattern();
    await this.analyzeScalability();
    await this.analyzeConcurrency();

    this.generateReport();
    this.cleanup();
  }

  private async setupTestData(): Promise<void> {
    console.log("📝 Setting up test data...\n");

    const userInsert = this.db.prepare(
      "INSERT INTO users (username, email, password_hash, password_salt) VALUES (?, ?, ?, ?)"
    );

    const caseInsert = this.db.prepare(
      "INSERT INTO cases (user_id, title, description, case_type, status) VALUES (?, ?, ?, ?, ?)"
    );

    const evidenceInsert = this.db.prepare(
      "INSERT INTO evidence (case_id, type, file_path, description) VALUES (?, ?, ?, ?)"
    );

    // Insert test users
    this.measureOperation("Insert 100 users", () => {
      const insertMany = this.db.transaction((users) => {
        for (const user of users) {
          userInsert.run(user.username, user.email, user.hash, user.salt);
        }
      });

      const users = Array.from({ length: 100 }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@test.com`,
        hash: crypto.randomBytes(64).toString("hex"),
        salt: crypto.randomBytes(32).toString("hex"),
      }));

      insertMany(users);
    });

    // Insert test cases with encrypted fields
    this.measureOperation("Insert 1000 cases (with encryption)", () => {
      const insertMany = this.db.transaction((cases) => {
        for (const c of cases) {
          caseInsert.run(c.userId, c.title, c.description, c.type, c.status);
        }
      });

      const cases = Array.from({ length: 1000 }, (_, i) => ({
        userId: Math.floor(Math.random() * 100) + 1,
        title: `Case ${i}`,
        description: this.encrypt(`Detailed description for case ${i}`),
        type: ["employment", "civil", "criminal"][i % 3],
        status: "active",
      }));

      insertMany(cases);
    });

    // Insert test evidence
    this.measureOperation(
      "Insert 5000 evidence items (with encryption)",
      () => {
        const insertMany = this.db.transaction((evidence) => {
          for (const e of evidence) {
            evidenceInsert.run(e.caseId, e.type, e.filePath, e.description);
          }
        });

        const evidence = Array.from({ length: 5000 }, (_, i) => ({
          caseId: Math.floor(Math.random() * 1000) + 1,
          type: ["document", "email", "audio", "image"][i % 4],
          filePath: this.encrypt(`/encrypted/path/to/evidence_${i}.pdf`),
          description: this.encrypt(`Evidence item ${i} description`),
        }));

        insertMany(evidence);
      }
    );

    console.log("✅ Test data setup complete\n");
  }

  private async analyzeQueryPerformance(): Promise<void> {
    console.log("📊 Analyzing Query Performance...\n");

    // Simple queries
    this.measureOperation("Simple SELECT (1000 cases)", () => {
      const stmt = this.db.prepare("SELECT rowid, * FROM cases LIMIT 1000");
      return stmt.all();
    });

    // JOIN queries
    this.measureOperation("JOIN query (cases + evidence)", () => {
      const stmt = this.db.prepare(`
        SELECT c.rowid as case_id, c.title, e.rowid as evidence_id, e.type
        FROM cases c
        LEFT JOIN evidence e ON c.rowid = e.case_id
        WHERE c.user_id = ?
        LIMIT 100
      `);
      return stmt.all(1);
    });

    // Aggregation queries
    this.measureOperation("Aggregation query (case counts)", () => {
      const stmt = this.db.prepare(`
        SELECT user_id, COUNT(*) as case_count
        FROM cases
        GROUP BY user_id
      `);
      return stmt.all();
    });

    // Query with encryption field access
    this.measureOperation("Query with decryption (100 cases)", () => {
      const stmt = this.db.prepare(
        "SELECT rowid, description FROM cases LIMIT 100"
      );
      const rows = stmt.all();
      return rows.map((row) => ({
        ...row,
        description: this.decrypt(row.description as string),
      }));
    });

    // Analyze query plans
    const queries = [
      "SELECT * FROM cases WHERE user_id = ?",
      "SELECT * FROM evidence WHERE case_id = ?",
      "SELECT * FROM chat_conversations WHERE case_id = ? ORDER BY created_at DESC",
    ];

    console.log("Query Execution Plans:");
    queries.forEach((query) => {
      const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(1);
      console.log(`\n${query}`);
      plan.forEach((step: any) => {
        console.log(`  ${step.detail}`);
      });
    });
    console.log();
  }

  private async analyzeEncryptionOverhead(): Promise<void> {
    console.log("🔒 Analyzing Encryption/Decryption Overhead...\n");

    const sizes = [
      { name: "small", data: "x".repeat(100) },
      { name: "medium", data: "x".repeat(1000) },
      { name: "large", data: "x".repeat(10000) },
      { name: "very large", data: "x".repeat(100000) },
    ];

    sizes.forEach(({ name, data }) => {
      const encrypted = this.measureOperation(
        `Encrypt ${name} (${data.length} bytes)`,
        () => this.encrypt(data),
        { size: data.length }
      );

      this.measureOperation(
        `Decrypt ${name} (${data.length} bytes)`,
        () => this.decrypt(encrypted),
        { size: data.length }
      );
    });

    // Batch operations
    const batchSize = 100;
    const batchData = Array(batchSize).fill("Test data for batch processing");

    this.measureOperation(
      `Batch encrypt (${batchSize} items)`,
      () => batchData.map((d) => this.encrypt(d)),
      { batchSize }
    );

    // Measure cache effectiveness simulation
    const cacheHits = new Map<string, string>();

    this.measureOperation(
      "Decryption with cache simulation (1000 items, 50% hit rate)",
      () => {
        for (let i = 0; i < 1000; i++) {
          const key = `item_${i % 500}`; // 50% will be cache hits

          if (cacheHits.has(key)) {
            // Cache hit - no decryption needed
            cacheHits.get(key);
          } else {
            // Cache miss - decrypt and cache
            const encrypted = this.encrypt(`Data for ${key}`);
            const decrypted = this.decrypt(encrypted);
            cacheHits.set(key, decrypted);
          }
        }
      },
      { cacheSize: cacheHits.size }
    );
  }

  private async analyzePaginationPerformance(): Promise<void> {
    console.log("📄 Analyzing Pagination Performance...\n");

    // Cursor-based pagination
    let lastRowId = 0;
    for (let page = 1; page <= 5; page++) {
      const result = this.measureOperation(
        `Cursor pagination (page ${page})`,
        () => {
          const stmt = this.db.prepare(`
            SELECT rowid, * FROM cases
            WHERE rowid > ?
            ORDER BY rowid
            LIMIT 20
          `);
          return stmt.all(lastRowId);
        },
        { page, cursor: lastRowId }
      );

      if (result.length > 0) {
        lastRowId = result[result.length - 1].rowid;
      }
    }

    // OFFSET pagination (for comparison)
    for (let page = 1; page <= 5; page++) {
      this.measureOperation(
        `OFFSET pagination (page ${page})`,
        () => {
          const stmt = this.db.prepare(`
            SELECT rowid, * FROM cases
            ORDER BY rowid
            LIMIT 20 OFFSET ?
          `);
          return stmt.all((page - 1) * 20);
        },
        { page, offset: (page - 1) * 20 }
      );
    }

    // Deep pagination comparison
    this.measureOperation("Deep cursor pagination (page 50)", () => {
      const stmt = this.db.prepare(`
          SELECT rowid, * FROM cases
          WHERE rowid > ?
          ORDER BY rowid
          LIMIT 20
        `);
      return stmt.all(980); // Simulating page 50
    });

    this.measureOperation("Deep OFFSET pagination (page 50)", () => {
      const stmt = this.db.prepare(`
          SELECT rowid, * FROM cases
          ORDER BY rowid
          LIMIT 20 OFFSET ?
        `);
      return stmt.all(980);
    });
  }

  private async analyzeRepositoryPattern(): Promise<void> {
    console.log("🏗️ Analyzing Repository Pattern Overhead...\n");

    // Simulate repository instantiation pattern
    class MockRepository {
      private db: Database.Database;
      private encryptionKey: Buffer;
      private preparedStatements: Map<string, Database.Statement>;

      constructor(db: Database.Database) {
        this.db = db;
        // Use environment variable or generate secure test values
        const testKey =
          process.env.PERFORMANCE_TEST_KEY ||
          crypto.randomBytes(32).toString("hex");
        const testSalt =
          process.env.PERFORMANCE_TEST_SALT ||
          crypto.randomBytes(16).toString("hex");
        this.encryptionKey = crypto.scryptSync(testKey, testSalt, 32);
        this.preparedStatements = new Map();
        this.prepareStatements();
      }

      private prepareStatements(): void {
        this.preparedStatements.set(
          "findById",
          this.db.prepare("SELECT * FROM cases WHERE rowid = ?")
        );
        this.preparedStatements.set(
          "findAll",
          this.db.prepare("SELECT * FROM cases")
        );
      }

      findById(id: number): any {
        return this.preparedStatements.get("findById")!.get(id);
      }
    }

    // Measure single instantiation
    this.measureOperation(
      "Single repository instantiation",
      () => new MockRepository(this.db)
    );

    // Measure multiple instantiations (IPC handler pattern)
    this.measureOperation("Multiple repository instantiations (30x)", () => {
      const repos = [];
      for (let i = 0; i < 30; i++) {
        repos.push(new MockRepository(this.db));
      }
      return repos;
    });

    // Measure singleton pattern
    let singletonRepo: MockRepository | null = null;

    this.measureOperation("Singleton pattern (10 accesses)", () => {
      for (let i = 0; i < 10; i++) {
        if (!singletonRepo) {
          singletonRepo = new MockRepository(this.db);
        }
        singletonRepo.findById(1);
      }
    });

    // Compare with factory pattern
    const repoCache = new Map<string, MockRepository>();

    this.measureOperation("Factory pattern with caching (10 accesses)", () => {
      for (let i = 0; i < 10; i++) {
        const key = "CaseRepository";
        if (!repoCache.has(key)) {
          repoCache.set(key, new MockRepository(this.db));
        }
        repoCache.get(key)!.findById(1);
      }
    });
  }

  private async analyzeScalability(): Promise<void> {
    console.log("📈 Analyzing Scalability...\n");

    const scaleSizes = [100, 1000, 10000];

    scaleSizes.forEach((size) => {
      // Query scaling
      this.measureOperation(
        `Query ${size} cases`,
        () => {
          const stmt = this.db.prepare(`SELECT rowid, * FROM cases LIMIT ?`);
          return stmt.all(size);
        },
        { size }
      );

      // Query with decryption scaling
      this.measureOperation(
        `Query + decrypt ${Math.min(size, 1000)} items`,
        () => {
          const stmt = this.db.prepare(
            `SELECT rowid, description FROM cases LIMIT ?`
          );
          const rows = stmt.all(Math.min(size, 1000));
          return rows.map((row) => ({
            ...row,
            description: this.decrypt(row.description as string),
          }));
        },
        { size: Math.min(size, 1000) }
      );
    });

    // Audit log growth simulation
    const auditInsert = this.db.prepare(`
      INSERT INTO audit_log (user_id, event_type, action, hash, previous_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    [1000, 5000, 10000].forEach((count) => {
      this.measureOperation(
        `Insert ${count} audit logs (hash chaining)`,
        () => {
          let previousHash = "initial";
          const insertMany = this.db.transaction(() => {
            for (let i = 0; i < count; i++) {
              const hash = crypto
                .createHash("sha256")
                .update(`${previousHash}${i}`)
                .digest("hex");

              auditInsert.run(
                1,
                "test_event",
                "test_action",
                hash,
                previousHash
              );
              previousHash = hash;
            }
          });
          insertMany();
        },
        { count }
      );
    });
  }

  private async analyzeConcurrency(): Promise<void> {
    console.log("🔄 Analyzing Concurrency (WAL Mode)...\n");

    // Concurrent reads
    this.measureOperation("Concurrent reads (10 parallel)", () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const stmt = this.db.prepare(
          "SELECT COUNT(*) as count FROM cases WHERE user_id = ?"
        );
        return stmt.get(i + 1);
      });
      return promises;
    });

    // Read during write (WAL mode benefit)
    this.measureOperation("Read during write transaction", () => {
      const transaction = this.db.transaction(() => {
        const insert = this.db.prepare(
          "INSERT INTO cases (user_id, title, description) VALUES (?, ?, ?)"
        );
        for (let i = 0; i < 100; i++) {
          insert.run(1, `Concurrent case ${i}`, this.encrypt("test"));
        }
      });

      // Start transaction
      const txPromise = new Promise((resolve) => {
        setTimeout(() => {
          transaction();
          resolve(true);
        }, 10);
      });

      // Concurrent read
      const stmt = this.db.prepare("SELECT COUNT(*) as count FROM cases");
      const count = stmt.get();

      return { count, txPromise };
    });
  }

  private generateReport(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📈 PERFORMANCE ANALYSIS REPORT");
    console.log("=".repeat(60) + "\n");

    // Sort by duration
    const sorted = [...this.metrics].sort((a, b) => b.duration - a.duration);

    console.log("🐌 TOP 10 SLOWEST OPERATIONS:");
    console.log("-".repeat(40));
    sorted.slice(0, 10).forEach((metric, i) => {
      console.log(
        `${i + 1}. ${metric.operation}`,
        `\n   Duration: ${metric.duration.toFixed(2)}ms`,
        metric.details ? `\n   Details: ${JSON.stringify(metric.details)}` : ""
      );
    });

    console.log("\n💾 MEMORY INTENSIVE OPERATIONS:");
    console.log("-".repeat(40));
    const memSorted = [...this.metrics]
      .filter((m) => m.memory)
      .sort((a, b) => b.memory!.delta - a.memory!.delta);

    memSorted.slice(0, 5).forEach((metric, i) => {
      console.log(
        `${i + 1}. ${metric.operation}`,
        `\n   Memory delta: ${(metric.memory!.delta / 1024 / 1024).toFixed(2)} MB`
      );
    });

    // Calculate statistics
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / this.metrics.length;

    // Encryption metrics
    const encryptionMetrics = this.metrics.filter((m) =>
      m.operation.includes("ncrypt")
    );
    const avgEncryption =
      encryptionMetrics.reduce((sum, m) => sum + m.duration, 0) /
      encryptionMetrics.length;

    // Query metrics
    const queryMetrics = this.metrics.filter(
      (m) =>
        m.operation.toLowerCase().includes("query") ||
        m.operation.includes("SELECT")
    );
    const avgQuery =
      queryMetrics.reduce((sum, m) => sum + m.duration, 0) /
      queryMetrics.length;

    console.log("\n📊 SUMMARY STATISTICS:");
    console.log("-".repeat(40));
    console.log(`Total operations: ${this.metrics.length}`);
    console.log(`Total time: ${totalDuration.toFixed(2)}ms`);
    console.log(`Average operation: ${avgDuration.toFixed(2)}ms`);
    console.log(`Average encryption/decryption: ${avgEncryption.toFixed(2)}ms`);
    console.log(`Average query time: ${avgQuery.toFixed(2)}ms`);

    // Performance recommendations
    console.log("\n💡 PERFORMANCE RECOMMENDATIONS:");
    console.log("-".repeat(40));

    const recommendations = [];

    // Check encryption overhead
    if (avgEncryption > 5) {
      recommendations.push({
        issue: "High encryption overhead",
        recommendation:
          "Implement DecryptionCache with LRU eviction to reduce repeated decryption",
        impact: "HIGH",
      });
    }

    // Check repository pattern overhead
    const repoMetrics = this.metrics.filter((m) =>
      m.operation.includes("repository")
    );
    const multiRepoMetric = repoMetrics.find((m) =>
      m.operation.includes("Multiple")
    );
    if (multiRepoMetric && multiRepoMetric.duration > 50) {
      recommendations.push({
        issue: "Repository instantiation overhead",
        recommendation:
          "Implement singleton pattern or factory caching for repositories in IPC handlers",
        impact: "MEDIUM",
      });
    }

    // Check pagination
    const offsetMetrics = this.metrics.filter((m) =>
      m.operation.includes("OFFSET")
    );
    const cursorMetrics = this.metrics.filter((m) =>
      m.operation.includes("Cursor")
    );

    if (offsetMetrics.length > 0 && cursorMetrics.length > 0) {
      const avgOffset =
        offsetMetrics.reduce((sum, m) => sum + m.duration, 0) /
        offsetMetrics.length;
      const avgCursor =
        cursorMetrics.reduce((sum, m) => sum + m.duration, 0) /
        cursorMetrics.length;

      if (avgOffset > avgCursor * 1.5) {
        recommendations.push({
          issue: "OFFSET pagination slower than cursor",
          recommendation:
            "Use cursor-based pagination for all paginated queries",
          impact: "HIGH",
        });
      }
    }

    // Check for missing indexes
    const slowQueries = queryMetrics.filter((m) => m.duration > 10);
    if (slowQueries.length > 0) {
      recommendations.push({
        issue: "Slow queries detected",
        recommendation: "Review query plans and add missing indexes",
        impact: "HIGH",
      });
    }

    if (recommendations.length === 0) {
      console.log("✅ No critical performance issues detected");
    } else {
      recommendations.forEach((rec) => {
        console.log(`\n[${rec.impact}] ${rec.issue}`);
        console.log(`  → ${rec.recommendation}`);
      });
    }

    // Scalability assessment
    console.log("\n🚀 SCALABILITY ASSESSMENT:");
    console.log("-".repeat(40));

    const scaleMetrics = this.metrics.filter((m) => m.details?.size);
    if (scaleMetrics.length > 0) {
      console.log("Query scaling characteristics:");
      scaleMetrics.forEach((m) => {
        const throughput = m.details!.size / (m.duration / 1000);
        console.log(`  ${m.operation}: ${throughput.toFixed(0)} items/sec`);
      });
    }

    console.log("\n✅ Analysis complete");
  }

  private cleanup(): void {
    this.db.close();

    // Optionally remove test database
    const dbPath = path.join(
      process.cwd(),
      ".justice-companion",
      "performance-test.db"
    );
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      fs.unlinkSync(dbPath + "-wal");
      fs.unlinkSync(dbPath + "-shm");
    }
  }
}

// Run analysis if executed directly
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.runFullAnalysis().catch(console.error);
}

export { PerformanceAnalyzer };

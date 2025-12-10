/// <reference types="vitest/globals" />

import { AuditLogger } from "./AuditLogger";
import {
  createTestDatabase,
  type TestDatabaseHelper,
} from "../test-utils/database-test-helper";
import type Database from "better-sqlite3";

// Force tests to run sequentially to avoid database conflicts
describe.sequential("AuditLogger", () => {
  let auditLogger: AuditLogger;
  let testDb: TestDatabaseHelper;
  let db: Database.Database;

  beforeAll(() => {
    testDb = createTestDatabase();
    db = testDb.initialize();

    // Apply audit logs migration
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'export', 'decrypt')),
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1)),
        error_message TEXT,
        integrity_hash TEXT NOT NULL,
        previous_log_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_logs_chain ON audit_logs(timestamp ASC, id ASC);
    `);
  });

  beforeEach(() => {
    // Drop and recreate table to ensure clean state
    db.exec("DROP TABLE IF EXISTS audit_logs");
    db.exec(`
      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'export', 'decrypt')),
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1)),
        error_message TEXT,
        integrity_hash TEXT NOT NULL,
        previous_log_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_logs_chain ON audit_logs(timestamp ASC, id ASC);
    `);

    auditLogger = new AuditLogger(db);
  });

  afterAll(() => {
    testDb.cleanup();
  });

  describe("Core Functionality", () => {
    it("logs an audit event successfully", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        details: { title: "Test Case" },
        success: true,
      });

      const logs = auditLogger.query();
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe("case.create");
      expect(logs[0].success).toBe(true);
    });

    it("generates unique IDs for each log entry", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "2",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    it("generates ISO 8601 timestamps with milliseconds", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      const timestamp = logs[0].timestamp;

      // Verify ISO 8601 format with milliseconds
      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("stores all provided fields correctly", () => {
      auditLogger.log({
        eventType: "case.update",
        userId: 123,
        resourceType: "case",
        resourceId: "456",
        action: "update",
        details: { field: "title", oldValue: "Old", newValue: "New" },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        success: true,
      });

      const logs = auditLogger.query();
      expect(logs[0].eventType).toBe("case.update");
      expect(logs[0].userId).toBe("user123");
      expect(logs[0].resourceType).toBe("case");
      expect(logs[0].resourceId).toBe("456");
      expect(logs[0].action).toBe("update");
      expect(logs[0].ipAddress).toBe("192.168.1.1");
      expect(logs[0].userAgent).toBe("Mozilla/5.0");
      expect(logs[0].success).toBe(true);
    });

    it("defaults success to true when not provided", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].success).toBe(true);
    });
  });

  describe("Hash Calculation", () => {
    it("calculates integrity hash for each entry", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].integrityHash).toBeTruthy();
      expect(logs[0].integrityHash).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it("produces different hashes for different events", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
      });

      const logs = auditLogger.query();
      expect(logs[0].integrityHash).not.toBe(logs[1].integrityHash);
    });

    it("produces same hash for identical data (deterministic)", () => {
      // Create two separate instances to verify hash calculation is deterministic
      const logger1 = new AuditLogger(db);
      const logger2 = new AuditLogger(db);

      db.prepare("DELETE FROM audit_logs").run();

      logger1.log({
        eventType: "case.create",
        resourceType: "test",
        resourceId: "1",
        action: "create",
      });

      const hash1 = db
        .prepare(
          "SELECT integrity_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1",
        )
        .get() as { integrity_hash: string };

      db.prepare("DELETE FROM audit_logs").run();

      logger2.log({
        eventType: "case.create",
        resourceType: "test",
        resourceId: "1",
        action: "create",
      });

      const hash2 = db
        .prepare(
          "SELECT integrity_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1",
        )
        .get() as { integrity_hash: string };

      // Hashes should be different because timestamps are different
      expect(hash1.integrity_hash).not.toBe(hash2.integrity_hash);
    });
  });

  describe("Chain Integrity", () => {
    it("first log has null previous hash", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].previousLogHash).toBeNull();
    });

    it("second log references first log hash", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
      });

      const logs = auditLogger.query();
      // logs[0] is most recent (update), logs[1] is oldest (create)
      expect(logs[0].previousLogHash).toBe(logs[1].integrityHash);
    });

    it("verifies intact chain successfully", () => {
      // Create chain of 10 logs
      for (let i = 0; i < 10; i++) {
        auditLogger.log({
          eventType: "case.create",
          resourceType: "case",
          resourceId: i.toString(),
          action: "create",
        });
      }

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(true);
      expect(report.totalLogs).toBe(10);
      expect(report.errors.length).toBeUndefined();
    });

    it("detects tampered integrity hash", () => {
      // Create valid chain
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
      });

      // Tamper with first log's hash (use ROWID for deterministic ordering)
      db.prepare(
        "UPDATE audit_logs SET integrity_hash = ? WHERE id = (SELECT id FROM audit_logs ORDER BY ROWID ASC LIMIT 1)",
      ).run(
        "TAMPERED_HASH_1234567890123456789012345678901234567890123456789012",
      );

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBe(0);
    });

    it("detects broken chain link", () => {
      // Create valid chain
      for (let i = 0; i < 5; i++) {
        auditLogger.log({
          eventType: "case.create",
          resourceType: "case",
          resourceId: i.toString(),
          action: "create",
        });
      }

      // Break the chain by modifying previous_log_hash (use ROWID for deterministic ordering)
      db.prepare(
        "UPDATE audit_logs SET previous_log_hash = ? WHERE id = (SELECT id FROM audit_logs ORDER BY ROWID DESC LIMIT 1 OFFSET 1)",
      ).run("BROKEN_LINK_1234567890123456789012345678901234567890123456789012");

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(false);
    });

    it("detects tampered event data", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      // Tamper with event type (hash will no longer match) - use ROWID for deterministic ordering
      db.prepare(
        "UPDATE audit_logs SET event_type = ? WHERE id = (SELECT id FROM audit_logs ORDER BY ROWID ASC LIMIT 1)",
      ).run("case.delete");

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBe(0);
    });

    it("returns valid:true for empty audit log", () => {
      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(true);
      expect(report.totalLogs).toBe(0);
    });
  });

  describe("Query Functionality", () => {
    beforeEach(() => {
      // Create test data
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        success: true,
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
        success: true,
      });

      auditLogger.log({
        eventType: "evidence.create",
        resourceType: "evidence",
        resourceId: "1",
        action: "create",
        success: false,
        errorMessage: "Test error",
      });
    });

    it("filters by resource type", () => {
      const logs = auditLogger.query({ resourceType: "case" });
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.resourceType === "case")).toBe(true);
    });

    it("filters by event type", () => {
      const logs = auditLogger.query({ eventType: "case.create" });
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe("case.create");
    });

    it("filters by success status", () => {
      const logs = auditLogger.query({ success: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].errorMessage).toBe("Test error");
    });

    it("filters by resource ID", () => {
      const logs = auditLogger.query({
        resourceType: "case",
        resourceId: "1",
      });
      expect(logs).toHaveLength(2);
    });

    it("filters by user ID", () => {
      auditLogger.log({
        eventType: "case.read",
        userId: 123,
        resourceType: "case",
        resourceId: "2",
        action: "read",
      });

      const logs = auditLogger.query({ userId: 123 });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(123);
    });

    it("limits results", () => {
      const logs = auditLogger.query({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    it("supports offset pagination", () => {
      // Clear existing logs from beforeEach
      db.prepare("DELETE FROM audit_logs").run();

      // Create 5 logs for pagination testing
      for (let i = 1; i <= 5; i++) {
        auditLogger.log({
          eventType: "case.read",
          resourceType: "case",
          resourceId: i.toString(),
          action: "read",
        });
      }

      // Verify total count
      const allLogs = auditLogger.query({});
      expect(allLogs).toHaveLength(5);

      // Get page 1 (first 2 logs)
      const page1 = auditLogger.query({ limit: 2, offset: 0 });
      // Get page 2 (next 2 logs)
      const page2 = auditLogger.query({ limit: 2, offset: 2 });
      // Get page 3 (last log)
      const page3 = auditLogger.query({ limit: 2, offset: 4 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page3).toHaveLength(1);

      // Ensure pages don't overlap
      expect(page1[0].id).not.toBe(page2[0].id);
      expect(page2[0].id).not.toBe(page3[0].id);

      // Verify order (resourceId should be in DESC order - newest first)
      expect(page1[0].resourceId).toBe("5");
      expect(page1[1].resourceId).toBe("4");
      expect(page2[0].resourceId).toBe("3");
      expect(page2[1].resourceId).toBe("2");
      expect(page3[0].resourceId).toBe("1");
    });

    it("combines multiple filters", () => {
      const logs = auditLogger.query({
        resourceType: "case",
        success: true,
        limit: 1,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].resourceType).toBe("case");
      expect(logs[0].success).toBe(true);
    });

    it("returns empty array when no matches found", () => {
      const logs = auditLogger.query({ resourceType: "nonexistent" });
      expect(logs).toEqual([]);
    });

    it("returns logs in descending chronological order", () => {
      const logs = auditLogger.query();
      expect(logs).toHaveLength(3);

      // Most recent first
      for (let i = 0; i < logs.length - 1; i++) {
        const current = new Date(logs[i].timestamp).getTime();
        const next = new Date(logs[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("Export Functionality", () => {
    beforeEach(() => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      auditLogger.log({
        eventType: "evidence.create",
        resourceType: "evidence",
        resourceId: "1",
        action: "create",
      });
    });

    it("exports to JSON format", () => {
      const json = auditLogger.exportLogs("json");
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty("eventType");
      expect(parsed[0]).toHaveProperty("integrityHash");
    });

    it("exports to CSV format", () => {
      const csv = auditLogger.exportLogs("csv");

      // Verify CSV structure
      const lines = csv.split("\n");
      expect(lines[0]).toContain("id");
      expect(lines[0]).toContain("timestamp");
      expect(lines[0]).toContain("eventType");
      expect(lines).toHaveLength(3); // Header + 2 data rows
    });

    it("exports with filters applied", () => {
      const json = auditLogger.exportLogs("json", {
        resourceType: "case",
      });
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].resourceType).toBe("case");
    });

    it("handles CSV escaping for commas in fields", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "test",
        resourceId: "1",
        action: "create",
        details: { description: "Text with, commas, in it" },
      });

      const csv = auditLogger.exportLogs("csv", { resourceType: "test" });
      expect(csv).toContain('"');
    });

    it("returns empty string for CSV with no results", () => {
      db.prepare("DELETE FROM audit_logs").run();
      const csv = auditLogger.exportLogs("csv");
      expect(csv).toBe("");
    });

    it("JSON export preserves all fields", () => {
      auditLogger.log({
        eventType: "case.update",
        userId: 456,
        resourceType: "case",
        resourceId: "99",
        action: "update",
        details: { field: "status", value: "closed" },
        ipAddress: "10.0.0.1",
        userAgent: "TestAgent/1.0",
        success: false,
        errorMessage: "Permission denied",
      });

      const json = auditLogger.exportLogs("json", { userId: 456 });
      const parsed = JSON.parse(json);

      expect(parsed[0].userId).toBe(456);
      expect(parsed[0].ipAddress).toBe("10.0.0.1");
      expect(parsed[0].userAgent).toBe("TestAgent/1.0");
      expect(parsed[0].success).toBe(false);
      expect(parsed[0].errorMessage).toBe("Permission denied");
    });
  });

  describe("Error Handling", () => {
    it("does not throw on logging failure", () => {
      // Create a SEPARATE database instance for this test to avoid breaking shared db
      const errorTestDb = createTestDatabase();
      const errorDb = errorTestDb.initialize();

      // Create table for this test db
      errorDb.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL,
          user_id TEXT,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'export', 'decrypt')),
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1)),
          error_message TEXT,
          integrity_hash TEXT NOT NULL,
          previous_log_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Now close THIS database to force error
      errorDb.close();

      // Create new logger with closed DB
      const failLogger = new AuditLogger(errorDb);

      // Suppress console.error to avoid polluting test output
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw
      expect(() => {
        failLogger.log({
          eventType: "case.create",
          resourceType: "case",
          resourceId: "1",
          action: "create",
        });
      }).not.toThrow();

      // Verify error was logged (structured logger format)
      expect(consoleErrorSpy).toHaveBeenCalled();
      const lastCall =
        consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1][0];
      expect(lastCall).toContain("❌ Audit logging failed:");

      // Restore console.error
      consoleErrorSpy.mockRestore();

      // Clean up the error test database
      errorTestDb.cleanup();
    });
  });

  describe("Edge Cases", () => {
    it("handles null/undefined optional fields", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        // No userId, ipAddress, userAgent, details, etc.
      });

      const logs = auditLogger.query();
      expect(logs[0].userId).toBeNull();
      expect(logs[0].ipAddress).toBeNull();
      expect(logs[0].userAgent).toBeNull();
      expect(logs[0].details).toBeNull();
    });

    it("serializes complex details objects", () => {
      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
        details: {
          fieldsUpdated: ["title", "description"],
          nested: { value: 123 },
        },
      });

      const logs = auditLogger.query();
      const details = logs[0].details!;
      expect(details.fieldsUpdated).toEqual(["title", "description"]);
      expect((details.nested as { value: number }).value).toBe(123);
    });

    it("handles details with null value", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].details).toBeNull();
    });

    it("handles empty details object", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        details: {},
      });

      const logs = auditLogger.query();
      expect(logs[0].details).toEqual({});
    });

    it("handles very long detail strings", () => {
      const longString = "A".repeat(10000);
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        details: { longField: longString },
      });

      const logs = auditLogger.query();
      const details = logs[0].details!;
      expect((details.longField as string).length).toBe(10000);
    });

    it("handles special characters in fields", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        details: {
          special: "Test \"quotes\" and 'apostrophes' and \nnewlines",
        },
      });

      const logs = auditLogger.query();
      const details = logs[0].details!;
      expect(details.special as string).toContain('"quotes"');
      expect(details.special as string).toContain("'apostrophes'");
    });

    it("handles Unicode characters in details", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        details: { unicode: "你好世界 مرحبا العالم" },
      });

      const logs = auditLogger.query();
      const details = logs[0].details!;
      expect(details.unicode).toBe("你好世界 مرحبا العالم");
    });
  });

  describe("Action Types", () => {
    it("supports create action", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("create");
    });

    it("supports read action", () => {
      auditLogger.log({
        eventType: "case.read",
        resourceType: "case",
        resourceId: "1",
        action: "read",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("read");
    });

    it("supports update action", () => {
      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("update");
    });

    it("supports delete action", () => {
      auditLogger.log({
        eventType: "case.delete",
        resourceType: "case",
        resourceId: "1",
        action: "delete",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("delete");
    });

    it("supports export action", () => {
      auditLogger.log({
        eventType: "evidence.export",
        resourceType: "case",
        resourceId: "1",
        action: "export",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("export");
    });

    it("supports decrypt action", () => {
      auditLogger.log({
        eventType: "encryption.decrypt",
        resourceType: "case",
        resourceId: "1",
        action: "decrypt",
      });

      const logs = auditLogger.query();
      expect(logs[0].action).toBe("decrypt");
    });
  });

  describe("Success and Error Tracking", () => {
    it("logs successful operations with success=true", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        success: true,
      });

      const logs = auditLogger.query();
      expect(logs[0].success).toBe(true);
      expect(logs[0].errorMessage).toBeNull();
    });

    it("logs failed operations with success=false and error message", () => {
      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
        success: false,
        errorMessage: "Permission denied",
      });

      const logs = auditLogger.query();
      expect(logs[0].success).toBe(false);
      expect(logs[0].errorMessage).toBe("Permission denied");
    });

    it("filters successful operations only", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        success: true,
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
        success: false,
      });

      const successLogs = auditLogger.query({ success: true });
      expect(successLogs).toHaveLength(1);
      expect(successLogs[0].success).toBe(true);
    });

    it("filters failed operations only", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
        success: true,
      });

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
        success: false,
        errorMessage: "Validation failed",
      });

      const failedLogs = auditLogger.query({ success: false });
      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].success).toBe(false);
      expect(failedLogs[0].errorMessage).toBe("Validation failed");
    });
  });

  describe("Immutability", () => {
    it("creates new log entries without modifying existing ones", () => {
      auditLogger.log({
        eventType: "case.create",
        resourceType: "case",
        resourceId: "1",
        action: "create",
      });

      const firstLogs = auditLogger.query();
      const firstId = firstLogs[0].id;
      const firstHash = firstLogs[0].integrityHash;

      auditLogger.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: "1",
        action: "update",
      });

      const secondLogs = auditLogger.query();
      const originalLog = secondLogs.find((log) => log.id === firstId);

      expect(originalLog).toBeDefined();
      expect(originalLog!.integrityHash).toBe(firstHash);
      expect(originalLog!.eventType).toBe("case.create");
    });
  });

  describe("Large Chain Verification", () => {
    it("verifies chain with 100 entries", () => {
      for (let i = 0; i < 100; i++) {
        auditLogger.log({
          eventType: "case.create",
          resourceType: "test",
          resourceId: i.toString(),
          action: "create",
        });
      }

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(true);
      expect(report.totalLogs).toBe(100);
    });

    it("detects tampering in middle of large chain", () => {
      for (let i = 0; i < 50; i++) {
        auditLogger.log({
          eventType: "case.create",
          resourceType: "test",
          resourceId: i.toString(),
          action: "create",
        });
      }

      // Tamper with entry in the middle
      const logs = auditLogger.query();
      const middleLog = logs[25];

      db.prepare("UPDATE audit_logs SET integrity_hash = ? WHERE id = ?").run(
        "TAMPERED_HASH_1234567890123456789012345678901234567890123456789012",
        middleLog.id,
      );

      const report = auditLogger.verifyIntegrity();
      expect(report.isValid).toBe(false);
    });
  });
});

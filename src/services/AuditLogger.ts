import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  AuditEvent,
  AuditLogEntry,
  AuditQueryFilters,
  IntegrityReport,
} from "../models/AuditLog.ts";

/**
 * AuditLogger - Blockchain-style immutable audit trail
 *
 * Features:
 * - Cryptographic hash chaining (like blockchain)
 * - Tamper-evident logging
 * - No updates/deletes - INSERT-ONLY
 * - Never throws exceptions (audit failures shouldn't break app)
 */
export class AuditLogger {
  // Explicit property declaration (TSX strip-only mode compatibility)
  private db: Database.Database;

  constructor(db: Database.Database) {
    // Explicit property assignment (TSX strip-only mode compatibility)
    this.db = db;
  }

  /**
   * Log an audit event (immutable, blockchain-style)
   *
   * @param event - Audit event to log
   *
   * NOTE: This method NEVER throws. Audit logging failures are logged
   * to console but don't break application flow.
   */
  log(event: AuditEvent): void {
    try {
      // Get previous hash for chaining
      const previousHash = this.getLastLogHash();

      // Create entry with timestamp and ID
      const entry: AuditLogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: event.eventType,
        userId: event.userId ?? null,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: event.action,
        details: event.details ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        success: event.success ?? true,
        errorMessage: event.errorMessage ?? null,
        previousLogHash: previousHash,
        integrityHash: "", // Calculate next
        createdAt: new Date().toISOString(),
      };

      // Calculate integrity hash
      entry.integrityHash = this.calculateIntegrityHash(entry);

      // INSERT (atomic)
      this.insertAuditLog(entry);
    } catch (error) {
      // CRITICAL: Audit failures should NOT break app
      console.error("❌ Audit logging failed:", error);
    }
  }

  /**
   * Query audit logs with optional filters
   *
   * @param filters - Query filters
   * @returns Array of audit log entries
   */
  query(filters: AuditQueryFilters = {}): AuditLogEntry[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    // Build WHERE clauses
    if (filters.startDate) {
      conditions.push("timestamp >= @startDate");
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      conditions.push("timestamp <= @endDate");
      params.endDate = filters.endDate;
    }

    if (filters.resourceType) {
      conditions.push("resource_type = @resourceType");
      params.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      conditions.push("resource_id = @resourceId");
      params.resourceId = filters.resourceId;
    }

    if (filters.eventType) {
      conditions.push("event_type = @eventType");
      params.eventType = filters.eventType;
    }

    if (filters.userId) {
      conditions.push("user_id = @userId");
      params.userId = filters.userId;
    }

    if (filters.success !== undefined) {
      conditions.push("success = @success");
      params.success = filters.success ? 1 : 0;
    }

    // Build SQL query
    let sql = "SELECT * FROM audit_logs";
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    // Use ROWID for deterministic ordering (most recent first)
    sql += " ORDER BY ROWID DESC";

    if (filters.limit) {
      sql += " LIMIT @limit";
      params.limit = filters.limit;
    }

    if (filters.offset) {
      sql += " OFFSET @offset";
      params.offset = filters.offset;
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(params) as Array<{
      id: string;
      timestamp: string;
      event_type: string;
      user_id: string | null;
      resource_type: string;
      resource_id: string;
      action: string;
      details: string | null;
      ip_address: string | null;
      user_agent: string | null;
      success: number;
      error_message: string | null;
      integrity_hash: string;
      previous_log_hash: string | null;
      created_at: string;
    }>;

    // Map database rows to AuditLogEntry objects
    return rows.map((row) => this.mapRowToEntry(row));
  }

  /**
   * Verify integrity of entire audit log chain
   *
   * @returns Integrity report with validation status
   */
  verifyIntegrity(): IntegrityReport {
    try {
      // Fetch all logs in chain order (insertion order via ROWID)
      const stmt = this.db.prepare(`
        SELECT * FROM audit_logs
        ORDER BY ROWID ASC
      `);

      const rows = stmt.all() as Array<{
        id: string;
        timestamp: string;
        event_type: string;
        user_id: string | null;
        resource_type: string;
        resource_id: string;
        action: string;
        details: string | null;
        ip_address: string | null;
        user_agent: string | null;
        success: number;
        error_message: string | null;
        integrity_hash: string;
        previous_log_hash: string | null;
        created_at: string;
      }>;

      if (rows.length === 0) {
        return {
          valid: true,
          totalLogs: 0,
        };
      }

      const entries = rows.map((row) => this.mapRowToEntry(row));
      let previousHash: string | null = null;

      // Verify each log entry
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Verify integrity hash matches calculated hash
        const calculatedHash = this.calculateIntegrityHash(entry);
        if (entry.integrityHash !== calculatedHash) {
          return {
            valid: false,
            totalLogs: entries.length,
            brokenAt: i,
            brokenLog: entry,
            error:
              "Integrity hash mismatch - log entry may have been tampered with",
          };
        }

        // Verify chain linking
        if (entry.previousLogHash !== previousHash) {
          return {
            valid: false,
            totalLogs: entries.length,
            brokenAt: i,
            brokenLog: entry,
            error:
              "Chain broken - previousLogHash does not match previous entry",
          };
        }

        previousHash = entry.integrityHash;
      }

      return {
        valid: true,
        totalLogs: entries.length,
      };
    } catch (error) {
      return {
        valid: false,
        totalLogs: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Export audit logs in JSON or CSV format
   *
   * @param format - Export format ('json' or 'csv')
   * @param filters - Optional query filters
   * @returns Formatted string (JSON or CSV)
   */
  exportLogs(format: "json" | "csv", filters?: AuditQueryFilters): string {
    const logs = this.query(filters);

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    if (logs.length === 0) {
      return "";
    }

    // CSV headers
    const headers = [
      "id",
      "timestamp",
      "eventType",
      "userId",
      "resourceType",
      "resourceId",
      "action",
      "details",
      "ipAddress",
      "userAgent",
      "success",
      "errorMessage",
      "integrityHash",
      "previousLogHash",
      "createdAt",
    ];

    // Build CSV rows
    const rows = logs.map((log) => {
      return [
        log.id,
        log.timestamp,
        log.eventType,
        log.userId ?? "",
        log.resourceType,
        log.resourceId,
        log.action,
        log.details ? JSON.stringify(log.details) : "",
        log.ipAddress ?? "",
        log.userAgent ?? "",
        log.success.toString(),
        log.errorMessage ?? "",
        log.integrityHash,
        log.previousLogHash ?? "",
        log.createdAt,
      ].map((field) => this.escapeCsvField(field));
    });

    // Combine headers and rows
    const csvLines = [headers.join(","), ...rows.map((row) => row.join(","))];

    return csvLines.join("\n");
  }

  /**
   * Calculate cryptographic integrity hash for an audit log entry
   *
   * Hash includes: id, timestamp, eventType, userId, resourceType, resourceId,
   * action, details, success, previousLogHash
   *
   * @param entry - Audit log entry
   * @returns SHA-256 hash (hex string)
   */
  private calculateIntegrityHash(entry: AuditLogEntry): string {
    const data = {
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      userId: entry.userId ?? null,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      action: entry.action,
      details: entry.details ?? null,
      success: entry.success,
      previousLogHash: entry.previousLogHash,
    };

    // Deterministic JSON string (same input = same hash)
    const jsonString = JSON.stringify(data);
    return createHash("sha256").update(jsonString).digest("hex");
  }

  /**
   * Get the integrity hash of the most recent audit log entry
   *
   * @returns Hash of last log, or null if no logs exist
   */
  private getLastLogHash(): string | null {
    const stmt = this.db.prepare(`
      SELECT integrity_hash
      FROM audit_logs
      ORDER BY ROWID DESC
      LIMIT 1
    `);

    const row = stmt.get() as { integrity_hash: string } | undefined;
    return row?.integrity_hash ?? null;
  }

  /**
   * Insert audit log entry into database
   *
   * @param entry - Audit log entry to insert
   */
  private insertAuditLog(entry: AuditLogEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, event_type, user_id, resource_type, resource_id,
        action, details, ip_address, user_agent, success, error_message,
        integrity_hash, previous_log_hash, created_at
      ) VALUES (
        @id, @timestamp, @eventType, @userId, @resourceType, @resourceId,
        @action, @details, @ipAddress, @userAgent, @success, @errorMessage,
        @integrityHash, @previousLogHash, @createdAt
      )
    `);

    stmt.run({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      userId: entry.userId ?? null,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      action: entry.action,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      success: entry.success ? 1 : 0,
      errorMessage: entry.errorMessage ?? null,
      integrityHash: entry.integrityHash,
      previousLogHash: entry.previousLogHash,
      createdAt: entry.createdAt,
    });
  }

  /**
   * Map database row to AuditLogEntry object
   *
   * @param row - Database row
   * @returns Typed AuditLogEntry
   */
  private mapRowToEntry(row: {
    id: string;
    timestamp: string;
    event_type: string;
    user_id: string | null;
    resource_type: string;
    resource_id: string;
    action: string;
    details: string | null;
    ip_address: string | null;
    user_agent: string | null;
    success: number;
    error_message: string | null;
    integrity_hash: string;
    previous_log_hash: string | null;
    created_at: string;
  }): AuditLogEntry {
    // Parse details if it's a JSON string, otherwise keep as object
    let parsedDetails: Record<string, unknown> | undefined;
    if (row.details) {
      try {
        parsedDetails = JSON.parse(row.details);
      } catch {
        // If parse fails, treat as plain object
        parsedDetails = { value: row.details };
      }
    }

    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type as AuditLogEntry["eventType"],
      userId: row.user_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action as AuditLogEntry["action"],
      details: parsedDetails ?? null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      success: row.success === 1,
      errorMessage: row.error_message,
      integrityHash: row.integrity_hash,
      previousLogHash: row.previous_log_hash,
      createdAt: row.created_at,
    };
  }

  /**
   * Escape CSV field (handle quotes and commas)
   *
   * @param field - Field value
   * @returns Escaped field value
   */
  private escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}

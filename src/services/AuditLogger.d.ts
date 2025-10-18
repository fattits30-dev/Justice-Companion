import type Database from 'better-sqlite3';
import type { AuditEvent, AuditLogEntry, AuditQueryFilters, IntegrityReport } from '../models/AuditLog.js';
/**
 * AuditLogger - Blockchain-style immutable audit trail
 *
 * Features:
 * - Cryptographic hash chaining (like blockchain)
 * - Tamper-evident logging
 * - No updates/deletes - INSERT-ONLY
 * - Never throws exceptions (audit failures shouldn't break app)
 */
export declare class AuditLogger {
    private db;
    constructor(db: Database.Database);
    /**
     * Log an audit event (immutable, blockchain-style)
     *
     * @param event - Audit event to log
     *
     * NOTE: This method NEVER throws. Audit logging failures are logged
     * to console but don't break application flow.
     */
    log(event: AuditEvent): void;
    /**
     * Query audit logs with optional filters
     *
     * @param filters - Query filters
     * @returns Array of audit log entries
     */
    query(filters?: AuditQueryFilters): AuditLogEntry[];
    /**
     * Verify integrity of entire audit log chain
     *
     * @returns Integrity report with validation status
     */
    verifyIntegrity(): IntegrityReport;
    /**
     * Export audit logs in JSON or CSV format
     *
     * @param format - Export format ('json' or 'csv')
     * @param filters - Optional query filters
     * @returns Formatted string (JSON or CSV)
     */
    exportLogs(format: 'json' | 'csv', filters?: AuditQueryFilters): string;
    /**
     * Calculate cryptographic integrity hash for an audit log entry
     *
     * Hash includes: id, timestamp, eventType, userId, resourceType, resourceId,
     * action, details, success, previousLogHash
     *
     * @param entry - Audit log entry
     * @returns SHA-256 hash (hex string)
     */
    private calculateIntegrityHash;
    /**
     * Get the integrity hash of the most recent audit log entry
     *
     * @returns Hash of last log, or null if no logs exist
     */
    private getLastLogHash;
    /**
     * Insert audit log entry into database
     *
     * @param entry - Audit log entry to insert
     */
    private insertAuditLog;
    /**
     * Map database row to AuditLogEntry object
     *
     * @param row - Database row
     * @returns Typed AuditLogEntry
     */
    private mapRowToEntry;
    /**
     * Escape CSV field (handle quotes and commas)
     *
     * @param field - Field value
     * @returns Escaped field value
     */
    private escapeCsvField;
}
//# sourceMappingURL=AuditLogger.d.ts.map
/**
 * GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability) Types
 *
 * This module defines TypeScript interfaces for GDPR compliance operations
 * including data export and deletion functionality.
 */

// ============================================================================
// Export Types (Article 20 - Data Portability)
// ============================================================================

export interface GdprExportOptions {
  /** Export format */
  format?: "json" | "csv";

  /** Include file attachments in export */
  includeFiles?: boolean;

  /** Optional date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * GDPR export result extends UserDataExport with optional file path.
 *
 * Structure after spreading UserDataExport:
 * {
 *   metadata: ExportMetadata,
 *   userData: { profile, cases, evidence, ... },
 *   filePath?: string
 * }
 */
export interface GdprExportResult extends UserDataExport {
  /** File path if saved to disk */
  filePath?: string;
}

export interface UserDataExport {
  /** Metadata about this export */
  metadata: ExportMetadata;

  /** All user data organized by table */
  userData: {
    profile: TableExport;
    cases: TableExport;
    evidence: TableExport;
    legalIssues: TableExport;
    timelineEvents: TableExport;
    actions: TableExport;
    notes: TableExport;
    chatConversations: TableExport;
    chatMessages: TableExport;
    userFacts: TableExport;
    caseFacts: TableExport;
    sessions: TableExport;
    consents: TableExport;
  };
}

export interface TableExport {
  /** Name of the database table */
  tableName: string;

  /** Array of records from this table (decrypted if applicable) */
  records: Record<string, unknown>[];

  /** Number of records in this table */
  count: number;
}

export interface ExportMetadata {
  /** ISO 8601 timestamp of export */
  exportDate: string;

  /** User ID that requested export */
  userId: number;

  /** Database schema version at time of export */
  schemaVersion: string;

  /** Export format */
  format: "json" | "csv";

  /** Total number of records across all tables */
  totalRecords: number;
}

// ============================================================================
// Deletion Types (Article 17 - Right to Erasure)
// ============================================================================

export interface GdprDeleteOptions {
  /** User must explicitly confirm deletion */
  confirmed: boolean;

  /** Export data before deletion */
  exportBeforeDelete?: boolean;

  /** Optional reason for deletion */
  reason?: string;
}

export interface GdprDeleteResult {
  /** Whether deletion was successful */
  success: boolean;

  /** Timestamp when the deletion completed */
  deletionDate: string;

  /** Detailed counts for each table that had records removed */
  deletedCounts: Record<string, number>;

  /** Number of audit log records preserved for compliance */
  preservedAuditLogs: number;

  /** Number of consent records preserved for compliance */
  preservedConsents: number;

  /** Optional export file path if export was performed */
  exportPath?: string;

  /** Error message if deletion failed */
  error?: string;
}

// ============================================================================
// GDPR Error Classes
// ============================================================================

/**
 * Error thrown when rate limit is exceeded for GDPR operations
 */
export class RateLimitError extends Error {
  constructor(message: string = "Rate limit exceeded for GDPR operation") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Error thrown when required consent is missing
 */
export class ConsentRequiredError extends Error {
  constructor(message: string = "User consent required for this operation") {
    super(message);
    this.name = "ConsentRequiredError";
  }
}

/**
 * General error for GDPR operations
 */
export class GdprOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GdprOperationError";
  }
}

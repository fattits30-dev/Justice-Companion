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
  format?: 'json' | 'csv';

  /** Include file attachments in export */
  includeFiles?: boolean;

  /** Optional date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface GdprExportResult {
  /** Exported user data */
  userData: UserDataExport;

  /** Export metadata */
  metadata: ExportMetadata;

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
  records: any[];

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
  format: 'json' | 'csv';

  /** Total number of records across all tables */
  totalRecords: number;
}

// ============================================================================
// Deletion Types (Article 17 - Right to Erasure)
// ============================================================================

export interface GdprDeleteOptions {
  /** User must explicitly confirm deletion */
  confirmed: boolean;

  /** Export data before deleting (recommended) */
  exportBeforeDelete?: boolean;

  /** Optional reason for deletion (for audit logs) */
  reason?: string;
}

export interface GdprDeleteResult {
  /** Whether deletion completed successfully */
  success: boolean;

  /** Count of records deleted per table */
  deletedCounts: Record<string, number>;

  /** Number of audit log entries preserved (legal requirement) */
  preservedAuditLogs: number;

  /** Number of consent records preserved (GDPR requirement) */
  preservedConsents: number;

  /** ISO 8601 timestamp of deletion */
  deletionDate: string;

  /** Path to export file if exportBeforeDelete was true */
  exportPath?: string;
}

// ============================================================================
// Internal Types
// ============================================================================

/** Error thrown when rate limit is exceeded */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/** Error thrown when user consent is missing */
export class ConsentRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}

/** Error thrown when data export/deletion fails */
export class GdprOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: 'export' | 'delete',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GdprOperationError';
  }
}

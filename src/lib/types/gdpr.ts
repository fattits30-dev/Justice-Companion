/**
 * GDPR Compliance and Data Export Types
 *
 * TypeScript types for GDPR Article 17 (Right to Erasure) and
 * Article 20 (Data Portability) operations.
 *
 * @module lib/types/gdpr
 */

// ====================
// Export Types
// ====================

export type ExportFormat = "json" | "pdf" | "docx" | "csv";

export interface ExportDataRequest {
  format?: ExportFormat;
}

export interface ExportMetadata {
  userId: number;
  exportDate: string;
  totalRecords: number;
  format: ExportFormat;
  schemaVersion: string;
}

export interface ExportDataResponse {
  success: boolean;
  filePath: string;
  totalRecords: number;
  exportDate: string;
  format: string;
  auditLogId?: string;
  metadata?: ExportMetadata;
  userData?: Record<string, TableExport>;
}

export interface TableExport {
  tableName: string;
  records: Record<string, unknown>[];
  count: number;
}

// ====================
// Deletion Types
// ====================

export interface DeleteDataRequest {
  confirmed: boolean;
  exportBeforeDelete?: boolean;
  reason?: string;
}

export interface DeleteDataResponse {
  success: boolean;
  deletionDate: string;
  deletedCounts: Record<string, number>;
  exportPath?: string;
  preservedAuditLogs: number;
  preservedConsents: number;
  auditLogId?: string;
}

// ====================
// Consent Types
// ====================

export interface ConsentRecord {
  id: number;
  consentType: string;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ConsentsResponse {
  consents: ConsentRecord[];
}

export interface ConsentUpdateRequest {
  consentType: string;
  granted: boolean;
}

export interface ConsentUpdateResponse {
  success: boolean;
  consentType: string;
  granted: boolean;
}

// ====================
// GDPR Status Types
// ====================

export interface GdprStatus {
  exportsRemaining: number;
  nextExportAvailable: string | null;
  deletionAvailable: boolean;
  consents: {
    dataProcessing: boolean;
    dataErasureRequest: boolean;
  };
}

// ====================
// Entity Export Types
// ====================

export interface EntityExportRequest {
  entityId: number;
  entityType: "case" | "evidence";
  format: ExportFormat;
}

export interface SearchExportRequest {
  query: string;
  format: "json" | "csv";
}

// ====================
// Rate Limiting Types
// ====================

export interface RateLimitInfo {
  remaining: number;
  resetAt: string;
  limit: number;
}

export interface RateLimitError {
  code: "RATE_LIMIT_EXCEEDED";
  message: string;
  resetAt: string;
}

// ====================
// GDPR Error Types
// ====================

export interface GdprError {
  code: string;
  message: string;
  details?: unknown;
}

export class GdprOperationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "GdprOperationError";
  }
}

export class ConsentRequiredError extends Error {
  constructor(message: string = "Active consent required for this operation") {
    super(message);
    this.name = "ConsentRequiredError";
  }
}

export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public resetAt: string,
  ) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

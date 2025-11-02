// src/interfaces/IAuditLogger.ts
export interface AuditLogEntry {
  userId: number;
  action: string;
  resourceType: string;
  resourceId: number | string;
  details?: Record<string, unknown>;
  timestamp?: Date;
}

export interface IAuditLogger {
  logAction(entry: AuditLogEntry): void | Promise<void>;
  logFailedAttempt(entry: AuditLogEntry): void | Promise<void>;
  getAuditLog(userId?: number, limit?: number): AuditLogEntry[] | Promise<AuditLogEntry[]>;
}
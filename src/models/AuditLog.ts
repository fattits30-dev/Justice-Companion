export type AuditEventType =
  // Case operations
  | 'case.create'
  | 'case.read'
  | 'case.update'
  | 'case.delete'
  | 'case.pii_access'
  // Evidence operations
  | 'evidence.create'
  | 'evidence.read'
  | 'evidence.update'
  | 'evidence.delete'
  | 'evidence.content_access'
  | 'evidence.export'
  // Note operations (Phase 3)
  | 'note.create'
  | 'note.update'
  | 'note.delete'
  | 'note.content_access'
  // Legal issue operations (Phase 3)
  | 'legal_issue.create'
  | 'legal_issue.update'
  | 'legal_issue.delete'
  // Timeline event operations (Phase 3)
  | 'timeline_event.create'
  | 'timeline_event.update'
  | 'timeline_event.delete'
  | 'timeline_event.complete'
  // Case deadline operations
  | 'case_deadline.create'
  | 'case_deadline.update'
  | 'case_deadline.delete'
  | 'case_deadline.complete'
  // ACAS tracking operations
  | 'acas_tracking.create'
  | 'acas_tracking.update'
  | 'acas_tracking.delete'
  // Chat message operations (Phase 3)
  | 'message.create'
  | 'message.content_access'
  // User profile operations (Phase 3)
  | 'profile.update'
  | 'profile.pii_access'
  // User fact operations
  | 'user_fact.create'
  | 'user_fact.update'
  | 'user_fact.delete'
  | 'user_fact.content_access'
  // Case fact operations
  | 'case_fact.create'
  | 'case_fact.update'
  | 'case_fact.delete'
  | 'case_fact.content_access'
  // Security operations
  | 'encryption.key_loaded'
  | 'encryption.decrypt'
  // User authentication operations (Phase 1)
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.register'
  | 'user.login'
  | 'user.logout'
  | 'user.password_change'
  | 'user.login_timestamp'
  // Session operations (Phase 1)
  | 'session.cleanup'
  // Authorization operations (Phase 1)
  | 'authorization.denied'
  // Consent operations (Phase 1)
  | 'consent.granted'
  | 'consent.revoked'
  // GDPR operations
  | 'gdpr.export'
  | 'gdpr.deletion_request'
  | 'gdpr.erasure'
  | 'gdpr.access_request'
  // Cache operations (Phase 2 - Pagination)
  | 'cache.hit'
  | 'cache.miss'
  | 'cache.set'
  | 'cache.evict'
  | 'cache.invalidate_entity'
  | 'cache.invalidate_type'
  | 'cache.clear'
  | 'cache.initialized'
  // Query operations (Phase 2 - Pagination)
  | 'query.all'
  | 'query.paginated'
  | 'query.by_id'
  | 'query.count'
  | 'query.by_status_paginated'
  // System operations
  | 'database.backup'
  | 'database.restore'
  | 'database.migrate'
  | 'config.change';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string | null;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt' | 'evict' | 'complete';
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  integrityHash: string;
  previousLogHash: string | null;
  createdAt: string;
}

export interface AuditEvent {
  eventType: AuditEventType;
  userId?: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt' | 'evict' | 'complete';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditQueryFilters {
  startDate?: string;
  endDate?: string;
  resourceType?: string;
  resourceId?: string;
  eventType?: AuditEventType;
  userId?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface IntegrityReport {
  valid: boolean;
  totalLogs: number;
  brokenAt?: number;
  brokenLog?: AuditLogEntry;
  error?: string;
}

// Type aliases for compatibility with legacy code
export type AuditLog = AuditLogEntry;
export type CreateAuditLogInput = Omit<AuditLogEntry, 'id' | 'createdAt' | 'integrityHash' | 'previousLogHash'>;

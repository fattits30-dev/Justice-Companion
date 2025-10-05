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
  // System operations
  | 'database.backup'
  | 'database.restore'
  | 'database.migrate'
  | 'config.change';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  integrityHash: string;
  previousLogHash: string | null;
  createdAt: string;
}

export interface AuditEvent {
  eventType: AuditEventType;
  userId?: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt';
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
}

export interface IntegrityReport {
  valid: boolean;
  totalLogs: number;
  brokenAt?: number;
  brokenLog?: AuditLogEntry;
  error?: string;
}

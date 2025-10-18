export type AuditEventType = 'case.create' | 'case.read' | 'case.update' | 'case.delete' | 'case.pii_access' | 'evidence.create' | 'evidence.read' | 'evidence.update' | 'evidence.delete' | 'evidence.content_access' | 'evidence.export' | 'note.create' | 'note.update' | 'note.delete' | 'note.content_access' | 'legal_issue.create' | 'legal_issue.update' | 'legal_issue.delete' | 'timeline_event.create' | 'timeline_event.update' | 'timeline_event.delete' | 'message.create' | 'message.content_access' | 'profile.update' | 'profile.pii_access' | 'user_fact.create' | 'user_fact.update' | 'user_fact.delete' | 'user_fact.content_access' | 'case_fact.create' | 'case_fact.update' | 'case_fact.delete' | 'case_fact.content_access' | 'encryption.key_loaded' | 'encryption.decrypt' | 'user.create' | 'user.update' | 'user.delete' | 'user.register' | 'user.login' | 'user.logout' | 'user.password_change' | 'user.login_timestamp' | 'session.cleanup' | 'authorization.denied' | 'consent.granted' | 'consent.revoked' | 'gdpr.export' | 'gdpr.deletion_request' | 'database.backup' | 'database.restore' | 'database.migrate' | 'config.change';
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: AuditEventType;
    userId: string | null;
    resourceType: string;
    resourceId: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt';
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
    offset?: number;
}
export interface IntegrityReport {
    valid: boolean;
    totalLogs: number;
    brokenAt?: number;
    brokenLog?: AuditLogEntry;
    error?: string;
}
//# sourceMappingURL=AuditLog.d.ts.map
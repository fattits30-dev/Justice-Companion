/**
 * Audit logging helper for IPC handlers
 *
 * Provides convenient methods to log security-relevant events from IPC handlers
 */

import type { IpcMainInvokeEvent } from 'electron';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Audit event types for Justice Companion (const object - modern TypeScript best practice)
 */
export const AuditEventType = {
  // Authentication
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // Case management
  CASE_CREATED: 'CASE_CREATED',
  CASE_VIEWED: 'CASE_VIEWED',
  CASE_UPDATED: 'CASE_UPDATED',
  CASE_DELETED: 'CASE_DELETED',

  // Evidence
  EVIDENCE_UPLOADED: 'EVIDENCE_UPLOADED',
  EVIDENCE_VIEWED: 'EVIDENCE_VIEWED',
  EVIDENCE_DELETED: 'EVIDENCE_DELETED',

  // AI Chat
  CHAT_MESSAGE_SENT: 'CHAT_MESSAGE_SENT',
  CHAT_MESSAGE_RECEIVED: 'CHAT_MESSAGE_RECEIVED',

  // Database
  DATABASE_MIGRATED: 'DATABASE_MIGRATED',
  DATABASE_BACKUP_CREATED: 'DATABASE_BACKUP_CREATED',

  // GDPR
  DATA_EXPORTED: 'DATA_EXPORTED',
  DATA_DELETED: 'DATA_DELETED',

  // Security
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  ENCRYPTION_FAILURE: 'ENCRYPTION_FAILURE',
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

/**
 * Get AuditLogger instance (lazy-loaded at runtime)
 */
async function getAuditLogger() {
  // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
  // Convert Windows paths to file:// URLs for ESM dynamic imports
  // Add .ts extension for tsx to resolve TypeScript modules
  const { AuditLogger } = await import(pathToFileURL(path.join(__dirname, '../../src/services/AuditLogger.ts')).href);

  const { getDb } = await import(pathToFileURL(path.join(__dirname, '../../src/db/database.ts')).href);

  const db = getDb();
  return new AuditLogger(db);
}

/**
 * Log an audit event from an IPC handler
 *
 * @param eventType - Type of audit event
 * @param userId - User ID (null for unauthenticated events)
 * @param resourceType - Type of resource (e.g., 'case', 'evidence', 'user')
 * @param resourceId - ID of the resource
 * @param action - Action performed (e.g., 'create', 'update', 'delete', 'view')
 * @param details - Additional details
 * @param success - Whether the operation succeeded (default: true)
 * @param errorMessage - Error message if operation failed
 */
export async function logAuditEvent(params: {
  eventType: AuditEventType;
  userId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  details?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    const logger = await getAuditLogger();

    logger.log({
      eventType: params.eventType,
      userId: params.userId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      details: params.details,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
      ipAddress: null, // Electron doesn't have IP addresses
      userAgent: null,
    });
  } catch (error) {
    // Audit logging failures should never break the app
    console.error('[Audit] Failed to log event:', error);
  }
}

/**
 * Extract user ID from IPC event (if authenticated)
 *
 * This is a placeholder - actual implementation depends on session management
 */
export function getUserIdFromEvent(_event: IpcMainInvokeEvent): string | null {
  // TODO: Implement session-based user ID extraction
  // For now, return null (will be implemented in Phase 2)
  return null;
}

/**
 * Check if user is authenticated
 *
 * This is a placeholder - actual implementation depends on session management
 */
export function isAuthenticated(_event: IpcMainInvokeEvent): boolean {
  // TODO: Implement session validation
  // For now, return true (will be implemented in Phase 2)
  return true;
}

/**
 * Require authentication for an IPC handler
 *
 * Throws an error if user is not authenticated
 */
export function requireAuth(event: IpcMainInvokeEvent): void {
  if (!isAuthenticated(event)) {
    throw new Error('Not authenticated - login required');
  }
}

/**
 * Helper to log authentication events
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  userId: string | null,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent({
    eventType,
    userId,
    resourceType: 'user',
    resourceId: userId ?? 'unknown',
    action: eventType.toLowerCase(),
    success,
    errorMessage,
  });
}

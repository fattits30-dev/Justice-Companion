/**
 * Authorization Wrapper for IPC Handlers
 *
 * Provides session validation and authorization checks for protected IPC handlers.
 * Ensures all protected operations verify:
 * 1. User is authenticated (valid session)
 * 2. Session is not expired
 * 3. User has permission to access the resource (ownership/role checks)
 *
 * Security Features:
 * - Session validation with expiration checking
 * - Horizontal privilege escalation prevention
 * - Audit logging of authorization failures
 * - Standardized error responses
 */

import { type IPCResponse, errorResponse, IPCErrorCode } from './ipc-response.ts';

/**
 * AuthorizationError class for handling authorization failures
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Session data returned from AuthenticationService
 */
interface SessionData {
  id: string;
  userId: number;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Lazy-load AuthenticationService to avoid circular dependencies
 */
async function getAuthService() {
  // ESM dynamic imports (tsx handles .ts extensions)
  const { AuthenticationService } = await import('../../src/services/AuthenticationService.ts');
  const { getDb } = await import('../../src/db/database.ts');
  const { AuditLogger } = await import('../../src/services/AuditLogger.ts');
  const { UserRepository } = await import('../../src/repositories/UserRepository.ts');
  const { SessionRepository } = await import('../../src/repositories/SessionRepository.ts');

  const db = getDb();
  const auditLogger = new AuditLogger(db);
  const userRepository = new UserRepository(auditLogger);
  const sessionRepository = new SessionRepository();

  return new AuthenticationService(
    userRepository,
    sessionRepository,
    auditLogger
  );
}

/**
 * Wrapper function that validates session and executes handler with userId
 *
 * @param sessionId - Session ID from IPC call
 * @param handler - Handler function that receives validated userId
 * @returns IPCResponse with success/error
 *
 * @example
 *
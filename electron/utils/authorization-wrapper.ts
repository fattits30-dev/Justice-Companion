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

import { type IPCResponse, errorResponse, IPCErrorCode } from './ipc-response';
import { AuthorizationError } from '../../src/middleware/AuthorizationMiddleware';

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
function getAuthService() {
  // Runtime path: from dist/electron/ to src/ (two levels up)
   
  const { AuthenticationService } = require('../../src/services/AuthenticationService');
   
  const { getDb } = require('../../src/db/database');
  return new AuthenticationService(getDb());
}

/**
 * Wrapper function that validates session and executes handler with userId
 *
 * @param sessionId - Session ID from IPC call
 * @param handler - Handler function that receives validated userId
 * @returns IPCResponse with success/error
 *
 * @example
 * ```typescript
 * ipcMain.handle('case:get', async (_event, id, sessionId) => {
 *   return withAuthorization(sessionId, async (userId) => {
 *     const caseData = caseService.getCaseById(id);
 *     authMiddleware.verifyCaseOwnership(id, userId);
 *     return caseData;
 *   });
 * });
 * ```
 */
export async function withAuthorization<T>(
  sessionId: string | undefined,
  handler: (userId: number, session: SessionData) => Promise<T>
): Promise<IPCResponse<T>> {
  try {
    // 1. Check if sessionId is provided
    if (!sessionId) {
      console.warn('[Authorization] No session ID provided');
      return errorResponse(
        IPCErrorCode.NOT_AUTHENTICATED,
        'Authentication required. Please log in.'
      );
    }

    // 2. Validate session exists and is not expired
    const authService = getAuthService();
    const session = await authService.getSession(sessionId);

    if (!session) {
      console.warn('[Authorization] Session not found:', sessionId);
      return errorResponse(
        IPCErrorCode.SESSION_EXPIRED,
        'Session expired or invalid. Please log in again.'
      );
    }

    // 3. Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (expiresAt < now) {
      console.warn('[Authorization] Session expired:', {
        sessionId,
        expiresAt: session.expiresAt,
        now: now.toISOString(),
      });
      return errorResponse(
        IPCErrorCode.SESSION_EXPIRED,
        'Session expired. Please log in again.'
      );
    }

    // 4. Execute handler with validated userId
    console.log('[Authorization] Session validated:', {
      sessionId,
      userId: session.userId,
    });

    const result = await handler(session.userId, session);

    // Success response is handled by the handler itself
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Handle authorization errors specifically
    if (error instanceof AuthorizationError) {
      console.warn('[Authorization] Authorization denied:', error.message);
      return errorResponse(
        IPCErrorCode.FORBIDDEN,
        error.message
      );
    }

    // Re-throw other errors to be handled by the IPC handler
    throw error;
  }
}

/**
 * Lazy-load AuthorizationMiddleware
 */
export function getAuthorizationMiddleware() {
   
  const { AuthorizationMiddleware } = require('../../src/middleware/AuthorizationMiddleware');
   
  const { caseRepository } = require('../../src/repositories/CaseRepository');
   
  const { auditLogger } = require('../../src/services/AuditLogger');

  return new AuthorizationMiddleware(caseRepository, auditLogger);
}

/**
 * Get EvidenceRepository for evidence ownership checks
 */
export function getEvidenceRepository() {
   
  const { evidenceRepository } = require('../../src/repositories/EvidenceRepository');
  return evidenceRepository;
}

/**
 * Verify evidence ownership through case ownership
 *
 * @param evidenceId - Evidence ID to check
 * @param userId - User ID making the request
 * @throws AuthorizationError if user doesn't own the evidence's case
 */
export async function verifyEvidenceOwnership(
  evidenceId: number,
  userId: number
): Promise<void> {
  const evidenceRepo = getEvidenceRepository();
  const evidence = evidenceRepo.findById(evidenceId);

  if (!evidence) {
    throw new AuthorizationError('Evidence not found');
  }

  // Verify user owns the case this evidence belongs to
  const authMiddleware = getAuthorizationMiddleware();
  authMiddleware.verifyCaseOwnership(evidence.caseId, userId);
}

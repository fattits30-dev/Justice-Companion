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
 * - Dual session validation (database + in-memory)
 * - Session validation with expiration checking
 * - Horizontal privilege escalation prevention
 * - Audit logging of authorization failures
 * - Standardized error responses
 *
 * Updated: 2025-11-03 - Integrated SessionManager for in-memory validation
 */

import {
  errorResponse,
  IPCErrorCode,
  successResponse,
  isIPCResponse,
  type IPCResponse,
} from './ipc-response.ts';
import { getSessionManager } from '../services/SessionManager.ts';
import { AuthorizationMiddleware } from '../../src/middleware/AuthorizationMiddleware.ts';
import { getRepositories } from '../../src/repositories.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { getDb } from '../../src/db/database.ts';
import { EvidenceNotFoundError } from '../../src/errors/DomainErrors.ts';
import { logger } from '../../src/utils/logger';

// AuthorizationError is loaded at runtime via require() to avoid TypeScript path issues
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Lazy-load AuthenticationService to avoid circular dependencies
 */
async function getAuthService() {
  // ESM dynamic imports (tsx handles .ts extensions)
  const { AuthenticationService } = await import(
    "../../src/services/AuthenticationService.ts"
  );
  const { getDb } = await import("../../src/db/database.ts");
  const { AuditLogger } = await import("../../src/services/AuditLogger.ts");
  const { UserRepository } = await import(
    "../../src/repositories/UserRepository.ts"
  );
  const { SessionRepository } = await import(
    "../../src/repositories/SessionRepository.ts"
  );

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
 * Uses dual validation strategy:
 * 1. Check in-memory session first (fast, O(1) lookup)
 * 2. If in-memory session invalid/missing, check database (slower but persistent)
 * 3. If database session valid, recreate in-memory session for future calls
 *
 * This provides the speed of in-memory sessions with the persistence of database sessions.
 *
 * @param sessionId - Session ID from IPC call
 * @param handler - Handler function that receives validated userId
 * @returns Handler result or standardized error response
 *
 * @example
 * const response = await withAuthorization(sessionId, async (userId) => {
 *   // Your protected handler logic here
 *   return { data: 'protected data', userId };
 * });
 */
export async function withAuthorization<T>(
  sessionId: string,
  handler: (userId: number) => Promise<T> | T
): Promise<IPCResponse<T>>;
export async function withAuthorization<T>(
  sessionId: string,
  handler: (userId: number) => Promise<IPCResponse<T>> | IPCResponse<T>
): Promise<IPCResponse<T>>;
export async function withAuthorization<T>(
  sessionId: string,
  handler: (userId: number) => Promise<T | IPCResponse<T>> | T | IPCResponse<T>
): Promise<IPCResponse<T>> {
  try {
    // Step 1: Try in-memory validation first (fast, ~0.001ms)
    const sessionManager = getSessionManager();
    const inMemoryResult = sessionManager.validateSession(sessionId);

    if (inMemoryResult.valid && inMemoryResult.userId) {
      // Session valid in memory - execute handler immediately
      const result = await handler(inMemoryResult.userId);
      if (isIPCResponse(result)) {
        return result as IPCResponse<T>;
      }
      return successResponse(result as T);
    }

    // Step 2: In-memory session invalid/expired - check database (slower but persistent)
    // This handles cases where:
    // - App was restarted (in-memory sessions cleared)
    // - User has "Remember Me" enabled (database session persists)
    const authService = await getAuthService();
    const user = await authService.validateSession(sessionId);

    if (!user) {
      return errorResponse(
        IPCErrorCode.UNAUTHORIZED,
        "Invalid or expired session"
      ) as IPCResponse<T>;
    }

    // Step 3: Database session valid - recreate in-memory session for future calls
    // This ensures subsequent IPC calls don't hit the database unnecessarily
    sessionManager.createSession({
      userId: user.id,
      username: user.username,
      rememberMe: false, // In-memory session uses default 24h expiration
    });
    logger.warn(
      `[Authorization] Recreated in-memory session for user ${user.username} from database session`
    );

    const result = await handler(user.id);
    if (isIPCResponse(result)) {
      return result as IPCResponse<T>;
    }
    return successResponse(result as T);
  } catch (error) {
    if (isIPCResponse(error)) {
      return error as IPCResponse<T>;
    }
    if (error instanceof AuthorizationError) {
      return errorResponse(
        IPCErrorCode.UNAUTHORIZED,
        error.message
      ) as IPCResponse<T>;
    }
    // Log the actual error for debugging
    logger.error(
      "[Authorization] Unexpected error during authorization:",
      error
    );
    logger.error(
      "[Authorization] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return errorResponse(
      IPCErrorCode.INTERNAL_ERROR,
      `Authorization failed: ${error instanceof Error ? error.message : String(error)}`
    ) as IPCResponse<T>;
  }
}

let authorizationMiddleware: AuthorizationMiddleware | null = null;

function createAuthorizationMiddleware(): AuthorizationMiddleware {
  if (!authorizationMiddleware) {
    const { caseRepository } = getRepositories();
    const auditLogger = new AuditLogger(getDb());
    authorizationMiddleware = new AuthorizationMiddleware(
      caseRepository,
      auditLogger
    );
  }
  return authorizationMiddleware;
}

export function getAuthorizationMiddleware(): AuthorizationMiddleware {
  return createAuthorizationMiddleware();
}

export async function verifyEvidenceOwnership(
  evidenceId: number,
  userId: number
): Promise<void> {
  const { evidenceRepository } = getRepositories();
  const evidence = evidenceRepository.findById(evidenceId);

  if (!evidence) {
    throw new EvidenceNotFoundError(evidenceId);
  }

  getAuthorizationMiddleware().verifyCaseOwnership(evidence.caseId, userId);
}

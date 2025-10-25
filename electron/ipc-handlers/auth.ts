import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
  successResponse,
  errorResponse,
  IPCErrorCode,
  type IPCResponse,
} from '../utils/ipc-response.ts';
import { logAuthEvent, AuditEventType } from '../utils/audit-helper.ts';
import { getDb } from '../../src/db/database.ts';
import { UserRepository } from '../../src/repositories/UserRepository.ts';
import { SessionRepository } from '../../src/repositories/SessionRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { AuthenticationService } from '../../src/services/AuthenticationService.ts';
import {
  RegistrationError,
  ValidationError,
  InvalidCredentialsError,
  UserNotFoundError,
  UnauthorizedError,
} from '../../src/errors/DomainErrors.ts';

// ESM equivalent of __dirname
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SIMPLE: Create singleton (initialized once, reused forever)
let authService: AuthenticationService | null = null;

function getAuthService(): AuthenticationService {
  if (!authService) {
    const db = getDb();
    const auditLogger = new AuditLogger(db);
    const userRepository = new UserRepository(auditLogger);
    const sessionRepository = new SessionRepository();

    authService = new AuthenticationService(
      userRepository,
      sessionRepository,
      auditLogger
    );

    console.warn('[IPC] AuthenticationService initialized');
  }
  return authService;
}

/**
 * ===== AUTHENTICATION HANDLERS =====
 * 4 channels: auth:register, auth:login, auth:logout, auth:session
 */
export function setupAuthHandlers(): void {

  const getAuthSchemas = async () => {
    try {
      // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
      // Convert Windows paths to file:// URLs for ESM dynamic imports
      // Add .ts extension for tsx to resolve TypeScript modules
      const schemasPath = path.join(__dirname, '../../src/middleware/schemas/auth-schemas.ts');
      const schemasUrl = pathToFileURL(schemasPath).href;

      console.warn('[IPC] Importing auth schemas from:', schemasUrl);

      const schemas = await import(schemasUrl);
      console.warn('[IPC] Auth schemas imported successfully');

      return schemas;
    } catch (error) {
      console.error('[IPC] FATAL: Failed to load auth schemas');
      console.error('[IPC] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw new Error(`Failed to load auth schemas: ${(error as Error).message}`);
    }
  };

  // Register new user
  ipcMain.handle(
    'auth:register',
    async (_event: IpcMainInvokeEvent, data: unknown): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:register called with:', data);

        // Validate input with Zod
        const schemas = await getAuthSchemas();
        const validatedData = schemas.authRegisterSchema.parse(data);

        // SIMPLE: Get service synchronously, call register with proper params
        const authSvc = getAuthService();
        const result = await authSvc.register(
          validatedData.username,
          validatedData.password,
          validatedData.email
        );

        // Log audit event
        logAuthEvent(AuditEventType.USER_REGISTERED, result.id, true);

        console.warn('[IPC] User registered successfully:', result.id);
        return successResponse(result);
      } catch (error) {
        // Use domain-specific errors
        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          // Check for specific registration errors
          if (message.includes('already exists') || message.includes('duplicate')) {
            const registrationError = new RegistrationError('Username or email already exists', {
              username: (data as any)?.username,
              email: (data as any)?.email
            });
            logAuthEvent(AuditEventType.USER_REGISTERED, null, false, registrationError.message);
            return createErrorResponse(registrationError);
          }

          if (message.includes('invalid email')) {
            const validationError = new ValidationError('email', 'Invalid email format');
            logAuthEvent(AuditEventType.USER_REGISTERED, null, false, validationError.message);
            return createErrorResponse(validationError);
          }
        }

        // Log failed registration
        logAuthEvent(AuditEventType.USER_REGISTERED, null, false, String(error));

        return formatError(error);
      }
    }
  );

  // Login user
  ipcMain.handle(
    'auth:login',
    async (_event: IpcMainInvokeEvent, data: unknown): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:login called with:', data);

        // Validate input with Zod
        const schemas = await getAuthSchemas();
        const validatedData = schemas.authLoginSchema.parse(data);

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        const result = await authSvc.login(
          validatedData.username,
          validatedData.password,
          validatedData.rememberMe
        );

        // Log successful login
        logAuthEvent(AuditEventType.USER_LOGGED_IN, result.userId, true);

        console.warn('[IPC] User logged in successfully:', result.userId);
        return successResponse(result);
      } catch (error) {
        // Use domain-specific errors
        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          // Check for specific login errors
          if (message.includes('invalid credentials') || message.includes('password')) {
            const credentialsError = new InvalidCredentialsError();
            logAuthEvent(AuditEventType.LOGIN_FAILED, null, false, credentialsError.message);
            return createErrorResponse(credentialsError);
          }

          if (message.includes('user not found')) {
            const userError = new UserNotFoundError((data as any)?.username || 'unknown');
            logAuthEvent(AuditEventType.LOGIN_FAILED, null, false, userError.message);
            return createErrorResponse(userError);
          }

          if (message.includes('locked') || message.includes('disabled')) {
            const authError = new UnauthorizedError('account', 'access', undefined);
            logAuthEvent(AuditEventType.LOGIN_FAILED, null, false, authError.message);
            return createErrorResponse(authError);
          }
        }

        // Log failed login
        logAuthEvent(AuditEventType.LOGIN_FAILED, null, false, String(error));

        return formatError(error);
      }
    }
  );

  // Logout user
  ipcMain.handle(
    'auth:logout',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:logout called');

        if (!sessionId) {
          return errorResponse(IPCErrorCode.VALIDATION_ERROR, 'Session ID is required');
        }

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        await authSvc.logout(sessionId);

        // Log logout (we don't know userId at this point, so pass null)
        logAuthEvent(AuditEventType.USER_LOGGED_OUT, null, true);

        console.warn('[IPC] User logged out successfully');
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] auth:logout error:', error);
        return formatError(error);
      }
    }
  );

  // Get current session
  ipcMain.handle(
    'auth:session',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:session called');

        if (!sessionId) {
          return errorResponse(IPCErrorCode.NOT_AUTHENTICATED, 'No session ID provided');
        }

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        const session = await authSvc.getSession(sessionId);

        if (!session) {
          return errorResponse(IPCErrorCode.SESSION_EXPIRED, 'Session not found or expired');
        }

        // Fetch user data for session restoration
        const db = getDb();
        const userRepo = new UserRepository(db);
        const user = userRepo.findById(session.userId);

        if (!user) {
          return errorResponse(IPCErrorCode.NOT_FOUND, 'User not found');
        }

        console.warn('[IPC] Session retrieved:', session.userId);
        return successResponse({
          userId: user.id,
          username: user.username,
          email: user.email
        });
      } catch (error) {
        console.error('[IPC] auth:session error:', error);
        return formatError(error);
      }
    }
  );
}

// Helper functions (imported from ipc-response but not exported)
function formatError(error: unknown): IPCResponse {
  const { formatError: _formatError } = require('../utils/ipc-response.ts');
  return _formatError(error);
}

function createErrorResponse(error: Error): IPCResponse {
  const { createErrorResponse: _createErrorResponse } = require('../../src/errors/DomainErrors.ts');
  return _createErrorResponse(error);
}

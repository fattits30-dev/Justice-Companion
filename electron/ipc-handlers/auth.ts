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
    } catch (error: unknown) {
      console.error('[IPC] FATAL: Failed to load auth schemas');
      console.error('[IPC] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      
      throw error;
    }
  };

  // Register user
  ipcMain.handle('auth:register', async (
    event: IpcMainInvokeEvent,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<IPCResponse> => {
    try {
      const authService = getAuthService();
      const result = await authService.register(email, password, firstName, lastName);
      
      await logAuthEvent(AuditEventType.USER_REGISTERED, result.user.id, event.sender);
      
      return successResponse(result);
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof RegistrationError) {
        return errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
      }
      
      console.error('[IPC] Registration failed:', error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, 'Registration failed');
    }
  });

  // Login user
  ipcMain.handle('auth:login', async (
    event: IpcMainInvokeEvent,
    email: string,
    password: string
  ): Promise<IPCResponse> => {
    try {
      const authService = getAuthService();
      const result = await authService.login(email, password);
      
      await logAuthEvent(AuditEventType.USER_LOGGED_IN, result.user.id, event.sender);
      
      return successResponse(result);
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError || error instanceof UserNotFoundError) {
        return errorResponse(IPCErrorCode.UNAUTHORIZED, error.message);
      }
      
      console.error('[IPC] Login failed:', error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, 'Login failed');
    }
  });

  // Logout user
  ipcMain.handle('auth:logout', async (
    event: IpcMainInvokeEvent,
    sessionId: string
  ): Promise<IPCResponse> => {
    try {
      const authService = getAuthService();
      await authService.logout(sessionId);
      
      await logAuthEvent(AuditEventType.USER_LOGGED_OUT, null, event.sender);
      
      return successResponse({ message: 'Logged out successfully' });
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        return errorResponse(IPCErrorCode.UNAUTHORIZED, error.message);
      }
      
      console.error('[IPC] Logout failed:', error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, 'Logout failed');
    }
  });

  // Validate session
  ipcMain.handle('auth:session', async (
    event: IpcMainInvokeEvent,
    sessionId: string
  ): Promise<IPCResponse> => {
    try {
      const authService = getAuthService();
      const result = await authService.validateSession(sessionId);
      
      return successResponse(result);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        return errorResponse(IPCErrorCode.UNAUTHORIZED, error.message);
      }
      
      console.error('[IPC] Session validation failed:', error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, 'Session validation failed');
    }
  });
}
import { ipcMain } from 'electron';
import * as path from 'path';
import {
  successResponse,
  errorResponse,
  IPCErrorCode,
} from '../utils/ipc-response.ts';
import { getDb } from '../../src/db/database.ts';
import { UserRepository } from '../../src/repositories/UserRepository.ts';
import { SessionRepository } from '../../src/repositories/SessionRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { AuthenticationService } from '../../src/services/AuthenticationService.ts';
import {
  _RegistrationError,
  _ValidationError,
  _InvalidCredentialsError,
  _UserNotFoundError,
  _UnauthorizedError,
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
  // Register handler for auth:register
  ipcMain.handle('auth:register', async (_event, userData) => {
    try {
      const authService = getAuthService();
      const { user, session } = await authService.register(userData);
      return successResponse({ user, session });
    } catch (_error) {
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Registration failed');
    }
  });

  // Register handler for auth:login
  ipcMain.handle('auth:login', async (_event, credentials) => {
    try {
      const authService = getAuthService();
      const { user, session } = await authService.login(credentials);
      return successResponse({ user, session });
    } catch (_error) {
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Login failed');
    }
  });

  // Register handler for auth:logout
  ipcMain.handle('auth:logout', async (_event, sessionId) => {
    try {
      const authService = getAuthService();
      await authService.logout(sessionId);
      return successResponse({ message: 'Logged out successfully' });
    } catch (_error) {
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Logout failed');
    }
  });

  // Register handler for auth:session
  ipcMain.handle('auth:session', async (_event, sessionId) => {
    try {
      const authService = getAuthService();
      const session = await authService.getSession(sessionId);
      return successResponse(session);
    } catch (_error) {
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Session check failed');
    }
  });
}
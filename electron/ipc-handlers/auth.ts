import { ipcMain } from 'electron';
import * as path from 'node:path';
import {
  successResponse,
  errorResponse,
  IPCErrorCode,
} from '../utils/ipc-response.ts';
import { databaseManager } from '../../src/db/database.ts';
import { UserRepository } from '../../src/repositories/UserRepository.ts';
import { SessionRepository } from '../../src/repositories/SessionRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { AuthenticationService } from '../../src/services/AuthenticationService.ts';
// Domain errors available if needed for future error handling improvements

// ESM equivalent of __dirname
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SIMPLE: Create singleton (initialized once, reused forever)
let authService: AuthenticationService | null = null;

function getAuthService(): AuthenticationService {
  if (!authService) {
    const db = databaseManager.getDatabase();
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
    } catch (error) {
      console.error('[IPC] auth:register error:', error);
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Registration failed');
    }
  });

  // Register handler for auth:login
  ipcMain.handle('auth:login', async (_event, credentials) => {
    try {
      const authService = getAuthService();
      // AuthenticationService.login expects (username, password, rememberMe) as separate params
      const { username, password, rememberMe = false } = credentials;
      const { user, session } = await authService.login(username, password, rememberMe);
      return successResponse({ user, session });
    } catch (error) {
      console.error('[IPC] auth:login error:', error);
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Login failed');
    }
  });

  // Register handler for auth:logout
  ipcMain.handle('auth:logout', async (_event, sessionId) => {
    try {
      const authService = getAuthService();
      await authService.logout(sessionId);
      return successResponse({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('[IPC] auth:logout error:', error);
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Logout failed');
    }
  });

  // Register handler for auth:session
  ipcMain.handle('auth:session', async (_event, sessionId) => {
    console.log('[IPC] auth:session called with sessionId:', sessionId);
    try {
      const authService = getAuthService();
      const session = await authService.getSession(sessionId);
      console.log('[IPC] auth:session - session from db:', session);

      if (!session) {
        console.log('[IPC] auth:session - session not found');
        return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Session not found');
      }

      // Fetch user information to include username and email
      const db = databaseManager.getDatabase();
      const auditLogger = new AuditLogger(db);
      const userRepository = new UserRepository(auditLogger);
      const user = await userRepository.findById(session.userId);
      console.log('[IPC] auth:session - user from db:', user ? `id=${user.id}, username=${user.username}` : 'null');

      if (!user) {
        console.log('[IPC] auth:session - user not found');
        return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'User not found');
      }

      // Return session with user information (nested user object to match SessionResponse interface)
      const response = successResponse({
        id: session.id,
        user: {
          id: String(session.userId),
          username: user.username,
          email: user.email
        },
        expiresAt: session.expiresAt
      });
      console.log('[IPC] auth:session - returning success response with user:', response.data);
      return response;
    } catch (error) {
      console.error('[IPC] auth:session - error:', error);
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Session check failed');
    }
  });
}
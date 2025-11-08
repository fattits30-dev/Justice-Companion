import { ipcMain } from "electron";
import {
  successResponse,
  errorResponse,
  IPCErrorCode,
} from "../utils/ipc-response";
import { databaseManager } from "../../src/db/database";
import { UserRepository } from "../../src/repositories/UserRepository";
import { SessionRepository } from "../../src/repositories/SessionRepository";
import { AuditLogger } from "../../src/services/AuditLogger";
import {
  AuthenticationError,
  AuthenticationService,
} from "../../src/services/AuthenticationService";
import { getSessionManager } from "../services/SessionManager";
// Domain errors available if needed for future error handling improvements

// ESM equivalent of __dirname
// `fileURLToPath` removed; no path-based logic required for auth handlers

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

    console.warn("[IPC] AuthenticationService initialized");
  }
  return authService;
}

/**
 * ===== AUTHENTICATION HANDLERS =====
 * 4 channels: auth:register, auth:login, auth:logout, auth:session
 */
export function setupAuthHandlers(): void {
  // Register handler for auth:register
  ipcMain.handle("auth:register", async (_event, userData) => {
    try {
      const authService = getAuthService();
      const { username, password, email } = userData;
      if (!username || !password || !email) {
        return errorResponse(
          IPCErrorCode.INVALID_INPUT,
          "Username, password, and email are required"
        );
      }
      const { user, session } = await authService.register(
        username,
        password,
        email
      );

      // Create in-memory session for IPC authentication
      const sessionManager = getSessionManager();
      sessionManager.createSession({
        userId: user.id,
        username: user.username,
        rememberMe: false,
      });

      return successResponse({ user, session });
    } catch (error) {
      console.error("[IPC] auth:register error:", error);
      if (error instanceof AuthenticationError) {
        return errorResponse(IPCErrorCode.AUTH_ERROR, error.message);
      }
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, "Registration failed");
    }
  });

  // Register handler for auth:login
  ipcMain.handle("auth:login", async (_event, credentials) => {
    try {
      const authService = getAuthService();
      // AuthenticationService.login expects (username, password, rememberMe) as separate params
      const { username, password, rememberMe = false } = credentials;
      const { user, session } = await authService.login(
        username,
        password,
        rememberMe
      );

      // Create in-memory session for IPC authentication
      const sessionManager = getSessionManager();
      const inMemorySessionId = sessionManager.createSession({
        userId: user.id,
        username: user.username,
        rememberMe,
      });

      console.warn(
        `[IPC] Created in-memory session ${inMemorySessionId} for user ${user.username}`
      );

      return successResponse({ user, session });
    } catch (error) {
      console.error("[IPC] auth:login error:", error);
      if (error instanceof AuthenticationError) {
        return errorResponse(IPCErrorCode.INVALID_CREDENTIALS, error.message);
      }
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, "Login failed");
    }
  });

  // Register handler for auth:logout
  ipcMain.handle("auth:logout", async (_event, sessionId) => {
    try {
      const authService = getAuthService();
      await authService.logout(sessionId);

      // Destroy in-memory session for IPC authentication
      const sessionManager = getSessionManager();
      sessionManager.destroySession(sessionId);

      console.warn(`[IPC] Destroyed in-memory session ${sessionId}`);

      return successResponse({ message: "Logged out successfully" });
    } catch (error) {
      console.error("[IPC] auth:logout error:", error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, "Logout failed");
    }
  });

  // Register handler for auth:session
  ipcMain.handle("auth:session", async (_event, sessionId) => {
    console.warn("[IPC] auth:session called with sessionId:", sessionId);
    try {
      const authService = getAuthService();
      const session = await authService.getSession(sessionId);
      console.warn("[IPC] auth:session - session from db:", session);

      if (!session) {
        console.warn("[IPC] auth:session - session not found");
        return errorResponse(
          IPCErrorCode.NOT_AUTHENTICATED,
          "Session not found"
        );
      }

      // Fetch user information to include username and email
      const db = databaseManager.getDatabase();
      const auditLogger = new AuditLogger(db);
      const userRepository = new UserRepository(auditLogger);
      const user = await userRepository.findById(session.userId);
      console.warn(
        "[IPC] auth:session - user from db:",
        user ? `id=${user.id}, username=${user.username}` : "null"
      );

      if (!user) {
        console.warn("[IPC] auth:session - user not found");
        return errorResponse(IPCErrorCode.NOT_FOUND, "User not found");
      }

      // Return session with user information (nested user object to match SessionResponse interface)
      const response = successResponse({
        id: session.id,
        user: {
          id: String(session.userId),
          username: user.username,
          email: user.email,
        },
        expiresAt: session.expiresAt,
      });
      console.warn(
        "[IPC] auth:session - returning success response with user:",
        response.data
      );
      return response;
    } catch (error) {
      console.error("[IPC] auth:session - error:", error);
      return errorResponse(IPCErrorCode.INTERNAL_ERROR, "Session check failed");
    }
  });
}

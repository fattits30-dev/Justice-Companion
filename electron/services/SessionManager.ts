import { v4 as uuidv4 } from "uuid";

/**
 * In-memory session data for IPC authentication
 */
interface InMemorySession {
  id: string;
  userId: number;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  rememberMe: boolean;
}

/**
 * Session validation result
 */
interface SessionValidationResult {
  valid: boolean;
  userId?: number;
  username?: string;
}

/**
 * SessionManager - In-Memory Session Management for IPC Authentication
 *
 * Provides fast, in-memory session validation for Electron IPC handlers.
 * Sessions are stored in memory only and are lost on app restart.
 *
 * Features:
 * - Fast O(1) session validation
 * - Automatic session expiration
 * - Session cleanup on logout
 * - UUID-based session IDs for security
 *
 * Security:
 * - Sessions expire after 24 hours (or 30 days for rememberMe)
 * - Expired sessions are automatically cleaned up
 * - Session IDs are cryptographically secure UUIDs
 */
class SessionManager {
  private sessions: Map<string, InMemorySession> = new Map();

  /**
   * Create a new in-memory session
   */
  createSession(sessionData: {
    userId: number;
    username: string;
    rememberMe: boolean;
  }): string {
    // Generate secure session ID
    const sessionId = uuidv4();

    // Calculate expiration time
    const expiresAt = new Date();
    if (sessionData.rememberMe) {
      // 30 days for remember me
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      // 24 hours default
      expiresAt.setHours(expiresAt.getHours() + 24);
    }

    const session: InMemorySession = {
      id: sessionId,
      userId: sessionData.userId,
      username: sessionData.username,
      createdAt: new Date(),
      expiresAt,
      rememberMe: sessionData.rememberMe,
    };

    this.sessions.set(sessionId, session);

    console.warn(
      `[SessionManager] Created in-memory session ${sessionId} for user ${sessionData.username} (expires: ${expiresAt.toISOString()})`
    );

    return sessionId;
  }

  /**
   * Validate a session and return user information
   */
  validateSession(sessionId: string): SessionValidationResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false };
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      this.sessions.delete(sessionId);
      console.warn(
        `[SessionManager] Cleaned up expired session ${sessionId} for user ${session.username}`
      );
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.userId,
      username: session.username,
    };
  }

  /**
   * Destroy a session (logout)
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      console.warn(
        `[SessionManager] Destroyed in-memory session ${sessionId} for user ${session.username}`
      );
      return true;
    }
    return false;
  }

  /**
   * Clean up expired sessions
   * Called periodically to prevent memory leaks
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.warn(
        `[SessionManager] Cleaned up ${cleanedCount} expired in-memory sessions`
      );
    }

    return cleanedCount;
  }

  /**
   * Get session count (for monitoring/debugging)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all active session IDs (for debugging)
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

/**
 * Get the singleton SessionManager instance
 */
export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();

    // Set up periodic cleanup of expired sessions (every 5 minutes)
    setInterval(
      () => {
        sessionManagerInstance?.cleanupExpiredSessions();
      },
      5 * 60 * 1000
    );
  }

  return sessionManagerInstance;
}

// Export the class for testing
export { SessionManager };

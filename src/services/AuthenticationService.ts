import crypto from 'crypto';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { AuditLogger } from './AuditLogger';
import { RateLimitService } from './RateLimitService';
import type { User } from '../models/User';
import type { Session } from '../models/Session';

const scrypt = promisify(crypto.scrypt);

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Interface for session persistence operations
 * Allows injection of platform-specific persistence (e.g., Electron's safeStorage)
 */
export interface SessionPersistenceHandler {
  storeSessionId(sessionId: string): Promise<void>;
  retrieveSessionId(): Promise<string | null>;
  clearSession(): Promise<void>;
  hasStoredSession(): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

/**
 * Authentication service for local user management
 *
 * Features:
 * - User registration with strong password requirements (OWASP)
 * - Password hashing using scrypt (OWASP recommended)
 * - Session management with 24-hour expiration
 * - Session ID regeneration on every login (prevents session fixation)
 * - Remember Me with secure session persistence
 * - Timing-safe password comparison (prevents timing attacks)
 * - Comprehensive audit logging
 *
 * Security:
 * - Passwords never stored in plaintext
 * - Random salt per user (16 bytes)
 * - scrypt key derivation (64-byte hash)
 * - UUID session IDs (always regenerated on login)
 * - All authentication events audited
 */
export class AuthenticationService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private rateLimitService: RateLimitService;

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private auditLogger?: AuditLogger,
    private sessionPersistence?: SessionPersistenceHandler,
  ) {
    this.rateLimitService = RateLimitService.getInstance();
  }

  /**
   * Register a new user
   * Enforces OWASP password requirements:
   * - Minimum 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  async register(username: string, password: string, email: string): Promise<User> {
    // Validate username
    if (!username || username.trim().length === 0) {
      throw new AuthenticationError('Username cannot be empty');
    }

    // Validate password strength
    if (password.length < 12) {
      throw new AuthenticationError(
        'Password must be at least 12 characters (OWASP requirement)',
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new AuthenticationError('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new AuthenticationError('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new AuthenticationError('Password must contain at least one number');
    }

    // Check if username already exists
    const existingUser = this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new AuthenticationError('Username already exists');
    }

    // Check if email already exists
    const existingEmail = this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new AuthenticationError('Email already exists');
    }

    // Generate salt and hash password
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const hash = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;

    const user = this.userRepository.create({
      username,
      email,
      passwordHash: hash.toString('hex'),
      passwordSalt: salt.toString('hex'),
      role: 'user',
    });

    this.auditLogger?.log({
      eventType: 'user.register',
      userId: user.id.toString(),
      resourceType: 'user',
      resourceId: user.id.toString(),
      action: 'create',
      details: { username, email },
      success: true,
    });

    return user;
  }

  /**
   * Login user and create session
   * Uses timing-safe comparison to prevent timing attacks
   * Implements rate limiting to prevent brute force attacks
   * Always generates a new session ID to prevent session fixation
   * Integrates with SessionPersistenceService for Remember Me functionality
   * @param rememberMe - If true, session will last 30 days instead of 24 hours
   */
  async login(
    username: string,
    password: string,
    rememberMe: boolean = false,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: User; session: Session }> {
    // Check rate limit before attempting login
    const rateLimitResult = this.rateLimitService.checkRateLimit(username);

    if (!rateLimitResult.allowed) {
      // Account is locked due to too many failed attempts
      this.auditLogger?.log({
        eventType: 'user.login',
        userId: undefined,
        resourceType: 'user',
        resourceId: 'unknown',
        action: 'read',
        success: false,
        details: {
          username,
          reason: 'Rate limit exceeded',
          remainingTime: rateLimitResult.remainingTime,
        },
      });

      const errorMessage = rateLimitResult.remainingTime
        ? `Account temporarily locked. Please try again in ${Math.ceil(rateLimitResult.remainingTime / 60)} minutes.`
        : 'Too many failed login attempts. Please try again later.';

      throw new AuthenticationError(errorMessage);
    }

    const user = this.userRepository.findByUsername(username);

    if (!user) {
      // Record failed attempt for rate limiting
      this.rateLimitService.recordFailedAttempt(username);

      this.auditLogger?.log({
        eventType: 'user.login',
        userId: undefined,
        resourceType: 'user',
        resourceId: 'unknown',
        action: 'read',
        success: false,
        details: { username, reason: 'User not found' },
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      // Record failed attempt for rate limiting
      this.rateLimitService.recordFailedAttempt(username);

      this.auditLogger?.log({
        eventType: 'user.login',
        userId: user.id.toString(),
        resourceType: 'user',
        resourceId: user.id.toString(),
        action: 'read',
        success: false,
        details: { username, reason: 'User inactive' },
      });
      throw new AuthenticationError('Account is inactive');
    }

    // Verify password using timing-safe comparison
    const salt = Buffer.from(user.passwordSalt, 'hex');
    const hash = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      hash,
    );

    if (!isValid) {
      // Record failed attempt for rate limiting
      this.rateLimitService.recordFailedAttempt(username);

      this.auditLogger?.log({
        eventType: 'user.login',
        userId: user.id.toString(),
        resourceType: 'user',
        resourceId: user.id.toString(),
        action: 'read',
        success: false,
        details: { username, reason: 'Invalid password' },
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Login successful - clear rate limit attempts
    this.rateLimitService.clearAttempts(username);

    // SECURITY: Always generate a NEW session ID to prevent session fixation attacks
    // Never reuse existing session IDs
    const newSessionId = uuidv4();

    // Create session with appropriate duration based on rememberMe flag
    const sessionDuration = rememberMe ? this.REMEMBER_ME_DURATION_MS : this.SESSION_DURATION_MS;
    const expiresAt = new Date(Date.now() + sessionDuration);

    const session = this.sessionRepository.create({
      id: newSessionId,  // Force new ID - prevents session fixation
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
      rememberMe,
    });

    // If Remember Me is enabled, store session in persistent storage
    let sessionPersisted = false;
    if (rememberMe && this.sessionPersistence) {
      try {
        if (await this.sessionPersistence.isAvailable()) {
          await this.sessionPersistence.storeSessionId(newSessionId);
          sessionPersisted = true;
        } else {
          console.warn('[AuthenticationService] Persistent storage not available, Remember Me will not persist across app restarts');
        }
      } catch (error) {
        // Don't fail login if persistence fails - just log the error
        console.error('[AuthenticationService] Failed to persist session:', error);
      }
    } else if (rememberMe && !this.sessionPersistence) {
      console.warn('[AuthenticationService] Remember Me requested but no persistence handler configured');
    }

    // Update last login timestamp
    this.userRepository.updateLastLogin(user.id);

    this.auditLogger?.log({
      eventType: 'user.login',
      userId: user.id.toString(),
      resourceType: 'user',
      resourceId: user.id.toString(),
      action: 'read',
      success: true,
      details: {
        username,
        sessionId: newSessionId,
        rememberMe: rememberMe ? 'enabled' : 'disabled',
        sessionRegenerated: true,
        sessionPersisted: sessionPersisted,
      },
    });

    return { user, session };
  }

  /**
   * Logout user and delete session
   * Clears persisted session if exists (Remember Me cleanup)
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.sessionRepository.findById(sessionId);

    if (session) {
      // Clear persisted session if exists (Remember Me cleanup)
      if (this.sessionPersistence) {
        try {
          await this.sessionPersistence.clearSession();
        } catch (error) {
          // Don't fail logout if persistence clear fails
          console.error('[AuthenticationService] Failed to clear persisted session:', error);
        }
      }

      // Delete session from database
      this.sessionRepository.delete(sessionId);

      this.auditLogger?.log({
        eventType: 'user.logout',
        userId: session.userId.toString(),
        resourceType: 'session',
        resourceId: sessionId,
        action: 'delete',
        success: true,
        details: {
          sessionCleared: true,
        },
      });
    }
  }

  /**
   * Validate session and return user
   * Returns null if session is invalid or expired
   */
  validateSession(sessionId: string | null): User | null {
    if (!sessionId) {
      return null;
    }

    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    // Check expiry
    if (this.sessionRepository.isExpired(session)) {
      this.sessionRepository.delete(sessionId);
      return null;
    }

    return this.userRepository.findById(session.userId);
  }

  /**
   * Change user password
   * Requires old password for verification
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify old password
    const salt = Buffer.from(user.passwordSalt, 'hex');
    const hash = (await scrypt(oldPassword, salt, this.KEY_LENGTH)) as Buffer;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      hash,
    );

    if (!isValid) {
      this.auditLogger?.log({
        eventType: 'user.password_change',
        userId: userId.toString(),
        resourceType: 'user',
        resourceId: userId.toString(),
        action: 'update',
        success: false,
        details: { reason: 'Invalid current password' },
      });
      throw new AuthenticationError('Invalid current password');
    }

    // Validate new password strength
    if (newPassword.length < 12) {
      throw new AuthenticationError('Password must be at least 12 characters');
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new AuthenticationError('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new AuthenticationError('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new AuthenticationError('Password must contain at least one number');
    }

    // Hash new password
    const newSalt = crypto.randomBytes(this.SALT_LENGTH);
    const newHash = (await scrypt(newPassword, newSalt, this.KEY_LENGTH)) as Buffer;

    this.userRepository.updatePassword(
      userId,
      newHash.toString('hex'),
      newSalt.toString('hex'),
    );

    // Invalidate all existing sessions for security
    this.sessionRepository.deleteByUserId(userId);

    this.auditLogger?.log({
      eventType: 'user.password_change',
      userId: userId.toString(),
      resourceType: 'user',
      resourceId: userId.toString(),
      action: 'update',
      success: true,
    });
  }

  /**
   * Restore session from persistent storage (for Remember Me functionality)
   * Called on app startup to restore a previously persisted session
   * @returns User and session if valid persisted session found, null otherwise
   */
  async restorePersistedSession(): Promise<{ user: User; session: Session } | null> {
    try {
      // Check if persistence handler is configured
      if (!this.sessionPersistence) {
        return null;
      }

      // Check if there's a persisted session
      if (!await this.sessionPersistence.hasStoredSession()) {
        return null;
      }

      // Retrieve the persisted session ID
      const sessionId = await this.sessionPersistence.retrieveSessionId();
      if (!sessionId) {
        return null;
      }

      // Validate the session is still valid in the database
      const session = this.sessionRepository.findById(sessionId);
      if (!session) {
        await this.sessionPersistence.clearSession();
        return null;
      }

      // Check if session is expired
      if (this.sessionRepository.isExpired(session)) {
        await this.sessionPersistence.clearSession();
        this.sessionRepository.delete(sessionId);
        return null;
      }

      // Get the user for this session
      const user = this.userRepository.findById(session.userId);
      if (!user) {
        await this.sessionPersistence.clearSession();
        this.sessionRepository.delete(sessionId);
        return null;
      }

      // Check if user is still active
      if (!user.isActive) {
        await this.sessionPersistence.clearSession();
        this.sessionRepository.delete(sessionId);
        return null;
      }

      // Session is valid - log the successful restoration
      this.auditLogger?.log({
        eventType: 'user.login',
        userId: user.id.toString(),
        resourceType: 'session',
        resourceId: sessionId,
        action: 'read',
        success: true,
        details: {
          rememberMe: session.rememberMe,
          restored: true,
          restoredFromPersistence: true,
        },
      });

      return { user, session };

    } catch (error) {
      console.error('[AuthenticationService] Error restoring persisted session:', error);
      // Clear any corrupted persisted session
      if (this.sessionPersistence) {
        try {
          await this.sessionPersistence.clearSession();
        } catch {
          // Ignore cleanup errors
        }
      }
      return null;
    }
  }

  /**
   * Cleanup expired sessions (should be run periodically)
   */
  cleanupExpiredSessions(): number {
    const deletedCount = this.sessionRepository.deleteExpired();

    if (deletedCount > 0) {
      this.auditLogger?.log({
        eventType: 'session.cleanup',
        userId: undefined,
        resourceType: 'session',
        resourceId: 'system',
        action: 'delete',
        success: true,
        details: { deletedCount },
      });
    }

    return deletedCount;
  }
}

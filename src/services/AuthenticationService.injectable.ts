import crypto from "crypto";
import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';
import { logger } from "../utils/logger.ts";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import type { IUserRepository, ISessionRepository, IAuditLogger, IRateLimitService, IAuthenticationService } from '../shared/infrastructure/di/interfaces.ts';
import type { User } from "../domains/auth/entities/User.ts";
import type { Session } from "../domains/auth/entities/Session.ts";

const scrypt = promisify(crypto.scrypt);

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
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
 * Injectable Authentication service for local user management
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
@injectable()
export class AuthenticationServiceInjectable implements IAuthenticationService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.SessionRepository) private sessionRepository: ISessionRepository,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger,
    @inject(TYPES.RateLimitService) private rateLimitService: IRateLimitService
  ) {}

  /**
   * Register a new user
   * Enforces OWASP password requirements:
   * - Minimum 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  async register(
    email: string,
    password: string,
    username?: string
  ): Promise<User> {
    // Validate username if provided
    if (username !== undefined && (!username || username.trim().length === 0)) {
      throw new AuthenticationError("Username cannot be empty");
    }

    // Validate password strength
    this.validatePasswordStrength(password);

    // Check if user already exists
    const existingUser = this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AuthenticationError("User with this email already exists");
    }

    // Hash password with random salt
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      username: username || email.split('@')[0],
      email,
      passwordHash: hashedPassword,
    });

    // Log registration
    this.auditLogger?.log({
      userId: user.id.toString(),
      action: "USER_REGISTER",
      resourceType: "user",
      resourceId: user.id.toString(),
      details: { email },
      ipAddress: "local",
      userAgent: "desktop-app",
    });

    logger.info(`User registered: ${email}`);
    return user;
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session }> {
    // Rate limiting
    const rateLimitKey = `login:${email}`;
    const { allowed } = this.rateLimitService.checkLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!allowed) {
      throw new AuthenticationError("Too many login attempts. Please try again later.");
    }

    // Find user
    const user = this.userRepository.findByEmail(email);
    if (!user) {
      this.rateLimitService.consume(rateLimitKey);
      throw new AuthenticationError("Invalid email or password");
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      this.rateLimitService.consume(rateLimitKey);
      this.auditLogger?.log({
        userId: user.id.toString(),
        action: "LOGIN_FAILED",
        resourceType: "session",
        resourceId: "n/a",
        details: { reason: "Invalid password" },
        ipAddress: "local",
        userAgent: "desktop-app",
      });
      throw new AuthenticationError("Invalid email or password");
    }

    // Create session
    const session = this.createSession(user.id);

    // Log successful login
    this.auditLogger?.log({
      userId: user.id.toString(),
      action: "LOGIN",
      resourceType: "session",
      resourceId: session.id,
      details: { email },
      ipAddress: "local",
      userAgent: "desktop-app",
    });

    logger.info(`User logged in: ${email}`);
    return { user, session };
  }

  /**
   * Logout and invalidate session
   */
  async logout(sessionId: string): Promise<boolean> {
    const session = this.sessionRepository.findById(sessionId);

    if (session) {
      const success = this.sessionRepository.delete(sessionId);

      if (success) {
        this.auditLogger?.log({
          userId: session.userId.toString(),
          action: "LOGOUT",
          resourceType: "session",
          resourceId: sessionId,
          details: {},
          ipAddress: "local",
          userAgent: "desktop-app",
        });

        logger.info(`User logged out: session ${sessionId}`);
      }

      return success;
    }

    return false;
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      this.sessionRepository.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Refresh a session's expiration time
   */
  async refreshSession(sessionId: string): Promise<Session | null> {
    const session = await this.validateSession(sessionId);

    if (!session) {
      return null;
    }

    // Update expiration
    const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);
    const updated = this.sessionRepository.update(sessionId, {
      expiresAt: newExpiresAt.toISOString(),
    });

    if (updated) {
      this.auditLogger?.log({
        userId: session.userId.toString(),
        action: "SESSION_REFRESH",
        resourceType: "session",
        resourceId: sessionId,
        details: { newExpiresAt: newExpiresAt.toISOString() },
        ipAddress: "local",
        userAgent: "desktop-app",
      });
    }

    return updated;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      this.auditLogger?.log({
        userId: userId.toString(),
        action: "PASSWORD_CHANGE_FAILED",
        resourceType: "user",
        resourceId: userId.toString(),
        details: { reason: "Invalid current password" },
        ipAddress: "local",
        userAgent: "desktop-app",
      });
      throw new AuthenticationError("Current password is incorrect");
    }

    // Validate new password
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user
    const updated = this.userRepository.update(userId, {
      passwordHash: hashedPassword,
    });

    if (updated) {
      // Invalidate all sessions for this user
      this.sessionRepository.deleteByUserId(userId);

      this.auditLogger?.log({
        userId: userId.toString(),
        action: "PASSWORD_CHANGE",
        resourceType: "user",
        resourceId: userId.toString(),
        details: {},
        ipAddress: "local",
        userAgent: "desktop-app",
      });

      logger.info(`Password changed for user: ${userId}`);
    }

    return !!updated;
  }

  /**
   * Hash password with random salt using scrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const hash = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    return salt.toString("hex") + ":" + hash.toString("hex");
  }

  /**
   * Verify password against hash using timing-safe comparison
   */
  private async verifyPassword(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    const [salt, hash] = storedHash.split(":");
    const saltBuffer = Buffer.from(salt, "hex");
    const hashBuffer = Buffer.from(hash, "hex");
    const derivedHash = (await scrypt(
      password,
      saltBuffer,
      this.KEY_LENGTH
    )) as Buffer;
    return crypto.timingSafeEqual(hashBuffer, derivedHash);
  }

  /**
   * Validate password strength according to OWASP guidelines
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 12) {
      throw new AuthenticationError(
        "Password must be at least 12 characters long"
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new AuthenticationError(
        "Password must contain at least one uppercase letter"
      );
    }

    if (!/[a-z]/.test(password)) {
      throw new AuthenticationError(
        "Password must contain at least one lowercase letter"
      );
    }

    if (!/[0-9]/.test(password)) {
      throw new AuthenticationError(
        "Password must contain at least one number"
      );
    }
  }

  /**
   * Create a new session for a user
   */
  private createSession(userId: number): Session {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    return this.sessionRepository.create({
      id: sessionId,
      userId,
      expiresAt: expiresAt.toISOString(),
    });
  }
}
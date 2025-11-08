import crypto from "node:crypto";
import { inject, injectable } from "inversify";
import { promisify } from "node:util";
import { v4 as uuidv4 } from "uuid";
import { TYPES } from "../shared/infrastructure/di/types.ts";
import type {
  IUserRepository,
  ISessionRepository,
} from "../shared/infrastructure/di/repository-interfaces.ts";
import type {
  IAuditLogger,
  IAuthenticationService,
  IRateLimitService,
  ISessionPersistenceHandler,
} from "../shared/infrastructure/di/service-interfaces.ts";
import type { Session } from "../domains/auth/entities/Session.ts";
import type { User } from "../domains/auth/entities/User.ts";
import { logger } from "../utils/logger.ts";

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
 * Injectable Authentication service for local user management
 */
@injectable()
export class AuthenticationServiceInjectable implements IAuthenticationService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: IUserRepository,
    @inject(TYPES.SessionRepository)
    private readonly sessionRepository: ISessionRepository,
    @inject(TYPES.AuditLogger) private readonly auditLogger: IAuditLogger,
    @inject(TYPES.RateLimitService)
    private readonly rateLimitService: IRateLimitService,
    @inject(TYPES.SessionPersistenceService)
    private readonly sessionPersistence?: ISessionPersistenceHandler
  ) {}

  /**
   * Register a new user with OWASP-compliant password requirements
   */
  async register(
    username: string,
    password: string,
    email: string
  ): Promise<User> {
    const normalizedUsername = username?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedUsername) {
      throw new AuthenticationError("Username cannot be empty");
    }

    if (!normalizedEmail) {
      throw new AuthenticationError("Email is required");
    }

    this.validatePasswordStrength(password);

    if (this.userRepository.findByUsername(normalizedUsername)) {
      throw new AuthenticationError("Username already exists");
    }

    if (this.userRepository.findByEmail(normalizedEmail)) {
      throw new AuthenticationError("Email already exists");
    }

    const { hash, salt } = await this.generatePasswordHash(password);

    const user = this.userRepository.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: "user",
    });

    this.auditLogger?.log({
      eventType: "user.register",
      userId: user.id.toString(),
      resourceType: "user",
      resourceId: user.id.toString(),
      action: "create",
      success: true,
      details: { username: normalizedUsername, email: normalizedEmail },
    });

    logger.info("AuthenticationService", "User registered", {
      username: normalizedUsername,
      email: normalizedEmail,
    });

    return user;
  }

  /**
   * Login user, enforce rate limiting, and create a new session
   */
  async login(
    username: string,
    password: string,
    rememberMe: boolean = false,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; session: Session }> {
    const rateLimitResult = this.rateLimitService.checkRateLimit(username);

    if (!rateLimitResult.allowed) {
      this.auditLogger?.log({
        eventType: "user.login",
        resourceType: "user",
        resourceId: "unknown",
        action: "read",
        success: false,
        details: {
          username,
          reason: "Rate limit exceeded",
          remainingTime: rateLimitResult.remainingTime,
        },
      });

      const message = rateLimitResult.remainingTime
        ? `Account temporarily locked. Please try again in ${Math.ceil(rateLimitResult.remainingTime / 60)} minutes.`
        : "Too many failed login attempts. Please try again later.";

      throw new AuthenticationError(message);
    }

    const user = this.userRepository.findByUsername(username);

    if (!user) {
      this.rateLimitService.recordFailedAttempt(username);
      this.auditLogger?.log({
        eventType: "user.login",
        resourceType: "user",
        resourceId: "unknown",
        action: "read",
        success: false,
        details: { username, reason: "User not found" },
      });
      throw new AuthenticationError("Invalid credentials");
    }

    if (!user.isActive) {
      this.rateLimitService.recordFailedAttempt(username);
      this.auditLogger?.log({
        eventType: "user.login",
        userId: user.id.toString(),
        resourceType: "user",
        resourceId: user.id.toString(),
        action: "read",
        success: false,
        details: { username, reason: "User inactive" },
      });
      throw new AuthenticationError("Account is inactive");
    }

    const passwordValid = await this.verifyPassword(
      password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!passwordValid) {
      this.rateLimitService.recordFailedAttempt(username);
      this.auditLogger?.log({
        eventType: "user.login",
        userId: user.id.toString(),
        resourceType: "user",
        resourceId: user.id.toString(),
        action: "read",
        success: false,
        details: { username, reason: "Invalid password" },
      });
      throw new AuthenticationError("Invalid credentials");
    }

    this.rateLimitService.clearAttempts(username);

    const session = this.createSession(user.id, {
      rememberMe,
      ipAddress,
      userAgent,
    });

    let sessionPersisted = false;
    if (rememberMe && this.sessionPersistence) {
      try {
        if (await this.sessionPersistence.isAvailable()) {
          await this.sessionPersistence.storeSessionId(session.id);
          sessionPersisted = true;
        } else {
          logger.warn(
            "AuthenticationService",
            "Session persistence unavailable for Remember Me"
          );
        }
      } catch (error) {
        logger.error("AuthenticationService", "Failed to persist session", {
          error,
        });
      }
    }

    this.userRepository.updateLastLogin(user.id);

    this.auditLogger?.log({
      eventType: "user.login",
      userId: user.id.toString(),
      resourceType: "user",
      resourceId: user.id.toString(),
      action: "read",
      success: true,
      details: {
        username,
        sessionId: session.id,
        rememberMe: rememberMe ? "enabled" : "disabled",
        sessionPersisted,
      },
      ipAddress,
      userAgent,
    });

    logger.info("AuthenticationService", "User logged in", {
      username,
      rememberMe,
      sessionPersisted,
    });

    return { user, session };
  }

  /**
   * Retrieve session by ID, returning null when expired
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    if (this.sessionRepository.isExpired(session)) {
      this.sessionRepository.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Logout user and clear persisted session state when available
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return;
    }

    if (this.sessionPersistence) {
      try {
        await this.sessionPersistence.clearSession();
      } catch (error) {
        logger.error(
          "AuthenticationService",
          "Failed to clear persisted session",
          { error }
        );
      }
    }

    this.sessionRepository.delete(sessionId);

    this.auditLogger?.log({
      eventType: "user.logout",
      userId: session.userId.toString(),
      resourceType: "session",
      resourceId: sessionId,
      action: "delete",
      success: true,
      details: { sessionCleared: true },
    });

    logger.info("AuthenticationService", "User logged out", { sessionId });
  }

  /**
   * Validate a session and return associated user, deleting expired sessions
   */
  validateSession(sessionId: string | null): User | null {
    if (!sessionId) {
      return null;
    }

    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    if (this.sessionRepository.isExpired(session)) {
      this.sessionRepository.delete(sessionId);
      return null;
    }

    return this.userRepository.findById(session.userId);
  }

  /**
   * Change user password after verifying the existing one
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    const isValid = await this.verifyPassword(
      oldPassword,
      user.passwordHash,
      user.passwordSalt
    );

    if (!isValid) {
      this.auditLogger?.log({
        eventType: "user.password_change",
        userId: userId.toString(),
        resourceType: "user",
        resourceId: userId.toString(),
        action: "update",
        success: false,
        details: { reason: "Invalid current password" },
      });
      throw new AuthenticationError("Invalid current password");
    }

    this.validatePasswordStrength(newPassword);

    const { hash, salt } = await this.generatePasswordHash(newPassword);

    this.userRepository.updatePassword(userId, hash, salt);
    this.sessionRepository.deleteByUserId(userId);

    this.auditLogger?.log({
      eventType: "user.password_change",
      userId: userId.toString(),
      resourceType: "user",
      resourceId: userId.toString(),
      action: "update",
      success: true,
    });

    logger.info("AuthenticationService", "Password changed", { userId });
  }

  /**
   * Restore session from persistent storage for Remember Me functionality
   */
  async restorePersistedSession(): Promise<{
    user: User;
    session: Session;
  } | null> {
    if (!this.sessionPersistence) {
      return null;
    }

    try {
      if (!(await this.sessionPersistence.hasStoredSession())) {
        return null;
      }

      const sessionId = await this.sessionPersistence.retrieveSessionId();

      if (!sessionId) {
        return null;
      }

      const session = this.sessionRepository.findById(sessionId);

      if (!session) {
        await this.sessionPersistence.clearSession();
        return null;
      }

      if (this.sessionRepository.isExpired(session)) {
        await this.sessionPersistence.clearSession();
        this.sessionRepository.delete(sessionId);
        return null;
      }

      const user = this.userRepository.findById(session.userId);

      if (!user || !user.isActive) {
        await this.sessionPersistence.clearSession();
        this.sessionRepository.delete(sessionId);
        return null;
      }

      this.auditLogger?.log({
        eventType: "user.login",
        userId: user.id.toString(),
        resourceType: "session",
        resourceId: sessionId,
        action: "read",
        success: true,
        details: {
          rememberMe: session.rememberMe,
          restored: true,
          restoredFromPersistence: true,
        },
      });

      return { user, session };
    } catch (error) {
      logger.error(
        "AuthenticationService",
        "Error restoring persisted session",
        { error }
      );

      try {
        await this.sessionPersistence.clearSession();
      } catch {
        // Ignore cleanup errors
      }

      return null;
    }
  }

  /**
   * Remove expired sessions from the repository and audit the cleanup
   */
  cleanupExpiredSessions(): number {
    const deletedCount = this.sessionRepository.deleteExpired();

    if (deletedCount > 0) {
      this.auditLogger?.log({
        eventType: "session.cleanup",
        resourceType: "session",
        resourceId: "system",
        action: "delete",
        success: true,
        details: { deletedCount },
      });
    }

    logger.info("AuthenticationService", "Expired sessions cleaned", {
      deletedCount,
    });

    return deletedCount;
  }

  private async generatePasswordHash(
    password: string
  ): Promise<{ hash: string; salt: string }> {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const derived = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;

    return {
      hash: derived.toString("hex"),
      salt: salt.toString("hex"),
    };
  }

  private async verifyPassword(
    password: string,
    passwordHash: string,
    passwordSalt: string
  ): Promise<boolean> {
    const derived = (await scrypt(
      password,
      Buffer.from(passwordSalt, "hex"),
      this.KEY_LENGTH
    )) as Buffer;
    const stored = Buffer.from(passwordHash, "hex");

    return crypto.timingSafeEqual(stored, derived);
  }

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

  private createSession(
    userId: number,
    options: {
      rememberMe: boolean;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Session {
    const sessionDuration = options.rememberMe
      ? this.REMEMBER_ME_DURATION_MS
      : this.SESSION_DURATION_MS;
    const expiresAt = new Date(Date.now() + sessionDuration);

    return this.sessionRepository.create({
      id: uuidv4(),
      userId,
      expiresAt: expiresAt.toISOString(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      rememberMe: options.rememberMe,
    });
  }
}

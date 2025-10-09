import crypto from 'crypto';
import { promisify } from 'util';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { AuditLogger } from './AuditLogger';
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
 * Authentication service for local user management
 *
 * Features:
 * - User registration with strong password requirements (OWASP)
 * - Password hashing using scrypt (OWASP recommended)
 * - Session management with 24-hour expiration
 * - Timing-safe password comparison (prevents timing attacks)
 * - Comprehensive audit logging
 *
 * Security:
 * - Passwords never stored in plaintext
 * - Random salt per user (16 bytes)
 * - scrypt key derivation (64-byte hash)
 * - UUID session IDs
 * - All authentication events audited
 */
export class AuthenticationService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Register a new user
   * Enforces OWASP password requirements:
   * - Minimum 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  async register(username: string, password: string, email: string): Promise<User> {
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
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: User; session: Session }> {
    const user = this.userRepository.findByUsername(username);

    if (!user) {
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

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    const session = this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
    });

    // Update last login timestamp
    this.userRepository.updateLastLogin(user.id);

    this.auditLogger?.log({
      eventType: 'user.login',
      userId: user.id.toString(),
      resourceType: 'user',
      resourceId: user.id.toString(),
      action: 'read',
      success: true,
      details: { username, sessionId },
    });

    return { user, session };
  }

  /**
   * Logout user and delete session
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.sessionRepository.findById(sessionId);

    if (session) {
      this.sessionRepository.delete(sessionId);

      this.auditLogger?.log({
        eventType: 'user.logout',
        userId: session.userId.toString(),
        resourceType: 'session',
        resourceId: sessionId,
        action: 'delete',
        success: true,
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

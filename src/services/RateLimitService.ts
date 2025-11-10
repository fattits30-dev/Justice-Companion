import { injectable } from "inversify";

/**
 * Represents a login attempt record for rate limiting
 */
interface LoginAttempt {
  count: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  lockedUntil: Date | null;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingTime?: number; // seconds until unlock
  attemptsRemaining?: number;
  message?: string;
}

/**
 * Rate limiting service to prevent brute force attacks on login endpoint
 * Implements sliding window rate limiting with automatic lockout
 */
@injectable()
export class RateLimitService {
  private static instance: RateLimitService | null = null;
  private attempts: Map<string, LoginAttempt> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get singleton instance of RateLimitService
   */
  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (RateLimitService.instance) {
      RateLimitService.instance.destroy();
      RateLimitService.instance = null;
    }
  }

  /**
   * Check if login attempt is allowed for the given username
   */
  public checkRateLimit(username: string): RateLimitResult {
    // Normalize username for case-insensitive comparison
    const normalizedUsername = this.normalizeUsername(username);
    const now = new Date();

    // Clean up expired entries first
    this.cleanupExpiredEntries();

    const attempt = this.attempts.get(normalizedUsername);

    // No previous attempts
    if (!attempt) {
      return {
        allowed: true,
        attemptsRemaining: this.MAX_ATTEMPTS,
        message: "Login attempt allowed",
      };
    }

    // Check if account is locked
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const remainingSeconds = Math.ceil(
        (attempt.lockedUntil.getTime() - now.getTime()) / 1000,
      );

      // Log rate limit violation for monitoring
      console.warn(
        `Rate limit exceeded for ${normalizedUsername}. Attempts: ${attempt.count}, Lock time remaining: ${remainingSeconds}s`,
      );

      return {
        allowed: false,
        remainingTime: remainingSeconds,
        message: "Account temporarily locked due to too many failed attempts",
      };
    }

    // Check if the sliding window has expired
    const windowStart = new Date(now.getTime() - this.WINDOW_MS);
    if (attempt.firstAttemptAt < windowStart) {
      // Window has expired, reset the attempt record
      this.attempts.delete(normalizedUsername);
      return {
        allowed: true,
        attemptsRemaining: this.MAX_ATTEMPTS,
        message: "Login attempt allowed",
      };
    }

    // Check if max attempts reached
    if (attempt.count >= this.MAX_ATTEMPTS) {
      // Lock the account
      attempt.lockedUntil = new Date(now.getTime() + this.LOCK_DURATION_MS);

      // Log account lockout for monitoring
      console.warn(
        `Account locked for ${normalizedUsername}. Attempts: ${attempt.count}, Lock duration: ${this.LOCK_DURATION_MS / 1000}s`,
      );

      const remainingSeconds = Math.ceil(this.LOCK_DURATION_MS / 1000);
      return {
        allowed: false,
        remainingTime: remainingSeconds,
        message: "Account temporarily locked due to too many failed attempts",
      };
    }

    // Still within limits
    const attemptsRemaining = this.MAX_ATTEMPTS - attempt.count;
    return {
      allowed: true,
      attemptsRemaining,
      message: `Login attempt allowed. ${attemptsRemaining} attempts remaining`,
    };
  }

  /**
   * Record a failed login attempt
   */
  public recordFailedAttempt(username: string): void {
    const normalizedUsername = this.normalizeUsername(username);
    const now = new Date();

    let attempt = this.attempts.get(normalizedUsername);

    if (!attempt) {
      // First failed attempt
      attempt = {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null,
      };
      this.attempts.set(normalizedUsername, attempt);
    } else {
      // If already locked, don't increment count further
      if (attempt.lockedUntil && attempt.lockedUntil > now) {
        // Already locked, just update last attempt time
        attempt.lastAttemptAt = now;

        return;
      }

      // Check if we're still within the sliding window
      const windowStart = new Date(now.getTime() - this.WINDOW_MS);

      if (attempt.firstAttemptAt < windowStart) {
        // Reset if outside window
        attempt.count = 1;
        attempt.firstAttemptAt = now;
        attempt.lastAttemptAt = now;
        attempt.lockedUntil = null;
      } else {
        // Increment count only if not at max
        if (attempt.count < this.MAX_ATTEMPTS) {
          attempt.count++;
        }
        attempt.lastAttemptAt = now;

        // Lock if max attempts reached
        if (attempt.count >= this.MAX_ATTEMPTS && !attempt.lockedUntil) {
          attempt.lockedUntil = new Date(now.getTime() + this.LOCK_DURATION_MS);

          console.error(
            `BRUTE FORCE DETECTED for ${normalizedUsername}. Account locked for ${this.LOCK_DURATION_MS / 1000}s`,
          );
        }
      }
    }
  }

  /**
   * Clear attempts for a username (on successful login)
   */
  public clearAttempts(username: string): void {
    const normalizedUsername = this.normalizeUsername(username);
    const attempt = this.attempts.get(normalizedUsername);

    if (attempt) {
      this.attempts.delete(normalizedUsername);
    }
  }

  /**
   * Get current attempt count for a username (for monitoring)
   */
  public getAttemptCount(username: string): number {
    const normalizedUsername = this.normalizeUsername(username);
    const attempt = this.attempts.get(normalizedUsername);

    if (!attempt) {
      return 0;
    }

    // Check if window has expired
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.WINDOW_MS);

    if (attempt.firstAttemptAt < windowStart) {
      return 0;
    }

    return attempt.count;
  }

  /**
   * Check if account is currently locked
   */
  public isLocked(username: string): boolean {
    const normalizedUsername = this.normalizeUsername(username);
    const attempt = this.attempts.get(normalizedUsername);

    if (!attempt?.lockedUntil) {
      return false;
    }

    const now = new Date();
    return attempt.lockedUntil > now;
  }

  /**
   * Clean up expired entries from memory
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.WINDOW_MS);
    const entriesToDelete: string[] = [];

    this.attempts.forEach((attempt, username) => {
      // Remove if:
      // 1. Lock has expired and window has passed
      // 2. No lock and window has passed
      const lockExpired = !attempt.lockedUntil || attempt.lockedUntil <= now;
      const windowExpired = attempt.lastAttemptAt < windowStart;

      if (lockExpired && windowExpired) {
        entriesToDelete.push(username);
      }
    });

    // Delete expired entries
    entriesToDelete.forEach((username) => {
      this.attempts.delete(username);
    });
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Clear existing timer if any
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Run cleanup periodically
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL_MS);

    // Ensure timer doesn't prevent process from exiting in Node.js
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Normalize username for case-insensitive comparison
   */
  private normalizeUsername(username: string): string {
    return username.toLowerCase().trim();
  }

  /**
   * Clean up resources (stop timers)
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.attempts.clear();
  }

  /**
   * Check if request is within rate limit (simplified interface method)
   */
  public checkLimit(
    key: string,
    _limit: number,
    _windowMs: number,
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    // For now, delegate to checkRateLimit with a simplified response
    const result = this.checkRateLimit(key);
    return {
      allowed: result.allowed,
      remaining: result.attemptsRemaining || 0,
      resetAt: new Date(
        Date.now() +
          (result.remainingTime ? result.remainingTime * 1000 : this.WINDOW_MS),
      ),
    };
  }

  /**
   * Consume a rate limit attempt (interface method)
   */
  public consume(key: string): void {
    this.recordFailedAttempt(key);
  }

  /**
   * Reset rate limit for a key (interface method)
   */
  public reset(key: string): void {
    this.clearAttempts(key);
  }

  /**
   * Get statistics about current rate limiting state (for monitoring)
   */
  public getStatistics(): {
    totalTrackedUsers: number;
    lockedAccounts: number;
    activeAttempts: number;
  } {
    const now = new Date();
    let lockedAccounts = 0;
    let activeAttempts = 0;

    this.attempts.forEach((attempt) => {
      if (attempt.lockedUntil && attempt.lockedUntil > now) {
        lockedAccounts++;
      }
      const windowStart = new Date(now.getTime() - this.WINDOW_MS);
      if (attempt.firstAttemptAt >= windowStart) {
        activeAttempts++;
      }
    });

    return {
      totalTrackedUsers: this.attempts.size,
      lockedAccounts,
      activeAttempts,
    };
  }
}

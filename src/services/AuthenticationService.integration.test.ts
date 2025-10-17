import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseManager } from '../db/database';
import { SessionRepository } from '../repositories/SessionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { TestDatabaseHelper } from '../test-utils/database-test-helper';
import { AuditLogger } from './AuditLogger';
import { AuthenticationService } from './AuthenticationService';
import { RateLimitService } from './RateLimitService';

describe('AuthenticationService Integration - Rate Limiting', () => {
  let authService: AuthenticationService;
  let userRepository: UserRepository;
  let sessionRepository: SessionRepository;
  let auditLogger: AuditLogger;
  let db: Database.Database;
  let testDb: TestDatabaseHelper;

  beforeEach(() => {
    // Use TestDatabaseHelper to get proper schema with all migrations
    testDb = new TestDatabaseHelper();
    db = testDb.initialize();

    // Inject test database into the singleton for proper test isolation
    databaseManager.setTestDatabase(db);

    // Initialize repositories and services
    auditLogger = new AuditLogger(db);
    userRepository = new UserRepository(auditLogger);
    sessionRepository = new SessionRepository();
    authService = new AuthenticationService(userRepository, sessionRepository, auditLogger);

    // Reset rate limiter singleton for each test
    RateLimitService.resetInstance();

    // Mock console to avoid noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    testDb.cleanup();
    vi.restoreAllMocks();
  });

  describe('Rate Limiting on Login', () => {
    it('should allow first login attempt', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Try to login with wrong password
      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should block login after 5 failed attempts', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // 6th attempt should be blocked
      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        /Account temporarily locked/
      );
    });

    it('should provide specific lock time in error message', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // 6th attempt should show lock time
      try {
        await authService.login('testuser', 'TestPassword123!');
      } catch (error: any) {
        expect(error.message).toContain('Account temporarily locked');
        expect(error.message).toMatch(/try again in \d+ minutes/);
      }
    });

    it('should clear rate limit after successful login', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // Successful login should clear attempts
      const result = await authService.login('testuser', 'TestPassword123!');
      expect(result.user.username).toBe('testuser');
      expect(result.session).toBeDefined();

      // Can make more attempts after successful login
      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      // Should not be locked yet (only 1 attempt after reset)
      await expect(authService.login('testuser', 'TestPassword123!')).resolves.toBeDefined();
    });

    it('should handle case-insensitive usernames for rate limiting', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Make failed attempts with different case
      await expect(authService.login('TestUser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      await expect(authService.login('TESTUSER', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      await expect(authService.login('TeStUsEr', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      await expect(authService.login('testUSER', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );

      // 6th attempt should be blocked regardless of case
      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        /Account temporarily locked/
      );
    });

    it('should rate limit even for non-existent users', async () => {
      // Make 5 failed attempts for non-existent user
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('nonexistent', 'Password123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // 6th attempt should be blocked
      await expect(authService.login('nonexistent', 'Password123!')).rejects.toThrow(
        /Account temporarily locked/
      );
    });

    it('should rate limit inactive accounts', async () => {
      // Register and deactivate a user
      const user = await authService.register('testuser', 'TestPassword123!', 'test@example.com');
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(user.id);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('testuser', 'TestPassword123!')).rejects.toThrow(
          'Account is inactive'
        );
      }

      // 6th attempt should be blocked
      await expect(authService.login('testuser', 'TestPassword123!')).rejects.toThrow(
        /Account temporarily locked/
      );
    });
  });

  describe('Rate Limiting Time Window', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should unlock account after 15 minutes', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Lock the account
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // Should be locked
      await expect(authService.login('testuser', 'TestPassword123!')).rejects.toThrow(
        /Account temporarily locked/
      );

      // Move time forward 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Should be unlocked and able to login
      const result = await authService.login('testuser', 'TestPassword123!');
      expect(result.user.username).toBe('testuser');
    });

    it('should reset attempt counter after 15 minute window', async () => {
      // Register a user
      await authService.register('testuser', 'TestPassword123!', 'test@example.com');

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // Move time forward 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Counter should be reset, can make 5 more attempts
      for (let i = 0; i < 4; i++) {
        await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
          'Invalid credentials'
        );
      }

      // Should still be able to login (only 4 attempts in new window)
      const result = await authService.login('testuser', 'TestPassword123!');
      expect(result.user.username).toBe('testuser');
    });
  });
});

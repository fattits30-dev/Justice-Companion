/// <reference types="vitest/globals" />
import Database from "better-sqlite3-multiple-ciphers";

import {
  buildDeterministicUser,
  deriveTestPassword,
  // @ts-expect-error - testCredentials.js doesn't have types
} from "../../tests/helpers/testCredentials.js";
import { databaseManager } from "../db/database";
import { SessionRepository } from "../repositories/SessionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { TestDatabaseHelper } from "../test-utils/database-test-helper";
import { AuditLogger } from "./AuditLogger";
import { AuthenticationService } from "./AuthenticationService";
import { RateLimitService } from "./RateLimitService";

const TEST_USER = buildDeterministicUser({
  username: "auth_integration_user",
  seed: "auth-integration-user",
});
const WRONG_PASSWORD = deriveTestPassword("auth-integration-wrong-password");
const NON_EXISTENT_USERNAME = "nonexistent_user";
const NON_EXISTENT_PASSWORD = deriveTestPassword(
  "auth-integration-nonexistent-password"
);
const CASE_VARIANTS = buildCaseVariants(TEST_USER.username);

function buildCaseVariants(value: string) {
  const lower = value.toLowerCase();
  const titleCase = `${value.charAt(0).toUpperCase()}${value
    .slice(1)
    .toLowerCase()}`;
  const alternating = value
    .split("")
    .map((char, idx) =>
      idx % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
    )
    .join("");
  const reverseAlternating = value
    .split("")
    .map((char, idx) =>
      idx % 2 === 0 ? char.toUpperCase() : char.toLowerCase()
    )
    .join("");
  const upper = value.toUpperCase();
  return [lower, titleCase, alternating, reverseAlternating, upper];
}

describe("AuthenticationService Integration - Rate Limiting", () => {
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
    authService = new AuthenticationService(
      userRepository,
      sessionRepository,
      auditLogger
    );

    // Reset rate limiter singleton for each test
    RateLimitService.resetInstance();

    // Mock console to avoid noise in test output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    testDb.cleanup();
    vi.restoreAllMocks();
  });

  describe("Rate Limiting on Login", () => {
    it("should allow first login attempt", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Try to login with wrong password
      await expect(
        authService.login(TEST_USER.username, WRONG_PASSWORD)
      ).rejects.toThrow("Invalid credentials");
    });

    it("should block login after 5 failed attempts", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // 6th attempt should be blocked
      await expect(
        authService.login(TEST_USER.username, WRONG_PASSWORD)
      ).rejects.toThrow(/Account temporarily locked/);
    });

    it("should provide specific lock time in error message", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // 6th attempt should show lock time
      try {
        await authService.login(TEST_USER.username, TEST_USER.password);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toContain("Account temporarily locked");
        expect(message).toMatch(/try again in \d+ minutes/);
      }
    });

    it("should clear rate limit after successful login", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // Successful login should clear attempts
      const result = await authService.login(
        TEST_USER.username,
        TEST_USER.password
      );
      expect(result.user.username).toBe(TEST_USER.username);
      expect(result.session).toBeDefined();

      // Can make more attempts after successful login
      await expect(
        authService.login(TEST_USER.username, WRONG_PASSWORD)
      ).rejects.toThrow("Invalid credentials");

      // Should not be locked yet (only 1 attempt after reset)
      await expect(
        authService.login(TEST_USER.username, TEST_USER.password)
      ).resolves.toBeDefined();
    });

    it("should handle case-insensitive usernames for rate limiting", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Make failed attempts with different case
      for (const variant of CASE_VARIANTS) {
        await expect(
          authService.login(variant, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // 6th attempt should be blocked regardless of case
      await expect(
        authService.login(TEST_USER.username, WRONG_PASSWORD)
      ).rejects.toThrow(/Account temporarily locked/);
    });

    it("should rate limit even for non-existent users", async () => {
      // Make 5 failed attempts for non-existent user
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(NON_EXISTENT_USERNAME, NON_EXISTENT_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // 6th attempt should be blocked
      await expect(
        authService.login(NON_EXISTENT_USERNAME, NON_EXISTENT_PASSWORD)
      ).rejects.toThrow(/Account temporarily locked/);
    });

    it("should rate limit inactive accounts", async () => {
      // Register and deactivate a user
      const { user } = await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );
      db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(user.id);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(TEST_USER.username, TEST_USER.password)
        ).rejects.toThrow("Account is inactive");
      }

      // 6th attempt should be blocked
      await expect(
        authService.login(TEST_USER.username, TEST_USER.password)
      ).rejects.toThrow(/Account temporarily locked/);
    });
  });

  describe("Rate Limiting Time Window", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should unlock account after 15 minutes", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Lock the account
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // Should be locked
      await expect(
        authService.login(TEST_USER.username, TEST_USER.password)
      ).rejects.toThrow(/Account temporarily locked/);

      // Move time forward 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Should be unlocked and able to login
      const result = await authService.login(
        TEST_USER.username,
        TEST_USER.password
      );
      expect(result.user.username).toBe(TEST_USER.username);
    });

    it("should reset attempt counter after 15 minute window", async () => {
      // Register a user
      await authService.register(
        TEST_USER.username,
        TEST_USER.password,
        TEST_USER.email
      );

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // Move time forward 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Counter should be reset, can make 5 more attempts
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.login(TEST_USER.username, WRONG_PASSWORD)
        ).rejects.toThrow("Invalid credentials");
      }

      // Should still be able to login (only 4 attempts in new window)
      const result = await authService.login(
        TEST_USER.username,
        TEST_USER.password
      );
      expect(result.user.username).toBe(TEST_USER.username);
    });
  });
});

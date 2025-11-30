import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { databaseManager } from "../db/database.ts";
import { initializeTestRepositories, resetRepositories, } from "../repositories.ts";
import { TestDatabaseHelper } from "../test-utils/database-test-helper.ts";
import { AuditLogger } from "./AuditLogger.ts";
import { AuthenticationService } from "./AuthenticationService.ts";
const createSpecialCharacterPassword = () => `P@ss-${randomUUID().slice(0, 8)}!#Aa1`;
describe("AuthenticationService", () => {
    let authService;
    let userRepository;
    let sessionRepository;
    let auditLogger;
    let testDb;
    beforeEach(() => {
        testDb = new TestDatabaseHelper();
        const db = testDb.initialize();
        // Inject test database into the singleton for proper test isolation
        databaseManager.setTestDatabase(db);
        // Reset repository singletons to force re-initialization with test dependencies
        resetRepositories();
        auditLogger = new AuditLogger(db);
        // Add test-only method to get logs (use ROWID for consistent ordering)
        auditLogger.getAllLogs = () => {
            const rows = db
                .prepare("SELECT * FROM audit_logs ORDER BY ROWID ASC")
                .all();
            // Map to proper format like AuditLogger.query() does
            return rows.map((row) => {
                let parsedDetails;
                if (row.details) {
                    try {
                        parsedDetails = JSON.parse(row.details);
                    }
                    catch {
                        parsedDetails = { value: row.details };
                    }
                }
                return {
                    id: row.id,
                    timestamp: row.timestamp,
                    eventType: row.event_type,
                    userId: row.user_id,
                    resourceType: row.resource_type,
                    resourceId: row.resource_id,
                    action: row.action,
                    details: parsedDetails ?? null,
                    ipAddress: row.ip_address,
                    userAgent: row.user_agent,
                    success: row.success === 1,
                    errorMessage: row.error_message,
                    integrityHash: row.integrity_hash,
                    previousLogHash: row.previous_log_hash,
                    createdAt: row.created_at,
                };
            });
        };
        // Add test-only method to get database (for manual expiry tests)
        auditLogger.getDb = () => db;
        // Initialize repositories with test dependencies (encryption service + audit logger)
        const encryptionService = testDb.getEncryptionService();
        const repos = initializeTestRepositories(encryptionService, auditLogger);
        // Extract repositories from container
        userRepository = repos.userRepository;
        sessionRepository = repos.sessionRepository;
        // Create without sessionPersistence handler (it's optional)
        authService = new AuthenticationService(userRepository, sessionRepository, auditLogger);
    });
    afterEach(() => {
        testDb.clearAllTables(); // Clear data between tests (must happen before cleanup)
        testDb.cleanup(); // Close database connection
        databaseManager.resetDatabase(); // Reset singleton to clean state
    });
    describe("register()", () => {
        it("should register a new user with valid credentials", async () => {
            const { user } = await authService.register("testuser", "SecurePass123", "test@example.com");
            expect(user).toBeDefined();
            expect(user.username).toBe("testuser");
            expect(user.email).toBe("test@example.com");
            expect(user.role).toBe("user");
            expect(user.isActive).toBe(true);
            expect(user.passwordHash).toBeDefined();
            expect(user.passwordSalt).toBeDefined();
            expect(user.passwordHash).not.toBe("SecurePass123"); // Password should be hashed
        });
        it("should enforce minimum password length (12 chars)", async () => {
            await expect(authService.register("testuser", "Short1", "test@example.com")).rejects.toThrow("Password must be at least 12 characters");
        });
        it("should require at least one uppercase letter", async () => {
            await expect(authService.register("testuser", "lowercase123", "test@example.com")).rejects.toThrow("Password must contain at least one uppercase letter");
        });
        it("should require at least one lowercase letter", async () => {
            await expect(authService.register("testuser", "UPPERCASE123", "test@example.com")).rejects.toThrow("Password must contain at least one lowercase letter");
        });
        it("should require at least one number", async () => {
            await expect(authService.register("testuser", "NoNumbersHere", "test@example.com")).rejects.toThrow("Password must contain at least one number");
        });
        it("should reject duplicate username", async () => {
            await authService.register("duplicate", "SecurePass123", "user1@example.com");
            await expect(authService.register("duplicate", "AnotherPass456", "user2@example.com")).rejects.toThrow("Username already exists");
        });
        it("should reject duplicate email", async () => {
            await authService.register("user1", "SecurePass123", "duplicate@example.com");
            await expect(authService.register("user2", "AnotherPass456", "duplicate@example.com")).rejects.toThrow("Email already exists");
        });
        it("should generate unique salt for each user", async () => {
            const { user: user1 } = await authService.register("user1", "SamePass1234", "user1@example.com");
            const { user: user2 } = await authService.register("user2", "SamePass1234", "user2@example.com");
            expect(user1.passwordSalt).not.toBe(user2.passwordSalt);
            expect(user1.passwordHash).not.toBe(user2.passwordHash); // Same password, different hashes
        });
        it("should log registration event", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const logs = auditLogger.getAllLogs();
            // Filter to get only user.register events (excluding user.create from repository)
            const registerLog = logs.find((log) => log.eventType === "user.register");
            expect(registerLog).toBeDefined();
            expect(registerLog?.success).toBe(true);
            expect(registerLog?.details).toMatchObject({
                username: "testuser",
                email: "test@example.com",
            });
        });
    });
    describe("login()", () => {
        beforeEach(async () => {
            // Pre-register a test user
            await authService.register("testuser", "SecurePass123", "test@example.com");
        });
        it("should login with valid credentials", async () => {
            const result = await authService.login("testuser", "SecurePass123");
            expect(result.user).toBeDefined();
            expect(result.user.username).toBe("testuser");
            expect(result.session).toBeDefined();
            expect(result.session.userId).toBe(result.user.id);
            expect(result.session.expiresAt).toBeDefined();
        });
        it("should create session with 24-hour expiration", async () => {
            const beforeLogin = Date.now();
            const result = await authService.login("testuser", "SecurePass123");
            const afterLogin = Date.now();
            const sessionExpiry = new Date(result.session.expiresAt).getTime();
            const expectedMin = beforeLogin + 24 * 60 * 60 * 1000;
            const expectedMax = afterLogin + 24 * 60 * 60 * 1000;
            expect(sessionExpiry).toBeGreaterThanOrEqual(expectedMin);
            expect(sessionExpiry).toBeLessThanOrEqual(expectedMax);
        });
        it("should reject login with invalid username", async () => {
            await expect(authService.login("nonexistent", "SecurePass123")).rejects.toThrow("Invalid credentials");
        });
        it("should reject login with invalid password", async () => {
            await expect(authService.login("testuser", "WrongPassword123")).rejects.toThrow("Invalid credentials");
        });
        it("should reject login for inactive user", async () => {
            const user = userRepository.findByUsername("testuser");
            if (user) {
                userRepository.updateActiveStatus(user.id, false);
            }
            await expect(authService.login("testuser", "SecurePass123")).rejects.toThrow("Account is inactive");
        });
        it("should update last login timestamp", async () => {
            const userBefore = userRepository.findByUsername("testuser");
            const lastLoginBefore = userBefore?.lastLoginAt;
            // Wait 10ms to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 10));
            await authService.login("testuser", "SecurePass123");
            const userAfter = userRepository.findByUsername("testuser");
            const lastLoginAfter = userAfter?.lastLoginAt;
            expect(lastLoginAfter).toBeDefined();
            expect(lastLoginAfter).not.toBe(lastLoginBefore);
        });
        it("should include IP address in session if provided", async () => {
            const result = await authService.login("testuser", "SecurePass123", false, // rememberMe
            "192.168.1.1", "Mozilla/5.0");
            expect(result.session.ipAddress).toBe("192.168.1.1");
            expect(result.session.userAgent).toBe("Mozilla/5.0");
        });
        it("should log successful login", async () => {
            await authService.login("testuser", "SecurePass123");
            const logs = auditLogger.getAllLogs();
            // Find the login log (not the auto-login from registration)
            const loginLog = logs.find((log) => log.eventType === "user.login" &&
                log.success === true &&
                log.details?.sessionId !== undefined // Actual login has sessionId, auto-login has reason
            );
            expect(loginLog).toBeDefined();
            expect(loginLog?.details).toHaveProperty("sessionId");
        });
        it("should log failed login attempts", async () => {
            try {
                await authService.login("testuser", "WrongPassword123");
            }
            catch {
                // Expected to fail
            }
            const logs = auditLogger.getAllLogs();
            const failedLog = logs.find((log) => log.eventType === "user.login" && log.success === false);
            expect(failedLog).toBeDefined();
            expect(failedLog?.details).toMatchObject({
                username: "testuser",
                reason: "Invalid password",
            });
        });
        it("should use timing-safe password comparison", async () => {
            // This test verifies that timingSafeEqual is used
            // We can't directly test timing safety, but we ensure different passwords
            // still take similar time (no early return on first different byte)
            const wrongPassword1 = "AecurePass123"; // First char different
            const wrongPassword2 = "SecurePass12A"; // Last char different
            const times = [];
            for (const password of [wrongPassword1, wrongPassword2]) {
                const start = performance.now();
                try {
                    await authService.login("testuser", password);
                }
                catch {
                    // Expected to fail
                }
                const end = performance.now();
                times.push(end - start);
            }
            // Times should be similar (within a reasonable variance). The threshold
            // is intentionally generous to account for CI noise while still ensuring
            // no obvious short-circuiting.
            const timeDiff = Math.abs(times[0] - times[1]);
            expect(timeDiff).toBeLessThan(150);
        });
    });
    describe("logout()", () => {
        let sessionId;
        beforeEach(async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result = await authService.login("testuser", "SecurePass123");
            sessionId = result.session.id;
        });
        it("should delete session on logout", async () => {
            await authService.logout(sessionId);
            const session = sessionRepository.findById(sessionId);
            expect(session).toBeNull();
        });
        it("should log logout event", async () => {
            await authService.logout(sessionId);
            const logs = auditLogger.getAllLogs();
            const logoutLog = logs.find((log) => log.eventType === "user.logout");
            expect(logoutLog).toBeDefined();
            expect(logoutLog?.success).toBe(true);
            expect(logoutLog?.resourceId).toBe(sessionId);
        });
        it("should handle logout of non-existent session gracefully", async () => {
            await expect(authService.logout("non-existent-id")).resolves.not.toThrow();
        });
    });
    describe("validateSession()", () => {
        let user;
        let sessionId;
        beforeEach(async () => {
            const registerResult = await authService.register("testuser", "SecurePass123", "test@example.com");
            user = registerResult.user;
            const result = await authService.login("testuser", "SecurePass123");
            sessionId = result.session.id;
        });
        it("should return user for valid session", () => {
            const validatedUser = authService.validateSession(sessionId);
            expect(validatedUser).toBeDefined();
            expect(validatedUser?.id).toBe(user.id);
            expect(validatedUser?.username).toBe("testuser");
        });
        it("should return null for null session ID", () => {
            const result = authService.validateSession(null);
            expect(result).toBeNull();
        });
        it("should return null for non-existent session", () => {
            const result = authService.validateSession("non-existent-id");
            expect(result).toBeNull();
        });
        it("should return null and delete expired session", () => {
            // Manually expire the session using test database
            const db = auditLogger.getDb();
            const session = sessionRepository.findById(sessionId);
            if (session) {
                // Use SQLite datetime format that's definitely in the past
                db.prepare("UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = ?").run(sessionId);
            }
            const result = authService.validateSession(sessionId);
            expect(result).toBeNull();
            expect(sessionRepository.findById(sessionId)).toBeNull(); // Should be deleted
        });
    });
    describe("changePassword()", () => {
        let userId;
        beforeEach(async () => {
            const { user } = await authService.register("testuser", "OldPassword123", "test@example.com");
            userId = user.id;
        });
        it("should change password successfully", async () => {
            await authService.changePassword(userId, "OldPassword123", "NewPassword456");
            // Should be able to login with new password
            const result = await authService.login("testuser", "NewPassword456");
            expect(result.user.id).toBe(userId);
        });
        it("should reject old password after change", async () => {
            await authService.changePassword(userId, "OldPassword123", "NewPassword456");
            await expect(authService.login("testuser", "OldPassword123")).rejects.toThrow("Invalid credentials");
        });
        it("should reject change with incorrect old password", async () => {
            await expect(authService.changePassword(userId, "WrongOldPassword123", "NewPassword456")).rejects.toThrow("Invalid current password");
        });
        it("should validate new password strength", async () => {
            await expect(authService.changePassword(userId, "OldPassword123", "weak")).rejects.toThrow("Password must be at least 12 characters");
        });
        it("should invalidate all sessions after password change", async () => {
            // Create multiple sessions
            const result1 = await authService.login("testuser", "OldPassword123");
            const result2 = await authService.login("testuser", "OldPassword123");
            await authService.changePassword(userId, "OldPassword123", "NewPassword456");
            // Both sessions should be invalid
            expect(authService.validateSession(result1.session.id)).toBeNull();
            expect(authService.validateSession(result2.session.id)).toBeNull();
        });
        it("should log password change event", async () => {
            await authService.changePassword(userId, "OldPassword123", "NewPassword456");
            const logs = auditLogger.getAllLogs();
            const passwordChangeLog = logs.find((log) => log.eventType === "user.password_change" && log.success === true);
            expect(passwordChangeLog).toBeDefined();
            expect(passwordChangeLog?.userId).toBe(userId.toString());
        });
        it("should log failed password change attempts", async () => {
            try {
                await authService.changePassword(userId, "WrongOldPassword123", "NewPassword456");
            }
            catch {
                // Expected to fail
            }
            const logs = auditLogger.getAllLogs();
            const failedLog = logs.find((log) => log.eventType === "user.password_change" && log.success === false);
            expect(failedLog).toBeDefined();
            expect(failedLog?.details).toMatchObject({
                reason: "Invalid current password",
            });
        });
    });
    describe("cleanupExpiredSessions()", () => {
        it("should delete expired sessions", async () => {
            // Create multiple sessions
            const db = auditLogger.getDb();
            await authService.register("user1", "SecurePass123", "user1@example.com");
            await authService.register("user2", "SecurePass456", "user2@example.com");
            const result1 = await authService.login("user1", "SecurePass123");
            const result2 = await authService.login("user2", "SecurePass456");
            // Manually expire one session (use SQLite datetime format that's definitely in the past)
            db.prepare("UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = ?").run(result1.session.id);
            const deletedCount = authService.cleanupExpiredSessions();
            expect(deletedCount).toBe(1);
            expect(sessionRepository.findById(result1.session.id)).toBeNull();
            expect(sessionRepository.findById(result2.session.id)).not.toBeNull();
        });
        it("should return 0 if no expired sessions", () => {
            const deletedCount = authService.cleanupExpiredSessions();
            expect(deletedCount).toBe(0);
        });
        it("should log cleanup event if sessions deleted", async () => {
            const db = auditLogger.getDb();
            await authService.register("user1", "SecurePass123", "user1@example.com");
            const result = await authService.login("user1", "SecurePass123");
            // Expire the session (use SQLite datetime format that's definitely in the past)
            db.prepare("UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = ?").run(result.session.id);
            authService.cleanupExpiredSessions();
            const logs = auditLogger.getAllLogs();
            const cleanupLog = logs.find((log) => log.eventType === "session.cleanup");
            expect(cleanupLog).toBeDefined();
            expect(cleanupLog?.details).toMatchObject({ deletedCount: 1 });
        });
    });
    describe("Security - Password Hashing", () => {
        it("should never store passwords in plaintext", async () => {
            const { user } = await authService.register("testuser", "SecurePass123", "test@example.com");
            expect(user.passwordHash).not.toContain("SecurePass");
            expect(user.passwordHash).not.toBe("SecurePass123");
            expect(user.passwordHash.length).toBeGreaterThan(32); // Scrypt produces 64-byte hash (128 hex chars)
        });
        it("should use random salt for each user", async () => {
            const { user: user1 } = await authService.register("user1", "SamePassword123", "user1@example.com");
            const { user: user2 } = await authService.register("user2", "SamePassword123", "user2@example.com");
            expect(user1.passwordSalt).not.toBe(user2.passwordSalt);
            expect(user1.passwordHash).not.toBe(user2.passwordHash);
        });
        it("should produce consistent hash for same password+salt", async () => {
            const { user } = await authService.register("testuser", "SecurePass123", "test@example.com");
            const originalHash = user.passwordHash;
            // Login multiple times should verify against same hash
            await authService.login("testuser", "SecurePass123");
            await authService.login("testuser", "SecurePass123");
            const userAfter = userRepository.findById(user.id);
            expect(userAfter?.passwordHash).toBe(originalHash);
        });
    });
    describe("Security - Session Management", () => {
        it("should generate UUID session IDs", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result = await authService.login("testuser", "SecurePass123");
            // UUID format: 8-4-4-4-12 hex chars
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(result.session.id).toMatch(uuidRegex);
        });
        it("should generate unique session IDs", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result1 = await authService.login("testuser", "SecurePass123");
            const result2 = await authService.login("testuser", "SecurePass123");
            expect(result1.session.id).not.toBe(result2.session.id);
        });
        it("should enforce 24-hour session expiration", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result = await authService.login("testuser", "SecurePass123");
            const expiresAt = new Date(result.session.expiresAt);
            const now = new Date();
            const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
            expect(diffHours).toBeGreaterThanOrEqual(23.99); // Allow for execution time
            expect(diffHours).toBeLessThanOrEqual(24.01);
        });
    });
    describe("Remember Me and Session Persistence", () => {
        it("should create session with Remember Me flag", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result = await authService.login("testuser", "SecurePass123", true);
            expect(result.session.rememberMe).toBe(true);
        });
        it("should create 30-day session when Remember Me is enabled", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const beforeLogin = Date.now();
            const result = await authService.login("testuser", "SecurePass123", true);
            const afterLogin = Date.now();
            const sessionExpiry = new Date(result.session.expiresAt).getTime();
            const expectedMin = beforeLogin + 30 * 24 * 60 * 60 * 1000;
            const expectedMax = afterLogin + 30 * 24 * 60 * 60 * 1000;
            expect(sessionExpiry).toBeGreaterThanOrEqual(expectedMin);
            expect(sessionExpiry).toBeLessThanOrEqual(expectedMax);
        });
        it("should handle Remember Me without persistence handler gracefully", async () => {
            // authService created without sessionPersistence handler
            await authService.register("testuser", "SecurePass123", "test@example.com");
            // Should not throw even though persistence handler is not configured
            const result = await authService.login("testuser", "SecurePass123", true);
            expect(result.session.rememberMe).toBe(true);
        });
        it("should always generate new session ID on login (prevent session fixation)", async () => {
            await authService.register("testuser", "SecurePass123", "test@example.com");
            const result1 = await authService.login("testuser", "SecurePass123");
            const result2 = await authService.login("testuser", "SecurePass123");
            // Each login MUST generate a new session ID
            expect(result1.session.id).not.toBe(result2.session.id);
            // Both should be valid UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(result1.session.id).toMatch(uuidRegex);
            expect(result2.session.id).toMatch(uuidRegex);
        });
        it("should restore persisted session returns null without handler", async () => {
            // No persistence handler configured
            const result = await authService.restorePersistedSession();
            expect(result).toBeNull();
        });
        describe("with mock persistence handler", () => {
            let mockPersistenceHandler;
            let authServiceWithPersistence;
            beforeEach(() => {
                // Create mock persistence handler
                mockPersistenceHandler = {
                    storeSessionId: vi.fn().mockResolvedValue(undefined),
                    retrieveSessionId: vi.fn().mockResolvedValue(null),
                    clearSession: vi.fn().mockResolvedValue(undefined),
                    hasStoredSession: vi.fn().mockResolvedValue(false),
                    isAvailable: vi.fn().mockResolvedValue(true),
                };
                authServiceWithPersistence = new AuthenticationService(userRepository, sessionRepository, auditLogger, mockPersistenceHandler);
            });
            it("should store session when Remember Me is enabled", async () => {
                await authServiceWithPersistence.register("testuser", "SecurePass123", "test@example.com");
                const result = await authServiceWithPersistence.login("testuser", "SecurePass123", true);
                expect(mockPersistenceHandler.isAvailable).toHaveBeenCalled();
                expect(mockPersistenceHandler.storeSessionId).toHaveBeenCalledWith(result.session.id);
            });
            it("should not store session when Remember Me is disabled", async () => {
                await authServiceWithPersistence.register("testuser", "SecurePass123", "test@example.com");
                await authServiceWithPersistence.login("testuser", "SecurePass123", false);
                expect(mockPersistenceHandler.storeSessionId).not.toHaveBeenCalled();
            });
            it("should clear persisted session on logout", async () => {
                await authServiceWithPersistence.register("testuser", "SecurePass123", "test@example.com");
                const result = await authServiceWithPersistence.login("testuser", "SecurePass123", true);
                await authServiceWithPersistence.logout(result.session.id);
                expect(mockPersistenceHandler.clearSession).toHaveBeenCalled();
            });
            it("should restore valid persisted session", async () => {
                const { user } = await authServiceWithPersistence.register("testuser", "SecurePass123", "test@example.com");
                const loginResult = await authServiceWithPersistence.login("testuser", "SecurePass123", true);
                // Mock that there's a stored session
                mockPersistenceHandler.hasStoredSession.mockResolvedValue(true);
                mockPersistenceHandler.retrieveSessionId.mockResolvedValue(loginResult.session.id);
                const restored = await authServiceWithPersistence.restorePersistedSession();
                expect(restored).not.toBeNull();
                expect(restored?.user.id).toBe(user.id);
                expect(restored?.session.id).toBe(loginResult.session.id);
            });
            it("should clear expired persisted session", async () => {
                const db = auditLogger.getDb();
                await authServiceWithPersistence.register("testuser", "SecurePass123", "test@example.com");
                const loginResult = await authServiceWithPersistence.login("testuser", "SecurePass123", true);
                // Expire the session
                db.prepare("UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = ?").run(loginResult.session.id);
                // Mock that there's a stored session
                mockPersistenceHandler.hasStoredSession.mockResolvedValue(true);
                mockPersistenceHandler.retrieveSessionId.mockResolvedValue(loginResult.session.id);
                const restored = await authServiceWithPersistence.restorePersistedSession();
                expect(restored).toBeNull();
                expect(mockPersistenceHandler.clearSession).toHaveBeenCalled();
            });
        });
    });
    describe("Edge Cases", () => {
        it("should handle empty username gracefully", async () => {
            await expect(authService.register("", "SecurePass123", "test@example.com")).rejects.toThrow();
        });
        it("should handle empty password gracefully", async () => {
            await expect(authService.register("testuser", "", "test@example.com")).rejects.toThrow("Password must be at least 12 characters");
        });
        it("should handle empty email gracefully", async () => {
            // Registration might succeed but findByEmail would fail
            // This tests repository constraint handling
            const { user } = await authService.register("testuser", "SecurePass123", "");
            expect(user).toBeDefined();
        });
        it("should handle very long passwords", async () => {
            const longPassword = "A1" + "a".repeat(1000); // 1002 chars
            const { user } = await authService.register("testuser", longPassword, "test@example.com");
            expect(user).toBeDefined();
            await expect(authService.login("testuser", longPassword)).resolves.toBeDefined();
        });
        it("should handle special characters in password", async () => {
            const specialPassword = createSpecialCharacterPassword();
            const { user } = await authService.register("testuser", specialPassword, "test@example.com");
            expect(user).toBeDefined();
            await expect(authService.login("testuser", specialPassword)).resolves.toBeDefined();
        });
    });
});

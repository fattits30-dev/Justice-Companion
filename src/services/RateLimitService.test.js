import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimitService } from "./RateLimitService.ts";
describe("RateLimitService", () => {
    let service;
    beforeEach(() => {
        // Clear mocks before each test
        vi.clearAllMocks();
        // Reset singleton instance before each test
        RateLimitService.resetInstance();
        service = RateLimitService.getInstance();
    });
    afterEach(() => {
        // Clean up after each test
        service.destroy();
        vi.clearAllTimers();
    });
    describe("Singleton Pattern", () => {
        it("should return the same instance", () => {
            const instance1 = RateLimitService.getInstance();
            const instance2 = RateLimitService.getInstance();
            expect(instance1).toBe(instance2);
        });
        it("should create new instance after reset", () => {
            const instance1 = RateLimitService.getInstance();
            RateLimitService.resetInstance();
            const instance2 = RateLimitService.getInstance();
            expect(instance1).not.toBe(instance2);
        });
    });
    describe("Rate Limiting", () => {
        it("should allow first login attempt", () => {
            const result = service.checkRateLimit("testuser");
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(5);
        });
        it("should track failed attempts", () => {
            service.recordFailedAttempt("testuser");
            const result = service.checkRateLimit("testuser");
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(4);
        });
        it("should lock account after 5 failed attempts", () => {
            const username = "testuser";
            // Record 5 failed attempts
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            const result = service.checkRateLimit(username);
            expect(result.allowed).toBe(false);
            expect(result.remainingTime).toBeDefined();
            expect(result.remainingTime).toBeGreaterThan(0);
            expect(result.message).toContain("locked");
        });
        it("should handle case-insensitive usernames", () => {
            service.recordFailedAttempt("TestUser");
            service.recordFailedAttempt("testuser");
            service.recordFailedAttempt("TESTUSER");
            const result = service.checkRateLimit("testUser");
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(2); // 5 - 3 attempts
        });
        it("should clear attempts on successful login", () => {
            const username = "testuser";
            // Record some failed attempts
            service.recordFailedAttempt(username);
            service.recordFailedAttempt(username);
            // Clear attempts (successful login)
            service.clearAttempts(username);
            // Check should show full attempts available
            const result = service.checkRateLimit(username);
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(5);
        });
    });
    describe("Sliding Window", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });
        it("should reset attempts after window expires", () => {
            const username = "testuser";
            // Record failed attempts
            service.recordFailedAttempt(username);
            service.recordFailedAttempt(username);
            // Move time forward 16 minutes (past the 15-minute window)
            vi.advanceTimersByTime(16 * 60 * 1000);
            // Should be allowed with full attempts
            const result = service.checkRateLimit(username);
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(5);
        });
        it("should maintain count within sliding window", () => {
            const username = "testuser";
            // Record 3 attempts
            service.recordFailedAttempt(username);
            service.recordFailedAttempt(username);
            service.recordFailedAttempt(username);
            // Move forward 10 minutes (still within 15-minute window)
            vi.advanceTimersByTime(10 * 60 * 1000);
            // Should still track the 3 attempts
            const result = service.checkRateLimit(username);
            expect(result.allowed).toBe(true);
            expect(result.attemptsRemaining).toBe(2); // 5 - 3
        });
        it("should unlock account after lock duration expires", () => {
            const username = "testuser";
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            // Verify locked
            let result = service.checkRateLimit(username);
            expect(result.allowed).toBe(false);
            // Move forward 16 minutes (past lock duration)
            vi.advanceTimersByTime(16 * 60 * 1000);
            // Should be unlocked
            result = service.checkRateLimit(username);
            expect(result.allowed).toBe(true);
        });
    });
    describe("Cleanup Mechanism", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });
        it("should clean up expired entries automatically", () => {
            // Add some attempts
            service.recordFailedAttempt("user1");
            service.recordFailedAttempt("user2");
            // Get initial statistics
            let stats = service.getStatistics();
            expect(stats.totalTrackedUsers).toBe(2);
            // Move time forward past window and cleanup interval
            vi.advanceTimersByTime(20 * 60 * 1000);
            // Force cleanup by checking rate limit (triggers cleanup)
            service.checkRateLimit("user3");
            // Check that old entries were cleaned
            stats = service.getStatistics();
            expect(stats.activeAttempts).toBe(0);
        });
        it("should not clean up locked accounts prematurely", () => {
            const username = "lockeduser";
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            // Move forward 5 minutes
            vi.advanceTimersByTime(5 * 60 * 1000);
            // Trigger cleanup
            service.checkRateLimit("otheruser");
            // Locked account should still be tracked
            expect(service.isLocked(username)).toBe(true);
        });
    });
    describe("Security Logging", () => {
        let consoleLogSpy;
        let consoleWarnSpy;
        let consoleErrorSpy;
        beforeEach(() => {
            consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
            consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        });
        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
        it("should log when account is locked", () => {
            const username = "testuser";
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            // Structured logger combines all args into single formatted string
            expect(consoleErrorSpy).toHaveBeenCalled();
            const lastCall = consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1][0];
            expect(lastCall).toContain("BRUTE FORCE DETECTED for testuser");
        });
        it("should log rate limit violations", () => {
            const username = "testuser";
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            // Try to login while locked
            service.checkRateLimit(username);
            // Structured logger combines all args into single formatted string
            expect(consoleWarnSpy).toHaveBeenCalled();
            const lastCall = consoleWarnSpy.mock.calls[consoleWarnSpy.mock.calls.length - 1][0];
            expect(lastCall).toContain("Rate limit exceeded for testuser");
        });
    });
    describe("Helper Methods", () => {
        it("should correctly report attempt count", () => {
            const username = "testuser";
            expect(service.getAttemptCount(username)).toBe(0);
            service.recordFailedAttempt(username);
            expect(service.getAttemptCount(username)).toBe(1);
            service.recordFailedAttempt(username);
            expect(service.getAttemptCount(username)).toBe(2);
            service.clearAttempts(username);
            expect(service.getAttemptCount(username)).toBe(0);
        });
        it("should correctly check if account is locked", () => {
            const username = "testuser";
            expect(service.isLocked(username)).toBe(false);
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            expect(service.isLocked(username)).toBe(true);
        });
        it("should provide accurate statistics", () => {
            // Add various attempts
            service.recordFailedAttempt("user1");
            service.recordFailedAttempt("user2");
            service.recordFailedAttempt("user2");
            // Lock one account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt("lockeduser");
            }
            const stats = service.getStatistics();
            expect(stats.totalTrackedUsers).toBe(3);
            expect(stats.lockedAccounts).toBe(1);
            expect(stats.activeAttempts).toBe(3); // All are within window
        });
    });
    describe("Edge Cases", () => {
        it("should handle empty username gracefully", () => {
            const result = service.checkRateLimit("");
            expect(result.allowed).toBe(true);
            service.recordFailedAttempt("");
            expect(service.getAttemptCount("")).toBe(1);
        });
        it("should handle whitespace in usernames", () => {
            service.recordFailedAttempt("  testuser  ");
            service.recordFailedAttempt("testuser");
            const result = service.checkRateLimit("testuser");
            expect(result.attemptsRemaining).toBe(3); // 5 - 2
        });
        it("should handle rapid successive attempts", () => {
            const username = "testuser";
            // Simulate rapid attempts
            for (let i = 0; i < 10; i++) {
                service.recordFailedAttempt(username);
            }
            // Should be locked after 5
            expect(service.isLocked(username)).toBe(true);
            expect(service.getAttemptCount(username)).toBe(5);
        });
        it("should not increment count when already locked", () => {
            const username = "testuser";
            // Lock the account
            for (let i = 0; i < 5; i++) {
                service.recordFailedAttempt(username);
            }
            // Try more attempts while locked
            service.recordFailedAttempt(username);
            service.recordFailedAttempt(username);
            // Count should remain at 5
            expect(service.getAttemptCount(username)).toBe(5);
        });
    });
});

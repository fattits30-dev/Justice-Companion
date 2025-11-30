import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthorizationMiddleware, AuthorizationError, } from "./AuthorizationMiddleware";
// Mock dependencies
vi.mock("../repositories/CaseRepository.ts");
vi.mock("../services/AuditLogger.ts");
describe("AuthorizationMiddleware", () => {
    let authMiddleware;
    let mockCaseRepository;
    let mockAuditLogger;
    // Test fixtures
    const createMockUser = (overrides = {}) => ({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hash",
        passwordSalt: "salt",
        role: "user",
        isActive: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        lastLoginAt: "2025-01-01T00:00:00.000Z",
        ...overrides,
    });
    const createMockCase = (overrides = {}) => ({
        id: 1,
        title: "Test Case",
        description: "Test description",
        caseType: "employment",
        status: "active",
        userId: 1,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        ...overrides,
    });
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        // Create mock instances
        mockCaseRepository = {
            findById: vi.fn(),
        };
        mockAuditLogger = {
            log: vi.fn(),
        };
        // Create middleware instance
        authMiddleware = new AuthorizationMiddleware(mockCaseRepository, mockAuditLogger);
    });
    describe("verifyCaseOwnership", () => {
        it("should pass when case exists and user is owner", () => {
            const mockCase = createMockCase({ id: 123, userId: 456 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).not.toThrow();
            expect(mockCaseRepository.findById).toHaveBeenCalledWith(123);
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should pass when case has null userId for backward compatibility", () => {
            const mockCase = createMockCase({ id: 123, userId: null });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).not.toThrow();
            expect(mockCaseRepository.findById).toHaveBeenCalledWith(123);
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should throw AuthorizationError when case does not exist", () => {
            mockCaseRepository.findById.mockReturnValue(null);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).toThrow(AuthorizationError);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).toThrow("Case not found");
            expect(mockCaseRepository.findById).toHaveBeenCalledWith(123);
        });
        it("should log audit event when case does not exist", () => {
            mockCaseRepository.findById.mockReturnValue(null);
            try {
                authMiddleware.verifyCaseOwnership(123, 456);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith({
                eventType: "authorization.denied",
                userId: "456",
                resourceType: "case",
                resourceId: "123",
                action: "read",
                success: false,
                details: { reason: "Case not found" },
            });
        });
        it("should throw AuthorizationError when user is not owner", () => {
            const mockCase = createMockCase({ id: 123, userId: 789 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).toThrow(AuthorizationError);
            expect(() => {
                authMiddleware.verifyCaseOwnership(123, 456);
            }).toThrow("Access denied: you do not own this case");
            expect(mockCaseRepository.findById).toHaveBeenCalledWith(123);
        });
        it("should log audit event when user is not owner", () => {
            const mockCase = createMockCase({ id: 123, userId: 789 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            try {
                authMiddleware.verifyCaseOwnership(123, 456);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith({
                eventType: "authorization.denied",
                userId: "456",
                resourceType: "case",
                resourceId: "123",
                action: "read",
                success: false,
                details: {
                    reason: "Not owner",
                    ownerId: 789,
                },
            });
        });
        it("should work without audit logger (optional dependency)", () => {
            const middlewareWithoutLogger = new AuthorizationMiddleware(mockCaseRepository);
            mockCaseRepository.findById.mockReturnValue(null);
            expect(() => {
                middlewareWithoutLogger.verifyCaseOwnership(123, 456);
            }).toThrow(AuthorizationError);
            // Should not crash even though logger is undefined
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
    });
    describe("verifyAdminRole", () => {
        it("should pass when user has admin role", () => {
            const adminUser = createMockUser({ id: 1, role: "admin" });
            expect(() => {
                authMiddleware.verifyAdminRole(adminUser);
            }).not.toThrow();
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should throw AuthorizationError when user is not admin", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                authMiddleware.verifyAdminRole(regularUser);
            }).toThrow(AuthorizationError);
            expect(() => {
                authMiddleware.verifyAdminRole(regularUser);
            }).toThrow("Access denied: admin role required");
        });
        it("should log audit event when user is not admin", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            try {
                authMiddleware.verifyAdminRole(regularUser);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith({
                eventType: "authorization.denied",
                userId: "1",
                resourceType: "admin",
                resourceId: "system",
                action: "read",
                success: false,
                details: {
                    reason: "Not admin",
                    role: "user",
                },
            });
        });
        it("should work without audit logger (optional dependency)", () => {
            const middlewareWithoutLogger = new AuthorizationMiddleware(mockCaseRepository);
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                middlewareWithoutLogger.verifyAdminRole(regularUser);
            }).toThrow(AuthorizationError);
            // Should not crash even though logger is undefined
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
    });
    describe("verifyUserActive", () => {
        it("should pass when user is active", () => {
            const activeUser = createMockUser({ id: 1, isActive: true });
            expect(() => {
                authMiddleware.verifyUserActive(activeUser);
            }).not.toThrow();
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should throw AuthorizationError when user is not active", () => {
            const inactiveUser = createMockUser({ id: 1, isActive: false });
            expect(() => {
                authMiddleware.verifyUserActive(inactiveUser);
            }).toThrow(AuthorizationError);
            expect(() => {
                authMiddleware.verifyUserActive(inactiveUser);
            }).toThrow("Account is inactive");
        });
        it("should log audit event when user is not active", () => {
            const inactiveUser = createMockUser({ id: 1, isActive: false });
            try {
                authMiddleware.verifyUserActive(inactiveUser);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith({
                eventType: "authorization.denied",
                userId: "1",
                resourceType: "user",
                resourceId: "1",
                action: "read",
                success: false,
                details: { reason: "User inactive" },
            });
        });
        it("should work without audit logger (optional dependency)", () => {
            const middlewareWithoutLogger = new AuthorizationMiddleware(mockCaseRepository);
            const inactiveUser = createMockUser({ id: 1, isActive: false });
            expect(() => {
                middlewareWithoutLogger.verifyUserActive(inactiveUser);
            }).toThrow(AuthorizationError);
            // Should not crash even though logger is undefined
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
    });
    describe("verifyCanModifyUser", () => {
        it("should pass when user modifies themselves", () => {
            const user = createMockUser({ id: 1, role: "user" });
            expect(() => {
                authMiddleware.verifyCanModifyUser(user, 1);
            }).not.toThrow();
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should pass when admin modifies another user", () => {
            const adminUser = createMockUser({ id: 1, role: "admin" });
            expect(() => {
                authMiddleware.verifyCanModifyUser(adminUser, 999);
            }).not.toThrow();
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should pass when admin modifies themselves", () => {
            const adminUser = createMockUser({ id: 1, role: "admin" });
            expect(() => {
                authMiddleware.verifyCanModifyUser(adminUser, 1);
            }).not.toThrow();
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
        it("should throw AuthorizationError when non-admin tries to modify another user", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                authMiddleware.verifyCanModifyUser(regularUser, 2);
            }).toThrow(AuthorizationError);
            expect(() => {
                authMiddleware.verifyCanModifyUser(regularUser, 2);
            }).toThrow("Access denied: you can only modify your own account");
        });
        it("should log audit event when non-admin tries to modify another user", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            try {
                authMiddleware.verifyCanModifyUser(regularUser, 999);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith({
                eventType: "authorization.denied",
                userId: "1",
                resourceType: "user",
                resourceId: "999",
                action: "update",
                success: false,
                details: {
                    reason: "Cannot modify other users",
                    role: "user",
                },
            });
        });
        it("should work without audit logger (optional dependency)", () => {
            const middlewareWithoutLogger = new AuthorizationMiddleware(mockCaseRepository);
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                middlewareWithoutLogger.verifyCanModifyUser(regularUser, 2);
            }).toThrow(AuthorizationError);
            // Should not crash even though logger is undefined
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
    });
    describe("AuthorizationError", () => {
        it("should be an instance of Error", () => {
            const error = new AuthorizationError("Test message");
            expect(error).toBeInstanceOf(Error);
        });
        it("should have correct name property", () => {
            const error = new AuthorizationError("Test message");
            expect(error.name).toBe("AuthorizationError");
        });
        it("should have correct message property", () => {
            const error = new AuthorizationError("Test message");
            expect(error.message).toBe("Test message");
        });
        it("should be catchable as specific error type", () => {
            try {
                throw new AuthorizationError("Test");
            }
            catch (error) {
                expect(error).toBeInstanceOf(AuthorizationError);
                if (error instanceof AuthorizationError) {
                    expect(error.name).toBe("AuthorizationError");
                }
            }
        });
    });
    describe("Edge Cases", () => {
        it("should handle zero IDs correctly", () => {
            const mockCase = createMockCase({ id: 0, userId: 0 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(0, 0);
            }).not.toThrow();
        });
        it("should handle negative IDs correctly", () => {
            const mockCase = createMockCase({ id: -1, userId: -1 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(-1, -1);
            }).not.toThrow();
        });
        it("should handle very large IDs correctly", () => {
            const largeId = Number.MAX_SAFE_INTEGER;
            const mockCase = createMockCase({ id: largeId, userId: largeId });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            expect(() => {
                authMiddleware.verifyCaseOwnership(largeId, largeId);
            }).not.toThrow();
        });
        it("should convert numeric IDs to strings in audit logs", () => {
            const mockCase = createMockCase({ id: 12345, userId: 67890 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            try {
                authMiddleware.verifyCaseOwnership(12345, 99999);
            }
            catch {
                // Expected to throw
            }
            expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                userId: "99999",
                resourceId: "12345",
            }));
        });
    });
    describe("Security Scenarios", () => {
        it("should prevent horizontal privilege escalation (user accessing another user data)", () => {
            const mockCase = createMockCase({ id: 1, userId: 100 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            // User 200 trying to access user 100's case
            expect(() => {
                authMiddleware.verifyCaseOwnership(1, 200);
            }).toThrow(AuthorizationError);
        });
        it("should prevent vertical privilege escalation (regular user accessing admin features)", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                authMiddleware.verifyAdminRole(regularUser);
            }).toThrow(AuthorizationError);
        });
        it("should prevent inactive users from accessing resources", () => {
            const inactiveUser = createMockUser({ id: 1, isActive: false });
            expect(() => {
                authMiddleware.verifyUserActive(inactiveUser);
            }).toThrow(AuthorizationError);
        });
        it("should prevent non-admin users from modifying other users", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            expect(() => {
                authMiddleware.verifyCanModifyUser(regularUser, 999);
            }).toThrow(AuthorizationError);
        });
        it("should allow admins to perform all admin operations", () => {
            const adminUser = createMockUser({ id: 1, role: "admin" });
            expect(() => {
                authMiddleware.verifyAdminRole(adminUser);
            }).not.toThrow();
            expect(() => {
                authMiddleware.verifyCanModifyUser(adminUser, 999);
            }).not.toThrow();
        });
    });
    describe("Audit Logging Coverage", () => {
        it("should audit all authorization failures for case ownership", () => {
            // Case not found
            mockCaseRepository.findById.mockReturnValue(null);
            try {
                authMiddleware.verifyCaseOwnership(1, 1);
            }
            catch {
                // Expected
            }
            expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
            vi.clearAllMocks();
            // Not owner
            mockCaseRepository.findById.mockReturnValue(createMockCase({ id: 1, userId: 2 }));
            try {
                authMiddleware.verifyCaseOwnership(1, 1);
            }
            catch {
                // Expected
            }
            expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
        });
        it("should audit admin role failures", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            try {
                authMiddleware.verifyAdminRole(regularUser);
            }
            catch {
                // Expected
            }
            expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
            expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventType: "authorization.denied",
                resourceType: "admin",
            }));
        });
        it("should audit inactive user failures", () => {
            const inactiveUser = createMockUser({ id: 1, isActive: false });
            try {
                authMiddleware.verifyUserActive(inactiveUser);
            }
            catch {
                // Expected
            }
            expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
            expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventType: "authorization.denied",
                details: { reason: "User inactive" },
            }));
        });
        it("should audit user modification failures", () => {
            const regularUser = createMockUser({ id: 1, role: "user" });
            try {
                authMiddleware.verifyCanModifyUser(regularUser, 2);
            }
            catch {
                // Expected
            }
            expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
            expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventType: "authorization.denied",
                action: "update",
            }));
        });
        it("should not audit successful authorizations", () => {
            const adminUser = createMockUser({ id: 1, role: "admin" });
            const activeUser = createMockUser({ id: 1, isActive: true });
            const mockCase = createMockCase({ id: 1, userId: 1 });
            mockCaseRepository.findById.mockReturnValue(mockCase);
            authMiddleware.verifyCaseOwnership(1, 1);
            authMiddleware.verifyAdminRole(adminUser);
            authMiddleware.verifyUserActive(activeUser);
            authMiddleware.verifyCanModifyUser(adminUser, 999);
            expect(mockAuditLogger.log).not.toHaveBeenCalled();
        });
    });
});

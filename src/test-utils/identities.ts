/**
 * Test utilities for identity generation and validation
 */

/**
 * Generate a test user identity
 */
export function generateTestUserIdentity() {
  return {
    id: "test-user-123",
    username: "testuser",
    email: "test@example.com",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

/**
 * Generate a test session identity
 */
export function generateTestSessionIdentity() {
  return {
    id: "test-session-456",
    userId: "test-user-123",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  };
}

/**
 * Generate test case identity
 */
export function generateTestCaseIdentity() {
  return {
    id: 123,
    title: "Test Case",
    description: "A test case for unit testing",
    caseType: "employment",
    status: "active",
    userId: "test-user-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

/**
 * Generate a test display name
 */
export function generateTestDisplayName(prefix?: string): string {
  return prefix ? `${prefix} User` : "Test User";
}

/**
 * Generate a test email address
 */
export function generateTestEmail(): string {
  return "test@example.com";
}

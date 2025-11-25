/**
 * Test utilities for identity generation and validation
 */
import { randomUUID } from "node:crypto";

const createTestId = (prefix: string) => `${prefix}-${randomUUID()}`;
const TEST_DATE = new Date("2024-01-01");

/**
 * Generate a test user identity
 */
export function generateTestUserIdentity() {
  const id = createTestId("test-user");
  return {
    id,
    username: `testuser-${id.split("-").at(-1)}`,
    email: generateTestEmail(),
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
  };
}

/**
 * Generate a test session identity
 */
export function generateTestSessionIdentity() {
  const userId = createTestId("test-user");
  return {
    id: createTestId("test-session"),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  };
}

/**
 * Generate test case identity
 */
export function generateTestCaseIdentity() {
  const userId = createTestId("test-user");
  return {
    id: Number.parseInt(
      randomUUID()
        .replace(/[^0-9]/g, "")
        .slice(0, 3) || "0",
      10
    ),
    title: "Test Case",
    description: "A test case for unit testing",
    caseType: "employment",
    status: "active",
    userId,
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
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
export function generateTestEmail(label = "test"): string {
  const sanitizedLabel =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "test";
  return `${sanitizedLabel}.${randomUUID()}@example.test`;
}

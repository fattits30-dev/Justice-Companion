/**
 * E2E Test Configuration
 * Centralized configuration for all E2E tests
 */

export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5176",
  apiURL: process.env.API_URL || "http://127.0.0.1:8000",

  credentials: {
    e2eTest: {
      email: "e2e-test@example.com",
      password: "TestPassword123!",
      firstName: "E2E",
      lastName: "TestUser",
    },
  },

  testDocuments: {
    dismissalLetter: "test-documents/01-dismissal-letter.txt",
    emailChain: "test-documents/02-email-chain.txt",
    appealLetter: "test-documents/03-appeal-letter.txt",
    grievance: "test-documents/04-grievance-original.txt",
  },

  timeouts: {
    navigation: 30000,
    action: 10000,
    upload: 60000,
    analysis: 120000,
  },
};

/**
 * Get full URL for a path
 */
export function getURL(path: string): string {
  const base = TEST_CONFIG.baseURL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Generate a secure test password
 */
export function generateTestPassword(): string {
  const timestamp = Date.now();
  return `Test${timestamp}Pass!`;
}

/**
 * Generate unique test user data
 */
export function generateTestUser() {
  const timestamp = Date.now();
  return {
    firstName: `Test${timestamp}`,
    lastName: "User",
    email: `test${timestamp}@example.com`,
    password: generateTestPassword(),
  };
}

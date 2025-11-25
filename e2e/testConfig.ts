/**
 * E2E Test Configuration
 * Centralized configuration for all E2E tests
 */

const deterministicPassword =
  process.env.DETERMINISTIC_E2E_PASSWORD || generateTestPassword();

const deterministicE2EUser = {
  username: "e2e-test",
  email: "e2e-test@example.com",
  password: deterministicPassword,
  firstName: "E2E",
  lastName: "Tester",
};

export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5178",
  apiURL: process.env.API_URL || "http://127.0.0.1:8000",

  credentials: {
    e2eTest: {
      username: process.env.TEST_USER_USERNAME || deterministicE2EUser.username,
      email: process.env.TEST_USER_EMAIL || deterministicE2EUser.email,
      password: process.env.TEST_USER_PASSWORD || deterministicE2EUser.password,
      firstName:
        process.env.TEST_USER_FIRST_NAME || deterministicE2EUser.firstName,
      lastName:
        process.env.TEST_USER_LAST_NAME || deterministicE2EUser.lastName,
    },
    demo: {
      username: process.env.DEMO_USER_USERNAME || "demo@example.com",
      password: process.env.DEMO_USER_PASSWORD || generateTestPassword(),
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
 * Generate a secure test password (deterministic for test reliability)
 */
export function generateTestPassword(): string {
  // SECURITY NOTE: This is an intentional test fixture password, not a real credential.
  // It must be deterministic for E2E test reliability and meet password requirements
  // (12+ chars, uppercase, lowercase, number, special char).
  // nosec - test password only
  return "Test123456789!";
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

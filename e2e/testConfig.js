import {
  buildDemoCredentials,
  buildDeterministicUser,
  buildEphemeralTestUser,
  deriveTestPassword,
} from "../tests/helpers/testCredentials.js";

/**
 * E2E Test Configuration
 * Centralized configuration for all E2E tests
 */
const deterministicE2EUser = buildDeterministicUser({
  username: process.env.TEST_USER_USERNAME,
  email: process.env.TEST_USER_EMAIL,
  firstName: process.env.TEST_USER_FIRST_NAME,
  lastName: process.env.TEST_USER_LAST_NAME,
  password:
    process.env.TEST_USER_PASSWORD ?? process.env.DETERMINISTIC_E2E_PASSWORD,
});
const demoCredentials = buildDemoCredentials({
  username: process.env.DEMO_USER_USERNAME,
  password: process.env.DEMO_USER_PASSWORD,
});
export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5178",
  apiURL: process.env.API_URL || "http://127.0.0.1:8000",
  credentials: {
    e2eTest: deterministicE2EUser,
    demo: demoCredentials,
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
export function getURL(path) {
  const base = TEST_CONFIG.baseURL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
/**
 * Generate a secure test password (deterministic for test reliability)
 */
export function generateTestPassword(label = "default") {
  // SECURITY NOTE: Deterministic test credential derived from a non-production seed.
  // nosec - test password only
  return deriveTestPassword(label);
}
/**
 * Generate unique test user data
 */
export function generateTestUser() {
  const timestamp = Date.now();
  const ephemeralUser = buildEphemeralTestUser("pw-user", { timestamp });
  return {
    firstName: `Test${timestamp}`,
    lastName: "User",
    email: ephemeralUser.email,
    password: ephemeralUser.password,
  };
}

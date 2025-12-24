/**
 * Test Credentials Helpers
 *
 * Helper functions for generating deterministic test users and passwords.
 * Used in integration tests to create consistent test data.
 */

const crypto = require("node:crypto");

/**
 * Derives a deterministic test password from a seed string.
 * Creates a password that meets the application's requirements:
 * - At least 12 characters
 * - Contains uppercase, lowercase, and numbers
 *
 * @param {string} seed - The seed string to derive the password from
 * @returns {string} A valid password string
 */
function deriveTestPassword(seed) {
  // Create a hash from the seed
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  // Take first 8 chars of hash and build a valid password
  // Format: Abc12345Xyz (uppercase + lowercase + numbers)
  const prefix = hash.slice(0, 4).toUpperCase();
  const middle = hash.slice(4, 8).toLowerCase();
  const suffix = "12Aa"; // Ensure we have numbers and mixed case
  return `${prefix}${middle}${suffix}`;
}

/**
 * Builds a deterministic test user object from options.
 *
 * @param {Object} options - User options
 * @param {string} options.username - The username to use
 * @param {string} [options.seed] - The seed string for password generation (defaults to username)
 * @param {string} [options.password] - Explicit password (overrides derived password)
 * @param {string} [options.email] - Optional email (derived from username if not provided)
 * @param {string} [options.firstName] - Optional first name
 * @param {string} [options.lastName] - Optional last name
 * @returns {Object} A user object with username, password, and email
 */
function buildDeterministicUser(options) {
  const { username, seed, password, email, firstName, lastName } = options;
  return {
    username,
    password: password || deriveTestPassword(seed || username),
    email: email || `${username}@test.example.com`,
    firstName: firstName || "Test",
    lastName: lastName || "User",
  };
}

/**
 * Builds demo credentials from environment variables.
 *
 * @param {Object} options - Credential options
 * @param {string} options.username - Demo username
 * @param {string} options.password - Demo password
 * @returns {Object} Credential object with username and password
 */
function buildDemoCredentials(options) {
  const { username, password } = options;
  return {
    username: username || "demo",
    password: password || "Demo123!",
  };
}

/**
 * Builds an ephemeral test user with unique timestamp-based credentials.
 *
 * @param {string} prefix - Username prefix
 * @param {Object} options - User options
 * @param {number} [options.timestamp] - Timestamp for uniqueness (defaults to Date.now())
 * @returns {Object} A user object with unique username, password, and email
 */
function buildEphemeralTestUser(prefix, options = {}) {
  const { timestamp } = options;
  const ts = timestamp || Date.now();
  const username = `${prefix}-${ts}`;
  return {
    username,
    password: deriveTestPassword(username),
    email: `${username}@test.example.com`,
    firstName: "Test",
    lastName: "User",
  };
}

module.exports = {
  deriveTestPassword,
  buildDeterministicUser,
  buildDemoCredentials,
  buildEphemeralTestUser,
};

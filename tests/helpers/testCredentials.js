import crypto from "node:crypto";

const PASSWORD_SEED =
  process.env.TEST_PASSWORD_SEED ?? "justice-companion-test-seed";
const EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN ?? "example.com";

function buildPasswordParts(seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const prefix = hash.slice(0, 8);
  const infix = hash.slice(8, 12).toUpperCase();
  const suffix = hash.slice(12, 18);
  return `${prefix}${infix}${suffix}`;
}

export function deriveTestPassword(label = "default") {
  const deterministic = buildPasswordParts(`${PASSWORD_SEED}:${label}`);
  return `${deterministic}A!9`;
}

export function buildDeterministicUser(overrides = {}) {
  const username = overrides.username ?? "e2e-test";
  const email = overrides.email ?? `${username}@${EMAIL_DOMAIN}`;
  const firstName = overrides.firstName ?? "E2E";
  const lastName = overrides.lastName ?? "Tester";
  const seed = overrides.seed ?? username;
  const password = overrides.password ?? deriveTestPassword(seed);
  return {
    username,
    email,
    password,
    firstName,
    lastName,
  };
}

export function buildEphemeralTestUser(prefix = "testuser", overrides = {}) {
  const timestamp = overrides.timestamp ?? Date.now();
  const username = overrides.username ?? `${prefix}_${timestamp}`;
  const email = overrides.email ?? `${username}@${EMAIL_DOMAIN}`;
  const seed = overrides.seed ?? `${prefix}:${timestamp}`;
  const password = overrides.password ?? deriveTestPassword(seed);
  return {
    username,
    email,
    password,
  };
}

export function buildDemoCredentials(overrides = {}) {
  const username = overrides.username ?? "demo@example.com";
  const seed = overrides.seed ?? "demo-user";
  const password = overrides.password ?? deriveTestPassword(seed);
  return {
    username,
    password,
  };
}

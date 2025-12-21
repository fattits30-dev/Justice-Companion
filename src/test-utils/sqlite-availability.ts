/**
 * SQLite Native Module Availability Check
 *
 * Detects whether better-sqlite3-multiple-ciphers native bindings are available.
 * On platforms like Android/Termux, native modules may not be compiled.
 */

let sqliteAvailable: boolean | null = null;

/**
 * Check if SQLite native bindings are available on this platform.
 * Caches the result after first check.
 */
export function isSqliteAvailable(): boolean {
  if (sqliteAvailable !== null) {
    return sqliteAvailable;
  }

  try {
    // Attempt to load the native module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3-multiple-ciphers");
    // Try to create an in-memory database to verify bindings work
    const testDb = new Database(":memory:");
    testDb.close();
    sqliteAvailable = true;
  } catch {
    // Native bindings not available (common on Android/Termux)
    sqliteAvailable = false;
  }

  return sqliteAvailable;
}

/**
 * Vitest-compatible skip condition for SQLite-dependent tests.
 * Use with: describe.skipIf(skipIfNoSqlite)(...) or it.skipIf(skipIfNoSqlite)(...)
 */
export const skipIfNoSqlite = !isSqliteAvailable();

/**
 * Get a human-readable reason for why SQLite tests are skipped.
 */
export function getSqliteSkipReason(): string {
  if (isSqliteAvailable()) {
    return "";
  }
  return "SQLite native bindings not available (platform: " + process.platform + ", arch: " + process.arch + ")";
}

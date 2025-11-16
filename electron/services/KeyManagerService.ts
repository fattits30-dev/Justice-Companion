/**
 * Key Manager Service
 *
 * Provides access to the key manager without creating circular dependencies.
 * IPC handlers can import from this service instead of directly from main.ts.
 */

import type { KeyManager } from "../../src/services/KeyManager";

let keyManager: KeyManager | null = null;

/**
 * Set the key manager instance
 * Called from main.ts during app initialization
 */
export function setKeyManager(manager: KeyManager): void {
  keyManager = manager;
}

/**
 * Get the key manager instance
 * Throws if not initialized
 */
export function getKeyManager(): KeyManager {
  if (!keyManager) {
    throw new Error("KeyManager not initialized. Call setKeyManager() first.");
  }
  return keyManager;
}

/**
 * Service Container
 *
 * Provides access to shared services without circular dependencies.
 * Services are initialized once and reused throughout the application.
 */

import type { EncryptionService } from "./EncryptionService.ts";
import type { AuditLogger } from "./AuditLogger.ts";
import type { KeyManager } from "./KeyManager.ts";

let encryptionService: EncryptionService | null = null;
let auditLogger: AuditLogger | null = null;
let keyManager: KeyManager | null = null;

/**
 * Initialize the service container with shared services
 */
export function initializeServiceContainer(
  encService: EncryptionService,
  auditLog: AuditLogger,
  keyMgr: KeyManager,
): void {
  encryptionService = encService;
  auditLogger = auditLog;
  keyManager = keyMgr;
}

/**
 * Get the encryption service instance
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    throw new Error(
      "ServiceContainer not initialized. Call initializeServiceContainer() first.",
    );
  }
  return encryptionService;
}

/**
 * Get the audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  if (!auditLogger) {
    throw new Error(
      "ServiceContainer not initialized. Call initializeServiceContainer() first.",
    );
  }
  return auditLogger;
}

/**
 * Get the key manager instance
 */
export function getKeyManager(): KeyManager {
  if (!keyManager) {
    throw new Error(
      "ServiceContainer not initialized. Call initializeServiceContainer() first.",
    );
  }
  return keyManager;
}

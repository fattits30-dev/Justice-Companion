/**
 * Local-First Storage Layer
 *
 * This module provides the complete local storage infrastructure for Justice Companion.
 * All data is stored in IndexedDB with optional PIN-based encryption.
 *
 * Usage:
 * 1. Initialize database: await openDatabase()
 * 2. Setup/unlock encryption: await setupPin(pin) or await unlockWithPin(pin, hash, salt)
 * 3. Use repositories for CRUD operations
 */

// Database
export {
  openDatabase,
  getDatabase,
  closeDatabase,
  deleteDatabase,
  isDatabaseInitialized,
  getStorageEstimate,
  type JusticeCompanionDB,
} from "./db";

// Encryption
export {
  initializeEncryption,
  isEncryptionInitialized,
  getCurrentSalt,
  clearEncryptionKey,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  setupPin,
  unlockWithPin,
  verifyPin,
  isEncryptedData,
  decryptIfEncrypted,
  type EncryptedData,
} from "./crypto";

// Repositories
export * from "./repositories";

// Backup and Restore
export {
  exportData,
  downloadBackup,
  importData,
  importFromFile,
  deleteAllData,
  getBackupInfo,
  type BackupMetadata,
  type BackupData,
  type ExportOptions,
  type ImportResult,
} from "./backup";

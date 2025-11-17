import { injectable } from "inversify";
import { app, safeStorage } from "electron";
import fs from "fs/promises";
import path from "path";
import { validate as uuidValidate, version as uuidVersion } from "uuid";
import { logger } from "../utils/logger.ts";

/**
 * Service for securely persisting session IDs across app restarts
 * using Electron's safeStorage API (OS keychain integration).
 *
 * Security features:
 * - Uses OS keychain for encryption via safeStorage
 * - Validates UUID format before storage
 * - Never logs decrypted session IDs
 * - Handles encryption unavailability gracefully
 * - Cleans up on logout
 */
@injectable()
export class SessionPersistenceService {
  private static readonly FILE_NAME = "session.enc";
  private static readonly UUID_V4_VERSION = 4;
  private static instance: SessionPersistenceService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of SessionPersistenceService
   */
  public static getInstance(): SessionPersistenceService {
    if (!SessionPersistenceService.instance) {
      SessionPersistenceService.instance = new SessionPersistenceService();
    }
    return SessionPersistenceService.instance;
  }

  /**
   * Get the full path to the encrypted session storage file
   */
  private getStoragePath(): string {
    return path.join(
      app.getPath("userData"),
      SessionPersistenceService.FILE_NAME,
    );
  }

  /**
   * Check if safeStorage encryption is available on this system
   * @returns true if encryption is available, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    try {
      // Check if safeStorage is available and encryption is possible
      if (
        !safeStorage ||
        typeof safeStorage.isEncryptionAvailable !== "function"
      ) {
        logger.warn("SessionPersistence", "safeStorage API not available");
        return false;
      }

      const available = safeStorage.isEncryptionAvailable();

      if (!available) {
        logger.warn(
          "SessionPersistence",
          "Encryption not available (missing OS keychain support)",
        );
      }

      return available;
    } catch (error) {
      logger.error("Error checking encryption availability", {
        service: "SessionPersistence",
        error,
      });
      return false;
    }
  }

  /**
   * Validate that a string is a properly formatted UUID v4
   */
  private isValidSessionId(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== "string") {
      return false;
    }

    // Check UUID v4 format specifically
    if (!uuidValidate(sessionId) || !sessionId.includes("-")) {
      return false;
    }

    // Ensure it's specifically version 4
    try {
      return (
        uuidVersion(sessionId) === SessionPersistenceService.UUID_V4_VERSION
      );
    } catch (error) {
      logger.error("Error validating UUID version", {
        service: "SessionPersistence",
        error,
      });
      return false;
    }
  }

  /**
   * Store an encrypted session ID to disk
   * @param sessionId - UUID v4 session ID to store
   * @throws Error if encryption is unavailable or session ID is invalid
   */
  public async storeSessionId(sessionId: string): Promise<void> {
    try {
      // Validate input
      if (!this.isValidSessionId(sessionId)) {
        throw new Error("Invalid session ID format (expected UUID v4)");
      }

      // Check encryption availability
      const available = await this.isAvailable();
      if (!available) {
        throw new Error("Encryption not available on this system");
      }

      // Encrypt the session ID using safeStorage
      const encrypted = safeStorage.encryptString(sessionId);

      // Get storage path and ensure directory exists atomically (fixes TOCTOU)
      const storagePath = this.getStoragePath();
      const storageDir = path.dirname(storagePath);

      // mkdir with recursive: true is atomic and won't fail if directory exists
      await fs.mkdir(storageDir, { recursive: true });

      // Write encrypted data to file
      await fs.writeFile(storagePath, encrypted);
    } catch (error) {
      logger.error("Failed to store session ID", {
        service: "SessionPersistence",
        error,
      });

      // Clean up any partial writes
      try {
        const storagePath = this.getStoragePath();
        await fs.unlink(storagePath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Retrieve and decrypt a stored session ID
   * @returns Decrypted session ID or null if not found/invalid
   */
  public async retrieveSessionId(): Promise<string | null> {
    try {
      // Check encryption availability
      const available = await this.isAvailable();
      if (!available) {
        logger.warn(
          "SessionPersistence",
          "Cannot retrieve: encryption not available",
        );
        return null;
      }

      const storagePath = this.getStoragePath();

      // Try to read encrypted data directly (fixes TOCTOU race condition)
      let encrypted: Buffer;
      try {
        encrypted = await fs.readFile(storagePath);
      } catch (error: any) {
        // File doesn't exist - this is expected for first login
        if (error.code === "ENOENT") {
          return null;
        }
        // Other errors (permission, etc) should be logged
        logger.error("Failed to read session file", {
          service: "SessionPersistence",
          error,
        });
        return null;
      }

      if (!encrypted || encrypted.length === 0) {
        logger.warn("SessionPersistence", "Stored session file is empty");
        await this.clearSession(); // Clean up invalid file
        return null;
      }

      // Decrypt the session ID
      const decrypted = safeStorage.decryptString(encrypted);

      // Validate the decrypted session ID
      if (!this.isValidSessionId(decrypted)) {
        logger.error("SessionPersistence", "Stored session ID is invalid");
        await this.clearSession(); // Clean up invalid session
        return null;
      }

      return decrypted;
    } catch (error) {
      logger.error("Failed to retrieve session ID", {
        service: "SessionPersistence",
        error,
      });

      // Handle corrupted file by removing it
      if (
        error instanceof Error &&
        (error.message.includes("decrypt") ||
          error.message.includes("corrupt") ||
          error.message.includes("invalid"))
      ) {
        logger.warn(
          "SessionPersistence",
          "Corrupted session file detected, cleaning up",
        );
        await this.clearSession();
      }

      return null;
    }
  }

  /**
   * Clear the stored session ID (logout/cleanup)
   */
  public async clearSession(): Promise<void> {
    try {
      const storagePath = this.getStoragePath();

      // Check if file exists before attempting deletion
      try {
        await fs.access(storagePath);
        await fs.unlink(storagePath);
      } catch {
        // File doesn't exist or can't be deleted - not an error condition
      }
    } catch (error) {
      logger.error("Error clearing session", {
        service: "SessionPersistence",
        error,
      });
      // Don't throw - clearing should be best effort
    }
  }

  /**
   * Check if a persisted session exists (without decrypting it)
   */
  public async hasStoredSession(): Promise<boolean> {
    try {
      const storagePath = this.getStoragePath();
      await fs.access(storagePath);

      // Check that file is not empty
      const stats = await fs.stat(storagePath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata about the stored session (for debugging)
   */
  public async getSessionMetadata(): Promise<{
    exists: boolean;
    size?: number;
    modified?: Date;
    encryptionAvailable: boolean;
  }> {
    const metadata: {
      exists: boolean;
      size?: number;
      modified?: Date;
      encryptionAvailable: boolean;
    } = {
      exists: false,
      encryptionAvailable: await this.isAvailable(),
    };

    try {
      const storagePath = this.getStoragePath();
      const stats = await fs.stat(storagePath);

      metadata.exists = true;
      metadata.size = stats.size;
      metadata.modified = stats.mtime;
    } catch {
      // File doesn't exist
    }

    return metadata;
  }
}

// Export singleton instance
export const sessionPersistenceService =
  SessionPersistenceService.getInstance();

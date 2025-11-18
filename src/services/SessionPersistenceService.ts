import { injectable } from "inversify";
import { validate as uuidValidate, version as uuidVersion } from "uuid";
import { logger } from "../utils/logger.ts";

/**
 * Service for securely persisting session IDs across app restarts
 * in a PWA/browser environment.
 *
 * Security features:
 * - Validates UUID format before storage
 * - Never logs decrypted session IDs
 * - Handles storage unavailability gracefully
 * - Cleans up on logout
 */
@injectable()
export class SessionPersistenceService {
  private static readonly STORAGE_KEY = "justice-companion.session.id";
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
   * Get the storage key used in localStorage
   */
  private getStorageKey(): string {
    return SessionPersistenceService.STORAGE_KEY;
  }

  /**
   * Get the browser storage mechanism (localStorage) if available
   */
  // eslint-disable-next-line class-methods-use-this
  private getStorage(): Storage | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return null;
      }
      return window.localStorage;
    } catch {
      return null;
    }
  }

  /**
   * Check if persistent storage is available on this system
   * @returns true if storage is available, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const storage = this.getStorage();
      if (!storage) {
        logger.warn("SessionPersistence", "localStorage not available");
        return false;
      }

      const testKey = `${this.getStorageKey()}__test`;
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);

      return true;
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
   * Store a session ID in browser storage
   * @param sessionId - UUID v4 session ID to store
   * @throws Error if storage is unavailable or session ID is invalid
   */
  public async storeSessionId(sessionId: string): Promise<void> {
    try {
      if (!this.isValidSessionId(sessionId)) {
        throw new Error("Invalid session ID format (expected UUID v4)");
      }

      const available = await this.isAvailable();
      if (!available) {
        throw new Error("Persistent storage not available");
      }

      const storage = this.getStorage();
      if (!storage) {
        throw new Error("Persistent storage not available");
      }

      storage.setItem(this.getStorageKey(), sessionId);
    } catch (error) {
      logger.error("Failed to store session ID", {
        service: "SessionPersistence",
        error,
      });

      try {
        const storage = this.getStorage();
        storage?.removeItem(this.getStorageKey());
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Retrieve a stored session ID
   * @returns session ID or null if not found/invalid
   */
  public async retrieveSessionId(): Promise<string | null> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn(
          "SessionPersistence",
          "Cannot retrieve: storage not available",
        );
        return null;
      }

      const storage = this.getStorage();
      if (!storage) {
        return null;
      }

      const stored = storage.getItem(this.getStorageKey());
      if (!stored) {
        return null;
      }

      if (!this.isValidSessionId(stored)) {
        logger.error("SessionPersistence", "Stored session ID is invalid");
        await this.clearSession();
        return null;
      }

      return stored;
    } catch (error) {
      logger.error("Failed to retrieve session ID", {
        service: "SessionPersistence",
        error,
      });

      return null;
    }
  }

  /**
   * Clear the stored session ID (logout/cleanup)
   */
  public async clearSession(): Promise<void> {
    try {
      const storage = this.getStorage();
      storage?.removeItem(this.getStorageKey());
    } catch (error) {
      logger.error("Error clearing session", {
        service: "SessionPersistence",
        error,
      });
      // Don't throw - clearing should be best effort
    }
  }

  /**
   * Check if a persisted session exists
   */
  public async hasStoredSession(): Promise<boolean> {
    try {
      const storage = this.getStorage();
      if (!storage) {
        return false;
      }

      const value = storage.getItem(this.getStorageKey());
      return !!(value && value.length > 0);
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
    const encryptionAvailable = await this.isAvailable();
    const storage = this.getStorage();

    if (!storage) {
      return {
        exists: false,
        encryptionAvailable,
      };
    }

    const value = storage.getItem(this.getStorageKey());
    if (!value) {
      return {
        exists: false,
        encryptionAvailable,
      };
    }

    return {
      exists: true,
      size: value.length,
      // modified time is not available for localStorage; omit it
      encryptionAvailable,
    };
  }
}

// Export singleton instance
export const sessionPersistenceService =
  SessionPersistenceService.getInstance();

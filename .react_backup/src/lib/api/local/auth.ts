/**
 * Local Auth API - PIN-Based Authentication
 *
 * Provides local authentication using PIN/passphrase.
 * No server required - all verification happens locally.
 */

import type { ApiResponse } from "../types";
import { getSettingsRepository } from "../../storage/repositories/SettingsRepository";
import {
  setupPin,
  unlockWithPin,
  clearEncryptionKey,
  isEncryptionInitialized,
  verifyPin,
} from "../../storage/crypto";

/**
 * Local user type (simplified for local-first mode)
 */
export interface LocalUser {
  id: number;
  username: string;
  email: string | null;
  role: "user";
  isLocal: true;
}

/**
 * Auth state
 */
let currentUser: LocalUser | null = null;

/**
 * Create local auth API
 */
export function createLocalAuthApi() {
  const settingsRepo = getSettingsRepository();

  return {
    /**
     * Check if PIN is set up
     */
    async isPinConfigured(): Promise<boolean> {
      return settingsRepo.isPinConfigured();
    },

    /**
     * Set up a new PIN
     */
    async setupPin(pin: string): Promise<ApiResponse<{ success: boolean }>> {
      try {
        // Validate PIN (minimum 4 digits/characters)
        if (pin.length < 4) {
          return {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "PIN must be at least 4 characters",
            },
          };
        }

        // Generate salt and hash, initialize encryption
        const { salt, verificationHash } = await setupPin(pin);

        // Store in settings
        await settingsRepo.savePinConfig(salt, verificationHash);

        // Set current user
        currentUser = {
          id: 1,
          username: "local_user",
          email: null,
          role: "user",
          isLocal: true,
        };

        return {
          success: true,
          data: { success: true },
          message: "PIN set up successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "SETUP_FAILED",
            message: error instanceof Error ? error.message : "Failed to set up PIN",
          },
        };
      }
    },

    /**
     * Unlock with PIN (login)
     */
    async unlock(pin: string): Promise<ApiResponse<LocalUser>> {
      try {
        const config = await settingsRepo.getPinConfig();

        if (!config) {
          return {
            success: false,
            error: {
              code: "NO_PIN",
              message: "No PIN configured. Please set up a PIN first.",
            },
          };
        }

        const isValid = await unlockWithPin(pin, config.hash, config.salt);

        if (!isValid) {
          return {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "Incorrect PIN",
            },
          };
        }

        // Set current user
        currentUser = {
          id: 1,
          username: "local_user",
          email: null,
          role: "user",
          isLocal: true,
        };

        return {
          success: true,
          data: currentUser,
          message: "Unlocked successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "UNLOCK_FAILED",
            message: error instanceof Error ? error.message : "Failed to unlock",
          },
        };
      }
    },

    /**
     * Lock the app (logout)
     */
    async lock(): Promise<ApiResponse<void>> {
      try {
        clearEncryptionKey();
        currentUser = null;

        return {
          success: true,
          data: undefined,
          message: "Locked successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCK_FAILED",
            message: error instanceof Error ? error.message : "Failed to lock",
          },
        };
      }
    },

    /**
     * Change PIN
     */
    async changePin(
      currentPin: string,
      newPin: string
    ): Promise<ApiResponse<void>> {
      try {
        const config = await settingsRepo.getPinConfig();

        if (!config) {
          return {
            success: false,
            error: {
              code: "NO_PIN",
              message: "No PIN configured",
            },
          };
        }

        // Verify current PIN
        const isValid = await verifyPin(currentPin, config.hash, config.salt);

        if (!isValid) {
          return {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "Current PIN is incorrect",
            },
          };
        }

        // Validate new PIN
        if (newPin.length < 4) {
          return {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "New PIN must be at least 4 characters",
            },
          };
        }

        // Set up new PIN
        const { salt, verificationHash } = await setupPin(newPin);
        await settingsRepo.savePinConfig(salt, verificationHash);

        // Note: This doesn't re-encrypt existing data with new key
        // That would require decrypting all data with old key and re-encrypting with new key

        return {
          success: true,
          data: undefined,
          message: "PIN changed successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "CHANGE_FAILED",
            message: error instanceof Error ? error.message : "Failed to change PIN",
          },
        };
      }
    },

    /**
     * Remove PIN protection (not recommended)
     */
    async removePin(currentPin: string): Promise<ApiResponse<void>> {
      try {
        const config = await settingsRepo.getPinConfig();

        if (!config) {
          return {
            success: true,
            data: undefined,
            message: "No PIN to remove",
          };
        }

        // Verify current PIN
        const isValid = await verifyPin(currentPin, config.hash, config.salt);

        if (!isValid) {
          return {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "Incorrect PIN",
            },
          };
        }

        await settingsRepo.clearPinConfig();
        clearEncryptionKey();

        return {
          success: true,
          data: undefined,
          message: "PIN protection removed",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "REMOVE_FAILED",
            message: error instanceof Error ? error.message : "Failed to remove PIN",
          },
        };
      }
    },

    /**
     * Get current user (for compatibility with existing auth context)
     */
    async getCurrentUser(): Promise<ApiResponse<LocalUser | null>> {
      if (!isEncryptionInitialized()) {
        return {
          success: true,
          data: null,
        };
      }

      if (!currentUser) {
        currentUser = {
          id: 1,
          username: "local_user",
          email: null,
          role: "user",
          isLocal: true,
        };
      }

      return {
        success: true,
        data: currentUser,
      };
    },

    /**
     * Check if unlocked (authenticated)
     */
    isUnlocked(): boolean {
      return isEncryptionInitialized();
    },

    /**
     * Legacy login method for compatibility
     * In local mode, this is handled by setupPin or unlock
     */
    async login(
      _identifier: string,
      password: string,
      _rememberMe?: boolean
    ): Promise<ApiResponse<{ user: LocalUser; sessionId: string }>> {
      // Treat password as PIN for local mode
      const isPinSet = await settingsRepo.isPinConfigured();

      if (!isPinSet) {
        // First time - set up PIN
        const result = await this.setupPin(password);
        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }
      } else {
        // Unlock with PIN
        const result = await this.unlock(password);
        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }
      }

      return {
        success: true,
        data: {
          user: currentUser!,
          sessionId: "local_session",
        },
      };
    },

    /**
     * Legacy logout method
     */
    async logout(): Promise<ApiResponse<void>> {
      return this.lock();
    },

    /**
     * Legacy register method - just sets up PIN
     */
    async register(
      _username: string,
      _email: string,
      password: string
    ): Promise<ApiResponse<{ user: LocalUser; sessionId: string }>> {
      const result = await this.setupPin(password);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          user: currentUser!,
          sessionId: "local_session",
        },
      };
    },

    /**
     * Validate session - always valid if encryption is initialized
     */
    async validateSession(): Promise<ApiResponse<{ valid: boolean; user?: LocalUser }>> {
      const isValid = isEncryptionInitialized();

      return {
        success: true,
        data: {
          valid: isValid,
          user: isValid ? currentUser ?? undefined : undefined,
        },
      };
    },
  };
}

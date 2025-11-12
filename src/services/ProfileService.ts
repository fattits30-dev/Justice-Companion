/**
 * Profile Service
 *
 * Manages user profile data storage and operations.
 * Handles localStorage operations and profile data transformations.
 */

import type {
  UserProfile,
  ExtendedUserProfile,
  ProfileFormData,
  ProfileValidationResult,
  ProfileUpdateResult,
  IProfileService,
} from "../types/profile.ts";
import { ProfileStorageKey } from "../types/profile.ts";
import { logger } from '../utils/logger';

/**
 * Profile Service Implementation
 *
 * Handles all profile-related operations including storage, retrieval, and validation.
 */
export class ProfileService implements IProfileService {
  // Cache for computed values
  private extendedProfileCache: ExtendedUserProfile | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  /**
   * Clear cache when profile data changes
   */
  private invalidateCache(): void {
    this.extendedProfileCache = null;
    this.cacheTimestamp = 0;
  }
  /**
   * Get the current user profile from localStorage
   */
  get(): UserProfile | null {
    try {
      const firstName = localStorage.getItem(ProfileStorageKey.FIRST_NAME);
      const lastName = localStorage.getItem(ProfileStorageKey.LAST_NAME);
      const email = localStorage.getItem(ProfileStorageKey.EMAIL);
      const phone = localStorage.getItem(ProfileStorageKey.PHONE);

      // Return null if no profile data exists
      if (!firstName && !lastName && !email) {
        return null;
      }

      return {
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || "",
        phone: phone || undefined,
      };
    } catch (error) {
      logger.error("[ProfileService] Error retrieving profile:", error);
      return null;
    }
  }

  /**
   * Update user profile data with retry logic
   */
  async update(
    profile: Partial<UserProfile>,
    maxRetries: number = 3,
  ): Promise<ProfileUpdateResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentProfile = this.get() || {
          firstName: "",
          lastName: "",
          email: "",
          phone: undefined,
        };

        const updatedProfile: UserProfile = {
          ...currentProfile,
          ...profile,
        };

        // Validate the updated profile
        const validation = this.validate(updatedProfile);
        if (!validation.isValid) {
          const errorMessages = Object.values(validation.errors)
            .filter((error) => error !== null)
            .join(", ");
          return {
            success: false,
            message: `Profile validation failed: ${errorMessages}`,
          };
        }

        // Save to localStorage with error checking
        try {
          if (updatedProfile.firstName.trim()) {
            localStorage.setItem(
              ProfileStorageKey.FIRST_NAME,
              updatedProfile.firstName.trim(),
            );
          } else {
            localStorage.removeItem(ProfileStorageKey.FIRST_NAME);
          }

          if (updatedProfile.lastName.trim()) {
            localStorage.setItem(
              ProfileStorageKey.LAST_NAME,
              updatedProfile.lastName.trim(),
            );
          } else {
            localStorage.removeItem(ProfileStorageKey.LAST_NAME);
          }

          if (updatedProfile.email.trim()) {
            localStorage.setItem(
              ProfileStorageKey.EMAIL,
              updatedProfile.email.trim(),
            );
          } else {
            localStorage.removeItem(ProfileStorageKey.EMAIL);
          }

          // Update full name
          const fullName =
            `${updatedProfile.firstName.trim()} ${updatedProfile.lastName.trim()}`.trim();
          if (fullName) {
            localStorage.setItem(ProfileStorageKey.FULL_NAME, fullName);
          } else {
            localStorage.removeItem(ProfileStorageKey.FULL_NAME);
          }

          // Handle phone (optional field)
          if (updatedProfile.phone?.trim()) {
            localStorage.setItem(
              ProfileStorageKey.PHONE,
              updatedProfile.phone.trim(),
            );
          } else {
            localStorage.removeItem(ProfileStorageKey.PHONE);
          }
        } catch (storageError) {
          throw new Error(
            `Failed to save profile data to localStorage: ${
              storageError instanceof Error
                ? storageError.message
                : "Storage quota exceeded or storage unavailable"
            }`,
          );
        }

        // Invalidate cache since profile data changed
        this.invalidateCache();

        return {
          success: true,
          message: "Profile updated successfully",
          updatedFields: updatedProfile as UserProfile,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `[ProfileService] Update attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100),
          ); // Exponential backoff
        }
      }
    }

    // All retries failed
    return {
      success: false,
      message: `Failed to update profile after ${maxRetries} attempts: ${
        lastError?.message || "Unknown error"
      }`,
    };
  }

  /**
   * Validate profile data
   */
  validate(profile: Partial<ProfileFormData>): ProfileValidationResult {
    const errors: Record<keyof ProfileFormData, string | null> = {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
    };

    let isValid = true;

    // Email validation
    if (profile.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email.trim())) {
        errors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Phone validation (optional, but if provided should be reasonable)
    if (profile.phone && profile.phone.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(profile.phone.replace(/[\s\-()]/g, ""))) {
        errors.phone = "Please enter a valid phone number";
        isValid = false;
      }
    }

    // Name validation (should not contain special characters that could cause issues)
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (profile.firstName && !nameRegex.test(profile.firstName.trim())) {
      errors.firstName = "First name contains invalid characters";
      isValid = false;
    }

    if (profile.lastName && !nameRegex.test(profile.lastName.trim())) {
      errors.lastName = "Last name contains invalid characters";
      isValid = false;
    }

    return {
      isValid,
      errors,
    };
  }

  /**
   * Clear all profile data
   */
  clear(): void {
    try {
      localStorage.removeItem(ProfileStorageKey.FIRST_NAME);
      localStorage.removeItem(ProfileStorageKey.LAST_NAME);
      localStorage.removeItem(ProfileStorageKey.FULL_NAME);
      localStorage.removeItem(ProfileStorageKey.EMAIL);
      localStorage.removeItem(ProfileStorageKey.PHONE);
    } catch (error) {
      logger.error("[ProfileService] Error clearing profile:", error);
    }
  }

  /**
   * Get extended profile with computed fields (memoized)
   */
  getExtended(): ExtendedUserProfile | null {
    const now = Date.now();

    // Return cached result if still valid
    if (
      this.extendedProfileCache &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.extendedProfileCache;
    }

    const profile = this.get();
    if (!profile) {
      this.extendedProfileCache = null;
      this.cacheTimestamp = 0;
      return null;
    }

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const initials =
      profile.firstName && profile.lastName
        ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
        : profile.firstName
          ? profile.firstName.charAt(0).toUpperCase()
          : "U";

    this.extendedProfileCache = {
      ...profile,
      fullName,
      initials,
    };
    this.cacheTimestamp = now;

    return this.extendedProfileCache;
  }

  /**
   * Convert form data to profile data
   */
  formDataToProfile(formData: ProfileFormData): UserProfile {
    return {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
    };
  }

  /**
   * Convert profile data to form data
   */
  profileToFormData(profile: UserProfile | null): ProfileFormData {
    return {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    };
  }
}

// Export singleton instance
export const profileService = new ProfileService();

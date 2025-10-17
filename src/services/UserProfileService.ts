import { userProfileRepository } from '../repositories/UserProfileRepository';
import type { UserProfile, UpdateUserProfileInput } from '../models/UserProfile';
import { errorLogger } from '../utils/error-logger';

class UserProfileService {
  /**
   * Get the current user profile
   */
  getProfile(): UserProfile {
    try {
      return userProfileRepository.get();
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.getProfile',
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  updateProfile(input: UpdateUserProfileInput): UserProfile {
    try {
      // Validate name if provided
      if (input.name !== undefined && input.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }

      // Validate email if provided
      if (input.email !== undefined && input.email !== null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          throw new Error('Invalid email format');
        }
      }

      return userProfileRepository.update(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.updateProfile',
      });
      throw error;
    }
  }
}

export const userProfileService = new UserProfileService();

import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';
import type { IUserProfileRepository, IUserProfileService } from '../shared/infrastructure/di/interfaces.ts';
import type { UserProfile, UpdateUserProfileInput } from '../domains/settings/entities/UserProfile.ts';
import { errorLogger } from '../utils/error-logger.ts';

/**
 * Injectable UserProfileService
 * Manages user profile operations with dependency injection
 */
@injectable()
export class UserProfileServiceInjectable implements IUserProfileService {
  constructor(
    @inject(TYPES.UserProfileRepository) private userProfileRepository: IUserProfileRepository
  ) {}

  /**
   * Get user profile by ID
   */
  getProfile(userId: number): UserProfile | null {
    try {
      return this.userProfileRepository.findById(userId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.getProfile',
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Create user profile (internal implementation)
   */
  createProfile(input: any): UserProfile {
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

      return this.userProfileRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.createProfile'
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  updateProfile(userId: number, input: UpdateUserProfileInput): UserProfile | null {
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

      return this.userProfileRepository.update(userId, input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.updateProfile',
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  deleteProfile(userId: number): boolean {
    try {
      return this.userProfileRepository.delete(userId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.deleteProfile',
        userId: userId.toString()
      });
      throw error;
    }
  }
}

// For backward compatibility - keep the singleton instance
// This will be replaced in the future with pure DI
import { getRepositories } from '../repositories.ts';

class UserProfileServiceSingleton {
  private get userProfileRepository() {
    return getRepositories().userProfileRepository;
  }

  /**
   * Get the current user profile
   */
  getProfile(): UserProfile {
    try {
      return this.userProfileRepository.get();
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

      return this.userProfileRepository.update(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileService.updateProfile',
      });
      throw error;
    }
  }
}

export const userProfileService = new UserProfileServiceSingleton();
export { UserProfileServiceInjectable };
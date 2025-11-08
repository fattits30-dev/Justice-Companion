import { injectable, inject } from "inversify";
import { TYPES } from "../shared/infrastructure/di/types.ts";
import type { IUserProfileRepository } from "../shared/infrastructure/di/repository-interfaces.ts";
import type { IUserProfileService } from "../shared/infrastructure/di/service-interfaces.ts";
import type {
  UserProfile,
  UpdateUserProfileInput,
} from "../domains/settings/entities/UserProfile.ts";
import { errorLogger } from "../utils/error-logger.ts";

/**
 * Injectable UserProfileService
 * Manages user profile operations with dependency injection
 */
@injectable()
export class UserProfileServiceInjectable implements IUserProfileService {
  constructor(
    @inject(TYPES.UserProfileRepository)
    private userProfileRepository: IUserProfileRepository
  ) {}

  /**
   * Get user profile by ID
   */
  getProfile(_userId: number): UserProfile | null {
    try {
      return this.userProfileRepository.get() as UserProfile | null;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "UserProfileService.getProfile",
        userId: _userId.toString(),
      });
      throw error;
    }
  }

  /**
   * Create user profile (internal implementation)
   */
  createProfile(_input: Partial<UserProfile>): UserProfile {
    // For single-user system, profile is created automatically
    // This method is not used in the current implementation
    throw new Error("Profile creation not supported in single-user system");
  }

  /**
   * Update user profile
   */
  updateProfile(
    _userId: number,
    input: UpdateUserProfileInput
  ): UserProfile | null {
    try {
      // Validate name if provided
      if (input.name !== undefined && input.name.trim().length === 0) {
        throw new Error("Name cannot be empty");
      }

      // Validate email if provided
      if (input.email !== undefined && input.email !== null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          throw new Error("Invalid email format");
        }
      }

      return this.userProfileRepository.update(input) as UserProfile | null;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "UserProfileService.updateProfile",
        userId: _userId.toString(),
      });
      throw error;
    }
  }
}

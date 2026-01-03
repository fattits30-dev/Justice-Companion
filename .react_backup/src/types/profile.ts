/**
 * Profile-related TypeScript interfaces and types
 *
 * Defines the structure for user profile data used throughout the application.
 */

/**
 * Basic user profile information stored locally
 */
export interface UserProfile {
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's email address */
  email: string;
  /** User's phone number (optional) */
  phone?: string;
}

/**
 * Extended user profile with computed fields
 */
export interface ExtendedUserProfile extends UserProfile {
  /** Full name computed from firstName + lastName */
  fullName: string;
  /** User's initials for avatar display */
  initials: string;
}

/**
 * Profile data used in form components
 */
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Profile validation result
 */
export interface ProfileValidationResult {
  isValid: boolean;
  errors: Record<keyof ProfileFormData, string | null>;
}

/**
 * Profile storage keys for localStorage
 */
export enum ProfileStorageKey {
  FIRST_NAME = "userFirstName",
  LAST_NAME = "userLastName",
  FULL_NAME = "userFullName",
  EMAIL = "userEmail",
  PHONE = "userPhone",
}

/**
 * Profile update operation result
 */
export interface ProfileUpdateResult {
  success: boolean;
  message: string;
  updatedFields?: UserProfile;
}

/**
 * Profile service interface
 */
export interface IProfileService {
  get(): UserProfile | null;
  update(profile: Partial<UserProfile>): Promise<ProfileUpdateResult>;
  validate(profile: Partial<ProfileFormData>): ProfileValidationResult;
  clear(): void;
}

/**
 * Profile context value
 */
export interface ProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

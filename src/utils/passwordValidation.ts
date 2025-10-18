/**
 * Password Validation Utilities
 *
 * Provides validation functions for password security requirements
 * following OWASP best practices.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a password change request including current password,
 * new password strength, and confirmation match.
 *
 * Password requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - New password must match confirmation
 *
 * @param oldPassword - Current password (required)
 * @param newPassword - New password to validate
 * @param confirmPassword - Confirmation of new password
 * @returns Validation result with isValid flag and optional error message
 */
export function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): PasswordValidationResult {
  if (!oldPassword) {
    return { isValid: false, error: 'Current password is required' };
  }

  if (newPassword.length < 12) {
    return { isValid: false, error: 'New password must be at least 12 characters' };
  }

  if (!/[A-Z]/.test(newPassword)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(newPassword)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(newPassword)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  if (newPassword !== confirmPassword) {
    return { isValid: false, error: 'New passwords do not match' };
  }

  return { isValid: true };
}

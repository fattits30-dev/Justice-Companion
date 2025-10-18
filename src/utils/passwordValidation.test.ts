/**
 * Password Validation Utilities Tests
 *
 * Tests for password validation functions following OWASP best practices.
 */

import { describe, it, expect } from 'vitest';
import { validatePasswordChange } from './passwordValidation';

describe('validatePasswordChange', () => {
  const validOldPassword = 'OldPassword123';
  const validNewPassword = 'NewPassword123!';

  it('should return error when old password is empty', () => {
    const result = validatePasswordChange('', validNewPassword, validNewPassword);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current password is required');
  });

  it('should return error when new password is too short', () => {
    const result = validatePasswordChange(validOldPassword, 'Short1!', 'Short1!');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New password must be at least 12 characters');
  });

  it('should return error when new password lacks uppercase letter', () => {
    const result = validatePasswordChange(validOldPassword, 'lowercase123!', 'lowercase123!');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must contain at least one uppercase letter');
  });

  it('should return error when new password lacks lowercase letter', () => {
    const result = validatePasswordChange(validOldPassword, 'UPPERCASE123!', 'UPPERCASE123!');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must contain at least one lowercase letter');
  });

  it('should return error when new password lacks number', () => {
    const result = validatePasswordChange(validOldPassword, 'NoNumbersHere!', 'NoNumbersHere!');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must contain at least one number');
  });

  it('should return error when passwords do not match', () => {
    const result = validatePasswordChange(validOldPassword, validNewPassword, 'DifferentPassword123!');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New passwords do not match');
  });

  it('should return valid for password meeting all requirements', () => {
    const result = validatePasswordChange(validOldPassword, validNewPassword, validNewPassword);

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate password with exactly 12 characters', () => {
    const result = validatePasswordChange(validOldPassword, 'Password123!', 'Password123!');

    expect(result.isValid).toBe(true);
  });

  it('should validate password with special characters', () => {
    const result = validatePasswordChange(validOldPassword, 'P@ssw0rd!2024!', 'P@ssw0rd!2024!');

    expect(result.isValid).toBe(true);
  });

  it('should validate very long password', () => {
    const longPassword = 'ThisIsAVeryLongPassword123WithLotsOfCharacters!@#$%';
    const result = validatePasswordChange(validOldPassword, longPassword, longPassword);

    expect(result.isValid).toBe(true);
  });
});

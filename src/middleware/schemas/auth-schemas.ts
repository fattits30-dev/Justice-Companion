/**
 * Validation schemas for authentication IPC channels
 *
 * Implements comprehensive validation for authentication operations including
 * registration, login, password changes with strong security requirements.
 */

import { z } from 'zod';
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_EMAIL_LENGTH,
  PATTERNS,
} from '../utils/constants.ts';

/**
 * Password validation with strength requirements
 * Enforces OWASP recommendations for secure passwords
 */
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be less than ${MAX_PASSWORD_LENGTH} characters`)
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter',
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter',
  )
  .refine((password) => /[0-9]/.test(password), 'Password must contain at least one number')
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    'Password must contain at least one special character',
  )
  .refine((password) => {
    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
      /^(password|qwerty|admin|letmein|welcome|monkey|dragon)/i, // Common passwords
    ];

    return !weakPatterns.some((pattern) => pattern.test(password));
  }, 'Password is too common or follows a weak pattern');

/**
 * Schema for user registration
 * Validates username, email, and password with strict requirements
 */
export const authRegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(MAX_USERNAME_LENGTH, `Username must be less than ${MAX_USERNAME_LENGTH} characters`)
      .regex(
        PATTERNS.USERNAME,
        'Username can only contain letters, numbers, underscores, and hyphens',
      )
      .transform((s) => s.toLowerCase()) // Normalize to lowercase
      .refine((username) => {
        // Prevent reserved usernames
        const reserved = ['admin', 'root', 'system', 'api', 'null', 'undefined'];
        return !reserved.includes(username);
      }, 'This username is reserved'),

    email: z
      .string()
      .min(1, 'Email is required')
      .max(MAX_EMAIL_LENGTH, `Email must be less than ${MAX_EMAIL_LENGTH} characters`)
      .email('Please enter a valid email address')
      .transform((s) => s.toLowerCase()) // Normalize to lowercase
      .refine((email) => {
        // Additional email validation
        const parts = email.split('@');
        if (parts.length !== 2) {
          return false;
        }

        const [local, domain] = parts;

        // Check local part
        if (local.length > 64) {
          return false;
        }
        if (local.startsWith('.') || local.endsWith('.')) {
          return false;
        }
        if (local.includes('..')) {
          return false;
        }

        // Check domain part
        if (domain.length > 253) {
          return false;
        }
        if (!domain.includes('.')) {
          return false;
        }
        if (domain.startsWith('.') || domain.endsWith('.')) {
          return false;
        }

        return true;
      }, 'Invalid email format'),

    password: passwordSchema,

    // Optional fields that might be added in the future
    firstName: z
      .string()
      .max(100, 'First name must be less than 100 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
      .optional(),

    lastName: z
      .string()
      .max(100, 'Last name must be less than 100 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
      .optional(),

    // Fields that should NOT be provided by client
    id: z.never().optional(),
    role: z.never().optional(), // Will be set to 'user' by default
    isActive: z.never().optional(), // Will be set to true by default
    createdAt: z.never().optional(),
    updatedAt: z.never().optional(),
    lastLoginAt: z.never().optional(),
  })
  .strict(); // No additional properties allowed

/**
 * Schema for user login
 * Validates credentials with rate limiting awareness
 */
export const authLoginSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .max(MAX_USERNAME_LENGTH, `Username must be less than ${MAX_USERNAME_LENGTH} characters`)
      .transform((s) => s.toLowerCase()), // Normalize to lowercase

    password: z
      .string()
      .min(1, 'Password is required')
      .max(MAX_PASSWORD_LENGTH, `Password must be less than ${MAX_PASSWORD_LENGTH} characters`),

    rememberMe: z.boolean().optional().default(false),

    // Optional captcha for rate limiting
    captchaToken: z.string().optional(),

    // Fields that should NOT be provided by client
    sessionId: z.never().optional(),
    ipAddress: z.never().optional(), // Will be extracted from request
    userAgent: z.never().optional(), // Will be extracted from request
  })
  .strict();

/**
 * Schema for password change
 * Requires old password and validates new password strength
 */
export const authChangePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, 'Current password is required')
      .max(MAX_PASSWORD_LENGTH, `Password must be less than ${MAX_PASSWORD_LENGTH} characters`),

    newPassword: passwordSchema,

    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Schema for password reset request
 * Used for forgot password flow
 */
export const authPasswordResetRequestSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .transform((s) => s.toLowerCase()),

    captchaToken: z.string().optional(),
  })
  .strict();

/**
 * Schema for password reset confirmation
 * Used to set new password with reset token
 */
export const authPasswordResetConfirmSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Reset token is required')
      .regex(PATTERNS.UUID, 'Invalid reset token format'),

    newPassword: passwordSchema,

    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Schema for session validation
 * Used to verify active sessions
 */
export const authSessionValidateSchema = z
  .object({
    sessionId: z
      .string()
      .min(1, 'Session ID is required')
      .regex(PATTERNS.UUID, 'Invalid session ID format'),
  })
  .strict();

/**
 * Schema for two-factor authentication setup
 * Future enhancement for MFA
 */
export const authTwoFactorSetupSchema = z
  .object({
    password: z.string().min(1, 'Password is required for 2FA setup'),

    method: z.enum(['totp', 'sms', 'email'], {
      message: 'Invalid 2FA method',
    }),

    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If SMS method, phone number is required
      if (data.method === 'sms' && !data.phoneNumber) {
        return false;
      }
      return true;
    },
    {
      message: 'Phone number is required for SMS 2FA',
      path: ['phoneNumber'],
    },
  );

/**
 * Schema for two-factor authentication verification
 */
export const authTwoFactorVerifySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),

    sessionId: z
      .string()
      .min(1, 'Session ID is required')
      .regex(PATTERNS.UUID, 'Invalid session ID format'),
  })
  .strict();

// Type exports for use in other files
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthChangePasswordInput = z.infer<typeof authChangePasswordSchema>;
export type AuthPasswordResetRequestInput = z.infer<typeof authPasswordResetRequestSchema>;
export type AuthPasswordResetConfirmInput = z.infer<typeof authPasswordResetConfirmSchema>;
export type AuthSessionValidateInput = z.infer<typeof authSessionValidateSchema>;
export type AuthTwoFactorSetupInput = z.infer<typeof authTwoFactorSetupSchema>;
export type AuthTwoFactorVerifyInput = z.infer<typeof authTwoFactorVerifySchema>;

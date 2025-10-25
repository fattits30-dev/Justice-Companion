/**
 * Validation schemas for User model
 *
 * Provides Zod schemas for validating User inputs in repositories and services.
 */

import { z } from 'zod';

/**
 * Username validation
 */
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  )
  .trim();

/**
 * Password validation
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * Email validation
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  username: usernameSchema,

  password: passwordSchema,

  email: emailSchema.optional(),

  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional(),

  role: z
    .enum(['user', 'admin', 'moderator'])
    .default('user'),

  isActive: z
    .boolean()
    .default(true),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
});

/**
 * Schema for updating a user
 */
export const updateUserSchema = z.object({
  username: usernameSchema.optional(),

  email: emailSchema.optional(),

  fullName: z
    .string()
    .min(1, 'Full name cannot be empty')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional(),

  role: z
    .enum(['user', 'admin', 'moderator'])
    .optional(),

  isActive: z
    .boolean()
    .optional(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ['confirmPassword']
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }
);

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Schema for user registration
 */
export const registrationSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
  email: emailSchema,
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .trim(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions'
    })
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ['confirmPassword']
  }
);

/**
 * Schema for user search/filter criteria
 */
export const userSearchSchema = z.object({
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  isActive: z.boolean().optional(),
  searchTerm: z.string().trim().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

/**
 * Type exports for TypeScript
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type UserSearchCriteria = z.infer<typeof userSearchSchema>;
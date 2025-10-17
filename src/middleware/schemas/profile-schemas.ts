/**
 * Validation schemas for user profile IPC channels
 *
 * Implements comprehensive validation for user profile operations including
 * updates with proper email and URL validation.
 */

import { z } from 'zod';
import { MAX_EMAIL_LENGTH, MAX_URL_LENGTH, PATTERNS } from '../utils/constants';
import { sanitizeEmail, sanitizeUrl } from '../utils/sanitizers';

/**
 * Schema for user profile update request
 * All fields are optional for partial updates
 */
export const profileUpdateSchema = z
  .object({
    input: z
      .object({
        name: z
          .string()
          .min(1, 'Name cannot be empty')
          .max(200, 'Name must be less than 200 characters')
          .regex(
            /^[a-zA-Z\s'-]+$/,
            'Name can only contain letters, spaces, hyphens, and apostrophes',
          )
          .trim()
          .optional(),

        email: z
          .string()
          .max(MAX_EMAIL_LENGTH, `Email must be less than ${MAX_EMAIL_LENGTH} characters`)
          .transform(sanitizeEmail)
          .refine((email) => {
            if (!email) {
              return true;
            } // Allow empty (null) email
            return PATTERNS.EMAIL.test(email);
          }, 'Please enter a valid email address')
          .refine((email) => {
            if (!email) {
              return true;
            }
            // Additional RFC 5321 compliant email validation
            const parts = email.split('@');
            if (parts.length !== 2) {
              return false;
            }

            const [local, domain] = parts;

            // Check local part (before @)
            if (local.length > 64) {
              return false;
            }
            if (local.startsWith('.') || local.endsWith('.')) {
              return false;
            }
            if (local.includes('..')) {
              return false;
            }

            // Check domain part (after @)
            if (domain.length > 253) {
              return false;
            }
            if (!domain.includes('.')) {
              return false;
            }
            if (domain.startsWith('.') || domain.endsWith('.')) {
              return false;
            }
            if (domain.startsWith('-') || domain.endsWith('-')) {
              return false;
            }

            return true;
          }, 'Invalid email format')
          .nullable()
          .optional(),

        avatarUrl: z
          .string()
          .max(MAX_URL_LENGTH, `Avatar URL must be less than ${MAX_URL_LENGTH} characters`)
          .transform(sanitizeUrl)
          .refine((url) => {
            if (!url) {
              return true;
            } // Allow empty (null) avatar URL
            return PATTERNS.URL.test(url);
          }, 'Please enter a valid URL')
          .refine((url) => {
            if (!url) {
              return true;
            }
            // Only allow https URLs for security
            return url.startsWith('https://');
          }, 'Avatar URL must use HTTPS protocol')
          .refine((url) => {
            if (!url) {
              return true;
            }
            // Check if URL points to an image
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            return imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));
          }, 'Avatar URL must point to an image file')
          .nullable()
          .optional(),

        // Fields that should NOT be updated by client
        id: z.never().optional(), // Always 1 (single-row table)
        createdAt: z.never().optional(),
        updatedAt: z.never().optional(), // Will be set server-side
      })
      .strict() // No additional properties allowed
      .refine(
        (data) => Object.keys(data).length > 0,
        'At least one field must be provided for update',
      ),
  })
  .strict();

// Type exports for use in other files
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

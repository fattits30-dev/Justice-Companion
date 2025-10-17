/**
 * Validation schemas for case management IPC channels
 *
 * Implements comprehensive validation for all case-related operations including
 * creation, updates, queries, and deletion with security-focused sanitization.
 */

import { z } from 'zod';
import {
  MAX_CASE_NUMBER_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  VALID_CASE_STATUSES,
  VALID_CASE_TYPES,
} from '../utils/constants';

/**
 * Schema for case creation request
 * Complex validation with nested objects, enums, and date validation
 */
export const caseCreateSchema = z.object({
  input: z
    .object({
      title: z
        .string()
        .min(1, 'Title is required')
        .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`)
        .trim(),

      caseType: z.enum([...VALID_CASE_TYPES] as [string, ...string[]], {
        message: 'Please select a valid case type',
      }),

      status: z
        .enum([...VALID_CASE_STATUSES] as [string, ...string[]], {
          message: 'Please select a valid status',
        })
        .default('active'),

      description: z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`,
        )
        .trim()
        .optional(),

      caseNumber: z
        .string()
        .max(MAX_CASE_NUMBER_LENGTH, 'Case number must be less than 50 characters')
        .regex(/^[A-Za-z0-9\-/\s]+$/, 'Case number contains invalid characters')
        .trim()
        .optional(),

      courtName: z
        .string()
        .max(200, 'Court name must be less than 200 characters')
        .trim()
        .optional(),

      judge: z.string().max(100, 'Judge name must be less than 100 characters').trim().optional(),

      opposingParty: z
        .string()
        .max(200, 'Opposing party must be less than 200 characters')
        .trim()
        .optional(),

      opposingCounsel: z
        .string()
        .max(200, 'Opposing counsel must be less than 200 characters')
        .trim()
        .optional(),

      nextHearingDate: z
        .string()
        .datetime({ message: 'Invalid date format' })
        .optional()
        .refine((date) => {
          if (!date) {
            return true;
          }
          // Allow dates up to 10 years in the future
          const maxFutureDate = new Date();
          maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 10);
          return new Date(date) <= maxFutureDate;
        }, 'Hearing date is too far in the future'),

      filingDeadline: z.string().datetime({ message: 'Invalid date format' }).optional(),

      // Fields that should NOT be provided by client (will be set server-side)
      userId: z.never().optional(), // Will be set from session
      createdAt: z.never().optional(), // Auto-generated
      updatedAt: z.never().optional(), // Auto-generated
      id: z.never().optional(), // Auto-generated
    })
    .strict(), // No additional properties allowed
});

/**
 * Schema for getting case by ID
 * Simple validation with just an ID
 */
export const caseGetByIdSchema = z.object({
  id: z
    .number({
      message: 'Case ID is required and must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive')
    .max(2147483647, 'Case ID exceeds maximum value'), // Max int32
});

/**
 * Schema for case update request
 * Partial update with all fields optional except ID
 */
export const caseUpdateSchema = z.object({
  id: z
    .number({
      message: 'Case ID is required and must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive'),

  input: z
    .object({
      title: z
        .string()
        .min(1, 'Title cannot be empty')
        .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`)
        .trim()
        .optional(),

      caseType: z
        .enum([...VALID_CASE_TYPES] as [string, ...string[]], {
          message: 'Please select a valid case type',
        })
        .optional(),

      status: z
        .enum([...VALID_CASE_STATUSES] as [string, ...string[]], {
          message: 'Please select a valid status',
        })
        .optional(),

      description: z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`,
        )
        .trim()
        .optional(),

      caseNumber: z
        .string()
        .max(MAX_CASE_NUMBER_LENGTH, 'Case number must be less than 50 characters')
        .regex(/^[A-Za-z0-9\-/\s]+$/, 'Case number contains invalid characters')
        .trim()
        .optional(),

      courtName: z
        .string()
        .max(200, 'Court name must be less than 200 characters')
        .trim()
        .optional(),

      judge: z.string().max(100, 'Judge name must be less than 100 characters').trim().optional(),

      opposingParty: z
        .string()
        .max(200, 'Opposing party must be less than 200 characters')
        .trim()
        .optional(),

      opposingCounsel: z
        .string()
        .max(200, 'Opposing counsel must be less than 200 characters')
        .trim()
        .optional(),

      nextHearingDate: z
        .string()
        .datetime({ message: 'Invalid date format' })
        .optional()
        .nullable(),

      filingDeadline: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),

      // Fields that should NOT be updated by client
      userId: z.never().optional(),
      createdAt: z.never().optional(),
      updatedAt: z.never().optional(), // Will be set server-side
      id: z.never().optional(),
    })
    .strict() // No additional properties allowed
    .refine(
      (data) => Object.keys(data).length > 0,
      'At least one field must be provided for update',
    ),
});

/**
 * Schema for case deletion
 * Simple ID validation
 */
export const caseDeleteSchema = z.object({
  id: z
    .number({
      message: 'Case ID is required and must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive')
    .max(2147483647, 'Case ID exceeds maximum value'),
});

/**
 * Schema for case closure
 * Simple ID validation (status change handled server-side)
 */
export const caseCloseSchema = z.object({
  id: z
    .number({
      message: 'Case ID is required and must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive')
    .max(2147483647, 'Case ID exceeds maximum value'),
});

// Type exports for use in other files
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;
export type CaseGetByIdInput = z.infer<typeof caseGetByIdSchema>;
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;
export type CaseDeleteInput = z.infer<typeof caseDeleteSchema>;
export type CaseCloseInput = z.infer<typeof caseCloseSchema>;

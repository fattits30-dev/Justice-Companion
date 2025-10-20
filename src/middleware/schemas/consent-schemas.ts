/**
 * Validation schemas for consent management IPC channels
 *
 * Implements comprehensive validation for GDPR consent operations including
 * granting, revoking, and checking consent status with proper type validation.
 */

import { z } from 'zod';
import { VALID_CONSENT_TYPES } from '../utils/constants.ts';

/**
 * Schema for granting consent
 * Validates consent type before granting
 */
export const consentGrantSchema = z
  .object({
    consentType: z
      .enum([...VALID_CONSENT_TYPES] as [string, ...string[]], {
        message: 'Please select a valid consent type',
      })
      .refine((type) => {
        // Ensure consent type is one of the allowed values
        const allowedTypes = [
          'data_processing',
          'encryption',
          'ai_processing',
          'marketing',
          'data_sharing',
          'analytics',
          'data_retention',
        ];
        return allowedTypes.includes(type);
      }, 'Invalid consent type'),
  })
  .strict();

/**
 * Schema for revoking consent
 * Validates consent type before revocation
 */
export const consentRevokeSchema = z
  .object({
    consentType: z
      .enum([...VALID_CONSENT_TYPES] as [string, ...string[]], {
        message: 'Please select a valid consent type',
      })
      .refine(
        (type) => {
          // Cannot revoke mandatory consents
          const mandatoryConsents = ['data_processing'];
          return !mandatoryConsents.includes(type);
        },
        {
          message:
            'Cannot revoke mandatory consent - this consent is required for the app to function',
        },
      ),
  })
  .strict();

/**
 * Schema for checking consent status
 * Validates consent type before lookup
 */
export const consentHasConsentSchema = z
  .object({
    consentType: z.enum([...VALID_CONSENT_TYPES] as [string, ...string[]], {
      message: 'Please select a valid consent type',
    }),
  })
  .strict();

// Type exports for use in other files
export type ConsentGrantInput = z.infer<typeof consentGrantSchema>;
export type ConsentRevokeInput = z.infer<typeof consentRevokeSchema>;
export type ConsentHasConsentInput = z.infer<typeof consentHasConsentSchema>;

/**
 * Validation schemas for GDPR operation IPC channels
 *
 * Implements comprehensive validation for GDPR operations including
 * data export and deletion with strong confirmation requirements.
 */

import { z } from "zod";

/**
 * Schema for GDPR data deletion request
 * Requires exact confirmation string for safety
 */
export const gdprDeleteUserDataSchema = z
  .object({
    confirmation: z
      .string()
      .min(1, "Confirmation is required")
      .refine((confirmation) => confirmation === "DELETE_ALL_MY_DATA", {
        message:
          'You must type "DELETE_ALL_MY_DATA" exactly to confirm deletion',
      }),
  })
  .strict()
  .refine(
    (data) => {
      // Additional safety check - ensure confirmation is exact match
      // This prevents accidental deletions from typos or case variations
      return data.confirmation === "DELETE_ALL_MY_DATA";
    },
    {
      message:
        'Confirmation must be exactly "DELETE_ALL_MY_DATA" (case-sensitive)',
      path: ["confirmation"],
    },
  );

// Type exports for use in other files
export type GDPRDeleteUserDataInput = z.infer<typeof gdprDeleteUserDataSchema>;

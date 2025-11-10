/**
 * Validation schemas for evidence management IPC channels
 *
 * Implements comprehensive validation for all evidence-related operations including
 * creation, updates, queries, and deletion with security-focused sanitization.
 */

import { z } from "zod";
import {
  MAX_PATH_LENGTH,
  MAX_STRING_LENGTH,
  MAX_TITLE_LENGTH,
  VALID_EVIDENCE_TYPES,
} from "../utils/constants.ts";
import { sanitizeFilePath } from "../utils/sanitizers.ts";

/**
 * Schema for evidence creation request
 * Validates all required fields with proper data types and sanitization
 */
export const evidenceCreateSchema = z.object({
  input: z
    .object({
      caseId: z
        .number({
          message: "Case ID is required and must be a number",
        })
        .int("Case ID must be an integer")
        .positive("Case ID must be positive"),

      title: z
        .string()
        .min(1, "Title is required")
        .max(
          MAX_TITLE_LENGTH,
          `Title must be less than ${MAX_TITLE_LENGTH} characters`,
        )
        .trim(),

      evidenceType: z.enum(VALID_EVIDENCE_TYPES, {
        message: "Please select a valid evidence type",
      }),

      filePath: z
        .string()
        .max(
          MAX_PATH_LENGTH,
          `File path must be less than ${MAX_PATH_LENGTH} characters`,
        )
        .transform(sanitizeFilePath)
        .refine(
          (path) => !path.includes(".."),
          "File path contains invalid traversal characters",
        )
        .optional(),

      content: z
        .string()
        .max(
          MAX_STRING_LENGTH,
          `Content must be less than ${MAX_STRING_LENGTH} characters`,
        )
        .trim()
        .optional(),

      obtainedDate: z
        .string()
        .datetime({ message: "Invalid date format" })
        .optional()
        .refine((date) => {
          if (!date) {
            return true;
          }
          // Don't allow dates more than 50 years in the past
          const minDate = new Date();
          minDate.setFullYear(minDate.getFullYear() - 50);
          // Don't allow future dates
          return new Date(date) >= minDate && new Date(date) <= new Date();
        }, "Evidence date must be within the last 50 years and not in the future"),

      // Fields that should NOT be provided by client (will be set server-side)
      id: z.never().optional(), // Auto-generated
      createdAt: z.never().optional(), // Auto-generated
      updatedAt: z.never().optional(), // Auto-generated
    })
    .strict() // No additional properties allowed
    .refine(
      (data) => data.filePath ?? data.content,
      "Either file path or content must be provided",
    ),
});

/**
 * Schema for getting evidence by ID
 * Simple validation with just an ID
 */
export const evidenceGetByIdSchema = z.object({
  id: z
    .number({
      message: "Evidence ID is required and must be a number",
    })
    .int("Evidence ID must be an integer")
    .positive("Evidence ID must be positive")
    .max(2147483647, "Evidence ID exceeds maximum value"), // Max int32
});

/**
 * Schema for getting all evidence with optional type filter
 */
export const evidenceGetAllSchema = z.object({
  evidenceType: z
    .enum(VALID_EVIDENCE_TYPES, {
      message: "Please select a valid evidence type",
    })
    .optional(),
});

/**
 * Schema for getting evidence by case ID
 */
export const evidenceGetByCaseSchema = z.object({
  caseId: z
    .union([z.string(), z.number()], {
      message: "Case ID is required",
    })
    .transform((val) => {
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        throw new Error("Case ID must be a positive integer");
      }
      if (num > 2147483647) {
        throw new Error("Case ID exceeds maximum value");
      }
      return num;
    }),
});

/**
 * Schema for evidence update request
 * Partial update with all fields optional except ID
 */
export const evidenceUpdateSchema = z.object({
  id: z
    .number({
      message: "Evidence ID is required and must be a number",
    })
    .int("Evidence ID must be an integer")
    .positive("Evidence ID must be positive"),

  input: z
    .object({
      title: z
        .string()
        .min(1, "Title cannot be empty")
        .max(
          MAX_TITLE_LENGTH,
          `Title must be less than ${MAX_TITLE_LENGTH} characters`,
        )
        .trim()
        .optional(),

      evidenceType: z
        .enum([...VALID_EVIDENCE_TYPES] as [string, ...string[]], {
          message: "Please select a valid evidence type",
        })
        .optional(),

      filePath: z
        .string()
        .max(
          MAX_PATH_LENGTH,
          `File path must be less than ${MAX_PATH_LENGTH} characters`,
        )
        .transform(sanitizeFilePath)
        .refine(
          (path) => !path.includes(".."),
          "File path contains invalid traversal characters",
        )
        .optional(),

      content: z
        .string()
        .max(
          MAX_STRING_LENGTH,
          `Content must be less than ${MAX_STRING_LENGTH} characters`,
        )
        .trim()
        .optional(),

      obtainedDate: z
        .string()
        .datetime({ message: "Invalid date format" })
        .optional()
        .nullable(),

      // Fields that should NOT be updated by client
      caseId: z.never().optional(), // Cannot change associated case
      id: z.never().optional(),
      createdAt: z.never().optional(),
      updatedAt: z.never().optional(), // Will be set server-side
    })
    .strict() // No additional properties allowed
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field must be provided for update",
    ),
});

/**
 * Schema for evidence deletion
 * Simple ID validation
 */
export const evidenceDeleteSchema = z.object({
  id: z
    .number({
      message: "Evidence ID is required and must be a number",
    })
    .int("Evidence ID must be an integer")
    .positive("Evidence ID must be positive")
    .max(2147483647, "Evidence ID exceeds maximum value"),
});

// Type exports for use in other files
export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;
export type EvidenceGetByIdInput = z.infer<typeof evidenceGetByIdSchema>;
export type EvidenceGetAllInput = z.infer<typeof evidenceGetAllSchema>;
export type EvidenceGetByCaseInput = z.infer<typeof evidenceGetByCaseSchema>;
export type EvidenceUpdateInput = z.infer<typeof evidenceUpdateSchema>;
export type EvidenceDeleteInput = z.infer<typeof evidenceDeleteSchema>;

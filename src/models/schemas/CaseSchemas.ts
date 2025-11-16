/**
 * Validation schemas for Case model
 *
 * Provides Zod schemas for validating Case inputs in repositories and services.
 */

import { z } from "zod";

/**
 * Enum for case types
 */
export const CaseTypeSchema = z.enum([
  "civil",
  "criminal",
  "family",
  "employment",
  "property",
  "other",
]);

/**
 * Enum for case status
 */
export const CaseStatusSchema = z.enum([
  "active",
  "pending",
  "closed",
  "archived",
]);

/**
 * Schema for creating a new case
 */
export const createCaseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),

  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .nullable(),

  caseType: CaseTypeSchema,

  userId: z
    .number()
    .int("User ID must be an integer")
    .positive("User ID must be positive")
    .optional(), // Optional because it might be set from session

  tags: z
    .array(z.string().trim())
    .max(10, "Maximum 10 tags allowed")
    .optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for updating an existing case
 */
export const updateCaseSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be less than 200 characters")
      .trim()
      .optional(),

    description: z
      .string()
      .max(5000, "Description must be less than 5000 characters")
      .nullable()
      .optional(),

    caseType: CaseTypeSchema.optional(),

    status: CaseStatusSchema.optional(),

    tags: z
      .array(z.string().trim())
      .max(10, "Maximum 10 tags allowed")
      .optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Schema for case search/filter criteria
 */
export const caseSearchSchema = z.object({
  userId: z.number().int().positive().optional(),
  status: CaseStatusSchema.optional(),
  caseType: CaseTypeSchema.optional(),
  searchTerm: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * Type exports for TypeScript
 */
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CaseSearchCriteria = z.infer<typeof caseSearchSchema>;
export type CaseType = z.infer<typeof CaseTypeSchema>;
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

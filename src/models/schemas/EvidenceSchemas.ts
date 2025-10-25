/**
 * Validation schemas for Evidence model
 *
 * Provides Zod schemas for validating Evidence inputs in repositories and services.
 */

import { z } from 'zod';

/**
 * Enum for evidence types
 */
export const EvidenceTypeSchema = z.enum([
  'document',
  'photo',
  'video',
  'audio',
  'email',
  'text_message',
  'witness_statement',
  'expert_report',
  'physical',
  'other'
]);

/**
 * Schema for creating new evidence
 */
export const createEvidenceSchema = z.object({
  caseId: z
    .number()
    .int('Case ID must be an integer')
    .positive('Case ID must be positive'),

  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),

  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),

  evidenceType: EvidenceTypeSchema,

  filePath: z
    .string()
    .max(500, 'File path must be less than 500 characters')
    .optional()
    .nullable(),

  fileSize: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024, 'File size must be less than 500MB')
    .optional()
    .nullable(),

  mimeType: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid MIME type format')
    .optional()
    .nullable(),

  dateCollected: z
    .string()
    .datetime()
    .or(z.date())
    .optional()
    .nullable(),

  source: z
    .string()
    .max(200, 'Source must be less than 200 characters')
    .optional()
    .nullable(),

  tags: z
    .array(z.string().trim())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
});

/**
 * Schema for updating evidence
 */
export const updateEvidenceSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),

  evidenceType: EvidenceTypeSchema.optional(),

  filePath: z
    .string()
    .max(500, 'File path must be less than 500 characters')
    .nullable()
    .optional(),

  fileSize: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024, 'File size must be less than 500MB')
    .nullable()
    .optional(),

  mimeType: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid MIME type format')
    .nullable()
    .optional(),

  dateCollected: z
    .string()
    .datetime()
    .or(z.date())
    .nullable()
    .optional(),

  source: z
    .string()
    .max(200, 'Source must be less than 200 characters')
    .nullable()
    .optional(),

  tags: z
    .array(z.string().trim())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Schema for evidence search/filter criteria
 */
export const evidenceSearchSchema = z.object({
  caseId: z.number().int().positive().optional(),
  evidenceType: EvidenceTypeSchema.optional(),
  searchTerm: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  collectedAfter: z.date().optional(),
  collectedBefore: z.date().optional(),
  hasFile: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

/**
 * Type exports for TypeScript
 */
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type EvidenceSearchCriteria = z.infer<typeof evidenceSearchSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
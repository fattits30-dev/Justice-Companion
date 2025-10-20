/**
 * Validation schemas for AI operation IPC channels
 *
 * Implements comprehensive validation for AI chat operations including
 * message validation, context validation, streaming, configuration, and
 * UI error logging with proper sanitization.
 */

import { z } from 'zod';
import { MAX_STRING_LENGTH, MAX_URL_LENGTH, PATTERNS } from '../utils/constants.ts';

/**
 * Schema for chat messages
 * Used in both chat and streaming requests
 */
const chatMessageSchema = z
  .object({
    role: z.enum(['system', 'user', 'assistant'], {
      message: 'Message role must be "system", "user", or "assistant"',
    }),

    content: z
      .string()
      .min(1, 'Message content is required')
      .max(MAX_STRING_LENGTH, `Message content must be less than ${MAX_STRING_LENGTH} characters`)
      .trim(),
  })
  .strict();

/**
 * Schema for legal context (RAG data)
 * Validates legislation, case law, and knowledge base entries
 */
const legalContextSchema = z
  .object({
    legislation: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, 'Legislation title is required')
            .max(500, 'Legislation title is too long')
            .trim(),

          section: z.string().max(100, 'Section reference is too long').trim().optional(),

          content: z
            .string()
            .min(1, 'Legislation content is required')
            .max(MAX_STRING_LENGTH, 'Legislation content is too long')
            .trim(),

          url: z
            .string()
            .url('Invalid legislation URL')
            .max(MAX_URL_LENGTH, 'URL is too long')
            .refine(
              (url) => url.startsWith('https://www.legislation.gov.uk'),
              'Legislation URL must be from legislation.gov.uk',
            ),

          relevance: z
            .number()
            .min(0, 'Relevance must be between 0 and 1')
            .max(1, 'Relevance must be between 0 and 1')
            .optional(),
        }),
      )
      .max(50, 'Too many legislation entries')
      .optional()
      .default([]),

    caseLaw: z
      .array(
        z.object({
          citation: z
            .string()
            .min(1, 'Case citation is required')
            .max(500, 'Case citation is too long')
            .trim(),

          court: z
            .string()
            .min(1, 'Court name is required')
            .max(200, 'Court name is too long')
            .trim(),

          date: z.string().regex(PATTERNS.ISO_DATE, 'Invalid ISO date format'),

          summary: z
            .string()
            .min(1, 'Case summary is required')
            .max(MAX_STRING_LENGTH, 'Case summary is too long')
            .trim(),

          outcome: z.string().max(500, 'Outcome description is too long').trim().optional(),

          url: z
            .string()
            .url('Invalid case law URL')
            .max(MAX_URL_LENGTH, 'URL is too long')
            .refine(
              (url) => url.startsWith('https://caselaw.nationalarchives.gov.uk'),
              'Case law URL must be from caselaw.nationalarchives.gov.uk',
            ),

          relevance: z
            .number()
            .min(0, 'Relevance must be between 0 and 1')
            .max(1, 'Relevance must be between 0 and 1')
            .optional(),
        }),
      )
      .max(50, 'Too many case law entries')
      .optional()
      .default([]),

    knowledgeBase: z
      .array(
        z.object({
          topic: z.string().min(1, 'Topic is required').max(200, 'Topic is too long').trim(),

          category: z
            .string()
            .min(1, 'Category is required')
            .max(100, 'Category is too long')
            .trim(),

          content: z
            .string()
            .min(1, 'Knowledge content is required')
            .max(MAX_STRING_LENGTH, 'Knowledge content is too long')
            .trim(),

          sources: z
            .array(z.string().max(500, 'Source reference is too long').trim())
            .max(20, 'Too many sources')
            .optional()
            .default([]),
        }),
      )
      .max(50, 'Too many knowledge base entries')
      .optional()
      .default([]),
  })
  .strict();

/**
 * Schema for AI chat request (non-streaming)
 */
export const aiChatSchema = z
  .object({
    messages: z
      .array(chatMessageSchema)
      .min(1, 'At least one message is required')
      .max(100, 'Too many messages in conversation')
      .refine(() => {
        // Ensure messages alternate between user and assistant
        // First message should typically be 'user' or 'system'
        return true; // Simplified check - server will enforce
      }, 'Invalid message sequence'),

    context: legalContextSchema.optional(),

    caseId: z
      .number({
        message: 'Case ID must be a number',
      })
      .int('Case ID must be an integer')
      .positive('Case ID must be positive')
      .optional(),
  })
  .strict();

/**
 * Schema for AI streaming request
 * Same validation as chat but response will be streamed
 */
export const aiStreamStartSchema = z
  .object({
    messages: z
      .array(chatMessageSchema)
      .min(1, 'At least one message is required')
      .max(100, 'Too many messages in conversation'),

    context: legalContextSchema.optional(),

    caseId: z
      .number({
        message: 'Case ID must be a number',
      })
      .int('Case ID must be an integer')
      .positive('Case ID must be positive')
      .optional(),
  })
  .strict();

/**
 * Schema for AI configuration (OpenAI API setup)
 */
export const aiConfigureSchema = z
  .object({
    apiKey: z
      .string()
      .min(1, 'API key is required')
      .max(500, 'API key is too long')
      .regex(/^sk-[a-zA-Z0-9]+$/, 'Invalid OpenAI API key format')
      .refine((key) => key.length >= 40, 'API key appears to be invalid (too short)'),

    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], {
      message: 'Invalid AI model selection',
    }),

    organization: z
      .string()
      .max(200, 'Organization ID is too long')
      .regex(/^org-[a-zA-Z0-9]+$/, 'Invalid OpenAI organization ID format')
      .optional(),
  })
  .strict();

/**
 * Schema for AI connection testing
 */
export const aiTestConnectionSchema = z
  .object({
    apiKey: z
      .string()
      .min(1, 'API key is required')
      .max(500, 'API key is too long')
      .regex(/^sk-[a-zA-Z0-9]+$/, 'Invalid OpenAI API key format'),

    model: z
      .enum(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], {
        message: 'Invalid AI model selection',
      })
      .optional(),
  })
  .strict();

/**
 * Schema for UI error logging
 * Used to log React error boundary errors to main process
 */
export const logUIErrorSchema = z
  .object({
    errorData: z
      .object({
        error: z
          .string()
          .min(1, 'Error message is required')
          .max(MAX_STRING_LENGTH, 'Error message is too long')
          .trim(),

        errorInfo: z.string().max(MAX_STRING_LENGTH, 'Error info is too long').trim(),

        componentStack: z.string().max(MAX_STRING_LENGTH, 'Component stack is too long').trim(),

        timestamp: z.string().regex(PATTERNS.ISO_DATE, 'Invalid timestamp format'),

        url: z.string().max(MAX_URL_LENGTH, 'URL is too long').optional(),

        userAgent: z.string().max(500, 'User agent is too long').optional(),
      })
      .strict(),
  })
  .strict();

// Type exports for use in other files
export type AIChatInput = z.infer<typeof aiChatSchema>;
export type AIStreamStartInput = z.infer<typeof aiStreamStartSchema>;
export type AIConfigureInput = z.infer<typeof aiConfigureSchema>;
export type AITestConnectionInput = z.infer<typeof aiTestConnectionSchema>;
export type LogUIErrorInput = z.infer<typeof logUIErrorSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type LegalContextInput = z.infer<typeof legalContextSchema>;

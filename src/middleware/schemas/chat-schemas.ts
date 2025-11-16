/**
 * Validation schemas for chat IPC channels
 *
 * Implements comprehensive validation for AI chat operations including
 * message sending, session management, and context handling.
 */

import { z } from "zod";
import { PATTERNS } from "../utils/constants.ts";

/**
 * Maximum message length for chat messages
 * Balances between allowing detailed legal questions and preventing abuse
 */
const MAX_CHAT_MESSAGE_LENGTH = 10000;

/**
 * Minimum message length to ensure meaningful input
 */
const MIN_CHAT_MESSAGE_LENGTH = 1;

/**
 * Schema for sending chat messages to AI legal assistant
 *
 * @example
 * ```typescript
 * {
 *   message: "What are the key points I should include in an employment tribunal claim?",
 *   sessionId: "123e4567-e89b-12d3-a456-426614174000",
 *   caseId: 42
 * }
 * ```
 */
export const chatSendSchema = z
  .object({
    message: z
      .string()
      .min(MIN_CHAT_MESSAGE_LENGTH, "Message cannot be empty")
      .max(
        MAX_CHAT_MESSAGE_LENGTH,
        `Message must be less than ${MAX_CHAT_MESSAGE_LENGTH} characters`,
      )
      .trim()
      .refine((msg) => msg.length > 0, "Message cannot be only whitespace"),

    sessionId: z
      .string()
      .min(1, "Session ID is required")
      .regex(PATTERNS.UUID, "Invalid session ID format")
      .describe("UUID v4 session identifier for authentication"),

    caseId: z
      .number({
        message: "Case ID must be a number",
      })
      .int("Case ID must be an integer")
      .positive("Case ID must be positive")
      .max(2147483647, "Case ID exceeds maximum value")
      .optional()
      .describe("Optional case context for AI responses"),

    // Optional model selection for future multi-model support
    model: z
      .string()
      .max(100, "Model name too long")
      .regex(/^[a-z0-9-_.]+$/i, "Invalid model name format")
      .optional()
      .describe("Optional AI model selection"),

    // Optional temperature control for response creativity
    temperature: z
      .number()
      .min(0, "Temperature must be between 0 and 2")
      .max(2, "Temperature must be between 0 and 2")
      .optional()
      .describe("Controls response randomness (0=deterministic, 2=creative)"),

    // Fields that should NOT be provided by client
    userId: z.never().optional(), // Will be extracted from session
    timestamp: z.never().optional(), // Will be set server-side
    id: z.never().optional(), // Auto-generated
  })
  .strict(); // No additional properties allowed

/**
 * Schema for retrieving chat conversation history
 *
 * @example
 * ```typescript
 * {
 *   sessionId: "123e4567-e89b-12d3-a456-426614174000",
 *   caseId: 42,
 *   limit: 50
 * }
 * ```
 */
export const chatGetHistorySchema = z
  .object({
    sessionId: z
      .string()
      .min(1, "Session ID is required")
      .regex(PATTERNS.UUID, "Invalid session ID format"),

    caseId: z
      .number({
        message: "Case ID must be a number",
      })
      .int("Case ID must be an integer")
      .positive("Case ID must be positive")
      .optional(),

    limit: z
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .max(1000, "Limit cannot exceed 1000 messages")
      .default(100)
      .optional(),

    offset: z
      .number()
      .int("Offset must be an integer")
      .min(0, "Offset cannot be negative")
      .default(0)
      .optional(),
  })
  .strict();

/**
 * Schema for clearing chat conversation history
 *
 * @example
 * ```typescript
 * {
 *   sessionId: "123e4567-e89b-12d3-a456-426614174000",
 *   caseId: 42
 * }
 * ```
 */
export const chatClearHistorySchema = z
  .object({
    sessionId: z
      .string()
      .min(1, "Session ID is required")
      .regex(PATTERNS.UUID, "Invalid session ID format"),

    caseId: z
      .number({
        message: "Case ID must be a number",
      })
      .int("Case ID must be an integer")
      .positive("Case ID must be positive")
      .optional()
      .describe(
        "If provided, clears only this case conversation; otherwise clears all",
      ),

    confirmation: z
      .boolean()
      .refine(
        (val) => val === true,
        "Confirmation is required to clear history",
      )
      .describe("Must be true to confirm deletion"),
  })
  .strict();

/**
 * Schema for exporting chat conversation
 *
 * @example
 * ```typescript
 * {
 *   sessionId: "123e4567-e89b-12d3-a456-426614174000",
 *   caseId: 42,
 *   format: "json"
 * }
 * ```
 */
export const chatExportSchema = z
  .object({
    sessionId: z
      .string()
      .min(1, "Session ID is required")
      .regex(PATTERNS.UUID, "Invalid session ID format"),

    caseId: z
      .number({
        message: "Case ID must be a number",
      })
      .int("Case ID must be an integer")
      .positive("Case ID must be positive")
      .optional(),

    format: z
      .enum(["json", "txt", "pdf", "markdown"], {
        message: "Format must be json, txt, pdf, or markdown",
      })
      .default("json")
      .optional(),

    includeSystemMessages: z.boolean().default(false).optional(),
  })
  .strict();

// Type exports for use in other files
export type ChatSendInput = z.infer<typeof chatSendSchema>;
export type ChatGetHistoryInput = z.infer<typeof chatGetHistorySchema>;
export type ChatClearHistoryInput = z.infer<typeof chatClearHistorySchema>;
export type ChatExportInput = z.infer<typeof chatExportSchema>;

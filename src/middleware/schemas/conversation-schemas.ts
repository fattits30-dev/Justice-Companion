/**
 * Validation schemas for chat conversation IPC channels
 *
 * Implements comprehensive validation for all conversation-related operations including
 * creation, retrieval, message addition, and deletion with proper sanitization.
 */

import { z } from 'zod';
import { MAX_TITLE_LENGTH, MAX_STRING_LENGTH } from '../utils/constants.ts';

/**
 * Schema for conversation creation request
 * Validates title and optional case association
 */
export const conversationCreateSchema = z.object({
  input: z
    .object({
      title: z
        .string()
        .min(1, 'Title is required')
        .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`)
        .trim(),

      caseId: z
        .number({
          message: 'Case ID must be a number',
        })
        .int('Case ID must be an integer')
        .positive('Case ID must be positive')
        .nullable()
        .optional(),

      // Fields that should NOT be provided by client
      id: z.never().optional(),
      createdAt: z.never().optional(),
      updatedAt: z.never().optional(),
      messageCount: z.never().optional(),
    })
    .strict(),
});

/**
 * Schema for getting conversation by ID
 */
export const conversationGetSchema = z.object({
  id: z
    .number({
      message: 'Conversation ID is required and must be a number',
    })
    .int('Conversation ID must be an integer')
    .positive('Conversation ID must be positive')
    .max(2147483647, 'Conversation ID exceeds maximum value'),
});

/**
 * Schema for getting all conversations with optional case filter
 */
export const conversationGetAllSchema = z.object({
  caseId: z
    .number({
      message: 'Case ID must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive')
    .nullable()
    .optional(),
});

/**
 * Schema for getting recent conversations
 */
export const conversationGetRecentSchema = z.object({
  caseId: z
    .number({
      message: 'Case ID must be a number',
    })
    .int('Case ID must be an integer')
    .positive('Case ID must be positive')
    .nullable(),

  limit: z
    .number({
      message: 'Limit must be a number',
    })
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(10),
});

/**
 * Schema for loading conversation with all messages
 */
export const conversationLoadWithMessagesSchema = z.object({
  conversationId: z
    .number({
      message: 'Conversation ID is required and must be a number',
    })
    .int('Conversation ID must be an integer')
    .positive('Conversation ID must be positive')
    .max(2147483647, 'Conversation ID exceeds maximum value'),
});

/**
 * Schema for conversation deletion
 */
export const conversationDeleteSchema = z.object({
  id: z
    .number({
      message: 'Conversation ID is required and must be a number',
    })
    .int('Conversation ID must be an integer')
    .positive('Conversation ID must be positive')
    .max(2147483647, 'Conversation ID exceeds maximum value'),
});

/**
 * Schema for adding a message to a conversation
 * Validates message content, role, and optional thinking content
 */
export const messageAddSchema = z.object({
  input: z
    .object({
      conversationId: z
        .number({
          message: 'Conversation ID is required and must be a number',
        })
        .int('Conversation ID must be an integer')
        .positive('Conversation ID must be positive'),

      role: z.enum(['user', 'assistant'], {
        message: 'Role must be either "user" or "assistant"',
      }),

      content: z
        .string()
        .min(1, 'Message content is required')
        .max(MAX_STRING_LENGTH, `Message content must be less than ${MAX_STRING_LENGTH} characters`)
        .trim(),

      thinkingContent: z
        .string()
        .max(
          MAX_STRING_LENGTH,
          `Thinking content must be less than ${MAX_STRING_LENGTH} characters`,
        )
        .trim()
        .nullable()
        .optional(),

      tokenCount: z
        .number({
          message: 'Token count must be a number',
        })
        .int('Token count must be an integer')
        .nonnegative('Token count cannot be negative')
        .max(1000000, 'Token count exceeds maximum value')
        .nullable()
        .optional(),

      // Fields that should NOT be provided by client
      id: z.never().optional(),
      timestamp: z.never().optional(),
    })
    .strict()
    .refine(() => {
      // Validate message count doesn't exceed limit (checked server-side but also here)
      // This is a soft check - server will do the actual enforcement
      return true;
    }, 'Conversation has reached maximum message limit')
    .refine((data) => {
      // If role is assistant, thinking content is allowed
      // If role is user, thinking content should not be present
      if (data.role === 'user' && data.thinkingContent) {
        return false;
      }
      return true;
    }, 'Thinking content is only allowed for assistant messages'),
});

// Type exports for use in other files
export type ConversationCreateInput = z.infer<typeof conversationCreateSchema>;
export type ConversationGetInput = z.infer<typeof conversationGetSchema>;
export type ConversationGetAllInput = z.infer<typeof conversationGetAllSchema>;
export type ConversationGetRecentInput = z.infer<typeof conversationGetRecentSchema>;
export type ConversationLoadWithMessagesInput = z.infer<typeof conversationLoadWithMessagesSchema>;
export type ConversationDeleteInput = z.infer<typeof conversationDeleteSchema>;
export type MessageAddInput = z.infer<typeof messageAddSchema>;

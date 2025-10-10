import { z } from 'zod';

/**
 * Zod Validation Schemas for OpenAI API Integration
 *
 * Following /api workflow security best practices:
 * - Validate all input data
 * - Sanitize user input
 * - Type-safe IPC communication
 */

/**
 * OpenAI API Key Validation
 * Format: sk-proj-... or sk-...
 */
export const OpenAIAPIKeySchema = z
  .string()
  .trim()
  .min(1, 'API key is required')
  .refine(
    (key) => key.startsWith('sk-proj-') || key.startsWith('sk-'),
    'Invalid OpenAI API key format (must start with sk-proj- or sk-)',
  );

/**
 * OpenAI Model Selection
 * Supported models for legal Q&A
 */
export const OpenAIModelSchema = z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], {
  message: 'Model must be one of: gpt-4o, gpt-4o-mini, gpt-3.5-turbo',
});

/**
 * OpenAI Organization ID (Optional)
 * Format: org-...
 */
export const OpenAIOrganizationSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (org) => !org || org.startsWith('org-'),
    'Invalid organization ID format (must start with org-)',
  );

/**
 * Complete OpenAI Configuration Schema
 * Used for ai:configure IPC handler
 */
export const OpenAIConfigSchema = z.object({
  apiKey: OpenAIAPIKeySchema,
  model: OpenAIModelSchema,
  organization: OpenAIOrganizationSchema,
});

/**
 * OpenAI Connection Test Request
 * Used for ai:testConnection IPC handler
 */
export const OpenAITestConnectionSchema = z.object({
  apiKey: OpenAIAPIKeySchema,
  model: OpenAIModelSchema.optional().default('gpt-4o'),
});

/**
 * OpenAI Streaming Chat Request
 * Extends existing AIChatRequest with OpenAI-specific validation
 */
export const OpenAIChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1, 'Message content cannot be empty').max(10000, 'Message too long'),
        timestamp: z.string().optional(),
      }),
    )
    .min(1, 'At least one message is required'),
  context: z
    .object({
      legislation: z.array(z.any()).optional(),
      caseLaw: z.array(z.any()).optional(),
      knowledgeBase: z.array(z.any()).optional(),
    })
    .optional(),
  config: z
    .object({
      temperature: z.number().min(0).max(1).optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
    })
    .optional(),
  caseId: z.number().positive().optional(),
});

/**
 * Type exports for TypeScript usage
 */
export type OpenAIConfigInput = z.input<typeof OpenAIConfigSchema>;
export type OpenAIConfigOutput = z.output<typeof OpenAIConfigSchema>;
export type OpenAITestConnectionInput = z.input<typeof OpenAITestConnectionSchema>;
export type OpenAIChatRequestInput = z.input<typeof OpenAIChatRequestSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate and sanitize OpenAI API key
 * Removes whitespace and validates format
 *
 * @param apiKey - Raw API key from user input
 * @returns Validated API key
 * @throws ZodError if validation fails
 */
export function validateAPIKey(apiKey: string): string {
  return OpenAIAPIKeySchema.parse(apiKey);
}

/**
 * Validate OpenAI configuration
 *
 * @param config - Raw configuration object
 * @returns Validated configuration
 * @throws ZodError if validation fails
 */
export function validateOpenAIConfig(config: unknown): OpenAIConfigOutput {
  return OpenAIConfigSchema.parse(config);
}

/**
 * Sanitize chat request for security
 * - Removes XSS attempts
 * - Validates message length
 * - Ensures no script injection
 *
 * @param request - Raw chat request
 * @returns Sanitized and validated request
 * @throws ZodError if validation fails
 */
export function sanitizeChatRequest(request: unknown): OpenAIChatRequestInput {
  const validated = OpenAIChatRequestSchema.parse(request);

  // Additional sanitization: Remove script tags and potential XSS
  const sanitized = {
    ...validated,
    messages: validated.messages.map((msg) => ({
      ...msg,
      content: sanitizeString(msg.content),
    })),
  };

  return sanitized;
}

/**
 * Sanitize string input (remove script tags, etc.)
 * Basic XSS prevention for text content
 *
 * @param input - Raw string input
 * @returns Sanitized string
 */
function sanitizeString(input: string): string {
  return (
    input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      .trim()
  );
}

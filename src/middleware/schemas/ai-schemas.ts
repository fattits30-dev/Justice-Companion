/**
 * AI Validation Schemas (Stubs)
 * 
 * NOTE: AI features deferred to v2.0
 * These are placeholder schemas to maintain type safety.
 * Full implementation will come in v2.0.
 */

import { z } from "zod";

// AI Chat schema (stub)
export const aiChatSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
}).optional();

// AI Stream Start schema (stub)
export const aiStreamStartSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
}).optional();

// AI Configure schema (stub)
export const aiConfigureSchema = z.object({
  provider: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  model: z.string().optional(),
}).optional();

// AI Test Connection schema (stub)
export const aiTestConnectionSchema = z.object({
  provider: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
}).optional();

// UI Error logging schema
export const logUIErrorSchema = z.object({
  error: z.string(),
  componentStack: z.string().optional(),
  timestamp: z.string().optional(),
}).optional();

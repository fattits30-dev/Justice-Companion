/**
 * Validation schemas for AI model download IPC channels
 *
 * Implements comprehensive validation for model management operations including
 * checking download status, starting downloads, and deleting models.
 */

import { z } from "zod";

/**
 * Model ID validation helper
 * Ensures model IDs follow expected format
 */
const modelIdSchema = z
  .string()
  .min(1, "Model ID is required")
  .max(200, "Model ID is too long")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Model ID can only contain letters, numbers, dots, underscores, and hyphens",
  )
  .refine((id) => {
    // Prevent path traversal attempts in model IDs
    return !id.includes("..") && !id.includes("/") && !id.includes("\\");
  }, "Model ID contains invalid characters")
  .refine((id) => {
    // Ensure reasonable model ID format
    // Typical format: "provider-model-size" (e.g., "llama-3-8b", "phi-2-2.7b")
    const parts = id.split("-");
    return parts.length >= 2 && parts.length <= 5;
  }, "Model ID format is invalid");

/**
 * Schema for checking if a model is downloaded
 */
export const modelIsDownloadedSchema = z
  .object({
    modelId: modelIdSchema,
  })
  .strict();

/**
 * Schema for starting a model download
 */
export const modelDownloadStartSchema = z
  .object({
    modelId: modelIdSchema,
  })
  .strict()
  .refine(
    (data) => {
      // Additional validation: ensure model ID is from a known set
      // This should be checked against available models list server-side
      // but we can do basic format validation here
      const validPrefixes = [
        "llama",
        "phi",
        "mistral",
        "qwen",
        "gemma",
        "codellama",
        "deepseek",
        "openchat",
        "solar",
        "neural",
      ];

      const hasValidPrefix = validPrefixes.some((prefix) =>
        data.modelId.toLowerCase().startsWith(prefix),
      );

      return hasValidPrefix;
    },
    {
      message: "Model ID does not appear to be from a supported model provider",
      path: ["modelId"],
    },
  );

/**
 * Schema for deleting a downloaded model
 */
export const modelDeleteSchema = z
  .object({
    modelId: modelIdSchema,
  })
  .strict()
  .refine(
    (data) => {
      // Prevent deletion of system models or special identifiers
      const protectedIds = ["system", "default", "built-in", "core"];
      return !protectedIds.includes(data.modelId.toLowerCase());
    },
    {
      message: "Cannot delete protected system models",
      path: ["modelId"],
    },
  );

// Type exports for use in other files
export type ModelIsDownloadedInput = z.infer<typeof modelIsDownloadedSchema>;
export type ModelDownloadStartInput = z.infer<typeof modelDownloadStartSchema>;
export type ModelDeleteInput = z.infer<typeof modelDeleteSchema>;

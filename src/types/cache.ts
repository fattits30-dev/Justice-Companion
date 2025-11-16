import crypto from "node:crypto";
import type { PaginationParams } from "./pagination.ts";

/**
 * Cache key generation for decrypted values
 * Format: {entity}:{id}:{version}
 * Version = SHA-256 hash of encrypted value (detects stale cache)
 */
export interface CacheKey {
  entity: string;
  id: string | number;
  version: string; // Hash of encrypted value
}

/**
 * Generate cache key for a decrypted field value
 *
 * @param entity - Entity type (e.g., 'cases', 'evidence')
 * @param id - Entity ID
 * @param encryptedValue - Encrypted value string (JSON)
 * @returns Cache key string
 */
export function generateCacheKey(
  entity: string,
  id: string | number,
  encryptedValue: string,
): string {
  const version = crypto
    .createHash("sha256")
    .update(encryptedValue)
    .digest("hex")
    .substring(0, 16); // First 16 chars for brevity

  return `${entity}:${id}:${version}`;
}

/**
 * Generate pagination cache key for result sets
 * Format: {entity}:page:{cursor}:{limit}:{direction}
 *
 * @param entity - Entity type (e.g., 'cases', 'evidence')
 * @param params - Pagination parameters
 * @returns Page cache key string
 */
export function generatePageCacheKey(
  entity: string,
  params: PaginationParams,
): string {
  const cursorHash = params.cursor
    ? crypto
        .createHash("sha256")
        .update(params.cursor)
        .digest("hex")
        .substring(0, 8)
    : "start";

  return `${entity}:page:${cursorHash}:${params.limit}:${params.direction ?? "desc"}`;
}

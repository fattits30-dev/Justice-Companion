/**
 * Shared types for the API client module.
 *
 * @module api/types
 */

// ====================
// Configuration
// ====================

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, "baseURL">> = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// ====================
// Response Types
// ====================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ====================
// Pagination Types
// ====================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ====================
// Error Class
// ====================

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "UNKNOWN_ERROR",
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ====================
// Common Entity Types
// ====================

// Re-export domain types for convenience
export type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from "../../domains/cases/entities/Case";
export type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../../domains/evidence/entities/Evidence";

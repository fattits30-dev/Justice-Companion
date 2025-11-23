/**
 * HTTP REST API Client for Justice Companion
 *
 * Provides typed HTTP API client for communicating with FastAPI backend.
 * Replaces Electron IPC with HTTP REST endpoints.
 *
 * Features:
 * - Type-safe API calls with TypeScript
 * - Automatic retry with exponential backoff
 * - Request/response interceptors
 * - Error handling with detailed messages
 * - Session-based authentication
 *
 * @module apiClient
 */

import { ProviderMetadata } from "ai";
import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from "../domains/cases/entities/Case.ts";
import type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../domains/evidence/entities/Evidence.ts";

// ====================
// Configuration
// ====================

interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, "baseURL">> = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// ====================
// Response Types
// ====================

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

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
// API Client Class
// ====================

/**
 * Main API client for HTTP REST communication
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;
  private sessionId: string | null = null;

  constructor(config: ApiClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize session ID from localStorage if available (browser only)
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const storedSessionId = localStorage.getItem("sessionId");
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      }
    }
  }

  /**
   * Set session ID for authenticated requests
   */
  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean>;
      headers?: Record<string, string>;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      body,
      params,
      headers = {},
      retries = this.config.maxRetries,
    } = options;

    // Build URL with query parameters
    const url = new URL(`${this.config.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    // Add session ID as Authorization Bearer token (standard approach)
    if (this.sessionId) {
      requestHeaders["Authorization"] = `Bearer ${this.sessionId}`;
    }

    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    if (body && (method === "POST" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), requestOptions);

      // Parse response body
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData?.error?.message ||
            responseData?.message ||
            responseData?.detail ||
            "Request failed",
          responseData?.error?.code || "UNKNOWN_ERROR",
          responseData?.error?.details
        );
      }

      // Auto-wrap response if backend didn't wrap it
      // Backend should return {success: true, data: {...}}, but if it returns unwrapped data,
      // we wrap it here for consistency
      if (
        responseData &&
        typeof responseData === "object" &&
        !("success" in responseData)
      ) {
        return {
          success: true,
          data: responseData,
        } as T;
      }

      return responseData as T;
    } catch (error) {
      // Retry on network errors or 5xx errors
      if (
        retries > 0 &&
        (error instanceof TypeError || // Network error
          (error instanceof ApiError && error.status >= 500))
      ) {
        await this.delay(
          this.config.retryDelay * (this.config.maxRetries - retries + 1)
        );
        return this.request<T>(method, endpoint, {
          ...options,
          retries: retries - 1,
        });
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Unknown error",
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  private get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.request<T>("GET", endpoint, { params });
  }

  /**
   * POST request
   */
  private post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>("POST", endpoint, { body });
  }

  /**
   * PUT request
   */
  private put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", endpoint, { body });
  }

  /**
   * DELETE request
   */
  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>("DELETE", endpoint);
  }

  // ====================
  // Authentication API
  // ====================

  public auth = {
    /**
     * Register new user
     */
    register: async (
      username: string,
      email: string,
      password: string
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      try {
        // Backend wraps response in {success: true, data: {...}} via ResponseWrapperMiddleware
        const wrappedResponse = await this.post<{
          success: true;
          data: {
            user: {
              id: number;
              username: string;
              email: string;
              role: string;
              is_active: boolean;
            };
            session: {
              id: string;
              user_id: number;
              expires_at: string;
            };
          };
        }>("/auth/register", { username, email, password });

        // Extract data from wrapped response
        const data = wrappedResponse.data || (wrappedResponse as any);

        // Store session ID after successful registration
        this.setSessionId(data.session.id);
        localStorage.setItem("sessionId", data.session.id);

        // Return in ApiResponse format
        return {
          success: true,
          data: data,
        };
      } catch (error) {
        // Return error response
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message:
              error instanceof Error ? error.message : "Registration failed",
          },
        };
      }
    },

    /**
     * Login user
     */
    login: async (
      username: string,
      password: string,
      remember_me: boolean = false
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      try {
        // Backend wraps 200 OK responses with {success: true, data: {...}}
        const wrappedResponse = await this.post<{
          success: true;
          data: {
            user: {
              id: number;
              username: string;
              email: string;
              role: string;
              is_active: boolean;
            };
            session: {
              id: string;
              user_id: number;
              expires_at: string;
            };
          };
        }>("/auth/login", { username, password, remember_me });

        // Extract the data from the wrapped response
        const directResponse = wrappedResponse.data;

        // Store session ID after successful login
        this.setSessionId(directResponse.session.id);
        localStorage.setItem("sessionId", directResponse.session.id);

        // Return in ApiResponse format for consistency
        return {
          success: true,
          data: directResponse,
        };
      } catch (error) {
        // Return error response
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message: error instanceof Error ? error.message : "Login failed",
          },
        };
      }
    },

    /**
     * Logout user
     */
    logout: async (
      sessionId: string
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await this.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/logout", { session_id: sessionId });

      // Clear session ID after logout
      this.setSessionId(null);
      localStorage.removeItem("sessionId");

      return response;
    },

    /**
     * Get session and validate
     */
    getSession: async (
      sessionId: string
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      return this.get<
        ApiResponse<{
          user: {
            id: number;
            username: string;
            email: string;
            role: string;
            is_active: boolean;
          };
          session: {
            id: string;
            user_id: number;
            expires_at: string;
          };
        }>
      >(`/auth/session/${sessionId}`);
    },

    /**
     * Change password
     */
    changePassword: async (
      userId: number,
      oldPassword: string,
      newPassword: string
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await this.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/change-password", {
        user_id: userId,
        old_password: oldPassword,
        new_password: newPassword,
      });

      // Clear session after password change (all sessions invalidated)
      this.setSessionId(null);
      localStorage.removeItem("sessionId");

      return response;
    },
  };

  // ====================
  // Case Management API
  // ====================

  public cases = {
    /**
     * Get all cases with optional filters and pagination
     */
    list: async (options?: {
      status?: CaseStatus;
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<PaginatedResponse<Case>>> => {
      return this.get<ApiResponse<PaginatedResponse<Case>>>("/cases", options);
    },

    /**
     * Get single case by ID
     */
    get: async (caseId: number): Promise<ApiResponse<Case>> => {
      return this.get<ApiResponse<Case>>(`/cases/${caseId}`);
    },

    /**
     * Create new case
     */
    create: async (input: CreateCaseInput): Promise<ApiResponse<Case>> => {
      return this.post<ApiResponse<Case>>("/cases", input);
    },

    /**
     * Update existing case
     */
    update: async (
      caseId: number,
      input: UpdateCaseInput
    ): Promise<ApiResponse<Case>> => {
      return this.put<ApiResponse<Case>>(`/cases/${caseId}`, input);
    },

    /**
     * Delete case
     */
    delete: async (caseId: number): Promise<ApiResponse<void>> => {
      return this.delete<ApiResponse<void>>(`/cases/${caseId}`);
    },

    /**
     * Get case statistics
     */
    stats: async (): Promise<
      ApiResponse<{
        totalCases: number;
        activeCases: number;
        closedCases: number;
        pendingCases: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          totalCases: number;
          activeCases: number;
          closedCases: number;
          pendingCases: number;
        }>
      >("/cases/stats");
    },
  };

  // ====================
  // Evidence Management API
  // ====================

  public evidence = {
    /**
     * Get all evidence for a case
     */
    list: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return this.get<ApiResponse<Evidence[]>>(`/cases/${caseId}/evidence`);
    },

    /**
     * Get all evidence (global list)
     */
    listAll: async (options?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<Evidence[]>> => {
      return this.get<ApiResponse<Evidence[]>>("/evidence", options);
    },

    /**
     * Get all evidence for a case (alias for list)
     */
    listByCase: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return this.evidence.list(caseId);
    },

    /**
     * Get single evidence by ID
     */
    get: async (evidenceId: number): Promise<ApiResponse<Evidence>> => {
      return this.get<ApiResponse<Evidence>>(`/evidence/${evidenceId}`);
    },

    /**
     * Create new evidence
     */
    create: async (
      input: CreateEvidenceInput
    ): Promise<ApiResponse<Evidence>> => {
      return this.post<ApiResponse<Evidence>>("/evidence", input);
    },

    /**
     * Create evidence with file upload
     */
    upload: async (input: {
      caseId: number;
      title: string;
      content?: string;
      type: string;
      file?: File;
      fileName?: string;
    }): Promise<ApiResponse<Evidence>> => {
      const formData = new FormData();

      // Add text fields
      formData.append("case_id", input.caseId.toString());
      formData.append("title", input.title);
      formData.append("type", input.type);

      if (input.content) {
        formData.append("content", input.content);
      }

      if (input.fileName) {
        formData.append("file_name", input.fileName);
      }

      // Add file if provided
      if (input.file) {
        formData.append("file", input.file);
      }

      // Custom request for form data
      const url = new URL(`${this.config.baseURL}/evidence/upload`);

      // Build headers
      const headers: Record<string, string> = {};

      // Add session ID as Authorization Bearer token (standard approach)
      if (this.sessionId) {
        headers["Authorization"] = `Bearer ${this.sessionId}`;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      // Parse response body
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData?.error?.message ||
            responseData?.message ||
            "Upload failed",
          responseData?.error?.code || "UPLOAD_ERROR",
          responseData?.error?.details
        );
      }

      return responseData as ApiResponse<Evidence>;
    },

    /**
     * Update existing evidence
     */
    update: async (
      evidenceId: number,
      input: UpdateEvidenceInput
    ): Promise<ApiResponse<Evidence>> => {
      return this.put<ApiResponse<Evidence>>(`/evidence/${evidenceId}`, input);
    },

    /**
     * Delete evidence
     */
    delete: async (evidenceId: number): Promise<ApiResponse<void>> => {
      return this.delete<ApiResponse<void>>(`/evidence/${evidenceId}`);
    },

    /**
     * Download evidence file
     */
    download: async (evidenceId: number): Promise<Blob> => {
      const response = await fetch(
        `${this.config.baseURL}/evidence/${evidenceId}/download`,
        {
          headers: this.sessionId
            ? { Authorization: `Bearer ${this.sessionId}` }
            : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Download failed",
          "DOWNLOAD_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Get preview of evidence
     */
    preview: async (evidenceId: number): Promise<ApiResponse<{ url: string; metadata?: Record<string, unknown> }>> => {
      return this.get<ApiResponse<{ url: string; metadata?: Record<string, unknown> }>>(`/evidence/${evidenceId}/preview`);
    },

    /**
     * Parse evidence content
     */
    parse: async (
      evidenceId: number
    ): Promise<ApiResponse<{ content: string; metadata?: any }>> => {
      return this.post<ApiResponse<{ content: string; metadata?: any }>>(
        `/evidence/${evidenceId}/parse`,
        {}
      );
    },

    /**
     * Extract citations from evidence
     */
    extractCitations: async (
      evidenceId: number
    ): Promise<ApiResponse<any[]>> => {
      return this.post<ApiResponse<any[]>>(
        `/evidence/${evidenceId}/citations`,
        {}
      );
    },

    /**
     * Run OCR on evidence
     */
    runOCR: async (
      evidenceId: number,
      options?: { language?: string }
    ): Promise<ApiResponse<{ text: string; confidence?: number }>> => {
      const params: any = {};
      if (options?.language) {
        params.language = options.language;
      }

      return this.post<ApiResponse<{ text: string; confidence?: number }>>(
        `/evidence/${evidenceId}/ocr`,
        params
      );
    },

    /**
     * Bulk upload multiple evidence files
     */
    bulkUpload: async (
      files: Array<{
        file: File;
        caseId: number;
        title?: string;
        type?: string;
      }>
    ): Promise<ApiResponse<Evidence[]>> => {
      const formData = new FormData();

      // Add each file
      files.forEach((item, index) => {
        formData.append(`files[${index}]`, item.file);
        formData.append(`case_ids[${index}]`, item.caseId.toString());
        if (item.title) {
          formData.append(`titles[${index}]`, item.title);
        }
        if (item.type) {
          formData.append(`types[${index}]`, item.type);
        }
      });

      // Custom request for form data
      const url = new URL(`${this.config.baseURL}/evidence/bulk-upload`);

      // Build headers
      const headers: Record<string, string> = {};

      // Add session ID as Authorization Bearer token (standard approach)
      if (this.sessionId) {
        headers["Authorization"] = `Bearer ${this.sessionId}`;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout * 2), // Longer timeout for bulk uploads
      });

      // Parse response body
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData?.error?.message ||
            responseData?.message ||
            "Bulk upload failed",
          responseData?.error?.code || "BULK_UPLOAD_ERROR",
          responseData?.error?.details
        );
      }

      return responseData as ApiResponse<Evidence[]>;
    },
  };

  // ====================
  // Notifications API
  // ====================

  public notifications = {
    /**
     * List notifications with optional filters
     */
    list: async (options?: {
      unreadOnly?: boolean;
      type?: string;
      severity?: string;
      limit?: number;
      offset?: number;
      includeExpired?: boolean;
      includeDismissed?: boolean;
    }): Promise<ApiResponse<any[]>> => {
      const params: Record<string, string | number | boolean> = {};
      if (options?.unreadOnly !== undefined) {
        params.unreadOnly = options.unreadOnly;
      }
      if (options?.type) {
        params.type = options.type;
      }
      if (options?.severity) {
        params.severity = options.severity;
      }
      if (options?.limit !== undefined) {
        params.limit = options.limit;
      }
      if (options?.offset !== undefined) {
        params.offset = options.offset;
      }
      if (options?.includeExpired !== undefined) {
        params.includeExpired = options.includeExpired;
      }
      if (options?.includeDismissed !== undefined) {
        params.includeDismissed = options.includeDismissed;
      }

      return this.get<ApiResponse<any[]>>("/notifications", params);
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
      return this.get<ApiResponse<{ count: number }>>(
        "/notifications/unread/count"
      );
    },

    /**
     * Get notification statistics
     */
    getStats: async (): Promise<
      ApiResponse<{
        total: number;
        unread: number;
        urgent: number;
        high: number;
        medium: number;
        low: number;
        byType: Record<string, number>;
      }>
    > => {
      return this.get<
        ApiResponse<{
          total: number;
          unread: number;
          urgent: number;
          high: number;
          medium: number;
          low: number;
          byType: Record<string, number>;
        }>
      >("/notifications/stats");
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (
      notificationId: number
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return this.put<ApiResponse<{ success: boolean; message: string }>>(
        `/notifications/${notificationId}/read`,
        {}
      );
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<ApiResponse<{ count: number }>> => {
      return this.put<ApiResponse<{ count: number }>>(
        "/notifications/mark-all-read",
        {}
      );
    },

    /**
     * Delete (dismiss) notification
     */
    delete: async (
      notificationId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return this.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/notifications/${notificationId}`
      );
    },

    /**
     * Get notification preferences
     */
    getPreferences: async (): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>("/notifications/preferences");
    },

    /**
     * Update notification preferences
     */
    updatePreferences: async (preferences: {
      deadlineRemindersEnabled?: boolean;
      deadlineReminderDays?: number;
      caseUpdatesEnabled?: boolean;
      evidenceUpdatesEnabled?: boolean;
      systemAlertsEnabled?: boolean;
      soundEnabled?: boolean;
      desktopNotificationsEnabled?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    }): Promise<ApiResponse<any>> => {
      return this.put<ApiResponse<any>>(
        "/notifications/preferences",
        preferences
      );
    },
  };

  // ====================
  // Search API
  // ====================

  public search = {
    /**
     * Perform full-text search across all entities
     */
    query: async (params: {
      query: string;
      filters?: {
        caseStatus?: string[];
        dateRange?: { from: string; to: string };
        entityTypes?: string[];
        tags?: string[];
        caseIds?: number[];
      };
      sortBy?: "relevance" | "date" | "title";
      sortOrder?: "asc" | "desc";
      limit?: number;
      offset?: number;
    }): Promise<
      ApiResponse<{
        results: Array<{
          id: number;
          type: string;
          title: string;
          excerpt: string;
          relevanceScore: number;
          caseId?: number;
          caseTitle?: string;
          createdAt: string;
          metadata: Record<string, unknown>;
        }>;
        total: number;
        hasMore: boolean;
        executionTime: number;
      }>
    > => {
      return this.post<
        ApiResponse<{
          results: Array<{
            id: number;
            type: string;
            title: string;
            excerpt: string;
            relevanceScore: number;
            caseId?: number;
            caseTitle?: string;
            createdAt: string;
            metadata: Record<string, unknown>;
          }>;
          total: number;
          hasMore: boolean;
          executionTime: number;
        }>
      >("/search", params);
    },

    /**
     * Rebuild search index for authenticated user
     */
    rebuildIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return this.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/rebuild-index",
        {}
      );
    },

    /**
     * Save a search query for later reuse
     */
    saveSearch: async (params: {
      name: string;
      query: {
        query: string;
        filters?: {
          caseStatus?: string[];
          dateRange?: { from: string; to: string };
          entityTypes?: string[];
          tags?: string[];
          caseIds?: number[];
        };
        sortBy?: "relevance" | "date" | "title";
        sortOrder?: "asc" | "desc";
        limit?: number;
        offset?: number;
      };
    }): Promise<
      ApiResponse<{
        id: number;
        name: string;
        queryJson: string;
        createdAt: string;
        lastUsedAt: string | null;
        useCount: number;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          name: string;
          queryJson: string;
          createdAt: string;
          lastUsedAt: string | null;
          useCount: number;
        }>
      >("/search/save", params);
    },

    /**
     * Get all saved searches
     */
    getSavedSearches: async (): Promise<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          queryJson: string;
          createdAt: string;
          lastUsedAt: string | null;
          useCount: number;
        }>
      >
    > => {
      return this.get<
        ApiResponse<
          Array<{
            id: number;
            name: string;
            queryJson: string;
            createdAt: string;
            lastUsedAt: string | null;
            useCount: number;
          }>
        >
      >("/search/saved");
    },

    /**
     * Delete a saved search
     */
    deleteSavedSearch: async (searchId: number): Promise<ApiResponse<void>> => {
      return this.delete<ApiResponse<void>>(`/search/saved/${searchId}`);
    },

    /**
     * Execute a saved search
     */
    executeSavedSearch: async (
      searchId: number
    ): Promise<
      ApiResponse<{
        results: Array<{
          id: number;
          type: string;
          title: string;
          excerpt: string;
          relevanceScore: number;
          caseId?: number;
          caseTitle?: string;
          createdAt: string;
          metadata: Record<string, unknown>;
        }>;
        total: number;
        hasMore: boolean;
        executionTime: number;
      }>
    > => {
      return this.post<
        ApiResponse<{
          results: Array<{
            id: number;
            type: string;
            title: string;
            excerpt: string;
            relevanceScore: number;
            caseId?: number;
            caseTitle?: string;
            createdAt: string;
            metadata: Record<string, unknown>;
          }>;
          total: number;
          hasMore: boolean;
          executionTime: number;
        }>
      >(`/search/saved/${searchId}/execute`, {});
    },

    /**
     * Get search suggestions based on history
     */
    getSuggestions: async (
      prefix: string,
      limit: number = 5
    ): Promise<ApiResponse<string[]>> => {
      return this.get<ApiResponse<string[]>>("/search/suggestions", {
        prefix,
        limit,
      });
    },

    /**
     * Get search index statistics
     */
    getIndexStats: async (): Promise<
      ApiResponse<{
        totalDocuments: number;
        documentsByType: Record<string, number>;
        lastUpdated: string | null;
      }>
    > => {
      return this.get<
        ApiResponse<{
          totalDocuments: number;
          documentsByType: Record<string, number>;
          lastUpdated: string | null;
        }>
      >("/search/index/stats");
    },

    /**
     * Optimize search index
     */
    optimizeIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return this.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/index/optimize",
        {}
      );
    },
  };

  // ====================
  // Dashboard API
  // ====================

  public dashboard = {
    /**
     * Get complete dashboard overview with all widgets
     */
    getOverview: async (): Promise<
      ApiResponse<{
        stats: {
          totalCases: number;
          activeCases: number;
          closedCases: number;
          totalEvidence: number;
          totalDeadlines: number;
          overdueDeadlines: number;
          unreadNotifications: number;
        };
        recentCases: {
          cases: Array<{
            id: number;
            title: string;
            status: string;
            priority?: string | null;
            lastUpdated: string;
          }>;
          total: number;
        };
        notifications: {
          unreadCount: number;
          recentNotifications: Array<{
            id: number;
            type: string;
            severity: string;
            title: string;
            message: string;
            createdAt: string | null;
          }>;
        };
        deadlines: {
          upcomingDeadlines: Array<{
            id: number;
            title: string;
            deadlineDate: string;
            priority: string;
            daysUntil: number;
            isOverdue: boolean;
            caseId?: number | null;
            caseTitle?: string | null;
          }>;
          totalDeadlines: number;
          overdueCount: number;
        };
        activity: {
          activities: Array<{
            id: number;
            type: string;
            action: string;
            title: string;
            timestamp: string;
            metadata?: Record<string, unknown> | null;
          }>;
          total: number;
        };
      }>
    > => {
      return this.get<
        ApiResponse<{
          stats: {
            totalCases: number;
            activeCases: number;
            closedCases: number;
            totalEvidence: number;
            totalDeadlines: number;
            overdueDeadlines: number;
            unreadNotifications: number;
          };
          recentCases: {
            cases: Array<{
              id: number;
              title: string;
              status: string;
              priority?: string | null;
              lastUpdated: string;
            }>;
            total: number;
          };
          notifications: {
            unreadCount: number;
            recentNotifications: Array<{
              id: number;
              type: string;
              severity: string;
              title: string;
              message: string;
              createdAt: string | null;
            }>;
          };
          deadlines: {
            upcomingDeadlines: Array<{
              id: number;
              title: string;
              deadlineDate: string;
              priority: string;
              daysUntil: number;
              isOverdue: boolean;
              caseId?: number | null;
              caseTitle?: string | null;
            }>;
            totalDeadlines: number;
            overdueCount: number;
          };
          activity: {
            activities: Array<{
              id: number;
              type: string;
              action: string;
              title: string;
              timestamp: string;
              metadata?: Record<string, unknown> | null;
            }>;
            total: number;
          };
        }>
      >("/dashboard");
    },

    /**
     * Get dashboard statistics
     */
    getStats: async (): Promise<
      ApiResponse<{
        totalCases: number;
        activeCases: number;
        closedCases: number;
        totalEvidence: number;
        totalDeadlines: number;
        overdueDeadlines: number;
        unreadNotifications: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          totalCases: number;
          activeCases: number;
          closedCases: number;
          totalEvidence: number;
          totalDeadlines: number;
          overdueDeadlines: number;
          unreadNotifications: number;
        }>
      >("/dashboard/stats");
    },

    /**
     * Get recent cases
     */
    getRecentCases: async (
      limit: number = 5
    ): Promise<
      ApiResponse<{
        cases: Array<{
          id: number;
          title: string;
          status: string;
          priority?: string | null;
          lastUpdated: string;
        }>;
        total: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          cases: Array<{
            id: number;
            title: string;
            status: string;
            priority?: string | null;
            lastUpdated: string;
          }>;
          total: number;
        }>
      >("/dashboard/recent-cases", { limit });
    },

    /**
     * Get upcoming deadlines
     */
    getUpcomingDeadlines: async (
      limit: number = 10
    ): Promise<
      ApiResponse<{
        upcomingDeadlines: Array<{
          id: number;
          title: string;
          deadlineDate: string;
          priority: string;
          daysUntil: number;
          isOverdue: boolean;
          caseId?: number | null;
          caseTitle?: string | null;
        }>;
        totalDeadlines: number;
        overdueCount: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          upcomingDeadlines: Array<{
            id: number;
            title: string;
            deadlineDate: string;
            priority: string;
            daysUntil: number;
            isOverdue: boolean;
            caseId?: number | null;
            caseTitle?: string | null;
          }>;
          totalDeadlines: number;
          overdueCount: number;
        }>
      >("/dashboard/deadlines", { limit });
    },

    /**
     * Get notifications widget data
     */
    getNotifications: async (
      limit: number = 5
    ): Promise<
      ApiResponse<{
        unreadCount: number;
        recentNotifications: Array<{
          id: number;
          type: string;
          severity: string;
          title: string;
          message: string;
          createdAt: string | null;
        }>;
      }>
    > => {
      return this.get<
        ApiResponse<{
          unreadCount: number;
          recentNotifications: Array<{
            id: number;
            type: string;
            severity: string;
            title: string;
            message: string;
            createdAt: string | null;
          }>;
        }>
      >("/dashboard/notifications", { limit });
    },

    /**
     * Get activity widget data
     */
    getActivity: async (
      limit: number = 10
    ): Promise<
      ApiResponse<{
        activities: Array<{
          id: number;
          type: string;
          action: string;
          title: string;
          timestamp: string;
          metadata?: Record<string, unknown> | null;
        }>;
        total: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          activities: Array<{
            id: number;
            type: string;
            action: string;
            title: string;
            timestamp: string;
            metadata?: Record<string, unknown> | null;
          }>;
          total: number;
        }>
      >("/dashboard/activity", { limit });
    },
  };

  // ====================
  // Profile API
  // ====================

  public profile = {
    /**
     * Get current user's profile
     */
    get: async (): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>("/profile");
    },

    /**
     * Update user profile
     */
    update: async (params: {
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      avatarUrl?: string;
    }): Promise<ApiResponse<any>> => {
      return this.put<ApiResponse<any>>("/profile", params);
    },

    /**
     * Change password
     */
    changePassword: async (params: {
      currentPassword: string;
      newPassword: string;
    }): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return this.put<ApiResponse<{ success: boolean; message: string }>>(
        "/profile/password",
        params
      );
    },

    /**
     * Get profile completeness indicator
     */
    getCompleteness: async (): Promise<
      ApiResponse<{
        percentage: number;
        missingFields: string[];
        completedFields: string[];
      }>
    > => {
      return this.get<
        ApiResponse<{
          percentage: number;
          missingFields: string[];
          completedFields: string[];
        }>
      >("/profile/completeness");
    },
  };

  // ====================
  // Settings API (Future: App Settings)
  // ====================

  public settings = {
    /**
     * Get application settings
     */
    get: async (): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>("/settings");
    },

    /**
     * Update application settings
     */
    update: async (params: {
      theme?: string;
      fontSize?: string;
      language?: string;
      dateFormat?: string;
      timeFormat?: string;
      notificationsEnabled?: boolean;
      autoBackupEnabled?: boolean;
      backupFrequency?: string;
    }): Promise<ApiResponse<any>> => {
      return this.put<ApiResponse<any>>("/settings", params);
    },
  };

  // ====================
  // AI Configuration API
  // ====================

  public aiConfig = {
    /**
     * Get all AI provider configurations
     */
    list: async (): Promise<ApiResponse<any[]>> => {
      return this.get<ApiResponse<any[]>>("/ai/config");
    },

    /**
     * Get active AI provider configuration
     */
    getActive: async (): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>("/ai/config/active");
    },

    /**
     * Get specific provider configuration
     */
    get: async (provider: string): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>(`/ai/config/${provider}`);
    },

    /**
     * Configure AI provider
     */
    configure: async (
      provider: string,
      params: {
        api_key: string;
        model: string;
        endpoint?: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        enabled?: boolean;
      }
    ): Promise<
      ApiResponse<{ provider: string; message: string; config_id: number }>
    > => {
      return this.post<
        ApiResponse<{ provider: string; message: string; config_id: number }>
      >(`/ai/config/${provider}`, params);
    },

    /**
     * Delete provider configuration
     */
    delete: async (provider: string): Promise<ApiResponse<any>> => {
      return this.delete<ApiResponse<any>>(`/ai/config/${provider}`);
    },

    /**
     * Activate provider
     */
    activate: async (provider: string): Promise<ApiResponse<any>> => {
      return this.put<ApiResponse<any>>(`/ai/config/${provider}/activate`, {});
    },

    /**
     * Update API key only
     */
    updateApiKey: async (
      provider: string,
      apiKey: string
    ): Promise<ApiResponse<{ message: string }>> => {
      return this.put<ApiResponse<{ message: string }>>(
        `/ai/config/${provider}/api-key`,
        { api_key: apiKey }
      );
    },

    /**
     * Validate configuration without saving
     */
    validate: async (
      provider: string,
      params: {
        api_key: string;
        model: string;
        endpoint?: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        enabled?: boolean;
      }
    ): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> => {
      return this.post<ApiResponse<{ valid: boolean; errors: string[] }>>(
        `/ai/config/${provider}/validate`,
        params
      );
    },

    /**
     * Test provider connection
     */
    test: async (
      provider: string
    ): Promise<
      ApiResponse<{
        success: boolean;
        message?: string;
        error?: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          message?: string;
          error?: string;
        }>
      >(`/ai/config/${provider}/test`, {});
    },

    /**
     * Get all provider metadata
     */
    listProviders: async (): Promise<
      ApiResponse<Record<string, ProviderMetadata>>
    > => {
      return this.get<ApiResponse<Record<string, ProviderMetadata>>>(
        "/ai/providers"
      );
    },

    /**
     * Get specific provider metadata
     */
    getProviderMetadata: async (
      provider: string
    ): Promise<ApiResponse<ProviderMetadata>> => {
      return this.get<ApiResponse<ProviderMetadata>>(
        `/ai/providers/${provider}`
      );
    },
  };

  // ====================
  // Tags API
  // ====================

  public tags = {
    /**
     * List all tags for the authenticated user
     */
    list: async (): Promise<
      ApiResponse<
        Array<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      return this.get<
        ApiResponse<
          Array<{
            id: number;
            userId: number;
            name: string;
            color: string;
            description?: string;
            usageCount?: number;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >("/tags");
    },

    /**
     * Get single tag by ID
     */
    get: async (
      tagId: number
    ): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.get<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/tags/${tagId}`);
    },

    /**
     * Create new tag
     */
    create: async (params: {
      name: string;
      color: string;
      description?: string;
    }): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >("/tags", params);
    },

    /**
     * Update existing tag
     */
    update: async (
      tagId: number,
      params: {
        name?: string;
        color?: string;
        description?: string;
      }
    ): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.put<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/tags/${tagId}`, params);
    },

    /**
     * Delete tag
     */
    delete: async (
      tagId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return this.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/tags/${tagId}`
      );
    },

    /**
     * Attach tag to case
     */
    attachToCase: async (
      tagId: number,
      caseId: number
    ): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        caseId: number;
        tagId: number;
        wasAttached: boolean;
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          message: string;
          caseId: number;
          tagId: number;
          wasAttached: boolean;
        }>
      >(`/tags/${tagId}/cases/${caseId}`, {});
    },

    /**
     * Remove tag from case
     */
    removeFromCase: async (
      tagId: number,
      caseId: number
    ): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        caseId: number;
        tagId: number;
        removed: boolean;
      }>
    > => {
      return this.delete<
        ApiResponse<{
          success: boolean;
          message: string;
          caseId: number;
          tagId: number;
          removed: boolean;
        }>
      >(`/tags/${tagId}/cases/${caseId}`);
    },

    /**
     * Get all cases with a specific tag
     */
    getCasesWithTag: async (tagId: number): Promise<ApiResponse<Case[]>> => {
      return this.get<ApiResponse<Case[]>>(`/tags/${tagId}/cases`);
    },

    /**
     * Get all tags for a case
     */
    getTagsForCase: async (
      caseId: number
    ): Promise<
      ApiResponse<
        Array<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      return this.get<
        ApiResponse<
          Array<{
            id: number;
            userId: number;
            name: string;
            color: string;
            description?: string;
            usageCount?: number;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >(`/tags/cases/${caseId}/tags`);
    },

    /**
     * Search cases by tags with AND/OR logic
     */
    searchCasesByTags: async (params: {
      tagIds: number[];
      matchAll: boolean;
    }): Promise<
      ApiResponse<{
        caseIds: number[];
        matchAll: boolean;
        tagIds: number[];
        resultCount: number;
      }>
    > => {
      const tagIdsStr = params.tagIds.join(",");
      return this.get<
        ApiResponse<{
          caseIds: number[];
          matchAll: boolean;
          tagIds: number[];
          resultCount: number;
        }>
      >("/tags/search", {
        tag_ids: tagIdsStr,
        match_all: params.matchAll,
      });
    },

    /**
     * Get tag usage statistics
     */
    getStatistics: async (): Promise<
      ApiResponse<{
        totalTags: number;
        tagsWithCases: number;
        mostUsedTags: Array<{
          id: number;
          name: string;
          color: string;
          usageCount: number;
        }>;
        unusedTags: Array<{
          id: number;
          name: string;
          color: string;
        }>;
      }>
    > => {
      return this.get<
        ApiResponse<{
          totalTags: number;
          tagsWithCases: number;
          mostUsedTags: Array<{
            id: number;
            name: string;
            color: string;
            usageCount: number;
          }>;
          unusedTags: Array<{
            id: number;
            name: string;
            color: string;
          }>;
        }>
      >("/tags/statistics");
    },
  };

  // ====================
  // Templates API
  // ====================

  public templates = {
    /**
     * List all templates (system + user custom) with optional category filter
     */
    list: async (
      category?: string
    ): Promise<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      const params: Record<string, string> = {};
      if (category) {
        params.category = category;
      }
      return this.get<
        ApiResponse<
          Array<{
            id: number;
            name: string;
            description: string | null;
            category: string;
            isSystemTemplate: boolean;
            userId: number | null;
            templateFields: Record<string, unknown>;
            suggestedEvidenceTypes: string[];
            timelineMilestones: Array<Record<string, unknown>>;
            checklistItems: Array<Record<string, unknown>>;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >("/templates", params);
    },

    /**
     * Get single template by ID
     */
    get: async (
      templateId: number
    ): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.get<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/templates/${templateId}`);
    },

    /**
     * Create new template
     */
    create: async (params: {
      name: string;
      description?: string;
      category: string;
      templateFields: Record<string, unknown>;
      suggestedEvidenceTypes?: string[];
      timelineMilestones?: Array<Record<string, unknown>>;
      checklistItems?: Array<Record<string, unknown>>;
    }): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >("/templates", params);
    },

    /**
     * Update existing template
     */
    update: async (
      templateId: number,
      params: {
        name?: string;
        description?: string;
        category?: string;
        templateFields?: Record<string, unknown>;
        suggestedEvidenceTypes?: string[];
        timelineMilestones?: Array<Record<string, unknown>>;
        checklistItems?: Array<Record<string, unknown>>;
      }
    ): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.put<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/templates/${templateId}`, params);
    },

    /**
     * Delete template
     */
    delete: async (
      templateId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return this.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/templates/${templateId}`
      );
    },

    /**
     * Apply template to create case with variable substitution
     */
    apply: async (
      templateId: number,
      variables: Record<string, string>
    ): Promise<
      ApiResponse<{
        case: {
          id: number;
          title: string;
          description: string | null;
          caseType: string;
          status: string;
        };
        appliedMilestones: Array<{
          id: number;
          title: string;
          dueDate: string;
        }>;
        appliedChecklistItems: Array<Record<string, unknown>>;
        templateId: number;
        templateName: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          case: {
            id: number;
            title: string;
            description: string | null;
            caseType: string;
            status: string;
          };
          appliedMilestones: Array<{
            id: number;
            title: string;
            dueDate: string;
          }>;
          appliedChecklistItems: Array<Record<string, unknown>>;
          templateId: number;
          templateName: string;
        }>
      >(`/templates/${templateId}/apply`, { variables });
    },

    /**
     * Seed system templates (admin operation)
     */
    seed: async (): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        stats: {
          seeded: number;
          skipped: number;
          failed: number;
        };
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          message: string;
          stats: {
            seeded: number;
            skipped: number;
            failed: number;
          };
        }>
      >("/templates/seed", {});
    },
  };

  // ====================
  // GDPR Compliance API
  // ====================

  public gdpr = {
    /**
     * Export all user data (GDPR Article 20 - Data Portability)
     */
    exportData: async (params: {
      format?: "json" | "csv";
    }): Promise<
      ApiResponse<{
        success: boolean;
        filePath: string;
        totalRecords: number;
        exportDate: string;
        format: string;
        auditLogId?: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          filePath: string;
          totalRecords: number;
          exportDate: string;
          format: string;
          auditLogId?: string;
        }>
      >("/gdpr/export", {
        format: params.format || "json",
      });
    },

    /**
     * Delete user account (GDPR Article 17 - Right to Erasure)
     */
    deleteData: async (params: {
      confirmed: boolean;
      exportBeforeDelete?: boolean;
      reason?: string;
    }): Promise<
      ApiResponse<{
        success: boolean;
        deletionDate: string;
        deletedCounts: Record<string, number>;
        preservedAuditLogs: number;
        preservedConsents: number;
        exportPath?: string;
        auditLogId?: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          deletionDate: string;
          deletedCounts: Record<string, number>;
          preservedAuditLogs: number;
          preservedConsents: number;
          exportPath?: string;
          auditLogId?: string;
        }>
      >("/gdpr/delete", params);
    },

    /**
     * Get user's consent records
     */
    getConsents: async (): Promise<
      ApiResponse<{
        consents: Array<{
          id: number;
          consentType: string;
          granted: boolean;
          grantedAt: string | null;
          revokedAt: string | null;
          createdAt: string;
        }>;
      }>
    > => {
      return this.get<
        ApiResponse<{
          consents: Array<{
            id: number;
            consentType: string;
            granted: boolean;
            grantedAt: string | null;
            revokedAt: string | null;
            createdAt: string;
          }>;
        }>
      >("/gdpr/consents");
    },

    /**
     * Update user consent
     */
    updateConsent: async (params: {
      consentType: string;
      granted: boolean;
    }): Promise<
      ApiResponse<{
        success: boolean;
        consentType: string;
        granted: boolean;
      }>
    > => {
      return this.post<
        ApiResponse<{
          success: boolean;
          consentType: string;
          granted: boolean;
        }>
      >("/gdpr/consents", params);
    },
  };

  // ====================
  // Export API
  // ====================

  public export = {
    /**
     * Export single case
     */
    exportCase: async (
      caseId: number,
      format: "json" | "pdf" | "docx"
    ): Promise<Blob> => {
      const response = await fetch(
        `${this.config.baseURL}/export/case/${caseId}?format=${format}`,
        {
          headers: this.sessionId
            ? { "X-Session-Id": this.sessionId }
            : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Export single evidence item
     */
    exportEvidence: async (
      evidenceId: number,
      format: "json" | "pdf" | "docx"
    ): Promise<Blob> => {
      const response = await fetch(
        `${this.config.baseURL}/export/evidence/${evidenceId}?format=${format}`,
        {
          headers: this.sessionId
            ? { "X-Session-Id": this.sessionId }
            : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Export search results
     */
    exportSearchResults: async (
      query: string,
      format: "json" | "csv"
    ): Promise<Blob> => {
      const response = await fetch(
        `${this.config.baseURL}/export/search-results?query=${encodeURIComponent(query)}&format=${format}`,
        {
          headers: this.sessionId
            ? { "X-Session-Id": this.sessionId }
            : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Download blob as file
     */
    downloadBlob: (blob: Blob, filename: string): void => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };

  // ====================
  // Deadlines API
  // ====================

  public deadlines = {
    /**
     * List all deadlines with optional filters
     */
    list: async (params?: {
      caseId?: number;
      status?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }): Promise<
      ApiResponse<{
        items: Array<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
          caseTitle?: string;
          caseStatus?: string;
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      const queryParams: Record<string, string | number> = {};
      if (params?.caseId !== undefined) {
        queryParams.case_id = params.caseId;
      }
      if (params?.status) {
        queryParams.status = params.status;
      }
      if (params?.priority) {
        queryParams.priority = params.priority;
      }
      if (params?.limit !== undefined) {
        queryParams.limit = params.limit;
      }
      if (params?.offset !== undefined) {
        queryParams.offset = params.offset;
      }

      return this.get<
        ApiResponse<{
          items: Array<{
            id: number;
            caseId?: number;
            userId: number;
            title: string;
            description?: string;
            deadlineDate: string;
            priority: string;
            status: string;
            completed: boolean;
            completedAt?: string;
            reminderEnabled: boolean;
            reminderDaysBefore: number;
            createdAt: string;
            updatedAt: string;
            caseTitle?: string;
            caseStatus?: string;
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines", queryParams);
    },

    /**
     * Get single deadline by ID
     */
    get: async (
      id: number
    ): Promise<
      ApiResponse<{
        id: number;
        caseId?: number;
        userId: number;
        title: string;
        description?: string;
        deadlineDate: string;
        priority: string;
        status: string;
        completed: boolean;
        completedAt?: string;
        reminderEnabled: boolean;
        reminderDaysBefore: number;
        createdAt: string;
        updatedAt: string;
        caseTitle?: string;
        caseStatus?: string;
      }>
    > => {
      return this.get<
        ApiResponse<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
          caseTitle?: string;
          caseStatus?: string;
        }>
      >(`/deadlines/${id}`);
    },

    /**
     * Create new deadline
     */
    create: async (params: {
      caseId?: number;
      title: string;
      description?: string;
      deadlineDate?: string;
      dueDate?: string;
      priority?: string;
      reminderDaysBefore?: number;
    }): Promise<
      ApiResponse<{
        id: number;
        caseId?: number;
        userId: number;
        title: string;
        description?: string;
        deadlineDate: string;
        priority: string;
        status: string;
        completed: boolean;
        completedAt?: string;
        reminderEnabled: boolean;
        reminderDaysBefore: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
        }>
      >("/deadlines", params);
    },

    /**
     * Update existing deadline
     */
    update: async (
      id: number,
      params: {
        title?: string;
        description?: string;
        deadlineDate?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
        reminderEnabled?: boolean;
        reminderDaysBefore?: number;
      }
    ): Promise<
      ApiResponse<{
        id: number;
        caseId?: number;
        userId: number;
        title: string;
        description?: string;
        deadlineDate: string;
        priority: string;
        status: string;
        completed: boolean;
        completedAt?: string;
        reminderEnabled: boolean;
        reminderDaysBefore: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.put<
        ApiResponse<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/deadlines/${id}`, params);
    },

    /**
     * Delete deadline
     */
    delete: async (id: number): Promise<ApiResponse<void>> => {
      return this.delete<ApiResponse<void>>(`/deadlines/${id}`);
    },

    /**
     * Get upcoming deadlines (default: next 7 days)
     */
    getUpcoming: async (
      days: number = 7,
      limit?: number
    ): Promise<
      ApiResponse<{
        items: Array<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
          caseTitle?: string;
          caseStatus?: string;
          daysUntil?: number;
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      const queryParams: Record<string, number> = { days };
      if (limit !== undefined) {
        queryParams.limit = limit;
      }
      return this.get<
        ApiResponse<{
          items: Array<{
            id: number;
            caseId?: number;
            userId: number;
            title: string;
            description?: string;
            deadlineDate: string;
            priority: string;
            status: string;
            completed: boolean;
            completedAt?: string;
            reminderEnabled: boolean;
            reminderDaysBefore: number;
            createdAt: string;
            updatedAt: string;
            caseTitle?: string;
            caseStatus?: string;
            daysUntil?: number;
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/upcoming", queryParams);
    },

    /**
     * Get overdue deadlines
     */
    getOverdue: async (): Promise<
      ApiResponse<{
        items: Array<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
          caseTitle?: string;
          caseStatus?: string;
          daysPast?: number;
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          items: Array<{
            id: number;
            caseId?: number;
            userId: number;
            title: string;
            description?: string;
            deadlineDate: string;
            priority: string;
            status: string;
            completed: boolean;
            completedAt?: string;
            reminderEnabled: boolean;
            reminderDaysBefore: number;
            createdAt: string;
            updatedAt: string;
            caseTitle?: string;
            caseStatus?: string;
            daysPast?: number;
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/overdue");
    },

    /**
     * Get deadlines for a specific date
     */
    getByDate: async (
      date: string
    ): Promise<
      ApiResponse<{
        items: Array<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
          caseTitle?: string;
          caseStatus?: string;
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      return this.get<
        ApiResponse<{
          items: Array<{
            id: number;
            caseId?: number;
            userId: number;
            title: string;
            description?: string;
            deadlineDate: string;
            priority: string;
            status: string;
            completed: boolean;
            completedAt?: string;
            reminderEnabled: boolean;
            reminderDaysBefore: number;
            createdAt: string;
            updatedAt: string;
            caseTitle?: string;
            caseStatus?: string;
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/by-date", { date });
    },

    /**
     * Mark deadline as complete
     */
    markComplete: async (
      id: number
    ): Promise<
      ApiResponse<{
        id: number;
        caseId?: number;
        userId: number;
        title: string;
        description?: string;
        deadlineDate: string;
        priority: string;
        status: string;
        completed: boolean;
        completedAt?: string;
        reminderEnabled: boolean;
        reminderDaysBefore: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/deadlines/${id}/complete`, {});
    },

    /**
     * Snooze deadline by specified hours
     */
    snooze: async (
      id: number,
      hours: number
    ): Promise<
      ApiResponse<{
        id: number;
        caseId?: number;
        userId: number;
        title: string;
        description?: string;
        deadlineDate: string;
        priority: string;
        status: string;
        completed: boolean;
        completedAt?: string;
        reminderEnabled: boolean;
        reminderDaysBefore: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return this.post<
        ApiResponse<{
          id: number;
          caseId?: number;
          userId: number;
          title: string;
          description?: string;
          deadlineDate: string;
          priority: string;
          status: string;
          completed: boolean;
          completedAt?: string;
          reminderEnabled: boolean;
          reminderDaysBefore: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/deadlines/${id}/snooze`, { hours });
    },
  };

  // ====================
  // Chat Streaming API
  // ====================

  public chat = {
    /**
     * Stream chat response with Server-Sent Events (SSE)
     */
    stream: async (
      message: string,
      callbacks: {
        onToken: (token: string) => void;
        onThinking?: (thinking: string) => void;
        onComplete: (conversationId: number) => void;
        onError: (error: string) => void;
        onSources?: (sources: any[]) => void;
      },
      options: {
        conversationId?: number | null;
        caseId?: number | null;
        useRAG?: boolean;
      } = {}
    ): Promise<void> => {
      const { conversationId, caseId, useRAG = true } = options;

      try {
        // Build URL
        const url = `${this.config.baseURL}/chat/stream`;

        // Build headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (this.sessionId) {
          headers["X-Session-Id"] = this.sessionId;
        }

        // Make streaming request
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            conversationId,
            caseId,
            useRAG,
          }),
          // Extended timeout for streaming (5 minutes)
          signal: AbortSignal.timeout(300000),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new ApiError(
            response.status,
            errorData.detail || errorData.message || "Failed to start stream",
            "STREAM_ERROR",
            errorData
          );
        }

        if (!response.body) {
          throw new ApiError(0, "No response body", "NO_BODY");
        }

        // Process SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (split by double newline)
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete message in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonData = line.substring(6); // Remove 'data: ' prefix
                const event = JSON.parse(jsonData);

                switch (event.type) {
                  case "token":
                    if (typeof event.data === "string") {
                      callbacks.onToken(event.data);
                    }
                    break;

                  case "sources":
                    if (callbacks.onSources && Array.isArray(event.data)) {
                      callbacks.onSources(event.data);
                    }
                    break;

                  case "complete":
                    if (event.conversationId) {
                      callbacks.onComplete(event.conversationId);
                    }
                    break;

                  case "error":
                    callbacks.onError(event.error || "Unknown error");
                    return; // Stop processing
                }
              } catch (e) {
                console.error("[ApiClient] Failed to parse SSE event:", e);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof ApiError) {
          callbacks.onError(error.message);
        } else {
          callbacks.onError(
            error instanceof Error ? error.message : "Streaming failed"
          );
        }
      }
    },

    /**
     * Get recent conversations
     */
    getConversations: async (
      caseId?: number | null,
      limit: number = 10
    ): Promise<ApiResponse<any[]>> => {
      const params: Record<string, string | number> = { limit };
      if (caseId !== null && caseId !== undefined) {
        params.case_id = caseId;
      }
      return this.get<ApiResponse<any[]>>("/chat/conversations", params);
    },

    /**
     * Get a specific conversation with messages
     */
    getConversation: async (
      conversationId: number
    ): Promise<ApiResponse<any>> => {
      return this.get<ApiResponse<any>>(
        `/chat/conversations/${conversationId}`
      );
    },

    /**
     * Delete a conversation
     */
    deleteConversation: async (
      conversationId: number
    ): Promise<ApiResponse<any>> => {
      return this.delete<ApiResponse<any>>(
        `/chat/conversations/${conversationId}`
      );
    },

    /**
     * Upload a document for analysis
     */
    uploadDocument: async (
      file: File,
      userQuestion?: string
    ): Promise<ApiResponse<{ filePath: string }>> => {
      const formData = new FormData();
      formData.append("file", file);
      if (userQuestion) {
        formData.append("userQuestion", userQuestion);
      }

      const url = new URL(`${this.config.baseURL}/chat/upload-document`);
      const headers: Record<string, string> = {};

      if (this.sessionId) {
        headers["X-Session-Id"] = this.sessionId;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Upload failed",
          "UPLOAD_ERROR",
          errorData
        );
      }

      return await response.json();
    },

    /**
     * Analyze a document that has been uploaded
     */
    analyzeDocument: async (
      filePath: string,
      userQuestion?: string
    ): Promise<ApiResponse<any>> => {
      return this.post<ApiResponse<any>>("/chat/analyze-document", {
        filePath,
        userQuestion,
      });
    },
  };
}

// ====================
// Custom Error Class
// ====================

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Check if error is a specific HTTP status
   */
  isStatus(status: number): boolean {
    return this.status === status;
  }

  /**
   * Check if error is a specific error code
   */
  isCode(code: string): boolean {
    return this.code === code;
  }
}

// ====================
// Default Client Instance
// ====================

/**
 * Default API client instance
 * Base URL will be set from environment or port manager
 *
 * ALWAYS use Python FastAPI backend (HTTP REST API)
 */

// Get base URL from environment variables (supports PWA deployment)
// Development: http://localhost:8000
// Production: https://justice-companion.up.railway.app
const getBaseURL = (): string => {
  // Check for Vite environment variable first (PWA deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback to localhost for local development
  return "http://127.0.0.1:8000";
};

export const apiClient = new ApiClient({
  baseURL: getBaseURL(),
});

/**
 * Initialize API client with dynamic port
 */
export async function initializeApiClient(port?: number): Promise<void> {
  const apiPort = port || (await getApiPort());
  const baseURL = `http://127.0.0.1:${apiPort}`;

  // Preserve existing session ID
  const currentSessionId = apiClient.getSessionId();

  // Create new client with correct port
  Object.assign(apiClient, new ApiClient({ baseURL }));

  // Restore session ID after reinitializing
  if (currentSessionId) {
    apiClient.setSessionId(currentSessionId);
  }
}

/**
 * Get API port from port manager
 */
async function getApiPort(): Promise<number> {
  try {
    if (window.portApi) {
      const response = await window.portApi.getServicePort("fastapi");
      if (response.success && response.data) {
        return response.data.port;
      }
    }
  } catch (error) {
    console.warn("Failed to get API port from port manager:", error);
  }

  // Fallback to default port
  return 8000;
}

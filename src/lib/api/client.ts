/**
 * Base HTTP client for API communication.
 *
 * Provides core HTTP methods with:
 * - Automatic retry with exponential backoff
 * - Session-based authentication
 * - Type-safe request/response handling
 *
 * @module api/client
 */

import { ApiClientConfig, ApiError, DEFAULT_CONFIG } from "./types";

/**
 * Base API client class providing core HTTP functionality.
 *
 * Domain-specific API modules extend or compose with this class.
 */
export class BaseApiClient {
  protected config: Required<ApiClientConfig>;
  protected sessionId: string | null = null;

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
   * Get the base URL
   */
  getBaseURL(): string {
    return this.config.baseURL;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean>;
      headers?: Record<string, string>;
      retries?: number;
    } = {},
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

    // Add session ID as Authorization Bearer token
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
      console.log(`[API] ${method} ${url.toString()}`);
      const response = await fetch(url.toString(), requestOptions);
      console.log(
        `[API] Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`,
      );

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
          responseData?.error?.details,
        );
      }

      // Auto-wrap response if backend didn't wrap it
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
          this.config.retryDelay * (this.config.maxRetries - retries + 1),
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
        "NETWORK_ERROR",
      );
    }
  }

  /**
   * Delay helper for retry logic
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.request<T>("GET", endpoint, { params });
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", endpoint, { body });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", endpoint, { body });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>("DELETE", endpoint);
  }
}

import { DEFAULT_CONFIG, type ApiClientConfig } from "./types.ts";

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

  isStatus(status: number): boolean {
    return this.status === status;
  }

  isCode(code: string): boolean {
    return this.code === code;
  }
}

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private sessionId: string | null = null;

  constructor(config: ApiClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const storedSessionId = localStorage.getItem("sessionId");
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      }
    }
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getBaseURL(): string {
    return this.config.baseURL;
  }

  getTimeout(): number {
    return this.config.timeout;
  }

  async request<T>(
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

    const url = new URL(`${this.config.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (this.sessionId) {
      requestHeaders["Authorization"] = `Bearer ${this.sessionId}`;
    }

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
        `[API] Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`
      );

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let errorMessage = "Request failed";

        if (Array.isArray(responseData?.detail)) {
          const messages = responseData.detail
            .map((err: { msg?: string; loc?: string[] }) => {
              const field = err.loc?.slice(-1)[0] || "field";
              return `${field}: ${err.msg || "Invalid value"}`;
            })
            .join("; ");
          errorMessage = messages || "Validation failed";
        } else if (typeof responseData?.detail === "string") {
          errorMessage = responseData.detail;
        } else if (responseData?.error?.message) {
          errorMessage = responseData.error.message;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        }

        throw new ApiError(
          response.status,
          errorMessage,
          responseData?.error?.code || "UNKNOWN_ERROR",
          responseData?.error?.details || responseData?.detail
        );
      }

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
      if (
        retries > 0 &&
        (error instanceof TypeError ||
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

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Unknown error",
        "NETWORK_ERROR"
      );
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.request<T>("GET", endpoint, { params });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>("POST", endpoint, { body });
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", endpoint, { body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>("DELETE", endpoint);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * API Client - Main Entry Point
 *
 * Modular API client with factory pattern for all API endpoints
 */

import { ApiClient } from "./client.ts";
import { createAuthApi } from "./auth.ts";
import { createCasesApi } from "./cases.ts";
import { createEvidenceApi } from "./evidence.ts";
import { createNotificationsApi } from "./notifications.ts";
import { createSearchApi } from "./search.ts";
import { createDashboardApi } from "./dashboard.ts";
import { createProfileApi } from "./profile.ts";
import { createSettingsApi } from "./settings.ts";
import { createAiConfigApi } from "./aiConfig.ts";
import { createTagsApi } from "./tags.ts";
import { createTemplatesApi } from "./templates.ts";
import { createGdprApi } from "./gdpr.ts";
import { createExportApi } from "./export.ts";
import { createDeadlinesApi } from "./deadlines.ts";
import { createLegalApi } from "./legal.ts";
import { createChatApi } from "./chat.ts";
import type { ApiClientConfig } from "./types.ts";

/**
 * Combined API client with all endpoints
 */
export class ApiClientCombined {
  private client: ApiClient;

  // API namespaces
  public readonly auth: ReturnType<typeof createAuthApi>;
  public readonly cases: ReturnType<typeof createCasesApi>;
  public readonly evidence: ReturnType<typeof createEvidenceApi>;
  public readonly notifications: ReturnType<typeof createNotificationsApi>;
  public readonly search: ReturnType<typeof createSearchApi>;
  public readonly dashboard: ReturnType<typeof createDashboardApi>;
  public readonly profile: ReturnType<typeof createProfileApi>;
  public readonly settings: ReturnType<typeof createSettingsApi>;
  public readonly aiConfig: ReturnType<typeof createAiConfigApi>;
  public readonly tags: ReturnType<typeof createTagsApi>;
  public readonly templates: ReturnType<typeof createTemplatesApi>;
  public readonly gdpr: ReturnType<typeof createGdprApi>;
  public readonly export: ReturnType<typeof createExportApi>;
  public readonly deadlines: ReturnType<typeof createDeadlinesApi>;
  public readonly legal: ReturnType<typeof createLegalApi>;
  public readonly chat: ReturnType<typeof createChatApi>;

  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config);

    // Initialize all API namespaces
    this.auth = createAuthApi(this.client);
    this.cases = createCasesApi(this.client);
    this.evidence = createEvidenceApi(this.client);
    this.notifications = createNotificationsApi(this.client);
    this.search = createSearchApi(this.client);
    this.dashboard = createDashboardApi(this.client);
    this.profile = createProfileApi(this.client);
    this.settings = createSettingsApi(this.client);
    this.aiConfig = createAiConfigApi(this.client);
    this.tags = createTagsApi(this.client);
    this.templates = createTemplatesApi(this.client);
    this.gdpr = createGdprApi(this.client);
    this.export = createExportApi(this.client);
    this.deadlines = createDeadlinesApi(this.client);
    this.legal = createLegalApi(this.client);
    this.chat = createChatApi(this.client);
  }

  /**
   * Set session ID for authenticated requests
   */
  setSessionId(sessionId: string | null): void {
    this.client.setSessionId(sessionId);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.client.getSessionId();
  }
}

/**
 * Singleton instance for backward compatibility
 */
export const apiClient = new ApiClientCombined({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Export types
export type { ApiResponse, PaginatedResponse, ApiClientConfig } from "./types.ts";
export { ApiError } from "./client.ts";

// Re-export the combined client as default
export default apiClient;

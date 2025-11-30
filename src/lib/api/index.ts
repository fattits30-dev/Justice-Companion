/**
 * API Client Module Index
 *
 * Composes all domain API modules into a unified, backwards-compatible ApiClient class.
 * This file serves as the main entry point for the modular API client.
 *
 * Usage:
 *   import { apiClient, ApiClient, ApiError } from '@/lib/api';
 *
 * @module api
 */

import { BaseApiClient } from "./client";
import type { ApiClientConfig } from "./types";

// Import domain API factories
import { createAuthApi, AuthApi } from "./auth";
import { createCasesApi, CasesApi } from "./cases";
import { createEvidenceApi, EvidenceApi } from "./evidence";
import { createTagsApi, TagsApi } from "./tags";
import { createNotificationsApi, NotificationsApi } from "./notifications";
import { createSearchApi, SearchApi } from "./search";
import { createDashboardApi, DashboardApi } from "./dashboard";
import { createProfileApi, ProfileApi } from "./profile";
import { createSettingsApi, SettingsApi } from "./settings";
import { createAiConfigApi, AiConfigApi } from "./aiConfig";
import { createTemplatesApi, TemplatesApi } from "./templates";
import { createGdprApi, GdprApi } from "./gdpr";
import { createExportApi, ExportApi } from "./export";
import { createDeadlinesApi, DeadlinesApi } from "./deadlines";
import { createChatApi, ChatApi } from "./chat";

// ====================
// Unified API Client
// ====================

/**
 * Unified API Client class that composes all domain modules.
 * Provides backwards compatibility with existing codebase.
 */
export class ApiClient extends BaseApiClient {
  // Domain API modules
  public readonly auth: AuthApi;
  public readonly cases: CasesApi;
  public readonly evidence: EvidenceApi;
  public readonly tags: TagsApi;
  public readonly notifications: NotificationsApi;
  public readonly search: SearchApi;
  public readonly dashboard: DashboardApi;
  public readonly profile: ProfileApi;
  public readonly settings: SettingsApi;
  public readonly aiConfig: AiConfigApi;
  public readonly templates: TemplatesApi;
  public readonly gdpr: GdprApi;
  public readonly export: ExportApi;
  public readonly deadlines: DeadlinesApi;
  public readonly chat: ChatApi;

  constructor(config: ApiClientConfig) {
    super(config);

    // Initialize all domain modules
    this.auth = createAuthApi(this);
    this.cases = createCasesApi(this);
    this.evidence = createEvidenceApi(this);
    this.tags = createTagsApi(this);
    this.notifications = createNotificationsApi(this);
    this.search = createSearchApi(this);
    this.dashboard = createDashboardApi(this);
    this.profile = createProfileApi(this);
    this.settings = createSettingsApi(this);
    this.aiConfig = createAiConfigApi(this);
    this.templates = createTemplatesApi(this);
    this.gdpr = createGdprApi(this);
    this.export = createExportApi(this);
    this.deadlines = createDeadlinesApi(this);
    this.chat = createChatApi(this);
  }
}

// ====================
// Default Client Instance
// ====================

/**
 * Get base URL from environment variables.
 * Development: http://localhost:8000
 * Production: from VITE_API_URL
 */
const getBaseURL = (): string => {
  // Check for Vite environment variable first (PWA deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback to localhost for local development
  return "http://127.0.0.1:8000";
};

/**
 * Default API client instance
 */
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
    if (typeof window !== "undefined" && (window as any).portApi) {
      const response = await (window as any).portApi.getServicePort("fastapi");
      if (response.success && response.data) {
        return response.data.port;
      }
    }
  } catch (error) {
    console.warn("Failed to get API port from port manager:", error);
  }

  return 8000;
}

// ====================
// Re-exports
// ====================

// Re-export types from types module
export type {
  ApiClientConfig,
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginatedResponse,
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "./types";

export { ApiError, DEFAULT_CONFIG } from "./types";

// Re-export base client for extension
export { BaseApiClient } from "./client";

// Re-export domain types
export type { AuthUser, AuthSession, AuthData } from "./auth";
export type { CaseListOptions, CaseStats } from "./cases";
export type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagStatistics,
} from "./tags";
export type {
  NotificationPreferences,
  NotificationStats,
} from "./notifications";
export type {
  SearchParams,
  SearchFilters,
  SearchResult,
  SearchResponse,
  SavedSearch,
  IndexStats,
} from "./search";
export type {
  DashboardStats,
  DashboardOverview,
  RecentCase,
  DashboardNotification,
  UpcomingDeadline,
  Activity,
} from "./dashboard";
export type { ProfileUpdateInput, ProfileCompleteness } from "./profile";
export type { AppSettings } from "./settings";
export type {
  AIProviderConfig,
  ConfigureResponse,
  ValidationResult,
  TestResult,
} from "./aiConfig";
export type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateResult,
  SeedResult,
} from "./templates";
export type { ExportDataResult, DeleteDataResult, Consent } from "./gdpr";
export type {
  Deadline,
  DeadlineListResponse,
  CreateDeadlineInput,
  UpdateDeadlineInput,
} from "./deadlines";
export type { StreamCallbacks, StreamOptions } from "./chat";

// Re-export API types
export type {
  AuthApi,
  CasesApi,
  EvidenceApi,
  TagsApi,
  NotificationsApi,
  SearchApi,
  DashboardApi,
  ProfileApi,
  SettingsApi,
  AiConfigApi,
  TemplatesApi,
  GdprApi,
  ExportApi,
  DeadlinesApi,
  ChatApi,
};

// Re-export React Query hooks
export * from "./hooks";

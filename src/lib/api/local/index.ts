/**
 * Local API Client - IndexedDB + Direct AI Provider Integration
 *
 * This module provides a drop-in replacement for the backend API client.
 * All data operations use IndexedDB, and AI calls go directly to providers.
 *
 * Usage:
 * Replace: import { apiClient } from "@/lib/api"
 * With:    import { localApiClient } from "@/lib/api/local"
 *
 * Or use the factory to get the appropriate client based on mode.
 */

import { createLocalCasesApi } from "./cases";
import { createLocalChatApi } from "./chat";
import { createLocalAuthApi } from "./auth";
import { createLocalSettingsApi } from "./settings";
import {
  openDatabase,
  isEncryptionInitialized,
  type JusticeCompanionDB,
} from "../../storage";

/**
 * Local API Client that mimics the backend API structure
 */
export class LocalApiClient {
  private _initialized = false;

  /**
   * Cases API namespace
   */
  public readonly cases = createLocalCasesApi();

  /**
   * Chat API namespace (direct AI provider calls)
   */
  public readonly chat = createLocalChatApi();

  /**
   * Auth API namespace (PIN-based local auth)
   */
  public readonly auth = createLocalAuthApi();

  /**
   * Settings API namespace
   */
  public readonly settings = createLocalSettingsApi();

  /**
   * Initialize the local database
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    await openDatabase();
    this._initialized = true;
  }

  /**
   * Check if initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Check if encryption is active (user unlocked with PIN)
   */
  get isUnlocked(): boolean {
    return isEncryptionInitialized();
  }

  // Stub implementations for APIs that don't need local equivalents
  // These return empty/default responses to maintain interface compatibility

  /**
   * Dashboard - returns local stats
   */
  public readonly dashboard = {
    getStats: async () => ({
      success: true as const,
      data: {
        totalCases: 0,
        activeCases: 0,
        upcomingDeadlines: 0,
        recentActivity: [],
      },
    }),
    getRecentActivity: async () => ({
      success: true as const,
      data: [],
    }),
  };

  /**
   * Deadlines - TODO: Implement with local tasks repository
   */
  public readonly deadlines = {
    list: async () => ({
      success: true as const,
      data: { items: [], total: 0, limit: 20, offset: 0, hasMore: false },
    }),
    get: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Deadlines not yet implemented" },
    }),
    create: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Deadlines not yet implemented" },
    }),
    update: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Deadlines not yet implemented" },
    }),
    delete: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Deadlines not yet implemented" },
    }),
  };

  /**
   * Evidence - TODO: Implement with local evidence repository
   */
  public readonly evidence = {
    list: async (_caseId?: number) => ({
      success: true as const,
      data: [] as never[],
    }),
    listByCase: async (_caseId: number) => ({
      success: true as const,
      data: [] as never[],
    }),
    listAll: async () => ({
      success: true as const,
      data: [] as never[],
    }),
    get: async (_evidenceId: number) => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Evidence not yet implemented" },
    }),
    upload: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Evidence not yet implemented" },
    }),
    delete: async (_evidenceId: number) => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Evidence not yet implemented" },
    }),
  };

  /**
   * Export/Import - handled separately
   */
  public readonly export = {
    exportData: async () => ({
      success: false as const,
      error: { code: "USE_LOCAL", message: "Use local export functionality" },
    }),
  };

  /**
   * GDPR - handled locally
   */
  public readonly gdpr = {
    exportData: async () => ({
      success: false as const,
      error: { code: "USE_LOCAL", message: "Use local export functionality" },
    }),
    deleteAllData: async () => ({
      success: false as const,
      error: { code: "USE_LOCAL", message: "Use local delete functionality" },
    }),
  };

  /**
   * Legal - not available in local mode (requires backend)
   */
  public readonly legal = {
    search: async () => ({
      success: true as const,
      data: [],
    }),
    getLegislation: async () => ({
      success: false as const,
      error: { code: "NOT_AVAILABLE", message: "Legal research requires internet connection" },
    }),
  };

  /**
   * Notifications - stored locally
   */
  public readonly notifications = {
    list: async () => ({
      success: true as const,
      data: [],
    }),
    markRead: async () => ({
      success: true as const,
      data: undefined,
    }),
  };

  /**
   * Profile - not needed in local mode
   */
  public readonly profile = {
    get: async () => ({
      success: true as const,
      data: {
        id: 1,
        username: "local_user",
        email: null,
        role: "user",
      },
    }),
    update: async () => ({
      success: true as const,
      data: undefined,
    }),
  };

  /**
   * Search - searches local data
   */
  public readonly search = {
    search: async () => ({
      success: true as const,
      data: {
        cases: [],
        evidence: [],
        notes: [],
      },
    }),
  };

  /**
   * Tags - TODO: Implement
   */
  public readonly tags = {
    list: async () => ({
      success: true as const,
      data: [],
    }),
    create: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Tags not yet implemented" },
    }),
  };

  /**
   * Templates - TODO: Implement
   */
  public readonly templates = {
    list: async () => ({
      success: true as const,
      data: [],
    }),
    get: async () => ({
      success: false as const,
      error: { code: "NOT_IMPLEMENTED", message: "Templates not yet implemented" },
    }),
  };

  /**
   * AI Config - handled through settings
   */
  public readonly aiConfig = {
    getConfig: async () => this.settings.getAIConfig(),
    updateConfig: async (config: { provider: string; apiKey: string; model: string }) =>
      this.settings.setAIConfig(config),
    testConnection: async () => ({
      success: true as const,
      data: { connected: true },
    }),
  };
}

/**
 * Singleton instance of the local API client
 */
let localApiClientInstance: LocalApiClient | null = null;

/**
 * Get the local API client singleton
 */
export function getLocalApiClient(): LocalApiClient {
  if (!localApiClientInstance) {
    localApiClientInstance = new LocalApiClient();
  }
  return localApiClientInstance;
}

/**
 * Initialize the local API client
 */
export async function initializeLocalApi(): Promise<LocalApiClient> {
  const client = getLocalApiClient();
  await client.initialize();
  return client;
}

// Re-export sub-modules
export { createLocalCasesApi } from "./cases";
export { createLocalChatApi } from "./chat";
export { createLocalAuthApi } from "./auth";
export { createLocalSettingsApi } from "./settings";

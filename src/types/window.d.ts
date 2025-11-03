/**
 * Global window type declarations for Justice Companion
 * Defines the justiceAPI interface exposed by Electron preload script
 *
 * IMPORTANT: All types have been replaced from 'any' to proper TypeScript interfaces
 * This provides full type safety, IDE autocomplete, and runtime validation enforcement
 */

import type { User } from '../domains/auth/entities/User.ts';
import type { Session } from '../domains/auth/entities/Session.ts';
import type { Case, CreateCaseInput, UpdateCaseInput } from '../domains/cases/entities/Case.ts';
import type { CaseFact } from '../domains/cases/entities/CaseFact.ts';
import type { Evidence } from '../domains/evidence/entities/Evidence.ts';
import type { Deadline, CreateDeadlineInput, UpdateDeadlineInput } from '../domains/timeline/entities/Deadline.ts';
import type { ConsentType } from '../domains/settings/entities/Consent.ts';
import type { Tag, CreateTagInput, UpdateTagInput } from '../models/Tag.ts';

/**
 * Response wrapper for all IPC operations
 * Follows consistent pattern: { success: true, data } or { success: false, error }
 *
 * This is a discriminated union type - use `success` field to narrow the type:
 *
 * @example
 * const response = await window.justiceAPI.getAllCases(sessionId);
 * if (response.success) {
 *   // TypeScript knows response.data is Case[] here
 *   console.log(response.data);
 * } else {
 *   // TypeScript knows response.error exists here
 *   console.error(response.error);
 * }
 */
interface IPCSuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

interface IPCErrorResponse {
  success: false;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
}

type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;

/**
 * Session response with nested user object
 */
interface SessionResponse {
  id: string;
  user: User;
  expiresAt: string;
}

/**
 * Dashboard statistics response
 */
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  recentActivity: number;
  upcomingDeadlines?: number;
  casesByStatus?: Record<string, number>;
  recentCases?: Array<{
    id: string;
    title: string;
    status: 'active' | 'closed' | 'pending';
    lastUpdated: string;
  }>;
}

/**
 * AI Configuration request
 * Supports 11 AI providers
 */
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'groq' | 'qwen' | 'huggingface' | 'google' | 'cohere' | 'together' | 'anyscale' | 'mistral' | 'perplexity';
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Streaming chat request
 */
interface StreamChatRequest {
  sessionId: string;
  message: string;
  conversationId?: number | null;
}

/**
 * Case fact creation input
 */
interface CreateCaseFactInput {
  caseId: number;
  factContent?: string;
  factCategory?: string;
  importance?: string;
  factType?: string;
  factKey?: string;
  factValue?: string;
  source?: string;
  confidence?: number;
}

/**
 * Main JusticeAPI interface exposed via window.justiceAPI
 * All methods are now fully typed with proper request/response interfaces
 */
interface JusticeAPI {
  // ===== AUTHENTICATION =====
  /**
   * Login user with username and password
   * @returns User and session data if successful
   */
  login(username: string, password: string, rememberMe?: boolean): Promise<IPCResponse<{ user: User; session: Session }>>;

  /**
   * Register new user account
   * @returns Newly created user data
   */
  register(username: string, email: string, password: string): Promise<IPCResponse<User>>;

  /**
   * Logout current user session
   */
  logout(sessionId: string): Promise<IPCResponse<void>>;

  /**
   * Get current session information
   * @returns Session data with nested user object if session is valid
   */
  getSession(sessionId: string): Promise<IPCResponse<SessionResponse | null>>;

  // ===== CONSENT MANAGEMENT (GDPR) =====
  /**
   * Grant user consent for specified type
   * @param type - Consent type (e.g., 'data_processing', 'marketing')
   * @param granted - Whether consent is granted
   */
  grantConsent(type: ConsentType, granted: boolean): Promise<IPCResponse<{ granted: boolean }>>;

  // ===== DASHBOARD =====
  /**
   * Get dashboard statistics
   * @returns Aggregate statistics for user's cases and deadlines
   */
  getDashboardStats(sessionId: string): Promise<IPCResponse<DashboardStats>>;

  // ===== CASE MANAGEMENT =====
  /**
   * Get all cases for current user
   * @returns Array of cases
   */
  getAllCases(sessionId: string): Promise<IPCResponse<Case[]>>;

  /**
   * Get specific case by ID
   * @param id - Case ID
   * @returns Case data if found
   */
  getCaseById(id: string, sessionId: string): Promise<IPCResponse<Case>>;

  /**
   * Create new case
   * @param data - Case creation input
   * @returns Newly created case
   */
  createCase(data: CreateCaseInput, sessionId: string): Promise<IPCResponse<Case>>;

  /**
   * Update existing case
   * @param id - Case ID
   * @param data - Fields to update
   * @returns Updated case
   */
  updateCase(id: string, data: UpdateCaseInput, sessionId: string): Promise<IPCResponse<Case>>;

  /**
   * Delete case permanently
   * @param id - Case ID to delete
   */
  deleteCase(id: string, sessionId: string): Promise<IPCResponse<void>>;

  /**
   * Get case facts (memory/notes for AI)
   * @param caseId - Case ID
   * @returns Array of case facts
   */
  getCaseFacts(caseId: number, sessionId: string): Promise<IPCResponse<CaseFact[]>>;

  /**
   * Create case fact (AI memory entry)
   * @param data - Case fact creation input
   * @returns Newly created case fact
   */
  createCaseFact(data: CreateCaseFactInput, sessionId: string): Promise<IPCResponse<CaseFact>>;

  // ===== EVIDENCE/DOCUMENTS =====
  /**
   * Upload file as evidence for case
   * @param caseId - Case ID to attach evidence to
   * @param file - File object to upload
   * @returns Evidence metadata including extracted text
   */
  uploadFile(caseId: string, file: File, sessionId: string): Promise<IPCResponse<Evidence>>;

  /**
   * Get all evidence for a case
   * @param caseId - Case ID
   * @returns Array of evidence items
   */
  getAllEvidence(caseId: string, sessionId: string): Promise<IPCResponse<Evidence[]>>;

  /**
   * Get all evidence for a case (alias for getAllEvidence)
   * @param caseId - Case ID
   * @returns Array of evidence items
   */
  getEvidenceByCaseId(caseId: string, sessionId: string): Promise<IPCResponse<Evidence[]>>;

  /**
   * Delete evidence item
   * @param id - Evidence ID to delete
   */
  deleteEvidence(id: string, sessionId: string): Promise<IPCResponse<void>>;

  // ===== DEADLINE MANAGEMENT =====
  /**
   * Get deadlines (optionally filtered by case)
   * @param sessionId - Current session ID
   * @param caseId - Optional case ID filter
   * @returns Array of deadlines
   */
  getDeadlines(sessionId: string, caseId?: number): Promise<IPCResponse<Deadline[]>>;

  /**
   * Create new deadline
   * @param data - Deadline creation input
   * @returns Newly created deadline
   */
  createDeadline(data: CreateDeadlineInput, sessionId: string): Promise<IPCResponse<Deadline>>;

  /**
   * Update deadline
   * @param id - Deadline ID
   * @param data - Fields to update
   * @returns Updated deadline
   */
  updateDeadline(id: number, data: UpdateDeadlineInput, sessionId: string): Promise<IPCResponse<Deadline>>;

  /**
   * Mark deadline as completed
   * @param id - Deadline ID to complete
   * @returns Updated deadline
   */
  completeDeadline(id: number, sessionId: string): Promise<IPCResponse<Deadline>>;

  /**
   * Delete deadline
   * @param id - Deadline ID to delete
   */
  deleteDeadline(id: number, sessionId: string): Promise<IPCResponse<void>>;

  // ===== AI CONFIGURATION =====
  /**
   * Configure AI service (save API key)
   * @param config - AI provider configuration
   */
  configureAI(config: AIConfig): Promise<IPCResponse<{ configured: boolean }>>;

  // ===== CHAT STREAMING =====
  /**
   * Stream chat with AI (real-time token streaming)
   * @param request - Chat request with message and optional conversation ID
   * @param onToken - Callback for each response token
   * @param onThinking - Callback for AI reasoning tokens
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   */
  streamChat(
    request: StreamChatRequest,
    onToken: (token: string) => void,
    onThinking: (thinking: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void>;

  // ===== AI ANALYSIS =====
  /**
   * Analyze a legal case and provide structured analysis
   * @param request - Case analysis request
   * @returns Comprehensive case analysis
   */
  analyzeCase(request: any): Promise<IPCResponse<any>>;

  /**
   * Analyze evidence and identify gaps
   * @param request - Evidence analysis request
   * @returns Evidence analysis with identified gaps
   */
  analyzeEvidence(request: any): Promise<IPCResponse<any>>;

  /**
   * Draft a legal document using AI
   * @param request - Document drafting request
   * @returns Generated document
   */
  draftDocument(request: any): Promise<IPCResponse<any>>;

  /**
   * Analyze an uploaded legal document
   * @param filePath - Path to the document file
   * @param sessionId - Current session ID
   * @param userQuestion - Optional question about the document
   * @returns AI analysis with potential case data
   */
  analyzeDocument(
    filePath: string,
    sessionId: string,
    userQuestion?: string
  ): Promise<IPCResponse<{ analysis: string; suggestedCaseData?: any }>>;

  /**
   * Show file open dialog
   * @param options - Dialog options (filters, properties, etc.)
   * @returns Dialog result with selected file paths
   */
  showOpenDialog(options: any): Promise<{ canceled: boolean; filePaths: string[] }>;

  /**
   * Show file save dialog
   * @param options - Dialog options (filters, defaultPath, etc.)
   * @returns Dialog result with selected file path
   */
  showSaveDialog(options: any): Promise<{ canceled: boolean; filePath?: string }>;

  // ===== SECURE STORAGE (Flat Methods) =====
  /**
   * Set encrypted value in secure storage
   * @param key - Storage key
   * @param value - Value to encrypt and store
   */
  secureStorageSet(key: string, value: string): Promise<IPCResponse<void>>;

  /**
   * Get decrypted value from secure storage
   * @param key - Storage key
   * @returns Decrypted value or null if not found
   */
  secureStorageGet(key: string): Promise<IPCResponse<string | null>>;

  /**
   * Delete key from secure storage
   * @param key - Storage key to delete
   */
  secureStorageDelete(key: string): Promise<IPCResponse<void>>;

  /**
   * Check if key exists in secure storage
   * @param key - Storage key to check
   * @returns True if key exists
   */
  secureStorageHas(key: string): Promise<IPCResponse<boolean>>;

  // ===== SECURE STORAGE (Nested API) =====
  /**
   * Secure Storage nested API (legacy, used by SecureStorageService)
   */
  secureStorage: {
    /**
     * Check if encryption is available on this platform
     */
    isEncryptionAvailable(): Promise<boolean>;

    /**
     * Set encrypted value (throws on error)
     */
    set(key: string, value: string): Promise<void>;

    /**
     * Get decrypted value (throws on error)
     */
    get(key: string): Promise<string | null>;

    /**
     * Delete key (throws on error)
     */
    delete(key: string): Promise<void>;

    /**
     * Clear all stored keys (throws on error)
     */
    clearAll(): Promise<void>;
  };

  // ===== BACKUP & RESTORE =====
  /**
   * Create a new backup of the database
   * @returns Backup metadata including filename and path
   */
  createBackup(): Promise<IPCResponse<Backup>>;

  /**
   * List all available backups
   * @returns Array of backup metadata
   */
  listBackups(): Promise<IPCResponse<{ backups: Backup[] }>>;

  /**
   * Restore database from a backup file
   * @param backupFilename - Filename of the backup to restore
   * @returns Restore operation result
   */
  restoreBackup(backupFilename: string): Promise<IPCResponse<{ restored: boolean; message: string; preRestoreBackup: string }>>;

  /**
   * Delete a backup file
   * @param backupFilename - Filename of the backup to delete
   * @returns Delete operation result
   */
  deleteBackup(backupFilename: string): Promise<IPCResponse<{ deleted: boolean; message: string }>>;

  // ===== TAG MANAGEMENT =====
  tags: {
    /**
     * List all tags for the current user
     * @returns Array of tags with usage counts
     */
    list(sessionId: string): Promise<IPCResponse<Tag[]>>;

    /**
     * Create a new tag
     * @param input - Tag creation input
     * @returns Newly created tag
     */
    create(input: CreateTagInput, sessionId: string): Promise<IPCResponse<Tag>>;

    /**
     * Update an existing tag
     * @param tagId - Tag ID to update
     * @param input - Fields to update
     * @returns Updated tag
     */
    update(tagId: number, input: UpdateTagInput, sessionId: string): Promise<IPCResponse<Tag>>;

    /**
     * Delete a tag (removes from all evidence)
     * @param tagId - Tag ID to delete
     */
    delete(tagId: number, sessionId: string): Promise<IPCResponse<{ deleted: boolean }>>;

    /**
     * Apply tag to evidence
     * @param evidenceId - Evidence ID
     * @param tagId - Tag ID to apply
     */
    tagEvidence(evidenceId: number, tagId: number, sessionId: string): Promise<IPCResponse<{ tagged: boolean }>>;

    /**
     * Remove tag from evidence
     * @param evidenceId - Evidence ID
     * @param tagId - Tag ID to remove
     */
    untagEvidence(evidenceId: number, tagId: number, sessionId: string): Promise<IPCResponse<{ untagged: boolean }>>;

    /**
     * Get tags for specific evidence
     * @param evidenceId - Evidence ID
     * @returns Array of tags applied to the evidence
     */
    getForEvidence(evidenceId: number, sessionId: string): Promise<IPCResponse<Tag[]>>;

    /**
     * Search evidence by tags (AND logic - must have all specified tags)
     * @param tagIds - Array of tag IDs
     * @returns Array of evidence IDs matching all tags
     */
    searchByTags(tagIds: number[], sessionId: string): Promise<IPCResponse<number[]>>;

    /**
     * Get tag statistics for the current user
     * @returns Tag usage statistics
     */
    statistics(sessionId: string): Promise<IPCResponse<TagStatistics>>;
  };

  // ===== NOTIFICATIONS =====
  notifications: {
    /**
     * Get notifications with optional filters
     * @param sessionId - User session ID
     * @param filters - Optional filters for notifications
     * @returns List of notifications
     */
    list(sessionId: string, filters?: NotificationFilters): Promise<IPCResponse<Notification[]>>;

    /**
     * Get unread notification count
     * @param sessionId - User session ID
     * @returns Number of unread notifications
     */
    unreadCount(sessionId: string): Promise<IPCResponse<number>>;

    /**
     * Mark a notification as read
     * @param sessionId - User session ID
     * @param notificationId - ID of the notification to mark as read
     */
    markRead(sessionId: string, notificationId: number): Promise<IPCResponse<null>>;

    /**
     * Mark all notifications as read
     * @param sessionId - User session ID
     * @returns Number of notifications marked as read
     */
    markAllRead(sessionId: string): Promise<IPCResponse<{ count: number }>>;

    /**
     * Dismiss a notification
     * @param sessionId - User session ID
     * @param notificationId - ID of the notification to dismiss
     */
    dismiss(sessionId: string, notificationId: number): Promise<IPCResponse<null>>;

    /**
     * Get notification preferences
     * @param sessionId - User session ID
     * @returns User's notification preferences
     */
    preferences(sessionId: string): Promise<IPCResponse<NotificationPreferences>>;

    /**
     * Update notification preferences
     * @param sessionId - User session ID
     * @param preferences - Preferences to update
     * @returns Updated preferences
     */
    updatePreferences(sessionId: string, preferences: UpdateNotificationPreferencesInput): Promise<IPCResponse<NotificationPreferences>>;

    /**
     * Get notification statistics
     * @param sessionId - User session ID
     * @returns Notification statistics
     */
    stats(sessionId: string): Promise<IPCResponse<NotificationStats>>;
  };

  // ===== SEARCH =====
  search: {
    /**
     * Perform a comprehensive search across all entities
     * @param query - Search query with filters, sorting, and pagination
     */
    query(query: SearchQuery): Promise<IPCResponse<SearchResponse>>;

    /**
     * Save a search query for later reuse
     * @param name - Name for the saved search
     * @param query - Search query to save
     */
    save(name: string, query: SearchQuery): Promise<IPCResponse<SavedSearch>>;

    /**
     * Get all saved searches for the current user
     */
    listSaved(): Promise<IPCResponse<SavedSearch[]>>;

    /**
     * Delete a saved search
     * @param searchId - ID of the saved search to delete
     */
    deleteSaved(searchId: number): Promise<IPCResponse<void>>;

    /**
     * Execute a previously saved search
     * @param searchId - ID of the saved search to execute
     */
    executeSaved(searchId: number): Promise<IPCResponse<SearchResponse>>;

    /**
     * Get search suggestions based on prefix
     * @param prefix - Search prefix for suggestions
     * @param limit - Maximum number of suggestions (default: 5)
     */
    suggestions(prefix: string, limit?: number): Promise<IPCResponse<string[]>>;

    /**
     * Rebuild the entire search index (admin operation)
     */
    rebuildIndex(): Promise<IPCResponse<{ message: string }>>;

    /**
     * Get search index statistics
     */
    indexStats(): Promise<IPCResponse<SearchIndexStats>>;

    /**
     * Update search index for a specific entity
     * @param entityType - Type of entity ('case', 'evidence', 'conversation', 'note')
     * @param entityId - ID of the entity to update
     */
    updateIndex(entityType: string, entityId: number): Promise<IPCResponse<void>>;
  };

  // ===== CASE TEMPLATES =====
  templates: {
    /**
     * Get all templates (system + user's custom)
     * @param sessionId - User session ID
     * @returns Array of case templates
     */
    getAll(sessionId: string): Promise<IPCResponse<CaseTemplate[]>>;

    /**
     * Get all templates with usage statistics
     * @param sessionId - User session ID
     * @returns Array of templates with stats
     */
    getAllWithStats(sessionId: string): Promise<IPCResponse<TemplateWithStats[]>>;

    /**
     * Get template by ID
     * @param templateId - Template ID
     * @returns Template details
     */
    getById(templateId: number): Promise<IPCResponse<CaseTemplate>>;

    /**
     * Get templates by category
     * @param category - Template category
     * @param sessionId - User session ID
     * @returns Filtered templates
     */
    getByCategory(category: string, sessionId: string): Promise<IPCResponse<CaseTemplate[]>>;

    /**
     * Search templates with filters
     * @param filters - Search filters
     * @returns Matching templates
     */
    search(filters: TemplateFilters): Promise<IPCResponse<CaseTemplate[]>>;

    /**
     * Get most popular templates
     * @param limit - Number of templates to return
     * @param sessionId - User session ID
     * @returns Popular templates with stats
     */
    getPopular(limit: number, sessionId: string): Promise<IPCResponse<TemplateWithStats[]>>;

    /**
     * Create a custom template
     * @param input - Template creation input
     * @param sessionId - User session ID
     * @returns Newly created template
     */
    create(input: CreateTemplateInput, sessionId: string): Promise<IPCResponse<CaseTemplate>>;

    /**
     * Update an existing template
     * @param templateId - Template ID
     * @param input - Fields to update
     * @param sessionId - User session ID
     * @returns Updated template
     */
    update(templateId: number, input: UpdateTemplateInput, sessionId: string): Promise<IPCResponse<CaseTemplate>>;

    /**
     * Delete a template
     * @param templateId - Template ID to delete
     * @param sessionId - User session ID
     */
    delete(templateId: number, sessionId: string): Promise<IPCResponse<{ deleted: boolean }>>;

    /**
     * Apply template to create a new case
     * @param templateId - Template ID to apply
     * @param sessionId - User session ID
     * @returns Case creation result with applied template data
     */
    apply(templateId: number, sessionId: string): Promise<IPCResponse<TemplateApplicationResult>>;

    /**
     * Get template usage statistics
     * @param templateId - Template ID
     * @returns Usage stats
     */
    getStats(templateId: number): Promise<IPCResponse<TemplateStats>>;

    /**
     * Get template usage history
     * @param templateId - Template ID
     * @param limit - Number of records to return
     * @returns Usage history
     */
    getUsageHistory(templateId: number, limit?: number): Promise<IPCResponse<TemplateUsage[]>>;

    /**
     * Seed built-in system templates (admin operation)
     * @returns Success message
     */
    seedDefaults(): Promise<IPCResponse<{ message: string }>>;
  };
}

/**
 * Search query parameters
 */
interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Search filters
 */
interface SearchFilters {
  caseStatus?: Array<'active' | 'closed' | 'pending'>;
  dateRange?: { from: Date; to: Date };
  entityTypes?: Array<'case' | 'evidence' | 'document' | 'conversation' | 'note'>;
  tags?: string[];
  caseIds?: number[];
}

/**
 * Search result item
 */
interface SearchResult {
  id: number;
  type: 'case' | 'evidence' | 'document' | 'conversation' | 'note';
  title: string;
  excerpt: string;
  relevanceScore: number;
  caseId?: number;
  caseTitle?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Search response
 */
interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  query: SearchQuery;
  executionTime: number;
}

/**
 * Saved search
 */
interface SavedSearch {
  id: number;
  userId: number;
  name: string;
  queryJson: string;
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
}

/**
 * Search index statistics
 */
interface SearchIndexStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  lastUpdated: string | null;
}

/**
 * Backup metadata
 */
interface Backup {
  id: number;
  filename: string;
  path: string;
  size: number;
  created_at: string;
  is_valid: boolean;
  metadata?: {
    version: string;
    record_count: number;
    tables?: string[];
  };
}

/**
 * Auto-backup configuration
 */
interface AutoBackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  keepCount: number;
  time?: string;
}

/**
 * Tag statistics
 */
interface TagStatistics {
  totalTags: number;
  totalTaggedEvidence: number;
  mostUsedTag: Tag | null;
  unusedTags: number;
}

/**
 * Notification types
 */
type NotificationType =
  | 'deadline_reminder'
  | 'case_status_change'
  | 'evidence_uploaded'
  | 'document_updated'
  | 'system_alert'
  | 'system_warning'
  | 'system_info';

/**
 * Notification severity levels
 */
type NotificationSeverity = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification object
 */
interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

/**
 * Notification filters for querying
 */
interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
  includeDismissed?: boolean;
}

/**
 * Notification preferences
 */
interface NotificationPreferences {
  id: number;
  userId: number;
  deadlineRemindersEnabled: boolean;
  deadlineReminderDays: number;
  caseUpdatesEnabled: boolean;
  evidenceUpdatesEnabled: boolean;
  systemAlertsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update notification preferences input
 */
interface UpdateNotificationPreferencesInput {
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
}

/**
 * Notification statistics
 */
interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<NotificationType, number>;
}

// ===== CASE TEMPLATES =====

import type {
  CaseTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateWithStats,
  TemplateStats,
  TemplateUsage,
  TemplateApplicationResult,
} from '../models/CaseTemplate.ts';

declare global {
  interface Window {
    justiceAPI: JusticeAPI;
    api: JusticeAPI; // Alias for justiceAPI
    sessionManager?: {
      getSessionId(): string | null;
    };
    electron: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    };
  }
}

export {};

/**
 * Type definitions for Justice Companion REST API
 * These types match the Pydantic models from the FastAPI backend
 */

// ===== COMMON TYPES =====

export interface SuccessResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface ErrorResponse {
  detail: string | { message: string; attempts_remaining?: number };
  rate_limit_info?: RateLimitInfo;
}

export interface RateLimitInfo {
  retry_after_seconds: number;
  attempts_remaining?: number;
}

// ===== AUTH TYPES =====

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface LogoutRequest {
  session_id: string;
}

export interface ChangePasswordRequest {
  user_id: number;
  old_password: string;
  new_password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface SessionResponse {
  id: string;
  user_id: number;
  expires_at: string;
}

export interface AuthResponse {
  user: UserResponse;
  session: SessionResponse;
}

// ===== CASE TYPES =====

export type CaseType =
  | "employment"
  | "housing"
  | "consumer"
  | "family"
  | "debt"
  | "other";
export type CaseStatus = "active" | "closed" | "pending";

export interface CreateCaseRequest {
  title: string;
  description?: string;
  caseType: CaseType;
  status?: CaseStatus;
  caseNumber?: string;
  courtName?: string;
  judge?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  nextHearingDate?: string; // YYYY-MM-DD
  filingDeadline?: string; // YYYY-MM-DD
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  caseType?: CaseType;
  status?: CaseStatus;
  caseNumber?: string;
  courtName?: string;
  judge?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  nextHearingDate?: string;
  filingDeadline?: string;
}

export interface CaseResponse {
  id: number;
  title: string;
  description?: string;
  caseType: CaseType;
  status: CaseStatus;
  userId: number;
  caseNumber?: string;
  courtName?: string;
  judge?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  nextHearingDate?: string;
  filingDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteCaseResponse {
  deleted: boolean;
  id: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CaseListResponse {
  cases: CaseResponse[];
  pagination: PaginationMetadata;
}

// Case Facts
export type FactCategory =
  | "timeline"
  | "evidence"
  | "witness"
  | "location"
  | "communication"
  | "other";
export type ImportanceLevel = "low" | "medium" | "high" | "critical";

export interface CreateCaseFactRequest {
  caseId: number;
  factContent: string;
  factCategory: FactCategory;
  importance?: ImportanceLevel;
}

export interface CaseFactResponse {
  id: number;
  caseId: number;
  factContent: string;
  factCategory: FactCategory;
  importance: ImportanceLevel;
  createdAt: string;
  updatedAt: string;
}

// Bulk Operations
export interface BulkDeleteRequest {
  case_ids: number[];
  fail_fast?: boolean;
}

export interface BulkUpdateRequest {
  updates: CaseUpdate[];
  fail_fast?: boolean;
}

export interface BulkArchiveRequest {
  case_ids: number[];
  fail_fast?: boolean;
}

export interface CaseUpdate {
  id: number;
  title?: string;
  description?: string;
  status?: CaseStatus;
  case_type?: CaseType;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors: Array<{ id: number; error: string }>;
}

// ===== EVIDENCE TYPES =====

export interface EvidenceResponse {
  id: number;
  caseId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  description?: string;
  uploadedAt: string;
  tags?: string[];
}

export interface EvidenceListResponse {
  evidence: EvidenceResponse[];
  total: number;
}

// ===== CHAT TYPES =====

export interface ChatStreamRequest {
  message: string;
  conversationId?: number;
  caseId?: number;
}

export interface ChatSendRequest {
  message: string;
  conversationId?: number;
}

export interface CaseAnalysisRequest {
  caseId: number;
  description: string;
}

export interface EvidenceAnalysisRequest {
  caseId: number;
  existingEvidence: string[];
}

export interface DocumentContext {
  caseId: number;
  facts: string;
  objectives: string;
}

export interface DocumentDraftRequest {
  documentType: string;
  context: DocumentContext;
}

export interface DocumentAnalysisRequest {
  filePath: string;
  userQuestion?: string;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  thinkingContent?: string;
  timestamp: string;
  tokenCount?: number;
}

export interface ConversationResponse {
  id: number;
  userId: number;
  caseId?: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: MessageResponse[];
}

export interface CaseAnalysisResponse {
  analysis: string;
  suggestedActions: string[];
  relevantLaw?: string;
}

export interface EvidenceAnalysisResponse {
  analysis: string;
  gaps: string[];
  recommendations: string[];
}

export interface DocumentDraftResponse {
  documentType: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface DocumentAnalysisResponse {
  analysis: string;
  suggestedCaseData?: Record<string, unknown>;
}

// SSE Stream Data
export interface StreamData {
  data: string;
  done: boolean;
  conversationId?: number;
}

// ===== SEARCH TYPES =====

export type SearchEntityType =
  | "case"
  | "evidence"
  | "conversation"
  | "note"
  | "document";
export type SearchSortBy = "relevance" | "date" | "title";
export type SearchSortOrder = "asc" | "desc";

export interface SearchFilters {
  caseStatus?: CaseStatus[];
  dateRange?: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  entityTypes?: SearchEntityType[];
  tags?: string[];
  caseIds?: number[];
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sortBy?: SearchSortBy;
  sortOrder?: SearchSortOrder;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: number;
  type: SearchEntityType;
  title: string;
  excerpt: string;
  relevanceScore: number;
  caseId?: number;
  caseTitle?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  executionTime: number; // milliseconds
}

export interface SavedSearch {
  id: number;
  name: string;
  queryJson: string;
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
}

export interface SaveSearchRequest {
  name: string;
  query: SearchRequest;
}

export interface SavedSearchListResponse {
  searches: SavedSearch[];
  total: number;
}

export interface RebuildIndexResponse {
  success: boolean;
  message: string;
}

export interface IndexStatsResponse {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  lastUpdated: string | null;
}

// ===== NOTIFICATION TYPES =====

export type NotificationType =
  | "deadline_reminder"
  | "case_status_change"
  | "evidence_uploaded"
  | "document_updated"
  | "system_alert"
  | "system_warning"
  | "system_info";

export type NotificationSeverity = "low" | "medium" | "high" | "urgent";

export interface NotificationMetadata {
  caseId?: number;
  evidenceId?: number;
  deadlineId?: number;
  documentId?: number;
  daysUntil?: number;
  oldStatus?: string;
  newStatus?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: NotificationMetadata;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationListParams {
  unreadOnly?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
  includeDismissed?: boolean;
}

export interface NotificationPreferences {
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
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string; // "HH:MM"
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesRequest {
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

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
}

// Legacy compatibility
export type NotificationResponse = Notification;

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: NotificationMetadata;
  expiresAt?: Date;
}

export interface UpdateNotificationInput {
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: NotificationMetadata;
  isRead?: boolean;
  isDismissed?: boolean;
  expiresAt?: Date;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  includeDismissed?: boolean;
  includeExpired?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  limit?: number;
  offset?: number;
}

// ===== TAG TYPES =====

export interface TagResponse {
  id: number;
  userId: number;
  name: string;
  color: string;
  description?: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface DeleteTagResponse {
  deleted: boolean;
  id: number;
}

export interface TagAttachResponse {
  success: boolean;
  message: string;
  caseId: number;
  tagId: number;
  wasAttached: boolean;
}

export interface TagRemoveResponse {
  success: boolean;
  message: string;
  caseId: number;
  tagId: number;
  removed: boolean;
}

export interface TagSearchResponse {
  caseIds: number[];
  matchAll: boolean;
  tagIds: number[];
  resultCount: number;
}

export interface TagStatisticsResponse {
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
}

// ===== TEMPLATE TYPES =====

export type TemplateCategory =
  | "civil"
  | "criminal"
  | "family"
  | "employment"
  | "housing"
  | "immigration"
  | "other";

export interface TemplateFields {
  titleTemplate: string;
  descriptionTemplate: string;
  caseType: CaseType;
  defaultStatus: CaseStatus;
  customFields?: Record<string, string>;
}

export interface TimelineMilestone {
  title: string;
  description: string;
  daysFromStart: number;
  isRequired: boolean;
  category: "filing" | "hearing" | "deadline" | "meeting" | "other";
}

export interface ChecklistItem {
  title: string;
  description: string;
  category: "evidence" | "filing" | "communication" | "research" | "other";
  priority: "low" | "medium" | "high";
  daysFromStart?: number;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  category: TemplateCategory;
  isSystemTemplate: boolean;
  userId: number | null;
  templateFields: TemplateFields;
  suggestedEvidenceTypes: string[];
  timelineMilestones: TimelineMilestone[];
  checklistItems: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  templateFields: TemplateFields;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: TimelineMilestone[];
  checklistItems?: ChecklistItem[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  templateFields?: TemplateFields;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: TimelineMilestone[];
  checklistItems?: ChecklistItem[];
}

export interface TemplateListResponse {
  items: Template[];
  total: number;
}

export interface TemplateApplicationResult {
  case: {
    id: number;
    title: string;
    description: string | null;
    caseType: CaseType;
    status: CaseStatus;
  };
  appliedMilestones: Array<{
    id: number;
    title: string;
    dueDate: string;
  }>;
  appliedChecklistItems: ChecklistItem[];
  templateId: number;
  templateName: string;
}

export interface ApplyTemplateRequest {
  variables: Record<string, string>;
}

export interface TemplateWithStats extends Template {
  usageCount: number;
  lastUsed: string | null;
  successRate: number;
}

// Legacy compatibility
export type TemplateResponse = Template;

export interface SeedTemplatesResponse {
  success: boolean;
  message: string;
  stats: {
    seeded: number;
    skipped: number;
    failed: number;
  };
}

// ===== DASHBOARD TYPES =====

/**
 * Dashboard statistics widget data
 */
export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalEvidence: number;
  totalDeadlines: number;
  overdueDeadlines: number;
  unreadNotifications: number;
}

/**
 * Recent case information for dashboard
 */
export interface RecentCaseInfo {
  id: number;
  title: string;
  status: string;
  priority?: string | null;
  lastUpdated: string; // ISO 8601 timestamp
}

/**
 * Recent cases widget response
 */
export interface RecentCasesResponse {
  cases: RecentCaseInfo[];
  total: number;
}

/**
 * Notification widget response
 */
export interface NotificationWidgetResponse {
  unreadCount: number;
  recentNotifications: Array<{
    id: number;
    type: string;
    severity: string;
    title: string;
    message: string;
    createdAt: string | null;
  }>;
}

/**
 * Upcoming deadline information
 */
export interface UpcomingDeadline {
  id: number;
  title: string;
  deadlineDate: string;
  priority: string;
  daysUntil: number;
  isOverdue: boolean;
  caseId?: number | null;
  caseTitle?: string | null;
}

/**
 * Deadlines widget response
 */
export interface DeadlinesWidgetResponse {
  upcomingDeadlines: UpcomingDeadline[];
  totalDeadlines: number;
  overdueCount: number;
}

/**
 * Activity item information
 */
export interface ActivityItem {
  id: number;
  type: string; // "case", "evidence", "deadline", "notification"
  action: string; // "created", "updated", "deleted", "uploaded"
  title: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Activity widget response
 */
export interface ActivityWidgetResponse {
  activities: ActivityItem[];
  total: number;
}

/**
 * Complete dashboard overview response
 */
export interface DashboardOverviewResponse {
  stats: DashboardStats;
  recentCases: RecentCasesResponse;
  notifications: NotificationWidgetResponse;
  deadlines: DeadlinesWidgetResponse;
  activity: ActivityWidgetResponse;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string | null;
}

/**
 * Chart response
 */
export interface ChartResponse {
  data: ChartDataPoint[];
  total: number;
}

/**
 * Timeline chart data point
 */
export interface TimelineChartDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * Timeline chart response
 */
export interface TimelineChartResponse {
  data: TimelineChartDataPoint[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Legacy compatibility types
export type RecentCase = RecentCaseInfo;

export interface DashboardResponse {
  stats: DashboardStats;
  recentCases: RecentCase[];
  upcomingDeadlines: DeadlineResponse[];
}

// ===== DEADLINE TYPES =====

export type DeadlineStatus =
  | "pending"
  | "completed"
  | "missed"
  | "upcoming"
  | "overdue";
export type DeadlinePriority =
  | "low"
  | "medium"
  | "high"
  | "urgent"
  | "critical";

export interface Deadline {
  id: number;
  caseId?: number;
  userId: number;
  title: string;
  description?: string;
  deadlineDate: string; // ISO 8601 format
  dueDate?: string; // Alias for deadlineDate (backwards compatibility)
  priority: DeadlinePriority;
  status: DeadlineStatus;
  completed: boolean; // Backwards compatibility
  completedAt?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  createdAt: string;
  updatedAt: string;
  caseTitle?: string; // Included when joined with cases
  caseStatus?: string;
}

export interface CreateDeadlineRequest {
  caseId?: number;
  title: string;
  description?: string;
  deadlineDate?: string;
  dueDate?: string; // Alias for deadlineDate
  priority?: DeadlinePriority;
  reminderDaysBefore?: number;
}

export interface UpdateDeadlineRequest {
  title?: string;
  description?: string;
  deadlineDate?: string;
  dueDate?: string; // Alias for deadlineDate
  priority?: DeadlinePriority;
  status?: DeadlineStatus;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
}

export interface DeadlineListParams {
  caseId?: number;
  status?: DeadlineStatus;
  priority?: DeadlinePriority;
  limit?: number;
  offset?: number;
}

export interface DeadlineListResponse {
  items: Deadline[];
  total: number;
  overdueCount: number;
}

export interface UpcomingDeadlinesParams {
  days?: number; // Default: 7
  limit?: number;
}

export interface DeadlineByDateParams {
  date: string; // YYYY-MM-DD
}

export interface SnoozeDeadlineParams {
  hours: number;
}

// Legacy compatibility
export type DeadlineResponse = Deadline;

// ===== EXPORT TYPES =====

export interface ExportRequest {
  caseId: number;
  format: "pdf" | "json" | "docx";
  includeEvidence?: boolean;
  includeMessages?: boolean;
}

export interface ExportResponse {
  success: boolean;
  filePath: string;
  fileSize: number;
  format: string;
}

// ===== GDPR TYPES =====

export interface GdprExportResponse {
  success: boolean;
  filePath: string;
  metadata: {
    totalRecords: number;
    exportDate: string;
    format: string;
  };
}

export interface GdprDeleteRequest {
  userId: number;
  confirmed: boolean;
  exportBeforeDelete?: boolean;
  reason?: string;
}

export interface GdprDeleteResponse {
  success: boolean;
  deletedCounts: Record<string, number>;
  preservedAuditLogs: number;
  exportPath?: string;
}

// ===== DATABASE TYPES =====

export interface MigrationResponse {
  success: boolean;
  message: string;
  currentVersion?: string;
  appliedMigrations?: number;
}

export interface MigrationStatusResponse {
  status: "pending" | "in_progress" | "completed" | "failed";
  lastMigration?: string;
  pendingMigrations: number;
  appliedMigrations: number;
}

export interface BackupResponse {
  success: boolean;
  path: string;
  size: number;
  timestamp: string;
}

// ===== PROFILE TYPES =====

export interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  username?: string;
  phone?: string;
  avatarUrl: string | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  initials?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  id: number;
  name: string;
  email: string | null;
  username?: string;
  phone?: string;
  avatarUrl: string | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  initials?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileCompletenessResponse {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

// ===== APP SETTINGS TYPES =====

export interface AppSettings {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  language: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  notificationsEnabled: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
}

export interface UpdateSettingsRequest {
  theme?: "light" | "dark" | "system";
  fontSize?: "small" | "medium" | "large";
  language?: string;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
  notificationsEnabled?: boolean;
  autoBackupEnabled?: boolean;
  backupFrequency?: "daily" | "weekly" | "monthly";
}

// ===== AI CONFIGURATION TYPES =====

export type AIProviderType =
  | "openai"
  | "anthropic"
  | "huggingface"
  | "qwen"
  | "google"
  | "cohere"
  | "together"
  | "anyscale"
  | "mistral"
  | "perplexity"
  | "emberton"
  | "ollama";

export interface AIProviderConfig {
  id: number;
  provider: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigureProviderRequest {
  api_key?: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  enabled?: boolean;
}

export interface AIProviderMetadata {
  name: string;
  default_endpoint: string;
  supports_streaming: boolean;
  default_model: string;
  max_context_tokens: number;
  available_models: string[];
  requires_api_key?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ValidateConfigResponse {
  valid: boolean;
  errors: string[];
}

// ===== AI STATUS TYPES (LEGACY) =====

export interface AiStatusResponse {
  available: boolean;
  provider: string;
  model?: string;
  status: "ready" | "error" | "unavailable";
  message?: string;
}

export interface AiConfigResponse {
  provider: "openai" | "huggingface" | "local";
  model: string;
  apiKeyConfigured: boolean;
  enabled: boolean;
}

export interface UpdateAiConfigRequest {
  provider?: "openai" | "huggingface" | "local";
  model?: string;
  apiKey?: string;
  enabled?: boolean;
}

// ===== ACTION LOG TYPES =====

export interface ActionLogResponse {
  id: number;
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ActionLogListResponse {
  logs: ActionLogResponse[];
  total: number;
}

// ===== PORT STATUS TYPES =====

export interface PortStatusResponse {
  port: number;
  inUse: boolean;
  pid?: number;
  processName?: string;
}

// ===== CHAT CONVERSATION TYPES =====

export interface ChatConversation {
  id: number;
  caseId: number | null;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  thinkingContent: string | null;
  timestamp: string;
  tokenCount: number | null;
}

export interface ConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

export interface CreateConversationInput {
  caseId?: number | null;
  userId: number;
  title: string;
}

export interface CreateMessageInput {
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  thinkingContent?: string | null;
  tokenCount?: number | null;
}

// ===== USER FACT TYPES =====

// User fact types (for personal information about the user)
export type UserFactType =
  | "personal"
  | "employment"
  | "financial"
  | "contact"
  | "medical"
  | "other";

export type FactImportance = "low" | "medium" | "high" | "critical";

export interface UserFact {
  id: number;
  caseId: number;
  factContent: string;
  factCategory: UserFactType;
  importance: FactImportance;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserFactInput {
  caseId: number;
  factContent: string;
  factCategory?: UserFactType;
  importance?: FactImportance;
}

export interface UpdateUserFactInput {
  factContent?: string;
  factCategory?: UserFactType;
  importance?: FactImportance;
}

// ===== AUDIT LOG TYPES =====

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  userId: number | null;
  resourceType: string;
  resourceId: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  previousLogHash: string | null;
  integrityHash: string;
  createdAt: string;
}

export interface AuditEvent {
  eventType: string;
  userId?: number;
  resourceType: string;
  resourceId: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditQueryFilters {
  startDate?: string;
  endDate?: string;
  resourceType?: string;
  resourceId?: string;
  eventType?: string;
  userId?: number;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface IntegrityReport {
  totalLogs: number;
  scannedLogs: number;
  corruptedLogs: number;
  isValid: boolean;
  errors: Array<{
    logId: string;
    expectedHash: string;
    actualHash: string;
    timestamp: string;
  }>;
}

// Legacy compatibility - simpler audit log type
export interface AuditLog {
  id: number;
  eventType: string;
  resourceType: string;
  resourceId: string;
  userId?: number;
  action: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

// ===== TYPE ALIASES FOR BACKWARD COMPATIBILITY =====

// Tag type aliases
export type Tag = TagResponse;
export type CreateTagInput = CreateTagRequest;
export type UpdateTagInput = UpdateTagRequest;

// Notification type aliases
export type UpdateNotificationPreferencesInput = UpdateNotificationPreferencesRequest;
export type CreateNotificationPreferencesInput = NotificationPreferences;

// Note types
export interface Note {
  id: number;
  caseId: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  caseId: number;
  userId: number;
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
}

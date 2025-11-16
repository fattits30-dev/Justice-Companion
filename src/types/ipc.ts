import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from "../domains/cases/entities/Case.ts";
import type {
  ChatConversation,
  ChatMessage,
  CreateConversationInput,
  CreateMessageInput,
  ConversationWithMessages,
} from "../models/ChatConversation.ts";
import type {
  UserProfile,
  UpdateUserProfileInput,
} from "../domains/settings/entities/UserProfile.ts";
import type { AIProviderType } from "./ai-providers.ts";
import type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../domains/evidence/entities/Evidence.ts";
import type { LegalContext } from "./ai.ts";
import type { CaseFact } from "../domains/cases/entities/CaseFact.ts";
import type { UserFact } from "../models/UserFact.ts";
import type { Note } from "../models/Note.ts";
import type { LegalIssue } from "../domains/legal-research/entities/LegalIssue.ts";
import type { TimelineEvent } from "../domains/timeline/entities/TimelineEvent.ts";
import type { User } from "../domains/auth/entities/User.ts";
import type {
  Consent,
  ConsentType,
} from "../domains/settings/entities/Consent.ts";
import type { PaginationParams, PaginatedResult } from "./pagination.ts";
import type { Session } from "../domains/auth/entities/Session.ts";

/**
 * IPC Channel definitions for type-safe communication
 * between Electron main and renderer processes
 */

// IPC Channels for main <-> renderer communication
export const IPC_CHANNELS = {
  // Case Management
  CASE_CREATE: "case:create",
  CASE_GET_BY_ID: "case:getById",
  CASE_GET_ALL: "case:getAll",
  CASE_UPDATE: "case:update",
  CASE_DELETE: "case:delete",
  CASE_CLOSE: "case:close",
  CASE_GET_STATISTICS: "case:getStatistics",

  // Evidence Management
  EVIDENCE_CREATE: "evidence:create",
  EVIDENCE_GET_BY_ID: "evidence:getById",
  EVIDENCE_GET_ALL: "evidence:getAll",
  EVIDENCE_GET_BY_CASE: "evidence:getByCaseId",
  EVIDENCE_UPDATE: "evidence:update",
  EVIDENCE_DELETE: "evidence:delete",

  // AI Operations
  AI_CHECK_STATUS: "ai:checkStatus",
  AI_CHAT: "ai:chat",
  AI_STREAM_START: "ai:stream:start",
  AI_STREAM_TOKEN: "ai:stream:token", // Event (main -> renderer)
  AI_STREAM_THINK_TOKEN: "ai:stream:thinkToken", // Event (main -> renderer) - <think> reasoning content
  AI_STREAM_SOURCES: "ai:stream:sources", // Event (main -> renderer) - Legal source citations
  AI_STREAM_COMPLETE: "ai:stream:complete", // Event (main -> renderer)
  AI_STREAM_ERROR: "ai:stream:error", // Event (main -> renderer)
  AI_STATUS_UPDATE: "ai:status:update", // Event (main -> renderer) - Progress updates
  AI_CONFIGURE: "ai:configure", // Configure OpenAI API credentials
  AI_TEST_CONNECTION: "ai:testConnection", // Test OpenAI connection

  // Model Download Operations
  MODEL_GET_AVAILABLE: "model:getAvailable",
  MODEL_GET_DOWNLOADED: "model:getDownloaded",
  MODEL_IS_DOWNLOADED: "model:isDownloaded",
  MODEL_DOWNLOAD_START: "model:download:start",
  MODEL_DOWNLOAD_PROGRESS: "model:download:progress", // Event (main -> renderer)
  MODEL_DELETE: "model:delete",

  // File Operations
  FILE_SELECT: "file:select",
  FILE_UPLOAD: "file:upload",
  FILE_VIEW: "file:view",
  FILE_DOWNLOAD: "file:download",
  FILE_PRINT: "file:print",
  FILE_EMAIL: "file:email",

  // Chat Conversation Operations
  CONVERSATION_CREATE: "conversation:create",
  CONVERSATION_GET: "conversation:get",
  CONVERSATION_GET_ALL: "conversation:getAll",
  CONVERSATION_GET_RECENT: "conversation:getRecent",
  CONVERSATION_LOAD_WITH_MESSAGES: "conversation:loadWithMessages",
  CONVERSATION_DELETE: "conversation:delete",
  MESSAGE_ADD: "message:add",

  // User Profile Operations
  PROFILE_GET: "profile:get",
  PROFILE_UPDATE: "profile:update",

  // GDPR Operations
  GDPR_EXPORT_USER_DATA: "gdpr:exportUserData",
  GDPR_DELETE_USER_DATA: "gdpr:deleteUserData",

  // Authentication Operations (Phase 1)
  AUTH_REGISTER: "auth:register",
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_CURRENT_USER: "auth:getCurrentUser",
  AUTH_CHANGE_PASSWORD: "auth:changePassword",

  // Consent Operations (Phase 1)
  CONSENT_GRANT: "consent:grant",
  CONSENT_REVOKE: "consent:revoke",
  CONSENT_HAS_CONSENT: "consent:hasConsent",
  CONSENT_GET_USER_CONSENTS: "consent:getUserConsents",

  // UI Error Logging
  LOG_UI_ERROR: "ui:logError",
} as const;

// IPC Request/Response types
export interface CaseCreateRequest {
  input: CreateCaseInput;
}

export interface CaseCreateResponse {
  success: true;
  data: Case;
}

export interface CaseGetByIdRequest {
  id: number;
}

export interface CaseGetByIdResponse {
  success: true;
  data: Case | null;
}

// No request parameters needed - handler takes no input
export type CaseGetAllRequest = void;

export interface CaseGetAllResponse {
  success: true;
  data: Case[];
}

export interface CaseUpdateRequest {
  id: number;
  input: UpdateCaseInput;
}

export interface CaseUpdateResponse {
  success: true;
  data: Case | null;
}

export interface CaseDeleteRequest {
  id: number;
}

export interface CaseDeleteResponse {
  success: true;
}

export interface CaseCloseRequest {
  id: number;
}

export interface CaseCloseResponse {
  success: true;
  data: Case | null;
}

// No request parameters needed - handler returns statistics
export type CaseGetStatisticsRequest = void;

export interface CaseGetStatisticsResponse {
  success: true;
  data: {
    totalCases: number;
    statusCounts: Record<CaseStatus, number>;
  };
}

// Evidence IPC Request/Response types
export interface EvidenceCreateRequest {
  input: CreateEvidenceInput;
}

export interface EvidenceCreateResponse {
  success: true;
  data: Evidence;
}

export interface EvidenceGetByIdRequest {
  id: number;
}

export interface EvidenceGetByIdResponse {
  success: true;
  data: Evidence | null;
}

export interface EvidenceGetAllRequest {
  evidenceType?: string;
}

export interface EvidenceGetAllResponse {
  success: true;
  data: Evidence[];
}

export interface EvidenceGetByCaseRequest {
  caseId: number;
}

export interface EvidenceGetByCaseResponse {
  success: true;
  data: Evidence[];
}

export interface EvidenceUpdateRequest {
  id: number;
  input: UpdateEvidenceInput;
}

export interface EvidenceUpdateResponse {
  success: true;
  data: Evidence | null;
}

export interface EvidenceDeleteRequest {
  id: number;
}

export interface EvidenceDeleteResponse {
  success: true;
}

// Error response (used when IPC handler fails)
export interface IPCErrorResponse {
  success: false;
  error: string;
}

// Union type for all responses
// Note: T is already a success response type (e.g., CaseGetAllResponse)
export type IPCResponse<T> = T | IPCErrorResponse;

// AI IPC Request/Response types
// No request parameters needed - handler checks AI service status
export type AICheckStatusRequest = void;

export interface AICheckStatusResponse {
  success: true;
  connected: boolean;
  endpoint: string;
  model?: string;
  error?: string;
}

export interface AIChatRequest {
  messages: Array<{ role: string; content: string }>;
  context?: LegalContext;
  caseId?: number;
}

export interface AIChatResponse {
  success: true;
  message: {
    role: string;
    content: string;
    timestamp: string;
  };
  sources: string[];
  tokensUsed?: number;
}

export interface AIStreamStartRequest {
  messages: Array<{ role: string; content: string }>;
  context?: LegalContext;
  caseId?: number;
}

export interface AIStreamStartResponse {
  success: true;
  streamId: string;
}

export interface AIConfigureRequest {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AIConfigureResponse {
  success: true;
}

export interface AITestConnectionRequest {
  apiKey: string;
  model?: "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";
}

export interface AITestConnectionResponse {
  success: true;
  connected: boolean;
  endpoint: string;
  model?: string;
  error?: string;
}

// Model Download IPC Request/Response types
export interface ModelInfo {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: number;
  sha256?: string;
  description: string;
  recommended: boolean;
}

export interface DownloadProgress {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  status: "downloading" | "complete" | "error" | "paused";
  error?: string;
}

// No request parameters needed - handler returns available models
export type ModelGetAvailableRequest = void;

export interface ModelGetAvailableResponse {
  success: true;
  models: ModelInfo[];
}

// No request parameters needed - handler returns downloaded models
export type ModelGetDownloadedRequest = void;

export interface ModelGetDownloadedResponse {
  success: true;
  models: ModelInfo[];
}

export interface ModelIsDownloadedRequest {
  modelId: string;
}

export interface ModelIsDownloadedResponse {
  success: true;
  downloaded: boolean;
  path?: string;
}

export interface ModelDownloadStartRequest {
  modelId: string;
}

export interface ModelDownloadStartResponse {
  success: true;
  modelId: string;
}

export interface ModelDeleteRequest {
  modelId: string;
}

export interface ModelDeleteResponse {
  success: true;
  deleted: boolean;
}

// File IPC Request/Response types
export interface FileSelectRequest {
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<"openFile" | "multiSelections">;
}

export interface FileSelectResponse {
  success: true;
  filePaths: string[];
  canceled: boolean;
}

export interface FileUploadRequest {
  filePath: string;
}

export interface FileUploadResponse {
  success: true;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  error?: string;
}

export interface FileViewRequest {
  filePath: string;
}

export interface FileViewResponse {
  success: true;
}

export interface FileDownloadRequest {
  filePath: string;
  fileName?: string;
}

export interface FileDownloadResponse {
  success: true;
  savedPath: string;
}

export interface FilePrintRequest {
  filePath: string;
}

export interface FilePrintResponse {
  success: true;
}

export interface FileEmailRequest {
  filePaths: string[];
  subject?: string;
  body?: string;
}

export interface FileEmailResponse {
  success: true;
}

// Chat Conversation IPC Request/Response types
export interface ConversationCreateRequest {
  input: CreateConversationInput;
}

export interface ConversationCreateResponse {
  success: true;
  data: ChatConversation;
}

export interface ConversationGetRequest {
  id: number;
}

export interface ConversationGetResponse {
  success: true;
  data: ChatConversation | null;
}

export interface ConversationGetAllRequest {
  caseId?: number | null; // Filter by case, or undefined for all
}

export interface ConversationGetAllResponse {
  success: true;
  data: ChatConversation[];
}

export interface ConversationGetRecentRequest {
  caseId: number | null;
  limit?: number;
}

export interface ConversationGetRecentResponse {
  success: true;
  data: ChatConversation[];
}

export interface ConversationLoadWithMessagesRequest {
  conversationId: number;
}

export interface ConversationLoadWithMessagesResponse {
  success: true;
  data: ConversationWithMessages | null;
}

export interface ConversationDeleteRequest {
  id: number;
}

export interface ConversationDeleteResponse {
  success: true;
}

export interface MessageAddRequest {
  input: CreateMessageInput;
}

export interface MessageAddResponse {
  success: true;
  data: ChatConversation; // Return updated conversation
}

// User Profile IPC Request/Response types
// No request parameters needed - handler returns current user's profile
export type ProfileGetRequest = void;

export interface ProfileGetResponse {
  success: true;
  data: UserProfile;
}

export interface ProfileUpdateRequest {
  input: UpdateUserProfileInput;
}

export interface ProfileUpdateResponse {
  success: true;
  data: UserProfile;
}

// Authentication IPC Request/Response types (Phase 1)
export interface AuthRegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface AuthRegisterResponse {
  success: true;
  data: User;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean; // Optional flag for extended session duration (30 days)
}

export interface AuthLoginResponse {
  success: true;
  data: {
    user: User;
    session: Session;
  };
}

// No request parameters needed - logout uses current session
export type AuthLogoutRequest = void;

export interface AuthLogoutResponse {
  success: true;
}

// No request parameters needed - returns current authenticated user
export type AuthGetCurrentUserRequest = void;

export interface AuthGetCurrentUserResponse {
  success: true;
  data: User | null;
}

export interface AuthChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AuthChangePasswordResponse {
  success: true;
}

// Consent IPC Request/Response types (Phase 1)
export interface ConsentGrantRequest {
  consentType: ConsentType;
}

export interface ConsentGrantResponse {
  success: true;
  data: Consent;
}

export interface ConsentRevokeRequest {
  consentType: ConsentType;
}

export interface ConsentRevokeResponse {
  success: true;
}

export interface ConsentHasConsentRequest {
  consentType: ConsentType;
}

export interface ConsentHasConsentResponse {
  success: true;
  data: boolean;
}

// No request parameters needed - returns all consents for current user
export type ConsentGetUserConsentsRequest = void;

export interface ConsentGetUserConsentsResponse {
  success: true;
  data: Consent[];
}

// GDPR IPC Request/Response types
// No request parameters needed - handler exports all user data
export type GDPRExportUserDataRequest = void;

export interface GDPRExportData {
  cases: Case[];
  evidence: Evidence[];
  notes: Note[];
  legalIssues: LegalIssue[];
  timelineEvents: TimelineEvent[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  userFacts: UserFact[];
  caseFacts: CaseFact[];
}

export interface GDPRExportUserDataResponse {
  success: true;
  exportPath?: string; // Optional: path where data was saved to disk
  exportDate: string;
  data?: GDPRExportData; // Optional: the actual export data (for in-memory download)
  summary: {
    casesCount: number;
    evidenceCount: number;
    notesCount: number;
    legalIssuesCount: number;
    timelineEventsCount: number;
    conversationsCount: number;
    messagesCount: number;
    userFactsCount: number;
    caseFactsCount: number;
  };
}

export interface GDPRDeleteUserDataRequest {
  confirmation: string; // Must be "DELETE_ALL_MY_DATA" for safety
}

export interface GDPRDeleteUserDataResponse {
  success: true;
  deletedAt: string;
  summary: {
    casesDeleted: number;
    evidenceDeleted: number;
    notesDeleted: number;
    legalIssuesDeleted: number;
    timelineEventsDeleted: number;
    conversationsDeleted: number;
    messagesDeleted: number;
    userFactsDeleted: number;
    caseFactsDeleted: number;
    auditLogsDeleted: number;
  };
}

// UI Error Logging types
export interface UIErrorData {
  error: string;
  errorInfo: string;
  componentStack: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

export interface LogUIErrorRequest {
  errorData: UIErrorData;
}

export interface LogUIErrorResponse {
  success: true;
  logged: boolean;
}

// Facts Response types
export interface FactsStoreResponse {
  success: true;
  data: CaseFact;
}

export interface FactsGetResponse {
  success: true;
  data: CaseFact[];
}

export interface FactsCountResponse {
  success: true;
  data: { data: number };
}

/**
 * Type-safe IPC API exposed to renderer process
 */
export interface JusticeCompanionAPI {
  // Case operations
  createCase(input: CreateCaseInput): Promise<IPCResponse<CaseCreateResponse>>;
  getCaseById(id: number): Promise<IPCResponse<CaseGetByIdResponse>>;
  getAllCases(): Promise<IPCResponse<CaseGetAllResponse>>;
  updateCase(
    id: number,
    input: UpdateCaseInput,
  ): Promise<IPCResponse<CaseUpdateResponse>>;
  deleteCase(id: number): Promise<IPCResponse<CaseDeleteResponse>>;
  closeCase(id: number): Promise<IPCResponse<CaseCloseResponse>>;
  getCaseStatistics(): Promise<IPCResponse<CaseGetStatisticsResponse>>;

  // Case pagination operations (Phase 2 - Performance Optimization)
  getAllCasesPaginated(
    params: PaginationParams,
  ): Promise<IPCResponse<{ success: true; data: PaginatedResult<Case> }>>;
  getCasesByUserPaginated(
    userId: number,
    params: PaginationParams,
  ): Promise<IPCResponse<{ success: true; data: PaginatedResult<Case> }>>;
  getCasesByStatusPaginated(
    status: CaseStatus,
    params: PaginationParams,
  ): Promise<IPCResponse<{ success: true; data: PaginatedResult<Case> }>>;

  // AI operations
  checkAIStatus(): Promise<IPCResponse<AICheckStatusResponse>>;
  aiChat(request: AIChatRequest): Promise<IPCResponse<AIChatResponse>>;
  aiStreamStart(
    request: AIStreamStartRequest,
  ): Promise<IPCResponse<AIStreamStartResponse>>;
  configureAI(
    request: AIConfigureRequest,
  ): Promise<IPCResponse<AIConfigureResponse>>;
  testAIConnection(
    request: AITestConnectionRequest,
  ): Promise<IPCResponse<AITestConnectionResponse>>;
  // AI streaming events (one-way: main -> renderer)
  // Returns cleanup function to remove listener
  onAIStreamToken(callback: (token: string) => void): () => void;
  onAIStreamThinkToken(callback: (token: string) => void): () => void;
  onAIStreamSources(callback: (sources: string[]) => void): () => void;
  onAIStreamComplete(callback: () => void): () => void;
  onAIStreamError(callback: (error: string) => void): () => void;
  onAIStatusUpdate(callback: (status: string) => void): () => void;

  // Evidence operations
  createEvidence(
    input: CreateEvidenceInput,
  ): Promise<IPCResponse<EvidenceCreateResponse>>;
  getEvidenceById(id: number): Promise<IPCResponse<EvidenceGetByIdResponse>>;
  getAllEvidence(
    evidenceType?: string,
  ): Promise<IPCResponse<EvidenceGetAllResponse>>;
  getEvidenceByCaseId(
    caseId: number,
  ): Promise<IPCResponse<EvidenceGetByCaseResponse>>;
  updateEvidence(
    id: number,
    input: UpdateEvidenceInput,
  ): Promise<IPCResponse<EvidenceUpdateResponse>>;
  deleteEvidence(id: number): Promise<IPCResponse<EvidenceDeleteResponse>>;

  // File operations
  selectFile(
    request?: FileSelectRequest,
  ): Promise<IPCResponse<FileSelectResponse>>;
  uploadFile(filePath: string): Promise<IPCResponse<FileUploadResponse>>;
  viewFile(filePath: string): Promise<IPCResponse<FileViewResponse>>;
  downloadFile(
    filePath: string,
    fileName?: string,
  ): Promise<IPCResponse<FileDownloadResponse>>;
  printFile(filePath: string): Promise<IPCResponse<FilePrintResponse>>;
  emailFiles(
    filePaths: string[],
    subject?: string,
    body?: string,
  ): Promise<IPCResponse<FileEmailResponse>>;

  // Chat Conversation operations
  createConversation(
    input: CreateConversationInput,
  ): Promise<IPCResponse<ConversationCreateResponse>>;
  getConversation(id: number): Promise<IPCResponse<ConversationGetResponse>>;
  getAllConversations(
    caseId?: number | null,
  ): Promise<IPCResponse<ConversationGetAllResponse>>;
  getRecentConversations(
    caseId: number | null,
    limit?: number,
  ): Promise<IPCResponse<ConversationGetRecentResponse>>;
  loadConversationWithMessages(
    conversationId: number,
  ): Promise<IPCResponse<ConversationLoadWithMessagesResponse>>;
  deleteConversation(
    id: number,
  ): Promise<IPCResponse<ConversationDeleteResponse>>;
  addMessage(
    input: CreateMessageInput,
  ): Promise<IPCResponse<MessageAddResponse>>;

  // User Profile operations
  getUserProfile(): Promise<IPCResponse<ProfileGetResponse>>;
  updateUserProfile(
    input: UpdateUserProfileInput,
  ): Promise<IPCResponse<ProfileUpdateResponse>>;

  // Case Facts operations (Memory for AI)
  storeFact(params: {
    caseId: number;
    factContent?: string;
    factCategory?: string;
    importance?: string;
    factType?: string;
    factKey?: string;
    factValue?: string;
    source?: string;
    confidence?: number;
  }): Promise<IPCResponse<FactsStoreResponse>>;
  getFacts(
    caseId: number,
    factType?: string,
  ): Promise<IPCResponse<FactsGetResponse>>;
  getCaseFacts(
    caseId: number,
    factCategory?: string,
  ): Promise<IPCResponse<FactsGetResponse>>;
  getFactCount(caseId: number): Promise<IPCResponse<FactsCountResponse>>;

  // GDPR operations
  exportUserData(): Promise<IPCResponse<GDPRExportUserDataResponse>>;
  deleteUserData(
    confirmation: string,
  ): Promise<IPCResponse<GDPRDeleteUserDataResponse>>;

  // Authentication operations (Phase 1)
  registerUser(
    username: string,
    password: string,
    email: string,
  ): Promise<IPCResponse<AuthRegisterResponse>>;
  loginUser(
    username: string,
    password: string,
    rememberMe?: boolean,
  ): Promise<IPCResponse<AuthLoginResponse>>;
  logoutUser(): Promise<IPCResponse<AuthLogoutResponse>>;
  getCurrentUser(): Promise<IPCResponse<AuthGetCurrentUserResponse>>;
  changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<IPCResponse<AuthChangePasswordResponse>>;

  // Consent operations (Phase 1)
  grantConsent(
    consentType: ConsentType,
  ): Promise<IPCResponse<ConsentGrantResponse>>;
  revokeConsent(
    consentType: ConsentType,
  ): Promise<IPCResponse<ConsentRevokeResponse>>;
  hasConsent(
    consentType: ConsentType,
  ): Promise<IPCResponse<ConsentHasConsentResponse>>;
  getUserConsents(): Promise<IPCResponse<ConsentGetUserConsentsResponse>>;

  // UI Error Logging
  logUIError(errorData: UIErrorData): Promise<IPCResponse<LogUIErrorResponse>>;

  // Secure Storage operations (for API keys)
  secureStorage: {
    isEncryptionAvailable(): Promise<boolean>;
    set(key: string, value: string): Promise<{ success: boolean }>;
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<{ success: boolean }>;
    clearAll(): Promise<{ success: boolean }>;
  };
}

// NOTE: Window interface extended in src/types/window.d.ts
// That file has the ACTUAL signatures that match electron/preload.ts
// This JusticeCompanionAPI interface is for future "modern" API design

import type { Case, CreateCaseInput, UpdateCaseInput } from '../models/Case';
import type { CaseStatus } from '../models/Case';
import type {
  ChatConversation,
  CreateConversationInput,
  CreateMessageInput,
  ConversationWithMessages,
} from '../models/ChatConversation';
import type { UserProfile, UpdateUserProfileInput } from '../models/UserProfile';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '../models/Evidence';

/**
 * IPC Channel definitions for type-safe communication
 * between Electron main and renderer processes
 */

// IPC Channels for main <-> renderer communication
export const IPC_CHANNELS = {
  // Case Management
  CASE_CREATE: 'case:create',
  CASE_GET_BY_ID: 'case:getById',
  CASE_GET_ALL: 'case:getAll',
  CASE_UPDATE: 'case:update',
  CASE_DELETE: 'case:delete',
  CASE_CLOSE: 'case:close',
  CASE_GET_STATISTICS: 'case:getStatistics',

  // Evidence Management
  EVIDENCE_CREATE: 'evidence:create',
  EVIDENCE_GET_BY_ID: 'evidence:getById',
  EVIDENCE_GET_ALL: 'evidence:getAll',
  EVIDENCE_GET_BY_CASE: 'evidence:getByCaseId',
  EVIDENCE_UPDATE: 'evidence:update',
  EVIDENCE_DELETE: 'evidence:delete',

  // AI Operations
  AI_CHECK_STATUS: 'ai:checkStatus',
  AI_CHAT: 'ai:chat',
  AI_STREAM_START: 'ai:stream:start',
  AI_STREAM_TOKEN: 'ai:stream:token', // Event (main -> renderer)
  AI_STREAM_THINK_TOKEN: 'ai:stream:thinkToken', // Event (main -> renderer) - <think> reasoning content
  AI_STREAM_SOURCES: 'ai:stream:sources', // Event (main -> renderer) - Legal source citations
  AI_STREAM_COMPLETE: 'ai:stream:complete', // Event (main -> renderer)
  AI_STREAM_ERROR: 'ai:stream:error', // Event (main -> renderer)
  AI_STATUS_UPDATE: 'ai:status:update', // Event (main -> renderer) - Progress updates

  // Model Download Operations
  MODEL_GET_AVAILABLE: 'model:getAvailable',
  MODEL_GET_DOWNLOADED: 'model:getDownloaded',
  MODEL_IS_DOWNLOADED: 'model:isDownloaded',
  MODEL_DOWNLOAD_START: 'model:download:start',
  MODEL_DOWNLOAD_PROGRESS: 'model:download:progress', // Event (main -> renderer)
  MODEL_DELETE: 'model:delete',

  // File Operations
  FILE_SELECT: 'file:select',
  FILE_UPLOAD: 'file:upload',
  FILE_VIEW: 'file:view',
  FILE_DOWNLOAD: 'file:download',
  FILE_PRINT: 'file:print',
  FILE_EMAIL: 'file:email',

  // Chat Conversation Operations
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_GET: 'conversation:get',
  CONVERSATION_GET_ALL: 'conversation:getAll',
  CONVERSATION_GET_RECENT: 'conversation:getRecent',
  CONVERSATION_LOAD_WITH_MESSAGES: 'conversation:loadWithMessages',
  CONVERSATION_DELETE: 'conversation:delete',
  MESSAGE_ADD: 'message:add',

  // User Profile Operations
  PROFILE_GET: 'profile:get',
  PROFILE_UPDATE: 'profile:update',

  // GDPR Operations
  GDPR_EXPORT_USER_DATA: 'gdpr:exportUserData',
  GDPR_DELETE_USER_DATA: 'gdpr:deleteUserData',
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

export interface CaseGetAllRequest {
  // Future: add pagination, filtering
}

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

export interface CaseGetStatisticsRequest {
  // Empty for now
}

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
export type IPCResponse<T> = T | IPCErrorResponse;

// AI IPC Request/Response types
export interface AICheckStatusRequest {
  // Empty - just checks connection
}

export interface AICheckStatusResponse {
  success: true;
  connected: boolean;
  endpoint: string;
  model?: string;
  error?: string;
}

export interface AIChatRequest {
  messages: Array<{ role: string; content: string }>;
  context?: any; // LegalContext (avoiding circular import)
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
  context?: any; // LegalContext
  caseId?: number;
}

export interface AIStreamStartResponse {
  success: true;
  streamId: string;
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
  status: 'downloading' | 'complete' | 'error' | 'paused';
  error?: string;
}

export interface ModelGetAvailableRequest {
  // Empty - just returns catalog
}

export interface ModelGetAvailableResponse {
  success: true;
  models: ModelInfo[];
}

export interface ModelGetDownloadedRequest {
  // Empty - returns downloaded models
}

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
  properties?: Array<'openFile' | 'multiSelections'>;
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
export interface ProfileGetRequest {
  // Empty
}

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

// GDPR IPC Request/Response types
export interface GDPRExportUserDataRequest {
  // Empty - exports all user data
}

export interface GDPRExportUserDataResponse {
  success: true;
  exportPath: string;
  exportDate: string;
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
    input: UpdateCaseInput
  ): Promise<IPCResponse<CaseUpdateResponse>>;
  deleteCase(id: number): Promise<IPCResponse<CaseDeleteResponse>>;
  closeCase(id: number): Promise<IPCResponse<CaseCloseResponse>>;
  getCaseStatistics(): Promise<IPCResponse<CaseGetStatisticsResponse>>;

  // AI operations
  checkAIStatus(): Promise<IPCResponse<AICheckStatusResponse>>;
  aiChat(request: AIChatRequest): Promise<IPCResponse<AIChatResponse>>;
  aiStreamStart(request: AIStreamStartRequest): Promise<IPCResponse<AIStreamStartResponse>>;
  // AI streaming events (one-way: main -> renderer)
  // Returns cleanup function to remove listener
  onAIStreamToken(callback: (token: string) => void): () => void;
  onAIStreamThinkToken(callback: (token: string) => void): () => void;
  onAIStreamSources(callback: (sources: string[]) => void): () => void;
  onAIStreamComplete(callback: () => void): () => void;
  onAIStreamError(callback: (error: string) => void): () => void;
  onAIStatusUpdate(callback: (status: string) => void): () => void;

  // Evidence operations
  createEvidence(input: CreateEvidenceInput): Promise<IPCResponse<EvidenceCreateResponse>>;
  getEvidenceById(id: number): Promise<IPCResponse<EvidenceGetByIdResponse>>;
  getAllEvidence(evidenceType?: string): Promise<IPCResponse<EvidenceGetAllResponse>>;
  getEvidenceByCaseId(caseId: number): Promise<IPCResponse<EvidenceGetByCaseResponse>>;
  updateEvidence(
    id: number,
    input: UpdateEvidenceInput
  ): Promise<IPCResponse<EvidenceUpdateResponse>>;
  deleteEvidence(id: number): Promise<IPCResponse<EvidenceDeleteResponse>>;

  // File operations
  selectFile(request?: FileSelectRequest): Promise<IPCResponse<FileSelectResponse>>;
  uploadFile(filePath: string): Promise<IPCResponse<FileUploadResponse>>;
  viewFile(filePath: string): Promise<IPCResponse<FileViewResponse>>;
  downloadFile(filePath: string, fileName?: string): Promise<IPCResponse<FileDownloadResponse>>;
  printFile(filePath: string): Promise<IPCResponse<FilePrintResponse>>;
  emailFiles(filePaths: string[], subject?: string, body?: string): Promise<IPCResponse<FileEmailResponse>>;

  // Chat Conversation operations
  createConversation(input: CreateConversationInput): Promise<IPCResponse<ConversationCreateResponse>>;
  getConversation(id: number): Promise<IPCResponse<ConversationGetResponse>>;
  getAllConversations(caseId?: number | null): Promise<IPCResponse<ConversationGetAllResponse>>;
  getRecentConversations(caseId: number | null, limit?: number): Promise<IPCResponse<ConversationGetRecentResponse>>;
  loadConversationWithMessages(conversationId: number): Promise<IPCResponse<ConversationLoadWithMessagesResponse>>;
  deleteConversation(id: number): Promise<IPCResponse<ConversationDeleteResponse>>;
  addMessage(input: CreateMessageInput): Promise<IPCResponse<MessageAddResponse>>;

  // User Profile operations
  getUserProfile(): Promise<IPCResponse<ProfileGetResponse>>;
  updateUserProfile(input: UpdateUserProfileInput): Promise<IPCResponse<ProfileUpdateResponse>>;

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
  }): Promise<IPCResponse<any>>;
  getFacts(caseId: number, factType?: string): Promise<IPCResponse<any>>;
  getCaseFacts(caseId: number, factCategory?: string): Promise<IPCResponse<any>>;
  getFactCount(caseId: number): Promise<IPCResponse<{ data: number }>>;

  // GDPR operations
  exportUserData(): Promise<IPCResponse<GDPRExportUserDataResponse>>;
  deleteUserData(confirmation: string): Promise<IPCResponse<GDPRDeleteUserDataResponse>>;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    justiceAPI: JusticeCompanionAPI;
  }
}

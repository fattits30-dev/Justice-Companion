import type { Case, CreateCaseInput, UpdateCaseInput } from '../models/Case';
import type { CaseStatus } from '../models/Case';

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

  // AI Operations
  AI_CHECK_STATUS: 'ai:checkStatus',
  AI_CHAT: 'ai:chat',
  AI_STREAM_START: 'ai:stream:start',
  AI_STREAM_TOKEN: 'ai:stream:token', // Event (main -> renderer)
  AI_STREAM_COMPLETE: 'ai:stream:complete', // Event (main -> renderer)
  AI_STREAM_ERROR: 'ai:stream:error', // Event (main -> renderer)
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
  onAIStreamComplete(callback: () => void): () => void;
  onAIStreamError(callback: (error: string) => void): () => void;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    justiceAPI: JusticeCompanionAPI;
  }
}

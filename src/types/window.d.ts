import type { User } from '../models/User.ts';
import type { Session } from '../models/Session.ts';
import type { IPCResponse } from './ipc.ts';
import type {
  CaseGetAllResponse,
  CaseCreateResponse,
  CaseGetByIdResponse,
  CaseUpdateResponse,
  CaseDeleteResponse,
  CaseCloseResponse,
  AuthLoginResponse,
  AuthRegisterResponse,
  AuthLogoutResponse,
  AuthGetCurrentUserResponse,
  ConsentGrantResponse,
  ConsentHasConsentResponse,
  ConsentGetUserConsentsResponse,
  GDPRExportUserDataResponse,
} from './ipc.ts';

/**
 * TypeScript definitions for Electron preload APIs exposed via contextBridge
 *
 * CRITICAL: These types MUST match electron/preload.ts exactly
 *
 * Two APIs are exposed:
 * 1. window.electron - Modern nested API (future use)
 * 2. window.justiceAPI - Legacy flat API (current frontend uses this)
 */

/**
 * Modern nested API structure
 * Future frontend code should use this
 */
export interface ElectronAPI {
  auth: {
    register: (data: {
      username: string;
      email: string;
      password: string;
    }) => Promise<{ success: boolean; data?: User; error?: string }>;
    login: (data: {
      username: string;
      password: string;
      rememberMe?: boolean;
    }) => Promise<{
      success: boolean;
      data?: { user: User; session: Session };
      error?: string;
    }>;
    logout: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
    getSession: (sessionId: string) => Promise<{
      success: boolean;
      data?: { userId: string; username: string; email: string };
      error?: string;
    }>;
  };

  cases: {
    create: (data: {
      title: string;
      type: string;
      status: string;
      description?: string;
    }) => Promise<{ success: boolean; data?: any; error?: string }>;
    list: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    update: (id: string, data: {
      title?: string;
      status?: string;
      description?: string;
    }) => Promise<{ success: boolean; data?: any; error?: string }>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
  };

  evidence: {
    upload: (caseId: string, file: File) => Promise<{ success: boolean; data?: any; error?: string }>;
    list: (caseId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
  };

  chat: {
    send: (message: string, caseId?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    onStream: (callback: (event: any, data: string) => void) => void;
    offStream: () => void;
  };

  db: {
    migrate: () => Promise<{
      success: boolean;
      data?: { appliedMigrations: number; currentVersion: number };
      error?: string;
    }>;
    backup: () => Promise<{
      success: boolean;
      data?: { backupPath: string };
      error?: string;
    }>;
    status: () => Promise<{
      success: boolean;
      data?: { currentVersion: number; latestVersion: number; pendingMigrations: number };
      error?: string;
    }>;
  };

  gdpr: {
    export: (sessionId: string, options?: { format?: 'json' | 'csv' }) => Promise<{
      success: boolean;
      data?: {
        filePath?: string;
        totalRecords: number;
        exportDate: string;
        format: 'json' | 'csv';
      };
      error?: string;
    }>;
    delete: (sessionId: string, options?: {
      confirmed: boolean;
      exportBeforeDelete?: boolean;
      reason?: string;
    }) => Promise<{
      success: boolean;
      data?: {
        success: boolean;
        deletedCounts: Record<string, number>;
        preservedAuditLogs: number;
        preservedConsents: number;
        deletionDate: string;
        exportPath?: string;
      };
      error?: string;
    }>;
  };
}

/**
 * Legacy flat API structure
 * CURRENT FRONTEND CODE USES THIS
 *
 * CRITICAL: All methods require sessionId parameter
 */
export interface JusticeAPI {
  // ===== AUTHENTICATION =====
  loginUser: (username: string, password: string, rememberMe?: boolean) => Promise<IPCResponse<AuthLoginResponse>>;

  registerUser: (username: string, password: string, email: string) => Promise<IPCResponse<AuthRegisterResponse>>;

  logoutUser: (sessionId: string) => Promise<IPCResponse<AuthLogoutResponse>>;

  getCurrentUser: (sessionId: string) => Promise<IPCResponse<AuthGetCurrentUserResponse>>;

  // ===== CASE MANAGEMENT =====
  createCase: (data: any, sessionId: string) => Promise<IPCResponse<CaseCreateResponse>>;

  getAllCases: () => Promise<IPCResponse<CaseGetAllResponse>>;

  getAllCasesPaginated: (sessionId: string, page: number, pageSize: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  getCaseById: (id: string, sessionId: string) => Promise<IPCResponse<CaseGetByIdResponse>>;

  updateCase: (id: string, data: any, sessionId: string) => Promise<IPCResponse<CaseUpdateResponse>>;

  deleteCase: (id: number) => Promise<IPCResponse<CaseDeleteResponse>>;

  closeCase: (id: string, sessionId: string) => Promise<IPCResponse<CaseCloseResponse>>;

  // ===== EVIDENCE/DOCUMENTS =====
  // File validation (returns file metadata without storing)
  uploadFile: (filePath: string) => Promise<{ success: boolean; fileName?: string; fileSize?: number; extractedText?: string; error?: string }>;

  // Actual file upload with case association
  uploadFileToCase: (caseId: string, file: File, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  createEvidence: (input: any, sessionId: string) => Promise<IPCResponse<{ success: true; data: any }>>;

  getEvidenceById: (id: number, sessionId: string) => Promise<IPCResponse<{ success: true; data: any | null }>>;

  getAllEvidence: (evidenceType: string | undefined, sessionId: string) => Promise<IPCResponse<{ success: true; data: any[] }>>;

  getEvidenceByCaseId: (caseId: number, sessionId: string) => Promise<IPCResponse<{ success: true; data: any[] }>>;

  updateEvidence: (id: number, input: any, sessionId: string) => Promise<IPCResponse<{ success: true; data: any | null }>>;

  deleteEvidence: (id: number, sessionId: string) => Promise<IPCResponse<{ success: true }>>;

  // ===== AI CHAT =====
  createConversation: (message: string, caseId: string | undefined, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  // Event listeners return cleanup functions
  onAIStreamToken: (callback: (event: any, data: string) => void) => () => void;
  onAIStreamThinkToken: (callback: (event: any, data: string) => void) => () => void;
  onAIStreamSources: (callback: (event: any, data: any) => void) => () => void;
  onAIStatusUpdate: (callback: (event: any, data: any) => void) => () => void;
  onAIStreamComplete: (callback: (event: any, data: string) => void) => () => void;
  onAIStreamError: (callback: (event: any, data: string) => void) => () => void;

  // AI status and config
  checkAIStatus: () => Promise<IPCResponse<{ success: true; connected: boolean; endpoint: string; model?: string; error?: string }>>;
  configureAI: (config: any) => Promise<{ success: boolean; error?: string }>;
  testAIConnection: (request: { apiKey: string; model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' }) => Promise<{ success: boolean; connected?: boolean; endpoint?: string; model?: string; error?: string }>;
  aiStreamStart: (params: { messages: any[]; caseId?: number }) => Promise<IPCResponse<{ success: true; streamId: string }>>;

  // ===== GDPR =====
  exportUserData: () => Promise<IPCResponse<GDPRExportUserDataResponse>>;

  // ===== CONSENT MANAGEMENT =====
  // Moved to newer definitions below (lines 245-248) without sessionId
  hasConsent: (consentType: string, sessionId: string) => Promise<IPCResponse<ConsentHasConsentResponse>>;

  // ===== UI ERROR LOGGING =====
  logUIError: (errorData: {
    error: string;
    errorInfo: string;
    componentStack: string;
    timestamp: string;
    url?: string;
    userAgent?: string;
  }) => Promise<{
    success: boolean;
    logged?: boolean;
    error?: string;
  }>;

  // ===== FILE OPERATIONS (Placeholder) =====
  viewFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  downloadFile: (filePath: string, fileName: string) => Promise<{ success: boolean; savedPath?: string; error?: string }>;
  printFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  emailFiles: (filePaths: string[], subject: string, body: string) => Promise<{ success: boolean; error?: string }>;
  selectFile: (options?: { filters?: any[]; properties?: string[] }) => Promise<{ success: boolean; canceled?: boolean; filePaths?: string[]; error?: string }>;

  // User Profile operations
  getUserProfile: () => Promise<{ success: boolean; data?: { id: number; name: string; email: string | null; avatarUrl: string | null; createdAt: string; updatedAt: string }; error?: string }>;
  updateUserProfile: (input: { name?: string; email?: string | null; avatarUrl?: string | null }) => Promise<{ success: boolean; data?: { id: number; name: string; email: string | null; avatarUrl: string | null; createdAt: string; updatedAt: string }; error?: string }>;

  // Password change
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Conversation operations
  getAllConversations: (caseId?: number | null) => Promise<{ success: boolean; data?: Array<{ id: number; title?: string; caseId?: number; createdAt?: string }>; error?: string }>;
  deleteConversation: (id: number) => Promise<{ success: boolean; error?: string }>;

  // Consent operations
  grantConsent: (consentType: 'data_processing' | 'encryption' | 'ai_processing' | 'marketing') => Promise<{ success: boolean; data?: { id: number; userId: number; consentType: string; granted: boolean; grantedAt?: string }; error?: string }>;
  revokeConsent: (consentType: 'data_processing' | 'encryption' | 'ai_processing' | 'marketing') => Promise<{ success: boolean; error?: string }>;
  getUserConsents: () => Promise<{ success: boolean; data?: Array<{ id: number; userId: number; consentType: string; granted: boolean; grantedAt?: string }>; error?: string }>;

  // ===== REMAINING PLACEHOLDER METHODS =====
  // These will be implemented as corresponding IPC handlers are created
  getCaseFacts: () => Promise<never>;
  getCasesByStatusPaginated: () => Promise<never>;
  getCasesByUserPaginated: () => Promise<never>;
  getCaseStatistics: () => Promise<never>;
  getFacts: () => Promise<never>;
  getRecentConversations: () => Promise<never>;

  // Secure Storage API (for storing API keys securely)
  secureStorage: {
    isEncryptionAvailable: () => Promise<boolean>;
    set: (key: string, value: string) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
    clearAll: () => Promise<void>;
  };

  storeFact: () => Promise<never>;
}

/**
 * Extend Window interface
 */
declare global {
  interface Window {
    electron: ElectronAPI;  // Modern nested API (future)
    justiceAPI: JusticeAPI; // Legacy flat API (current)
  }
}

export {};

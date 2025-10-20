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
    }) => Promise<{
      success: boolean;
      data?: { userId: string; sessionId: string; username: string };
      error?: string;
    }>;
    login: (data: {
      username: string;
      password: string;
      rememberMe?: boolean;
    }) => Promise<{
      success: boolean;
      data?: { userId: string; sessionId: string; username: string };
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
  loginUser: (username: string, password: string, rememberMe?: boolean) => Promise<{
    success: boolean;
    data?: { userId: string; sessionId: string; username: string };
    error?: string;
  }>;

  registerUser: (username: string, password: string, email: string) => Promise<{
    success: boolean;
    data?: { userId: string; sessionId: string; username: string };
    error?: string;
  }>;

  logoutUser: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  getCurrentUser: (sessionId: string) => Promise<{
    success: boolean;
    data?: { userId: string; username: string; email: string };
    error?: string;
  }>;

  // ===== CASE MANAGEMENT =====
  createCase: (data: any, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  getAllCases: (sessionId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  getAllCasesPaginated: (sessionId: string, page: number, pageSize: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  getCaseById: (id: string, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  updateCase: (id: string, data: any, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  deleteCase: (id: string, sessionId: string) => Promise<{ success: boolean; error?: string }>;

  closeCase: (id: string, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  // ===== EVIDENCE/DOCUMENTS =====
  uploadFile: (caseId: string, file: File, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  getAllEvidence: (caseId: string, sessionId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  getEvidenceByCaseId: (caseId: string, sessionId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  deleteEvidence: (id: string, sessionId: string) => Promise<{ success: boolean; error?: string }>;

  // ===== AI CHAT =====
  createConversation: (message: string, caseId: string | undefined, sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  onAIStreamToken: (callback: (event: any, data: string) => void) => void;
  onAIStreamComplete: (callback: (event: any, data: string) => void) => void;
  onAIStreamError: (callback: (event: any, data: string) => void) => void;

  // ===== GDPR =====
  exportUserData: (sessionId: string, options?: any) => Promise<{
    success: boolean;
    data?: {
      filePath?: string;
      totalRecords: number;
      exportDate: string;
      format: 'json' | 'csv';
    };
    error?: string;
  }>;

  // ===== PLACEHOLDER METHODS =====
  // These will be implemented as corresponding IPC handlers are created
  changePassword: () => Promise<never>;
  checkAIStatus: () => Promise<never>;
  configureAI: () => Promise<never>;
  createEvidence: () => Promise<never>;
  deleteConversation: () => Promise<never>;
  downloadFile: () => Promise<never>;
  getAllConversations: () => Promise<never>;
  getCaseFacts: () => Promise<never>;
  getCasesByStatusPaginated: () => Promise<never>;
  getCasesByUserPaginated: () => Promise<never>;
  getCaseStatistics: () => Promise<never>;
  getEvidenceById: () => Promise<never>;
  getFacts: () => Promise<never>;
  getRecentConversations: () => Promise<never>;
  getUserConsents: () => Promise<never>;
  getUserProfile: () => Promise<never>;
  grantConsent: () => Promise<never>;
  hasConsent: () => Promise<never>;
  onAIStatusUpdate: () => Promise<never>;
  onAIStreamSources: () => Promise<never>;
  onAIStreamThinkToken: () => Promise<never>;
  printFile: () => Promise<never>;
  revokeConsent: () => Promise<never>;
  secureStorage: () => Promise<never>;
  selectFile: () => Promise<never>;
  storeFact: () => Promise<never>;
  testAIConnection: () => Promise<never>;
  updateEvidence: () => Promise<never>;
  updateUserProfile: () => Promise<never>;
  viewFile: () => Promise<never>;
  aiStreamStart: () => Promise<never>;
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

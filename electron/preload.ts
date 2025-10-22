// CommonJS require for Electron preload (sandboxed context doesn't support ESM)
const { contextBridge, ipcRenderer } = require('electron');

// Type imports removed - using inline types to avoid ESM in sandboxed context
// IpcRendererEvent type will be inferred or use 'any'

/**
 * Electron API exposed to renderer process via contextBridge
 *
 * SECURITY: This is the ONLY way renderer can communicate with main process
 * - contextIsolation: true (enforced in main.ts)
 * - No direct Node.js API access in renderer
 * - Type-safe IPC invocations
 */

// Type definitions for exposed API (not exported - preload can't use ESM export)
interface ElectronAPI {
  auth: {
    register: (data: RegisterData) => Promise<AuthResponse>;
    login: (data: LoginData) => Promise<AuthResponse>;
    logout: (sessionId: string) => Promise<void>;
    getSession: (sessionId: string) => Promise<SessionResponse>;
  };
  cases: {
    create: (data: CreateCaseData) => Promise<CaseResponse>;
    list: () => Promise<CaseListResponse>;
    get: (id: string) => Promise<CaseResponse>;
    update: (id: string, data: UpdateCaseData) => Promise<CaseResponse>;
    delete: (id: string) => Promise<void>;
  };
  evidence: {
    upload: (caseId: string, file: File) => Promise<EvidenceResponse>;
    list: (caseId: string) => Promise<EvidenceListResponse>;
    delete: (id: string) => Promise<void>;
  };
  chat: {
    send: (message: string, caseId?: string) => Promise<ChatResponse>;
    onStream: (callback: (event: any, data: string) => void) => void; // event: IpcRendererEvent
    offStream: () => void;
  };
  db: {
    migrate: () => Promise<MigrationResponse>;
    backup: () => Promise<BackupResponse>;
    status: () => Promise<MigrationStatusResponse>;
  };
  gdpr: {
    export: (sessionId: string, options?: { format?: 'json' | 'csv' }) => Promise<GdprExportResponse>;
    delete: (sessionId: string, options?: { confirmed: boolean; exportBeforeDelete?: boolean; reason?: string }) => Promise<GdprDeleteResponse>;
  };
}

// Type definitions (placeholder - will be replaced with actual types)
interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    userId: string;
    sessionId: string;
    username: string;
  };
  error?: string;
}

interface SessionResponse {
  success: boolean;
  data?: {
    userId: string;
    username: string;
    email: string;
  };
  error?: string;
}

interface CreateCaseData {
  title: string;
  type: string;
  status: string;
  description?: string;
}

interface UpdateCaseData {
  title?: string;
  status?: string;
  description?: string;
}

interface CaseResponse {
  success: boolean;
  data?: any; // Case type (avoiding import in preload)
  error?: string;
}

interface CaseListResponse {
  success: boolean;
  data?: any[]; // Case[] type (avoiding import in preload)
  error?: string;
}

interface EvidenceResponse {
  success: boolean;
  data?: any; // Evidence type (avoiding import in preload)
  error?: string;
}

interface EvidenceListResponse {
  success: boolean;
  data?: any[]; // Evidence[] type (avoiding import in preload)
  error?: string;
}

interface ChatResponse {
  success: boolean;
  data?: any; // ChatMessage type (avoiding import in preload)
  error?: string;
}

interface MigrationResponse {
  success: boolean;
  data?: {
    appliedMigrations: number;
    currentVersion: number;
  };
  error?: string;
}

interface BackupResponse {
  success: boolean;
  data?: { backupPath: string };
  error?: string;
}

interface MigrationStatusResponse {
  success: boolean;
  data?: {
    currentVersion: number;
    latestVersion: number;
    pendingMigrations: number;
  };
  error?: string;
}

interface ExportResponse {
  success: boolean;
  data?: { exportPath: string };
  error?: string;
}

interface GdprExportResponse {
  success: boolean;
  data?: {
    filePath?: string;
    totalRecords: number;
    exportDate: string;
    format: 'json' | 'csv';
  };
  error?: string;
}

interface GdprDeleteResponse {
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
}

/**
 * Expose Electron API to renderer process
 */
const electronAPI: ElectronAPI = {
  // ===== AUTHENTICATION =====
  auth: {
    register: (data: RegisterData) => ipcRenderer.invoke('auth:register', data),
    login: (data: LoginData) => ipcRenderer.invoke('auth:login', data),
    logout: (sessionId: string) => ipcRenderer.invoke('auth:logout', sessionId),
    getSession: (sessionId: string) => ipcRenderer.invoke('auth:session', sessionId)
  },

  // ===== CASES =====
  cases: {
    create: (data: CreateCaseData) => ipcRenderer.invoke('case:create', data),
    list: () => ipcRenderer.invoke('case:list'),
    get: (id: string) => ipcRenderer.invoke('case:get', id),
    update: (id: string, data: UpdateCaseData) =>
      ipcRenderer.invoke('case:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('case:delete', id)
  },

  // ===== EVIDENCE =====
  evidence: {
    upload: (caseId: string, file: File) =>
      ipcRenderer.invoke('evidence:upload', caseId, file),
    list: (caseId: string) => ipcRenderer.invoke('evidence:list', caseId),
    delete: (id: string) => ipcRenderer.invoke('evidence:delete', id)
  },

  // ===== AI CHAT =====
  chat: {
    send: (message: string, caseId?: string) =>
      ipcRenderer.invoke('chat:send', message, caseId),
    onStream: (callback: (event: any, data: string) => void) => { // event: IpcRendererEvent
      ipcRenderer.on('chat:stream', callback);
    },
    offStream: () => {
      ipcRenderer.removeAllListeners('chat:stream');
    }
  },

  // ===== DATABASE =====
  db: {
    migrate: () => ipcRenderer.invoke('db:migrate'),
    backup: () => ipcRenderer.invoke('db:backup'),
    status: () => ipcRenderer.invoke('db:status')
  },

  // ===== GDPR =====
  gdpr: {
    export: (sessionId: string, options?: { format?: 'json' | 'csv' }) =>
      ipcRenderer.invoke('gdpr:export', sessionId, options),
    delete: (sessionId: string, options?: { confirmed: boolean; exportBeforeDelete?: boolean; reason?: string }) =>
      ipcRenderer.invoke('gdpr:delete', sessionId, options)
  }
};

/**
 * Create flat API for legacy frontend compatibility
 * Maps window.justiceAPI.loginUser() → ipcRenderer.invoke('auth:login')
 */
const justiceAPI = {
  // ===== AUTHENTICATION (flat methods) =====
  loginUser: (username: string, password: string, rememberMe: boolean = false) =>
    ipcRenderer.invoke('auth:login', { username, password, rememberMe }),

  registerUser: (username: string, password: string, email: string) =>
    ipcRenderer.invoke('auth:register', { username, email, password }),

  logoutUser: (sessionId: string) =>
    ipcRenderer.invoke('auth:logout', sessionId),

  getCurrentUser: (sessionId: string) =>
    ipcRenderer.invoke('auth:session', sessionId),

  // ===== CASE MANAGEMENT (flat methods) =====
  createCase: (data: any, sessionId: string) =>
    ipcRenderer.invoke('case:create', data, sessionId),

  getAllCases: (sessionId: string) =>
    ipcRenderer.invoke('case:list', sessionId),

  getAllCasesPaginated: (sessionId: string, page: number, pageSize: number) =>
    ipcRenderer.invoke('case:list', sessionId), // TODO: Add pagination params

  getCaseById: (id: string, sessionId: string) =>
    ipcRenderer.invoke('case:get', id, sessionId),

  updateCase: (id: string, data: any, sessionId: string) =>
    ipcRenderer.invoke('case:update', id, data, sessionId),

  deleteCase: (id: string, sessionId: string) =>
    ipcRenderer.invoke('case:delete', id, sessionId),

  closeCase: (id: string, sessionId: string) =>
    ipcRenderer.invoke('case:update', id, { status: 'closed' }, sessionId),

  // ===== EVIDENCE/DOCUMENTS (flat methods) =====
  uploadFile: (caseId: string, file: File, sessionId: string) =>
    ipcRenderer.invoke('evidence:upload', caseId, file, sessionId),

  getAllEvidence: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:list', caseId, sessionId),

  getEvidenceByCaseId: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:list', caseId, sessionId),

  deleteEvidence: (id: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:delete', id, sessionId),

  // ===== AI CHAT (flat methods) =====
  createConversation: (message: string, caseId: string | undefined, sessionId: string) =>
    ipcRenderer.invoke('chat:send', message, caseId, sessionId),

  // AI stream listeners
  onAIStreamToken: (callback: (event: any, data: string) => void) =>
    ipcRenderer.on('chat:stream', callback),

  onAIStreamComplete: (callback: (event: any, data: string) => void) =>
    ipcRenderer.on('chat:stream', callback),

  onAIStreamError: (callback: (event: any, data: string) => void) =>
    ipcRenderer.on('chat:stream', callback),

  // ===== DATABASE (flat methods) =====
  // Add database methods as needed

  // ===== GDPR (flat methods) =====
  exportUserData: (sessionId: string, options?: any) =>
    ipcRenderer.invoke('gdpr:export', sessionId, options),

  // ===== CONSENT MANAGEMENT (flat methods) =====
  grantConsent: (consentType: string, sessionId: string) =>
    ipcRenderer.invoke('consent:grant', consentType, sessionId),

  hasConsent: (consentType: string, sessionId: string) =>
    ipcRenderer.invoke('consent:hasConsent', consentType, sessionId),

  getUserConsents: (sessionId: string) =>
    ipcRenderer.invoke('consent:getUserConsents', sessionId),

  // ===== UI ERROR LOGGING =====
  logUIError: (errorData: any) =>
    ipcRenderer.invoke('ui:logError', errorData),

  // ===== PLACEHOLDER METHODS (add as needed) =====
  // These will be implemented as the corresponding IPC handlers are created
  changePassword: () => Promise.reject(new Error('Not implemented')),
  checkAIStatus: () => Promise.reject(new Error('Not implemented')),
  configureAI: () => Promise.reject(new Error('Not implemented')),
  createEvidence: () => Promise.reject(new Error('Not implemented')),
  deleteConversation: () => Promise.reject(new Error('Not implemented')),
  downloadFile: () => Promise.reject(new Error('Not implemented')),
  getAllConversations: () => Promise.reject(new Error('Not implemented')),
  getCaseFacts: () => Promise.reject(new Error('Not implemented')),
  getCasesByStatusPaginated: () => Promise.reject(new Error('Not implemented')),
  getCasesByUserPaginated: () => Promise.reject(new Error('Not implemented')),
  getCaseStatistics: () => Promise.reject(new Error('Not implemented')),
  getEvidenceById: () => Promise.reject(new Error('Not implemented')),
  getFacts: () => Promise.reject(new Error('Not implemented')),
  getRecentConversations: () => Promise.reject(new Error('Not implemented')),
  getUserProfile: () => Promise.reject(new Error('Not implemented')),
  onAIStatusUpdate: () => Promise.reject(new Error('Not implemented')),
  onAIStreamSources: () => Promise.reject(new Error('Not implemented')),
  onAIStreamThinkToken: () => Promise.reject(new Error('Not implemented')),
  printFile: () => Promise.reject(new Error('Not implemented')),
  revokeConsent: () => Promise.reject(new Error('Not implemented')),
  secureStorage: () => Promise.reject(new Error('Not implemented')),
  selectFile: () => Promise.reject(new Error('Not implemented')),
  storeFact: () => Promise.reject(new Error('Not implemented')),
  testAIConnection: () => Promise.reject(new Error('Not implemented')),
  updateEvidence: () => Promise.reject(new Error('Not implemented')),
  updateUserProfile: () => Promise.reject(new Error('Not implemented')),
  viewFile: () => Promise.reject(new Error('Not implemented')),
  aiStreamStart: () => Promise.reject(new Error('Not implemented')),
};

/**
 * Expose APIs to window object
 */
// Modern nested API (for future use)
contextBridge.exposeInMainWorld('electron', electronAPI);

// Legacy flat API (for current frontend compatibility)
contextBridge.exposeInMainWorld('justiceAPI', justiceAPI);

/**
 * Security: Log preload script loaded
 */
console.warn('[Preload] Context bridge established - window.justiceAPI and window.electron available');

// Window type extension removed - TypeScript ambient declarations don't work in preload sandbox
// The window.electron API is available at runtime via contextBridge

// CommonJS require for Electron preload (sandboxed context doesn't support ESM)
// Using require here is acceptable for preload scripts
const { contextBridge, ipcRenderer } = require('electron');

// Type definitions for exposed API (not exported - preload can't use ESM export)
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
  token?: string;
  error?: string;
}

interface SessionResponse {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  expiresAt: string;
}

interface CreateCaseData {
  title: string;
  description: string;
  status: string;
}

interface CaseResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseListResponse {
  cases: CaseResponse[];
}

interface UpdateCaseData {
  title?: string;
  description?: string;
  status?: string;
}

interface EvidenceResponse {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

interface EvidenceListResponse {
  evidence: EvidenceResponse[];
}

interface ChatResponse {
  id: string;
  message: string;
  timestamp: string;
}

interface MigrationResponse {
  success: boolean;
  message: string;
}

interface BackupResponse {
  success: boolean;
  path: string;
}

interface MigrationStatusResponse {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastMigration?: string;
}

interface GdprExportResponse {
  success: boolean;
  filePath: string;
}

interface GdprDeleteResponse {
  success: boolean;
  message: string;
}

/**
 * Electron API exposed to renderer process via contextBridge
 *
 * SECURITY: This is the ONLY way renderer can communicate with main process
 * - contextIsolation: true (enforced in main.ts)
 * - No direct Node.js API access in renderer
 * - Type-safe IPC invocations
 */

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    register: (data: RegisterData): Promise<AuthResponse> =>
      ipcRenderer.invoke('auth:register', data),
    login: (data: LoginData): Promise<AuthResponse> =>
      ipcRenderer.invoke('auth:login', data),
    logout: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('auth:logout', sessionId),
    getSession: (sessionId: string): Promise<SessionResponse> =>
      ipcRenderer.invoke('auth:session', sessionId),
  },
  cases: {
    create: (data: CreateCaseData): Promise<CaseResponse> => 
      ipcRenderer.invoke('cases:create', data),
    list: (): Promise<CaseListResponse> => 
      ipcRenderer.invoke('cases:list'),
    get: (id: string): Promise<CaseResponse> => 
      ipcRenderer.invoke('cases:get', id),
    update: (id: string, data: UpdateCaseData): Promise<CaseResponse> => 
      ipcRenderer.invoke('cases:update', id, data),
    delete: (id: string): Promise<void> => 
      ipcRenderer.invoke('cases:delete', id),
  },
  evidence: {
    upload: (caseId: string, file: File): Promise<EvidenceResponse> => 
      ipcRenderer.invoke('evidence:upload', caseId, file),
    list: (caseId: string): Promise<EvidenceListResponse> => 
      ipcRenderer.invoke('evidence:list', caseId),
    download: (evidenceId: string): Promise<void> => 
      ipcRenderer.invoke('evidence:download', evidenceId),
  },
  chat: {
    sendMessage: (message: string): Promise<ChatResponse> =>
      ipcRenderer.invoke('chat:send', message),
    // TODO: Implement chat:get-messages handler or remove this call
    // getMessages: (): Promise<ChatResponse[]> =>
    //   ipcRenderer.invoke('chat:get-messages'),
  },
  migrations: {
    start: (): Promise<MigrationResponse> => 
      ipcRenderer.invoke('migrations:start'),
    getStatus: (): Promise<MigrationStatusResponse> => 
      ipcRenderer.invoke('migrations:get-status'),
  },
  backups: {
    create: (): Promise<BackupResponse> => 
      ipcRenderer.invoke('backups:create'),
    restore: (path: string): Promise<BackupResponse> => 
      ipcRenderer.invoke('backups:restore', path),
  },
  gdpr: {
    exportData: (): Promise<GdprExportResponse> =>
      ipcRenderer.invoke('gdpr:export'),
    deleteData: (): Promise<GdprDeleteResponse> =>
      ipcRenderer.invoke('gdpr:delete'),
  }
});

// Expose justiceAPI (flat structure matching window.d.ts interface)
// This is the primary API used by the frontend
contextBridge.exposeInMainWorld('justiceAPI', {
  // ===== AUTHENTICATION =====
  login: (username: string, password: string, rememberMe: boolean = false) =>
    ipcRenderer.invoke('auth:login', { username, password, rememberMe }),

  register: (username: string, email: string, password: string) =>
    ipcRenderer.invoke('auth:register', { username, email, password }),

  logout: (sessionId: string) =>
    ipcRenderer.invoke('auth:logout', sessionId),

  getSession: (sessionId: string) =>
    ipcRenderer.invoke('auth:session', sessionId),

  // ===== DASHBOARD =====
  getDashboardStats: (sessionId: string) =>
    ipcRenderer.invoke('dashboard:get-stats', sessionId),

  // ===== CASE MANAGEMENT =====
  getAllCases: (sessionId: string) =>
    ipcRenderer.invoke('case:list', sessionId),

  getCaseById: (id: string, sessionId: string) =>
    ipcRenderer.invoke('case:get', id, sessionId),

  createCase: (data: any, sessionId: string) =>
    ipcRenderer.invoke('case:create', data, sessionId),

  updateCase: (id: string, data: any, sessionId: string) =>
    ipcRenderer.invoke('case:update', id, data, sessionId),

  deleteCase: (id: string, sessionId: string) =>
    ipcRenderer.invoke('case:delete', id, sessionId),

  getCaseFacts: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke('case-fact:get-all', caseId, sessionId),

  createCaseFact: (data: any, sessionId: string) =>
    ipcRenderer.invoke('case-fact:create', data, sessionId),

  // ===== EVIDENCE/DOCUMENTS =====
  uploadFile: (caseId: string, file: File, sessionId: string) =>
    ipcRenderer.invoke('evidence:upload', caseId, file, sessionId),

  getAllEvidence: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:list', caseId, sessionId),

  getEvidenceByCaseId: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:list', caseId, sessionId),

  deleteEvidence: (id: string, sessionId: string) =>
    ipcRenderer.invoke('evidence:delete', id, sessionId),

  // ===== DEADLINES =====
  getDeadlines: (sessionId: string, caseId?: number) =>
    ipcRenderer.invoke('deadline:getAll', sessionId, caseId),

  createDeadline: (data: any, sessionId: string) =>
    ipcRenderer.invoke('deadline:create', data, sessionId),

  updateDeadline: (id: number, data: any, sessionId: string) =>
    ipcRenderer.invoke('deadline:update', id, data, sessionId),

  completeDeadline: (id: number, sessionId: string) =>
    ipcRenderer.invoke('deadline:complete', id, sessionId),

  deleteDeadline: (id: number, sessionId: string) =>
    ipcRenderer.invoke('deadline:delete', id, sessionId),

  // ===== SECURE STORAGE =====
  secureStorageSet: (key: string, value: string) =>
    ipcRenderer.invoke('secure-storage:set', key, value),

  secureStorageGet: (key: string) =>
    ipcRenderer.invoke('secure-storage:get', key),

  secureStorageDelete: (key: string) =>
    ipcRenderer.invoke('secure-storage:delete', key),

  secureStorageHas: (key: string) =>
    ipcRenderer.invoke('secure-storage:has', key),

  secureStorage: {
    isEncryptionAvailable: () => ipcRenderer.invoke('secure-storage:is-available'),
    set: (key: string, value: string) => ipcRenderer.invoke('secure-storage:set', key, value),
    get: (key: string) => ipcRenderer.invoke('secure-storage:get', key),
    delete: (key: string) => ipcRenderer.invoke('secure-storage:delete', key),
    clearAll: () => ipcRenderer.invoke('secure-storage:clear-all'),
  },

  // ===== AI CONFIG =====
  configureAI: (config: any) =>
    ipcRenderer.invoke('ai:configure', config),

  // TODO: Add remaining API methods as needed (chat streaming, tags, notifications, search, etc.)
});
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
      ipcRenderer.invoke('auth:get-session', sessionId),
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
      ipcRenderer.invoke('chat:send-message', message),
    getMessages: (): Promise<ChatResponse[]> => 
      ipcRenderer.invoke('chat:get-messages'),
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
      ipcRenderer.invoke('gdpr:export-data'),
    deleteData: (): Promise<GdprDeleteResponse> =>
      ipcRenderer.invoke('gdpr:delete-data'),
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

  // TODO: Add remaining API methods as needed
  // This is a stub implementation - full API should be generated from window.d.ts
});
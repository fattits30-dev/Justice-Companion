// Import for Electron preload (sandboxed context doesn't support ESM)
// Using import here is acceptable for preload scripts
import { contextBridge, ipcRenderer } from 'electron';

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
      ipcRenderer.invoke('auth:getSession', sessionId),
  },
  case: {
    create: (data: CreateCaseData): Promise<CaseResponse> => 
      ipcRenderer.invoke('case:create', data),
    getAll: (): Promise<CaseListResponse> => 
      ipcRenderer.invoke('case:getAll'),
    getById: (id: string): Promise<CaseResponse> => 
      ipcRenderer.invoke('case:getById', id),
    update: (id: string, data: UpdateCaseData): Promise<CaseResponse> => 
      ipcRenderer.invoke('case:update', id, data),
    delete: (id: string): Promise<void> => 
      ipcRenderer.invoke('case:delete', id),
  },
  evidence: {
    getAll: (caseId: string): Promise<EvidenceListResponse> => 
      ipcRenderer.invoke('evidence:getAll', caseId),
    upload: (caseId: string, file: File): Promise<EvidenceResponse> => 
      ipcRenderer.invoke('evidence:upload', caseId, file),
    delete: (evidenceId: string): Promise<void> => 
      ipcRenderer.invoke('evidence:delete', evidenceId),
  },
  chat: {
    sendMessage: (message: string): Promise<ChatResponse> => 
      ipcRenderer.invoke('chat:sendMessage', message),
    getMessages: (): Promise<ChatResponse[]> => 
      ipcRenderer.invoke('chat:getMessages'),
  },
  migration: {
    start: (): Promise<MigrationResponse> => 
      ipcRenderer.invoke('migration:start'),
    getStatus: (): Promise<MigrationStatusResponse> => 
      ipcRenderer.invoke('migration:getStatus'),
  },
  backup: {
    create: (): Promise<BackupResponse> => 
      ipcRenderer.invoke('backup:create'),
    restore: (path: string): Promise<BackupResponse> => 
      ipcRenderer.invoke('backup:restore', path),
  },
  gdpr: {
    exportData: (sessionId: string, options?: { format?: 'json' | 'csv' }): Promise<GdprExportResponse> =>
      ipcRenderer.invoke('gdpr:export', sessionId, options),
    deleteData: (sessionId: string, options?: { confirmed: boolean; exportBeforeDelete?: boolean; reason?: string }): Promise<GdprDeleteResponse> =>
      ipcRenderer.invoke('gdpr:delete', sessionId, options),
  },
});
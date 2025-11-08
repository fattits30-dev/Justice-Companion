// CommonJS require for Electron preload (sandboxed context doesn't support ESM)
// Using require here is acceptable for preload scripts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

console.log("[PRELOAD] Preload script starting...");

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
  status: "pending" | "in_progress" | "completed" | "failed";
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
contextBridge.exposeInMainWorld("electronAPI", {
  auth: {
    register: (data: RegisterData): Promise<AuthResponse> =>
      ipcRenderer.invoke("auth:register", data),
    login: (data: LoginData): Promise<AuthResponse> =>
      ipcRenderer.invoke("auth:login", data),
    logout: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke("auth:logout", sessionId),
    getSession: (sessionId: string): Promise<SessionResponse> =>
      ipcRenderer.invoke("auth:session", sessionId),
  },
  cases: {
    create: (data: CreateCaseData): Promise<CaseResponse> =>
      ipcRenderer.invoke("cases:create", data),
    list: (): Promise<CaseListResponse> => ipcRenderer.invoke("cases:list"),
    get: (id: string): Promise<CaseResponse> =>
      ipcRenderer.invoke("cases:get", id),
    update: (id: string, data: UpdateCaseData): Promise<CaseResponse> =>
      ipcRenderer.invoke("cases:update", id, data),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("cases:delete", id),
  },
  evidence: {
    upload: (caseId: string, file: File): Promise<EvidenceResponse> =>
      ipcRenderer.invoke("evidence:upload", caseId, file),
    list: (caseId: string): Promise<EvidenceListResponse> =>
      ipcRenderer.invoke("evidence:list", caseId),
    download: (evidenceId: string): Promise<void> =>
      ipcRenderer.invoke("evidence:download", evidenceId),
  },
  chat: {
    sendMessage: (message: string): Promise<ChatResponse> =>
      ipcRenderer.invoke("chat:send", message),
  },
  migrations: {
    start: (): Promise<MigrationResponse> =>
      ipcRenderer.invoke("migrations:start"),
    getStatus: (): Promise<MigrationStatusResponse> =>
      ipcRenderer.invoke("migrations:get-status"),
  },
  backups: {
    create: (): Promise<BackupResponse> => ipcRenderer.invoke("backups:create"),
    restore: (path: string): Promise<BackupResponse> =>
      ipcRenderer.invoke("backups:restore", path),
  },
  gdpr: {
    exportData: (): Promise<GdprExportResponse> =>
      ipcRenderer.invoke("gdpr:export"),
    deleteData: (): Promise<GdprDeleteResponse> =>
      ipcRenderer.invoke("gdpr:delete"),
  },
});

// Expose justiceAPI (flat structure matching window.d.ts interface)
// This is the primary API used by the frontend
contextBridge.exposeInMainWorld("justiceAPI", {
  // ===== AUTHENTICATION =====
  login: (username: string, password: string, rememberMe: boolean = false) =>
    ipcRenderer.invoke("auth:login", { username, password, rememberMe }),

  register: (username: string, email: string, password: string) =>
    ipcRenderer.invoke("auth:register", { username, email, password }),

  logout: (sessionId: string) => ipcRenderer.invoke("auth:logout", sessionId),

  getSession: (sessionId: string) =>
    ipcRenderer.invoke("auth:session", sessionId),

  // ===== DASHBOARD =====
  getDashboardStats: (sessionId: string) =>
    ipcRenderer.invoke("dashboard:get-stats", sessionId),

  // ===== CASE MANAGEMENT =====
  getAllCases: (sessionId: string) =>
    ipcRenderer.invoke("case:list", sessionId),

  getCaseById: (id: string, sessionId: string) =>
    ipcRenderer.invoke("case:get", id, sessionId),

  createCase: (data: any, sessionId: string, aiMetadata?: any) =>
    ipcRenderer.invoke("case:create", data, sessionId, aiMetadata),

  updateCase: (id: string, data: any, sessionId: string) =>
    ipcRenderer.invoke("case:update", id, data, sessionId),

  deleteCase: (id: string, sessionId: string) =>
    ipcRenderer.invoke("case:delete", id, sessionId),

  getCaseFacts: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("case-fact:get-all", caseId, sessionId),

  createCaseFact: (data: any, sessionId: string) =>
    ipcRenderer.invoke("case-fact:create", data, sessionId),

  // ===== EVIDENCE/DOCUMENTS =====
  uploadFile: (caseId: string, file: File, sessionId: string) =>
    ipcRenderer.invoke("evidence:upload", caseId, file, sessionId),

  getAllEvidence: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke("evidence:list", caseId, sessionId),

  getEvidenceByCaseId: (caseId: string, sessionId: string) =>
    ipcRenderer.invoke("evidence:list", caseId, sessionId),

  deleteEvidence: (id: string, sessionId: string) =>
    ipcRenderer.invoke("evidence:delete", id, sessionId),

  // ===== DEADLINES =====
  getDeadlines: (sessionId: string, caseId?: number) =>
    ipcRenderer.invoke("deadline:getAll", sessionId, caseId),

  createDeadline: (data: any, sessionId: string) =>
    ipcRenderer.invoke("deadline:create", data, sessionId),

  updateDeadline: (id: number, data: any, sessionId: string) =>
    ipcRenderer.invoke("deadline:update", id, data, sessionId),

  completeDeadline: (id: number, sessionId: string) =>
    ipcRenderer.invoke("deadline:complete", id, sessionId),

  deleteDeadline: (id: number, sessionId: string) =>
    ipcRenderer.invoke("deadline:delete", id, sessionId),

  // ===== SECURE STORAGE =====
  secureStorageSet: (key: string, value: string) =>
    ipcRenderer.invoke("secure-storage:set", key, value),

  secureStorageGet: (key: string) =>
    ipcRenderer.invoke("secure-storage:get", key),

  secureStorageDelete: (key: string) =>
    ipcRenderer.invoke("secure-storage:delete", key),

  secureStorageHas: (key: string) =>
    ipcRenderer.invoke("secure-storage:has", key),

  secureStorage: {
    isEncryptionAvailable: () =>
      ipcRenderer.invoke("secure-storage:is-available"),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("secure-storage:set", key, value),
    get: (key: string) => ipcRenderer.invoke("secure-storage:get", key),
    delete: (key: string) => ipcRenderer.invoke("secure-storage:delete", key),
    clearAll: () => ipcRenderer.invoke("secure-storage:clear-all"),
  },

  // ===== BACKUP & RESTORE =====
  createBackup: () => ipcRenderer.invoke("db:backup"),

  listBackups: () => ipcRenderer.invoke("db:listBackups"),

  restoreBackup: (backupFilename: string, sessionId: string) =>
    ipcRenderer.invoke("db:restore", backupFilename, sessionId),

  deleteBackup: (backupFilename: string, sessionId: string) =>
    ipcRenderer.invoke("db:deleteBackup", backupFilename, sessionId),

  // Auto-backup settings
  getBackupSettings: (sessionId: string) =>
    ipcRenderer.invoke("backup:getSettings", sessionId),

  updateBackupSettings: (
    settings: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
      backup_time: string;
      keep_count: number;
    },
    sessionId: string
  ) => ipcRenderer.invoke("backup:updateSettings", settings, sessionId),

  cleanupOldBackups: (keepCount: number) =>
    ipcRenderer.invoke("backup:cleanupOld", keepCount),

  // ===== AI CONFIG =====
  configureAI: (config: any) => ipcRenderer.invoke("ai:configure", config),

  getAIConfig: () => ipcRenderer.invoke("ai:get-config"),

  testAIConnection: (provider: string) =>
    ipcRenderer.invoke("ai:test-connection", { provider }),

  // ===== AI CHAT STREAMING =====
  streamChat: (
    request: any,
    onToken: (token: string) => void,
    onThinking: (thinking: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onConversationId?: (conversationId: number) => void
  ) => {
    // Set up listeners for streaming events
    const dataHandler = (
      _event: any,
      data: { data: string; done: boolean }
    ) => {
      if (data.done) {
        onComplete();
      } else {
        onToken(data.data);
      }
    };

    const errorHandler = (_event: any, error: { message: string }) => {
      onError(error.message);
    };

    const conversationIdHandler = (
      _event: any,
      data: { conversationId: number }
    ) => {
      if (onConversationId) {
        onConversationId(data.conversationId);
      }
    };

    // Register listeners
    ipcRenderer.on("chat:stream:data", dataHandler);
    ipcRenderer.on("chat:stream:error", errorHandler);
    ipcRenderer.on("chat:stream:conversation-id", conversationIdHandler);

    // Start streaming
    return ipcRenderer.invoke("chat:stream", request).finally(() => {
      // Clean up listeners when done
      ipcRenderer.removeListener("chat:stream:data", dataHandler);
      ipcRenderer.removeListener("chat:stream:error", errorHandler);
      ipcRenderer.removeListener(
        "chat:stream:conversation-id",
        conversationIdHandler
      );
    });
  },

  // ===== AI ANALYSIS METHODS =====
  analyzeCase: (request: any) => ipcRenderer.invoke("ai:analyze-case", request),

  analyzeEvidence: (request: any) =>
    ipcRenderer.invoke("ai:analyze-evidence", request),

  draftDocument: (request: any) =>
    ipcRenderer.invoke("ai:draft-document", request),

  // ===== AI DOCUMENT ANALYSIS =====
  analyzeDocument: (
    filePath: string,
    sessionId: string,
    userQuestion?: string
  ) =>
    ipcRenderer.invoke("ai:analyze-document", {
      filePath,
      sessionId,
      userQuestion,
    }),

  // File selection dialog (for document upload)
  showOpenDialog: (options: any) =>
    ipcRenderer.invoke("dialog:showOpenDialog", options),

  // ===== EXPORT OPERATIONS =====
  exportCaseToPDF: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:case-to-pdf", caseId, sessionId),

  exportCaseToWord: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:case-to-word", caseId, sessionId),

  exportEvidenceListToPDF: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:evidence-list-to-pdf", caseId, sessionId),

  exportTimelineReportToPDF: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:timeline-report-to-pdf", caseId, sessionId),

  exportCaseNotesToPDF: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:case-notes-to-pdf", caseId, sessionId),

  exportCaseNotesToWord: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke("export:case-notes-to-word", caseId, sessionId),

  exportCustom: (
    exportType: string,
    caseId: number,
    options: any,
    sessionId: string
  ) =>
    ipcRenderer.invoke("export:custom", exportType, caseId, options, sessionId),

  // ===== TEMPLATE OPERATIONS =====
  getAllTemplates: (sessionId: string) =>
    ipcRenderer.invoke("templates:get-all", sessionId),

  createTemplate: (templateData: any, sessionId: string) =>
    ipcRenderer.invoke("templates:create", templateData, sessionId),

  updateTemplate: (templateId: number, templateData: any, sessionId: string) =>
    ipcRenderer.invoke("templates:update", templateId, templateData, sessionId),

  deleteTemplate: (templateId: number, sessionId: string) =>
    ipcRenderer.invoke("templates:delete", templateId, sessionId),

  seedTemplates: (sessionId: string) =>
    ipcRenderer.invoke("templates:seed", sessionId),

  // ===== SEARCH OPERATIONS =====
  search: (query: any, sessionId: string) =>
    ipcRenderer.invoke("search", query, sessionId),

  rebuildSearchIndex: (sessionId: string) =>
    ipcRenderer.invoke("rebuild-search-index", sessionId),
});

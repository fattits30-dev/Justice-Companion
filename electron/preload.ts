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
  export: {
    caseToPdf: (caseId: number, userId: number, options?: any) => Promise<any>;
    caseToWord: (caseId: number, userId: number, options?: any) => Promise<any>;
    evidenceListToPdf: (caseId: number, userId: number) => Promise<any>;
    timelineReportToPdf: (caseId: number, userId: number) => Promise<any>;
    caseNotesToPdf: (caseId: number, userId: number) => Promise<any>;
    caseNotesToWord: (caseId: number, userId: number) => Promise<any>;
    getTemplates: () => Promise<any>;
    custom: (caseId: number, userId: number, options: any) => Promise<any>;
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
  },

  // ===== EXPORT =====
  export: {
    caseToPdf: (caseId: number, userId: number, options?: any) =>
      ipcRenderer.invoke('export:case-to-pdf', caseId, userId, options),
    caseToWord: (caseId: number, userId: number, options?: any) =>
      ipcRenderer.invoke('export:case-to-word', caseId, userId, options),
    evidenceListToPdf: (caseId: number, userId: number) =>
      ipcRenderer.invoke('export:evidence-list-to-pdf', caseId, userId),
    timelineReportToPdf: (caseId: number, userId: number) =>
      ipcRenderer.invoke('export:timeline-report-to-pdf', caseId, userId),
    caseNotesToPdf: (caseId: number, userId: number) =>
      ipcRenderer.invoke('export:case-notes-to-pdf', caseId, userId),
    caseNotesToWord: (caseId: number, userId: number) =>
      ipcRenderer.invoke('export:case-notes-to-word', caseId, userId),
    getTemplates: () =>
      ipcRenderer.invoke('export:get-templates'),
    custom: (caseId: number, userId: number, options: any) =>
      ipcRenderer.invoke('export:custom', caseId, userId, options)
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
    ipcRenderer.invoke('auth:register', { username, password, email }),

  logoutUser: (sessionId: string) =>
    ipcRenderer.invoke('auth:logout', sessionId),

  getCurrentUser: (sessionId: string) =>
    ipcRenderer.invoke('auth:session', sessionId),

  // ===== ALIASES for new TDD-built components =====
  // These match what LoginScreen/RegistrationScreen/AuthContext expect
  login: (username: string, password: string, rememberMe: boolean = false) =>
    ipcRenderer.invoke('auth:login', { username, password, rememberMe }),

  register: (username: string, password: string, email: string) =>
    ipcRenderer.invoke('auth:register', { username, password, email }),

  logout: (sessionId?: string) =>
    ipcRenderer.invoke('auth:logout', sessionId || ''),

  getSession: (sessionId?: string) =>
    ipcRenderer.invoke('auth:session', sessionId || ''),

  // ===== DASHBOARD =====
  getDashboardStats: (sessionId: string) =>
    ipcRenderer.invoke('dashboard:stats', sessionId),

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

  // AI stream listeners (return cleanup functions)
  onAIStreamToken: (callback: (event: any, data: string) => void) => {
    ipcRenderer.on('chat:stream', callback);
    return () => ipcRenderer.removeListener('chat:stream', callback);
  },

  onAIStreamComplete: (callback: (event: any, data: string) => void) => {
    ipcRenderer.on('chat:stream', callback);
    return () => ipcRenderer.removeListener('chat:stream', callback);
  },

  onAIStreamError: (callback: (event: any, data: string) => void) => {
    ipcRenderer.on('chat:stream', callback);
    return () => ipcRenderer.removeListener('chat:stream', callback);
  },

  // ===== DATABASE (flat methods) =====
  // Add database methods as needed

  // ===== GDPR (flat methods) =====
  exportUserData: (sessionId: string, options?: any) =>
    ipcRenderer.invoke('gdpr:export', sessionId, options),

  // ===== DEADLINE MANAGEMENT (flat methods) =====
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

  // ===== CONSENT MANAGEMENT (flat methods) =====
  // TODO: Implement consent IPC handlers in electron/ipc-handlers.ts
  grantConsent: async (consentType: string, sessionId: string) => ({
    success: true,
    data: { granted: true },
  }),

  hasConsent: async (consentType: string, sessionId: string) => ({
    success: true,
    data: { hasConsent: true }, // Default to granted for now
  }),

  getUserConsents: async (sessionId: string) => ({
    success: true,
    data: [], // No consents stored yet
  }),

  // ===== UI ERROR LOGGING =====
  logUIError: (errorData: any) =>
    ipcRenderer.invoke('ui:logError', errorData),

  // ===== PLACEHOLDER METHODS (add as needed) =====
  // These will be implemented as the corresponding IPC handlers are created
  changePassword: () => Promise.reject(new Error('Not implemented')),
  // Return placeholder AI status (AI integration pending)
  checkAIStatus: async () => ({
    success: true,
    connected: false, // Will be true when AI service is integrated
    data: { message: 'AI service integration pending' },
  }),
  // Configure AI service (save API key)
  configureAI: async (config: { apiKey: string; provider?: string }) =>
    ipcRenderer.invoke('ai:configure', config),
  createEvidence: () => Promise.reject(new Error('Not implemented')),
  deleteConversation: () => Promise.reject(new Error('Not implemented')),
  downloadFile: () => Promise.reject(new Error('Not implemented')),
  secureStorageSet: async (key: string, value: string) =>
    ipcRenderer.invoke('secure-storage:set', key, value),
  secureStorageGet: async (key: string) => {
    const response = await ipcRenderer.invoke('secure-storage:get', key);
    if (!response.success) {
      return { success: false, error: response.error };
    }
    return { success: true, data: response.data?.value ?? null };
  },
  secureStorageDelete: async (key: string) =>
    ipcRenderer.invoke('secure-storage:delete', key),
  secureStorageHas: async (key: string) => {
    const response = await ipcRenderer.invoke('secure-storage:get', key);
    if (!response.success) {
      return { success: false, error: response.error };
    }
    return { success: true, data: response.data?.value != null };
  },
  // Return empty conversations list (chat history feature pending)
  getAllConversations: async () => ({
    success: true,
    data: [], // No conversations yet - chat history feature pending
  }),
  getCaseFacts: (caseId: number, sessionId: string) =>
    ipcRenderer.invoke('case-fact:list', caseId, sessionId),

  createCaseFact: (data: any, sessionId: string) =>
    ipcRenderer.invoke('case-fact:create', data, sessionId),
  getCasesByStatusPaginated: () => Promise.reject(new Error('Not implemented')),
  getCasesByUserPaginated: () => Promise.reject(new Error('Not implemented')),
  getCaseStatistics: () => Promise.reject(new Error('Not implemented')),
  getEvidenceById: () => Promise.reject(new Error('Not implemented')),
  getFacts: () => Promise.reject(new Error('Not implemented')),
  getRecentConversations: () => Promise.reject(new Error('Not implemented')),
  // Return empty user profile (user profile functionality pending)
  getUserProfile: async () => ({
    success: true,
    data: null, // No profile data yet - profile editing feature pending
  }),
  // AI stream listeners (return no-op cleanup functions until backend streaming is implemented)
  onAIStatusUpdate: (callback: (event: any, data: any) => void) => {
    // TODO: Implement when AI status updates are added
    return () => {}; // Return no-op cleanup function
  },
  onAIStreamSources: (callback: (event: any, data: any) => void) => {
    // TODO: Implement when AI source streaming is added
    return () => {}; // Return no-op cleanup function
  },
  onAIStreamThinkToken: (callback: (event: any, data: string) => void) => {
    // TODO: Implement when AI thinking stream is added
    return () => {}; // Return no-op cleanup function
  },
  printFile: () => Promise.reject(new Error('Not implemented')),
  revokeConsent: () => Promise.reject(new Error('Not implemented')),
  secureStorage: {
    isEncryptionAvailable: async () => {
      const response = await ipcRenderer.invoke('secure-storage:isEncryptionAvailable');
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.available;
    },
    set: async (key: string, value: string) => {
      const response = await ipcRenderer.invoke('secure-storage:set', key, value);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.success;
    },
    get: async (key: string) => {
      const response = await ipcRenderer.invoke('secure-storage:get', key);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.value;
    },
    delete: async (key: string) => {
      const response = await ipcRenderer.invoke('secure-storage:delete', key);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.success;
    },
    clearAll: async () => {
      const response = await ipcRenderer.invoke('secure-storage:clearAll');
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.success;
    },
  },
  selectFile: () => Promise.reject(new Error('Not implemented')),
  storeFact: () => Promise.reject(new Error('Not implemented')),
  // Test AI connection
  testAIConnection: async () =>
    ipcRenderer.invoke('ai:testConnection'),
  updateEvidence: () => Promise.reject(new Error('Not implemented')),
  updateUserProfile: () => Promise.reject(new Error('Not implemented')),
  viewFile: () => Promise.reject(new Error('Not implemented')),
  // Start AI streaming chat
  aiStreamStart: async (payload: { messages: any[]; caseId?: string }) => {
    // Get current session from localStorage (set by AuthContext)
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return {
        success: false,
        error: 'Not authenticated. Please log in.',
      };
    }

    // Extract last user message
    const lastMessage = payload.messages[payload.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return {
        success: false,
        error: 'Invalid message format',
      };
    }

    // Call chat:send which now streams with Groq
    return ipcRenderer.invoke('chat:send', lastMessage.content, payload.caseId, sessionId);
  },

  // ===== STREAMING CHAT =====
  /**
   * Stream chat with AI (supports streaming responses)
   * @param request - { sessionId, message, conversationId }
   * @param onToken - Callback for each AI response token
   * @param onThinking - Callback for AI thinking process tokens
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   */
  streamChat: async (
    request: { sessionId: string; message: string; conversationId?: number | null },
    onToken: (token: string) => void,
    onThinking: (thinking: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Generate unique request ID
      const requestId = `chat-${Date.now()}-${Math.random()}`;

      // Set up listeners for streaming events
      const tokenListener = (_event: any, data: { requestId: string; token: string }) => {
        if (data.requestId === requestId) {
          onToken(data.token);
        }
      };

      const thinkingListener = (_event: any, data: { requestId: string; thinking: string }) => {
        if (data.requestId === requestId) {
          onThinking(data.thinking);
        }
      };

      const completeListener = (_event: any, data: { requestId: string }) => {
        if (data.requestId === requestId) {
          // Clean up listeners
          ipcRenderer.removeListener('chat:stream:token', tokenListener);
          ipcRenderer.removeListener('chat:stream:thinking', thinkingListener);
          ipcRenderer.removeListener('chat:stream:complete', completeListener);
          ipcRenderer.removeListener('chat:stream:error', errorListener);

          onComplete();
          resolve();
        }
      };

      const errorListener = (_event: any, data: { requestId: string; error: string }) => {
        if (data.requestId === requestId) {
          // Clean up listeners
          ipcRenderer.removeListener('chat:stream:token', tokenListener);
          ipcRenderer.removeListener('chat:stream:thinking', thinkingListener);
          ipcRenderer.removeListener('chat:stream:complete', completeListener);
          ipcRenderer.removeListener('chat:stream:error', errorListener);

          onError(data.error);
          reject(new Error(data.error));
        }
      };

      // Register listeners
      ipcRenderer.on('chat:stream:token', tokenListener);
      ipcRenderer.on('chat:stream:thinking', thinkingListener);
      ipcRenderer.on('chat:stream:complete', completeListener);
      ipcRenderer.on('chat:stream:error', errorListener);

      // Start streaming
      ipcRenderer.invoke('chat:stream', {
        ...request,
        requestId,
      }).catch((error) => {
        // Clean up on invoke error
        ipcRenderer.removeListener('chat:stream:token', tokenListener);
        ipcRenderer.removeListener('chat:stream:thinking', thinkingListener);
        ipcRenderer.removeListener('chat:stream:complete', completeListener);
        ipcRenderer.removeListener('chat:stream:error', errorListener);

        onError(error.message || 'Failed to start streaming');
        reject(error);
      });
    });
  },

  // ===== SEARCH =====
  search: {
    // Perform a comprehensive search across all entities
    query: (query: any) =>
      ipcRenderer.invoke('search:query', query),

    // Save a search query for later reuse
    save: (name: string, query: any) =>
      ipcRenderer.invoke('search:save', name, query),

    // Get all saved searches for the current user
    listSaved: () =>
      ipcRenderer.invoke('search:list-saved'),

    // Delete a saved search
    deleteSaved: (searchId: number) =>
      ipcRenderer.invoke('search:delete-saved', searchId),

    // Execute a previously saved search
    executeSaved: (searchId: number) =>
      ipcRenderer.invoke('search:execute-saved', searchId),

    // Get search suggestions based on prefix
    suggestions: (prefix: string, limit?: number) =>
      ipcRenderer.invoke('search:suggestions', prefix, limit),

    // Rebuild the entire search index (admin operation)
    rebuildIndex: () =>
      ipcRenderer.invoke('search:rebuild-index'),

    // Get search index statistics
    indexStats: () =>
      ipcRenderer.invoke('search:index-stats'),

    // Update search index for a specific entity
    updateIndex: (entityType: string, entityId: number) =>
      ipcRenderer.invoke('search:update-index', entityType, entityId),
  },

  // ===== TAG MANAGEMENT =====
  tags: {
    // List all tags for the current user
    list: (sessionId: string) =>
      ipcRenderer.invoke('tags:list', sessionId),

    // Create a new tag
    create: (input: any, sessionId: string) =>
      ipcRenderer.invoke('tags:create', input, sessionId),

    // Update an existing tag
    update: (tagId: number, input: any, sessionId: string) =>
      ipcRenderer.invoke('tags:update', tagId, input, sessionId),

    // Delete a tag (removes from all evidence)
    delete: (tagId: number, sessionId: string) =>
      ipcRenderer.invoke('tags:delete', tagId, sessionId),

    // Apply tag to evidence
    tagEvidence: (evidenceId: number, tagId: number, sessionId: string) =>
      ipcRenderer.invoke('tags:tagEvidence', evidenceId, tagId, sessionId),

    // Remove tag from evidence
    untagEvidence: (evidenceId: number, tagId: number, sessionId: string) =>
      ipcRenderer.invoke('tags:untagEvidence', evidenceId, tagId, sessionId),

    // Get tags for specific evidence
    getForEvidence: (evidenceId: number, sessionId: string) =>
      ipcRenderer.invoke('tags:getForEvidence', evidenceId, sessionId),

    // Search evidence by tags (AND logic - must have all specified tags)
    searchByTags: (tagIds: number[], sessionId: string) =>
      ipcRenderer.invoke('tags:searchByTags', tagIds, sessionId),

    // Get tag statistics for the current user
    statistics: (sessionId: string) =>
      ipcRenderer.invoke('tags:statistics', sessionId),
  },

  // ===== NOTIFICATIONS =====
  notifications: {
    // Get notifications with optional filters
    list: (sessionId: string, filters?: any) =>
      ipcRenderer.invoke('notifications:list', sessionId, filters),

    // Get unread notification count
    unreadCount: (sessionId: string) =>
      ipcRenderer.invoke('notifications:unread-count', sessionId),

    // Mark a notification as read
    markRead: (sessionId: string, notificationId: number) =>
      ipcRenderer.invoke('notifications:mark-read', sessionId, notificationId),

    // Mark all notifications as read
    markAllRead: (sessionId: string) =>
      ipcRenderer.invoke('notifications:mark-all-read', sessionId),

    // Dismiss a notification
    dismiss: (sessionId: string, notificationId: number) =>
      ipcRenderer.invoke('notifications:dismiss', sessionId, notificationId),

    // Get notification preferences
    preferences: (sessionId: string) =>
      ipcRenderer.invoke('notifications:preferences', sessionId),

    // Update notification preferences
    updatePreferences: (sessionId: string, preferences: any) =>
      ipcRenderer.invoke('notifications:update-preferences', sessionId, preferences),

    // Get notification statistics
    stats: (sessionId: string) =>
      ipcRenderer.invoke('notifications:stats', sessionId),
  },
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

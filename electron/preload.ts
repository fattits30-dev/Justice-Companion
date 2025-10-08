import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../src/types/ipc';
import type { JusticeCompanionAPI } from '../src/types/ipc';
import type { CreateCaseInput, UpdateCaseInput } from '../src/models/Case';
import type { CreateEvidenceInput, UpdateEvidenceInput } from '../src/models/Evidence';
import type { ConsentType } from '../src/models/Consent';

/**
 * Expose Justice Companion API to renderer process via contextBridge
 * This provides type-safe, secure access to database operations
 */
const justiceAPI: JusticeCompanionAPI = {
  // Create a new case
  createCase: (input: CreateCaseInput) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_CREATE, { input });
  },

  // Get case by ID
  getCaseById: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_GET_BY_ID, { id });
  },

  // Get all cases
  getAllCases: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_GET_ALL, {});
  },

  // Update case
  updateCase: (id: number, input: UpdateCaseInput) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_UPDATE, { id, input });
  },

  // Delete case
  deleteCase: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_DELETE, { id });
  },

  // Close case
  closeCase: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_CLOSE, { id });
  },

  // Get case statistics
  getCaseStatistics: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASE_GET_STATISTICS, {});
  },

  // Create evidence
  createEvidence: (input: CreateEvidenceInput) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_CREATE, { input });
  },

  // Get evidence by ID
  getEvidenceById: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_GET_BY_ID, { id });
  },

  // Get all evidence
  getAllEvidence: (evidenceType?: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_GET_ALL, { evidenceType });
  },

  // Get evidence by case ID
  getEvidenceByCaseId: (caseId: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_GET_BY_CASE, { caseId });
  },

  // Update evidence
  updateEvidence: (id: number, input: UpdateEvidenceInput) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_UPDATE, { id, input });
  },

  // Delete evidence
  deleteEvidence: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EVIDENCE_DELETE, { id });
  },
};

// AI API methods
const aiAPI = {
  // Check AI connection status
  checkAIStatus: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CHECK_STATUS, {});
  },

  // Send chat message (non-streaming)
  aiChat: (request: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, request);
  },

  // Start streaming chat
  aiStreamStart: (request: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_STREAM_START, request);
  },

  // Listen for streaming tokens
  onAIStreamToken: (callback: (token: string) => void) => {
    const handler = (_event: IpcRendererEvent, token: string) => {
      console.log('[preload] Token received from main:', token);
      callback(token);
    };
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_TOKEN, handler);
    console.log('[preload] Registered token listener');
    return () => {
      console.log('[preload] Removing token listener');
      ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_TOKEN, handler);
    };
  },

  // Listen for streaming think tokens (AI reasoning content)
  onAIStreamThinkToken: (callback: (token: string) => void) => {
    const handler = (_event: IpcRendererEvent, token: string) => {
      console.log('[preload] Think token received from main:', token);
      callback(token);
    };
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_THINK_TOKEN, handler);
    console.log('[preload] Registered think token listener');
    return () => {
      console.log('[preload] Removing think token listener');
      ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_THINK_TOKEN, handler);
    };
  },

  // Listen for source citations (legal references)
  onAIStreamSources: (callback: (sources: string[]) => void) => {
    const handler = (_event: IpcRendererEvent, sources: string[]) => {
      console.log('[preload] Received sources:', sources);
      callback(sources);
    };
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_SOURCES, handler);
    console.log('[preload] Registered sources listener');
    return () => {
      console.log('[preload] Removing sources listener');
      ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_SOURCES, handler);
    };
  },

  // Listen for stream completion
  onAIStreamComplete: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_COMPLETE, handler);
  },

  // Listen for stream errors
  onAIStreamError: (callback: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_ERROR, handler);
  },

  // Listen for status updates (RAG progress)
  onAIStatusUpdate: (callback: (status: string) => void) => {
    const handler = (_event: IpcRendererEvent, status: string) => {
      console.log('[preload] Status update received:', status);
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.AI_STATUS_UPDATE, handler);
    console.log('[preload] Registered status update listener');
    return () => {
      console.log('[preload] Removing status update listener');
      ipcRenderer.removeListener(IPC_CHANNELS.AI_STATUS_UPDATE, handler);
    };
  },
};

// Model API methods
const modelAPI = {
  // Get available models catalog
  getAvailableModels: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODEL_GET_AVAILABLE, {});
  },

  // Get downloaded models
  getDownloadedModels: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODEL_GET_DOWNLOADED, {});
  },

  // Check if a specific model is downloaded
  isModelDownloaded: (modelId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODEL_IS_DOWNLOADED, { modelId });
  },

  // Start model download
  downloadModel: (modelId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD_START, { modelId });
  },

  // Listen for download progress
  onDownloadProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, handler);
  },

  // Delete a downloaded model
  deleteModel: (modelId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.MODEL_DELETE, { modelId });
  },
};

// File API methods
const fileAPI = {
  // Select a file using native file picker
  selectFile: (request?: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT, request);
  },

  // Upload and process a file
  uploadFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_UPLOAD, { filePath });
  },

  // View a file
  viewFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_VIEW, { filePath });
  },

  // Download a file
  downloadFile: (filePath: string, fileName?: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_DOWNLOAD, { filePath, fileName });
  },

  // Print a file
  printFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_PRINT, { filePath });
  },

  // Email files
  emailFiles: (filePaths: string[], subject?: string, body?: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_EMAIL, { filePaths, subject, body });
  },
};

// Chat Conversation API methods
const conversationAPI = {
  // Create a new conversation
  createConversation: (input: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_CREATE, { input });
  },

  // Get conversation by ID
  getConversation: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_GET, { id });
  },

  // Get all conversations (optionally filtered by case)
  getAllConversations: (caseId?: number | null) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_GET_ALL, { caseId });
  },

  // Get recent conversations for a case
  getRecentConversations: (caseId: number | null, limit?: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_GET_RECENT, { caseId, limit });
  },

  // Load conversation with all messages
  loadConversationWithMessages: (conversationId: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_LOAD_WITH_MESSAGES, { conversationId });
  },

  // Delete a conversation
  deleteConversation: (id: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_DELETE, { id });
  },

  // Add a message to a conversation
  addMessage: (input: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_ADD, { input });
  },
};

// User Profile API methods
const profileAPI = {
  // Get user profile
  getUserProfile: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET, {});
  },

  // Update user profile
  updateUserProfile: (input: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, { input });
  },
};

// Facts API methods
const factsAPI = {
  // Store a case fact (supports both old format and new format)
  storeFact: (params: {
    caseId: number;
    factContent?: string;      // NEW: Direct fact content
    factCategory?: string;     // NEW: Timeline/evidence/witness/location/communication/other
    importance?: string;       // NEW: Low/medium/high/critical
    factType?: string;         // OLD: For backwards compatibility
    factKey?: string;          // OLD: For backwards compatibility
    factValue?: string;        // OLD: For backwards compatibility
    source?: string;
    confidence?: number;
  }) => {
    return ipcRenderer.invoke('facts:store', params);
  },

  // Get facts for a case (alias for getCaseFacts)
  getFacts: (caseId: number, factType?: string) => {
    return ipcRenderer.invoke('facts:get', caseId, factType);
  },

  // Get facts for a case (preferred name for AI functions)
  getCaseFacts: (caseId: number, factCategory?: string) => {
    return ipcRenderer.invoke('facts:get', caseId, factCategory);
  },

  // Get fact count for a case
  getFactCount: (caseId: number) => {
    return ipcRenderer.invoke('facts:count', caseId);
  },
};

// GDPR API methods
const gdprAPI = {
  // Export all user data to JSON file
  exportUserData: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.GDPR_EXPORT_USER_DATA, {});
  },

  // Delete all user data (requires confirmation)
  deleteUserData: (confirmation: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.GDPR_DELETE_USER_DATA, { confirmation });
  },
};

// Authentication API methods
const authAPI = {
  // Register a new user
  registerUser: (username: string, password: string, email: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_REGISTER, { username, password, email });
  },

  // Login user
  loginUser: (username: string, password: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, { username, password });
  },

  // Logout current user
  logoutUser: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT, {});
  },

  // Get current logged-in user
  getCurrentUser: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_CURRENT_USER, {});
  },

  // Change user password
  changePassword: (oldPassword: string, newPassword: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, { oldPassword, newPassword });
  },
};

// Consent API methods (GDPR)
const consentAPI = {
  // Grant consent
  grantConsent: (consentType: ConsentType) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONSENT_GRANT, { consentType });
  },

  // Revoke consent
  revokeConsent: (consentType: ConsentType) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONSENT_REVOKE, { consentType });
  },

  // Check if user has consent
  hasConsent: (consentType: ConsentType) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONSENT_HAS_CONSENT, { consentType });
  },

  // Get all user consents
  getUserConsents: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONSENT_GET_USER_CONSENTS, {});
  },
};

// UI Error Logging API
const errorLoggingAPI = {
  // Log UI errors to main process for audit logging
  logUIError: (errorData: Record<string, unknown>) => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOG_UI_ERROR, { errorData });
  },
};

// Combine case, AI, model, file, conversation, profile, facts, GDPR, authentication, consent, and error logging APIs
const fullAPI = {
  ...justiceAPI,
  ...aiAPI,
  ...modelAPI,
  ...fileAPI,
  ...conversationAPI,
  ...profileAPI,
  ...factsAPI,
  ...gdprAPI,
  ...authAPI,
  ...consentAPI,
  ...errorLoggingAPI,
};

// Expose combined API to window object with type safety
contextBridge.exposeInMainWorld('justiceAPI', fullAPI);

console.log('[Preload] justiceAPI exposed successfully with methods:', Object.keys(fullAPI));

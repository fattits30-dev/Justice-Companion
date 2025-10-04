import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../src/types/ipc';
import type { JusticeCompanionAPI } from '../src/types/ipc';
import type { CreateCaseInput, UpdateCaseInput } from '../src/models/Case';

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
};

// AI API methods
const aiAPI = {
  // Check AI connection status
  checkAIStatus: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CHECK_STATUS, {});
  },

  // Send chat message (non-streaming)
  aiChat: (request: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, request);
  },

  // Start streaming chat
  aiStreamStart: (request: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI_STREAM_START, request);
  },

  // Listen for streaming tokens
  onAIStreamToken: (callback: (token: string) => void) => {
    const handler = (_: any, token: string) => {
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
    const handler = (_: any, token: string) => {
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
    const handler = (_: any, sources: string[]) => {
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
    const handler = (_: any, error: string) => callback(error);
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_ERROR, handler);
  },

  // Listen for status updates (RAG progress)
  onAIStatusUpdate: (callback: (status: string) => void) => {
    const handler = (_: any, status: string) => {
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
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_: any, progress: any) => callback(progress);
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
  selectFile: (request?: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT, request);
  },

  // Upload and process a file
  uploadFile: (filePath: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_UPLOAD, { filePath });
  },
};

// Chat Conversation API methods
const conversationAPI = {
  // Create a new conversation
  createConversation: (input: any) => {
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
  addMessage: (input: any) => {
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
  updateUserProfile: (input: any) => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, { input });
  },
};

// Combine case, AI, model, file, conversation, and profile APIs
const fullAPI = {
  ...justiceAPI,
  ...aiAPI,
  ...modelAPI,
  ...fileAPI,
  ...conversationAPI,
  ...profileAPI,
};

// Expose combined API to window object with type safety
contextBridge.exposeInMainWorld('justiceAPI', fullAPI);

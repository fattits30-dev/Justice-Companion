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
};

// Combine case and AI APIs
const fullAPI = {
  ...justiceAPI,
  ...aiAPI,
};

// Expose combined API to window object with type safety
contextBridge.exposeInMainWorld('justiceAPI', fullAPI);

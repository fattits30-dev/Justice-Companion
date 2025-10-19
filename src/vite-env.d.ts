/// <reference types="vite/client" />

/**
 * Type definitions for Electron IPC API exposed to renderer process
 * These must match the types defined in electron/preload.ts
 */

import type { IpcRendererEvent } from 'electron';
import type { CaseFact } from './models/CaseFact';
import type { UserFact } from './models/UserFact';
import type { LegalIssue } from './models/LegalIssue';
import type { Note } from './models/Note';
import type { TimelineEvent } from './models/TimelineEvent';

// Auth types
interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResponse {
  success: boolean;
  data?: {
    userId: number;
    sessionId: string;
    username: string;
  };
  error?: string;
}

interface SessionResponse {
  success: boolean;
  data?: {
    userId: number;
    username: string;
    email: string;
  };
  error?: string;
}

// Generic IPC response types
interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Case types
interface CreateCaseData {
  title: string;
  caseType: string;
  status: string;
  description?: string;
}

interface UpdateCaseData {
  title?: string;
  status?: string;
  description?: string;
}

// Evidence types
interface EvidenceUploadData {
  file: File;
  description?: string;
}

// Chat types
interface ChatSendData {
  message: string;
  caseId?: number;
}

// Migration types
interface MigrationStatusData {
  currentVersion: number;
  latestVersion: number;
  pendingMigrations: number;
}

/**
 * Electron API interface exposed via contextBridge
 */
interface ElectronAPI {
  // Authentication
  auth: {
    register: (data: RegisterData) => Promise<AuthResponse>;
    login: (data: LoginData) => Promise<AuthResponse>;
    logout: (sessionId: string) => Promise<IpcResponse>;
    getSession: (sessionId: string) => Promise<SessionResponse>;
  };

  // Cases
  cases: {
    create: (data: CreateCaseData) => Promise<IpcResponse>;
    list: () => Promise<IpcResponse>;
    get: (id: number) => Promise<IpcResponse>;
    update: (id: number, data: UpdateCaseData) => Promise<IpcResponse>;
    delete: (id: number) => Promise<IpcResponse>;
  };

  // Case Facts
  caseFacts: {
    list: (caseId: number) => Promise<IpcResponse<CaseFact[]>>;
    listByCategory: (caseId: number, category: string) => Promise<IpcResponse<CaseFact[]>>;
    listByImportance: (caseId: number, importance: string) => Promise<IpcResponse<CaseFact[]>>;
    create: (data: unknown) => Promise<IpcResponse<CaseFact>>;
    update: (id: number, data: unknown) => Promise<IpcResponse<CaseFact>>;
    delete: (id: number) => Promise<IpcResponse<void>>;
    search: (caseId: number, query: string) => Promise<IpcResponse<CaseFact[]>>;
  };

  // User Facts
  userFacts: {
    list: (caseId?: number) => Promise<IpcResponse<UserFact[]>>;
    listByCategory: (category: string) => Promise<IpcResponse<UserFact[]>>;
    listByType: (caseId: number, factType: string) => Promise<IpcResponse<UserFact[]>>;
    create: (data: unknown) => Promise<IpcResponse<UserFact>>;
    update: (id: number, data: unknown) => Promise<IpcResponse<UserFact>>;
    delete: (id: number) => Promise<IpcResponse<void>>;
    search: (query: string) => Promise<IpcResponse<UserFact[]>>;
  };

  // Legal Issues
  legalIssues: {
    list: (caseId: number) => Promise<IpcResponse<LegalIssue[]>>;
    create: (data: unknown) => Promise<IpcResponse<LegalIssue>>;
    update: (id: number, data: unknown) => Promise<IpcResponse<LegalIssue>>;
    delete: (id: number) => Promise<IpcResponse<void>>;
  };

  // Notes
  notes: {
    list: (caseId: number) => Promise<IpcResponse<Note[]>>;
    create: (caseId: number, content: string) => Promise<IpcResponse<Note>>;
    update: (id: number, data: unknown) => Promise<IpcResponse<Note>>;
    delete: (id: number) => Promise<IpcResponse<void>>;
  };

  // Timeline
  timeline: {
    list: (caseId: number) => Promise<IpcResponse<TimelineEvent[]>>;
    create: (data: unknown) => Promise<IpcResponse<TimelineEvent>>;
    update: (id: number, data: unknown) => Promise<IpcResponse<TimelineEvent>>;
    delete: (id: number) => Promise<IpcResponse<void>>;
  };

  // Evidence
  evidence: {
    upload: (caseId: number, file: File) => Promise<IpcResponse>;
    list: (caseId: number) => Promise<IpcResponse>;
    delete: (id: number) => Promise<IpcResponse>;
  };

  // AI Chat
  chat: {
    send: (message: string, caseId?: number) => Promise<IpcResponse>;
    onStream: (callback: (event: IpcRendererEvent, data: string) => void) => void;
    offStream: () => void;
  };

  // Database
  db: {
    migrate: () => Promise<IpcResponse>;
    backup: () => Promise<IpcResponse>;
    status: () => Promise<IpcResponse<MigrationStatusData>>;
  };

  // GDPR
  gdpr: {
    export: () => Promise<IpcResponse>;
    delete: () => Promise<IpcResponse>;
  };
}

/**
 * Extend the global Window interface to include Electron API
 */
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};

/**
 * TypeScript declarations for Electron IPC APIs exposed via preload.ts
 */

import type { Note } from '../models/Note';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '../models/LegalIssue';
import type { TimelineEvent, CreateTimelineEventInput, UpdateTimelineEventInput } from '../models/TimelineEvent';
import type { UserFact, CreateUserFactInput, UpdateUserFactInput } from '../models/UserFact';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../models/CaseFact';

interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ElectronAPI {
  notes: {
    create: (caseId: number, content: string) => Promise<IPCResponse<Note>>;
    list: (caseId: number) => Promise<IPCResponse<Note[]>>;
    update: (id: number, content: string) => Promise<IPCResponse<Note>>;
    delete: (id: number) => Promise<IPCResponse<void>>;
  };

  legalIssues: {
    create: (input: CreateLegalIssueInput) => Promise<IPCResponse<LegalIssue>>;
    list: (caseId: number) => Promise<IPCResponse<LegalIssue[]>>;
    update: (id: number, input: UpdateLegalIssueInput) => Promise<IPCResponse<LegalIssue>>;
    delete: (id: number) => Promise<IPCResponse<void>>;
  };

  timeline: {
    create: (input: CreateTimelineEventInput) => Promise<IPCResponse<TimelineEvent>>;
    list: (caseId: number) => Promise<IPCResponse<TimelineEvent[]>>;
    update: (id: number, input: UpdateTimelineEventInput) => Promise<IPCResponse<TimelineEvent>>;
    delete: (id: number) => Promise<IPCResponse<void>>;
  };

  userFacts: {
    create: (input: CreateUserFactInput) => Promise<IPCResponse<UserFact>>;
    list: (caseId: number) => Promise<IPCResponse<UserFact[]>>;
    listByType: (caseId: number, factType: string) => Promise<IPCResponse<UserFact[]>>;
    update: (id: number, input: UpdateUserFactInput) => Promise<IPCResponse<UserFact>>;
    delete: (id: number) => Promise<IPCResponse<void>>;
  };

  caseFacts: {
    create: (input: CreateCaseFactInput) => Promise<IPCResponse<CaseFact>>;
    list: (caseId: number) => Promise<IPCResponse<CaseFact[]>>;
    listByCategory: (caseId: number, factCategory: string) => Promise<IPCResponse<CaseFact[]>>;
    listByImportance: (caseId: number, importance: string) => Promise<IPCResponse<CaseFact[]>>;
    update: (id: number, input: UpdateCaseFactInput) => Promise<IPCResponse<CaseFact>>;
    delete: (id: number) => Promise<IPCResponse<void>>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};

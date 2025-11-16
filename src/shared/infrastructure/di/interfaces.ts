/**
 * Dependency Injection Interfaces
 *
 * Defines interfaces for all repositories and services to enable
 * proper dependency injection and testing.
 */

import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
} from "../../../domains/cases/entities/Case.ts";
import type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../../../domains/evidence/entities/Evidence.ts";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
} from "../../../domains/auth/entities/User.ts";
import type { Session } from "../../../domains/auth/entities/Session.ts";
import type {
  UserProfile,
  UpdateUserProfileInput,
} from "../../../domains/settings/entities/UserProfile.ts";
import type {
  ChatConversation,
  CreateConversationInput,
} from "../../../models/ChatConversation.ts";
import type {
  Consent,
  ConsentType,
} from "../../../domains/settings/entities/Consent.ts";
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
} from "../../../models/Note.ts";
import type {
  LegalIssue,
  CreateLegalIssueInput,
  UpdateLegalIssueInput,
} from "../../../domains/legal-research/entities/LegalIssue.ts";
import type {
  TimelineEvent,
  CreateTimelineEventInput,
  UpdateTimelineEventInput,
} from "../../../domains/timeline/entities/TimelineEvent.ts";
import type {
  CaseFact,
  CreateCaseFactInput,
  UpdateCaseFactInput,
} from "../../../domains/cases/entities/CaseFact.ts";
import type {
  UserFact,
  CreateUserFactInput,
  UpdateUserFactInput,
} from "../../../models/UserFact.ts";
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
  DeadlineWithCase,
} from "../../../domains/timeline/entities/Deadline.ts";
import type {
  AuditLog,
  CreateAuditLogInput,
} from "../../../models/AuditLog.ts";
import type { PaginatedResult } from "../../../types/pagination.ts";
import type {
  GdprExportResult,
  GdprDeleteResult,
} from "../../../models/Gdpr.ts";

// Additional type definitions needed for interfaces
export interface CaseSearchCriteria {
  userId?: number;
  status?: string;
  searchTerm?: string;
}

export interface CaseWithEvidence extends Case {
  evidence: Evidence[];
}

export interface UserWithProfile extends User {
  profile: UserProfile | null;
}

export interface CreateUserProfileInput {
  userId: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateChatConversationInput {
  title?: string;
  lastMessage?: string;
}

export interface CreateChatConversationInput {
  userId: number;
  title: string;
  lastMessage?: string;
}

export interface UpdateChatConversationInput {
  title?: string;
  lastMessage?: string;
}

export interface AuditLogRepository {
  createAuditLog(input: CreateAuditLogInput): Promise<AuditLog>;
  getAuditLogsByUserId(userId: number): Promise<AuditLog[]>;
  getAuditLogsByEntityId(entityId: number): Promise<AuditLog[]>;
  getAuditLogById(id: number): Promise<AuditLog | null>;
}

export interface UserRepository {
  createUser(input: CreateUserInput): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: number, input: UpdateUserInput): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsers(): Promise<User[]>;
  getUserWithProfile(id: number): Promise<UserWithProfile | null>;
}

export interface UserProfileRepository {
  createUserProfile(input: CreateUserProfileInput): Promise<UserProfile>;
  getUserProfileByUserId(userId: number): Promise<UserProfile | null>;
  updateUserProfile(
    userId: number,
    input: UpdateUserProfileInput,
  ): Promise<UserProfile>;
  deleteUserProfile(userId: number): Promise<void>;
}

export interface CaseRepository {
  createCase(input: CreateCaseInput): Promise<Case>;
  getCaseById(id: number): Promise<Case | null>;
  updateCase(id: number, input: UpdateCaseInput): Promise<Case>;
  deleteCase(id: number): Promise<void>;
  getCasesByUserId(userId: number): Promise<Case[]>;
  searchCases(criteria: CaseSearchCriteria): Promise<PaginatedResult<Case>>;
  getCaseWithEvidence(id: number): Promise<CaseWithEvidence | null>;
}

export interface EvidenceRepository {
  createEvidence(input: CreateEvidenceInput): Promise<Evidence>;
  getEvidenceById(id: number): Promise<Evidence | null>;
  updateEvidence(id: number, input: UpdateEvidenceInput): Promise<Evidence>;
  deleteEvidence(id: number): Promise<void>;
  getEvidenceByCaseId(caseId: number): Promise<Evidence[]>;
}

export interface ChatConversationRepository {
  createConversation(input: CreateConversationInput): Promise<ChatConversation>;
  getConversationById(id: number): Promise<ChatConversation | null>;
  updateConversation(
    id: number,
    input: UpdateChatConversationInput,
  ): Promise<ChatConversation>;
  deleteConversation(id: number): Promise<void>;
  getConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getConversationWithMessages(
    conversationId: number,
  ): Promise<ChatConversation | null>;
}

export interface ConsentRepository {
  createConsent(consentType: ConsentType, userId: number): Promise<Consent>;
  getConsentByTypeAndUserId(
    consentType: ConsentType,
    userId: number,
  ): Promise<Consent | null>;
  updateConsent(
    consentType: ConsentType,
    userId: number,
    consented: boolean,
  ): Promise<Consent>;
  deleteConsent(consentType: ConsentType, userId: number): Promise<void>;
  getAllConsentsByUserId(userId: number): Promise<Consent[]>;
}

export interface NoteRepository {
  createNote(input: CreateNoteInput): Promise<Note>;
  getNoteById(id: number): Promise<Note | null>;
  updateNote(id: number, input: UpdateNoteInput): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  getNotesByCaseId(caseId: number): Promise<Note[]>;
  getNotesByUserId(userId: number): Promise<Note[]>;
}

export interface LegalIssueRepository {
  createLegalIssue(input: CreateLegalIssueInput): Promise<LegalIssue>;
  getLegalIssueById(id: number): Promise<LegalIssue | null>;
  updateLegalIssue(
    id: number,
    input: UpdateLegalIssueInput,
  ): Promise<LegalIssue>;
  deleteLegalIssue(id: number): Promise<void>;
  getLegalIssuesByCaseId(caseId: number): Promise<LegalIssue[]>;
}

export interface TimelineEventRepository {
  createTimelineEvent(input: CreateTimelineEventInput): Promise<TimelineEvent>;
  getTimelineEventById(id: number): Promise<TimelineEvent | null>;
  updateTimelineEvent(
    id: number,
    input: UpdateTimelineEventInput,
  ): Promise<TimelineEvent>;
  deleteTimelineEvent(id: number): Promise<void>;
  getTimelineEventsByCaseId(caseId: number): Promise<TimelineEvent[]>;
}

export interface CaseFactRepository {
  createCaseFact(input: CreateCaseFactInput): Promise<CaseFact>;
  getCaseFactById(id: number): Promise<CaseFact | null>;
  updateCaseFact(id: number, input: UpdateCaseFactInput): Promise<CaseFact>;
  deleteCaseFact(id: number): Promise<void>;
  getCaseFactsByCaseId(caseId: number): Promise<CaseFact[]>;
}

export interface UserFactRepository {
  createUserFact(input: CreateUserFactInput): Promise<UserFact>;
  getUserFactById(id: number): Promise<UserFact | null>;
  updateUserFact(id: number, input: UpdateUserFactInput): Promise<UserFact>;
  deleteUserFact(id: number): Promise<void>;
  getUserFactsByUserId(userId: number): Promise<UserFact[]>;
}

export interface DeadlineRepository {
  createDeadline(input: CreateDeadlineInput): Promise<Deadline>;
  getDeadlineById(id: number): Promise<Deadline | null>;
  updateDeadline(id: number, input: UpdateDeadlineInput): Promise<Deadline>;
  deleteDeadline(id: number): Promise<void>;
  getDeadlinesByCaseId(caseId: number): Promise<Deadline[]>;
  getDeadlinesByUserId(userId: number): Promise<Deadline[]>;
  getUpcomingDeadlines(limit?: number): Promise<DeadlineWithCase[]>;
}

export interface GdprRepository {
  exportUserData(userId: number): Promise<GdprExportResult>;
  deleteUserData(userId: number): Promise<GdprDeleteResult>;
}

export interface SessionRepository {
  createSession(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | null>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
}

// Re-export service interfaces from service-interfaces.ts
export type {
  IAuditLogger,
  IAuthenticationService,
  IEncryptionService,
  ICacheService,
  IRateLimitService,
  ICaseService,
  IChatConversationService,
  IUserProfileService,
  IGdprService,
  ILegalAPIService,
} from "./service-interfaces.ts";

// Re-export IDatabase from interfaces directory
export type { IDatabase } from "../../../interfaces/IDatabase.ts";

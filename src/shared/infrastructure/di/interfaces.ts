/**
 * Dependency Injection Interfaces
 *
 * Defines interfaces for all repositories and services to enable
 * proper dependency injection and testing.
 */

import type Database from 'better-sqlite3';
import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
} from '../../../domains/cases/entities/Case.ts';
import type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from '../../../domains/evidence/entities/Evidence.ts';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
} from '../../../domains/auth/entities/User.ts';
import type { Session } from '../../../domains/auth/entities/Session.ts';
import type {
  UserProfile,
  UpdateUserProfileInput,
} from '../../../domains/settings/entities/UserProfile.ts';
import type {
  ChatConversation,
  CreateConversationInput,
} from '../../../models/ChatConversation.ts';
import type { Consent, ConsentType } from '../../../domains/settings/entities/Consent.ts';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../../../models/Note.ts';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '../../../domains/legal-research/entities/LegalIssue.ts';
import type { TimelineEvent, CreateTimelineEventInput, UpdateTimelineEventInput } from '../../../domains/timeline/entities/TimelineEvent.ts';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../../../domains/cases/entities/CaseFact.ts';
import type { UserFact, CreateUserFactInput, UpdateUserFactInput } from '../../../models/UserFact.ts';
import type { Deadline, CreateDeadlineInput, UpdateDeadlineInput, DeadlineWithCase } from '../../../domains/timeline/entities/Deadline.ts';
import type { AuditEvent, AuditLog, CreateAuditLogInput } from '../../../models/AuditLog.ts';
import type { PaginatedResult } from '../../../types/pagination.ts';
import type { GdprExportResult, GdprDeleteResult } from '../../../models/Gdpr.ts';

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
  caseId?: number | null;
  title: string;
  messages: string;
}

export interface ConsentRecord extends Consent {
  timestamp: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTimelineInput {
  caseId: number;
  title: string;
  description?: string;
  date: string;
}

export interface UpdateTimelineInput {
  title?: string;
  description?: string;
  date?: string;
}

// ==========================================
// Infrastructure Interfaces
// ==========================================

export interface IDatabase extends Database.Database {}

export interface IEncryptionService {
  encrypt(plainText: string): string;
  decrypt(encryptedData: string): string;
  encryptBatch(texts: string[]): string[];
  decryptBatch(encryptedTexts: string[]): string[];
  getEncryptedFieldsForTable(tableName: string): string[];
}

export interface IAuditLogger {
  log(input: CreateAuditLogInput): AuditLog;
  getLogsForUser(userId: string, limit?: number): AuditLog[];
  getLogsForResource(resourceType: string, resourceId: string, limit?: number): AuditLog[];
  verifyIntegrity(): boolean;
}

export interface IKeyManager {
  getKey(): Buffer;
  migrateFromEnv(envKey: string): void;
  generateNewKey(): string;
  rotateKey(): void;
  clearCache(): void;
}

// ==========================================
// Repository Interfaces (Data Access Layer)
// ==========================================

export interface ICaseRepository {
  findById(id: number): Case | null;
  findAll(): Case[];
  findByUserId(userId: number): Case[];
  findWithEvidence(id: number): CaseWithEvidence | null;
  search(criteria: CaseSearchCriteria): Case[];
  create(input: CreateCaseInput): Case;
  update(id: number, input: UpdateCaseInput): Case | null;
  delete(id: number): boolean;
  getStats(userId: number): { total: number; active: number; closed: number };
}

export interface IEvidenceRepository {
  findById(id: number): Evidence | null;
  findByCaseId(caseId: number): Evidence[];
  findByUserId(userId: number): Evidence[];
  create(input: CreateEvidenceInput): Evidence;
  update(id: number, input: UpdateEvidenceInput): Evidence | null;
  delete(id: number): boolean;
}

export interface IUserRepository {
  findById(id: number): User | null;
  findByEmail(email: string): User | null;
  findAll(): User[];
  findWithProfile(id: number): UserWithProfile | null;
  create(input: CreateUserInput): User;
  update(id: number, input: UpdateUserInput): User | null;
  delete(id: number): boolean;
  verifyPassword(user: User, password: string): boolean;
}

export interface ISessionRepository {
  findById(id: string): Session | null;
  findByUserId(userId: number): Session[];
  findActiveByUserId(userId: number): Session | null;
  create(userId: number): Session;
  refresh(id: string): Session | null;
  revoke(id: string): boolean;
  revokeAllForUser(userId: number): number;
  cleanupExpired(): number;
}

export interface IUserProfileRepository {
  findByUserId(userId: number): UserProfile | null;
  create(input: CreateUserProfileInput): UserProfile;
  update(userId: number, input: UpdateUserProfileInput): UserProfile | null;
  delete(userId: number): boolean;
}

export interface IChatConversationRepository {
  findById(id: number): ChatConversation | null;
  findByUserId(userId: number): ChatConversation[];
  findByCaseId(caseId: number): ChatConversation[];
  create(input: CreateChatConversationInput): ChatConversation;
  update(id: number, input: UpdateChatConversationInput): ChatConversation | null;
  delete(id: number): boolean;
}

export interface IConsentRepository {
  findByUserId(userId: number): Consent[];
  getActiveConsents(userId: number): ConsentRecord[];
  hasConsent(userId: number, consentType: string): boolean;
  grantConsent(userId: number, consentType: string): Consent;
  revokeConsent(userId: number, consentType: string): boolean;
}

export interface INotesRepository {
  findById(id: number): Note | null;
  findByCaseId(caseId: number): Note[];
  findByUserId(userId: number): Note[];
  create(input: CreateNoteInput): Note;
  update(id: number, input: UpdateNoteInput): Note | null;
  delete(id: number): boolean;
}

export interface ILegalIssuesRepository {
  findById(id: number): LegalIssue | null;
  findByCaseId(caseId: number): LegalIssue[];
  findByUserId(userId: number): LegalIssue[];
  create(input: CreateLegalIssueInput): LegalIssue;
  update(id: number, input: UpdateLegalIssueInput): LegalIssue | null;
  delete(id: number): boolean;
}

export interface ITimelineRepository {
  findById(id: number): TimelineEvent | null;
  findByCaseId(caseId: number): TimelineEvent[];
  findByUserId(userId: number): TimelineEvent[];
  create(input: CreateTimelineInput): TimelineEvent;
  update(id: number, input: UpdateTimelineInput): TimelineEvent | null;
  delete(id: number): boolean;
}

export interface ICaseFactsRepository {
  findById(id: number): CaseFact | null;
  findByCaseId(caseId: number): CaseFact[];
  create(input: CreateCaseFactInput): CaseFact;
  update(id: number, input: UpdateCaseFactInput): CaseFact | null;
  delete(id: number): boolean;
}

export interface IUserFactsRepository {
  findById(id: number): UserFact | null;
  findByUserId(userId: number): UserFact[];
  create(input: CreateUserFactInput): UserFact;
  update(id: number, input: UpdateUserFactInput): UserFact | null;
  delete(id: number): boolean;
}

export interface IDeadlineRepository {
  findById(id: number): Deadline | null;
  findByCaseId(caseId: number, userId: number): Deadline[];
  findByUserId(userId: number): DeadlineWithCase[];
  findUpcoming(userId: number, limit?: number): DeadlineWithCase[];
  findOverdue(userId: number): DeadlineWithCase[];
  create(input: CreateDeadlineInput): Deadline;
  update(id: number, userId: number, input: UpdateDeadlineInput): Deadline | null;
  markCompleted(id: number, userId: number): Deadline | null;
  markUpcoming(id: number, userId: number): Deadline | null;
  delete(id: number, userId: number): boolean;
  checkAndUpdateOverdue(): number;
  getStats(userId: number): {
    total: number;
    upcoming: number;
    overdue: number;
    completed: number;
  };
}

// ==========================================
// Service Interfaces (Business Logic Layer)
// ==========================================

export interface ICaseService {
  createCase(input: CreateCaseInput & { userId: number }): Case;
  getAllCases(): Case[];
  getCaseById(id: number): Case | null;
  updateCase(id: number, input: UpdateCaseInput): Case | null;
  closeCase(id: number): Case | null;
  deleteCase(id: number): boolean;
}

export interface IAuthenticationService {
  register(email: string, password: string, username?: string): Promise<User>;
  login(email: string, password: string): Promise<{ user: User; session: Session }>;
  logout(sessionId: string): Promise<boolean>;
  validateSession(sessionId: string): Promise<Session | null>;
  refreshSession(sessionId: string): Promise<Session | null>;
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
}

export interface IUserProfileService {
  getProfile(userId: number): UserProfile | null;
  createProfile(input: CreateUserProfileInput): UserProfile;
  updateProfile(userId: number, input: UpdateUserProfileInput): UserProfile | null;
  deleteProfile(userId: number): boolean;
}

export interface IConsentService {
  getConsents(userId: number): Consent[];
  hasConsent(userId: number, consentType: string): boolean;
  grantConsent(userId: number, consentType: string): Consent;
  revokeConsent(userId: number, consentType: string): boolean;
  requireConsent(userId: number, consentType: string): void;
}

export interface IChatConversationService {
  createConversation(input: any): any;
  getConversation(id: number): any | null;
  deleteConversation(id: number): boolean;
}

export interface ILegalAPIService {
  searchLegislation(query: string): Promise<any>;
  searchCaseLaw(query: string): Promise<any>;
  searchKnowledgeBase(query: string): Promise<any>;
  searchAll(query: string): Promise<any>;
}

export interface IGdprService {
  exportUserData(
    userId: number,
    options?: { format?: 'json' | 'csv'; outputPath?: string }
  ): Promise<GdprExportResult>;
  deleteUserData(
    userId: number,
    options?: { confirmed?: boolean; exportBeforeDelete?: boolean; reason?: string }
  ): Promise<GdprDeleteResult>;
  getDataRetentionPolicy(): { description: string; retentionDays: number };
  anonymizeUserData(userId: number): Promise<boolean>;
}

export interface ICacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  getStats(): { hits: number; misses: number; size: number };
}

export interface IRateLimitService {
  checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: Date };
  checkRateLimit(identifier: string): {
    allowed: boolean;
    remainingTime?: number;
    attemptsRemaining?: number;
    message?: string;
  };
  recordFailedAttempt(identifier: string): void;
  clearAttempts(identifier: string): void;
  consume(key: string): void;
  reset(key: string): void;
}

// ==========================================
// Paginated Repository Interfaces
// ==========================================

export interface IPaginatedRepository<T, TCreate, TUpdate> {
  findPaginated(options: PaginationOptions): Promise<PaginatedResult<T>>;
  findById(id: number): T | null;
  create(input: TCreate): T;
  update(id: number, input: TUpdate): T | null;
  delete(id: number): boolean;
}

export interface ICaseRepositoryPaginated
  extends IPaginatedRepository<Case, CreateCaseInput, UpdateCaseInput> {
  findByUserIdPaginated(
    userId: number,
    options: PaginationOptions
  ): Promise<PaginatedResult<Case>>;
  searchPaginated(
    criteria: CaseSearchCriteria,
    options: PaginationOptions
  ): Promise<PaginatedResult<Case>>;
}

// ==========================================
// Factory Interfaces
// ==========================================

export interface IRepositoryFactory {
  createCaseRepository(): ICaseRepository;
  createEvidenceRepository(): IEvidenceRepository;
  createUserRepository(): IUserRepository;
  createSessionRepository(): ISessionRepository;
  createUserProfileRepository(): IUserProfileRepository;
  createChatConversationRepository(): IChatConversationRepository;
  createConsentRepository(): IConsentRepository;
  createNotesRepository(): INotesRepository;
  createLegalIssuesRepository(): ILegalIssuesRepository;
  createTimelineRepository(): ITimelineRepository;
  createCaseFactsRepository(): ICaseFactsRepository;
  createUserFactsRepository(): IUserFactsRepository;
  createDeadlineRepository(): IDeadlineRepository;
}

export interface IServiceFactory {
  createCaseService(): ICaseService;
  createAuthenticationService(): IAuthenticationService;
  createUserProfileService(): IUserProfileService;
  createConsentService(): IConsentService;
  createChatConversationService(): IChatConversationService;
  createGdprService(): IGdprService;
  createCacheService(): ICacheService;
  createRateLimitService(): IRateLimitService;
}
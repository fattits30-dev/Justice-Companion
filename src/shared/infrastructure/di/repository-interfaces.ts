/**
 * Repository Interface Definitions for Dependency Injection
 *
 * This file contains TypeScript interfaces for all repository classes in the system.
 * These interfaces enable proper dependency injection with compile-time type safety.
 *
 * Key Benefits:
 * - Decouples business logic from concrete implementations
 * - Enables easy mocking for testing
 * - Supports runtime injection of different implementations (cached vs non-cached)
 * - Enforces consistent method signatures across implementations
 *
 * Usage:
 * ```typescript
 * class MyService {
 *   constructor(private caseRepo: ICaseRepository) {}
 *
 *   getCases() {
 *     return this.caseRepo.findAll();
 *   }
 * }
 * ```
 */

import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
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
import type {
  Session,
  CreateSessionInput,
} from "../../../domains/auth/entities/Session.ts";
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
  DeadlineWithCase,
} from "../../../domains/timeline/entities/Deadline.ts";
import type {
  ChatConversation,
  ChatMessage,
  ConversationWithMessages,
  CreateConversationInput,
  CreateMessageInput,
} from "../../../models/ChatConversation.ts";
import type {
  Consent,
  CreateConsentInput,
  ConsentType,
} from "../../../domains/settings/entities/Consent.ts";
import type { PaginatedResult } from "../../../types/pagination.ts";

// =============================================================================
// CORE REPOSITORY INTERFACES
// =============================================================================

/**
 * Interface for CaseRepository
 * Manages legal case entities with encryption support for sensitive data
 */
export interface ICaseRepository {
  /**
   * Create a new case
   * @param input - Case creation data
   * @returns Created case with encrypted fields
   */
  create(input: CreateCaseInput): Case;

  /**
   * Find case by ID
   * @param id - Case ID
   * @returns Case with decrypted fields, or null if not found
   */
  findById(id: number): Case | null;

  /**
   * Find all cases belonging to a specific user
   * @param userId - User ID
   * @returns Array of cases with decrypted fields
   */
  findByUserId(userId: number): Case[];

  /**
   * Find all cases with optional status filter
   * @param status - Optional status filter ('active', 'closed', 'pending')
   * @returns Array of cases with decrypted fields
   */
  findAll(status?: CaseStatus): Case[];

  /**
   * Update case fields
   * @param id - Case ID
   * @param input - Fields to update
   * @returns Updated case, or null if not found
   */
  update(id: number, input: UpdateCaseInput): Case | null;

  /**
   * Delete case (cascades to related records via foreign keys)
   * @param id - Case ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  /**
   * Close a case (sets status to 'closed')
   * @param id - Case ID
   * @returns Updated case, or null if not found
   */
  close(id: number): Case | null;

  /**
   * Get case count grouped by status
   * @returns Object with counts for each status
   */
  countByStatus(): Record<CaseStatus, number>;

  /**
   * Get case statistics (total count + status breakdown)
   * @returns Statistics object
   */
  getStatistics(): {
    totalCases: number;
    statusCounts: Record<CaseStatus, number>;
  };
}

/**
 * Interface for EvidenceRepository
 * Manages evidence (documents, photos, emails, recordings, notes) with encryption
 */
export interface IEvidenceRepository {
  /**
   * Create new evidence with encrypted content
   * @param input - Evidence creation data
   * @returns Created evidence with encrypted content
   */
  create(input: CreateEvidenceInput): Evidence;

  /**
   * Find evidence by ID with decrypted content
   * @param id - Evidence ID
   * @returns Evidence with decrypted content, or null if not found
   */
  findById(id: number): Evidence | null;

  /**
   * Find all evidence belonging to a specific user
   * @param userId - User ID
   * @returns Array of evidence with decrypted content
   */
  findByUserId(userId: number): Evidence[];

  /**
   * Find all evidence for a case with decrypted content
   * @deprecated Use findByCaseIdPaginated for better performance
   * @param caseId - Case ID
   * @returns Array of evidence with decrypted content
   */
  findByCaseId(caseId: number): Evidence[];

  /**
   * Find evidence for a case with cursor-based pagination
   * @param caseId - Case ID to filter by
   * @param limit - Maximum number of items to return (default: 50)
   * @param cursor - Opaque cursor string for pagination (null for first page)
   * @returns Paginated result with evidence items and cursor metadata
   */
  findByCaseIdPaginated(
    caseId: number,
    limit?: number,
    cursor?: string | null,
  ): PaginatedResult<Evidence>;

  /**
   * Find all evidence with optional type filter
   * @deprecated Use findAllPaginated for better performance
   * @param evidenceType - Optional type filter
   * @returns Array of evidence with decrypted content
   */
  findAll(evidenceType?: string): Evidence[];

  /**
   * Find all evidence with cursor-based pagination
   * @param evidenceType - Optional type filter
   * @param limit - Maximum number of items to return (default: 50)
   * @param cursor - Opaque cursor string for pagination
   * @returns Paginated result with evidence items and cursor metadata
   */
  findAllPaginated(
    evidenceType?: string,
    limit?: number,
    cursor?: string | null,
  ): PaginatedResult<Evidence>;

  /**
   * Update evidence with encrypted content
   * @param id - Evidence ID
   * @param input - Fields to update
   * @returns Updated evidence, or null if not found
   */
  update(id: number, input: UpdateEvidenceInput): Evidence | null;

  /**
   * Delete evidence
   * @param id - Evidence ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  /**
   * Count evidence by case
   * @param caseId - Case ID
   * @returns Count of evidence items
   */
  countByCase(caseId: number): number;

  /**
   * Count evidence by type
   * @param caseId - Optional case ID filter
   * @returns Object with counts for each evidence type
   */
  countByType(caseId?: number): Record<string, number>;
}

/**
 * Interface for UserRepository
 * Handles user CRUD operations and password management
 */
export interface IUserRepository {
  /**
   * Create a new user
   * @param input - User creation data (with hashed password)
   * @returns Created user
   */
  create(input: CreateUserInput): User;

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User or null if not found
   */
  findById(id: number): User | null;

  /**
   * Find user by username
   * @param username - Username
   * @returns User or null if not found
   */
  findByUsername(username: string): User | null;

  /**
   * Find user by email
   * @param email - Email address
   * @returns User or null if not found
   */
  findByEmail(email: string): User | null;

  /**
   * Find all users
   * @returns Array of all users
   */
  findAll(): User[];

  /**
   * Update user details
   * @param id - User ID
   * @param input - Fields to update
   * @returns Updated user, or null if not found
   */
  update(id: number, input: UpdateUserInput): User | null;

  /**
   * Update user password
   * @param id - User ID
   * @param passwordHash - New password hash
   * @param passwordSalt - New password salt
   */
  updatePassword(id: number, passwordHash: string, passwordSalt: string): void;

  /**
   * Update last login timestamp
   * @param id - User ID
   */
  updateLastLogin(id: number): void;

  /**
   * Update user active status
   * @param id - User ID
   * @param isActive - Active status
   */
  updateActiveStatus(id: number, isActive: boolean): void;

  /**
   * Delete user
   * @param id - User ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;
}

/**
 * Interface for SessionRepository
 * Manages user authentication sessions with caching
 */
export interface ISessionRepository {
  /**
   * Create a new session
   * @param input - Session creation data
   * @returns Created session
   */
  create(input: CreateSessionInput): Session;

  /**
   * Find session by ID (with caching)
   * @param id - Session ID (UUID)
   * @returns Session or null if not found/expired
   */
  findById(id: string): Session | null;

  /**
   * Find all sessions for a user
   * @param userId - User ID
   * @returns Array of sessions
   */
  findByUserId(userId: number): Session[];

  /**
   * Delete a session (logout)
   * @param id - Session ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean;

  /**
   * Delete all sessions for a user
   * @param userId - User ID
   * @returns Number of sessions deleted
   */
  deleteByUserId(userId: number): number;

  /**
   * Delete expired sessions (cleanup)
   * @returns Number of sessions deleted
   */
  deleteExpired(): number;

  /**
   * Check if a session is expired
   * @param session - Session object
   * @returns true if expired, false otherwise
   */
  isExpired(session: Session): boolean;

  /**
   * Get count of active sessions for a user
   * @param userId - User ID
   * @returns Count of active (non-expired) sessions
   */
  countActiveSessionsByUserId(userId: number): number;
}

/**
 * Interface for DeadlineRepository
 * Manages legal deadlines/milestones with timeline support
 */
export interface IDeadlineRepository {
  /**
   * Create a new deadline
   * @param input - Deadline creation data
   * @returns Created deadline
   */
  create(input: CreateDeadlineInput): Deadline;

  /**
   * Find deadline by ID
   * @param id - Deadline ID
   * @returns Deadline or null if not found
   */
  findById(id: number): Deadline | null;

  /**
   * Find all deadlines for a case
   * @param caseId - Case ID
   * @returns Array of deadlines
   */
  findByCaseId(caseId: number): Deadline[];

  /**
   * Find all deadlines for a user
   * @param userId - User ID
   * @returns Array of deadlines
   */
  findByUserId(userId: number): Deadline[];

  /**
   * Find upcoming deadlines (not completed, future dates)
   * @param userId - User ID
   * @param limit - Optional limit
   * @returns Array of upcoming deadlines
   */
  findUpcoming(userId: number, limit?: number): DeadlineWithCase[];

  /**
   * Find overdue deadlines (not completed, past dates)
   * @param userId - User ID
   * @returns Array of overdue deadlines
   */
  findOverdue(userId: number): DeadlineWithCase[];

  /**
   * Update deadline fields
   * @param id - Deadline ID
   * @param input - Fields to update
   * @returns Updated deadline, or null if not found
   */
  update(id: number, input: UpdateDeadlineInput): Deadline | null;

  /**
   * Mark deadline as completed
   * @param id - Deadline ID
   * @returns Updated deadline, or null if not found
   */
  markCompleted(id: number): Deadline | null;

  /**
   * Delete deadline (soft delete)
   * @param id - Deadline ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;
}

/**
 * Interface for ChatConversationRepository
 * Manages AI chat conversations with encrypted message content
 */
export interface IChatConversationRepository {
  /**
   * Create a new conversation
   * @param input - Conversation creation data
   * @returns Created conversation
   */
  create(input: CreateConversationInput): ChatConversation;

  /**
   * Find conversation by ID
   * @param id - Conversation ID
   * @returns Conversation or null if not found
   */
  findById(id: number): ChatConversation | null;

  /**
   * Find all conversations for a user (optionally filtered by case)
   * @param userId - User ID
   * @param caseId - Optional case ID filter
   * @returns Array of conversations
   */
  findAll(userId: number, caseId?: number | null): ChatConversation[];

  /**
   * Get recent conversations for a user and case (limit 10)
   * @param userId - User ID
   * @param caseId - Case ID (or null for general conversations)
   * @param limit - Maximum number of conversations to return
   * @returns Array of recent conversations
   */
  findRecentByCase(
    userId: number,
    caseId: number | null,
    limit?: number,
  ): ChatConversation[];

  /**
   * Get conversation with all its messages (deprecated - use findWithMessagesPaginated)
   * @deprecated Use findWithMessagesPaginated for better performance with large conversations
   * @param conversationId - Conversation ID
   * @returns Conversation with messages array
   */
  findWithMessages(conversationId: number): ConversationWithMessages | null;

  /**
   * Get conversation with paginated messages using cursor pagination
   * @param conversationId - Conversation ID
   * @param limit - Maximum number of messages to return
   * @param cursor - Opaque cursor string for pagination
   * @returns Paginated result with conversation metadata and messages
   */
  findWithMessagesPaginated(
    conversationId: number,
    limit?: number,
    cursor?: string | null,
  ):
    | (ConversationWithMessages & {
        nextCursor: string | null;
        hasMore: boolean;
      })
    | null;

  /**
   * Delete conversation and all its messages (CASCADE)
   * @param id - Conversation ID
   */
  delete(id: number): void;

  /**
   * Add a message to a conversation
   * @param input - Message creation data
   * @returns Created message with decrypted content
   */
  addMessage(input: CreateMessageInput): ChatMessage;

  /**
   * Verify that a user owns a conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @returns true if the conversation exists and belongs to the user
   */
  verifyOwnership(conversationId: number, userId: number): boolean;

  // TODO: Add in Wave 3
  // findMessageById(id: number): ChatMessage | null;
  // updateTitle(id: number, title: string): ChatConversation | null;
}

/**
 * Interface for ConsentRepository
 * Manages GDPR consent records for data processing activities
 */
export interface IConsentRepository {
  /**
   * Create a new consent record
   * @param input - Consent creation data
   * @returns Created consent
   */
  create(input: CreateConsentInput): Consent;

  /**
   * Find consent by ID
   * @param id - Consent ID
   * @returns Consent or null if not found
   */
  findById(id: number): Consent | null;

  /**
   * Find active consent for user and type (non-revoked)
   * @param userId - User ID
   * @param consentType - Consent type
   * @returns Active consent or null if not found
   */
  findActiveConsent(userId: number, consentType: ConsentType): Consent | null;

  /**
   * List all consents for a user
   * @param userId - User ID
   * @returns Array of consents
   */
  listByUser(userId: number): Consent[];

  /**
   * Revoke a consent (GDPR Article 7.3)
   * @param id - Consent ID
   * @returns Updated consent or null if not found
   */
  revoke(id: number): Consent | null;

  /**
   * Delete a consent record
   * @param id - Consent ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  /**
   * Delete all consents for a user (GDPR Article 17)
   * @param userId - User ID
   * @returns Number of consents deleted
   */
  deleteByUserId(userId: number): number;

  // TODO: Add in Wave 3
  // hasActiveConsent(userId: number, consentType: ConsentType): boolean;
}

// =============================================================================
// CACHED REPOSITORY INTERFACES (extend base interfaces)
// =============================================================================

/**
 * Interface for CachedCaseRepository
 * Extends ICaseRepository with LRU caching for improved performance
 */
export interface ICachedCaseRepository extends ICaseRepository {
  /**
   * Clear cache for a specific case
   * @param id - Case ID
   */
  clearCache(id: number): void;

  /**
   * Clear all cached cases
   */
  clearAllCache(): void;
}

/**
 * Interface for CachedEvidenceRepository
 * Extends IEvidenceRepository with LRU caching for improved performance
 */
export interface ICachedEvidenceRepository extends IEvidenceRepository {
  /**
   * Clear cache for specific evidence
   * @param id - Evidence ID
   */
  clearCache(id: number): void;

  /**
   * Clear all cached evidence
   */
  clearAllCache(): void;
}

/**
 * Interface for CachedSessionRepository
 * Extends ISessionRepository with LRU caching for authentication performance
 */
export interface ICachedSessionRepository extends ISessionRepository {
  /**
   * Clear cache for specific session
   * @param id - Session ID
   */
  clearCache(id: string): void;

  /**
   * Clear all cached sessions
   */
  clearAllCache(): void;
}

/**
 * Interface for CachedUserProfileRepository
 * Extends IUserRepository with LRU caching for user profile lookups
 */
export interface ICachedUserProfileRepository extends IUserRepository {
  /**
   * Clear cache for specific user
   * @param id - User ID
   */
  clearCache(id: number): void;

  /**
   * Clear all cached user profiles
   */
  clearAllCache(): void;
}

// =============================================================================
// ADDITIONAL REPOSITORY INTERFACES
// =============================================================================

/**
 * Interface for CaseFactsRepository
 * Manages case facts with encryption
 */
export interface ICaseFactsRepository {
  /**
   * Create a new case fact
   * @param input - Case fact creation data
   * @returns Created case fact
   */
  create(input: unknown): unknown;

  /**
   * Find case fact by ID
   * @param id - Case fact ID
   * @returns Case fact or null if not found
   */
  findById(id: number): unknown | null;

  /**
   * Find all case facts for a case
   * @param caseId - Case ID
   * @returns Array of case facts
   */
  findByCaseId(caseId: number): unknown[];

  /**
   * Update case fact
   * @param id - Case fact ID
   * @param input - Fields to update
   * @returns Updated case fact, or null if not found
   */
  update(id: number, input: unknown): unknown | null;

  /**
   * Delete case fact
   * @param id - Case fact ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;
}

/**
 * Interface for NotesRepository
 * Manages case notes with encryption
 */
export interface INotesRepository {
  /**
   * Create a new note
   * @param input - Note creation data
   * @returns Created note with decrypted content
   */
  create(input: unknown): unknown;

  /**
   * Find note by ID
   * @param id - Note ID
   * @returns Note with decrypted content, or null if not found
   */
  findById(id: number): unknown | null;

  /**
   * Find all notes for a case
   * @param caseId - Case ID
   * @returns Array of notes with decrypted content
   */
  findByCaseId(caseId: number): unknown[];

  /**
   * Update note content
   * @param id - Note ID
   * @param input - Fields to update
   * @returns Updated note, or null if not found
   */
  update(id: number, input: unknown): unknown | null;

  /**
   * Delete note
   * @param id - Note ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  // TODO: Add in Wave 3
  // findByUserId(userId: number): unknown[];
}

/**
 * Interface for TimelineRepository
 * Manages timeline events with encryption
 */
export interface ITimelineRepository {
  /**
   * Create a new timeline event
   * @param input - Timeline event creation data
   * @returns Created timeline event
   */
  create(input: unknown): unknown;

  /**
   * Find timeline event by ID
   * @param id - Timeline event ID
   * @returns Timeline event or null if not found
   */
  findById(id: number): unknown | null;

  /**
   * Find all timeline events for a case
   * @param caseId - Case ID
   * @returns Array of timeline events
   */
  findByCaseId(caseId: number): unknown[];

  /**
   * Update timeline event
   * @param id - Timeline event ID
   * @param input - Fields to update
   * @returns Updated timeline event, or null if not found
   */
  update(id: number, input: unknown): unknown | null;

  /**
   * Delete timeline event
   * @param id - Timeline event ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  // TODO: Add in Wave 3
  // findByUserId(userId: number): unknown[];
}

/**
 * Interface for LegalIssuesRepository
 * Manages legal issues with encryption
 */
export interface ILegalIssuesRepository {
  /**
   * Create a new legal issue
   * @param input - Legal issue creation data
   * @returns Created legal issue
   */
  create(input: unknown): unknown;

  /**
   * Find legal issue by ID
   * @param id - Legal issue ID
   * @returns Legal issue or null if not found
   */
  findById(id: number): unknown | null;

  /**
   * Find all legal issues for a case
   * @param caseId - Case ID
   * @returns Array of legal issues
   */
  findByCaseId(caseId: number): unknown[];

  /**
   * Update legal issue
   * @param id - Legal issue ID
   * @param input - Fields to update
   * @returns Updated legal issue, or null if not found
   */
  update(id: number, input: unknown): unknown | null;

  /**
   * Delete legal issue
   * @param id - Legal issue ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  // TODO: Add in Wave 3
  // findByUserId(userId: number): unknown[];
}

/**
 * Interface for UserFactsRepository
 * Manages user facts with encryption
 */
export interface IUserFactsRepository {
  /**
   * Create a new user fact
   * @param input - User fact creation data
   * @returns Created user fact
   */
  create(input: unknown): unknown;

  /**
   * Find user fact by ID
   * @param id - User fact ID
   * @returns User fact or null if not found
   */
  findById(id: number): unknown | null;

  /**
   * Find all user facts for a case
   * @param caseId - Case ID
   * @returns Array of user facts
   */
  findByCaseId(caseId: number): unknown[];

  /**
   * Update user fact
   * @param id - User fact ID
   * @param input - Fields to update
   * @returns Updated user fact, or null if not found
   */
  update(id: number, input: unknown): unknown | null;

  /**
   * Delete user fact
   * @param id - User fact ID
   * @returns true if deleted, false if not found
   */
  delete(id: number): boolean;

  // TODO: Add in Wave 3
  // findByUserId(userId: number): unknown[];
}

/**
 * Interface for UserProfileRepository
 * Manages extended user profile information with encryption
 */
export interface IUserProfileRepository {
  /**
   * Get the user profile (always ID = 1)
   * @returns User profile with decrypted PII fields
   */
  get(): unknown;

  /**
   * Update user profile
   * @param input - Fields to update
   * @returns Updated user profile
   */
  update(input: unknown): unknown;

  // TODO: Add in Wave 3 for multi-user support
  // findByUserId(userId: number): unknown | null;
  // create(input: unknown): unknown;
  // delete(id: number): boolean;
}

// =============================================================================
// ALL INTERFACES EXPORTED INLINE ABOVE
// =============================================================================
// All interfaces are already exported using 'export interface' declarations.
// No need for an additional export block.

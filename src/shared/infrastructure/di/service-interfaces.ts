/**
 * Service Interface Definitions for Dependency Injection
 *
 * This file contains TypeScript interfaces for all service classes in the system.
 * These interfaces enable proper dependency injection with compile-time type safety.
 *
 * Key Benefits:
 * - Decouples business logic from concrete implementations
 * - Enables easy mocking for testing
 * - Supports runtime injection of different implementations
 * - Enforces consistent method signatures across implementations
 *
 * Service Layer Responsibilities:
 * - Business logic orchestration
 * - Transaction management
 * - Cross-repository operations
 * - Validation and error handling
 * - Security and encryption
 * - External API integration
 *
 * Usage:
 * ```typescript
 * class MyController {
 *   constructor(private authService: IAuthenticationService) {}
 *
 *   async login(username: string, password: string) {
 *     return await this.authService.login(username, password);
 *   }
 * }
 * ```
 */

import type { User } from '../../../domains/auth/entities/User.ts';
import type { Session } from '../../../domains/auth/entities/Session.ts';
import type { Case } from '../../../domains/cases/entities/Case.ts';
import type { EncryptedData } from '../../../services/EncryptionService.ts';
import type {
  AuditEvent,
  AuditLogEntry,
  AuditQueryFilters,
  IntegrityReport
} from '../../../models/AuditLog.ts';
import type {
  GdprExportOptions,
  GdprExportResult,
  GdprDeleteOptions,
  GdprDeleteResult
} from '../../../models/Gdpr.ts';

// =============================================================================
// AUTHENTICATION & AUTHORIZATION SERVICES
// =============================================================================

/**
 * Interface for SessionPersistenceHandler
 * Platform-specific session persistence (e.g., Electron safeStorage)
 */
export interface ISessionPersistenceHandler {
  /**
   * Store session ID securely
   * @param sessionId - Session UUID to store
   */
  storeSessionId(sessionId: string): Promise<void>;

  /**
   * Retrieve stored session ID
   * @returns Session UUID or null if not found
   */
  retrieveSessionId(): Promise<string | null>;

  /**
   * Clear stored session
   */
  clearSession(): Promise<void>;

  /**
   * Check if stored session exists
   * @returns true if session is stored
   */
  hasStoredSession(): Promise<boolean>;

  /**
   * Check if persistence storage is available
   * @returns true if storage is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Interface for AuthenticationService
 * Handles user authentication, session management, and password operations
 *
 * Security Features:
 * - OWASP-compliant password requirements
 * - scrypt password hashing with random salts
 * - Session ID regeneration on login (prevents session fixation)
 * - Timing-safe password comparison
 * - Rate limiting for brute force protection
 * - Remember Me with secure session persistence
 */
export interface IAuthenticationService {
  /**
   * Register a new user
   * @param username - Username (unique)
   * @param password - Password (min 12 chars, uppercase, lowercase, number)
   * @param email - Email address (unique)
   * @returns Created user
   * @throws AuthenticationError if validation fails or user exists
   */
  register(username: string, password: string, email: string): Promise<User>;

  /**
   * Login user and create session
   * @param username - Username
   * @param password - Password
   * @param rememberMe - If true, session lasts 30 days instead of 24 hours
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns User and session objects
   * @throws AuthenticationError if credentials are invalid or rate limited
   */
  login(
    username: string,
    password: string,
    rememberMe?: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; session: Session }>;

  /**
   * Get session by ID
   * @param sessionId - Session UUID
   * @returns Session if valid and not expired, null otherwise
   */
  getSession(sessionId: string): Promise<Session | null>;

  /**
   * Logout user and delete session
   * @param sessionId - Session UUID
   */
  logout(sessionId: string): Promise<void>;

  /**
   * Validate session and return user
   * @param sessionId - Session UUID or null
   * @returns User if session is valid, null otherwise
   */
  validateSession(sessionId: string | null): User | null;

  /**
   * Change user password
   * @param userId - User ID
   * @param oldPassword - Current password (for verification)
   * @param newPassword - New password (must meet OWASP requirements)
   * @throws AuthenticationError if old password is invalid or new password is weak
   */
  changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void>;

  /**
   * Restore session from persistent storage (for Remember Me)
   * @returns User and session if valid persisted session found, null otherwise
   */
  restorePersistedSession(): Promise<{ user: User; session: Session } | null>;

  /**
   * Cleanup expired sessions (should be run periodically)
   * @returns Number of sessions deleted
   */
  cleanupExpiredSessions(): number;
}

// =============================================================================
// ENCRYPTION & SECURITY SERVICES
// =============================================================================

/**
 * Interface for EncryptionService
 * Provides AES-256-GCM encryption for sensitive legal data
 *
 * Security Properties:
 * - 256-bit key size (AES-256)
 * - Galois/Counter Mode (GCM) for authenticated encryption
 * - Unique random IV for each encryption operation
 * - Authentication tag prevents tampering
 */
export interface IEncryptionService {
  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - String to encrypt
   * @returns EncryptedData object or null if input is empty
   */
  encrypt(plaintext: string | null | undefined): EncryptedData | null;

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @param encryptedData - EncryptedData object from encrypt()
   * @returns Decrypted plaintext string or null
   * @throws Error if decryption fails (wrong key, tampered data)
   */
  decrypt(encryptedData: EncryptedData | null | undefined): string | null;

  /**
   * Check if data is in encrypted format
   * @param data - Data to check
   * @returns true if data is EncryptedData, false otherwise
   */
  isEncrypted(data: unknown): data is EncryptedData;

  /**
   * Batch encrypt multiple plaintexts (3-5x faster than individual)
   * @param plaintexts - Array of strings to encrypt
   * @returns Array of EncryptedData objects (null for empty inputs)
   */
  batchEncrypt(plaintexts: Array<string | null | undefined>): Array<EncryptedData | null>;

  /**
   * Batch decrypt multiple ciphertexts (3-5x faster than individual)
   * @param encryptedDataArray - Array of EncryptedData objects
   * @returns Array of decrypted plaintext strings (null for null inputs)
   * @throws Error if any decryption fails
   */
  batchDecrypt(encryptedDataArray: Array<EncryptedData | null | undefined>): Array<string | null>;

  /**
   * Rotate encryption key by re-encrypting data with new key
   * @param oldEncryptedData - Data encrypted with old key
   * @param newService - EncryptionService initialized with new key
   * @returns Data re-encrypted with new key
   */
  rotateKey(oldEncryptedData: EncryptedData, newService: IEncryptionService): EncryptedData | null;

  // TODO: Add in Wave 3 - batch operations for table-level encryption
  // encryptBatch(values: Array<string | null>): Array<EncryptedData | null>;
  // decryptBatch(values: Array<EncryptedData | null>): Array<string | null>;
  // getEncryptedFieldsForTable(tableName: string): string[];
}

/**
 * Interface for KeyManager
 * Manages encryption keys with OS-level security (DPAPI, Keychain, libsecret)
 *
 * Security Features:
 * - OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret)
 * - Automatic migration from .env files
 * - Key rotation with backups
 * - Secure memory wiping
 */
export interface IKeyManager {
  /**
   * Get encryption key (decrypts from OS storage and caches in memory)
   * @returns Encryption key as Buffer
   */
  getKey(): Buffer;

  /**
   * Migrate encryption key from .env to OS storage
   * @param envKey - Base64-encoded key from .env
   */
  migrateFromEnv(envKey: string): void;

  /**
   * Generate and store a new 256-bit encryption key
   * @returns New key as base64 string
   */
  generateNewKey(): string;

  /**
   * Rotate encryption key (backs up old key)
   * @returns New key as base64 string
   */
  rotateKey(): string;

  /**
   * Clear cached key from memory (security best practice)
   */
  clearCache(): void;
}

// =============================================================================
// AUDIT & LOGGING SERVICES
// =============================================================================

/**
 * Interface for AuditLogger
 * Provides blockchain-style immutable audit trail
 *
 * Features:
 * - Cryptographic hash chaining (SHA-256)
 * - Tamper-evident logging
 * - INSERT-ONLY (no updates/deletes)
 * - Never throws exceptions (audit failures shouldn't break app)
 */
export interface IAuditLogger {
  /**
   * Log an audit event (never throws)
   * @param event - Audit event to log
   */
  log(event: AuditEvent): void;

  /**
   * Query audit logs with optional filters
   * @param filters - Query filters (date range, resource type, etc.)
   * @returns Array of audit log entries
   */
  query(filters?: AuditQueryFilters): AuditLogEntry[];

  /**
   * Verify integrity of entire audit log chain
   * @returns Integrity report with validation status
   */
  verifyIntegrity(): IntegrityReport;

  /**
   * Export audit logs in JSON or CSV format
   * @param format - Export format ('json' or 'csv')
   * @param filters - Optional query filters
   * @returns Formatted string (JSON or CSV)
   */
  exportLogs(format: 'json' | 'csv', filters?: AuditQueryFilters): string;

  // TODO: Add in Wave 3 - user and resource-specific queries
  // getLogsForUser(userId: number, filters?: AuditQueryFilters): AuditLogEntry[];
  // getLogsForResource(resourceType: string, resourceId: string): AuditLogEntry[];
}

// =============================================================================
// GDPR COMPLIANCE SERVICES
// =============================================================================

/**
 * Interface for GdprService
 * Orchestrates GDPR data export and deletion operations
 *
 * GDPR Articles Implemented:
 * - Article 20: Data Portability (Right to Export)
 * - Article 17: Right to Erasure (Right to Delete)
 *
 * Features:
 * - Rate limiting (5 exports per 24h, 1 deletion per 30 days)
 * - Consent requirement checks
 * - Audit logging for all operations
 * - Export before delete option
 */
export interface IGdprService {
  /**
   * Export all user data (GDPR Article 20)
   * @param userId - User ID
   * @param options - Export options (format, include fields)
   * @returns Export result with data and metadata
   * @throws RateLimitError if rate limit exceeded
   * @throws ConsentRequiredError if user lacks required consent
   */
  exportUserData(
    userId: number,
    options?: GdprExportOptions
  ): Promise<GdprExportResult>;

  /**
   * Delete all user data (GDPR Article 17)
   * @param userId - User ID
   * @param options - Deletion options (confirmed, reason, export before delete)
   * @returns Deletion result with counts and preserved data
   * @throws RateLimitError if rate limit exceeded
   * @throws ConsentRequiredError if user lacks required consent
   * @throws GdprOperationError if deletion fails
   */
  deleteUserData(
    userId: number,
    options: GdprDeleteOptions
  ): Promise<GdprDeleteResult>;

  // TODO: Add in Wave 3
  // getDataRetentionPolicy(userId: number): Promise<unknown>;
  // anonymizeUserData(userId: number): Promise<unknown>;
}

/**
 * Interface for DataExporter
 * Handles GDPR data export with decryption
 */
export interface IDataExporter {
  /**
   * Export all user data from all tables
   * @param userId - User ID
   * @param options - Export options
   * @returns Exported data with metadata
   */
  exportAllUserData(userId: number, options?: GdprExportOptions): unknown;
}

/**
 * Interface for DataDeleter
 * Handles GDPR data deletion with cascade
 */
export interface IDataDeleter {
  /**
   * Delete all user data (respects foreign key constraints)
   * @param userId - User ID
   * @param options - Deletion options
   * @returns Deletion counts per table
   */
  deleteAllUserData(userId: number, options: GdprDeleteOptions): unknown;
}

// =============================================================================
// AI & LEGAL SERVICES
// =============================================================================

/**
 * Interface for AIServiceFactory
 * Creates and configures AI service instances (OpenAI, local models, etc.)
 */
export interface IAIServiceFactory {
  /**
   * Create AI service instance based on configuration
   * @param provider - AI provider ('openai', 'anthropic', 'local', etc.)
   * @returns Configured AI service
   */
  createService(provider: string): unknown;

  /**
   * Get available AI providers
   * @returns Array of provider names
   */
  getAvailableProviders(): string[];
}

/**
 * Interface for LegalAPIService
 * Integrates with UK legal APIs (legislation.gov.uk, caselaw.nationalarchives.gov.uk)
 */
export interface ILegalAPIService {
  /**
   * Search legislation by query
   * @param query - Search query
   * @returns Search results
   */
  searchLegislation(query: string): Promise<unknown>;

  /**
   * Search case law by query
   * @param query - Search query
   * @returns Search results
   */
  searchCaseLaw(query: string): Promise<unknown>;

  /**
   * Get legislation by ID
   * @param id - Legislation ID
   * @returns Legislation details
   */
  getLegislation(id: string): Promise<unknown>;

  /**
   * Get case law by ID
   * @param id - Case law ID
   * @returns Case law details
   */
  getCaseLaw(id: string): Promise<unknown>;
}

/**
 * Interface for RAGService
 * Retrieval-Augmented Generation for legal research
 *
 * Features:
 * - Document retrieval from UK legal APIs
 * - Context-aware query generation
 * - Citation system
 * - Source attribution
 */
export interface IRAGService {
  /**
   * Retrieve relevant legal documents for query
   * @param query - User query
   * @param limit - Maximum number of documents to retrieve
   * @returns Array of relevant documents with citations
   */
  retrieveDocuments(query: string, limit?: number): Promise<unknown[]>;

  /**
   * Generate AI response with retrieved context
   * @param query - User query
   * @param context - Retrieved documents
   * @returns AI response with citations
   */
  generateResponse(query: string, context: unknown[]): Promise<unknown>;
}

/**
 * Interface for CitationService
 * Manages legal citations and source attribution
 */
export interface ICitationService {
  /**
   * Extract citations from text
   * @param text - Text to extract citations from
   * @returns Array of citations
   */
  extractCitations(text: string): unknown[];

  /**
   * Format citation according to legal standards
   * @param citation - Citation object
   * @returns Formatted citation string
   */
  formatCitation(citation: unknown): string;

  /**
   * Validate citation format
   * @param citation - Citation string
   * @returns true if valid, false otherwise
   */
  validateCitation(citation: string): boolean;
}

// =============================================================================
// CACHING & PERFORMANCE SERVICES
// =============================================================================

/**
 * Interface for CacheService
 * LRU caching for frequently accessed data
 */
export interface ICacheService {
  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get<T>(key: string): T | undefined;

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in milliseconds
   */
  set<T>(key: string, value: T, ttl?: number): void;

  /**
   * Delete value from cache
   * @param key - Cache key
   * @returns true if deleted, false if not found
   */
  delete(key: string): boolean;

  /**
   * Clear entire cache
   */
  clear(): void;

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns true if key exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Pattern to match (e.g., 'user:*')
   * @param namespace - Optional namespace
   */
  invalidate(pattern: string, namespace?: string): void;
}

/**
 * Interface for DecryptionCache
 * Specialized LRU cache for decrypted values with security features
 */
export interface IDecryptionCache {
  /**
   * Get decrypted value from cache
   * @param key - Cache key
   * @returns Cached decrypted value or null if not found
   */
  get(key: string): string | null;

  /**
   * Set decrypted value in cache
   * @param key - Cache key
   * @param value - Decrypted plaintext
   * @param ttl - Optional TTL in milliseconds (default: 1 hour)
   */
  set(key: string, value: string, ttl?: number): void;

  /**
   * Invalidate cached decryptions for an entity
   * @param entityType - Entity type (e.g., 'case', 'evidence')
   * @param entityId - Entity ID
   */
  invalidateEntity(entityType: string, entityId: number): void;

  /**
   * Invalidate all cached decryptions for an entity type
   * @param entityType - Entity type
   */
  invalidateEntityType(entityType: string): void;

  /**
   * Clear all cached decryptions (security best practice on logout)
   */
  clearAll(): void;
}

// =============================================================================
// RATE LIMITING & SECURITY SERVICES
// =============================================================================

/**
 * Interface for RateLimitService
 * Prevents brute force attacks and abuse
 */
export interface IRateLimitService {
  /**
   * Check if request is within rate limit
   * @param identifier - Identifier (username, IP, etc.)
   * @returns Rate limit result (allowed, remaining time)
   */
  checkRateLimit(identifier: string): {
    allowed: boolean;
    remainingTime?: number;
  };

  /**
   * Record failed attempt
   * @param identifier - Identifier (username, IP, etc.)
   */
  recordFailedAttempt(identifier: string): void;

  /**
   * Clear attempts for identifier
   * @param identifier - Identifier (username, IP, etc.)
   */
  clearAttempts(identifier: string): void;
}

// =============================================================================
// BUSINESS LOGIC SERVICES
// =============================================================================

/**
 * Interface for CaseService
 * Orchestrates case-related business logic
 */
export interface ICaseService {
  /**
   * Create a new case
   * @param input - Case creation data with user ID
   * @returns Created case
   */
  createCase(input: unknown): Case;

  /**
   * Get all cases
   * @returns Array of all cases
   */
  getAllCases(): Case[];

  /**
   * Get case by ID
   * @param id - Case ID
   * @returns Case or null if not found
   */
  getCaseById(id: number): Case | null;

  /**
   * Update case
   * @param id - Case ID
   * @param input - Update data
   * @returns Updated case or null if not found
   */
  updateCase(id: number, input: unknown): Case | null;

  /**
   * Close case
   * @param id - Case ID
   * @returns Updated case or null if not found
   */
  closeCase(id: number): Case | null;

  /**
   * Delete case
   * @param id - Case ID
   * @returns true if deleted, false if not found
   */
  deleteCase(id: number): boolean;
}

/**
 * Interface for ChatConversationService
 * Orchestrates AI chat conversation operations
 */
export interface IChatConversationService {
  // TODO: Add method signatures once ChatConversationService implementation is analyzed
  createConversation(input: unknown): unknown;
  getConversation(id: number): unknown | null;
  deleteConversation(id: number): boolean;
}

/**
 * Interface for ConsentService
 * Orchestrates GDPR consent management
 */
export interface IConsentService {
  // TODO: Add method signatures once ConsentService implementation is analyzed
  grantConsent(userId: number, consentType: string): unknown;
  revokeConsent(userId: number, consentType: string): unknown;
  hasActiveConsent(userId: number, consentType: string): boolean;
}

/**
 * Interface for UserProfileService
 * Manages extended user profile information
 */
export interface IUserProfileService {
  // TODO: Add method signatures once UserProfileService implementation is analyzed
  getProfile(userId: number): unknown | null;
  updateProfile(userId: number, input: unknown): unknown | null;
}

// =============================================================================
// UTILITY & INFRASTRUCTURE SERVICES
// =============================================================================

/**
 * Interface for SecureStorageService
 * Platform-specific secure storage (Electron safeStorage)
 */
export interface ISecureStorageService {
  /**
   * Store value securely
   * @param key - Storage key
   * @param value - Value to store
   */
  store(key: string, value: string): Promise<void>;

  /**
   * Retrieve stored value
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  retrieve(key: string): Promise<string | null>;

  /**
   * Delete stored value
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if storage is available
   * @returns true if available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Interface for SessionPersistenceService
 * Persists sessions across app restarts (for Remember Me)
 */
export interface ISessionPersistenceService extends ISessionPersistenceHandler {
  // Extends ISessionPersistenceHandler
}

/**
 * Interface for ProcessManager
 * Manages background processes and tasks
 */
export interface IProcessManager {
  /**
   * Start background process
   * @param name - Process name
   * @param task - Task function
   */
  start(name: string, task: () => Promise<void>): void;

  /**
   * Stop background process
   * @param name - Process name
   */
  stop(name: string): void;

  /**
   * Check if process is running
   * @param name - Process name
   * @returns true if running, false otherwise
   */
  isRunning(name: string): boolean;
}

/**
 * Interface for AutoUpdater
 * Manages application updates
 */
export interface IAutoUpdater {
  /**
   * Check for updates
   * @returns Update info or null if no update available
   */
  checkForUpdates(): Promise<unknown | null>;

  /**
   * Download update
   */
  downloadUpdate(): Promise<void>;

  /**
   * Install update and restart
   */
  quitAndInstall(): void;
}

/**
 * Interface for StartupMetrics
 * Tracks application startup performance
 */
export interface IStartupMetrics {
  /**
   * Record metric
   * @param name - Metric name
   * @param value - Metric value
   */
  record(name: string, value: number): void;

  /**
   * Get all metrics
   * @returns Object with all metrics
   */
  getMetrics(): Record<string, number>;

  /**
   * Clear all metrics
   */
  clear(): void;
}

/**
 * Interface for Event Bus
 * Event-driven architecture with pub/sub pattern
 */
export interface IEventBus {
  /**
   * Subscribe to an event type
   * @param eventType - Event type to subscribe to (e.g., 'case.created')
   * @param handler - Handler function to execute when event is published
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): () => void;

  /**
   * Publish an event to all subscribers
   * @param event - Event object to publish
   */
  publish<T = unknown>(event: T): Promise<void>;

  /**
   * Get all persisted events for an aggregate
   * @param aggregateId - Aggregate ID (e.g., 'case-123')
   * @param options - Query options
   * @returns Array of events
   */
  getEvents(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
      limit?: number;
    }
  ): Promise<DomainEvent[]>;

  /**
   * Replay events for an aggregate
   * @param aggregateId - Aggregate ID to replay events for
   * @param options - Replay options
   */
  replay(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
    }
  ): Promise<void>;

  /**
   * Clear all subscribers (for testing)
   */
  clearSubscribers(): void;
}

// =============================================================================
// ALL INTERFACES EXPORTED INLINE ABOVE
// =============================================================================
// All interfaces are already exported using 'export interface' declarations.
// No need for an additional export block.

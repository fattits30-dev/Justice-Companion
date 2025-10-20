/**
 * Repository Initialization
 *
 * Centralizes repository creation with proper dependency injection.
 * All repositories with encrypted fields REQUIRE EncryptionService.
 *
 * Usage:
 * ```ts
 * import { initializeRepositories } from './repositories.ts';
 * const repos = initializeRepositories(encryptionService, auditLogger);
 * ```
 */

import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';

// Import repository classes
import { CaseRepository } from './CaseRepository.ts';
import { EvidenceRepository } from './EvidenceRepository.ts';
import { ChatConversationRepository } from './ChatConversationRepository.ts';
import { UserProfileRepository } from './UserProfileRepository.ts';
import { NotesRepository } from './NotesRepository.ts';
import { UserFactsRepository } from './UserFactsRepository.ts';
import { TimelineRepository } from './TimelineRepository.ts';
import { LegalIssuesRepository } from './LegalIssuesRepository.ts';
import { CaseFactsRepository} from './CaseFactsRepository.ts';

// Import repositories that don't need encryption
import { UserRepository } from './UserRepository.ts';
import { SessionRepository } from './SessionRepository.ts';
import { ConsentRepository } from './ConsentRepository.ts';

/**
 * Container for all initialized repositories
 */
export interface Repositories {
  // Repositories with encryption
  caseRepository: CaseRepository;
  evidenceRepository: EvidenceRepository;
  chatConversationRepository: ChatConversationRepository;
  userProfileRepository: UserProfileRepository;
  notesRepository: NotesRepository;
  userFactsRepository: UserFactsRepository;
  timelineRepository: TimelineRepository;
  legalIssuesRepository: LegalIssuesRepository;
  caseFactsRepository: CaseFactsRepository;

  // Repositories without encryption
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  consentRepository: ConsentRepository;
}

/**
 * Initialize all repositories with encryption and audit logging
 *
 * @param encryptionService - REQUIRED for all repositories handling encrypted fields
 * @param auditLogger - Optional audit logger for all repositories
 * @returns Object containing all initialized repositories
 */
export function initializeRepositories(
  encryptionService: EncryptionService,
  auditLogger?: AuditLogger,
): Repositories {
  return {
    // Repositories with encryption (EncryptionService REQUIRED)
    caseRepository: new CaseRepository(encryptionService, auditLogger),
    evidenceRepository: new EvidenceRepository(encryptionService, auditLogger),
    chatConversationRepository: new ChatConversationRepository(encryptionService, auditLogger),
    userProfileRepository: new UserProfileRepository(encryptionService, auditLogger),
    notesRepository: new NotesRepository(encryptionService, auditLogger),
    userFactsRepository: new UserFactsRepository(encryptionService, auditLogger),
    timelineRepository: new TimelineRepository(encryptionService, auditLogger),
    legalIssuesRepository: new LegalIssuesRepository(encryptionService, auditLogger),
    caseFactsRepository: new CaseFactsRepository(encryptionService, auditLogger),

    // Repositories without encryption
    userRepository: new UserRepository(auditLogger),
    sessionRepository: new SessionRepository(),
    consentRepository: new ConsentRepository(),
  };
}

/**
 * Create encryption service from environment variable or explicit key
 *
 * @param key - Optional encryption key (Buffer or base64 string).
 *              If not provided, reads from ENCRYPTION_KEY_BASE64 env var (legacy fallback for tests)
 * @returns EncryptionService instance
 * @throws Error if key not provided and ENCRYPTION_KEY_BASE64 is not set or invalid
 */
export function createEncryptionService(key?: Buffer | string): EncryptionService {
  // Use provided key or fall back to environment variable
  const encryptionKey = key || process.env.ENCRYPTION_KEY_BASE64;

  if (!encryptionKey) {
    throw new Error(
      'Encryption key required. Either pass key parameter or set ENCRYPTION_KEY_BASE64 environment variable. ' +
      'Generate one with: node scripts/generate-encryption-key.js'
    );
  }

  try {
    return new EncryptionService(encryptionKey);
  } catch (error) {
    throw new Error(
      `Failed to create EncryptionService: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Ensure key is a valid base64-encoded 32-byte key or 32-byte Buffer.'
    );
  }
}

/**
 * Singleton repositories instance
 * Created lazily when first accessed
 */
let repositoriesInstance: Repositories | null = null;

/**
 * Get singleton repositories instance
 * Auto-initializes with encryption service from environment
 *
 * @returns Initialized repositories singleton
 * @throws Error if ENCRYPTION_KEY_BASE64 is not set
 */
export function getRepositories(): Repositories {
  if (!repositoriesInstance) {
    const encryptionService = createEncryptionService();
    repositoriesInstance = initializeRepositories(encryptionService);
  }
  return repositoriesInstance;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetRepositories(): void {
  repositoriesInstance = null;
}

/**
 * Initialize repositories for testing with explicit dependencies
 *
 * Unlike getRepositories() which uses lazy singleton initialization,
 * this function allows tests to provide their own auditLogger instance
 * to verify audit logging behavior.
 *
 * @param encryptionService - Encryption service instance
 * @param auditLogger - Audit logger instance for testing
 * @returns Initialized repositories with provided dependencies
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   testDb = new TestDatabaseHelper();
 *   const db = testDb.initialize();
 *
 *   resetRepositories();
 *
 *   const encryptionService = new EncryptionService(testKey);
 *   const auditLogger = new AuditLogger(db);
 *
 *   // Use test initialization to inject auditLogger
 *   const repos = initializeTestRepositories(encryptionService, auditLogger);
 * });
 * ```
 */
export function initializeTestRepositories(
  encryptionService: EncryptionService,
  auditLogger: AuditLogger,
): Repositories {
  repositoriesInstance = initializeRepositories(encryptionService, auditLogger);
  return repositoriesInstance;
}

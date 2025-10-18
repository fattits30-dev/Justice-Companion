/**
 * Repository Initialization
 *
 * Centralizes repository creation with proper dependency injection.
 * All repositories with encrypted fields REQUIRE EncryptionService.
 *
 * Usage:
 * ```ts
 * import { initializeRepositories } from './repositories';
 * const repos = initializeRepositories(encryptionService, auditLogger);
 * ```
 */

import { EncryptionService } from '../services/EncryptionService';
import type { AuditLogger } from '../services/AuditLogger';

// Import repository classes
import { CaseRepository } from './CaseRepository';
import { EvidenceRepository } from './EvidenceRepository';
import { ChatConversationRepository } from './ChatConversationRepository';
import { UserProfileRepository } from './UserProfileRepository';
import { NotesRepository } from './NotesRepository';
import { UserFactsRepository } from './UserFactsRepository';
import { TimelineRepository } from './TimelineRepository';
import { LegalIssuesRepository } from './LegalIssuesRepository';
import { CaseFactsRepository} from './CaseFactsRepository';

// Import repositories that don't need encryption
import { UserRepository } from './UserRepository';
import { SessionRepository } from './SessionRepository';
import { ConsentRepository } from './ConsentRepository';

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
 * Create encryption service from environment variable
 *
 * @returns EncryptionService instance
 * @throws Error if ENCRYPTION_KEY_BASE64 is not set or invalid
 */
export function createEncryptionService(): EncryptionService {
  const key = process.env.ENCRYPTION_KEY_BASE64;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY_BASE64 environment variable is required. ' +
      'Generate one with: node scripts/generate-encryption-key.js'
    );
  }

  try {
    return new EncryptionService(key);
  } catch (error) {
    throw new Error(
      `Failed to create EncryptionService: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Ensure ENCRYPTION_KEY_BASE64 is a valid base64-encoded 32-byte key.'
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

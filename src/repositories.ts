/**
 * Centralized repository initialization and access
 * Provides singleton instances of all repositories with proper dependency injection
 */

import { getDb } from './db/database.ts';
import { EncryptionService } from './services/EncryptionService.ts';
import { AuditLogger } from './services/AuditLogger.ts';

// Import all repositories
import { CaseRepository } from './repositories/CaseRepository.ts';
import { EvidenceRepository } from './repositories/EvidenceRepository.ts';
import { UserRepository } from './repositories/UserRepository.ts';
import { SessionRepository } from './repositories/SessionRepository.ts';
import { UserProfileRepository } from './repositories/UserProfileRepository.ts';
import { ChatConversationRepository } from './repositories/ChatConversationRepository.ts';
import { ConsentRepository } from './repositories/ConsentRepository.ts';
import { NotesRepository } from './repositories/NotesRepository.ts';
import { LegalIssuesRepository } from './repositories/LegalIssuesRepository.ts';
import { TimelineRepository } from './repositories/TimelineRepository.ts';
import { CaseFactsRepository } from './repositories/CaseFactsRepository.ts';
import { UserFactsRepository } from './repositories/UserFactsRepository.ts';

/**
 * Repository container - holds all initialized repository instances
 */
interface RepositoryContainer {
  caseRepository: CaseRepository;
  evidenceRepository: EvidenceRepository;
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  userProfileRepository: UserProfileRepository;
  chatConversationRepository: ChatConversationRepository;
  consentRepository: ConsentRepository;
  notesRepository: NotesRepository;
  legalIssuesRepository: LegalIssuesRepository;
  timelineEventRepository: TimelineRepository;
  caseFactsRepository: CaseFactsRepository;
  userFactsRepository: UserFactsRepository;
}

let repositoryContainer: RepositoryContainer | null = null;

/**
 * Initialize all repositories with their dependencies
 * This is called once at app startup or can be reset for testing
 */
function initializeRepositories(): RepositoryContainer {
  const db = getDb();

  // Initialize core services
  // Note: In production, KeyManager loads the key from secure storage
  // For now, we'll use environment variable or generate a test key
  const encryptionKey = process.env.ENCRYPTION_KEY_BASE64 ||
    Buffer.from('test-key-only-replace-in-production!!').toString('base64');

  console.log('[Repositories] Initializing with encryption key from:',
    process.env.ENCRYPTION_KEY_BASE64 ? '.env file' : 'fallback test key');
  console.log('[Repositories] Key (first 10 chars):', encryptionKey.substring(0, 10));

  const encryptionService = new EncryptionService(encryptionKey);
  const auditLogger = new AuditLogger(db);

  // Initialize all repositories
  return {
    caseRepository: new CaseRepository(encryptionService, auditLogger),
    evidenceRepository: new EvidenceRepository(encryptionService, auditLogger),
    userRepository: new UserRepository(auditLogger),
    sessionRepository: new SessionRepository(),
    userProfileRepository: new UserProfileRepository(encryptionService, auditLogger),
    chatConversationRepository: new ChatConversationRepository(encryptionService, auditLogger),
    consentRepository: new ConsentRepository(),
    notesRepository: new NotesRepository(encryptionService, auditLogger),
    legalIssuesRepository: new LegalIssuesRepository(encryptionService, auditLogger),
    timelineEventRepository: new TimelineRepository(encryptionService, auditLogger),
    caseFactsRepository: new CaseFactsRepository(encryptionService, auditLogger),
    userFactsRepository: new UserFactsRepository(encryptionService, auditLogger),
  };
}

/**
 * Get the repository container (lazy initialization)
 * @returns Initialized repository container
 */
export function getRepositories(): RepositoryContainer {
  if (!repositoryContainer) {
    repositoryContainer = initializeRepositories();
  }
  return repositoryContainer;
}

/**
 * Reset repositories (useful for testing)
 * Forces re-initialization on next getRepositories() call
 */
export function resetRepositories(): void {
  repositoryContainer = null;
}

/**
 * Initialize repositories with test dependencies (for testing only)
 * Allows injecting mock encryption service and audit logger
 */
export function initializeTestRepositories(
  encryptionService: EncryptionService,
  auditLogger: AuditLogger
): RepositoryContainer {
  // Initialize all repositories with test dependencies
  repositoryContainer = {
    caseRepository: new CaseRepository(encryptionService, auditLogger),
    evidenceRepository: new EvidenceRepository(encryptionService, auditLogger),
    userRepository: new UserRepository(auditLogger),
    sessionRepository: new SessionRepository(),
    userProfileRepository: new UserProfileRepository(encryptionService, auditLogger),
    chatConversationRepository: new ChatConversationRepository(encryptionService, auditLogger),
    consentRepository: new ConsentRepository(),
    notesRepository: new NotesRepository(encryptionService, auditLogger),
    legalIssuesRepository: new LegalIssuesRepository(encryptionService, auditLogger),
    timelineEventRepository: new TimelineRepository(encryptionService, auditLogger),
    caseFactsRepository: new CaseFactsRepository(encryptionService, auditLogger),
    userFactsRepository: new UserFactsRepository(encryptionService, auditLogger),
  };
  return repositoryContainer;
}

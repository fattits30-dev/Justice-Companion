/**
 * Dependency Injection Container Configuration
 *
 * Configures the InversifyJS IoC container with all application dependencies.
 * Provides both production and test container configurations.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types.ts';
import type {
  IDatabase,
  IEncryptionService,
  IAuditLogger,
  ICaseRepository,
  IEvidenceRepository,
  IUserRepository,
  ISessionRepository,
  IUserProfileRepository,
  IChatConversationRepository,
  IConsentRepository,
  INotesRepository,
  ILegalIssuesRepository,
  ITimelineRepository,
  ICaseFactsRepository,
  IUserFactsRepository,
  IDeadlineRepository,
  ICaseService,
  IGdprService,
  IAuthenticationService,
  ICacheService,
  IRateLimitService,
  IUserProfileService,
  IChatConversationService,
  IConsentService,
  ILegalAPIService,
} from './interfaces.ts';
import type { IDataExporter, IDataDeleter, ISessionPersistenceHandler } from './service-interfaces.ts';

// Import implementations
import { getDb } from '../../../db/database.ts';
import { EncryptionService } from '../../../services/EncryptionService.ts';
import { AuditLogger } from '../../../services/AuditLogger.ts';

// Import Repositories
import { CaseRepository } from '../../../repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../../repositories/EvidenceRepository.ts';
import { UserRepository } from '../../../repositories/UserRepository.ts';
import { SessionRepository } from '../../../repositories/SessionRepository.ts';
import { UserProfileRepository } from '../../../repositories/UserProfileRepository.ts';
import { ChatConversationRepository } from '../../../repositories/ChatConversationRepository.ts';
import { ConsentRepository } from '../../../repositories/ConsentRepository.ts';
import { NotesRepository } from '../../../repositories/NotesRepository.ts';
import { LegalIssuesRepository } from '../../../repositories/LegalIssuesRepository.ts';
import { TimelineRepository } from '../../../repositories/TimelineRepository.ts';
import { CaseFactsRepository } from '../../../repositories/CaseFactsRepository.ts';
import { UserFactsRepository } from '../../../repositories/UserFactsRepository.ts';
import { DeadlineRepository } from '../../../repositories/DeadlineRepository.ts';
import { TemplateRepository } from '../../../repositories/TemplateRepository.ts';

// Import Services
import { CaseServiceInjectable } from '../../../services/CaseService.injectable.ts';
import { TemplateService } from '../../../services/TemplateService.ts';
import { GdprService } from '../../../services/gdpr/GdprService.ts';
import { DataExporter } from '../../../services/gdpr/DataExporter.ts';
import { DataDeleter } from '../../../services/gdpr/DataDeleter.ts';

// Batch 1: Core Infrastructure Services
import { AuthenticationServiceInjectable } from '../../../services/AuthenticationService.injectable.ts';
import { CacheService } from '../../../services/CacheService.ts';
import { RateLimitService } from '../../../services/RateLimitService.ts';
import { SessionPersistenceService } from '../../../services/SessionPersistenceService.ts';
import { UserProfileServiceInjectable } from '../../../services/UserProfileService.injectable.ts';

// Batch 2: Chat & AI Services
import { ChatConversationServiceInjectable } from '../../../services/ChatConversationService.injectable.ts';
import { ConsentService } from '../../../services/ConsentService.ts';
import { LegalAPIService } from '../../../services/LegalAPIService.ts';

// Event Bus
import { EventBus } from '../events/EventBus.ts';

// Authorization
import { AuthorizationService } from '../../../services/AuthorizationService.ts';

/**
 * Container Configuration Options
 */
export interface ContainerOptions {
  /**
   * Environment: production, development, or test
   */
  environment?: 'production' | 'development' | 'test';

  /**
   * Optional encryption key for test environments
   */
  encryptionKey?: string;

  /**
   * Optional database instance for test environments
   */
  database?: IDatabase;

  /**
   * Enable verbose logging for debugging
   */
  verbose?: boolean;
}

/**
 * Creates and configures the DI container
 */
export function createContainer(options: ContainerOptions = {}): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  const { environment = 'production', encryptionKey, database, verbose = false } = options;

  if (verbose) {
    console.log(`[DI] Creating container for environment: ${environment}`);
  }

  // ==========================================
  // Core Infrastructure (Singleton)
  // ==========================================

  // Database - Use provided database or get from database module
  if (database) {
    container.bind<IDatabase>(TYPES.Database).toConstantValue(database);
  } else {
    container.bind<IDatabase>(TYPES.Database).toDynamicValue(() => getDb());
  }

  // EncryptionService - Singleton with proper key management
  container
    .bind<IEncryptionService>(TYPES.EncryptionService)
    .toDynamicValue((): IEncryptionService => {
      const key =
        encryptionKey ||
        process.env.ENCRYPTION_KEY_BASE64 ||
        (environment === 'test'
          ? Buffer.from('test-key-for-testing-32-bytes!!!').toString('base64')
          : undefined);

      if (!key && environment !== 'test') {
        throw new Error('Encryption key is required in production/development environments');
      }

      return new EncryptionService(key!) as unknown as IEncryptionService;
    })
    .inSingletonScope();

  // AuditLogger - Singleton
  container
    .bind<IAuditLogger>(TYPES.AuditLogger)
    .toDynamicValue((): IAuditLogger => {
      const db = container.get<IDatabase>(TYPES.Database);
      return new AuditLogger(db) as unknown as IAuditLogger;
    })
    .inSingletonScope();

  // ==========================================
  // Repositories (Transient - New instance per injection)
  // ==========================================

  // Core Repositories
  container.bind<ICaseRepository>(TYPES.CaseRepository).toDynamicValue((): ICaseRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new CaseRepository(encryptionService, auditLogger) as unknown as ICaseRepository;
  }).inTransientScope();

  container.bind<IEvidenceRepository>(TYPES.EvidenceRepository).toDynamicValue((): IEvidenceRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new EvidenceRepository(encryptionService, auditLogger) as unknown as IEvidenceRepository;
  });

  container.bind<IUserRepository>(TYPES.UserRepository).toDynamicValue((): IUserRepository => {
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new UserRepository(auditLogger) as unknown as IUserRepository;
  });

  container.bind<ISessionRepository>(TYPES.SessionRepository).toDynamicValue((): ISessionRepository => {
    return new SessionRepository() as unknown as ISessionRepository;
  });

  container.bind<IUserProfileRepository>(TYPES.UserProfileRepository).toDynamicValue((): IUserProfileRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new UserProfileRepository(encryptionService, auditLogger) as unknown as IUserProfileRepository;
  });

  container
    .bind<IChatConversationRepository>(TYPES.ChatConversationRepository)
    .toDynamicValue((): IChatConversationRepository => {
      const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
      return new ChatConversationRepository(encryptionService, auditLogger) as unknown as IChatConversationRepository;
    });

  container.bind<IConsentRepository>(TYPES.ConsentRepository).toDynamicValue((): IConsentRepository => {
    return new ConsentRepository() as unknown as IConsentRepository;
  });

  container.bind<INotesRepository>(TYPES.NotesRepository).toDynamicValue((): INotesRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new NotesRepository(encryptionService, auditLogger) as unknown as INotesRepository;
  });

  container.bind<ILegalIssuesRepository>(TYPES.LegalIssuesRepository).toDynamicValue((): ILegalIssuesRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new LegalIssuesRepository(encryptionService, auditLogger) as unknown as ILegalIssuesRepository;
  });

  container.bind<ITimelineRepository>(TYPES.TimelineRepository).toDynamicValue((): ITimelineRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new TimelineRepository(encryptionService, auditLogger) as unknown as ITimelineRepository;
  });

  container.bind<ICaseFactsRepository>(TYPES.CaseFactsRepository).toDynamicValue((): ICaseFactsRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new CaseFactsRepository(encryptionService, auditLogger) as unknown as ICaseFactsRepository;
  });

  container.bind<IUserFactsRepository>(TYPES.UserFactsRepository).toDynamicValue((): IUserFactsRepository => {
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new UserFactsRepository(encryptionService, auditLogger) as unknown as IUserFactsRepository;
  });

  container.bind<IDeadlineRepository>(TYPES.DeadlineRepository).toDynamicValue((): IDeadlineRepository => {
    const db = container.get<IDatabase>(TYPES.Database);
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new DeadlineRepository(db, auditLogger) as unknown as IDeadlineRepository;
  });

  container.bind(TYPES.TemplateRepository).toDynamicValue(() => {
    const db = container.get<IDatabase>(TYPES.Database);
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new TemplateRepository(db, encryptionService, auditLogger);
  });

  // ==========================================
  // Services (Singleton for stateful services, Transient for stateless)
  // ==========================================

  // CaseService - Injectable version with DI
  container.bind<ICaseService>(TYPES.CaseService).to(CaseServiceInjectable);

  // GDPR Services
  container.bind<IGdprService>(TYPES.GdprService).toDynamicValue((): IGdprService => {
    const db = container.get<IDatabase>(TYPES.Database);
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new GdprService(db, encryptionService, auditLogger) as unknown as IGdprService;
  });

  container.bind<IDataExporter>(TYPES.DataExporter).toDynamicValue((): IDataExporter => {
    const db = container.get<IDatabase>(TYPES.Database);
    const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
    return new DataExporter(db, encryptionService) as unknown as IDataExporter;
  });

  container.bind<IDataDeleter>(TYPES.DataDeleter).toDynamicValue((): IDataDeleter => {
    const db = container.get<IDatabase>(TYPES.Database);
    return new DataDeleter(db) as unknown as IDataDeleter;
  });

  // ==========================================
  // Batch 1: Core Infrastructure Services
  // ==========================================

  // AuthenticationService - Singleton (manages sessions)
  container.bind<IAuthenticationService>(TYPES.AuthenticationService).to(AuthenticationServiceInjectable).inSingletonScope();

  // CacheService - Singleton (stateful, maintains cache)
  container.bind<ICacheService>(TYPES.CacheService).toDynamicValue((): ICacheService => {
    return new CacheService() as unknown as ICacheService;
  }).inSingletonScope();

  // RateLimitService - Singleton (maintains rate limit state)
  container.bind<IRateLimitService>(TYPES.RateLimitService).toDynamicValue((): IRateLimitService => {
    return RateLimitService.getInstance() as unknown as IRateLimitService;
  }).inSingletonScope();

  // SessionPersistenceService - Singleton (manages persistent session storage)
  container.bind<ISessionPersistenceHandler>(TYPES.SessionPersistenceService).toDynamicValue((): ISessionPersistenceHandler => {
    return SessionPersistenceService.getInstance() as unknown as ISessionPersistenceHandler;
  }).inSingletonScope();

  // UserProfileService - Transient (stateless service)
  container.bind<IUserProfileService>(TYPES.UserProfileService).to(UserProfileServiceInjectable).inTransientScope();

  // EventBus - Singleton (stateful, manages subscribers and event history)
  container.bind(TYPES.EventBus).to(EventBus).inSingletonScope();

  // AuthorizationService - Singleton (permission checks)
  container.bind(TYPES.AuthorizationService).to(AuthorizationService).inSingletonScope();

  // ==========================================
  // Batch 2: Chat & AI Services
  // ==========================================

  // ChatConversationService - Transient (stateless service)
  container.bind<IChatConversationService>(TYPES.ChatConversationService).to(ChatConversationServiceInjectable).inTransientScope();

  // ConsentService - Transient (stateless service)
  container.bind<IConsentService>(TYPES.ConsentService).to(ConsentService).inTransientScope();

  // LegalAPIService - Singleton (maintains cache)
  container.bind<ILegalAPIService>(TYPES.LegalAPIService).to(LegalAPIService).inSingletonScope();

  // Template Services
  container.bind(TYPES.TemplateService).toDynamicValue(() => {
    const templateRepo = container.get(TYPES.TemplateRepository) as TemplateRepository;
    const caseRepo = container.get(TYPES.CaseRepository) as unknown as CaseRepository;
    const deadlineRepo = container.get(TYPES.DeadlineRepository) as unknown as DeadlineRepository;
    const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
    return new TemplateService(templateRepo, caseRepo, deadlineRepo, auditLogger);
  });

  // Other services can be added similarly as they are migrated

  return container;
}

/**
 * Default production container
 */
let defaultContainer: Container | null = null;

/**
 * Get the default container (lazy initialization)
 */
export function getContainer(): Container {
  if (!defaultContainer) {
    defaultContainer = createContainer({ environment: 'production' });
  }
  return defaultContainer;
}

/**
 * Reset the default container (useful for testing)
 */
export function resetContainer(): void {
  if (defaultContainer) {
    defaultContainer.unbindAll();
    defaultContainer = null;
  }
}

/**
 * Create a test container with mock dependencies
 */
export function createTestContainer(
  database: IDatabase,
  encryptionKey?: string
): Container {
  return createContainer({
    environment: 'test',
    database,
    encryptionKey: encryptionKey || Buffer.from('test-key-for-testing-32-bytes!!!').toString('base64'),
  });
}
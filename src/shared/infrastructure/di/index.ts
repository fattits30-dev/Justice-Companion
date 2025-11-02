/**
 * Dependency Injection Type System - Central Export
 *
 * This file re-exports all DI interfaces, type guards, and utilities
 * for convenient imports throughout the application.
 *
 * Usage:
 * ```typescript
 * import {
 *   ICaseRepository,
 *   IAuthenticationService,
 *   IDatabase,
 *   isRepository,
 *   validateRepositoryDependencies,
 * } from '@/shared/infrastructure/di';
 * ```
 *
 * Organization:
 * - Repository interfaces: Data access layer contracts
 * - Service interfaces: Business logic layer contracts
 * - Infrastructure interfaces: System/platform abstractions
 * - Type guards: Runtime type validation
 * - Utilities: Dependency validation and error handling
 */

// =============================================================================
// REPOSITORY INTERFACES
// =============================================================================

export type {
  // Core repositories
  ICaseRepository,
  IEvidenceRepository,
  IUserRepository,
  ISessionRepository,
  IDeadlineRepository,
  IChatConversationRepository,
  IConsentRepository,

  // Cached repositories
  ICachedCaseRepository,
  ICachedEvidenceRepository,
  ICachedSessionRepository,
  ICachedUserProfileRepository,

  // Additional repositories
  ICaseFactsRepository,
  INotesRepository,
  ITimelineRepository,
  ILegalIssuesRepository,
  IUserFactsRepository,
  IUserProfileRepository,
} from './repository-interfaces.ts';

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export type {
  // Authentication & Authorization
  IAuthenticationService,
  ISessionPersistenceHandler,

  // Encryption & Security
  IEncryptionService,
  IKeyManager,

  // Audit & Logging
  IAuditLogger,

  // GDPR Compliance
  IGdprService,
  IDataExporter,
  IDataDeleter,

  // AI & Legal Services
  IAIServiceFactory,
  ILegalAPIService,
  IRAGService,
  ICitationService,

  // Caching & Performance
  ICacheService,
  IDecryptionCache,

  // Rate Limiting & Security
  IRateLimitService,

  // Business Logic
  ICaseService,
  IChatConversationService,
  IConsentService,
  IUserProfileService,

  // Utility & Infrastructure
  ISecureStorageService,
  ISessionPersistenceService,
  IProcessManager,
  IAutoUpdater,
  IStartupMetrics,
} from './service-interfaces.ts';

// =============================================================================
// INFRASTRUCTURE INTERFACES
// =============================================================================

// Commented out - infrastructure-interfaces.ts file doesn't exist and types are unused
// export type {
//   // Database
//   IDatabase,
//   IStatement,
//   IDatabaseManager,
//
//   // Electron
//   IElectronApp,
//   IElectronSafeStorage,
//   IElectronIpcMain,
//   IElectronIpcRenderer,
//
//   // External API Clients
//   IHttpClient,
//   IOpenAIClient,
//
//   // File System
//   IFileSystem,
//
//   // Logging
//   ILogger,
//   IErrorLogger,
//
//   // Environment & Configuration
//   IEnvironment,
//   IConfiguration,
// } from './infrastructure-interfaces.ts';

// =============================================================================
// TYPE GUARDS & UTILITIES
// =============================================================================

export {
  // Base type guards
  hasMethods,
  hasProperties,

  // Repository type guards
  isRepository,
  isCaseRepository,
  isEvidenceRepository,
  isUserRepository,
  isSessionRepository,

  // Service type guards
  isAuthenticationService,
  isEncryptionService,
  isAuditLogger,

  // Infrastructure type guards
  isDatabase,
  isDatabaseManager,

  // Validation functions
  validateRepositoryDependencies,
  validateServiceDependencies,

  // Dependency resolution utilities
  requireDependency,
  getDependencyOrFallback,
  validateCircularDependencies,

  // Error utilities
  createDependencyErrorMessage,
  createMissingDependencyErrorMessage,
} from './type-guards.ts';

// =============================================================================
// DOCUMENTATION & USAGE EXAMPLES
// =============================================================================

/**
 * USAGE GUIDE
 *
 * 1. IMPORTING INTERFACES
 * ```typescript
 * import type { ICaseRepository, IAuthenticationService } from '@/shared/infrastructure/di';
 * ```
 *
 * 2. USING INTERFACES IN SERVICES
 * ```typescript
 * export class CaseService {
 *   constructor(
 *     private caseRepo: ICaseRepository,
 *     private auditLogger: IAuditLogger
 *   ) {}
 *
 *   async getCases() {
 *     return this.caseRepo.findAll();
 *   }
 * }
 * ```
 *
 * 3. RUNTIME TYPE VALIDATION
 * ```typescript
 * import { isRepository, validateRepositoryDependencies } from '@/shared/infrastructure/di';
 *
 * function registerRepository(repo: unknown) {
 *   if (!isRepository(repo)) {
 *     throw new Error('Invalid repository');
 *   }
 *   // TypeScript now knows repo implements base repository interface
 *   container.bind('CaseRepository', repo);
 * }
 * ```
 *
 * 4. DEPENDENCY VALIDATION
 * ```typescript
 * import { requireDependency, validateCircularDependencies } from '@/shared/infrastructure/di';
 *
 * class MyService {
 *   constructor(deps: { db?: IDatabase; logger?: ILogger }) {
 *     // Throws if db is null/undefined
 *     this.db = requireDependency(deps.db, 'database');
 *
 *     // Uses fallback if logger is null/undefined
 *     this.logger = getDependencyOrFallback(deps.logger, consoleLogger);
 *   }
 * }
 * ```
 *
 * 5. ERROR HANDLING
 * ```typescript
 * import { createDependencyErrorMessage } from '@/shared/infrastructure/di';
 *
 * if (!isDatabase(db)) {
 *   const errorMsg = createDependencyErrorMessage(
 *     'CaseRepository',
 *     'db',
 *     'IDatabase',
 *     typeof db
 *   );
 *   throw new Error(errorMsg);
 * }
 * ```
 */

/**
 * ARCHITECTURE NOTES
 *
 * The DI type system follows these principles:
 *
 * 1. INTERFACE SEGREGATION
 *    - Interfaces are focused and single-purpose
 *    - Large interfaces are split into smaller ones
 *    - Clients depend only on methods they use
 *
 * 2. DEPENDENCY INVERSION
 *    - High-level modules depend on abstractions (interfaces)
 *    - Low-level modules implement abstractions
 *    - Both depend on interfaces, not concrete implementations
 *
 * 3. RUNTIME TYPE SAFETY
 *    - Type guards validate dependencies at runtime
 *    - Detailed error messages help debug DI issues
 *    - Circular dependency detection prevents initialization loops
 *
 * 4. TESTABILITY
 *    - All dependencies are injected (no global state)
 *    - Interfaces enable easy mocking for tests
 *    - Type guards ensure mocks implement full interfaces
 *
 * 5. MAINTAINABILITY
 *    - Centralized interface definitions
 *    - Clear separation between layers (repository, service, infrastructure)
 *    - Comprehensive JSDoc documentation
 */

/**
 * INTERFACE NAMING CONVENTIONS
 *
 * All interfaces follow these naming rules:
 *
 * 1. Prefix with 'I' (e.g., IDatabase, IRepository)
 * 2. Use PascalCase (e.g., IAuthenticationService, not Iauthenticationservice)
 * 3. Be descriptive and specific (e.g., ICaseRepository, not IRepo)
 * 4. Avoid abbreviations (e.g., IEncryptionService, not IEncSvc)
 *
 * Repository Interfaces:
 * - I{Entity}Repository (e.g., ICaseRepository, IUserRepository)
 * - ICached{Entity}Repository for cached variants
 *
 * Service Interfaces:
 * - I{Domain}Service (e.g., IAuthenticationService, IGdprService)
 * - I{Purpose}Service for utility services (e.g., ICacheService)
 *
 * Infrastructure Interfaces:
 * - I{Component} (e.g., IDatabase, ILogger)
 * - IElectron{API} for Electron APIs (e.g., IElectronApp)
 */

/**
 * CIRCULAR DEPENDENCY PREVENTION
 *
 * To avoid circular dependencies:
 *
 * 1. Use dependency injection (never import concrete classes in constructors)
 * 2. Follow layered architecture (repository → service → controller)
 * 3. Avoid bidirectional dependencies (A depends on B, B depends on A)
 * 4. Use events/callbacks for loose coupling
 * 5. Run validateCircularDependencies() during container initialization
 *
 * Example of circular dependency (BAD):
 * ```typescript
 * // CaseService depends on UserService
 * class CaseService {
 *   constructor(private userService: UserService) {}
 * }
 *
 * // UserService depends on CaseService (CIRCULAR!)
 * class UserService {
 *   constructor(private caseService: CaseService) {}
 * }
 * ```
 *
 * Solution (GOOD):
 * ```typescript
 * // Extract shared logic to a third service
 * class SharedService {}
 *
 * class CaseService {
 *   constructor(private sharedService: SharedService) {}
 * }
 *
 * class UserService {
 *   constructor(private sharedService: SharedService) {}
 * }
 * ```
 */

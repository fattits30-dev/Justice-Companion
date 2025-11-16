/**
 * Dependency Injection Type Symbols
 *
 * Defines unique symbols for all services and repositories in the application.
 * These symbols are used by InversifyJS to identify dependencies at runtime.
 */

export const TYPES = {
  // ==========================================
  // Core Infrastructure
  // ==========================================
  Database: Symbol.for("Database"),
  EncryptionService: Symbol.for("EncryptionService"),
  AuditLogger: Symbol.for("AuditLogger"),
  KeyManager: Symbol.for("KeyManager"),

  // ==========================================
  // Repositories (Data Access Layer)
  // ==========================================

  // Core Repositories
  CaseRepository: Symbol.for("CaseRepository"),
  EvidenceRepository: Symbol.for("EvidenceRepository"),
  UserRepository: Symbol.for("UserRepository"),
  SessionRepository: Symbol.for("SessionRepository"),
  UserProfileRepository: Symbol.for("UserProfileRepository"),

  // Feature Repositories
  ChatConversationRepository: Symbol.for("ChatConversationRepository"),
  ConsentRepository: Symbol.for("ConsentRepository"),
  NotesRepository: Symbol.for("NotesRepository"),
  LegalIssuesRepository: Symbol.for("LegalIssuesRepository"),
  TimelineRepository: Symbol.for("TimelineRepository"),
  CaseFactsRepository: Symbol.for("CaseFactsRepository"),
  UserFactsRepository: Symbol.for("UserFactsRepository"),
  DeadlineRepository: Symbol.for("DeadlineRepository"),
  DocumentRepository: Symbol.for("DocumentRepository"),
  TemplateRepository: Symbol.for("TemplateRepository"),

  // Cached Repositories (Performance Optimization)
  CachedCaseRepository: Symbol.for("CachedCaseRepository"),
  CachedEvidenceRepository: Symbol.for("CachedEvidenceRepository"),
  CachedSessionRepository: Symbol.for("CachedSessionRepository"),
  // CachedUserProfileRepository: Symbol.for('CachedUserProfileRepository'), // DELETED FILE

  // Paginated Repositories
  // CaseRepositoryPaginated: Symbol.for('CaseRepositoryPaginated'), // DELETED FILE

  // ==========================================
  // Services (Business Logic Layer)
  // ==========================================

  // Core Services
  AuthenticationService: Symbol.for("AuthenticationService"),
  CaseService: Symbol.for("CaseService"),
  UserProfileService: Symbol.for("UserProfileService"),
  ConsentService: Symbol.for("ConsentService"),
  ChatConversationService: Symbol.for("ChatConversationService"),

  // AI & Legal Services
  AIServiceFactory: Symbol.for("AIServiceFactory"),
  LegalAPIService: Symbol.for("LegalAPIService"),
  RAGService: Symbol.for("RAGService"),
  CitationService: Symbol.for("CitationService"),

  // GDPR Services
  GdprService: Symbol.for("GdprService"),
  DataExporter: Symbol.for("DataExporter"),
  DataDeleter: Symbol.for("DataDeleter"),

  // Export Services
  ExportService: Symbol.for("ExportService"),

  // Template Services
  TemplateService: Symbol.for("TemplateService"),
  TemplateSeeder: Symbol.for("TemplateSeeder"),

  // Infrastructure Services
  CacheService: Symbol.for("CacheService"),
  DecryptionCache: Symbol.for("DecryptionCache"),
  RateLimitService: Symbol.for("RateLimitService"),
  SecureStorageService: Symbol.for("SecureStorageService"),
  SessionPersistenceService: Symbol.for("SessionPersistenceService"),
  EventBus: Symbol.for("EventBus"),
  AuthorizationService: Symbol.for("AuthorizationService"),

  // Search Services
  SearchService: Symbol.for("SearchService"),
  SearchIndexBuilder: Symbol.for("SearchIndexBuilder"),

  // System Services
  AutoUpdater: Symbol.for("AutoUpdater"),
  ProcessManager: Symbol.for("ProcessManager"),
  ModelDownloadService: Symbol.for("ModelDownloadService"),
  StartupMetrics: Symbol.for("StartupMetrics"),
  EnhancedErrorTracker: Symbol.for("EnhancedErrorTracker"),

  // ==========================================
  // Factories
  // ==========================================
  RepositoryFactory: Symbol.for("RepositoryFactory"),
  ServiceFactory: Symbol.for("ServiceFactory"),
};

/**
 * Type guard to check if a symbol is a valid TYPES symbol
 */
export function isValidTypeSymbol(symbol: symbol): boolean {
  return Object.values(TYPES).includes(symbol);
}

/**
 * Get the name of a type symbol for debugging
 */
export function getTypeName(symbol: symbol): string | undefined {
  for (const [key, value] of Object.entries(TYPES)) {
    if (value === symbol) {
      return key;
    }
  }
  return undefined;
}

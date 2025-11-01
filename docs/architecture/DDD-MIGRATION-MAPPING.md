# Domain-Driven Design Migration Mapping

## Migration Status: STRUCTURE PREPARED ✅
**Created:** 2025-10-25
**Status:** Folders created, files NOT moved yet

---

## Migration Strategy

### Phase 1: Structure Preparation (COMPLETED)
- ✅ Create `src/domains/` folder structure
- ✅ Create `src/shared/` for shared kernel
- ✅ Add `.gitkeep` files to prevent empty folder deletion
- ✅ Document migration mapping

### Phase 2: Shared Kernel Migration (NEXT)
Move infrastructure services that are used across all domains to `src/shared/`

### Phase 3: Domain-by-Domain Migration
Migrate each bounded context independently with tests

### Phase 4: Cleanup & Validation
Remove old directories, update imports, verify all tests pass

---

## Domain Boundaries

### 🏛️ **Cases Domain** (`src/domains/cases/`)
**Bounded Context:** Case lifecycle management, case facts, legal issues
**Aggregates:** Case, CaseFact, LegalIssue
**Use Cases:** Create case, track case progress, manage case metadata

### 📁 **Evidence Domain** (`src/domains/evidence/`)
**Bounded Context:** Evidence storage, categorization, metadata management
**Aggregates:** Evidence, Note (evidence notes)
**Use Cases:** Upload evidence, categorize files, search evidence

### ⚖️ **Legal Research Domain** (`src/domains/legal-research/`)
**Bounded Context:** AI-powered legal research, RAG, citations
**Aggregates:** ChatConversation (research sessions), Citation
**Use Cases:** Ask legal questions, retrieve case law, cite legislation

### 📅 **Timeline Domain** (`src/domains/timeline/`)
**Bounded Context:** Deadline tracking, timeline events, calendar management
**Aggregates:** TimelineEvent, Deadline, Action
**Use Cases:** Track deadlines, manage actions, visualize timeline

### 🔐 **Auth Domain** (`src/domains/auth/`)
**Bounded Context:** Authentication, authorization, user sessions
**Aggregates:** User, Session, UserProfile
**Use Cases:** Login, logout, manage permissions, track sessions

### ⚙️ **Settings Domain** (`src/domains/settings/`)
**Bounded Context:** User preferences, consents, GDPR controls
**Aggregates:** UserProfile, Consent, UserFact
**Use Cases:** Update preferences, manage consents, export data

---

## Detailed File Mapping

### 📦 **Shared Kernel** (`src/shared/`)
Infrastructure services used across all domains

#### `src/shared/infrastructure/encryption/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/EncryptionService.ts` | `src/shared/infrastructure/encryption/EncryptionService.ts` | Service | Core encryption (AES-256-GCM) |
| `src/services/DecryptionCache.ts` | `src/shared/infrastructure/encryption/DecryptionCache.ts` | Service | Performance optimization |
| `src/services/KeyManager.ts` | `src/shared/infrastructure/encryption/KeyManager.ts` | Service | OS-level key storage |
| `src/services/SecureStorageService.ts` | `src/shared/infrastructure/encryption/SecureStorageService.ts` | Service | Electron safeStorage wrapper |

#### `src/shared/infrastructure/audit/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/AuditLogger.ts` | `src/shared/infrastructure/audit/AuditLogger.ts` | Service | SHA-256 hash chaining |
| `src/models/AuditLog.ts` | `src/shared/infrastructure/audit/AuditLog.model.ts` | Model | Immutable audit trail |

#### `src/shared/infrastructure/database/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/db/database.ts` | `src/shared/infrastructure/database/database.ts` | Infrastructure | SQLite connection manager |
| `src/db/migrate.ts` | `src/shared/infrastructure/database/migrate.ts` | Infrastructure | Migration runner |
| `src/db/backup.ts` | `src/shared/infrastructure/database/backup.ts` | Infrastructure | Backup system |
| `src/repositories/BaseRepository.ts` | `src/shared/infrastructure/database/BaseRepository.ts` | Abstract | Base class for all repos |

#### `src/shared/infrastructure/di/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/index.ts` | `src/shared/infrastructure/di/container.ts` | DI Container | Service locator pattern |

#### `src/shared/infrastructure/cache/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/CacheService.ts` | `src/shared/infrastructure/cache/CacheService.ts` | Service | Global caching layer |
| `src/utils/cache-metrics.ts` | `src/shared/infrastructure/cache/metrics.ts` | Utility | Performance tracking |

#### `src/shared/infrastructure/errors/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/EnhancedErrorTracker.ts` | `src/shared/infrastructure/errors/ErrorTracker.ts` | Service | Centralized error handling |
| `src/utils/error-logger.ts` | `src/shared/infrastructure/errors/error-logger.ts` | Utility | Error logging utilities |
| `src/types/error-tracking.ts` | `src/shared/infrastructure/errors/types.ts` | Types | Error type definitions |

#### `src/shared/infrastructure/validation/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/ValidationMiddleware.ts` | `src/shared/infrastructure/validation/ValidationMiddleware.ts` | Middleware | Zod validation wrapper |
| `src/middleware/utils/sanitizers.ts` | `src/shared/infrastructure/validation/sanitizers.ts` | Utility | Input sanitization |
| `src/middleware/utils/constants.ts` | `src/shared/infrastructure/validation/constants.ts` | Constants | Validation rules |

#### `src/shared/infrastructure/rate-limiting/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/RateLimitService.ts` | `src/shared/infrastructure/rate-limiting/RateLimitService.ts` | Service | GDPR compliance (export/delete) |

#### `src/shared/ui/components/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/components/ui/Button.tsx` | `src/shared/ui/components/Button.tsx` | Component | Reusable UI |
| `src/components/ui/Card.tsx` | `src/shared/ui/components/Card.tsx` | Component | Reusable UI |
| `src/components/ui/Badge.tsx` | `src/shared/ui/components/Badge.tsx` | Component | Reusable UI |
| `src/components/ui/Toast.tsx` | `src/shared/ui/components/Toast.tsx` | Component | Reusable UI |
| `src/components/ui/Skeleton.tsx` | `src/shared/ui/components/Skeleton.tsx` | Component | Reusable UI |
| `src/components/ui/CommandPalette.tsx` | `src/shared/ui/components/CommandPalette.tsx` | Component | Reusable UI |
| `src/components/ui/index.ts` | `src/shared/ui/components/index.ts` | Barrel | Export all UI components |
| `src/components/layouts/MainLayout.tsx` | `src/shared/ui/components/MainLayout.tsx` | Layout | Shared layout |
| `src/components/Sidebar.tsx` | `src/shared/ui/components/Sidebar.tsx` | Component | Navigation |
| `src/components/Dashboard.tsx` | `src/shared/ui/components/Dashboard.tsx` | Component | Main dashboard |

---

### 🏛️ **Cases Domain** (`src/domains/cases/`)

#### `src/domains/cases/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/Case.ts` | `src/domains/cases/models/Case.ts` | Model | Case aggregate root |
| `src/models/CaseFact.ts` | `src/domains/cases/models/CaseFact.ts` | Model | Value object |
| `src/models/LegalIssue.ts` | `src/domains/cases/models/LegalIssue.ts` | Model | Entity |

#### `src/domains/cases/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/CaseRepository.ts` | `src/domains/cases/repositories/CaseRepository.ts` | Repository | Case data access |
| `src/repositories/CaseRepositoryPaginated.ts` | `src/domains/cases/repositories/CaseRepository.paginated.ts` | Repository | Pagination mixin |
| `src/repositories/CachedCaseRepository.ts` | `src/domains/cases/repositories/CaseRepository.cached.ts` | Repository | Caching decorator |
| `src/repositories/CaseFactsRepository.ts` | `src/domains/cases/repositories/CaseFactsRepository.ts` | Repository | Case facts data access |
| `src/repositories/LegalIssuesRepository.ts` | `src/domains/cases/repositories/LegalIssuesRepository.ts` | Repository | Legal issues data access |

#### `src/domains/cases/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/CaseService.ts` | `src/domains/cases/services/CaseService.ts` | Service | Case business logic |

#### `src/domains/cases/views/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/cases/CasesView.tsx` | `src/domains/cases/views/CasesView.tsx` | View | Main cases screen |
| `src/views/cases/components/CaseList.tsx` | `src/domains/cases/views/components/CaseList.tsx` | Component | Case list display |
| `src/views/cases/components/CaseCard.tsx` | `src/domains/cases/views/components/CaseCard.tsx` | Component | Case card UI |
| `src/views/cases/components/CaseStates.tsx` | `src/domains/cases/views/components/CaseStates.tsx` | Component | Case state management |
| `src/views/cases/components/CaseSummaryCards.tsx` | `src/domains/cases/views/components/CaseSummaryCards.tsx` | Component | Summary statistics |
| `src/views/cases/components/CaseToolbar.tsx` | `src/domains/cases/views/components/CaseToolbar.tsx` | Component | Toolbar UI |
| `src/views/cases/components/CreateCaseDialog.tsx` | `src/domains/cases/views/components/CreateCaseDialog.tsx` | Component | Case creation dialog |

#### `src/domains/cases/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/schemas/case-schemas.ts` | `src/domains/cases/api/schemas.ts` | Validation | Zod schemas for IPC |

#### `src/domains/cases/types.ts`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/cases/constants.ts` | `src/domains/cases/types.ts` (partial) | Constants | Case-specific constants |

---

### 📁 **Evidence Domain** (`src/domains/evidence/`)

#### `src/domains/evidence/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/Evidence.ts` | `src/domains/evidence/models/Evidence.ts` | Model | Evidence aggregate root |
| `src/models/Note.ts` | `src/domains/evidence/models/Note.ts` | Model | Evidence notes |

#### `src/domains/evidence/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/EvidenceRepository.ts` | `src/domains/evidence/repositories/EvidenceRepository.ts` | Repository | Evidence data access |
| `src/repositories/CachedEvidenceRepository.ts` | `src/domains/evidence/repositories/EvidenceRepository.cached.ts` | Repository | Caching decorator |
| `src/repositories/NotesRepository.ts` | `src/domains/evidence/repositories/NotesRepository.ts` | Repository | Notes data access |

#### `src/domains/evidence/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| (No dedicated service yet) | `src/domains/evidence/services/EvidenceService.ts` | Service | TO BE CREATED |

#### `src/domains/evidence/views/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/documents/DocumentsView.tsx` | `src/domains/evidence/views/DocumentsView.tsx` | View | Main evidence screen |
| `src/views/documents/components/EvidenceList.tsx` | `src/domains/evidence/views/components/EvidenceList.tsx` | Component | Evidence list display |
| `src/views/documents/components/EvidenceCard.tsx` | `src/domains/evidence/views/components/EvidenceCard.tsx` | Component | Evidence card UI |
| `src/views/documents/components/DocumentsStates.tsx` | `src/domains/evidence/views/components/DocumentsStates.tsx` | Component | State management |
| `src/views/documents/components/DocumentsToolbar.tsx` | `src/domains/evidence/views/components/DocumentsToolbar.tsx` | Component | Toolbar UI |
| `src/views/documents/components/UploadEvidenceDialog.tsx` | `src/domains/evidence/views/components/UploadEvidenceDialog.tsx` | Component | Upload dialog |

#### `src/domains/evidence/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/schemas/evidence-schemas.ts` | `src/domains/evidence/api/schemas.ts` | Validation | Zod schemas for IPC |
| `src/middleware/schemas/file-schemas.ts` | `src/domains/evidence/api/file-schemas.ts` | Validation | File upload schemas |

#### `src/domains/evidence/types.ts`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/documents/constants.ts` | `src/domains/evidence/types.ts` (partial) | Constants | Evidence-specific constants |

---

### ⚖️ **Legal Research Domain** (`src/domains/legal-research/`)

#### `src/domains/legal-research/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/ChatConversation.ts` | `src/domains/legal-research/models/ChatConversation.ts` | Model | Research session aggregate |

#### `src/domains/legal-research/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/ChatConversationRepository.ts` | `src/domains/legal-research/repositories/ChatConversationRepository.ts` | Repository | Chat data access |

#### `src/domains/legal-research/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/ChatConversationService.ts` | `src/domains/legal-research/services/ChatConversationService.ts` | Service | Chat business logic |
| `src/services/RAGService.ts` | `src/domains/legal-research/services/RAGService.ts` | Service | Retrieval-Augmented Generation |
| `src/services/LegalAPIService.ts` | `src/domains/legal-research/services/LegalAPIService.ts` | Service | UK legal API integration |
| `src/services/CitationService.ts` | `src/domains/legal-research/services/CitationService.ts` | Service | Citation extraction |
| `src/services/AIServiceFactory.ts` | `src/domains/legal-research/services/AIServiceFactory.ts` | Factory | AI service creation |
| `src/services/GroqService.ts` | `src/domains/legal-research/services/GroqService.ts` | Service | Groq AI integration |
| `src/services/AIFunctionDefinitions.ts` | `src/domains/legal-research/services/AIFunctionDefinitions.ts` | Config | AI function schema |
| `src/services/ai-functions.ts` | `src/domains/legal-research/services/ai-functions.ts` | Config | AI function implementations |

#### `src/domains/legal-research/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/schemas/chat-schemas.ts` | `src/domains/legal-research/api/schemas.ts` | Validation | Chat IPC schemas |
| `src/middleware/schemas/ai-schemas.ts` | `src/domains/legal-research/api/ai-schemas.ts` | Validation | AI-specific schemas |

#### `src/domains/legal-research/types.ts`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/types/ai.ts` | `src/domains/legal-research/types.ts` | Types | AI type definitions |

**Note:** ChatView stays in `src/views/ChatView.tsx` temporarily (App-level component)

---

### 📅 **Timeline Domain** (`src/domains/timeline/`)

#### `src/domains/timeline/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/TimelineEvent.ts` | `src/domains/timeline/models/TimelineEvent.ts` | Model | Timeline event entity |
| `src/models/Deadline.ts` | `src/domains/timeline/models/Deadline.ts` | Model | Deadline entity |
| `src/models/Action.ts` | `src/domains/timeline/models/Action.ts` | Model | Action entity |

#### `src/domains/timeline/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/TimelineRepository.ts` | `src/domains/timeline/repositories/TimelineRepository.ts` | Repository | Timeline data access |
| `src/repositories/DeadlineRepository.ts` | `src/domains/timeline/repositories/DeadlineRepository.ts` | Repository | Deadline data access |

#### `src/domains/timeline/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| (No dedicated service yet) | `src/domains/timeline/services/TimelineService.ts` | Service | TO BE CREATED |

#### `src/domains/timeline/views/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/timeline/TimelineView.tsx` | `src/domains/timeline/views/TimelineView.tsx` | View | Main timeline screen |
| `src/views/timeline/components/TimelineItem.tsx` | `src/domains/timeline/views/components/TimelineItem.tsx` | Component | Timeline item UI |
| `src/views/timeline/components/TimelineEmpty.tsx` | `src/domains/timeline/views/components/TimelineEmpty.tsx` | Component | Empty state UI |
| `src/views/timeline/components/AddDeadlineDialog.tsx` | `src/domains/timeline/views/components/AddDeadlineDialog.tsx` | Component | Deadline creation dialog |

#### `src/domains/timeline/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| (Currently embedded in case-schemas.ts) | `src/domains/timeline/api/schemas.ts` | Validation | Timeline IPC schemas |

---

### 🔐 **Auth Domain** (`src/domains/auth/`)

#### `src/domains/auth/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/User.ts` | `src/domains/auth/models/User.ts` | Model | User aggregate root |
| `src/models/Session.ts` | `src/domains/auth/models/Session.ts` | Model | Session entity |
| `src/models/UserProfile.ts` | `src/domains/auth/models/UserProfile.ts` | Model | Profile value object |

#### `src/domains/auth/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/UserRepository.ts` | `src/domains/auth/repositories/UserRepository.ts` | Repository | User data access |
| `src/repositories/SessionRepository.ts` | `src/domains/auth/repositories/SessionRepository.ts` | Repository | Session data access |
| `src/repositories/CachedSessionRepository.ts` | `src/domains/auth/repositories/SessionRepository.cached.ts` | Repository | Caching decorator |
| `src/repositories/UserProfileRepository.ts` | `src/domains/auth/repositories/UserProfileRepository.ts` | Repository | Profile data access |
| `src/repositories/CachedUserProfileRepository.ts` | `src/domains/auth/repositories/UserProfileRepository.cached.ts` | Repository | Caching decorator |

#### `src/domains/auth/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/AuthenticationService.ts` | `src/domains/auth/services/AuthenticationService.ts` | Service | Auth business logic |
| `src/services/SessionPersistenceService.ts` | `src/domains/auth/services/SessionPersistenceService.ts` | Service | Session persistence |
| `src/services/UserProfileService.ts` | `src/domains/auth/services/UserProfileService.ts` | Service | Profile management |
| `src/utils/passwordValidation.ts` | `src/domains/auth/services/passwordValidation.ts` | Utility | Password rules |

#### `src/domains/auth/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/schemas/auth-schemas.ts` | `src/domains/auth/api/schemas.ts` | Validation | Auth IPC schemas |
| `src/middleware/schemas/profile-schemas.ts` | `src/domains/auth/api/profile-schemas.ts` | Validation | Profile IPC schemas |

**Note:** Auth components stay in `src/components/auth/` temporarily (App-level components)

---

### ⚙️ **Settings Domain** (`src/domains/settings/`)

#### `src/domains/settings/models/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/models/Consent.ts` | `src/domains/settings/models/Consent.ts` | Model | GDPR consent aggregate |
| `src/models/UserFact.ts` | `src/domains/settings/models/UserFact.ts` | Model | User metadata |
| `src/models/Gdpr.ts` | `src/domains/settings/models/Gdpr.ts` | Model | GDPR types |

#### `src/domains/settings/repositories/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/repositories/ConsentRepository.ts` | `src/domains/settings/repositories/ConsentRepository.ts` | Repository | Consent data access |
| `src/repositories/UserFactsRepository.ts` | `src/domains/settings/repositories/UserFactsRepository.ts` | Repository | User facts data access |

#### `src/domains/settings/services/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/services/ConsentService.ts` | `src/domains/settings/services/ConsentService.ts` | Service | Consent management |
| `src/services/gdpr/GdprService.ts` | `src/domains/settings/services/gdpr/GdprService.ts` | Service | GDPR orchestration |
| `src/services/gdpr/DataExporter.ts` | `src/domains/settings/services/gdpr/DataExporter.ts` | Service | Data export (Article 20) |
| `src/services/gdpr/DataDeleter.ts` | `src/domains/settings/services/gdpr/DataDeleter.ts` | Service | Data deletion (Article 17) |

#### `src/domains/settings/views/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/views/SettingsView.tsx` | `src/domains/settings/views/SettingsView.tsx` | View | Main settings screen |

#### `src/domains/settings/api/`
| Source | Destination | Type | Notes |
|--------|------------|------|-------|
| `src/middleware/schemas/consent-schemas.ts` | `src/domains/settings/api/schemas.ts` | Validation | Consent IPC schemas |
| `src/middleware/schemas/gdpr-schemas.ts` | `src/domains/settings/api/gdpr-schemas.ts` | Validation | GDPR IPC schemas |

---

## Dependency Analysis

### Shared Dependencies (Used by Multiple Domains)

#### Cross-Domain Services
| Service | Used By Domains | Notes |
|---------|----------------|-------|
| `EncryptionService` | All domains | 11 encrypted fields across schema |
| `AuditLogger` | All domains | All data mutations audited |
| `DecryptionCache` | Cases, Evidence, Legal Research | Performance optimization |
| `RateLimitService` | Settings, Legal Research | GDPR export/delete, AI calls |
| `CacheService` | Cases, Evidence, Auth | Query caching layer |
| `ValidationMiddleware` | All domains | All IPC calls validated |

#### Cross-Domain Repositories
| Repository | Used By Domains | Notes |
|------------|----------------|-------|
| `UserRepository` | Auth, Settings | User aggregate shared |
| `CaseRepository` | Cases, Evidence, Timeline | Evidence/timeline link to cases |

### Potential Circular Dependencies ⚠️

#### 1. **Cases ↔ Evidence**
- **Issue:** Evidence belongs to a Case, but Cases view displays evidence count
- **Solution:** Use event-driven architecture (Domain Events) or query services
- **Pattern:** Evidence raises `EvidenceAddedToCase` event → Cases updates denormalized count

#### 2. **Cases ↔ Timeline**
- **Issue:** Timeline events belong to Cases, but Cases view displays upcoming deadlines
- **Solution:** Timeline domain publishes `DeadlineApproaching` events → Cases subscribes
- **Pattern:** Domain Event pattern with in-process event bus

#### 3. **Legal Research ↔ Cases**
- **Issue:** Chat conversations save to Cases (SaveToCaseDialog.tsx)
- **Solution:** Legal Research uses Case ID as foreign key (dependency inversion)
- **Pattern:** Anti-Corruption Layer (ACL) - Legal Research depends on Cases interface, not implementation

#### 4. **Settings ↔ Auth**
- **Issue:** Settings manages UserProfile, but Auth also uses UserProfile
- **Solution:** UserProfile is part of Auth domain, Settings references it via Auth API
- **Pattern:** Shared Kernel (UserProfile in Auth, Settings uses Auth services)

### Recommended Mitigation Strategies

1. **Domain Events Pattern**
   - Implement in-process event bus: `src/shared/infrastructure/events/EventBus.ts`
   - Each domain publishes events, subscribes to relevant events
   - Example: `CaseCreatedEvent`, `EvidenceUploadedEvent`, `DeadlineApproachingEvent`

2. **Anti-Corruption Layer (ACL)**
   - Legal Research → Cases: Use `CaseIntegrationService` in Legal Research domain
   - Prevents Legal Research from directly depending on Cases implementation

3. **Shared Kernel**
   - Move commonly shared models to `src/shared/domain/`
   - Example: `User`, `UserProfile`, `AuditLog`

4. **Dependency Inversion**
   - Define interfaces in consuming domain
   - Implement in providing domain
   - Wire together in DI container

---

## Migration Checklist

### Pre-Migration
- [x] Create folder structure
- [x] Add `.gitkeep` files
- [x] Document migration mapping
- [ ] Create EventBus infrastructure
- [ ] Set up DI container pattern
- [ ] Write migration script for automated import updates

### Phase 2: Shared Kernel
- [ ] Move `EncryptionService` + tests
- [ ] Move `AuditLogger` + tests
- [ ] Move `KeyManager` + tests
- [ ] Move database infrastructure
- [ ] Move validation middleware
- [ ] Move UI components
- [ ] Update all imports in domains
- [ ] Run full test suite (should pass)

### Phase 3: Domain Migration (Independent Order)

#### Timeline Domain (Fewest Dependencies)
- [ ] Move models (TimelineEvent, Deadline, Action)
- [ ] Move repositories
- [ ] Create TimelineService
- [ ] Move views and components
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E timeline flow

#### Evidence Domain
- [ ] Move models (Evidence, Note)
- [ ] Move repositories
- [ ] Create EvidenceService
- [ ] Move views and components
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E evidence upload flow

#### Cases Domain
- [ ] Move models (Case, CaseFact, LegalIssue)
- [ ] Move repositories
- [ ] Move CaseService
- [ ] Move views and components
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E case creation flow

#### Legal Research Domain
- [ ] Move models (ChatConversation)
- [ ] Move repositories
- [ ] Move AI services (RAGService, LegalAPIService, etc.)
- [ ] Create Anti-Corruption Layer for Cases integration
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E chat flow

#### Auth Domain
- [ ] Move models (User, Session, UserProfile)
- [ ] Move repositories
- [ ] Move AuthenticationService
- [ ] Move auth components (LoginScreen, RegistrationScreen, ConsentBanner)
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E login/logout flow

#### Settings Domain
- [ ] Move models (Consent, UserFact, Gdpr)
- [ ] Move repositories
- [ ] Move ConsentService + GDPR services
- [ ] Move SettingsView
- [ ] Update imports
- [ ] Run domain tests
- [ ] Verify E2E settings flow

### Phase 4: Cleanup
- [ ] Delete old `src/models/` directory
- [ ] Delete old `src/repositories/` directory
- [ ] Delete old `src/services/` directory (keep shared ones)
- [ ] Delete old `src/views/` directory
- [ ] Delete old `src/components/auth/` directory
- [ ] Update barrel exports (`index.ts` files)
- [ ] Run `pnpm type-check` (should pass)
- [ ] Run `pnpm lint:fix`
- [ ] Run full test suite (100% pass rate)
- [ ] Run E2E tests (100% pass rate)
- [ ] Update documentation (CLAUDE.md, README.md)
- [ ] Create PR with DDD migration

---

## Import Update Script

After moving files, run automated import update script:

```bash
# TO BE CREATED: scripts/update-ddd-imports.ts
pnpm tsx scripts/update-ddd-imports.ts

# This script will:
# 1. Scan all .ts/.tsx files
# 2. Update imports from old paths to new DDD paths
# 3. Preserve relative imports within domains
# 4. Update barrel exports
```

**Example Import Transformations:**
```typescript
// BEFORE
import { CaseRepository } from '../repositories/CaseRepository';
import { EncryptionService } from '../services/EncryptionService';
import { Case } from '../models/Case';

// AFTER
import { CaseRepository } from '@/domains/cases/repositories/CaseRepository';
import { EncryptionService } from '@/shared/infrastructure/encryption/EncryptionService';
import { Case } from '@/domains/cases/models/Case';
```

---

## Testing Strategy

### Per-Domain Testing
Each domain migration must maintain test coverage:

1. **Unit Tests:** All service/repository tests pass
2. **Integration Tests:** Cross-repository queries work
3. **Component Tests:** UI components render correctly
4. **E2E Tests:** Full user flows work end-to-end

### Regression Prevention
- Run full test suite after each domain migration
- Use TypeScript compiler to catch missing imports
- Run E2E tests on critical paths (login, create case, upload evidence)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies | HIGH | Use Domain Events, ACL pattern |
| Missing imports | MEDIUM | Automated import update script |
| Test failures | MEDIUM | Migrate with tests, run frequently |
| Merge conflicts | LOW | Migrate in small PRs per domain |
| Performance regression | LOW | Keep caching decorators, benchmark |

---

## Success Criteria

- ✅ All 6 domains clearly separated
- ✅ Shared kernel has no domain logic
- ✅ No circular dependencies between domains
- ✅ 100% test pass rate maintained
- ✅ All E2E tests pass
- ✅ TypeScript compiles with no errors
- ✅ ESLint warnings not increased
- ✅ Import paths follow `@/domains/` pattern
- ✅ Documentation updated

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Structure (DONE) | 1 hour | Low |
| Phase 2: Shared Kernel | 4 hours | Medium |
| Phase 3: Timeline Domain | 2 hours | Low |
| Phase 3: Evidence Domain | 3 hours | Medium |
| Phase 3: Cases Domain | 4 hours | Medium |
| Phase 3: Legal Research | 5 hours | High |
| Phase 3: Auth Domain | 4 hours | Medium |
| Phase 3: Settings Domain | 3 hours | Medium |
| Phase 4: Cleanup | 2 hours | Low |
| **Total** | **28 hours** | **Medium-High** |

---

## Notes

- **DO NOT** move files yet - this is structure preparation only
- Migration should happen in small, testable increments
- Each domain migration is a separate commit
- Run tests after every file move
- Use `git mv` to preserve file history
- Update CLAUDE.md after migration completes

---

**End of Migration Mapping Document**

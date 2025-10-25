# Domain-Driven Design Structure - Visual Overview

## ✅ Created Folder Structure (2025-10-25)

```
src/
├── domains/                          # Bounded Contexts (6 domains)
│   ├── cases/                       # 🏛️ Case Management Domain
│   │   ├── api/                    # IPC validation schemas (Zod)
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # Business logic
│   │   ├── models/                 # Domain entities (Case, CaseFact, LegalIssue)
│   │   ├── views/                  # React UI components
│   │   └── types.ts                # Domain-specific types
│   │
│   ├── evidence/                    # 📁 Evidence Management Domain
│   │   ├── api/                    # IPC validation schemas
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # Business logic
│   │   ├── models/                 # Domain entities (Evidence, Note)
│   │   ├── views/                  # React UI components
│   │   └── types.ts                # Domain-specific types
│   │
│   ├── legal-research/             # ⚖️ AI Legal Research Domain
│   │   ├── api/                    # IPC validation schemas
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # AI services (RAG, LegalAPI, Citations)
│   │   ├── models/                 # Domain entities (ChatConversation)
│   │   └── types.ts                # AI-specific types
│   │
│   ├── timeline/                    # 📅 Timeline & Deadlines Domain
│   │   ├── api/                    # IPC validation schemas
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # Business logic
│   │   ├── models/                 # Domain entities (TimelineEvent, Deadline, Action)
│   │   ├── views/                  # React UI components
│   │   └── types.ts                # Timeline-specific types
│   │
│   ├── auth/                        # 🔐 Authentication Domain
│   │   ├── api/                    # IPC validation schemas
│   │   ├── repositories/           # Data access layer
│   │   ├── services/               # Auth business logic
│   │   ├── models/                 # Domain entities (User, Session, UserProfile)
│   │   └── types.ts                # Auth-specific types
│   │
│   └── settings/                    # ⚙️ Settings & GDPR Domain
│       ├── api/                    # IPC validation schemas
│       ├── services/               # GDPR services (export, delete, consent)
│       ├── views/                  # Settings UI
│       └── types.ts                # Settings-specific types
│
└── shared/                          # Shared Kernel (Infrastructure)
    ├── infrastructure/
    │   ├── di/                     # Dependency Injection container
    │   ├── encryption/             # EncryptionService, KeyManager, DecryptionCache
    │   ├── audit/                  # AuditLogger, immutable audit trail
    │   └── database/               # Database manager, migrations, backups
    │
    └── ui/
        └── components/             # Reusable UI components (Button, Card, Badge, etc.)
```

---

## Domain Boundaries

### 🏛️ **Cases Domain**
**Responsibility:** Manage case lifecycle, track case facts and legal issues

**Aggregates:**
- `Case` (root) - Case metadata, status, dates
- `CaseFact` - Individual facts linked to a case
- `LegalIssue` - Legal issues tracked for a case

**Key Operations:**
- Create/update/delete cases
- Add facts to cases
- Track legal issues
- View case summary statistics

**Dependencies:**
- ➡️ Evidence domain (cases display evidence count)
- ➡️ Timeline domain (cases display upcoming deadlines)
- ➡️ Legal Research domain (chat conversations save to cases)

---

### 📁 **Evidence Domain**
**Responsibility:** Store and organize evidence files (documents, images, videos)

**Aggregates:**
- `Evidence` (root) - File metadata, encryption, categorization
- `Note` - Notes attached to evidence items

**Key Operations:**
- Upload evidence files
- Categorize evidence (Document, Image, Video, Audio)
- Search evidence by case, type, date
- Add notes to evidence

**Dependencies:**
- ⬅️ Cases domain (evidence belongs to cases)

---

### ⚖️ **Legal Research Domain**
**Responsibility:** AI-powered legal research with UK legal API integration

**Aggregates:**
- `ChatConversation` (root) - Research session with messages
- `Citation` - Legal citations extracted from AI responses

**Key Operations:**
- Ask legal questions (streaming AI responses)
- Retrieve case law and legislation (RAG pipeline)
- Save chat responses to cases
- Extract and display citations

**Dependencies:**
- ⬅️ Cases domain (optional case context for queries)

---

### 📅 **Timeline Domain**
**Responsibility:** Track deadlines, actions, and timeline events

**Aggregates:**
- `TimelineEvent` (root) - Events on the timeline
- `Deadline` - Court deadlines with notifications
- `Action` - Action items with due dates

**Key Operations:**
- Add/edit/delete deadlines
- Track upcoming deadlines
- Visualize case timeline
- Manage action items

**Dependencies:**
- ⬅️ Cases domain (timeline events belong to cases)

---

### 🔐 **Auth Domain**
**Responsibility:** User authentication, session management, profile management

**Aggregates:**
- `User` (root) - User account with credentials
- `Session` - Active user sessions (24-hour expiry)
- `UserProfile` - User preferences and metadata

**Key Operations:**
- Login/logout
- Register new users
- Manage sessions (auto-logout after 24 hours)
- Update user profile
- Change password

**Dependencies:**
- ➡️ Settings domain (profile displayed in settings)

---

### ⚙️ **Settings Domain**
**Responsibility:** User preferences, GDPR compliance (data export/deletion)

**Aggregates:**
- `Consent` (root) - User consents for GDPR
- `UserFact` - User metadata
- `GdprExport` - Data export records
- `GdprDeletion` - Data deletion records

**Key Operations:**
- Update user preferences
- Manage consents (data processing, AI chat storage)
- Export user data (Article 20)
- Delete user data (Article 17)

**Dependencies:**
- ⬅️ Auth domain (uses UserProfile)
- ⬅️ All domains (GDPR export/delete spans all data)

---

## Shared Kernel

### Infrastructure Services
**Used by ALL domains:**
- `EncryptionService` - AES-256-GCM encryption for 11 sensitive fields
- `DecryptionCache` - Performance optimization for encrypted data reads
- `KeyManager` - OS-level encryption key storage (DPAPI/Keychain/libsecret)
- `AuditLogger` - Immutable audit trail with SHA-256 hash chaining
- `RateLimitService` - Rate limiting for GDPR operations and AI calls
- `ValidationMiddleware` - Zod schema validation for all IPC calls
- `CacheService` - Global caching layer (query results, decrypted data)

### Database Layer
- `database.ts` - SQLite connection manager (better-sqlite3)
- `migrate.ts` - Migration runner with rollback support
- `backup.ts` - Automated backup system
- `BaseRepository.ts` - Abstract base class for all repositories

### UI Components
**Reusable across all domain views:**
- `Button`, `Card`, `Badge`, `Toast`, `Skeleton`
- `CommandPalette`, `MainLayout`, `Sidebar`, `Dashboard`

---

## Cross-Domain Communication Patterns

### 1. **Domain Events** (Recommended)
Domains publish events, subscribers react without direct coupling.

**Example:**
```typescript
// Evidence domain publishes event
eventBus.publish(new EvidenceUploadedEvent(caseId, evidenceId));

// Cases domain subscribes
eventBus.subscribe(EvidenceUploadedEvent, (event) => {
  caseRepository.incrementEvidenceCount(event.caseId);
});
```

### 2. **Anti-Corruption Layer (ACL)**
Legal Research depends on Cases via an interface (not direct implementation).

**Example:**
```typescript
// Legal Research domain defines interface
interface ICaseIntegration {
  saveMessageToCase(caseId: string, message: string): Promise<void>;
}

// Cases domain implements interface
class CaseIntegrationService implements ICaseIntegration {
  async saveMessageToCase(caseId: string, message: string) {
    // Implementation
  }
}
```

### 3. **Shared Kernel Models**
Core models used by multiple domains live in `src/shared/domain/`.

**Examples:**
- `User` (used by Auth + Settings)
- `UserProfile` (used by Auth + Settings)
- `AuditLog` (used by all domains)

---

## Migration Phases

### ✅ Phase 1: Structure Preparation (COMPLETED)
- Created 6 domain folders
- Created shared kernel folders
- Added 39 `.gitkeep` files
- Documented migration mapping

### ⏳ Phase 2: Shared Kernel Migration (NEXT)
**Priority:** High (all domains depend on this)
**Estimated Time:** 4 hours

**Files to Move:**
1. `EncryptionService.ts` + `DecryptionCache.ts` + `KeyManager.ts`
2. `AuditLogger.ts` + `AuditLog.ts`
3. `database.ts` + `migrate.ts` + `backup.ts`
4. `BaseRepository.ts`
5. `ValidationMiddleware.ts` + validation schemas
6. UI components (`Button`, `Card`, `Badge`, etc.)

**Success Criteria:**
- All imports updated
- All tests pass (no regressions)
- TypeScript compiles with no errors

### ⏳ Phase 3: Domain Migration (Independent)
**Priority:** Medium (can be done in any order)
**Estimated Time:** 21 hours (3-5 hours per domain)

**Recommended Order:**
1. **Timeline** (fewest dependencies) - 2 hours
2. **Evidence** - 3 hours
3. **Cases** - 4 hours
4. **Legal Research** (most complex) - 5 hours
5. **Auth** - 4 hours
6. **Settings** - 3 hours

### ⏳ Phase 4: Cleanup (FINAL)
**Priority:** Low (after all migrations complete)
**Estimated Time:** 2 hours

**Tasks:**
- Delete old `src/models/`, `src/repositories/`, `src/services/`, `src/views/`
- Update barrel exports
- Run full test suite + E2E tests
- Update documentation (CLAUDE.md, README.md)
- Create PR

---

## File Count Summary

| Domain | Models | Repositories | Services | Views | Total Files |
|--------|--------|--------------|----------|-------|-------------|
| Cases | 3 | 5 | 1 | 7 | 16 |
| Evidence | 2 | 3 | 0* | 6 | 11 |
| Legal Research | 1 | 1 | 8 | 0** | 10 |
| Timeline | 3 | 2 | 0* | 4 | 9 |
| Auth | 3 | 6 | 4 | 0*** | 13 |
| Settings | 3 | 2 | 4 | 1 | 10 |
| **Shared Kernel** | 1 | 1 | 10 | 12 | 24 |
| **TOTAL** | **16** | **20** | **27** | **30** | **93** |

*Service to be created during migration
**ChatView stays in `src/views/` (app-level component)
***Auth components stay in `src/components/auth/` (app-level components)

---

## Import Path Convention

**Before DDD Migration:**
```typescript
import { CaseRepository } from '../repositories/CaseRepository';
import { Case } from '../models/Case';
```

**After DDD Migration:**
```typescript
import { CaseRepository } from '@/domains/cases/repositories/CaseRepository';
import { Case } from '@/domains/cases/models/Case';
import { EncryptionService } from '@/shared/infrastructure/encryption/EncryptionService';
```

**Path Alias Configuration** (tsconfig.json):
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/domains/*": ["./src/domains/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  }
}
```

---

## Testing Strategy

### Per-Domain Testing
After each domain migration:
1. ✅ All unit tests pass (services, repositories)
2. ✅ All integration tests pass (cross-repository queries)
3. ✅ All component tests pass (React Testing Library)
4. ✅ E2E tests pass for domain workflows

### Full System Testing
After all domains migrated:
1. ✅ Full test suite (1156 tests) passes
2. ✅ E2E tests pass (login → create case → upload evidence → chat → timeline)
3. ✅ TypeScript compiles with no errors
4. ✅ ESLint warnings not increased from baseline (320)

---

## Risk Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Circular Dependencies** | HIGH | Use Domain Events, ACL pattern |
| **Broken Imports** | MEDIUM | Automated import update script |
| **Test Failures** | MEDIUM | Run tests after every file move |
| **Merge Conflicts** | LOW | Migrate in small, focused PRs |
| **Performance Regression** | LOW | Keep caching decorators, benchmark critical paths |

---

## Success Criteria ✅

- ✅ **Folder Structure Created** - 6 domains + shared kernel
- ⏳ All domains clearly separated with no circular dependencies
- ⏳ Shared kernel has no domain logic
- ⏳ 100% test pass rate maintained throughout migration
- ⏳ All E2E tests pass
- ⏳ TypeScript compiles with no errors
- ⏳ ESLint warnings not increased
- ⏳ Import paths follow `@/domains/` pattern
- ⏳ Documentation updated (CLAUDE.md, README.md)

---

**Status:** Phase 1 Complete - Ready for Phase 2 (Shared Kernel Migration)

**Next Steps:**
1. Review migration mapping document (DDD-MIGRATION-MAPPING.md)
2. Create EventBus infrastructure (for cross-domain communication)
3. Begin Phase 2: Shared Kernel migration
4. Run automated import update script after each domain

---

**End of Visual Overview**

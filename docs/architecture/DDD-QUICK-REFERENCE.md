# DDD Migration Quick Reference

## 🚀 Quick Start

### What Was Done (Phase 1)
✅ Created folder structure for 6 domains
✅ Created shared kernel folders
✅ Added 39 `.gitkeep` files
✅ Documented comprehensive migration mapping

### What's Next (Phase 2)
⏳ Move shared infrastructure services to `src/shared/`
⏳ Create EventBus for cross-domain communication
⏳ Update imports across codebase

---

## 📁 Folder Structure Summary

```
src/
├── domains/
│   ├── cases/          # 🏛️ Case management
│   ├── evidence/       # 📁 Evidence storage
│   ├── legal-research/ # ⚖️ AI legal assistant
│   ├── timeline/       # 📅 Deadlines & actions
│   ├── auth/           # 🔐 Authentication
│   └── settings/       # ⚙️ Preferences & GDPR
│
└── shared/
    ├── infrastructure/
    │   ├── di/         # Dependency injection
    │   ├── encryption/ # Encryption services
    │   ├── audit/      # Audit logging
    │   └── database/   # DB manager
    └── ui/
        └── components/ # Reusable UI
```

---

## 📊 Domain Overview

| Domain | Models | Repos | Services | Views | Files |
|--------|--------|-------|----------|-------|-------|
| 🏛️ Cases | 3 | 5 | 1 | 7 | 16 |
| 📁 Evidence | 2 | 3 | 0* | 6 | 11 |
| ⚖️ Legal Research | 1 | 1 | 8 | 0** | 10 |
| 📅 Timeline | 3 | 2 | 0* | 4 | 9 |
| 🔐 Auth | 3 | 6 | 4 | 0*** | 13 |
| ⚙️ Settings | 3 | 2 | 4 | 1 | 10 |
| **TOTAL** | **15** | **19** | **17** | **18** | **69** |

*Service to be created during migration
**ChatView stays app-level
***Auth components stay app-level

---

## 🔗 Cross-Domain Dependencies

### Cases ↔ Evidence
**Issue:** Evidence belongs to Case, Cases show evidence count
**Solution:** Domain Event - `EvidenceUploadedEvent`

### Cases ↔ Timeline
**Issue:** Timeline events belong to Cases, Cases show deadlines
**Solution:** Domain Event - `DeadlineApproachingEvent`

### Legal Research → Cases
**Issue:** Chat saves to cases
**Solution:** Anti-Corruption Layer (ACL) interface

### Settings ↔ Auth
**Issue:** Both use UserProfile
**Solution:** Shared Kernel - UserProfile in Auth domain

---

## 📋 Migration Phases

### ✅ Phase 1: Structure (DONE)
- Created all folders
- Added `.gitkeep` files
- Documented mapping

### ⏳ Phase 2: Shared Kernel (4 hours)
**Move to `src/shared/infrastructure/`:**
1. Encryption services (EncryptionService, KeyManager, DecryptionCache)
2. Audit services (AuditLogger, AuditLog model)
3. Database layer (database.ts, migrate.ts, backup.ts)
4. Validation (ValidationMiddleware, sanitizers)
5. UI components (Button, Card, Badge, Toast, etc.)

### ⏳ Phase 3: Domains (21 hours)
**Recommended order:**
1. Timeline (2h) - fewest dependencies
2. Evidence (3h)
3. Cases (4h)
4. Legal Research (5h) - most complex
5. Auth (4h)
6. Settings (3h)

### ⏳ Phase 4: Cleanup (2 hours)
- Delete old folders
- Update documentation
- Run full test suite
- Create PR

---

## 🛠️ Import Path Changes

### Before
```typescript
import { Case } from '../models/Case';
import { CaseRepository } from '../repositories/CaseRepository';
import { EncryptionService } from '../services/EncryptionService';
```

### After
```typescript
import { Case } from '@/domains/cases/models/Case';
import { CaseRepository } from '@/domains/cases/repositories/CaseRepository';
import { EncryptionService } from '@/shared/infrastructure/encryption/EncryptionService';
```

---

## ✅ Success Criteria

- [x] Folder structure created (39 folders)
- [ ] Shared kernel migrated with tests passing
- [ ] All 6 domains migrated independently
- [ ] No circular dependencies
- [ ] 100% test pass rate (1156 tests)
- [ ] All E2E tests pass
- [ ] TypeScript compiles with no errors
- [ ] ESLint warnings not increased
- [ ] Documentation updated

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `DDD-MIGRATION-MAPPING.md` | Comprehensive 93-file migration mapping |
| `DDD-STRUCTURE-VISUAL.md` | Visual overview of domain boundaries |
| `DDD-QUICK-REFERENCE.md` | This file - quick reference |

---

## ⚠️ Important Notes

- **DO NOT move files yet** - structure only prepared
- Use `git mv` to preserve file history
- Run tests after every file move
- Update imports incrementally
- Each domain migration = separate commit
- Use automated import update script

---

## 🎯 Next Action

**Ready for Phase 2: Shared Kernel Migration**

Start with:
1. Move `EncryptionService.ts` → `src/shared/infrastructure/encryption/`
2. Move `DecryptionCache.ts` → `src/shared/infrastructure/encryption/`
3. Move `KeyManager.ts` → `src/shared/infrastructure/encryption/`
4. Update all imports referencing these files
5. Run full test suite
6. Verify 100% pass rate before proceeding

---

**Total Estimated Time:** 28 hours
**Complexity:** Medium-High
**Risk:** Medium (mitigated with testing strategy)

---

**End of Quick Reference**

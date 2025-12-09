# Duplicate Files Scan Report
**Date:** December 9, 2025  
**Scope:** Justice Companion app directory  
**Excluded:** node_modules, venv, serena_agent-0.1.4, dist, __pycache__

---

## 🎯 KEY FINDINGS

### 1. Critical Code Duplicates (3 files)

These TypeScript entity files exist in **TWO locations** with **identical content**:

| File | Old Location | New Location | Size | Status |
|------|--------------|--------------|------|--------|
| Case.ts | `src/models/` | `src/domains/cases/entities/` | 636 bytes | ❌ Duplicate |
| CaseFact.ts | `src/models/` | `src/domains/cases/entities/` | 1.2 KB | ❌ Duplicate |
| Deadline.ts | `src/models/` | `src/domains/timeline/entities/` | 2.9 KB | ❌ Duplicate |

**MD5 Hashes Verified:** Files are 100% identical (same hash).

---

## 📁 Directory Analysis

### Old Structure: `src/models/` (14 files)
```
AuditLog.ts (4.2 KB)
Case.ts (636 bytes) ← DUPLICATE
CaseFact.ts (1.2 KB) ← DUPLICATE
ChatConversation.ts
Deadline.ts (2.9 KB) ← DUPLICATE
Document.ts
Evidence.ts
Export.ts
Gdpr.ts
Note.ts
Notification.ts
NotificationPreferences.ts
Tag.ts
UserFact.ts
```

### New Structure: `src/domains/**/entities/` (12 files)
```
domains/auth/entities/
  - Permission.ts
  - Role.ts
  - Session.ts
  - User.ts

domains/cases/entities/
  - Case.ts ← DUPLICATE
  - CaseFact.ts ← DUPLICATE

domains/evidence/entities/
  - Evidence.ts

domains/legal-research/entities/
  - LegalIssue.ts

domains/settings/entities/
  - Consent.ts
  - UserProfile.ts

domains/timeline/entities/
  - Deadline.ts ← DUPLICATE
  - TimelineEvent.ts
```

---

## 🔍 Import Analysis

**CRITICAL DISCOVERY:**

```bash
# Imports from @/models path: 0 ❌
# Imports from @/domains path: 0 ❌
```

**Neither directory is actively imported** in the codebase!

### Actual Type Definitions Location

Types are defined inline in:
- ✅ `src/lib/types/api.ts` - REST API types (in use)

---

## 💡 Recommendations

### Option 1: Keep DDD Structure (Recommended)
If migrating to Domain-Driven Design:

1. **Delete old `src/models/` directory** (all 14 files)
2. **Keep `src/domains/` structure**
3. **Update imports** to use `@/domains/**/entities/*`
4. **Move remaining models** (11 files) to appropriate domains:
   - AuditLog → `domains/audit/entities/`
   - ChatConversation → `domains/chat/entities/`
   - Document, Evidence → `domains/evidence/entities/`
   - Export, Gdpr → `domains/settings/entities/`
   - Note, Tag → `domains/cases/entities/`
   - Notification, NotificationPreferences → `domains/notifications/entities/`
   - UserFact → `domains/cases/entities/`

**Benefit:** Clean architecture, better organization, eliminates duplicates

### Option 2: Keep Simple Structure
If keeping flat structure:

1. **Delete `src/domains/` directory** (all subdirectories)
2. **Keep `src/models/` as single source of truth**
3. **Keep using `src/lib/types/api.ts`** for API contracts

**Benefit:** Simpler structure, fewer directories

### Option 3: Hybrid (Current State)
**NOT RECOMMENDED** - You have:
- ❌ 3 exact duplicates
- ❌ Neither directory actively imported
- ❌ Types defined in third location (`src/lib/types/api.ts`)
- ❌ Confusion about where to add new types

---

## 🗑️ Other Duplicates Found

### Test Error Reports (Expected)
Playwright generates duplicate error context files:
- `playwright-report/data/*.md`
- `test-results/**/error-context.md`

**Action:** ✅ These are normal test artifacts, ignore.

### Vendor Packages (Expected)
Python venv has duplicate vendor packages:
- `pip/_vendor/`
- `pkg_resources/_vendor/`
- `setuptools/_vendor/`

**Action:** ✅ Normal Python packaging, ignore.

---

## 📊 Summary Statistics

| Category | Count | Size | Action |
|----------|-------|------|--------|
| Critical code duplicates | 3 | 4.7 KB | ⚠️ Fix required |
| Unused model files | 11 | 19.6 KB | 🔍 Review needed |
| Test artifacts | ~50+ | N/A | ✅ Normal |
| Vendor packages | ~40+ | N/A | ✅ Normal |

---

## ⚡ Immediate Action Items

1. **Decide on architecture:**
   - [ ] DDD (domains) OR
   - [ ] Flat (models) OR
   - [ ] API types only (current reality)

2. **Remove duplicates:**
   - [ ] Delete `src/models/Case.ts`
   - [ ] Delete `src/models/CaseFact.ts`
   - [ ] Delete `src/models/Deadline.ts`
   OR
   - [ ] Delete `src/domains/cases/entities/Case.ts`
   - [ ] Delete `src/domains/cases/entities/CaseFact.ts`
   - [ ] Delete `src/domains/timeline/entities/Deadline.ts`

3. **Update imports** (if any exist)

4. **Document decision** in CLAUDE.md or ARCHITECTURE.md

---

## 🔗 Related

- See `.serena/memories/codebase-redundancy-audit-dec2025.md` for broader redundancy audit
- Phase 1 cleanup (commit 8ebce1f2) removed dead code
- Phase 2 DI migration (commit 2e7c40e7) centralized backend dependencies

**Next:** Choose architecture direction and eliminate duplicates!

# TypeScript Files to Delete - Post-Migration Cleanup

**Purpose:** Inventory of TypeScript files to delete after HTTP migration testing passes

**Status:** 🔴 DO NOT DELETE YET - Complete testing checklist first

**Migration Date:** 2025-01-15

**Migration Summary:** 13 feature areas migrated from Electron IPC to HTTP REST API

---

## Executive Summary

**Total Files to Delete:** 28 files (~15,000 lines of code)

**Reason for Deletion:**
- All IPC handlers replaced by HTTP REST API endpoints in Python backend
- All TypeScript services replaced by Python services
- All IPC utilities replaced by HTTP client (`src/lib/apiClient.ts`)

**Files to Keep:**
- `electron/main.ts` - Electron entry point (modified to remove IPC handlers)
- `electron/preload.ts` - Security bridge (modified to expose only shell operations)
- `electron/launcher.ts` - Application launcher
- `electron/runtime/MainApplication.ts` - Core runtime
- `electron/services/PythonProcessManager.ts` - Python backend process manager
- `electron/services/KeyManagerService.ts` - Encryption key management

---

## Deletion Checklist

### Pre-Deletion Requirements

- [ ] All tests in `TESTING-BEFORE-TYPESCRIPT-CLEANUP.md` pass
- [ ] Backend running at http://127.0.0.1:8000
- [ ] Frontend connects successfully via HTTP
- [ ] Authentication works via HTTP
- [ ] All 13 feature areas tested manually
- [ ] E2E tests pass
- [ ] Git backup created: `git add -A && git commit -m "Pre-cleanup backup"`

---

## Category 1: IPC Handlers (20 files) - DELETE ALL

**Location:** `electron/ipc-handlers/`

**Reason:** All IPC communication replaced by HTTP REST API

| File | Lines | Replaced By | Status |
|------|-------|-------------|--------|
| `action-logs.ts` | ~150 | `backend/routes/action_logs.py` | 🗑️ Delete |
| `ai-config.ts` | ~200 | `backend/routes/ai_config.py` | 🗑️ Delete |
| `ai-status.ts` | ~180 | `backend/routes/ai_status.py` | 🗑️ Delete |
| `auth.ts` | ~300 | `backend/routes/auth.py` | 🗑️ Delete |
| `cases.ts` | ~400 | `backend/routes/cases.py` | 🗑️ Delete |
| `chat.ts` | ~350 | `backend/routes/chat.py` (SSE streaming) | 🗑️ Delete |
| `dashboard.ts` | ~250 | `backend/routes/dashboard.py` | 🗑️ Delete |
| `database.ts` | ~200 | `backend/routes/database.py` | 🗑️ Delete |
| `deadlines.ts` | ~300 | `backend/routes/deadlines.py` | 🗑️ Delete |
| `evidence.ts` | ~350 | `backend/routes/evidence.py` | 🗑️ Delete |
| `export.ts` | ~250 | `backend/routes/export.py` | 🗑️ Delete |
| `gdpr.ts` | ~300 | `backend/routes/gdpr.py` | 🗑️ Delete |
| `index.ts` | ~100 | N/A (index file) | 🗑️ Delete |
| `notifications.ts` | ~250 | `backend/routes/notifications.py` | 🗑️ Delete |
| `port-status.ts` | ~150 | `backend/routes/port_status.py` | 🗑️ Delete |
| `profile.ts` | ~200 | `backend/routes/profile.py` | 🗑️ Delete |
| `search.ts` | ~300 | `backend/routes/search.py` | 🗑️ Delete |
| `tags.ts` | ~250 | `backend/routes/tags.py` | 🗑️ Delete |
| `templates.ts` | ~300 | `backend/routes/templates.py` | 🗑️ Delete |
| `ui.ts` | ~150 | 501 Not Implemented (Electron-only) | 🗑️ Delete |

**Total:** 20 files, ~5,000 lines

**Delete Command:**
```bash
rm -rf electron/ipc-handlers/
```

---

## Category 2: TypeScript Services (5 files) - DELETE 3, KEEP 2

**Location:** `electron/services/`

### Files to DELETE (3 files)

| File | Lines | Replaced By | Reason |
|------|-------|-------------|--------|
| `AIHttpClient.ts` | ~400 | `src/lib/apiClient.ts` | HTTP client now in frontend |
| `AIProviderConfigService.singleton.ts` | ~300 | `backend/services/ai_provider_config_service.py` | Config management in backend |
| `SessionManager.ts` | ~250 | `backend/routes/auth.py` + localStorage | Session management in backend |

**Total:** 3 files, ~950 lines

**Delete Commands:**
```bash
rm electron/services/AIHttpClient.ts
rm electron/services/AIProviderConfigService.singleton.ts
rm electron/services/SessionManager.ts
```

### Files to KEEP (2 files)

| File | Lines | Reason to Keep |
|------|-------|----------------|
| `PythonProcessManager.ts` | ~500 | Manages Python backend subprocess (essential) |
| `KeyManagerService.ts` | ~300 | Encryption key management (essential) |

**Total:** 2 files, ~800 lines (KEEP)

---

## Category 3: Utilities (3 files) - DELETE ALL

**Location:** `electron/utils/`

| File | Lines | Replaced By | Reason |
|------|-------|-------------|--------|
| `authorization-wrapper.ts` | ~150 | `backend/dependencies.py` (FastAPI Depends) | Authorization now in backend |
| `ipc-response.ts` | ~100 | HTTP responses (FastAPI) | IPC response format no longer needed |
| `audit-helper.ts` | ~200 | `backend/services/audit_logger.py` | Audit logging in backend |

**Total:** 3 files, ~450 lines

**Delete Commands:**
```bash
rm electron/utils/authorization-wrapper.ts
rm electron/utils/ipc-response.ts
rm electron/utils/audit-helper.ts
```

---

## Category 4: Tests (1 file) - DELETE

**Location:** `electron/__tests__/`

| File | Lines | Reason |
|------|-------|--------|
| `main-application.test.ts` | ~300 | Tests IPC handlers (no longer exist) |

**Total:** 1 file, ~300 lines

**Delete Command:**
```bash
rm electron/__tests__/main-application.test.ts
```

---

## Category 5: Core Files - MODIFY, DO NOT DELETE

**Location:** `electron/`

### Files to MODIFY (not delete)

**1. `electron/main.ts`**
- **Current State:** Registers all IPC handlers
- **Required Changes:**
  - Remove all IPC handler imports
  - Remove all `ipcMain.handle()` calls
  - Keep Python process manager
  - Keep window creation
  - Keep app lifecycle

**Before (lines to remove):**
```typescript
import { registerAuthHandlers } from './ipc-handlers/auth';
import { registerCasesHandlers } from './ipc-handlers/cases';
// ... 18 more imports

// Register all IPC handlers
registerAuthHandlers();
registerCasesHandlers();
// ... 18 more registrations
```

**After:**
```typescript
// No IPC handler imports
// No IPC handler registrations
// Just Electron window management + Python subprocess
```

**2. `electron/preload.ts`**
- **Current State:** Exposes IPC channels to renderer
- **Required Changes:**
  - Remove all IPC channel exposures except Electron shell operations
  - Keep only: `openExternal`, `showItemInFolder`, `getPath`
  - Remove all API object exposures

**Before (lines to remove):**
```typescript
contextBridge.exposeInMainWorld('api', {
  auth: {
    register: (...) => ipcRenderer.invoke('auth:register', ...),
    login: (...) => ipcRenderer.invoke('auth:login', ...),
    // ... 100+ IPC methods
  }
});
```

**After:**
```typescript
contextBridge.exposeInMainWorld('electron', {
  openExternal: (url: string) => shell.openExternal(url),
  showItemInFolder: (path: string) => shell.showItemInFolder(path),
  getPath: (name: string) => app.getPath(name),
});
```

**3. `electron/database-init.ts`**
- **Current State:** Initializes SQLite database
- **Required Changes:**
  - May need to keep if Electron still manages database
  - If Python backend owns database, this can be deleted
  - Decision pending testing

**4. `electron/launcher.ts`**
- **Keep as-is:** Manages application launch sequence

**5. `electron/runtime/MainApplication.ts`**
- **Keep as-is:** Core application runtime
- **Remove:** IPC handler registrations if present

---

## Summary Statistics

| Category | Files to Delete | Lines of Code | Files to Keep | Lines of Code |
|----------|----------------|---------------|---------------|---------------|
| IPC Handlers | 20 | ~5,000 | 0 | 0 |
| Services | 3 | ~950 | 2 | ~800 |
| Utilities | 3 | ~450 | 0 | 0 |
| Tests | 1 | ~300 | 0 | 0 |
| Core Files | 0 | 0 | 4 | ~2,000 (modified) |
| **TOTAL** | **27** | **~6,700** | **6** | **~2,800** |

**Code Reduction:** 71% reduction in Electron layer code (6,700 lines deleted)

---

## Deletion Procedure

### Step 1: Create Git Backup
```bash
cd "F:\Justice Companion take 2"
git add -A
git commit -m "Pre-cleanup backup: All features working via HTTP"
git tag pre-typescript-cleanup
```

### Step 2: Delete IPC Handlers (Category 1)
```bash
# Delete entire directory
rm -rf electron/ipc-handlers/

# Verify deletion
ls electron/ipc-handlers/
# Should show: "cannot access ... No such file or directory"
```

### Step 3: Delete TypeScript Services (Category 2)
```bash
# Delete 3 obsolete services
rm electron/services/AIHttpClient.ts
rm electron/services/AIProviderConfigService.singleton.ts
rm electron/services/SessionManager.ts

# Verify KeyManager and PythonProcessManager still exist
ls electron/services/
# Should show: KeyManagerService.ts, PythonProcessManager.ts
```

### Step 4: Delete Utilities (Category 3)
```bash
rm electron/utils/authorization-wrapper.ts
rm electron/utils/ipc-response.ts
rm electron/utils/audit-helper.ts

# Verify deletion
ls electron/utils/
# Should show empty or only non-IPC utilities
```

### Step 5: Delete Test File (Category 4)
```bash
rm electron/__tests__/main-application.test.ts

# Verify deletion
ls electron/__tests__/
# Should show empty directory
```

### Step 6: Modify Core Files (Category 5)

**6.1 Modify `electron/main.ts`**
```bash
# Open file
code electron/main.ts

# Remove lines:
# - All IPC handler imports (lines 5-25)
# - All IPC handler registrations (lines 100-120)

# Keep:
# - PythonProcessManager import and initialization
# - Window creation code
# - App lifecycle (ready, window-all-closed, activate)
```

**6.2 Modify `electron/preload.ts`**
```bash
# Open file
code electron/preload.ts

# Replace entire contextBridge.exposeInMainWorld call with:
contextBridge.exposeInMainWorld('electron', {
  openExternal: (url: string) => shell.openExternal(url),
  showItemInFolder: (path: string) => shell.showItemInFolder(path),
  getPath: (name: string) => app.getPath(name),
});
```

**6.3 Review `electron/database-init.ts`**
```bash
# Decision needed: Keep or delete?
# If backend owns database: DELETE
# If Electron manages database: KEEP
```

### Step 7: Update TypeScript Config
```bash
# Remove IPC handlers from tsconfig paths
code tsconfig.electron.json

# Update exclude patterns if needed
```

### Step 8: Test After Deletion
```bash
# 1. Type check
npm run type-check

# 2. Build check
npm run build

# 3. Run app
npm run electron:dev

# 4. Verify features work via HTTP
# Follow TESTING-BEFORE-TYPESCRIPT-CLEANUP.md checklist again
```

### Step 9: Commit Cleanup
```bash
git add -A
git commit -m "Remove TypeScript services - migrated to HTTP API

- Deleted 27 TypeScript files (~6,700 lines)
- Removed all IPC handlers (20 files)
- Removed obsolete services (3 files)
- Removed IPC utilities (3 files)
- Modified electron/main.ts (removed IPC registrations)
- Modified electron/preload.ts (removed IPC exposures)
- Frontend now uses HTTP REST API via src/lib/apiClient.ts
- Backend Python services handle all business logic

Migration complete: Electron IPC → HTTP REST API"
```

### Step 10: Create Post-Cleanup Tag
```bash
git tag post-typescript-cleanup
git push origin main --tags
```

---

## Rollback Plan

If issues are discovered after deletion:

### Option 1: Git Reset (Soft)
```bash
git reset --soft pre-typescript-cleanup
# Restores deleted files but keeps changes staged
```

### Option 2: Git Reset (Hard)
```bash
git reset --hard pre-typescript-cleanup
# Completely restores pre-cleanup state (WARNING: loses all changes)
```

### Option 3: Selective Restore
```bash
# Restore specific file
git checkout pre-typescript-cleanup -- electron/ipc-handlers/auth.ts

# Restore entire directory
git checkout pre-typescript-cleanup -- electron/ipc-handlers/
```

---

## Verification Checklist

After deletion, verify:

### Build & Type Check
- [ ] `npm run type-check` passes with 0 errors
- [ ] `npm run lint` passes (or only style warnings)
- [ ] `npm run build` succeeds

### Application Launch
- [ ] App launches without errors
- [ ] No console errors about missing modules
- [ ] Python backend starts successfully
- [ ] Frontend connects to backend

### Feature Testing
- [ ] Authentication works (login/logout)
- [ ] Dashboard loads with data
- [ ] Case management works (create/edit/delete)
- [ ] AI chat streaming works
- [ ] Search returns results
- [ ] All 13 feature areas functional

### Performance
- [ ] No performance regressions
- [ ] Dashboard loads < 2 seconds
- [ ] Search responds < 100ms

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Accidental deletion of needed files | Low | High | Git backup + verification checklist |
| Missing IPC references in code | Medium | Medium | Type check + linting catches at compile time |
| Runtime errors after deletion | Low | High | Comprehensive testing before deletion |
| Cannot restore deleted files | Very Low | High | Git backup + tags |

---

## Success Criteria

Deletion is successful when:

1. ✅ All 27 TypeScript files deleted
2. ✅ All IPC handler references removed from `electron/main.ts`
3. ✅ All IPC exposures removed from `electron/preload.ts`
4. ✅ `npm run type-check` passes
5. ✅ `npm run build` succeeds
6. ✅ App launches and runs
7. ✅ All features work via HTTP
8. ✅ No console errors
9. ✅ Performance maintained or improved
10. ✅ Git commit + tag created

---

## Dependencies to Update

After deletion, update `package.json` to remove unused dependencies:

### Potentially Removable Dependencies

Check if these are still used elsewhere:

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",  // Check if Electron still uses SQLite directly
  }
}
```

Run dependency analysis:
```bash
# Check for unused dependencies
npx depcheck

# Remove unused dependencies
npm prune
```

---

## Documentation Updates

After deletion, update:

1. **README.md** - Remove references to IPC architecture
2. **Architecture diagrams** - Update to show HTTP-only communication
3. **CLAUDE.md** - Update development workflow
4. **API documentation** - Ensure all endpoints documented

---

## Timeline

| Phase | Task | Duration | Prerequisite |
|-------|------|----------|--------------|
| 1 | Complete testing checklist | 2-3 hours | Backend running, tests ready |
| 2 | Create Git backup | 1 minute | All tests pass |
| 3 | Delete files (Categories 1-4) | 5 minutes | Backup created |
| 4 | Modify core files (Category 5) | 30 minutes | Files deleted |
| 5 | Type check + build | 5 minutes | Modifications complete |
| 6 | Smoke testing | 30 minutes | Build succeeds |
| 7 | Comprehensive testing | 1-2 hours | Smoke tests pass |
| 8 | Git commit + tag | 1 minute | All tests pass |
| **TOTAL** | | **4-6 hours** | |

---

## Contact & Support

If issues arise during deletion:

1. Check git backup: `git log --oneline`
2. Restore from backup: `git reset --hard pre-typescript-cleanup`
3. Review error logs in `electron/logs/`
4. Check backend status: `curl http://localhost:8000/health`

---

**Generated:** 2025-01-15
**Status:** 🔴 READY TO DELETE (after testing passes)
**Estimated Code Reduction:** 71% (6,700 lines deleted)
**Migration:** Electron IPC → HTTP REST API
**Backend:** Python/FastAPI at http://127.0.0.1:8000
**Frontend:** React with HTTP client (`src/lib/apiClient.ts`)

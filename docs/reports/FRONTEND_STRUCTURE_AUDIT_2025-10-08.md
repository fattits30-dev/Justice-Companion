# Frontend Structure Audit - 2025-10-08

## Executive Summary

**Total Files Audited**: 141 TypeScript/TSX files in `src/`
**React Components**: 51 TSX files (36%)
**Test Files**: 24 test files (17%)
**Organizational Status**: ⚠️ NEEDS RESTRUCTURING

The current frontend structure uses a **layer-based architecture** (components, hooks, services) but lacks **feature-based organization**. This audit identifies significant organizational issues and recommends a feature-based restructure to improve maintainability, co-location, and developer experience.

---

## 1. Current Directory Structure

```
src/
├── components/ (51 files)
│   ├── facts/
│   │   ├── CaseFactsPanel.tsx
│   │   ├── CaseFactsPanel.test.tsx
│   │   ├── UserFactsPanel.tsx
│   │   └── UserFactsPanel.test.tsx
│   ├── legal/
│   │   └── LegalIssuesPanel.tsx
│   ├── notes/
│   │   ├── NotesPanel.tsx
│   │   └── NotesPanel.test.tsx
│   ├── timeline/
│   │   └── TimelineView.tsx
│   ├── ui/ (7 utility components)
│   │   ├── DashboardEmptyState.tsx
│   │   ├── dialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   └── sonner.tsx
│   ├── views/ (5 views + 5 tests)
│   │   ├── CaseDetailView.tsx
│   │   ├── CasesView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── DocumentsView.tsx
│   │   └── SettingsView.tsx
│   └── [29 root-level components]
│       ├── ChatWindow.tsx
│       ├── ChatInput.tsx
│       ├── FloatingChatInput.tsx
│       ├── MessageBubble.tsx
│       ├── MessageList.tsx
│       ├── Sidebar.tsx
│       ├── SidebarCaseContext.tsx
│       ├── SidebarNavigation.tsx
│       ├── SidebarProfile.tsx
│       ├── PostItNote.tsx
│       ├── ChatNotesPanel.tsx
│       ├── ChatPostItNotes.tsx
│       ├── FileUploadModal.tsx
│       ├── ErrorBoundary.tsx
│       ├── ViewErrorBoundary.tsx
│       ├── ErrorDisplay.tsx
│       ├── ErrorTestButton.tsx
│       ├── ConfirmDialog.tsx
│       ├── DisclaimerBanner.tsx
│       ├── SourceCitation.tsx
│       ├── StreamingIndicator.tsx
│       └── ThemeProvider.tsx
├── hooks/ (11 hooks + 6 tests)
│   ├── useAI.ts
│   ├── useCases.ts
│   ├── useCaseFacts.ts
│   ├── useEvidence.ts
│   ├── useLegalIssues.ts
│   ├── useNotes.ts
│   ├── useTimeline.ts
│   ├── useUserFacts.ts
│   ├── useToast.ts
│   ├── useVoiceRecognition.ts
│   └── useAI.integration.md
├── services/ (13 services + 11 tests)
│   ├── AuditLogger.ts (433 lines)
│   ├── EncryptionService.ts (216 lines)
│   ├── CaseService.ts
│   ├── CaseFactsService.ts
│   ├── UserFactsService.ts
│   ├── LegalIssuesService.ts
│   ├── TimelineService.ts
│   ├── NotesService.ts
│   ├── ChatConversationService.ts
│   ├── UserProfileService.ts
│   ├── IntegratedAIService.ts
│   ├── LegalAPIService.ts
│   ├── RAGService.ts
│   ├── ModelDownloadService.ts
│   ├── AIServiceFactory.ts
│   ├── AIFunctionDefinitions.ts
│   └── ai-functions.ts
├── repositories/ (8 repositories + 7 tests)
│   ├── CaseRepository.ts
│   ├── CaseFactsRepository.ts
│   ├── UserFactsRepository.ts
│   ├── EvidenceRepository.ts
│   ├── LegalIssuesRepository.ts
│   ├── TimelineRepository.ts
│   ├── NotesRepository.ts
│   ├── ChatConversationRepository.ts
│   └── UserProfileRepository.ts
├── models/ (12 models)
│   ├── Case.ts
│   ├── CaseFact.ts
│   ├── UserFact.ts
│   ├── Evidence.ts
│   ├── LegalIssue.ts
│   ├── TimelineEvent.ts
│   ├── Note.ts
│   ├── ChatConversation.ts
│   ├── UserProfile.ts
│   ├── AuditLog.ts
│   ├── Action.ts
│   └── index.ts
├── db/ (3 files + 5 migrations)
│   ├── database.ts
│   ├── migrate.ts
│   ├── backup.ts
│   └── migrations/
├── types/ (3 type definition files)
│   ├── ai.ts
│   ├── electron.d.ts
│   └── ipc.ts
├── utils/ (4 utility files)
│   ├── error-logger.ts
│   ├── logger.ts
│   └── exportToPDF.ts
├── test-utils/ (4 test utilities)
│   ├── database-test-helper.ts
│   ├── setup.ts
│   ├── test-utils.ts
│   └── test-utils.tsx
├── contexts/ (1 context)
│   └── DebugContext.tsx
├── lib/ (1 utility)
│   └── utils.ts
├── App.tsx (158 lines)
├── main.tsx
├── index.css
└── electron-ipc-handlers.test.ts
```

**File Count Summary**:
- **Components**: 51 TSX files (29 root-level, 22 organized)
- **Hooks**: 11 hooks + 6 tests
- **Services**: 13 services + 11 tests
- **Repositories**: 8 repositories + 7 tests
- **Models**: 12 model files
- **Total**: 141 TS/TSX files

---

## 2. Components Inventory

### 2.1 View Components (5 files + 5 tests)
Located in `components/views/`

| Component | Lines | Purpose | Dependencies |
|-----------|-------|---------|--------------|
| `DashboardView.tsx` | 260 | Main dashboard with stats | `useCases`, `DashboardEmptyState` |
| `CasesView.tsx` | ~300 | Case list and management | `useCases` |
| `CaseDetailView.tsx` | 241 | Case detail with tabs | `useCases`, `useEvidence`, 6 panel components |
| `DocumentsView.tsx` | ~250 | Document upload/management | `useEvidence` |
| `SettingsView.tsx` | ~200 | App settings | - |

**Key Finding**: Views are well-organized in a subdirectory, but they depend on components scattered across multiple locations.

### 2.2 Feature-Specific Components (8 files)
Partially organized in subdirectories:

**Facts Feature** (`components/facts/`):
- `UserFactsPanel.tsx` (260 lines) + test
- `CaseFactsPanel.tsx` (420 lines) + test

**Legal Feature** (`components/legal/`):
- `LegalIssuesPanel.tsx` (360 lines)

**Notes Feature** (`components/notes/`):
- `NotesPanel.tsx` (270 lines) + test

**Timeline Feature** (`components/timeline/`):
- `TimelineView.tsx` (470 lines)

**Issue**: These features have components in subdirectories but hooks and services are in separate directories, breaking co-location.

### 2.3 Chat Components (9 files)
**SCATTERED** across root `components/`:

| Component | Purpose | Issue |
|-----------|---------|-------|
| `ChatWindow.tsx` | Main chat container | Root level |
| `ChatInput.tsx` | Basic input component | **DUPLICATE** with FloatingChatInput |
| `FloatingChatInput.tsx` | Advanced input with voice/upload | **DUPLICATE** with ChatInput |
| `MessageBubble.tsx` | Individual message display | Root level |
| `MessageList.tsx` | Scrollable message container | Root level |
| `ChatNotesPanel.tsx` | Notes in chat | Root level |
| `ChatPostItNotes.tsx` | Post-it notes in chat | Root level |
| `StreamingIndicator.tsx` | AI streaming animation | Root level |
| `SourceCitation.tsx` | Legal source citations | Root level |

**Critical Issue**: Chat feature has 9 components but NO feature directory. All in root.

### 2.4 Sidebar Components (4 files)
**SCATTERED** across root `components/`:

- `Sidebar.tsx` (282 lines) - Main sidebar container
- `SidebarCaseContext.tsx` - Case selector in sidebar
- `SidebarNavigation.tsx` - Navigation links
- `SidebarProfile.tsx` - User profile in sidebar

**Issue**: Sidebar is a cohesive feature but components are at root level.

### 2.5 Shared/UI Components (7 files)
Located in `components/ui/`:

- `DashboardEmptyState.tsx` - Empty state for dashboard
- `EmptyState.tsx` - Generic empty state
- `LoadingSpinner.tsx` - Loading indicator (**DUPLICATE**)
- `Spinner.tsx` - Loading spinner (**DUPLICATE**)
- `Skeleton.tsx` - Loading skeleton
- `dialog.tsx` - Dialog primitive
- `sonner.tsx` - Toast notifications

**Issue**: Two spinner components (`LoadingSpinner` + `Spinner`) indicate duplication.

### 2.6 Utility Components (7 files)
**SCATTERED** across root `components/`:

- `ErrorBoundary.tsx` - Global error boundary
- `ViewErrorBoundary.tsx` - View-specific error boundary
- `ErrorDisplay.tsx` - Error message display
- `ErrorTestButton.tsx` - Development testing button
- `ConfirmDialog.tsx` - Confirmation dialog
- `ThemeProvider.tsx` - Theme context provider
- `DisclaimerBanner.tsx` - Legal disclaimer

### 2.7 Reusable Components (2 files)
- `PostItNote.tsx` (210 lines) - Reusable post-it note component
- `FileUploadModal.tsx` - File upload dialog

---

## 3. React Hooks Inventory

Located in `hooks/` (11 hooks + 6 tests + 1 doc)

### 3.1 Data Management Hooks (8 hooks)
| Hook | Purpose | Related Feature | Lines |
|------|---------|-----------------|-------|
| `useCases.ts` | Case CRUD operations | Cases | ~85 |
| `useCaseFacts.ts` | Case facts CRUD | Facts | ~115 |
| `useUserFacts.ts` | User facts CRUD | Facts | ~100 |
| `useEvidence.ts` | Evidence CRUD | Documents | ~85 |
| `useLegalIssues.ts` | Legal issues CRUD | Legal | ~85 |
| `useNotes.ts` | Notes CRUD | Notes | ~85 |
| `useTimeline.ts` | Timeline events CRUD | Timeline | ~85 |
| `useAI.ts` | AI chat integration | Chat | ~200 |

**Issue**: All hooks are in a single directory, far from the components that use them.

### 3.2 Utility Hooks (2 hooks)
- `useToast.ts` - Toast notifications wrapper
- `useVoiceRecognition.ts` - Voice input handler

### 3.3 Documentation
- `useAI.integration.md` - AI integration guide

---

## 4. Services Inventory

Located in `services/` (13 services + 11 tests)

### 4.1 Core Infrastructure Services (2 services)
- `EncryptionService.ts` (216 lines) - AES-256-GCM encryption
- `AuditLogger.ts` (433 lines) - Blockchain-style audit logging

**Status**: Well-documented, critical security infrastructure.

### 4.2 Business Logic Services (8 services)
| Service | Purpose | Lines | Test Coverage |
|---------|---------|-------|---------------|
| `CaseService.ts` | Case business logic | ~150 | ❌ No test |
| `CaseFactsService.ts` | Case facts logic | 154 | ✅ Tested |
| `UserFactsService.ts` | User facts logic | 135 | ✅ Tested |
| `LegalIssuesService.ts` | Legal issues logic | 123 | ✅ Tested |
| `TimelineService.ts` | Timeline logic | 127 | ✅ Tested |
| `NotesService.ts` | Notes logic | 95 | ✅ Tested |
| `ChatConversationService.ts` | Chat logic | ~100 | ❌ No test |
| `UserProfileService.ts` | Profile logic | ~100 | ❌ No test |

### 4.3 AI/Integration Services (3 services)
- `IntegratedAIService.ts` - AI service orchestration
- `LegalAPIService.ts` - External legal API integration (tested)
- `RAGService.ts` - Retrieval-Augmented Generation
- `ModelDownloadService.ts` - Model management
- `AIServiceFactory.ts` - AI service factory pattern
- `AIFunctionDefinitions.ts` - AI function schemas
- `ai-functions.ts` - AI function implementations

**Issue**: AI-related services are mixed with business logic services.

---

## 5. Key Organizational Issues

### 5.1 DUPLICATE COMPONENTS ⚠️

**Chat Input Duplication**:
- `ChatInput.tsx` - Basic input (Enter to send, Shift+Enter for newline)
- `FloatingChatInput.tsx` - Advanced input (voice, file upload, floating design)
- **Impact**: Both components serve similar purposes but with different feature sets
- **Recommendation**: Consolidate into single configurable component OR clearly document when to use each

**Spinner Duplication**:
- `LoadingSpinner.tsx` in `components/ui/`
- `Spinner.tsx` in `components/ui/`
- **Impact**: Two loading indicators in same directory
- **Recommendation**: Audit usage and consolidate into one component

**Error Boundary Duplication**:
- `ErrorBoundary.tsx` - Global error boundary
- `ViewErrorBoundary.tsx` - View-specific error boundary
- **Status**: ACCEPTABLE - Different use cases (global vs. view-specific)

### 5.2 POOR CO-LOCATION ⚠️

**Chat Feature** (scattered across 3 locations):
- Components: `components/` (9 files at root level)
- Hook: `hooks/useAI.ts`
- Services: `services/IntegratedAIService.ts`, `services/ChatConversationService.ts`
- **Impact**: Developers must navigate 3+ directories to work on chat feature

**Facts Feature** (scattered across 4 locations):
- Components: `components/facts/` (4 files)
- Hooks: `hooks/useCaseFacts.ts`, `hooks/useUserFacts.ts`
- Services: `services/CaseFactsService.ts`, `services/UserFactsService.ts`
- Repositories: `repositories/CaseFactsRepository.ts`, `repositories/UserFactsRepository.ts`
- **Impact**: Good component organization but hooks/services are elsewhere

**Timeline Feature** (scattered across 4 locations):
- Component: `components/timeline/TimelineView.tsx`
- Hook: `hooks/useTimeline.ts`
- Service: `services/TimelineService.ts`
- Repository: `repositories/TimelineRepository.ts`
- **Impact**: Feature split across 4 directories

### 5.3 INCONSISTENT ORGANIZATION ⚠️

**Partially Organized Features**:
- ✅ `components/facts/` - Has subdirectory
- ✅ `components/legal/` - Has subdirectory
- ✅ `components/notes/` - Has subdirectory
- ✅ `components/timeline/` - Has subdirectory
- ✅ `components/views/` - Has subdirectory
- ✅ `components/ui/` - Has subdirectory

**Unorganized Features**:
- ❌ Chat - 9 components at root level
- ❌ Sidebar - 4 components at root level
- ❌ Error handling - 4 components at root level

### 5.4 MISSING CO-LOCATION OF TESTS ⚠️

**Current Test Organization**:
- Component tests: Co-located with components ✅
- Hook tests: Co-located with hooks ✅
- Service tests: Co-located with services ✅
- Repository tests: Co-located with repositories ✅

**Status**: GOOD - Tests are co-located with source files.

### 5.5 DEEP IMPORT PATHS ⚠️

**Example from `CaseDetailView.tsx`**:
```typescript
import { useCases } from '../../hooks/useCases';
import { TimelineView } from '../timeline/TimelineView';
import { UserFactsPanel } from '../facts/UserFactsPanel';
import { CaseFactsPanel } from '../facts/CaseFactsPanel';
import { NotesPanel } from '../notes/NotesPanel';
import { LegalIssuesPanel } from '../legal/LegalIssuesPanel';
import { useEvidence } from '../../hooks/useEvidence';
```

**Impact**:
- Relative imports with `../../` are fragile
- Refactoring requires updating many import paths
- Developer cognitive load increases

### 5.6 UNCLEAR COMPONENT BOUNDARIES

**Root-level `components/` directory** has 29 files with unclear categorization:
- Layout components (Sidebar, ChatWindow)
- Feature components (MessageBubble, PostItNote)
- Utility components (ErrorDisplay, ConfirmDialog)
- Infrastructure (ThemeProvider, ErrorBoundary)

**Impact**: New developers struggle to find components.

---

## 6. Component Dependencies Analysis

### 6.1 App.tsx Dependencies
**Direct imports**: 13 components
```typescript
// Views (5)
DashboardView, CasesView, CaseDetailView, DocumentsView, SettingsView

// Layout (2)
ChatWindow, Sidebar

// Infrastructure (4)
ErrorBoundary, ViewErrorBoundary, ThemeProvider, Toaster

// Contexts (1)
DebugContext
```

### 6.2 CaseDetailView Dependencies
**Direct imports**: 8 components + 2 hooks
```typescript
// Feature panels (5)
TimelineView, UserFactsPanel, CaseFactsPanel, NotesPanel, LegalIssuesPanel

// Hooks (2)
useCases, useEvidence

// Icons (1)
lucide-react
```

**Issue**: View depends on 5 different feature subdirectories.

### 6.3 ChatWindow Dependencies
**Direct imports**: 6 components + 1 hook
```typescript
// Chat components (3)
MessageList, FloatingChatInput, ErrorDisplay

// Shared (2)
ConfirmDialog

// Hook (1)
useAI

// Utils (1)
exportToPDF
```

---

## 7. Recommended Feature-Based Structure

### 7.1 Proposed Directory Layout

```
src/
├── features/
│   ├── chat/                      # Chat feature (NEW)
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatInput.tsx     # Consolidate with FloatingChatInput
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── ChatNotesPanel.tsx
│   │   │   ├── ChatPostItNotes.tsx
│   │   │   ├── StreamingIndicator.tsx
│   │   │   └── SourceCitation.tsx
│   │   ├── hooks/
│   │   │   └── useAI.ts
│   │   ├── services/
│   │   │   ├── IntegratedAIService.ts
│   │   │   ├── ChatConversationService.ts
│   │   │   └── AIFunctionDefinitions.ts
│   │   ├── repositories/
│   │   │   └── ChatConversationRepository.ts
│   │   └── index.ts              # Public API
│   │
│   ├── cases/                     # Cases feature (REORGANIZE)
│   │   ├── components/
│   │   │   ├── CasesView.tsx
│   │   │   ├── CaseDetailView.tsx
│   │   │   └── CaseCard.tsx (extract from CasesView)
│   │   ├── hooks/
│   │   │   └── useCases.ts
│   │   ├── services/
│   │   │   └── CaseService.ts
│   │   ├── repositories/
│   │   │   └── CaseRepository.ts
│   │   └── index.ts
│   │
│   ├── facts/                     # Facts feature (REORGANIZE)
│   │   ├── components/
│   │   │   ├── UserFactsPanel.tsx
│   │   │   ├── CaseFactsPanel.tsx
│   │   │   └── PostItNote.tsx    # Move here
│   │   ├── hooks/
│   │   │   ├── useCaseFacts.ts
│   │   │   └── useUserFacts.ts
│   │   ├── services/
│   │   │   ├── CaseFactsService.ts
│   │   │   └── UserFactsService.ts
│   │   ├── repositories/
│   │   │   ├── CaseFactsRepository.ts
│   │   │   └── UserFactsRepository.ts
│   │   └── index.ts
│   │
│   ├── documents/                 # Documents feature (REORGANIZE)
│   │   ├── components/
│   │   │   ├── DocumentsView.tsx
│   │   │   └── FileUploadModal.tsx
│   │   ├── hooks/
│   │   │   └── useEvidence.ts
│   │   ├── repositories/
│   │   │   └── EvidenceRepository.ts
│   │   └── index.ts
│   │
│   ├── notes/                     # Notes feature (REORGANIZE)
│   │   ├── components/
│   │   │   └── NotesPanel.tsx
│   │   ├── hooks/
│   │   │   └── useNotes.ts
│   │   ├── services/
│   │   │   └── NotesService.ts
│   │   ├── repositories/
│   │   │   └── NotesRepository.ts
│   │   └── index.ts
│   │
│   ├── timeline/                  # Timeline feature (REORGANIZE)
│   │   ├── components/
│   │   │   └── TimelineView.tsx
│   │   ├── hooks/
│   │   │   └── useTimeline.ts
│   │   ├── services/
│   │   │   └── TimelineService.ts
│   │   ├── repositories/
│   │   │   └── TimelineRepository.ts
│   │   └── index.ts
│   │
│   ├── legal/                     # Legal issues feature (REORGANIZE)
│   │   ├── components/
│   │   │   └── LegalIssuesPanel.tsx
│   │   ├── hooks/
│   │   │   └── useLegalIssues.ts
│   │   ├── services/
│   │   │   ├── LegalIssuesService.ts
│   │   │   ├── LegalAPIService.ts
│   │   │   └── RAGService.ts
│   │   ├── repositories/
│   │   │   └── LegalIssuesRepository.ts
│   │   └── index.ts
│   │
│   ├── dashboard/                 # Dashboard feature (NEW)
│   │   ├── components/
│   │   │   ├── DashboardView.tsx
│   │   │   └── DashboardEmptyState.tsx
│   │   └── index.ts
│   │
│   ├── settings/                  # Settings feature (NEW)
│   │   ├── components/
│   │   │   └── SettingsView.tsx
│   │   ├── services/
│   │   │   └── UserProfileService.ts
│   │   ├── repositories/
│   │   │   └── UserProfileRepository.ts
│   │   └── index.ts
│   │
│   └── sidebar/                   # Sidebar feature (NEW)
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── SidebarCaseContext.tsx
│       │   ├── SidebarNavigation.tsx
│       │   └── SidebarProfile.tsx
│       └── index.ts
│
├── shared/                        # Shared utilities (REORGANIZE)
│   ├── components/                # Shared UI components
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx    # Consolidate Spinner.tsx here
│   │   ├── Skeleton.tsx
│   │   ├── Dialog.tsx            # Rename from dialog.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ViewErrorBoundary.tsx
│   │   └── Toaster.tsx           # sonner.tsx
│   ├── hooks/
│   │   ├── useToast.ts
│   │   └── useVoiceRecognition.ts
│   ├── utils/
│   │   ├── error-logger.ts
│   │   ├── logger.ts
│   │   ├── exportToPDF.ts
│   │   └── cn.ts                 # Move from lib/utils.ts
│   └── contexts/
│       ├── DebugContext.tsx
│       └── ThemeProvider.tsx
│
├── core/                          # Core infrastructure (NEW)
│   ├── db/
│   │   ├── database.ts
│   │   ├── migrate.ts
│   │   ├── backup.ts
│   │   └── migrations/
│   ├── services/
│   │   ├── EncryptionService.ts
│   │   └── AuditLogger.ts
│   ├── models/                    # Shared data models
│   │   ├── Case.ts
│   │   ├── CaseFact.ts
│   │   ├── UserFact.ts
│   │   ├── Evidence.ts
│   │   ├── LegalIssue.ts
│   │   ├── TimelineEvent.ts
│   │   ├── Note.ts
│   │   ├── ChatConversation.ts
│   │   ├── UserProfile.ts
│   │   ├── AuditLog.ts
│   │   ├── Action.ts
│   │   └── index.ts
│   └── types/
│       ├── ai.ts
│       ├── electron.d.ts
│       └── ipc.ts
│
├── test-utils/
│   ├── database-test-helper.ts
│   ├── setup.ts
│   ├── test-utils.ts
│   └── test-utils.tsx
│
├── App.tsx
├── main.tsx
└── index.css
```

### 7.2 Feature Structure Template

Each feature follows this structure:

```
features/{feature-name}/
├── components/          # Feature-specific React components
│   ├── {Feature}View.tsx
│   ├── {Feature}Panel.tsx
│   └── {Feature}Item.tsx
├── hooks/              # Feature-specific React hooks
│   └── use{Feature}.ts
├── services/           # Feature business logic
│   └── {Feature}Service.ts
├── repositories/       # Feature data access
│   └── {Feature}Repository.ts
├── types/              # Feature-specific types (optional)
│   └── {feature}.types.ts
└── index.ts           # Public API (exports)
```

### 7.3 Import Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/features/*": ["features/*"],
      "@/shared/*": ["shared/*"],
      "@/core/*": ["core/*"],
      "@/test-utils/*": ["test-utils/*"]
    }
  }
}
```

**Benefits**:
- Clean imports: `import { ChatWindow } from '@/features/chat'`
- No relative paths: No more `../../hooks/useCases`
- Refactoring-friendly: Move files without breaking imports

---

## 8. Migration Recommendations

### 8.1 Phase 1: Create Feature Directories (Low Risk)
**Priority**: HIGH
**Effort**: 2 hours
**Risk**: LOW

1. Create new directory structure (`features/`, `shared/`, `core/`)
2. Move existing subdirectories as-is:
   - `components/facts/` → `features/facts/components/`
   - `components/legal/` → `features/legal/components/`
   - `components/notes/` → `features/notes/components/`
   - `components/timeline/` → `features/timeline/components/`
   - `components/views/{Dashboard,Settings}View.tsx` → `features/{dashboard,settings}/components/`
3. Move related hooks/services/repositories into feature directories
4. Update imports in moved files

**Testing**: Run `npm run type-check` after each move.

### 8.2 Phase 2: Consolidate Chat Feature (Medium Risk)
**Priority**: HIGH
**Effort**: 4 hours
**Risk**: MEDIUM

1. Create `features/chat/` directory
2. Move 9 chat components from `components/` root to `features/chat/components/`
3. Consolidate `ChatInput.tsx` and `FloatingChatInput.tsx`:
   - Option A: Keep both, document use cases in README
   - Option B: Create `ChatInput.tsx` with `variant` prop (basic/advanced)
4. Move `hooks/useAI.ts` → `features/chat/hooks/`
5. Move AI services → `features/chat/services/`
6. Create `features/chat/index.ts` for public API
7. Update all imports

**Testing**: Full E2E test of chat functionality.

### 8.3 Phase 3: Consolidate Cases Feature (Medium Risk)
**Priority**: HIGH
**Effort**: 3 hours
**Risk**: MEDIUM

1. Create `features/cases/` directory
2. Move `components/views/{Cases,CaseDetail}View.tsx` → `features/cases/components/`
3. Move `hooks/useCases.ts` → `features/cases/hooks/`
4. Move `services/CaseService.ts` → `features/cases/services/`
5. Move `repositories/CaseRepository.ts` → `features/cases/repositories/`
6. Create `features/cases/index.ts`

### 8.4 Phase 4: Consolidate Documents Feature (Low Risk)
**Priority**: MEDIUM
**Effort**: 2 hours
**Risk**: LOW

1. Create `features/documents/` directory
2. Move `components/views/DocumentsView.tsx` + `FileUploadModal.tsx` → `features/documents/components/`
3. Move `hooks/useEvidence.ts` → `features/documents/hooks/`
4. Move `repositories/EvidenceRepository.ts` → `features/documents/repositories/`

### 8.5 Phase 5: Reorganize Sidebar (Low Risk)
**Priority**: MEDIUM
**Effort**: 2 hours
**Risk**: LOW

1. Create `features/sidebar/` directory
2. Move 4 sidebar components → `features/sidebar/components/`
3. Update `App.tsx` import

### 8.6 Phase 6: Consolidate Shared Components (Low Risk)
**Priority**: LOW
**Effort**: 3 hours
**Risk**: LOW

1. Create `shared/components/` directory
2. Move UI components from `components/ui/` → `shared/components/`
3. Consolidate `LoadingSpinner.tsx` and `Spinner.tsx`
4. Move error boundaries → `shared/components/`
5. Move `ThemeProvider.tsx` → `shared/contexts/`

### 8.7 Phase 7: Setup Path Aliases (High Impact)
**Priority**: HIGH
**Effort**: 1 hour
**Risk**: LOW

1. Update `tsconfig.json` with path aliases
2. Update `vite.config.ts` with resolve aliases
3. Create migration script to update imports (optional)

**Example**:
```typescript
// Before
import { useCases } from '../../hooks/useCases';

// After
import { useCases } from '@/features/cases';
```

---

## 9. Quick Wins (Immediate Actions)

### 9.1 Consolidate Spinners (30 minutes)
**File**: `src/shared/components/LoadingSpinner.tsx`

1. Audit usage of `LoadingSpinner.tsx` vs `Spinner.tsx`
2. Choose one implementation
3. Delete duplicate
4. Update imports

### 9.2 Document ChatInput Usage (15 minutes)
**File**: `src/features/chat/README.md`

Create README explaining:
- When to use `ChatInput.tsx` (simple forms)
- When to use `FloatingChatInput.tsx` (chat interface)
- Props comparison table

### 9.3 Move ErrorTestButton to Dev Utils (10 minutes)
**Action**: Move `ErrorTestButton.tsx` to `src/shared/dev/` or delete if unused.

### 9.4 Create Feature Index Files (2 hours)
**Action**: Create `index.ts` for each feature to establish public API boundaries.

**Example** (`features/facts/index.ts`):
```typescript
// Components
export { UserFactsPanel } from './components/UserFactsPanel';
export { CaseFactsPanel } from './components/CaseFactsPanel';

// Hooks
export { useUserFacts } from './hooks/useUserFacts';
export { useCaseFacts } from './hooks/useCaseFacts';

// Types
export type { UserFact, CaseFact } from '@/core/models';
```

---

## 10. Testing Strategy

### 10.1 Pre-Migration Checklist
- [ ] All existing tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] App builds successfully (`npm run build`)
- [ ] E2E tests pass (if available)

### 10.2 During Migration
- [ ] Run `npm run type-check` after each file move
- [ ] Test affected features manually
- [ ] Update test imports
- [ ] Verify no broken imports

### 10.3 Post-Migration Validation
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] App runs in dev mode (`npm run dev`)
- [ ] App builds for production (`npm run build`)
- [ ] Manual smoke test of all features

---

## 11. Benefits of Feature-Based Structure

### 11.1 Developer Experience
✅ **Faster feature development**: All related files in one directory
✅ **Easier onboarding**: New developers find code faster
✅ **Better code navigation**: IDE tools work better with co-located files
✅ **Reduced cognitive load**: Less context switching between directories

### 11.2 Maintainability
✅ **Easier refactoring**: Move/rename features without breaking imports
✅ **Clear boundaries**: Features have explicit public APIs via `index.ts`
✅ **Better testing**: Test entire feature in isolation
✅ **Reduced coupling**: Features depend on public APIs, not internals

### 11.3 Scalability
✅ **Add features easily**: Copy feature template, implement
✅ **Remove features cleanly**: Delete feature directory
✅ **Team collaboration**: Teams can own entire features
✅ **Code splitting**: Bundle features separately for performance

---

## 12. Risks and Mitigation

### 12.1 Import Path Breakage
**Risk**: Moving files breaks imports in other files
**Mitigation**:
- Use TypeScript compiler to find broken imports
- Update imports in small batches
- Use IDE refactoring tools (VSCode "Rename Symbol")

### 12.2 Git History Loss
**Risk**: Moving files loses git blame history
**Mitigation**:
- Use `git mv` instead of manual move + delete
- Document file moves in commit messages
- Use `git log --follow` to trace history

### 12.3 Test Failures
**Risk**: Tests fail after file moves
**Mitigation**:
- Run tests after each move
- Update test imports alongside source imports
- Keep test files co-located with source files

### 12.4 Build/Bundle Issues
**Risk**: Vite/Electron build breaks after restructure
**Mitigation**:
- Update `vite.config.ts` with path aliases
- Test build after major moves
- Check bundle size doesn't increase

---

## 13. Success Metrics

### 13.1 Code Organization
- [ ] 0 components at `src/components/` root level (currently 29)
- [ ] 100% of features have `index.ts` public API
- [ ] 0 relative imports with `../../` (use path aliases)

### 13.2 Developer Productivity
- [ ] Average time to find component/hook: < 30 seconds
- [ ] New feature setup time: < 15 minutes (copy template)
- [ ] Import path length: < 30 characters (e.g., `@/features/chat`)

### 13.3 Code Quality
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No duplicate components (consolidate spinners, document chat inputs)
- [ ] 100% feature test coverage (unit + integration)

---

## 14. Appendix: File Move Checklist

Use this checklist for each file move:

1. [ ] Identify all files to move (component, hook, service, repository, tests)
2. [ ] Create target directory structure
3. [ ] Move files using `git mv`
4. [ ] Update imports in moved files
5. [ ] Find all files importing moved files: `grep -r "from '.*{filename}'")`
6. [ ] Update imports in dependent files
7. [ ] Run `npm run type-check`
8. [ ] Run tests for affected feature
9. [ ] Commit with descriptive message: `refactor(chat): Move chat components to features/chat`

---

## 15. Next Steps

### Immediate (This Session)
1. Review this audit with the team
2. Prioritize migration phases
3. Create tracking issue/board for migration tasks

### Short-term (Next 2 Weeks)
1. Execute Phase 1: Create feature directories
2. Execute Phase 2: Consolidate chat feature
3. Execute Phase 7: Setup path aliases

### Long-term (Next Month)
1. Complete all migration phases
2. Update documentation with new structure
3. Create feature development guide
4. Establish feature ownership

---

## Summary

**Current State**: Layer-based architecture with 29 root-level components, scattered features, and deep import paths.

**Key Issues**:
1. ⚠️ Duplicate components (ChatInput, Spinner)
2. ⚠️ Poor co-location (chat feature scattered across 3 directories)
3. ⚠️ Inconsistent organization (some features organized, others not)
4. ⚠️ Deep import paths (`../../hooks/useCases`)
5. ⚠️ Unclear component boundaries (29 files at root)

**Recommended Solution**: Feature-based structure with path aliases.

**Estimated Effort**: 20-25 hours total (can be done incrementally)

**Expected Benefits**:
- 🚀 Faster feature development
- 📚 Easier onboarding
- 🔧 Better maintainability
- 📦 Clearer code boundaries
- 🧪 Easier testing

---

**Audit Completed**: 2025-10-08
**Total Files Analyzed**: 141 TypeScript/TSX files
**Audit Duration**: Comprehensive analysis of structure, dependencies, and organization
**Next Action**: Review with team and prioritize migration phases

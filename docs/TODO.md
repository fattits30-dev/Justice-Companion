# Justice Companion - Development Tracker

## Critical Blockers

### Build: Electron Main Process Cannot Compile (TS5097 Errors)

**summary**: Electron main process blocked by ~200+ TypeScript files using .ts extensions in import paths. TypeScript compiler (tsc) with CommonJS forbids explicit .ts extensions.

**status**: blocked

**priority**: p0

**area**: electron

**steps_to_reproduce**:
1. Run `pnpm electron:dev`
2. TypeScript compilation fails with TS5097 errors
3. Build aborts - no Electron desktop application

**expected**: Electron main process compiles successfully and launches desktop application

**actual**: Build fails with 100+ TS5097 errors across electron/, src/ directories

**logs_stack**: |
  ```
  electron/ipc-handlers/chat.ts(522,15): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
  electron/ipc-handlers/database.ts(83,47): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
  ... (200+ similar errors across codebase)
  
  Additional errors:
  - TS2339: Missing properties (ProcessManager.getDetailedPortStatus)
  - TS2554: Argument count mismatches (TemplateService constructor)
  - TS2551: Property name mismatches (UserProfileService.getUserProfile → getProfile)
  - TS2724: Missing exports (TemplateNotFoundError not exported)
  ```

**env_versions**:
- node: 20.18.0
- pnpm: 9.x
- app: commit 89fc27aa (renderer fixes)
- os: Windows 11
- typescript: 5.9.3
- electron: 38.2.1

**evidence**:
- screenshots: []
- traces: []

**links**:
- commits: [89fc27aa, 26d0896]
- pr: null
- memory_ids: []

**suspected_area**: 
- Root cause: Codebase uses explicit `.ts` extensions (required by `tsx` dev tooling)
- TypeScript compiler with `module: "CommonJS"` forbids `.ts` extensions
- Cannot use `allowImportingTsExtensions: true` because it requires `noEmit: true` (conflicts with production build)

**proposed_solutions**:

**Option A: Remove All .ts Extensions (Breaking Change)**
- Remove `.ts` from ~200+ import statements  
- Pros: Fixes compilation immediately
- Cons: Breaks `tsx` development workflow, massive refactor

**Option B: Use Modern Bundler (esbuild/swc) - RECOMMENDED**
- Replace `tsc` with `esbuild` or `swc` for Electron main process
- Pros: Handles `.ts` extensions natively, faster builds, no refactor needed
- Cons: Changes build tooling, requires configuration

**Option C: Dual Config Strategy**
- Keep `.ts` extensions for dev (`tsx`)
- Use build-time transform to strip extensions for production
- Pros: No code changes, maintains dev workflow
- Cons: Adds complexity, potential for dev/prod parity issues

**Option D: Migrate to ES Modules**
- Change entire project to ESM (`"type": "module"` in package.json)
- Update tsconfig to use `module: "ESNext"`
- Pros: Modern standard, better tooling support
- Cons: Major migration, may break Electron compatibility

**owner**: none

**created**: 2025-11-12T20:05:00Z

---

## Completed Tasks

### ✅ Fixed Renderer Process Build (Vite + React)
- Fixed 18 React component import extensions (.ts → .tsx)
- Fixed 14 IPC handler Electron type imports
- Fixed variable naming in chat.ts
- Commit: 89fc27aa
- Status: DONE - Vite dev server running on port 5176

### ✅ Security Fixes (28 Vulnerabilities)
- Fixed 1 CRITICAL (torch RCE)
- Fixed 4 HIGH (transformers, Pillow, multipart)  
- Fixed 2 MODERATE (black, electron)
- Fixed 17 code scanning alerts (sanitization, TOCTOU)
- Commit: f8650bc7
- Status: DONE - All commits pushed to GitHub

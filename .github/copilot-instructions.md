# Justice Companion - AI Coding Agent Instructions

## Project Architecture

Justice Companion is an Electron desktop app for legal case management with local-only data storage and enterprise security.

**Tech Stack**: React 18.3 + TypeScript 5.9.3, Electron 33+, Vite 5.4, Drizzle ORM + Better-SQLite3, Zustand state management, TailwindCSS + Framer Motion UI.

### Core Architecture Layers

1. **UI Layer**: React components in `src/components/` (shared) and `src/features/` (domain-specific)
2. **Business Logic**: Services in `src/services/` handle authentication, encryption, GDPR compliance
3. **Data Access**: Repositories in `src/repositories/` abstract database operations
4. **Database**: Drizzle ORM schemas with 15 tables, 11 encrypted fields via `EncryptionService`

### Critical Dependencies

- **Package Manager**: MUST use `pnpm` (NOT npm/yarn) for better-sqlite3 native module compatibility
- **Node.js**: MUST use 20.18.x LTS (NOT 22.x) - Electron requires Node 20.x runtime
- **Native Module**: better-sqlite3 requires rebuilding for different environments:
  - `pnpm rebuild:electron` (for Electron runtime, runs via postinstall)
  - `pnpm rebuild:node` (for Node.js tests)

## Development Workflows

### Key Commands

```bash
# Development
pnpm install              # Install deps (auto-rebuilds better-sqlite3)
pnpm electron:dev         # Start full app with Vite dev server
pnpm dev                  # Vite dev server only

# Database
pnpm db:migrate           # Run pending migrations (creates backups)
pnpm db:migrate:status    # Check migration status
pnpm db:backup            # Manual database backup

# Testing & Quality
pnpm test                 # Vitest unit tests
pnpm test:coverage        # Coverage report (80%+ target)
pnpm test:e2e             # Playwright E2E tests
pnpm lint:fix             # ESLint auto-fix
pnpm type-check           # TypeScript validation
```

### Feature Development Pattern

1. Domain logic goes in `src/features/<domain>/` (cases, chat, dashboard, settings)
2. Shared components in `src/components/ui/` with co-located tests (`*.test.tsx`)
3. Data services follow Repository pattern (`src/repositories/`) + Service layer (`src/services/`)
4. Always run `pnpm lint:fix && pnpm type-check && pnpm test` before commits

## Security & Encryption Patterns

### KeyManager Service

- **CRITICAL**: Uses OS-level encryption (DPAPI/Keychain/libsecret) via Electron's `safeStorage`
- Migrates from `.env` ENCRYPTION_KEY_BASE64 on first run, then deletes plaintext key
- Located at `src/services/KeyManager.ts` - handles key rotation, caching, secure deletion

### Database Encryption

- 11 sensitive fields use field-level AES-256-GCM encryption via `EncryptionService`
- Encrypted fields: passwords (scrypt hashed), case details, evidence metadata, personal info
- `EncryptionService.encrypt(data)` / `decrypt(data)` - handles all field encryption

### Authentication Flow

- `AuthenticationService` in `src/services/` handles OWASP-compliant auth
- scrypt password hashing with 128-bit random salts
- 24-hour session expiration, UUID v4 session IDs
- Session persistence via `SessionPersistenceHandler` interface

## IPC Communication Pattern

### Electron Main/Renderer Bridge

- `electron/preload.ts` exposes safe IPC channels via `contextBridge`
- All database operations run in main process (SQLite limitation)
- IPC handlers in `electron/ipc-handlers.ts` validate inputs with Zod schemas
- Context isolation enabled - never expose Node.js APIs directly to renderer

### Example IPC Pattern

```typescript
// preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
  getUserProfile: () => ipcRenderer.invoke("get-user-profile"),
});

// ipc-handlers.ts
ipcMain.handle("get-user-profile", async (event, userId: string) => {
  const userRepo = new UserRepository(database);
  return userRepo.findById(userId);
});
```

## Testing Conventions

### Test Structure

- Unit tests co-located as `*.test.ts(x)` beside source files
- Test utilities in `src/test-utils/` with RTL custom render function
- E2E tests in `tests/e2e/specs/` using Playwright
- Mock IPC API provided in test-utils for Electron interactions

### Test Database Pattern

```typescript
// Use in-memory SQLite for fast, isolated tests
beforeEach(() => {
  database = new Database(":memory:");
  // Run migrations on test database
});
```

### GDPR Compliance Testing

- Integration tests in `src/services/gdpr/Gdpr.integration.test.ts` (15/15 passing)
- Tests data export (Article 20) and deletion (Article 17) with rate limiting
- Validates audit log preservation and consent requirements

## Build & Deployment

### Build Targets

- `pnpm build:electron` - Production build (TypeScript + Vite)
- `pnpm build:win/mac/linux` - Platform installers via electron-builder
- Outputs to `release/` directory with automatic GitHub releases on `v*` tags

### CI/CD Matrix

- Runs on Ubuntu, Windows, macOS with Node 20.x
- Critical step: `pnpm rebuild:node` before tests (better-sqlite3 compatibility)
- Coverage gate at 80%+ (current ~75%)
- Quality workflow posts PR comments with lint/test results

## Common Patterns

### Component Structure

```typescript
// Feature component pattern
export function CaseManagement() {
  const { data, isLoading } = useQuery(['cases'], fetchCases);
  const { user } = useAuth();

  // Always handle loading states with skeleton UI
  if (isLoading) return <SkeletonText lines={3} />;

  return (
    <div className="space-y-4">
      {/* TailwindCSS with consistent spacing */}
    </div>
  );
}
```

### Data Validation

- Use Zod schemas for all user inputs and API boundaries
- Runtime validation at service layer: `validateInput(data, schema)`
- TypeScript types generated from Zod schemas for consistency

### Error Handling

```typescript
// Consistent error logging pattern
try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", { context: "operation-name", error });
  throw new ServiceError("User-friendly message");
}
```

### State Management

- Zustand stores for global state (auth, settings)
- React Query for server state and caching
- Local component state for UI-only concerns

## Integration Points

### AI Legal Assistant

- OpenAI integration with RAG pipeline using UK legal APIs
- Streaming responses via Server-Sent Events pattern
- Sources from legislation.gov.uk and caselaw.nationalarchives.gov.uk
- All responses include mandatory disclaimer: "This is information, not legal advice"

### Database Migrations

- Automatic backups before migrations via `scripts/migration-status.ts`
- Rollback support with `pnpm db:migrate:rollback`
- Migration files in `src/db/migrations/` with timestamp prefixes

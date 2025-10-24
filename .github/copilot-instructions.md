pnpm test:e2e # Playwright E2E tests

# Justice Companion AI Guide

## Quick Facts

- Desktop Electron app; React renderer under `src/`, Electron main in `electron/`.
- Use pnpm + Node 20.18.x; rebuild `better-sqlite3` via `pnpm rebuild:electron` (Electron) and `pnpm rebuild:node` (Node tests).
- Preload bundle (`dist/electron/preload.js`) must exist; `pnpm build:preload` runs before launching Electron.

## Architecture Map

- Renderer orchestrated by `src/App.tsx` and feature folders (`src/features/*`); shared UI lives in `src/components/ui`.
- Business logic sits in `src/services` (auth, encryption, GDPR); repositories in `src/repositories` are the only DB callers.
- Drizzle schema + migrations under `src/db`; migrations create automatic backups via `scripts/migration-status.ts`.
- IPC tunnel: `electron/preload.ts` exposes `window.justiceAPI`; handlers in `electron/ipc-handlers.ts` touch the database.

## Critical Workflows

- `pnpm electron:dev` builds preload, starts Vite (renderer), then boots Electron main.
- Database lifecycle: `pnpm db:migrate`, `pnpm db:migrate:rollback`, `pnpm db:backup`.
- Quality gate before commits: `pnpm lint:fix`, `pnpm type-check`, `pnpm test`, `pnpm test:e2e`.
- Packaging: `pnpm build:electron` → `pnpm build:win|mac|linux` generates installers in `release/`.

## Security Boundaries

- `src/services/KeyManager.ts` stores encryption keys in OS `safeStorage`; never read keys directly from `.env` after migration.
- `EncryptionService` provides AES-256-GCM for 11 sensitive columns; repositories expect encrypted payloads and return decrypted DTOs.
- `AuthenticationService` enforces scrypt password hashing, 24h sessions, UUID IDs, and logs via `AuditLogger`.

## Coding Conventions

- Co-locate feature UI and tests; absolute imports through `@/` (see `tsconfig.paths.json`).
- Tailwind + Framer Motion drive visuals; display skeletons (`src/components/ui/Skeleton*`) while queries load.
- Server state via React Query; global app state via Zustand stores in `src/contexts` / `src/store`.
- Validate user-facing data with Zod schemas from `src/models` or `src/services/validation` before persisting.

## Testing Notes

- Vitest configured in `vite.config.ts`; shared RTL helpers live in `src/test-utils/test-utils.tsx`.
- `src/test/setup.ts` seeds an in-memory SQLite DB for service tests; keep migrations fast and idempotent.
- Playwright specs sit under `tests/e2e`; auth suite assumes disclaimer acceptance precedes login flow.

## Troubleshooting

- If `window.justiceAPI` is undefined, rebuild preload (`pnpm build:preload`) and confirm `BrowserWindow` loads `dist/electron/preload.js`.
- IPC logging prefixed with `[IPC]`; enable verbose logs in `electron/ipc-handlers.ts` when diagnosing auth, consent, or session issues.

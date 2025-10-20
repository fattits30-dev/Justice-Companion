# Repository Guidelines

## Project Structure & Module Organization
Justice Companion is a pnpm-managed Electron + React desktop app. The renderer lives in `src/`: domain flows under `src/features`, reusable UI in `src/components`, data interfaces in `src/services` and `src/repositories`, and shared helpers in `src/utils` and `src/test-utils`. Electron main/preload code resides in `electron/`, Drizzle migrations and maintenance scripts in `scripts/`, and Playwright suites in `tests/e2e`.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies (Node 20.18.x required).
- `pnpm dev` / `pnpm dev:electron` – start Vite alone or with the Electron shell.
- `pnpm build:electron` – generate production bundles in `dist/`; use `build:*` when packaging installers.
- `pnpm test` or `pnpm test:coverage` – run Vitest suites; coverage drives CI gates.
- `pnpm test:e2e` – execute Playwright specs in `tests/e2e/specs`.
- `pnpm lint`, `pnpm type-check`, `pnpm format:check` – enforce ESLint, TypeScript, and Prettier.
- `pnpm db:migrate` / `pnpm db:migrate:status` – apply and verify Drizzle migrations; run `pnpm rebuild` after native dependency changes.

## Coding Style & Naming Conventions
Write TypeScript + React 18 with functional components. Prettier controls formatting (2-space indent, single quotes); do not hand-format. Keep components and hooks in `PascalCase`, utilities and variables in `camelCase`, directories in `kebab-case`, and co-locate feature logic under `src/features/<domain>`. Surface cross-cutting primitives through `src/components` or `src/utils` to avoid deep relative imports.

## Testing Guidelines
Co-locate unit and integration specs as `*.test.ts(x)` beside source files and share fixtures via `src/test-utils`. Reset stores, timers, and mocks to keep Vitest parallel-friendly. CI runs `pnpm test:coverage` on Linux, macOS, and Windows—hold coverage at or above the committed baseline. Add Playwright journeys in `tests/e2e/specs` with descriptive filenames (e.g. `case-management.spec.ts`) and reusable context under `tests/e2e/fixtures`.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `chore:`) as in history and reference issues (`fixes #123`) when relevant. Before opening a PR, run lint, type-check, unit, and e2e commands above; include a short summary of results plus UI screenshots or schema notes when applicable. Ensure Guardian scans (`pnpm guardian:scan`) pass, let CI finish, and keep descriptions concise but actionable.

## Security & Configuration Tips
Keep secrets in `.env` (never commit); rely on `.env.example` for placeholders. Generate test encryption keys with `node scripts/generate-encryption-key.js` and commit migrations alongside schema changes. Electron preload is sandboxed—expose only vetted APIs via `contextBridge` and handle data access in renderer services.

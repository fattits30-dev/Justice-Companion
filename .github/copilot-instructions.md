# Justice Companion Frontend Guide

## Renderer Architecture

- React 18 entry in `src/App.tsx` wires routing, layout shells, and auth gates; feature pages live in `src/features/*` with co-located hooks/tests.
- Shared components (forms, modals, skeletons) are in `src/components/ui`; animations/utilities live beside them (`Motion*`, `CommandPalette`).
- Renderer accesses backend strictly through `window.justiceAPI` bindings defined in `electron/preload.ts`; mirror types in `src/types/ipc.ts` when adding channels.

## TypeScript & State Conventions

- Strict TypeScript setup in `tsconfig.json`; respect the `@/` alias to `src/` and include `.ts`/`.tsx` extensions on relative imports (see `docs/TSX-IMPORT-RESOLUTION-GUIDE.md`).
- Domain data flows: UI → services (`src/services/*`) → repositories (`src/repositories/*`) → Drizzle schema (`src/db`). Renderer code should not touch the DB directly.
- Global state uses Zustand stores (`src/store/*`) and React Contexts (`src/contexts/*`); async fetching goes through React Query hooks in each feature folder.
- Validation and DTO typing rely on Zod schemas in `src/models` and `src/services/validation`; reuse these when fixing form or API typing issues.

## Python Backend Integration

- FastAPI lives in `ai-service/main.py` and exposes `/health`, `/api/v1/info`, `/api/v1/analyze-document`, and `/api/v1/analyze-image` on `http://127.0.0.1:5051` (configurable via `.env`).
- Electron bridges requests via `window.justiceAPI`; new frontend calls should flow through `src/services/*` helpers that target the Python endpoints, never directly from components.
- Start the service with `pnpm electron:dev` (or the VS Code task “Python AI: Start Service”) so renderer fetches land on the running FastAPI app during development.
- Keep TypeScript models in sync with Python `models.requests`/`models.responses`; update `src/types/api.ts` and relevant Zod schemas whenever the backend contract changes.
- Image uploads must send `FormData` matching FastAPI parameter names (`file`, `userName`, `sessionId`, etc.); document analysis stays JSON-conformant with `DocumentAnalysisRequest`.

## Error-Fixing Workflow

- Reproduce TS errors with `pnpm type-check`; watch mode is available via `pnpm type-check --watch` (task: “Type Check: Watch”).
- Run ESLint with `pnpm lint` or auto-fix (`pnpm lint:fix`) before adjusting code paths; lint rules live in `eslint.config.mjs` and enforce React hook patterns.
- For runtime renderer issues, start Vite via `pnpm start:frontend` (or `pnpm run dev` for full Electron) and inspect the browser console + `logs/renderer.log` (electron).
- IPC changes often require rebuilding preload: `pnpm build:preload` then `pnpm electron:dev`.

## Frontend Testing & QA

- Unit/integration tests use Vitest (`pnpm test`); setup in `src/test/setup.ts` mocks Electron globals and seeds an in-memory DB.
- Component tests commonly sit next to their source (`*.test.tsx`); use `@testing-library/react` helpers from `src/test-utils/test-utils.tsx`.
- Renderer E2E flows live in `tests/e2e`; for UI-only checks prefer `pnpm test:e2e:web` to avoid native module dependencies.
- Before merging front-end fixes, run `pnpm lint:fix && pnpm type-check && pnpm test`; Playwright suites are optional but recommended for auth/chat regressions.

## Frontend Ops Tips

- Tailwind tokens come from `tailwind.config.ts`; theme helpers and CSS resets load through `src/styles/index.css`.
- Keep accessibility in mind: leverage primitives like `Dialog`, `Sheet`, and focus traps already implemented in `src/components/ui` rather than rolling new ones.
- Use existing service helpers (e.g., `src/features/chat/hooks/useChatMessages.ts`) instead of duplicating API calls; update `src/types/api.ts` when response shapes change.
- When adding assets or icons, prefer Lucide components already pulled into `src/components/ui/icon.tsx` and keep bundle size in check.

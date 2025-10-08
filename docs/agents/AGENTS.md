# Repository Guidelines

## Project Structure & Module Organization
The React + Electron app lives in `src/`, with UI under `components/`, shared hooks in `hooks/`, persistence logic in `db/`, and domain models/services in `models/`, `repositories/`, and `services/`. Electron main-process code resides in `electron/`, while packaged build artifacts land in `dist/` and `dist-electron/`. Automation for multi-agent orchestration sits under `automation/` (`automation/src/` for TypeScript, `automation/agents/` for prompt flows). Shared scripts, including database migrations and backups, are collected in `scripts/`. Reference docs live in `docs/` and the root `.md` files.

## Build, Test, and Development Commands
Use `npm install` once per machine, then `npm run dev` for the Vite renderer. `npm run electron:dev` starts both Vite and the Electron shell; rely on it for end-to-end manual checks. Package the desktop app with `npm run build` (includes type-checking, Vite build, migration copies, and electron-builder). Run static analysis via `npm run lint` and `npm run type-check`. Execute unit/integration tests with `npm test`, grab targeted coverage through `npm run test:coverage`, and develop component specs interactively with `npm run test:components:watch`. For a batteries-included dev guardrail, run `npm run guard`—it watches core folders and sequentially executes type-checking, linting, and unit tests after each change. Database migrations are managed with `npm run db:migrate` (list and rollback via `db:migrate:status` and `db:migrate:rollback`).

## Coding Style & Naming Conventions
All application code is TypeScript; prefer `tsx` for React components and `ts` elsewhere. Keep two-space indentation, trailing commas, and eslint-config defaults (`eslint.config.js`). Name components and models using `PascalCase`, hooks as `useX`, services/repositories with action-oriented camelCase functions, and colocate feature styles via Tailwind utility classes. When touching shared utilities, favor pure functions and add succinct doc comments only for non-obvious behavior.

## Testing Guidelines
Vitest with Testing Library drives unit/UI coverage. Keep specs alongside the feature (`<Component>.test.tsx`) and reuse helpers from `src/test-utils/`. Run `npm test -- src/<path>` before committing focused changes, and confirm broader health with `npm run test:coverage`; treat regressions in percent coverage as blockers. For orchestrator code, use the tests in `automation/tests/` via `npm run orchestrator:build && node automation/dist/tests/<suite>.js` or the provided Python harness scripts.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style used in history (`feat:`, `fix:`, `chore:`, scoped when useful). Make commits focused, referencing issues or tasks in the footer. PRs should summarize intent, list validation steps (commands run, screenshots for UI), and call out database migrations or agent configuration changes. Request reviews from relevant feature owners and ensure CI (lint, type-check, tests, build) passes before marking ready.

## Agent & Automation Notes
Agent configurations live in `automation/agents/` with supporting prompts in `automation/tasks/`. Mirror updates in `automation/README.md` and regenerate TypeScript output with `npm run guard:build`. The simplified pipeline at `automation/src/simple-orchestrator.ts` replaces Claude-driven fixes with deterministic command chains—extend the `PIPELINE_STEPS` array if you need additional safeguards. When integrating orchestrator outputs into the Electron app, document entry points inside `docs/` to keep cross-team handoffs clear.

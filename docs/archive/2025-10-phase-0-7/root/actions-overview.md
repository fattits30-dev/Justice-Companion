# GitHub Actions Overview

This repository ships with two automated workflows to keep the codebase healthy and responsive to regressions.

- **CI** (`.github/workflows/ci.yml`)  
  Triggers on pushes and pull requests targeting `main`. The job installs dependencies with `npm ci`, runs ESLint (`npm run lint`), performs a TypeScript type-check (`npm run type-check`), and executes the Vitest unit suite (`npm test -- --run`). The job fails fast if any of these steps report errors, giving immediate feedback on incoming changes.

- **Codex Auto-Fix on Failure** (`.github/workflows/codex-autofix.yml`)  
  Runs automatically when the primary `CI` workflow finishes with a failure. It checks out the failing revision, installs dependencies, invokes the Codex CLI (via `openai/codex-action`) with a guarded prompt to propose a minimal patch, re-runs `npm test`, and opens a reviewable pull request if the fix succeeds. The workflow requires the `OPENAI_API_KEY` secret to be configured.

When adding additional workflows, update this document so teammates can understand what each automation does and how they connect.

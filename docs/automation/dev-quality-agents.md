# Dev Quality Agents Workflow

This repository now ships with a GitHub Actions pipeline (`.github/workflows/dev-quality-agents.yml`) that models the “one simple agent per job” concept for everyday development chores. Each job is intentionally deterministic and safe—it only runs well‑understood tooling and either auto‑fixes the code on trusted branches or fails fast so you can address the issue locally.

## Jobs at a glance

| Job | Responsibilities | Auto-fix behaviour |
| --- | --- | --- |
| **Formatter Agent** | Runs Prettier across TypeScript, JavaScript, JSON, CSS and Markdown. | On push / manual runs it uses `npm run format` and auto-commits the changes; on pull requests it only checks (`npm run format:check`) to avoid rewriting contributor branches. |
| **Lint Agent** | Enforces ESLint policies across the project. | Runs `npm run lint:fix` with auto-commit on push/manual runs. PRs run plain `npm run lint`. |
| **Type Check Agent** | Executes the strict TypeScript program build (`npm run type-check`). | No auto-fix—fails fast so errors can be triaged by developers or by the in-repo automation. |
| **Unit Test Agent** | Executes the Vitest suite (`npm test -- --run`). | Deterministic test run; failures create follow-up tasks for the fixer agents. |
| **Best Practices Agent** | Aggregates repository hygiene checks. Runs `npm run best-practices` (lint + type-check + `npm audit --production --audit-level=high`). Also validates the Context7 MCP endpoint if an API key is available. | No auto-fix; failure means a vulnerability or policy violation was detected. |

Each job runs on Ubuntu with Node 20, sharing the `npm` cache to keep the pipeline quick.

## Secrets

The Context7 health-check step is optional but recommended. Add the secret in your repository settings:

```
Name: CONTEXT7_API_KEY
Value: ctx7sk-********-********
```

Without the secret the health-check is skipped and the best-practices job still reports the `npm` results.

## Local parity

The workflow relies on the following npm scripts (all defined in `package.json`):

- `npm run format` / `npm run format:check`
- `npm run lint` / `npm run lint:fix`
- `npm run type-check`
- `npm run best-practices`

You can execute the same commands locally—or invoke the helper batch script `automation/start_context7.cmd` to bring up the Context7 MCP server before running the automation stack.

## Troubleshooting

- **Auto-commit denied**: GitHub Actions cannot push to forks. Contributors should run `npm run format` / `npm run lint:fix` locally before opening pull requests. Maintainers can re-run the workflow on the repository branches to auto-apply fixes.
- **Context7 health-check fails**: Confirm the secret is set, or run `automation/start_context7.cmd` locally to check connectivity.
- **`npm audit` failure**: Address the listed vulnerabilities or downgrade the audit level in `package.json` if a temporary allowance is required.

With these guardrails your CI now mirrors the “simple agent per task” vision: predictable tooling, isolated responsibilities, and optional Context7 insight when reviewing best-practice guidance.

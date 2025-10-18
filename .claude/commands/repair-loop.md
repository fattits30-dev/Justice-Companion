---
allowed-tools: Bash(pnpm test:*), Bash(pnpm rebuild:node:*), Bash(git:*), MCP(memory:*), MCP(context7:*), WebSearch, SlashCommand
argument-hint: [file-path-or-issue]
description: Iteratively repair code using MCP context, test, and research up to 5x with ultrathink escalation
model: claude-sonnet-4-5-20250929
---
# Iterative Repair Loop Workflow with Ultrathink

## Initial Setup
- Target: $ARGUMENTS (e.g., a file path like "src/utils.js" or issue description like "fix auth bug").
- If no args provided, infer from current context or prompt for clarification.
<ultrathink> Assess overall workflow viability: Scan for potential MCP bottlenecks or test env issues upfront. Prioritize repairs that align with project architecture from memory. </ultrathink>

## Step 1: Retrieve Context
Run `/mcp__memory__check` (or your exact MCP memory retrieval command) to load relevant historical context, such as prior repairs, project state, or session memory. Summarize key insights here:
- [Paste retrieved context summary]

## Step 2: Apply Best Practices and Repair
Using the retrieved context, invoke `/mcp__context7__best-practices` (or your MCP context7 command) to analyze the target for issues. Generate a repair proposal:
- Identify problems (e.g., bugs, style violations).
- Propose code changes aligned with best practices.
- Output the diff or updated code snippet.

Apply the repair to the target file(s) using edit tools.

## Step 3: Run Test
Execute the test suite relevant to the target:
- Justice Companion uses pnpm: `pnpm test $ARGUMENTS`
- If tests need Node.js runtime (not Electron): `pnpm rebuild:node && pnpm test $ARGUMENTS`
- [Output full test results here]

## Conditional Loop (Up to 5 Attempts)
Evaluate test results:
- **Success** (all tests pass):
  - Run `/mcp__memory__update` (or your MCP update command) with the repair summary, new context, and success metrics.
  - Output: "Repair applied and tests passed! Memory updated."
  - End workflow.
- **Failure** (any test fails):
  - Attempt #: [Current count, starting at 1]
  - Research: Use WebSearch tool with query like "best practices for [specific error] in [tech stack]" to gather insights.
  - <think hard> Before refining, evaluate trade-offs: Is the error environmental? Prioritize minimal changes to avoid regressions. </think hard>
  - If attempt >= 3: <ultrathink> Deep-dive the failure: Cross-analyze error traces, MCP context, and research for root causes. Simulate 2-3 alternative repairs mentally, weighing pros/cons against project constraints. Select the most robust. </ultrathink>
  - Refine the repair based on research and re-run Steps 2-3.
  - If attempt >5: Output failure summary, suggest manual intervention, and update memory with lessons learned via `/mcp__memory__update`.

## Final Output
- Updated code/files.
- Test results summary.
- Memory update confirmation.
- Any research links or key learnings.

## Justice Companion Specific Notes
- **Test Environment**: Always rebuild better-sqlite3 for Node.js before running tests: `pnpm rebuild:node`
- **TypeScript**: Run `pnpm type-check` to catch type errors early
- **Stack**: React 18.3 + TypeScript 5.9.3 + Electron 38.2.1 + Vitest
- **Encryption**: All repositories require EncryptionService - tests must set `process.env.ENCRYPTION_KEY_BASE64`
- **Git**: Use `git status` and `git diff` to verify changes before committing

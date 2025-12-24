---
name: pre-commit-quality-gate
description: Validates code quality before allowing commits
hook-events:
  - PreToolUse
matcher:
  tool_name: mcp__github__*
commands:
  - command: bash
    args:
      - .claude/hooks/scripts/validate-quality.sh
---

## Pre-Commit Quality Gate

Before committing code via GitHub MCP, you MUST verify:

### 1. Linting Passes
```bash
./scripts/lint.sh
```
**Status: Must be 0 errors, 0 warnings**

### 2. Tests Pass
```bash
./scripts/test.sh frontend
```
**Status: All tests must pass**

### 3. TypeScript Compiles
```bash
npm run typecheck
```
**Status: No type errors**

### 4. Code Quality Checks
- [ ] No `any` types without justification
- [ ] No `console.log` in production code
- [ ] No commented-out code blocks
- [ ] Using existing UI components where possible

### 5. Git Status Clean
```bash
git status
```
**Verify: Only intended files are staged**

---

## If Quality Gate Fails:

1. **DO NOT commit**
2. Fix the issues identified
3. Re-run quality checks
4. Only commit when all checks pass

## If on Termux and Tests Can't Run:

- Acknowledge the limitation
- Note: "CI will run full tests"
- Ensure linting at minimum passes
- Commit with clear message explaining Termux limitation

---

**This prevents low-quality code from being committed.**

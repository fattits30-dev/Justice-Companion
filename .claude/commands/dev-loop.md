---
allowed-tools: Bash(pnpm test --watch:*), Bash(pnpm lint:fix:*), Task(test-automator), Task(code-reviewer), MCP(node-sandbox:*), MCP(memory:*)
description: TDD development cycle with hot-reload testing and MCP pattern learning
model: claude-sonnet-4-5-20250929
---

# Dev Loop: TDD with Hot-Reload

**Target**: $ARGUMENTS (file or feature name)

## Step 1: RED - Write Failing Test
```bash
# 1. Recall similar test patterns from Memory
/mcp__memory__recall --key="test-patterns-$(basename $ARGUMENTS)"

# 2. Write failing test
Task tool with subagent_type="test-automator"
Prompt: "Write FAILING test for $ARGUMENTS. Use patterns: {memory_output}. Test must fail initially."
```

## Step 2: GREEN - Make It Pass (Hot-Reload)
```bash
# Start watch mode in sandbox
docker run --rm -v $(pwd):/app -w /app node-sandbox:20 bash -c "
  pnpm rebuild:node &&
  pnpm test --watch --testPathPattern=$ARGUMENTS
"

# Code until green (watch mode gives instant feedback)
# Minimal implementation only
```

## Step 3: REFACTOR - Clean Up
```bash
# 1. Auto-fix lint issues
pnpm lint:fix $(echo $ARGUMENTS | sed 's/\.test\.ts/.ts/')

# 2. Quick code review
Task tool with subagent_type="code-reviewer"
Prompt: "Review $ARGUMENTS for: SOLID principles, duplication, naming. Quick pass only."

# 3. Store pattern in Memory
/mcp__memory__update --key="test-patterns-$(basename $ARGUMENTS)" --append="{successful_pattern}"
```

## Efficiency Gains
- **3x faster cycles**: Hot-reload gives instant feedback vs. 30s CI wait
- **Pattern learning**: Memory stores successful TDD patterns for reuse
- **Zero context switching**: Watch mode eliminates manual test runs

## When to Use
- Writing new features with TDD
- Refactoring existing code
- Daily development work

**Justice Companion Notes**:
- Always `pnpm rebuild:node` before tests (better-sqlite3 requirement)
- Set `ENCRYPTION_KEY_BASE64` env var for repository tests
- Use in-memory SQLite for test isolation

---
allowed-tools: Task(architect-review), Task(backend-architect), Task(frontend-developer), Task(test-automator), Task(security-auditor), MCP(context7:*), MCP(memory:*), MCP(playwright:*), MCP(node-sandbox:*)
description: End-to-end feature development (design → code → test → validate)
model: claude-sonnet-4-5-20250929
---

# Feature Development Workflow

**Feature**: $ARGUMENTS

## Step 1: Design & Plan (5-10 min)
```bash
# 1. Get best practices from Context7
/mcp__context7__best-practices --feature="$ARGUMENTS" --framework=electron+react+typescript

# 2. Architecture review with agent
Task tool with subagent_type="architect-review"
Prompt: "Design architecture for: $ARGUMENTS. Define: API contracts, data models, UI components, test strategy. Justice Companion uses: DDD layers (models→repositories→services→UI), AES-256 encryption, Zod validation. Context7 suggests: {context7_output}"

# 3. Store baseline in Memory
/mcp__memory__store --key="feature-$(echo $ARGUMENTS | tr ' ' '-')-baseline" --value="{architecture_design}"
```

## Step 2: Implement with TDD (Use /dev-loop)
```bash
# For each component identified in Step 1:
/dev-loop src/features/X/models/Y.ts       # 1. Models
/dev-loop src/repositories/YRepository.ts  # 2. Repositories
/dev-loop src/services/YService.ts         # 3. Services
/dev-loop src/features/X/components/YView.tsx  # 4. UI
```

## Step 3: Integration & Visual Tests
```bash
# 1. E2E tests in Playwright sandbox
/mcp__playwright__test --flow="$ARGUMENTS" --record

# 2. Visual regression test
/mcp__playwright__snapshot --component="$(main_ui_component)" --compare=baseline

# 3. Security scan
Task tool with subagent_type="security-auditor"
Prompt: "Quick security scan for: $ARGUMENTS. Check: input validation, authorization, encryption usage, OWASP Top 3."
```

## Step 4: Finalize & Document
```bash
# 1. Full validation
pnpm type-check && pnpm test && pnpm lint

# 2. Compare against baseline
/mcp__memory__recall --key="feature-$(echo $ARGUMENTS | tr ' ' '-')-baseline"
# Verify all architecture requirements met

# 3. Create PR (use /git-pr workflow)
/git-pr --feature="$ARGUMENTS"
```

## Efficiency Gains
- **50% faster**: MCP patterns + agent orchestration vs. manual design
- **Zero architectural drift**: Memory baseline prevents scope creep
- **Visual regression**: Playwright catches UI bugs instantly

## When to Use
- New features (e.g., "timeline events export")
- Cross-layer functionality
- Features requiring security review

**Justice Companion Integration**:
- Uses existing 92 agents (architect-review, backend-architect, etc.)
- Follows DDD architecture (enforced by Context7 patterns)
- Integrates with encryption service (scanned by security-auditor)

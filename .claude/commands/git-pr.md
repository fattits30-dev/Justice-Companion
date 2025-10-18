---
allowed-tools: Bash(git:*), Bash(gh:*), Task(code-reviewer), Task(docs-architect), MCP(sequential-thinking:*), MCP(memory:*)
description: Git commit + PR creation with AI-generated messages (3 steps)
model: claude-sonnet-4-5-20250929
---

# Git Workflow: Commit + PR

**Feature/Fix**: $ARGUMENTS

## Step 1: Pre-Commit Validation (2 min)
```bash
# 1. Run checks
pnpm lint:fix &&
pnpm type-check &&
pnpm test

# 2. Quick code review
Task tool with subagent_type="code-reviewer"
Prompt: "Review uncommitted changes for:
- Security issues (critical only)
- Breaking changes
- Missing tests for new code
- Console.log statements (replace with logger)

Quick pass - flag blockers only."
```

## Step 2: Generate Commit Message (1 min)
```bash
# 1. Analyze changes with Sequential Thinking
git diff --staged > changes.diff
/mcp__sequential-thinking__summarize --input="{changes.diff}" --format=conventional-commit

# 2. Categorize by Conventional Commits
# Types: feat|fix|docs|style|refactor|perf|test|build|ci|chore

# 3. Generate message
echo "$(type)($(scope)): $(summary)

$(detailed_explanation_from_sequential_thinking)

$(breaking_changes_if_any)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
"

# 4. Commit
git commit -F commit_message.txt
```

## Step 3: Create PR with Context (3 min)
```bash
# 1. Generate PR description
Task tool with subagent_type="docs-architect"
Prompt: "Create GitHub PR description for: $ARGUMENTS

Include:
## Summary
{what_changed_and_why}

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
{test_results_from_step1}

## Security
{security_review_from_step1}

## Checklist
- [ ] Tests pass
- [ ] Lint clean
- [ ] Type-check passes
- [ ] Documentation updated

Context from commits: {git_log_summary}"

# 2. Push and create PR
git push origin HEAD
gh pr create --title "$ARGUMENTS" --body "$(pr_description)" --draft

# 3. Store in Memory for tracking
/mcp__memory__update --key="pr-$(date +%Y%m%d)" --append="{pr_url, feature, timestamp}"
```

## Efficiency Gains
- **Zero manual message writing**: Sequential Thinking + agents generate everything
- **Consistent format**: Conventional Commits enforced automatically
- **Context preservation**: Memory tracks all PRs for velocity analysis

## When to Use
- After completing feature work
- After fixing bugs
- After refactoring
- Before code review

**Justice Companion Standards**:
- Commit messages: Conventional Commits format
- PR size: < 400 lines (enforced by code-reviewer)
- Tests: Must pass before PR
- Security: Pre-commit scan with /security

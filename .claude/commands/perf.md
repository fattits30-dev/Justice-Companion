---
allowed-tools: Bash(pnpm test:*), Task(performance-engineer), Task(database-optimizer), MCP(sequential-thinking:*), MCP(memory:*), MCP(node-sandbox:*)
description: Performance profiling and optimization (4 steps, quick wins)
model: claude-sonnet-4-5-20250929
---

# Performance Optimization Workflow

**Target**: $ARGUMENTS (feature, service, or "full")

## Step 1: Profile & Establish Baseline (5 min)
```bash
# 1. Run performance tests
pnpm test --coverage --testPathPattern="$ARGUMENTS" --verbose > perf-baseline.txt

# 2. Identify hot paths with Sequential Thinking
/mcp__sequential-thinking__analyze --input="{test_output}" --focus=performance

# 3. Store baseline in Memory
/mcp__memory__store --key="perf-baseline-$(date +%Y%m%d)" --value="{
  target: '$ARGUMENTS',
  p50_response_time: X,
  p95_response_time: Y,
  test_duration: Z,
  memory_usage: M
}"
```

## Step 2: Database Optimization (10 min)
```bash
# Justice Companion uses better-sqlite3 + Drizzle ORM

Task tool with subagent_type="database-optimizer"
Prompt: "Optimize database performance for: $ARGUMENTS. Analyze:
- Query execution plans
- Missing indexes (15 tables, frequent JOINs on cases/evidence/timeline)
- N+1 query patterns (repositories use findAll)
- Encryption overhead (11 encrypted fields with EncryptionService)

Suggest: index creation, query refactoring, connection pooling optimization. Test in sandbox."

# Apply optimizations in sandbox
docker run --rm -v $(pwd):/app node-sandbox:20 bash -c "
  cd /app &&
  # Apply index migrations
  pnpm db:migrate &&
  pnpm rebuild:node &&
  pnpm test --testPathPattern='$ARGUMENTS'
"
```

## Step 3: Code Optimization (10 min)
```bash
Task tool with subagent_type="performance-engineer"
Prompt: "Optimize code performance for: $ARGUMENTS. Focus:
- Reduce re-renders (React components)
- Memoization opportunities (useMemo, useCallback)
- Async/await optimization (parallel vs. sequential)
- Bundle size (code splitting, lazy loading)
- IPC overhead (Electron main ↔ renderer)

Test in sandbox with hot-reload."

# Validate improvements
pnpm test --coverage --testPathPattern="$ARGUMENTS" > perf-after.txt
```

## Step 4: Compare & Document (2 min)
```bash
# 1. Compare before/after
/mcp__memory__recall --key="perf-baseline-$(date +%Y%m%d)"
/mcp__sequential-thinking__compare --baseline="{memory_output}" --current="{perf-after.txt}"

# 2. Generate report
echo "### Performance Improvements for $ARGUMENTS
- Response time: {before} → {after} ({%improvement})
- Memory usage: {before} → {after} ({%reduction})
- Test duration: {before} → {after} ({%faster})

### Optimizations Applied:
{list_from_agents}

### Remaining Opportunities:
{sequential_thinking_suggestions}
"
```

## Efficiency Gains
- **Focus on wins**: 80/20 rule - optimize hot paths first (Sequential Thinking identifies)
- **Sandbox validation**: Test optimizations without breaking main code
- **Memory tracking**: Compare performance over time (trend analysis)

## When to Use
- User reports slow UI
- Test suite takes too long
- Database queries timing out
- After major refactoring

**Justice Companion Bottlenecks**:
- Encryption/decryption (11 fields × N records = hot path)
- Evidence file operations (SQLite BLOB storage)
- Timeline rendering (large datasets)
- RAG query processing (OpenAI API latency)

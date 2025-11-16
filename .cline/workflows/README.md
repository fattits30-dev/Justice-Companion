# Justice Companion MCP Workflows

Pre-defined workflows for common development tasks using the Justice Companion MCP Server.

## Available Workflows:

### 1. [add-feature.md](add-feature.md)
Add new features to the codebase
- Estimated time: 10-15 minutes
- Safety: type_check + run_tests

### 2. [fix-bug.md](fix-bug.md)
Fix bugs with proper testing
- Estimated time: 5-10 minutes
- Safety: run_tests to verify fix

### 3. [database-migration.md](database-migration.md)
Database migrations with backup
- Estimated time: 5-8 minutes
- Safety: ALWAYS backup before migrate

### 4. [code-quality-check.md](code-quality-check.md)
Run full quality checks
- Estimated time: 3-5 minutes
- Use: Before PRs, after refactoring

### 5. [pre-release.md](pre-release.md)
Prepare for version releases
- Estimated time: 20-30 minutes
- Safety: Full test coverage + builds

## Golden Rule:
```
sequential_think → do work → audit_tools_used
```

## How to Use:
1. Choose appropriate workflow
2. Follow steps exactly
3. Never skip safety checks
4. Always end with audit_tools_used

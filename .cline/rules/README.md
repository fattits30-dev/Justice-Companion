# Justice Companion MCP Rules

Strict development rules enforced by the Justice Companion MCP Server.

## Rules File:
- [justice-companion-mcp.md](justice-companion-mcp.md) - Complete rule set

## Critical Rules Summary:

### 1. ALWAYS sequential_think first
Every workflow must start with `sequential_think(task="...")`

### 2. ALWAYS audit_tools_used last
Every workflow must end with `audit_tools_used()`

### 3. Safety Protocols:
- `db_backup` before `db_migrate` (NO EXCEPTIONS)
- `type_check` before `git_commit`
- `run_tests` after code changes
- `git_diff` before `git_commit`

### 4. Workspace Restriction:
All file operations limited to: `F:\Justice Companion take 2`

### 5. Tool Hierarchy:
- Use specific tools over generic ones
- `pnpm_command` > `shell_run` for npm
- `git_*` tools > `shell_run` for git
- `db_*` tools > `shell_run` for database

## Enforcement:
Cline will REFUSE to:
- Skip sequential_think
- Skip safety checks
- Operate outside workspace
- Migrate database without backup

## Available Tools: 25
See `.cline/workflows/` for usage examples

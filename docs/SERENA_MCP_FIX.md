# Serena MCP Duplicate Issue - FIXED

## Problem

You reported seeing "2 pop up when I boot Claude Code" - there was a duplicate MCP server configuration.

## Root Cause

Your `claude_desktop_config.json` had **Playwright configured TWICE**:

1. **Standalone Playwright entry** (lines 12-15):
   ```json
   "playwright": {
     "command": "npx",
     "args": ["@playwright/mcp@latest"]
   }
   ```

2. **Playwright in MCP_DOCKER gateway** (from Docker MCP registry):
   - The `MCP_DOCKER` gateway already provides Playwright
   - Registry at `~/.docker/mcp/registry.yaml` shows `playwright` registered
   - This caused Playwright to start twice on boot

## What Was Fixed

**Removed the duplicate standalone Playwright entry** from `claude_desktop_config.json`.

### Before:
```json
{
  "mcpServers": {
    "MCP_DOCKER": { ... },
    "playwright": { ... },      ← DUPLICATE!
    "serena": { ... }
  }
}
```

### After:
```json
{
  "mcpServers": {
    "MCP_DOCKER": { ... },
    "serena": { ... }
  }
}
```

## Current MCP Server Configuration

You now have **2 MCP server entries** (correct):

### 1. MCP_DOCKER Gateway
Provides multiple servers through Docker:
- ✅ Context7 (library docs)
- ✅ Desktop Commander (file operations)
- ✅ DockerHub (image management)
- ✅ GitHub (repos, PRs, issues)
- ✅ Memory (knowledge graph)
- ✅ **Playwright (browser automation)** ← Now only here!
- ✅ Sequential Thinking (complex reasoning)
- ✅ Time (timezone operations)
- ✅ Filesystem (file operations)
- ✅ PostgreSQL (database queries)

### 2. Serena (Standalone)
Symbolic code analysis and editing:
- ✅ Path: `C:\Users\sava6\ClaudeHome\projects\Justice Companion\serena_agent-0.1.4`
- ✅ Project: Justice Companion
- ✅ Config: `.serena/project.yml` (fixed - `language: python`)

## Next Steps

**Restart Claude Code** to load the updated configuration:

1. Close Claude Code completely
2. Reopen Claude Code
3. You should now see only ONE of each MCP server
4. Serena should load successfully (project.yml was fixed earlier)

## Verification

After restart, check that you see:
- ✅ MCP_DOCKER tools (Context7, GitHub, Memory, Playwright, etc.)
- ✅ Serena tools (find_symbol, get_symbols_overview, write_memory, etc.)
- ❌ NO duplicate Playwright

## Why This Happened

The standalone Playwright entry was likely added manually, not knowing that MCP_DOCKER gateway already provides it. This is a common configuration issue when mixing gateway-provided servers with standalone entries.

## Related Files Modified

1. ✅ `.serena/project.yml` - Fixed `languages:` → `language: python` (earlier)
2. ✅ `C:\Users\sava6\AppData\Roaming\Claude\claude_desktop_config.json` - Removed duplicate Playwright

## MCP Architecture

```
Claude Code
  ├── MCP_DOCKER Gateway (1 entry, 10+ servers)
  │   ├── Context7
  │   ├── GitHub
  │   ├── Memory
  │   ├── Playwright ← Provided here
  │   ├── Time
  │   └── ... (7 more)
  └── Serena (1 standalone entry)
      └── Justice Companion project
```

This is the correct, non-duplicate configuration!

---
name: mcp-tool-enforcer
description: Enforces use of justice-tools MCP for codebase exploration instead of raw file operations
hook-events:
  - UserPromptSubmit
---

## MCP TOOL ENFORCEMENT

**STOP! Before using Grep, Glob, or reading multiple files for exploration:**

### USE JUSTICE-TOOLS MCP INSTEAD

For codebase analysis:

```
mcp__justice-tools__analyze_codebase(path=".")
```

Returns: structure, stats, large files, issues - ALL IN ONE CALL

For finding large files:

```
mcp__justice-tools__find_large_files(path=".", min_lines=300)
```

Returns: files over threshold with suggestions

For understanding a file before editing:

```
mcp__justice-tools__analyze_file(file_path="path/to/file.py")
```

Returns: functions, classes, imports, issues

For finding symbol usages:

```
mcp__justice-tools__find_symbol(name="SymbolName", path=".")
```

Returns: definition, usages, count - SUMMARIZED

For searching code:

```
mcp__justice-tools__smart_search(query="pattern", path=".")
```

Returns: matches with context, summarized

### WHY THIS MATTERS

| Old Way        | Tokens Used | New Way              | Tokens Used |
| -------------- | ----------- | -------------------- | ----------- |
| `find + wc -l` | ~2000       | `analyze_codebase()` | ~200        |
| Multiple Grep  | ~3000       | `smart_search()`     | ~300        |
| Read 5 files   | ~5000       | `analyze_file()` x5  | ~500        |

### EXCEPTIONS (when NOT to use MCP tools)

- Reading a SPECIFIC file you know the path to → Use Read
- Editing a file → Use Edit
- Running commands → Use Bash
- Single quick grep for exact match → Use Grep

### THE RULE

**If you're EXPLORING or ANALYZING → Use justice-tools MCP**
**If you're READING/EDITING a specific file → Use Read/Edit**

---

**This enforcement saves context and makes Claude faster and cheaper.**

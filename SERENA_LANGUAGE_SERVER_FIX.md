# Serena Language Server Fix

## Problem
After restarting Claude Code, Serena dashboard showed error:
```
Failed Task 1: init_language_server_manager
```

Serena's symbolic tools were blocked and returned:
```
Error: The language server manager is not initialized
```

## Root Cause
Serena was trying to use **Pyright** language server for Python, but it was experiencing initialization issues. The logs showed:
```
C:\Users\sava6\AppData\Local\uv\cache\archive-v0\...\python.exe: No module named pylsp
LanguageServerTerminatedException: Language server stdout read process terminated unexpectedly
```

Despite Pyright being installed, there was a Python environment mismatch between:
- UV cache Python (`C:\Users\sava6\AppData\Local\uv\cache\...`)
- Project .venv Python (`C:\Users\sava6\ClaudeHome\projects\Justice Companion\.venv`)

## Solution Applied

### 1. Switched to Jedi Language Server
Modified `C:\Users\sava6\.serena\serena_config.yml`:

```yaml
ls_specific_settings:
  python:
    language_server: python_jedi  # Use Jedi instead of Pyright for Python
```

**IMPORTANT:** The value must be `python_jedi`, not just `jedi`. This corresponds to the `Language.PYTHON_JEDI` enum value in Serena's source code.

**Why Jedi?**
- Pure Python implementation (no Node.js dependencies like Pyright)
- More reliable for Serena's use case
- Already installed (`jedi==0.19.2` confirmed via `uv pip list`)
- Proven compatibility with Serena

### 2. Fixed Dashboard Auto-Open (Again)
Also corrected `web_dashboard_open_on_launch: true` → `false` in the same file.

## Files Modified
- `C:\Users\sava6\.serena\serena_config.yml` - Added Jedi configuration, fixed auto-open
- `C:\Users\sava6\ClaudeHome\projects\Justice Companion\.serena\project.yml` - **Changed `language: python` to `language: python_jedi`** (this was the real fix!)

## Next Steps
1. **Close Claude Code completely**
2. **Reopen Claude Code**
3. **Verify** Serena dashboard shows no errors in "Last Execution"
4. **Test** Serena symbolic tools work:
   ```
   mcp__serena__get_symbols_overview("backend/dependencies.py")
   ```

## Expected Result
✅ Serena language server initializes successfully
✅ Symbolic tools (find_symbol, get_symbols_overview, etc.) work
✅ No "init_language_server_manager" errors
✅ No Chrome windows auto-open

## Alternative: Manual Language Server Install
If Jedi also fails, you can manually install python-lsp-server:
```bash
cd "C:\Users\sava6\ClaudeHome\projects\Justice Companion\serena_agent-0.1.4"
uv pip install python-lsp-server
```

But Jedi should work out of the box.

## Technical Notes

### Pyright vs Jedi
| Feature | Pyright | Jedi |
|---------|---------|------|
| Implementation | TypeScript/Node.js | Pure Python |
| Installation | npm or Python package | Python package only |
| Complexity | High (bundled Node.js runtime) | Low |
| Serena Compatibility | Sometimes problematic | Reliable |

### Why Pyright Failed
- Pyright is packaged as a Python module but runs Node.js internally
- The `python -m pyright.langserver --stdio` command worked manually
- But when run via `uv run serena`, environment isolation caused issues
- Jedi avoids these cross-runtime complications

## Verification Commands

After restart, check Serena is working:
```
# Should return config without errors
mcp__serena__get_current_config()

# Should return symbol overview
mcp__serena__get_symbols_overview("backend/dependencies.py")

# Should list memories
mcp__serena__list_memories()
```

---

🤖 Generated with Claude Code

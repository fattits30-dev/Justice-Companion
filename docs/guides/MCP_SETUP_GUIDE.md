# MCP Server Setup Guide

**Complete guide to setting up Model Context Protocol (MCP) servers for Justice Companion**

---

## 🎯 What is MCP?

MCP (Model Context Protocol) allows AI assistants like Claude to access external tools and data sources:
- **filesystem**: Read/write project files
- **github**: Interact with GitHub repositories
- **sqlite**: Query your database
- **context7**: Search documentation libraries
- **sequential-thinking**: Advanced reasoning
- **memory**: Persistent knowledge graph
- **playwright/puppeteer**: Browser automation
- **justice-companion**: Custom project-specific tools

---

## 🚨 Critical: Fix Your Current Setup

### Issue 1: Hardcoded API Key in `.mcp.json`

**Problem**: Your Context7 API key is exposed in `.mcp.json`:
```json
"env": {
  "CONTEXT7_API_KEY": "ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"  // ❌ Exposed!
}
```

**Solution**: Use environment variable reference:
```json
"env": {
  "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"  // ✅ Reads from system environment
}
```

### Issue 2: Hardcoded Paths

**Problem**: Paths won't work for other developers:
```json
"args": ["C:\\Users\\sava6\\Desktop\\Justice Companion\\..."]  // ❌ Hardcoded
```

**Solution**: Use relative paths:
```json
"args": ["./justice.db"]  // ✅ Relative to project root
```

### Issue 3: Wrong Context7 Package

**Problem**: Using `@upstash/context7-mcp` which is deprecated.

**Solution**: Use `context7-mcp`:
```json
"args": ["/c", "npx", "-y", "context7-mcp"]  // ✅ Correct package
```

---

## ✅ Fixed Configuration

I've already updated your `.mcp.json`. Here's what changed:

### Before (Insecure):
```json
{
  "mcpServers": {
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp", "--transport", "http", "--port", "4182"],
      "env": {
        "CONTEXT7_API_KEY": "ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"  // ❌ Exposed
      }
    },
    "github": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"]
      // ❌ Missing GITHUB_TOKEN
    },
    "sqlite": {
      "command": "uvx",
      "args": ["mcp-server-sqlite", "--db-path", "C:\\Users\\sava6\\..."]  // ❌ Hardcoded
    }
  }
}
```

### After (Secure):
```json
{
  "mcpServers": {
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"  // ✅ Reads from environment
      }
    },
    "github": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"  // ✅ Reads from environment
      }
    },
    "sqlite": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "mcp-server-sqlite",
        "--db-path",
        "./justice.db"  // ✅ Relative path
      ]
    }
  }
}
```

---

## 🔧 Setup Instructions

### Step 1: Set Environment Variables

**If you haven't already**, set your tokens in system environment (see [QUICK_TOKEN_SETUP.md](QUICK_TOKEN_SETUP.md)):

```powershell
# GitHub Token
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_github_token", "User")

# Context7 API Key
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_context7_key", "User")
```

**Restart your terminal/IDE** after setting variables.

### Step 2: Verify Environment Variables

```powershell
# Check they're set
echo $env:GITHUB_TOKEN
echo $env:CONTEXT7_API_KEY

# Should show your tokens (not empty)
```

### Step 3: Build Justice Companion MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Step 4: Test MCP Configuration

**In Claude Code**, the MCP servers should now load automatically. Check the status by looking for:
- ✅ Green indicators next to each MCP server in the tools panel
- ✅ No error messages in the Claude Code console

---

## 🧪 Testing Each MCP Server

### 1. Context7 (Documentation Search)

**Test command**:
```
Search Context7 for React hooks documentation
```

**Expected**: Returns documentation links and summaries for React hooks.

**If it fails**:
- Check: `echo $env:CONTEXT7_API_KEY` (should show your key)
- Verify package: `npx context7-mcp --version`
- Check Claude Code console for error messages

### 2. GitHub

**Test command**:
```
List my GitHub repositories
```

**Expected**: Returns your repositories list.

**If it fails**:
- Check: `echo $env:GITHUB_TOKEN` (should show your token)
- Verify token has `repo` or `public_repo` scope
- Token should start with `ghp_` or `github_pat_`

### 3. SQLite

**Test command**:
```
Query the justice.db database and show me the schema
```

**Expected**: Returns database tables and structure.

**If it fails**:
- Verify `justice.db` exists in project root
- Check file permissions
- Try: `npx mcp-server-sqlite --db-path ./justice.db`

### 4. Filesystem

**Test command**:
```
List files in the src directory
```

**Expected**: Returns file listing.

**If it fails**:
- Verify Claude Code is running from project root
- Check allowed directories setting

### 5. Justice Companion (Custom)

**Test command**:
```
Create a test case in Justice Companion
```

**Expected**: Creates a case in the database.

**If it fails**:
- Check MCP server is built: `ls mcp-server/dist/index.js`
- Rebuild: `cd mcp-server && npm run build`

---

## 📋 MCP Server Reference

| Server | Package | Purpose | Env Vars Required |
|--------|---------|---------|-------------------|
| **context7** | `context7-mcp` | Search documentation | `CONTEXT7_API_KEY` |
| **github** | `@modelcontextprotocol/server-github` | GitHub integration | `GITHUB_TOKEN` |
| **sqlite** | `mcp-server-sqlite` | Database queries | None (uses file path) |
| **filesystem** | `@modelcontextprotocol/server-filesystem` | File operations | None |
| **sequential-thinking** | `@modelcontextprotocol/server-sequential-thinking` | Advanced reasoning | None |
| **memory** | `@modelcontextprotocol/server-memory` | Knowledge graph | None |
| **playwright** | `@executeautomation/playwright-mcp-server` | Browser automation | None |
| **puppeteer** | `@modelcontextprotocol/server-puppeteer` | Browser automation | None |
| **justice-companion** | Custom (local) | Project-specific tools | None |

---

## 🚨 Troubleshooting

### "Context7 not working"

**Symptoms**: No results from Context7 queries, or timeout errors.

**Solutions**:
1. **Verify API key is set**:
   ```powershell
   echo $env:CONTEXT7_API_KEY
   ```
   If empty, set it: `[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_key", "User")`

2. **Restart Claude Code** after setting environment variable

3. **Test package directly**:
   ```bash
   npx context7-mcp
   ```
   Should start without errors

4. **Check API key format**: Should start with `ctx7sk_` or `ctx7sk-`

### "GitHub MCP not working"

**Symptoms**: "Unauthorized" errors or can't list repos.

**Solutions**:
1. **Verify token is set**:
   ```powershell
   echo $env:GITHUB_TOKEN
   ```

2. **Check token scopes**:
   - Go to: https://github.com/settings/tokens
   - Token needs `repo` or `public_repo` scope

3. **Token format**: Should start with `ghp_` or `github_pat_`

4. **Environment variable name**: MCP uses `GITHUB_PERSONAL_ACCESS_TOKEN` but reads from `GITHUB_TOKEN` via `${GITHUB_TOKEN}` syntax

### "SQLite MCP not working"

**Symptoms**: Database not found, permission errors.

**Solutions**:
1. **Verify database exists**:
   ```bash
   ls justice.db
   ```

2. **Use absolute path** (if relative doesn't work):
   ```json
   "--db-path",
   "C:\\Users\\sava6\\Desktop\\Justice Companion\\justice.db"
   ```

3. **Check permissions**: Database file should be readable/writable

### "Justice Companion MCP not working"

**Symptoms**: Custom tools not appearing.

**Solutions**:
1. **Rebuild MCP server**:
   ```bash
   cd mcp-server
   npm run build
   ```

2. **Check dist exists**:
   ```bash
   ls mcp-server/dist/index.js
   ```

3. **Restart Claude Code** after rebuilding

---

## 🔒 Security Best Practices

### ✅ DO:
- Use environment variables for ALL API keys
- Use relative paths in `.mcp.json`
- Keep `.mcp.json` in `.gitignore` (already done)
- Rotate tokens every 90 days

### ❌ DON'T:
- Hardcode API keys in `.mcp.json`
- Commit `.mcp.json` with real tokens
- Use absolute paths with usernames
- Share tokens between developers

---

## 📚 Additional Resources

### MCP Documentation
- [Official MCP Docs](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [Context7 MCP](https://www.npmjs.com/package/context7-mcp)

### Justice Companion Guides
- [Token Setup Guide](SECURE_TOKEN_SETUP.md) - How to set environment variables
- [Quick Token Setup](../../QUICK_TOKEN_SETUP.md) - Copy-paste commands
- [MCP Server Code](../../mcp-server/) - Custom MCP implementation

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.mcp.json` has no hardcoded API keys
- [ ] `.mcp.json` uses relative paths (not `C:\Users\...`)
- [ ] `GITHUB_TOKEN` is set in system environment
- [ ] `CONTEXT7_API_KEY` is set in system environment
- [ ] Context7 queries return results
- [ ] GitHub queries return repositories
- [ ] SQLite queries return database data
- [ ] Justice Companion tools are available
- [ ] Terminal/IDE has been restarted after setting env vars

---

## 🎯 Summary

**What I Fixed**:
1. ✅ Removed hardcoded Context7 API key
2. ✅ Added GitHub token environment variable
3. ✅ Changed absolute paths to relative paths
4. ✅ Fixed Context7 package name (`context7-mcp`)
5. ✅ Added `.mcp.json.example` template for sharing

**What You Need to Do**:
1. Set environment variables (run `scripts\setup-secure-tokens.ps1`)
2. Restart terminal/IDE
3. Test each MCP server
4. Verify `.mcp.json` is in `.gitignore`

**Result**: Secure, portable MCP configuration that works for all developers! ✨

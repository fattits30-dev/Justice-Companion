# Setup GitHub MCP - Environment Variable Configuration

**SECURITY NOTE:** If you accidentally exposed your GitHub token, rotate it immediately at https://github.com/settings/tokens

---

## Quick Setup

### Step 1: Rotate Your Token (REQUIRED - Token was exposed)

1. Go to https://github.com/settings/tokens
2. Find your current token (starts with `ghp_`)
3. Click "Delete" to revoke it
4. Click "Generate new token" → "Generate new token (classic)"
5. Set permissions:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows) - optional
   - ✅ `read:org` (Read org data) - optional
6. Set expiration (recommended: 90 days)
7. Click "Generate token"
8. **COPY THE TOKEN NOW** (you won't see it again)

---

### Step 2: Set Environment Variables

**Option A: PowerShell (Run as Administrator)**

```powershell
# Set the new token value
$token = "ghp_YOUR_NEW_TOKEN_HERE"

# Set both environment variables (User-level)
[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', $token, 'User')
[System.Environment]::SetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', $token, 'User')

# Verify
Write-Host "GITHUB_TOKEN set: $([System.Environment]::GetEnvironmentVariable('GITHUB_TOKEN', 'User').Substring(0,10))..."
Write-Host "GITHUB_PERSONAL_ACCESS_TOKEN set: $([System.Environment]::GetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', 'User').Substring(0,10))..."
```

**Option B: Command Prompt (Run as Administrator)**

```cmd
setx GITHUB_TOKEN "ghp_YOUR_NEW_TOKEN_HERE"
setx GITHUB_PERSONAL_ACCESS_TOKEN "ghp_YOUR_NEW_TOKEN_HERE"
```

**Option C: System Properties GUI**

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click "Advanced" tab → "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `GITHUB_PERSONAL_ACCESS_TOKEN`
5. Variable value: Your new token (starts with `ghp_`)
6. Click OK
7. Restart Claude Code

---

### Step 3: Simplify .mcp.json (After Setting Variable)

Once `GITHUB_PERSONAL_ACCESS_TOKEN` is set, update `.mcp.json`:

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "description": "GitHub API integration (stdio transport)"
  }
}
```

This is cleaner than the current `cmd /c set` approach.

---

### Step 4: Restart Claude Code

1. Close Claude Code completely
2. Reopen Claude Code
3. Wait for MCPs to load (2-3 seconds)

---

### Step 5: Verify GitHub MCP Works

In Claude Code:
```
/mcp list
```

Should show:
```
✓ github (X tools)
```

Then test it:
```
List all open issues in this repository
```

---

## Current Configuration

Your `.mcp.json` currently uses this workaround (works but complex):

```json
"github": {
  "command": "cmd",
  "args": ["/c", "set GITHUB_PERSONAL_ACCESS_TOKEN=%GITHUB_TOKEN% && npx -y @modelcontextprotocol/server-github"],
  "description": "GitHub API integration (stdio transport - maps GITHUB_TOKEN to GITHUB_PERSONAL_ACCESS_TOKEN)"
}
```

This maps your existing `GITHUB_TOKEN` to the expected `GITHUB_PERSONAL_ACCESS_TOKEN`.

**It will work as-is**, but setting the proper environment variable (Step 2) is cleaner.

---

## Troubleshooting

### GitHub MCP not loading

**Check environment variable:**
```powershell
# Should NOT show the full token (security)
[System.Environment]::GetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', 'User').Substring(0, 10)
```

**Expected output:** `ghp_XXXXX...` (first 10 chars)

### Token permissions insufficient

**Required permissions:**
- ✅ `repo` - Full control of private repositories

**Optional but recommended:**
- `workflow` - Update GitHub Actions
- `read:org` - Read organization data

### MCP shows "Authentication failed"

1. Verify token is valid: https://github.com/settings/tokens
2. Check token hasn't expired
3. Ensure token has `repo` permission
4. Restart Claude Code after setting environment variable

---

## Security Best Practices

**DO:**
- ✅ Store tokens in system environment variables (encrypted by OS)
- ✅ Use minimum permissions needed (`repo` only)
- ✅ Set token expiration (90 days recommended)
- ✅ Rotate tokens regularly
- ✅ Revoke tokens if exposed

**DON'T:**
- ❌ Commit tokens to git (.env should be in .gitignore)
- ❌ Share tokens in chat/email
- ❌ Use tokens with excessive permissions
- ❌ Create tokens with no expiration
- ❌ Echo/display full token values in scripts

---

## Why Two Variable Names?

- `GITHUB_TOKEN` - Standard GitHub CLI convention
- `GITHUB_PERSONAL_ACCESS_TOKEN` - What MCP server expects

**Solution:** Set both to the same value for compatibility.

---

## Summary

**Current status:**
- ✅ `.mcp.json` configured with workaround (works)
- ⚠️ Token exposed - **rotate immediately**
- ⏳ Recommended: Add `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable

**Next steps:**
1. Rotate token at https://github.com/settings/tokens
2. Set `GITHUB_PERSONAL_ACCESS_TOKEN` with new token
3. Restart Claude Code
4. Test GitHub MCP

---

**Last Updated:** 2025-10-21
**Status:** Awaiting token rotation and environment variable setup

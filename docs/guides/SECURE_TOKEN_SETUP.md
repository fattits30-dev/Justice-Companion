# Secure Token Setup Guide

**Best Practices for GitHub Token and Context7 API Key Management**

---

## 🎯 The Problem with Current Setup

Your current `.env` file contains:
```env
GITHUB_TOKEN=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
CONTEXT7_API_KEY=ctx7sk-3768263b-80ba-4796-8feb-1bdf5d3343f3
```

**Issues**:
- ❌ Tokens visible in plaintext
- ❌ Risk of accidental exposure if `.env` isn't properly ignored
- ❌ No differentiation between dev/prod tokens
- ❌ Tokens shared with MCP servers that may log them

---

## ✅ Recommended Approach: System Environment Variables

### Why This is Better

1. **Separation of Concerns**: Tokens stored at OS level, not in project files
2. **Multiple Projects**: Same token works across all projects
3. **No File Risk**: Can't accidentally commit to git
4. **User-Specific**: Each developer has their own tokens
5. **MCP Best Practice**: MCP servers prefer system environment variables

---

## 🪟 Windows Setup (PowerShell)

### Option 1: User Environment Variables (Recommended)

**Set tokens permanently for your user account**:

```powershell
# Open PowerShell as your regular user (NOT admin)

# Set GitHub Token
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_new_token_here", "User")

# Set Context7 API Key
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_new_key_here", "User")

# Verify they're set
[Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
[Environment]::GetEnvironmentVariable("CONTEXT7_API_KEY", "User")
```

**Restart your terminal** after setting variables.

### Option 2: GUI Method (Easier for Beginners)

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click **"Advanced"** tab
3. Click **"Environment Variables"** button
4. Under **"User variables"**, click **"New"**
5. Add each variable:
   - Variable name: `GITHUB_TOKEN`
   - Variable value: `your_new_token_here`
6. Click **OK** on all dialogs
7. **Restart your terminal/IDE**

### Option 3: System-Wide (If Multiple Users Need Access)

```powershell
# Run PowerShell as Administrator

[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "Machine")
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_key", "Machine")
```

---

## 🐧 Linux/macOS Setup

### Option 1: Shell Profile (Persistent)

**For bash** (`~/.bashrc` or `~/.bash_profile`):
```bash
export GITHUB_TOKEN="your_new_token_here"
export CONTEXT7_API_KEY="your_new_key_here"
```

**For zsh** (`~/.zshrc`):
```bash
export GITHUB_TOKEN="your_new_token_here"
export CONTEXT7_API_KEY="your_new_key_here"
```

**Apply changes**:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Option 2: Secure Keychain (Most Secure)

**macOS Keychain**:
```bash
# Store tokens in Keychain
security add-generic-password -a "$USER" -s "github-token" -w "your_token"
security add-generic-password -a "$USER" -s "context7-key" -w "your_key"

# Retrieve token (in scripts)
GITHUB_TOKEN=$(security find-generic-password -a "$USER" -s "github-token" -w)
```

**Linux Secret Service (GNOME Keyring)**:
```bash
# Install secret-tool
sudo apt install libsecret-tools  # Ubuntu/Debian
sudo dnf install libsecret        # Fedora

# Store tokens
secret-tool store --label="GitHub Token" token github
secret-tool store --label="Context7 Key" token context7

# Retrieve token (in scripts)
GITHUB_TOKEN=$(secret-tool lookup token github)
```

---

## 📝 Update Your `.env` File

After setting system environment variables, update `.env`:

```env
# Justice Companion Environment Variables

# Encryption Key (AES-256-GCM)
# REQUIRED: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY_BASE64=your_encryption_key_here

# Node Environment
NODE_ENV=development

# MCP Dev API Server Port
MCP_DEV_API_PORT=5555

# GitHub Token (OPTIONAL - reads from system environment)
# To set system-wide: [Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "User")
# GITHUB_TOKEN=  # Leave commented out - use system environment

# Context7 API Key (OPTIONAL - reads from system environment)
# To set system-wide: [Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_key", "User")
# CONTEXT7_API_KEY=  # Leave commented out - use system environment
```

---

## 🔧 Update `.mcp.json` (If Needed)

Your MCP servers should automatically read from system environment variables. Verify `.mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

The `${GITHUB_TOKEN}` syntax tells MCP to read from system environment.

---

## 🔐 Token Security Best Practices

### GitHub Token Scopes (Minimal Permissions)

When creating a GitHub token (https://github.com/settings/tokens):

**For MCP GitHub Integration**:
- ✅ `repo` (only if you need private repo access)
- ✅ `public_repo` (if you only use public repos)
- ✅ `workflow` (only if you need to trigger workflows)
- ❌ Don't enable: `admin:org`, `admin:gpg_key`, `delete_repo`

**Recommended**:
- Set **expiration** to 90 days (rotate regularly)
- Use **fine-grained tokens** instead of classic tokens (more secure)
- Name it: `Justice Companion MCP (2025-10-09)`

### Context7 API Key

- Store separately from GitHub token
- Rotate every 6-12 months
- Don't share across multiple machines if possible

### Encryption Key

- Keep the encryption key in `.env` (project-specific)
- **DO NOT** move to system environment (each project needs unique key)
- Back it up securely (if lost, encrypted data is unrecoverable)

---

## 🧪 Verify Setup

### Test System Environment Variables

**Windows PowerShell**:
```powershell
# Check if variables exist
echo $env:GITHUB_TOKEN
echo $env:CONTEXT7_API_KEY

# Should show your token values
# If empty, restart your terminal
```

**Linux/macOS**:
```bash
echo $GITHUB_TOKEN
echo $CONTEXT7_API_KEY
```

### Test in Node.js

Create `test-env.js`:
```javascript
console.log('GitHub Token:', process.env.GITHUB_TOKEN ? '✅ Found' : '❌ Not found');
console.log('Context7 Key:', process.env.CONTEXT7_API_KEY ? '✅ Found' : '❌ Not found');
console.log('Encryption Key:', process.env.ENCRYPTION_KEY_BASE64 ? '✅ Found' : '❌ Not found');
```

Run:
```bash
node test-env.js
```

Expected output:
```
GitHub Token: ✅ Found
Context7 Key: ✅ Found
Encryption Key: ✅ Found
```

### Test MCP Integration

```bash
# Start dev server
npm run electron:dev

# Check Claude Code MCP connection
# In Claude Code, try a GitHub command:
# "List my repositories"

# Try a Context7 command:
# "Get documentation for React hooks"
```

---

## 🔄 Token Rotation Schedule

### GitHub Token
- **Rotation**: Every 90 days (set expiration when creating)
- **Process**:
  1. Create new token with same scopes
  2. Update system environment variable
  3. Restart terminal/IDE
  4. Verify MCP connection works
  5. Delete old token from GitHub

### Context7 API Key
- **Rotation**: Every 6-12 months
- **Process**: Same as GitHub token

---

## 🚨 Emergency: Token Exposed

If you accidentally expose a token:

### 1. Immediate Action (Within 5 Minutes)

**GitHub Token**:
```bash
# Revoke immediately
# Go to: https://github.com/settings/tokens
# Click "Delete" on exposed token
```

**Context7 Key**:
```bash
# Log into Context7 dashboard
# Revoke exposed key
```

### 2. Generate New Token

Follow the setup guide above to create and set new token.

### 3. Verify No Leaks

```bash
# Check git history
git log --all --full-history -p | grep -i "github_token\|context7"

# Check current files
git grep -i "github_token\|context7"

# If found in git history, use BFG Repo-Cleaner
```

---

## 📚 Additional Resources

### GitHub Token Management
- [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)

### Environment Variables
- [Windows Environment Variables](https://learn.microsoft.com/en-us/windows/win32/procthread/environment-variables)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

### MCP Documentation
- [MCP Environment Configuration](https://modelcontextprotocol.io/docs/servers/environment)

---

## ✅ Migration Checklist

If migrating from `.env` to system environment:

- [ ] Set `GITHUB_TOKEN` in system environment (User level)
- [ ] Set `CONTEXT7_API_KEY` in system environment (User level)
- [ ] Update `.env` to comment out these variables
- [ ] Restart terminal/IDE
- [ ] Test with `node test-env.js`
- [ ] Verify MCP servers still work
- [ ] (Optional) Delete old tokens from GitHub/Context7
- [ ] Update `.env.example` with comments about system environment

---

## 🎯 Summary

**Before (Insecure)**:
```env
GITHUB_TOKEN=ghp_abc123...
CONTEXT7_API_KEY=ctx7sk_xyz789...
```

**After (Secure)**:
```bash
# System Environment (Windows)
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_new_token", "User")
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "ctx7sk_new_key", "User")
```

```env
# .env file (clean)
ENCRYPTION_KEY_BASE64=your_encryption_key_here
NODE_ENV=development
MCP_DEV_API_PORT=5555

# GitHub and Context7 tokens stored in system environment
```

**Benefits**:
- ✅ Tokens never in git
- ✅ Works across all projects
- ✅ MCP servers read automatically
- ✅ No accidental exposure risk
- ✅ Easier to rotate tokens

---

**Need help?** See [RELEASE_NOW.md](../RELEASE_NOW.md) for quick token rotation steps.

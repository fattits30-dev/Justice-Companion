# ⚡ Quick Token Setup Commands

**Copy-paste these commands to set up your API keys securely**

---

## 🪟 Windows (PowerShell)

### Step 1: Revoke Old Tokens

**GitHub**:
1. Open: https://github.com/settings/tokens
2. Find token: `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`
3. Click **"Delete"**

**Context7**:
1. Log into Context7 dashboard
2. Navigate to API Keys
3. Find key: `ctx7sk-3768263b-80ba-4796-8feb-1bdf5d3343f3`
4. Click **"Revoke"**

---

### Step 2: Generate New Tokens

**GitHub** (Fine-Grained Token):
1. Go to: https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**
3. Settings:
   - **Name**: `Justice Companion MCP`
   - **Expiration**: 90 days
   - **Repository access**: Public repositories (read-only)
   - **Permissions**: Contents (read-only), Metadata (read-only)
4. Click **"Generate token"**
5. **Copy the token** (starts with `github_pat_` or `ghp_`)

**Context7**:
1. Log into Context7 dashboard
2. Click **"Create New API Key"**
3. **Copy the key** (starts with `ctx7sk_`)

---

### Step 3: Set Environment Variables

**Open PowerShell** (as regular user, NOT admin):

```powershell
# Set GitHub token
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "paste_your_github_token_here", "User")

# Set Context7 key
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "paste_your_context7_key_here", "User")
```

**Example** (replace with your actual tokens):
```powershell
# GitHub token (yours will be different)
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "github_pat_11AABBC...", "User")

# Context7 key (yours will be different)
[Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "ctx7sk-a1b2c3d4-e5f6-7890-abcd-ef1234567890", "User")
```

---

### Step 4: Verify Setup

```powershell
# Check variables are set
echo $env:GITHUB_TOKEN
echo $env:CONTEXT7_API_KEY

# If you see the tokens, success! ✅
```

---

### Step 5: Restart Your Terminal/IDE

**IMPORTANT**: You MUST restart for changes to take effect:
1. Close all PowerShell windows
2. Close VS Code / Cursor
3. Open fresh terminal
4. Test again: `echo $env:GITHUB_TOKEN`

---

### Step 6: Test in Node.js

```powershell
# Navigate to project
cd "C:\Users\sava6\Desktop\Justice Companion"

# Test tokens are accessible
node -e "console.log('GitHub Token:', process.env.GITHUB_TOKEN ? '✅ Found' : '❌ Not found')"
node -e "console.log('Context7 Key:', process.env.CONTEXT7_API_KEY ? '✅ Found' : '❌ Not found')"
node -e "console.log('Encryption Key:', process.env.ENCRYPTION_KEY_BASE64 ? '✅ Found' : '❌ Not found')"
```

**Expected output**:
```
GitHub Token: ✅ Found
Context7 Key: ✅ Found
Encryption Key: ✅ Found
```

---

## 🐧 Linux / macOS (Bash/Zsh)

### Step 1: Revoke Old Tokens

Same as Windows above.

---

### Step 2: Generate New Tokens

Same as Windows above.

---

### Step 3: Add to Shell Profile

**For Bash** (`~/.bashrc` or `~/.bash_profile`):
```bash
# Open your shell config
nano ~/.bashrc

# Add these lines at the end:
export GITHUB_TOKEN="paste_your_github_token_here"
export CONTEXT7_API_KEY="paste_your_context7_key_here"

# Save and exit (Ctrl+X, then Y, then Enter)
```

**For Zsh** (`~/.zshrc`):
```bash
# Open your shell config
nano ~/.zshrc

# Add these lines at the end:
export GITHUB_TOKEN="paste_your_github_token_here"
export CONTEXT7_API_KEY="paste_your_context7_key_here"

# Save and exit (Ctrl+X, then Y, then Enter)
```

---

### Step 4: Reload Shell Config

```bash
# For bash
source ~/.bashrc

# For zsh
source ~/.zshrc
```

---

### Step 5: Verify Setup

```bash
# Check variables are set
echo $GITHUB_TOKEN
echo $CONTEXT7_API_KEY

# If you see the tokens, success! ✅
```

---

### Step 6: Test in Node.js

```bash
# Navigate to project
cd ~/Desktop/Justice\ Companion

# Test tokens
node -e "console.log('GitHub Token:', process.env.GITHUB_TOKEN ? '✅ Found' : '❌ Not found')"
node -e "console.log('Context7 Key:', process.env.CONTEXT7_API_KEY ? '✅ Found' : '❌ Not found')"
node -e "console.log('Encryption Key:', process.env.ENCRYPTION_KEY_BASE64 ? '✅ Found' : '❌ Not found')"
```

---

## 🔐 Alternative: Use Keychain (More Secure)

### macOS Keychain

```bash
# Store tokens in Keychain
security add-generic-password -a "$USER" -s "github-token" -w "your_github_token_here"
security add-generic-password -a "$USER" -s "context7-key" -w "your_context7_key_here"

# Retrieve in shell (add to ~/.zshrc or ~/.bashrc)
export GITHUB_TOKEN=$(security find-generic-password -a "$USER" -s "github-token" -w)
export CONTEXT7_API_KEY=$(security find-generic-password -a "$USER" -s "context7-key" -w)
```

### Linux Secret Service

```bash
# Install secret-tool
sudo apt install libsecret-tools  # Ubuntu/Debian
sudo dnf install libsecret        # Fedora

# Store tokens
secret-tool store --label="GitHub Token" service github token personal
# (paste token when prompted)

secret-tool store --label="Context7 Key" service context7 token api
# (paste key when prompted)

# Retrieve in shell (add to ~/.bashrc)
export GITHUB_TOKEN=$(secret-tool lookup service github token personal)
export CONTEXT7_API_KEY=$(secret-tool lookup service context7 token api)
```

---

## 🎯 One-Line Summary

**Windows PowerShell**:
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "User"); [Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "your_key", "User")
```

**Linux/macOS**:
```bash
echo 'export GITHUB_TOKEN="your_token"' >> ~/.bashrc && echo 'export CONTEXT7_API_KEY="your_key"' >> ~/.bashrc && source ~/.bashrc
```

---

## ✅ Checklist

After running commands:

- [ ] Old tokens revoked (GitHub + Context7)
- [ ] New tokens generated
- [ ] Environment variables set
- [ ] Terminal/IDE restarted
- [ ] `echo $env:GITHUB_TOKEN` shows token (Windows)
- [ ] `echo $GITHUB_TOKEN` shows token (Linux/macOS)
- [ ] Node.js test shows "✅ Found" for all 3 variables
- [ ] `.env` file cleaned (optional: remove old token lines)

---

## 🚨 Common Issues

### "Variable not found after restart"

**Windows**:
- Make sure you used `"User"` scope (not `"Machine"`)
- Restart PowerShell (not just close and reopen)
- Try logging out and back in to Windows

**Linux/macOS**:
- Make sure you edited the correct file (`~/.bashrc` or `~/.zshrc`)
- Run `source ~/.bashrc` or `source ~/.zshrc`
- Make sure no syntax errors in the file

### "Tokens visible in plain text in shell history"

**Windows PowerShell**:
```powershell
# Clear history
Clear-History
Remove-Item (Get-PSReadlineOption).HistorySavePath
```

**Linux/macOS**:
```bash
# Don't store in history (add space before command)
 export GITHUB_TOKEN="your_token"
# Note the space ^^^ at the beginning

# Or clear history
history -c
```

### "MCP still can't read tokens"

1. Verify tokens are in environment:
   ```powershell
   echo $env:GITHUB_TOKEN
   ```

2. Restart Claude Code / MCP server

3. Check `.mcp.json` uses correct syntax:
   ```json
   "env": {
     "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
   }
   ```

---

## 📚 More Information

- **Comprehensive guide**: [docs/guides/SECURE_TOKEN_SETUP.md](docs/guides/SECURE_TOKEN_SETUP.md)
- **Automated script**: Run `scripts\setup-secure-tokens.ps1` (Windows only)
- **Release guide**: [RELEASE_NOW.md](RELEASE_NOW.md)

---

**Time Required**: 5-10 minutes

**Difficulty**: Easy (copy-paste commands)

**Result**: Secure, global token storage ✅

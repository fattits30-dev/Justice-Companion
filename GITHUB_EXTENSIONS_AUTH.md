# GitHub Extensions - Authentication Required

## The Issue

The GitHub panel is showing but **content is empty/loading** because:

1. **Extensions need separate authentication** from `gh` CLI
2. **You must sign in to each extension individually**

Even though `gh auth status` shows you're logged in, VS Code extensions use **different authentication tokens**.

---

## Fix: Sign In to Extensions

### Step 1: Sign In to GitHub Pull Requests Extension

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `GitHub Pull Requests: Sign In`
3. **Select it** and press Enter
4. **Browser opens** → Click "Authorize Visual Studio Code"
5. **Copy code** shown in browser
6. **Paste in VS Code** when prompted
7. Wait for "Successfully signed in" message

### Step 2: Sign In to GitHub Actions Extension (If Separate)

Some versions require separate auth:

1. `Ctrl+Shift+P`
2. Type: `GitHub Actions: Manage Workflows`
3. If prompted, sign in with same flow

### Step 3: Reload Window

After signing in:
1. `Ctrl+Shift+P`
2. Type: `Developer: Reload Window`
3. Wait for GitHub panel to reload

---

## Expected Output After Sign In

### Pull Requests Section
```
📬 PULL REQUESTS

▼ My Pull Requests
  (Your PRs will appear here)

▼ Assigned To Me
  (PRs assigned to you)

▼ All Open Pull Requests
  #45 feat: Add Groq provider
  #44 fix: Streaming bug
```

### Issues Section
```
📋 ISSUES

▼ My Issues
  #44 🐛 Critical Bugs Found During Testing
  #43 Enhancement: Add dark mode

▼ All Open Issues
  (Full issue list)
```

### GitHub Actions (May need to expand "GITHUB" section)
```
⚙️ WORKFLOWS

▼ CI Pipeline
  ✅ Run #123 - success - 2m ago
  ❌ Run #122 - failed - 1h ago

📌 Pinned: CI Pipeline
```

---

## Troubleshooting

### "Sign In" command not found

**Extension might not be activated**:

1. Check installed: `code --list-extensions | grep github`
2. Should show:
   - `github.vscode-pull-request-github`
   - `github.vscode-github-actions`
3. If missing, install:
   ```bash
   code --install-extension github.vscode-pull-request-github
   code --install-extension github.vscode-github-actions
   ```

### "Already signed in but still empty"

**Clear auth and re-sign**:

1. `Ctrl+Shift+P` → `GitHub Pull Requests: Sign Out`
2. Wait 5 seconds
3. `Ctrl+Shift+P` → `GitHub Pull Requests: Sign In`
4. Complete auth flow again

### "Browser doesn't open"

**Manual auth**:

1. Visit: https://github.com/login/device
2. Enter code shown in VS Code
3. Authorize "Visual Studio Code"
4. Return to VS Code

### "Loading..." never completes

**Check connection**:

```bash
# Test GitHub API access
curl -H "Authorization: token YOUR_GITHUB_TOKEN" https://api.github.com/user

# Check rate limit
gh api rate_limit
```

**Check extension logs**:
1. `Ctrl+Shift+P` → `Output`
2. Dropdown → Select "GitHub Pull Requests"
3. Look for errors

---

## Alternative: Use Output Panel Instead of Sidebar

If sidebar isn't showing content, use Output panel:

### View Pull Requests in Output
1. `Ctrl+Shift+P` → `GitHub Pull Requests: View Pull Request`
2. Select PR from list
3. Opens in editor with full details

### View GitHub Actions in Output
1. `Ctrl+Shift+P` → `GitHub Actions: View Workflow Runs`
2. Select workflow
3. See logs in Output panel

---

## Quick Test: Create a PR to Verify

```bash
# Create test branch
git checkout -b test-github-extensions
echo "test" >> README.md
git add README.md
git commit -m "test: verify GitHub extensions"
git push -u origin test-github-extensions

# Create PR
gh pr create --title "Test: GitHub Extensions" --body "Testing VS Code GitHub extensions output"

# Now check VS Code GitHub panel
# Should see the new PR appear
```

---

## Visual Guide

**Where to look after sign in:**

```
Left Sidebar (Activity Bar)
└── GitHub icon 🐙
    ├── PULL REQUESTS ▼
    │   ├── My Pull Requests
    │   ├── Assigned To Me
    │   └── All Open Pull Requests
    │
    ├── ISSUES ▼
    │   ├── My Issues
    │   └── All Open Issues
    │
    └── NOTIFICATIONS ▼
        ├── Unread
        └── All
```

**Status Bar (Bottom):**
```
[Branch icon] main    [GitHub icon] 2 ↓ 1 ↑    [PR Status] #44 failed CI
```

---

## Current State from Screenshot

From your screenshot, I can see:

✅ GitHub panel IS open
✅ Sections are visible (Pull Requests, Issues, Notifications)
❌ Pull Requests section appears empty
❌ Issues section is collapsed/empty
❌ Notifications showing "Loading..."

**This indicates:** Extension needs sign-in authentication

---

## Action Required

**Run these commands in VS Code:**

1. `Ctrl+Shift+P`
2. Type: `GitHub Pull Requests: Sign In`
3. Complete browser auth
4. `Ctrl+Shift+P` → `Developer: Reload Window`

After that, the GitHub panel should populate with your PRs, issues, and workflow runs! 🚀

---

## Expected After Fix

You should see **actual content** like:

- Pull Requests: List of open PRs
- Issues: Your GitHub issues with labels/status
- Notifications: Mentions, reviews, etc.
- Status Bar: Live CI status (you already see this!)

The fact you see `#44 failed CI checks` in the status bar means the **GitHub integration is working**, you just need to **sign in to the extensions** for the sidebar content to appear.

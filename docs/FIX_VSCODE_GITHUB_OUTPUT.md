# Fix VS Code GitHub Extensions Not Showing Output

## Current Status

✅ **GitHub CLI authenticated**: `gh auth status` shows logged in as fattits30-dev
✅ **Workflows exist**: 14 workflows configured
✅ **Workflows running**: Recent runs visible via `gh run list`

❌ **VS Code extensions not showing output**: Need to enable panels and authenticate extensions

---

## The Problem

VS Code GitHub extensions (Actions, Pull Requests) are **installed but not displaying output** because:

1. **Extensions need separate authentication** (different from `gh` CLI)
2. **Output panels are likely hidden or disabled**
3. **Extension settings may suppress output**

---

## Quick Fix (Step-by-Step)

### Step 1: Open GitHub Panels in VS Code

**Method 1: Via Activity Bar**
1. Look for **GitHub icon** in the left sidebar (Activity Bar)
2. If missing, right-click Activity Bar → Check "GitHub"

**Method 2: Via Command Palette**
1. Press `Ctrl+Shift+P`
2. Type: `GitHub: Focus on GitHub Pull Requests View`
3. Type: `GitHub Actions: Focus on Workflow Runs View`

**Method 3: View Menu**
- Go to **View** → **Open View...**
- Search: "GitHub Pull Requests"
- Search: "GitHub Actions"

### Step 2: Authenticate Extensions

**GitHub Pull Requests Extension:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `GitHub Pull Requests: Sign In`
3. Follow browser prompts
4. Authorize VS Code

**GitHub Actions Extension:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `GitHub Actions: Sign In`
3. Follow browser prompts
4. Authorize VS Code

### Step 3: Enable Output in Settings

Add to `.vscode/settings.json`:

```json
{
  // GitHub Actions - Enable output
  "github-actions.workflows.pinned.workflows": [".github/workflows/ci.yml"],
  "github-actions.workflows.pinned.refresh.enabled": true,
  "github-actions.workflows.pinned.refresh.interval": 60,

  // GitHub Pull Requests - Enable output
  "githubPullRequests.pullRequestDescription": "template",
  "githubPullRequests.defaultMergeMethod": "squash",
  "githubPullRequests.showInSCM": true,

  // GitHub Copilot - Already enabled ✅
  "github.copilot.enable": {
    "*": true,
    "typescript": true,
    "python": true
  }
}
```

### Step 4: Reload VS Code

1. Press `Ctrl+Shift+P`
2. Type: `Developer: Reload Window`
3. Wait for extensions to load

### Step 5: Verify Output is Working

**GitHub Actions:**
- Open left sidebar → GitHub icon
- Should see "Workflows" section
- Should list recent runs with status icons

**GitHub Pull Requests:**
- Open left sidebar → GitHub icon
- Should see "Pull Requests" section
- Should list open PRs (if any)

**GitHub Copilot:**
- Look for Copilot icon in status bar (bottom-right)
- Should say "GitHub Copilot: Ready"

---

## Troubleshooting

### "No GitHub icon in Activity Bar"

**Solution:**
1. Right-click Activity Bar (left sidebar)
2. Check ✓ "GitHub Pull Requests and Issues"
3. GitHub icon should appear

**Alternative:**
1. Uninstall and reinstall extensions:
   ```
   code --uninstall-extension github.vscode-pull-request-github
   code --install-extension github.vscode-pull-request-github
   ```

### "Extensions installed but still no output"

**Check extension logs:**
1. `Ctrl+Shift+P` → `Output`
2. Select dropdown → "GitHub Pull Requests"
3. Select dropdown → "GitHub Actions"
4. Look for error messages

**Common errors:**
- **"Not signed in"**: Run sign-in commands from Step 2
- **"No repository"**: Ensure you're in a git repo with GitHub remote
- **"Rate limit exceeded"**: Wait or authenticate to increase limits

### "GitHub Actions shows empty"

**Solution 1: Pin workflows**
1. Open GitHub Actions panel
2. Click "..." menu
3. Select "Pin Workflow"
4. Choose `.github/workflows/ci.yml`

**Solution 2: Refresh workflows**
1. GitHub Actions panel → "..." menu
2. Click "Refresh"

**Solution 3: Check workflow files**
```bash
# Verify workflows exist
ls -la .github/workflows/

# Should show: ci.yml, quality.yml, etc.
```

### "Pull Requests shows empty"

**Verify PRs exist:**
```bash
gh pr list
```

If no PRs exist, that's normal! Create a PR:
```bash
git checkout -b test-branch
git push -u origin test-branch
gh pr create --title "Test PR" --body "Testing PR view"
```

### "Copilot not suggesting"

**Check authentication:**
1. Click Copilot icon (status bar)
2. If says "Not signed in" → Sign in
3. Verify subscription at https://github.com/settings/copilot

**Check activation:**
1. `Ctrl+Shift+P` → `GitHub Copilot: Enable`
2. Should change to "Disable" (meaning it's now enabled)

---

## Expected Output After Fix

### GitHub Actions Panel
```
📂 Workflows
  ✅ CI Pipeline (main) - 36s ago
  ⏸️ SonarCloud Analysis (main) - Cancelled
  ✅ Security Checks (main) - 36s ago

📌 Pinned Workflows
  ✅ CI Pipeline (latest: success)
```

### GitHub Pull Requests Panel
```
📬 Pull Requests
  🟢 #123 - feat: Add Groq provider support
  🟢 #122 - fix: Streaming bug (.value error)

🏷️ My Pull Requests
  (List of your PRs)
```

### GitHub Copilot Status Bar
```
[GitHub Copilot icon] GitHub Copilot: Ready
```

### GitLens (Already Fixed ✅)
```
Line 42: fattits30-dev, 2 hours ago • feat: add streaming fix
```

---

## Auto-Apply Settings

Want me to add the GitHub extension settings to `.vscode/settings.json`?

**What I'll add:**
```json
{
  // GitHub Actions output
  "github-actions.workflows.pinned.workflows": [".github/workflows/ci.yml"],
  "github-actions.workflows.pinned.refresh.enabled": true,

  // GitHub PR output
  "githubPullRequests.showInSCM": true,

  // Output panels visibility
  "githubPullRequests.pullRequestDescription": "template"
}
```

This will:
- ✅ Pin CI workflow for quick access
- ✅ Auto-refresh workflow status
- ✅ Show PRs in Source Control panel
- ✅ Enable PR description templates

---

## Manual Testing

### Test GitHub Actions Output

```bash
# Trigger a workflow run
git commit --allow-empty -m "test: trigger CI"
git push

# Watch in VS Code:
# 1. Open GitHub Actions panel
# 2. Should see new run appear
# 3. Click run to see live logs
```

### Test Pull Requests Output

```bash
# Create test PR
git checkout -b test-pr
echo "test" >> README.md
git add README.md
git commit -m "test: PR test"
git push -u origin test-pr
gh pr create --title "Test PR" --body "Testing PR view"

# View in VS Code:
# 1. Open GitHub PR panel
# 2. Should see new PR listed
# 3. Click to view details
```

### Test Copilot Output

1. Open `backend/services/ai/sdk.py`
2. On new line, type: `async def test_`
3. Wait 1-2 seconds
4. Should see **gray suggestion text**
5. Press `Tab` to accept

---

## Quick Commands Reference

```bash
# Check authentication
gh auth status

# List workflows
gh workflow list

# View workflow runs
gh run list --limit 10

# View specific run logs
gh run view <run-id> --log

# List PRs
gh pr list

# Create PR
gh pr create --title "Title" --body "Description"

# View PR details
gh pr view <pr-number>
```

---

## Summary

**Issue**: GitHub extensions installed but showing no output
**Cause**: Extensions need separate auth + output panels disabled/hidden
**Fix**:
1. Authenticate extensions (Sign In commands)
2. Enable output panels (View menu or Activity Bar)
3. Add settings for auto-refresh
4. Reload VS Code

Would you like me to auto-apply the GitHub extension settings to `.vscode/settings.json`?

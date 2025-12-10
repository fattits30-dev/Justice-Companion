# VS Code GitHub Extensions Output Fix

## Issues Found

Your VS Code settings have **disabled key GitHub extension features** for performance optimization, which is why you're not seeing any output:

### 1. GitLens Disabled (Lines 109-110 in `.vscode/settings.json`)
```json
"gitlens.currentLine.enabled": false,  // ❌ No inline git blame
"gitlens.codeLens.enabled": false,      // ❌ No code lens annotations
```

**What's missing:**
- Inline git blame (who changed this line, when)
- Code lens above functions (recent changes, authors)
- Git annotations in editor

### 2. GitHub Copilot May Not Be Active
Need to verify authentication and activation.

### 3. GitHub Actions Output
Workflows exist but may not show outputs in VS Code panel.

---

## Quick Fix: Enable GitLens Output

### Option 1: Enable Just Git Blame (Recommended)

Add to `.vscode/settings.json`:
```json
"gitlens.currentLine.enabled": true,
"gitlens.currentLine.format": "${author}, ${agoOrDate}",
"gitlens.currentLine.scrollable": false
```

**Result**: See "sava6, 2 days ago" at end of current line

### Option 2: Enable Code Lens (Shows Above Functions)

```json
"gitlens.codeLens.enabled": true,
"gitlens.codeLens.authors.enabled": true,
"gitlens.codeLens.recentChange.enabled": true
```

**Result**: See "Last modified by..." above functions

### Option 3: Full GitLens (Not Recommended - Performance Cost)

```json
"gitlens.hovers.enabled": true,
"gitlens.hovers.currentLine.over": "line",
"gitlens.blame.highlight.enabled": true
```

---

## GitHub Copilot Check

### Verify Copilot is Active

1. **Check status bar**: Look for GitHub Copilot icon (bottom-right)
2. **Check authentication**:
   - Open Command Palette (Ctrl+Shift+P)
   - Type: "GitHub Copilot: Sign In"
3. **Test suggestions**:
   - Open a `.ts` file
   - Type: `function calculateTotal` and wait
   - Should see gray suggestion text

### If Copilot Not Working

Enable in settings:
```json
"github.copilot.enable": {
  "*": true,
  "typescript": true,
  "typescriptreact": true,
  "python": true
}
```

---

## GitHub Actions Output

### View Workflow Runs in VS Code

1. **Open GitHub Actions panel**:
   - View → Extensions → GitHub Actions
   - Or click GitHub icon in Activity Bar (left sidebar)

2. **See workflow outputs**:
   - Click on any workflow run
   - Expand steps to see logs
   - View job outputs in panel

### If No Workflows Showing

Check authentication:
```bash
# Install GitHub CLI
winget install GitHub.cli

# Authenticate
gh auth login

# Check workflows
gh workflow list
```

---

## GitHub Pull Requests Output

### View PR Details

1. **Open GitHub Pull Requests panel**:
   - Click GitHub icon in Activity Bar
   - Should see "Pull Requests" section

2. **Authenticate if needed**:
   - Command Palette → "GitHub Pull Requests: Sign In"

3. **View PR diffs**:
   - Click any PR in panel
   - See file changes, comments, checks

---

## Recommended Fix (Balanced Performance + Functionality)

Update `.vscode/settings.json` with:

```json
{
  // Enable minimal GitLens output (low performance cost)
  "gitlens.currentLine.enabled": true,
  "gitlens.currentLine.format": "${author}, ${agoOrDate} • ${message}",
  "gitlens.currentLine.scrollable": false,
  "gitlens.codeLens.enabled": false,  // Keep disabled for performance

  // Enable GitHub Copilot
  "github.copilot.enable": {
    "*": true,
    "typescript": true,
    "typescriptreact": true,
    "python": true
  },

  // GitHub Actions panel
  "github-actions.workflows.pinned.workflows": [".github/workflows/ci.yml"],

  // Keep existing git settings
  "git.enabled": true,
  "git.autofetch": true,
  "git.confirmSync": false
}
```

---

## What Each Extension Shows

### GitLens (Git Supercharged)
**Output locations:**
- **Current line**: Inline git blame at end of line
- **Code lens**: Above functions/classes
- **Hover**: Hover over any line for full commit details
- **Sidebar**: GitLens panel with commit history

**What to look for:**
```
Current line: calculateTotal() {  // sava6, 2 hours ago • feat: add calculator
```

### GitHub Copilot
**Output locations:**
- **Inline suggestions**: Gray text as you type
- **Copilot Chat**: Sidebar panel for Q&A
- **Status bar**: Icon shows active/inactive

**What to look for:**
- Gray suggestion text appearing as you type
- "GitHub Copilot: Ready" in status bar

### GitHub Actions
**Output locations:**
- **Activity Bar**: GitHub icon → Workflows section
- **Output panel**: Bottom panel shows workflow logs

**What to look for:**
- List of workflow runs
- Green/red status icons
- Expandable job steps with logs

### GitHub Pull Requests
**Output locations:**
- **Activity Bar**: GitHub icon → Pull Requests section
- **Editor**: PR description, files changed
- **Comments**: Inline PR comments in code

**What to look for:**
- List of open PRs
- PR checks status
- File diffs with comments

---

## Testing Each Extension

### Test GitLens
1. Open any file in your repo
2. Look at the **end of the current line** (right side)
3. Should see: `author, time • commit message`

### Test Copilot
1. Open `backend/services/ai/sdk.py`
2. On new line, type: `async def test_`
3. Wait 1-2 seconds
4. Should see **gray suggestion text**

### Test GitHub Actions
1. Click **GitHub icon** in Activity Bar (left)
2. Expand **Workflows** section
3. Should see your CI/CD workflow runs

### Test Pull Requests
1. Click **GitHub icon** in Activity Bar
2. Look for **Pull Requests** section
3. Should list any open PRs

---

## Troubleshooting

### "Still no output after enabling GitLens"

1. **Reload VS Code**: Ctrl+Shift+P → "Reload Window"
2. **Check Git repo**: Ensure you're in a Git repository
3. **Check file is tracked**: `git status` should show file

### "Copilot not suggesting"

1. **Check status bar**: Click Copilot icon → "Enable Completions"
2. **Re-authenticate**: Copilot panel → Sign out → Sign in
3. **Check subscription**: https://github.com/settings/copilot

### "No GitHub Actions showing"

1. **Authenticate**: `gh auth login`
2. **Reload extension**: Disable → Enable GitHub Actions extension
3. **Check workflows**: Must be in `.github/workflows/` directory

### "No Pull Requests showing"

1. **Check repo**: Must have GitHub remote configured
2. **Authenticate**: Sign in to GitHub Pull Requests extension
3. **Check PRs exist**: Visit GitHub repo to verify PRs

---

## Quick Commands to Test

```bash
# Check git repo status
git status

# List GitHub workflows
gh workflow list

# List open PRs
gh pr list

# Check Copilot auth
gh auth status

# Test GitLens is working
# (Open any tracked file, should see blame on current line)
```

---

## Apply the Recommended Fix

I can update your `.vscode/settings.json` to enable minimal GitLens output while keeping performance optimized.

**Would you like me to:**
1. ✅ Enable inline git blame (current line only)
2. ✅ Keep code lens disabled (performance)
3. ✅ Enable GitHub Copilot
4. ✅ Configure GitHub Actions panel

This will give you useful output without significant performance cost.

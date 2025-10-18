# 🐺 Cerberus Guardian Setup for Justice Companion

This project is protected by **Cerberus Code Guardian** - an autonomous AI system that scans and fixes code issues automatically!

## What Cerberus Does

✅ **Automatic Code Scanning** on every push and PR
✅ **Auto-fixes** simple issues (linting, formatting)
✅ **Reports** serious issues (security, logic errors)
✅ **PR Comments** with scan results
✅ **100% FREE** operation (uses Google Gemini)

---

## Setup (One-Time)

### 1. Add API Keys to GitHub Secrets

Go to your Justice Companion repository settings:

```
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:

| Secret Name | Required? | Get API Key | Cost |
|------------|-----------|-------------|------|
| `GOOGLE_API_KEY` | ✅ **Required** | [Get Free Key](https://aistudio.google.com/apikey) | **FREE** (1000 req/day) |
| `GROQ_API_KEY` | ⚠️ Optional | [Get Free Key](https://console.groq.com) | **FREE** |
| `HF_API_KEY` | ⚠️ Optional | [Get Free Key](https://huggingface.co/settings/tokens) | **FREE** |
| `ANTHROPIC_API_KEY` | ⚠️ Optional | [Get Paid Key](https://console.anthropic.com) | **PAID** (~$0.003/scan) |

**Minimum Setup:** Just add `GOOGLE_API_KEY` (completely free!)

### 2. Push This Workflow

```bash
cd "F:\Justice Companion take 2"
git add .github/
git commit -m "Add Cerberus Code Guardian workflow"
git push
```

### 3. That's It!

Cerberus will now:
- ✅ Scan every push to main/develop
- ✅ Auto-fix PRs
- ✅ Comment on PRs with results

---

## How It Works

### On Every Push:
1. Cerberus scans your code
2. Finds issues (TODOs, linting, security, etc.)
3. Generates a report (available as artifact)

### On Every Pull Request:
1. Scans the PR code
2. **Auto-fixes** simple issues (linting, formatting)
3. **Commits fixes** back to the PR
4. **Comments** on the PR with results

---

## Example Workflow Run

```
🔍 Scanning Justice Companion...
   Found 365 source files
   Scanning 100 files (for speed)...

✅ Scan complete!
   Files scanned: 100
   Files fixed: 23
   Simple fixes: 45
   Serious issues: 3

🔧 Auto-fixing simple issues...
   Fixed: src/components/Button.tsx
   Fixed: electron/ipc-handlers.ts
   Fixed: src/services/LegalAPIService.ts

✅ Fixes applied: 23
💰 Cost saved: $0.69

📤 Committing fixes...
✅ Fixes committed and pushed!

💬 Commenting on PR...
✅ PR comment added!
```

---

## Cost Breakdown

**With Google Gemini (Recommended):**
- 1000 scans/day: **$0.00**
- Auto-fixes: **$0.00**
- Total: **$0.00/month** 🎉

**With Claude (Optional, for critical security):**
- Simple scans: **$0.00** (uses Gemini)
- Security scans: **$0.003/scan**
- Total: **~$0.50/month**

---

## View Results

### Scan Reports
Go to: `Actions → Latest workflow run → Artifacts → cerberus-report`

### PR Comments
Cerberus automatically comments on every PR with:
- What was checked
- Issues found
- Auto-fixes applied
- Next steps

---

## Customization

Edit `.github/workflows/cerberus-guardian.yml` to:
- Change scan frequency
- Adjust auto-fix rules
- Use different AI models
- Configure notifications

---

## Troubleshooting

### Workflow Fails: "No API key"
→ Add `GOOGLE_API_KEY` to GitHub Secrets (see step 1)

### Workflow Skips Scans
→ Push to `main`, `master`, or `develop` branch, or create a PR

### Want More Detailed Scans
→ Edit workflow, increase from 100 to 500 files scanned

### Want Claude for Security
→ Add `ANTHROPIC_API_KEY` secret (~$0.003/scan)

---

## Stats

After Cerberus is set up, you'll see improvements:

- ✅ Code quality score: 80 → 90+
- ✅ TODOs reduced: 40 → 0
- ✅ Linting issues: Auto-fixed
- ✅ Security issues: Flagged immediately

---

## Support

**Cerberus GitHub:** https://github.com/fattits30-dev/cerberus-code-guardian

**Issues:** https://github.com/fattits30-dev/cerberus-code-guardian/issues

---

**🐺 Your code is now protected 24/7. Zero cost. Set it and forget it.**

# Cerberus Guardian - Quick Setup Guide

## ✅ Current Status

- **Guardian Configuration:** ✅ Ready at `.guardian/config.yaml`
- **PowerShell Script:** ✅ Fixed and working (`guardian-local.ps1`)
- **pnpm Scripts:** ✅ Added to `package.json`
- **GitHub CLI:** ✅ Installed and authenticated
- **GitHub Actions:** ✅ Cerberus workflow running

## ⚠️ Needs Setup

The Guardian Python environment at `C:\Users\sava6\Desktop\codebase-guardian` needs to be installed.

---

## Quick Setup (Manual - Recommended)

Since the Guardian install.ps1 script has a syntax error, here's the manual setup:

### 1. Navigate to Guardian Directory

```powershell
cd C:\Users\sava6\Desktop\codebase-guardian
```

### 2. Check Python Version

```powershell
python --version
# Should be Python 3.10 or higher
```

If Python is not installed:
```powershell
# Install via winget (Windows 11)
winget install Python.Python.3.11

# OR download from https://python.org
```

### 3. Create Virtual Environment

```powershell
# Create venv
python -m venv .venv

# Activate it
.\.venv\Scripts\Activate.ps1
```

### 4. Install Dependencies

```powershell
# Install Guardian requirements
pip install -r requirements.txt

# If requirements.txt doesn't exist, install minimal deps:
pip install pyyaml requests anthropic openai google-generativeai groq
```

### 5. Test Guardian

```powershell
# Test Python can import guardian modules
python -c "from guardian.config import GuardianConfig; print('Guardian OK!')"
```

### 6. Return to Justice Companion and Test

```powershell
cd "F:\Justice Companion take 2"
pnpm guardian:status
```

You should now see: **Virtual Environment: Installed**

---

## Alternative: Use GitHub Actions Only

If local Guardian setup is too complex, you can rely entirely on GitHub Actions:

### How It Works

1. **Every push to main/develop:**
   - Cerberus scans your code automatically
   - Generates report (download from Actions artifacts)
   - Detects issues (security, linting, TODOs)

2. **Every pull request:**
   - Cerberus scans PR changes
   - Auto-fixes simple issues (linting, formatting)
   - Commits fixes back to PR
   - Comments on PR with results

### To Use

```bash
# Just commit and push!
git add .
git commit -m "Your changes"
git push

# Check Actions tab:
# https://github.com/fattits30-dev/Justice-Companion/actions
```

---

## Using Guardian Locally (After Setup)

### Quick Commands

```powershell
# Run full scan
pnpm guardian

# Check status
pnpm guardian:status

# Continuous monitoring (watches for file changes)
pnpm guardian:watch

# Scan specific file
.\guardian-local.ps1 file src/components/Button.tsx
```

### What Guardian Does

✅ **Security Scanning:**
- SQL injection detection
- XSS vulnerability detection
- Prototype pollution checks
- Hardcoded secrets/API key detection
- Insecure Electron configuration

✅ **Code Quality:**
- ESLint violations
- TypeScript errors
- Formatting issues
- Import sorting
- Unused code detection

✅ **GDPR Compliance:**
- Audit logging verification
- Consent management checks
- Data encryption validation
- Export/deletion capabilities

✅ **Best Practices:**
- React hooks dependencies
- Electron security patterns
- Database encryption usage
- Test coverage analysis

---

## Configuration

All settings are in `.guardian/config.yaml`:

```yaml
guardian:
  # FREE AI provider (no cost!)
  llm:
    use_free_tier: true
    free_tier_provider: gemini  # Google Gemini 2.5 Flash

  # Auto-fix strategy
  fix_strategy:
    hybrid_mode: true          # Rule-based + AI
    safe_auto_apply: true      # Auto-fix linting
    risky_report_only: true    # Report security issues

  # Justice Companion specific
  justice_companion:
    database:
      require_encryption_service: true
    gdpr:
      require_audit_trail: true
```

---

## Reports Location

All Guardian reports are saved to:
```
.guardian/reports/
├── justice_companion_scan.md    # Latest full scan
├── fix_TIMESTAMP.md             # Individual fixes
└── summary_DATE.md              # Daily summaries
```

---

## Cost: $0.00/month

- Uses Google Gemini (FREE - 1000 requests/day)
- Rule-based fixes (95% of issues) - No AI needed
- Hybrid mode for maximum savings

---

## Troubleshooting

### "Virtual environment not found"
Run manual setup steps above.

### "Guardian directory not found"
```powershell
git clone https://github.com/fattits30-dev/cerberus-code-guardian.git C:\Users\sava6\Desktop\codebase-guardian
```

### "Python not found"
Install Python 3.10+ from python.org or use winget.

### API Keys (Optional for Local)
If you want to use AI analysis locally, add to `C:\Users\sava6\Desktop\codebase-guardian\.env`:
```env
GOOGLE_API_KEY=your_key_here  # Get from https://aistudio.google.com/apikey
```

---

## Next Steps

1. **Complete Manual Setup** (above) to enable local Guardian
2. **OR** Rely on GitHub Actions for automated scanning
3. **Review Latest Report:** `.guardian/reports/justice_companion_scan.md`
4. **Fix TODOs:** 40 TODOs found in codebase (see report)

---

## Integration Complete! ✅

You now have:
- ✅ Local Guardian scripts ready
- ✅ GitHub Actions running automatically
- ✅ Configuration customized for Justice Companion
- ✅ Reports directory set up
- ✅ pnpm scripts for easy access

Just need to complete the Python environment setup to use locally!

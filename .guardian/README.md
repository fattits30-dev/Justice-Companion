# 🐺 Cerberus Guardian Integration

Justice Companion is protected by **Cerberus Code Guardian** - an autonomous AI-powered code quality system that scans for issues and auto-fixes them!

## Features

✅ **Automatic Code Scanning** on every push/PR (GitHub Actions)
✅ **Local Development Scanning** before you commit
✅ **Auto-fixes** linting, formatting, and simple issues
✅ **Security Scanning** for OWASP vulnerabilities
✅ **TypeScript Analysis** for type errors
✅ **GDPR Compliance Checks** for legal data handling
✅ **100% FREE** operation using Google Gemini

---

## Quick Start

### Option 1: Using PowerShell (Recommended)

```powershell
# Quick scan
.\guardian-local.ps1 scan

# Scan specific file
.\guardian-local.ps1 file src/components/Button.tsx

# Auto-fix file (preview first with -DryRun)
.\guardian-local.ps1 fix src/components/Button.tsx -DryRun

# Continuous monitoring (watches for file changes)
.\guardian-local.ps1 continuous

# Check Guardian status
.\guardian-local.ps1 status
```

### Option 2: Using Batch Script

```cmd
REM Quick scan
guardian-local.bat

REM Full scan
guardian-local.bat scan

REM Scan specific file
guardian-local.bat file src\components\Button.tsx

REM Auto-fix file
guardian-local.bat fix src\components\Button.tsx
```

### Option 3: Using pnpm Scripts

```bash
# Quick scan
pnpm guardian

# Full scan
pnpm guardian:scan

# Scan specific file
pnpm guardian:file src/components/Button.tsx

# Continuous monitoring
pnpm guardian:watch
```

---

## Setup (One-Time)

### 1. Install Guardian Dependencies

Guardian runs from `C:\Users\sava6\Desktop\codebase-guardian`. If not installed:

```powershell
# Clone Cerberus Guardian
git clone https://github.com/fattits30-dev/cerberus-code-guardian.git C:\Users\sava6\Desktop\codebase-guardian

# Install (run from Guardian directory)
cd C:\Users\sava6\Desktop\codebase-guardian
.\install.ps1
```

### 2. Set Up API Keys

Create a `.env` file in the Guardian directory:

```env
# Google Gemini (FREE - Recommended!)
GOOGLE_API_KEY=your_key_here  # Get from https://aistudio.google.com/apikey

# Groq (FREE - Backup)
GROQ_API_KEY=your_key_here  # Get from https://console.groq.com

# OpenAI (PAID - Optional)
OPENAI_API_KEY=your_key_here  # Get from https://platform.openai.com
```

**Minimum Setup:** Just add `GOOGLE_API_KEY` for completely free operation!

### 3. Test Guardian

```powershell
.\guardian-local.ps1 status
```

You should see:
- ✅ Virtual Environment installed
- ✅ Configuration found
- 📄 Recent scan reports

---

## What Guardian Scans

### Security
- 🔒 SQL injection vulnerabilities
- 🔒 XSS attacks
- 🔒 Prototype pollution
- 🔒 Hardcoded secrets/API keys
- 🔒 Insecure Electron configuration

### Code Quality
- ✨ ESLint violations
- ✨ TypeScript errors
- ✨ Formatting issues
- ✨ Import sorting
- ✨ Unused variables/imports

### Best Practices
- ⚛️ React hooks dependencies
- ⚛️ Component optimization
- 🔧 Electron security patterns
- 🗄️ Database encryption usage
- 📊 Test coverage

### GDPR Compliance
- 📋 Audit logging presence
- 📋 Consent management
- 📋 Data export/deletion
- 📋 Encryption of sensitive fields

---

## Configuration

Guardian configuration is in `.guardian/config.yaml`. Key settings:

```yaml
guardian:
  # Operating mode
  mode: continuous  # continuous/scheduled/manual

  # LLM provider (FREE!)
  llm:
    use_free_tier: true
    free_tier_provider: gemini  # Google Gemini 2.5 Flash

  # Fix strategy
  fix_strategy:
    hybrid_mode: true          # Rule-based + AI fixes
    safe_auto_apply: true      # Auto-fix linting/formatting
    risky_report_only: true    # Report security issues (don't auto-fix)

  # Justice Companion specific
  justice_companion:
    database:
      require_encryption_service: true
    gdpr:
      require_audit_trail: true
```

---

## Reports

Guardian saves reports to `.guardian/reports/`:

```
.guardian/reports/
├── justice_companion_scan.md    # Latest full scan
├── fix_20251018_120000.md       # Individual fix reports
└── summary_2025-10-18.md        # Daily summary
```

Each report includes:
- 📊 Issues found (security, linting, etc.)
- 🔧 Fixes applied
- 💡 Recommendations
- 📈 Metrics (LOC, quality score, etc.)

---

## Integration with Git

### Pre-Commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run Guardian scan before commit

echo "🐺 Running Cerberus Guardian pre-commit scan..."
./guardian-local.ps1 scan

if [ $? -ne 0 ]; then
    echo "❌ Guardian found issues. Please fix before committing."
    exit 1
fi

echo "✅ Guardian scan passed!"
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Husky Integration (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky install",
    "guardian:pre-commit": "powershell -ExecutionPolicy Bypass -File guardian-local.ps1 scan"
  },
  "husky": {
    "hooks": {
      "pre-commit": "pnpm guardian:pre-commit && pnpm lint:fix && pnpm type-check"
    }
  }
}
```

---

## GitHub Actions Integration

Guardian automatically runs on:

### Every Push to main/develop
- Scans codebase
- Generates report (available as artifact)
- Detects security issues, TODOs, linting problems

### Every Pull Request
- Scans PR changes
- **Auto-fixes** simple issues (linting, formatting)
- **Commits fixes** back to PR
- **Comments** on PR with scan results

See `.github/workflows/cerberus-guardian.yml` for configuration.

---

## Troubleshooting

### "Guardian directory not found"
```powershell
# Clone Guardian
git clone https://github.com/fattits30-dev/cerberus-code-guardian.git C:\Users\sava6\Desktop\codebase-guardian
```

### "Python virtual environment not found"
```powershell
# Run install
cd C:\Users\sava6\Desktop\codebase-guardian
.\install.ps1
```

### "API key not found"
```powershell
# Add to Guardian .env file
cd C:\Users\sava6\Desktop\codebase-guardian
echo "GOOGLE_API_KEY=your_key_here" >> .env
```

### "No reports generated"
Check `.guardian/reports/` directory exists:
```powershell
mkdir .guardian\reports -Force
```

---

## Cost Breakdown

| Operation | AI Used | Cost |
|-----------|---------|------|
| Local scanning | Google Gemini | **FREE** (1000 req/day) |
| GitHub Actions scan | Google Gemini | **FREE** |
| Simple fixes (linting, formatting) | Rule-based | **FREE** (no AI) |
| Security analysis | Google Gemini | **FREE** |
| **Total Monthly Cost** | | **$0.00** |

With hybrid mode:
- ~95% of fixes use rule-based engine (instant, free)
- ~5% use free AI (Gemini)
- Premium AI (Claude/GPT-4) only for critical security (optional)

---

## Statistics

**Latest Scan Results:**
- Files Scanned: 365
- Lines of Code: 82,567
- Quality Score: 80/100
- TODOs Found: 40
- FIXMEs Found: 0
- Auto-Fixes Applied: 23
- Cost Saved: $0.69

---

## Learn More

- [Cerberus Guardian GitHub](https://github.com/fattits30-dev/cerberus-code-guardian)
- [Guardian Configuration](config.yaml)
- [GitHub Actions Setup](../.github/CERBERUS_SETUP.md)
- [Latest Scan Report](reports/justice_companion_scan.md)

---

**🛡️ Your code is protected by Cerberus Guardian - The AI Code Quality Guardian!**

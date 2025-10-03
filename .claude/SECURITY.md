# Security Configuration - Justice Companion

## File Protection Status

### ❌ Claude Code Hooks - NOT WORKING
After extensive troubleshooting, Claude Code PreToolUse hooks do not execute on this Windows environment.

**Attempted configurations:**
- PowerShell inline commands
- PowerShell script files (-File)
- Batch files with cmd /c wrapper
- Absolute and relative paths
- Multiple /hooks activations

**Conclusion:** Hooks configuration is valid but never executes. Root cause unknown.

---

## ✅ Active Protection Measures

### 1. Git Pre-Commit Hooks
**Location:** `.git/hooks/pre-commit` (bash) and `.git/hooks/pre-commit.bat` (Windows)

**Protected patterns:**
- `.env` - Environment variables
- `.db` - Database files
- `logs/` - Log files
- `keys/` - Key files
- `secrets/` - Secret files
- `.pem` - Certificate files
- `.key` - Key files
- `credentials.json` - Credentials
- `legal-docs/` - Legal documents

**How it works:**
- Runs before every git commit
- Scans staged files for forbidden patterns
- Blocks commit if sensitive files detected
- Exit code 1 = blocked, 0 = allowed

### 2. .gitignore Protection
**Location:** `.gitignore`

Prevents tracking of:
- Environment files (`.env*`)
- Databases (`*.db`, `*.sqlite`)
- Logs (`logs/`, `*.log`)
- Keys (`keys/`, `*.key`, `*.pem`)
- Secrets (`secrets/`, `credentials.json`)
- Legal documents (`legal-docs/`)

### 3. Manual Review Protocol
**For Claude Code operations:**

When working with sensitive paths, manually verify:
1. File path doesn't contain forbidden patterns
2. Content doesn't include secrets/credentials
3. Operation is necessary for functionality

---

## Testing Protection

### Test Git Pre-Commit Hook:
```bash
# Try to commit a protected file (should fail)
echo "test" > .env
git add .env
git commit -m "test"  # Should be BLOCKED

# Expected output:
# ❌ COMMIT BLOCKED: Sensitive file detected
#    File: .env
#    Pattern: .env
```

### Verify .gitignore:
```bash
git status  # Protected files should not appear as untracked
```

---

## Maintenance

### Adding New Protected Patterns:

**1. Update .gitignore:**
```gitignore
# Add pattern
new-sensitive-pattern/
```

**2. Update pre-commit hook:**
```bash
FORBIDDEN_PATTERNS=(
  # ... existing patterns ...
  'new-sensitive-pattern'
)
```

**3. Update pre-commit.bat:**
```batch
set "FORBIDDEN=... new-sensitive-pattern"
```

---

## Incident Response

**If sensitive file committed:**
1. DO NOT PUSH to remote
2. Remove from git history: `git reset HEAD~1`
3. Add pattern to protection
4. Verify file in .gitignore
5. Commit properly

**If already pushed:**
1. Rotate all credentials immediately
2. Use `git filter-branch` or BFG Repo-Cleaner
3. Force push (coordinate with team)
4. Update protection patterns

---

## Future Improvements

1. **Hook execution fix**: Research why Claude Code hooks don't work on Windows
2. **Pre-push hooks**: Additional layer before remote push
3. **Secret scanning**: Tools like git-secrets or truffleHog
4. **Encryption**: Encrypt sensitive files at rest
5. **Access control**: File system permissions on sensitive directories

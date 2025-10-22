# Start Here - Node Modules Fix Scripts

## What Happened?

Your `node_modules` directory has locked files preventing `pnpm install` from working. This is common on Windows when processes are still running or VS Code has files open.

## Quick Start (Just Fix It Now)

### Step 1: Choose Your Fix

#### Option A: Safe Fix (Try This First)
```powershell
./safe-fix-node-modules.ps1
```
This tries 4 gentle fixes before suggesting the nuclear option.

#### Option B: Nuclear Fix (When Safe Fix Fails)
```powershell
./nuclear-fix-node-modules.ps1
```
This deletes everything and reinstalls from scratch. **Takes 12-17 minutes.**

### Step 2: Verify It Worked
```powershell
./verify-installation.ps1
```
This checks that all 12 critical packages are installed correctly.

## Files You Have

| File | Purpose | When to Use |
|------|---------|-------------|
| **START_HERE.md** | You're reading it! | Start here |
| **QUICK_FIX_README.md** | Quick reference | Fast lookup |
| **NODE_MODULES_FIX_GUIDE.md** | Full documentation | Deep troubleshooting |
| **SCRIPTS_CREATED_SUMMARY.md** | Technical details | Understanding scripts |
| **safe-fix-node-modules.ps1** | Gentle fix | First attempt |
| **nuclear-fix-node-modules.ps1** | Full cleanup | Safe fix failed |
| **nuclear-fix-node-modules.bat** | Same as above | Using cmd.exe |
| **verify-installation.ps1** | Verification | After any fix |

## What Each Script Does

### Safe Fix
1. Tries `pnpm install` (maybe it just works!)
2. Kills Node.js processes and retries
3. Clears pnpm cache and retries
4. Deletes lockfile and retries
5. Offers nuclear option if all else fails

### Nuclear Fix
1. Kills ALL Node.js and Electron processes
2. Deletes `node_modules` directory
3. Deletes `pnpm-lock.yaml`
4. Clears pnpm cache
5. Runs fresh `pnpm install`

### Verification
- Checks Node.js is v20.x LTS
- Checks pnpm is installed
- Verifies 12 critical packages exist
- Validates directory structure
- Provides fix recommendations if failures detected

## Common Issues

### "I get a permission error"
Run PowerShell as Administrator:
```powershell
# Right-click PowerShell > Run as Administrator
cd "F:\Justice Companion take 2"
./nuclear-fix-node-modules.ps1
```

### "Script won't run (execution policy)"
```powershell
powershell.exe -ExecutionPolicy Bypass -File ./nuclear-fix-node-modules.ps1
```

### "It says packages are missing after install"
Check your Node.js version:
```powershell
node --version  # Should be v20.18.0 or v20.x.x

# If wrong version:
nvm use 20
# Then retry:
./nuclear-fix-node-modules.ps1
```

### "It's still not working"
Read the full troubleshooting guide:
```powershell
# Open in browser or editor:
NODE_MODULES_FIX_GUIDE.md
```

## Before You Start

### Checklist
- [ ] Close VS Code completely
- [ ] Stop any running dev servers (Ctrl+C)
- [ ] Check Node.js version: `node --version` (should be v20.x)
- [ ] Save all your work (scripts don't touch source code, but be safe)

### What Gets Deleted
These scripts only delete:
- `node_modules/` directory (dependencies)
- `pnpm-lock.yaml` (lockfile)
- pnpm cache (temporary files)

**Your source code is safe!** (`src/`, `electron/`, etc. are never touched)

## After Running Scripts

### If Verification Passes
```powershell
# You're ready to go!
pnpm electron:dev  # Start the app
pnpm test          # Run tests
pnpm lint          # Check code quality
```

### If Verification Fails
1. Check Node.js version: `node --version`
2. Switch to Node 20 if needed: `nvm use 20`
3. Re-run nuclear fix
4. Read `NODE_MODULES_FIX_GUIDE.md` for advanced troubleshooting

## Time Estimates

| Script | Duration |
|--------|----------|
| Safe Fix | 1-5 minutes |
| Nuclear Fix | 12-17 minutes |
| Verification | 10-30 seconds |

## Need More Help?

1. **Quick lookup:** Read `QUICK_FIX_README.md`
2. **Full guide:** Read `NODE_MODULES_FIX_GUIDE.md`
3. **Technical details:** Read `SCRIPTS_CREATED_SUMMARY.md`
4. **GitHub Issues:** Search for similar problems
5. **Create Issue:** Include error output and script logs

## Still Have Questions?

### Q: Will this delete my code?
**A:** No! Only `node_modules` and `pnpm-lock.yaml` are deleted. Your source code is safe.

### Q: How long does it take?
**A:** Safe fix: 1-5 minutes. Nuclear fix: 12-17 minutes.

### Q: Do I need to run both scripts?
**A:** No! Try safe fix first. Only use nuclear if safe fix fails.

### Q: What if I'm using cmd.exe instead of PowerShell?
**A:** Use `nuclear-fix-node-modules.bat` instead of `.ps1` files.

### Q: Can I run this multiple times?
**A:** Yes! Scripts are safe to run repeatedly.

## Success!

After running scripts and verification passes, you're ready to develop:

```powershell
# Start the Electron app
pnpm electron:dev

# Run tests
pnpm test

# Check code quality
pnpm lint

# Build for production
pnpm build
```

## References

- [QUICK_FIX_README.md](./QUICK_FIX_README.md) - Quick reference
- [NODE_MODULES_FIX_GUIDE.md](./NODE_MODULES_FIX_GUIDE.md) - Full guide
- [SCRIPTS_CREATED_SUMMARY.md](./SCRIPTS_CREATED_SUMMARY.md) - Technical details
- [CLAUDE.md](./CLAUDE.md) - Project documentation

---

**Need to fix it now?** Run this:
```powershell
./safe-fix-node-modules.ps1
```

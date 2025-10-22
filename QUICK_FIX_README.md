# Quick Fix Scripts - Node Modules Issues

## TL;DR - Just Fix It!

### Option 1: Safe Fix (Try This First)
```powershell
./safe-fix-node-modules.ps1
```

### Option 2: Nuclear Fix (If Safe Fails)
```powershell
./nuclear-fix-node-modules.ps1
```

### Option 3: Verify Installation
```powershell
./verify-installation.ps1
```

## Scripts Available

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `safe-fix-node-modules.ps1` | Gentle fixes, escalates if needed | First attempt |
| `nuclear-fix-node-modules.ps1` | Full cleanup and reinstall | Safe fix failed |
| `nuclear-fix-node-modules.bat` | Same as PowerShell version | Using cmd.exe |
| `verify-installation.ps1` | Check all packages installed | After any fix |

## Common Issues

### "EBUSY: resource busy or locked"
```powershell
# Close VS Code first, then:
./safe-fix-node-modules.ps1
```

### "Cannot find module"
```powershell
./verify-installation.ps1
# If verification fails:
./nuclear-fix-node-modules.ps1
```

### "NODE_MODULE_VERSION mismatch"
```powershell
# Check Node version
node --version  # Should be v20.18.0

# Switch to Node 20
nvm use 20

# Then reinstall
./nuclear-fix-node-modules.ps1
```

## Need More Help?

Read the comprehensive guide:
- **[NODE_MODULES_FIX_GUIDE.md](./NODE_MODULES_FIX_GUIDE.md)** - Full documentation

## Quick Checklist

Before running scripts:
- [ ] Close VS Code
- [ ] Stop all dev servers (Ctrl+C)
- [ ] Check Node version (`node --version` = v20.x.x)
- [ ] Save all your work (scripts don't touch source code)

After running scripts:
- [ ] Run `./verify-installation.ps1`
- [ ] Commit `pnpm-lock.yaml` if it changed
- [ ] Test with `pnpm electron:dev`

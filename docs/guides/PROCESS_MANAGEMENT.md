# Process Management Guide

## 🛑 Killing Stuck Test Processes

When Playwright E2E tests hang or get stuck, they can leave orphaned Electron and Node.js processes running in the background. This guide shows you how to safely clean them up.

---

## Quick Cleanup (Recommended)

### Using npm Script
```bash
npm run test:e2e:cleanup
```

This runs the safe cleanup script that:
- ✅ Identifies Electron processes
- ✅ Identifies high-memory test processes (>100MB)
- ✅ Asks for confirmation before killing anything
- ✅ **Protects your current terminal session from being killed**

---

## Manual Cleanup

### Windows PowerShell
```powershell
# Run the cleanup script directly
powershell -ExecutionPolicy Bypass -File scripts/cleanup-test-processes.ps1
```

### Windows Command Prompt
```cmd
# List Electron processes
tasklist | findstr electron

# Kill specific Electron process
taskkill /PID <process_id> /F

# Kill all Electron processes (CAREFUL!)
taskkill /IM electron.exe /F
```

### Git Bash / WSL
```bash
# Run the bash cleanup script
bash scripts/cleanup-test-processes.sh

# Or manually:
# List Electron processes
ps aux | grep electron

# Kill Electron processes
pkill -9 electron
```

---

## Why Tests Get Stuck

### Common Causes:

1. **Missing Build** (`dist-electron/` doesn't exist)
   - E2E tests try to launch from `dist-electron/main.js`
   - Solution: Run `npm run build` first, or skip E2E tests during development

2. **AI Service Timeout** (Real API calls)
   - Tests wait for AI responses that never come
   - Solution: Mock AI services in test environment

3. **Element Not Found**
   - Tests look for UI elements that don't exist
   - Solution: Check `data-testid` attributes match between tests and components

4. **Multiple Test Runs**
   - Running tests multiple times creates orphaned processes
   - Solution: Use `npm run test:e2e:cleanup` between test runs

---

## Safe Process Management

### ⚠️ **NEVER** Kill These Processes:
- Your current terminal/shell process
- The Claude Code / IDE process
- MCP server processes
- npm/node processes for dev servers

### ✅ **Safe to Kill**:
- `electron.exe` (Electron app launched by tests)
- High-memory `node.exe` processes (>100MB, likely Playwright test runners)
- Processes with command line containing `playwright`, `test`, or `vitest`

---

## Preventing Stuck Processes

### Best Practices:

1. **Skip E2E Tests During Active Development**
   ```bash
   # Run only unit tests (fast, 990/990 passing)
   npm test

   # Run guard without E2E
   npm run guard:once
   ```

2. **Build Before Running E2E**
   ```bash
   npm run build
   npm run test:e2e
   ```

3. **Use Headed Mode for Debugging**
   ```bash
   # See what's happening in the UI
   npm run test:e2e:headed
   ```

4. **Set Shorter Timeouts**
   ```typescript
   // In playwright.config.ts
   timeout: 15000, // 15 seconds instead of 30
   ```

5. **Clean Up Between Runs**
   ```bash
   npm run test:e2e:cleanup
   npm run test:e2e
   ```

---

## Troubleshooting

### "Access Denied" Error
```bash
# Run PowerShell as Administrator
# Then try again
npm run test:e2e:cleanup
```

### Process List Shows 40+ Node Processes
This is normal! Many are MCP servers, dev servers, and background tools. The cleanup script only targets test-related processes (>100MB memory).

### Tests Still Hanging After Cleanup
1. Press `Ctrl+C` in the terminal running the tests
2. Run cleanup script again
3. Check that `dist-electron/` exists: `npm run build`
4. Consider skipping E2E tests for now

---

## Process Management Scripts

### Location
- `scripts/cleanup-test-processes.ps1` (Windows PowerShell)
- `scripts/cleanup-test-processes.sh` (Bash/Linux/macOS)

### Features
- Interactive confirmation before killing processes
- Current session protection (won't kill itself)
- Memory usage display
- Command line inspection for test-related processes

### Usage Examples
```bash
# Quick cleanup
npm run test:e2e:cleanup

# Manual PowerShell
powershell -File scripts/cleanup-test-processes.ps1

# Manual Bash
bash scripts/cleanup-test-processes.sh
```

---

## When to Run E2E Tests

✅ **Good times**:
- Before committing major features
- Before creating pull requests
- During release preparation
- Weekly integration testing

❌ **Avoid**:
- During active development (slow, resource-intensive)
- When missing `dist-electron/` build
- On low-memory machines
- When unit tests are failing

---

## Additional Resources

- **E2E Test Setup**: `tests/e2e/setup/electron-setup.ts`
- **Playwright Config**: `tests/e2e/playwright.config.ts`
- **Test Specs**: `tests/e2e/specs/`
- **Unit Tests** (Fast!): `npm test` - 990/990 passing ✅

---

**Need Help?**
- Check test logs: `tests/e2e/test-results/`
- View HTML report: `npm run test:e2e:report`
- Debug mode: `npm run test:e2e:debug`

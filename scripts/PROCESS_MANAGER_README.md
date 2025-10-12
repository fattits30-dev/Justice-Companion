# Justice Companion Process Manager

A comprehensive diagnostic and process management utility for monitoring and controlling Justice Companion Electron application processes.

## 🎯 Purpose

When Justice Companion becomes unresponsive or multiple instances are launched, this utility helps you:
- **Monitor** all running processes in real-time
- **Diagnose** memory usage and process status
- **Terminate** processes gracefully or forcefully
- **Track** process counts and types

## 🚀 Quick Start

### Using npm/pnpm Scripts (Recommended)

```bash
# Live monitoring (updates every 2 seconds)
pnpm process:monitor

# List processes once
pnpm process:list

# Quick status check
pnpm process:status

# Gracefully kill all processes (with confirmation)
pnpm process:kill

# Force kill all processes (with confirmation)
pnpm process:force
```

### Using Node.js Script Directly

```bash
# Monitor
node scripts/process-manager.js monitor

# List
node scripts/process-manager.js list

# Status
node scripts/process-manager.js status

# Kill
node scripts/process-manager.js kill

# Force
node scripts/process-manager.js force

# Help
node scripts/process-manager.js help
```

### Using PowerShell Script (Windows)

```powershell
# Monitor
.\scripts\process-manager.ps1 monitor

# List
.\scripts\process-manager.ps1 list

# Status
.\scripts\process-manager.ps1 status

# Kill
.\scripts\process-manager.ps1 kill

# Force
.\scripts\process-manager.ps1 force

# Help
.\scripts\process-manager.ps1 help
```

## 📊 Commands

### `monitor` - Live Process Monitoring

Continuously monitors all Justice Companion processes with automatic refresh every 2 seconds.

**Features:**
- Real-time process count
- Memory usage tracking
- Process type identification (Main, Renderer, GPU, Utility)
- Color-coded status indicators
- Press `Ctrl+C` to exit

**Example Output:**
```
════════════════════════════════════════════════════════════════════
  Justice Companion - Active Processes
════════════════════════════════════════════════════════════════════

  PID      Memory      Status          Type
  ────────────────────────────────────────────────────────────────
  11288    113.8 MB    Running         Main Process
  4508     124.2 MB    Running         Renderer
  25436    52.7 MB     Running         GPU Process
  24116    99.1 MB     Running         Utility
  ────────────────────────────────────────────────────────────────

  Total Processes: 4
  Total Memory:    389.8 MB
  Main:            1
  Renderer:        1
  GPU:             1
  Utility:         1

════════════════════════════════════════════════════════════════════
```

**Usage:**
```bash
pnpm process:monitor
```

---

### `list` - List Processes Once

Displays all Justice Companion processes once (non-refreshing).

**Usage:**
```bash
pnpm process:list
```

**Use Case:**
- Quick snapshot of running processes
- Scripting and automation
- Checking process count before starting app

---

### `status` - Quick Status Check

Shows a compact status summary with process count, memory usage, and PIDs.

**Example Output:**
```
Status: Running
Processes: 4
Memory: 389.8 MB
PIDs: 11288, 4508, 25436, 24116
```

**Usage:**
```bash
pnpm process:status
```

**Use Case:**
- Quick health check
- Determining if app is running
- Scripting status checks

---

### `kill` - Graceful Termination

Attempts to gracefully terminate all Justice Companion processes.

**Features:**
- **Confirmation prompt** before killing
- Sends graceful shutdown signal (SIGTERM)
- Waits 5 seconds for processes to exit
- Offers force kill if processes don't exit

**Interactive Flow:**
```bash
$ pnpm process:kill

Found 4 Justice Companion process(es)

  PID      Memory      Status          Type
  ────────────────────────────────────────────────────────────────
  ...

Kill all processes? (yes/no): yes

Gracefully terminating 4 process(es)...

  ✓ Killed process 11288
  ✓ Killed process 4508
  ✓ Killed process 25436
  ✓ Killed process 24116

Waiting 5 seconds for processes to exit...

All processes terminated successfully.
```

**Usage:**
```bash
pnpm process:kill
```

**Use Case:**
- App is unresponsive but not frozen
- Want to restart app cleanly
- Multiple instances launched accidentally

---

### `force` - Force Kill

Immediately force kills all Justice Companion processes without graceful shutdown.

**Features:**
- **Confirmation prompt** before force killing
- Uses force kill signal (SIGKILL / `taskkill /F`)
- Immediate termination (no grace period)
- Last resort for frozen processes

**Interactive Flow:**
```bash
$ pnpm process:force

Found 4 Justice Companion process(es)

  PID      Memory      Status          Type
  ────────────────────────────────────────────────────────────────
  ...

Kill all processes? (yes/no): yes

Force killing all processes...

  ✓ Killed process 11288
  ✓ Killed process 4508
  ✓ Killed process 25436
  ✓ Killed process 24116
```

**Usage:**
```bash
pnpm process:force
```

**Use Case:**
- App is completely frozen
- Graceful kill failed
- Emergency shutdown needed

---

## 🎨 Output Features

### Color Coding

- **Green** - Running processes, successful operations
- **Red** - Not responding processes, failed operations
- **Yellow** - Warnings, important information
- **Cyan** - Headers, section dividers
- **Magenta** - Main processes
- **Blue** - Renderer processes
- **White** - General information

### Process Types

The process manager identifies and categorizes Electron processes:

| Type | Description | Color |
|------|-------------|-------|
| **Main Process** | Electron main process (Node.js backend) | Magenta |
| **Renderer** | UI renderer processes (web page instances) | Blue |
| **GPU Process** | Hardware acceleration process | Green |
| **Utility** | Helper processes (network, storage, etc.) | Cyan |

### Memory Formatting

Memory usage is displayed in human-readable format:
- **KB** for values < 1024 KB
- **MB** for values ≥ 1024 KB

Example: `113.8 MB`, `52.7 KB`

---

## 🔧 Technical Details

### Process Detection

The process manager detects Justice Companion processes by:
1. Searching for `electron.exe` and `node.exe` processes
2. Filtering by command-line arguments containing:
   - `justice`
   - `companion`
   - `electron\\main`
3. Grouping by process type (main, renderer, GPU, utility)

### Graceful vs Force Kill

**Graceful Kill (`taskkill /PID`):**
- Sends SIGTERM (Windows equivalent)
- Allows process to clean up resources
- Saves unsaved data
- Closes connections properly
- **5-second grace period** before checking for survivors

**Force Kill (`taskkill /F /PID`):**
- Sends SIGKILL (Windows equivalent)
- Immediate termination
- No cleanup or data saving
- Use only when graceful kill fails

### Platform Support

- ✅ **Windows 10/11** - Full support (tasklist, taskkill, wmic)
- ✅ **PowerShell** - Native Windows support
- ⚠️ **macOS/Linux** - Not tested (may require modifications)

---

## 🚨 Common Scenarios

### Scenario 1: App Won't Start (Multiple Instances Running)

**Symptoms:**
- Click app icon, nothing happens
- Multiple Electron icons in taskbar
- High memory usage

**Solution:**
```bash
# Check how many processes are running
pnpm process:status

# Kill all instances
pnpm process:kill

# Restart the app
pnpm electron:dev
```

---

### Scenario 2: App is Frozen/Unresponsive

**Symptoms:**
- App window won't close
- UI not responding to clicks
- Can't access File menu or close button

**Solution:**
```bash
# Try graceful kill first
pnpm process:kill

# If that fails, force kill
pnpm process:force

# Restart the app
pnpm electron:dev
```

---

### Scenario 3: Memory Leak Investigation

**Symptoms:**
- App using excessive memory
- Gradual performance degradation
- System slowdown

**Solution:**
```bash
# Monitor memory usage over time
pnpm process:monitor

# Watch for:
# - Memory continuously increasing
# - Multiple renderer processes
# - Utility processes with high memory
```

---

### Scenario 4: Testing/Development Cleanup

**Use Case:**
- After E2E tests
- Before starting fresh dev session
- When switching branches

**Solution:**
```bash
# Quick status check
pnpm process:status

# If processes found, kill them
pnpm process:kill

# Start clean dev session
pnpm electron:dev
```

---

## 📝 Integration with Package.json

The process manager is integrated into `package.json` scripts:

```json
{
  "scripts": {
    "process:monitor": "node scripts/process-manager.js monitor",
    "process:list": "node scripts/process-manager.js list",
    "process:status": "node scripts/process-manager.js status",
    "process:kill": "node scripts/process-manager.js kill",
    "process:force": "node scripts/process-manager.js force"
  }
}
```

This allows for:
- Consistent command interface
- Easy integration with other scripts
- Cross-platform compatibility

---

## 🐛 Troubleshooting

### "No processes found" but app is running

**Cause:** Process detection failed or app renamed

**Solution:**
1. Check Task Manager manually for `electron.exe`
2. Look for `node.exe` processes
3. Modify `PROCESS_NAMES` array in script if needed

### Permission denied errors

**Cause:** Insufficient permissions to kill processes

**Solution:**
```bash
# Run as Administrator (Windows)
# Right-click PowerShell → Run as Administrator
pnpm process:force
```

### Script won't run (PowerShell execution policy)

**Cause:** PowerShell script execution disabled

**Solution:**
```powershell
# Temporarily allow script execution
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Then run the script
.\scripts\process-manager.ps1 monitor
```

---

## 🔒 Safety Features

1. **Confirmation prompts** - All kill commands require confirmation
2. **Grace period** - Graceful kill waits 5 seconds before reporting survivors
3. **Process filtering** - Only kills Justice Companion processes (not system processes)
4. **Error handling** - Comprehensive error handling for all operations
5. **Clear feedback** - Visual confirmation of all operations

---

## 📚 Examples

### Example 1: Morning Development Routine

```bash
# Check if any instances are running from yesterday
pnpm process:status

# Kill all old processes
pnpm process:kill

# Start fresh dev session
pnpm electron:dev
```

### Example 2: E2E Test Cleanup

```bash
# After running E2E tests
pnpm test:e2e

# Clean up any orphaned processes
pnpm process:kill

# Rebuild for Electron
pnpm rebuild:electron
```

### Example 3: Investigating Performance Issues

```bash
# Start monitoring
pnpm process:monitor

# In another terminal, start the app
pnpm electron:dev

# Watch memory usage increase over time
# Press Ctrl+C when done observing
```

---

## 🎯 Best Practices

1. **Always try graceful kill first** - Use `process:kill` before `process:force`
2. **Monitor before killing** - Run `process:status` to see what you're killing
3. **Clean up after E2E tests** - E2E tests may leave orphaned processes
4. **Check status before starting app** - Avoid launching multiple instances
5. **Use monitoring for diagnostics** - `process:monitor` helps identify memory leaks

---

## 📖 Related Scripts

- `cleanup-test-processes.ps1` - Basic cleanup (legacy)
- `cleanup-test-processes-simple.ps1` - Simple cleanup (no prompts)
- `rebuild-for-node.js` - Rebuild better-sqlite3 for Node.js
- `rebuild-for-electron.js` - Rebuild better-sqlite3 for Electron

---

## 🆘 Getting Help

If you encounter issues with the process manager:

1. **Check the output** - Error messages are descriptive
2. **Try force kill** - If graceful kill fails
3. **Run as Administrator** - Permission issues
4. **Check Task Manager** - Manual process inspection
5. **Report issues** - Create GitHub issue with output logs

---

**Last Updated:** 2025-10-12
**Script Version:** 1.0.0
**Compatibility:** Windows 10/11, Node.js 20.x, PowerShell 5.1+

---

**Quick Reference:**

```bash
pnpm process:monitor   # Live monitoring
pnpm process:list      # List once
pnpm process:status    # Quick status
pnpm process:kill      # Graceful kill
pnpm process:force     # Force kill
```

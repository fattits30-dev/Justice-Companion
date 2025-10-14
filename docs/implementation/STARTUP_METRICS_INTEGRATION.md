# Startup Performance Metrics - Integration Guide

## Quick Start

Add performance metrics tracking to Justice Companion's startup sequence with minimal code changes.

## 1. Add Import (Line ~86 in main.ts)

```typescript
// Add after other imports
import { startupMetrics } from '../src/services/StartupMetrics';
```

## 2. Modify app.whenReady() (Line ~2958)

### Current Code Structure
```typescript
app.whenReady().then(async () => {
  setupGlobalErrorHandlers();
  // ... 600+ lines of initialization
  setupIpcHandlers();
  createWindow();
});
```

### Enhanced with Metrics
```typescript
app.whenReady().then(async () => {
  // 🎯 METRIC: App Ready
  startupMetrics.recordPhase('appReady');

  setupGlobalErrorHandlers();

  // Initialize database
  try {
    databaseManager.getDatabase();
    runMigrations();
    // 🎯 METRIC: After database ready
    startupMetrics.recordPhase('criticalServicesReady');
  } catch (error) {
    // ... error handling
  }

  // ... encryption and audit logger setup ...

  // After authentication services initialized (line ~3086)
  // 🎯 METRIC: Critical handlers ready
  startupMetrics.recordPhase('criticalHandlersRegistered');

  // ... secure storage setup ...

  setupIpcHandlers();

  // 🎯 METRIC: Before createWindow
  createWindow();
  startupMetrics.recordPhase('mainWindowCreated');

  // Add window ready tracking (NEW - after createWindow)
  if (mainWindow) {
    mainWindow.once('ready-to-show', () => {
      // 🎯 METRIC: Main window visible
      startupMetrics.recordPhase('mainWindowShown');
    });
  }

  // After all initialization (line ~3594, before closing brace)
  setTimeout(() => {
    // 🎯 METRIC: All handlers registered
    startupMetrics.recordPhase('allHandlersRegistered');

    // 📊 LOG METRICS
    startupMetrics.logStartupMetrics();
  }, 100);
});
```

## 3. Specific Line Insertions

### Line ~2959 (After app.whenReady starts)
```typescript
// Record app ready time
startupMetrics.recordPhase('appReady');
```

### Line ~2973 (After database initialization)
```typescript
// Record critical services ready
startupMetrics.recordPhase('criticalServicesReady');
```

### Line ~3086 (After auth services initialized)
```typescript
// Record critical handlers registered
startupMetrics.recordPhase('criticalHandlersRegistered');
```

### Line ~3588 (After createWindow() call)
```typescript
// Record main window created
startupMetrics.recordPhase('mainWindowCreated');

// Track when window is actually shown
if (mainWindow) {
  mainWindow.once('ready-to-show', () => {
    startupMetrics.recordPhase('mainWindowShown');
  });
}
```

### Line ~3594 (Before app.whenReady closes)
```typescript
// Defer final metrics logging
setTimeout(() => {
  startupMetrics.recordPhase('allHandlersRegistered');
  startupMetrics.logStartupMetrics();
}, 100);
```

## 4. Optional: Add Loading Window Tracking

If you implement a loading window (recommended):

```typescript
// After showing loading window
loadingWindow = createLoadingWindow();
startupMetrics.recordPhase('loadingWindowShown');
```

## 5. Non-Critical Services Tracking

For background services initialization:

```typescript
// In background initialization
initializeNonCriticalServices().then(() => {
  startupMetrics.recordPhase('nonCriticalServicesReady');
});
```

## Expected Console Output

```
╔════════════════════════════════════════════════════════════╗
║              STARTUP PERFORMANCE METRICS                    ║
╠════════════════════════════════════════════════════════════╣
║                                                              ║
║  📊 Phase Timing (from app ready)                           ║
║  ─────────────────────────────────                         ║
║  Loading window shown:         N/A                          ║
║  Critical services ready:      ✅ 105ms                     ║
║  Critical handlers registered: ✅ 125ms                     ║
║  Main window created:          ⚠️  385ms                    ║
║  Main window shown:            ⚠️  425ms                    ║
║  All handlers registered:      525ms                        ║
║                                                              ║
║  🎯 Summary                                                 ║
║  ──────────                                                ║
║  Perceived startup time:       ⚠️  525ms                    ║
║  Total startup time:           ⚠️  625ms                    ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
```

## Performance Indicators

- ✅ **Good** - Within target range
- ⚠️ **Warning** - Slightly above target
- ❌ **Poor** - Needs optimization

## Targets

| Phase | Excellent | Good | Warning |
|-------|-----------|------|---------|
| Loading Window | <50ms | <100ms | >100ms |
| Critical Services | <150ms | <250ms | >250ms |
| Main Window Shown | <250ms | <400ms | >400ms |
| Perceived Startup | <400ms | <600ms | >600ms |

## Testing

1. **Cold Start Test**
   ```bash
   # Kill all Electron processes
   taskkill /F /IM electron.exe

   # Start fresh
   pnpm electron:dev

   # Check console for metrics table
   ```

2. **Warm Start Test**
   ```bash
   # Close and immediately restart
   # Should be faster than cold start
   ```

3. **Save Metrics for Analysis**
   ```bash
   # Set environment variable
   set TRACK_STARTUP_METRICS=true
   pnpm electron:dev

   # Metrics saved to: %APPDATA%/justice-companion/logs/startup-metrics-*.json
   ```

## Troubleshooting

### Metrics show N/A
- Phase not reached or error occurred before that phase
- Check console for errors

### Very high times (>1000ms)
- Check for synchronous file I/O in startup path
- Look for blocking database operations
- Review heavy imports at module level

### Main window shown is slow
- Check renderer bundle size
- Review number of components rendered initially
- Consider lazy loading routes

## Next Steps

After adding metrics:

1. Run the app and check baseline metrics
2. Identify slowest phases from the output
3. Focus optimization on phases showing ⚠️ or ❌
4. Implement loading window for better perceived performance
5. Parallelize service initialization where possible
6. Defer non-critical services to after main window shows

## Complete Integration Example

```typescript
// main.ts - Complete integration

import { startupMetrics } from '../src/services/StartupMetrics';

app.whenReady().then(async () => {
  startupMetrics.recordPhase('appReady');

  try {
    // Setup phase
    setupGlobalErrorHandlers();

    // Database phase
    databaseManager.getDatabase();
    runMigrations();
    startupMetrics.recordPhase('criticalServicesReady');

    // ... encryption, audit logger, auth setup ...

    startupMetrics.recordPhase('criticalHandlersRegistered');

    // IPC and window phase
    setupIpcHandlers();
    createWindow();
    startupMetrics.recordPhase('mainWindowCreated');

    // Track visibility
    mainWindow?.once('ready-to-show', () => {
      startupMetrics.recordPhase('mainWindowShown');
    });

    // Complete
    setTimeout(() => {
      startupMetrics.recordPhase('allHandlersRegistered');
      startupMetrics.logStartupMetrics();
    }, 100);

  } catch (error) {
    console.error('Startup failed:', error);
    startupMetrics.logStartupMetrics(); // Log even on failure
    app.exit(1);
  }
});
```

---

**Implementation Time**: ~10 minutes
**Value**: Immediate visibility into startup bottlenecks
**Next**: Use metrics to guide optimization efforts
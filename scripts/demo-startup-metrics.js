/**
 * Startup Metrics Demo Script
 *
 * This script demonstrates how the startup metrics system works
 * Run with: node scripts/demo-startup-metrics.js
 */

// Import the compiled JavaScript version
const { StartupMetrics } = require('../dist/src/services/StartupMetrics.js');

console.log('🚀 Startup Metrics Demo\n');
console.log('This demo simulates the startup phases of Justice Companion\n');

// Create metrics instance
const metrics = new StartupMetrics();

// Simulate startup phases with realistic delays
async function simulateStartup() {
  console.log('Starting application...\n');

  // Phase 1: App becomes ready
  await delay(100);
  metrics.recordPhase('appReady');
  console.log('✓ Electron app ready');

  // Phase 2: Show loading window
  await delay(30);
  metrics.recordPhase('loadingWindowShown');
  console.log('✓ Loading window shown to user');

  // Phase 3: Initialize critical services (database, encryption)
  await delay(120);
  metrics.recordPhase('criticalServicesReady');
  console.log('✓ Critical services initialized');

  // Phase 4: Register critical IPC handlers
  await delay(10);
  metrics.recordPhase('criticalHandlersRegistered');
  console.log('✓ Critical IPC handlers registered');

  // Phase 5: Create main window
  await delay(50);
  metrics.recordPhase('mainWindowCreated');
  console.log('✓ Main window created');

  // Phase 6: Main window becomes visible
  await delay(40);
  metrics.recordPhase('mainWindowShown');
  console.log('✓ Main window shown to user');

  // Phase 7: Non-critical services (AI, etc.) in background
  await delay(100);
  metrics.recordPhase('nonCriticalServicesReady');
  console.log('✓ Non-critical services ready');

  // Phase 8: All remaining handlers registered
  await delay(50);
  metrics.recordPhase('allHandlersRegistered');
  console.log('✓ All handlers registered');

  console.log('\n');

  // Display the metrics
  metrics.logStartupMetrics();

  // Export metrics as JSON
  console.log('\n📁 Metrics JSON Export:');
  console.log(metrics.exportMetrics());
}

// Utility function to simulate delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run different scenarios
async function runScenarios() {
  console.log('=== SCENARIO 1: Normal Startup ===\n');
  await simulateStartup();

  console.log('\n\n=== SCENARIO 2: Slow Database Initialization ===\n');
  await simulateSlowStartup();

  console.log('\n\n=== SCENARIO 3: Optimized Startup (with loading window) ===\n');
  await simulateOptimizedStartup();
}

async function simulateSlowStartup() {
  const slowMetrics = new StartupMetrics();

  console.log('Starting application (slow database)...\n');

  await delay(100);
  slowMetrics.recordPhase('appReady');
  console.log('✓ Electron app ready');

  // Slow database initialization
  await delay(500);
  slowMetrics.recordPhase('criticalServicesReady');
  console.log('✓ Critical services initialized (slow!)');

  await delay(10);
  slowMetrics.recordPhase('criticalHandlersRegistered');
  console.log('✓ Critical IPC handlers registered');

  await delay(50);
  slowMetrics.recordPhase('mainWindowCreated');
  console.log('✓ Main window created');

  await delay(40);
  slowMetrics.recordPhase('mainWindowShown');
  console.log('✓ Main window shown to user');

  console.log('\n');
  slowMetrics.logStartupMetrics();
}

async function simulateOptimizedStartup() {
  const optMetrics = new StartupMetrics();

  console.log('Starting application (optimized)...\n');

  await delay(100);
  optMetrics.recordPhase('appReady');
  console.log('✓ Electron app ready');

  // Show loading window immediately!
  await delay(20);
  optMetrics.recordPhase('loadingWindowShown');
  console.log('✓ Loading window shown (user sees progress!)');

  // Parallel initialization
  await delay(80);
  optMetrics.recordPhase('criticalServicesReady');
  console.log('✓ Critical services initialized (parallelized)');

  await delay(5);
  optMetrics.recordPhase('criticalHandlersRegistered');
  console.log('✓ Critical IPC handlers registered');

  await delay(30);
  optMetrics.recordPhase('mainWindowCreated');
  console.log('✓ Main window created');

  await delay(20);
  optMetrics.recordPhase('mainWindowShown');
  console.log('✓ Main window shown to user');

  // Non-critical in background (doesn't block UI)
  setTimeout(() => {
    optMetrics.recordPhase('nonCriticalServicesReady');
    console.log('✓ Non-critical services ready (background)');
  }, 200);

  setTimeout(() => {
    optMetrics.recordPhase('allHandlersRegistered');
    console.log('✓ All handlers registered (background)');
  }, 250);

  // Wait a bit for background tasks
  await delay(300);

  console.log('\n');
  optMetrics.logStartupMetrics();
}

// Check if we need to build first
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/src/services/StartupMetrics.js');

if (!fs.existsSync(distPath)) {
  console.log('⚠️  Compiled file not found. Please run: pnpm build\n');
  console.log('Alternatively, you can use: pnpm tsx scripts/demo-startup-metrics.ts');
  process.exit(1);
}

// Run the demo
runScenarios().catch(console.error);
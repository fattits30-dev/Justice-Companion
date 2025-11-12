// Test script to find the correct way to import Electron in v39
console.log("=== Electron v39 API Test ===");
console.log("Process versions:", process.versions);
console.log("Electron version:", process.versions.electron);

// Test 1: Direct require
console.log("\n1. Direct require('electron'):");
try {
  const electron = require('electron');
  console.log("  Type:", typeof electron);
  console.log("  Value:", electron);
  console.log("  Has app?", !!electron.app);
  if (electron.app) {
    console.log("  SUCCESS: electron.app found!");
  }
} catch (e) {
  console.log("  ERROR:", e.message);
}

// Test 2: Check global electron
console.log("\n2. Check global.electron:");
console.log("  global.electron:", typeof global.electron);
if (global.electron) {
  console.log("  Has app?", !!global.electron.app);
}

// Test 3: Check process.electronBinding
console.log("\n3. Check process.electronBinding:");
console.log("  process.electronBinding:", typeof process.electronBinding);

// Test 4: Check process._linkedBinding
console.log("\n4. Check process._linkedBinding:");
console.log("  process._linkedBinding:", typeof process._linkedBinding);

// Test 5: Try to find Electron through process properties
console.log("\n5. Scan process properties:");
for (let key in process) {
  if (key.includes('electron') || key.includes('Electron')) {
    console.log(`  process.${key}:`, typeof process[key]);
  }
}

// Test 6: Check if we can access app directly as a global
console.log("\n6. Check global app:");
console.log("  typeof app:", typeof app);

// Test 7: Try __non_webpack_require__ if it exists
console.log("\n7. Check __non_webpack_require__:");
console.log("  typeof __non_webpack_require__:", typeof __non_webpack_require__);

// Test 8: Try to access through module.parent
console.log("\n8. Check module.parent:");
if (module.parent) {
  console.log("  module.parent.filename:", module.parent.filename);
}

// Test 9: Check process.type (should be 'browser' in main process)
console.log("\n9. Check process.type:");
console.log("  process.type:", process.type);

// Test 10: Try require.main
console.log("\n10. Check require.main:");
if (require.main) {
  console.log("  require.main.filename:", require.main.filename);
}

// Keep process alive for a moment to see output
setTimeout(() => {
  console.log("\n=== Test Complete ===");
  process.exit(0);
}, 1000);
// Test process._linkedBinding for Electron API
console.log("Testing process._linkedBinding...");

if (process._linkedBinding) {
  console.log("process._linkedBinding exists!");

  // Try different names
  const namesToTry = ['electron', 'atom', 'electronMain', 'electron_browser_app', 'atom_browser_app'];

  for (const name of namesToTry) {
    console.log(`\nTrying _linkedBinding('${name}'):`);
    try {
      const binding = process._linkedBinding(name);
      console.log(`  SUCCESS! Type: ${typeof binding}`);
      console.log(`  Keys: ${Object.keys(binding || {}).join(', ')}`);

      // Check for app
      if (binding && binding.app) {
        console.log(`  ✓ Found app!`);
        console.log(`  app.whenReady: ${typeof binding.app.whenReady}`);

        // Test if it works
        binding.app.whenReady().then(() => {
          console.log("  ✓ App is ready!");
          process.exit(0);
        });

        // Don't exit immediately, let whenReady fire
        return;
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  // Try listing all available bindings
  console.log("\nTrying to list available bindings...");
  try {
    // Some internal function names
    const internalBindings = ['natives', 'config', 'constants', 'util'];
    for (const name of internalBindings) {
      try {
        const binding = process._linkedBinding(name);
        if (binding) {
          console.log(`  Found: ${name} (${typeof binding})`);
        }
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    console.log("  Could not list bindings");
  }
}

// Test process.binding as well
console.log("\nTesting process.binding...");
if (process.binding) {
  try {
    const electronBinding = process.binding('electron');
    console.log(`  electron binding: ${typeof electronBinding}`);
    if (electronBinding) {
      console.log(`  Keys: ${Object.keys(electronBinding).join(', ')}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

// Keep alive briefly
setTimeout(() => {
  console.log("\nNo working Electron API found");
  process.exit(1);
}, 2000);
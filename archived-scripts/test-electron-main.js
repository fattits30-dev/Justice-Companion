// Test electron/main import for Electron v39+
console.log("Testing electron/main import...");

try {
  console.log("Attempting require('electron/main')");
  const { app, BrowserWindow, safeStorage, ipcMain } = require('electron/main');

  console.log("SUCCESS!");
  console.log("- app:", typeof app);
  console.log("- BrowserWindow:", typeof BrowserWindow);
  console.log("- safeStorage:", typeof safeStorage);
  console.log("- ipcMain:", typeof ipcMain);

  if (app && app.whenReady) {
    console.log("\nApp found! Testing whenReady...");
    app.whenReady().then(() => {
      console.log("✓ App is ready!");

      // Create a test window
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: true
      });

      console.log("✓ Window created!");

      setTimeout(() => {
        win.close();
        app.quit();
      }, 2000);
    });
  } else {
    console.log("ERROR: app not found or whenReady not available");
    process.exit(1);
  }
} catch (error) {
  console.log("ERROR:", error.message);
  console.log("Stack:", error.stack);

  // Try electron/common
  console.log("\nTrying electron/common...");
  try {
    const common = require('electron/common');
    console.log("electron/common:", typeof common);
    console.log("Keys:", Object.keys(common || {}));
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  // Try electron/renderer
  console.log("\nTrying electron/renderer...");
  try {
    const renderer = require('electron/renderer');
    console.log("electron/renderer:", typeof renderer);
    console.log("Keys:", Object.keys(renderer || {}));
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  process.exit(1);
}
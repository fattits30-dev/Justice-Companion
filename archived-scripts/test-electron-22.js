// Test Electron 22 import
console.log("Testing Electron 22...");

const electron = require("electron");
console.log("electron type:", typeof electron);
console.log("electron keys:", Object.keys(electron || {}));

// Test accessing app
if (electron.app) {
  console.log("✓ electron.app exists!");
  console.log("  app.whenReady:", typeof electron.app.whenReady);

  electron.app.whenReady().then(() => {
    console.log("✓ App is ready!");

    // Create a test window
    const win = new electron.BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    win.loadURL(
      "data:text/html,<h1>Justice Companion - Working with Electron 22!</h1>"
    );

    setTimeout(() => {
      console.log("✓ App launched successfully with Electron 22!");
      electron.app.quit();
    }, 3000);
  });
} else {
  console.log("ERROR: electron.app is not available!");
  console.log("electron value:", electron);
  process.exit(1);
}

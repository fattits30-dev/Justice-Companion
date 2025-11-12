// Electron Launcher v2 - Works with Electron 25
console.log("Electron Launcher v2 starting...");

// When running under Electron, the electron module is available globally
// We need to make it available to require() calls
const Module = require('module');
const originalRequire = Module.prototype.require;

// Check if we're running under Electron
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

if (isElectron) {
  console.log("Running under Electron v" + process.versions.electron);

  // Override require to provide electron module
  Module.prototype.require = function(id) {
    if (id === 'electron') {
      // In Electron's main process, these are globally available
      const electron = {
        app: require('electron').app || global.app,
        BrowserWindow: require('electron').BrowserWindow || global.BrowserWindow,
        ipcMain: require('electron').ipcMain || global.ipcMain,
        safeStorage: require('electron').safeStorage || global.safeStorage,
        dialog: require('electron').dialog || global.dialog,
        Menu: require('electron').Menu || global.Menu,
        MenuItem: require('electron').MenuItem || global.MenuItem,
        Tray: require('electron').Tray || global.Tray,
        nativeImage: require('electron').nativeImage || global.nativeImage,
        shell: require('electron').shell || global.shell,
        session: require('electron').session || global.session,
        protocol: require('electron').protocol || global.protocol,
        net: require('electron').net || global.net,
        webContents: require('electron').webContents || global.webContents,
        clipboard: require('electron').clipboard || global.clipboard,
        crashReporter: require('electron').crashReporter || global.crashReporter,
        nativeTheme: require('electron').nativeTheme || global.nativeTheme,
        Notification: require('electron').Notification || global.Notification,
        powerMonitor: require('electron').powerMonitor || global.powerMonitor,
        powerSaveBlocker: require('electron').powerSaveBlocker || global.powerSaveBlocker,
        screen: require('electron').screen || global.screen,
        TouchBar: require('electron').TouchBar || global.TouchBar
      };

      console.log("Providing electron module with app:", typeof electron.app);
      return electron;
    }
    return originalRequire.apply(this, arguments);
  };

  // Now load the main app
  console.log("Loading main app from dist/electron/electron/main.js");
  require('./dist/electron/electron/main.js');
} else {
  console.error("Not running under Electron!");
  process.exit(1);
}
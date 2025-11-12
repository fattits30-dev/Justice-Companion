// Electron Preload Script for Main Process
// This helps fix the pnpm + Electron module resolution issue

const { app, BrowserWindow, safeStorage, ipcMain } = require('electron');

// Make Electron APIs available globally in main process
global.electronApp = app;
global.BrowserWindow = BrowserWindow;
global.safeStorage = safeStorage;
global.ipcMain = ipcMain;

// Export for compatibility
module.exports = {
  app,
  BrowserWindow,
  safeStorage,
  ipcMain
};
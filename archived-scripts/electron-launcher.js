// Electron launcher for latest version (39.x)
// Fixes the module resolution issue where require('electron') returns a path string

const Module = require('module');
const path = require('path');
const fs = require('fs');

// Store the original require function
const originalRequire = Module.prototype.require;

// Override require to intercept 'electron' module requests
Module.prototype.require = function(id) {
  if (id === 'electron') {
    // When running in Electron runtime, we need to access the built-in electron module
    // The problem is that node_modules/electron/index.js exports a path string
    // So we need to bypass it and get the actual Electron API
    
    // Try to delete the cached electron module to force re-evaluation
    const electronPath = require.resolve('electron');
    delete require.cache[electronPath];
    
    // Use the native module loader to get the built-in electron module
    try {
      // In Electron runtime, 'electron' is available as a built-in module
      // We use process.electronBinding if available, or fall back to native require
      if (process.electronBinding) {
        return process.electronBinding('electron');
      } else if (process.versions && process.versions.electron) {
        // We're in Electron, so electron should be available as built-in
        // Try to load it directly without going through node_modules
        const nativeModule = process.binding('natives');
        if (nativeModule && nativeModule.electron) {
          return nativeModule.electron;
        }
        
        // Last resort: manually construct the electron object
        const electron = {};
        const nativeRequire = process.mainModule ? process.mainModule.require : require;
        
        // Try to get electron components individually
        try {
          electron.app = nativeRequire('electron/main').app || nativeRequire('electron').app;
          electron.BrowserWindow = nativeRequire('electron/main').BrowserWindow || nativeRequire('electron').BrowserWindow;
          electron.ipcMain = nativeRequire('electron/main').ipcMain || nativeRequire('electron').ipcMain;
          electron.safeStorage = nativeRequire('electron/main').safeStorage || nativeRequire('electron').safeStorage;
        } catch (e) {
          // If that fails, try using eval to bypass module resolution
          return eval("require('electron')");
        }
        
        if (electron.app) {
          return electron;
        }
      }
    } catch (err) {
      console.error('Failed to load built-in electron module:', err);
    }
  }
  
  // For all other modules, use the original require
  return originalRequire.apply(this, arguments);
};

// Now load the main file
require('./dist/electron/electron/main.js');

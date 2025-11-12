// Launcher to fix electron module resolution
// This file runs in the Electron main process

// When running with electron.exe, we need to use the built-in electron module
// not the npm package which just exports a path string

import { app, BrowserWindow, safeStorage, ipcMain } from 'electron';

// Re-export everything so main.ts can import from here
export { app, BrowserWindow, safeStorage, ipcMain };

// Now import and run the main application
import './main';

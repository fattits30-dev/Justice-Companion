import 'dotenv/config';

import { app, BrowserWindow, safeStorage } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupIpcHandlers } from './ipc-handlers/index.ts';
import { initializeDatabase } from './database-init.ts';
import { KeyManager } from '../src/services/KeyManager.ts';
import { AutoUpdater } from '../src/services/AutoUpdater.ts';
import { MainApplication } from './runtime/MainApplication.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = { NODE_ENV: process.env.NODE_ENV };

const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log('[Main]', message, meta ?? '');
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn('[Main]', message, meta ?? '');
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error('[Main]', message, meta ?? '');
  },
};

let keyManager: KeyManager | null = null;
let _mainWindow: BrowserWindow | null = null;

export function getKeyManager(): KeyManager {
  if (!keyManager) {
    throw new Error('KeyManager not initialized. Call only after app.ready.');
  }
  return keyManager;
}

function createMainWindow(): BrowserWindow {
  logger.info('Creating main window');

  const preloadPath = path.join(__dirname, '../dist/electron/preload.js');

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    backgroundColor: '#0B1120',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    window.loadURL('http://localhost:5176');
    if (env.NODE_ENV === 'development') {
      window.webContents.openDevTools();
    }
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  window.once('ready-to-show', () => {
    logger.info('Window ready-to-show');
    window.show();
  });

  window.webContents.on('did-finish-load', () => {
    logger.info('Renderer finished loading');
  });

  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  return window;
}

app.whenReady().then(async () => {
  logger.info('App is ready');
  
  try {
    await initializeDatabase();
    logger.info('Database initialized');

    keyManager = new KeyManager(safeStorage, app.getPath('userData'));
    const _autoUpdater = new AutoUpdater(app, autoUpdater); // Renamed to start with underscore
    const _mainApp = new MainApplication(); // Renamed to start with underscore
    
    setupIpcHandlers();
    
    _mainWindow = createMainWindow();
  } catch (error) {
    logger.error('Failed to initialize app', { error });
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    _mainWindow = createMainWindow();
  }
});
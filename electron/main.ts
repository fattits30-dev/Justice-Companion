import 'dotenv/config';

import { app, BrowserWindow, dialog, safeStorage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';

import { setupIpcHandlers } from './ipc-handlers/index.ts';
import { initializeDatabase, closeDatabase } from './database-init.ts';
import { KeyManager } from '../src/services/KeyManager.ts';
import { ProcessManager } from '../src/services/ProcessManager.ts';
import { AutoUpdater } from '../src/services/AutoUpdater.ts';
import { MainApplication } from './runtime/MainApplication.ts';

const { autoUpdater } = pkg;

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

const processManager = new ProcessManager(app);

let keyManager: KeyManager | null = null;
let mainWindow: BrowserWindow | null = null;
let autoUpdaterService: AutoUpdater | null = null;

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

  window.webContents.on('preload-error', (_event, preloadPathArg, error) => {
    logger.error('Preload error', { preloadPath: preloadPathArg, error });
  });

  window.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = ['http://localhost:5176', 'file://'];
    const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin));
    if (!isAllowed) {
      event.preventDefault();
      logger.warn('Blocked navigation', { url });
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  mainWindow = window;
  return window;
}

async function initializeKeyManager(): Promise<KeyManager> {
  if (keyManager) {
    return keyManager;
  }

  if (env.NODE_ENV === 'test') {
    const envKey = process.env.ENCRYPTION_KEY_BASE64;
    if (!envKey) {
      throw new Error('ENCRYPTION_KEY_BASE64 required in test mode');
    }
    const cachedKey = Buffer.from(envKey, 'base64');
    keyManager = {
      getKey: () => cachedKey,
      hasKey: () => true,
      clearCache: () => {},
    } as unknown as KeyManager;
    return keyManager;
  }

  logger.info('Starting KeyManager health check');

  if (!safeStorage.isEncryptionAvailable()) {
    const message =
      'Justice Companion cannot start because OS-level encryption is unavailable.\n\n' +
      'This usually means:\n' +
      '- Windows: DPAPI is not available\n' +
      '- macOS: Keychain is not accessible\n' +
      '- Linux: libsecret is not installed\n\n' +
      'Please enable secure storage and try again.';
    dialog.showErrorBox('Encryption Unavailable', message);
    throw new Error('safeStorage encryption is unavailable');
  }

  try {
    keyManager = new KeyManager(safeStorage, app.getPath('userData'));
  } catch (error) {
    dialog.showErrorBox(
      'KeyManager Initialization Failed',
      'Failed to initialize encryption key manager.\n\n' +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'The application cannot continue.'
    );
    throw error;
  }

  if (!keyManager.hasKey()) {
    const envKey = process.env.ENCRYPTION_KEY_BASE64;
    if (envKey) {
      try {
        keyManager.migrateFromEnv(envKey);
        dialog.showMessageBox({
          type: 'warning',
          title: 'Encryption Key Migrated',
          message: 'Your encryption key has been migrated to secure storage.',
          detail:
            'The key was moved from .env to OS-level encrypted storage.\n' +
            'Remove ENCRYPTION_KEY_BASE64 from .env to avoid leaking the key.',
          buttons: ['OK'],
        });
      } catch (error) {
        dialog.showErrorBox(
          'Key Migration Failed',
          'Failed to migrate encryption key from .env to secure storage.\n\n' +
            `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
            'Ensure ENCRYPTION_KEY_BASE64 is a valid base64 encoded key.'
        );
        throw error;
      }
    } else {
      dialog.showErrorBox(
        'No Encryption Key Found',
        'Justice Companion cannot start because no encryption key was found.\n\n' +
          'Generate a new key with:\n' +
          '  node scripts/generate-encryption-key.js\n\n' +
          'Then place the value in ENCRYPTION_KEY_BASE64 inside your .env file.'
      );
      throw new Error('Encryption key not found');
    }
  }

  return keyManager;
}

function createAutoUpdaterInstance(): AutoUpdater {
  autoUpdaterService = new AutoUpdater(app, autoUpdater, {
    checkOnStartup: true,
    channel: 'stable',
  });
  return autoUpdaterService;
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function setupProcessHandlers(): void {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
}

function handleStartupError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Startup failed', { error: message });

  dialog.showErrorBox(
    'Application Startup Failed',
    'Justice Companion failed to start.\n\n' +
      `Error: ${message}\n\n` +
      'Check the logs for additional details.'
  );

  app.quit();
}

async function bootstrap(): Promise<void> {
  setupProcessHandlers();

  if (env.NODE_ENV !== 'production') {
    logger.info('Running in development mode (manual restart required for main process changes)');
  }

  const application = new MainApplication({
    env,
    app,
    createMainWindow,
    setupIpcHandlers,
    initializeDatabase,
    closeDatabase,
    initializeKeyManager,
    processManager,
    createAutoUpdater: createAutoUpdaterInstance,
    logger,
  });

  await application.start();

  mainWindow = application.getMainWindow();

  processManager.onSecondInstance(() => focusMainWindow());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

bootstrap().catch(handleStartupError);

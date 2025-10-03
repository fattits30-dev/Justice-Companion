import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { errorLogger, setupGlobalErrorHandlers } from '../src/utils/error-logger';
import { databaseManager } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { caseService } from '../src/services/CaseService';
import { caseRepository } from '../src/repositories/CaseRepository';
import { aiService } from '../src/services/AIService';
import { IPC_CHANNELS } from '../src/types/ipc';
import type {
  CaseCreateRequest,
  CaseGetByIdRequest,
  CaseGetAllRequest,
  CaseUpdateRequest,
  CaseDeleteRequest,
  CaseCloseRequest,
  CaseGetStatisticsRequest,
  AICheckStatusRequest,
  AIChatRequest,
  AIStreamStartRequest,
} from '../src/types/ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      backgroundColor: '#F9FAFB',
      show: false,
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Log renderer process errors
    mainWindow.webContents.on('crashed', (event, killed) => {
      errorLogger.logError('Renderer process crashed', { killed });
    });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'createWindow' });
    throw error;
  }
}

/**
 * Setup IPC handlers for communication with renderer process
 */
function setupIpcHandlers() {
  // Case: Create
  ipcMain.handle(
    IPC_CHANNELS.CASE_CREATE,
    async (_, request: CaseCreateRequest) => {
      try {
        const createdCase = caseService.createCase(request.input);
        return { success: true, data: createdCase };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:create' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create case',
        };
      }
    }
  );

  // Case: Get by ID
  ipcMain.handle(
    IPC_CHANNELS.CASE_GET_BY_ID,
    async (_, request: CaseGetByIdRequest) => {
      try {
        const foundCase = caseRepository.findById(request.id);
        return { success: true, data: foundCase };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:getById' });
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to get case by ID',
        };
      }
    }
  );

  // Case: Get all
  ipcMain.handle(
    IPC_CHANNELS.CASE_GET_ALL,
    async (_, request: CaseGetAllRequest) => {
      try {
        const allCases = caseRepository.findAll();
        return { success: true, data: allCases };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:getAll' });
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to get all cases',
        };
      }
    }
  );

  // Case: Update
  ipcMain.handle(
    IPC_CHANNELS.CASE_UPDATE,
    async (_, request: CaseUpdateRequest) => {
      try {
        const updatedCase = caseService.updateCase(request.id, request.input);
        return { success: true, data: updatedCase };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:update' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update case',
        };
      }
    }
  );

  // Case: Delete
  ipcMain.handle(
    IPC_CHANNELS.CASE_DELETE,
    async (_, request: CaseDeleteRequest) => {
      try {
        caseService.deleteCase(request.id);
        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:delete' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete case',
        };
      }
    }
  );

  // Case: Close
  ipcMain.handle(
    IPC_CHANNELS.CASE_CLOSE,
    async (_, request: CaseCloseRequest) => {
      try {
        const closedCase = caseService.closeCase(request.id);
        return { success: true, data: closedCase };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:close' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to close case',
        };
      }
    }
  );

  // Case: Get statistics
  ipcMain.handle(
    IPC_CHANNELS.CASE_GET_STATISTICS,
    async (_, request: CaseGetStatisticsRequest) => {
      try {
        const stats = caseRepository.getStatistics();
        return { success: true, data: stats };
      } catch (error) {
        errorLogger.logError(error as Error, {
          context: 'ipc:case:getStatistics',
        });
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get case statistics',
        };
      }
    }
  );

  // AI: Check Status
  ipcMain.handle(
    IPC_CHANNELS.AI_CHECK_STATUS,
    async (_, request: AICheckStatusRequest) => {
      try {
        const status = await aiService.checkConnection();
        return {
          success: true,
          connected: status.connected,
          endpoint: status.endpoint,
          model: status.model,
          error: status.error,
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:ai:checkStatus' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to check AI status',
        };
      }
    }
  );

  // AI: Chat (non-streaming)
  ipcMain.handle(
    IPC_CHANNELS.AI_CHAT,
    async (_, request: AIChatRequest) => {
      try {
        const response = await aiService.chat({
          messages: request.messages as any, // Type conversion
          context: request.context,
          caseId: request.caseId,
        });

        if (!response.success) {
          return response; // Already formatted error
        }

        return response;
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:ai:chat' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process chat',
        };
      }
    }
  );

  // AI: Stream Start
  ipcMain.handle(
    IPC_CHANNELS.AI_STREAM_START,
    async (event, request: AIStreamStartRequest) => {
      try {
        const streamId = Date.now().toString(); // Unique stream ID

        // Start streaming in background
        aiService
          .streamChat(
            {
              messages: request.messages as any,
              context: request.context,
              caseId: request.caseId,
            },
            // onToken callback - send to renderer
            (token: string) => {
              event.sender.send(IPC_CHANNELS.AI_STREAM_TOKEN, token);
            },
            // onComplete callback
            () => {
              event.sender.send(IPC_CHANNELS.AI_STREAM_COMPLETE);
            },
            // onError callback
            (error: string) => {
              event.sender.send(IPC_CHANNELS.AI_STREAM_ERROR, error);
            }
          )
          .catch((error) => {
            errorLogger.logError(error as Error, {
              context: 'ipc:ai:stream:background',
            });
            event.sender.send(
              IPC_CHANNELS.AI_STREAM_ERROR,
              error instanceof Error ? error.message : 'Stream failed'
            );
          });

        return { success: true, streamId };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:ai:stream:start' });
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to start stream',
        };
      }
    }
  );

  errorLogger.logError('IPC handlers registered successfully (cases + AI)', { type: 'info' });
}

app.whenReady().then(() => {
  // Setup global error handlers for uncaught exceptions/rejections
  setupGlobalErrorHandlers();

  // Initialize database and run migrations
  try {
    databaseManager.getDatabase();
    runMigrations();
    errorLogger.logError('Database initialized and migrations complete', {
      type: 'info',
    });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'database-initialization' });
    // Continue anyway - will show error in UI
  }

  // Setup IPC handlers after database is ready
  setupIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Close database connection
  databaseManager.close();
});

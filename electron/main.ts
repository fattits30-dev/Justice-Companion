import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { errorLogger, setupGlobalErrorHandlers } from '../src/utils/error-logger';
import { databaseManager } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { caseService } from '../src/services/CaseService';
import { caseRepository } from '../src/repositories/CaseRepository';
import { aiServiceFactory } from '../src/services/AIServiceFactory';
import { ragService } from '../src/services/RAGService';
import { legalAPIService } from '../src/services/LegalAPIService';
import { chatConversationService } from '../src/services/ChatConversationService';
import { userProfileService } from '../src/services/UserProfileService';
import { modelDownloadService } from '../src/services/ModelDownloadService';
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
  FileSelectRequest,
  FileUploadRequest,
  ConversationCreateRequest,
  ConversationGetRequest,
  ConversationGetAllRequest,
  ConversationGetRecentRequest,
  ConversationLoadWithMessagesRequest,
  ConversationDeleteRequest,
  MessageAddRequest,
  ProfileGetRequest,
  ProfileUpdateRequest,
  ModelGetAvailableRequest,
  ModelGetDownloadedRequest,
  ModelIsDownloadedRequest,
  ModelDownloadStartRequest,
  ModelDeleteRequest,
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
        const status = await aiServiceFactory.checkConnection();
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
        const response = await aiServiceFactory.chat({
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

        // PHASE 5.1: Fetch RAG context from UK Legal APIs
        let ragContext = request.context; // Start with provided context

        console.log('[RAG DEBUG] Starting RAG context fetch');
        console.log('[RAG DEBUG] Request messages:', request.messages);
        console.log('[RAG DEBUG] Request context:', request.context);

        // Extract user's question (last message in conversation)
        if (request.messages && request.messages.length > 0) {
          console.log('[RAG DEBUG] Messages array exists, length:', request.messages.length);
          const lastMessage = request.messages[request.messages.length - 1];
          console.log('[RAG DEBUG] Last message:', lastMessage);

          if (lastMessage.role === 'user' && lastMessage.content) {
            // INTELLIGENT FILTERING: Only fetch RAG if question is about legal topics
            const questionCategory = legalAPIService.classifyQuestion(lastMessage.content);
            const isLegalQuestion = questionCategory !== 'general';

            // Emit status: Analyzing question
            event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '🤔 Thinking...');

            console.log('[RAG DEBUG] Question classification:', questionCategory);
            console.log('[RAG DEBUG] Is legal question:', isLegalQuestion);

            if (isLegalQuestion) {
              console.log('[RAG DEBUG] Legal question detected, fetching RAG context...');
              try {
                // Emit status: Searching legislation
                event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '🔍 Researching...');

                // Fetch legal context from UK Legal APIs
                errorLogger.logError('Fetching RAG context for legal question', {
                  type: 'info',
                  question: lastMessage.content,
                  category: questionCategory,
                });

                const legalContext = await ragService.fetchContextForQuestion(
                  lastMessage.content
                );

                console.log('[RAG DEBUG] Legal context fetched:', legalContext);

                // Merge RAG context with existing context
                ragContext = {
                  ...ragContext,
                  ...legalContext,
                };

                console.log('[RAG DEBUG] RAG context merged successfully');
                errorLogger.logError('RAG context fetched successfully', {
                  type: 'info',
                  legislationCount: legalContext.legislation?.length || 0,
                  caseLawCount: legalContext.caseLaw?.length || 0,
                  knowledgeBaseCount: legalContext.knowledgeBase?.length || 0,
                });
              } catch (ragError) {
                // Log error but continue - don't block streaming on RAG failure
                console.error('[RAG DEBUG] RAG fetch error:', ragError);
                errorLogger.logError(ragError as Error, {
                  context: 'RAG context fetch failed, continuing without legal data',
                });
              }
            } else {
              console.log('[RAG DEBUG] Non-legal question, skipping RAG fetch');
              errorLogger.logError('Skipping RAG for non-legal question', {
                type: 'info',
                question: lastMessage.content,
              });
            }
          } else {
            console.log('[RAG DEBUG] Last message is not a valid user message. Role:', lastMessage?.role, 'Has content:', !!lastMessage?.content);
          }
        } else {
          console.log('[RAG DEBUG] No messages in request or empty array');
        }

        // Emit status: Generating response
        event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '✍️ Writing...');

        // Start streaming in background
        console.log('[DEBUG] About to call aiServiceFactory.streamChat()');
        console.log('[DEBUG] aiServiceFactory:', aiServiceFactory);
        console.log('[DEBUG] typeof aiServiceFactory:', typeof aiServiceFactory);

        let tokensSent = 0;
        let thinkTokensSent = 0;
        aiServiceFactory
          .streamChat(
            {
              messages: request.messages as any,
              context: ragContext, // Pass RAG-enhanced context
              caseId: request.caseId,
            },
            // onToken callback - send display tokens to renderer
            (token: string) => {
              tokensSent++;
              event.sender.send(IPC_CHANNELS.AI_STREAM_TOKEN, token);
            },
            // onComplete callback
            () => {
              errorLogger.logError('Stream complete, tokens sent to renderer', {
                type: 'info',
                tokensSent,
                thinkTokensSent,
              });
              event.sender.send(IPC_CHANNELS.AI_STREAM_COMPLETE);
            },
            // onError callback
            (error: string) => {
              event.sender.send(IPC_CHANNELS.AI_STREAM_ERROR, error);
            },
            // onThinkToken callback - send reasoning tokens to renderer
            (thinkToken: string) => {
              thinkTokensSent++;
              event.sender.send(IPC_CHANNELS.AI_STREAM_THINK_TOKEN, thinkToken);
            },
            // onSources callback - send legal source citations to renderer
            (sources: string[]) => {
              errorLogger.logError('Sending sources to renderer', {
                type: 'info',
                sourcesCount: sources.length,
              });
              event.sender.send(IPC_CHANNELS.AI_STREAM_SOURCES, sources);
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

  // File: Select
  ipcMain.handle(
    IPC_CHANNELS.FILE_SELECT,
    async (_, request: FileSelectRequest = {}) => {
      try {
        if (!mainWindow) {
          return {
            success: false,
            error: 'Main window not available',
          };
        }

        const result = await dialog.showOpenDialog(mainWindow, {
          properties: request.properties || ['openFile'],
          filters: request.filters || [
            { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        return {
          success: true,
          filePaths: result.filePaths,
          canceled: result.canceled,
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:file:select' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to select file',
        };
      }
    }
  );

  // File: Upload (process and extract text)
  ipcMain.handle(
    IPC_CHANNELS.FILE_UPLOAD,
    async (_, request: FileUploadRequest) => {
      try {
        const filePath = request.filePath;
        const stats = await fs.stat(filePath);
        const fileName = path.basename(filePath);
        const extension = path.extname(filePath).toLowerCase();

        // File size validation (50MB max)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (stats.size > MAX_FILE_SIZE) {
          return {
            success: false,
            error: 'File size exceeds 50MB limit',
          };
        }

        // Determine MIME type
        const mimeTypes: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.txt': 'text/plain',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
        };
        const mimeType = mimeTypes[extension] || 'application/octet-stream';

        let extractedText: string | undefined;

        // Extract text based on file type
        if (extension === '.pdf') {
          const pdfParse = (await import('pdf-parse')).default;
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdfParse(dataBuffer);
          extractedText = data.text;
        } else if (extension === '.docx') {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ path: filePath });
          extractedText = result.value;
        } else if (extension === '.txt') {
          extractedText = await fs.readFile(filePath, 'utf-8');
        }

        return {
          success: true,
          fileName,
          fileSize: stats.size,
          mimeType,
          extractedText,
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:file:upload' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload file',
        };
      }
    }
  );

  // Conversation: Create
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_CREATE,
    async (_, request: ConversationCreateRequest) => {
      try {
        const conversation = chatConversationService.createConversation(request.input);
        return { success: true, data: conversation };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:create' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create conversation',
        };
      }
    }
  );

  // Conversation: Get by ID
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_GET,
    async (_, request: ConversationGetRequest) => {
      try {
        const conversation = chatConversationService.getConversation(request.id);
        return { success: true, data: conversation };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:get' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get conversation',
        };
      }
    }
  );

  // Conversation: Get all (optionally filtered by case)
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_GET_ALL,
    async (_, request: ConversationGetAllRequest) => {
      try {
        const conversations = chatConversationService.getAllConversations(request.caseId);
        return { success: true, data: conversations };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:getAll' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get conversations',
        };
      }
    }
  );

  // Conversation: Get recent by case
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_GET_RECENT,
    async (_, request: ConversationGetRecentRequest) => {
      try {
        const conversations = chatConversationService.getRecentConversationsByCase(
          request.caseId,
          request.limit
        );
        return { success: true, data: conversations };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:getRecent' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get recent conversations',
        };
      }
    }
  );

  // Conversation: Load with messages
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_LOAD_WITH_MESSAGES,
    async (_, request: ConversationLoadWithMessagesRequest) => {
      try {
        const conversation = chatConversationService.loadConversation(request.conversationId);
        return { success: true, data: conversation };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:loadWithMessages' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load conversation',
        };
      }
    }
  );

  // Conversation: Delete
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_DELETE,
    async (_, request: ConversationDeleteRequest) => {
      try {
        chatConversationService.deleteConversation(request.id);
        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:conversation:delete' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete conversation',
        };
      }
    }
  );

  // Message: Add to conversation
  ipcMain.handle(
    IPC_CHANNELS.MESSAGE_ADD,
    async (_, request: MessageAddRequest) => {
      try {
        const message = chatConversationService.addMessage(request.input);
        // Return updated conversation
        const conversation = chatConversationService.getConversation(request.input.conversationId)!;
        return { success: true, data: conversation };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:message:add' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add message',
        };
      }
    }
  );

  // Profile: Get
  ipcMain.handle(
    IPC_CHANNELS.PROFILE_GET,
    async (_, request: ProfileGetRequest) => {
      try {
        const profile = userProfileService.getProfile();
        return { success: true, data: profile };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:profile:get' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile',
        };
      }
    }
  );

  // Profile: Update
  ipcMain.handle(
    IPC_CHANNELS.PROFILE_UPDATE,
    async (_, request: ProfileUpdateRequest) => {
      try {
        const profile = userProfileService.updateProfile(request.input);
        return { success: true, data: profile };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:profile:update' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update profile',
        };
      }
    }
  );

  // Model: Get Available Models
  ipcMain.handle(
    IPC_CHANNELS.MODEL_GET_AVAILABLE,
    async (_, request: ModelGetAvailableRequest) => {
      try {
        const models = modelDownloadService.availableModels;
        return { success: true, models };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:model:getAvailable' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get available models',
        };
      }
    }
  );

  // Model: Get Downloaded Models
  ipcMain.handle(
    IPC_CHANNELS.MODEL_GET_DOWNLOADED,
    async (_, request: ModelGetDownloadedRequest) => {
      try {
        const models = modelDownloadService.getDownloadedModels();
        return { success: true, models };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:model:getDownloaded' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get downloaded models',
        };
      }
    }
  );

  // Model: Check if Downloaded
  ipcMain.handle(
    IPC_CHANNELS.MODEL_IS_DOWNLOADED,
    async (_, request: ModelIsDownloadedRequest) => {
      try {
        const downloaded = modelDownloadService.isModelDownloaded(request.modelId);
        const path = modelDownloadService.getModelPath(request.modelId);
        return { success: true, downloaded, path: path || undefined };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:model:isDownloaded' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to check model status',
        };
      }
    }
  );

  // Model: Start Download
  ipcMain.handle(
    IPC_CHANNELS.MODEL_DOWNLOAD_START,
    async (event, request: ModelDownloadStartRequest) => {
      try {
        // Start download with progress updates
        modelDownloadService.downloadModel(request.modelId, (progress) => {
          // Send progress events to renderer
          event.sender.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, progress);
        });

        return { success: true, modelId: request.modelId };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:model:downloadStart' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start model download',
        };
      }
    }
  );

  // Model: Delete
  ipcMain.handle(
    IPC_CHANNELS.MODEL_DELETE,
    async (_, request: ModelDeleteRequest) => {
      try {
        const deleted = await modelDownloadService.deleteModel(request.modelId);
        return { success: true, deleted };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:model:delete' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete model',
        };
      }
    }
  );

  errorLogger.logError('IPC handlers registered successfully (cases + AI + files + conversations + profile + models)', { type: 'info' });
}

// Prevent multiple instances - request single instance lock
// TEMPORARILY DISABLED DUE TO GHOST LOCK ISSUE - WILL RE-ENABLE AFTER TESTING
/*
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  errorLogger.logError('Another instance is already running, quitting', {
    type: 'info',
  });
  app.quit();
} else {
  // We got the lock, listen for second instance attempts
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    errorLogger.logError('Second instance attempted, focusing main window', {
      type: 'info',
    });

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
*/

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
// } // Temporarily disabled single-instance lock

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Close database connection
  databaseManager.close();
});


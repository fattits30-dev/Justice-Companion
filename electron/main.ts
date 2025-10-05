import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { errorLogger, setupGlobalErrorHandlers } from '../src/utils/error-logger';
import { databaseManager } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { DevAPIServer } from './dev-api-server.js';
import { caseService } from '../src/services/CaseService';
import { caseRepository } from '../src/repositories/CaseRepository';
import { evidenceRepository } from '../src/repositories/EvidenceRepository';
import type { CreateEvidenceInput } from '../src/models/Evidence';
import { notesRepository } from '../src/repositories/NotesRepository';
import { legalIssuesRepository } from '../src/repositories/LegalIssuesRepository';
import { timelineRepository } from '../src/repositories/TimelineRepository';
import { userFactsRepository } from '../src/repositories/UserFactsRepository';
import { caseFactsRepository } from '../src/repositories/CaseFactsRepository';
import { notesService } from '../src/services/NotesService';
import { legalIssuesService } from '../src/services/LegalIssuesService';
import { timelineService } from '../src/services/TimelineService';
import { userFactsService } from '../src/services/UserFactsService';
import { caseFactsService } from '../src/services/CaseFactsService';
import { EncryptionService } from '../src/services/EncryptionService';
import { AuditLogger } from '../src/services/AuditLogger';
import { aiServiceFactory } from '../src/services/AIServiceFactory';
import { ragService } from '../src/services/RAGService';
import { legalAPIService } from '../src/services/LegalAPIService';
import { chatConversationService } from '../src/services/ChatConversationService';
import { userProfileService } from '../src/services/UserProfileService';
import { modelDownloadService } from '../src/services/ModelDownloadService';
import { IPC_CHANNELS } from '../src/types/ipc';

// CRITICAL: Load environment variables FIRST (before any other initialization)
// This loads .env file containing encryption keys and other config
dotenv.config();
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
 * Setup IPC handlers for communication with renderer process.
 *
 * Registers all IPC handlers for type-safe communication between the
 * Electron main process and the renderer process (React frontend).
 *
 * **Security Features**:
 * - All sensitive data (case descriptions, evidence content) is encrypted with AES-256-GCM
 * - All CRUD operations are logged to the immutable audit trail
 * - Input validation on all parameters
 * - Parameterized SQL queries to prevent injection
 *
 * **Handler Categories**:
 * - Case Management: create, read, update, delete, close, statistics
 * - AI Operations: status check, chat, streaming
 * - File Operations: select, upload/extract
 * - Conversation Management: create, read, update, delete, messages
 * - User Profile: get, update
 * - Model Management: list, download, delete
 *
 * @see {@link C:\Users\sava6\Desktop\Justice Companion\docs\api\IPC_API_REFERENCE.md} for complete API documentation
 * @see {@link C:\Users\sava6\Desktop\Justice Companion\src\types\ipc.ts} for type definitions
 */
function setupIpcHandlers() {
  /**
   * Create a new legal case.
   *
   * @param {CaseCreateRequest} request - Case creation request
   * @param {CreateCaseInput} request.input - Case data
   * @param {string} request.input.title - Case title (required)
   * @param {string} [request.input.description] - Case description (optional, encrypted)
   * @param {CaseType} request.input.caseType - Case type (required)
   *
   * @returns {Promise<CaseCreateResponse | IPCErrorResponse>} Created case or error
   *
   * @throws {Error} If validation fails or database error occurs
   *
   * @security
   * - Description field is encrypted with AES-256-GCM before storage
   * - Case creation is logged to audit trail (event: case.create)
   * - Failed attempts are also audited with error details
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.createCase({
   *   title: "Unfair Dismissal Claim",
   *   caseType: "employment",
   *   description: "Client dismissed without proper procedure"
   * });
   * ```
   */
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

  /**
   * Get a case by its ID.
   *
   * @param {CaseGetByIdRequest} request - Request with case ID
   * @param {number} request.id - Case ID to retrieve
   *
   * @returns {Promise<CaseGetByIdResponse | IPCErrorResponse>} Case data or error
   *
   * @security
   * - Description field is automatically decrypted
   * - PII access is logged to audit trail if description was encrypted (event: case.pii_access)
   * - Audit log includes metadata only (no sensitive data)
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.getCaseById(123);
   * if (result.success && result.data) {
   *   console.log(result.data.title, result.data.description);
   * }
   * ```
   */
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

  /**
   * Get all cases.
   *
   * @param {CaseGetAllRequest} request - Empty request object (future: pagination/filtering)
   *
   * @returns {Promise<CaseGetAllResponse | IPCErrorResponse>} Array of cases or error
   *
   * @security
   * - All description fields are automatically decrypted
   * - No audit logging for bulk operations (performance)
   * - PII access only logged on individual getById calls
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.getAllCases();
   * if (result.success) {
   *   console.log(`Found ${result.data.length} cases`);
   * }
   * ```
   */
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

  /**
   * Update an existing case.
   *
   * @param {CaseUpdateRequest} request - Update request
   * @param {number} request.id - Case ID to update
   * @param {UpdateCaseInput} request.input - Fields to update
   * @param {string} [request.input.title] - New title
   * @param {string} [request.input.description] - New description (encrypted)
   * @param {CaseType} [request.input.caseType] - New case type
   * @param {CaseStatus} [request.input.status] - New status
   *
   * @returns {Promise<CaseUpdateResponse | IPCErrorResponse>} Updated case or error
   *
   * @security
   * - Description field is encrypted before UPDATE
   * - Update operation logged to audit trail (event: case.update)
   * - Audit log includes list of fields updated (not values)
   * - Failed updates are also audited
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.updateCase(123, {
   *   status: "closed",
   *   description: "Case resolved via settlement"
   * });
   * ```
   */
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

  /**
   * Delete a case (hard delete with cascading).
   *
   * @param {CaseDeleteRequest} request - Delete request
   * @param {number} request.id - Case ID to delete
   *
   * @returns {Promise<CaseDeleteResponse | IPCErrorResponse>} Success or error
   *
   * @security
   * - Hard delete (not soft delete)
   * - Cascades to evidence, conversations, messages via FK constraints
   * - Deletion logged to audit trail (event: case.delete)
   * - Failed deletions are also audited
   *
   * @warning This operation is irreversible!
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.deleteCase(123);
   * if (result.success) {
   *   console.log("Case deleted successfully");
   * }
   * ```
   */
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

  /**
   * Start a streaming AI chat session with RAG integration.
   *
   * Initiates a streaming chat session with the AI service. Responses are sent
   * as events to the renderer process in real-time. Automatically fetches legal
   * context from UK Legal APIs (RAG) if the question is legal-related.
   *
   * @param {AIStreamStartRequest} request - Stream request
   * @param {Array<{role: string, content: string}>} request.messages - Conversation history
   * @param {any} [request.context] - Optional legal context (merged with RAG data)
   * @param {number} [request.caseId] - Optional case ID for context
   *
   * @returns {Promise<AIStreamStartResponse | IPCErrorResponse>} Stream ID or error
   *
   * @fires AI_STREAM_TOKEN - Display token received (string)
   * @fires AI_STREAM_THINK_TOKEN - Reasoning token from <think> blocks (string)
   * @fires AI_STREAM_SOURCES - Legal source citations (string[])
   * @fires AI_STATUS_UPDATE - Progress updates (string: "Thinking...", "Researching...", "Writing...")
   * @fires AI_STREAM_COMPLETE - Stream finished successfully
   * @fires AI_STREAM_ERROR - Stream error (string)
   *
   * @security
   * - RAG data is fetched only for legal questions (intelligent filtering)
   * - Classification determines if UK legal APIs are called
   * - Streaming continues even if RAG fetch fails
   *
   * @example
   * ```typescript
   * // Set up listeners
   * const unsubToken = window.justiceAPI.onAIStreamToken(token => {
   *   appendToChat(token);
   * });
   * const unsubComplete = window.justiceAPI.onAIStreamComplete(() => {
   *   unsubToken();
   *   unsubComplete();
   * });
   *
   * // Start stream
   * const result = await window.justiceAPI.aiStreamStart({
   *   messages: [{ role: "user", content: "Explain unfair dismissal law" }]
   * });
   * ```
   */
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
        // Use streamChatWithFunctions if caseId is provided (enables fact-gathering)
        const useFunctionCalling = !!request.caseId;
        console.log('[DEBUG] Using function calling:', useFunctionCalling);
        console.log('[DEBUG] Case ID:', request.caseId);

        let tokensSent = 0;
        let thinkTokensSent = 0;
        let functionCallCount = 0;

        if (useFunctionCalling) {
          // Use streamChatWithFunctions for case-specific conversations
          aiServiceFactory
            .streamChatWithFunctions(
              {
                messages: request.messages as any,
                context: ragContext,
                caseId: request.caseId,
              },
              request.caseId,
              // onToken callback
              (token: string) => {
                tokensSent++;
                event.sender.send(IPC_CHANNELS.AI_STREAM_TOKEN, token);
              },
              // onComplete callback
              () => {
                errorLogger.logError('Stream with functions complete', {
                  type: 'info',
                  tokensSent,
                  functionCallCount,
                });
                event.sender.send(IPC_CHANNELS.AI_STREAM_COMPLETE);
              },
              // onError callback
              (error: string) => {
                event.sender.send(IPC_CHANNELS.AI_STREAM_ERROR, error);
              }
            )
            .catch((error) => {
              errorLogger.logError(error as Error, {
                context: 'ipc:ai:stream:functions:background',
              });
              event.sender.send(
                IPC_CHANNELS.AI_STREAM_ERROR,
                error instanceof Error ? error.message : 'Stream with functions failed'
              );
            });
        } else {
          // Use regular streamChat for general conversations
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
        }

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

  /**
   * Upload a file and extract text content.
   *
   * Processes an uploaded file and extracts text based on file type:
   * - PDF: Extracts text via pdf-parse
   * - DOCX: Extracts text via mammoth
   * - TXT: Reads as UTF-8 text
   * - Images (JPG, PNG): No text extraction
   *
   * @param {FileUploadRequest} request - Upload request
   * @param {string} request.filePath - Absolute path to file
   *
   * @returns {Promise<FileUploadResponse | IPCErrorResponse>} File metadata and text or error
   *
   * @throws {Error} If file size exceeds 50MB or file processing fails
   *
   * @security
   * - Max file size: 50MB (enforced)
   * - File type validation via MIME type
   * - No sensitive data logged
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.uploadFile("/path/to/document.pdf");
   * if (result.success) {
   *   console.log("File:", result.fileName);
   *   console.log("Size:", result.fileSize);
   *   console.log("Text:", result.extractedText);
   * }
   * ```
   */
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

  // Facts: Store a case fact (supports both old & new formats)
  ipcMain.handle(
    'facts:store',
    async (_, params: any) => {
      try {
        let factContent: string;
        let factCategory: string;
        let importance: 'low' | 'medium' | 'high' | 'critical';

        // NEW format (from AIFunctionDefinitions): factContent + factCategory + importance
        if (params.factContent) {
          factContent = params.factContent;
          factCategory = params.factCategory || 'other';
          importance = params.importance || 'medium';
        }
        // OLD format (backwards compat): factType + factKey + factValue + confidence
        else {
          factContent = `${params.factKey}: ${params.factValue}`;
          factCategory = params.factType || 'other';

          // Map confidence to importance
          if (params.confidence !== undefined) {
            if (params.confidence >= 0.9) importance = 'critical';
            else if (params.confidence >= 0.7) importance = 'high';
            else if (params.confidence >= 0.5) importance = 'medium';
            else importance = 'low';
          } else {
            importance = 'medium';
          }
        }

        const fact = caseFactsRepository.create({
          caseId: params.caseId,
          factContent,
          factCategory: factCategory as any,
          importance,
        });

        return { success: true, data: fact };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:facts:store' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to store fact',
        };
      }
    }
  );

  // Facts: Get facts for a case
  ipcMain.handle(
    'facts:get',
    async (_, caseId: number, factType?: string) => {
      try {
        let facts;
        if (factType) {
          // Get facts filtered by category (factType maps to factCategory)
          facts = caseFactsRepository.findByCategory(caseId, factType);
        } else {
          // Get all facts for case
          facts = caseFactsRepository.findByCaseId(caseId);
        }
        return { success: true, data: facts };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:facts:get' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get facts',
        };
      }
    }
  );

  // Facts: Get fact count for a case
  ipcMain.handle(
    'facts:count',
    async (_, caseId: number) => {
      try {
        const facts = caseFactsRepository.findByCaseId(caseId);
        const count = facts.length;
        return { success: true, data: count };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:facts:count' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get fact count',
        };
      }
    }
  );

  errorLogger.logError('IPC handlers registered successfully (cases + AI + files + conversations + profile + models + facts)', { type: 'info' });
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

// Add dev API server for MCP integration (development only)
let devAPIServer: DevAPIServer | null = null;

if (process.env.NODE_ENV !== 'production') {
  devAPIServer = new DevAPIServer(5555);

  // Register all IPC handlers with dev API server
  // Cases handlers
  const casesCreateHandler = async (event: any, args: any) => {
    try {
      const createdCase = caseService.createCase(args);
      return createdCase;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:create' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:create", casesCreateHandler);
  devAPIServer.registerHandler("dev-api:cases:create", casesCreateHandler);

  const casesGetHandler = async (event: any, id: string) => {
    try {
      return caseRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:get' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:get", casesGetHandler);
  devAPIServer.registerHandler("dev-api:cases:get", casesGetHandler);

  const casesListHandler = async (event: any, filters: any) => {
    try {
      return caseRepository.findAll();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:list' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:list", casesListHandler);
  devAPIServer.registerHandler("dev-api:cases:list", casesListHandler);

  const casesUpdateHandler = async (event: any, { id, updates }: any) => {
    try {
      return caseService.updateCase(id, updates);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:update' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:update", casesUpdateHandler);
  devAPIServer.registerHandler("dev-api:cases:update", casesUpdateHandler);

  const casesDeleteHandler = async (event: any, id: string) => {
    try {
      caseService.deleteCase(id);
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:delete' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:delete", casesDeleteHandler);
  devAPIServer.registerHandler("dev-api:cases:delete", casesDeleteHandler);

  const casesCreateTestFixtureHandler = async (event: any, args: any) => {
    try {
      const testCase = caseService.createCase({
        title: args.title || "Test Case",
        caseType: args.caseType || "employment",
        description: args.description || "Test case for MCP integration"
      });
      return {
        caseId: testCase.id,
        documentIds: ["doc-1", "doc-2", "doc-3"],
        conversationIds: ["conv-1", "conv-2"],
      };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:createTestFixture' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:cases:createTestFixture", casesCreateTestFixtureHandler);
  devAPIServer.registerHandler("dev-api:cases:createTestFixture", casesCreateTestFixtureHandler);

  // Evidence handlers
  const evidenceCreateHandler = async (event: any, input: CreateEvidenceInput) => {
    try {
      const createdEvidence = evidenceRepository.create(input);
      return createdEvidence;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:evidence:create' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:evidence:create", evidenceCreateHandler);
  devAPIServer.registerHandler("dev-api:evidence:create", evidenceCreateHandler);

  // Database handlers
  const databaseQueryHandler = async (event: any, sql: string) => {
    // Security: Only allow SELECT queries
    if (!sql.trim().toUpperCase().startsWith("SELECT")) {
      throw new Error("Only SELECT queries allowed via dev API");
    }
    try {
      const db = databaseManager.getDatabase();
      return db.prepare(sql).all();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:query' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:database:query", databaseQueryHandler);
  devAPIServer.registerHandler("dev-api:database:query", databaseQueryHandler);

  const databaseMigrateHandler = async (event: any, targetVersion?: number) => {
    try {
      runMigrations();
      return { success: true, version: targetVersion || "latest" };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:migrate' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:database:migrate", databaseMigrateHandler);
  devAPIServer.registerHandler("dev-api:database:migrate", databaseMigrateHandler);

  const databaseBackupHandler = async (event: any, path: string) => {
    try {
      const db = databaseManager.getDatabase();
      const backupDb = await import('better-sqlite3').then(m => m.default(path));
      await db.backup(backupDb);
      backupDb.close();
      return { success: true, path };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:backup' });
      throw error;
    }
  };
  ipcMain.handle("dev-api:database:backup", databaseBackupHandler);
  devAPIServer.registerHandler("dev-api:database:backup", databaseBackupHandler);

  app.on('ready', () => {
    devAPIServer!.start();
  });

  app.on('before-quit', () => {
    devAPIServer!.stop();
  });
}

// Enable remote debugging for Playwright automation (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
  errorLogger.logError('Remote debugging enabled on port 9222', { type: 'info' });
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

    // CRITICAL SECURITY: Initialize encryption service for PII/sensitive data
    try {
      const encryptionKeyBase64 = process.env.ENCRYPTION_KEY_BASE64;

      if (!encryptionKeyBase64) {
        errorLogger.logError('ENCRYPTION_KEY_BASE64 not found in environment variables', {
          type: 'error',
          context: 'encryption-initialization',
        });
        errorLogger.logError('⚠️  WARNING: Encryption service not initialized - sensitive data will not be encrypted!', {
          type: 'warn',
        });
      } else {
        // Initialize encryption service with key from .env
        const encryptionService = new EncryptionService(encryptionKeyBase64);

        // Inject encryption service into repositories that handle sensitive data
        caseRepository.setEncryptionService(encryptionService);
        evidenceRepository.setEncryptionService(encryptionService);
        notesRepository.setEncryptionService(encryptionService);
        legalIssuesRepository.setEncryptionService(encryptionService);
        timelineRepository.setEncryptionService(encryptionService);
        userFactsRepository.setEncryptionService(encryptionService);
        caseFactsRepository.setEncryptionService(encryptionService);

        errorLogger.logError('✅ Encryption service initialized successfully', {
          type: 'info',
        });
        errorLogger.logError('🔐 11 sensitive fields will be encrypted at rest (cases, evidence, notes, legal issues, timeline, user facts, case facts)', {
          type: 'info',
        });
      }
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'encryption-initialization' });
      errorLogger.logError('⚠️  WARNING: Encryption initialization failed - sensitive data will not be encrypted!', {
        type: 'error',
      });
    }

    // CRITICAL SECURITY: Initialize audit logger for immutable audit trail
    try {
      const db = databaseManager.getDatabase();
      const auditLogger = new AuditLogger(db);

      // Inject audit logger into repositories for automatic audit logging
      caseRepository.setAuditLogger(auditLogger);
      evidenceRepository.setAuditLogger(auditLogger);
      notesRepository.setAuditLogger(auditLogger);
      legalIssuesRepository.setAuditLogger(auditLogger);
      timelineRepository.setAuditLogger(auditLogger);
      userFactsRepository.setAuditLogger(auditLogger);
      caseFactsRepository.setAuditLogger(auditLogger);

      errorLogger.logError('✅ Audit logger initialized successfully', {
        type: 'info',
      });
      errorLogger.logError('📝 All operations (cases, evidence, notes, legal issues, timeline, facts) logged to immutable audit trail', {
        type: 'info',
      });
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'audit-logger-initialization' });
      errorLogger.logError('⚠️  WARNING: Audit logger initialization failed - operations will not be audited!', {
        type: 'error',
      });
    }

    // Inject CaseFactRepository into AIServiceFactory for fact loading
    try {
      aiServiceFactory.setCaseFactsRepository(caseFactsRepository);
      errorLogger.logError('✅ CaseFactRepository injected into AI Service Factory', {
        type: 'info',
      });
      errorLogger.logError('🧠 AI can now load and reference stored case facts', {
        type: 'info',
      });
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ai-service-factory-injection' });
      errorLogger.logError('⚠️  WARNING: Failed to inject repository - AI won\'t have access to stored facts!', {
        type: 'warn',
      });
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


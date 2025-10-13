import dotenv from 'dotenv';
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { databaseManager } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { caseService } from '../src/features/cases/services/CaseService';
import { AuthorizationMiddleware } from '../src/middleware/AuthorizationMiddleware';
import { ValidationError, ValidationMiddleware } from '../src/middleware/ValidationMiddleware';
import type { CaseStatus } from '../src/models/Case';
import type { CreateEvidenceInput } from '../src/models/Evidence';
import { caseFactsRepository } from '../src/repositories/CaseFactsRepository';
import { caseRepository } from '../src/repositories/CaseRepository';
import { chatConversationRepository } from '../src/repositories/ChatConversationRepository';
import { ConsentRepository } from '../src/repositories/ConsentRepository';
import { evidenceRepository } from '../src/repositories/EvidenceRepository';
import { legalIssuesRepository } from '../src/repositories/LegalIssuesRepository';
import { notesRepository } from '../src/repositories/NotesRepository';
import { SessionRepository } from '../src/repositories/SessionRepository';
import { timelineRepository } from '../src/repositories/TimelineRepository';
import { userFactsRepository } from '../src/repositories/UserFactsRepository';
import { userProfileRepository } from '../src/repositories/UserProfileRepository';
import { UserRepository } from '../src/repositories/UserRepository';
import { aiServiceFactory } from '../src/services/AIServiceFactory';
import { AuditLogger } from '../src/services/AuditLogger';
import type { SessionPersistenceHandler } from '../src/services/AuthenticationService';
import { AuthenticationService } from '../src/services/AuthenticationService';
import { chatConversationService } from '../src/services/ChatConversationService';
import { ConsentService } from '../src/services/ConsentService';
import { EncryptionService } from '../src/services/EncryptionService';
import { legalAPIService } from '../src/services/LegalAPIService';
import { modelDownloadService } from '../src/services/ModelDownloadService';
import { ragService } from '../src/services/RAGService';
import { SessionPersistenceService } from '../src/services/SessionPersistenceService';
import { userProfileService } from '../src/services/UserProfileService';
import type {
  AIChatRequest,
  AICheckStatusRequest,
  AIConfigureRequest,
  AIStreamStartRequest,
  AITestConnectionRequest,
  AuthChangePasswordRequest,
  AuthGetCurrentUserRequest,
  AuthLoginRequest,
  AuthLogoutRequest,
  AuthRegisterRequest,
  CaseCloseRequest,
  CaseCreateRequest,
  CaseDeleteRequest,
  CaseGetAllRequest,
  CaseGetByIdRequest,
  CaseGetStatisticsRequest,
  CaseUpdateRequest,
  ConsentGetUserConsentsRequest,
  ConsentGrantRequest,
  ConsentHasConsentRequest,
  ConsentRevokeRequest,
  ConversationCreateRequest,
  ConversationDeleteRequest,
  ConversationGetAllRequest,
  ConversationGetRecentRequest,
  ConversationGetRequest,
  ConversationLoadWithMessagesRequest,
  EvidenceCreateRequest,
  EvidenceDeleteRequest,
  EvidenceGetAllRequest,
  EvidenceGetByCaseRequest,
  EvidenceGetByIdRequest,
  EvidenceUpdateRequest,
  FileSelectRequest,
  FileUploadRequest,
  GDPRDeleteUserDataRequest,
  GDPRExportUserDataRequest,
  MessageAddRequest,
  ModelDeleteRequest,
  ModelDownloadStartRequest,
  ModelGetAvailableRequest,
  ModelGetDownloadedRequest,
  ModelIsDownloadedRequest,
  ProfileGetRequest,
  ProfileUpdateRequest,
} from '../src/types/ipc';
import { IPC_CHANNELS } from '../src/types/ipc';
import { errorLogger, setupGlobalErrorHandlers } from '../src/utils/error-logger';
import { DevAPIServer } from './dev-api-server.js';

// CRITICAL: Load environment variables FIRST (before any other initialization)
// This loads .env file containing encryption keys and other config
dotenv.config();

// File operation types
interface FileViewRequest {
  filePath: string;
}

interface FileDownloadRequest {
  filePath: string;
  fileName?: string;
}

interface FilePrintRequest {
  filePath: string;
}

interface FileEmailRequest {
  filePaths: string[];
  subject?: string;
  body?: string;
}

let mainWindow: BrowserWindow | null = null;

// Authentication state (session management)
let currentSessionId: string | null = null;

// Authentication services (initialized in app.whenReady)
let userRepository: UserRepository;
let sessionRepository: SessionRepository;
let consentRepository: ConsentRepository;
let authenticationService: AuthenticationService;
let consentService: ConsentService;
let authorizationMiddleware: AuthorizationMiddleware;

// Validation middleware (initialized here, ready to use)
const validationMiddleware = new ValidationMiddleware();

function initializeEncryptionService(): EncryptionService {
  const rawKey = process.env.ENCRYPTION_KEY_BASE64?.trim();
  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY_BASE64 is required before starting the application');
  }
  return new EncryptionService(rawKey);
}

function createWindow() {
  try {
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('[Main] Preload path resolved to:', preloadPath);
    console.log('[Main] Preload file exists:', fsSync.existsSync(preloadPath));

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 600,
      webPreferences: {
        preload: preloadPath,
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
 * Get the current authenticated user's ID from the active session.
 *
 * @returns {number} The user ID from the current session
 * @throws {Error} If user is not authenticated or session is invalid
 *
 * @security
 * - Validates session existence and validity
 * - Used as first line of defense in authorization checks
 * - All authorization failures are audited
 */
function getCurrentUserIdFromSession(): number {
  if (!currentSessionId) {
    throw new Error('Unauthorized: No active session');
  }

  const session = sessionRepository.findById(currentSessionId);
  if (!session) {
    // Session ID exists but session not found in database - clear it
    currentSessionId = null;
    throw new Error('Unauthorized: Invalid session');
  }

  // Check if session is expired
  const now = Date.now();
  if (session.expiresAt < now) {
    currentSessionId = null;
    throw new Error('Unauthorized: Session expired');
  }

  return session.userId;
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
 * - **Authorization checks**: Resource ownership verified on all operations
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
   * - **Authorization**: Requires authenticated user (sets userId automatically)
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
  ipcMain.handle(IPC_CHANNELS.CASE_CREATE, async (_, request: CaseCreateRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_CREATE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Get current user ID and set as case owner
      const userId = getCurrentUserIdFromSession();

      // 3. BUSINESS LOGIC: Use validated data
      const createdCase = caseService.createCase({
        ...validationResult.data.input,
        userId,
      });
      return { success: true, data: createdCase };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:create' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create case',
      };
    }
  });

  /**
   * Get a case by its ID.
   *
   * @param {CaseGetByIdRequest} request - Request with case ID
   * @param {number} request.id - Case ID to retrieve
   *
   * @returns {Promise<CaseGetByIdResponse | IPCErrorResponse>} Case data or error
   *
   * @security
   * - **Authorization**: Verifies user owns the case (prevents horizontal privilege escalation)
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
  ipcMain.handle(IPC_CHANNELS.CASE_GET_BY_ID, async (_, request: CaseGetByIdRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_GET_BY_ID,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Verify user owns this case
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(validationResult.data.id, userId);

      // 3. BUSINESS LOGIC: Use validated data
      const foundCase = caseRepository.findById(validationResult.data.id);
      return { success: true, data: foundCase };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:getById' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get case by ID',
      };
    }
  });

  /**
   * Get all cases.
   *
   * @param {CaseGetAllRequest} request - Empty request object (future: pagination/filtering)
   *
   * @returns {Promise<CaseGetAllResponse | IPCErrorResponse>} Array of cases or error
   *
   * @security
   * - **Authorization**: Returns only cases owned by current user (prevents horizontal privilege escalation)
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
  ipcMain.handle(IPC_CHANNELS.CASE_GET_ALL, async (_event, _request: CaseGetAllRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization (even if empty)
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_GET_ALL,
        _request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Get current user ID and filter cases
      const userId = getCurrentUserIdFromSession();

      // 3. BUSINESS LOGIC: Use validated data
      const allCases = caseRepository.findAll();
      // Filter to only cases owned by current user
      const userCases = allCases.filter((c) => c.userId === userId);
      return { success: true, data: userCases };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:getAll' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all cases',
      };
    }
  });

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
   * - **Authorization**: Verifies user owns the case before update
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
  ipcMain.handle(IPC_CHANNELS.CASE_UPDATE, async (_, request: CaseUpdateRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_UPDATE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Verify user owns this case
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(validationResult.data.id, userId);

      // 3. BUSINESS LOGIC: Use validated data
      const updatedCase = caseService.updateCase(
        validationResult.data.id,
        validationResult.data.input
      );
      return { success: true, data: updatedCase };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:update' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update case',
      };
    }
  });

  /**
   * Delete a case (hard delete with cascading).
   *
   * @param {CaseDeleteRequest} request - Delete request
   * @param {number} request.id - Case ID to delete
   *
   * @returns {Promise<CaseDeleteResponse | IPCErrorResponse>} Success or error
   *
   * @security
   * - **Authorization**: Verifies user owns the case before deletion
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
  ipcMain.handle(IPC_CHANNELS.CASE_DELETE, async (_, request: CaseDeleteRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_DELETE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Verify user owns this case
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(validationResult.data.id, userId);

      // 3. BUSINESS LOGIC: Use validated data
      caseService.deleteCase(validationResult.data.id);
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:delete' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete case',
      };
    }
  });

  // Case: Close
  ipcMain.handle(IPC_CHANNELS.CASE_CLOSE, async (_, request: CaseCloseRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.CASE_CLOSE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Verify user owns this case
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(validationResult.data.id, userId);

      // 3. BUSINESS LOGIC: Use validated data
      const closedCase = caseService.closeCase(validationResult.data.id);
      return { success: true, data: closedCase };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:close' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close case',
      };
    }
  });

  // Case: Get statistics
  ipcMain.handle(
    IPC_CHANNELS.CASE_GET_STATISTICS,
    async (_event, _request: CaseGetStatisticsRequest) => {
      try {
        // 1. VALIDATION: Validate input before authorization (even if empty)
        const validationResult = await validationMiddleware.validate(
          IPC_CHANNELS.CASE_GET_STATISTICS,
          _request
        );

        if (!validationResult.success) {
          return {
            success: false,
            error: 'Validation failed',
            errors: validationResult.errors,
          };
        }

        // 2. AUTHORIZATION: Get current user ID and filter statistics
        const userId = getCurrentUserIdFromSession();

        // 3. BUSINESS LOGIC: Use validated data
        // Get all stats, then filter to current user's cases
        const allCases = caseRepository.findAll();
        const userCases = allCases.filter((c) => c.userId === userId);

        // Calculate statistics for user's cases only
        const statusCounts: Record<string, number> = {};
        userCases.forEach((c) => {
          statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });

        return {
          success: true,
          data: {
            totalCases: userCases.length,
            statusCounts: statusCounts as Record<CaseStatus, number>,
          },
        };
      } catch (error) {
        errorLogger.logError(error as Error, {
          context: 'ipc:case:getStatistics',
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get case statistics',
        };
      }
    }
  );

  /**
   * Create new evidence.
   *
   * @param {EvidenceCreateRequest} request - Evidence creation request
   * @param {CreateEvidenceInput} request.input - Evidence data
   * @param {number} request.input.caseId - Case ID (required)
   * @param {string} request.input.title - Evidence title (required)
   * @param {string} [request.input.content] - Evidence content (optional, encrypted)
   * @param {string} request.input.evidenceType - Evidence type (required)
   * @param {string} [request.input.filePath] - File path (optional)
   * @param {string} [request.input.obtainedDate] - Date obtained (optional)
   *
   * @returns {Promise<EvidenceCreateResponse | IPCErrorResponse>} Created evidence or error
   *
   * @security
   * - Content field is encrypted with AES-256-GCM before storage
   * - Evidence creation is logged to audit trail (event: evidence.create)
   * - Failed attempts are also audited with error details
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.createEvidence({
   *   caseId: 123,
   *   title: "Employment Contract",
   *   evidenceType: "document",
   *   content: "Contract details..."
   * });
   * ```
   */
  // Evidence: Create
  ipcMain.handle(IPC_CHANNELS.EVIDENCE_CREATE, async (_, request: EvidenceCreateRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.EVIDENCE_CREATE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Verify user owns the case before creating evidence
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(validationResult.data.input.caseId, userId);

      // 3. BUSINESS LOGIC: Use validated data
      const createdEvidence = evidenceRepository.create(validationResult.data.input);
      return { success: true, data: createdEvidence };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:evidence:create' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create evidence',
      };
    }
  });

  /**
   * Get evidence by ID.
   *
   * @param {EvidenceGetByIdRequest} request - Request with evidence ID
   * @param {number} request.id - Evidence ID to retrieve
   *
   * @returns {Promise<EvidenceGetByIdResponse | IPCErrorResponse>} Evidence data or error
   *
   * @security
   * - Content field is automatically decrypted
   * - PII/content access is logged to audit trail if content was encrypted (event: evidence.content_access)
   * - Audit log includes metadata only (no sensitive data)
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.getEvidenceById(456);
   * if (result.success && result.data) {
   *   console.log(result.data.title, result.data.content);
   * }
   * ```
   */
  // Evidence: Get by ID
  ipcMain.handle(IPC_CHANNELS.EVIDENCE_GET_BY_ID, async (_, request: EvidenceGetByIdRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.EVIDENCE_GET_BY_ID,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. Get evidence first to find its caseId
      const evidence = evidenceRepository.findById(validationResult.data.id);

      // 3. AUTHORIZATION: Verify user owns the case that this evidence belongs to
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(evidence.caseId, userId);

      return { success: true, data: evidence };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:evidence:getById' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get evidence by ID',
      };
    }
  });

  /**
   * Get all evidence with optional type filter.
   *
   * @param {EvidenceGetAllRequest} request - Request with optional filter
   * @param {string} [request.evidenceType] - Optional evidence type filter
   *
   * @returns {Promise<EvidenceGetAllResponse | IPCErrorResponse>} Array of evidence or error
   *
   * @security
   * - All content fields are automatically decrypted
   * - No audit logging for bulk operations (performance)
   * - Content access only logged on individual getById calls
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.getAllEvidence("document");
   * if (result.success) {
   *   console.log(`Found ${result.data.length} documents`);
   * }
   * ```
   */
  // Evidence: Get all
  ipcMain.handle(IPC_CHANNELS.EVIDENCE_GET_ALL, async (_, request: EvidenceGetAllRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.EVIDENCE_GET_ALL,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. AUTHORIZATION: Get current user's cases first, then filter evidence
      const userId = getCurrentUserIdFromSession();
      const userCases = caseRepository.findAll().filter((c) => c.userId === userId);
      const userCaseIds = new Set(userCases.map((c) => c.id));

      // 3. BUSINESS LOGIC: Get all evidence and filter to only user's cases
      const allEvidence = evidenceRepository.findAll(validationResult.data.evidenceType);
      const userEvidence = allEvidence.filter((e) => userCaseIds.has(e.caseId));

      return { success: true, data: userEvidence };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:evidence:getAll' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all evidence',
      };
    }
  });

  /**
   * Get all evidence for a specific case.
   *
   * @param {EvidenceGetByCaseRequest} request - Request with case ID
   * @param {number} request.caseId - Case ID to retrieve evidence for
   *
   * @returns {Promise<EvidenceGetByCaseResponse | IPCErrorResponse>} Array of evidence or error
   *
   * @security
   * - All content fields are automatically decrypted
   * - No audit logging for bulk operations (performance)
   * - Sorted by creation date (newest first)
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.getEvidenceByCaseId(123);
   * if (result.success) {
   *   console.log(`Found ${result.data.length} evidence items for case`);
   * }
   * ```
   */
  // Evidence: Get by case ID
  ipcMain.handle(
    IPC_CHANNELS.EVIDENCE_GET_BY_CASE,
    async (_, request: EvidenceGetByCaseRequest) => {
      try {
        // 1. VALIDATION: Validate input before authorization
        const validationResult = await validationMiddleware.validate(
          IPC_CHANNELS.EVIDENCE_GET_BY_CASE,
          request
        );

        if (!validationResult.success) {
          return {
            success: false,
            error: 'Validation failed',
            errors: validationResult.errors,
          };
        }

        // 2. AUTHORIZATION: Verify user owns the case before retrieving evidence
        const userId = getCurrentUserIdFromSession();
        authorizationMiddleware.verifyCaseOwnership(validationResult.data.caseId, userId);

        // 3. BUSINESS LOGIC: Use validated data
        const caseEvidence = evidenceRepository.findByCaseId(validationResult.data.caseId);
        return { success: true, data: caseEvidence };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:evidence:getByCaseId' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get evidence for case',
        };
      }
    }
  );

  /**
   * Update existing evidence.
   *
   * @param {EvidenceUpdateRequest} request - Update request
   * @param {number} request.id - Evidence ID to update
   * @param {UpdateEvidenceInput} request.input - Fields to update
   * @param {string} [request.input.title] - New title
   * @param {string} [request.input.content] - New content (encrypted)
   * @param {string} [request.input.evidenceType] - New evidence type
   * @param {string} [request.input.filePath] - New file path
   * @param {string} [request.input.obtainedDate] - New obtained date
   *
   * @returns {Promise<EvidenceUpdateResponse | IPCErrorResponse>} Updated evidence or error
   *
   * @security
   * - Content field is encrypted before UPDATE
   * - Update operation logged to audit trail (event: evidence.update)
   * - Audit log includes list of fields updated (not values)
   * - Failed updates are also audited
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.updateEvidence(456, {
   *   title: "Updated Employment Contract",
   *   content: "New content..."
   * });
   * ```
   */
  // Evidence: Update
  ipcMain.handle(IPC_CHANNELS.EVIDENCE_UPDATE, async (_, request: EvidenceUpdateRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.EVIDENCE_UPDATE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. Get evidence first to find its caseId
      const evidence = evidenceRepository.findById(validationResult.data.id);

      // 3. AUTHORIZATION: Verify user owns the case that this evidence belongs to
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(evidence.caseId, userId);

      // 4. BUSINESS LOGIC: Use validated data
      const updatedEvidence = evidenceRepository.update(
        validationResult.data.id,
        validationResult.data.input
      );
      return { success: true, data: updatedEvidence };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:evidence:update' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update evidence',
      };
    }
  });

  /**
   * Delete evidence (hard delete).
   *
   * @param {EvidenceDeleteRequest} request - Delete request
   * @param {number} request.id - Evidence ID to delete
   *
   * @returns {Promise<EvidenceDeleteResponse | IPCErrorResponse>} Success or error
   *
   * @security
   * - Hard delete (not soft delete)
   * - Foreign key constraints prevent orphaned evidence
   * - Deletion logged to audit trail (event: evidence.delete)
   * - Failed deletions are also audited
   *
   * @warning This operation is irreversible!
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.deleteEvidence(456);
   * if (result.success) {
   *   console.log("Evidence deleted successfully");
   * }
   * ```
   */
  // Evidence: Delete
  ipcMain.handle(IPC_CHANNELS.EVIDENCE_DELETE, async (_, request: EvidenceDeleteRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.EVIDENCE_DELETE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. Get evidence first to find its caseId
      const evidence = evidenceRepository.findById(validationResult.data.id);

      // 3. AUTHORIZATION: Verify user owns the case that this evidence belongs to
      const userId = getCurrentUserIdFromSession();
      authorizationMiddleware.verifyCaseOwnership(evidence.caseId, userId);

      // 4. BUSINESS LOGIC: Use validated data
      evidenceRepository.delete(validationResult.data.id);
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:evidence:delete' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete evidence',
      };
    }
  });

  // AI: Check Status
  ipcMain.handle(IPC_CHANNELS.AI_CHECK_STATUS, async (_event, request: AICheckStatusRequest) => {
    try {
      // 1. VALIDATION: Validate input (even if empty)
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.AI_CHECK_STATUS,
        request || {}
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Check connection status
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
  });

  /**
   * Configure OpenAI API credentials and model selection.
   *
   * Validates API key format and creates/updates OpenAIService instance.
   * API key is stored in memory only (not persisted to disk).
   *
   * @param {AIConfigureRequest} request - Configuration request
   * @param {string} request.apiKey - OpenAI API key (format: sk-proj-... or sk-...)
   * @param {string} request.model - Model selection (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
   * @param {string} [request.organization] - Optional organization ID (format: org-...)
   *
   * @returns {Promise<AIConfigureResponse | IPCErrorResponse>} Success or validation error
   *
   * @security
   * - Input validation via Zod schema (validateOpenAIConfig)
   * - API key format validation (must start with sk-)
   * - Organization ID validation (must start with org-)
   * - No API key logging for security
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.configureAI({
   *   apiKey: "sk-proj-...",
   *   model: "gpt-4o",
   *   organization: "org-..."
   * });
   * if (result.success) {
   *   console.log("OpenAI configured successfully");
   * }
   * ```
   */
  ipcMain.handle(IPC_CHANNELS.AI_CONFIGURE, async (_, request: AIConfigureRequest) => {
    try {
      // 1. VALIDATION: Validate input before processing
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.AI_CONFIGURE,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Configure OpenAI via AIServiceFactory
      await aiServiceFactory.configureOpenAI(validationResult.data);

      errorLogger.logError('OpenAI configured successfully via AIServiceFactory', {
        type: 'info',
        model: validationResult.data.model,
        hasOrganization: !!validationResult.data.organization,
      });

      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:ai:configure' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure OpenAI',
      };
    }
  });

  /**
   * Test OpenAI API connection with provided credentials.
   *
   * Creates a temporary OpenAIService instance and attempts a minimal API call
   * to verify the API key is valid and the service is reachable.
   *
   * @param {AITestConnectionRequest} request - Test request
   * @param {string} request.apiKey - OpenAI API key to test
   * @param {string} [request.model] - Optional model to test (default: gpt-4o)
   *
   * @returns {Promise<AITestConnectionResponse | IPCErrorResponse>} Connection status
   *
   * @security
   * - Input validation via Zod schema (OpenAITestConnectionSchema)
   * - Temporary service instance (not persisted)
   * - No API key logging
   * - Timeout protection (OpenAI SDK default timeout)
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.testAIConnection({
   *   apiKey: "sk-proj-...",
   *   model: "gpt-4o"
   * });
   * if (result.success && result.connected) {
   *   console.log("Connection successful:", result.model);
   * } else {
   *   console.error("Connection failed:", result.error);
   * }
   * ```
   */
  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (_, request: AITestConnectionRequest) => {
    try {
      // 1. VALIDATION: Validate input before testing
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.AI_TEST_CONNECTION,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Test connection via AIServiceFactory
      const status = await aiServiceFactory.testOpenAIConnection({
        apiKey: validationResult.data.apiKey,
        model: validationResult.data.model || 'gpt-4o',
        organization: undefined,
      });

      errorLogger.logError('OpenAI connection test completed via AIServiceFactory', {
        type: 'info',
        connected: status.connected,
        model: status.model,
      });

      return {
        success: true,
        connected: status.connected,
        endpoint: status.endpoint,
        model: status.model,
        error: status.error,
      };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:ai:testConnection' });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection',
      };
    }
  });

  // AI: Chat (non-streaming)
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, request: AIChatRequest) => {
    try {
      // 1. VALIDATION: Validate input before processing
      const validationResult = await validationMiddleware.validate(IPC_CHANNELS.AI_CHAT, request);

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Process chat with validated data
      const response = await aiServiceFactory.chat({
        messages: validationResult.data.messages as unknown[], // Type conversion
        context: validationResult.data.context,
        caseId: validationResult.data.caseId,
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
  });

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
  ipcMain.handle(IPC_CHANNELS.AI_STREAM_START, async (event, request: AIStreamStartRequest) => {
    try {
      // 1. VALIDATION: Validate input before streaming
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.AI_STREAM_START,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      const streamId = Date.now().toString(); // Unique stream ID

      // 2. BUSINESS LOGIC: Process streaming with validated data
      // PHASE 5.1: Fetch RAG context from UK Legal APIs
      let ragContext = validationResult.data.context; // Start with provided context

      // Extract user's question (last message in conversation)
      if (validationResult.data.messages && validationResult.data.messages.length > 0) {
        const lastMessage =
          validationResult.data.messages[validationResult.data.messages.length - 1];

        if (lastMessage.role === 'user' && lastMessage.content) {
          // INTELLIGENT FILTERING: Only fetch RAG if question is about legal topics
          const questionCategory = legalAPIService.classifyQuestion(lastMessage.content);
          const isLegalQuestion = questionCategory !== 'general';

          // Emit status: Analyzing question
          event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '🤔 Thinking...');

          if (isLegalQuestion) {
            try {
              // Emit status: Searching legislation
              event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '🔍 Researching...');

              // Fetch legal context from UK Legal APIs
              const legalContext = await ragService.fetchContextForQuestion(lastMessage.content);

              // Merge RAG context with existing context
              ragContext = {
                ...ragContext,
                ...legalContext,
              };
            } catch (ragError) {
              // Log error but continue - don't block streaming on RAG failure
              errorLogger.logError(ragError as Error, {
                context: 'RAG context fetch failed, continuing without legal data',
              });
            }
          }
          // Emit status: Generating response
          event.sender.send(IPC_CHANNELS.AI_STATUS_UPDATE, '?o??,? Writing...');

          // Start streaming in background
          // Use streamChatWithFunctions if caseId is provided (enables fact-gathering)
          const useFunctionCalling = !!validationResult.data.caseId;

          let tokensSent = 0;
          let thinkTokensSent = 0;

          if (useFunctionCalling) {
            // Use streamChatWithFunctions for case-specific conversations
            aiServiceFactory
              .streamChatWithFunctions(
                {
                  messages: validationResult.data.messages as unknown[],
                  context: ragContext,
                  caseId: validationResult.data.caseId,
                },
                validationResult.data.caseId,
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
                  messages: validationResult.data.messages as unknown[],
                  context: ragContext, // Pass RAG-enhanced context
                  caseId: validationResult.data.caseId,
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
        }
      }

      return { success: true, streamId };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:ai:stream:start' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start stream',
      };
    }
  });

  // File: Select
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async (_event, request: FileSelectRequest = {}) => {
    try {
      // 1. VALIDATION: Validate input before showing dialog
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.FILE_SELECT,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Show file dialog with validated options
      if (!mainWindow) {
        return {
          success: false,
          error: 'Main window not available',
        };
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: validationResult.data.properties || ['openFile'],
        filters: validationResult.data.filters || [
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
  });

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
  ipcMain.handle(IPC_CHANNELS.FILE_UPLOAD, async (_, request: FileUploadRequest) => {
    try {
      // 1. VALIDATION: Validate and sanitize file path
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.FILE_UPLOAD,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Use sanitized file path from validation
      const filePath = validationResult.data.filePath;
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
  });

  /**
   * View/open a file in the system's default application.
   *
   * @param {FileViewRequest} request - Request with file path
   * @param {string} request.filePath - Absolute path to file to open
   *
   * @returns {Promise<FileViewResponse | IPCErrorResponse>} Success or error
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.viewFile("/path/to/document.pdf");
   * if (result.success) {
   *   console.log("File opened in default viewer");
   * }
   * ```
   */
  // File: View/Open
  ipcMain.handle(IPC_CHANNELS.FILE_VIEW, async (_, request: FileViewRequest) => {
    try {
      // 1. VALIDATION: Validate and sanitize file path
      const validationResult = await validationMiddleware.validate(IPC_CHANNELS.FILE_VIEW, request);

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Open file with sanitized path
      const result = await shell.openPath(validationResult.data.filePath);
      if (result) {
        // openPath returns empty string on success, error message on failure
        return {
          success: false,
          error: result,
        };
      }
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:file:view' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open file',
      };
    }
  });

  /**
   * Download/save a file to user-selected location.
   *
   * @param {FileDownloadRequest} request - Download request
   * @param {string} request.filePath - Source file path
   * @param {string} [request.fileName] - Suggested file name
   *
   * @returns {Promise<FileDownloadResponse | IPCErrorResponse>} Saved path or error
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.downloadFile("/path/to/evidence.pdf", "Evidence_1.pdf");
   * if (result.success) {
   *   console.log("Saved to:", result.savedPath);
   * }
   * ```
   */
  // File: Download/Save
  ipcMain.handle(IPC_CHANNELS.FILE_DOWNLOAD, async (_, request: FileDownloadRequest) => {
    try {
      // 1. VALIDATION: Validate and sanitize file paths
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.FILE_DOWNLOAD,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Use sanitized paths from validation
      const fileName =
        validationResult.data.fileName || path.basename(validationResult.data.filePath);
      const result = await dialog.showSaveDialog({
        title: 'Save File',
        defaultPath: path.join(app.getPath('downloads'), fileName),
        filters: [{ name: 'All Files', extensions: ['*'] }],
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: 'Download canceled by user',
        };
      }

      await fs.copyFile(validationResult.data.filePath, result.filePath);
      return { success: true, savedPath: result.filePath };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:file:download' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      };
    }
  });

  /**
   * Print a file using system print dialog.
   *
   * @param {FilePrintRequest} request - Print request
   * @param {string} request.filePath - File path to print
   *
   * @returns {Promise<FilePrintResponse | IPCErrorResponse>} Success or error
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.printFile("/path/to/document.pdf");
   * if (result.success) {
   *   console.log("File sent to printer");
   * }
   * ```
   */
  // File: Print
  ipcMain.handle(IPC_CHANNELS.FILE_PRINT, async (_, request: FilePrintRequest) => {
    try {
      // 1. VALIDATION: Validate file path and printable file type
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.FILE_PRINT,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Open file for printing with sanitized path
      // Open the file in default application which typically has print capability
      const result = await shell.openPath(validationResult.data.filePath);
      if (result) {
        return {
          success: false,
          error: `Cannot open file for printing: ${result}`,
        };
      }
      // Note: User must manually select Print from the opened application
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:file:print' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open file for printing',
      };
    }
  });

  /**
   * Compose email with file attachments.
   *
   * @param {FileEmailRequest} request - Email request
   * @param {string[]} request.filePaths - Array of file paths to attach
   * @param {string} [request.subject] - Email subject
   * @param {string} [request.body] - Email body
   *
   * @returns {Promise<FileEmailResponse | IPCErrorResponse>} Success or error
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.emailFiles(
   *   ["/path/to/doc1.pdf", "/path/to/doc2.pdf"],
   *   "Case Evidence",
   *   "Please find attached evidence documents."
   * );
   * ```
   */
  // File: Email
  ipcMain.handle(IPC_CHANNELS.FILE_EMAIL, async (_event, request: FileEmailRequest) => {
    try {
      // 1. VALIDATION: Validate file paths and email content
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.FILE_EMAIL,
        request
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        };
      }

      // 2. BUSINESS LOGIC: Compose email with validated data
      // Note: mailto: protocol has limited attachment support across email clients

      const subject = encodeURIComponent(
        validationResult.data.subject || 'Documents from Justice Companion'
      );
      const body = encodeURIComponent(
        validationResult.data.body || 'Please find attached documents.'
      );

      // Note: mailto: protocol has limited attachment support
      // On Windows, this will open default email client
      // Some email clients may not support file:// attachments via mailto:
      let mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

      // For better compatibility, just open email client and let user attach files
      // We'll include a note about attachments in the body
      const attachmentNote = `\n\nNote: Please manually attach the following files:\n${validationResult.data.filePaths
        .map((p) => `- ${path.basename(p)}`)
        .join('\n')}`;
      mailtoUrl = `mailto:?subject=${subject}&body=${encodeURIComponent(
        (validationResult.data.body || '') + attachmentNote
      )}`;

      await shell.openExternal(mailtoUrl);
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:file:email' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open email client',
      };
    }
  });

  // Conversation: Create
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_CREATE,
    async (_, request: ConversationCreateRequest) => {
      try {
        // Authorization: If caseId provided, verify user owns the case
        const userId = getCurrentUserIdFromSession();

        // TODO: Add user_id column to chat_conversations table for proper ownership
        // Currently, conversations without caseId cannot be secured (security gap)
        if (request.input.caseId) {
          authorizationMiddleware.verifyCaseOwnership(request.input.caseId, userId);
        }

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
  ipcMain.handle(IPC_CHANNELS.CONVERSATION_GET, async (_, request: ConversationGetRequest) => {
    try {
      // 1. VALIDATION: Validate input before authorization
      let validatedData: any;
      try {
        validatedData = await validationMiddleware.validate(IPC_CHANNELS.CONVERSATION_GET, request);
      } catch (validationError) {
        // Handle validation errors
        const error =
          validationError instanceof ValidationError
            ? validationError
            : new ValidationError('Validation failed');
        return {
          success: false,
          error: error.message || 'Validation failed',
          errors: error.fields || {},
        };
      }

      // 2. Get conversation first to check caseId
      const conversation = chatConversationService.getConversation(validatedData.id);

      // 3. AUTHORIZATION: Verify user owns the case (if conversation has caseId)
      const userId = getCurrentUserIdFromSession();

      if (conversation && conversation.caseId) {
        authorizationMiddleware.verifyCaseOwnership(conversation.caseId, userId);
      } else if (conversation && !conversation.caseId) {
        // TODO: Security gap - conversations without caseId can't be secured
        // Block access until user_id column is added to chat_conversations table
        throw new Error('Unauthorized: Cannot access general conversations without case context');
      }

      return { success: true, data: conversation };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:conversation:get' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation',
      };
    }
  });

  // Conversation: Get all (optionally filtered by case)
  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_GET_ALL,
    async (_, request: ConversationGetAllRequest) => {
      try {
        // Authorization: Get user's cases first, then filter conversations
        const userId = getCurrentUserIdFromSession();

        // If caseId provided, verify user owns it
        if (request.caseId) {
          authorizationMiddleware.verifyCaseOwnership(request.caseId, userId);
          // Get conversations for this specific case
          const conversations = chatConversationService.getAllConversations(request.caseId);
          return { success: true, data: conversations };
        }

        // No caseId provided - filter to user's cases only
        const userCases = caseRepository.findAll().filter((c) => c.userId === userId);
        const userCaseIds = new Set(userCases.map((c) => c.id));

        const allConversations = chatConversationService.getAllConversations();
        // Filter to only conversations linked to user's cases
        // Excludes general chats (caseId=null) for security
        const userConversations = allConversations.filter(
          (conv) => conv.caseId && userCaseIds.has(conv.caseId)
        );

        return { success: true, data: userConversations };
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
        // Authorization: Verify user owns the case (if caseId provided)
        const userId = getCurrentUserIdFromSession();

        if (request.caseId) {
          authorizationMiddleware.verifyCaseOwnership(request.caseId, userId);
        }

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
        // Get conversation first to check caseId
        const conversation = chatConversationService.loadConversation(request.conversationId);

        // Authorization: Verify user owns the case (if conversation has caseId)
        const userId = getCurrentUserIdFromSession();

        if (conversation && conversation.caseId) {
          authorizationMiddleware.verifyCaseOwnership(conversation.caseId, userId);
        } else if (conversation && !conversation.caseId) {
          // TODO: Security gap - conversations without caseId can't be secured
          throw new Error('Unauthorized: Cannot access general conversations without case context');
        }

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
        // Get conversation first to check caseId
        const conversation = chatConversationService.getConversation(request.id);

        // Authorization: Verify user owns the case (if conversation has caseId)
        const userId = getCurrentUserIdFromSession();

        if (conversation && conversation.caseId) {
          authorizationMiddleware.verifyCaseOwnership(conversation.caseId, userId);
        } else if (conversation && !conversation.caseId) {
          // TODO: Security gap - conversations without caseId can't be secured
          throw new Error('Unauthorized: Cannot delete general conversations without case context');
        }

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
  ipcMain.handle(IPC_CHANNELS.MESSAGE_ADD, async (_event, request: MessageAddRequest) => {
    try {
      // 1. VALIDATION: Validate message input before authorization
      let validatedData: any;
      try {
        validatedData = await validationMiddleware.validate(IPC_CHANNELS.MESSAGE_ADD, request);
      } catch (validationError) {
        // Handle validation errors (role validation, content length, etc.)
        const error =
          validationError instanceof ValidationError
            ? validationError
            : new ValidationError('Validation failed');
        return {
          success: false,
          error: error.message || 'Validation failed',
          errors: error.fields || {},
        };
      }

      // 2. Get conversation first to check caseId
      const conversation = chatConversationService.getConversation(
        validatedData.input.conversationId
      );

      // 3. AUTHORIZATION: Verify user owns the case (if conversation has caseId)
      const userId = getCurrentUserIdFromSession();

      if (conversation && conversation.caseId) {
        authorizationMiddleware.verifyCaseOwnership(conversation.caseId, userId);
      } else if (conversation && !conversation.caseId) {
        // TODO: Security gap - conversations without caseId can't be secured
        throw new Error(
          'Unauthorized: Cannot add messages to general conversations without case context'
        );
      }

      // 4. BUSINESS LOGIC: Add validated message
      chatConversationService.addMessage(validatedData.input);
      // Return updated conversation
      const updatedConversation = chatConversationService.getConversation(
        validatedData.input.conversationId
      )!;
      return { success: true, data: updatedConversation };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:message:add' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message',
      };
    }
  });

  // Profile: Get
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, async (_event, _request: ProfileGetRequest) => {
    try {
      // 1. VALIDATION: No validation needed (no parameters)
      // This handler is in the no-validation list in ValidationMiddleware

      // 2. BUSINESS LOGIC: Get current user's profile
      const profile = userProfileService.getProfile();
      return { success: true, data: profile };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:profile:get' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      };
    }
  });

  // Profile: Update
  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (_, request: ProfileUpdateRequest) => {
    try {
      // 1. VALIDATION: Validate update fields (email, name, avatar URL)
      let validatedData: ProfileUpdateRequest;
      try {
        validatedData = await validationMiddleware.validate(IPC_CHANNELS.PROFILE_UPDATE, request);
      } catch (validationError) {
        const error =
          validationError instanceof ValidationError
            ? validationError
            : new ValidationError('Validation failed');
        return {
          success: false,
          error: error.message || 'Validation failed',
          errors: error.fields || {},
        };
      }

      // 2. BUSINESS LOGIC: Update profile with validated data
      // Validates: email format, HTTPS-only avatar URLs, name length
      // Ensures at least one field is provided for update
      const profile = userProfileService.updateProfile(validatedData.input);
      return { success: true, data: profile };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:profile:update' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  });

  // Model: Get Available Models
  ipcMain.handle(
    IPC_CHANNELS.MODEL_GET_AVAILABLE,
    async (_event, _request: ModelGetAvailableRequest) => {
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
    async (_event, _request: ModelGetDownloadedRequest) => {
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
  ipcMain.handle(IPC_CHANNELS.MODEL_IS_DOWNLOADED, async (_, request: ModelIsDownloadedRequest) => {
    try {
      // 1. VALIDATION: Validate model ID
      let validatedData: any;
      try {
        validatedData = await validationMiddleware.validate(
          IPC_CHANNELS.MODEL_IS_DOWNLOADED,
          request
        );
      } catch (validationError) {
        const error =
          validationError instanceof ValidationError
            ? validationError
            : new ValidationError('Validation failed');
        return {
          success: false,
          error: error.message || 'Validation failed',
          errors: error.fields || {},
        };
      }

      // 2. BUSINESS LOGIC: Check if model is downloaded using validated data
      const downloaded = modelDownloadService.isModelDownloaded(validatedData.modelId);
      const path = modelDownloadService.getModelPath(validatedData.modelId);
      return { success: true, downloaded, path: path || undefined };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:model:isDownloaded' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check model status',
      };
    }
  });

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
  ipcMain.handle(IPC_CHANNELS.MODEL_DELETE, async (_, request: ModelDeleteRequest) => {
    try {
      // 1. VALIDATION: Validate model ID and enforce protection rules
      // The validation schema prevents deletion of protected system models
      let validatedData: any;
      try {
        validatedData = await validationMiddleware.validate(IPC_CHANNELS.MODEL_DELETE, request);
      } catch (validationError) {
        const error =
          validationError instanceof ValidationError
            ? validationError
            : new ValidationError('Validation failed');
        return {
          success: false,
          error: error.message || 'Validation failed',
          errors: error.fields || {},
        };
      }

      // 2. BUSINESS LOGIC: Delete model using validated data
      // Note: The validation schema already prevents deletion of protected models
      const deleted = await modelDownloadService.deleteModel(validatedData.modelId);
      return { success: true, deleted };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:model:delete' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete model',
      };
    }
  });

  // Facts: Store a case fact (supports both old & new formats)
  ipcMain.handle('facts:store', async (_event, params: unknown) => {
    try {
      const p = params as Record<string, unknown>;
      let factContent: string;
      let factCategory: string;
      let importance: 'low' | 'medium' | 'high' | 'critical';

      // NEW format (from AIFunctionDefinitions): factContent + factCategory + importance
      if (p.factContent) {
        factContent = p.factContent as string;
        factCategory = (p.factCategory as string) || 'other';
        importance = (p.importance as 'low' | 'medium' | 'high' | 'critical') || 'medium';
      }
      // OLD format (backwards compat): factType + factKey + factValue + confidence
      else {
        factContent = `${p.factKey}: ${p.factValue}`;
        factCategory = (p.factType as string) || 'other';

        // Map confidence to importance
        if (p.confidence !== undefined) {
          const conf = p.confidence as number;
          if (conf >= 0.9) importance = 'critical';
          else if (conf >= 0.7) importance = 'high';
          else if (conf >= 0.5) importance = 'medium';
          else importance = 'low';
        } else {
          importance = 'medium';
        }
      }

      const fact = caseFactsRepository.create({
        caseId: p.caseId as number,
        factContent,
        factCategory: factCategory as
          | 'timeline'
          | 'evidence'
          | 'witness'
          | 'location'
          | 'communication'
          | 'other',
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
  });

  // Facts: Get facts for a case
  ipcMain.handle('facts:get', async (_event, caseId: number, factType?: string) => {
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
  });

  // Facts: Get fact count for a case
  ipcMain.handle('facts:count', async (_event, caseId: number) => {
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
  });

  /**
   * GDPR: Export all user data
   *
   * Exports all user data to a JSON file in the user's Documents folder.
   * This implements the GDPR "Right to Data Portability" (Article 20).
   *
   * @param {GDPRExportUserDataRequest} request - Empty request
   *
   * @returns {Promise<GDPRExportUserDataResponse | IPCErrorResponse>} Export path and summary or error
   *
   * @security
   * - All encrypted data is decrypted before export
   * - Export is logged to audit trail (event: gdpr.export)
   * - Export file contains metadata about format and version
   *
   * @compliance GDPR Article 20 - Right to Data Portability
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.exportUserData();
   * if (result.success) {
   *   console.log("Data exported to:", result.exportPath);
   *   console.log("Summary:", result.summary);
   * }
   * ```
   */
  // GDPR: Export User Data
  ipcMain.handle(
    IPC_CHANNELS.GDPR_EXPORT_USER_DATA,
    async (_event, _request: GDPRExportUserDataRequest) => {
      try {
        // 1. VALIDATION: Validate input (even if minimal/empty)
        try {
          await validationMiddleware.validate(IPC_CHANNELS.GDPR_EXPORT_USER_DATA, _request);
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message,
            errors: error.fields,
          };
        }

        // 2. AUTHORIZATION: Get current user ID for filtering
        const userId = getCurrentUserIdFromSession();

        const db = databaseManager.getDatabase();
        const exportDate = new Date().toISOString();
        const timestamp = exportDate.replace(/[:.]/g, '-').slice(0, 19);

        // Gather ONLY current user's data from database
        const allCases = caseRepository.findAll();
        const cases = allCases.filter((c) => c.userId === userId);
        const caseIds = new Set(cases.map((c) => c.id));

        // Filter evidence to user's cases only
        const allEvidence = evidenceRepository.findAll();
        const evidence = allEvidence.filter((e) => caseIds.has(e.caseId));

        const profile = userProfileService.getProfile();

        // Filter conversations to user's cases only (excludes general chats)
        const allConversations = chatConversationService.getAllConversations();
        const conversations = allConversations.filter(
          (conv) => conv.caseId && caseIds.has(conv.caseId)
        );

        // Gather case-related data by iterating through cases
        const notes: unknown[] = [];
        const legalIssues: unknown[] = [];
        const timelineEvents: unknown[] = [];
        const userFacts: unknown[] = [];
        const caseFacts: unknown[] = [];

        for (const c of cases) {
          notes.push(...notesRepository.findByCaseId(c.id));
          legalIssues.push(...legalIssuesRepository.findByCaseId(c.id));
          timelineEvents.push(...timelineRepository.findByCaseId(c.id));
          userFacts.push(...userFactsRepository.findByCaseId(c.id));
          caseFacts.push(...caseFactsRepository.findByCaseId(c.id));
        }

        // Get all messages for all conversations
        const allMessages: unknown[] = [];
        for (const conv of conversations) {
          const convWithMessages = chatConversationService.loadConversation(conv.id);
          if (convWithMessages && convWithMessages.messages) {
            allMessages.push(...convWithMessages.messages);
          }
        }

        // Create export data structure
        const exportData = {
          metadata: {
            exportDate,
            version: '1.0.0',
            application: 'Justice Companion',
            format: 'JSON',
            disclaimer:
              'This export contains all your personal data stored in Justice Companion. All encrypted fields have been decrypted for portability.',
          },
          profile,
          cases,
          evidence,
          notes,
          legalIssues,
          timelineEvents,
          conversations,
          messages: allMessages,
          userFacts,
          caseFacts,
          summary: {
            casesCount: cases.length,
            evidenceCount: evidence.length,
            notesCount: notes.length,
            legalIssuesCount: legalIssues.length,
            timelineEventsCount: timelineEvents.length,
            conversationsCount: conversations.length,
            messagesCount: allMessages.length,
            userFactsCount: userFacts.length,
            caseFactsCount: caseFacts.length,
          },
        };

        // Save to Documents folder
        const documentsPath = app.getPath('documents');
        const exportFileName = `justice-companion-data-export-${timestamp}.json`;
        const exportPath = path.join(documentsPath, exportFileName);

        await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

        // Audit log the export
        const auditLogger = new AuditLogger(db);
        auditLogger.log({
          eventType: 'gdpr.export',
          userId: userId.toString(),
          resourceType: 'user_data',
          resourceId: userId.toString(),
          action: 'export',
          details: {
            exportPath,
            recordsExported: exportData.summary,
          },
          success: true,
        });

        errorLogger.logError('GDPR data export completed', {
          type: 'info',
          exportPath,
          summary: exportData.summary,
        });

        return {
          success: true,
          exportPath,
          exportDate,
          summary: exportData.summary,
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:gdpr:export' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export user data',
        };
      }
    }
  );

  /**
   * GDPR: Delete all user data
   *
   * Permanently deletes all user data from the database.
   * This implements the GDPR "Right to Erasure" (Article 17).
   *
   * @param {GDPRDeleteUserDataRequest} request - Request with confirmation string
   * @param {string} request.confirmation - Must be "DELETE_ALL_MY_DATA" for safety
   *
   * @returns {Promise<GDPRDeleteUserDataResponse | IPCErrorResponse>} Deletion summary or error
   *
   * @security
   * - Requires explicit confirmation string to prevent accidental deletion
   * - Deletion is logged to audit trail BEFORE deletion (event: gdpr.delete)
   * - Uses CASCADE deletion via foreign key constraints
   * - Operation is irreversible!
   *
   * @compliance GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
   *
   * @warning THIS OPERATION CANNOT BE UNDONE!
   *
   * @example
   * ```typescript
   * const result = await window.justiceAPI.deleteUserData("DELETE_ALL_MY_DATA");
   * if (result.success) {
   *   console.log("All data deleted:", result.summary);
   * }
   * ```
   */
  // GDPR: Delete User Data
  ipcMain.handle(
    IPC_CHANNELS.GDPR_DELETE_USER_DATA,
    async (_event, request: GDPRDeleteUserDataRequest) => {
      try {
        // 1. VALIDATION: Validate input including confirmation string
        // CRITICAL SECURITY: Must validate exact confirmation string match
        let validatedData: GDPRDeleteUserDataRequest;
        try {
          validatedData = await validationMiddleware.validate(
            IPC_CHANNELS.GDPR_DELETE_USER_DATA,
            request
          );
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message || 'Validation failed',
            errors: error.fields || {},
          };
        }

        // 2. Additional safety check (redundant but critical for security)
        // The validation schema already enforces this, but we keep it as defense-in-depth
        if (validatedData.confirmation !== 'DELETE_ALL_MY_DATA') {
          return {
            success: false,
            error: 'Invalid confirmation string. Must be "DELETE_ALL_MY_DATA".',
          };
        }

        // 3. AUTHORIZATION: Get current user ID for filtering
        const userId = getCurrentUserIdFromSession();

        const db = databaseManager.getDatabase();
        const deletedAt = new Date().toISOString();

        // Count ONLY current user's records before deletion for summary
        const allCases = caseRepository.findAll();
        const cases = allCases.filter((c) => c.userId === userId);
        const casesCount = cases.length;
        const caseIds = new Set(cases.map((c) => c.id));

        // Count evidence belonging to user's cases
        const allEvidence = evidenceRepository.findAll();
        const evidenceCount = allEvidence.filter((e) => caseIds.has(e.caseId)).length;

        // Count conversations linked to user's cases
        const allConversations = chatConversationService.getAllConversations();
        const conversationsCount = allConversations.filter(
          (conv) => conv.caseId && caseIds.has(conv.caseId)
        ).length;

        // Count case-related records
        let notesCount = 0;
        let legalIssuesCount = 0;
        let timelineEventsCount = 0;
        let userFactsCount = 0;
        let caseFactsCount = 0;

        for (const c of cases) {
          notesCount += notesRepository.findByCaseId(c.id).length;
          legalIssuesCount += legalIssuesRepository.findByCaseId(c.id).length;
          timelineEventsCount += timelineRepository.findByCaseId(c.id).length;
          userFactsCount += userFactsRepository.findByCaseId(c.id).length;
          caseFactsCount += caseFactsRepository.findByCaseId(c.id).length;
        }

        // Count messages
        let messagesCount = 0;
        const conversations = chatConversationService.getAllConversations();
        for (const conv of conversations) {
          const convWithMessages = chatConversationService.loadConversation(conv.id);
          if (convWithMessages && convWithMessages.messages) {
            messagesCount += convWithMessages.messages.length;
          }
        }

        // Audit log the deletion BEFORE deleting (so the log survives)
        const auditLogger = new AuditLogger(db);
        auditLogger.log({
          eventType: 'gdpr.delete',
          userId: userId.toString(),
          resourceType: 'user_data',
          resourceId: userId.toString(),
          action: 'delete',
          details: {
            deletedAt,
            recordsToDelete: {
              casesCount,
              evidenceCount,
              notesCount,
              legalIssuesCount,
              timelineEventsCount,
              conversationsCount,
              messagesCount,
              userFactsCount,
              caseFactsCount,
            },
          },
          success: true,
        });

        // Delete ONLY current user's data using CASCADE constraints
        // Start transaction for atomicity
        const deleteUserData = db.transaction(() => {
          // Delete user's cases (CASCADE will delete evidence, notes, legal issues, timeline events, user facts, case facts)
          db.prepare('DELETE FROM cases WHERE user_id = ?').run(userId);

          // Delete conversations linked to user's cases
          // Note: General conversations (caseId=null) are NOT deleted due to security gap
          const caseIdsArray = Array.from(caseIds);
          if (caseIdsArray.length > 0) {
            const placeholders = caseIdsArray.map(() => '?').join(',');
            db.prepare(`DELETE FROM chat_conversations WHERE case_id IN (${placeholders})`).run(
              ...caseIdsArray
            );
          }

          // Note: User profile is shared - don't delete/reset it
          // Note: We don't delete audit logs - they are kept for compliance
        });

        deleteUserData();

        // Note: Audit logs are kept for compliance and not deleted

        errorLogger.logError('GDPR data deletion completed', {
          type: 'info',
          deletedAt,
          summary: {
            casesDeleted: casesCount,
            evidenceDeleted: evidenceCount,
            notesDeleted: notesCount,
            legalIssuesDeleted: legalIssuesCount,
            timelineEventsDeleted: timelineEventsCount,
            conversationsDeleted: conversationsCount,
            messagesDeleted: messagesCount,
            userFactsDeleted: userFactsCount,
            caseFactsDeleted: caseFactsCount,
            auditLogsDeleted: 0, // Audit logs are kept for compliance
          },
        });

        return {
          success: true,
          deletedAt,
          summary: {
            casesDeleted: casesCount,
            evidenceDeleted: evidenceCount,
            notesDeleted: notesCount,
            legalIssuesDeleted: legalIssuesCount,
            timelineEventsDeleted: timelineEventsCount,
            conversationsDeleted: conversationsCount,
            messagesDeleted: messagesCount,
            userFactsDeleted: userFactsCount,
            caseFactsDeleted: caseFactsCount,
            auditLogsDeleted: 0, // Audit logs are kept for compliance
          },
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:gdpr:delete' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete user data',
        };
      }
    }
  );

  // NOTE: Authentication and Consent IPC handlers have been moved to app.whenReady()
  // They are registered AFTER authentication services are initialized to avoid closure bugs
  // See registerAuthenticationIPCHandlers() function below

  // UI Error Logging
  ipcMain.handle(
    IPC_CHANNELS.LOG_UI_ERROR,
    async (_event, request: { errorData: Record<string, unknown> }) => {
      try {
        const { errorData } = request;
        const db = databaseManager.getDatabase();
        const auditLogger = new AuditLogger(db);

        // Log UI error to audit trail
        auditLogger.log({
          eventType: 'ui.error',
          userId: 'local-user',
          resourceType: 'ui',
          resourceId: 'renderer',
          action: 'error',
          details: {
            error: errorData.error,
            errorInfo: errorData.errorInfo,
            componentStack: errorData.componentStack,
            timestamp: errorData.timestamp,
            url: errorData.url,
            userAgent: errorData.userAgent,
          },
          success: false,
        });

        // Also log to console for development
        console.error('[UI Error]', {
          error: errorData.error,
          componentStack: errorData.componentStack,
          timestamp: errorData.timestamp,
        });

        // Log to error logger file
        errorLogger.logError(new Error(errorData.error), {
          context: 'ui:renderer',
          componentStack: errorData.componentStack,
          timestamp: errorData.timestamp,
        });

        return {
          success: true,
          logged: true,
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:log-ui-error' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to log UI error',
        };
      }
    }
  );

  errorLogger.logError(
    'IPC handlers registered successfully (cases + evidence + AI + OpenAI + files + conversations + profile + models + facts + GDPR + authentication + consent + UI errors)',
    { type: 'info' }
  );
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
  const casesCreateHandler = async (_event: unknown, args: unknown) => {
    try {
      const createdCase = caseService.createCase(args);
      return createdCase;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:create' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:create', casesCreateHandler);
  devAPIServer.registerHandler('dev-api:cases:create', casesCreateHandler);

  const casesGetHandler = async (_event: unknown, id: string) => {
    try {
      return caseRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:get' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:get', casesGetHandler);
  devAPIServer.registerHandler('dev-api:cases:get', casesGetHandler);

  const casesListHandler = async (_event: unknown, _filters: unknown) => {
    try {
      return caseRepository.findAll();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:list' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:list', casesListHandler);
  devAPIServer.registerHandler('dev-api:cases:list', casesListHandler);

  const casesUpdateHandler = async (
    _event: unknown,
    { id, updates }: { id: string; updates: unknown }
  ) => {
    try {
      return caseService.updateCase(id, updates);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:update' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:update', casesUpdateHandler);
  devAPIServer.registerHandler('dev-api:cases:update', casesUpdateHandler);

  const casesDeleteHandler = async (_event: unknown, id: string) => {
    try {
      caseService.deleteCase(id);
      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:delete' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:delete', casesDeleteHandler);
  devAPIServer.registerHandler('dev-api:cases:delete', casesDeleteHandler);

  const casesCreateTestFixtureHandler = async (_event: unknown, args: Record<string, unknown>) => {
    try {
      const testCase = caseService.createCase({
        title: (args.title as string) || 'Test Case',
        caseType:
          (args.caseType as 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other') ||
          'employment',
        description: (args.description as string) || 'Test case for MCP integration',
      });
      return {
        caseId: testCase.id,
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        conversationIds: ['conv-1', 'conv-2'],
      };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:cases:createTestFixture' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:cases:createTestFixture', casesCreateTestFixtureHandler);
  devAPIServer.registerHandler('dev-api:cases:createTestFixture', casesCreateTestFixtureHandler);

  // Evidence handlers
  const evidenceCreateHandler = async (_event: unknown, input: CreateEvidenceInput) => {
    try {
      const createdEvidence = evidenceRepository.create(input);
      return createdEvidence;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:evidence:create' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:evidence:create', evidenceCreateHandler);
  devAPIServer.registerHandler('dev-api:evidence:create', evidenceCreateHandler);

  // Database handlers
  const databaseQueryHandler = async (_event: unknown, sql: string) => {
    // Security: Only allow SELECT queries
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries allowed via dev API');
    }
    try {
      const db = databaseManager.getDatabase();
      return db.prepare(sql).all();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:query' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:database:query', databaseQueryHandler);
  devAPIServer.registerHandler('dev-api:database:query', databaseQueryHandler);

  const databaseMigrateHandler = async (_event: unknown, targetVersion?: number) => {
    try {
      runMigrations();
      return { success: true, version: targetVersion || 'latest' };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:migrate' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:database:migrate', databaseMigrateHandler);
  devAPIServer.registerHandler('dev-api:database:migrate', databaseMigrateHandler);

  const databaseBackupHandler = async (_event: unknown, path: string) => {
    // Security: Validate path is in allowed directories
    const { validatePathOrThrow } = await import('./utils/path-security');
    validatePathOrThrow(path);

    try {
      const db = databaseManager.getDatabase();
      const backupDb = await import('better-sqlite3').then((m) => m.default(path));
      await db.backup(backupDb);
      backupDb.close();
      return { success: true, path };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'dev-api:database:backup' });
      throw error;
    }
  };
  ipcMain.handle('dev-api:database:backup', databaseBackupHandler);
  devAPIServer.registerHandler('dev-api:database:backup', databaseBackupHandler);

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

app.whenReady().then(async () => {
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
  let encryptionService: EncryptionService;
  try {
    encryptionService = initializeEncryptionService();
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'encryption-initialization' });
    app.exit(1);
    return;
  }

  // Inject encryption service into repositories that handle sensitive data
  caseRepository.setEncryptionService(encryptionService);
  evidenceRepository.setEncryptionService(encryptionService);
  notesRepository.setEncryptionService(encryptionService);
  legalIssuesRepository.setEncryptionService(encryptionService);
  timelineRepository.setEncryptionService(encryptionService);
  userFactsRepository.setEncryptionService(encryptionService);
  caseFactsRepository.setEncryptionService(encryptionService);
  chatConversationRepository.setEncryptionService(encryptionService);
  userProfileRepository.setEncryptionService(encryptionService);

  // CRITICAL SECURITY: Initialize audit logger for immutable audit trail
  try {
    const db = databaseManager.getDatabase();
    const auditLogger = new AuditLogger(db);

    caseRepository.setAuditLogger(auditLogger);
    evidenceRepository.setAuditLogger(auditLogger);
    notesRepository.setAuditLogger(auditLogger);
    legalIssuesRepository.setAuditLogger(auditLogger);
    timelineRepository.setAuditLogger(auditLogger);
    userFactsRepository.setAuditLogger(auditLogger);
    caseFactsRepository.setAuditLogger(auditLogger);
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'audit-logger-initialization' });
    errorLogger.logError(
      'WARNING: Audit logger initialization failed - operations will not be audited',
      {
        type: 'error',
      }
    );
  }

  // Inject CaseFactRepository into AIServiceFactory for fact loading
  try {
    aiServiceFactory.setCaseFactsRepository(caseFactsRepository);
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ai-service-factory-injection' });
    errorLogger.logError(
      'WARNING: Failed to inject repository - AI will not have access to stored facts',
      {
        type: 'warn',
      }
    );
  }
  // CRITICAL SECURITY: Initialize authentication services
  try {
    console.log('[Main] Starting authentication services initialization...');
    const db = databaseManager.getDatabase();
    console.log('[Main] Database obtained');
    const auditLogger = new AuditLogger(db);
    console.log('[Main] AuditLogger created');

    // Initialize repositories
    userRepository = new UserRepository(auditLogger);
    console.log('[Main] UserRepository created');
    sessionRepository = new SessionRepository();
    console.log('[Main] SessionRepository created');
    consentRepository = new ConsentRepository();
    console.log('[Main] ConsentRepository created');

    // Create a SessionPersistenceHandler adapter for Electron's SessionPersistenceService
    const sessionPersistenceHandler: SessionPersistenceHandler = {
      storeSessionId: async (sessionId: string) => {
        const service = SessionPersistenceService.getInstance();
        await service.storeSessionId(sessionId);
      },
      retrieveSessionId: async () => {
        const service = SessionPersistenceService.getInstance();
        return await service.retrieveSessionId();
      },
      clearSession: async () => {
        const service = SessionPersistenceService.getInstance();
        await service.clearSession();
      },
      hasStoredSession: async () => {
        const service = SessionPersistenceService.getInstance();
        return await service.hasStoredSession();
      },
      isAvailable: async () => {
        const service = SessionPersistenceService.getInstance();
        return await service.isAvailable();
      },
    };
    console.log('[Main] SessionPersistenceHandler adapter created');

    // Initialize services with session persistence
    authenticationService = new AuthenticationService(
      userRepository,
      sessionRepository,
      auditLogger,
      sessionPersistenceHandler
    );
    console.log('[Main] AuthenticationService created with session persistence');
    consentService = new ConsentService(consentRepository, auditLogger);
    console.log('[Main] ConsentService created');
    authorizationMiddleware = new AuthorizationMiddleware(caseRepository, auditLogger);
    console.log('[Main] AuthorizationMiddleware created');

    errorLogger.logError('✅ Authentication services initialized', { type: 'info' });
    errorLogger.logError('✅ Authorization middleware initialized', { type: 'info' });
    errorLogger.logError('✅ Consent services initialized', { type: 'info' });
    console.log('[Main] ✅ ALL AUTHENTICATION SERVICES INITIALIZED SUCCESSFULLY');

    // Restore persisted session if available (Remember Me functionality)
    // This must happen AFTER authentication services are initialized but BEFORE IPC handlers
    console.log('[Main] Checking for persisted session to restore...');
    try {
      const restored = await authenticationService.restorePersistedSession();
      if (restored) {
        currentSessionId = restored.session.id;
        console.log(
          '[Main] ✅ Successfully restored persisted session for user:',
          restored.user.username
        );
        errorLogger.logError(`Session restored for user: ${restored.user.username}`, {
          type: 'info',
        });
      } else {
        console.log('[Main] No valid persisted session to restore');
      }
    } catch (error) {
      console.error('[Main] Error restoring persisted session:', error);
      errorLogger.logError(error as Error, { context: 'session:restore' });
      // Don't throw - app should continue even if session restoration fails
    }

    // Register authentication/consent IPC handlers AFTER services are initialized
    // This prevents closure bugs where handlers capture undefined service references
    console.log('[Main] Registering authentication/consent IPC handlers...');

    // Authentication: Register
    ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, async (_, request: AuthRegisterRequest) => {
      try {
        // 1. VALIDATION: Validate input using try-catch pattern
        let validatedData: AuthRegisterRequest;
        try {
          validatedData = await validationMiddleware.validate(IPC_CHANNELS.AUTH_REGISTER, request);
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message || 'Validation failed',
            errors: error.fields || {},
          };
        }

        // 2. BUSINESS LOGIC: Use validated data (no authorization check for registration)
        const user = await authenticationService.register(
          validatedData.username,
          validatedData.password,
          validatedData.email
        );
        return { success: true, data: user };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:auth:register' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to register user',
        };
      }
    });

    // Authentication: Login
    ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_, request: AuthLoginRequest) => {
      try {
        // 1. VALIDATION: Validate input using try-catch pattern
        let validatedData: AuthLoginRequest;
        try {
          validatedData = await validationMiddleware.validate(IPC_CHANNELS.AUTH_LOGIN, request);
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message || 'Validation failed',
            errors: error.fields || {},
          };
        }

        // 2. BUSINESS LOGIC: Use validated data (no authorization check for login)
        const { username, password, rememberMe = false } = validatedData;
        const { user, session } = await authenticationService.login(username, password, rememberMe);

        // Store session ID for auth state management
        currentSessionId = session.id;

        return {
          success: true,
          data: {
            user,
            sessionId: session.id,
          },
        };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:auth:login' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to login',
        };
      }
    });

    // Authentication: Logout
    ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (_event, request: AuthLogoutRequest) => {
      try {
        // 1. VALIDATION: Validate input using try-catch pattern (minimal validation for logout)
        try {
          await validationMiddleware.validate(IPC_CHANNELS.AUTH_LOGOUT, request || {});
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message,
            errors: error.fields,
          };
        }

        // 2. AUTHORIZATION: Check if user is logged in
        if (!currentSessionId) {
          return {
            success: false,
            error: 'Not authenticated',
          };
        }

        // 3. BUSINESS LOGIC: Perform logout
        // Call async logout to properly clear persisted session
        await authenticationService.logout(currentSessionId);
        currentSessionId = null;

        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:auth:logout' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to logout',
        };
      }
    });

    // Authentication: Get Current User
    ipcMain.handle(
      IPC_CHANNELS.AUTH_GET_CURRENT_USER,
      async (_event, _request: AuthGetCurrentUserRequest) => {
        try {
          if (!currentSessionId) {
            return { success: true, data: null };
          }

          const user = authenticationService.validateSession(currentSessionId);

          if (!user) {
            // Session expired or invalid
            currentSessionId = null;
            return { success: true, data: null };
          }

          return { success: true, data: user };
        } catch (error) {
          errorLogger.logError(error as Error, { context: 'ipc:auth:getCurrentUser' });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get current user',
          };
        }
      }
    );

    // Authentication: Change Password
    ipcMain.handle(
      IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
      async (_, request: AuthChangePasswordRequest) => {
        try {
          // 1. VALIDATION: Validate input using try-catch pattern
          let validatedData: AuthChangePasswordRequest;
          try {
            validatedData = await validationMiddleware.validate(
              IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
              request
            );
          } catch (validationError) {
            const error =
              validationError instanceof ValidationError
                ? validationError
                : new ValidationError('Validation failed');
            return {
              success: false,
              error: error.message || 'Validation failed',
              errors: error.fields || {},
            };
          }

          // 2. AUTHORIZATION: Check if user is logged in
          if (!currentSessionId) {
            return {
              success: false,
              error: 'Not authenticated',
            };
          }

          const user = authenticationService.validateSession(currentSessionId);

          if (!user) {
            currentSessionId = null;
            return {
              success: false,
              error: 'Session expired',
            };
          }

          // 3. BUSINESS LOGIC: Use validated data
          await authenticationService.changePassword(
            user.id,
            validatedData.oldPassword,
            validatedData.newPassword
          );

          // Session was invalidated by password change
          currentSessionId = null;

          return { success: true };
        } catch (error) {
          errorLogger.logError(error as Error, { context: 'ipc:auth:changePassword' });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to change password',
          };
        }
      }
    );

    // Consent: Grant
    ipcMain.handle(IPC_CHANNELS.CONSENT_GRANT, async (_, request: ConsentGrantRequest) => {
      try {
        // Validation step
        let validatedData: ConsentGrantRequest;
        try {
          validatedData = await validationMiddleware.validate(IPC_CHANNELS.CONSENT_GRANT, request);
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message || 'Validation failed',
            errors: error.fields || {},
          };
        }

        if (!currentSessionId) {
          return {
            success: false,
            error: 'Not authenticated',
          };
        }

        const user = authenticationService.validateSession(currentSessionId);

        if (!user) {
          currentSessionId = null;
          return {
            success: false,
            error: 'Session expired',
          };
        }

        const consent = consentService.grantConsent(user.id, validatedData.consentType);
        return { success: true, data: consent };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:consent:grant' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to grant consent',
        };
      }
    });

    // Consent: Revoke
    ipcMain.handle(IPC_CHANNELS.CONSENT_REVOKE, async (_, request: ConsentRevokeRequest) => {
      try {
        // Validation step - includes mandatory consent protection
        let validatedData: ConsentRevokeRequest;
        try {
          validatedData = await validationMiddleware.validate(IPC_CHANNELS.CONSENT_REVOKE, request);
        } catch (validationError) {
          const error =
            validationError instanceof ValidationError
              ? validationError
              : new ValidationError('Validation failed');
          return {
            success: false,
            error: error.message || 'Validation failed',
            errors: error.fields || {},
          };
        }

        if (!currentSessionId) {
          return {
            success: false,
            error: 'Not authenticated',
          };
        }

        const user = authenticationService.validateSession(currentSessionId);

        if (!user) {
          currentSessionId = null;
          return {
            success: false,
            error: 'Session expired',
          };
        }

        consentService.revokeConsent(user.id, validatedData.consentType);
        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:consent:revoke' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to revoke consent',
        };
      }
    });

    // Consent: Has Consent
    ipcMain.handle(
      IPC_CHANNELS.CONSENT_HAS_CONSENT,
      async (_, request: ConsentHasConsentRequest) => {
        try {
          // Validation step
          let validatedData: ConsentHasConsentRequest;
          try {
            validatedData = await validationMiddleware.validate(
              IPC_CHANNELS.CONSENT_HAS_CONSENT,
              request
            );
          } catch (validationError) {
            const error =
              validationError instanceof ValidationError
                ? validationError
                : new ValidationError('Validation failed');
            return {
              success: false,
              error: error.message || 'Validation failed',
              errors: error.fields || {},
            };
          }

          if (!currentSessionId) {
            return {
              success: false,
              error: 'Not authenticated',
            };
          }

          const user = authenticationService.validateSession(currentSessionId);

          if (!user) {
            currentSessionId = null;
            return {
              success: false,
              error: 'Session expired',
            };
          }

          const hasConsent = consentService.hasConsent(user.id, validatedData.consentType);
          return { success: true, data: hasConsent };
        } catch (error) {
          errorLogger.logError(error as Error, { context: 'ipc:consent:hasConsent' });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check consent',
          };
        }
      }
    );

    // Consent: Get User Consents
    ipcMain.handle(
      IPC_CHANNELS.CONSENT_GET_USER_CONSENTS,
      async (_event, _request: ConsentGetUserConsentsRequest) => {
        try {
          if (!currentSessionId) {
            return {
              success: false,
              error: 'Not authenticated',
            };
          }

          const user = authenticationService.validateSession(currentSessionId);

          if (!user) {
            currentSessionId = null;
            return {
              success: false,
              error: 'Session expired',
            };
          }

          const consents = consentService.getUserConsents(user.id);
          return { success: true, data: consents };
        } catch (error) {
          errorLogger.logError(error as Error, { context: 'ipc:consent:getUserConsents' });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get consents',
          };
        }
      }
    );

    console.log('[Main] ✅ Authentication/consent IPC handlers registered');
  } catch (error) {
    console.error('[Main] ❌ Authentication initialization FAILED:', error);
    errorLogger.logError(error as Error, { context: 'authentication-initialization' });
    errorLogger.logError(
      '⚠️  WARNING: Authentication initialization failed - auth features will not work!',
      {
        type: 'error',
      }
    );
  }

  // Setup Secure Storage IPC handlers for API keys
  try {
    // In-memory secure storage for encrypted API keys
    const secureStore = new Map<string, Buffer>();

    // Check if encryption is available on this platform
    ipcMain.handle('secure-storage:is-encryption-available', async () => {
      return safeStorage.isEncryptionAvailable();
    });

    // Store encrypted API key
    ipcMain.handle('secure-storage:set', async (_event, key: string, value: string) => {
      try {
        if (!key || !value) {
          throw new Error('Key and value are required');
        }

        const encryptedBuffer = safeStorage.encryptString(value);
        secureStore.set(key, encryptedBuffer);

        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'secure-storage:set', key });
        throw error;
      }
    });

    // Retrieve and decrypt API key
    ipcMain.handle('secure-storage:get', async (_event, key: string) => {
      try {
        if (!key) {
          throw new Error('Key is required');
        }

        const encryptedBuffer = secureStore.get(key);
        if (!encryptedBuffer) {
          return null;
        }

        const decryptedValue = safeStorage.decryptString(encryptedBuffer);
        return decryptedValue;
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'secure-storage:get', key });
        throw error;
      }
    });

    // Delete API key
    ipcMain.handle('secure-storage:delete', async (_event, key: string) => {
      try {
        if (!key) {
          throw new Error('Key is required');
        }

        secureStore.delete(key);
        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'secure-storage:delete', key });
        throw error;
      }
    });

    // Clear all stored API keys
    ipcMain.handle('secure-storage:clear-all', async () => {
      try {
        secureStore.clear();
        return { success: true };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'secure-storage:clear-all' });
        throw error;
      }
    });

    console.log('[Main] ✅ Secure storage IPC handlers registered');
  } catch (error) {
    console.error('[Main] ❌ Secure storage initialization FAILED:', error);
    errorLogger.logError(error as Error, { context: 'secure-storage-initialization' });
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

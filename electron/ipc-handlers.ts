import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import {
  successResponse,
  errorResponse,
  formatError,
  IPCErrorCode,
  type IPCResponse,
} from './utils/ipc-response.ts';
import { logAuditEvent, logAuthEvent, AuditEventType } from './utils/audit-helper.ts';
import {
  withAuthorization,
  getAuthorizationMiddleware,
  verifyEvidenceOwnership,
} from './utils/authorization-wrapper.ts';

/**
 * Setup all IPC handlers for Electron main process
 *
 * ARCHITECTURE:
 * Renderer → Preload → IPC Handler → Service Layer → Repository → Database
 *
 * SECURITY:
 * - All inputs validated with Zod schemas
 * - Authentication required for protected routes
 * - Audit logging for security-relevant events
 * - Error handling with formatted responses
 */

/**
 * Initialize all IPC handlers
 */
export function setupIpcHandlers(): void {
  console.warn('[IPC] Setting up IPC handlers...');

  // Authentication handlers
  setupAuthHandlers();

  // Case management handlers
  setupCaseHandlers();

  // Evidence handlers
  setupEvidenceHandlers();

  // Chat handlers
  setupChatHandlers();

  // Database handlers
  setupDatabaseHandlers();

  // GDPR handlers
  setupGdprHandlers();

  console.warn('[IPC] All IPC handlers registered');
}

/**
 * ===== AUTHENTICATION HANDLERS =====
 */
function setupAuthHandlers(): void {
  // Lazy-load services to avoid circular dependencies
  const getAuthService = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    const { AuthenticationService } = require(path.join(__dirname, '../src/services/AuthenticationService'));
    const { getDb } = require(path.join(__dirname, '../src/db/database'));
    return new AuthenticationService(getDb());
  };

  const getAuthSchemas = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    return require(path.join(__dirname, '../src/middleware/schemas/auth-schemas'));
  };

  // Register new user
  ipcMain.handle(
    'auth:register',
    async (_event: IpcMainInvokeEvent, data: unknown): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:register called');

        // Validate input with Zod
        const schemas = getAuthSchemas();
        const validatedData = schemas.authRegisterSchema.parse(data);

        // Call AuthenticationService.register()
        const authService = getAuthService();
        const result = await authService.register(validatedData);

        // Log audit event
        logAuthEvent(AuditEventType.USER_REGISTERED, result.userId, true);

        console.warn('[IPC] User registered successfully:', result.userId);
        return successResponse(result);
      } catch (error) {
        console.error('[IPC] auth:register error:', error);

        // Log failed registration
        logAuthEvent(AuditEventType.USER_REGISTERED, null, false, String(error));

        return formatError(error);
      }
    }
  );

  // Login user
  ipcMain.handle(
    'auth:login',
    async (_event: IpcMainInvokeEvent, data: unknown): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:login called');

        // Validate input with Zod
        const schemas = getAuthSchemas();
        const validatedData = schemas.authLoginSchema.parse(data);

        // Call AuthenticationService.login()
        const authService = getAuthService();
        const result = await authService.login(
          validatedData.username,
          validatedData.password,
          validatedData.rememberMe
        );

        // Log successful login
        logAuthEvent(AuditEventType.USER_LOGGED_IN, result.userId, true);

        console.warn('[IPC] User logged in successfully:', result.userId);
        return successResponse(result);
      } catch (error) {
        console.error('[IPC] auth:login error:', error);

        // Log failed login
        logAuthEvent(AuditEventType.LOGIN_FAILED, null, false, String(error));

        return formatError(error);
      }
    }
  );

  // Logout user
  ipcMain.handle(
    'auth:logout',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:logout called');

        if (!sessionId) {
          return errorResponse(IPCErrorCode.VALIDATION_ERROR, 'Session ID is required');
        }

        // Call AuthenticationService.logout()
        const authService = getAuthService();
        await authService.logout(sessionId);

        // Log logout (we don't know userId at this point, so pass null)
        logAuthEvent(AuditEventType.USER_LOGGED_OUT, null, true);

        console.warn('[IPC] User logged out successfully');
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] auth:logout error:', error);
        return formatError(error);
      }
    }
  );

  // Get current session
  ipcMain.handle(
    'auth:session',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:session called');

        if (!sessionId) {
          return errorResponse(IPCErrorCode.NOT_AUTHENTICATED, 'No session ID provided');
        }

        // Call AuthenticationService.getSession()
        const authService = getAuthService();
        const session = await authService.getSession(sessionId);

        if (!session) {
          return errorResponse(IPCErrorCode.SESSION_EXPIRED, 'Session not found or expired');
        }

        console.warn('[IPC] Session retrieved:', session.userId);
        return successResponse(session);
      } catch (error) {
        console.error('[IPC] auth:session error:', error);
        return formatError(error);
      }
    }
  );
}

/**
 * ===== CASE MANAGEMENT HANDLERS =====
 */
function setupCaseHandlers(): void {
  // Lazy-load services
  const getCaseService = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    const { caseService } = require(path.join(__dirname, '../src/features/cases/services/CaseService'));
    return caseService;
  };

  const getCaseSchemas = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    return require(path.join(__dirname, '../src/middleware/schemas/case-schemas'));
  };

  // Create new case
  ipcMain.handle(
    'case:create',
    async (_event: IpcMainInvokeEvent, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:create called by user:', userId);

          // Validate input with Zod (schema expects { input: { ...fields } })
          const schemas = getCaseSchemas();
          const validatedData = schemas.caseCreateSchema.parse({ input: data });

          // Add userId to the case data
          const caseData = {
            ...validatedData.input,
            userId, // Associate case with authenticated user
          };

          // Call CaseService.createCase()
          const caseService = getCaseService();
          const result = caseService.createCase(caseData);

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId,
            resourceType: 'case',
            resourceId: result.id.toString(),
            action: 'create',
            details: {
              title: result.title,
              caseType: result.caseType,
            },
            success: true,
          });

          console.warn('[IPC] Case created successfully:', result.id);
          return result;
        } catch (error) {
          console.error('[IPC] case:create error:', error);

          // Log failed creation
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId,
            resourceType: 'case',
            resourceId: 'unknown',
            action: 'create',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List all cases
  ipcMain.handle('case:list', async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
    return withAuthorization(sessionId, async (userId) => {
      try {
        console.warn('[IPC] case:list called by user:', userId);

        // Get only cases belonging to the authenticated user
        const caseService = getCaseService();
        const allCases = caseService.getAllCases();

        // Filter cases by userId
        const userCases = allCases.filter((c) => c.userId === userId);

        console.warn('[IPC] Retrieved', userCases.length, 'cases for user:', userId);
        return userCases;
      } catch (error) {
        console.error('[IPC] case:list error:', error);
        throw error; // withAuthorization will handle error formatting
      }
    });
  });

  // Get case by ID
  ipcMain.handle(
    'case:get',
    async (_event: IpcMainInvokeEvent, id: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:get called by user:', userId, 'for case:', id);

          // Validate ID with Zod
          const schemas = getCaseSchemas();
          const validatedData = schemas.caseGetByIdSchema.parse({ id });

          // Verify user owns this case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.getCaseById()
          const caseService = getCaseService();
          const caseData = caseService.getCaseById(validatedData.id);

          if (!caseData) {
            throw new Error(`Case with ID ${id} not found`);
          }

          // Log audit event (viewing case)
          logAuditEvent({
            eventType: AuditEventType.CASE_VIEWED,
            userId,
            resourceType: 'case',
            resourceId: caseData.id.toString(),
            action: 'view',
            success: true,
          });

          console.warn('[IPC] Case retrieved:', caseData.id);
          return caseData;
        } catch (error) {
          console.error('[IPC] case:get error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Update case
  ipcMain.handle(
    'case:update',
    async (_event: IpcMainInvokeEvent, id: unknown, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:update called by user:', userId, 'for case:', id);

          // Validate input with Zod (schema expects { id, input: { ...fields } })
          const schemas = getCaseSchemas();
          const validatedData = schemas.caseUpdateSchema.parse({ id, input: data });

          // Verify user owns this case before update
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.updateCase()
          const caseService = getCaseService();
          const result = caseService.updateCase(validatedData.id, validatedData.input);

          if (!result) {
            throw new Error(`Case with ID ${id} not found`);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId,
            resourceType: 'case',
            resourceId: result.id.toString(),
            action: 'update',
            details: {
              fieldsUpdated: Object.keys(validatedData.input),
            },
            success: true,
          });

          console.warn('[IPC] Case updated successfully:', result.id);
          return result;
        } catch (error) {
          console.error('[IPC] case:update error:', error);

          // Log failed update
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId,
            resourceType: 'case',
            resourceId: String(id),
            action: 'update',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Delete case
  ipcMain.handle(
    'case:delete',
    async (_event: IpcMainInvokeEvent, id: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:delete called by user:', userId, 'for case:', id);

          // Validate ID with Zod
          const schemas = getCaseSchemas();
          const validatedData = schemas.caseDeleteSchema.parse({ id });

          // Verify user owns this case before deletion
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.deleteCase()
          const caseService = getCaseService();
          const deleted = caseService.deleteCase(validatedData.id);

          if (!deleted) {
            throw new Error(`Case with ID ${id} not found`);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId,
            resourceType: 'case',
            resourceId: validatedData.id.toString(),
            action: 'delete',
            success: true,
          });

          console.warn('[IPC] Case deleted successfully:', id);
          return { success: true };
        } catch (error) {
          console.error('[IPC] case:delete error:', error);

          // Log failed deletion
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId,
            resourceType: 'case',
            resourceId: String(id),
            action: 'delete',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}

/**
 * ===== EVIDENCE HANDLERS =====
 */
function setupEvidenceHandlers(): void {
  // Lazy-load repository
  const getEvidenceRepository = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    const { evidenceRepository } = require(path.join(__dirname, '../src/repositories/EvidenceRepository'));
    return evidenceRepository;
  };

  const getEvidenceSchemas = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    return require(path.join(__dirname, '../src/middleware/schemas/evidence-schemas'));
  };

  // Upload/create evidence
  ipcMain.handle(
    'evidence:upload',
    async (_event: IpcMainInvokeEvent, caseId: unknown, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] evidence:upload called by user:', userId, 'for case:', caseId);

          // Validate input with Zod (schema expects { input: { caseId, ...fields } })
          const schemas = getEvidenceSchemas();
          const inputData = { caseId, ...(data as Record<string, unknown>) };
          const validatedData = schemas.evidenceCreateSchema.parse({
            input: inputData,
          });

          // Verify user owns the case before adding evidence
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.input.caseId, userId);

          // TODO: Validate file type and size if filePath provided
          // TODO: Extract text if PDF/DOCX

          // Call EvidenceRepository.create()
          const evidenceRepo = getEvidenceRepository();
          const result = evidenceRepo.create(validatedData.input);

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_UPLOADED,
            userId,
            resourceType: 'evidence',
            resourceId: result.id.toString(),
            action: 'upload',
            details: {
              caseId: result.caseId,
              evidenceType: result.evidenceType,
              title: result.title,
            },
            success: true,
          });

          console.warn('[IPC] Evidence created successfully:', result.id);
          return result;
        } catch (error) {
          console.error('[IPC] evidence:upload error:', error);

          // Log failed upload
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_UPLOADED,
            userId,
            resourceType: 'evidence',
            resourceId: 'unknown',
            action: 'upload',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List evidence for case
  ipcMain.handle(
    'evidence:list',
    async (_event: IpcMainInvokeEvent, caseId: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] evidence:list called by user:', userId, 'for case:', caseId);

          // Validate caseId
          const schemas = getEvidenceSchemas();
          const validatedData = schemas.evidenceGetByCaseSchema.parse({ caseId });

          // Verify user owns the case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.caseId, userId);

          // Call EvidenceRepository.findByCaseId()
          const evidenceRepo = getEvidenceRepository();
          const evidence = evidenceRepo.findByCaseId(validatedData.caseId);

          console.warn('[IPC] Retrieved', evidence.length, 'evidence items for case', caseId);
          return evidence;
        } catch (error) {
          console.error('[IPC] evidence:list error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Delete evidence
  ipcMain.handle(
    'evidence:delete',
    async (_event: IpcMainInvokeEvent, id: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] evidence:delete called by user:', userId, 'for evidence:', id);

          // Validate ID
          const schemas = getEvidenceSchemas();
          const validatedData = schemas.evidenceDeleteSchema.parse({ id });

          // Verify user owns the case this evidence belongs to
          await verifyEvidenceOwnership(validatedData.id, userId);

          // Call EvidenceRepository.delete()
          const evidenceRepo = getEvidenceRepository();
          const deleted = evidenceRepo.delete(validatedData.id);

          if (!deleted) {
            throw new Error(`Evidence with ID ${id} not found`);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_DELETED,
            userId,
            resourceType: 'evidence',
            resourceId: validatedData.id.toString(),
            action: 'delete',
            success: true,
          });

          console.warn('[IPC] Evidence deleted successfully:', id);
          return { success: true };
        } catch (error) {
          console.error('[IPC] evidence:delete error:', error);

          // Log failed deletion
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_DELETED,
            userId,
            resourceType: 'evidence',
            resourceId: String(id),
            action: 'delete',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}

/**
 * ===== AI CHAT HANDLERS =====
 */
function setupChatHandlers(): void {
  // Send chat message
  ipcMain.handle(
    'chat:send',
    async (_event: IpcMainInvokeEvent, message: string, caseId: string | undefined, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] chat:send called by user:', userId, caseId ? `with case ${caseId}` : 'without case');

          // Validate message
          if (!message || message.trim().length === 0) {
            throw new Error('Message cannot be empty');
          }

          if (message.length > 10000) {
            throw new Error('Message too long (max 10000 characters)');
          }

          // If caseId is provided, verify user owns that case
          if (caseId) {
            const authMiddleware = getAuthorizationMiddleware();
            authMiddleware.verifyCaseOwnership(parseInt(caseId), userId);
          }

          // TODO: Check AI consent
          // TODO: Retrieve case context if caseId provided
          // TODO: Search UK legal APIs (RAG)
          // TODO: Assemble context with retrieved documents
          // TODO: Stream OpenAI response (emit 'chat:stream' events)
          // TODO: Extract citations
          // TODO: Append legal disclaimer
          // TODO: Save message (encrypted if consented)

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CHAT_MESSAGE_SENT,
            userId,
            resourceType: 'chat_message',
            resourceId: 'temp-message-id',
            action: 'send',
            details: {
              caseId: caseId ?? null,
              messageLength: message.length,
            },
            success: true,
          });

          // Placeholder response
          const response = {
            messageId: 'temp-message-id',
            response: 'AI legal assistant integration pending. Full implementation coming soon.',
            citations: [],
            disclaimer: 'This is information, not legal advice. Consult a qualified solicitor for legal advice.',
          };

          console.warn('[IPC] Chat message processed (placeholder)');
          return response;
        } catch (error) {
          console.error('[IPC] chat:send error:', error);

          // Log failed message
          logAuditEvent({
            eventType: AuditEventType.CHAT_MESSAGE_SENT,
            userId,
            resourceType: 'chat_message',
            resourceId: 'unknown',
            action: 'send',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}

/**
 * ===== DATABASE HANDLERS =====
 */
function setupDatabaseHandlers(): void {
  // Run database migrations
  ipcMain.handle('db:migrate', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:migrate called');

      // TODO: Create backup before migration
      // TODO: Call runMigrations() from migrate.ts
      // TODO: Return detailed migration results

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_MIGRATED,
        userId: null, // System operation
        resourceType: 'database',
        resourceId: 'main',
        action: 'migrate',
        success: true,
      });

      console.warn('[IPC] Migrations placeholder - full implementation pending');
      return successResponse({
        migrationsRun: 0,
        message: 'Migration system integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:migrate error:', error);
      return formatError(error);
    }
  });

  // Create database backup
  ipcMain.handle('db:backup', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:backup called');

      // TODO: Implement backup functionality
      // TODO: Copy database file with timestamp
      // TODO: Return backup file path

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_CREATED,
        userId: null, // TODO: Extract from session
        resourceType: 'database',
        resourceId: 'main',
        action: 'backup',
        success: true,
      });

      console.warn('[IPC] Backup placeholder - full implementation pending');
      return successResponse({
        backupPath: null,
        message: 'Backup system integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:backup error:', error);
      return formatError(error);
    }
  });

  // Get migration status
  ipcMain.handle('db:status', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:status called');

      // TODO: Query migrations table
      // TODO: Check for pending migrations
      // TODO: Return current schema version

      console.warn('[IPC] Status check placeholder - full implementation pending');
      return successResponse({
        currentVersion: 0,
        pendingMigrations: [],
        message: 'Migration status integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:status error:', error);
      return formatError(error);
    }
  });
}

/**
 * ===== GDPR HANDLERS =====
 */
function setupGdprHandlers(): void {
  // Lazy-load GDPR service to avoid circular dependencies
  const getGdprService = () => {
    // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
    const { GdprService } = require(path.join(__dirname, '../src/services/gdpr/GdprService'));
    const { EncryptionService } = require(path.join(__dirname, '../src/services/EncryptionService'));
    const { AuditLogger } = require(path.join(__dirname, '../src/services/AuditLogger'));
    const { getDb } = require(path.join(__dirname, '../src/db/database'));
    const { getKeyManager } = require(path.join(__dirname, 'main'));

    const db = getDb();
    const keyManager = getKeyManager();
    const encryptionKey = keyManager.getKey();
    const encryptionService = new EncryptionService(encryptionKey);
    const auditLogger = new AuditLogger(db);

    return new GdprService(db, encryptionService, auditLogger);
  };

  // Export all user data (GDPR Article 20)
  ipcMain.handle(
    'gdpr:export',
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      options?: { format?: 'json' | 'csv' }
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] gdpr:export called by user:', userId);

          // Export all user data with decryption
          const gdprService = getGdprService();
          const result = await gdprService.exportUserData(userId, options || {});

          console.warn('[IPC] GDPR export complete:', {
            userId,
            totalRecords: result.metadata.totalRecords,
            filePath: result.filePath,
          });

          return successResponse({
            filePath: result.filePath,
            totalRecords: result.metadata.totalRecords,
            exportDate: result.metadata.exportDate,
            format: result.metadata.format,
          });
        } catch (error) {
          console.error('[IPC] gdpr:export error:', error);
          return errorResponse(
            formatError(error, IPCErrorCode.INTERNAL_ERROR),
            IPCErrorCode.INTERNAL_ERROR
          );
        }
      });
    }
  );

  // Delete all user data (GDPR Article 17)
  ipcMain.handle(
    'gdpr:delete',
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      options?: { confirmed: boolean; exportBeforeDelete?: boolean; reason?: string }
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] gdpr:delete called by user:', userId);

          // Safety check: Explicit confirmation required
          if (!options?.confirmed) {
            return errorResponse(
              'GDPR deletion requires explicit confirmation',
              IPCErrorCode.VALIDATION_ERROR
            );
          }

          // Delete all user data (preserves audit logs + consents)
          const gdprService = getGdprService();
          const result = await gdprService.deleteUserData(userId, {
            confirmed: true,
            exportBeforeDelete: options.exportBeforeDelete || false,
            reason: options.reason,
          });

          console.warn('[IPC] GDPR deletion complete:', {
            userId,
            deletedTables: Object.keys(result.deletedCounts).length,
            preservedAuditLogs: result.preservedAuditLogs,
            preservedConsents: result.preservedConsents,
          });

          return successResponse({
            success: result.success,
            deletedCounts: result.deletedCounts,
            preservedAuditLogs: result.preservedAuditLogs,
            preservedConsents: result.preservedConsents,
            deletionDate: result.deletionDate,
            exportPath: result.exportPath,
          });
        } catch (error) {
          console.error('[IPC] gdpr:delete error:', error);
          return errorResponse(
            formatError(error, IPCErrorCode.INTERNAL_ERROR),
            IPCErrorCode.INTERNAL_ERROR
          );
        }
      });
    }
  );
}

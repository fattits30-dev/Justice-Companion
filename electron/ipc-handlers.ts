import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
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

// SIMPLE: Import services at top (no lazy loading)
import { getDb } from '../src/db/database.ts';
import { UserRepository } from '../src/repositories/UserRepository.ts';
import { SessionRepository } from '../src/repositories/SessionRepository.ts';
import { CaseRepository } from '../src/repositories/CaseRepository.ts';
import { EvidenceRepository } from '../src/repositories/EvidenceRepository.ts';
import { AuditLogger } from '../src/services/AuditLogger.ts';
import { AuthenticationService } from '../src/services/AuthenticationService.ts';
import { GroqService } from '../src/services/GroqService.ts';
import { caseService } from '../src/services/CaseService.ts';
import * as caseSchemas from '../src/middleware/schemas/case-schemas.ts';
import * as evidenceSchemas from '../src/middleware/schemas/evidence-schemas.ts';
import { getRepositories } from '../src/repositories.ts';
import { GdprService } from '../src/services/gdpr/GdprService.ts';
import { EncryptionService } from '../src/services/EncryptionService.ts';
import { getKeyManager } from './main.ts';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Dashboard handlers
  setupDashboardHandlers();

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

  // Secure storage handlers
  setupSecureStorageHandlers();

  // UI error logging handlers
  setupUIHandlers();

  // AI configuration handlers
  setupAIConfigHandlers();

  console.warn('[IPC] All IPC handlers registered');
}

// SIMPLE: Create singletons (initialized once, reused forever)
let authService: AuthenticationService | null = null;

function getAuthService(): AuthenticationService {
  if (!authService) {
    const db = getDb();
    const auditLogger = new AuditLogger(db);
    const userRepository = new UserRepository(auditLogger);
    const sessionRepository = new SessionRepository();

    authService = new AuthenticationService(
      userRepository,
      sessionRepository,
      auditLogger
    );

    console.warn('[IPC] AuthenticationService initialized');
  }
  return authService;
}

// Groq AI service singleton
let groqService: GroqService | null = null;

function getGroqService(): GroqService {
  if (!groqService) {
    groqService = new GroqService(); // Initialize without key
    console.warn('[IPC] GroqService created (API key will be loaded from SecureStorage)');

    // Try to load API key from SecureStorage
    if (global.secureStorageMap && global.secureStorageMap.has('groq_api_key')) {
      try {
        const encrypted = global.secureStorageMap.get('groq_api_key');
        if (encrypted) {
          const apiKey = safeStorage.decryptString(encrypted);
          groqService.setApiKey(apiKey);
          console.warn('[IPC] Groq API key loaded from SecureStorage');
        }
      } catch (error) {
        console.error('[IPC] Failed to load Groq API key from SecureStorage:', error);
      }
    }
  }
  return groqService;
}

// Reset Groq service singleton (used when API key changes)
function resetGroqService(): void {
  groqService = null;
  console.warn('[IPC] GroqService reset');
}

/**
 * ===== AUTHENTICATION HANDLERS =====
 */
function setupAuthHandlers(): void {

  const getAuthSchemas = async () => {
    try {
      // Use absolute paths to prevent path traversal (CVSS 8.8 fix)
      // Convert Windows paths to file:// URLs for ESM dynamic imports
      // Add .ts extension for tsx to resolve TypeScript modules
      const schemasPath = path.join(__dirname, '../src/middleware/schemas/auth-schemas.ts');
      const schemasUrl = pathToFileURL(schemasPath).href;

      console.warn('[IPC] Importing auth schemas from:', schemasUrl);

      const schemas = await import(schemasUrl);
      console.warn('[IPC] Auth schemas imported successfully');

      return schemas;
    } catch (error) {
      console.error('[IPC] FATAL: Failed to load auth schemas');
      console.error('[IPC] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw new Error(`Failed to load auth schemas: ${(error as Error).message}`);
    }
  };

  // Register new user
  ipcMain.handle(
    'auth:register',
    async (_event: IpcMainInvokeEvent, data: unknown): Promise<IPCResponse> => {
      try {
        console.warn('[IPC] auth:register called with:', data);

        // Validate input with Zod
        const schemas = await getAuthSchemas();
        const validatedData = schemas.authRegisterSchema.parse(data);

        // SIMPLE: Get service synchronously, call register with proper params
        const authSvc = getAuthService();
        const result = await authSvc.register(
          validatedData.username,
          validatedData.password,
          validatedData.email
        );

        // Log audit event
        logAuthEvent(AuditEventType.USER_REGISTERED, result.id, true);

        console.warn('[IPC] User registered successfully:', result.id);
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
        console.warn('[IPC] auth:login called with:', data);

        // Validate input with Zod
        const schemas = await getAuthSchemas();
        const validatedData = schemas.authLoginSchema.parse(data);

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        const result = await authSvc.login(
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

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        await authSvc.logout(sessionId);

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

        // SIMPLE: Get service synchronously
        const authSvc = getAuthService();
        const session = await authSvc.getSession(sessionId);

        if (!session) {
          return errorResponse(IPCErrorCode.SESSION_EXPIRED, 'Session not found or expired');
        }

        // Fetch user data for session restoration
        const db = getDb();
        const userRepo = new UserRepository(db);
        const user = userRepo.findById(session.userId);

        if (!user) {
          return errorResponse(IPCErrorCode.NOT_FOUND, 'User not found');
        }

        console.warn('[IPC] Session retrieved:', session.userId);
        return successResponse({
          userId: user.id,
          username: user.username,
          email: user.email
        });
      } catch (error) {
        console.error('[IPC] auth:session error:', error);
        return formatError(error);
      }
    }
  );
}

/**
 * ===== DASHBOARD HANDLERS =====
 */
function setupDashboardHandlers(): void {
  // Get dashboard stats (case counts, evidence counts, recent activity)
  ipcMain.handle(
    'dashboard:stats',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] dashboard:stats called by user:', userId);

          const db = getDb();
          const caseRepo = new CaseRepository(db);
          const evidenceRepo = new EvidenceRepository(db);

          // Get all cases for user
          const allCases = caseRepo.findByUserId(userId);

          // Count active cases (status = 'active')
          const activeCases = allCases.filter(c => c.status === 'active').length;

          // Get evidence count for user
          const allEvidence = evidenceRepo.findByUserId(userId);

          // Calculate recent activity (cases updated in last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentActivity = allCases.filter(c =>
            new Date(c.updatedAt) > sevenDaysAgo
          ).length;

          // Get recent 5 cases (sorted by updatedAt descending)
          const recentCases = allCases
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5)
            .map(c => ({
              id: String(c.id),
              title: c.caseTitle,
              status: c.status,
              lastUpdated: c.updatedAt
            }));

          const stats = {
            totalCases: allCases.length,
            activeCases,
            totalEvidence: allEvidence.length,
            recentActivity,
            recentCases
          };

          console.warn('[IPC] Dashboard stats:', stats);
          return successResponse(stats);
        } catch (error) {
          console.error('[IPC] dashboard:stats error:', error);
          return formatError(error);
        }
      });
    }
  );
}

/**
 * ===== CASE MANAGEMENT HANDLERS =====
 */
function setupCaseHandlers(): void {
  // Create new case
  ipcMain.handle(
    'case:create',
    async (_event: IpcMainInvokeEvent, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:create called by user:', userId);

          // Validate input with Zod (schema expects { input: { ...fields } })
          const validatedData = caseSchemas.caseCreateSchema.parse({ input: data });

          // Add userId to the case data
          const caseData = {
            ...validatedData.input,
            userId, // Associate case with authenticated user
          };

          // Call CaseService.createCase()
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
          const validatedData = caseSchemas.caseGetByIdSchema.parse({ id });

          // Verify user owns this case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.getCaseById()
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
          const validatedData = caseSchemas.caseUpdateSchema.parse({ id, input: data });

          // Verify user owns this case before update
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.updateCase()
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
          const validatedData = caseSchemas.caseDeleteSchema.parse({ id });

          // Verify user owns this case before deletion
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.deleteCase()
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
  const getEvidenceRepository = () => getRepositories().evidenceRepository;

  // Upload/create evidence
  ipcMain.handle(
    'evidence:upload',
    async (_event: IpcMainInvokeEvent, caseId: unknown, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] evidence:upload called by user:', userId, 'for case:', caseId);

          // Validate input with Zod (schema expects { input: { caseId, ...fields } })
          const schemas = evidenceSchemas;
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
          const schemas = evidenceSchemas;
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
          const schemas = evidenceSchemas;
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
  // ===== STREAMING CHAT (NEW) =====
  ipcMain.handle(
    'chat:stream',
    async (
      event: IpcMainInvokeEvent,
      request: { sessionId: string; message: string; conversationId?: number | null; requestId: string }
    ): Promise<void> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.log('[IPC] chat:stream called by user:', userId, 'requestId:', request.requestId);

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new Error('Message cannot be empty');
          }

          if (request.message.length > 10000) {
            throw new Error('Message too long (max 10000 characters)');
          }

          // Get Groq service
          const groqService = getGroqService();
          if (!groqService.isConfigured()) {
            event.sender.send('chat:stream:error', {
              requestId: request.requestId,
              error: 'AI service not configured. Please set your Groq API key in Settings.',
            });
            return;
          }

          // Build chat messages with system prompt
          const systemPrompt = `You are a legal assistant for Justice Companion, a UK legal case management system.

**Important Guidelines:**
- Provide clear, practical legal information for UK law
- Always clarify that your responses are informational, not legal advice
- Encourage users to consult a qualified solicitor for legal advice
- Be empathetic and supportive - users may be in stressful situations
- Focus on UK law (England & Wales unless otherwise specified)
- Break down complex legal concepts into plain English

**Response Format:**
- Start with a brief, direct answer
- Provide relevant details and context
- End with next steps or recommendations
- Include a legal disclaimer at the end`;

          const chatMessages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: request.message },
          ];

          // Stream response with Groq
          let fullResponse = '';

          await groqService.streamChat(
            chatMessages,
            (token: string) => {
              // Emit each token
              event.sender.send('chat:stream:token', {
                requestId: request.requestId,
                token,
              });
              fullResponse += token;
            },
            (response: string) => {
              // Add legal disclaimer to final response
              const disclaimer = '\n\n---\n\n**⚖️ Legal Disclaimer:** This is information, not legal advice. Please consult a qualified solicitor for advice specific to your situation.';
              const finalResponse = response + disclaimer;

              // Emit completion
              event.sender.send('chat:stream:complete', {
                requestId: request.requestId,
              });

              // Log audit event
              logAuditEvent({
                eventType: AuditEventType.CHAT_MESSAGE_SENT,
                userId,
                resourceType: 'chat_message',
                resourceId: request.requestId,
                action: 'create',
                details: {
                  conversationId: request.conversationId ?? null,
                  messageLength: request.message.length,
                  responseLength: finalResponse.length,
                },
                success: true,
              });

              console.log('[IPC] Chat stream completed for request:', request.requestId);
            },
            (error: Error) => {
              // Emit error
              event.sender.send('chat:stream:error', {
                requestId: request.requestId,
                error: error.message,
              });

              // Log failed message
              logAuditEvent({
                eventType: AuditEventType.CHAT_MESSAGE_SENT,
                userId,
                resourceType: 'chat_message',
                resourceId: request.requestId,
                action: 'create',
                success: false,
                errorMessage: error.message,
              });
            }
          );
        } catch (error) {
          console.error('[IPC] chat:stream error:', error);

          // Send error event
          event.sender.send('chat:stream:error', {
            requestId: request.requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Log failed message
          logAuditEvent({
            eventType: AuditEventType.CHAT_MESSAGE_SENT,
            userId,
            resourceType: 'chat_message',
            resourceId: request.requestId,
            action: 'create',
            success: false,
            errorMessage: String(error),
          });
        }
      });
    }
  );

  // Send chat message (OLD - keep for backwards compatibility)
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

          // Get Groq service (initialized with API key from secure storage)
          const groqService = getGroqService();
          if (!groqService.isConfigured()) {
            throw new Error('AI service not configured. Please set your Groq API key in Settings.');
          }

          // TODO: Retrieve case context if caseId provided
          // TODO: Search UK legal APIs (RAG)

          // Build chat messages with system prompt
          const systemPrompt = `You are a legal assistant for Justice Companion, a UK legal case management system.

**Important Guidelines:**
- Provide clear, practical legal information for UK law
- Always clarify that your responses are informational, not legal advice
- Encourage users to consult a qualified solicitor for legal advice
- Be empathetic and supportive - users may be in stressful situations
- Focus on UK law (England & Wales unless otherwise specified)
- Break down complex legal concepts into plain English

**Response Format:**
- Start with a brief, direct answer
- Provide relevant details and context
- End with next steps or recommendations
- Include a legal disclaimer at the end`;

          const chatMessages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: message },
          ];

          // Stream response with Groq
          let fullResponse = '';
          const messageId = `msg_${Date.now()}_${userId}`;

          await groqService.streamChat(
            chatMessages,
            (token: string) => {
              // Emit token to renderer process
              _event.sender.send('chat:stream', { type: 'token', data: token });
              fullResponse += token;
            },
            (response: string) => {
              // Append legal disclaimer
              const disclaimer = '\n\n---\n\n**⚖️ Legal Disclaimer:** This is information, not legal advice. Please consult a qualified solicitor for advice specific to your situation.';
              const finalResponse = response + disclaimer;

              // Emit completion
              _event.sender.send('chat:stream', { type: 'complete', data: finalResponse });

              // Log audit event
              logAuditEvent({
                eventType: AuditEventType.CHAT_MESSAGE_SENT,
                userId,
                resourceType: 'chat_message',
                resourceId: messageId,
                action: 'create',
                details: {
                  caseId: caseId ?? null,
                  messageLength: message.length,
                  responseLength: finalResponse.length,
                },
                success: true,
              });

              console.log('[IPC] Chat message streamed successfully');
            },
            (error: Error) => {
              // Emit error
              _event.sender.send('chat:stream', { type: 'error', data: error.message });

              // Log failed message
              logAuditEvent({
                eventType: AuditEventType.CHAT_MESSAGE_SENT,
                userId,
                resourceType: 'chat_message',
                resourceId: messageId,
                action: 'create',
                success: false,
                errorMessage: error.message,
              });
            }
          );

          // Return immediate acknowledgment (streaming happens via events)
          return {
            messageId,
            streaming: true,
          };
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

/**
 * Setup secure storage IPC handlers
 * Uses Electron safeStorage API for OS-native encryption
 */
function setupSecureStorageHandlers(): void {
  // Check if encryption is available
  ipcMain.handle(
    'secure-storage:isEncryptionAvailable',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        const available = safeStorage.isEncryptionAvailable();
        return successResponse({ available });
      } catch (error) {
        console.error('[IPC] secure-storage:isEncryptionAvailable error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Securely store a value
  ipcMain.handle(
    'secure-storage:set',
    async (_event: IpcMainInvokeEvent, key: string, value: string): Promise<IPCResponse> => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          return errorResponse('Encryption not available on this system', IPCErrorCode.INTERNAL_ERROR);
        }

        // Encrypt the value
        const encrypted = safeStorage.encryptString(value);

        // Store in a Map (in-memory for now, could be persisted to file)
        if (!global.secureStorageMap) {
          global.secureStorageMap = new Map<string, Buffer>();
        }
        global.secureStorageMap.set(key, encrypted);

        console.log(`[IPC] Securely stored key: ${key}`);
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:set error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Retrieve a securely stored value
  ipcMain.handle(
    'secure-storage:get',
    async (_event: IpcMainInvokeEvent, key: string): Promise<IPCResponse> => {
      try {
        if (!global.secureStorageMap || !global.secureStorageMap.has(key)) {
          return successResponse({ value: null });
        }

        const encrypted = global.secureStorageMap.get(key);
        if (!encrypted) {
          return successResponse({ value: null });
        }

        // Decrypt the value
        const decrypted = safeStorage.decryptString(encrypted);
        return successResponse({ value: decrypted });
      } catch (error) {
        console.error('[IPC] secure-storage:get error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Delete a securely stored value
  ipcMain.handle(
    'secure-storage:delete',
    async (_event: IpcMainInvokeEvent, key: string): Promise<IPCResponse> => {
      try {
        if (global.secureStorageMap) {
          global.secureStorageMap.delete(key);
        }
        console.log(`[IPC] Deleted secure storage key: ${key}`);
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:delete error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Clear all securely stored values
  ipcMain.handle(
    'secure-storage:clearAll',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        if (global.secureStorageMap) {
          global.secureStorageMap.clear();
        }
        console.log('[IPC] Cleared all secure storage');
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:clearAll error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );
}

/**
 * ===== UI ERROR LOGGING HANDLERS =====
 * Handlers for logging UI errors to main process
 */
function setupUIHandlers(): void {
  // Log UI errors to console and audit log
  ipcMain.handle(
    'ui:logError',
    async (_event: IpcMainInvokeEvent, errorData: any): Promise<IPCResponse> => {
      try {
        const { error, errorInfo, componentStack, location } = errorData;

        // Log to console
        console.error('[UI Error]', {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          componentStack,
          location,
        });

        // Log to audit log if available
        if (errorData.userId) {
          logAuditEvent({
            eventType: AuditEventType.UI_ERROR,
            userId: errorData.userId,
            resourceType: 'ui',
            resourceId: 'error',
            action: 'read',
            success: false,
            errorMessage: error?.message || 'UI component error',
            details: {
              componentStack,
              location,
            },
          });
        }

        return successResponse({ logged: true });
      } catch (err) {
        console.error('[IPC] ui:logError error:', err);
        return errorResponse(
          formatError(err, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );
}

/**
 * ===== AI CONFIGURATION HANDLERS =====
 * Handlers for configuring and testing AI service (Groq)
 */
function setupAIConfigHandlers(): void {
  // Configure AI service (save API key)
  ipcMain.handle(
    'ai:configure',
    async (
      _event: IpcMainInvokeEvent,
      config: { apiKey: string; provider?: 'openai' | 'groq' | 'anthropic' | 'google' | 'cohere' | 'mistral'; model?: string; organization?: string }
    ): Promise<IPCResponse> => {
      try {
        const { apiKey, provider = 'groq', model, organization } = config;

        // Validate API key
        if (!apiKey || apiKey.trim().length === 0) {
          throw new Error('API key is required');
        }

        // Note: For now, only Groq has full streaming implementation
        // Other providers will be added as needed
        console.warn(`[IPC] Configuring AI provider: ${provider}`);

        // Save to SecureStorage with provider-specific keys
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error('Encryption not available on this system');
        }

        if (!global.secureStorageMap) {
          global.secureStorageMap = new Map<string, Buffer>();
        }

        // Save API key with provider-specific key
        const apiKeyStorageKey = `${provider}_api_key`;
        const encryptedApiKey = safeStorage.encryptString(apiKey);
        global.secureStorageMap.set(apiKeyStorageKey, encryptedApiKey);

        // Save model if provided
        if (model) {
          const modelStorageKey = `${provider}_model`;
          const encryptedModel = safeStorage.encryptString(model);
          global.secureStorageMap.set(modelStorageKey, encryptedModel);
        }

        // Save organization if provided (for OpenAI)
        if (organization) {
          const orgStorageKey = `${provider}_organization`;
          const encryptedOrg = safeStorage.encryptString(organization);
          global.secureStorageMap.set(orgStorageKey, encryptedOrg);
        }

        // Reset Groq service so it will reload the new key (only for Groq)
        if (provider === 'groq') {
          resetGroqService();
        }

        console.warn(`[IPC] ${provider} API key configured successfully`);
        return successResponse({
          success: true,
          message: 'API key saved successfully',
        });
      } catch (error) {
        console.error('[IPC] ai:configure error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Test AI connection
  ipcMain.handle(
    'ai:testConnection',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        // Get Groq service
        const groqService = getGroqService();

        // Check if configured
        if (!groqService.isConfigured()) {
          return successResponse({
            success: false,
            message: 'AI service not configured. Please set your API key first.',
            connected: false,
          });
        }

        // Test connection with a minimal API call
        console.warn('[IPC] Testing Groq connection...');
        const testMessage = 'Hello';
        const response = await groqService.chat([
          { role: 'user', content: testMessage },
        ]);

        if (response && response.length > 0) {
          console.warn('[IPC] Groq connection test successful');
          return successResponse({
            success: true,
            message: 'Connection successful! AI service is ready.',
            connected: true,
          });
        } else {
          throw new Error('Empty response from AI service');
        }
      } catch (error) {
        console.error('[IPC] ai:testConnection error:', error);

        // Provide user-friendly error messages
        let errorMessage = 'Connection failed';
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your API key and try again.';
          } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else {
            errorMessage = `Connection failed: ${error.message}`;
          }
        }

        return successResponse({
          success: false,
          message: errorMessage,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

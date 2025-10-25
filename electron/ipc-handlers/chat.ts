import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { type IPCResponse } from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import { withAuthorization, getAuthorizationMiddleware } from '../utils/authorization-wrapper.ts';
import { GroqService } from '../../src/services/GroqService.ts';
import {
  RequiredFieldError,
  ValidationError,
  AINotConfiguredError,
} from '../../src/errors/DomainErrors.ts';

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
export function resetGroqService(): void {
  groqService = null;
  console.warn('[IPC] GroqService reset');
}

/**
 * ===== AI CHAT HANDLERS =====
 * Channels: chat:stream, chat:send
 * Total: 2 channels
 */
export function setupChatHandlers(): void {
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
            throw new RequiredFieldError('message');
          }

          if (request.message.length > 10000) {
            throw new ValidationError('message', 'Message too long (max 10000 characters)');
          }

          // Get Groq service
          const groqService = getGroqService();
          if (!groqService.isConfigured()) {
            const aiError = new AINotConfiguredError('Groq');
            event.sender.send('chat:stream:error', {
              requestId: request.requestId,
              error: aiError.message,
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

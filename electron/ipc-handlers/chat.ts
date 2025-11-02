import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { GroqService } from '../../src/services/GroqService.ts';
import {
  RequiredFieldError,
  ValidationError,
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
          console.warn('[IPC] chat:stream called by user:', userId, 'requestId:', request.requestId);

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError('message');
          }

          if (request.message.length > 10000) {
            throw new ValidationError('message', 'Message too long (max 10000 characters)');
          }

          // Get Groq service
          const groqService = getGroqService();

          // Stream response from Groq
          const stream = await groqService.streamChatCompletion(request.message);

          // Send streaming response back to renderer
          for await (const chunk of stream) {
            event.sender.send('chat:stream:data', {
              data: chunk.choices[0]?.delta?.content || '',
              done: false,
            });
          }

          // Signal end of stream
          event.sender.send('chat:stream:data', {
            data: '',
            done: true,
          });

          // Log audit event
          // logAuditEvent(AuditEventType.CHAT_STREAM, userId, { sessionId: request.sessionId, requestId: request.requestId });
        } catch (error) {
          console.error('[IPC] Error in chat:stream:', error);
          
          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            event.sender.send('chat:stream:error', {
              message: error.message,
              code: error.constructor.name,
            });
          } else {
            event.sender.send('chat:stream:error', {
              message: 'An unexpected error occurred',
              code: 'UnknownError',
            });
          }
        }
      });
    }
  );

  // ===== REGULAR CHAT =====
  ipcMain.handle(
    'chat:send',
    async (
      event: IpcMainInvokeEvent,
      request: { sessionId: string; message: string; conversationId?: number | null; requestId: string }
    ): Promise<IPCResponse<string>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn('[IPC] chat:send called by user:', userId, 'requestId:', request.requestId);

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError('message');
          }

          if (request.message.length > 10000) {
            throw new ValidationError('message', 'Message too long (max 10000 characters)');
          }

          // Get Groq service
          const groqService = getGroqService();

          // Get response from Groq
          const response = await groqService.getChatCompletion(request.message);

          // Log audit event
          // logAuditEvent(AuditEventType.CHAT_SEND, userId, { sessionId: request.sessionId, requestId: request.requestId });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          console.error('[IPC] Error in chat:send:', error);
          
          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          } else {
            return {
              success: false,
              error: 'An unexpected error occurred',
            };
          }
        }
      });
    }
  );
}
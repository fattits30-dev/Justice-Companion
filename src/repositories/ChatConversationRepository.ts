import { getDb } from '../db/database';
import type {
  ChatConversation,
  ChatMessage,
  CreateConversationInput,
  CreateMessageInput,
  ConversationWithMessages,
} from '../models/ChatConversation';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';
import { errorLogger } from '../utils/error-logger';

/**
 * Repository for managing chat conversations with encryption for message content
 *
 * Security:
 * - content and thinking_content fields encrypted using AES-256-GCM
 * - Audit logging for message creation and access
 * - PII protection for chat history
 * - Backward compatibility with legacy plaintext messages
 */
class ChatConversationRepository {
  private encryptionService?: EncryptionService;
  private auditLogger?: AuditLogger;
  /**
   * Create a new conversation
   */
  create(input: CreateConversationInput): ChatConversation {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        INSERT INTO chat_conversations (case_id, title)
        VALUES (?, ?)
      `);

      const result = stmt.run(input.caseId ?? null, input.title);

      return this.findById(result.lastInsertRowid as number)!;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.create',
      });
      throw error;
    }
  }

  /**
   * Find conversation by ID
   */
  findById(id: number): ChatConversation | null {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT id, case_id as caseId, title, created_at as createdAt,
               updated_at as updatedAt, message_count as messageCount
        FROM chat_conversations
        WHERE id = ?
      `);

      return (stmt.get(id) as ChatConversation) ?? null;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findById',
      });
      throw error;
    }
  }

  /**
   * Find all conversations (optionally filtered by case)
   */
  findAll(caseId?: number | null): ChatConversation[] {
    const db = getDb();

    try {
      let stmt;

      if (caseId !== undefined) {
        stmt = db.prepare(`
          SELECT id, case_id as caseId, title, created_at as createdAt,
                 updated_at as updatedAt, message_count as messageCount
          FROM chat_conversations
          WHERE case_id ${caseId === null ? 'IS NULL' : '= ?'}
          ORDER BY updated_at DESC
        `);

        return (caseId === null ? stmt.all() : stmt.all(caseId)) as ChatConversation[];
      } else {
        stmt = db.prepare(`
          SELECT id, case_id as caseId, title, created_at as createdAt,
                 updated_at as updatedAt, message_count as messageCount
          FROM chat_conversations
          ORDER BY updated_at DESC
        `);

        return stmt.all() as ChatConversation[];
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findAll',
      });
      throw error;
    }
  }

  /**
   * Get recent conversations for a case (limit 10)
   */
  findRecentByCase(caseId: number | null, limit: number = 10): ChatConversation[] {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT id, case_id as caseId, title, created_at as createdAt,
               updated_at as updatedAt, message_count as messageCount
        FROM chat_conversations
        WHERE case_id ${caseId === null ? 'IS NULL' : '= ?'}
        ORDER BY updated_at DESC
        LIMIT ?
      `);

      return (caseId === null ? stmt.all(limit) : stmt.all(caseId, limit)) as ChatConversation[];
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findRecentByCase',
      });
      throw error;
    }
  }

  /**
   * Get conversation with all its messages
   */
  findWithMessages(conversationId: number): ConversationWithMessages | null {
    const db = getDb();

    try {
      const conversation = this.findById(conversationId);
      if (!conversation) {
        return null;
      }

      const stmt = db.prepare(`
        SELECT id, conversation_id as conversationId, role, content,
               thinking_content as thinkingContent, timestamp, token_count as tokenCount
        FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);

      const messages = stmt.all(conversationId) as ChatMessage[];

      // Decrypt all message content and thinking content
      const decryptedMessages = messages.map((msg) => ({
        ...msg,
        content: this.decryptField(msg.content) || msg.content,
        thinkingContent: this.decryptField(msg.thinkingContent),
      }));

      // Audit: PII accessed (encrypted message content)
      if (decryptedMessages.length > 0) {
        this.auditLogger?.log({
          eventType: 'message.content_access',
          resourceType: 'chat_message',
          resourceId: conversationId.toString(),
          action: 'read',
          details: {
            messageCount: decryptedMessages.length,
            encrypted: true,
          },
          success: true,
        });
      }

      return {
        ...conversation,
        messages: decryptedMessages as unknown as ChatMessage[],
      };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findWithMessages',
      });
      throw error;
    }
  }

  /**
   * Delete conversation and all its messages (CASCADE)
   */
  delete(id: number): void {
    const db = getDb();

    try {
      const stmt = db.prepare('DELETE FROM chat_conversations WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.delete',
      });
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  addMessage(input: CreateMessageInput): ChatMessage {
    const db = getDb();

    try {
      // Encrypt content before INSERT (P0 priority field)
      const encryptedContent = input.content
        ? this.encryptionService?.encrypt(input.content)
        : null;

      const contentToStore = encryptedContent
        ? JSON.stringify(encryptedContent)
        : null;

      // Encrypt thinking_content before INSERT (P1 priority field)
      const encryptedThinkingContent = input.thinkingContent
        ? this.encryptionService?.encrypt(input.thinkingContent)
        : null;

      const thinkingContentToStore = encryptedThinkingContent
        ? JSON.stringify(encryptedThinkingContent)
        : null;

      const stmt = db.prepare(`
        INSERT INTO chat_messages (conversation_id, role, content, thinking_content, token_count)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        input.conversationId,
        input.role,
        contentToStore,
        thinkingContentToStore,
        input.tokenCount ?? null,
      );

      // Get the inserted message
      const msgStmt = db.prepare(`
        SELECT id, conversation_id as conversationId, role, content,
               thinking_content as thinkingContent, timestamp, token_count as tokenCount
        FROM chat_messages
        WHERE id = ?
      `);

      const message = msgStmt.get(result.lastInsertRowid) as ChatMessage;

      // Decrypt before returning
      message.content = this.decryptField(message.content) || message.content;
      message.thinkingContent = this.decryptField(message.thinkingContent);

      // Audit: Message created
      this.auditLogger?.log({
        eventType: 'message.create',
        resourceType: 'chat_message',
        resourceId: message.id.toString(),
        action: 'create',
        details: {
          conversationId: input.conversationId,
          role: input.role,
          contentLength: input.content?.length || 0,
        },
        success: true,
      });

      return message;
    } catch (error) {
      // Audit: Failed message creation
      this.auditLogger?.log({
        eventType: 'message.create',
        resourceType: 'chat_message',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.addMessage',
      });
      throw error;
    }
  }

  /**
   * Decrypt field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or null
   */
  private decryptField(storedValue: string | null | undefined): string | null {
    if (!storedValue) {
      return null;
    }

    // If no encryption service, return as-is (backward compatibility)
    if (!this.encryptionService) {
      return storedValue;
    }

    try {
      // Try to parse as encrypted data
      const encryptedData = JSON.parse(storedValue) as EncryptedData;

      // Verify it's actually encrypted data format
      if (this.encryptionService.isEncrypted(encryptedData)) {
        return this.encryptionService.decrypt(encryptedData);
      }

      // If it's not encrypted format, treat as legacy plaintext
      return storedValue;
    } catch (error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  /**
   * Set encryption service (for dependency injection)
   */
  setEncryptionService(service: EncryptionService): void {
    this.encryptionService = service;
  }

  /**
   * Set audit logger (for dependency injection)
   */
  setAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;
  }
}

export const chatConversationRepository = new ChatConversationRepository();

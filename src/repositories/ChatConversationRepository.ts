import { getDb } from '../db/database.ts';
import type {
  ChatConversation,
  ChatMessage,
  ConversationWithMessages,
  CreateConversationInput,
  CreateMessageInput,
} from '../models/ChatConversation.ts';
import type { AuditLogger } from '../services/AuditLogger.js';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import { errorLogger } from '../utils/error-logger.ts';
import {
  encodeSimpleCursor,
  decodeSimpleCursor,
  type PaginatedResult,
} from '../utils/cursor-pagination.ts';

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
  constructor(
    private encryptionService: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new conversation
   */
  create(input: CreateConversationInput): ChatConversation {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        INSERT INTO chat_conversations (case_id, user_id, title)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(input.caseId ?? null, input.userId, input.title);

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
        SELECT id, case_id as caseId, user_id as userId, title, created_at as createdAt,
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
   * Find all conversations for a user (optionally filtered by case)
   */
  findAll(userId: number, caseId?: number | null): ChatConversation[] {
    const db = getDb();

    try {
      let stmt;

      if (caseId !== undefined) {
        stmt = db.prepare(`
          SELECT id, case_id as caseId, user_id as userId, title, created_at as createdAt,
                 updated_at as updatedAt, message_count as messageCount
          FROM chat_conversations
          WHERE user_id = ? AND case_id ${caseId === null ? 'IS NULL' : '= ?'}
          ORDER BY updated_at DESC
        `);

        return (
          caseId === null ? stmt.all(userId) : stmt.all(userId, caseId)
        ) as ChatConversation[];
      } else {
        stmt = db.prepare(`
          SELECT id, case_id as caseId, user_id as userId, title, created_at as createdAt,
                 updated_at as updatedAt, message_count as messageCount
          FROM chat_conversations
          WHERE user_id = ?
          ORDER BY updated_at DESC
        `);

        return stmt.all(userId) as ChatConversation[];
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findAll',
      });
      throw error;
    }
  }

  /**
   * Get recent conversations for a user and case (limit 10)
   */
  findRecentByCase(userId: number, caseId: number | null, limit: number = 10): ChatConversation[] {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT id, case_id as caseId, user_id as userId, title, created_at as createdAt,
               updated_at as updatedAt, message_count as messageCount
        FROM chat_conversations
        WHERE user_id = ? AND case_id ${caseId === null ? 'IS NULL' : '= ?'}
        ORDER BY updated_at DESC
        LIMIT ?
      `);

      return (
        caseId === null ? stmt.all(userId, limit) : stmt.all(userId, caseId, limit)
      ) as ChatConversation[];
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findRecentByCase',
      });
      throw error;
    }
  }

  /**
   * Get conversation with all its messages
   * @deprecated Use findWithMessagesPaginated for better performance with large conversations
   * @warning This method loads ALL messages into memory
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
        content: this.decryptField(msg.content) ?? msg.content,
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
   * Get conversation with paginated messages using cursor pagination
   * @param conversationId - Conversation ID
   * @param limit - Maximum number of messages to return (default: 50)
   * @param cursor - Opaque cursor string for pagination (null for first page)
   * @returns Paginated result with conversation metadata and messages
   */
  findWithMessagesPaginated(
    conversationId: number,
    limit: number = 50,
    cursor: string | null = null
  ): (ConversationWithMessages & { nextCursor: string | null; hasMore: boolean }) | null {
    const db = getDb();

    try {
      const conversation = this.findById(conversationId);
      if (!conversation) {
        return null;
      }

      // Generate WHERE clause for cursor
      const whereClause = cursor
        ? `WHERE conversation_id = ? AND id > ${decodeSimpleCursor(cursor).rowid}`
        : 'WHERE conversation_id = ?';

      const stmt = db.prepare(`
        SELECT id, conversation_id as conversationId, role, content,
               thinking_content as thinkingContent, timestamp, token_count as tokenCount
        FROM chat_messages
        ${whereClause}
        ORDER BY id ASC
        LIMIT ?
      `);

      const rows = stmt.all(conversationId, limit + 1) as (ChatMessage & { id: number })[];

      // Check if there are more results
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      // Generate next cursor from last item's id
      const nextCursor = hasMore && items.length > 0
        ? encodeSimpleCursor(items[items.length - 1].id)
        : null;

      // Decrypt all message content and thinking content
      const decryptedMessages = items.map((msg) => {
        const { id: _id, ...message } = msg;
        return {
          ...message,
          content: this.decryptField(msg.content) ?? msg.content,
          thinkingContent: this.decryptField(msg.thinkingContent),
        };
      });

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
            paginated: true,
          },
          success: true,
        });
      }

      return {
        ...conversation,
        messages: decryptedMessages as unknown as ChatMessage[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.findWithMessagesPaginated',
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
      const encryption = this.requireEncryptionService();

      // Encrypt content before INSERT (P0 priority field)
      const encryptedContent = encryption.encrypt(input.content);
      if (!encryptedContent) {
        throw new Error('Message content cannot be empty');
      }
      const contentToStore = JSON.stringify(encryptedContent);

      // Encrypt thinking_content before INSERT (P1 priority field)
      const thinkingContentToStore =
        input.thinkingContent === null || input.thinkingContent === undefined
          ? null
          : (() => {
            const encryptedThinking = encryption.encrypt(input.thinkingContent);
            return encryptedThinking ? JSON.stringify(encryptedThinking) : null;
          })();

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
      message.content = this.decryptField(message.content) ?? message.content;
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
    } catch (_error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  private requireEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      throw new Error('EncryptionService not configured for ChatConversationRepository');
    }
    return this.encryptionService;
  }

  /**
   * Verify that a user owns a conversation
   * Returns true if the conversation exists and belongs to the user
   */
  verifyOwnership(conversationId: number, userId: number): boolean {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT 1 FROM chat_conversations
        WHERE id = ? AND user_id = ?
      `);

      return stmt.get(conversationId, userId) !== undefined;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.verifyOwnership',
      });
      throw error;
    }
  }
}

export { ChatConversationRepository };

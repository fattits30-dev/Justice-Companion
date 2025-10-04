import { getDb } from '../db/database';
import type {
  ChatConversation,
  ChatMessage,
  CreateConversationInput,
  CreateMessageInput,
  ConversationWithMessages,
} from '../models/ChatConversation';
import { errorLogger } from '../utils/error-logger';

class ChatConversationRepository {
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
      if (!conversation) return null;

      const stmt = db.prepare(`
        SELECT id, conversation_id as conversationId, role, content,
               thinking_content as thinkingContent, timestamp, token_count as tokenCount
        FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);

      const messages = stmt.all(conversationId) as ChatMessage[];

      return {
        ...conversation,
        messages,
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
      const stmt = db.prepare(`
        INSERT INTO chat_messages (conversation_id, role, content, thinking_content, token_count)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        input.conversationId,
        input.role,
        input.content,
        input.thinkingContent ?? null,
        input.tokenCount ?? null
      );

      // Get the inserted message
      const msgStmt = db.prepare(`
        SELECT id, conversation_id as conversationId, role, content,
               thinking_content as thinkingContent, timestamp, token_count as tokenCount
        FROM chat_messages
        WHERE id = ?
      `);

      return msgStmt.get(result.lastInsertRowid) as ChatMessage;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationRepository.addMessage',
      });
      throw error;
    }
  }
}

export const chatConversationRepository = new ChatConversationRepository();

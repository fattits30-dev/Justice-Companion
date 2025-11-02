import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';
import type { IChatConversationRepository } from '../shared/infrastructure/di/repository-interfaces.ts';
import type { IChatConversationService } from '../shared/infrastructure/di/service-interfaces.ts';
import type {
  ChatConversation,
  ChatMessage,
  ConversationWithMessages,
  CreateConversationInput,
  CreateMessageInput,
} from '../models/ChatConversation.ts';
import { errorLogger } from '../utils/error-logger.ts';

/**
 * Injectable ChatConversationService
 * Manages chat conversations with dependency injection
 */
@injectable()
export class ChatConversationServiceInjectable implements IChatConversationService {
  constructor(
    @inject(TYPES.ChatConversationRepository) private chatConversationRepository: IChatConversationRepository
  ) {}

  /**
   * Create a new conversation
   * Auto-generates title from first user message if not provided
   */
  createConversation(input: CreateConversationInput): ChatConversation {
    try {
      return this.chatConversationRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.createConversation',
      });
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   */
  getConversation(id: number): ChatConversation | null {
    try {
      return this.chatConversationRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getConversation',
      });
      throw error;
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  deleteConversation(id: number): boolean {
    try {
      this.chatConversationRepository.delete(id);
      return true;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.deleteConversation',
      });
      return false;
    }
  }

  /**
   * Get all conversations for a user (optionally filtered by case)
   */
  getAllConversations(userId: number, caseId?: number | null): ChatConversation[] {
    try {
      return this.chatConversationRepository.findAll(userId, caseId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getAllConversations',
      });
      throw error;
    }
  }

  /**
   * Get recent conversations for a specific case
   * Used for sidebar "Recent Chats" section
   */
  getRecentConversationsByCase(
    userId: number,
    caseId: number | null,
    limit: number = 10
  ): ChatConversation[] {
    try {
      return this.chatConversationRepository.findRecentByCase(userId, caseId, limit);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getRecentConversationsByCase',
      });
      throw error;
    }
  }

  /**
   * Load a full conversation with all messages
   * Used when user clicks on a recent chat to load it
   */
  loadConversation(conversationId: number): ConversationWithMessages | null {
    try {
      return this.chatConversationRepository.findWithMessages(conversationId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.loadConversation',
      });
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   * Returns the created message with generated ID
   */
  addMessage(input: CreateMessageInput): ChatMessage {
    try {
      return this.chatConversationRepository.addMessage(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.addMessage',
      });
      throw error;
    }
  }

  /**
   * Create conversation with first message
   * Helper method used when starting a new chat
   */
  startNewConversation(
    userId: number,
    caseId: number | null,
    firstMessage: { role: 'user' | 'assistant'; content: string; thinkingContent?: string }
  ): ConversationWithMessages {
    try {
      // Generate title from first user message (truncate at 50 chars)
      const title =
        firstMessage.content.substring(0, 50).trim() +
        (firstMessage.content.length > 50 ? '...' : '');

      const conversation = this.createConversation({ userId, caseId, title });

      const message = this.addMessage({
        conversationId: conversation.id,
        role: firstMessage.role,
        content: firstMessage.content,
        thinkingContent: firstMessage.thinkingContent,
      });

      return {
        ...conversation,
        messages: [message],
      };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.startNewConversation',
      });
      throw error;
    }
  }

  /**
   * Verify that a user owns a conversation
   * Throws error if user does not own the conversation
   */
  verifyOwnership(conversationId: number, userId: number): void {
    try {
      const isOwner = this.chatConversationRepository.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        throw new Error(`Unauthorized: User ${userId} does not own conversation ${conversationId}`);
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.verifyOwnership',
      });
      throw error;
    }
  }
}

// For backward compatibility - keep the singleton instance
import { getRepositories } from '../repositories.ts';

class ChatConversationServiceSingleton {
  private get chatConversationRepository() {
    return getRepositories().chatConversationRepository;
  }

  createConversation(input: CreateConversationInput): ChatConversation {
    try {
      return this.chatConversationRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.createConversation',
      });
      throw error;
    }
  }

  getConversation(id: number): ChatConversation | null {
    try {
      return this.chatConversationRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getConversation',
      });
      throw error;
    }
  }

  getAllConversations(userId: number, caseId?: number | null): ChatConversation[] {
    try {
      return this.chatConversationRepository.findAll(userId, caseId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getAllConversations',
      });
      throw error;
    }
  }

  getRecentConversationsByCase(
    userId: number,
    caseId: number | null,
    limit: number = 10,
  ): ChatConversation[] {
    try {
      return this.chatConversationRepository.findRecentByCase(userId, caseId, limit);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.getRecentConversationsByCase',
      });
      throw error;
    }
  }

  loadConversation(conversationId: number): ConversationWithMessages | null {
    try {
      return this.chatConversationRepository.findWithMessages(conversationId);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.loadConversation',
      });
      throw error;
    }
  }

  addMessage(input: CreateMessageInput): ChatMessage {
    try {
      return this.chatConversationRepository.addMessage(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.addMessage',
      });
      throw error;
    }
  }

  deleteConversation(id: number): void {
    try {
      this.chatConversationRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.deleteConversation',
      });
      throw error;
    }
  }

  startNewConversation(
    userId: number,
    caseId: number | null,
    firstMessage: { role: 'user' | 'assistant'; content: string; thinkingContent?: string },
  ): ConversationWithMessages {
    try {
      const title =
        firstMessage.content.substring(0, 50).trim() +
        (firstMessage.content.length > 50 ? '...' : '');

      const conversation = this.createConversation({ userId, caseId, title });

      const message = this.addMessage({
        conversationId: conversation.id,
        role: firstMessage.role,
        content: firstMessage.content,
        thinkingContent: firstMessage.thinkingContent,
      });

      return {
        ...conversation,
        messages: [message],
      };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.startNewConversation',
      });
      throw error;
    }
  }

  verifyOwnership(conversationId: number, userId: number): void {
    try {
      const isOwner = this.chatConversationRepository.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        throw new Error(`Unauthorized: User ${userId} does not own conversation ${conversationId}`);
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'ChatConversationService.verifyOwnership',
      });
      throw error;
    }
  }
}

export const chatConversationService = new ChatConversationServiceSingleton();
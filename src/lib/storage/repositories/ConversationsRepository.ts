/**
 * Conversations Repository - Local IndexedDB Storage
 *
 * Handles CRUD operations for AI chat conversations and messages.
 */

import {} from "../db";
import { BaseRepository, type BaseEntity } from "./BaseRepository";

/**
 * Message role options
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Conversation entity interface
 */
export interface LocalConversation extends BaseEntity {
  id: number;
  caseId: number | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message entity interface
 */
export interface LocalMessage extends BaseEntity {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

/**
 * Input for creating a conversation
 */
export interface CreateConversationInput {
  caseId?: number | null;
  title: string;
}

/**
 * Input for creating a message
 */
export interface CreateMessageInput {
  conversationId: number;
  role: MessageRole;
  content: string;
}

/**
 * Conversations repository
 */
export class ConversationsRepository extends BaseRepository<
  "conversations",
  LocalConversation
> {
  constructor() {
    super("conversations", {});
  }

  /**
   * Create a new conversation
   */
  async create(input: CreateConversationInput): Promise<LocalConversation> {
    const data = {
      caseId: input.caseId ?? null,
      title: input.title,
    };

    return super.create(
      data as Omit<LocalConversation, "id" | "createdAt" | "updatedAt">,
    );
  }

  /**
   * Find conversations for a case
   */
  async findByCaseId(caseId: number): Promise<LocalConversation[]> {
    const db = await this.getDb();
    const results = await db.getAllFromIndex(
      "conversations",
      "by-case",
      caseId,
    );

    // Sort by updatedAt descending
    results.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return results as LocalConversation[];
  }

  /**
   * Find all conversations not linked to a case
   */
  async findGeneral(): Promise<LocalConversation[]> {
    const all = await this.findAll();
    return all.filter((c) => c.caseId === null);
  }

  /**
   * Find recent conversations
   */
  async findRecent(limit: number = 10): Promise<LocalConversation[]> {
    const all = await this.findAll();

    // Sort by updatedAt descending
    all.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return all.slice(0, limit);
  }

  /**
   * Update conversation title
   */
  async updateTitle(
    id: number,
    title: string,
  ): Promise<LocalConversation | null> {
    return this.update(id, { title } as Partial<
      Omit<LocalConversation, "id" | "createdAt">
    >);
  }

  /**
   * Delete conversation and all its messages
   */
  async deleteWithMessages(id: number): Promise<boolean> {
    const messagesRepo = getMessagesRepository();
    await messagesRepo.deleteByConversationId(id);
    return this.delete(id);
  }
}

/**
 * Messages repository - handles chat messages with encryption
 */
export class MessagesRepository extends BaseRepository<
  "messages",
  LocalMessage
> {
  constructor() {
    super("messages", {
      // Message content is encrypted
      encryptedFields: ["content"],
      requireEncryption: true,
    });
  }

  /**
   * Create a new message
   */
  async create(input: CreateMessageInput): Promise<LocalMessage> {
    const data = {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    };

    // Also update conversation's updatedAt
    const conversationsRepo = getConversationsRepository();
    await conversationsRepo.update(input.conversationId, {});

    return super.create(
      data as Omit<LocalMessage, "id" | "createdAt" | "updatedAt">,
    );
  }

  /**
   * Find all messages in a conversation
   */
  async findByConversationId(conversationId: number): Promise<LocalMessage[]> {
    const db = await this.getDb();
    const results = await db.getAllFromIndex(
      "messages",
      "by-conversation",
      conversationId,
    );

    const decrypted: LocalMessage[] = [];
    for (const item of results) {
      const dec = await this.decryptFields(
        item as unknown as Record<string, unknown>,
      );
      decrypted.push(dec as unknown as LocalMessage);
    }

    // Sort by createdAt ascending (oldest first for chat display)
    decrypted.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    return decrypted;
  }

  /**
   * Delete all messages in a conversation
   */
  async deleteByConversationId(conversationId: number): Promise<number> {
    const messages = await this.findByConversationId(conversationId);
    let deleted = 0;

    for (const message of messages) {
      if (await this.delete(message.id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Count messages in a conversation
   */
  async countByConversationId(conversationId: number): Promise<number> {
    const messages = await this.findByConversationId(conversationId);
    return messages.length;
  }

  /**
   * Get last N messages for context (for AI)
   */
  async getRecentContext(
    conversationId: number,
    limit: number = 10,
  ): Promise<LocalMessage[]> {
    const messages = await this.findByConversationId(conversationId);
    return messages.slice(-limit);
  }
}

/**
 * Singleton instances
 */
let conversationsRepositoryInstance: ConversationsRepository | null = null;
let messagesRepositoryInstance: MessagesRepository | null = null;

export function getConversationsRepository(): ConversationsRepository {
  if (!conversationsRepositoryInstance) {
    conversationsRepositoryInstance = new ConversationsRepository();
  }
  return conversationsRepositoryInstance;
}

export function getMessagesRepository(): MessagesRepository {
  if (!messagesRepositoryInstance) {
    messagesRepositoryInstance = new MessagesRepository();
  }
  return messagesRepositoryInstance;
}

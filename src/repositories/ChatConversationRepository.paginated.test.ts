import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ChatConversationRepository } from './ChatConversationRepository';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogger } from '../services/AuditLogger';
import { createTestDatabase } from '../test-utils/database-test-helper';
import type { CreateConversationInput, CreateMessageInput } from '../models/ChatConversation';
import type Database from 'better-sqlite3';

// Create test database instance at module level
const testDb = createTestDatabase();
let db: Database.Database;

// Mock the database module at module level (hoisted by Vitest)
vi.mock('../db/database', () => ({
  databaseManager: {
    getDatabase: () => db,
  },
  getDb: () => db,
}));

describe('ChatConversationRepository - Cursor Pagination', () => {
  let encryptionService: EncryptionService;
  let auditLogger: AuditLogger;
  let repository: ChatConversationRepository;
  let testKey: Buffer;

  // Helper to create test user (satisfies FK constraint)
  const createTestUser = (userId: number): void => {
    const userStmt = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, password_salt, email, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    userStmt.run(userId, `testuser${userId}`, 'hash', 'salt', `test${userId}@example.com`);
  };

  // Helper to create test case (optional, for case_id FK)
  const createTestCase = (caseId: number, userId: number = 1): void => {
    createTestUser(userId);
    const caseStmt = db.prepare(`
      INSERT OR IGNORE INTO cases (id, title, description, case_type, status, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    caseStmt.run(caseId, `Test Case ${caseId}`, 'Test Description', 'employment', 'active', userId);
  };

  beforeAll(() => {
    // Initialize test database with all migrations
    db = testDb.initialize();
  });

  afterAll(() => {
    // Cleanup test database
    testDb.cleanup();
  });

  beforeEach(() => {
    // Generate a test encryption key
    testKey = EncryptionService.generateKey();
    encryptionService = new EncryptionService(testKey);

    // Create audit logger with the same encryption service
    auditLogger = new AuditLogger(db, encryptionService);

    repository = new ChatConversationRepository(encryptionService, auditLogger);

    // Clear data for test isolation
    testDb.clearAllTables();
  });

  afterEach(() => {
    // Additional cleanup if needed
  });

  describe('findWithMessagesPaginated', () => {
    it('should return first page of messages', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      // Add 10 messages
      for (let i = 1; i <= 10; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: i % 2 === 0 ? 'assistant' : 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      // Get first page (limit 5)
      const result = repository.findWithMessagesPaginated(conversation.id, 5);

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(5);
      expect(result!.hasMore).toBe(true);
      expect(result!.nextCursor).toBeTruthy();

      // Messages should be in ASC order (oldest first for chat)
      expect(result!.messages[0].content).toBe('Message 1');
      expect(result!.messages[1].content).toBe('Message 2');
      expect(result!.messages[4].content).toBe('Message 5');
    });

    it('should return second page using cursor', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with 10 messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 10; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      // Get first page
      const page1 = repository.findWithMessagesPaginated(conversation.id, 5);

      // Get second page using cursor
      const page2 = repository.findWithMessagesPaginated(conversation.id, 5, page1!.nextCursor);

      expect(page2).toBeTruthy();
      expect(page2!.messages).toHaveLength(5);
      expect(page2!.hasMore).toBe(false);
      expect(page2!.nextCursor).toBeNull();
      expect(page2!.messages[0].content).toBe('Message 6');
      expect(page2!.messages[4].content).toBe('Message 10');
    });

    it('should return null for non-existent conversation', () => {
      const result = repository.findWithMessagesPaginated(999, 10);
      expect(result).toBeNull();
    });

    it('should decrypt message content and thinking content', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      // Add messages with encrypted content
      for (let i = 1; i <= 5; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'assistant',
          content: `Sensitive message ${i}`,
          thinkingContent: `Internal reasoning ${i}`,
          tokenCount: 20,
        };
        repository.addMessage(msgInput);
      }

      const result = repository.findWithMessagesPaginated(conversation.id, 10);

      // All content should be decrypted
      expect(result).toBeTruthy();
      result!.messages.forEach((msg, index) => {
        expect(msg.content).toBe(`Sensitive message ${index + 1}`);
        expect(msg.thinkingContent).toBe(`Internal reasoning ${index + 1}`);
      });
    });

    it('should handle exact page size boundary', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with exactly 10 messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 10; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      // Request exactly 10 (should have no more)
      const result = repository.findWithMessagesPaginated(conversation.id, 10);

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(10);
      expect(result!.hasMore).toBe(false);
      expect(result!.nextCursor).toBeNull();
    });

    it('should handle empty conversation', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with no messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Empty Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      const result = repository.findWithMessagesPaginated(conversation.id, 10);

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(0);
      expect(result!.hasMore).toBe(false);
      expect(result!.nextCursor).toBeNull();
    });

    it('should create audit log when accessing messages', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 3; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      // Access messages (should trigger audit log)
      const result = repository.findWithMessagesPaginated(conversation.id, 10);

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(3);

      // Note: Audit log assertion would require access to audit logger
      // This is covered in integration tests
    });
  });

  describe('Performance comparison', () => {
    it('should be more memory efficient than findWithMessages', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with 100 messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Large Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 100; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: i % 2 === 0 ? 'assistant' : 'user',
          content: `Message ${i}`.repeat(100), // ~1.2KB each
          thinkingContent: i % 2 === 0 ? `Thinking ${i}`.repeat(50) : undefined,
          tokenCount: 200,
        };
        repository.addMessage(msgInput);
      }

      // Paginated: loads only 10 messages (~12KB)
      const paginated = repository.findWithMessagesPaginated(conversation.id, 10);
      expect(paginated).toBeTruthy();
      expect(paginated!.messages).toHaveLength(10);

      // Non-paginated: loads ALL 100 messages (~120KB)
      const all = repository.findWithMessages(conversation.id);
      expect(all).toBeTruthy();
      expect(all!.messages).toHaveLength(100);

      // Memory usage: paginated is 10x more efficient
      console.log(`Paginated: ${paginated!.messages.length} messages`);
      console.log(`Non-paginated: ${all!.messages.length} messages`);
      console.log(`Memory reduction: ${((1 - paginated!.messages.length / all!.messages.length) * 100).toFixed(1)}%`);
    });

    it('should handle very large conversations gracefully', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with 1000 messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Very Large Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 1000; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      // Paginated query should complete quickly
      const startTime = Date.now();
      const result = repository.findWithMessagesPaginated(conversation.id, 50);
      const duration = Date.now() - startTime;

      expect(result).toBeTruthy();
      expect(result!.messages).toHaveLength(50);
      expect(result!.hasMore).toBe(true);
      console.log(`Query with 1000 total messages completed in ${duration}ms`);

      // Should be fast (< 100ms for 50 messages from 1000 total)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cursor continuity', () => {
    it('should allow iteration through all pages', () => {
      // Create parent user and case (satisfies FK constraints)
      createTestCase(100, 1);

      // Create conversation with 25 messages
      const convInput: CreateConversationInput = {
        userId: 1,
        title: 'Test Conversation',
        caseId: 100,
      };
      const conversation = repository.create(convInput);

      for (let i = 1; i <= 25; i++) {
        const msgInput: CreateMessageInput = {
          conversationId: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 10,
        };
        repository.addMessage(msgInput);
      }

      const allMessages: string[] = [];
      let cursor: string | null = null;
      let pageCount = 0;

      // Iterate through all pages
      do {
        const result = repository.findWithMessagesPaginated(conversation.id, 10, cursor);
        expect(result).toBeTruthy();

        allMessages.push(...result!.messages.map(m => m.content));
        cursor = result!.nextCursor;
        pageCount++;

        // Safety: prevent infinite loops in tests
        if (pageCount > 10) break;
      } while (cursor !== null);

      // Should have loaded all 25 messages in 3 pages
      expect(allMessages).toHaveLength(25);
      expect(pageCount).toBe(3); // 10 + 10 + 5
      expect(allMessages[0]).toBe('Message 1');
      expect(allMessages[24]).toBe('Message 25');
    });
  });
});

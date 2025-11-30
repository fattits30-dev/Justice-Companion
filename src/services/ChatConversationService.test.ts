/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { chatConversationService } from "./ChatConversationService";
import { AuditLogger } from "./AuditLogger";
import { TestDatabaseHelper } from "../test-utils/database-test-helper";
import { databaseManager } from "../db/database";
import { resetRepositories, initializeTestRepositories } from "../repositories";
import { setupTestEnvironment, clearWindowMock } from "../test-utils/ipc-mock";
import type {
  CreateConversationInput,
  CreateMessageInput,
} from "../models/ChatConversation";

describe("ChatConversationService", () => {
  let auditLogger: AuditLogger;
  let testDb: TestDatabaseHelper;
  const TEST_CASE_ID = 1;
  const TEST_USER_ID = 1;

  beforeEach(() => {
    // Setup window mock and IPC API
    setupTestEnvironment();

    testDb = new TestDatabaseHelper();
    const db = testDb.initialize();

    // Inject test database into singleton
    databaseManager.setTestDatabase(db);

    // Create test users (needed for foreign key constraints)
    db.prepare(
      `
      INSERT INTO users (id, username, email, password_hash, password_salt, role)
      VALUES (1, 'testuser1', 'test1@example.com', 'hash1', 'salt1', 'user')
    `,
    ).run();

    // Create test case for case_id foreign key
    db.prepare(
      `
      INSERT INTO cases (id, title, case_type, user_id)
      VALUES (1, 'Test Case', 'employment', 1)
    `,
    ).run();

    // Reset singleton to force re-initialization with test key
    resetRepositories();

    // Initialize audit logger with test helper method
    auditLogger = new AuditLogger(db);
    (auditLogger as any).getAllLogs = () => {
      return db.prepare("SELECT * FROM audit_logs ORDER BY created_at").all();
    };

    // Initialize repositories with test encryption service and audit logger
    // Use encryption service from TestDatabaseHelper (automatically initialized)
    const encryptionService = testDb.getEncryptionService();
    initializeTestRepositories(encryptionService, auditLogger);
  });

  afterEach(() => {
    testDb.clearAllTables();
    testDb.cleanup();
    databaseManager.resetDatabase();
    clearWindowMock();
  });

  describe("createConversation()", () => {
    it("should create conversation with case ID", () => {
      const input: CreateConversationInput = {
        userId: TEST_USER_ID,
        caseId: TEST_CASE_ID,
        title: "Test Conversation",
      };

      const conversation = chatConversationService.createConversation(input);

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeGreaterThan(0);
      expect(conversation.caseId).toBe(TEST_CASE_ID);
      expect(conversation.title).toBe("Test Conversation");
      expect(conversation.messageCount).toBe(0);
    });

    it("should create conversation without case ID (global chat)", () => {
      const input: CreateConversationInput = {
        userId: TEST_USER_ID,
        caseId: null,
        title: "General Chat",
      };

      const conversation = chatConversationService.createConversation(input);

      expect(conversation).toBeDefined();
      expect(conversation.caseId).toBeNull();
      expect(conversation.title).toBe("General Chat");
    });

    it("should set timestamps on creation", () => {
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "Test",
      });

      // Verify timestamps exist and are valid ISO strings
      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBeDefined();
      expect(new Date(conversation.createdAt).toISOString()).toBeTruthy();
      expect(new Date(conversation.updatedAt).toISOString()).toBeTruthy();
    });
  });

  describe("getConversation()", () => {
    it("should get conversation by ID", () => {
      const created = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: TEST_CASE_ID,
        title: "Test Conversation",
      });

      const retrieved = chatConversationService.getConversation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe("Test Conversation");
    });

    it("should return null for non-existent conversation", () => {
      const retrieved = chatConversationService.getConversation(999);
      expect(retrieved).toBeNull();
    });
  });

  describe("getAllConversations()", () => {
    beforeEach(() => {
      // Create test conversations
      chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: TEST_CASE_ID,
        title: "Case Conversation 1",
      });
      chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: TEST_CASE_ID,
        title: "Case Conversation 2",
      });
      chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: null,
        title: "Global Conversation",
      });
    });

    it("should get all conversations when no case ID provided", () => {
      const conversations =
        chatConversationService.getAllConversations(TEST_USER_ID);

      expect(conversations).toHaveLength(3);
    });

    it("should filter conversations by case ID", () => {
      const conversations = chatConversationService.getAllConversations(
        TEST_USER_ID,
        TEST_CASE_ID,
      );

      expect(conversations).toHaveLength(2);
      expect(conversations.every((c) => c.caseId === TEST_CASE_ID)).toBe(true);
    });

    it("should get only global conversations when case ID is null", () => {
      const conversations = chatConversationService.getAllConversations(
        TEST_USER_ID,
        null,
      );

      expect(conversations).toHaveLength(1);
      expect(conversations[0].caseId).toBeNull();
      expect(conversations[0].title).toBe("Global Conversation");
    });

    it("should return empty array when no conversations exist for case", () => {
      const conversations = chatConversationService.getAllConversations(
        TEST_USER_ID,
        999,
      );
      expect(conversations).toEqual([]);
    });
  });

  describe("getRecentConversationsByCase()", () => {
    it("should get recent conversations with default limit", () => {
      // Create conversations
      for (let i = 1; i <= 15; i++) {
        chatConversationService.createConversation({
          userId: TEST_USER_ID,
          caseId: TEST_CASE_ID,
          title: `Conversation ${i}`,
        });
      }

      const recent = chatConversationService.getRecentConversationsByCase(
        TEST_USER_ID,
        TEST_CASE_ID,
      );

      expect(recent).toHaveLength(10); // Default limit
    });

    it("should respect custom limit", () => {
      // Create conversations
      for (let i = 1; i <= 8; i++) {
        chatConversationService.createConversation({
          userId: TEST_USER_ID,
          caseId: TEST_CASE_ID,
          title: `Conversation ${i}`,
        });
      }

      const recent = chatConversationService.getRecentConversationsByCase(
        TEST_USER_ID,
        TEST_CASE_ID,
        5,
      );

      expect(recent).toHaveLength(5);
    });

    it("should return conversations for global chats (null case ID)", () => {
      chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: null,
        title: "Global Chat 1",
      });
      chatConversationService.createConversation({
        userId: TEST_USER_ID,
        caseId: null,
        title: "Global Chat 2",
      });

      const recent = chatConversationService.getRecentConversationsByCase(
        TEST_USER_ID,
        null,
        10,
      );

      expect(recent).toHaveLength(2);
      expect(recent.every((c) => c.caseId === null)).toBe(true);
    });
  });

  describe("loadConversation()", () => {
    it("should load conversation with all messages", () => {
      // Create conversation
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "Test Chat",
      });

      // Add messages
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: "Hello AI",
      });
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "Hello user",
      });

      const loaded = chatConversationService.loadConversation(conversation.id);

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(conversation.id);
      expect(loaded!.messages).toHaveLength(2);
      expect(loaded!.messages[0].role).toBe("user");
      expect(loaded!.messages[1].role).toBe("assistant");
    });

    it("should return null for non-existent conversation", () => {
      const loaded = chatConversationService.loadConversation(999);
      expect(loaded).toBeNull();
    });

    it("should decrypt message content when loading", () => {
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "Encrypted Chat",
      });

      const originalContent = "This is sensitive content";
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: originalContent,
      });

      const loaded = chatConversationService.loadConversation(conversation.id);

      expect(loaded!.messages[0].content).toBe(originalContent);
    });

    it("should log PII access when loading messages", () => {
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "Test",
      });
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: "Test message",
      });

      chatConversationService.loadConversation(conversation.id);

      const logs = (auditLogger as any).getAllLogs();
      const accessLog = logs.find(
        (log: any) => log.event_type === "message.content_access",
      );

      expect(accessLog).toBeDefined();
      expect(accessLog.success).toBe(1);
      expect(JSON.parse(accessLog.details).encrypted).toBe(true);
    });
  });

  describe("addMessage()", () => {
    let conversationId: number;

    beforeEach(() => {
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "Test Chat",
      });
      conversationId = conversation.id;
    });

    it("should add user message successfully", () => {
      const input: CreateMessageInput = {
        conversationId,
        role: "user",
        content: "Test user message",
      };

      const message = chatConversationService.addMessage(input);

      expect(message).toBeDefined();
      expect(message.id).toBeGreaterThan(0);
      expect(message.role).toBe("user");
      expect(message.content).toBe("Test user message");
    });

    it("should add assistant message with thinking content", () => {
      const input: CreateMessageInput = {
        conversationId,
        role: "assistant",
        content: "This is my response",
        thinkingContent: "Internal reasoning here",
      };

      const message = chatConversationService.addMessage(input);

      expect(message.role).toBe("assistant");
      expect(message.content).toBe("This is my response");
      expect(message.thinkingContent).toBe("Internal reasoning here");
    });

    it("should encrypt message content before storage", () => {
      const originalContent = "Sensitive user message";
      chatConversationService.addMessage({
        conversationId,
        role: "user",
        content: originalContent,
      });

      // Query database directly to verify encryption
      const db = testDb.getDatabase();
      const storedMessage = db
        .prepare("SELECT content FROM chat_messages WHERE conversation_id = ?")
        .get(conversationId) as any;

      // Stored content should be encrypted JSON, not plaintext
      expect(storedMessage.content).not.toBe(originalContent);
      expect(storedMessage.content).toContain('"iv":');
      expect(storedMessage.content).toContain('"ciphertext":');
      expect(storedMessage.content).toContain('"algorithm":"aes-256-gcm"');
    });

    it("should log message creation event", () => {
      chatConversationService.addMessage({
        conversationId,
        role: "user",
        content: "Test message",
      });

      const logs = (auditLogger as any).getAllLogs();
      const createLog = logs.find(
        (log: any) => log.event_type === "message.create",
      );

      expect(createLog).toBeDefined();
      expect(createLog.success).toBe(1);
      expect(JSON.parse(createLog.details).role).toBe("user");
    });

    it("should set timestamp on message", () => {
      const message = chatConversationService.addMessage({
        conversationId,
        role: "user",
        content: "Test",
      });

      // Verify timestamp exists and is a valid ISO string
      expect(message.timestamp).toBeDefined();
      expect(new Date(message.timestamp).toISOString()).toBeTruthy();
    });
  });

  describe("deleteConversation()", () => {
    it("should delete conversation and all its messages", () => {
      const conversation = chatConversationService.createConversation({
        userId: TEST_USER_ID,
        title: "To Delete",
      });
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: "Message 1",
      });
      chatConversationService.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "Message 2",
      });

      chatConversationService.deleteConversation(conversation.id);

      const retrieved = chatConversationService.getConversation(
        conversation.id,
      );
      expect(retrieved).toBeNull();

      // Verify messages are deleted (CASCADE)
      const db = testDb.getDatabase();
      const messages = db
        .prepare("SELECT * FROM chat_messages WHERE conversation_id = ?")
        .all(conversation.id);
      expect(messages).toHaveLength(0);
    });

    it("should handle deleting non-existent conversation gracefully", () => {
      // Should not throw error
      expect(() => {
        chatConversationService.deleteConversation(999);
      }).not.toThrow();
    });
  });

  describe("startNewConversation()", () => {
    it("should create conversation with first user message", () => {
      const result = chatConversationService.startNewConversation(
        TEST_USER_ID,
        TEST_CASE_ID,
        {
          role: "user",
          content: "Hello, I need help with my employment case",
        },
      );

      expect(result).toBeDefined();
      expect(result.caseId).toBe(TEST_CASE_ID);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content).toBe(
        "Hello, I need help with my employment case",
      );
    });

    it("should auto-generate title from first message (truncate at 50 chars)", () => {
      const longMessage =
        "This is a very long message that exceeds fifty characters in length";
      const result = chatConversationService.startNewConversation(
        TEST_USER_ID,
        null,
        {
          role: "user",
          content: longMessage,
        },
      );

      // Title should be truncated at 50 chars with ellipsis
      expect(result.title).toBe(
        "This is a very long message that exceeds fifty cha...",
      );
      expect(result.title.length).toBeLessThanOrEqual(53); // 50 + "..."
    });

    it("should not truncate short messages", () => {
      const shortMessage = "Short message";
      const result = chatConversationService.startNewConversation(
        TEST_USER_ID,
        null,
        {
          role: "user",
          content: shortMessage,
        },
      );

      expect(result.title).toBe("Short message");
      expect(result.title).not.toContain("...");
    });

    it("should support assistant as first message", () => {
      const result = chatConversationService.startNewConversation(
        TEST_USER_ID,
        null,
        {
          role: "assistant",
          content: "Hello! How can I help you today?",
        },
      );

      expect(result.messages[0].role).toBe("assistant");
      expect(result.messages[0].content).toBe(
        "Hello! How can I help you today?",
      );
    });

    it("should include thinking content if provided", () => {
      const result = chatConversationService.startNewConversation(
        TEST_USER_ID,
        null,
        {
          role: "assistant",
          content: "Here is my answer",
          thinkingContent: "Let me think about this...",
        },
      );

      expect(result.messages[0].thinkingContent).toBe(
        "Let me think about this...",
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw error when creating conversation with invalid case ID", () => {
      expect(() => {
        chatConversationService.createConversation({
          userId: TEST_USER_ID,
          caseId: 999, // Non-existent case
          title: "Test",
        });
      }).toThrow();
    });

    it("should throw error when adding message to non-existent conversation", () => {
      expect(() => {
        chatConversationService.addMessage({
          conversationId: 999,
          role: "user",
          content: "Test",
        });
      }).toThrow();
    });
  });
});

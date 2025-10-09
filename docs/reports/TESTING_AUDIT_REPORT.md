# Justice Companion - Comprehensive Testing Audit Report
**Date**: 2025-10-08
**Auditor**: Agent India (Testing & Quality Assurance Specialist)
**Status**: CRITICAL GAPS IDENTIFIED

---

## Executive Summary

### Current Test Coverage Status
- **Services**: 8/12 tested (67%) - **4 MISSING**
- **Repositories**: 6/9 tested (67%) - **3 MISSING**
- **Components**: 12/21 tested (57%) - **9 MISSING**
- **Hooks**: 6/7 tested (86%) - **1 MISSING**
- **E2E Tests**: 5 files covering basic flows - **MAJOR GAPS**

### Critical Findings
1. ✅ **GOOD**: Encryption and audit services have excellent test coverage
2. ✅ **GOOD**: Notes/Facts features have comprehensive unit tests
3. ⚠️ **WARNING**: 30 repository tests failing due to "db is not defined" - **BLOCKER**
4. ❌ **CRITICAL**: ChatConversationService, RAGService, ModelDownloadService untested
5. ❌ **CRITICAL**: 3 repositories without tests (ChatConversation, UserProfile, Timeline)
6. ❌ **CRITICAL**: 9 components without tests (43% untested)
7. ❌ **CRITICAL**: No E2E tests for facts, timeline, legal issues, chat

### Test Quality Issues
1. **Repository tests failing** - Database initialization issue in test environment
2. **Missing integration tests** - No tests for service → repository → database flow
3. **Missing E2E coverage** - Only 5 user flows tested out of ~20 critical paths
4. **Incomplete error scenarios** - Many edge cases not covered
5. **No accessibility tests** - WCAG compliance not verified

---

## Section 1: Test Coverage Gaps

### 1.1 MISSING SERVICE TESTS (Priority: P0)

| Service | Status | Lines | Complexity | Priority |
|---------|--------|-------|------------|----------|
| `ChatConversationService.ts` | ❌ MISSING | 150 | High | **P0** |
| `RAGService.ts` | ❌ MISSING | 334 | Very High | **P0** |
| `ModelDownloadService.ts` | ❌ MISSING | 402 | High | **P0** |
| `UserProfileService.ts` | ❌ MISSING | ~100 | Medium | **P1** |

**Impact**: These services handle core application logic including AI chat, legal research, and model downloads. Lack of tests means NO validation of:
- Business logic correctness
- Error handling
- Edge case behavior
- Input validation

### 1.2 MISSING REPOSITORY TESTS (Priority: P0)

| Repository | Status | Lines | Encrypted Fields | Priority |
|------------|--------|-------|------------------|----------|
| `ChatConversationRepository.ts` | ❌ MISSING | 333 | 2 (content, thinking) | **P0** |
| `UserProfileRepository.ts` | ❌ MISSING | 199 | 2 (name, email) | **P0** |
| `TimelineRepository.ts` | ⚠️ PARTIAL | 306 | 1 (description) | **P0** |
| `LegalIssuesRepository.ts` | ⚠️ PARTIAL | 293 | 1 (description) | **P0** |

**Impact**: Encryption and audit logging NOT verified for:
- Chat message storage (PII risk)
- User profile data (GDPR risk)
- Timeline events (potential PII)
- Legal issue descriptions (potential PII)

### 1.3 MISSING COMPONENT TESTS (Priority: P1)

| Component | Status | Type | Complexity | Priority |
|-----------|--------|------|------------|----------|
| `LegalIssuesPanel.tsx` | ❌ MISSING | Feature | High | **P1** |
| `TimelineView.tsx` | ❌ MISSING | Feature | High | **P1** |
| `Sidebar.tsx` | ❌ MISSING | Layout | Medium | **P1** |
| `SidebarNavigation.tsx` | ❌ MISSING | Navigation | Medium | **P1** |
| `ConfirmDialog.tsx` | ❌ MISSING | Modal | Low | **P2** |
| `DisclaimerBanner.tsx` | ❌ MISSING | UI | Low | **P2** |
| `ErrorDisplay.tsx` | ❌ MISSING | UI | Low | **P2** |
| `StreamingIndicator.tsx` | ❌ MISSING | UI | Low | **P2** |
| `SourceCitation.tsx` | ❌ MISSING | UI | Low | **P2** |

**Impact**: UI behavior not verified for user-facing features.

### 1.4 MISSING HOOK TESTS (Priority: P1)

| Hook | Status | Complexity | Priority |
|------|--------|------------|----------|
| `useVoiceRecognition.ts` | ❌ MISSING | High | **P1** |
| `useToast.ts` | ❌ MISSING | Low | **P2** |

### 1.5 MISSING E2E TESTS (Priority: P0)

**Current Coverage**: Only 5 E2E test files exist:
1. ✅ `case-management.e2e.test.ts` - Basic CRUD
2. ✅ `evidence-upload.e2e.test.ts` - File upload
3. ✅ `ai-chat.e2e.test.ts` - Chat interface
4. ✅ `facts-tracking.e2e.test.ts` - Facts feature
5. ✅ `user-journey.e2e.test.ts` - Complete workflow

**MISSING E2E Tests** (Critical User Flows):
1. ❌ **Legal Issues Management** - Create, edit, delete legal issues
2. ❌ **Timeline Events** - Add/edit timeline events chronologically
3. ❌ **Notes Feature** - Create, edit, delete notes
4. ❌ **User Profile Management** - Update profile with PII encryption
5. ❌ **Chat Conversations** - Load/save chat history
6. ❌ **Multi-Case Workflow** - Switch between cases, data isolation
7. ❌ **Search & Filter** - Search cases, filter by type/status
8. ❌ **Data Export** - Export case data (CSV/PDF)
9. ❌ **Settings Management** - Configure app settings
10. ❌ **Accessibility Navigation** - Keyboard-only navigation
11. ❌ **Error Recovery** - Handle offline, network errors
12. ❌ **Database Migration** - Test upgrade paths

---

## Section 2: Test Quality Issues

### 2.1 BLOCKER: Repository Tests Failing

**Issue**: 30 tests failing with "db is not defined"
- All `CaseRepository.test.ts` tests failing (17 tests)
- All `EvidenceRepository.test.ts` tests failing (13 tests)

**Root Cause**: Database initialization not happening in test environment

**Fix Required**:
```typescript
// CURRENT (BROKEN):
const db = getDb(); // Returns undefined in test environment

// REQUIRED FIX:
import { TestDatabaseHelper } from '@/test-utils/database-test-helper';

beforeEach(() => {
  const testDb = new TestDatabaseHelper();
  testDb.initialize();
  // Inject into repository
});
```

### 2.2 Missing Integration Tests

**Current State**: Only unit tests exist (mocked dependencies)

**MISSING Integration Tests**:
1. Service → Repository → Database flow
2. IPC Handler → Service → Repository flow
3. Encryption Service → Repository → Database (round-trip)
4. Audit Logger → Database (event persistence)
5. Migration System (UP/DOWN migrations)

### 2.3 Incomplete Error Scenarios

**Services** - Missing error tests:
- Network timeouts in RAGService
- Invalid encryption keys in EncryptionService
- Database constraint violations
- Concurrent update conflicts
- File system errors in ModelDownloadService

**Components** - Missing edge cases:
- Empty state rendering
- Loading state transitions
- Error boundary triggers
- Form validation failures
- Accessibility focus management

### 2.4 No Accessibility Tests

**MISSING**:
- Keyboard navigation tests (Tab, Enter, Escape)
- Screen reader announcements (ARIA live regions)
- Focus trap testing (modals, dialogs)
- Color contrast validation
- Semantic HTML verification

### 2.5 No Performance Tests

**MISSING**:
- Database query benchmarks (< 100ms target)
- AI response time tests (< 3s target)
- Page load performance (< 2s target)
- Memory leak detection (long-running operations)
- Bundle size tracking

---

## Section 3: Missing E2E Tests (Detailed)

### 3.1 Legal Issues Management E2E (P0)

**User Flow**:
1. Navigate to case detail page
2. Click "Add Legal Issue" button
3. Fill form (title, description, relevant law, guidance)
4. Submit and verify creation
5. Edit existing legal issue
6. Delete legal issue with confirmation
7. Verify encryption in database

**Assertions**:
- Legal issue appears in UI
- Description is encrypted in DB
- Audit log created
- UI updates on CRUD operations

### 3.2 Timeline Events E2E (P0)

**User Flow**:
1. Navigate to case detail page → Timeline tab
2. Add timeline event (date, title, description)
3. Verify chronological ordering
4. Edit event (change date/description)
5. Delete event
6. Verify database persistence

**Assertions**:
- Events display in chronological order
- Description encrypted in DB
- Audit logging works
- UI reflects changes immediately

### 3.3 Chat Conversation Persistence E2E (P0)

**User Flow**:
1. Start new chat conversation
2. Send multiple messages (user + assistant)
3. Close app
4. Reopen app
5. Navigate to chat history
6. Load previous conversation
7. Verify messages persist

**Assertions**:
- Messages encrypted in DB
- Conversation loads correctly
- Thinking content preserved
- Token counts tracked

### 3.4 Multi-Case Data Isolation E2E (P0)

**User Flow**:
1. Create Case A (employment)
2. Add notes, facts, timeline to Case A
3. Create Case B (housing)
4. Add notes, facts, timeline to Case B
5. Switch to Case A
6. Verify only Case A data visible
7. Switch to Case B
8. Verify only Case B data visible

**Assertions**:
- No data leakage between cases
- Filters work correctly
- Database queries use correct caseId

### 3.5 Accessibility Keyboard Navigation E2E (P1)

**User Flow**:
1. Start app (no mouse)
2. Tab through navigation
3. Enter to activate links
4. Tab through case list
5. Enter to open case
6. Tab through forms
7. Escape to close modals
8. Verify focus indicators visible

**Assertions**:
- All interactive elements reachable
- Focus indicators visible (WCAG AA)
- Tab order logical
- Modals trap focus correctly

---

## Section 4: Complete Test Suites (Code Snippets)

### 4.1 ChatConversationService.test.ts

```typescript
// FILE: src/services/ChatConversationService.test.ts
// PURPOSE: Test chat conversation business logic
// PRIORITY: P0
// COVERAGE: ChatConversationService methods

/* @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatConversationService } from './ChatConversationService';
import { chatConversationRepository } from '../repositories/ChatConversationRepository';
import { errorLogger } from '../utils/error-logger';
import type { ChatConversation, ChatMessage } from '../models/ChatConversation';

// Mock dependencies
vi.mock('../repositories/ChatConversationRepository', () => ({
  chatConversationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findRecentByCase: vi.fn(),
    findWithMessages: vi.fn(),
    delete: vi.fn(),
    addMessage: vi.fn(),
  },
}));

vi.mock('../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('ChatConversationService', () => {
  let service: ChatConversationService;

  beforeEach(() => {
    service = new ChatConversationService();
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', () => {
      const mockConversation: ChatConversation = {
        id: 1,
        caseId: 100,
        title: 'Test Conversation',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 0,
      };

      vi.mocked(chatConversationRepository.create).mockReturnValue(mockConversation);

      const result = service.createConversation({ caseId: 100, title: 'Test Conversation' });

      expect(result).toEqual(mockConversation);
      expect(chatConversationRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        title: 'Test Conversation',
      });
    });

    it('should create conversation with null caseId (general chat)', () => {
      const mockConversation: ChatConversation = {
        id: 1,
        caseId: null,
        title: 'General Chat',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 0,
      };

      vi.mocked(chatConversationRepository.create).mockReturnValue(mockConversation);

      const result = service.createConversation({ caseId: null, title: 'General Chat' });

      expect(result).toEqual(mockConversation);
      expect(chatConversationRepository.create).toHaveBeenCalledWith({
        caseId: null,
        title: 'General Chat',
      });
    });

    it('should handle repository errors and log', () => {
      const error = new Error('Database error');
      vi.mocked(chatConversationRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() => service.createConversation({ caseId: 100, title: 'Test' })).toThrow(
        'Database error',
      );
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'ChatConversationService.createConversation' }),
      );
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation by ID', () => {
      const mockConversation: ChatConversation = {
        id: 1,
        caseId: 100,
        title: 'Test Conversation',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 5,
      };

      vi.mocked(chatConversationRepository.findById).mockReturnValue(mockConversation);

      const result = service.getConversation(1);

      expect(result).toEqual(mockConversation);
      expect(chatConversationRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent conversation', () => {
      vi.mocked(chatConversationRepository.findById).mockReturnValue(null);

      const result = service.getConversation(999);

      expect(result).toBeNull();
    });

    it('should handle errors and rethrow', () => {
      const error = new Error('Database error');
      vi.mocked(chatConversationRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => service.getConversation(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'ChatConversationService.getConversation' }),
      );
    });
  });

  describe('getAllConversations', () => {
    it('should retrieve all conversations', () => {
      const mockConversations: ChatConversation[] = [
        {
          id: 1,
          caseId: 100,
          title: 'Conversation 1',
          createdAt: '2025-10-08T00:00:00Z',
          updatedAt: '2025-10-08T00:00:00Z',
          messageCount: 3,
        },
        {
          id: 2,
          caseId: null,
          title: 'Conversation 2',
          createdAt: '2025-10-08T01:00:00Z',
          updatedAt: '2025-10-08T01:00:00Z',
          messageCount: 1,
        },
      ];

      vi.mocked(chatConversationRepository.findAll).mockReturnValue(mockConversations);

      const result = service.getAllConversations();

      expect(result).toEqual(mockConversations);
      expect(chatConversationRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should filter conversations by caseId', () => {
      const mockConversations: ChatConversation[] = [
        {
          id: 1,
          caseId: 100,
          title: 'Case 100 Chat',
          createdAt: '2025-10-08T00:00:00Z',
          updatedAt: '2025-10-08T00:00:00Z',
          messageCount: 3,
        },
      ];

      vi.mocked(chatConversationRepository.findAll).mockReturnValue(mockConversations);

      const result = service.getAllConversations(100);

      expect(result).toEqual(mockConversations);
      expect(chatConversationRepository.findAll).toHaveBeenCalledWith(100);
    });

    it('should return empty array when no conversations exist', () => {
      vi.mocked(chatConversationRepository.findAll).mockReturnValue([]);

      const result = service.getAllConversations();

      expect(result).toEqual([]);
    });
  });

  describe('startNewConversation', () => {
    it('should create conversation with first user message', () => {
      const mockConversation: ChatConversation = {
        id: 1,
        caseId: 100,
        title: 'What are my rights if I was...',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 1,
      };

      const mockMessage: ChatMessage = {
        id: 1,
        conversationId: 1,
        role: 'user',
        content: 'What are my rights if I was wrongfully dismissed?',
        thinkingContent: null,
        timestamp: '2025-10-08T00:00:00Z',
        tokenCount: null,
      };

      vi.mocked(chatConversationRepository.create).mockReturnValue(mockConversation);
      vi.mocked(chatConversationRepository.addMessage).mockReturnValue(mockMessage);

      const result = service.startNewConversation(100, {
        role: 'user',
        content: 'What are my rights if I was wrongfully dismissed?',
      });

      expect(result.id).toBe(1);
      expect(result.title).toBe('What are my rights if I was...');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe(
        'What are my rights if I was wrongfully dismissed?',
      );
    });

    it('should truncate long messages for title (> 50 chars)', () => {
      const longMessage =
        'This is a very long message that exceeds 50 characters and should be truncated';

      const mockConversation: ChatConversation = {
        id: 1,
        caseId: 100,
        title: longMessage.substring(0, 50) + '...',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 1,
      };

      const mockMessage: ChatMessage = {
        id: 1,
        conversationId: 1,
        role: 'user',
        content: longMessage,
        thinkingContent: null,
        timestamp: '2025-10-08T00:00:00Z',
        tokenCount: null,
      };

      vi.mocked(chatConversationRepository.create).mockReturnValue(mockConversation);
      vi.mocked(chatConversationRepository.addMessage).mockReturnValue(mockMessage);

      const result = service.startNewConversation(100, {
        role: 'user',
        content: longMessage,
      });

      expect(result.title.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result.title).toContain('...');
    });

    it('should handle thinking content in first message', () => {
      const mockConversation: ChatConversation = {
        id: 1,
        caseId: 100,
        title: 'Test question...',
        createdAt: '2025-10-08T00:00:00Z',
        updatedAt: '2025-10-08T00:00:00Z',
        messageCount: 1,
      };

      const mockMessage: ChatMessage = {
        id: 1,
        conversationId: 1,
        role: 'assistant',
        content: 'Here is my response',
        thinkingContent: 'Internal reasoning process',
        timestamp: '2025-10-08T00:00:00Z',
        tokenCount: 50,
      };

      vi.mocked(chatConversationRepository.create).mockReturnValue(mockConversation);
      vi.mocked(chatConversationRepository.addMessage).mockReturnValue(mockMessage);

      const result = service.startNewConversation(100, {
        role: 'assistant',
        content: 'Here is my response',
        thinkingContent: 'Internal reasoning process',
      });

      expect(result.messages[0].thinkingContent).toBe('Internal reasoning process');
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation', () => {
      const mockMessage: ChatMessage = {
        id: 1,
        conversationId: 1,
        role: 'user',
        content: 'Follow-up question',
        thinkingContent: null,
        timestamp: '2025-10-08T00:00:00Z',
        tokenCount: null,
      };

      vi.mocked(chatConversationRepository.addMessage).mockReturnValue(mockMessage);

      const result = service.addMessage({
        conversationId: 1,
        role: 'user',
        content: 'Follow-up question',
      });

      expect(result).toEqual(mockMessage);
      expect(chatConversationRepository.addMessage).toHaveBeenCalledWith({
        conversationId: 1,
        role: 'user',
        content: 'Follow-up question',
      });
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', () => {
      vi.mocked(chatConversationRepository.delete).mockReturnValue(undefined);

      service.deleteConversation(1);

      expect(chatConversationRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle deletion errors', () => {
      const error = new Error('Constraint violation');
      vi.mocked(chatConversationRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => service.deleteConversation(1)).toThrow('Constraint violation');
      expect(errorLogger.logError).toHaveBeenCalled();
    });
  });
});
```

### 4.2 ChatConversationRepository.test.ts

```typescript
// FILE: src/repositories/ChatConversationRepository.test.ts
// PURPOSE: Test chat conversation repository with encryption
// PRIORITY: P0
// COVERAGE: ChatConversationRepository methods, encryption, audit logging

/* @vitest-environment node */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatConversationRepository } from './ChatConversationRepository';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogger } from '../services/AuditLogger';
import { TestDatabaseHelper } from '../test-utils/database-test-helper';
import type { CreateConversationInput, CreateMessageInput } from '../models/ChatConversation';
import Database from 'better-sqlite3';

describe('ChatConversationRepository with Encryption', () => {
  let dbHelper: TestDatabaseHelper;
  let db: Database.Database;
  let repository: ChatConversationRepository;
  let encryptionService: EncryptionService;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    // Initialize in-memory test database
    dbHelper = new TestDatabaseHelper();
    db = dbHelper.initialize();

    // Initialize encryption and audit services
    encryptionService = new EncryptionService();
    encryptionService.loadKey('test-encryption-key-32-bytes!!!');
    auditLogger = new AuditLogger(db);

    // Create repository with dependencies
    repository = new ChatConversationRepository();
    repository.setEncryptionService(encryptionService);
    repository.setAuditLogger(auditLogger);

    // Mock getDb to return test database
    const dbModule = require('../db/database');
    dbModule.getDb = () => db;
  });

  afterEach(() => {
    dbHelper.cleanup();
  });

  describe('create conversation', () => {
    it('should create conversation with caseId', () => {
      const input: CreateConversationInput = {
        caseId: 100,
        title: 'Employment Law Question',
      };

      const conversation = repository.create(input);

      expect(conversation.id).toBeDefined();
      expect(conversation.caseId).toBe(100);
      expect(conversation.title).toBe('Employment Law Question');
      expect(conversation.messageCount).toBe(0);
    });

    it('should create conversation without caseId (general chat)', () => {
      const input: CreateConversationInput = {
        caseId: null,
        title: 'General Legal Question',
      };

      const conversation = repository.create(input);

      expect(conversation.caseId).toBeNull();
      expect(conversation.title).toBe('General Legal Question');
    });
  });

  describe('addMessage with encryption', () => {
    it('should encrypt message content before storing', () => {
      // Create conversation
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      // Add message
      const messageInput: CreateMessageInput = {
        conversationId: conversation.id,
        role: 'user',
        content: 'What are my rights regarding maternity leave?',
      };

      const message = repository.addMessage(messageInput);

      // Verify returned message has decrypted content
      expect(message.content).toBe('What are my rights regarding maternity leave?');

      // Verify database has encrypted content
      const dbRow = db
        .prepare('SELECT content FROM chat_messages WHERE id = ?')
        .get(message.id) as { content: string };

      expect(dbRow.content).not.toBe('What are my rights regarding maternity leave?');
      expect(dbRow.content).toContain('{"ciphertext":"');
      expect(dbRow.content).toContain('"iv":"');
      expect(dbRow.content).toContain('"authTag":"');
    });

    it('should encrypt thinking content for assistant messages', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      const messageInput: CreateMessageInput = {
        conversationId: conversation.id,
        role: 'assistant',
        content: 'Based on UK employment law...',
        thinkingContent: 'User is asking about maternity rights. Check Employment Rights Act 1996.',
      };

      const message = repository.addMessage(messageInput);

      expect(message.thinkingContent).toBe(
        'User is asking about maternity rights. Check Employment Rights Act 1996.',
      );

      // Verify thinking content encrypted in DB
      const dbRow = db
        .prepare('SELECT thinking_content FROM chat_messages WHERE id = ?')
        .get(message.id) as { thinking_content: string | null };

      expect(dbRow.thinking_content).toContain('{"ciphertext":"');
    });

    it('should audit message creation', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      const messageInput: CreateMessageInput = {
        conversationId: conversation.id,
        role: 'user',
        content: 'Test message',
      };

      repository.addMessage(messageInput);

      // Verify audit log created
      const auditLogs = db
        .prepare("SELECT * FROM audit_logs WHERE event_type = 'message.create'")
        .all();

      expect(auditLogs.length).toBeGreaterThan(0);
      const latestLog = auditLogs[auditLogs.length - 1] as any;
      expect(latestLog.success).toBe(1);
      expect(latestLog.resource_type).toBe('chat_message');
    });

    it('should NOT log decrypted content in audit logs (GDPR compliance)', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      const messageInput: CreateMessageInput = {
        conversationId: conversation.id,
        role: 'user',
        content: 'Sensitive personal information about my dismissal',
      };

      repository.addMessage(messageInput);

      // Verify audit logs don't contain plaintext content
      const auditLogs = db
        .prepare("SELECT * FROM audit_logs WHERE event_type = 'message.create'")
        .all();

      const latestLog = auditLogs[auditLogs.length - 1] as any;
      expect(latestLog.details).not.toContain('Sensitive personal information');
      expect(latestLog.details).not.toContain('dismissal');
    });
  });

  describe('findWithMessages (decryption)', () => {
    it('should decrypt all message content when loading conversation', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      // Add multiple messages
      repository.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'First message',
      });
      repository.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: 'Second message',
        thinkingContent: 'Internal reasoning',
      });

      // Load conversation with messages
      const loaded = repository.findWithMessages(conversation.id);

      expect(loaded).not.toBeNull();
      expect(loaded!.messages).toHaveLength(2);
      expect(loaded!.messages[0].content).toBe('First message');
      expect(loaded!.messages[1].content).toBe('Second message');
      expect(loaded!.messages[1].thinkingContent).toBe('Internal reasoning');
    });

    it('should audit PII access when loading encrypted messages', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      repository.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'Test',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs').run();

      // Load conversation (triggers PII access audit)
      repository.findWithMessages(conversation.id);

      // Verify audit log
      const auditLog = db
        .prepare("SELECT * FROM audit_logs WHERE event_type = 'message.content_access'")
        .get() as any;

      expect(auditLog).toBeDefined();
      expect(auditLog.success).toBe(1);
      expect(auditLog.resource_type).toBe('chat_message');
    });
  });

  describe('backward compatibility', () => {
    it('should handle legacy plaintext messages', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      // Manually insert plaintext message (simulating legacy data)
      db.prepare(
        `INSERT INTO chat_messages (conversation_id, role, content, thinking_content, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        conversation.id,
        'user',
        'Legacy plaintext message',
        null,
        new Date().toISOString(),
      );

      // Load conversation
      const loaded = repository.findWithMessages(conversation.id);

      expect(loaded!.messages).toHaveLength(1);
      expect(loaded!.messages[0].content).toBe('Legacy plaintext message');
    });

    it('should work without encryption service (fallback mode)', () => {
      // Create repository without encryption
      const repoNoEncryption = new ChatConversationRepository();
      // Don't set encryption service

      const conversation = repoNoEncryption.create({ caseId: 100, title: 'Test' });

      const message = repoNoEncryption.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'Test message',
      });

      expect(message.content).toBe('Test message');

      // Verify no encryption in DB
      const dbRow = db
        .prepare('SELECT content FROM chat_messages WHERE id = ?')
        .get(message.id) as { content: string };

      expect(dbRow.content).toBe('Test message');
    });
  });

  describe('delete conversation', () => {
    it('should delete conversation and all messages (CASCADE)', () => {
      const conversation = repository.create({ caseId: 100, title: 'Test' });

      // Add messages
      repository.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'Message 1',
      });
      repository.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: 'Message 2',
      });

      // Delete conversation
      repository.delete(conversation.id);

      // Verify conversation deleted
      const deletedConversation = repository.findById(conversation.id);
      expect(deletedConversation).toBeNull();

      // Verify messages deleted (CASCADE)
      const messages = db
        .prepare('SELECT * FROM chat_messages WHERE conversation_id = ?')
        .all(conversation.id);

      expect(messages).toHaveLength(0);
    });
  });
});
```

### 4.3 RAGService.test.ts

```typescript
// FILE: src/services/RAGService.test.ts
// PURPOSE: Test Retrieval Augmented Generation for legal information
// PRIORITY: P0
// COVERAGE: RAGService question processing, context assembly, safety validation

/* @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGService } from './RAGService';
import { legalAPIService } from './LegalAPIService';
import { aiServiceFactory } from './AIServiceFactory';
import { errorLogger } from '../utils/error-logger';
import type { LegalContext, AIResponse } from '../types/ai';

// Mock dependencies
vi.mock('./LegalAPIService', () => ({
  legalAPIService: {
    extractKeywords: vi.fn(),
    classifyQuestion: vi.fn(),
    searchLegislation: vi.fn(),
    searchCaseLaw: vi.fn(),
    searchKnowledgeBase: vi.fn(),
  },
}));

vi.mock('./AIServiceFactory', () => ({
  aiServiceFactory: {
    chat: vi.fn(),
  },
}));

vi.mock('../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('RAGService', () => {
  let ragService: RAGService;

  beforeEach(() => {
    ragService = new RAGService();
    vi.clearAllMocks();
  });

  describe('processQuestion - happy path', () => {
    it('should process question and return AI response with sources', async () => {
      // Mock keyword extraction
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['employment', 'discrimination', 'pregnancy'],
        legal: ['discrimination', 'pregnancy'],
        general: ['employment'],
      });

      vi.mocked(legalAPIService.classifyQuestion).mockReturnValue('employment');

      // Mock context fetching
      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue([
        {
          id: 'leg-1',
          title: 'Equality Act 2010',
          excerpt: 'Protection from pregnancy discrimination',
          url: 'https://legislation.gov.uk/ukpga/2010/15',
          relevance: 0.95,
        },
      ]);

      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([
        {
          id: 'case-1',
          name: 'Smith v ABC Ltd',
          citation: '[2020] EWCA Civ 123',
          summary: 'Pregnancy discrimination case',
          url: 'https://caselaw.nationalarchives.gov.uk/123',
          relevance: 0.88,
        },
      ]);

      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([
        {
          id: 'kb-1',
          title: 'Pregnancy Rights at Work',
          content: 'Pregnant employees have protection...',
          category: 'Employment',
        },
      ]);

      // Mock AI response
      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: true,
        message: {
          role: 'assistant',
          content:
            'Under the Equality Act 2010, you are protected from pregnancy discrimination. ⚠️ This is general information only.',
        },
        sources: [
          { type: 'legislation', id: 'leg-1', title: 'Equality Act 2010' },
          { type: 'case_law', id: 'case-1', title: 'Smith v ABC Ltd' },
        ],
        thinkingContent: null,
      });

      const result = await ragService.processQuestion('Can I be fired for being pregnant?');

      expect(result.success).toBe(true);
      expect(result.message?.content).toContain('Equality Act 2010');
      expect(result.message?.content).toContain('⚠️');
      expect(result.sources).toHaveLength(2);
    });
  });

  describe('processQuestion - error handling', () => {
    it('should return error when no legal context found', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['random'],
        legal: [],
        general: ['random'],
      });

      vi.mocked(legalAPIService.classifyQuestion).mockReturnValue('general');

      // Mock empty context
      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      const result = await ragService.processQuestion('What is the weather today?');

      expect(result.success).toBe(false);
      expect(result.error).toContain("don't have information");
      expect(result.code).toBe('NO_CONTEXT');
    });

    it('should handle AI service failures', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['employment'],
        legal: ['employment'],
        general: [],
      });

      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue([
        {
          id: 'leg-1',
          title: 'Test Act',
          excerpt: 'Test',
          url: 'https://test.com',
          relevance: 0.9,
        },
      ]);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      // Mock AI failure
      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: false,
        error: 'AI model unavailable',
        code: 'MODEL_ERROR',
      });

      const result = await ragService.processQuestion('Test question');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI model unavailable');
    });

    it('should handle exceptions gracefully', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await ragService.processQuestion('Test question');

      expect(result.success).toBe(false);
      expect(result.error).toContain('error occurred');
      expect(result.code).toBe('EXCEPTION');
      expect(errorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('response validation (safety)', () => {
    it('should reject responses with advice language', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['test'],
        legal: ['test'],
        general: [],
      });
      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue([
        { id: '1', title: 'Test', excerpt: 'Test', url: '', relevance: 0.9 },
      ]);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      // Mock AI response with advice language (VIOLATION)
      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: true,
        message: {
          role: 'assistant',
          content: 'You should immediately file a lawsuit. I recommend contacting a lawyer.',
        },
        sources: [],
        thinkingContent: null,
      });

      const result = await ragService.processQuestion('Test');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SAFETY_VIOLATION');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'AI response failed safety validation',
        expect.objectContaining({
          type: 'error',
          violations: expect.arrayContaining([expect.stringContaining('advice language')]),
        }),
      );
    });

    it('should add disclaimer if missing', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['test'],
        legal: ['test'],
        general: [],
      });
      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue([
        { id: '1', title: 'Test', excerpt: 'Test', url: '', relevance: 0.9 },
      ]);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      // Mock AI response WITHOUT disclaimer
      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: true,
        message: {
          role: 'assistant',
          content: 'The law provides protection in these circumstances.',
        },
        sources: [],
        thinkingContent: null,
      });

      const result = await ragService.processQuestion('Test');

      expect(result.success).toBe(true);
      expect(result.message?.content).toContain('⚠️');
      expect(result.message?.content).toContain('general information only');
    });
  });

  describe('context assembly', () => {
    it('should limit legislation results to top 5', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['test'],
        legal: ['test'],
        general: [],
      });

      // Mock 10 legislation results
      const mockLegislation = Array.from({ length: 10 }, (_, i) => ({
        id: `leg-${i}`,
        title: `Act ${i}`,
        excerpt: `Excerpt ${i}`,
        url: `https://test.com/${i}`,
        relevance: 1 - i * 0.1, // Descending relevance
      }));

      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue(mockLegislation);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: true,
        message: {
          role: 'assistant',
          content: 'Test ⚠️ This is general information only.',
        },
        sources: [],
        thinkingContent: null,
      });

      const result = await ragService.processQuestion('Test');

      // Verify AI was called with limited context
      expect(aiServiceFactory.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            legislation: expect.arrayContaining([
              expect.objectContaining({ id: 'leg-0' }),
            ]),
          }),
        }),
      );

      const callArgs = vi.mocked(aiServiceFactory.chat).mock.calls[0][0];
      expect(callArgs.context.legislation.length).toBeLessThanOrEqual(5);
    });

    it('should sort results by relevance score', async () => {
      vi.mocked(legalAPIService.extractKeywords).mockResolvedValue({
        all: ['test'],
        legal: ['test'],
        general: [],
      });

      const mockLegislation = [
        { id: 'leg-1', title: 'Act 1', excerpt: '', url: '', relevance: 0.5 },
        { id: 'leg-2', title: 'Act 2', excerpt: '', url: '', relevance: 0.9 },
        { id: 'leg-3', title: 'Act 3', excerpt: '', url: '', relevance: 0.7 },
      ];

      vi.mocked(legalAPIService.searchLegislation).mockResolvedValue(mockLegislation);
      vi.mocked(legalAPIService.searchCaseLaw).mockResolvedValue([]);
      vi.mocked(legalAPIService.searchKnowledgeBase).mockResolvedValue([]);

      vi.mocked(aiServiceFactory.chat).mockResolvedValue({
        success: true,
        message: {
          role: 'assistant',
          content: 'Test ⚠️ This is general information only.',
        },
        sources: [],
        thinkingContent: null,
      });

      await ragService.processQuestion('Test');

      const callArgs = vi.mocked(aiServiceFactory.chat).mock.calls[0][0];
      const sortedLegislation = callArgs.context.legislation;

      // Verify sorted by relevance (descending)
      expect(sortedLegislation[0].id).toBe('leg-2'); // 0.9
      expect(sortedLegislation[1].id).toBe('leg-3'); // 0.7
      expect(sortedLegislation[2].id).toBe('leg-1'); // 0.5
    });
  });
});
```

### 4.4 Legal Issues E2E Test

```typescript
// FILE: tests/e2e/specs/legal-issues.e2e.test.ts
// PURPOSE: Test legal issues management end-to-end
// PRIORITY: P0
// COVERAGE: Create, edit, delete legal issues with encryption verification

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  closeElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { getTestDatabase } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('Legal Issues Management E2E', () => {
  test('should create legal issue and encrypt description', async () => {
    const { window, dbPath } = testApp;

    // Create a case first
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO cases (id, title, case_type, status, created_at, updated_at)
      VALUES (1, 'Employment Case', 'employment', 'open', datetime('now'), datetime('now'))
    `);
    db.close();

    // Reload and navigate to case
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const caseLink = await window.$('text=Employment Case');
    await caseLink?.click();
    await window.waitForTimeout(1000);

    // Navigate to Legal Issues tab
    const legalIssuesTab = await window.$('[data-testid="legal-issues-tab"]') ||
                           await window.$('text=Legal Issues');
    await legalIssuesTab?.click();
    await window.waitForTimeout(500);

    // Click "Add Legal Issue" button
    const addButton = await window.$('[data-testid="add-legal-issue-btn"]') ||
                      await window.$('button:has-text("Add Legal Issue")');
    await addButton?.click();
    await window.waitForTimeout(500);

    // Fill form
    await window.fill('[name="title"]', 'Pregnancy Discrimination');
    await window.fill(
      '[name="description"]',
      'Client was dismissed after disclosing pregnancy. Potential Equality Act 2010 violation.',
    );
    await window.fill('[name="relevantLaw"]', 'Equality Act 2010, Section 18');
    await window.fill('[name="guidance"]', 'Seek advice from employment law specialist');

    // Submit
    const saveButton = await window.$('[data-testid="save-legal-issue-btn"]') ||
                       await window.$('button:has-text("Save")');
    await saveButton?.click();
    await window.waitForTimeout(2000);

    // Verify in UI
    const issueTitle = await window.$('text=Pregnancy Discrimination');
    expect(issueTitle).toBeTruthy();

    // Verify encryption in database
    const dbVerify = getTestDatabase(dbPath);
    const issue = dbVerify
      .prepare('SELECT * FROM legal_issues WHERE title = ?')
      .get('Pregnancy Discrimination') as any;

    expect(issue).toBeDefined();
    expect(issue.description).not.toContain('dismissed');
    expect(issue.description).toContain('{"ciphertext":"');
    expect(issue.description).toContain('"iv":"');

    // Verify audit log
    const auditLogs = dbVerify
      .prepare("SELECT * FROM audit_logs WHERE event_type = 'legal_issue.create'")
      .all();

    expect(auditLogs.length).toBeGreaterThan(0);

    dbVerify.close();
  });

  test('should edit legal issue and re-encrypt description', async () => {
    const { window, dbPath } = testApp;

    // Seed case and legal issue
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO cases (id, title, case_type, status, created_at, updated_at)
      VALUES (1, 'Test Case', 'employment', 'open', datetime('now'), datetime('now'));

      INSERT INTO legal_issues (id, case_id, title, description, relevant_law, guidance, created_at)
      VALUES (1, 1, 'Original Issue', 'Original description', 'Some Act', 'Some guidance', datetime('now'));
    `);
    db.close();

    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const caseLink = await window.$('text=Test Case');
    await caseLink?.click();
    await window.waitForTimeout(1000);

    const legalIssuesTab = await window.$('text=Legal Issues');
    await legalIssuesTab?.click();
    await window.waitForTimeout(500);

    // Click edit button
    const editButton = await window.$('[data-testid="edit-issue-1"]') ||
                       await window.$('button:has-text("Edit")');
    await editButton?.click();
    await window.waitForTimeout(500);

    // Update description
    await window.fill('[name="description"]', 'Updated description with sensitive details');

    const saveButton = await window.$('button:has-text("Save")');
    await saveButton?.click();
    await window.waitForTimeout(2000);

    // Verify encryption
    const dbVerify = getTestDatabase(dbPath);
    const updated = dbVerify
      .prepare('SELECT description FROM legal_issues WHERE id = 1')
      .get() as { description: string };

    expect(updated.description).not.toContain('sensitive details');
    expect(updated.description).toContain('{"ciphertext":"');

    dbVerify.close();
  });

  test('should delete legal issue with confirmation', async () => {
    const { window, dbPath } = testApp;

    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO cases (id, title, case_type, status, created_at, updated_at)
      VALUES (1, 'Test Case', 'employment', 'open', datetime('now'), datetime('now'));

      INSERT INTO legal_issues (id, case_id, title, description, created_at)
      VALUES (1, 1, 'To Delete', 'Test description', datetime('now'));
    `);
    db.close();

    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const caseLink = await window.$('text=Test Case');
    await caseLink?.click();
    await window.waitForTimeout(1000);

    const legalIssuesTab = await window.$('text=Legal Issues');
    await legalIssuesTab?.click();
    await window.waitForTimeout(500);

    // Click delete
    const deleteButton = await window.$('[data-testid="delete-issue-1"]') ||
                         await window.$('button:has-text("Delete")');
    await deleteButton?.click();
    await window.waitForTimeout(500);

    // Confirm deletion
    const confirmButton = await window.$('button:has-text("Confirm")') ||
                          await window.$('button:has-text("Yes")');
    await confirmButton?.click();
    await window.waitForTimeout(2000);

    // Verify deleted from DB
    const dbVerify = getTestDatabase(dbPath);
    const deleted = dbVerify.prepare('SELECT * FROM legal_issues WHERE id = 1').get();

    expect(deleted).toBeUndefined();

    // Verify audit log
    const auditLog = dbVerify
      .prepare("SELECT * FROM audit_logs WHERE event_type = 'legal_issue.delete'")
      .get() as any;

    expect(auditLog).toBeDefined();
    expect(auditLog.success).toBe(1);

    dbVerify.close();
  });
});
```

---

## Section 5: Testing Strategy & Roadmap

### Phase 1: Fix Existing Test Failures (IMMEDIATE - Week 1)

**Priority**: P0 BLOCKER

1. **Fix Database Initialization** (1 day)
   - Update `TestDatabaseHelper` to run ALL migrations
   - Inject test database into repositories
   - Fix 30 failing repository tests

2. **Update Test Patterns** (1 day)
   - Standardize on Context7 Vitest patterns
   - Use `vi.spyOn()` instead of `vi.mock()` where appropriate
   - Improve async test handling

### Phase 2: Complete Missing Unit Tests (Week 2-3)

**Priority**: P0

1. **Service Tests** (3 days)
   - `ChatConversationService.test.ts` (1 day)
   - `RAGService.test.ts` (1 day)
   - `ModelDownloadService.test.ts` (1 day)

2. **Repository Tests** (2 days)
   - `ChatConversationRepository.test.ts` (1 day)
   - `UserProfileRepository.test.ts` (0.5 days)
   - Complete `TimelineRepository.test.ts` (0.5 days)

3. **Component Tests** (3 days)
   - `LegalIssuesPanel.test.tsx` (0.5 days)
   - `TimelineView.test.tsx` (0.5 days)
   - `Sidebar.test.tsx` (0.5 days)
   - UI components (6 components × 0.25 days)

### Phase 3: Integration Tests (Week 4)

**Priority**: P1

1. **Service Integration** (2 days)
   - Service → Repository → Database flow
   - IPC → Service → Repository flow

2. **Encryption Round-Trip** (1 day)
   - All 11 encrypted fields tested
   - Verify backward compatibility

3. **Audit Logging** (1 day)
   - Verify all 26 event types logged
   - GDPR compliance verification

### Phase 4: E2E Tests (Week 5-6)

**Priority**: P0

1. **Critical User Flows** (4 days)
   - Legal Issues E2E
   - Timeline Events E2E
   - Chat Conversations E2E
   - Multi-Case Data Isolation E2E

2. **Accessibility E2E** (2 days)
   - Keyboard navigation
   - Screen reader compatibility

3. **Error Recovery E2E** (1 day)
   - Offline mode
   - Network errors
   - Database errors

### Phase 5: Performance & Accessibility (Week 7)

**Priority**: P1

1. **Performance Benchmarks** (2 days)
   - Database query performance
   - AI response times
   - Page load times

2. **Accessibility Audits** (2 days)
   - WCAG 2.1 AA compliance
   - axe-core integration
   - Manual testing

3. **Coverage Reporting** (1 day)
   - Set up coverage tracking
   - Establish thresholds (80%+ target)

---

## Appendix: Test Execution Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/services/ChatConversationService.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
cd tests/e2e && npx playwright test

# Run specific E2E test
npx playwright test specs/legal-issues.e2e.test.ts

# Run dev quality guard (type-check + lint + tests)
npm run guard:once
```

---

## Conclusion

**Critical Actions Required**:
1. ✅ **FIX BLOCKER**: Resolve 30 failing repository tests (database initialization)
2. ✅ **ADD TESTS**: 4 missing services, 3 repositories, 9 components
3. ✅ **E2E COVERAGE**: 12 critical user flows untested
4. ✅ **ACCESSIBILITY**: No tests exist (WCAG compliance not verified)
5. ✅ **INTEGRATION**: No service → repository → database tests

**Estimated Effort**: 7 weeks (1 QA engineer full-time)

**Risk**: HIGH - Major features untested, encryption not verified, GDPR compliance uncertain

---

**Report Generated**: 2025-10-08
**Next Review**: After Phase 1 completion (Week 1)

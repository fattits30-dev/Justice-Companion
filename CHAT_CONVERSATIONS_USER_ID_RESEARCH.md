# Chat Conversations User ID Research & Implementation Plan

**Created**: 2025-10-14
**Priority**: P0 (Critical Security Gap)
**Estimated Time**: 4-6 hours
**Status**: Research Complete → Ready for Implementation

---

## 🔍 Research Summary

### Current State Analysis

#### Problem Identification

**5 TODOs in electron/main.ts** (lines 2224, 2271, 2365, 2394, 2441):

- `chat_conversations` table lacks `user_id` column for ownership tracking
- Conversations without `caseId` (general AI chats) cannot be authorized
- Current workaround: **BLOCKING all general conversation access** with error messages

#### Database Schema Status

**Migration 011 Already Exists** ✅

- File: `src/db/migrations/011_add_user_ownership.sql`
- Line 28-29: `ALTER TABLE chat_conversations ADD COLUMN user_id INTEGER REFERENCES users(id)`
- Line 43: `CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id)`
- **Migration appears to be created but NOT fully implemented in code**

**Current TypeScript Model** (`src/models/ChatConversation.ts`):

```typescript
export interface ChatConversation {
  id: number;
  caseId: number | null; // ✅ Can be null for general chats
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  // ❌ MISSING: user_id column
}
```

#### Code Implementation Status

**ChatConversationRepository** (`src/repositories/ChatConversationRepository.ts`):

- ❌ No `user_id` handling in queries
- ❌ Not setting `user_id` on conversation creation
- ❌ Not filtering by `user_id` in findAll()

**ChatConversationService** (`src/services/ChatConversationService.ts`):

- ❌ Not passing `userId` to repository methods
- ❌ No user ownership validation

**IPC Handlers** (`electron/main.ts`):

- ❌ 5 handlers blocking general conversations with error messages
- ✅ Already extracting `userId` from session
- ❌ Not passing `userId` to service layer

---

## 🎯 Implementation Plan

### Phase 1: Database Migration (Already Done ✅)

**File**: `src/db/migrations/011_add_user_ownership.sql`

- Migration already created
- Need to verify it's been applied to production database
- **Action**: Run `npm run db:migrate` to ensure it's applied

### Phase 2: TypeScript Types (15 min)

**File**: `src/models/ChatConversation.ts`

**Changes**:

```typescript
export interface ChatConversation {
  id: number;
  caseId: number | null;
  userId: number; // ✅ ADD THIS
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface CreateConversationInput {
  caseId?: number | null;
  userId: number; // ✅ ADD THIS
  title: string;
}
```

### Phase 3: Repository Layer (45 min)

**File**: `src/repositories/ChatConversationRepository.ts`

**Changes Required**:

1. **Update `create()` method**:

   ```typescript
   create(input: CreateConversationInput): ChatConversation {
     const stmt = this.db.prepare(`
       INSERT INTO chat_conversations (case_id, user_id, title)
       VALUES (?, ?, ?)
     `);
     const result = stmt.run(input.caseId || null, input.userId, input.title);
     // ... rest of method
   }
   ```

2. **Update `findById()` to include user_id**:

   ```typescript
   SELECT id, case_id, user_id, title, created_at, updated_at,
          (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = id) as message_count
   FROM chat_conversations
   WHERE id = ?
   ```

3. **Update `findAll()` to filter by userId**:

   ```typescript
   findAll(userId: number, caseId?: number | null): ChatConversation[] {
     if (caseId !== undefined) {
       const stmt = this.db.prepare(`
         SELECT * FROM chat_conversations
         WHERE user_id = ? AND case_id IS ?
         ORDER BY updated_at DESC
       `);
       return stmt.all(userId, caseId);
     } else {
       const stmt = this.db.prepare(`
         SELECT * FROM chat_conversations
         WHERE user_id = ?
         ORDER BY updated_at DESC
       `);
       return stmt.all(userId);
     }
   }
   ```

4. **Add ownership verification helper**:
   ```typescript
   verifyOwnership(conversationId: number, userId: number): boolean {
     const stmt = this.db.prepare(`
       SELECT 1 FROM chat_conversations
       WHERE id = ? AND user_id = ?
     `);
     return stmt.get(conversationId, userId) !== undefined;
   }
   ```

### Phase 4: Service Layer (30 min)

**File**: `src/services/ChatConversationService.ts`

**Changes**:

1. **Update `createConversation()`**:

   ```typescript
   createConversation(input: CreateConversationInput, userId: number): ChatConversation {
     try {
       return chatConversationRepository.create({ ...input, userId });
     } catch (error) {
       errorLogger.logError(error as Error, {
         context: 'ChatConversationService.createConversation',
       });
       throw error;
     }
   }
   ```

2. **Update `getAllConversations()`**:

   ```typescript
   getAllConversations(userId: number, caseId?: number | null): ChatConversation[] {
     try {
       return chatConversationRepository.findAll(userId, caseId);
     } catch (error) {
       errorLogger.logError(error as Error, {
         context: 'ChatConversationService.getAllConversations',
       });
       throw error;
     }
   }
   ```

3. **Add ownership verification method**:
   ```typescript
   verifyOwnership(conversationId: number, userId: number): void {
     const isOwner = chatConversationRepository.verifyOwnership(conversationId, userId);
     if (!isOwner) {
       throw new Error(`Unauthorized: User ${userId} does not own conversation ${conversationId}`);
     }
   }
   ```

### Phase 5: IPC Handlers - Authorization Fixes (1-2 hours)

**File**: `electron/main.ts`

**Changes Required** (5 handlers):

1. **CONVERSATION_CREATE** (line ~2220):

   ```typescript
   ipcMain.handle(IPC_CHANNELS.CONVERSATION_CREATE, async (_, request) => {
     try {
       const userId = getCurrentUserIdFromSession();

       // ✅ Authorization: Pass userId to service
       if (request.input.caseId) {
         authorizationMiddleware.verifyCaseOwnership(request.input.caseId, userId);
       }

       const conversation = chatConversationService.createConversation(
         request.input,
         userId // ✅ ADD THIS
       );

       // ❌ REMOVE: Security gap TODO comment
       await auditLogger.log({ eventType: 'conversation.create', userId });
       return { success: true, data: conversation };
     } catch (error) {
       // ... error handling
     }
   });
   ```

2. **CONVERSATION_GET** (line ~2265):

   ```typescript
   ipcMain.handle(IPC_CHANNELS.CONVERSATION_GET, async (_, request) => {
     try {
       const conversation = chatConversationService.getConversation(request.id);
       const userId = getCurrentUserIdFromSession();

       // ✅ NEW: Verify ownership via user_id (works for all conversations)
       if (conversation) {
         chatConversationService.verifyOwnership(conversation.id, userId);
       }

       // ❌ REMOVE: Old authorization logic + TODO + error block
       return { success: true, data: conversation };
     } catch (error) {
       // ... error handling
     }
   });
   ```

3. **CONVERSATION_LOAD_WITH_MESSAGES** (line ~2365):

   ```typescript
   ipcMain.handle(IPC_CHANNELS.CONVERSATION_LOAD_WITH_MESSAGES, async (_, request) => {
     try {
       const conversation = chatConversationService.getConversation(request.id);
       const userId = getCurrentUserIdFromSession();

       // ✅ NEW: Verify ownership via user_id
       if (conversation) {
         chatConversationService.verifyOwnership(conversation.id, userId);
       }

       const fullConversation = chatConversationService.loadConversation(request.id);

       // ❌ REMOVE: TODO + error block
       return { success: true, data: fullConversation };
     } catch (error) {
       // ... error handling
     }
   });
   ```

4. **CONVERSATION_DELETE** (line ~2394):

   ```typescript
   ipcMain.handle(IPC_CHANNELS.CONVERSATION_DELETE, async (_, request) => {
     try {
       const conversation = chatConversationService.getConversation(request.id);
       const userId = getCurrentUserIdFromSession();

       // ✅ NEW: Verify ownership via user_id
       if (conversation) {
         chatConversationService.verifyOwnership(conversation.id, userId);
       }

       chatConversationService.deleteConversation(request.id);

       // ❌ REMOVE: TODO + error block
       return { success: true };
     } catch (error) {
       // ... error handling
     }
   });
   ```

5. **CONVERSATION_ADD_MESSAGE** (line ~2441):

   ```typescript
   ipcMain.handle(IPC_CHANNELS.CONVERSATION_ADD_MESSAGE, async (_, request) => {
     try {
       const validatedData = validateRequest(request, conversationAddMessageSchema);
       const conversation = chatConversationService.getConversation(
         validatedData.input.conversationId
       );
       const userId = getCurrentUserIdFromSession();

       // ✅ NEW: Verify ownership via user_id
       if (conversation) {
         chatConversationService.verifyOwnership(conversation.id, userId);
       }

       chatConversationService.addMessage(validatedData.input);

       // ❌ REMOVE: TODO + error block
       const updatedConversation = chatConversationService.getConversation(
         validatedData.input.conversationId
       );
       return { success: true, data: updatedConversation };
     } catch (error) {
       // ... error handling
     }
   });
   ```

### Phase 6: Testing (1-2 hours)

**Unit Tests** (`src/services/ChatConversationService.test.ts`):

- Test conversation creation with userId
- Test ownership verification (valid/invalid user)
- Test filtering by userId in getAllConversations

**Integration Tests**:

1. Create conversation as User A
2. Try to access as User B → Should fail
3. Create general conversation (no caseId) → Should work
4. Access general conversation by owner → Should work
5. Try to access general conversation by non-owner → Should fail

**Manual E2E Test**:

1. Login as User 1, create general chat
2. Add messages to general chat
3. Logout, login as User 2
4. Try to access User 1's general chat → Should fail
5. Create own general chat → Should work

---

## 📋 Updated TODO Files

### AUTHORIZATION_MIGRATION_TODO.md

**Add new section** after line 363:

```markdown
### Phase 4: CONVERSATION OWNERSHIP (5 handlers)

**Priority**: P0 - Critical Security Gap
**Status**: ✅ COMPLETED (2025-10-14)

These handlers required adding user_id column to chat_conversations table to enable
proper authorization for general conversations (conversations without caseId).

- [x] **CONVERSATION_CREATE** (line 2220)
  - Added: userId parameter to service.createConversation()
  - Removed: Security gap TODO comment
  - Migration: Added user_id to database

- [x] **CONVERSATION_GET** (line 2265)
  - Added: chatConversationService.verifyOwnership()
  - Removed: Error block for general conversations
  - Fixed: Authorization works for all conversation types

- [x] **CONVERSATION_LOAD_WITH_MESSAGES** (line 2365)
  - Added: Ownership verification via user_id
  - Removed: Security gap error block

- [x] **CONVERSATION_DELETE** (line 2394)
  - Added: Ownership verification via user_id
  - Removed: Security gap error block

- [x] **CONVERSATION_ADD_MESSAGE** (line 2441)
  - Added: Ownership verification via user_id
  - Removed: Security gap error block

**Migration**: `011_add_user_ownership.sql` applied
**Files Modified**:

- `src/models/ChatConversation.ts` (added userId to interfaces)
- `src/repositories/ChatConversationRepository.ts` (added user_id queries)
- `src/services/ChatConversationService.ts` (added ownership methods)
- `electron/main.ts` (fixed 5 conversation handlers)
```

### MASTER_TODO_LIST.md

**Update** Authentication & Security section (add new item after line 50):

```markdown
### Chat Authorization

- [x] **Fix Chat Conversations User Ownership** (P0, 4-6h) ✅ COMPLETED 2025-10-14
  - Added user_id column to chat_conversations table
  - Implemented ownership verification for general conversations
  - Removed security gap blocks in 5 IPC handlers
  - Users can now create and access general AI chats
  - Each user's conversations are properly isolated
  - **Files Modified**: ChatConversation.ts, ChatConversationRepository.ts, ChatConversationService.ts, main.ts
```

---

## 🚀 Execution Order

1. ✅ **Verify Migration Applied** (5 min)

   ```powershell
   npm run db:migrate
   ```

2. **Update TypeScript Types** (15 min)
   - Edit `src/models/ChatConversation.ts`

3. **Update Repository Layer** (45 min)
   - Edit `src/repositories/ChatConversationRepository.ts`

4. **Update Service Layer** (30 min)
   - Edit `src/services/ChatConversationService.ts`

5. **Fix IPC Handlers** (1-2 hours)
   - Edit `electron/main.ts` (5 handlers)

6. **Update TODO Files** (15 min)
   - Edit `electron/AUTHORIZATION_MIGRATION_TODO.md`
   - Edit `docs/implementation/MASTER_TODO_LIST.md`

7. **Testing** (1-2 hours)
   - Write unit tests
   - Run integration tests
   - Manual E2E testing

8. **Commit Changes**

   ```powershell
   git add -A
   git commit -m "fix: implement user_id authorization for chat conversations

   - Add user_id to ChatConversation model and CreateConversationInput
   - Update ChatConversationRepository to handle user ownership
   - Add ownership verification in ChatConversationService
   - Fix 5 IPC handlers to use user_id authorization
   - Remove security gap TODOs and error blocks for general conversations
   - Users can now create and access general AI chats securely

   Closes: Chat conversations security gap (5 TODOs in main.ts)
   Migration: 011_add_user_ownership.sql already applied"
   ```

---

## 📊 Success Criteria

- [ ] All 5 TODOs removed from `electron/main.ts`
- [ ] TypeScript compilation passes with 0 errors
- [ ] All unit tests pass
- [ ] Users can create general conversations (no caseId)
- [ ] Users cannot access other users' conversations
- [ ] Case-based conversations still work with existing authorization
- [ ] Audit logging works for all conversation operations
- [ ] No security regressions in existing functionality

---

## 🔒 Security Validation

**Before Fix**:

- ❌ General conversations blocked with error messages
- ❌ Users cannot use AI assistant without case context
- ⚠️ Security gap acknowledged but not fixed

**After Fix**:

- ✅ All conversations have user_id ownership
- ✅ Users can create general AI chats
- ✅ Each user's conversations are isolated
- ✅ Authorization works for both case-based and general conversations
- ✅ No security gaps remaining

---

**Next Steps**: Execute implementation phases 1-8 in order
**Estimated Total Time**: 4-6 hours
**Risk Level**: Low (migration already created, well-scoped changes)

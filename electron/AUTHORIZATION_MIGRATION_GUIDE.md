# Authorization Migration Guide

## Migration Status Summary

**Last Updated**: 2025-01-13

### Completed Steps ✅

- [x] Step 1: Backup preparation documented
- [x] Step 2: AuthorizationWrapper import added to `electron/main.ts`
- [x] Step 3: AuthorizationWrapper initialized in `app.whenReady()`

### In Progress ⏳

- [ ] Step 4: Migrate IPC handlers (0/50+ handlers migrated)
  - [ ] PUBLIC handlers (0/2)
  - [ ] AUTHENTICATED handlers (0/16)
  - [ ] AUTHORIZED handlers (0/15)
  - [ ] ADMIN handlers (0/10+)

### Pending 📋

- [ ] Step 5: Update error handling patterns
- [ ] Step 6: Comprehensive testing of migrated handlers

### Next Actions

1. **Immediate**: Begin migrating AUTHENTICATED handlers (highest ROI)
2. **High Priority**: Migrate AUTHORIZED handlers (critical for data security)
3. **Medium Priority**: Migrate ADMIN handlers (security-critical but less frequent)
4. **Low Priority**: Migrate PUBLIC handlers (consistency improvement)

---

## Overview

This guide explains how to migrate the existing IPC handlers in `electron/main.ts` to use the new secure `AuthorizationWrapper` for comprehensive authorization checks.

## Key Changes

### 1. Import Authorization Components

Add to the top of `main.ts`:

```typescript
import {
  AuthorizationWrapper,
  AuthLevel,
  ResourceType,
  AuthContext,
} from './authorization-wrapper';
```

### 2. Initialize Authorization Wrapper

After initializing repositories and services, create the wrapper:

```typescript
// Initialize authorization wrapper
const authWrapper = new AuthorizationWrapper(
  authenticationService,
  authorizationMiddleware,
  sessionRepository,
  auditLogger,
  () => currentSessionId // Function to get current session ID
);
```

### 3. Replace Existing Handlers

## Handler Migration Examples

### PUBLIC Handlers (No Auth Required)

**BEFORE:**

```typescript
ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, async (_, request: AuthRegisterRequest) => {
  try {
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.AUTH_REGISTER,
      request
    );

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error || 'Validation failed',
      };
    }

    const user = await authenticationService.register(
      request.username,
      request.password,
      request.email
    );

    return { success: true, data: user };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:auth:register' });
    return { success: false, error: error.message };
  }
});
```

**AFTER:**

```typescript
ipcMain.handle(
  IPC_CHANNELS.AUTH_REGISTER,
  authWrapper.wrapPublic(
    IPC_CHANNELS.AUTH_REGISTER,
    async (_event, request: AuthRegisterRequest, auth: AuthContext) => {
      // Validation is handled by wrapper
      const user = await authenticationService.register(
        request.username,
        request.password,
        request.email
      );

      return { success: true, data: user };
    }
  )
);
```

### AUTHENTICATED Handlers (Session Required)

**BEFORE:**

```typescript
ipcMain.handle(IPC_CHANNELS.PROFILE_GET, async (_event, _request: ProfileGetRequest) => {
  try {
    if (!currentSessionId) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = authenticationService.validateSession(currentSessionId);
    if (!user) {
      currentSessionId = null;
      return { success: false, error: 'Session expired' };
    }

    const profile = userProfileRepository.findByUserId(user.id);
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    return { success: true, data: profile };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:profile:get' });
    return { success: false, error: 'Failed to get profile' };
  }
});
```

**AFTER:**

```typescript
ipcMain.handle(
  IPC_CHANNELS.PROFILE_GET,
  authWrapper.wrapAuthenticated(
    IPC_CHANNELS.PROFILE_GET,
    async (_event, _request: ProfileGetRequest, auth: AuthContext) => {
      // Auth validation is handled by wrapper
      const profile = userProfileRepository.findByUserId(auth.userId!);

      if (!profile) {
        throw new Error('Profile not found');
      }

      return { success: true, data: profile };
    }
  )
);
```

### AUTHORIZED Handlers (Ownership Check Required)

**BEFORE:**

```typescript
ipcMain.handle(IPC_CHANNELS.CASE_GET_BY_ID, async (_, request: CaseGetByIdRequest) => {
  try {
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.CASE_GET_BY_ID,
      request
    );

    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    const userId = getCurrentUserIdFromSession();

    // Manual ownership check
    authorizationMiddleware.verifyCaseOwnership(request.id, userId);

    const caseData = caseRepository.findById(request.id);

    return { success: true, data: caseData };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:case:getById' });
    return { success: false, error: error.message };
  }
});
```

**AFTER:**

```typescript
ipcMain.handle(
  IPC_CHANNELS.CASE_GET_BY_ID,
  authWrapper.wrapAuthorized(
    IPC_CHANNELS.CASE_GET_BY_ID,
    ResourceType.CASE,
    (request: CaseGetByIdRequest) => request.id,
    async (_event, request: CaseGetByIdRequest, auth: AuthContext) => {
      // Ownership check is handled by wrapper
      const caseData = caseRepository.findById(request.id);

      return { success: true, data: caseData };
    }
  )
);
```

### Complex Authorization (Custom Checks)

**BEFORE:**

```typescript
ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, request: AIChatRequest) => {
  try {
    const userId = getCurrentUserIdFromSession();

    // Check case ownership if caseId provided
    if (request.caseId) {
      authorizationMiddleware.verifyCaseOwnership(request.caseId, userId);
    }

    // Check AI consent
    const hasConsent = consentRepository.hasConsent(userId, 'ai_processing');
    if (!hasConsent) {
      throw new Error('AI processing consent required');
    }

    const response = await aiService.chat(request.messages, request.context);

    return { success: true, ...response };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:chat' });
    return { success: false, error: error.message };
  }
});
```

**AFTER:**

```typescript
ipcMain.handle(
  IPC_CHANNELS.AI_CHAT,
  authWrapper.wrap(
    IPC_CHANNELS.AI_CHAT,
    {
      authLevel: AuthLevel.AUTHENTICATED,
      rateLimit: true,
      additionalCheck: async (user, request) => {
        // Check case ownership if caseId provided
        if (request.caseId) {
          const caseData = caseRepository.findById(request.caseId);
          if (!caseData || caseData.userId !== user.id) {
            return false;
          }
        }

        // Check AI consent
        return consentRepository.hasConsent(user.id, 'ai_processing');
      },
      errorMessage: 'AI processing consent required or invalid case context',
    },
    async (_event, request: AIChatRequest, auth: AuthContext) => {
      const response = await aiService.chat(request.messages, request.context, auth.userId!);

      return { success: true, ...response };
    }
  )
);
```

## Migration Steps

### Step 1: Backup Current Implementation ✅ COMPLETED

```bash
cp electron/main.ts electron/main.ts.backup
```

**Status**: Backup recommended before proceeding with handler migration.

### Step 2: Add Authorization Wrapper Import ✅ COMPLETED

```typescript
import { AuthorizationWrapper, AuthLevel, ResourceType } from './authorization-wrapper';
```

**Status**: Import added to `electron/main.ts` at line 85.

### Step 3: Initialize Wrapper After Services ✅ COMPLETED

```typescript
// After all services are initialized
const authWrapper = new AuthorizationWrapper(
  authenticationService,
  authorizationMiddleware,
  sessionRepository,
  auditLogger,
  () => currentSessionId
);
```

**Status**: AuthorizationWrapper initialized in `app.whenReady()` after authentication services (line 3046-3053).

### Step 4: Migrate Handlers by Category ⏳ IN PROGRESS

**Note**: The AuthorizationWrapper is now initialized and ready to use. The next step is to migrate individual IPC handlers to use the wrapper. This is a large task that should be done incrementally, testing each handler after migration.

**Reference Implementation**: See `electron/ipc-handlers-secured.ts` for complete examples of migrated handlers.

**Current Status**: Steps 1-3 completed. AuthorizationWrapper is imported and initialized. Ready for handler migration.

#### 4.1 PUBLIC Handlers (No changes to logic) - ⏳ TODO

- [ ] `AUTH_REGISTER` - Currently uses manual validation
- [ ] `AUTH_LOGIN` - Currently uses manual validation

**Migration Priority**: Low (these handlers already work correctly, migration adds consistency)

#### 4.2 AUTHENTICATED Handlers - ⏳ TODO

- [ ] `AUTH_LOGOUT`
- [ ] `AUTH_GET_CURRENT_USER`
- [ ] `AUTH_CHANGE_PASSWORD`
- [ ] `PROFILE_GET`
- [ ] `PROFILE_UPDATE`
- [ ] `CASE_GET_ALL`
- [ ] `CASE_CREATE`
- [ ] `AI_CHECK_STATUS`
- [ ] `AI_CONFIGURE`
- [ ] `CONSENT_GRANT`
- [ ] `CONSENT_REVOKE`
- [ ] `CONSENT_HAS_CONSENT`
- [ ] `CONSENT_GET_USER_CONSENTS`
- [ ] `GDPR_EXPORT_USER_DATA`
- [ ] `GDPR_DELETE_USER_DATA`

**Migration Priority**: High (most common handlers, benefit most from wrapper)

#### 4.3 AUTHORIZED Handlers (Ownership checks) - ⏳ TODO

- [ ] `CASE_GET_BY_ID`
- [ ] `CASE_UPDATE`
- [ ] `CASE_DELETE`
- [ ] `CASE_CLOSE`
- [ ] `EVIDENCE_CREATE`
- [ ] `EVIDENCE_GET_BY_ID`
- [ ] `EVIDENCE_UPDATE`
- [ ] `EVIDENCE_DELETE`
- [ ] `EVIDENCE_GET_BY_CASE`
- [ ] `FILE_UPLOAD`
- [ ] `FILE_SELECT`
- [ ] `CONVERSATION_CREATE`
- [ ] `CONVERSATION_GET`
- [ ] `CONVERSATION_DELETE`
- [ ] `MESSAGE_ADD`

**Migration Priority**: Critical (protect sensitive user data)

#### 4.4 ADMIN Handlers - ⏳ TODO

- [ ] Dev API handlers - Currently no authorization
- [ ] System administration endpoints - Currently no authorization

**Migration Priority**: Critical (need admin role checks)

### Step 5: Update Error Handling

Remove manual error handling blocks and let the wrapper handle them:

**BEFORE:**

```typescript
try {
  // ... handler logic
} catch (error) {
  errorLogger.logError(error as Error, { context: 'handler' });
  return { success: false, error: 'Generic error message' };
}
```

**AFTER:**

```typescript
// No try-catch needed - wrapper handles errors
// Just throw errors with meaningful messages
if (!data) {
  throw new Error('Data not found');
}
```

### Step 6: Test Each Handler

After migrating each handler:

1. Test unauthenticated access (should fail)
2. Test with valid session (should succeed)
3. Test with expired session (should fail)
4. Test ownership checks (should fail for non-owned resources)
5. Test rate limiting (rapid requests should be blocked)

## Benefits of Migration

### Security Improvements

- ✅ Consistent authorization checks across all handlers
- ✅ No missed authorization checks
- ✅ Automatic session validation
- ✅ Built-in rate limiting
- ✅ Comprehensive audit logging
- ✅ Secure error messages (no information leakage)

### Code Quality Improvements

- ✅ Reduced boilerplate code
- ✅ Cleaner handler logic
- ✅ Centralized authorization logic
- ✅ Easier to maintain
- ✅ Type-safe auth context

### Performance Improvements

- ✅ Session validation caching
- ✅ Optimized authorization checks
- ✅ Rate limiting prevents abuse

## Testing Checklist

After migration, verify:

- [ ] All PUBLIC handlers work without authentication
- [ ] All AUTHENTICATED handlers require valid session
- [ ] All AUTHORIZED handlers check resource ownership
- [ ] All ADMIN handlers require admin role
- [ ] Rate limiting works on sensitive operations
- [ ] Audit logs are generated for authorization events
- [ ] Error messages don't leak sensitive information
- [ ] Sessions expire correctly
- [ ] Remember Me functionality still works
- [ ] GDPR operations are protected
- [ ] File uploads have size/type validation

## Rollback Plan

If issues occur during migration:

1. Restore backup: `cp electron/main.ts.backup electron/main.ts`
2. Remove authorization wrapper files
3. Restart application
4. Document issues for resolution

## Support

For questions or issues during migration:

- Review `authorization-wrapper.ts` for API documentation
- Check `ipc-handlers-secured.ts` for examples
- Consult security team for complex authorization rules

# AI Lazy Loading Implementation Patch

## Overview
This patch implements lazy loading for AI services in Justice Companion to save 100-200ms at startup.

## Changes Required in `electron/main.ts`

### 1. Add Import for Lazy Loader
At the top of the file, after other imports (around line 25):
```typescript
import { ensureAIServicesReady } from './ai-lazy-loader';
```

### 2. Remove Eager AI Initialization at Startup
**REMOVE** these lines from the startup sequence (around lines 3017-3028):
```typescript
// DELETE THIS BLOCK:
  // Inject CaseFactRepository into AIServiceFactory for fact loading
  try {
    aiServiceFactory.setCaseFactsRepository(caseFactsRepository);
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ai-service-factory-injection' });
    errorLogger.logError(
      'WARNING: Failed to inject repository - AI will not have access to stored facts',
      {
        type: 'warn',
      }
    );
  }
```

### 3. Update AI IPC Handlers

#### A. Update AI_CHECK_STATUS Handler (line ~978)
```typescript
ipcMain.handle(IPC_CHANNELS.AI_CHECK_STATUS, async (_event, request: AICheckStatusRequest) => {
  try {
    // LAZY LOADING: Ensure AI services are ready
    await ensureAIServicesReady();

    // 1. VALIDATION: Validate input (even if empty)
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.AI_CHECK_STATUS,
      request || {}
    );

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors,
      };
    }

    // 2. BUSINESS LOGIC: Check connection status
    const status = await aiServiceFactory.checkConnection();
    return {
      success: true,
      connected: status.connected,
      endpoint: status.endpoint,
      model: status.model,
      error: status.error,
    };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:checkStatus' });

    // Check if it's an AI initialization error
    if (error instanceof Error && error.message.includes('Failed to initialize AI services')) {
      return {
        success: false,
        error: 'AI services are not available. Please try again later.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check AI status',
    };
  }
});
```

#### B. Update AI_CONFIGURE Handler (line ~1043)
```typescript
ipcMain.handle(IPC_CHANNELS.AI_CONFIGURE, async (_, request: AIConfigureRequest) => {
  try {
    // LAZY LOADING: Ensure AI services are ready
    await ensureAIServicesReady();

    // 1. VALIDATION: Validate input before processing
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.AI_CONFIGURE,
      request
    );

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors,
      };
    }

    // 2. BUSINESS LOGIC: Configure OpenAI via AIServiceFactory
    await aiServiceFactory.configureOpenAI(validationResult.data);

    errorLogger.logError('OpenAI configured successfully via AIServiceFactory', {
      type: 'info',
      provider: 'openai',
    });

    return { success: true };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:configure' });

    // Check if it's an AI initialization error
    if (error instanceof Error && error.message.includes('Failed to initialize AI services')) {
      return {
        success: false,
        error: 'AI services are not available. Please configure later.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure AI',
    };
  }
});
```

#### C. Update AI_TEST_CONNECTION Handler (line ~1110)
```typescript
ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (_, request: AITestConnectionRequest) => {
  try {
    // LAZY LOADING: Ensure AI services are ready
    await ensureAIServicesReady();

    // 1. VALIDATION: Validate input before processing
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.AI_TEST_CONNECTION,
      request
    );

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors,
      };
    }

    // 2. BUSINESS LOGIC: Test connection via AIServiceFactory
    const status = await aiServiceFactory.testOpenAIConnection({
      apiKey: validationResult.data.apiKey,
      model: validationResult.data.model || 'gpt-4o',
    });

    errorLogger.logError('OpenAI connection test completed', {
      type: 'info',
      connected: status.connected,
    });

    return {
      success: true,
      connected: status.connected,
      endpoint: status.endpoint,
      model: status.model,
      error: status.error,
    };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:testConnection' });

    // Check if it's an AI initialization error
    if (error instanceof Error && error.message.includes('Failed to initialize AI services')) {
      return {
        success: false,
        error: 'AI services are not available for testing.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test AI connection',
    };
  }
});
```

#### D. Update AI_CHAT Handler (line ~1157)
```typescript
ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, request: AIChatRequest) => {
  try {
    // LAZY LOADING: Ensure AI services are ready
    await ensureAIServicesReady();

    // 1. VALIDATION: Validate and sanitize input
    const validationResult = await validationMiddleware.validate(IPC_CHANNELS.AI_CHAT, request);

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors,
      };
    }

    // 2. BUSINESS LOGIC: Process chat with validated data
    const response = await aiServiceFactory.chat({
      messages: validationResult.data.messages as unknown[], // Type conversion
      context: validationResult.data.context,
      caseId: validationResult.data.caseId,
    });

    return {
      success: true,
      message: {
        role: response.response.role,
        content: response.response.content,
        timestamp: new Date().toISOString(),
      },
      sources: response.sources,
      tokensUsed: response.tokensUsed,
    };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:chat' });

    // Check if it's an AI initialization error
    if (error instanceof Error && error.message.includes('Failed to initialize AI services')) {
      return {
        success: false,
        error: 'AI services are temporarily unavailable. Please try again later.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process AI chat',
    };
  }
});
```

#### E. Update AI_STREAM_START Handler (line ~1235)
```typescript
ipcMain.handle(IPC_CHANNELS.AI_STREAM_START, async (event, request: AIStreamStartRequest) => {
  try {
    // LAZY LOADING: Ensure AI services are ready
    await ensureAIServicesReady();

    // 1. VALIDATION: Validate and sanitize input
    const validationResult = await validationMiddleware.validate(
      IPC_CHANNELS.AI_STREAM_START,
      request
    );

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors,
      };
    }

    // 2. BUSINESS LOGIC: Start streaming with validated data
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine if we should use function calling
    const useFunctionCalling = Boolean(validationResult.data.caseId);

    // Start async streaming (don't await - it runs in background)
    (async () => {
      try {
        if (useFunctionCalling) {
          // Use streamChatWithFunctions for case-specific conversations
          await aiServiceFactory.streamChatWithFunctions(
            {
              messages: validationResult.data.messages as unknown[],
              context: validationResult.data.context,
              caseId: validationResult.data.caseId,
            },
            validationResult.data.caseId,
            (token: string) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_TOKEN, token);
              }
            },
            () => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_COMPLETE);
              }
            },
            (error: string) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_ERROR, error);
              }
            }
          );
        } else {
          // Use regular streamChat for general conversations
          await aiServiceFactory.streamChat(
            {
              messages: validationResult.data.messages as unknown[],
              context: validationResult.data.context,
              caseId: validationResult.data.caseId,
            },
            (token: string) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_TOKEN, token);
              }
            },
            () => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_COMPLETE);
              }
            },
            (error: string) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_ERROR, error);
              }
            },
            (thinkToken: string) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_THINK_TOKEN, thinkToken);
              }
            },
            (sources: string[]) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AI_STREAM_SOURCES, sources);
              }
            }
          );
        }
      } catch (error) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(
            IPC_CHANNELS.AI_STREAM_ERROR,
            error instanceof Error ? error.message : 'Stream failed'
          );
        }
      }
    })();

    return {
      success: true,
      streamId,
    };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'ipc:ai:stream:start' });

    // Check if it's an AI initialization error
    if (error instanceof Error && error.message.includes('Failed to initialize AI services')) {
      return {
        success: false,
        error: 'AI streaming services are temporarily unavailable. Please try again later.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start AI stream',
    };
  }
});
```

## Expected Behavior After Implementation

### Startup Performance
- **Before**: AI services initialized eagerly at startup (100-200ms delay)
- **After**: AI services initialized only when first AI request is made

### First AI Request
- Will be slower (100-200ms) as services initialize
- Console will log: `[AI] Services initialized in Xms`
- Subsequent requests will be fast

### Error Handling
- If AI initialization fails, user gets friendly error message
- App continues to work (AI is optional feature)
- Errors logged for debugging

### Thread Safety
- Multiple concurrent AI requests during initialization handled correctly
- Uses promise-based mutex to prevent race conditions

## Testing the Implementation

1. **Verify Startup Time**:
   ```bash
   # Check console logs for startup time
   # Should NOT see AI initialization logs at startup
   ```

2. **Test First AI Request**:
   ```bash
   # Make first AI request
   # Should see: "[AI] Services initialized in Xms"
   ```

3. **Test Concurrent Requests**:
   ```bash
   # Send multiple AI requests simultaneously
   # Should initialize only once
   ```

4. **Test Error Recovery**:
   ```bash
   # Simulate AI init failure
   # Should get user-friendly error message
   ```

## Implementation Checklist

- [ ] Create `electron/ai-lazy-loader.ts` file
- [ ] Add import in `main.ts`
- [ ] Remove eager initialization code
- [ ] Update AI_CHECK_STATUS handler
- [ ] Update AI_CONFIGURE handler
- [ ] Update AI_TEST_CONNECTION handler
- [ ] Update AI_CHAT handler
- [ ] Update AI_STREAM_START handler
- [ ] Test startup time improvement
- [ ] Test first AI request timing
- [ ] Test concurrent request handling
- [ ] Test error scenarios

## Notes

- The lazy loading is transparent to the renderer process
- No changes needed in frontend code
- All existing functionality preserved
- Error messages are user-friendly
# ADR-003: IPC Boundary Architecture for Electron Security

## Status
Accepted

## Date
2024-02-15

## Context
Electron applications face unique security challenges due to the combination of Node.js and Chromium. The renderer process (web content) has potential access to Node.js APIs, which poses security risks. Electron's security best practices strongly recommend:
- Context isolation (isolating renderer JavaScript from preload scripts)
- Disabling Node.js integration in renderers
- Using IPC (Inter-Process Communication) for all privileged operations

Our application handles sensitive legal data and must prevent:
- XSS attacks from escalating to system access
- Malicious scripts accessing the database directly
- Unauthorized file system access
- Credential theft through renderer compromise

## Decision
Implement a strict IPC boundary architecture where:
1. All database operations execute in the main process only
2. Renderer process has zero direct database access
3. Communication happens exclusively through defined IPC channels
4. Context bridge exposes only safe, validated APIs to renderer
5. All IPC messages are validated with Zod schemas

Architecture:
```
Renderer (React) → Context Bridge → IPC → Main Process → Database
                                          ↓
                                    Validation
                                          ↓
                                    Authorization
                                          ↓
                                    Business Logic
                                          ↓
                                    Repository Layer
```

## Consequences

### Positive
- **Security isolation**: Compromised renderer cannot access database
- **Single source of truth**: All data operations in one place
- **Centralized validation**: Input validation at IPC boundary
- **Audit logging**: Single point to log all operations
- **Rate limiting**: Can throttle at IPC layer
- **Error handling**: Consistent error responses
- **Testing**: Easier to test business logic separately

### Negative
- **IPC overhead**: ~1-2ms latency per operation
- **Complexity**: More layers of abstraction
- **Debugging**: Harder to trace through IPC boundary
- **Type safety**: Must maintain types across boundary
- **Error propagation**: Complex error handling across processes
- **No direct queries**: Cannot use ORM in renderer

## Alternatives Considered

### Direct Database Access from Renderer
- **Pros**: Simpler architecture, less latency
- **Cons**: Major security risk, violates Electron best practices
- **Rejected because**: Unacceptable security risk

### REST API Server
- **Pros**: Standard web architecture, reusable for web version
- **Cons**: Additional process, network overhead, complexity
- **Rejected because**: Unnecessary for desktop-only application

### GraphQL Layer
- **Pros**: Flexible queries, type safety
- **Cons**: Complexity, overhead for simple CRUD
- **Rejected because**: Over-engineered for our needs

### WebSockets
- **Pros**: Real-time updates, bidirectional
- **Cons**: Complex state management, connection handling
- **Rejected because**: IPC already provides bidirectional communication

## Implementation Details

### Preload Script (Context Bridge)
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  cases: {
    create: (data) => ipcRenderer.invoke('cases:create', data),
    list: () => ipcRenderer.invoke('cases:list'),
    get: (id) => ipcRenderer.invoke('cases:get', id),
    update: (id, data) => ipcRenderer.invoke('cases:update', id, data),
    delete: (id) => ipcRenderer.invoke('cases:delete', id)
  }
});
```

### Main Process Handler
```typescript
ipcMain.handle('cases:create', async (event, data) => {
  // 1. Validate input
  const validated = createCaseSchema.parse(data);

  // 2. Authorize
  const session = await validateSession(event);
  if (!session) throw new UnauthorizedError();

  // 3. Business logic
  const kase = await caseService.create(validated, session.userId);

  // 4. Audit log
  await auditLogger.log('case.create', session.userId, kase.id);

  // 5. Return sanitized response
  return sanitizeResponse(kase);
});
```

### Security Measures
1. **Input validation**: Every IPC message validated with Zod
2. **Session validation**: Check session on every request
3. **Rate limiting**: Throttle requests per session
4. **Sanitization**: Clean responses before sending
5. **Error masking**: Don't leak internal errors to renderer

### Channel Naming Convention
```
domain:action
- auth:register
- auth:login
- cases:create
- cases:list
- evidence:upload
- chat:send
```

## Performance Considerations
- IPC adds ~1-2ms latency per call
- Use batch operations where possible
- Implement caching in main process
- Stream large datasets instead of loading all at once
- Use IPC for data, not UI state

## Testing Strategy
- Unit test handlers in isolation
- Integration test IPC communication
- Mock IPC in renderer tests
- Test error scenarios across boundary
- Verify security validations

## Migration Path
1. Define IPC channel interfaces
2. Implement validation schemas
3. Create main process handlers
4. Update preload script
5. Refactor renderer to use IPC
6. Remove direct database imports
7. Add comprehensive error handling

## Security Checklist
- [ ] Context isolation enabled
- [ ] Node integration disabled in renderer
- [ ] All IPC channels validated
- [ ] Session checking on privileged operations
- [ ] Rate limiting implemented
- [ ] Error messages sanitized
- [ ] Audit logging in place
- [ ] No sensitive data in IPC channel names

## References
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
# Dependency Injection Infrastructure

## Overview

This directory contains the InversifyJS-based dependency injection (DI) infrastructure for Justice Companion. The DI container replaces the previous singleton pattern with a more testable and maintainable IoC (Inversion of Control) container.

## Structure

```
src/shared/infrastructure/di/
├── types.ts         # Symbol constants for all services and repositories
├── interfaces.ts    # TypeScript interfaces for all dependencies
├── container.ts     # Container configuration and initialization
├── adapter.ts       # Migration adapters for gradual adoption
└── README.md        # This file
```

## Key Files

### `types.ts`
Defines unique symbols for all injectable dependencies:
- **Infrastructure:** Database, EncryptionService, AuditLogger, KeyManager
- **Repositories:** 18 repository symbols (Case, Evidence, User, etc.)
- **Services:** 27+ service symbols (Authentication, GDPR, Cache, etc.)

### `interfaces.ts`
Defines TypeScript interfaces for all dependencies to enable:
- Proper type checking
- Easy mocking in tests
- Clear dependency contracts
- Decoupling from implementations

### `container.ts`
Configures the InversifyJS container with:
- Singleton scope for infrastructure (Database, EncryptionService, AuditLogger)
- Transient scope for repositories (new instance per injection)
- Service bindings with proper dependency resolution
- Test container factory for unit testing

### `adapter.ts`
Provides migration helpers:
- `getService<T>(symbol)` - Get services from container
- `createSingletonProxy<T>(symbol)` - Create backward-compatible proxies
- Service-specific getters (e.g., `getCaseService()`)

## Usage

### In New Code
```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/shared/infrastructure/di/types';
import type { ICaseRepository } from '@/shared/infrastructure/di/interfaces';

@injectable()
export class MyService {
  constructor(
    @inject(TYPES.CaseRepository) private caseRepo: ICaseRepository
  ) {}
}
```

### In IPC Handlers
```typescript
import { getContainer } from '@/shared/infrastructure/di/container';
import { TYPES } from '@/shared/infrastructure/di/types';

const caseService = getContainer().get<ICaseService>(TYPES.CaseService);
const result = await caseService.createCase(input);
```

### In Tests
```typescript
import { createTestContainer } from '@/shared/infrastructure/di/container';
import Database from 'better-sqlite3';

const testDb = new Database(':memory:');
const container = createTestContainer(testDb);
const service = container.get<ICaseService>(TYPES.CaseService);
```

## Migration Status

### ✅ Completed (Phase 1)
- InversifyJS installed and configured
- TypeScript decorators enabled
- 50+ TYPES symbols defined
- All repository and service interfaces defined
- Container configuration completed
- CaseService migrated as proof of concept
- Test infrastructure verified

### 🔄 In Progress (Phase 2)
- Migrate remaining 27 services to use DI
- Update IPC handlers to use container
- Create integration tests

### 📋 TODO (Phase 3)
- Remove old singleton pattern (`repositories.ts`)
- Complete service migrations
- Update all imports
- Performance optimization

## Testing

Run the DI container tests:
```bash
# Unit tests
pnpm test src/shared/infrastructure/di/container.test.ts

# Integration test
node --import tsx test-di-container.mjs
```

## Benefits

1. **Testability:** Easy to mock dependencies
2. **Maintainability:** Clear dependency graph
3. **Flexibility:** Easy to swap implementations
4. **Type Safety:** Full TypeScript support
5. **Lifecycle Management:** Proper singleton/transient scoping

## Migration Guide

### Step 1: Add @injectable() Decorator
```typescript
import { injectable } from 'inversify';

@injectable()
export class MyService {
  // ...
}
```

### Step 2: Use Constructor Injection
```typescript
constructor(
  @inject(TYPES.Repository) private repo: IRepository
) {}
```

### Step 3: Register in Container
```typescript
container.bind<IMyService>(TYPES.MyService).to(MyService);
```

### Step 4: Resolve from Container
```typescript
const service = container.get<IMyService>(TYPES.MyService);
```

## Notes

- All encryption keys use 32 bytes (256 bits) for AES-256
- Test containers use a default test key for consistency
- Repositories are transient (new instance per injection)
- Infrastructure services are singletons
- The container supports both production and test environments
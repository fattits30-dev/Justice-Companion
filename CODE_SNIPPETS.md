# Justice Companion Code Snippets

Code patterns and examples based on Context7 documentation for the libraries used in Justice Companion.

> **Context7 Reference**: See `CONTEXT7_LIBRARIES.md` for full library IDs and token counts.

---

## Table of Contents

1. [Database Patterns (better-sqlite3)](#database-patterns-better-sqlite3)
2. [React Hooks Patterns](#react-hooks-patterns)
3. [React Hook Form Patterns](#react-hook-form-patterns)
4. [Electron IPC Patterns](#electron-ipc-patterns)
5. [Testing Patterns (Vitest)](#testing-patterns-vitest)
6. [State Management (Zustand)](#state-management-zustand)
7. [Styling (Tailwind CSS)](#styling-tailwind-css)
8. [TypeScript Patterns](#typescript-patterns)

---

## Database Patterns (better-sqlite3)

**Context7**: `/wiselibs/better-sqlite3` (9,279 tokens)

### Repository Pattern with Transactions

```typescript
// src/repositories/ExampleRepository.ts
import Database from 'better-sqlite3';
import { getDb } from '../db/database';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogger } from '../services/AuditLogger';

export class ExampleRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger
  ) {}

  private get db(): Database.Database {
    return getDb();
  }

  /**
   * Create with transaction and audit logging
   * Pattern: Transaction wrapping for data integrity
   */
  create(input: CreateInput): Example {
    const transaction = this.db.transaction(() => {
      // Encrypt sensitive data
      const encryptedData = this.encryptionService?.encrypt(input.sensitiveField);

      // Insert with prepared statement
      const stmt = this.db.prepare(`
        INSERT INTO examples (field1, field2, sensitive_field, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      const result = stmt.run(
        input.field1,
        input.field2,
        encryptedData ? JSON.stringify(encryptedData) : null
      );

      // Audit log
      this.auditLogger?.log({
        action: 'example.create',
        resourceType: 'example',
        resourceId: result.lastInsertRowid as number,
        metadata: { field1: input.field1 },
      });

      return this.getById(result.lastInsertRowid as number)!;
    });

    return transaction();
  }

  /**
   * Batch insert with single transaction
   * Pattern: Bulk operations for performance
   */
  createMany(items: CreateInput[]): Example[] {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO examples (field1, field2, created_at)
        VALUES (?, ?, datetime('now'))
      `);

      const results = items.map(item => {
        const result = stmt.run(item.field1, item.field2);
        return this.getById(result.lastInsertRowid as number)!;
      });

      return results;
    });

    return transaction();
  }

  /**
   * Optimized query with prepared statement
   * Pattern: Reusable prepared statements
   */
  private readonly findByIdStmt = this.db.prepare(`
    SELECT * FROM examples WHERE id = ?
  `);

  getById(id: number): Example | null {
    const row = this.findByIdStmt.get(id) as DatabaseRow | undefined;
    if (!row) {
      return null;
    }

    // Decrypt sensitive fields
    if (row.sensitive_field && this.encryptionService) {
      const decrypted = this.encryptionService.decrypt(
        JSON.parse(row.sensitive_field)
      );
      row.sensitive_field = decrypted;
    }

    return this.mapToModel(row);
  }
}
```

### Migration Pattern with Rollback Support

```typescript
// src/db/migrations/006_example.sql
-- UP
CREATE TABLE examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field1 TEXT NOT NULL,
  field2 TEXT,
  sensitive_field TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_examples_field1 ON examples(field1);
CREATE INDEX idx_examples_created_at ON examples(created_at);

CREATE TRIGGER examples_updated_at
AFTER UPDATE ON examples
FOR EACH ROW
BEGIN
  UPDATE examples SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- DOWN
DROP TRIGGER IF EXISTS examples_updated_at;
DROP INDEX IF EXISTS idx_examples_created_at;
DROP INDEX IF EXISTS idx_examples_field1;
DROP TABLE IF EXISTS examples;
```

---

## React Hooks Patterns

**Context7**: `/websites/react_dev` (327,580 tokens)

### Custom Data Fetching Hook

```typescript
// src/hooks/useDataFetch.ts
import { useState, useEffect, useCallback } from 'react';

interface UseDataFetchOptions<T> {
  fetchFn: () => Promise<T>;
  dependencies?: unknown[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Generic data fetching hook with loading/error states
 * Pattern: Separation of concerns, reusable logic
 */
export function useDataFetch<T>({
  fetchFn,
  dependencies = [],
  onSuccess,
  onError,
}: UseDataFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, onSuccess, onError]);

  useEffect(() => {
    void refetch();
  }, dependencies);

  return { data, isLoading, error, refetch };
}
```

### Optimized List Hook with Memoization

```typescript
// src/hooks/useFilteredList.ts
import { useMemo, useCallback } from 'react';

interface UseFilteredListOptions<T> {
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T) => number;
}

/**
 * Filtered and sorted list with memoization
 * Pattern: useMemo for expensive computations
 */
export function useFilteredList<T>({
  items,
  filterFn,
  sortFn,
}: UseFilteredListOptions<T>) {
  const [query, setQuery] = useState('');

  // Memoized filtering - only recalculates when items or query changes
  const filteredItems = useMemo(() => {
    if (!query) {
      return items;
    }
    return items.filter(item => filterFn(item, query));
  }, [items, query, filterFn]);

  // Memoized sorting - only recalculates when filtered items change
  const sortedItems = useMemo(() => {
    if (!sortFn) {
      return filteredItems;
    }
    return [...filteredItems].sort(sortFn);
  }, [filteredItems, sortFn]);

  // Stable callback reference
  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    items: sortedItems,
    query,
    setQuery: handleSearch,
    count: sortedItems.length,
    totalCount: items.length,
  };
}
```

---

## React Hook Form Patterns

**Context7**: `/react-hook-form/react-hook-form` (53,279 tokens)

### Form with Validation

```typescript
// src/components/CaseForm.tsx
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

interface CaseFormData {
  title: string;
  caseType: 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
  description: string;
  status?: 'active' | 'closed' | 'pending';
}

/**
 * Type-safe form with validation
 * Pattern: React Hook Form with TypeScript
 */
export function CaseForm({ onSubmit }: { onSubmit: SubmitHandler<CaseFormData> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CaseFormData>({
    defaultValues: {
      title: '',
      caseType: 'other',
      description: '',
      status: 'active',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title field with validation */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Case Title *
        </label>
        <input
          {...register('title', {
            required: 'Title is required',
            minLength: {
              value: 3,
              message: 'Title must be at least 3 characters',
            },
            maxLength: {
              value: 200,
              message: 'Title must be less than 200 characters',
            },
          })}
          className="mt-1 block w-full rounded-md border-gray-300"
          placeholder="Enter case title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Case type select */}
      <div>
        <label htmlFor="caseType" className="block text-sm font-medium">
          Case Type *
        </label>
        <select
          {...register('caseType', { required: 'Case type is required' })}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option value="employment">Employment</option>
          <option value="housing">Housing</option>
          <option value="consumer">Consumer</option>
          <option value="family">Family</option>
          <option value="debt">Debt</option>
          <option value="other">Other</option>
        </select>
        {errors.caseType && (
          <p className="mt-1 text-sm text-red-600">{errors.caseType.message}</p>
        )}
      </div>

      {/* Description textarea */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          {...register('description', {
            maxLength: {
              value: 5000,
              message: 'Description must be less than 5000 characters',
            },
          })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300"
          placeholder="Describe the case details..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Case'}
      </button>
    </form>
  );
}
```

---

## Electron IPC Patterns

**Context7**: `/electron/electron` (253,046 tokens)

### Type-Safe IPC Communication

```typescript
// src/types/ipc.ts
export const IPC_CHANNELS = {
  CASES_CREATE: 'cases:create',
  CASES_GET: 'cases:get',
  CASES_LIST: 'cases:list',
  CASES_UPDATE: 'cases:update',
  CASES_DELETE: 'cases:delete',
} as const;

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// electron/main.ts
import { ipcMain } from 'electron';
import { CaseService } from '../services/CaseService';

/**
 * Type-safe IPC handler pattern
 * Pattern: Strong typing, error handling, async/await
 */
export function setupCaseHandlers(caseService: CaseService): void {
  // Create case
  ipcMain.handle(
    IPC_CHANNELS.CASES_CREATE,
    async (_, input: CreateCaseInput): Promise<IPCResponse<Case>> => {
      try {
        const caseData = await caseService.create(input);
        return { success: true, data: caseData };
      } catch (error) {
        console.error('IPC cases:create error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Get case by ID
  ipcMain.handle(
    IPC_CHANNELS.CASES_GET,
    async (_, id: number): Promise<IPCResponse<Case>> => {
      try {
        const caseData = await caseService.getById(id);
        if (!caseData) {
          return { success: false, error: 'Case not found' };
        }
        return { success: true, data: caseData };
      } catch (error) {
        console.error('IPC cases:get error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
}

// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure context bridge pattern
 * Pattern: Expose only specific IPC channels, no node APIs
 */
contextBridge.exposeInMainWorld('justiceAPI', {
  createCase: (input: CreateCaseInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.CASES_CREATE, input),

  getCase: (id: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.CASES_GET, id),

  listCases: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CASES_LIST),

  updateCase: (id: number, input: UpdateCaseInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.CASES_UPDATE, id, input),

  deleteCase: (id: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.CASES_DELETE, id),
});

// src/types/electron.d.ts
export interface JusticeAPI {
  createCase: (input: CreateCaseInput) => Promise<IPCResponse<Case>>;
  getCase: (id: number) => Promise<IPCResponse<Case>>;
  listCases: () => Promise<IPCResponse<Case[]>>;
  updateCase: (id: number, input: UpdateCaseInput) => Promise<IPCResponse<Case>>;
  deleteCase: (id: number) => Promise<IPCResponse<void>>;
}

declare global {
  interface Window {
    justiceAPI: JusticeAPI;
  }
}
```

---

## Testing Patterns (Vitest)

**Context7**: `/vitest-dev/vitest` (178,022 tokens)

### Repository Unit Tests

```typescript
// src/repositories/CaseRepository.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { CaseRepository } from './CaseRepository';
import * as databaseModule from '../db/database';

describe('CaseRepository', () => {
  let db: Database.Database;
  let repository: CaseRepository;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create schema
    db.exec(`
      CREATE TABLE cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        case_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Mock getDb to return test database
    vi.spyOn(databaseModule, 'getDb').mockReturnValue(db);

    repository = new CaseRepository();
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a case with required fields', () => {
      const input = {
        title: 'Test Case',
        caseType: 'employment' as const,
        description: 'Test description',
      };

      const result = repository.create(input);

      expect(result).toMatchObject({
        id: 1,
        title: 'Test Case',
        caseType: 'employment',
        description: 'Test description',
        status: 'active',
      });
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error for invalid input', () => {
      const input = {
        title: '', // Invalid: empty title
        caseType: 'employment' as const,
      };

      expect(() => repository.create(input)).toThrow('Title is required');
    });
  });

  describe('list', () => {
    it('should return empty array when no cases exist', () => {
      const result = repository.list();
      expect(result).toEqual([]);
    });

    it('should return all cases ordered by creation date', () => {
      // Create multiple cases
      repository.create({ title: 'Case 1', caseType: 'employment' });
      repository.create({ title: 'Case 2', caseType: 'housing' });
      repository.create({ title: 'Case 3', caseType: 'consumer' });

      const result = repository.list();

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Case 3'); // Most recent first
      expect(result[2].title).toBe('Case 1'); // Oldest last
    });
  });
});
```

### React Component Tests

```typescript
// src/components/CaseCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaseCard } from './CaseCard';

describe('CaseCard', () => {
  const mockCase = {
    id: 1,
    title: 'Employment Dispute',
    caseType: 'employment',
    description: 'Unfair dismissal case',
    status: 'active',
    createdAt: '2025-10-08T12:00:00Z',
    updatedAt: '2025-10-08T12:00:00Z',
  };

  it('should render case information', () => {
    render(<CaseCard case={mockCase} />);

    expect(screen.getByText('Employment Dispute')).toBeInTheDocument();
    expect(screen.getByText('employment')).toBeInTheDocument();
    expect(screen.getByText('Unfair dismissal case')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(<CaseCard case={mockCase} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockCase.id);
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<CaseCard case={mockCase} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockCase);
  });
});
```

---

## State Management (Zustand)

**Context7**: `/pmndrs/zustand` (4,723 tokens)

### Simple State Store

```typescript
// src/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  // State
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeView: 'dashboard' | 'cases' | 'chat' | 'documents';

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setActiveView: (view: AppState['activeView']) => void;
  reset: () => void;
}

const initialState = {
  theme: 'light' as const,
  sidebarOpen: true,
  activeView: 'dashboard' as const,
};

/**
 * Global app state with Zustand
 * Pattern: Simple, type-safe state management
 */
export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setTheme: (theme) => set({ theme }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setActiveView: (activeView) => set({ activeView }),

  reset: () => set(initialState),
}));

// Usage in components
import { useAppStore } from '../stores/appStore';

function Header() {
  const { theme, setTheme, toggleSidebar } = useAppStore();

  return (
    <header>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </header>
  );
}
```

---

## Styling (Tailwind CSS)

**Context7**: `/websites/tailwindcss` (588,105 tokens)

### Responsive Component Patterns

```tsx
// src/components/ResponsiveCard.tsx

/**
 * Responsive card with Tailwind CSS
 * Pattern: Mobile-first responsive design
 */
export function ResponsiveCard({ title, children }: CardProps): JSX.Element {
  return (
    <div className="
      /* Mobile: Full width, small padding */
      w-full p-4

      /* Tablet: Max width, medium padding */
      sm:max-w-md sm:p-6

      /* Desktop: Large max width, large padding */
      lg:max-w-2xl lg:p-8

      /* Styling */
      bg-white dark:bg-gray-800
      rounded-lg
      shadow-md hover:shadow-lg
      transition-shadow duration-200
    ">
      <h3 className="
        text-lg sm:text-xl lg:text-2xl
        font-semibold
        text-gray-900 dark:text-gray-100
        mb-4
      ">
        {title}
      </h3>

      <div className="
        text-sm sm:text-base
        text-gray-700 dark:text-gray-300
      ">
        {children}
      </div>
    </div>
  );
}
```

### Custom Component with @apply

```css
/* src/styles/components.css */

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-md;
    @apply hover:bg-blue-700 active:bg-blue-800;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
    @apply transition-colors duration-150;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-gray-200 text-gray-900 rounded-md;
    @apply hover:bg-gray-300 active:bg-gray-400;
    @apply focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
    @apply transition-colors duration-150;
  }

  .card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md;
    @apply border border-gray-200 dark:border-gray-700;
    @apply p-6;
  }

  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
    @apply dark:bg-gray-700 dark:border-gray-600 dark:text-white;
  }
}
```

---

## TypeScript Patterns

**Context7**: `/microsoft/typescript` (3,173,319 tokens)

### Strict Type Definitions

```typescript
// src/types/models.ts

/**
 * Strict type definitions with TypeScript
 * Pattern: Discriminated unions, type guards, utility types
 */

// Base types
export type CaseType = 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
export type CaseStatus = 'active' | 'closed' | 'pending';

// Entity interfaces
export interface Case {
  id: number;
  title: string;
  caseType: CaseType;
  description?: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
}

// Input types (for creation)
export interface CreateCaseInput {
  title: string;
  caseType: CaseType;
  description?: string;
  status?: CaseStatus;
}

// Update types (all fields optional except metadata)
export type UpdateCaseInput = Partial<Omit<Case, 'id' | 'createdAt' | 'updatedAt'>>;

// Response wrapper types
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

// Type guard functions
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: APIResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

// Usage example
async function handleCaseCreation(input: CreateCaseInput): Promise<Case> {
  const response = await window.justiceAPI.createCase(input);

  if (isErrorResponse(response)) {
    throw new Error(response.error);
  }

  // TypeScript knows response.data is Case here
  return response.data;
}
```

### Generic Repository Pattern

```typescript
// src/repositories/BaseRepository.ts

/**
 * Generic repository base class
 * Pattern: DRY, type-safe CRUD operations
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(
    protected tableName: string,
    protected encryptionService?: EncryptionService,
    protected auditLogger?: AuditLogger
  ) {}

  protected abstract mapToModel(row: DatabaseRow): T;
  protected abstract get createColumns(): string[];
  protected abstract get selectColumns(): string[];

  protected get db(): Database.Database {
    return getDb();
  }

  /**
   * Generic getById with type safety
   */
  getById(id: number): T | null {
    const stmt = this.db.prepare(`
      SELECT ${this.selectColumns.join(', ')}
      FROM ${this.tableName}
      WHERE id = ?
    `);

    const row = stmt.get(id) as DatabaseRow | undefined;
    return row ? this.mapToModel(row) : null;
  }

  /**
   * Generic list with optional filtering
   */
  list(where?: string, params?: unknown[]): T[] {
    const sql = `
      SELECT ${this.selectColumns.join(', ')}
      FROM ${this.tableName}
      ${where ? `WHERE ${where}` : ''}
      ORDER BY created_at DESC
    `;

    const stmt = this.db.prepare(sql);
    const rows = params ? stmt.all(...params) : stmt.all();

    return (rows as DatabaseRow[]).map(row => this.mapToModel(row));
  }

  /**
   * Generic delete with audit logging
   */
  delete(id: number): boolean {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.run(id);

      this.auditLogger?.log({
        action: `${this.tableName}.delete`,
        resourceType: this.tableName,
        resourceId: id,
      });

      return result.changes > 0;
    });

    return transaction();
  }
}
```

---

## Additional Resources

- **Full Library Reference**: See `CONTEXT7_LIBRARIES.md` for all 46 libraries
- **Context7 API Guide**: See `CONTEXT7_USAGE_GUIDE.md` for API usage
- **Query Context7**: Use the API to get specific documentation snippets

```bash
# Example: Get React Hook Form documentation
curl -s "https://context7.com/api/v1/search?query=react-hook-form+useForm+register" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"
```

---

**Last Updated**: 2025-10-08
**Total Code Examples**: 15 patterns across 8 categories
**Context7 Libraries Referenced**: 10 (better-sqlite3, React, React Hook Form, Electron, Vitest, Zustand, Tailwind CSS, TypeScript, and more)

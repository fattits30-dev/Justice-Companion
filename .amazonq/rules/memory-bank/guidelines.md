# Justice Companion - Development Guidelines

## Code Quality Standards

### TypeScript Strict Mode
- Strict type checking enabled across all files
- Explicit return types required for all functions and methods
- No implicit any types allowed
- Null safety enforced with strict null checks

### Naming Conventions
- **Classes**: PascalCase (e.g., `ErrorLogger`, `CaseRepository`, `AIService`)
- **Interfaces/Types**: PascalCase (e.g., `ErrorLogEntry`, `CreateCaseInput`, `AIConfig`)
- **Functions/Methods**: camelCase (e.g., `logError`, `createCase`, `checkConnection`)
- **Variables**: camelCase (e.g., `errorLogger`, `caseRepository`, `mainWindow`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_AI_CONFIG`, `IPC_CHANNELS`, `SYSTEM_PROMPT_TEMPLATE`)
- **Private Class Members**: camelCase with `private` keyword (e.g., `private config`, `private logFilePath`)

### File Organization
- One primary class/component per file
- Export singleton instances at bottom of file
- Group related functionality together
- Separate concerns (models, repositories, services, hooks)

## Architectural Patterns

### Repository Pattern (5/5 files)
All database operations use the Repository pattern for data access abstraction:

```typescript
export class CaseRepository {
  create(input: CreateCaseInput): Case { }
  findById(id: number): Case | null { }
  findAll(status?: CaseStatus): Case[] { }
  update(id: number, input: UpdateCaseInput): Case | null { }
  delete(id: number): boolean { }
}

export const caseRepository = new CaseRepository();
```

### Service Layer Pattern (5/5 files)
Business logic separated into service classes with validation:

```typescript
export class CaseService {
  createCase(input: CreateCaseInput): Case {
    // Validation logic
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Case title is required");
    }
    // Delegate to repository
    return caseRepository.create(input);
  }
}

export const caseService = new CaseService();
```

### Singleton Pattern (5/5 files)
Services and utilities exported as singleton instances:

```typescript
export const errorLogger = new ErrorLogger('logs', 'errors.log', 500, 3);
export const aiService = new AIService();
export const caseRepository = new CaseRepository();
```

### Custom React Hooks (4/5 files)
Encapsulate stateful logic in reusable hooks:

```typescript
export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    // Implementation
  }, []);

  return { cases, loading, error, fetchCases };
}
```

## Error Handling Standards

### Comprehensive Error Logging (5/5 files)
Every operation logs errors with context using the ErrorLogger:

```typescript
try {
  // Operation
  errorLogger.logError('Operation successful', { type: 'info', id });
} catch (error) {
  errorLogger.logError(error, { context: 'operationName', input });
  throw error;
}
```

### Try-Catch Blocks (5/5 files)
All async operations and critical code wrapped in try-catch:

```typescript
async chat(request: AIChatRequest): Promise<AIResponse> {
  try {
    // Implementation
    return { success: true, message, sources };
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'AIService.chat' });
    return { success: false, error: errorMessage, code: 'EXCEPTION' };
  }
}
```

### Error Response Pattern (4/5 files)
Consistent error response structure with success flag:

```typescript
return {
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE'
};
```

## Database Patterns

### SQL Prepared Statements (5/5 files)
Always use prepared statements with named parameters:

```typescript
const stmt = db.prepare(`
  INSERT INTO cases (title, description, case_type, status)
  VALUES (@title, @description, @caseType, 'active')
`);

const result = stmt.run({
  title: input.title,
  description: input.description ?? null,
  caseType: input.caseType,
});
```

### Column Aliasing (5/5 files)
Map snake_case database columns to camelCase TypeScript:

```typescript
SELECT
  id,
  case_type as caseType,
  created_at as createdAt,
  updated_at as updatedAt
FROM cases
```

### Null Coalescing (4/5 files)
Use nullish coalescing operator for optional values:

```typescript
description: input.description ?? null
temperature: request.config?.temperature ?? this.config.temperature
```

## API Communication Patterns

### Fetch API with Timeout (4/5 files)
All external API calls include timeout signals:

```typescript
const response = await fetch(`${this.config.endpoint}/models`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(5000), // 5 second timeout
});
```

### Connection Validation (4/5 files)
Check service availability before operations:

```typescript
const status = await this.checkConnection();
if (!status.connected) {
  return {
    success: false,
    error: `Service not connected: ${status.error}`,
    code: 'SERVICE_OFFLINE',
  };
}
```

### Response Validation (4/5 files)
Always validate API responses before processing:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  errorLogger.logError('API request failed', { status: response.status });
  return { success: false, error: `API error: ${response.status}` };
}
```

## React Patterns

### useCallback for Functions (4/5 files)
Memoize callback functions to prevent unnecessary re-renders:

```typescript
const fetchCases = useCallback(async () => {
  setLoading(true);
  setError(null);
  // Implementation
}, []);
```

### State Management Pattern (4/5 files)
Consistent state structure with loading and error states:

```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### Effect Cleanup (4/5 files)
Always reset loading state in finally blocks:

```typescript
try {
  setLoading(true);
  // Operation
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

## Type Safety Patterns

### Explicit Type Annotations (5/5 files)
Always annotate function parameters and return types:

```typescript
async createCase(input: CreateCaseInput): Promise<Case | null> { }
logError(error: Error | string, context?: Record<string, unknown>): void { }
```

### Type Guards (4/5 files)
Use type guards for runtime type checking:

```typescript
const errorMessage = error instanceof Error ? error.message : 'Unknown error';
const error = reason instanceof Error ? reason : new Error(String(reason));
```

### Generic Type Assertions (4/5 files)
Cast database results to proper types:

```typescript
return stmt.get(id) as Case | null;
return db.prepare(query).all() as Case[];
```

## Documentation Standards

### JSDoc Comments (5/5 files)
Document all public methods with JSDoc:

```typescript
/**
 * Create a new case with validation
 */
createCase(input: CreateCaseInput): Case { }

/**
 * Check if LM Studio is running and accessible
 */
async checkConnection(): Promise<AIStatus> { }
```

### Inline Comments (4/5 files)
Add clarifying comments for complex logic:

```typescript
// Check connection first
// Enable streaming
// Rotate existing backups
// 5 second timeout
```

## Configuration Patterns

### Default Configuration Objects (4/5 files)
Define defaults and merge with user config:

```typescript
const DEFAULT_AI_CONFIG = {
  endpoint: 'http://localhost:1234/v1',
  model: 'local-model',
  temperature: 0.3,
  maxTokens: 2000,
};

constructor(config?: Partial<AIConfig>) {
  this.config = { ...DEFAULT_AI_CONFIG, ...config } as AIConfig;
}
```

### Configuration Updates (3/5 files)
Provide methods to update configuration:

```typescript
updateConfig(config: Partial<AIConfig>): void {
  this.config = { ...this.config, ...config };
  errorLogger.logError('Configuration updated', { type: 'info' });
}
```

## Validation Patterns

### Input Validation (4/5 files)
Validate all user inputs before processing:

```typescript
if (!input.title || input.title.trim().length === 0) {
  throw new Error("Case title is required");
}
if (input.title.length > 200) {
  throw new Error("Case title must be 200 characters or less");
}
```

### Early Returns (4/5 files)
Use early returns for validation and error cases:

```typescript
if (!fs.existsSync(this.logFilePath)) {
  return;
}
if (updates.length === 0) {
  return this.findById(id);
}
```

## Async/Await Patterns

### Async Function Declarations (5/5 files)
All asynchronous operations use async/await:

```typescript
async fetchCases(): Promise<void> {
  const response = await window.justiceAPI.getAllCases();
}
```

### Promise Return Types (5/5 files)
Explicitly type Promise return values:

```typescript
async checkConnection(): Promise<AIStatus> { }
async createCase(input: CreateCaseInput): Promise<Case | null> { }
```

## Code Formatting

### Indentation
- 2 spaces for indentation (consistent across all files)
- No tabs

### String Literals
- Single quotes for strings: `'example'`
- Template literals for interpolation: `` `${variable}` ``

### Semicolons
- Required at end of statements

### Line Length
- Multi-line SQL queries for readability
- Break long function calls across multiple lines

### Object Literals
- Trailing commas in multi-line objects and arrays

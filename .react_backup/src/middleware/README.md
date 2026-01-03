# Validation Middleware

Comprehensive input validation system for Justice Companion IPC handlers.

## Quick Start

### Basic Usage

```typescript
import { getValidationMiddleware } from "./ValidationMiddleware";
import { auditLogger } from "../services/AuditLogger";

// Initialize middleware
const validationMiddleware = getValidationMiddleware(auditLogger);

// Validate request in IPC handler
ipcMain.handle("case:create", async (_, request) => {
  try {
    // 1. Validate input
    const validated = await validationMiddleware.validate(
      "case:create",
      request,
    );

    // 2. Process validated data
    return await caseService.create(validated.input);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, errors: error.fields };
    }
    throw error;
  }
});
```

## Features

- **Zod Schema Validation**: Runtime type checking with user-friendly errors
- **XSS Prevention**: HTML sanitization for all string inputs
- **SQL Injection Detection**: Pattern-based validation (secondary to parameterized queries)
- **DoS Prevention**: String limit (10,000 chars), array limit (1,000 items)
- **Performance Monitoring**: Tracks validation duration, alerts on >10ms
- **Audit Logging**: All validation failures logged for security monitoring

## Architecture

### 3-Step Pattern

All IPC handlers follow this pattern:

```typescript
// 1. VALIDATION: Schema validation + sanitization
const validated = await validationMiddleware.validate(channel, request);

// 2. AUTHORIZATION: Check user permissions
const userId = getCurrentUserIdFromSession();
if (validated.resourceOwnerId !== userId) {
  throw new Error("Unauthorized");
}

// 3. BUSINESS LOGIC: Process validated + authorized request
return await service.process(validated);
```

### Validation Flow

```
User Input → Zod Schema → Sanitization → Business Rules → Validated Data
             ↓ fail         ↓ fail          ↓ fail
          ValidationError  ValidationError  ValidationError
```

## Schema Definition

Schemas are defined in `src/middleware/schemas/`:

```typescript
// auth-schemas.ts
export const authRegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z
    .string()
    .min(12)
    .refine((pwd) => /[a-z]/.test(pwd), "Must contain lowercase")
    .refine((pwd) => /[A-Z]/.test(pwd), "Must contain uppercase")
    .refine((pwd) => /[0-9]/.test(pwd), "Must contain number"),
  email: z.string().email(),
});
```

Register schema in `schemas/index.ts`:

```typescript
import { IPC_CHANNELS } from "../../types/ipc";
import { authRegisterSchema } from "./auth-schemas";

export const ipcSchemas = {
  [IPC_CHANNELS.AUTH_REGISTER]: authRegisterSchema,
  // ... other schemas
};
```

## Security Features

### 1. XSS Prevention

```typescript
// Input: <script>alert('xss')</script>
// Output: &lt;script&gt;alert('xss')&lt;/script&gt;
```

### 2. SQL Injection Detection

```typescript
// Detects: ' OR 1=1 --, UNION SELECT, DROP TABLE
// Throws: ValidationError with 'Invalid characters detected'
```

### 3. Path Traversal Prevention

```typescript
// Detects: ../, ../../etc/passwd
// Throws: ValidationError
```

### 4. DoS Prevention

```typescript
// String limit: 10,000 characters
// Array limit: 1,000 items
// Throws: ValidationError on exceeding limits
```

## Error Handling

### ValidationError Structure

```typescript
class ValidationError extends Error {
  fields: Record<string, string[]>; // Field-level errors
  code: string; // Error code (VALIDATION_FAILED, etc.)
}
```

### User-Friendly Errors

```typescript
{
  "success": false,
  "errors": {
    "username": ["Username must be at least 3 characters"],
    "password": [
      "Password must contain at least one uppercase letter",
      "Password must contain at least one number"
    ]
  }
}
```

## Performance

### Metrics

```typescript
const metrics = validationMiddleware.getMetrics();

console.log(metrics);
// {
//   totalValidations: 1250,
//   totalDuration: 8450.23,
//   averageDuration: 6.76,
//   channelMetrics: Map {
//     'case:create' => { count: 150, totalMs: 1023.45, avgMs: 6.82 },
//     'auth:login' => { count: 300, totalMs: 2145.67, avgMs: 7.15 }
//   },
//   slowValidations: [
//     { channel: 'case:create', duration: 12.34, timestamp: Date }
//   ]
// }
```

### Optimization Tips

1. **Combine `.refine()` calls**: Multiple refinements slow down validation
2. **Use LRU cache**: For idempotent operations (e.g., user lookup)
3. **Simplify regex**: Complex patterns increase validation time

## Testing

### Unit Tests

```typescript
describe("ValidationMiddleware", () => {
  it("should reject XSS payloads", async () => {
    const middleware = new ValidationMiddleware();
    const malicious = { title: '<script>alert("xss")</script>' };

    await expect(middleware.validate("case:create", malicious)).rejects.toThrow(
      "Invalid characters detected",
    );
  });

  it("should validate within 10ms", async () => {
    const middleware = new ValidationMiddleware();
    const input = { username: "validuser", password: "ValidPass123!" };

    const start = performance.now();
    await middleware.validate("auth:register", input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
```

## Troubleshooting

### Issue: Validation Too Slow

**Symptom**: Warning logs showing >10ms validation time

**Solution**:

1. Check if schema has multiple `.refine()` calls (combine them)
2. Verify no complex regex patterns (simplify or cache)
3. Add LRU cache for repeated validations

### Issue: False Positive SQL Injection

**Symptom**: Valid input rejected as SQL injection

**Solution**:

1. Check `preventSqlInjection()` regex patterns
2. Add exception for specific field types (e.g., `fileContent`)
3. Use `shouldSkipSanitization()` to bypass for certain fields

### Issue: Schema Not Found

**Symptom**: `No validation schema defined for channel: xyz`

**Solution**:

1. Add schema to `src/middleware/schemas/[domain]-schemas.ts`
2. Register in `src/middleware/schemas/index.ts`
3. Add to `isNoValidationChannel()` if validation not needed

## Related Documentation

- **Architecture**: `docs/architecture/backend/VALIDATION_ARCHITECTURE.md`
- **Integration Status**: `docs/implementation/backend/VALIDATION_INTEGRATION_STATUS.md`
- **IPC Reference**: `docs/api/IPC_API_REFERENCE.md`
- **Security Audit**: `docs/reports/SECURITY_AUDIT_2025-01-11.md`

## Contributing

When adding new IPC channels:

1. **Define Schema**: Create in `src/middleware/schemas/[domain]-schemas.ts`
2. **Register Schema**: Add to `schemas/index.ts`
3. **Write Tests**: Unit tests in `ValidationMiddleware.test.ts`
4. **Document**: Add to IPC reference documentation

---

**Last Updated**: 2025-10-13
**Status**: ✅ Production Ready
**Test Coverage**: High (pending comprehensive unit tests)

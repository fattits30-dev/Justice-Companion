# API Client Quick Reference

## Installation

```typescript
import { apiClient, ApiError } from './lib/apiClient.ts';
import { initializeApiClient } from './lib/apiClient.ts';
```

---

## Initialization

### Basic Setup

```typescript
// Initialize with default port (8000)
await initializeApiClient();

// OR specify custom port
await initializeApiClient(8080);
```

### Set Session ID

```typescript
// After login
apiClient.setSessionId(sessionId);

// Clear session
apiClient.setSessionId(null);
```

---

## Case Management

### List Cases

```typescript
// All cases
const response = await apiClient.cases.list();

// With filters
const response = await apiClient.cases.list({
  status: 'active',
  limit: 20,
  offset: 0,
});

// Response structure
if (response.success) {
  const { items, total, hasMore } = response.data;
  console.log(`Loaded ${items.length} of ${total} cases`);
}
```

### Get Single Case

```typescript
const response = await apiClient.cases.get(caseId);

if (response.success) {
  const caseData = response.data;
  console.log(caseData.title);
}
```

### Create Case

```typescript
const response = await apiClient.cases.create({
  title: 'Employment Dispute',
  caseType: 'employment',
  description: 'Unfair dismissal claim...',
});

if (response.success) {
  const newCase = response.data;
  console.log(`Created case ${newCase.id}`);
}
```

### Update Case

```typescript
const response = await apiClient.cases.update(caseId, {
  status: 'closed',
  description: 'Case resolved...',
});

if (response.success) {
  const updated = response.data;
  console.log(`Updated case ${updated.id}`);
}
```

### Delete Case

```typescript
const response = await apiClient.cases.delete(caseId);

if (response.success) {
  console.log('Case deleted successfully');
}
```

### Get Statistics

```typescript
const response = await apiClient.cases.stats();

if (response.success) {
  const { totalCases, activeCases, closedCases } = response.data;
  console.log(`${activeCases} active of ${totalCases} total`);
}
```

---

## Evidence Management

### List Evidence for Case

```typescript
const response = await apiClient.evidence.list(caseId);

if (response.success) {
  const evidenceList = response.data;
  console.log(`Found ${evidenceList.length} evidence items`);
}
```

### Get Single Evidence

```typescript
const response = await apiClient.evidence.get(evidenceId);

if (response.success) {
  const evidence = response.data;
  console.log(evidence.fileName);
}
```

### Create Evidence

```typescript
const response = await apiClient.evidence.create({
  caseId: 1,
  fileName: 'contract.pdf',
  fileType: 'pdf',
  filePath: '/uploads/contract.pdf',
  description: 'Employment contract',
});

if (response.success) {
  const newEvidence = response.data;
  console.log(`Created evidence ${newEvidence.id}`);
}
```

### Update Evidence

```typescript
const response = await apiClient.evidence.update(evidenceId, {
  description: 'Updated description...',
});

if (response.success) {
  const updated = response.data;
  console.log(`Updated evidence ${updated.id}`);
}
```

### Delete Evidence

```typescript
const response = await apiClient.evidence.delete(evidenceId);

if (response.success) {
  console.log('Evidence deleted successfully');
}
```

---

## Error Handling

### Basic Try-Catch

```typescript
try {
  const response = await apiClient.cases.get(caseId);
  if (response.success) {
    // Success
  } else {
    // Error response
    console.error(response.error.message);
  }
} catch (error) {
  // Network error or exception
  console.error(error);
}
```

### ApiError Instance

```typescript
try {
  const response = await apiClient.cases.delete(caseId);
} catch (error) {
  if (error instanceof ApiError) {
    // Check specific status codes
    if (error.isStatus(404)) {
      console.error('Case not found');
    } else if (error.isStatus(403)) {
      console.error('Permission denied');
    } else if (error.isStatus(409)) {
      console.error('Cannot delete case with evidence');
    }

    // Check error codes
    if (error.isCode('VALIDATION_ERROR')) {
      console.error('Validation failed:', error.details);
    }

    // Generic error handling
    console.error(`HTTP ${error.status}: ${error.message}`);
  } else {
    // Unknown error
    console.error('Unexpected error:', error);
  }
}
```

### React Component Pattern

```typescript
const [cases, setCases] = useState<Case[]>([]);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const loadCases = async () => {
  try {
    setLoading(true);
    setError(null);

    apiClient.setSessionId(sessionId);
    const response = await apiClient.cases.list();

    if (response.success) {
      setCases(response.data.items);
    } else {
      setError(response.error.message);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isStatus(401)) {
        setError('Session expired. Please log in again.');
      } else if (error.isStatus(403)) {
        setError('Access denied.');
      } else {
        setError(error.message);
      }
    } else {
      setError('Network error. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

---

## HTTP Status Codes

### Common Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Session expired or invalid |
| 403 | Forbidden | No permission for this action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., delete with dependencies) |
| 500 | Internal Server Error | Server error - will retry |
| 502 | Bad Gateway | API unavailable - will retry |
| 503 | Service Unavailable | Server overloaded - will retry |

### Automatic Retries

The API client automatically retries:

- **Network errors** (DNS failures, connection refused, etc.)
- **5xx server errors** (500, 502, 503, etc.)

**Retry strategy:**
- Max 3 retries
- Exponential backoff (1s, 2s, 3s)
- Only for idempotent operations (GET, DELETE)

---

## Response Types

### Success Response

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string; // Optional success message
}
```

### Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;        // Error code (e.g., "VALIDATION_ERROR")
    message: string;     // Human-readable message
    details?: unknown;   // Additional error details
  };
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  items: T[];        // Array of items
  total: number;     // Total items (all pages)
  limit: number;     // Items per page
  offset: number;    // Current offset
  hasMore: boolean;  // More pages available?
}
```

---

## Configuration

### Custom Timeout

```typescript
const apiClient = new ApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 60000, // 60 seconds
});
```

### Custom Retry Settings

```typescript
const apiClient = new ApiClient({
  baseURL: 'http://localhost:8000',
  maxRetries: 5,     // Retry up to 5 times
  retryDelay: 2000,  // Start with 2 second delay
});
```

### Custom Headers

The API client automatically adds:
- `Content-Type: application/json`
- `X-Session-Id: <session-uuid>` (if session set)

To add custom headers, modify the `request()` method in `apiClient.ts`.

---

## Best Practices

### 1. Always Check Response Success

```typescript
// ✅ Good
const response = await apiClient.cases.get(caseId);
if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error.message);
}

// ❌ Bad - assumes success
const response = await apiClient.cases.get(caseId);
console.log(response.data); // Will crash if error
```

### 2. Use Try-Catch for Network Errors

```typescript
// ✅ Good
try {
  const response = await apiClient.cases.list();
  if (response.success) {
    setCases(response.data.items);
  }
} catch (error) {
  console.error('Network error:', error);
}

// ❌ Bad - unhandled promise rejection
const response = await apiClient.cases.list();
```

### 3. Set Session Before Requests

```typescript
// ✅ Good
apiClient.setSessionId(sessionId);
const response = await apiClient.cases.list();

// ❌ Bad - request will fail with 401
const response = await apiClient.cases.list();
```

### 4. Handle Specific Error Codes

```typescript
// ✅ Good
catch (error) {
  if (error instanceof ApiError) {
    if (error.isStatus(404)) {
      showError('Case not found');
    } else if (error.isStatus(403)) {
      showError('Permission denied');
    } else {
      showError(error.message);
    }
  }
}

// ❌ Bad - generic error message
catch (error) {
  showError('Something went wrong');
}
```

### 5. Use Loading States

```typescript
// ✅ Good
const [loading, setLoading] = useState(false);

const loadCases = async () => {
  setLoading(true);
  try {
    const response = await apiClient.cases.list();
    if (response.success) {
      setCases(response.data.items);
    }
  } finally {
    setLoading(false); // Always clear loading
  }
};

// Show loading UI
if (loading) return <Spinner />;
```

---

## Migration from IPC

### Before (IPC)

```typescript
const response = await window.justiceAPI.getAllCases(sessionId);
if (response.success) {
  setCases(response.data);
}
```

### After (HTTP)

```typescript
apiClient.setSessionId(sessionId);
const response = await apiClient.cases.list();
if (response.success) {
  setCases(response.data.items); // Note: .items for paginated response
}
```

### Key Differences

1. **Session management** - Set once with `setSessionId()` instead of passing to each call
2. **Paginated responses** - Use `response.data.items` instead of `response.data`
3. **Error types** - Catch `ApiError` instead of generic errors
4. **Retry logic** - Automatic retries for network/5xx errors

---

## TypeScript Types

### Import Types

```typescript
import type { Case, CreateCaseInput, UpdateCaseInput } from '../domains/cases/entities/Case.ts';
import type { Evidence, CreateEvidenceInput } from '../domains/evidence/entities/Evidence.ts';
```

### Generic Response Handling

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>
): Promise<T | null> {
  try {
    const response = await apiCall();
    if (response.success) {
      return response.data;
    } else {
      console.error(response.error.message);
      return null;
    }
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Usage
const cases = await handleApiCall(() => apiClient.cases.list());
```

---

## Debugging

### Enable Console Logging

Add to `apiClient.ts`:

```typescript
private async request<T>(...) {
  console.log(`[API] ${method} ${endpoint}`, { params, body });
  const response = await fetch(...);
  console.log(`[API] Response:`, response.status, responseData);
  return responseData;
}
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check request headers, payload, and response

### Verify Session ID

```typescript
console.log('Session ID:', apiClient.getSessionId());
```

### Test API Endpoint

```bash
# Test with curl
curl -X GET http://localhost:8000/cases \
  -H "X-Session-Id: your-session-id" \
  -H "Content-Type: application/json"
```

---

## FAQ

**Q: Why use HTTP instead of IPC?**
A: HTTP enables microservices architecture, allows Python AI backend, and provides better scalability.

**Q: Is HTTP slower than IPC?**
A: Slightly (~10ms overhead), but negligible for user experience.

**Q: What if FastAPI backend is down?**
A: API client will retry 3 times, then show user-friendly error message.

**Q: Can I use both IPC and HTTP?**
A: Yes, but not recommended. Choose one for consistency.

**Q: How do I migrate other endpoints?**
A: Follow the same pattern as case management. See `CASE-MANAGEMENT-HTTP-MIGRATION.md`.

---

**Next:** Read `docs/CASE-MANAGEMENT-HTTP-MIGRATION.md` for complete migration guide.

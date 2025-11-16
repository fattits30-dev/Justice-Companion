# Quick Start: HTTP Authentication

**For developers working with the new HTTP-based authentication system.**

---

## Prerequisites

1. **Node.js 20.18.0 LTS** installed
2. **Python 3.11+** installed
3. **FastAPI backend** running

---

## Step 1: Start FastAPI Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start backend server
python -m uvicorn backend.main:app --reload --port 8000
```

**Verify backend is running:**
```bash
curl http://127.0.0.1:8000/health
# Should return: {"status":"healthy","service":"Justice Companion Backend","version":"1.0.0"}
```

---

## Step 2: Start Electron Frontend

```bash
# In root directory
npm install  # First time only
npm run electron:dev
```

---

## Step 3: Test Authentication

### Register New User

**Via UI:**
1. Click "Create account" on login screen
2. Fill in:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Password: SecurePass123!
   - Confirm Password: SecurePass123!
   - Accept terms: ✓
3. Click "Sign Up"

**Via API (cURL):**
```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Login

**Via UI:**
1. Enter username: John Doe
2. Enter password: SecurePass123!
3. Check "Remember me" (optional)
4. Click "Sign In"

**Via API (cURL):**
```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "John Doe",
    "password": "SecurePass123!",
    "remember_me": false
  }'
```

### Check Session

**Via API (cURL):**
```bash
# Replace SESSION_ID with actual session ID from login response
curl http://127.0.0.1:8000/auth/session/550e8400-e29b-41d4-a716-446655440000
```

### Logout

**Via UI:**
1. Click user menu
2. Click "Logout"

**Via API (cURL):**
```bash
curl -X POST http://127.0.0.1:8000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Step 4: Run Integration Tests

```bash
# Run automated test suite
node scripts/test-auth-migration.mjs
```

**Expected output:**
```
=== Authentication Migration Tests ===

ℹ️  Testing health check endpoint...
✅ Health check passed

ℹ️  Testing user registration...
✅ Registration successful: test_user_1699876543210
User ID: 1
Session ID: 550e8400-e29b-41d4-a716-446655440000

ℹ️  Testing user login...
✅ Login successful: test_user_1699876543210
Session ID: 550e8400-e29b-41d4-a716-446655440000

ℹ️  Testing session validation...
✅ Session validation successful
User: test_user_1699876543210
Expires at: 2025-11-14T12:00:00Z

ℹ️  Testing user logout...
✅ Logout successful

ℹ️  Testing invalid credentials...
✅ Invalid credentials rejected correctly (401)

ℹ️  Testing invalid session...
✅ Invalid session rejected correctly (404)

=== Test Summary ===
Passed: 7/7

✅ All tests passed! Migration successful.
```

---

## Using the API Client in Code

### Import the client

```typescript
import { apiClient } from '../lib/apiClient.ts';
```

### Register new user

```typescript
try {
  const response = await apiClient.auth.register(
    'John Doe',
    'john@example.com',
    'SecurePass123!'
  );

  if (response.success) {
    console.log('User registered:', response.data.user);
    console.log('Session ID:', response.data.session.id);
    // Session ID is automatically stored in localStorage
  }
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### Login

```typescript
try {
  const response = await apiClient.auth.login(
    'John Doe',
    'SecurePass123!',
    false // remember_me
  );

  if (response.success) {
    console.log('Login successful:', response.data.user);
    // Session ID is automatically stored in localStorage
  }
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### Validate session

```typescript
const sessionId = localStorage.getItem('sessionId');

if (sessionId) {
  try {
    const response = await apiClient.auth.getSession(sessionId);

    if (response.success) {
      console.log('Session valid:', response.data.user);
    }
  } catch (error) {
    // Session expired or invalid
    localStorage.removeItem('sessionId');
    window.location.href = '/login';
  }
}
```

### Logout

```typescript
const sessionId = localStorage.getItem('sessionId');

if (sessionId) {
  try {
    await apiClient.auth.logout(sessionId);
    // Session ID is automatically removed from localStorage
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error.message);
  }
}
```

### Using AuthContext (Recommended)

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login('John Doe', 'SecurePass123!', false);
      // Login successful - user state updated automatically
    } catch (error) {
      // Error state updated automatically
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <button onClick={handleLogin}>Login</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Debugging

### Enable verbose logging

**Backend:**
```bash
# Run with DEBUG log level
uvicorn backend.main:app --reload --log-level debug
```

**Frontend:**
```typescript
// In browser console
localStorage.setItem('debug', 'auth:*');
```

### Check session in localStorage

```javascript
// In browser console
console.log('Session ID:', localStorage.getItem('sessionId'));
```

### View network requests

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Filter by "auth"
4. Perform login/register
5. Inspect request/response

### Common issues

**Issue: "Cannot connect to backend"**
```bash
# Solution: Check if backend is running
curl http://127.0.0.1:8000/health
```

**Issue: "Session not found"**
```javascript
// Solution: Clear localStorage and login again
localStorage.removeItem('sessionId');
```

**Issue: "CORS error"**
```python
# Solution: Check CORS config in backend/main.py
# Make sure frontend origin is allowed
allow_origins=["http://localhost:5176"]
```

---

## API Documentation

**Swagger UI:** http://127.0.0.1:8000/docs
**ReDoc:** http://127.0.0.1:8000/redoc

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/register` | 3 requests | 1 hour per IP |
| `/auth/login` | 5 requests | 15 minutes per user |
| `/auth/change-password` | 5 requests | 1 hour per user |

**When rate limited:**
```json
{
  "detail": {
    "message": "Too many login attempts. Please try again later.",
    "rate_limit_info": {
      "retry_after_seconds": 900
    }
  }
}
```

---

## Security Best Practices

1. **Never log passwords:**
   ```typescript
   // ❌ Bad
   console.log('Password:', password);

   // ✅ Good
   console.log('Attempting login...');
   ```

2. **Always validate input:**
   ```typescript
   if (password.length < 12) {
     throw new Error('Password must be at least 12 characters');
   }
   ```

3. **Clear sensitive data:**
   ```typescript
   // After logout
   localStorage.removeItem('sessionId');
   sessionStorage.clear();
   ```

4. **Use HTTPS in production:**
   ```typescript
   const API_BASE_URL = process.env.NODE_ENV === 'production'
     ? 'https://api.justicecompanion.com'
     : 'http://127.0.0.1:8000';
   ```

---

## Next Steps

1. Read [AUTH_HTTP_MIGRATION.md](./AUTH_HTTP_MIGRATION.md) for full migration details
2. Explore [FastAPI docs](http://127.0.0.1:8000/docs) for all endpoints
3. Review [backend/routes/auth.py](../backend/routes/auth.py) for implementation
4. Check [src/lib/apiClient.ts](../src/lib/apiClient.ts) for client code

---

**Questions?** File an issue or contact the development team.

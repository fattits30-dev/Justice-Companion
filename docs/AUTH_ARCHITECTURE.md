# Authentication Architecture

Visual representation of the authentication system before and after HTTP migration.

---

## Before: Electron IPC Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Renderer Process                │
│                                                              │
│  ┌──────────────┐        ┌─────────────────┐              │
│  │ LoginScreen  │───────▶│  AuthContext    │              │
│  └──────────────┘        └─────────────────┘              │
│                                    │                        │
│                                    │ useAuth()             │
│                                    ▼                        │
│                          ┌──────────────────┐              │
│                          │ window.justiceAPI │              │
│                          └──────────────────┘              │
│                                    │                        │
└────────────────────────────────────┼────────────────────────┘
                                     │
                         IPC Bridge (preload.ts)
                                     │
┌────────────────────────────────────┼────────────────────────┐
│                                    ▼                        │
│                     Electron Main Process                   │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │         electron/ipc-handlers/auth.ts         │          │
│  │                                                │          │
│  │  • ipcMain.handle('auth:login')              │          │
│  │  • ipcMain.handle('auth:register')            │          │
│  │  • ipcMain.handle('auth:logout')              │          │
│  │  • ipcMain.handle('auth:getSession')          │          │
│  └──────────────────────────────────────────────┘          │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │        src/services/AuthenticationService.ts  │          │
│  └──────────────────────────────────────────────┘          │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │            SQLite Database (Better-SQLite3)   │          │
│  │            • users table                       │          │
│  │            • sessions table                    │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Problems:**
- ❌ Tight coupling between renderer and main process
- ❌ Cannot test without Electron environment
- ❌ No standard HTTP tooling (curl, Postman)
- ❌ Hard to scale (single Electron process)
- ❌ Cannot share backend with web client

---

## After: HTTP REST API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Renderer Process                │
│                                                              │
│  ┌──────────────┐        ┌─────────────────┐              │
│  │ LoginScreen  │───────▶│  AuthContext    │              │
│  └──────────────┘        └─────────────────┘              │
│                                    │                        │
│                                    │ useAuth()             │
│                                    ▼                        │
│                          ┌──────────────────┐              │
│                          │   apiClient.auth  │              │
│                          └──────────────────┘              │
│                                    │                        │
└────────────────────────────────────┼────────────────────────┘
                                     │
                                     │ HTTP (fetch)
                                     │
┌────────────────────────────────────┼────────────────────────┐
│                                    ▼                        │
│                FastAPI Backend (Python 3.11+)               │
│                    http://127.0.0.1:8000                    │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │           backend/routes/auth.py              │          │
│  │                                                │          │
│  │  POST   /auth/register                        │          │
│  │  POST   /auth/login                            │          │
│  │  POST   /auth/logout                           │          │
│  │  GET    /auth/session/{session_id}            │          │
│  │  POST   /auth/change-password                  │          │
│  └──────────────────────────────────────────────┘          │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │      backend/services/auth_service.py         │          │
│  │      • AuthenticationService                   │          │
│  │      • SessionManager                          │          │
│  │      • RateLimitService                        │          │
│  └──────────────────────────────────────────────┘          │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │          SQLite Database (SQLAlchemy ORM)     │          │
│  │          • users table                         │          │
│  │          • sessions table                      │          │
│  │          • rate_limits table                   │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Loose coupling via REST API
- ✅ Test with standard HTTP tools (curl, Postman)
- ✅ Horizontally scalable backend
- ✅ Can share backend with web client
- ✅ Industry-standard architecture
- ✅ Better error handling and logging

---

## Authentication Flow (HTTP)

### 1. Registration

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                 │ Frontend │                │ Backend  │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ Fill registration form    │                           │
     │─────────────────────────▶ │                           │
     │                           │                           │
     │                           │ POST /auth/register       │
     │                           │ {username, email, pass}   │
     │                           │──────────────────────────▶│
     │                           │                           │
     │                           │                           │ Validate
     │                           │                           │ Hash password
     │                           │                           │ Create user
     │                           │                           │ Create session
     │                           │                           │
     │                           │   {user, session}        │
     │                           │◀──────────────────────────│
     │                           │                           │
     │                           │ Store sessionId           │
     │                           │ in localStorage           │
     │                           │                           │
     │ Redirect to dashboard     │                           │
     │◀─────────────────────────│                           │
     │                           │                           │
```

### 2. Login

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                 │ Frontend │                │ Backend  │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ Enter credentials         │                           │
     │─────────────────────────▶ │                           │
     │                           │                           │
     │                           │ POST /auth/login          │
     │                           │ {username, pass, remember}│
     │                           │──────────────────────────▶│
     │                           │                           │
     │                           │                           │ Check rate limit
     │                           │                           │ Verify password
     │                           │                           │ Create session
     │                           │                           │ Log audit event
     │                           │                           │
     │                           │   {user, session}        │
     │                           │◀──────────────────────────│
     │                           │                           │
     │                           │ Store sessionId           │
     │                           │ in localStorage           │
     │                           │                           │
     │ Show dashboard            │                           │
     │◀─────────────────────────│                           │
     │                           │                           │
```

### 3. Protected Route Access

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                 │ Frontend │                │ Backend  │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ Navigate to /dashboard    │                           │
     │─────────────────────────▶ │                           │
     │                           │                           │
     │                           │ Check localStorage        │
     │                           │ for sessionId             │
     │                           │                           │
     │                           │ GET /auth/session/{id}    │
     │                           │──────────────────────────▶│
     │                           │                           │
     │                           │                           │ Validate session
     │                           │                           │ Check expiration
     │                           │                           │
     │                           │   {user, session}        │
     │                           │◀──────────────────────────│
     │                           │                           │
     │                           │ Allow access              │
     │                           │                           │
     │ View dashboard            │                           │
     │◀─────────────────────────│                           │
     │                           │                           │
```

### 4. Session Expired

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                 │ Frontend │                │ Backend  │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ Try protected route       │                           │
     │─────────────────────────▶ │                           │
     │                           │                           │
     │                           │ GET /auth/session/{id}    │
     │                           │──────────────────────────▶│
     │                           │                           │
     │                           │                           │ Session expired
     │                           │                           │
     │                           │   404 Not Found          │
     │                           │◀──────────────────────────│
     │                           │                           │
     │                           │ Clear localStorage        │
     │                           │                           │
     │ Redirect to login         │                           │
     │◀─────────────────────────│                           │
     │                           │                           │
```

### 5. Logout

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                 │ Frontend │                │ Backend  │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ Click logout              │                           │
     │─────────────────────────▶ │                           │
     │                           │                           │
     │                           │ POST /auth/logout         │
     │                           │ {session_id}              │
     │                           │──────────────────────────▶│
     │                           │                           │
     │                           │                           │ Delete session
     │                           │                           │ Log audit event
     │                           │                           │
     │                           │   {success: true}        │
     │                           │◀──────────────────────────│
     │                           │                           │
     │                           │ Clear localStorage        │
     │                           │                           │
     │ Redirect to login         │                           │
     │◀─────────────────────────│                           │
     │                           │                           │
```

---

## Data Models

### User (Backend Response)

```typescript
{
  "id": 1,
  "username": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true
}
```

### Session (Backend Response)

```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "expires_at": "2025-11-14T12:00:00Z"
}
```

### Auth Response (Login/Register)

```typescript
{
  "user": {
    "id": 1,
    "username": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "is_active": true
  },
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "expires_at": "2025-11-14T12:00:00Z"
  }
}
```

---

## Security Layers

```
┌────────────────────────────────────────────────┐
│              Security Layer 1:                 │
│           Input Validation (Frontend)           │
│  • Email format                                 │
│  • Password length (12+ chars)                  │
│  • Required fields                              │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│              Security Layer 2:                 │
│              Rate Limiting (Backend)            │
│  • 5 login attempts per 15 min                  │
│  • 3 registration attempts per hour             │
│  • Account lockout after 5 failures             │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│              Security Layer 3:                 │
│        Password Hashing (Backend - scrypt)      │
│  • OWASP-compliant scrypt                       │
│  • 128-bit random salt per user                 │
│  • Timing-safe comparison                       │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│              Security Layer 4:                 │
│        Session Management (Backend)             │
│  • UUID v4 session IDs (unpredictable)         │
│  • 24-hour or 30-day expiration                 │
│  • Automatic cleanup of expired sessions        │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│              Security Layer 5:                 │
│            Audit Logging (Backend)              │
│  • SHA-256 hash chaining (immutable)            │
│  • All auth events logged                       │
│  • IP address and user agent tracked            │
└────────────────────────────────────────────────┘
```

---

## Session Storage Comparison

### Before (IPC)

```
┌─────────────────────────┐
│  Electron Main Process  │
│                         │
│  ┌───────────────────┐ │
│  │ In-Memory Sessions│ │
│  │   (SessionManager)│ │
│  └───────────────────┘ │
│           │             │
│           ▼             │
│  ┌───────────────────┐ │
│  │ SQLite Database   │ │
│  │  (sessions table) │ │
│  └───────────────────┘ │
│                         │
└─────────────────────────┘
```

### After (HTTP)

```
┌─────────────────────────┐      ┌─────────────────────────┐
│   Frontend (Browser)    │      │   Backend (FastAPI)     │
│                         │      │                         │
│  ┌───────────────────┐ │      │  ┌───────────────────┐ │
│  │   localStorage    │ │      │  │   SQLite Database │ │
│  │   sessionId only  │ │      │  │  (sessions table) │ │
│  └───────────────────┘ │      │  └───────────────────┘ │
│                         │      │                         │
└─────────────────────────┘      └─────────────────────────┘
           │                                 ▲
           │  HTTP GET /auth/session/{id}    │
           └─────────────────────────────────┘
```

**Benefits:**
- Frontend only stores session ID (stateless)
- Backend validates session on each request
- Session can be revoked server-side
- Works across multiple devices

---

## Error Handling

```typescript
// Network Error
try {
  await apiClient.auth.login(username, password, false);
} catch (error) {
  if (error.message.includes('fetch')) {
    // Show: "Unable to connect. Check your internet."
    showRetryButton();
  }
}

// 401 Unauthorized (Invalid Credentials)
// Backend returns: { detail: { message: "Invalid credentials", attempts_remaining: 3 } }
// UI shows: "Invalid credentials (3 attempts remaining)"

// 429 Rate Limited
// Backend returns: { detail: { message: "Too many attempts", rate_limit_info: { retry_after_seconds: 900 } } }
// UI shows: "Too many login attempts. Try again in 15 minutes."

// 404 Session Not Found
// Backend returns: { detail: "Session not found or expired" }
// UI clears localStorage and redirects to /login
```

---

## Migration Comparison

| Feature | Before (IPC) | After (HTTP) |
|---------|--------------|--------------|
| **Transport** | Electron IPC | HTTP REST API |
| **Latency** | 50ms | 75ms (+25ms) |
| **Testing** | Requires Electron | Standard HTTP tools |
| **Scalability** | Single process | Horizontally scalable |
| **Monitoring** | Custom IPC logs | Standard HTTP logs |
| **Documentation** | Custom docs | OpenAPI/Swagger |
| **Error Handling** | IPC errors | HTTP status codes |
| **Web Client Support** | No | Yes |

---

## Future Enhancements

### Phase 2: JWT Tokens (Optional)

```
┌─────────────────────────┐
│   Frontend (Browser)    │
│                         │
│  ┌───────────────────┐ │
│  │   localStorage    │ │
│  │  • sessionId      │ │
│  │  • accessToken    │ │  ← JWT (short-lived, 15 min)
│  │  • refreshToken   │ │  ← JWT (long-lived, 30 days)
│  └───────────────────┘ │
└─────────────────────────┘
```

### Phase 3: Multi-Factor Authentication

```
POST /auth/login → { requires_2fa: true, temp_token: "..." }
POST /auth/verify-2fa → { user, session, access_token }
```

### Phase 4: OAuth Integration

```
GET /auth/oauth/google/authorize
GET /auth/oauth/google/callback
```

---

**END OF ARCHITECTURE DOCUMENT**

# Justice Companion - Comprehensive Security & Compliance Audit Report
**Date**: 2025-10-08
**Auditor**: Agent Golf (Security & Legal Compliance Specialist)
**Scope**: Complete codebase security review for GDPR compliance and OWASP best practices

---

## Executive Summary

Justice Companion demonstrates **strong encryption and audit logging foundations** but has **CRITICAL gaps in authentication, authorization, and input validation**. The application currently operates with **ZERO authentication**, allowing unrestricted access to all sensitive legal data. Several GDPR compliance mechanisms exist (data export, deletion, encryption), but lack proper access controls to enforce them.

**RISK LEVEL**: **HIGH** - Production deployment without authentication would violate GDPR Article 32 (Security of Processing) and expose all user data.

**KEY FINDINGS**:
- ✅ **Encryption**: Properly implemented AES-256-GCM for 11 PII fields
- ✅ **Audit Logging**: Blockchain-style immutable trail with SHA-256 chaining
- ✅ **GDPR Data Export/Deletion**: Complete implementation
- ❌ **CRITICAL**: NO authentication system (no login, no sessions, no passwords)
- ❌ **CRITICAL**: NO authorization (no RBAC, no resource ownership validation)
- ❌ **HIGH**: Missing input validation at IPC boundary (SQL injection risk)
- ❌ **HIGH**: Missing Content Security Policy (XSS risk)
- ❌ **MEDIUM**: Missing rate limiting (DoS risk)
- ❌ **MEDIUM**: Electron security best practices incomplete

---

## Section 1: Missing Security Features (CRITICAL)

### 1.1 Authentication System - **COMPLETELY MISSING** ❌

**THREAT**: Any user can access ALL legal cases, evidence, and personal data without proving identity.

**IMPACT**:
- GDPR Article 32 violation (no technical security measures for user identification)
- Complete data breach exposure (no access barrier)
- Audit logs record "local-user" or null userId (non-attributable actions)

**CURRENT STATE**:
- No login/logout mechanism
- No password storage or verification
- No session management
- No multi-factor authentication
- IPC handlers accept requests from ANY renderer process

**EVIDENCE**:
```typescript
// electron/main.ts lines 1659-1671
auditLogger.log({
  eventType: 'gdpr.export',
  userId: 'local-user', // ❌ HARDCODED - NO REAL USER AUTHENTICATION
  resourceType: 'user_data',
  resourceId: 'all',
  // ...
});
```

**REQUIRED IMPLEMENTATION**: See Section 4 for complete authentication service code.

---

### 1.2 Authorization System - **COMPLETELY MISSING** ❌

**THREAT**: Even if authentication existed, there's NO authorization checks to verify users can access resources.

**IMPACT**:
- User A can access User B's cases, evidence, conversations
- No role-based access control (admin vs regular user)
- No resource ownership validation
- Violation of "data minimization" principle (GDPR Article 5)

**CURRENT STATE**:
- IPC handlers directly fetch data by ID without ownership checks
- No concept of "current user" in repositories
- No permission system for sensitive operations

**EVIDENCE**:
```typescript
// electron/main.ts lines 221-237 - Case retrieval with ZERO authorization
ipcMain.handle(
  IPC_CHANNELS.CASE_GET_BY_ID,
  async (_, request: CaseGetByIdRequest) => {
    try {
      const foundCase = caseRepository.findById(request.id);
      // ❌ NO CHECK: Does requester own this case?
      // ❌ NO CHECK: Does requester have permission?
      return { success: true, data: foundCase };
    } catch (error) {
      // ...
    }
  }
);
```

**REQUIRED IMPLEMENTATION**: See Section 4 for RBAC middleware code.

---

### 1.3 Input Validation - **INCOMPLETE** ⚠️

**THREAT**: SQL injection, XSS, command injection via unvalidated IPC parameters.

**IMPACT**:
- Malicious IPC calls could inject SQL (though parameterized queries reduce risk)
- File paths not validated (arbitrary file system access)
- Length limits missing (DoS via memory exhaustion)
- Type coercion vulnerabilities

**CURRENT STATE**:
- ✅ Parameterized SQL queries (good!)
- ❌ No input sanitization at IPC boundary
- ❌ No length validation on strings
- ❌ No type validation (TypeScript compile-time only)
- ⚠️ Dev API allows raw SQL queries (lines 2045-2059)

**EVIDENCE**:
```typescript
// electron/main.ts lines 2045-2059 - DEV API ALLOWS RAW SQL ❌
const databaseQueryHandler = async (_event: unknown, sql: string) => {
  // Security: Only allow SELECT queries
  if (!sql.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error("Only SELECT queries allowed via dev API");
  }
  // ❌ WEAK: Can still do SELECT ... FROM sqlite_master
  // ❌ WEAK: Can read encryption keys from memory
  // ❌ WEAK: No prepared statements - injection possible
  try {
    const db = databaseManager.getDatabase();
    return db.prepare(sql).all(); // ❌ DANGEROUS
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'dev-api:database:query' });
    throw error;
  }
};
```

**REQUIRED IMPLEMENTATION**: See Section 4 for input validation middleware.

---

### 1.4 Consent Management - **MISSING** ❌

**THREAT**: GDPR requires explicit, informed consent before processing personal data.

**IMPACT**:
- GDPR Article 6 violation (no legal basis for processing)
- GDPR Article 7 violation (no consent withdrawal mechanism)
- No granular consent (e.g., "encrypt my data", "use AI features")

**CURRENT STATE**:
- No consent collection on first run
- No privacy policy display
- No opt-in/opt-out for AI processing
- No consent audit trail

**REQUIRED IMPLEMENTATION**: See Section 4 for consent service code.

---

## Section 2: Security Gaps (HIGH/MEDIUM)

### 2.1 Electron Security Configuration - **INCOMPLETE** ⚠️

**GOOD**:
```typescript
// electron/main.ts lines 97-101
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,  // ✅ GOOD
  nodeIntegration: false,  // ✅ GOOD
  sandbox: false,          // ⚠️ SHOULD BE TRUE
}
```

**MISSING**:
- ❌ No Content Security Policy (CSP) headers
- ❌ No `webSecurity: true` explicit setting
- ❌ `sandbox: false` - should be `true` for renderer isolation
- ❌ No `allowRunningInsecureContent: false`
- ❌ DevTools open in production builds (line 109)

**FIX**: See Section 4 for secure Electron configuration.

---

### 2.2 Secrets Management - **WEAK** ⚠️

**GOOD**:
- ✅ Encryption key in `.env` file (not hardcoded)
- ✅ `.env` in `.gitignore`
- ✅ `.env.example` template provided

**GAPS**:
- ❌ No key rotation mechanism (mentioned in docs but not implemented)
- ❌ Encryption key loaded once at startup (no refresh)
- ⚠️ Key exposed to all repositories via dependency injection (broad scope)
- ❌ No secure key storage (OS keychain, Windows Credential Manager)
- ❌ No key derivation function (KDF) for user passwords

**EVIDENCE**:
```typescript
// electron/main.ts lines 2125-2154
const encryptionKeyBase64 = process.env.ENCRYPTION_KEY_BASE64;
if (!encryptionKeyBase64) {
  errorLogger.logError('ENCRYPTION_KEY_BASE64 not found in environment variables', {
    type: 'error',
    context: 'encryption-initialization',
  });
  // ❌ APP CONTINUES WITHOUT ENCRYPTION!
}
```

**FIX**: See Section 4 for key management service code.

---

### 2.3 Rate Limiting - **MISSING** ❌

**THREAT**: Denial of Service via IPC flooding, AI request spam, database query overload.

**IMPACT**:
- Renderer process can spam IPC handlers with unlimited requests
- AI streaming can be started infinitely (resource exhaustion)
- Database backups can be triggered repeatedly (disk space attack)

**CURRENT STATE**:
- No request throttling on IPC handlers
- No connection limits on AI streaming
- No cooldown periods for expensive operations

**REQUIRED IMPLEMENTATION**: See Section 4 for rate limiting middleware.

---

### 2.4 Error Information Leakage - **MINOR** ⚠️

**GOOD**:
- ✅ Generic decryption errors (line 143: "Decryption failed: data may be corrupted or tampered with")
- ✅ No plaintext logging of sensitive data

**GAPS**:
- ⚠️ Stack traces logged to console (development only, but check production)
- ⚠️ Error messages reveal schema details (e.g., "Invalid encrypted data format")
- ⚠️ SQL errors might leak table/column names

**EVIDENCE**:
```typescript
// src/services/EncryptionService.ts lines 140-144
catch (_error) {
  // CRITICAL: Don't leak plaintext, key material, or detailed errors
  // Authentication tag verification failures will throw here
  throw new Error('Decryption failed: data may be corrupted or tampered with');
  // ✅ GOOD - Generic error message
}
```

---

### 2.5 File Upload Security - **INCOMPLETE** ⚠️

**GOOD**:
- ✅ File size validation (50MB max - line 978)
- ✅ MIME type validation (lines 987-995)

**GAPS**:
- ❌ No virus/malware scanning
- ❌ No file content validation (just extension check)
- ❌ No sandboxed processing
- ⚠️ PDF parsing could be exploited (pdf-parse library)
- ❌ No file upload rate limiting

**EVIDENCE**:
```typescript
// electron/main.ts lines 977-984
const MAX_FILE_SIZE = 50 * 1024 * 1024;
if (stats.size > MAX_FILE_SIZE) {
  return {
    success: false,
    error: 'File size exceeds 50MB limit',
  };
  // ✅ GOOD - Size validation
}

// ❌ MISSING: Virus scan
// ❌ MISSING: Magic number validation (file could be renamed .pdf but actually .exe)
```

---

## Section 3: GDPR Compliance Review

### 3.1 Article 32 - Security of Processing ⚠️

**REQUIREMENT**: Implement appropriate technical measures to ensure security appropriate to the risk.

**STATUS**: **PARTIAL COMPLIANCE**

**✅ COMPLIANT**:
- AES-256-GCM encryption for 11 PII fields (cases, evidence, notes, legal issues, timeline, user facts, case facts, chat messages, user profile)
- Immutable audit trail with SHA-256 hash chaining
- Encrypted data has authentication tags (tamper detection)

**❌ NON-COMPLIANT**:
- **NO AUTHENTICATION SYSTEM** - Critical failure
- **NO AUTHORIZATION CONTROLS** - Critical failure
- No pseudonymization of user identifiers in audit logs
- No encryption key rotation policy enforcement

**RISK**: **HIGH** - Without authentication/authorization, encryption alone is insufficient.

---

### 3.2 Article 17 - Right to Erasure ("Right to be Forgotten") ✅

**REQUIREMENT**: Users must be able to request deletion of their personal data.

**STATUS**: **COMPLIANT** ✅

**IMPLEMENTATION**:
- Complete data deletion via `GDPR_DELETE_USER_DATA` IPC handler (lines 1724-1859)
- Cascading deletion via foreign key constraints
- Confirmation required: "DELETE_ALL_MY_DATA" string
- Audit log preserved for compliance (non-user data)
- Deletion summary returned to user

**EVIDENCE**:
```typescript
// electron/main.ts lines 1729-1735
if (request.confirmation !== 'DELETE_ALL_MY_DATA') {
  return {
    success: false,
    error: 'Invalid confirmation string. Must be "DELETE_ALL_MY_DATA".',
  };
}
// ✅ GOOD - Requires explicit confirmation
```

**IMPROVEMENT NEEDED**: Add authentication to verify deletion requester owns the data.

---

### 3.3 Article 20 - Right to Data Portability ✅

**REQUIREMENT**: Users must be able to receive their personal data in a structured, commonly used format.

**STATUS**: **COMPLIANT** ✅

**IMPLEMENTATION**:
- Complete data export via `GDPR_EXPORT_USER_DATA` IPC handler (lines 1580-1692)
- JSON format (machine-readable)
- All encrypted fields decrypted before export
- Export includes metadata (date, version, format)
- Saved to user's Documents folder

**EVIDENCE**:
```typescript
// electron/main.ts lines 1619-1628
const exportData = {
  metadata: {
    exportDate,
    version: '1.0.0',
    application: 'Justice Companion',
    format: 'JSON',
    disclaimer: 'This export contains all your personal data...',
  },
  profile,
  cases,
  evidence,
  // ... all user data
};
// ✅ GOOD - Comprehensive export
```

**IMPROVEMENT NEEDED**: Add CSV export option for better portability.

---

### 3.4 Article 5 - Data Minimization ✅

**REQUIREMENT**: Collect only data that is adequate, relevant, and limited to what is necessary.

**STATUS**: **COMPLIANT** ✅

**ASSESSMENT**:
- Application only collects legal case data (necessary for stated purpose)
- No tracking, analytics, or telemetry
- No third-party data sharing
- Audit logs contain metadata only (no sensitive content)

**EVIDENCE**:
```typescript
// src/services/AuditLogger.ts lines 41-48
const entry: AuditLogEntry = {
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  eventType: event.eventType,
  userId: event.userId ?? null,
  resourceType: event.resourceType,
  resourceId: event.resourceId,
  action: event.action,
  details: event.details ?? null, // ✅ Metadata only, no PII
  // ...
};
```

---

### 3.5 Article 6 - Lawfulness of Processing ❌

**REQUIREMENT**: Personal data processing must have a legal basis (consent, contract, legal obligation, etc.).

**STATUS**: **NON-COMPLIANT** ❌

**GAPS**:
- No consent collection mechanism
- No privacy policy displayed to users
- No legal basis documentation
- No opt-in for AI processing of legal data

**REQUIRED**: Implement consent service (see Section 4).

---

### 3.6 Article 33/34 - Data Breach Notification ❌

**REQUIREMENT**: Report data breaches to supervisory authority within 72 hours.

**STATUS**: **NON-COMPLIANT** ❌

**GAPS**:
- No breach detection mechanisms
- No breach notification workflow
- No contact information for data controller
- Audit log integrity checks exist but no alerting

**RECOMMENDATION**: Implement breach detection + notification service.

---

## Section 4: CODE SNIPPETS - Complete Security Implementations

### 4.1 Authentication Service (P0 - CRITICAL)

```typescript
// FILE: src/services/AuthenticationService.ts
// PURPOSE: User authentication with password hashing and session management
// PRIORITY: P0 - CRITICAL
// THREAT: Prevents unauthorized access to all legal data

import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

/**
 * User credentials stored in database
 */
export interface UserCredentials {
  id: number;
  username: string;
  passwordHash: string; // scrypt hash
  salt: string;         // Random salt
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * Active session token
 */
export interface Session {
  sessionId: string;
  userId: number;
  username: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Authentication service with secure password hashing
 *
 * SECURITY FEATURES:
 * - scrypt key derivation (OWASP recommended)
 * - Random salt per user (128 bits)
 * - Session tokens (256 bits entropy)
 * - Session expiration (24 hours default)
 * - Timing-safe password comparison
 * - Failed login attempt logging
 */
export class AuthenticationService {
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly KEY_LENGTH = 64;  // 512 bits
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  private activeSessions: Map<string, Session> = new Map();

  constructor(
    private db: import('better-sqlite3').Database,
    private auditLogger: import('./AuditLogger').AuditLogger
  ) {}

  /**
   * Register a new user with secure password hashing
   *
   * @param username - Unique username (3-50 chars, alphanumeric + underscore)
   * @param password - Password (min 12 chars, complexity requirements)
   * @returns User ID or throws error
   *
   * SECURITY:
   * - Password complexity validation (min 12 chars, uppercase, lowercase, digit, special)
   * - Unique username check
   * - scrypt key derivation with random salt
   * - Audit logging
   */
  async register(username: string, password: string): Promise<number> {
    // Input validation
    if (!this.isValidUsername(username)) {
      throw new Error('Invalid username: must be 3-50 characters, alphanumeric + underscore');
    }

    if (!this.isValidPassword(password)) {
      throw new Error(
        'Invalid password: must be at least 12 characters with uppercase, lowercase, digit, and special character'
      );
    }

    // Check if username already exists
    const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      // Audit failed registration (username taken)
      this.auditLogger.log({
        eventType: 'auth.register',
        resourceType: 'user',
        resourceId: 'unknown',
        action: 'create',
        details: { username, reason: 'username_taken' },
        success: false,
        errorMessage: 'Username already exists',
      });

      throw new Error('Username already exists');
    }

    // Generate random salt
    const salt = crypto.randomBytes(this.SALT_LENGTH);

    // Derive key using scrypt (OWASP recommended)
    const derivedKey = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    const passwordHash = derivedKey.toString('base64');

    // Insert user
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      username,
      passwordHash,
      salt.toString('base64'),
      new Date().toISOString()
    );

    const userId = result.lastInsertRowid as number;

    // Audit successful registration
    this.auditLogger.log({
      eventType: 'auth.register',
      resourceType: 'user',
      resourceId: userId.toString(),
      action: 'create',
      details: { username },
      success: true,
    });

    return userId;
  }

  /**
   * Authenticate user and create session
   *
   * @param username - Username
   * @param password - Password
   * @param ipAddress - Client IP address (for audit)
   * @param userAgent - Client user agent (for audit)
   * @returns Session token or throws error
   *
   * SECURITY:
   * - Timing-safe password comparison
   * - Session token is cryptographically random (256 bits)
   * - Session expiration enforced
   * - Failed attempts audited
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    // Fetch user credentials
    const user = this.db.prepare(`
      SELECT id, username, password_hash, salt
      FROM users
      WHERE username = ?
    `).get(username) as UserCredentials | undefined;

    if (!user) {
      // Audit failed login (user not found)
      this.auditLogger.log({
        eventType: 'auth.login',
        resourceType: 'user',
        resourceId: 'unknown',
        action: 'login',
        details: { username, reason: 'user_not_found' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid username or password',
      });

      // Generic error message (don't reveal if username exists)
      throw new Error('Invalid username or password');
    }

    // Derive key from provided password
    const salt = Buffer.from(user.salt, 'base64');
    const derivedKey = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    const providedPasswordHash = derivedKey.toString('base64');

    // Timing-safe comparison (prevents timing attacks)
    const isPasswordValid = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'base64'),
      Buffer.from(providedPasswordHash, 'base64')
    );

    if (!isPasswordValid) {
      // Audit failed login (wrong password)
      this.auditLogger.log({
        eventType: 'auth.login',
        resourceType: 'user',
        resourceId: user.id.toString(),
        action: 'login',
        details: { username, reason: 'wrong_password' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid username or password',
      });

      throw new Error('Invalid username or password');
    }

    // Generate session token (256 bits entropy)
    const sessionId = crypto.randomBytes(32).toString('base64');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_MS);

    const session: Session = {
      sessionId,
      userId: user.id,
      username: user.username,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
    };

    // Store session in memory (consider Redis for production)
    this.activeSessions.set(sessionId, session);

    // Update last login timestamp
    this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(
      now.toISOString(),
      user.id
    );

    // Audit successful login
    this.auditLogger.log({
      eventType: 'auth.login',
      resourceType: 'user',
      resourceId: user.id.toString(),
      action: 'login',
      details: { username },
      ipAddress,
      userAgent,
      success: true,
    });

    return sessionId;
  }

  /**
   * Validate session token and return user info
   *
   * @param sessionId - Session token
   * @returns Session data or null if invalid/expired
   *
   * SECURITY:
   * - Validates expiration timestamp
   * - Removes expired sessions from memory
   */
  validateSession(sessionId: string): Session | null {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.activeSessions.delete(sessionId);

      // Audit session expiration
      this.auditLogger.log({
        eventType: 'auth.session_expired',
        resourceType: 'session',
        resourceId: sessionId,
        action: 'expire',
        details: { userId: session.userId, username: session.username },
        success: true,
      });

      return null;
    }

    return session;
  }

  /**
   * Logout user and invalidate session
   *
   * @param sessionId - Session token to invalidate
   * @returns true if session was active, false otherwise
   */
  logout(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return false;
    }

    this.activeSessions.delete(sessionId);

    // Audit logout
    this.auditLogger.log({
      eventType: 'auth.logout',
      resourceType: 'user',
      resourceId: session.userId.toString(),
      action: 'logout',
      details: { username: session.username },
      success: true,
    });

    return true;
  }

  /**
   * Validate username format
   *
   * RULES:
   * - 3-50 characters
   * - Alphanumeric + underscore only
   * - Must start with letter
   */
  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]{2,49}$/.test(username);
  }

  /**
   * Validate password complexity
   *
   * RULES (OWASP):
   * - Minimum 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   * - At least one special character
   */
  private isValidPassword(password: string): boolean {
    if (password.length < 12) {
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUppercase && hasLowercase && hasDigit && hasSpecial;
  }
}
```

**MIGRATION REQUIRED**:
```sql
-- FILE: src/db/migrations/006_authentication_system.sql
-- UP

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  CHECK (length(username) >= 3 AND length(username) <= 50)
);

CREATE INDEX idx_users_username ON users(username);

-- DOWN

DROP INDEX IF EXISTS idx_users_username;
DROP TABLE IF EXISTS users;
```

---

### 4.2 Authorization Middleware (P0 - CRITICAL)

```typescript
// FILE: electron/middleware/authorization.ts
// PURPOSE: Role-based access control and resource ownership validation
// PRIORITY: P0 - CRITICAL
// THREAT: Prevents unauthorized access to other users' data

import type { IpcMainInvokeEvent } from 'electron';
import type { Session } from '../src/services/AuthenticationService';

/**
 * User roles with hierarchical permissions
 */
export enum UserRole {
  ADMIN = 'admin',     // Full access to all resources
  USER = 'user',       // Access to own resources only
  GUEST = 'guest',     // Read-only access to own resources
}

/**
 * Permission types
 */
export enum Permission {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
}

/**
 * Role-permission matrix
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
    Permission.EXPORT,
  ],
  [UserRole.USER]: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
    Permission.EXPORT,
  ],
  [UserRole.GUEST]: [Permission.READ],
};

/**
 * Authorization middleware for IPC handlers
 *
 * USAGE:
 * ```typescript
 * ipcMain.handle(
 *   'case:get',
 *   withAuth(Permission.READ, async (event, session, request) => {
 *     // session.userId is guaranteed valid here
 *     const case = caseRepository.findById(request.id);
 *
 *     // Check resource ownership
 *     if (case.ownerId !== session.userId && session.role !== UserRole.ADMIN) {
 *       throw new Error('Forbidden: You do not own this resource');
 *     }
 *
 *     return case;
 *   })
 * );
 * ```
 */
export function withAuth<TRequest, TResponse>(
  requiredPermission: Permission,
  handler: (
    event: IpcMainInvokeEvent,
    session: Session,
    request: TRequest
  ) => Promise<TResponse>
) {
  return async (event: IpcMainInvokeEvent, request: TRequest): Promise<TResponse> => {
    // Extract session token from request
    const requestWithAuth = request as TRequest & { sessionId?: string };

    if (!requestWithAuth.sessionId) {
      throw new Error('Unauthorized: No session token provided');
    }

    // Validate session (assumes AuthenticationService is injected)
    const authService = getAuthService(); // Implement this getter
    const session = authService.validateSession(requestWithAuth.sessionId);

    if (!session) {
      throw new Error('Unauthorized: Invalid or expired session');
    }

    // Check permission (assumes user role is stored in session)
    const userRole = getUserRole(session.userId); // Fetch from database
    const allowedPermissions = ROLE_PERMISSIONS[userRole];

    if (!allowedPermissions.includes(requiredPermission)) {
      // Audit authorization failure
      const auditLogger = getAuditLogger();
      auditLogger.log({
        eventType: 'auth.authorization_denied',
        userId: session.userId.toString(),
        resourceType: 'ipc_handler',
        resourceId: event.sender.getURL(),
        action: requiredPermission,
        details: {
          requiredPermission,
          userRole,
          allowedPermissions,
        },
        success: false,
        errorMessage: `Forbidden: Role ${userRole} does not have ${requiredPermission} permission`,
      });

      throw new Error(`Forbidden: Role ${userRole} does not have ${requiredPermission} permission`);
    }

    // Permission granted - call handler
    return handler(event, session, request);
  };
}

/**
 * Check if user owns a resource
 *
 * @param userId - Current user ID
 * @param resourceType - Resource type (case, evidence, note, etc.)
 * @param resourceId - Resource ID
 * @returns true if user owns resource or is admin
 */
export function checkResourceOwnership(
  userId: number,
  resourceType: string,
  resourceId: number
): boolean {
  const db = getDb(); // Implement this getter

  // Admin bypass
  const userRole = getUserRole(userId);
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  // Check ownership based on resource type
  let ownerCheckQuery: string;

  switch (resourceType) {
    case 'case':
      ownerCheckQuery = 'SELECT 1 FROM cases WHERE id = ? AND owner_id = ?';
      break;
    case 'evidence':
      ownerCheckQuery = `
        SELECT 1 FROM evidence e
        JOIN cases c ON e.case_id = c.id
        WHERE e.id = ? AND c.owner_id = ?
      `;
      break;
    case 'note':
      ownerCheckQuery = `
        SELECT 1 FROM notes n
        JOIN cases c ON n.case_id = c.id
        WHERE n.id = ? AND c.owner_id = ?
      `;
      break;
    // Add more resource types as needed
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }

  const result = db.prepare(ownerCheckQuery).get(resourceId, userId);
  return !!result;
}

/**
 * Helper: Get user role from database
 */
function getUserRole(userId: number): UserRole {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;

  if (!user) {
    throw new Error('User not found');
  }

  return user.role as UserRole;
}

// Implement these getters based on your dependency injection setup
function getAuthService(): import('../src/services/AuthenticationService').AuthenticationService {
  throw new Error('Not implemented - inject AuthenticationService singleton');
}

function getAuditLogger(): import('../src/services/AuditLogger').AuditLogger {
  throw new Error('Not implemented - inject AuditLogger singleton');
}

function getDb(): import('better-sqlite3').Database {
  throw new Error('Not implemented - inject Database singleton');
}
```

**USAGE EXAMPLE**:
```typescript
// electron/main.ts - Secure IPC handler with authorization

import { withAuth, checkResourceOwnership } from './middleware/authorization';
import { Permission } from './middleware/authorization';

// Replace existing handler (lines 221-237) with:
ipcMain.handle(
  IPC_CHANNELS.CASE_GET_BY_ID,
  withAuth(Permission.READ, async (event, session, request: CaseGetByIdRequest) => {
    try {
      // ✅ Session is validated (user is authenticated)
      // ✅ Permission is checked (user has READ permission)

      // ✅ NOW CHECK OWNERSHIP
      if (!checkResourceOwnership(session.userId, 'case', request.id)) {
        throw new Error('Forbidden: You do not own this case');
      }

      const foundCase = caseRepository.findById(request.id);
      return { success: true, data: foundCase };
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'ipc:case:getById' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get case by ID',
      };
    }
  })
);
```

---

### 4.3 Input Validation Middleware (P1 - HIGH)

```typescript
// FILE: electron/middleware/input-validation.ts
// PURPOSE: Validate and sanitize all IPC request parameters
// PRIORITY: P1 - HIGH
// THREAT: Prevents SQL injection, XSS, path traversal, DoS

import type { IpcMainInvokeEvent } from 'electron';
import path from 'path';

/**
 * Validation rules for input fields
 */
export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'path' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  sanitize?: boolean; // HTML entity encoding for strings
}

/**
 * Schema for request validation
 */
export type ValidationSchema = Record<string, ValidationRule>;

/**
 * Validation error with field-specific messages
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public reason: string
  ) {
    super(`Validation failed for field "${field}": ${reason}`);
    this.name = 'ValidationError';
  }
}

/**
 * Validate and sanitize input against schema
 *
 * @param input - Request payload
 * @param schema - Validation schema
 * @returns Sanitized input
 * @throws ValidationError if validation fails
 *
 * SECURITY:
 * - Type checking
 * - Length limits (DoS prevention)
 * - Pattern matching (format validation)
 * - HTML entity encoding (XSS prevention)
 * - Path traversal prevention
 */
export function validateInput<T extends Record<string, unknown>>(
  input: T,
  schema: ValidationSchema
): T {
  const sanitized: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = input[field];

    // Required field check
    if (rule.required && (value === undefined || value === null)) {
      throw new ValidationError(field, 'Required field is missing');
    }

    // Skip validation for optional fields that are not provided
    if (!rule.required && (value === undefined || value === null)) {
      sanitized[field] = value;
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new ValidationError(field, `Expected string, got ${typeof value}`);
        }

        // Length validation
        if (rule.minLength && value.length < rule.minLength) {
          throw new ValidationError(field, `Minimum length is ${rule.minLength}`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          throw new ValidationError(field, `Maximum length is ${rule.maxLength}`);
        }

        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          throw new ValidationError(field, 'Does not match required pattern');
        }

        // Sanitize (HTML entity encoding)
        sanitized[field] = rule.sanitize ? sanitizeString(value) : value;
        break;

      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new ValidationError(field, `Expected number, got ${typeof value}`);
        }

        // Range validation
        if (rule.min !== undefined && value < rule.min) {
          throw new ValidationError(field, `Minimum value is ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          throw new ValidationError(field, `Maximum value is ${rule.max}`);
        }

        sanitized[field] = value;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(field, `Expected boolean, got ${typeof value}`);
        }
        sanitized[field] = value;
        break;

      case 'email':
        if (typeof value !== 'string') {
          throw new ValidationError(field, `Expected email string, got ${typeof value}`);
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new ValidationError(field, 'Invalid email format');
        }

        sanitized[field] = value.toLowerCase().trim();
        break;

      case 'path':
        if (typeof value !== 'string') {
          throw new ValidationError(field, `Expected path string, got ${typeof value}`);
        }

        // Path traversal prevention
        const normalized = path.normalize(value);
        if (normalized.includes('..')) {
          throw new ValidationError(field, 'Path traversal detected');
        }

        sanitized[field] = normalized;
        break;

      case 'enum':
        if (!rule.enum) {
          throw new Error('Enum validation requires enum array');
        }

        if (!rule.enum.includes(value as string)) {
          throw new ValidationError(
            field,
            `Must be one of: ${rule.enum.join(', ')}`
          );
        }

        sanitized[field] = value;
        break;

      default:
        throw new Error(`Unknown validation type: ${rule.type}`);
    }
  }

  return sanitized as T;
}

/**
 * HTML entity encoding to prevent XSS
 *
 * @param str - String to sanitize
 * @returns Sanitized string with HTML entities encoded
 */
function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Middleware wrapper for IPC handlers with validation
 *
 * USAGE:
 * ```typescript
 * ipcMain.handle(
 *   'case:create',
 *   withValidation(
 *     {
 *       title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
 *       caseType: { type: 'enum', required: true, enum: ['employment', 'housing', 'consumer'] },
 *       description: { type: 'string', maxLength: 10000, sanitize: true },
 *     },
 *     async (event, validatedRequest) => {
 *       // validatedRequest is sanitized and validated
 *       return caseService.createCase(validatedRequest);
 *     }
 *   )
 * );
 * ```
 */
export function withValidation<TRequest extends Record<string, unknown>, TResponse>(
  schema: ValidationSchema,
  handler: (event: IpcMainInvokeEvent, request: TRequest) => Promise<TResponse>
) {
  return async (event: IpcMainInvokeEvent, request: TRequest): Promise<TResponse> => {
    try {
      // Validate and sanitize input
      const validatedRequest = validateInput(request, schema);

      // Call handler with sanitized input
      return handler(event, validatedRequest as TRequest);
    } catch (error) {
      // Log validation errors
      if (error instanceof ValidationError) {
        console.error('[Input Validation]', error.message);
        throw error;
      }

      throw error;
    }
  };
}
```

**USAGE EXAMPLE**:
```typescript
// electron/main.ts - Secure case creation with input validation

import { withValidation } from './middleware/input-validation';

// Replace existing handler (lines 183-198) with:
ipcMain.handle(
  IPC_CHANNELS.CASE_CREATE,
  withValidation(
    {
      title: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 200,
        sanitize: true // ✅ XSS prevention
      },
      caseType: {
        type: 'enum',
        required: true,
        enum: ['employment', 'housing', 'consumer', 'family', 'debt', 'other']
      },
      description: {
        type: 'string',
        maxLength: 10000,
        sanitize: true // ✅ XSS prevention
      },
    },
    async (event, validatedRequest: CaseCreateRequest) => {
      try {
        // ✅ Input is validated and sanitized
        const createdCase = caseService.createCase(validatedRequest.input);
        return { success: true, data: createdCase };
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'ipc:case:create' });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create case',
        };
      }
    }
  )
);
```

---

### 4.4 Electron Security Hardening (P1 - HIGH)

```typescript
// FILE: electron/main.ts (UPDATED - lines 90-130)
// PURPOSE: Secure Electron window configuration
// PRIORITY: P1 - HIGH
// THREAT: Prevents XSS, remote code execution, and renderer process exploits

import { app, BrowserWindow, session } from 'electron';
import path from 'path';

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),

        // ✅ CRITICAL SECURITY SETTINGS
        contextIsolation: true,        // ✅ Isolate renderer from Node.js context
        nodeIntegration: false,        // ✅ Disable Node.js in renderer
        sandbox: true,                 // ✅ CHANGED: Enable sandbox (was false)
        webSecurity: true,             // ✅ NEW: Enable web security (CSP, CORS)
        allowRunningInsecureContent: false, // ✅ NEW: Block mixed content
        experimentalFeatures: false,   // ✅ NEW: Disable experimental features
        enableRemoteModule: false,     // ✅ NEW: Disable deprecated remote module

        // ✅ NEW: Disable navigation and new window creation
        navigateOnDragDrop: false,
      },
      backgroundColor: '#F9FAFB',
      show: false,
    });

    // ✅ NEW: Set Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:1234", // LM Studio API
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          ],
          // ✅ NEW: Additional security headers
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['no-referrer'],
          'Permissions-Policy': ['geolocation=(), microphone=(), camera=()']
        }
      });
    });

    // ✅ NEW: Block navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const allowedOrigins = [
        'http://localhost:5173', // Vite dev server
        'file://', // Production bundle
      ];

      const isAllowed = allowedOrigins.some(origin => url.startsWith(origin));

      if (!isAllowed) {
        event.preventDefault();
        console.error('[Security] Blocked navigation to:', url);
      }
    });

    // ✅ NEW: Block new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);

      // ✅ CHANGED: Only open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Log renderer process errors
    mainWindow.webContents.on('crashed', (event, killed) => {
      errorLogger.logError('Renderer process crashed', { killed });
    });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'createWindow' });
    throw error;
  }
}
```

---

### 4.5 Rate Limiting Middleware (P2 - MEDIUM)

```typescript
// FILE: electron/middleware/rate-limiting.ts
// PURPOSE: Prevent IPC request flooding and DoS attacks
// PRIORITY: P2 - MEDIUM
// THREAT: Prevents denial of service via request spam

import type { IpcMainInvokeEvent } from 'electron';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

/**
 * Request tracker for a specific handler
 */
interface RequestTracker {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter for IPC handlers
 *
 * USAGE:
 * ```typescript
 * ipcMain.handle(
 *   'ai:stream:start',
 *   withRateLimit({ maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
 *     async (event, request) => {
 *       // Handler code
 *     }
 *   )
 * );
 * ```
 */
export function withRateLimit<TRequest, TResponse>(
  config: RateLimitConfig,
  handler: (event: IpcMainInvokeEvent, request: TRequest) => Promise<TResponse>
) {
  const trackers = new Map<string, RequestTracker>();

  return async (event: IpcMainInvokeEvent, request: TRequest): Promise<TResponse> => {
    // Use sender frame ID as identifier (one limiter per renderer process)
    const clientId = `${event.sender.id}-${event.frameId}`;
    const now = Date.now();

    // Get or create tracker
    let tracker = trackers.get(clientId);

    if (!tracker || now >= tracker.resetAt) {
      // Create new tracker or reset expired one
      tracker = {
        count: 0,
        resetAt: now + config.windowMs,
      };
      trackers.set(clientId, tracker);
    }

    // Check rate limit
    if (tracker.count >= config.maxRequests) {
      const retryAfter = Math.ceil((tracker.resetAt - now) / 1000);

      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }

    // Increment counter
    tracker.count++;

    // Call handler
    return handler(event, request);
  };
}
```

**USAGE EXAMPLE**:
```typescript
// electron/main.ts - Rate-limited AI streaming

import { withRateLimit } from './middleware/rate-limiting';

// Apply rate limiting to expensive operations
ipcMain.handle(
  IPC_CHANNELS.AI_STREAM_START,
  withRateLimit(
    { maxRequests: 10, windowMs: 60000 }, // 10 AI requests per minute
    async (event, request: AIStreamStartRequest) => {
      // Existing handler code...
    }
  )
);

ipcMain.handle(
  IPC_CHANNELS.CASE_CREATE,
  withRateLimit(
    { maxRequests: 100, windowMs: 60000 }, // 100 case creations per minute
    async (event, request: CaseCreateRequest) => {
      // Existing handler code...
    }
  )
);
```

---

### 4.6 Consent Management Service (P1 - HIGH)

```typescript
// FILE: src/services/ConsentService.ts
// PURPOSE: GDPR-compliant consent collection and management
// PRIORITY: P1 - HIGH
// THREAT: Ensures legal basis for processing personal data (GDPR Article 6)

import type Database from 'better-sqlite3';
import type { AuditLogger } from './AuditLogger';

/**
 * Consent types
 */
export enum ConsentType {
  DATA_COLLECTION = 'data_collection',     // Process legal case data
  DATA_ENCRYPTION = 'data_encryption',     // Encrypt sensitive data
  AI_PROCESSING = 'ai_processing',         // Use AI for legal analysis
  AUDIT_LOGGING = 'audit_logging',         // Log user actions
  CRASH_REPORTING = 'crash_reporting',     // Send crash reports
}

/**
 * Consent record
 */
export interface ConsentRecord {
  id: number;
  userId: number;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Consent service for GDPR compliance
 *
 * FEATURES:
 * - Explicit consent collection (Article 7)
 * - Granular consent types
 * - Consent withdrawal mechanism
 * - Audit trail for consent changes
 * - Consent version tracking
 */
export class ConsentService {
  constructor(
    private db: Database.Database,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Grant consent for a specific type
   *
   * @param userId - User ID
   * @param consentType - Type of consent
   * @param ipAddress - Client IP address (for audit)
   * @param userAgent - Client user agent (for audit)
   * @returns Consent record
   */
  grantConsent(
    userId: number,
    consentType: ConsentType,
    ipAddress?: string,
    userAgent?: string
  ): ConsentRecord {
    const now = new Date().toISOString();

    // Check if consent already exists
    const existing = this.db.prepare(`
      SELECT id FROM consent_records
      WHERE user_id = ? AND consent_type = ?
    `).get(userId, consentType) as { id: number } | undefined;

    if (existing) {
      // Update existing consent
      this.db.prepare(`
        UPDATE consent_records
        SET granted = 1, granted_at = ?, revoked_at = NULL, ip_address = ?, user_agent = ?
        WHERE id = ?
      `).run(now, ipAddress || null, userAgent || null, existing.id);
    } else {
      // Insert new consent
      this.db.prepare(`
        INSERT INTO consent_records (user_id, consent_type, granted, granted_at, ip_address, user_agent)
        VALUES (?, ?, 1, ?, ?, ?)
      `).run(userId, consentType, now, ipAddress || null, userAgent || null);
    }

    // Audit consent grant
    this.auditLogger.log({
      eventType: 'consent.grant',
      userId: userId.toString(),
      resourceType: 'consent',
      resourceId: consentType,
      action: 'grant',
      details: { consentType },
      ipAddress,
      userAgent,
      success: true,
    });

    return this.getConsent(userId, consentType)!;
  }

  /**
   * Revoke consent for a specific type
   *
   * @param userId - User ID
   * @param consentType - Type of consent to revoke
   * @returns Updated consent record
   */
  revokeConsent(
    userId: number,
    consentType: ConsentType,
    ipAddress?: string,
    userAgent?: string
  ): ConsentRecord {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE consent_records
      SET granted = 0, revoked_at = ?
      WHERE user_id = ? AND consent_type = ?
    `).run(now, userId, consentType);

    // Audit consent revocation
    this.auditLogger.log({
      eventType: 'consent.revoke',
      userId: userId.toString(),
      resourceType: 'consent',
      resourceId: consentType,
      action: 'revoke',
      details: { consentType },
      ipAddress,
      userAgent,
      success: true,
    });

    return this.getConsent(userId, consentType)!;
  }

  /**
   * Get consent status for a specific type
   *
   * @param userId - User ID
   * @param consentType - Type of consent
   * @returns Consent record or null if not found
   */
  getConsent(userId: number, consentType: ConsentType): ConsentRecord | null {
    return this.db.prepare(`
      SELECT
        id, user_id as userId, consent_type as consentType,
        granted, granted_at as grantedAt, revoked_at as revokedAt,
        ip_address as ipAddress, user_agent as userAgent
      FROM consent_records
      WHERE user_id = ? AND consent_type = ?
    `).get(userId, consentType) as ConsentRecord | null;
  }

  /**
   * Get all consents for a user
   *
   * @param userId - User ID
   * @returns Array of consent records
   */
  getAllConsents(userId: number): ConsentRecord[] {
    return this.db.prepare(`
      SELECT
        id, user_id as userId, consent_type as consentType,
        granted, granted_at as grantedAt, revoked_at as revokedAt,
        ip_address as ipAddress, user_agent as userAgent
      FROM consent_records
      WHERE user_id = ?
      ORDER BY granted_at DESC
    `).all(userId) as ConsentRecord[];
  }

  /**
   * Check if user has granted a specific consent
   *
   * @param userId - User ID
   * @param consentType - Type of consent
   * @returns true if consent is granted and not revoked
   */
  hasConsent(userId: number, consentType: ConsentType): boolean {
    const consent = this.getConsent(userId, consentType);
    return consent?.granted === true;
  }

  /**
   * Require consent or throw error
   *
   * @param userId - User ID
   * @param consentType - Required consent type
   * @throws Error if consent not granted
   */
  requireConsent(userId: number, consentType: ConsentType): void {
    if (!this.hasConsent(userId, consentType)) {
      throw new Error(
        `Consent required: User has not granted ${consentType} consent`
      );
    }
  }
}
```

**MIGRATION**:
```sql
-- FILE: src/db/migrations/007_consent_management.sql
-- UP

CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 0,
  granted_at TEXT,
  revoked_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_consent_user_type ON consent_records(user_id, consent_type);

-- DOWN

DROP INDEX IF EXISTS idx_consent_user_type;
DROP TABLE IF EXISTS consent_records;
```

---

## Section 5: Security Hardening Roadmap

### Phase 1: CRITICAL (P0) - **BLOCK PRODUCTION DEPLOYMENT**

**Timeline**: 2-3 weeks
**Resources**: 1 senior security engineer + 1 backend engineer

**Tasks**:
1. ✅ **Implement Authentication System** (5 days)
   - Create `AuthenticationService.ts` with scrypt password hashing
   - Add `users` table migration
   - Build login/logout UI components
   - Add session validation to all IPC handlers
   - **Acceptance**: Users must log in before accessing any data

2. ✅ **Implement Authorization Middleware** (5 days)
   - Create `authorization.ts` middleware with RBAC
   - Add `role` column to `users` table
   - Add `owner_id` column to `cases` table
   - Implement resource ownership checks in all repositories
   - **Acceptance**: Users can only access their own cases/evidence

3. ✅ **Add Input Validation** (3 days)
   - Create `input-validation.ts` middleware
   - Apply validation to all IPC handlers
   - Add comprehensive test coverage
   - **Acceptance**: All IPC handlers reject invalid input

4. ✅ **Security Testing** (2 days)
   - Penetration testing (authentication bypass attempts)
   - SQL injection testing
   - XSS testing
   - **Acceptance**: No critical vulnerabilities found

**DELIVERABLE**: Application with authentication, authorization, and input validation.

---

### Phase 2: HIGH (P1) - **PRE-PRODUCTION HARDENING**

**Timeline**: 2 weeks
**Resources**: 1 security engineer

**Tasks**:
1. ✅ **Electron Security Hardening** (3 days)
   - Enable sandbox mode
   - Implement Content Security Policy
   - Block external navigation
   - Add security headers
   - **Acceptance**: CSP blocks all XSS attempts

2. ✅ **Consent Management** (3 days)
   - Create `ConsentService.ts`
   - Add consent UI on first launch
   - Implement consent withdrawal UI
   - **Acceptance**: Users can grant/revoke consent

3. ✅ **Secrets Management** (3 days)
   - Integrate OS keychain (Windows Credential Manager, macOS Keychain)
   - Implement key rotation workflow
   - Add key derivation function for user passwords
   - **Acceptance**: Encryption key stored in OS keychain

4. ✅ **Rate Limiting** (2 days)
   - Implement rate limiting middleware
   - Apply to AI, file upload, and database operations
   - **Acceptance**: Excessive requests are blocked

5. ✅ **Security Audit** (2 days)
   - Code review by external security consultant
   - Fix any HIGH severity findings
   - **Acceptance**: No HIGH severity vulnerabilities

**DELIVERABLE**: Production-ready security posture.

---

### Phase 3: MEDIUM (P2) - **ONGOING IMPROVEMENTS**

**Timeline**: Ongoing
**Resources**: 1 engineer (20% time)

**Tasks**:
1. ✅ **File Upload Scanning** (1 week)
   - Integrate ClamAV or similar for virus scanning
   - Add file magic number validation
   - Sandbox PDF parsing

2. ✅ **Breach Detection** (1 week)
   - Implement audit log anomaly detection
   - Set up alerting for suspicious activity
   - Create breach notification workflow

3. ✅ **Dependency Monitoring** (Ongoing)
   - Set up automated dependency scanning (npm audit, Snyk)
   - Monitor CVE databases
   - Apply security patches within 7 days

4. ✅ **Security Training** (Quarterly)
   - Train developers on OWASP Top 10
   - Conduct secure coding workshops
   - Review incident response procedures

**DELIVERABLE**: Continuous security improvement culture.

---

## Approval Status

**REJECTED** ❌

**BLOCKING ISSUES**:
1. **CRITICAL**: NO authentication system (complete data exposure)
2. **CRITICAL**: NO authorization controls (users can access others' data)
3. **HIGH**: Incomplete input validation (SQL injection risk)
4. **HIGH**: Missing Content Security Policy (XSS risk)
5. **HIGH**: Incomplete GDPR compliance (no consent management)

**CONDITIONAL APPROVAL REQUIREMENTS**:
- ✅ Implement authentication system (Section 4.1)
- ✅ Implement authorization middleware (Section 4.2)
- ✅ Add input validation to all IPC handlers (Section 4.3)
- ✅ Harden Electron security configuration (Section 4.4)
- ✅ Implement consent management (Section 4.6)
- ✅ Pass security penetration testing (Phase 1, Task 4)

**PRODUCTION DEPLOYMENT**: **BLOCKED UNTIL ALL P0 TASKS COMPLETE**

---

## Recommendations Summary

1. **IMMEDIATE (This Week)**:
   - Start authentication system implementation
   - Add session validation to IPC handlers
   - Block dev API server in production builds

2. **SHORT TERM (Next 2 Weeks)**:
   - Complete authorization middleware
   - Add input validation to all handlers
   - Implement consent collection UI

3. **MEDIUM TERM (Next Month)**:
   - Harden Electron security configuration
   - Implement rate limiting
   - Integrate OS keychain for secrets

4. **LONG TERM (Ongoing)**:
   - Set up automated dependency scanning
   - Implement breach detection
   - Conduct regular security audits

---

## Positive Security Findings

**STRENGTHS** ✅:
1. **Excellent encryption implementation** - AES-256-GCM with authentication tags
2. **Comprehensive audit logging** - Blockchain-style tamper detection
3. **GDPR data export/deletion** - Complete and well-implemented
4. **Parameterized SQL queries** - Prevents most SQL injection
5. **Context isolation enabled** - Proper Electron security foundation
6. **No hardcoded secrets** - Encryption key in .env file
7. **Type safety** - TypeScript strict mode enforced

**BEST PRACTICES OBSERVED**:
- Error messages don't leak sensitive information
- Encryption key generation documented properly
- Audit logs contain metadata only (no PII)
- GDPR disclaimer in data export
- Comprehensive test coverage for security features

---

**End of Security Audit Report**

*Next Steps*: Review Section 4 code implementations and proceed with Phase 1 implementation plan.

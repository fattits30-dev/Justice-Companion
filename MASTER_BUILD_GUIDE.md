# Justice Companion - Master Build Guide
**Complete Implementation Roadmap from Audit to Production**

**Date**: 2025-10-08
**Version**: 1.0
**Status**: 🔴 **PRODUCTION BLOCKED** - Critical security and testing gaps identified

---

## 📋 Executive Summary

This guide consolidates findings from **6 specialized agent audits** (Database, Backend, Frontend, Integration, Testing, Security) and provides a **step-by-step implementation plan** to complete Justice Companion.

### Current State Analysis

| Domain | Completeness | Status | Critical Issues |
|--------|--------------|--------|-----------------|
| **Database Schema** | 90% | 🟡 MODERATE | 3 migrations missing DOWN sections (P0) |
| **Backend Services** | 56% | 🟡 MODERATE | 7 services missing, ActionsRepository (P0) |
| **Frontend UI** | 72% | 🟡 MODERATE | GlobalSearch, CreateCaseModal missing (P0) |
| **AI Integration** | 67% | 🟡 MODERATE | DocumentAnalysisService missing (P0) |
| **Testing** | 60% | 🔴 CRITICAL | 30 tests failing, 14 TypeScript errors (BLOCKER) |
| **Security** | 30% | 🔴 CRITICAL | NO authentication/authorization (BLOCKER) |

**Overall Readiness**: **45%** - Estimated **10-12 weeks** to production-ready state.

### Critical Blockers (Must Fix Before Shipping)

1. ❌ **NO AUTHENTICATION SYSTEM** - Anyone can access all data (GDPR violation)
2. ❌ **14 TypeScript Errors** - Build currently failing
3. ❌ **30 Repository Tests Failing** - Database initialization broken
4. ❌ **No Authorization/RBAC** - User A can access User B's cases

### What's Working Well ✅

- ✅ **Encryption**: AES-256-GCM for 11 PII fields (GDPR Article 32 compliant)
- ✅ **Audit Logging**: Blockchain-style immutable trail (SHA-256 chaining)
- ✅ **Legal API Integration**: legislation.gov.uk + Find Case Law API (production-ready)
- ✅ **AI Streaming**: Qwen 3 8B with function calling and RAG pipeline
- ✅ **Database Migrations**: 5 migrations with rollback support
- ✅ **Repository Pattern**: 9 repositories with encryption + audit logging

---

## 🚨 PHASE 0: Critical Blockers (Week 1)

**Goal**: Fix build failures and test infrastructure
**Duration**: 3-5 days
**Effort**: 1 developer full-time

### 0.1 Fix TypeScript Errors (DAY 1 - 2 hours)

**File 1**: `src/features/chat/components/ChatPostItNotes.tsx`

```typescript
// CURRENT (BROKEN):
const response = await window.electron.caseFacts.list(caseId);
if (response.success) {
  setFacts(response.data);
}

// FIX (4 instances):
const facts = await window.electron.caseFacts.list(caseId);
setFacts(facts);
```

**File 2**: `src/services/AIFunctionDefinitions.ts`

```typescript
// CURRENT (BROKEN - 10 instances):
caseType: (args.caseType as CaseType) ?? 'other',

// FIX:
caseType: (args.caseType as CaseType | undefined) ?? 'other',
```

**Validation**:
```bash
npm run type-check  # Should show 0 errors
```

---

### 0.2 Fix Repository Test Database (DAY 1 - 4 hours)

**Problem**: `TestDatabaseHelper` only loads migration 001, causing 30 tests to fail.

**File**: `src/test-utils/database-test-helper.ts`

```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

export class TestDatabaseHelper {
  private db: Database.Database | null = null;

  initialize(): Database.Database {
    this.db = new Database(':memory:');
    this.db.pragma('foreign_keys = ON');

    // ✅ FIX: Load ALL migrations (not just 001)
    const migrations = [
      '001_initial_schema.sql',
      '002_chat_history_and_profile.sql',
      '003_audit_logs.sql',
      '004_encryption_expansion.sql',
      '005_user_and_case_facts.sql',
    ];

    for (const migration of migrations) {
      const schemaPath = path.join(__dirname, `../db/migrations/${migration}`);
      const schema = readFileSync(schemaPath, 'utf-8');

      // Extract UP section only (ignore DOWN for tests)
      const upSection = schema.split('-- DOWN')[0];
      this.db.exec(upSection);
    }

    return this.db;
  }

  cleanup(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }
}
```

**Validation**:
```bash
npm test -- src/repositories/CaseRepository.test.ts       # 17 tests should pass
npm test -- src/repositories/EvidenceRepository.test.ts   # 13 tests should pass
npm test                                                   # All tests
```

---

### 0.3 Run Quality Guard (DAY 2)

```bash
npm run guard:once
```

**Expected Output**:
```
✅ TypeScript: 0 errors
✅ ESLint: 356 warnings (0 errors)
✅ Tests: 95%+ passing
✅ Build: SUCCESS
```

**Success Criteria**:
- [ ] 0 TypeScript errors
- [ ] 30 repository tests now passing
- [ ] `npm run guard:once` exits with code 0

---

## 🔐 PHASE 1: Security Foundation (Weeks 2-4)

**Goal**: Implement authentication, authorization, and GDPR consent
**Duration**: 15 days (3 weeks)
**Effort**: 1 senior developer full-time

### 1.1 Authentication System (Week 2 - 5 days)

**Files to Create**:
- `src/models/User.ts`
- `src/models/Session.ts`
- `src/repositories/UserRepository.ts`
- `src/repositories/SessionRepository.ts`
- `src/services/AuthenticationService.ts`
- `src/db/migrations/010_authentication_system.sql`

**Migration 010**: `src/db/migrations/010_authentication_system.sql`

```sql
-- UP
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT,
  is_active INTEGER DEFAULT 1,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,  -- UUID
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- DOWN
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
```

**AuthenticationService**: `src/services/AuthenticationService.ts`

```typescript
import crypto from 'crypto';
import { promisify } from 'util';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { AuditLogger } from './AuditLogger';
import type { User, Session } from '../models';

const scrypt = promisify(crypto.scrypt);

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthenticationService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private auditLogger?: AuditLogger
  ) {}

  /**
   * Register a new user
   * OWASP: Requires 12+ character password
   */
  async register(
    username: string,
    password: string,
    email: string
  ): Promise<User> {
    // Validate password strength
    if (password.length < 12) {
      throw new AuthenticationError(
        'Password must be at least 12 characters (OWASP requirement)'
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new AuthenticationError('Password must contain uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new AuthenticationError('Password must contain lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new AuthenticationError('Password must contain number');
    }

    // Generate salt and hash password
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const hash = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;

    const user = this.userRepository.create({
      username,
      email,
      passwordHash: hash.toString('hex'),
      passwordSalt: salt.toString('hex'),
      role: 'user',
    });

    this.auditLogger?.log({
      eventType: 'user.register',
      userId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      success: true,
      metadata: { username, email },
    });

    return user;
  }

  /**
   * Login user and create session
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; session: Session }> {
    const user = this.userRepository.findByUsername(username);

    if (!user) {
      this.auditLogger?.log({
        eventType: 'user.login',
        userId: null,
        resourceType: 'user',
        success: false,
        metadata: { username, reason: 'User not found' },
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const salt = Buffer.from(user.passwordSalt, 'hex');
    const hash = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      hash
    );

    if (!isValid) {
      this.auditLogger?.log({
        eventType: 'user.login',
        userId: user.id,
        resourceType: 'user',
        success: false,
        metadata: { username, reason: 'Invalid password' },
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    const session = this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
    });

    // Update last login
    this.userRepository.updateLastLogin(user.id);

    this.auditLogger?.log({
      eventType: 'user.login',
      userId: user.id,
      resourceType: 'user',
      success: true,
      metadata: { username, sessionId },
    });

    return { user, session };
  }

  /**
   * Logout user and delete session
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.sessionRepository.findById(sessionId);

    if (session) {
      this.sessionRepository.delete(sessionId);

      this.auditLogger?.log({
        eventType: 'user.logout',
        userId: session.userId,
        resourceType: 'session',
        success: true,
        metadata: { sessionId },
      });
    }
  }

  /**
   * Validate session and return user
   */
  validateSession(sessionId: string): User | null {
    const session = this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      this.sessionRepository.delete(sessionId);
      return null;
    }

    return this.userRepository.findById(session.userId);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify old password
    const salt = Buffer.from(user.passwordSalt, 'hex');
    const hash = (await scrypt(oldPassword, salt, this.KEY_LENGTH)) as Buffer;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      hash
    );

    if (!isValid) {
      throw new AuthenticationError('Invalid current password');
    }

    // Validate new password
    if (newPassword.length < 12) {
      throw new AuthenticationError('Password must be at least 12 characters');
    }

    // Hash new password
    const newSalt = crypto.randomBytes(this.SALT_LENGTH);
    const newHash = (await scrypt(newPassword, newSalt, this.KEY_LENGTH)) as Buffer;

    this.userRepository.updatePassword(
      userId,
      newHash.toString('hex'),
      newSalt.toString('hex')
    );

    this.auditLogger?.log({
      eventType: 'user.password_change',
      userId,
      resourceType: 'user',
      success: true,
    });
  }
}
```

**IPC Integration**: `electron/main.ts` (add handlers)

```typescript
import { AuthenticationService } from '../src/services/AuthenticationService';
import { UserRepository } from '../src/repositories/UserRepository';
import { SessionRepository } from '../src/repositories/SessionRepository';

const userRepository = new UserRepository(encryptionService, auditLogger);
const sessionRepository = new SessionRepository();
const authService = new AuthenticationService(
  userRepository,
  sessionRepository,
  auditLogger
);

// Current session tracking
let currentSessionId: string | null = null;

ipcMain.handle('auth:register', async (_, username: string, password: string, email: string) => {
  const user = await authService.register(username, password, email);
  return { success: true, data: user };
});

ipcMain.handle('auth:login', async (_, username: string, password: string) => {
  const { user, session } = await authService.login(username, password);
  currentSessionId = session.id;
  return { success: true, data: { user, sessionId: session.id } };
});

ipcMain.handle('auth:logout', async () => {
  if (currentSessionId) {
    await authService.logout(currentSessionId);
    currentSessionId = null;
  }
  return { success: true };
});

ipcMain.handle('auth:getCurrentUser', async () => {
  if (!currentSessionId) {
    return { success: false, error: 'Not authenticated' };
  }

  const user = authService.validateSession(currentSessionId);
  return { success: true, data: user };
});
```

**Tests**: `src/services/AuthenticationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationService } from './AuthenticationService';
import { TestDatabaseHelper } from '../test-utils/database-test-helper';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let dbHelper: TestDatabaseHelper;

  beforeEach(() => {
    dbHelper = new TestDatabaseHelper();
    const db = dbHelper.initialize();
    // ... setup repositories
  });

  describe('register', () => {
    it('should create user with hashed password', async () => {
      const user = await service.register('alice', 'SecurePass123!', 'alice@example.com');

      expect(user.username).toBe('alice');
      expect(user.passwordHash).not.toContain('SecurePass123!');
      expect(user.passwordHash.length).toBeGreaterThan(50); // Hashed
    });

    it('should reject weak passwords', async () => {
      await expect(service.register('bob', 'short', 'bob@example.com'))
        .rejects.toThrow('at least 12 characters');
    });

    it('should audit registration', async () => {
      await service.register('charlie', 'SecurePass123!', 'charlie@example.com');

      const log = db.prepare("SELECT * FROM audit_logs WHERE event_type = 'user.register'").get();
      expect(log.success).toBe(1);
    });
  });

  describe('login', () => {
    it('should create session on valid credentials', async () => {
      await service.register('dave', 'SecurePass123!', 'dave@example.com');
      const { user, session } = await service.login('dave', 'SecurePass123!');

      expect(user.username).toBe('dave');
      expect(session.id).toBeTruthy();
      expect(session.expiresAt).toBeTruthy();
    });

    it('should reject invalid password', async () => {
      await service.register('eve', 'SecurePass123!', 'eve@example.com');

      await expect(service.login('eve', 'WrongPassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateSession', () => {
    it('should return user for valid session', async () => {
      const { session } = await service.login('frank', 'SecurePass123!');
      const user = service.validateSession(session.id);

      expect(user?.username).toBe('frank');
    });

    it('should return null for expired session', async () => {
      // ... test with mocked expired session
    });
  });
});
```

**Success Criteria**:
- [ ] Users can register with strong passwords (12+ chars, uppercase, lowercase, number)
- [ ] Login creates 24-hour session with UUID
- [ ] Sessions validate correctly and expire after 24 hours
- [ ] All auth operations audited (register, login, logout, password_change)
- [ ] 20+ tests covering auth flows (80%+ coverage)

---

### 1.2 Authorization Middleware (Week 3 - 3 days)

**File**: `src/middleware/AuthorizationMiddleware.ts`

```typescript
import { AuditLogger } from '../services/AuditLogger';
import { CaseRepository } from '../repositories/CaseRepository';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthorizationMiddleware {
  constructor(
    private caseRepository: CaseRepository,
    private auditLogger?: AuditLogger
  ) {}

  /**
   * Verify user owns a case
   */
  verifyCaseOwnership(caseId: number, userId: number): void {
    const caseData = this.caseRepository.findById(caseId);

    if (!caseData) {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId,
        resourceType: 'case',
        resourceId: caseId,
        success: false,
        metadata: { reason: 'Case not found' },
      });
      throw new AuthorizationError('Case not found');
    }

    // ✅ NEW: Add userId column to cases table in migration 011
    if (caseData.userId !== userId) {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId,
        resourceType: 'case',
        resourceId: caseId,
        success: false,
        metadata: { reason: 'Not owner', ownerId: caseData.userId },
      });
      throw new AuthorizationError('Access denied: not case owner');
    }
  }

  /**
   * Verify user has admin role
   */
  verifyAdminRole(userRole: string, userId: number): void {
    if (userRole !== 'admin') {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId,
        resourceType: 'admin',
        success: false,
        metadata: { reason: 'Not admin', role: userRole },
      });
      throw new AuthorizationError('Access denied: admin role required');
    }
  }
}
```

**Migration 011**: `src/db/migrations/011_add_user_ownership.sql`

```sql
-- UP
-- Add userId column to all resource tables
ALTER TABLE cases ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE evidence ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE user_facts ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE chat_conversations ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Create indexes for ownership queries
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_evidence_user_id ON evidence(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);

-- DOWN
DROP INDEX IF EXISTS idx_chat_conversations_user_id;
DROP INDEX IF EXISTS idx_user_facts_user_id;
DROP INDEX IF EXISTS idx_notes_user_id;
DROP INDEX IF EXISTS idx_evidence_user_id;
DROP INDEX IF EXISTS idx_cases_user_id;

-- Note: SQLite doesn't support DROP COLUMN
-- Manual migration required for rollback
```

**IPC Handler Update**: `electron/main.ts`

```typescript
import { AuthorizationMiddleware } from '../src/middleware/AuthorizationMiddleware';

const authMiddleware = new AuthorizationMiddleware(caseRepository, auditLogger);

ipcMain.handle(IPC_CHANNELS.CASE_GET_BY_ID, async (_, request: CaseGetByIdRequest) => {
  try {
    // ✅ AUTHORIZATION CHECK
    const currentUser = authService.validateSession(currentSessionId);

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    authMiddleware.verifyCaseOwnership(request.id, currentUser.id);

    const foundCase = caseRepository.findById(request.id);
    return { success: true, data: foundCase };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Success Criteria**:
- [ ] All IPC handlers verify authentication before processing
- [ ] Case operations verify ownership (user can only access their own cases)
- [ ] Admin operations verify role (only admins can access admin features)
- [ ] Authorization failures audited with denial reason
- [ ] 15+ tests for authorization scenarios

---

### 1.3 GDPR Consent Management (Week 3-4 - 2 days)

**Migration 012**: `src/db/migrations/012_consent_management.sql`

```sql
-- UP
CREATE TABLE consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL CHECK(consent_type IN ('data_processing', 'encryption', 'ai_processing', 'marketing')),
  granted INTEGER NOT NULL DEFAULT 0,  -- Boolean
  granted_at TEXT,
  revoked_at TEXT,
  version TEXT NOT NULL,  -- Privacy policy version
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_consents_type ON consents(consent_type);

-- DOWN
DROP INDEX IF EXISTS idx_consents_type;
DROP INDEX IF EXISTS idx_consents_user_id;
DROP TABLE IF EXISTS consents;
```

**ConsentService**: `src/services/ConsentService.ts`

```typescript
import { ConsentRepository } from '../repositories/ConsentRepository';
import { AuditLogger } from './AuditLogger';

export type ConsentType = 'data_processing' | 'encryption' | 'ai_processing' | 'marketing';

export class ConsentService {
  private readonly CURRENT_PRIVACY_VERSION = '1.0';

  constructor(
    private consentRepository: ConsentRepository,
    private auditLogger?: AuditLogger
  ) {}

  /**
   * Grant consent for specific type
   */
  grantConsent(userId: number, consentType: ConsentType): void {
    const consent = this.consentRepository.create({
      userId,
      consentType,
      granted: true,
      grantedAt: new Date().toISOString(),
      version: this.CURRENT_PRIVACY_VERSION,
    });

    this.auditLogger?.log({
      eventType: 'consent.granted',
      userId,
      resourceType: 'consent',
      resourceId: consent.id,
      success: true,
      metadata: { consentType, version: this.CURRENT_PRIVACY_VERSION },
    });
  }

  /**
   * Revoke consent (GDPR Article 7.3)
   */
  revokeConsent(userId: number, consentType: ConsentType): void {
    const consent = this.consentRepository.findActiveConsent(userId, consentType);

    if (consent) {
      this.consentRepository.revoke(consent.id);

      this.auditLogger?.log({
        eventType: 'consent.revoked',
        userId,
        resourceType: 'consent',
        resourceId: consent.id,
        success: true,
        metadata: { consentType },
      });
    }
  }

  /**
   * Check if user has active consent
   */
  hasConsent(userId: number, consentType: ConsentType): boolean {
    const consent = this.consentRepository.findActiveConsent(userId, consentType);
    return consent !== null && consent.granted === true && consent.revokedAt === null;
  }

  /**
   * Get all consents for user
   */
  getUserConsents(userId: number): Consent[] {
    return this.consentRepository.listByUser(userId);
  }
}
```

**UI Component**: `src/components/ConsentBanner.tsx`

```typescript
import { useState, useEffect } from 'react';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkConsents = async () => {
      const hasDataConsent = await window.electron.consent.hasConsent('data_processing');
      setShowBanner(!hasDataConsent);
    };
    checkConsents();
  }, []);

  const handleAcceptAll = async () => {
    await window.electron.consent.grant('data_processing');
    await window.electron.consent.grant('encryption');
    await window.electron.consent.grant('ai_processing');
    setShowBanner(false);
  };

  const handleReject = async () => {
    // Minimal consent (required for app to function)
    await window.electron.consent.grant('data_processing');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Privacy & Data Processing</h3>
          <p className="text-sm text-gray-300">
            We process your legal case data locally on your device with AES-256 encryption.
            AI features use local models (no cloud). You can withdraw consent anytime.
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleReject}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Success Criteria**:
- [ ] Consent banner shown on first app launch
- [ ] Users can grant/revoke consent for 4 types
- [ ] App enforces consent (e.g., no AI if ai_processing revoked)
- [ ] All consent actions audited
- [ ] Privacy policy version tracking

---

### 1.4 Input Validation Middleware (Week 4 - 2 days)

**File**: `src/middleware/ValidationMiddleware.ts`

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationMiddleware {
  /**
   * Validate string length
   */
  static validateLength(
    value: string,
    field: string,
    min: number,
    max: number
  ): void {
    if (value.length < min) {
      throw new ValidationError(`${field} must be at least ${min} characters`);
    }
    if (value.length > max) {
      throw new ValidationError(`${field} must be at most ${max} characters`);
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Sanitize file path (prevent directory traversal)
   */
  static sanitizeFilePath(filePath: string): string {
    // Remove ../ and ../\ patterns
    const sanitized = filePath.replace(/\.\.(\/|\\)/g, '');

    if (sanitized !== filePath) {
      throw new ValidationError('Invalid file path: directory traversal detected');
    }

    return sanitized;
  }

  /**
   * Validate enum value
   */
  static validateEnum<T extends string>(
    value: T,
    field: string,
    allowedValues: readonly T[]
  ): void {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${field} must be one of: ${allowedValues.join(', ')}`
      );
    }
  }

  /**
   * Validate date format (ISO 8601)
   */
  static validateDate(dateString: string, field: string): void {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`${field} must be a valid ISO date`);
    }
  }

  /**
   * Sanitize HTML (prevent XSS)
   */
  static sanitizeHTML(html: string): string {
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
```

**Apply to IPC Handlers**: `electron/main.ts`

```typescript
import { ValidationMiddleware } from '../src/middleware/ValidationMiddleware';

ipcMain.handle(IPC_CHANNELS.CASES_CREATE, async (_, input: CreateCaseInput) => {
  try {
    // ✅ VALIDATION
    ValidationMiddleware.validateLength(input.title, 'title', 3, 200);

    if (input.description) {
      ValidationMiddleware.validateLength(input.description, 'description', 0, 5000);
    }

    ValidationMiddleware.validateEnum(
      input.caseType,
      'caseType',
      ['employment', 'housing', 'family', 'other'] as const
    );

    // Proceed with creation
    const newCase = await caseService.create(input);
    return { success: true, data: newCase };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Success Criteria**:
- [ ] All IPC handlers validate input before processing
- [ ] String lengths enforced (prevent DoS via memory exhaustion)
- [ ] Enum values validated (prevent invalid database states)
- [ ] File paths sanitized (prevent directory traversal)
- [ ] HTML sanitized where rendered (prevent XSS)

---

## 🗃️ PHASE 2: Database Completion (Week 5)

**Goal**: Fix migration system and add missing features
**Duration**: 5 days
**Effort**: 1 developer full-time

### 2.1 Add DOWN Sections to Migrations (Day 1 - 2 hours)

**Problem**: Migrations 001, 002, 003 missing DOWN sections (cannot rollback).

**Migration 001**: Append to `src/db/migrations/001_initial_schema.sql`

```sql
-- DOWN
DROP TRIGGER IF EXISTS timeline_events_updated_at;
DROP TRIGGER IF EXISTS legal_issues_updated_at;
DROP TRIGGER IF EXISTS evidence_updated_at;
DROP TRIGGER IF EXISTS cases_updated_at;

DROP INDEX IF EXISTS idx_timeline_events_case_id;
DROP INDEX IF EXISTS idx_timeline_events_event_date;
DROP INDEX IF EXISTS idx_legal_issues_case_id;
DROP INDEX IF EXISTS idx_evidence_case_id;
DROP INDEX IF EXISTS idx_evidence_type;
DROP INDEX IF EXISTS idx_cases_status;
DROP INDEX IF EXISTS idx_cases_case_type;

DROP TABLE IF EXISTS timeline_events;
DROP TABLE IF EXISTS legal_issues;
DROP TABLE IF EXISTS event_evidence;
DROP TABLE IF EXISTS evidence;
DROP TABLE IF EXISTS actions;
DROP TABLE IF EXISTS cases;
```

**Migration 002**: Append to `src/db/migrations/002_chat_history_and_profile.sql`

```sql
-- DOWN
DROP TRIGGER IF EXISTS chat_conversations_updated_at;

DROP INDEX IF EXISTS idx_chat_messages_conversation_id;
DROP INDEX IF EXISTS idx_chat_conversations_case_id;

DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_conversations;
DROP TABLE IF EXISTS user_profile;
```

**Migration 003**: Append to `src/db/migrations/003_audit_logs.sql`

```sql
-- DOWN
DROP TRIGGER IF EXISTS audit_logs_immutable;

DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_event_type;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_resource;

DROP TABLE IF EXISTS audit_logs;
```

**Validation**:
```bash
npm run db:migrate:rollback 003_audit_logs.sql
npm run db:migrate:rollback 002_chat_history_and_profile.sql
npm run db:migrate:rollback 001_initial_schema.sql
npm run db:migrate  # Re-apply all
```

---

### 2.2 Fix evidence_type Constraint (Day 1 - 1 hour)

**Migration 013**: `src/db/migrations/013_fix_evidence_type.sql`

```sql
-- UP
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- 1. Create new table with correct constraint
CREATE TABLE evidence_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('document', 'photo', 'video', 'audio', 'witness', 'correspondence', 'other')),
  file_path TEXT,
  file_type TEXT,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- 2. Copy data
INSERT INTO evidence_new SELECT * FROM evidence;

-- 3. Drop old table
DROP TABLE evidence;

-- 4. Rename new table
ALTER TABLE evidence_new RENAME TO evidence;

-- 5. Recreate indexes
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_user_id ON evidence(user_id);

-- 6. Recreate trigger
CREATE TRIGGER evidence_updated_at
  AFTER UPDATE ON evidence
  FOR EACH ROW
  BEGIN
    UPDATE evidence SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- DOWN
-- Reverse: Remove 'witness' from constraint
CREATE TABLE evidence_old (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('document', 'photo', 'video', 'audio', 'correspondence', 'other')),
  file_path TEXT,
  file_type TEXT,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

INSERT INTO evidence_old SELECT * FROM evidence;
DROP TABLE evidence;
ALTER TABLE evidence_old RENAME TO evidence;

CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_user_id ON evidence(user_id);

CREATE TRIGGER evidence_updated_at AFTER UPDATE ON evidence FOR EACH ROW BEGIN UPDATE evidence SET updated_at = datetime('now') WHERE id = NEW.id; END;
```

---

### 2.3 Add Performance Indexes (Day 2 - 2 hours)

**Migration 014**: `src/db/migrations/014_performance_indexes.sql`

```sql
-- UP
-- Cases table indexes
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_cases_updated_at ON cases(updated_at DESC);
CREATE INDEX idx_cases_status_type ON cases(status, case_type);

-- Evidence table indexes
CREATE INDEX idx_evidence_created_at ON evidence(created_at DESC);

-- Notes table indexes
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Actions table indexes
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_priority ON actions(priority);
CREATE INDEX idx_actions_due_date ON actions(due_date);
CREATE INDEX idx_actions_status_due ON actions(status, due_date) WHERE status = 'pending';

-- User facts table indexes
CREATE INDEX idx_user_facts_fact_type ON user_facts(fact_type);

-- Case facts table indexes
CREATE INDEX idx_case_facts_category ON case_facts(category);
CREATE INDEX idx_case_facts_importance ON case_facts(importance);

-- Chat messages table indexes
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Covering index for active cases dashboard query
CREATE INDEX idx_cases_active_dashboard ON cases(status, created_at DESC) WHERE status = 'active';

-- Partial index for overdue actions
CREATE INDEX idx_actions_overdue ON actions(due_date) WHERE status = 'pending' AND due_date < datetime('now');

-- DOWN
DROP INDEX IF EXISTS idx_actions_overdue;
DROP INDEX IF EXISTS idx_cases_active_dashboard;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_case_facts_importance;
DROP INDEX IF EXISTS idx_case_facts_category;
DROP INDEX IF EXISTS idx_user_facts_fact_type;
DROP INDEX IF EXISTS idx_actions_status_due;
DROP INDEX IF EXISTS idx_actions_due_date;
DROP INDEX IF EXISTS idx_actions_priority;
DROP INDEX IF EXISTS idx_actions_status;
DROP INDEX IF EXISTS idx_notes_created_at;
DROP INDEX IF EXISTS idx_evidence_created_at;
DROP INDEX IF EXISTS idx_cases_status_type;
DROP INDEX IF EXISTS idx_cases_updated_at;
DROP INDEX IF EXISTS idx_cases_created_at;
```

**Validation**:
```bash
# Test query performance
sqlite3 justice.db "EXPLAIN QUERY PLAN SELECT * FROM cases WHERE status = 'active' ORDER BY created_at DESC LIMIT 10;"

# Should show: SEARCH cases USING INDEX idx_cases_active_dashboard
```

---

### 2.4 Create ActionRepository + ActionService (Days 3-4 - 8 hours)

**See BACKEND_AUDIT_REPORT.md Section 4.1** for complete code (180+ lines).

**Summary**:
- Create `src/repositories/ActionRepository.ts` (150 lines)
- Create `src/services/ActionService.ts` (180 lines)
- Add IPC handlers in `electron/main.ts`
- Create `src/hooks/useActions.ts` (100 lines)
- Create `src/components/ActionsPanel.tsx` (300 lines)
- Write tests: `src/repositories/ActionRepository.test.ts` (200 lines)

**Success Criteria**:
- [ ] Users can create actions (title, description, due date, priority, status)
- [ ] Actions filtered by status/priority/case
- [ ] Overdue actions highlighted in UI
- [ ] All CRUD operations audited
- [ ] 80%+ test coverage

---

## 🔧 PHASE 3: Backend Services (Week 6)

**Goal**: Complete missing service layers and validation
**Duration**: 5 days
**Effort**: 1 developer full-time

### 3.1 EvidenceService (Day 1 - 4 hours)

**See BACKEND_AUDIT_REPORT.md Section 4.2** for complete code.

**Key Features**:
- File size validation (max 50MB)
- MIME type validation (only allow PDF, DOCX, JPG, PNG, MP4, MP3)
- File path existence check before storage
- Evidence type validation
- Title length limits (3-200 chars)

**Success Criteria**:
- [ ] Cannot upload files > 50MB
- [ ] Invalid MIME types rejected
- [ ] File uploads create both file_path and content (encrypted)
- [ ] Validation errors logged and returned to UI

---

### 3.2 ChatMessageService (Days 2-3 - 8 hours)

**See BACKEND_AUDIT_REPORT.md Section 4.3** for complete code.

**Key Features**:
- Message content validation (1-10,000 chars)
- Token counting for cost tracking
- Message pagination (load 50 at a time, not all messages)
- Conversation export (TXT/PDF/JSON formats)
- Message search/filtering

**New Methods**:
```typescript
paginateMessages(conversationId: number, page: number, limit: number): PaginatedMessages
searchConversations(query: string): ChatConversation[]
exportConversation(id: number, format: 'txt' | 'pdf' | 'json'): Buffer
getConversationStats(id: number): { messageCount, tokenCount, duration }
```

**Success Criteria**:
- [ ] Messages load in pages of 50 (not all at once)
- [ ] Export to TXT/PDF/JSON works
- [ ] Token counting tracks AI usage
- [ ] Search finds conversations by content

---

## 🎨 PHASE 4: Frontend Components (Week 7)

**Goal**: Complete missing UI components
**Duration**: 5 days
**Effort**: 1 frontend developer full-time

### 4.1 GlobalSearch Component (Days 1-2 - 6 hours)

**See FRONTEND_AUDIT_REPORT.md Section 4.1** for complete code (300+ lines).

**Key Features**:
- Search across cases, evidence, notes, legal issues, timeline
- Keyboard shortcut (Cmd/Ctrl + K)
- Debounced search (300ms delay)
- Result preview with excerpts
- Click to navigate to resource

**Success Criteria**:
- [ ] Cmd/Ctrl + K opens search modal
- [ ] Search works across 5 resource types
- [ ] Results show within 500ms
- [ ] Click navigates to resource detail view
- [ ] Accessible (ARIA labels, focus management)

---

### 4.2 CreateCaseModal Component (Day 2 - 4 hours)

**See FRONTEND_AUDIT_REPORT.md Section 4.2** for complete code (200+ lines).

**Key Features**:
- React Hook Form validation
- Case type selector (employment, housing, family, other)
- Description textarea with character counter
- Success toast notification
- Auto-navigate to new case after creation

**Success Criteria**:
- [ ] Form validates (title required, 3+ chars)
- [ ] Case created on submit
- [ ] Toast notification shown
- [ ] Auto-navigate to case detail page
- [ ] Accessible (keyboard navigation, error announcements)

---

### 4.3 NotificationCenter Component (Day 3 - 4 hours)

**See FRONTEND_AUDIT_REPORT.md Section 4.3** for complete code (200+ lines).

**Key Features**:
- Bell icon with unread count badge
- Notification types (info, success, warning, error)
- Mark as read/unread
- Clear all notifications
- Auto-dismiss after 5 seconds (optional)

**Success Criteria**:
- [ ] Bell icon shows unread count
- [ ] Notifications displayed in dropdown
- [ ] Click to mark as read
- [ ] Auto-dismiss works for non-critical notifications
- [ ] Accessible (ARIA live regions for screen readers)

---

## 🤖 PHASE 5: AI Integration (Week 8)

**Goal**: Add document analysis and citation extraction
**Duration**: 5 days
**Effort**: 1 AI specialist full-time

### 5.1 DocumentAnalysisService (Days 1-3 - 12 hours)

**See INTEGRATION_AUDIT_REPORT.md Section 4.1** for complete code (800+ lines).

**Key Features**:
- PDF text extraction (pdf-parse)
- DOCX text extraction (mammoth)
- AI analysis prompt for dates, parties, amounts, legal issues
- Auto-create timeline events from extracted dates
- Store analysis results in database

**Prompt Template**:
```
Analyze this legal document and extract:
1. Key dates (format: YYYY-MM-DD) with context
2. Important amounts (£/$/€) with description
3. Legal entities (people, companies, courts)
4. Document type (contract, letter, court order, etc.)
5. Summary (2-3 sentences)

Document text:
{text}

Respond in JSON format.
```

**Success Criteria**:
- [ ] Upload PDF/DOCX and extract text
- [ ] AI identifies dates, parties, amounts
- [ ] Timeline auto-generates from dates
- [ ] Analysis results saved and displayed
- [ ] Works with 100+ page documents

---

### 5.2 LegalCitationService (Days 4-5 - 8 hours)

**See INTEGRATION_AUDIT_REPORT.md Section 4.2** for complete code (400+ lines).

**Key Features**:
- Regex patterns for legislation citations (e.g., "Employment Rights Act 1996 s.94")
- Regex patterns for case law citations (e.g., "Smith v Jones [2024] UKSC 1")
- Citation verification against Legal APIs
- Hyperlink citations to legislation.gov.uk or Find Case Law

**Regex Patterns**:
```typescript
// Legislation: "Employment Rights Act 1996 s.94"
const legislationRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Act\s+(\d{4})(?:\s+s\.(\d+))?/gi;

// Case law: "Smith v Jones [2024] UKSC 123"
const caseLawRegex = /([A-Z][a-z]+)\s+v\s+([A-Z][a-z]+)\s+\[(\d{4})\]\s+([A-Z]+)\s+(\d+)/gi;
```

**Success Criteria**:
- [ ] Detects legislation citations in documents
- [ ] Detects case law citations in documents
- [ ] Verifies citations against APIs
- [ ] Creates hyperlinks in UI
- [ ] Works with 20+ citation formats

---

## 🧪 PHASE 6: Testing Completion (Weeks 9-10)

**Goal**: Achieve 80%+ test coverage
**Duration**: 10 days (2 weeks)
**Effort**: 1 QA engineer full-time

### 6.1 Unit Tests (Week 9 - 5 days)

**See TESTING_AUDIT_SUMMARY.md** for complete test suite code.

**Missing Tests**:
- `ChatConversationService.test.ts` (1 day)
- `RAGService.test.ts` (1 day)
- `ModelDownloadService.test.ts` (1 day)
- 9 component tests (2 days total):
  - `LegalIssuesPanel.test.tsx`
  - `TimelineView.test.tsx`
  - `Sidebar.test.tsx`
  - `Dashboard.test.tsx`
  - `DocumentsView.test.tsx`
  - `GlobalSearch.test.tsx`
  - `CreateCaseModal.test.tsx`
  - `NotificationCenter.test.tsx`
  - `ActionsPanel.test.tsx`

**Success Criteria**:
- [ ] 80%+ code coverage
- [ ] All services tested (12/12)
- [ ] All repositories tested (9/9)
- [ ] 80%+ components tested (17/21)

---

### 6.2 Integration Tests (Week 10 - 3 days)

**New Test Files**:
- `tests/integration/case-lifecycle.test.ts` - Full case CRUD with audit trail
- `tests/integration/encryption-roundtrip.test.ts` - Verify all 11 encrypted fields
- `tests/integration/ipc-handlers.test.ts` - Test all 30+ IPC channels
- `tests/integration/legal-api-integration.test.ts` - Test with real APIs

**Success Criteria**:
- [ ] Case create → update → delete flow with audit verification
- [ ] All 11 encrypted fields encrypt/decrypt correctly
- [ ] All IPC handlers respond with correct types
- [ ] Legal APIs return expected data formats

---

### 6.3 E2E Tests (Week 10 - 2 days)

**New Test Files**:
- `tests/e2e/legal-issues.spec.ts`
- `tests/e2e/timeline-events.spec.ts`
- `tests/e2e/chat-conversations.spec.ts`
- `tests/e2e/keyboard-navigation.spec.ts`
- `tests/e2e/error-recovery.spec.ts`

**Success Criteria**:
- [ ] 12+ E2E flows tested (80% critical user journeys)
- [ ] Keyboard navigation works for all components
- [ ] Offline mode gracefully degrades
- [ ] Network errors show user-friendly messages

---

## 🔍 PHASE 7: Security Hardening (Week 11)

**Goal**: Production security readiness
**Duration**: 5 days
**Effort**: 1 security engineer full-time

### 7.1 Electron Security (Day 1 - 3 hours)

**File**: `electron/main.ts`

```typescript
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 720,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,  // ✅ Already set
    nodeIntegration: false,  // ✅ Already set
    sandbox: true,           // ✅ FIX: Enable sandbox
    webSecurity: true,       // ✅ FIX: Enable web security
    allowRunningInsecureContent: false,  // ✅ FIX: Block insecure content
  },
});

// ✅ FIX: Only open DevTools in development
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}

// ✅ FIX: Add Content Security Policy
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self';"
      ]
    }
  });
});
```

**Success Criteria**:
- [ ] Sandbox enabled
- [ ] CSP headers set
- [ ] DevTools disabled in production builds
- [ ] Web security enabled

---

### 7.2 Rate Limiting (Days 2-3 - 6 hours)

**File**: `src/middleware/RateLimitMiddleware.ts`

```typescript
export class RateLimitMiddleware {
  private requests: Map<string, number[]> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS = 60; // 60 requests per minute

  checkRateLimit(userId: number, operation: string): void {
    const key = `${userId}:${operation}`;
    const now = Date.now();

    // Get request timestamps for this user+operation
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside window
    const recentTimestamps = timestamps.filter(t => now - t < this.WINDOW_MS);

    // Check limit
    if (recentTimestamps.length >= this.MAX_REQUESTS) {
      throw new Error(`Rate limit exceeded: ${this.MAX_REQUESTS} requests per minute`);
    }

    // Add current timestamp
    recentTimestamps.push(now);
    this.requests.set(key, recentTimestamps);
  }
}
```

**Apply to Legal APIs**:
```typescript
// src/services/LegalAPIService.ts
async searchLegislation(keywords: string[]): Promise<LegalDocument[]> {
  this.rateLimiter?.checkRateLimit(userId, 'legal_api_legislation');

  // ... existing API call
}
```

**Success Criteria**:
- [ ] Legal API calls rate-limited (60/min per user)
- [ ] AI chat requests rate-limited (10/min per user)
- [ ] Rate limit errors return 429 status
- [ ] Rate limit state persisted across restarts

---

### 7.3 Dependency Security Audit (Day 4 - 2 hours)

```bash
# Run npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated dependencies with known CVEs
npm outdated

# Update critical security patches
npm update
```

**Success Criteria**:
- [ ] 0 high/critical vulnerabilities
- [ ] All dependencies on supported versions
- [ ] Automated audit in CI/CD pipeline

---

### 7.4 Penetration Testing (Day 5 - full day)

**Test Scenarios**:
1. **Authentication Bypass**: Try accessing IPC handlers without session
2. **Authorization Bypass**: Try accessing other users' cases
3. **SQL Injection**: Send malicious input to all IPC handlers
4. **XSS**: Try injecting scripts via case descriptions
5. **CSRF**: Try forging requests from external sources
6. **Directory Traversal**: Try accessing files outside app directory
7. **DoS**: Try sending 1000 requests per second

**Success Criteria**:
- [ ] All attack scenarios blocked
- [ ] Security violations logged in audit trail
- [ ] Penetration test report with 0 critical findings

---

## 📚 PHASE 8: Documentation & Polish (Week 12)

**Goal**: Production-ready documentation
**Duration**: 5 days
**Effort**: 1 technical writer + 1 developer

### 8.1 User Documentation (Days 1-2)

**Files to Create**:
- `docs/USER_GUIDE.md` - Complete user manual
- `docs/GETTING_STARTED.md` - First-time setup guide
- `docs/FAQ.md` - Common questions and troubleshooting
- `docs/PRIVACY_POLICY.md` - GDPR compliance statement
- `docs/TERMS_OF_SERVICE.md` - Legal terms

**Success Criteria**:
- [ ] 30+ pages of user documentation
- [ ] Screenshots for all major features
- [ ] Video tutorials (5-10 mins each)

---

### 8.2 Developer Documentation (Days 3-4)

**Files to Update**:
- `CLAUDE.md` - Update with Phases 1-7 completion
- `CONTRIBUTING.md` - Contribution guidelines
- `ARCHITECTURE.md` - System architecture diagram
- `API_REFERENCE.md` - Complete API documentation

**Success Criteria**:
- [ ] Architecture diagram with all components
- [ ] API reference for all 40+ IPC handlers
- [ ] Code examples for common tasks

---

### 8.3 Deployment Guide (Day 5)

**Files to Create**:
- `docs/DEPLOYMENT.md` - Production deployment steps
- `docs/BACKUP_RESTORE.md` - Database backup/restore guide
- `docs/TROUBLESHOOTING.md` - Common issues and fixes

**Success Criteria**:
- [ ] Step-by-step deployment guide
- [ ] Automated deployment scripts
- [ ] Rollback procedures documented

---

## 📊 Implementation Checklist

### Critical Blockers (Week 1) - MUST FIX FIRST
- [ ] Fix 14 TypeScript errors (2 hours)
- [ ] Fix 30 failing repository tests (4 hours)
- [ ] Verify `npm run guard:once` passes (1 hour)

### Security Foundation (Weeks 2-4)
- [ ] Authentication system (5 days)
- [ ] Authorization middleware (3 days)
- [ ] GDPR consent management (2 days)
- [ ] Input validation (2 days)

### Database (Week 5)
- [ ] Add DOWN sections to migrations (2 hours)
- [ ] Fix evidence_type constraint (1 hour)
- [ ] Add performance indexes (2 hours)
- [ ] ActionRepository + ActionService (8 hours)

### Backend (Week 6)
- [ ] EvidenceService validation (4 hours)
- [ ] ChatMessageService completion (8 hours)
- [ ] Rate limiting (6 hours)

### Frontend (Week 7)
- [ ] GlobalSearch component (6 hours)
- [ ] CreateCaseModal component (4 hours)
- [ ] NotificationCenter component (4 hours)

### AI Integration (Week 8)
- [ ] DocumentAnalysisService (12 hours)
- [ ] LegalCitationService (8 hours)

### Testing (Weeks 9-10)
- [ ] Unit tests (5 days)
- [ ] Integration tests (3 days)
- [ ] E2E tests (2 days)

### Security Hardening (Week 11)
- [ ] Electron security config (3 hours)
- [ ] Rate limiting (6 hours)
- [ ] Dependency audit (2 hours)
- [ ] Penetration testing (1 day)

### Documentation (Week 12)
- [ ] User documentation (2 days)
- [ ] Developer documentation (2 days)
- [ ] Deployment guide (1 day)

---

## 📈 Progress Tracking

### Current State (2025-10-08)
- **Database**: 90% complete (missing ActionRepository, indexes)
- **Backend**: 56% complete (7 services missing)
- **Frontend**: 72% complete (3 components missing)
- **AI Integration**: 67% complete (DocumentAnalysis missing)
- **Testing**: 60% coverage (blockers present)
- **Security**: 30% complete (NO authentication)
- **Overall**: **45% production-ready**

### Target State (2025-12-31)
- **Database**: 100% complete
- **Backend**: 100% complete (all services implemented)
- **Frontend**: 95% complete (all critical components)
- **AI Integration**: 100% complete
- **Testing**: 80%+ coverage
- **Security**: 100% production-ready
- **Overall**: **95% production-ready**

---

## ⏱️ Timeline Summary

| Phase | Duration | Start | End | Critical Path |
|-------|----------|-------|-----|---------------|
| **Phase 0: Blockers** | 1 week | Week 1 | Week 1 | ✅ YES |
| **Phase 1: Security** | 3 weeks | Week 2 | Week 4 | ✅ YES |
| **Phase 2: Database** | 1 week | Week 5 | Week 5 | ❌ NO |
| **Phase 3: Backend** | 1 week | Week 6 | Week 6 | ❌ NO |
| **Phase 4: Frontend** | 1 week | Week 7 | Week 7 | ❌ NO |
| **Phase 5: AI Integration** | 1 week | Week 8 | Week 8 | ❌ NO |
| **Phase 6: Testing** | 2 weeks | Week 9 | Week 10 | ✅ YES |
| **Phase 7: Security Hardening** | 1 week | Week 11 | Week 11 | ✅ YES |
| **Phase 8: Documentation** | 1 week | Week 12 | Week 12 | ❌ NO |

**Total Duration**: **12 weeks** (3 months)

---

## 👥 Resource Requirements

| Role | Weeks | % Time | Total Days |
|------|-------|--------|------------|
| **Senior Developer** | 12 | 100% | 60 days |
| **Frontend Developer** | 4 | 50% | 10 days |
| **QA Engineer** | 3 | 100% | 15 days |
| **Security Engineer** | 1 | 100% | 5 days |
| **Technical Writer** | 1 | 50% | 2.5 days |

**Total Effort**: **92.5 developer-days** (4-5 months for 1 developer, 3 months for 2 developers)

---

## 🚀 Quick Start Commands

```bash
# Phase 0: Fix blockers
npm run type-check        # Fix TypeScript errors first
npm test                  # Fix failing tests
npm run guard:once        # Verify all checks pass

# Phase 1: Run migrations
npm run db:migrate        # Apply all new migrations (010-014)
npm run db:migrate:status # Check migration status

# Phase 2: Run tests after Phase 1
npm test                  # Should show 95%+ passing

# Phase 6: Run full test suite
npm test -- --coverage    # Check coverage (target: 80%+)
npm run test:e2e          # Run E2E tests

# Phase 7: Security audit
npm audit                 # Check vulnerabilities
npm run lint              # Check code quality

# Build for production
npm run build
npm run build:win         # Windows installer
```

---

## 📖 Additional Resources

### Full Audit Reports
- **DATABASE_AUDIT_REPORT.md** - Complete database analysis with all migration code
- **BACKEND_AUDIT_REPORT.md** - All missing services with complete implementations
- **FRONTEND_AUDIT_REPORT.md** - UI component code (GlobalSearch, CreateCaseModal, etc.)
- **INTEGRATION_AUDIT_REPORT.md** - DocumentAnalysis and LegalCitation services (800+ lines)
- **TESTING_AUDIT_REPORT.md** - Complete test suite specifications
- **SECURITY_AUDIT_REPORT.md** - Security gaps and fixes (50+ pages)

### Quick Reference Guides
- **DATABASE_AUDIT_SUMMARY.md** - Database checklist
- **INTEGRATION_AUDIT_SUMMARY.md** - Integration checklist
- **TESTING_AUDIT_SUMMARY.md** - Testing checklist
- **IPC_API_REFERENCE.md** - All 40+ IPC handlers documented
- **CODE_SNIPPETS.md** - 15 production-ready code patterns

### Architecture Documentation
- **CLAUDE.md** - Project overview and current status
- **ENCRYPTION_IMPLEMENTATION.md** - Encryption service guide
- **FACTS_FEATURE_IMPLEMENTATION.md** - User/case facts guide
- **MIGRATION_SYSTEM_GUIDE.md** - Database migration guide

---

## ⚠️ Critical Warnings

1. **DO NOT DEPLOY** without completing Phase 1 (Security) - GDPR violation risk
2. **DO NOT SKIP** Phase 0 (Blockers) - Build is currently broken
3. **DO NOT SKIP** Phase 6 (Testing) - Encryption integrity unverified
4. **TEST MIGRATIONS** on backup database before applying to production

---

## ✅ Definition of Done

An issue is considered "done" when:

1. ✅ Code implemented and committed to git
2. ✅ Unit tests written (80%+ coverage)
3. ✅ Integration tests passing
4. ✅ E2E tests passing (if UI component)
5. ✅ TypeScript compilation passes (`npm run type-check`)
6. ✅ ESLint passes (`npm run lint`)
7. ✅ Documentation updated (CLAUDE.md, API docs, etc.)
8. ✅ Code reviewed by senior developer
9. ✅ Audit logs verified (if security-sensitive)
10. ✅ Encryption verified (if handling PII)

---

**Last Updated**: 2025-10-08
**Next Review**: After Phase 0 completion (Week 1)
**Document Version**: 1.0
**Maintained By**: Justice Companion Development Team

---

## 🎯 Success Criteria

**Phase 0 Success** (Week 1):
- ✅ Build passing (`npm run guard:once` exits 0)
- ✅ 0 TypeScript errors
- ✅ 95%+ tests passing

**Phase 1 Success** (Week 4):
- ✅ Users can register/login/logout
- ✅ All IPC handlers verify authentication
- ✅ All IPC handlers verify authorization (ownership)
- ✅ Consent banner shown on first launch
- ✅ 60+ security tests passing

**Phase 6 Success** (Week 10):
- ✅ 80%+ code coverage
- ✅ All repositories tested (9/9)
- ✅ All services tested (12/12)
- ✅ 12+ E2E flows tested

**Production Readiness** (Week 12):
- ✅ 0 high/critical security vulnerabilities
- ✅ 95%+ tests passing
- ✅ All GDPR features implemented
- ✅ Complete user documentation
- ✅ Deployment guide ready
- ✅ Penetration test passed

**Ready to ship!** 🚀

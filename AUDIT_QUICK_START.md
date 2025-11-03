# 🎯 AUDIT FIXES - QUICK START CHECKLIST

**Created**: November 3, 2025  
**Status**: Ready to Begin

---

## ⚡ IMMEDIATE ACTIONS (Do These First)

### 1. Fix Node.js Version ⏱️ 30 minutes
**Current**: v22.20.0  
**Required**: v20.18.0

```powershell
# Install nvm for Windows (if not installed)
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install and use Node 20
nvm install 20.18.0
nvm use 20.18.0

# Verify
node --version  # Should show v20.18.0

# Reinstall dependencies
pnpm install
pnpm rebuild:electron
```

**Status**: [ ] Not Started [ ] In Progress [ ] ✅ Complete

---

### 2. Create Unified Logger Service ⏱️ 2 hours
**Priority**: CRITICAL - Needed for production debugging

**File**: `src/services/Logger.ts`

```typescript
import fs from 'fs';
import path from 'path';

interface LogContext {
  userId?: string;
  caseId?: string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logDir: string;
  private env = process.env.NODE_ENV;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private writeToFile(entry: LogEntry): void {
    const logFile = path.join(
      this.logDir,
      `${entry.level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`
    );

    try {
      fs.appendFileSync(logFile, this.formatLog(entry));
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
    };

    if (this.env !== 'production') {
      console.log(`[INFO] ${message}`, context || '');
    }

    this.writeToFile(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
    };

    console.warn(`[WARN] ${message}`, context || '');
    this.writeToFile(entry);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    console.error(`[ERROR] ${message}`, error || '', context || '');
    this.writeToFile(entry);
  }
}

export const logger = new Logger();
```

**Usage Example**:
```typescript
// Replace:
console.log('[IPC] case:create called by user:', userId);

// With:
logger.info('IPC handler called', { handler: 'case:create', userId });

// Replace:
console.error('Database error:', error);

// With:
logger.error('Database operation failed', error, { operation: 'createCase' });
```

**Status**: [ ] Not Started [ ] In Progress [ ] ✅ Complete

---

### 3. Add React Error Boundary ⏱️ 1 hour
**Priority**: CRITICAL - Prevents white screen crashes

**File**: `src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-screen bg-primary-900">
          <div className="text-center p-8 max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-white/60 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Integration** - Update `src/App.tsx`:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* Existing app content */}
    </ErrorBoundary>
  );
}
```

**Status**: [ ] Not Started [ ] In Progress [ ] ✅ Complete

---

### 4. Add ESLint Rules ⏱️ 30 minutes
**Priority**: CRITICAL - Prevent future issues

Update `eslint.config.js`:

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Prevent 'any' type
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Require explicit return types
      '@typescript-eslint/explicit-function-return-type': 'warn',
      
      // Prevent console usage (except error)
      'no-console': ['error', { allow: ['error'] }],
      
      // Prevent non-null assertions
      '@typescript-eslint/no-non-null-assertion': 'error',
      
      // Require proper error handling
      '@typescript-eslint/no-floating-promises': 'error',
      
      // Prevent unused variables
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
];
```

**Status**: [ ] Not Started [ ] In Progress [ ] ✅ Complete

---

## 📊 PROGRESS TRACKING

### Critical Issues Fixed
- [ ] Node.js version corrected to 20.x
- [ ] Logger service created and integrated
- [ ] Error Boundary added to app
- [ ] ESLint rules enforced

### Files Updated Count
- Console.log replacements: 0/54 files
- 'any' type fixes: 0/393 files
- Component prop types: 0/150+ files

### Test Coverage
- Current: Unknown%
- Target: 70%
- Added tests: 0

---

## 🔄 NEXT STEPS AFTER QUICK STARTS

### Week 1-2: Continue Critical Fixes
1. **Replace console.log systematically**
   ```bash
   # Find all console usage
   grep -r "console\." src/ electron/
   
   # Replace file by file
   # Test after each file
   ```

2. **Begin 'any' type elimination**
   - Start with most critical files (IPC handlers, repositories)
   - Work through one domain at a time (cases, evidence, timeline)
   - Run `pnpm type-check` frequently

3. **Add input validation middleware**
   - Audit all IPC handlers
   - Create validateIpcInput wrapper
   - Test with invalid inputs

### Week 3-4: Testing & Security
1. Add E2E tests for critical paths
2. Security audit of IPC channels
3. SQL injection verification
4. Rate limiting implementation

---

## 📝 NOTES & LESSONS LEARNED

### Common Patterns to Fix

**Pattern 1: Console Logging**
```typescript
// ❌ Before
console.log('User logged in:', userId);

// ✅ After
logger.info('User logged in', { userId });
```

**Pattern 2: Any Types**
```typescript
// ❌ Before
function handleData(data: any) {
  return data.value;
}

// ✅ After
interface DataInput {
  value: string;
}

function handleData(data: DataInput): string {
  return data.value;
}
```

**Pattern 3: Error Handling**
```typescript
// ❌ Before
try {
  const result = await operation();
} catch (err) {
  console.error(err);
}

// ✅ After
try {
  const result = await operation();
} catch (error) {
  logger.error('Operation failed', error as Error, { 
    operation: 'operationName' 
  });
  throw error; // Re-throw or handle appropriately
}
```

---

## 🎯 DAILY GOALS

### Monday: Setup
- [ ] Fix Node.js version
- [ ] Create Logger service
- [ ] Add Error Boundary

### Tuesday: Integration
- [ ] Replace console.log in electron/main.ts
- [ ] Replace console.log in all IPC handlers
- [ ] Test logger output

### Wednesday: Types Part 1
- [ ] Fix 'any' types in IPC handlers
- [ ] Fix 'any' types in repositories
- [ ] Run type-check

### Thursday: Types Part 2
- [ ] Fix 'any' types in services
- [ ] Fix 'any' types in components
- [ ] Run type-check

### Friday: Testing & Review
- [ ] Run all tests
- [ ] Fix any breaking changes
- [ ] Review progress
- [ ] Plan next week

---

## 📞 HELP & RESOURCES

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Type Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Avoid 'any' Guide](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### Common Questions
**Q: How do I type dynamic data?**  
A: Use `unknown` instead of `any`, then narrow with type guards:
```typescript
function handleData(data: unknown): void {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    const typed = data as { id: string };
    // Now safely use typed.id
  }
}
```

**Q: What about external library types?**  
A: Install @types packages or declare them:
```typescript
// global.d.ts
declare module 'some-library' {
  export function someFunction(arg: string): void;
}
```

---

*Last Updated: November 3, 2025*  
*Keep this checklist updated as you progress!*

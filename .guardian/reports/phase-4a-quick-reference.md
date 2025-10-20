# Phase 4A Quick Reference: TypeScript & React Best Practices

**Last Updated:** 2025-10-20
**For:** Justice Companion Developers
**Purpose:** Quick lookup for common patterns and fixes

---

## 🚨 Critical Issues to Fix First

### 1. TypeScript Compilation Failing ❌
```bash
# Check errors
pnpm type-check

# Fix file: src/performance/encryption-performance-analyzer.ts
# 26 syntax errors need immediate attention
```

### 2. Non-Null Assertions (79 occurrences) ⚠️
```typescript
// ❌ BAD - Can crash at runtime
messagesEndRef.current!.scrollIntoView();

// ✅ GOOD - Safe
messagesEndRef.current?.scrollIntoView();

// ✅ BETTER - Type guard
if (messagesEndRef.current) {
  messagesEndRef.current.scrollIntoView();
}
```

**Find them:**
```bash
grep -rn "!" src/ --include="*.ts" --include="*.tsx" | grep -v "!==" | grep -v "!loading"
```

---

## 🎯 React Performance Patterns

### Pattern 1: Add React.memo to Components
```typescript
// ❌ BEFORE - Re-renders on every parent update
export function ChatWindow({ caseId }: Props) {
  return <div>...</div>;
}

// ✅ AFTER - Only re-renders when props change
import { memo } from 'react';

export const ChatWindow = memo(function ChatWindow({ caseId }: Props) {
  return <div>...</div>;
});
```

**When to use:**
- Component renders often
- Component has expensive rendering
- Component receives same props frequently

**Don't use if:**
- Component always gets new props
- Component is very simple (< 10 lines)
- Parent rarely re-renders

### Pattern 2: Memoize Event Handlers
```typescript
// ❌ BEFORE - Creates new function on every render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ AFTER - Stable function reference
import { useCallback } from 'react';

const handleClick = useCallback((id: number) => {
  // Handle click
}, [/* dependencies */]);

<button onClick={() => handleClick(id)}>Click</button>

// ✅ EVEN BETTER - Pass callback directly
<button onClick={handleClick}>Click</button>
```

### Pattern 3: Memoize Expensive Computations
```typescript
// ❌ BEFORE - Recalculates on every render
const transformedCases = cases.map(transformCase);

// ✅ AFTER - Only recalculates when dependencies change
import { useMemo } from 'react';

const transformedCases = useMemo(
  () => cases.map(transformCase),
  [cases]
);
```

### Pattern 4: Virtualize Large Lists
```typescript
// ❌ BEFORE - Renders 1000+ items (slow)
{messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

// ✅ AFTER - Only renders visible items (fast)
import { FixedSizeList as List } from 'react-window';
import { memo, useCallback } from 'react';

const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
  <div style={style}>
    <MessageBubble message={messages[index]} />
  </div>
));

<List
  height={600}
  itemCount={messages.length}
  itemSize={100}
  width="100%"
>
  {Row}
</List>
```

**Install:**
```bash
pnpm add react-window
pnpm add -D @types/react-window
```

---

## 📝 TypeScript Best Practices

### Type-Only Imports (Bundle Size Optimization)
```typescript
// ❌ BAD - May bundle unused code
import { User, login } from './auth';

// ✅ GOOD - Types stripped at compile time
import type { User } from './auth';
import { login } from './auth';
```

### Discriminated Unions (Type-Safe Errors)
```typescript
// ✅ EXCELLENT - Type-safe error handling
interface Success<T> {
  success: true;
  data: T;
}

interface Failure {
  success: false;
  error: string;
}

type Result<T> = Success<T> | Failure;

// Usage
const result: Result<User> = await loginUser();
if (!result.success) {
  console.error(result.error); // TypeScript knows it's Failure
} else {
  console.log(result.data); // TypeScript knows it's Success<User>
}
```

### Utility Types
```typescript
// Pick - Select specific properties
type UserCredentials = Pick<User, 'email' | 'password'>;

// Omit - Exclude specific properties
type CreateUserInput = Omit<User, 'id' | 'createdAt'>;

// Partial - Make all properties optional
type UpdateUserInput = Partial<User>;

// Required - Make all properties required
type CompleteUser = Required<User>;

// Record - Create object type with specific key/value types
type CaseStatusCount = Record<CaseStatus, number>;
```

### Optional Chaining & Nullish Coalescing
```typescript
// ✅ Optional chaining (?.)
const userName = user?.profile?.name; // undefined if any is null/undefined

// ✅ Nullish coalescing (??)
const displayName = userName ?? 'Anonymous'; // Only uses default if null/undefined

// ❌ DON'T use || for defaults (falsy values treated as missing)
const count = userInput || 0; // BAD: 0 input becomes 0
const count = userInput ?? 0; // GOOD: Only null/undefined becomes 0
```

---

## 🎨 Component Patterns

### Pattern: Prop Types
```typescript
// ✅ GOOD - Interface for props
interface ChatWindowProps {
  caseId?: number | null;
  onSend?: (message: string) => void;
  isLoading?: boolean;
}

// ✅ GOOD - Type for simple props
type ButtonVariant = 'primary' | 'secondary' | 'danger';

// ✅ GOOD - Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>;
}
```

### Pattern: Context with TypeScript
```typescript
// Create context with undefined as default (safer)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook with type guard
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Pattern: Ref Typing
```typescript
// ✅ GOOD - DOM ref
const inputRef = useRef<HTMLInputElement>(null);

// ✅ GOOD - Mutable value ref
const renderCount = useRef<number>(0);

// Usage
inputRef.current?.focus(); // Optional chaining for safety
```

---

## 🔧 Quick Fixes

### Fix 1: Missing Return Type
```typescript
// ❌ BEFORE
const fetchUser = async (id: number) => {
  return await api.getUser(id);
};

// ✅ AFTER
const fetchUser = async (id: number): Promise<User> => {
  return await api.getUser(id);
};
```

### Fix 2: Inline Object Props
```typescript
// ❌ BEFORE - Creates new object on every render
<Component style={{ margin: 10 }} />

// ✅ AFTER - Stable reference
const componentStyle = { margin: 10 };
<Component style={componentStyle} />

// ✅ OR - Use useMemo for dynamic values
const componentStyle = useMemo(() => ({
  margin: isExpanded ? 20 : 10
}), [isExpanded]);
<Component style={componentStyle} />
```

### Fix 3: Key Prop with Index
```typescript
// ❌ BAD - Using array index as key
{items.map((item, index) => (
  <Item key={index} data={item} />
))}

// ✅ GOOD - Using unique ID
{items.map((item) => (
  <Item key={item.id} data={item} />
))}

// ✅ GOOD - Generate stable key if no ID
{items.map((item) => (
  <Item key={`${item.type}-${item.name}`} data={item} />
))}
```

---

## 🛠️ Tools & Commands

### Type Checking
```bash
# Check all types
pnpm type-check

# Watch mode (during development)
pnpm type-check --watch
```

### Linting
```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Performance Analysis
```bash
# Analyze React components
pnpm analyze:components

# Run benchmarks
pnpm benchmark:pagination
```

### Find Problems
```bash
# Find all non-null assertions
grep -rn "!" src/ --include="*.ts" --include="*.tsx" | grep -v "!==" | grep -v "!loading"

# Find components without memo
grep -r "export function" src/features src/components --include="*.tsx" | grep -v "memo"

# Find expensive operations without useMemo
grep -r "\.map\|\.filter\|\.reduce" src/ --include="*.tsx" | grep -v "useMemo"
```

---

## 📊 Performance Checklist

### Before Committing a Component
- [ ] Added React.memo if component re-renders frequently
- [ ] Used useCallback for event handlers passed to children
- [ ] Used useMemo for expensive computations
- [ ] Used virtualization for lists > 50 items
- [ ] Avoided inline object/array props
- [ ] Used stable keys (not array indexes)
- [ ] Added proper TypeScript types
- [ ] No non-null assertions (use optional chaining)
- [ ] Ran `pnpm type-check` successfully
- [ ] Ran `pnpm lint:fix` to clean up

### Code Review Checklist
- [ ] All exports have explicit return types
- [ ] No `any` types in production code
- [ ] Using type-only imports where possible
- [ ] Proper error boundaries
- [ ] Performance optimizations for expensive operations
- [ ] Virtualization for large lists
- [ ] Accessible (proper ARIA labels)

---

## 🎯 Component Optimization Priority

### High Priority (Fix First)
1. **ChatWindow** - High re-render frequency
2. **CasesView** - Expensive tree rendering
3. **MessageList** - Large list (needs virtualization)
4. **DashboardView** - Multiple child updates
5. **NotesPanel** - List rendering (needs virtualization)

### Medium Priority
6. **CaseFactsPanel** - Data-heavy
7. **UserFactsPanel** - Data-heavy
8. **DocumentsView** - File list (needs virtualization)
9. **SettingsView** - Form components
10. **Sidebar** - Frequent updates

### Low Priority
- UI components (buttons, inputs, etc.)
- Static components (headers, footers)
- Components that rarely render

---

## 📚 Common Patterns Reference

### Pattern: Async State Management
```typescript
const [data, setData] = useState<User | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getUser(userId);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  void fetchData();
}, [userId]);
```

### Pattern: Debounced Input
```typescript
import { useState, useEffect, useCallback } from 'react';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 300);

  return () => clearTimeout(timer);
}, [searchQuery]);

const handleSearch = useCallback((query: string) => {
  setSearchQuery(query);
}, []);
```

### Pattern: Form Handling
```typescript
interface FormData {
  email: string;
  password: string;
}

const [formData, setFormData] = useState<FormData>({
  email: '',
  password: '',
});

const handleChange = useCallback((field: keyof FormData) => (
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  }
), []);

<input
  type="email"
  value={formData.email}
  onChange={handleChange('email')}
/>
```

---

## 🔗 Quick Links

- [Full Phase 4A Report](./.guardian/reports/phase-4a-typescript-react-best-practices.md)
- [Executive Summary](./.guardian/reports/phase-4a-executive-summary.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [react-window](https://github.com/bvaughn/react-window)

---

**Print this page and keep it handy during development!**

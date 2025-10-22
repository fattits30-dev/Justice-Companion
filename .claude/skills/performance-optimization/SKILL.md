---
name: performance-optimization
description: "Comprehensive performance analysis and optimization for Justice Companion: React rendering, SQLite query performance, bundle size analysis, memory leak detection. Use when debugging slow UI, optimizing database queries, or reducing app footprint."
allowed-tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob", "mcp__sqlite__*"]
---

# Performance Optimization Skill

## Purpose
Identify and fix performance bottlenecks across React UI, SQLite database, and Electron build.

## When Claude Uses This
- UI feels sluggish or unresponsive
- Database queries taking >100ms
- Bundle size exceeds 10MB
- Memory usage growing over time
- User reports "app is slow"

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Initial Load | < 2s | < 3s |
| Route Change | < 100ms | < 300ms |
| DB Query (simple) | < 10ms | < 50ms |
| DB Query (complex) | < 50ms | < 200ms |
| Bundle Size (gzip) | < 5MB | < 10MB |
| Memory Usage | < 200MB | < 500MB |
| React Render | < 16ms (60fps) | < 33ms (30fps) |

## Optimization Areas

### 1. React Rendering Performance

#### Profiling
```bash
# Run React DevTools Profiler
pnpm dev
# Open http://localhost:5176
# React DevTools → Profiler → Record
```

#### Common Issues & Fixes

**Issue: Unnecessary Re-renders**
```typescript
// ❌ BAD: Creates new object every render
<Component data={{ id: 1, name: 'Test' }} />

// ✅ GOOD: Memoize objects
const data = useMemo(() => ({ id: 1, name: 'Test' }), []);
<Component data={data} />
```

**Issue: Large Lists Without Virtualization**
```typescript
// ❌ BAD: Renders all 10,000 items
{cases.map(case => <CaseCard key={case.id} {...case} />)}

// ✅ GOOD: Use react-window or @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';
```

**Issue: Context Updates Trigger All Consumers**
```typescript
// ❌ BAD: Single large context
<AppContext.Provider value={{ user, cases, settings }} />

// ✅ GOOD: Split contexts
<UserContext.Provider value={user}>
  <CasesContext.Provider value={cases}>
    <SettingsContext.Provider value={settings}>
```

#### Optimization Checklist
- [ ] Wrap expensive components in `React.memo()`
- [ ] Use `useMemo()` for expensive calculations
- [ ] Use `useCallback()` for event handlers passed to children
- [ ] Implement virtualization for lists >100 items
- [ ] Split large contexts into smaller ones
- [ ] Use `React.lazy()` for code splitting
- [ ] Profile with React DevTools before/after

### 2. SQLite Query Performance

#### Profiling
```bash
# Enable query logging
node -e "
const db = require('better-sqlite3')('justice.db');
db.pragma('journal_mode = WAL');
console.time('Query');
const result = db.prepare('SELECT * FROM cases').all();
console.timeEnd('Query');
"
```

#### Optimization Techniques

**Add Missing Indexes**
```sql
-- Check query plan
EXPLAIN QUERY PLAN
SELECT * FROM cases WHERE user_id = ? AND status = 'open';

-- Add composite index if missing
CREATE INDEX IF NOT EXISTS idx_cases_user_status
ON cases(user_id, status);
```

**Use Prepared Statements (Already Cached)**
```typescript
// ✅ Drizzle ORM does this automatically
const cases = await db.select().from(cases).where(eq(cases.userId, userId));
```

**Enable WAL Mode (Write-Ahead Logging)**
```typescript
// In src/db/database.ts
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache
```

**Batch Inserts**
```typescript
// ❌ BAD: Individual inserts
for (const item of items) {
  await db.insert(table).values(item);
}

// ✅ GOOD: Single batch insert
await db.insert(table).values(items);
```

#### Index Recommendations
```sql
-- Cases table
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- Evidence table
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);

-- Audit logs
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action);
```

### 3. Bundle Size Optimization

#### Analysis
```bash
# Build and analyze
pnpm build
pnpm exec vite-bundle-visualizer

# Check gzipped sizes
du -sh dist/**/*.js | sort -h
```

#### Optimization Checklist
- [ ] Enable tree-shaking (Vite does this)
- [ ] Use dynamic imports for heavy dependencies
- [ ] Replace heavy libraries:
  - `moment` → `date-fns` (saves ~70KB)
  - `lodash` → `lodash-es` (tree-shakeable)
- [ ] Remove unused dependencies
- [ ] Configure `build.rollupOptions` in vite.config.ts

**Example: Dynamic Imports**
```typescript
// ❌ BAD: Import heavy library upfront
import html2pdf from 'html2pdf.js';

// ✅ GOOD: Dynamic import on demand
const exportPDF = async () => {
  const html2pdf = await import('html2pdf.js');
  // Use html2pdf
};
```

### 4. Memory Leak Detection

#### Tools
```bash
# Chrome DevTools Memory Profiler
# Electron → Developer Tools → Memory → Take Heap Snapshot

# Or use process.memoryUsage()
node -e "console.log(process.memoryUsage())"
```

#### Common Leaks

**Event Listeners Not Cleaned Up**
```typescript
// ❌ BAD: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ GOOD: Cleanup in effect return
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Database Connections Not Closed**
```typescript
// ✅ Better-sqlite3 uses single persistent connection
// But close on app exit:
app.on('before-quit', () => {
  db.close();
});
```

**React Query Cache Growing Indefinitely**
```typescript
// Set cache time in QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});
```

## Performance Benchmarks

### Run Benchmarks
```bash
# React component rendering
pnpm benchmark:pagination

# Database queries
tsx src/benchmarks/db-benchmark.ts

# Bundle analysis
pnpm build && ls -lh dist/**/*.js
```

### Benchmark Script Template
```typescript
// src/benchmarks/example-benchmark.ts
import { performance } from 'perf_hooks';

const iterations = 1000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  // Operation to benchmark
}

const end = performance.now();
console.log(`Avg: ${(end - start) / iterations}ms`);
```

## Monitoring & Alerts

### Add Performance Monitoring
```typescript
// src/utils/performance.ts
export const trackMetric = (name: string, value: number) => {
  if (value > THRESHOLDS[name]) {
    console.warn(`⚠️ Performance: ${name} = ${value}ms (threshold: ${THRESHOLDS[name]}ms)`);
  }
};

// Usage
const start = performance.now();
const result = await expensiveOperation();
trackMetric('expensiveOperation', performance.now() - start);
```

## Tools & Commands

```bash
# Profile React components
pnpm dev
# Then use React DevTools Profiler

# Analyze SQLite queries
sqlite3 justice.db "EXPLAIN QUERY PLAN SELECT * FROM cases;"

# Bundle size analysis
pnpm build
pnpm exec vite-bundle-visualizer

# Memory profiling
node --inspect electron/main.ts
# Open chrome://inspect

# Check all indexes
sqlite3 justice.db "SELECT * FROM sqlite_master WHERE type='index';"
```

## References
- React DevTools Profiler: https://react.dev/learn/react-developer-tools
- SQLite EXPLAIN: https://www.sqlite.org/eqp.html
- Vite Performance: https://vitejs.dev/guide/performance.html
- React Query Performance: https://tanstack.com/query/latest/docs/guides/performance

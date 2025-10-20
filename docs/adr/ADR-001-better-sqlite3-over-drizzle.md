# ADR-001: Use Better-SQLite3 Over Drizzle ORM

## Status
Accepted

## Date
2024-01-15

## Context
The Justice Companion application runs as an Electron desktop application with a local SQLite database. The main architectural constraint is that Electron's main process (where database operations must occur for security) runs in a Node.js environment that benefits from synchronous operations.

Key requirements:
- Database operations must run in Electron's main process (not renderer)
- IPC communication between renderer and main process
- Need for synchronous operations to simplify IPC handling
- Performance critical for responsive UI
- Native SQLite features required (FTS5, JSON1 extensions)

## Decision
We will use Better-SQLite3 as our database driver instead of Drizzle ORM or other async ORMs.

## Consequences

### Positive
- **Synchronous operations**: Simplifies IPC communication (no promise chains in main process)
- **Performance**: 3x faster than node-sqlite3 for typical operations
- **Native features**: Direct access to SQLite extensions (FTS5 for search, JSON1 for structured data)
- **Simplicity**: No ORM abstraction layer, direct SQL with type safety via TypeScript
- **Reliability**: Well-maintained, production-tested library
- **Bundle size**: Smaller than full ORM solutions

### Negative
- **Platform builds**: Requires native module compilation for each platform (Windows, macOS, Linux)
- **CI/CD complexity**: Must rebuild for Node.js (tests) vs Electron (runtime) contexts
- **No ORM features**: Manual SQL writing, no automatic migrations, no query builder
- **Learning curve**: Developers must know SQL rather than ORM syntax
- **Type safety**: Must maintain TypeScript interfaces manually

## Alternatives Considered

### Drizzle ORM
- **Pros**: Type-safe queries, automatic migrations, better DX
- **Cons**: Async-only, adds abstraction overhead, larger bundle
- **Rejected because**: Async operations complicate Electron main process

### TypeORM
- **Pros**: Full-featured ORM, active record pattern
- **Cons**: Heavy (5MB+), async-only, performance overhead
- **Rejected because**: Too heavy for desktop app, async complications

### Prisma
- **Pros**: Excellent type safety, great DX
- **Cons**: Requires separate CLI, async-only, generates large client
- **Rejected because**: Build complexity, async operations

### node-sqlite3
- **Pros**: Official SQLite binding
- **Cons**: Async-only, 3x slower than better-sqlite3
- **Rejected because**: Performance and async complications

## Implementation Notes
- Use prepared statements for all queries (performance + security)
- Implement repository pattern for data access abstraction
- Create TypeScript interfaces matching database schemas
- Use transactions for multi-step operations
- Implement connection pooling for concurrent operations

## References
- [Better-SQLite3 Benchmarks](https://github.com/WiseLibs/better-sqlite3#benchmarks)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [SQLite Synchronous vs Asynchronous](https://www.sqlite.org/asyncvfs.html)
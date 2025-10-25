/**
 * Infrastructure Interface Definitions for Dependency Injection
 *
 * This file contains TypeScript interfaces for infrastructure components
 * like database connections, external dependencies, and system resources.
 *
 * Infrastructure Layer Responsibilities:
 * - Database connections and management
 * - External API clients
 * - File system operations
 * - OS-level integrations (Electron APIs)
 * - Third-party library abstractions
 *
 * Usage:
 * ```typescript
 * class MyRepository {
 *   constructor(private db: IDatabase) {}
 *
 *   findAll() {
 *     return this.db.prepare('SELECT * FROM table').all();
 *   }
 * }
 * ```
 */

import type Database from 'better-sqlite3';

// =============================================================================
// DATABASE INTERFACES
// =============================================================================

/**
 * Interface for Better-SQLite3 Database
 * Provides synchronous SQLite operations (required for Electron main process)
 *
 * Key Features:
 * - Synchronous API (no callbacks/promises)
 * - Prepared statements for SQL injection prevention
 * - Transaction support with ACID guarantees
 * - Foreign key enforcement
 * - Full-text search (FTS5)
 *
 * Security:
 * - All queries use prepared statements with parameterized inputs
 * - Foreign key constraints enabled by default
 * - No dynamic SQL construction (prevents SQL injection)
 */
export interface IDatabase {
  /**
   * Prepare a SQL statement for execution
   * @param sql - SQL query with parameterized placeholders (@param or ?)
   * @returns Prepared statement
   *
   * @example
   * ```typescript
   * const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
   * const user = stmt.get(userId);
   * ```
   */
  prepare(sql: string): Database.Statement;

  /**
   * Execute SQL directly (for DDL operations like CREATE TABLE)
   * @param sql - SQL query
   * @returns Database instance for chaining
   *
   * @example
   * ```typescript
   * db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
   * ```
   */
  exec(sql: string): this;

  /**
   * Set a SQLite pragma
   * @param pragma - Pragma name and value
   * @returns Pragma value
   *
   * @example
   * ```typescript
   * db.pragma('foreign_keys = ON');
   * db.pragma('journal_mode = WAL');
   * ```
   */
  pragma(pragma: string): unknown;

  /**
   * Begin a transaction
   * @param fn - Transaction function
   * @returns Transaction object
   *
   * @example
   * ```typescript
   * const insertMany = db.transaction((users) => {
   *   const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
   *   for (const user of users) stmt.run(user.name);
   * });
   * insertMany([{name: 'Alice'}, {name: 'Bob'}]);
   * ```
   */
  transaction<T extends (...args: any[]) => any>(fn: T): T;

  /**
   * Close database connection
   * WARNING: Do not call this in repositories - let DatabaseManager handle lifecycle
   */
  close(): void;

  /**
   * Check if database is open
   * @returns true if open, false if closed
   */
  readonly open: boolean;

  /**
   * Check if database is in-memory (for tests)
   * @returns true if in-memory, false if file-based
   */
  readonly inTransaction: boolean;

  /**
   * Get database file path
   * @returns File path or ':memory:' for in-memory databases
   */
  readonly name: string;

  /**
   * Get database connection status
   * @returns true if database is ready, false otherwise
   */
  readonly readonly: boolean;
}

/**
 * Interface for Database Statement
 * Represents a prepared SQL statement for execution
 */
export interface IStatement {
  /**
   * Execute statement and return all matching rows
   * @param params - Parameterized values
   * @returns Array of rows
   */
  all(...params: unknown[]): unknown[];

  /**
   * Execute statement and return first matching row
   * @param params - Parameterized values
   * @returns First row or undefined
   */
  get(...params: unknown[]): unknown | undefined;

  /**
   * Execute statement (INSERT, UPDATE, DELETE)
   * @param params - Parameterized values
   * @returns Result with changes and lastInsertRowid
   */
  run(...params: unknown[]): Database.RunResult;

  /**
   * Iterate over result rows (memory efficient)
   * @param params - Parameterized values
   * @returns Iterable of rows
   */
  iterate(...params: unknown[]): IterableIterator<unknown>;

  /**
   * Bind parameters to statement
   * @param params - Parameterized values
   * @returns Statement for chaining
   */
  bind(...params: unknown[]): this;
}

/**
 * Interface for Database Manager
 * Singleton that manages database lifecycle and migrations
 */
export interface IDatabaseManager {
  /**
   * Get database instance (creates if not exists)
   * @returns Database connection
   */
  getDatabase(): IDatabase;

  /**
   * Close database connection
   */
  closeDatabase(): void;

  /**
   * Check if database is initialized
   * @returns true if database is open, false otherwise
   */
  isInitialized(): boolean;

  /**
   * Run database migrations
   * @returns Number of migrations applied
   */
  runMigrations(): Promise<number>;

  /**
   * Rollback last migration
   * @returns true if rolled back, false if no migrations to rollback
   */
  rollbackMigration(): Promise<boolean>;

  /**
   * Create database backup
   * @param backupPath - Optional custom backup path
   * @returns Backup file path
   */
  createBackup(backupPath?: string): Promise<string>;

  /**
   * Restore database from backup
   * @param backupPath - Backup file path
   */
  restoreBackup(backupPath: string): Promise<void>;
}

// =============================================================================
// ELECTRON INTERFACES
// =============================================================================

/**
 * Interface for Electron App
 * Abstracts Electron's app module for dependency injection
 */
export interface IElectronApp {
  /**
   * Get path to application directory
   * @param name - Path name ('userData', 'appData', 'temp', etc.)
   * @returns Absolute path
   */
  getPath(name: string): string;

  /**
   * Get application version
   * @returns Version string (e.g., '1.0.0')
   */
  getVersion(): string;

  /**
   * Quit application
   */
  quit(): void;

  /**
   * Check if application is ready
   * @returns true if ready, false otherwise
   */
  isReady(): boolean;

  /**
   * Wait for application to be ready
   * @returns Promise that resolves when app is ready
   */
  whenReady(): Promise<void>;
}

/**
 * Interface for Electron SafeStorage
 * Provides OS-level encryption for sensitive data
 *
 * Platform Support:
 * - Windows: DPAPI (Data Protection API)
 * - macOS: Keychain
 * - Linux: Secret Service API (libsecret)
 */
export interface IElectronSafeStorage {
  /**
   * Check if encryption is available
   * @returns true if OS supports encryption, false otherwise
   */
  isEncryptionAvailable(): boolean;

  /**
   * Encrypt plaintext using OS-level encryption
   * @param plaintext - String to encrypt
   * @returns Encrypted buffer
   */
  encryptString(plaintext: string): Buffer;

  /**
   * Decrypt buffer using OS-level encryption
   * @param encrypted - Encrypted buffer
   * @returns Decrypted plaintext string
   */
  decryptString(encrypted: Buffer): string;
}

/**
 * Interface for Electron IPC (Main Process)
 * Handles inter-process communication from main to renderer
 */
export interface IElectronIpcMain {
  /**
   * Listen for IPC event
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;

  /**
   * Listen for IPC event once
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  once(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;

  /**
   * Remove IPC event listener
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;

  /**
   * Handle IPC invoke (async request-response)
   * @param channel - IPC channel name
   * @param listener - Async event handler
   */
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => Promise<unknown>): void;

  /**
   * Remove IPC invoke handler
   * @param channel - IPC channel name
   */
  removeHandler(channel: string): void;
}

/**
 * Interface for Electron IPC (Renderer Process)
 * Handles inter-process communication from renderer to main
 */
export interface IElectronIpcRenderer {
  /**
   * Send IPC message to main process
   * @param channel - IPC channel name
   * @param args - Message arguments
   */
  send(channel: string, ...args: unknown[]): void;

  /**
   * Invoke IPC handler in main process (async request-response)
   * @param channel - IPC channel name
   * @param args - Request arguments
   * @returns Promise with response from main process
   */
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;

  /**
   * Listen for IPC event from main process
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;

  /**
   * Listen for IPC event once
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  once(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;

  /**
   * Remove IPC event listener
   * @param channel - IPC channel name
   * @param listener - Event handler
   */
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

// =============================================================================
// EXTERNAL API CLIENTS
// =============================================================================

/**
 * Interface for HTTP Client
 * Abstracts HTTP request library (axios, fetch, etc.)
 */
export interface IHttpClient {
  /**
   * Send GET request
   * @param url - Request URL
   * @param config - Optional request configuration
   * @returns Response data
   */
  get<T = unknown>(url: string, config?: unknown): Promise<T>;

  /**
   * Send POST request
   * @param url - Request URL
   * @param data - Request body
   * @param config - Optional request configuration
   * @returns Response data
   */
  post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;

  /**
   * Send PUT request
   * @param url - Request URL
   * @param data - Request body
   * @param config - Optional request configuration
   * @returns Response data
   */
  put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;

  /**
   * Send DELETE request
   * @param url - Request URL
   * @param config - Optional request configuration
   * @returns Response data
   */
  delete<T = unknown>(url: string, config?: unknown): Promise<T>;
}

/**
 * Interface for OpenAI Client
 * Abstracts OpenAI API for AI-powered features
 */
export interface IOpenAIClient {
  /**
   * Create chat completion
   * @param request - Chat completion request
   * @returns Chat completion response
   */
  createChatCompletion(request: unknown): Promise<unknown>;

  /**
   * Create chat completion stream
   * @param request - Chat completion request
   * @returns Async iterable of chat completion chunks
   */
  createChatCompletionStream(request: unknown): AsyncIterable<unknown>;

  /**
   * Create embedding
   * @param request - Embedding request
   * @returns Embedding response
   */
  createEmbedding(request: unknown): Promise<unknown>;
}

// =============================================================================
// FILE SYSTEM INTERFACES
// =============================================================================

/**
 * Interface for File System Operations
 * Abstracts Node.js fs module for dependency injection
 */
export interface IFileSystem {
  /**
   * Read file contents
   * @param path - File path
   * @param encoding - Optional encoding (default: 'utf8')
   * @returns File contents
   */
  readFile(path: string, encoding?: string): Promise<string>;

  /**
   * Write file contents
   * @param path - File path
   * @param data - File contents
   * @param encoding - Optional encoding (default: 'utf8')
   */
  writeFile(path: string, data: string, encoding?: string): Promise<void>;

  /**
   * Check if file/directory exists
   * @param path - Path to check
   * @returns true if exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Create directory (recursively)
   * @param path - Directory path
   */
  mkdir(path: string): Promise<void>;

  /**
   * Delete file
   * @param path - File path
   */
  unlink(path: string): Promise<void>;

  /**
   * Read directory contents
   * @param path - Directory path
   * @returns Array of file/directory names
   */
  readdir(path: string): Promise<string[]>;

  /**
   * Get file/directory stats
   * @param path - Path to check
   * @returns File stats
   */
  stat(path: string): Promise<unknown>;
}

// =============================================================================
// LOGGING INTERFACES
// =============================================================================

/**
 * Interface for Application Logger
 * Abstracts logging library for dependency injection
 */
export interface ILogger {
  /**
   * Log info message
   * @param context - Log context (module/service name)
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  info(context: string, message: string, metadata?: unknown): void;

  /**
   * Log warning message
   * @param context - Log context (module/service name)
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  warn(context: string, message: string, metadata?: unknown): void;

  /**
   * Log error message
   * @param context - Log context (module/service name)
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  error(context: string, message: string, metadata?: unknown): void;

  /**
   * Log debug message (only in development)
   * @param context - Log context (module/service name)
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  debug(context: string, message: string, metadata?: unknown): void;
}

/**
 * Interface for Error Logger
 * Specialized logger for error tracking and reporting
 */
export interface IErrorLogger {
  /**
   * Log error with stack trace
   * @param error - Error object
   * @param context - Optional context metadata
   */
  logError(error: Error, context?: { context?: string; [key: string]: unknown }): void;

  /**
   * Get all logged errors
   * @returns Array of logged errors
   */
  getErrors(): unknown[];

  /**
   * Clear logged errors
   */
  clearErrors(): void;
}

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

/**
 * Interface for Environment Variables
 * Provides type-safe access to environment variables
 */
export interface IEnvironment {
  /**
   * Get environment variable
   * @param key - Environment variable name
   * @returns Variable value or undefined
   */
  get(key: string): string | undefined;

  /**
   * Get environment variable with default
   * @param key - Environment variable name
   * @param defaultValue - Default value if not found
   * @returns Variable value or default
   */
  getOrDefault(key: string, defaultValue: string): string;

  /**
   * Check if running in development mode
   * @returns true if NODE_ENV === 'development'
   */
  isDevelopment(): boolean;

  /**
   * Check if running in production mode
   * @returns true if NODE_ENV === 'production'
   */
  isProduction(): boolean;

  /**
   * Check if running in test mode
   * @returns true if NODE_ENV === 'test'
   */
  isTest(): boolean;
}

/**
 * Interface for Application Configuration
 * Manages application settings and feature flags
 */
export interface IConfiguration {
  /**
   * Get configuration value
   * @param key - Configuration key (dot-separated path, e.g., 'database.path')
   * @returns Configuration value
   */
  get<T = unknown>(key: string): T;

  /**
   * Set configuration value
   * @param key - Configuration key
   * @param value - Configuration value
   */
  set(key: string, value: unknown): void;

  /**
   * Check if configuration key exists
   * @param key - Configuration key
   * @returns true if exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Load configuration from file
   * @param path - Configuration file path
   */
  load(path: string): Promise<void>;

  /**
   * Save configuration to file
   * @param path - Configuration file path
   */
  save(path: string): Promise<void>;
}

// =============================================================================
// ALL INTERFACES EXPORTED INLINE ABOVE
// =============================================================================
// All interfaces are already exported using 'export interface' declarations.
// No need for an additional export block.

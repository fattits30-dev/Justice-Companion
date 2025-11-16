/**
 * Type Guards and Utilities for Dependency Injection
 *
 * This file contains TypeScript type guards, validators, and utility functions
 * for runtime type checking and validation in the DI system.
 *
 * Key Features:
 * - Runtime type validation
 * - Interface compliance checking
 * - Dependency validation
 * - Error messages with detailed diagnostics
 *
 * Usage:
 * ```typescript
 * if (isRepository(obj)) {
 *   // TypeScript knows obj implements IRepository
 *   const data = obj.findById(1);
 * }
 * ```
 */

import type {
  ICaseRepository,
  IEvidenceRepository,
  IUserRepository,
  ISessionRepository,
} from "./repository-interfaces.ts";
import type {
  IAuthenticationService,
  IEncryptionService,
  IAuditLogger,
} from "./service-interfaces.ts";
import type { IDatabase } from "../../../interfaces/IDatabase.ts";

// =============================================================================
// BASE TYPE GUARDS
// =============================================================================

/**
 * Check if object has required methods (generic type guard)
 * @param obj - Object to check
 * @param methods - Array of required method names
 * @returns true if object has all methods, false otherwise
 */
export function hasMethods(obj: unknown, methods: string[]): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const target = obj as Record<string, unknown>;

  return methods.every((method) => typeof target[method] === "function");
}

/**
 * Check if object has required properties (generic type guard)
 * @param obj - Object to check
 * @param properties - Array of required property names
 * @returns true if object has all properties, false otherwise
 */
export function hasProperties(obj: unknown, properties: string[]): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const target = obj as Record<string, unknown>;

  return properties.every((prop) => prop in target);
}

// =============================================================================
// REPOSITORY TYPE GUARDS
// =============================================================================

/**
 * Base repository interface checker
 * All repositories must implement these core methods
 */
const BASE_REPOSITORY_METHODS = [
  "create",
  "findById",
  "findAll",
  "update",
  "delete",
];

/**
 * Check if object implements basic repository interface
 * @param obj - Object to check
 * @returns true if object has repository methods
 */
export function isRepository(obj: unknown): obj is {
  create: (input: unknown) => unknown;
  findById: (id: number) => unknown | null;
  findAll: (...args: unknown[]) => unknown[];
  update: (id: number, input: unknown) => unknown | null;
  delete: (id: number) => boolean;
} {
  return hasMethods(obj, BASE_REPOSITORY_METHODS);
}

/**
 * Check if object implements ICaseRepository
 * @param obj - Object to check
 * @returns true if object implements ICaseRepository
 */
export function isCaseRepository(obj: unknown): obj is ICaseRepository {
  if (!isRepository(obj)) {
    return false;
  }

  // Check case-specific methods
  const caseSpecificMethods = [
    "findByUserId",
    "close",
    "countByStatus",
    "getStatistics",
  ];

  return hasMethods(obj, caseSpecificMethods);
}

/**
 * Check if object implements IEvidenceRepository
 * @param obj - Object to check
 * @returns true if object implements IEvidenceRepository
 */
export function isEvidenceRepository(obj: unknown): obj is IEvidenceRepository {
  if (!isRepository(obj)) {
    return false;
  }

  // Check evidence-specific methods
  const evidenceSpecificMethods = [
    "findByCaseId",
    "findByCaseIdPaginated",
    "countByCase",
    "countByType",
  ];

  return hasMethods(obj, evidenceSpecificMethods);
}

/**
 * Check if object implements IUserRepository
 * @param obj - Object to check
 * @returns true if object implements IUserRepository
 */
export function isUserRepository(obj: unknown): obj is IUserRepository {
  if (!isRepository(obj)) {
    return false;
  }

  // Check user-specific methods
  const userSpecificMethods = [
    "findByUsername",
    "findByEmail",
    "updatePassword",
    "updateLastLogin",
  ];

  return hasMethods(obj, userSpecificMethods);
}

/**
 * Check if object implements ISessionRepository
 * @param obj - Object to check
 * @returns true if object implements ISessionRepository
 */
export function isSessionRepository(obj: unknown): obj is ISessionRepository {
  // Sessions use string IDs instead of number IDs
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const sessionMethods = [
    "create",
    "findById",
    "findByUserId",
    "delete",
    "deleteByUserId",
    "deleteExpired",
    "isExpired",
  ];

  return hasMethods(obj, sessionMethods);
}

// =============================================================================
// SERVICE TYPE GUARDS
// =============================================================================

/**
 * Check if object implements IAuthenticationService
 * @param obj - Object to check
 * @returns true if object implements IAuthenticationService
 */
export function isAuthenticationService(
  obj: unknown,
): obj is IAuthenticationService {
  const authMethods = [
    "register",
    "login",
    "logout",
    "validateSession",
    "changePassword",
    "restorePersistedSession",
  ];

  return hasMethods(obj, authMethods);
}

/**
 * Check if object implements IEncryptionService
 * @param obj - Object to check
 * @returns true if object implements IEncryptionService
 */
export function isEncryptionService(obj: unknown): obj is IEncryptionService {
  const encryptionMethods = [
    "encrypt",
    "decrypt",
    "isEncrypted",
    "batchEncrypt",
    "batchDecrypt",
  ];

  return hasMethods(obj, encryptionMethods);
}

/**
 * Check if object implements IAuditLogger
 * @param obj - Object to check
 * @returns true if object implements IAuditLogger
 */
export function isAuditLogger(obj: unknown): obj is IAuditLogger {
  const auditMethods = ["log", "query", "verifyIntegrity", "exportLogs"];

  return hasMethods(obj, auditMethods);
}

// =============================================================================
// INFRASTRUCTURE TYPE GUARDS
// =============================================================================

/**
 * Check if object implements IDatabase (Better-SQLite3)
 * @param obj - Object to check
 * @returns true if object implements IDatabase
 */
export function isDatabase(obj: unknown): obj is IDatabase {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const dbMethods = ["prepare", "exec", "pragma", "transaction", "close"];
  const dbProperties = ["open", "inTransaction", "name"];

  return hasMethods(obj, dbMethods) && hasProperties(obj, dbProperties);
}

/**
 * Check if object implements DatabaseManager (basic interface)
 * Note: This is a basic check without a specific interface type
 * @param obj - Object to check
 * @returns true if object has database manager methods
 */
export function isDatabaseManager(obj: unknown): boolean {
  const managerMethods = [
    "getDatabase",
    "closeDatabase",
    "isInitialized",
    "runMigrations",
    "rollbackMigration",
    "createBackup",
    "restoreBackup",
  ];

  return hasMethods(obj, managerMethods);
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate repository dependencies
 * @param deps - Dependencies object
 * @throws Error if dependencies are invalid
 */
export function validateRepositoryDependencies(deps: {
  db?: unknown;
  encryptionService?: unknown;
  auditLogger?: unknown;
}): void {
  if (deps.db && !isDatabase(deps.db)) {
    throw new Error("Invalid database dependency: must implement IDatabase");
  }

  if (deps.encryptionService && !isEncryptionService(deps.encryptionService)) {
    throw new Error(
      "Invalid encryption service dependency: must implement IEncryptionService",
    );
  }

  if (deps.auditLogger && !isAuditLogger(deps.auditLogger)) {
    throw new Error(
      "Invalid audit logger dependency: must implement IAuditLogger",
    );
  }
}

/**
 * Validate service dependencies
 * @param deps - Dependencies object
 * @throws Error if dependencies are invalid
 */
export function validateServiceDependencies(deps: {
  userRepository?: unknown;
  sessionRepository?: unknown;
  auditLogger?: unknown;
  encryptionService?: unknown;
}): void {
  if (deps.userRepository && !isUserRepository(deps.userRepository)) {
    throw new Error(
      "Invalid user repository dependency: must implement IUserRepository",
    );
  }

  if (deps.sessionRepository && !isSessionRepository(deps.sessionRepository)) {
    throw new Error(
      "Invalid session repository dependency: must implement ISessionRepository",
    );
  }

  if (deps.auditLogger && !isAuditLogger(deps.auditLogger)) {
    throw new Error(
      "Invalid audit logger dependency: must implement IAuditLogger",
    );
  }

  if (deps.encryptionService && !isEncryptionService(deps.encryptionService)) {
    throw new Error(
      "Invalid encryption service dependency: must implement IEncryptionService",
    );
  }
}

// =============================================================================
// DEPENDENCY RESOLUTION UTILITIES
// =============================================================================

/**
 * Check if dependency is required (not null/undefined)
 * @param dep - Dependency to check
 * @param name - Dependency name (for error messages)
 * @throws Error if dependency is null/undefined
 */
export function requireDependency<T>(
  dep: T | null | undefined,
  name: string,
): T {
  if (dep === null || dep === undefined) {
    throw new Error(`Required dependency '${name}' is missing`);
  }
  return dep;
}

/**
 * Get dependency with fallback
 * @param dep - Dependency to check
 * @param fallback - Fallback value
 * @returns Dependency or fallback
 */
export function getDependencyOrFallback<T>(
  dep: T | null | undefined,
  fallback: T,
): T {
  return dep ?? fallback;
}

/**
 * Validate circular dependencies
 * @param dependencies - Map of dependency names to their dependencies
 * @throws Error if circular dependency detected
 */
export function validateCircularDependencies(
  dependencies: Map<string, Set<string>>,
): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const deps = dependencies.get(node);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          throw new Error(`Circular dependency detected: ${node} -> ${dep}`);
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of dependencies.keys()) {
    if (!visited.has(node)) {
      hasCycle(node);
    }
  }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Create detailed dependency error message
 * @param serviceName - Service name
 * @param dependencyName - Dependency name
 * @param expectedInterface - Expected interface name
 * @param actualType - Actual type received
 * @returns Detailed error message
 */
export function createDependencyErrorMessage(
  serviceName: string,
  dependencyName: string,
  expectedInterface: string,
  actualType: string,
): string {
  return `
Dependency Injection Error in ${serviceName}:

Expected: ${dependencyName} to implement ${expectedInterface}
Received: ${actualType}

This usually means:
1. The dependency was not registered in the DI container
2. The dependency was registered with the wrong type
3. The dependency implementation is incomplete

To fix this:
1. Check that ${dependencyName} is registered in container.ts
2. Verify ${dependencyName} implements all methods from ${expectedInterface}
3. Ensure ${dependencyName} is bound to the correct interface

For more information, see:
- src/shared/infrastructure/di/${expectedInterface.toLowerCase()}.ts
- src/shared/infrastructure/di/container.ts
`.trim();
}

/**
 * Create missing dependency error message
 * @param serviceName - Service name
 * @param dependencyName - Dependency name
 * @returns Error message
 */
export function createMissingDependencyErrorMessage(
  serviceName: string,
  dependencyName: string,
): string {
  return `
Missing Dependency in ${serviceName}:

Required dependency '${dependencyName}' is null or undefined.

This usually means:
1. The dependency was not registered in the DI container
2. The dependency registration failed during initialization
3. The dependency has a circular reference

To fix this:
1. Check that ${dependencyName} is registered in container.ts
2. Verify the container initialization order
3. Check for circular dependencies

For more information, see:
- src/shared/infrastructure/di/container.ts
- src/shared/infrastructure/di/type-guards.ts
`.trim();
}

// =============================================================================
// ALL UTILITIES EXPORTED INLINE ABOVE
// =============================================================================
// All functions are already exported using 'export function' declarations.
// No need for an additional export block.

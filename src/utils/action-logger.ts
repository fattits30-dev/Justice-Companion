/**
 * Action Logger - Comprehensive function call tracking
 *
 * Tracks ALL function calls with:
 * - Success/failure status
 * - Input parameters
 * - Output results
 * - Execution time
 * - Error details
 *
 * Usage:
 * @tracked('ServiceName')
 * class MyService {
 *   @logAction('methodName')
 *   async myMethod(param: string): Promise<Result> {
 *     // implementation
 *   }
 * }
 */

import { logger } from "./logger.ts";
import { getDb } from "../db/database.ts";
import { randomUUID } from "crypto";

export interface ActionLogEntry {
  id?: string;
  timestamp: string;
  action: string;
  service: string;
  status: "SUCCESS" | "FAILURE" | "IN_PROGRESS";
  duration?: number;
  input?: any;
  output?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  user?: {
    id: string;
    username: string;
  };
  session?: {
    id: string;
  };
}

/**
 * Decorator to track all method calls in a class
 */
export function tracked(serviceName: string) {
  return function <T extends abstract new (...args: any[]) => object>(
    constructor: T
  ) {
    const originalMethods = Object.getOwnPropertyNames(constructor.prototype);

    for (const methodName of originalMethods) {
      if (methodName === "constructor") {
        continue;
      }

      const originalMethod = constructor.prototype[methodName];
      if (typeof originalMethod !== "function") {
        continue;
      }

      constructor.prototype[methodName] = createTrackedMethod(
        serviceName,
        methodName,
        originalMethod
      );
    }

    return constructor;
  };
}

/**
 * Method decorator to track individual function calls
 */
export function logAction(actionName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const action = actionName || propertyKey;
    const serviceName = target.constructor.name;

    descriptor.value = createTrackedMethod(serviceName, action, originalMethod);

    return descriptor;
  };
}

/**
 * Create a tracked version of a method
 */
function createTrackedMethod(
  serviceName: string,
  actionName: string,
  originalMethod: (...args: unknown[]) => unknown
) {
  return async function (this: any, ...args: any[]) {
    const startTime = Date.now();
    const logEntry: ActionLogEntry = {
      timestamp: new Date().toISOString(),
      action: actionName,
      service: serviceName,
      status: "IN_PROGRESS",
      input: sanitizeInput(args),
    };

    // Log start
    logger.info(`[ACTION START] ${serviceName}.${actionName}`, {
      service: serviceName,
      operation: actionName,
      input: logEntry.input,
    });

    try {
      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Log success
      const duration = Date.now() - startTime;
      logEntry.status = "SUCCESS";
      logEntry.duration = duration;
      logEntry.output = sanitizeOutput(result);

      logger.info(`[ACTION SUCCESS] ${serviceName}.${actionName}`, {
        service: serviceName,
        operation: actionName,
        duration,
        status: "SUCCESS",
      });

      // Store in action log
      storeActionLog(logEntry);

      return result;
    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      logEntry.status = "FAILURE";
      logEntry.duration = duration;
      logEntry.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any).code,
      };

      logger.error(`[ACTION FAILURE] ${serviceName}.${actionName}`, {
        service: serviceName,
        operation: actionName,
        duration,
        status: "FAILURE",
        error: logEntry.error,
      });

      // Store in action log
      storeActionLog(logEntry);

      throw error;
    }
  };
}

/**
 * Sanitize input parameters (remove sensitive data)
 */
function sanitizeInput(args: any[]): any {
  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(arg)) {
        if (
          ["password", "token", "secret", "key"].includes(key.toLowerCase())
        ) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return arg;
  });
}

/**
 * Sanitize output (remove sensitive data)
 */
function sanitizeOutput(result: any): any {
  if (typeof result === "object" && result !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(result)) {
      if (
        [
          "password",
          "token",
          "secret",
          "passwordHash",
          "passwordSalt",
        ].includes(key)
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return result;
}

/**
 * Store action log entry in database
 */
function storeActionLog(entry: ActionLogEntry): void {
  try {
    const db = getDb();
    const id = randomUUID();

    db.prepare(
      `
      INSERT INTO action_logs (
        id, timestamp, action, service, status, duration,
        input, output, error_message, error_stack, error_code,
        user_id, username, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      entry.timestamp,
      entry.action,
      entry.service,
      entry.status,
      entry.duration || null,
      entry.input ? JSON.stringify(entry.input) : null,
      entry.output ? JSON.stringify(entry.output) : null,
      entry.error?.message || null,
      entry.error?.stack || null,
      entry.error?.code || null,
      entry.user?.id || null,
      entry.user?.username || null,
      entry.session?.id || null
    );
  } catch (error) {
    // Fallback: log to Winston if database write fails
    logger.error(
      "[ActionLogger] Failed to store action log to database:",
      error
    );
  }
}

/**
 * Get recent action logs from database
 */
export function getRecentActions(limit = 100): ActionLogEntry[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT id, timestamp, action, service, status, duration,
             input, output, error_message, error_stack, error_code,
             user_id, username, session_id
      FROM action_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `
      )
      .all(limit);

    return rows.map((row: any) => parseActionLogRow(row));
  } catch (error) {
    logger.error("[ActionLogger] Failed to get recent actions:", error);
    return [];
  }
}

/**
 * Get failed actions from database
 */
export function getFailedActions(limit = 50): ActionLogEntry[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT id, timestamp, action, service, status, duration,
             input, output, error_message, error_stack, error_code,
             user_id, username, session_id
      FROM action_logs
      WHERE status = 'FAILURE'
      ORDER BY timestamp DESC
      LIMIT ?
    `
      )
      .all(limit);

    return rows.map((row: any) => parseActionLogRow(row));
  } catch (error) {
    logger.error("[ActionLogger] Failed to get failed actions:", error);
    return [];
  }
}

/**
 * Get actions by service from database
 */
export function getActionsByService(
  serviceName: string,
  limit = 100
): ActionLogEntry[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT id, timestamp, action, service, status, duration,
             input, output, error_message, error_stack, error_code,
             user_id, username, session_id
      FROM action_logs
      WHERE service = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `
      )
      .all(serviceName, limit);

    return rows.map((row: any) => parseActionLogRow(row));
  } catch (error) {
    logger.error("[ActionLogger] Failed to get actions by service:", error);
    return [];
  }
}

/**
 * Get action statistics from database
 */
export function getActionStats(): {
  total: number;
  success: number;
  failure: number;
  avgDuration: number;
  byService: Record<
    string,
    { total: number; success: number; failure: number }
  >;
} {
  try {
    const db = getDb();

    // Get overall stats
    const overallStats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failure,
        AVG(duration) as avgDuration
      FROM action_logs
    `
      )
      .get() as any;

    // Get stats by service
    const serviceStats = db
      .prepare(
        `
      SELECT
        service,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failure
      FROM action_logs
      GROUP BY service
    `
      )
      .all() as any[];

    const byService: Record<
      string,
      { total: number; success: number; failure: number }
    > = {};
    for (const row of serviceStats) {
      byService[row.service] = {
        total: row.total,
        success: row.success,
        failure: row.failure,
      };
    }

    return {
      total: overallStats.total || 0,
      success: overallStats.success || 0,
      failure: overallStats.failure || 0,
      avgDuration: overallStats.avgDuration || 0,
      byService,
    };
  } catch (error) {
    logger.error("[ActionLogger] Failed to get action stats:", error);
    return {
      total: 0,
      success: 0,
      failure: 0,
      avgDuration: 0,
      byService: {},
    };
  }
}

/**
 * Clear action logs from database
 */
export function clearActionLogs(): void {
  try {
    const db = getDb();
    db.prepare("DELETE FROM action_logs").run();
    logger.info("Action logs cleared from database");
  } catch (error) {
    logger.error("[ActionLogger] Failed to clear action logs:", error);
  }
}

/**
 * Helper function to parse database row into ActionLogEntry
 */
function parseActionLogRow(row: any): ActionLogEntry {
  const entry: ActionLogEntry = {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action,
    service: row.service,
    status: row.status,
    duration: row.duration,
  };

  // Parse JSON fields
  if (row.input) {
    try {
      entry.input = JSON.parse(row.input);
    } catch {
      entry.input = row.input;
    }
  }

  if (row.output) {
    try {
      entry.output = JSON.parse(row.output);
    } catch {
      entry.output = row.output;
    }
  }

  // Parse error details
  if (row.error_message) {
    entry.error = {
      message: row.error_message,
      stack: row.error_stack || undefined,
      code: row.error_code || undefined,
    };
  }

  // Parse user context
  if (row.user_id) {
    entry.user = {
      id: row.user_id,
      username: row.username || "",
    };
  }

  // Parse session context
  if (row.session_id) {
    entry.session = {
      id: row.session_id,
    };
  }

  return entry;
}

/**
 * Standardized IPC response format
 *
 * Ensures consistent error handling and response structure across all IPC channels
 */

import { ZodError } from 'zod';

/**
 * Standard IPC response type
 */
export type IPCResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Error codes for IPC operations (const object - modern TypeScript best practice)
 */
export const IPCErrorCode = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization errors
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  OWNERSHIP_REQUIRED: 'OWNERSHIP_REQUIRED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Operational errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  FILE_ERROR: 'FILE_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // GDPR/Consent
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
} as const;

export type IPCErrorCode = (typeof IPCErrorCode)[keyof typeof IPCErrorCode];

/**
 * Create success response
 */
export function successResponse<T>(data: T): IPCResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create error response
 */
export function errorResponse(
  code: IPCErrorCode,
  message: string,
  details?: unknown
): IPCResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Handle Zod validation errors
 */
export function zodErrorResponse(error: ZodError): IPCResponse {
  const firstError = error.errors[0];
  const fieldPath = firstError.path.join('.');
  const message = firstError.message;

  return errorResponse(
    IPCErrorCode.VALIDATION_ERROR,
    `Validation failed for ${fieldPath}: ${message}`,
    error.errors
  );
}

/**
 * Format generic errors into IPC responses
 *
 * Maps common error patterns to appropriate error codes
 */
export function formatError(error: unknown): IPCResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return zodErrorResponse(error);
  }

  // Standard Error objects
  if (error instanceof Error) {
    const message = error.message;

    // Authentication errors
    if (
      message.includes('not authenticated') ||
      message.includes('login required') ||
      message.includes('session')
    ) {
      return errorResponse(IPCErrorCode.NOT_AUTHENTICATED, message);
    }

    if (message.includes('invalid credentials') || message.includes('password')) {
      return errorResponse(IPCErrorCode.INVALID_CREDENTIALS, message);
    }

    // Authorization errors
    if (message.includes('not authorized') || message.includes('permission')) {
      return errorResponse(IPCErrorCode.PERMISSION_ERROR, message);
    }

    if (message.includes('ownership') || message.includes('not yours')) {
      return errorResponse(IPCErrorCode.OWNERSHIP_REQUIRED, message);
    }

    // Resource errors
    if (message.includes('not found')) {
      return errorResponse(IPCErrorCode.NOT_FOUND, message);
    }

    if (message.includes('already exists') || message.includes('duplicate')) {
      return errorResponse(IPCErrorCode.ALREADY_EXISTS, message);
    }

    // Database errors
    if (message.includes('database') || message.includes('SQLITE')) {
      return errorResponse(IPCErrorCode.DATABASE_ERROR, message);
    }

    // Encryption errors
    if (message.includes('encryption') || message.includes('decrypt')) {
      return errorResponse(IPCErrorCode.ENCRYPTION_ERROR, message);
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return errorResponse(IPCErrorCode.RATE_LIMIT_EXCEEDED, message);
    }

    // Consent
    if (message.includes('consent')) {
      return errorResponse(IPCErrorCode.CONSENT_REQUIRED, message);
    }

    // Generic error
    return errorResponse(IPCErrorCode.INTERNAL_ERROR, message);
  }

  // Unknown error types
  return errorResponse(
    IPCErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    error
  );
}

/**
 * Wrap an async IPC handler with error handling
 *
 * Usage:
 * ```typescript
 * ipcMain.handle('auth:login', wrapIPCHandler(async (event, data) => {
 *   // Your handler logic here
 *   return someResult;
 * }));
 * ```
 */
export function wrapIPCHandler<T, Args extends unknown[]>(
  handler: (...args: Args) => Promise<T>
): (...args: Args) => Promise<IPCResponse<T>> {
  return async (...args: Args): Promise<IPCResponse<T>> => {
    try {
      const result = await handler(...args);
      return successResponse(result);
    } catch (error) {
      console.error('[IPC] Handler error:', error);
      return formatError(error) as IPCResponse<T>;
    }
  };
}

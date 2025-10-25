/**
 * Domain-Specific Error Classes for Justice Companion
 *
 * Provides a hierarchical error system with structured error codes,
 * HTTP status codes, and consistent error handling across the application.
 */

/**
 * Base domain error class with structured error information
 */
export class DomainError extends Error {
  public readonly statusCode: number;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    public readonly code: string,
    message: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON representation for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

// ===== AUTHENTICATION & AUTHORIZATION ERRORS =====

/**
 * User is not authenticated (no valid session)
 */
export class NotAuthenticatedError extends DomainError {
  constructor(message: string = 'Authentication required') {
    super('NOT_AUTHENTICATED', message, 401);
  }
}

/**
 * Invalid username/password combination
 */
export class InvalidCredentialsError extends DomainError {
  constructor(message: string = 'Invalid username or password') {
    super('INVALID_CREDENTIALS', message, 401);
  }
}

/**
 * Session has expired
 */
export class SessionExpiredError extends DomainError {
  constructor(sessionId?: string) {
    const message = sessionId
      ? `Session ${sessionId} has expired`
      : 'Your session has expired';
    super('SESSION_EXPIRED', message, 401, { sessionId });
  }
}

/**
 * User lacks permission for requested operation
 */
export class UnauthorizedError extends DomainError {
  constructor(
    resource: string,
    action: string,
    userId?: number
  ) {
    const message = `Unauthorized to ${action} ${resource}`;
    super('UNAUTHORIZED', message, 403, { resource, action, userId });
  }
}

/**
 * User registration failed
 */
export class RegistrationError extends DomainError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super('REGISTRATION_FAILED', `Registration failed: ${reason}`, 400, details);
  }
}

// ===== RESOURCE ERRORS =====

/**
 * Case not found in database
 */
export class CaseNotFoundError extends DomainError {
  constructor(caseId: number | string) {
    super(
      'CASE_NOT_FOUND',
      `Case with ID ${caseId} not found`,
      404,
      { caseId }
    );
  }
}

/**
 * Evidence not found in database
 */
export class EvidenceNotFoundError extends DomainError {
  constructor(evidenceId: number | string) {
    super(
      'EVIDENCE_NOT_FOUND',
      `Evidence with ID ${evidenceId} not found`,
      404,
      { evidenceId }
    );
  }
}

/**
 * User not found in database
 */
export class UserNotFoundError extends DomainError {
  constructor(userId: number | string) {
    super(
      'USER_NOT_FOUND',
      `User with ID ${userId} not found`,
      404,
      { userId }
    );
  }
}

/**
 * Deadline not found in database
 */
export class DeadlineNotFoundError extends DomainError {
  constructor(deadlineId: number | string) {
    super(
      'DEADLINE_NOT_FOUND',
      `Deadline with ID ${deadlineId} not found`,
      404,
      { deadlineId }
    );
  }
}

/**
 * Resource already exists (duplicate)
 */
export class ResourceAlreadyExistsError extends DomainError {
  constructor(resource: string, identifier: string | number) {
    super(
      'ALREADY_EXISTS',
      `${resource} with identifier ${identifier} already exists`,
      409,
      { resource, identifier }
    );
  }
}

// ===== VALIDATION ERRORS =====

/**
 * Input validation failed
 */
export class ValidationError extends DomainError {
  constructor(
    field: string,
    message: string,
    validationErrors?: Array<{ field: string; message: string }>
  ) {
    super(
      'VALIDATION_ERROR',
      `Validation failed for ${field}: ${message}`,
      400,
      { field, validationErrors }
    );
  }
}

/**
 * Required field is missing
 */
export class RequiredFieldError extends DomainError {
  constructor(fieldName: string) {
    super(
      'REQUIRED_FIELD_MISSING',
      `Required field '${fieldName}' is missing`,
      400,
      { fieldName }
    );
  }
}

/**
 * Invalid file type or format
 */
export class InvalidFileTypeError extends DomainError {
  constructor(
    fileName: string,
    expectedTypes: string[],
    actualType?: string
  ) {
    super(
      'INVALID_FILE_TYPE',
      `Invalid file type for ${fileName}. Expected: ${expectedTypes.join(', ')}`,
      400,
      { fileName, expectedTypes, actualType }
    );
  }
}

// ===== SECURITY ERRORS =====

/**
 * Encryption operation failed
 */
export class EncryptionError extends DomainError {
  constructor(operation: 'encrypt' | 'decrypt', reason?: string) {
    const message = reason
      ? `Failed to ${operation} data: ${reason}`
      : `Failed to ${operation} data`;
    super('ENCRYPTION_ERROR', message, 500, { operation });
  }
}

/**
 * Encryption key not found or invalid
 */
export class EncryptionKeyError extends DomainError {
  constructor(reason: string = 'Encryption key not configured') {
    super('ENCRYPTION_KEY_ERROR', reason, 500);
  }
}

// ===== DATABASE ERRORS =====

/**
 * Database operation failed
 */
export class DatabaseError extends DomainError {
  constructor(
    operation: string,
    reason?: string,
    sqliteCode?: string
  ) {
    const message = reason
      ? `Database ${operation} failed: ${reason}`
      : `Database ${operation} failed`;
    super('DATABASE_ERROR', message, 500, { operation, sqliteCode });
  }
}

/**
 * Database connection failed
 */
export class DatabaseConnectionError extends DomainError {
  constructor(reason?: string) {
    const message = reason
      ? `Failed to connect to database: ${reason}`
      : 'Failed to connect to database';
    super('DATABASE_CONNECTION_ERROR', message, 500);
  }
}

/**
 * Database migration failed
 */
export class MigrationError extends DomainError {
  constructor(migrationName: string, reason: string) {
    super(
      'MIGRATION_ERROR',
      `Migration '${migrationName}' failed: ${reason}`,
      500,
      { migrationName }
    );
  }
}

// ===== RATE LIMITING & QUOTA ERRORS =====

/**
 * Rate limit exceeded for operation
 */
export class RateLimitError extends DomainError {
  constructor(
    operation: string,
    limit: number,
    resetTime?: Date
  ) {
    const message = `Rate limit exceeded for ${operation}. Limit: ${limit} requests`;
    super('RATE_LIMIT_EXCEEDED', message, 429, {
      operation,
      limit,
      resetTime: resetTime?.toISOString()
    });
  }
}

/**
 * Storage quota exceeded
 */
export class QuotaExceededError extends DomainError {
  constructor(
    resource: string,
    used: number,
    limit: number
  ) {
    super(
      'QUOTA_EXCEEDED',
      `Quota exceeded for ${resource}. Used: ${used}, Limit: ${limit}`,
      507,
      { resource, used, limit }
    );
  }
}

// ===== GDPR & COMPLIANCE ERRORS =====

/**
 * GDPR compliance violation or requirement not met
 */
export class GdprComplianceError extends DomainError {
  constructor(
    article: number,
    requirement: string,
    reason?: string
  ) {
    const message = reason
      ? `GDPR Article ${article} - ${requirement}: ${reason}`
      : `GDPR Article ${article} requirement not met: ${requirement}`;
    super('GDPR_COMPLIANCE_ERROR', message, 451, { article, requirement });
  }
}

/**
 * User consent required for operation
 */
export class ConsentRequiredError extends DomainError {
  constructor(
    consentType: string,
    operation: string
  ) {
    super(
      'CONSENT_REQUIRED',
      `User consent for '${consentType}' required to ${operation}`,
      403,
      { consentType, operation }
    );
  }
}

/**
 * Data export failed
 */
export class DataExportError extends DomainError {
  constructor(reason: string, userId?: number) {
    super(
      'DATA_EXPORT_ERROR',
      `Failed to export user data: ${reason}`,
      500,
      { userId }
    );
  }
}

/**
 * Data deletion failed
 */
export class DataDeletionError extends DomainError {
  constructor(reason: string, userId?: number) {
    super(
      'DATA_DELETION_ERROR',
      `Failed to delete user data: ${reason}`,
      500,
      { userId }
    );
  }
}

// ===== AI SERVICE ERRORS =====

/**
 * AI service not configured
 */
export class AINotConfiguredError extends DomainError {
  constructor(provider: string = 'AI service') {
    super(
      'AI_NOT_CONFIGURED',
      `${provider} not configured. Please set your API key in Settings.`,
      503
    );
  }
}

/**
 * AI service request failed
 */
export class AIServiceError extends DomainError {
  constructor(
    provider: string,
    reason: string,
    statusCode?: number
  ) {
    super(
      'AI_SERVICE_ERROR',
      `${provider} error: ${reason}`,
      statusCode || 503,
      { provider }
    );
  }
}

/**
 * AI API key invalid
 */
export class AIInvalidKeyError extends DomainError {
  constructor(provider: string) {
    super(
      'AI_INVALID_KEY',
      `Invalid API key for ${provider}`,
      401,
      { provider }
    );
  }
}

// ===== FILE SYSTEM ERRORS =====

/**
 * File not found
 */
export class FileNotFoundError extends DomainError {
  constructor(filePath: string) {
    super(
      'FILE_NOT_FOUND',
      `File not found: ${filePath}`,
      404,
      { filePath }
    );
  }
}

/**
 * File operation failed
 */
export class FileOperationError extends DomainError {
  constructor(
    operation: 'read' | 'write' | 'delete' | 'move',
    filePath: string,
    reason?: string
  ) {
    const message = reason
      ? `Failed to ${operation} file ${filePath}: ${reason}`
      : `Failed to ${operation} file ${filePath}`;
    super('FILE_OPERATION_ERROR', message, 500, { operation, filePath });
  }
}

// ===== BUSINESS LOGIC ERRORS =====

/**
 * Operation not allowed in current state
 */
export class InvalidStateError extends DomainError {
  constructor(
    entity: string,
    currentState: string,
    operation: string
  ) {
    super(
      'INVALID_STATE',
      `Cannot ${operation} ${entity} in state '${currentState}'`,
      409,
      { entity, currentState, operation }
    );
  }
}

/**
 * Business rule violation
 */
export class BusinessRuleError extends DomainError {
  constructor(rule: string, violation: string) {
    super(
      'BUSINESS_RULE_VIOLATION',
      `Business rule violation - ${rule}: ${violation}`,
      400,
      { rule }
    );
  }
}

/**
 * Operation conflict
 */
export class ConflictError extends DomainError {
  constructor(resource: string, reason: string) {
    super(
      'CONFLICT',
      `Conflict in ${resource}: ${reason}`,
      409,
      { resource }
    );
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Check if error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Convert any error to DomainError
 */
export function toDomainError(error: unknown): DomainError {
  if (isDomainError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Try to infer the type of error from the message
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      return new DomainError('NOT_FOUND', error.message, 404);
    }
    if (message.includes('unauthorized') || message.includes('permission')) {
      return new DomainError('UNAUTHORIZED', error.message, 403);
    }
    if (message.includes('authenticated') || message.includes('login')) {
      return new DomainError('NOT_AUTHENTICATED', error.message, 401);
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return new DomainError('VALIDATION_ERROR', error.message, 400);
    }
    if (message.includes('database') || message.includes('sqlite')) {
      return new DatabaseError('operation', error.message);
    }
    if (message.includes('encryption')) {
      return new EncryptionError('encrypt', error.message);
    }
    if (message.includes('rate limit')) {
      return new RateLimitError('operation', 0);
    }

    // Generic internal error
    return new DomainError('INTERNAL_ERROR', error.message, 500);
  }

  // Unknown error type
  return new DomainError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred',
    500,
    { originalError: String(error) }
  );
}

/**
 * Create error response for IPC handlers
 */
export function createErrorResponse(error: DomainError) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
    }
  };
}
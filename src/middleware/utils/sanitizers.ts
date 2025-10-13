/**
 * Sanitization utilities for input validation
 *
 * Provides functions to sanitize user input and prevent various injection attacks
 * including XSS, SQL injection, and path traversal.
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) {
    return input;
  }

  // Remove all HTML tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Remove all remaining HTML tags but keep content
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');

  // Remove dangerous characters and patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized.trim();
}

/**
 * Check for potential SQL injection patterns
 * Returns false if dangerous patterns are detected
 */
export function preventSqlInjection(input: string): boolean {
  if (!input) {
    return true;
  }

  // Common SQL injection patterns
  const sqlPatterns = [
    // SQL keywords with word boundaries
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b/i,

    // Union and join operations
    /\b(UNION|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN)\b/i,

    // SQL clauses
    /\b(FROM|WHERE|HAVING|GROUP\s+BY|ORDER\s+BY)\b/i,

    // Comments and special characters
    /(--|#|\/\*|\*\/)/,

    // Hex encoding and system procedures
    /(0x[0-9a-f]+|xp_|sp_)/i,

    // Common injection attempts
    /(\bOR\b\s*['"]?\s*\d+\s*=\s*\d+|\bAND\b\s*['"]?\s*\d+\s*=\s*\d+)/i,

    // Semicolon (statement terminator)
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/i,

    // Single quotes with SQL keywords
    /'.*\b(OR|AND|SELECT|INSERT|UPDATE|DELETE)\b/i,
  ];

  // Check if any pattern matches
  return !sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Prevent command injection in shell commands
 * Returns false if dangerous patterns are detected
 */
export function preventCommandInjection(input: string): boolean {
  if (!input) {
    return true;
  }

  // Dangerous shell characters and patterns
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/, // Shell metacharacters
    /\.\./, // Directory traversal
    /~\//, // Home directory expansion
    /\$\{.*\}/, // Variable expansion
    /\$\(.*\)/, // Command substitution
    /`.*`/, // Backtick command substitution
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(filePath: string): string {
  if (!filePath) {
    return filePath;
  }

  // Remove directory traversal patterns
  let sanitized = filePath.replace(/\.\./g, '');
  sanitized = sanitized.replace(/~\//g, '');

  // Remove leading slashes and backslashes
  sanitized = sanitized.replace(/^[\\/]+/, '');

  // Normalize slashes
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Sanitize filename to prevent path injection
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return filename;
  }

  // Remove any path separators
  let sanitized = filename.replace(/[\\/]/g, '');

  // Remove directory traversal
  sanitized = sanitized.replace(/\.\./g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Remove special characters that could be problematic
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Remove control characters (using Unicode ranges instead of control char literals)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Limit length
  if (sanitized.length > 255) {
    // Preserve extension if present
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > 0) {
      const extension = sanitized.slice(lastDot);
      sanitized = sanitized.slice(0, 255 - extension.length) + extension;
    } else {
      sanitized = sanitized.slice(0, 255);
    }
  }

  return sanitized.trim();
}

/**
 * Sanitize URL to prevent open redirect and XSS
 */
export function sanitizeUrl(url: string): string {
  if (!url) {
    return url;
  }

  // Remove javascript: and data: protocols
  if (url.match(/^(javascript|data|vbscript|about|file):/i)) {
    return '';
  }

  // Remove leading whitespace and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = url.replace(/^[\x00-\x20]+/, '');

  // Decode URL to catch encoded attacks
  try {
    sanitized = decodeURIComponent(sanitized);
  } catch {
    // If decoding fails, reject the URL
    return '';
  }

  // Check again after decoding
  if (sanitized.match(/^(javascript|data|vbscript|about|file):/i)) {
    return '';
  }

  // For relative URLs, ensure they start with / or are just paths
  if (!sanitized.match(/^https?:\/\//i)) {
    // Ensure relative URLs don't contain protocol handlers
    if (sanitized.includes(':')) {
      return '';
    }
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) {
    return email;
  }

  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();

  // Remove any HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>()[\]\\,;:]/g, '');

  // Validate basic email format
  if (!sanitized.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return '';
  }

  // Limit length
  if (sanitized.length > 254) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize user input for logging (remove sensitive data)
 * This is used to safely log user input without exposing sensitive information
 */
export function sanitizeForLogging(data: unknown, maxDepth = 5): unknown {
  // Prevent infinite recursion
  if (maxDepth <= 0) {
    return '[MAX_DEPTH_REACHED]';
  }

  // List of sensitive field names
  const sensitiveFields = [
    'password',
    'pass',
    'passwd',
    'pwd',
    'apikey',
    'api_key',
    'apiKey',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'credit_card',
    'creditCard',
    'card_number',
    'cardNumber',
    'cvv',
    'ssn',
    'social_security',
    'socialSecurity',
    'pin',
    'private_key',
    'privateKey',
  ];

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Truncate long strings
    return data.length > 1000 ? data.substring(0, 1000) + '...[TRUNCATED]' : data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    // Limit array length
    const limited = data.slice(0, 10);
    const mapped = limited.map((item: unknown) => sanitizeForLogging(item, maxDepth - 1));

    if (data.length > 10) {
      mapped.push(`...[${data.length - 10} MORE ITEMS]`);
    }

    return mapped;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Check if field name suggests sensitive data
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) => lowerKey.includes(field));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (key === 'file' || key === 'buffer' || key === 'data') {
        // Don't log file contents or large data buffers
        sanitized[key] = '[BINARY_DATA]';
      } else {
        sanitized[key] = sanitizeForLogging(value, maxDepth - 1);
      }
    }

    return sanitized;
  }

  // For any other type
  return '[UNKNOWN_TYPE]';
}

/**
 * Strip ANSI escape codes (useful for terminal output)
 */
export function stripAnsi(input: string): string {
  if (!input) {
    return input;
  }

  // Remove ANSI escape sequences (ESC=\x1b and CSI=\x9b control characters)
  // Build regex from code points to avoid linter warning about control characters
  const ESC = String.fromCodePoint(0x001b);
  const CSI = String.fromCodePoint(0x009b);
  const ansiPattern = `[${ESC}${CSI}][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
  const ansiRegex = new RegExp(ansiPattern, 'g');
  return input.replace(ansiRegex, '');
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(input: string): string {
  if (!input) {
    return input;
  }

  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Truncate string to specified length with ellipsis
 */
export function truncate(input: string, maxLength: number, suffix = '...'): string {
  if (!input || input.length <= maxLength) {
    return input;
  }

  const truncateLength = maxLength - suffix.length;
  if (truncateLength <= 0) {
    return suffix;
  }

  return input.substring(0, truncateLength) + suffix;
}

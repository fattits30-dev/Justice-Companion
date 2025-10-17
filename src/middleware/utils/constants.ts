/**
 * Validation constants for Justice Companion
 *
 * Central location for all validation limits, enums, and allowed values
 * to ensure consistency across the application.
 */

// ===== STRING LENGTH LIMITS =====
export const MAX_STRING_LENGTH = 10000; // General string limit
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_CASE_NUMBER_LENGTH = 50;
export const MAX_FILENAME_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 254; // RFC 5321
export const MAX_USERNAME_LENGTH = 50;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_URL_LENGTH = 2048;
export const MAX_PATH_LENGTH = 260; // Windows MAX_PATH

// ===== ARRAY LENGTH LIMITS =====
export const MAX_ARRAY_LENGTH = 1000; // General array limit
export const MAX_MESSAGES_PER_CONVERSATION = 10000;
export const MAX_EVIDENCE_PER_CASE = 1000;
export const MAX_FILES_PER_UPLOAD = 10;
export const MAX_CONSENTS_PER_USER = 50;

// ===== NUMBER LIMITS =====
export const MAX_INT32 = 2147483647;
export const MIN_INT32 = -2147483648;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_CONFIDENCE_SCORE = 1.0;
export const MIN_CONFIDENCE_SCORE = 0.0;

// ===== CASE ENUMS =====
export const VALID_CASE_TYPES = [
  'employment',
  'housing',
  'consumer',
  'family',
  'immigration',
  'criminal',
  'civil',
  'debt',
  'benefits',
  'other',
] as const;

export const VALID_CASE_STATUSES = ['active', 'pending', 'closed', 'archived', 'on_hold'] as const;

// ===== EVIDENCE ENUMS =====
export const VALID_EVIDENCE_TYPES = [
  'document',
  'photo',
  'video',
  'audio',
  'email',
  'text_message',
  'social_media',
  'witness_statement',
  'expert_report',
  'medical_record',
  'financial_record',
  'contract',
  'correspondence',
  'other',
] as const;

// ===== CONSENT ENUMS =====
export const VALID_CONSENT_TYPES = [
  'data_processing',
  'data_sharing',
  'marketing',
  'analytics',
  'ai_processing',
  'data_retention',
  'encryption',
] as const;

// ===== USER ENUMS =====
export const VALID_USER_ROLES = ['user', 'admin', 'moderator'] as const;

// ===== AI MODEL ENUMS =====
export const VALID_AI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'llama-3-70b',
  'llama-3-8b',
] as const;

// ===== FILE OPERATIONS =====
export const ALLOWED_FILE_EXTENSIONS = [
  // Documents
  'pdf',
  'doc',
  'docx',
  'odt',
  'rtf',
  'txt',
  // Spreadsheets
  'xls',
  'xlsx',
  'csv',
  'ods',
  // Presentations
  'ppt',
  'pptx',
  'odp',
  // Images
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'svg',
  'webp',
  // Audio
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'aac',
  // Video
  'mp4',
  'avi',
  'mov',
  'wmv',
  'mkv',
  'webm',
  // Archives
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  // Email
  'eml',
  'msg',
  // Other
  'json',
  'xml',
  'html',
  'md',
] as const;

export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // Video
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const;

// ===== REGEX PATTERNS =====
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,50}$/,
  CASE_NUMBER: /^[A-Za-z0-9\-/\s]+$/,
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.,!?'"()]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// ===== VALIDATION ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  // Required fields
  REQUIRED_FIELD: 'This field is required',
  REQUIRED_SELECTION: 'Please make a selection',

  // String validation
  STRING_TOO_SHORT: 'Text is too short',
  STRING_TOO_LONG: 'Text exceeds maximum length',
  INVALID_CHARACTERS: 'Text contains invalid characters',
  INVALID_FORMAT: 'Invalid format',

  // Number validation
  INVALID_NUMBER: 'Please enter a valid number',
  NUMBER_TOO_SMALL: 'Number is below minimum value',
  NUMBER_TOO_LARGE: 'Number exceeds maximum value',
  MUST_BE_INTEGER: 'Must be a whole number',
  MUST_BE_POSITIVE: 'Must be a positive number',

  // Email validation
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_TOO_LONG: 'Email address is too long',

  // Password validation
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  PASSWORD_TOO_LONG: `Password must be less than ${MAX_PASSWORD_LENGTH} characters`,
  PASSWORD_TOO_WEAK: 'Password is too weak',
  PASSWORD_NO_LOWERCASE: 'Password must contain lowercase letters',
  PASSWORD_NO_UPPERCASE: 'Password must contain uppercase letters',
  PASSWORD_NO_NUMBERS: 'Password must contain numbers',
  PASSWORD_NO_SPECIAL: 'Password must contain special characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',

  // Date validation
  INVALID_DATE: 'Please enter a valid date',
  DATE_IN_PAST: 'Date cannot be in the past',
  DATE_IN_FUTURE: 'Date cannot be in the future',
  DATE_TOO_FAR_FUTURE: 'Date is too far in the future',
  INVALID_DATE_RANGE: 'Invalid date range',

  // File validation
  FILE_TOO_LARGE: 'File size exceeds maximum allowed',
  INVALID_FILE_TYPE: 'File type not allowed',
  INVALID_FILE_PATH: 'Invalid file path',
  PATH_TRAVERSAL: 'File path contains invalid characters',

  // Array validation
  ARRAY_TOO_LONG: 'Too many items selected',
  ARRAY_EMPTY: 'At least one item is required',

  // Enum validation
  INVALID_ENUM: 'Please select a valid option',
  INVALID_STATUS: 'Invalid status',
  INVALID_TYPE: 'Invalid type',

  // Security
  SQL_INJECTION: 'Input contains potentially dangerous SQL',
  XSS_DETECTED: 'HTML content not allowed',
  COMMAND_INJECTION: 'Input contains dangerous characters',

  // Business rules
  DUPLICATE_ENTRY: 'This entry already exists',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  RATE_LIMITED: 'Too many requests, please try again later',
} as const;

// ===== RATE LIMITING =====
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_REQUESTS_PER_MINUTE: 60,
  API_REQUESTS_PER_HOUR: 1000,
  FILE_UPLOADS_PER_HOUR: 100,
  CASE_CREATES_PER_DAY: 50,
} as const;

// ===== PERFORMANCE THRESHOLDS =====
export const PERFORMANCE = {
  VALIDATION_TIMEOUT_MS: 1000, // 1 second
  SLOW_VALIDATION_MS: 10,
  MAX_VALIDATION_DEPTH: 10, // Max object nesting depth
} as const;

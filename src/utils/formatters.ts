/**
 * Formatting utility functions for Justice Companion
 * Provides consistent formatting for dates, times, file sizes, and other data
 */

/**
 * Format a date string to relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - ISO date string or Date object
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);
  const diffMonths = Math.floor(diffMs / 2592000000);
  const diffYears = Math.floor(diffMs / 31536000000);

  if (diffSecs < 10) {
    return "Just now";
  }
  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs > 1 ? "s" : ""} ago`;
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  }
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
}

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size (e.g., "2.3 MB", "156.2 KB")
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) {
    return "0 B";
  }
  if (bytes < 0) {
    return "Invalid size";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * Format a date to localized date string
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString(undefined, options);
}

/**
 * Format a date to localized time string
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export function formatTime(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleTimeString(undefined, options);
}

/**
 * Format a date to localized date and time string
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };
  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,247")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "2h 30m", "45s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format a percentage with specified decimal places
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "78.5%")
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Format a currency amount
 * @param amount - Amount in smallest currency unit (e.g., cents)
 * @param currency - Currency code (default: 'GBP')
 * @returns Formatted currency string (e.g., "£12.50")
 */
export function formatCurrency(
  amount: number,
  currency: string = "GBP",
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

/**
 * Format a phone number (UK format)
 * @param phoneNumber - Phone number string
 * @returns Formatted phone number (e.g., "020 1234 5678")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Format UK landline (11 digits starting with 0)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
  }

  // Format UK mobile (11 digits starting with 07)
  if (cleaned.length === 11 && cleaned.startsWith("07")) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }

  // Return original if not recognized
  return phoneNumber;
}

/**
 * Capitalize first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a snake_case or kebab-case string to Title Case
 * @param str - String to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  return str.replace(/[_-]/g, " ").split(" ").map(capitalize).join(" ");
}

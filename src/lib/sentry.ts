/**
 * Sentry Error Monitoring Configuration
 *
 * Provides centralized error tracking and performance monitoring
 * for the Justice Companion PWA.
 */

import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error monitoring
 *
 * Call this function early in your app's lifecycle (before rendering)
 */
export function initSentry(): void {
  // Only initialize in production or if explicitly enabled
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info("[Sentry] DSN not configured - monitoring disabled");
    }
    return;
  }

  Sentry.init({
    dsn,

    // Environment configuration
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        // Block all media for privacy
        blockAllMedia: true,
      }),
    ],

    // Tracing sample rate (adjust for production)
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay sample rate
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive data from errors
      if (event.request?.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
      }

      // Filter out local storage data
      if (event.extra) {
        delete event.extra["localStorage"];
        delete event.extra["sessionStorage"];
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors that are expected
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      // Browser extensions
      "chrome-extension",
      "moz-extension",
      // User cancellation
      "AbortError",
    ],

    // Don't send PII
    sendDefaultPii: false,
  });

  // Set initial tags
  Sentry.setTag("app", "justice-companion");
  Sentry.setTag("platform", "web");
}

/**
 * Set user context for Sentry
 *
 * Call this after user authentication
 */
export function setSentryUser(userId: string | number): void {
  Sentry.setUser({
    id: String(userId),
  });
}

/**
 * Clear user context from Sentry
 *
 * Call this on user logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Capture a custom error with additional context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a custom message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
}

/**
 * Create a performance transaction
 */
export function startTransaction(
  name: string,
  op: string,
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

// Re-export Sentry's ErrorBoundary for convenience
export { ErrorBoundary } from "@sentry/react";

// Export the Sentry instance for advanced usage
export { Sentry };
